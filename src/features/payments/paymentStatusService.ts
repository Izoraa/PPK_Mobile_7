import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { requestLabCheckInApi } from '@/lib/labCheckInApi';
import type { Result } from '@/types';

export type PaymentAttemptStatus = 'pending' | 'success' | 'failed';
export type PaymentOrder = { orderId: string; fineId: string };

function isOrderId(value: string): boolean {
  return /^[a-zA-Z0-9_~.-]{1,50}$/.test(value) && value !== '.' && value !== '..';
}

function isAttemptStatus(value: unknown): value is PaymentAttemptStatus {
  return value === 'pending' || value === 'success' || value === 'failed';
}

export function mergePaymentAttemptStatus(
  current: PaymentAttemptStatus | undefined,
  incoming: PaymentAttemptStatus | undefined,
): PaymentAttemptStatus | undefined {
  // The same order can advance from failed to success if an older settlement is confirmed.
  if (current === 'success' || (current === 'failed' && incoming === 'pending')) return current;
  return incoming ?? current;
}

export function subscribePaymentStatus(
  { fineId, orderId }: PaymentOrder,
  studentId: string,
  onStatus: (status: PaymentAttemptStatus | undefined) => void,
): Unsubscribe {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user || user.uid !== studentId || !isOrderId(orderId)) {
      onStatus(undefined);
      return () => undefined;
    }

    return onSnapshot(
      doc(getFirebaseFirestore(), 'paymentTransactions', orderId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (auth.currentUser !== user || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        const attempt = snapshot.data();
        onStatus(attempt && attempt.studentId === user.uid && attempt.orderId === orderId
          && attempt.fineId === fineId && isAttemptStatus(attempt.status) ? attempt.status : undefined);
      },
      () => onStatus(undefined),
    );
  } catch {
    onStatus(undefined);
    return () => undefined;
  }
}

export async function getPaymentStatus(
  { orderId, fineId }: PaymentOrder,
  user: User,
): Promise<Result<PaymentAttemptStatus>> {
  if (!isOrderId(orderId)) return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };

  const response = await requestLabCheckInApi(`/api/v1/payments/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    successStatus: 200,
    user,
  });
  if (!response.ok) return response;

  const payload = response.data;
  if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok === true
    && 'data' in payload && payload.data && typeof payload.data === 'object') {
    const attempt = payload.data as Record<string, unknown>;
    if (attempt.orderId === orderId && attempt.fineId === fineId && isAttemptStatus(attempt.status)) {
      return { ok: true, data: attempt.status };
    }
  }

  return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
}
