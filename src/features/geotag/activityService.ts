import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Role } from '@/types';
import { getFirebaseFirestore } from '@/lib/firebase/client';

import type { GeotagError, GeotagPoint } from './geotagService';

export interface LabSessionActivity {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  title: string;
  room: string;
  status: 'not_open' | 'open' | 'closed';
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
}

export interface LabActivitySummary {
  current: LabSessionActivity | null;
  next: LabSessionActivity | null;
}

function firestoreError(error: unknown): GeotagError {
  const code = (error as FirestoreError | undefined)?.code;
  if (code === 'permission-denied') {
    return { code: 'FORBIDDEN', retryable: false, message: 'Akses aktivitas praktikum ditolak.' };
  }
  if (code === 'unauthenticated') {
    return { code: 'UNAUTHENTICATED', retryable: false, message: 'Silakan masuk untuk melihat aktivitas praktikum.' };
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return { code: 'NETWORK_ERROR', retryable: true, message: 'Koneksi bermasalah saat memuat aktivitas praktikum.' };
  }
  return { code: 'SERVICE_UNAVAILABLE', retryable: true, message: 'Aktivitas praktikum belum dapat dimuat.' };
}

type ClassInfo = { id: string; name: string; code: string };

function parseSession(
  id: string,
  data: Record<string, unknown>,
  classInfo: ClassInfo,
): LabSessionActivity | null {
  const startsAt = data.startsAt && typeof data.startsAt === 'object' && 'toDate' in data.startsAt
    ? (data.startsAt as { toDate: () => Date }).toDate()
    : null;
  const endsAt = data.endsAt && typeof data.endsAt === 'object' && 'toDate' in data.endsAt
    ? (data.endsAt as { toDate: () => Date }).toDate()
    : null;

  if (
    typeof data.classId !== 'string'
    || typeof data.title !== 'string'
    || typeof data.room !== 'string'
    || !startsAt || !endsAt
    || !Number.isFinite(startsAt.getTime())
    || !Number.isFinite(endsAt.getTime())
    || (data.status !== 'not_open' && data.status !== 'open' && data.status !== 'closed')
  ) return null;

  return {
    id,
    classId: data.classId,
    className: classInfo.name,
    classCode: classInfo.code,
    title: data.title,
    room: data.room,
    status: data.status,
    startsAt,
    endsAt,
    timeZone: typeof data.timeZone === 'string' ? data.timeZone : 'Asia/Jakarta',
  };
}

/**
 * Subscribes only to sessions in classes visible to this account. The current
 * repository Rules do not grant coordinators read access to sessions.
 */
export function subscribeAccessibleLabSessions(
  uid: string,
  role: Role,
  onChange: (sessions: LabSessionActivity[]) => void,
  onError: (error: GeotagError) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  let childUnsubscribers: Unsubscribe[] = [];
  let disposed = false;

  const stopChildren = () => {
    childUnsubscribers.forEach((unsubscribe) => unsubscribe());
    childUnsubscribers = [];
  };

  if (role === 'coordinator') {
    queueMicrotask(() => {
      if (!disposed) onError({
        code: 'FORBIDDEN',
        retryable: false,
        message: 'Rules saat ini tidak memberi koordinator akses baca ke sesi praktikum.',
      });
    });
    return () => { disposed = true; };
  }

  let parentGeneration = 0;

  const listenToClasses = (classes: ClassInfo[]) => {
    stopChildren();
    if (classes.length === 0) {
      onChange([]);
      return;
    }

    const sessionsByClass = new Map<string, LabSessionActivity[]>();
    const readyClasses = new Set<string>();
    const uniqueClasses = [...new Map(classes.map((item) => [item.id, item])).values()];

    const publish = () => {
      if (disposed || readyClasses.size !== uniqueClasses.length) return;
      onChange([...sessionsByClass.values()].flat());
    };

    childUnsubscribers = uniqueClasses.map((classInfo) => onSnapshot(
      query(
        collection(db, 'sessions'),
        where('classId', '==', classInfo.id),
        where('isArchived', '==', false),
      ),
      (snapshot) => {
        const sessions: LabSessionActivity[] = [];
        for (const doc of snapshot.docs) {
          const session = parseSession(doc.id, doc.data(), classInfo);
          if (!session) {
            onError({
              code: 'VALIDATION_ERROR',
              retryable: false,
              message: `Data sesi "${doc.id}" tidak lengkap atau tidak valid.`,
            });
            return;
          }
          sessions.push(session);
        }
        sessionsByClass.set(classInfo.id, sessions);
        readyClasses.add(classInfo.id);
        publish();
      },
      (error) => onError(firestoreError(error)),
    ));
  };

  const parentQuery = role === 'student'
    ? query(
      collection(db, 'memberships'),
      where('studentId', '==', uid),
    )
    : query(
      collection(db, 'classes'),
      where('assistantId', '==', uid),
      where('isArchived', '==', false),
    );

  const unsubscribeParent = onSnapshot(
    parentQuery,
    async (snapshot) => {
      const generation = ++parentGeneration;
      stopChildren();
      onChange([]);
      if (role === 'assistant') {
        listenToClasses(snapshot.docs
          .filter((document) => document.data().isArchived !== true)
          .map((document) => ({
            id: document.id,
            name: typeof document.data().name === 'string' ? document.data().name : 'Kelas',
            code: typeof document.data().code === 'string' ? document.data().code : '',
          })));
        return;
      }

      try {
        const classIds = [...new Set(snapshot.docs
          .filter((document) => document.data().isActive === true)
          .map((document) => document.data().classId)
          .filter((classId): classId is string => typeof classId === 'string' && classId.length > 0))];
        const classSnapshots = await Promise.all(classIds.map((classId) => getDoc(doc(db, 'classes', classId))));
        if (disposed || generation !== parentGeneration) return;
        const classes = classSnapshots
          .filter((classSnapshot) => classSnapshot.exists() && classSnapshot.data().isArchived !== true)
          .map((classSnapshot) => {
            const data = classSnapshot.data() ?? {};
            return {
              id: classSnapshot.id,
              name: typeof data.name === 'string' ? data.name : 'Kelas',
              code: typeof data.code === 'string' ? data.code : '',
            };
          });
        listenToClasses(classes);
      } catch (error) {
        onError(firestoreError(error));
      }
    },
    (error) => {
      stopChildren();
      onError(firestoreError(error));
    },
  );

  return () => {
    disposed = true;
    unsubscribeParent();
    stopChildren();
  };
}

export function getLabActivitySummary(
  point: GeotagPoint,
  sessions: LabSessionActivity[],
  now = new Date(),
): LabActivitySummary {
  const matching = sessions.filter((session) => session.room.trim() === point.name.trim());
  const current = matching
    .filter((session) => session.status === 'open'
      && session.startsAt.getTime() <= now.getTime()
      && session.endsAt.getTime() >= now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null;
  const next = matching
    .filter((session) => session.id !== current?.id
      && session.status !== 'closed'
      && session.startsAt.getTime() > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null;

  return { current, next };
}
