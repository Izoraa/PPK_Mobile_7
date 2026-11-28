import { FirebaseError } from 'firebase/app';
import { collection, doc, onSnapshot, orderBy, query, Timestamp, where, type Unsubscribe } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { getConfirmedDocument } from '@/lib/firebase/serverRead';
import type { Result } from '@/types';

import { isPaymentAttemptStatus, type PaymentAttemptStatus } from './paymentStatusService';

export type PaymentHistoryTransaction = {
  orderId: string;
  fineId: string;
  sessionTitle: string | null;
  amount: number;
  createdAt: Date;
  status: PaymentAttemptStatus;
};

export type PaymentHistorySnapshot = { transactions: PaymentHistoryTransaction[]; fromCache: boolean };
export type PaymentHistoryFine = { sessionTitle: string | null; createdAt: Date | null };

function readError(error: unknown): Extract<Result<never>, { ok: false }> {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'unauthenticated':
        return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
      case 'permission-denied':
        return { ok: false, error: { code: 'FORBIDDEN', retryable: false } };
      case 'unavailable':
      case 'deadline-exceeded':
        return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
    }
  }
  return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
}

export function subscribePaymentHistory(
  studentId: string,
  onChange: (result: Result<PaymentHistorySnapshot>) => void,
): Unsubscribe {
  const unauthenticated = { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } } as const;

  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user || user.uid !== studentId) {
      onChange(unauthenticated);
      return () => undefined;
    }

    const historyQuery = query(
      collection(getFirebaseFirestore(), 'paymentTransactions'),
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    return onSnapshot(historyQuery, { includeMetadataChanges: true }, (snapshot) => {
      if (auth.currentUser !== user) {
        onChange(unauthenticated);
        return;
      }
      if (snapshot.metadata.hasPendingWrites) {
        onChange({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } });
        return;
      }

      const transactions: PaymentHistoryTransaction[] = [];
      for (const attempt of snapshot.docs) {
        const { orderId, studentId: ownerId, fineId, sessionId, sessionTitle, amount, currency, createdAt, status } = attempt.data();
        if (ownerId !== user.uid || orderId !== attempt.id || typeof sessionId !== 'string'
          || !sessionId || sessionId.includes('/') || fineId !== `${sessionId}_${user.uid}`
          || currency !== 'IDR' || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0
          || !(createdAt instanceof Timestamp) || !isPaymentAttemptStatus(status)) {
          onChange({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } });
          return;
        }

        transactions.push({
          orderId: attempt.id,
          fineId,
          sessionTitle: typeof sessionTitle === 'string' ? sessionTitle.trim() || null : null,
          amount,
          createdAt: createdAt.toDate(),
          status,
        });
      }

      onChange({ ok: true, data: { transactions, fromCache: snapshot.metadata.fromCache } });
    }, (error) => onChange(readError(error)));
  } catch (error) {
    onChange(readError(error));
    return () => undefined;
  }
}

async function readLinkedFine(studentId: string, fineId: string): Promise<PaymentHistoryFine | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.uid !== studentId) return null;

  const snapshot = await getConfirmedDocument(doc(getFirebaseFirestore(), 'fines', fineId));
  const fine = snapshot.data();
  if (auth.currentUser !== user || !fine || fine.studentId !== user.uid) return null;

  return {
    sessionTitle: typeof fine.sessionTitle === 'string' ? fine.sessionTitle.trim() || null : null,
    createdAt: fine.createdAt instanceof Timestamp ? fine.createdAt.toDate() : null,
  };
}

export function createHistoryFineReader(studentId: string) {
  const reads = new Map<string, Promise<PaymentHistoryFine | null>>();

  return (fineId: string): Promise<PaymentHistoryFine | null> => {
    const existing = reads.get(fineId);
    if (existing) return existing;

    const read = readLinkedFine(studentId, fineId).catch(() => {
      reads.delete(fineId);
      return null;
    });
    reads.set(fineId, read);
    return read;
  };
}
