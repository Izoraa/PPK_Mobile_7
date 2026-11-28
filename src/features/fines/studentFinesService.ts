import { FirebaseError } from 'firebase/app';
import { collection, doc, getDocsFromServer, query, Timestamp, where } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { getConfirmedDocument } from '@/lib/firebase/serverRead';
import type { Result } from '@/types';

type FineStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

type FineSession = {
  title: string | null;
  startsAt: Date | null;
};

export type StudentFine = {
  id: string;
  status: FineStatus;
  session: FineSession | null;
};

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

export async function getStudentFines(studentId: string): Promise<Result<StudentFine[]>> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    const uid = user?.uid;
    if (!uid || uid !== studentId) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const finesQuery = query(
      collection(getFirebaseFirestore(), 'fines'),
      where('studentId', '==', uid),
    );
    const snapshot = await getDocsFromServer(finesQuery);
    if (auth.currentUser !== user) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
      return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
    }

    const records: { id: string; sessionId: string; status: FineStatus }[] = [];
    for (const fine of snapshot.docs) {
      const { studentId: ownerId, sessionId, status } = fine.data();
      if (ownerId !== uid || typeof sessionId !== 'string' || !sessionId
        || sessionId.includes('/') || sessionId === '.' || sessionId === '..'
        || fine.id !== `${sessionId}_${uid}` || !isFineStatus(status)) {
        return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } };
      }
      records.push({ id: fine.id, sessionId, status });
    }

    const fines = await Promise.all(records.map(async ({ id, sessionId, status }) => ({
      id,
      status,
      session: await readFineSession(sessionId),
    })));
    if (auth.currentUser !== user) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    fines.sort((a, b) => (b.session?.startsAt?.getTime() ?? -Infinity)
      - (a.session?.startsAt?.getTime() ?? -Infinity) || a.id.localeCompare(b.id));
    return { ok: true, data: fines };
  } catch (error) {
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
}
