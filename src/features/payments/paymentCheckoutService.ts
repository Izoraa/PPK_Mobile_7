import type { User } from 'firebase/auth';

import { requestLabCheckInApi } from '@/lib/labCheckInApi';
import type { Result } from '@/types';

const snapCheckoutPrefix = 'https://app.sandbox.midtrans.com/snap/';
type SnapCheckoutUrl = `${typeof snapCheckoutPrefix}${string}`;

export type PaymentCheckout = {
  fineId: string;
  orderId: string;
  redirectUrl: SnapCheckoutUrl;
};

function isSnapCheckoutUrl(value: unknown): value is SnapCheckoutUrl {
  return typeof value === 'string' && value.startsWith(snapCheckoutPrefix);
}

function parseCheckout(payload: unknown, fineId: string): PaymentCheckout | null {
  if (!payload || typeof payload !== 'object' || !('ok' in payload) || payload.ok !== true
    || !('data' in payload) || !payload.data || typeof payload.data !== 'object') {
    return null;
  }

  const data = payload.data as Record<string, unknown>;
  const { orderId, redirectUrl } = data;
  if (data.fineId !== fineId || data.status !== 'pending' || typeof orderId !== 'string'
    || !orderId.trim() || !isSnapCheckoutUrl(redirectUrl)) {
    return null;
  }

  return { fineId, orderId, redirectUrl };
}

export async function createPaymentCheckout(fineId: string, user: User): Promise<Result<PaymentCheckout>> {
  const result = await requestLabCheckInApi('/api/v1/payments/create-transaction', {
    method: 'POST',
    body: { fineId },
    successStatus: 200,
    user,
  });
  if (!result.ok) return result;

  const checkout = parseCheckout(result.data, fineId);
  if (!checkout) return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };

  return { ok: true, data: checkout };
}
