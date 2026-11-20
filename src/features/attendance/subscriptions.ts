import {
  collection,
  collectionGroup,
  doc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type FirestoreError,
  type Query,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import {
  getAttendanceAuth,
  getAttendanceFirestore,
  getAttendanceParticipationReference,
  getAttendanceSessionReference,
} from './service';
import type {
  AttendanceError,
  AttendanceSessionMetadata,
  FirestoreAttendanceRecord,
  SessionParticipationSummary,
} from './types';

type SubscriptionState<T> = {
  status: 'loading' | 'ready' | 'error';
  records: T[];
  error: AttendanceError | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
  retry: () => void;
};

function mapListenerError(error: FirestoreError): AttendanceError {
  switch (error.code) {
    case 'permission-denied':
      return { code: 'FORBIDDEN', retryable: false };
    case 'unauthenticated':
      return { code: 'UNAUTHENTICATED', retryable: false };
    case 'unavailable':
    case 'deadline-exceeded':
      return { code: 'NETWORK_ERROR', retryable: true };
    default:
      return { code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
}

function deferStateUpdate(update: () => void): void {
  void Promise.resolve().then(update);
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value instanceof Date ? value.toISOString() : null;
}

function readAttendanceRecord(
  snapshot: { id: string; data: () => DocumentData },
): FirestoreAttendanceRecord | null {
  const data = snapshot.data();
  if (
    typeof data.sessionId !== 'string'
    || typeof data.classId !== 'string'
    || typeof data.studentId !== 'string'
    || typeof data.studentName !== 'string'
    || (typeof data.studentNumber !== 'string' && data.studentNumber !== null)
    || (data.kind !== 'attendance'
      && !(data.kind === 'leave' && data.status === 'rejected' && data.attendanceCheckedInAt))
  ) return null;

  return {
    id: snapshot.id,
    sessionId: data.sessionId,
    classId: data.classId,
    studentId: data.studentId,
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    checkedInAt: timestampToIso(data.kind === 'attendance' ? data.checkedInAt : data.attendanceCheckedInAt),
    createdAt: timestampToIso(data.kind === 'attendance' ? data.createdAt : data.attendanceCreatedAt),
  };
}

function useAttendanceSubscription(
  buildQuery: () => Query<DocumentData>,
  enabled: boolean,
): SubscriptionState<FirestoreAttendanceRecord> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SubscriptionState<FirestoreAttendanceRecord>, 'retry'>>({
    status: enabled ? 'loading' : 'ready',
    records: [],
    error: null,
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    if (!enabled) {
        deferStateUpdate(() => {
        if (!active) return;

        setState({
          status: 'ready',
          records: [],
          error: null,
          fromCache: false,
          hasPendingWrites: false,
        });
      });

      return () => { active = false; };
    }

    try {
      unsubscribe = onSnapshot(
        buildQuery(),
        { includeMetadataChanges: true },
        (snapshot) => {
          const records = snapshot.docs
            .map(readAttendanceRecord)
            .filter((record): record is FirestoreAttendanceRecord => record !== null);
          if (active) setState({
            status: 'ready',
            records,
            error: null,
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
              || snapshot.docs.some((document) => document.metadata.hasPendingWrites),
          });
        },
        (error: FirestoreError) => {
          if (active) setState((previous) => ({ ...previous, status: 'error', error: mapListenerError(error) }));
        },
      );
    } catch (error) {
      deferStateUpdate(() => {
        if (!active) return;

        setState({
          status: 'error',
          records: [],
          fromCache: false,
          hasPendingWrites: false,
          error: {
            code: error instanceof Error
              && error.message.toLowerCase().includes('permission')
              ? 'FORBIDDEN'
              : 'SERVICE_UNAVAILABLE',
            retryable: true,
          },
        });
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [buildQuery, enabled, attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}

export function useSessionAttendance(sessionId: string | null): SubscriptionState<FirestoreAttendanceRecord> {
  const buildQuery = useCallback(() => {
    // Check-ins after a rejected leave keep kind: 'leave' on the participation.
    return collection(getAttendanceFirestore(), 'sessions', sessionId ?? '__missing__', 'participations');
  }, [sessionId]);

  const state = useAttendanceSubscription(buildQuery, Boolean(sessionId));
  return {
    ...state,
    records: [...state.records].sort((first, second) => {
      const firstTime = first.checkedInAt ?? first.createdAt ?? '';
      const secondTime = second.checkedInAt ?? second.createdAt ?? '';
      return firstTime.localeCompare(secondTime);
    }),
  };
}

export function useMyAttendanceHistory(enabled = true): SubscriptionState<FirestoreAttendanceRecord> {
  const buildQuery = useCallback(() => {
    const uid = getAttendanceAuth().currentUser?.uid;
    if (!uid) throw new Error('unauthenticated');

    return query(
      collectionGroup(getAttendanceFirestore(), 'participations'),
      where('studentId', '==', uid),
      orderBy('createdAt', 'desc'),
    );
  }, []);

  return useAttendanceSubscription(buildQuery, enabled);
}

type ConfirmedSessionAttendance =
  | { status: 'loading' | 'unconfirmed' | 'error' }
  | { status: 'ready'; checkedInAt: string | null };

export function useMyConfirmedSessionAttendance(sessionId: string): ConfirmedSessionAttendance {
  const [state, setState] = useState<ConfirmedSessionAttendance>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const showError = () => {
      if (active) setState({ status: 'error' });
    };

    try {
      const uid = getAttendanceAuth().currentUser?.uid;
      if (!uid) {
        deferStateUpdate(showError);
      } else {
        unsubscribe = onSnapshot(
          getAttendanceParticipationReference(sessionId, uid),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (!active) return;
            if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
              setState({ status: 'unconfirmed' });
              return;
            }

            const attendance = snapshot.exists() ? readAttendanceRecord(snapshot) : null;
            setState(attendance && !attendance.checkedInAt
              ? { status: 'unconfirmed' }
              : { status: 'ready', checkedInAt: attendance?.checkedInAt ?? null });
          },
          showError,
        );
      }
    } catch {
      deferStateUpdate(showError);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sessionId]);

  return state;
}

export async function getAttendanceSessionMetadata(
  sessionId: string,
): Promise<AttendanceSessionMetadata | null> {
  try {
    const snapshot = await getDocFromServer(getAttendanceSessionReference(sessionId));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (
      typeof data.title !== 'string'
      || typeof data.room !== 'string'
      || typeof data.timeZone !== 'string'
    ) return null;
    let className: string | null = null;
    if (typeof data.classId === 'string' && data.classId) {
      const classSnapshot = await getDocFromServer(doc(getAttendanceFirestore(), 'classes', data.classId));
      const classData = classSnapshot.data();
      if (typeof classData?.name === 'string') className = classData.name;
    }
    return {
      id: sessionId,
      className,
      title: data.title,
      room: data.room,
      startsAt: timestampToIso(data.startsAt),
      endsAt: timestampToIso(data.endsAt),
      timeZone: data.timeZone,
    };
  } catch {
    return null;
  }
}

export function useAttendanceSessionMetadata(
  sessionIds: string[],
): Record<string, AttendanceSessionMetadata | null> {
  const [metadata, setMetadata] = useState<Record<string, AttendanceSessionMetadata | null>>({});
  const sessionIdsKey = [...new Set(sessionIds)].join('|');

  useEffect(() => {
    let active = true;
    const uniqueIds = sessionIdsKey ? sessionIdsKey.split('|') : [];
    if (uniqueIds.length === 0) {
      deferStateUpdate(() => {
        if (active) setMetadata({});
      });
      return () => { active = false; };
    }

    void Promise.all(uniqueIds.map(async (sessionId) => (
      [sessionId, await getAttendanceSessionMetadata(sessionId)] as const
    ))).then((entries) => {
      if (active) setMetadata(Object.fromEntries(entries));
    });

    return () => { active = false; };
  }, [sessionIdsKey]);

  return metadata;
}

export function subscribeSessionParticipationSummary(
  sessionId: string,
  onChange: (summary: SessionParticipationSummary, metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
  onError: (error: AttendanceError) => void,
): () => void {
  try {
    return onSnapshot(
      collection(getAttendanceFirestore(), 'sessions', sessionId, 'participations'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const summary: SessionParticipationSummary = {
          attendanceCount: 0,
          pendingLeaveCount: 0,
          approvedLeaveCount: 0,
          rejectedLeaveCount: 0,
        };

        snapshot.docs.forEach((document) => {
          const data = document.data();
          if (data.kind === 'attendance' || (
            data.kind === 'leave'
            && data.status === 'rejected'
            && data.attendanceCheckedInAt
          )) {
            summary.attendanceCount += 1;
          } else if (data.kind === 'leave') {
            if (data.status === 'pending') summary.pendingLeaveCount += 1;
            if (data.status === 'approved') summary.approvedLeaveCount += 1;
            if (data.status === 'rejected') summary.rejectedLeaveCount += 1;
          }
        });

        onChange(summary, {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites
            || snapshot.docs.some((document) => document.metadata.hasPendingWrites),
        });
      },
      (error: FirestoreError) => onError(mapListenerError(error)),
    );
  } catch (error) {
    onError({
      code: error instanceof Error && error.message.toLowerCase().includes('permission')
        ? 'FORBIDDEN'
        : 'SERVICE_UNAVAILABLE',
      retryable: true,
    });
    return () => {};
  }
}

export type SessionParticipationSummaryMap = Record<string, SessionParticipationSummary>;

export type SessionParticipationSummaryMapError = {
  sessionId: string;
  error: AttendanceError;
};

export function subscribeSessionParticipationSummaries(
  sessionIds: string[],
  onChange: (summaries: SessionParticipationSummaryMap, metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
  onError: (error: SessionParticipationSummaryMapError) => void,
  enabled = true,
): () => void {
  if (!enabled) return () => {};

  const uniqueSessionIds = [...new Set(sessionIds)];
  const summaries: SessionParticipationSummaryMap = {};
  const metadataBySession = new Map<string, { fromCache: boolean; hasPendingWrites: boolean }>();
  const unsubscribers = uniqueSessionIds.map((sessionId) => (
    subscribeSessionParticipationSummary(
      sessionId,
      (summary, metadata) => {
        summaries[sessionId] = summary;
        metadataBySession.set(sessionId, metadata);
        onChange({ ...summaries }, {
          fromCache: [...metadataBySession.values()].some((item) => item.fromCache),
          hasPendingWrites: [...metadataBySession.values()].some((item) => item.hasPendingWrites),
        });
      },
      (error) => onError({ sessionId, error }),
    )
  ));

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export type SessionParticipationSummaryMapState = {
  status: 'loading' | 'ready' | 'error';
  summaries: SessionParticipationSummaryMap;
  errors: Record<string, AttendanceError>;
  fromCache: boolean;
  hasPendingWrites: boolean;
  retry: () => void;
};

export function useSessionParticipationSummaries(
  sessionIds: string[],
  enabled = true,
): SessionParticipationSummaryMapState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SessionParticipationSummaryMapState, 'retry'>>({
    status: enabled && sessionIds.length > 0 ? 'loading' : 'ready',
    summaries: {},
    errors: {},
    fromCache: false,
    hasPendingWrites: false,
  });
  const sessionIdsKey = [...new Set(sessionIds)].sort().join('|');

  useEffect(() => {
    let active = true;
    const uniqueSessionIds = sessionIdsKey ? sessionIdsKey.split('|') : [];

   if (!enabled || uniqueSessionIds.length === 0) {
      deferStateUpdate(() => {
        if (!active) return;

        setState({
          status: 'ready',
          summaries: {},
          errors: {},
          fromCache: false,
          hasPendingWrites: false,
        });
      });

      return () => { active = false; };
    }

    deferStateUpdate(() => {
      if (!active) return;

      setState({
        status: 'loading',
        summaries: {},
        errors: {},
        fromCache: false,
        hasPendingWrites: false,
      });
    });
    const unsubscribe = subscribeSessionParticipationSummaries(
      uniqueSessionIds,
      (summaries, metadata) => {
        if (active) setState({ status: 'ready', summaries, errors: {}, ...metadata });
      },
      ({ sessionId, error }) => {
        if (!active) return;
        setState((previous) => ({
          status: 'error',
          summaries: previous.summaries,
          errors: { ...previous.errors, [sessionId]: error },
          fromCache: previous.fromCache,
          hasPendingWrites: previous.hasPendingWrites,
        }));
      },
      enabled,
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, sessionIdsKey, attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading', summaries: {}, errors: {} }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}

export function useSessionParticipationSummary(
  sessionId: string | null,
  enabled = true,
): SubscriptionState<SessionParticipationSummary> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SubscriptionState<SessionParticipationSummary>, 'retry'>>({
    status: enabled && sessionId ? 'loading' : 'ready',
    records: [],
    error: null,
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    if (!enabled || !sessionId) {
      deferStateUpdate(() => {
        if (!active) return;

        setState({
          status: 'ready',
          records: [],
          error: null,
          fromCache: false,
          hasPendingWrites: false,
        });
      });

      return () => { active = false; };
    }

    deferStateUpdate(() => {
      if (!active) return;

      setState({
        status: 'loading',
        records: [],
        error: null,
        fromCache: false,
        hasPendingWrites: false,
      });
    });
    unsubscribe = subscribeSessionParticipationSummary(
      sessionId,
      (summary, metadata) => {
        if (active) setState({ status: 'ready', records: [summary], error: null, ...metadata });
      },
      (error) => {
        if (active) setState((previous) => ({ ...previous, status: 'error', records: [], error }));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, sessionId, attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading', records: [], error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return {
    status: state.status,
    records: state.records,
    error: state.error,
    fromCache: state.fromCache,
    hasPendingWrites: state.hasPendingWrites,
    retry,
  };
}
