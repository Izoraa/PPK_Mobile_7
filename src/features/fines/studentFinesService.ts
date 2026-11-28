import { FirebaseError } from 'firebase/app';
import { collection, doc, onSnapshot, query, Timestamp, where, type Unsubscribe } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { getConfirmedDocument } from '@/lib/firebase/serverRead';
import type { Result } from '@/types';

type FineStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

type FineSession = {
  title: string | null;
  startsAt: Date | null;
};

type FineRecord = {
  id: string;
  status: FineStatus;
  orderId: string | null;
  sessionTitle: string | null;
  createdAt: Date | null;
  lateMinutes: number;
  amount: number;
};

export type StudentFine = FineRecord & {
  session: FineSession | null;
};

export type StudentFinesSnapshot = { fines: StudentFine[]; fromCache: boolean };

function isFineStatus(value: unknown): value is FineStatus {
  return value === 'unpaid' || value === 'pending' || value === 'paid' || value === 'failed';
}

async function readFineSession(sessionId: string): Promise<FineSession | null> {
  try {
    const snapshot = await getConfirmedDocument(doc(getFirebaseFirestore(), 'sessions', sessionId));
    const session = snapshot.data();
    if (!session) return null;

    return {
      title: typeof session.title === 'string' ? session.title.trim() || null : null,
      startsAt: session.startsAt instanceof Timestamp ? session.startsAt.toDate() : null,
    };
  } catch {
    // Keep the fine visible when its linked session cannot be loaded.
    return null;
  }
}

function readError(error: unknown): Extract<Result<never>, { ok: false }> {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'unauthenticated':
        return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
      case 'permission-denied':
        return { ok: false, error: { code: 'FORBIDDEN', retryable: false } };
      case 'deadline-exceeded':
      case 'unavailable':
        return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
    }
  }
  return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
}

export function subscribeStudentFines(
  studentId: string,
  onChange: (result: Result<StudentFinesSnapshot>) => void,
): Unsubscribe {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    const uid = user?.uid;
    if (!uid || uid !== studentId) {
      onChange({ ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } });
      return () => undefined;
    }

    const finesQuery = query(
      collection(getFirebaseFirestore(), 'fines'),
      where('studentId', '==', uid),
    );
    const sessionReads = new Map<string, Promise<FineSession | null>>();
    let revision = 0;
    const unsubscribe = onSnapshot(
      finesQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const snapshotRevision = ++revision;
        if (auth.currentUser !== user) {
          onChange({ ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } });
          return;
        }
        if (snapshot.metadata.hasPendingWrites) {
          onChange({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } });
          return;
        }

        const { fromCache } = snapshot.metadata;
        const records: (FineRecord & { sessionId: string })[] = [];
        for (const fine of snapshot.docs) {
          const {
            studentId: ownerId, sessionId, status, orderId, sessionTitle, createdAt, lateMinutes, amount, currency,
          } = fine.data();
          if (ownerId !== uid || typeof sessionId !== 'string' || !sessionId
            || sessionId.includes('/') || sessionId === '.' || sessionId === '..'
            || fine.id !== `${sessionId}_${uid}` || !isFineStatus(status)
            || typeof lateMinutes !== 'number' || !Number.isSafeInteger(lateMinutes) || lateMinutes <= 0
            || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0
            || currency !== 'IDR') {
            onChange({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } });
            return;
          }
          records.push({
            id: fine.id,
            sessionId,
            status,
            orderId: typeof orderId === 'string' && orderId ? orderId : null,
            sessionTitle: typeof sessionTitle === 'string' ? sessionTitle.trim() || null : null,
            createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : null,
            lateMinutes,
            amount,
          });
        }

        void Promise.all(records.map(async ({ sessionId, ...record }) => {
          let session = sessionReads.get(sessionId);
          if (!session && !fromCache) {
            session = readFineSession(sessionId);
            sessionReads.set(sessionId, session);
          }
          return { ...record, session: session ? await session : null };
        })).then((fines) => {
          if (revision !== snapshotRevision || auth.currentUser !== user) return;
          fines.sort((a, b) => {
            const aTime = (a.session?.startsAt ?? a.createdAt)?.getTime() ?? -Infinity;
            const bTime = (b.session?.startsAt ?? b.createdAt)?.getTime() ?? -Infinity;
            return bTime - aTime || a.id.localeCompare(b.id);
          });
          onChange({ ok: true, data: { fines, fromCache } });
        });
      },
      (error) => {
        revision += 1;
        onChange(readError(error));
      },
    );
    return () => {
      revision += 1;
      unsubscribe();
    };
  } catch (error) {
    onChange(readError(error));
    return () => undefined;
  }
}
