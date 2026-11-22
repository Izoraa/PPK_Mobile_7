import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { AppErrorCode, Result } from '@/types';

const REQUEST_TIMEOUT_MS = 10_000;

type ApiRequest = {
  method: 'POST' | 'DELETE';
  body: Record<string, string | null>;
  successStatus: 200 | 204;
  user: User;
};

const statusCodes: Partial<Record<number, AppErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export async function requestLabCheckInApi(
  path: `/api/${string}`,
  { method, body, successStatus, user }: ApiRequest,
): Promise<Result<unknown>> {
  const baseUrl = process.env.EXPO_PUBLIC_LABCHECKIN_API_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl || !(/^https:\/\//i.test(baseUrl) || (__DEV__ && /^http:\/\//i.test(baseUrl)))) {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } };
  }

  const auth = getFirebaseAuth();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Result<never>>((resolve) => {
    timer = setTimeout(() => {
      resolve({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
  });

  async function send(): Promise<Result<unknown>> {
    for (const forceRefresh of [false, true]) {
      if (auth.currentUser !== user) break;
      const idToken = await user.getIdToken(forceRefresh);
      if (auth.currentUser !== user || controller.signal.aborted) break;

      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (auth.currentUser !== user || controller.signal.aborted) break;

      // Authentication runs before the route can mutate Firestore.
      if (response.status === 401 && !forceRefresh) continue;
      if (response.status !== successStatus) {
        return {
          ok: false,
          error: {
            code: statusCodes[response.status] ?? 'SERVICE_UNAVAILABLE',
            retryable: response.status === 429 || response.status >= 500,
          },
        };
      }

      const data: unknown = successStatus === 204 ? undefined : await response.json().catch(() => null);
      if (auth.currentUser !== user || controller.signal.aborted) break;
      return { ok: true, data };
    }

    return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
  }

  try {
    return await Promise.race([send(), timeout]);
  } catch (error) {
    if (error instanceof FirebaseError && [
      'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled', 'auth/user-not-found',
    ].includes(error.code)) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  } finally {
    clearTimeout(timer);
  }
}
