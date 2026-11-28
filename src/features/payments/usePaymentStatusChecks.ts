import { useCallback, useEffect, useRef, useState } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { getErrorMessage } from '@/utils/errors';

import { getPaymentStatus, mergePaymentAttemptStatus, type PaymentAttemptStatus, type PaymentOrder } from './paymentStatusService';

export type PaymentStatusCheck = {
  checking: boolean;
  status?: PaymentAttemptStatus;
  error?: string;
};

export function usePaymentStatusChecks(studentId: string) {
  const [checks, setChecks] = useState(() => new Map<string, PaymentStatusCheck>());
  const requests = useRef(new Set<string>());

  useEffect(() => {
    const inFlight = requests.current;
    return () => { inFlight.clear(); };
  }, []);

  const checkStatus = useCallback(async (order: PaymentOrder) => {
    const { orderId } = order;
    const inFlight = requests.current;
    if (inFlight.has(orderId)) return;
    inFlight.add(orderId);
    setChecks((previous) => new Map(previous).set(orderId, {
      checking: true,
      status: previous.get(orderId)?.status,
    }));

    let status: PaymentAttemptStatus | undefined;
    let error: string | undefined;
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user || user.uid !== studentId) {
        error = getErrorMessage('UNAUTHENTICATED');
      } else {
        const response = await getPaymentStatus(order, user);
        if (auth.currentUser !== user) {
          error = getErrorMessage('UNAUTHENTICATED');
        } else if (response.ok) {
          status = response.data;
        } else {
          error = response.error.code === 'NOT_FOUND'
            ? 'Pesanan pembayaran tidak ditemukan.' : getErrorMessage(response.error.code);
        }
      }
    } catch {
      error = 'Status pembayaran belum dapat diperiksa.';
    }

    if (!inFlight.delete(orderId)) return;
    setChecks((previous) => new Map(previous).set(orderId, {
      checking: false,
      status: mergePaymentAttemptStatus(previous.get(orderId)?.status, status),
      error,
    }));
  }, [studentId]);

  return { checks, checkStatus };
}
