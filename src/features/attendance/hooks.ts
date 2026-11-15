import { useCallback, useEffect, useState } from 'react';
import { onSnapshot, type DocumentSnapshot, type FirestoreError } from 'firebase/firestore';

import type { AttendanceError, AttendanceParticipation, AttendanceSession } from './types';
import {
  getAttendanceAuth,
  getAttendanceParticipationReference,
  getAttendanceSessionReference,
  parseAttendanceSession,
} from './service';

export type AttendanceState = {
  status: 'loading' | 'ready' | 'error';
  session: AttendanceSession | null;
  participation: AttendanceParticipation | null;
  error: AttendanceError | null;
  retry: () => void;
};

function mapListenerError(error: unknown): AttendanceError {
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : undefined;
  if (code === 'permission-denied') return { code: 'FORBIDDEN', retryable: false };
  if (code === 'unauthenticated') return { code: 'UNAUTHENTICATED', retryable: false };
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return { code: 'NETWORK_ERROR', retryable: true };
  }
  return { code: 'SERVICE_UNAVAILABLE', retryable: true };
}

function deferStateUpdate(update: () => void): void {
  void Promise.resolve().then(update);
}

function parseParticipation(id: string, value: unknown): AttendanceParticipation | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { kind?: unknown; status?: unknown; checkedInAt?: unknown; attendanceCheckedInAt?: unknown };
  if (data.kind !== 'attendance' && data.kind !== 'leave') return null;
  const hasRejectedAttendance = data.kind === 'leave'
    && data.status === 'rejected'
    && data.attendanceCheckedInAt;
  const kind = hasRejectedAttendance ? 'attendance' : data.kind;
  const status = data.kind === 'leave'
    && (data.status === 'pending' || data.status === 'approved' || data.status === 'rejected')
    ? data.status
    : null;
  let checkedInAt: string | null = null;
  const timestamp = hasRejectedAttendance ? data.attendanceCheckedInAt : data.checkedInAt;
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    checkedInAt = (timestamp as { toDate: () => Date }).toDate().toISOString();
  }
  return { id, kind, status: kind === 'leave' ? status : null, checkedInAt };
}

export function useAttendanceState(sessionId: string, enabled = true): AttendanceState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<AttendanceState, 'retry'>>({
    status: 'loading',
    session: null,
    participation: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let sessionInitialSnapshotReceived = false;
    let participationInitialSnapshotReceived = false;
    let listenerFailed = false;
    let session: AttendanceSession | null = null;
    let participation: AttendanceParticipation | null = null;
    let unsubscribeSession = () => {};
    let unsubscribeParticipation = () => {};

    if (!enabled) {
      setState({ status: 'loading', session: null, participation: null, error: null });
      return () => { active = false; };
    }

    const publish = () => {
      if (!active || listenerFailed) return;
      const initialSnapshotsReady = sessionInitialSnapshotReceived
        && participationInitialSnapshotReceived;
      setState({
        status: initialSnapshotsReady ? 'ready' : 'loading',
        session,
        participation,
        error: null,
      });
    };

    const fail = (error: AttendanceError) => {
      if (!active || listenerFailed) return;
      listenerFailed = true;
      setState({ status: 'error', session, participation, error });
    };

    try {
      const auth = getAttendanceAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        deferStateUpdate(() => {
          if (!active) return;
          setState({
            status: 'error',
            session: null,
            participation: null,
            error: { code: 'UNAUTHENTICATED', retryable: false },
          });
        });
        return () => { active = false; };
      }

      unsubscribeSession = onSnapshot(
        getAttendanceSessionReference(sessionId),
        (snapshot: DocumentSnapshot) => {
          sessionInitialSnapshotReceived = true;
          if (!snapshot.exists()) {
            session = null;
            publish();
            return;
          }
          session = parseAttendanceSession(sessionId, snapshot.data());
          if (!session) {
            fail({ code: 'VALIDATION_ERROR', retryable: false });
            return;
          }
          publish();
        },
        (error: FirestoreError) => {
          fail(mapListenerError(error));
        },
      );
      unsubscribeParticipation = onSnapshot(
        getAttendanceParticipationReference(sessionId, uid),
        (snapshot: DocumentSnapshot) => {
          participationInitialSnapshotReceived = true;
          if (!snapshot.exists()) {
            participation = null;
          } else {
            const parsedParticipation = parseParticipation(snapshot.id, snapshot.data());
            if (!parsedParticipation) {
              fail({ code: 'VALIDATION_ERROR', retryable: false });
              return;
            }
            participation = parsedParticipation;
          }
          publish();
        },
        (error: FirestoreError) => {
          fail(mapListenerError(error));
        },
      );

      return () => {
        active = false;
        unsubscribeSession();
        unsubscribeParticipation();
      };
    } catch (error) {
      fail(mapListenerError(error));
      return () => {
        active = false;
        unsubscribeSession();
        unsubscribeParticipation();
      };
    }
  }, [sessionId, attempt, enabled]);

  const retry = useCallback(() => {
    setState({ status: 'loading', session: null, participation: null, error: null });
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
