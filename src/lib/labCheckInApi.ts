import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { AppErrorCode } from '@/types';

const REQUEST_TIMEOUT_MS = 10_000;

type ApiRequest = {
  user: User;
} & (
  | { method: 'GET'; body?: never; successStatus: 200 }
  | { method: 'POST' | 'PATCH' | 'DELETE'; body: Record<string, string | null>; successStatus: 200 | 204 }
);

const statusCodes = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
} as const satisfies Partial<Record<number, AppErrorCode>>;

const serverCodes = [
  ...Object.values(statusCodes),
  'CLASS_ARCHIVED',
  'SESSION_ARCHIVED',
  'NOT_STARTED',
  'SERVICE_UNAVAILABLE',
] as const satisfies readonly AppErrorCode[];

type ApiFailure = {
  ok: false;
  error: {
    code: (typeof serverCodes)[number] | 'NETWORK_ERROR';
    message?: string;
    retryable: boolean;
    outcomeUnknown?: boolean;
  };
};

type ApiResult = { ok: true; data: unknown } | ApiFailure;

const httpErrorCodes: Partial<Record<number, ApiFailure['error']['code']>> = statusCodes;
const unauthenticated: ApiFailure = {
  ok: false,
  error: { code: 'UNAUTHENTICATED', retryable: false },
};

export async function requestLabCheckInApi(
  path: `/api/${string}`,
  { method, body, successStatus, user }: ApiRequest,
): Promise<ApiResult> {
  const baseUrl = process.env.EXPO_PUBLIC_LABCHECKIN_API_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl || !(/^https:\/\//i.test(baseUrl) || (__DEV__ && /^http:\/\//i.test(baseUrl)))) {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } };
  }

  const auth = getFirebaseAuth();
  const controller = new AbortController();
  let outcomeUnknown = false;

  function networkFailure(): ApiFailure {
    if (auth.currentUser !== user) return unauthenticated;
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', retryable: true, ...(outcomeUnknown && { outcomeUnknown }) },
    };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ApiFailure>((resolve) => {
    timer = setTimeout(() => {
      resolve(networkFailure());
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
  });

  async function send(): Promise<ApiResult> {
    for (const forceRefresh of [false, true]) {
      if (auth.currentUser !== user) break;
      const idToken = await (forceRefresh ? user.getIdToken(true) : user.getIdToken());
      if (auth.currentUser !== user || controller.signal.aborted) break;

      outcomeUnknown = method !== 'GET';
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (auth.currentUser !== user || controller.signal.aborted) break;

      const transientError = response.status === 408 || response.status >= 500;
      outcomeUnknown = method !== 'GET' && (response.ok || transientError);
      // Authentication runs before the route can mutate Firestore.
      if (response.status === 401 && !forceRefresh) continue;
      if (response.status !== successStatus) {
        const payload: unknown = await response.json().catch(() => null);
        if (auth.currentUser !== user || controller.signal.aborted) break;
        const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : null;
        const code = error && typeof error === 'object' && 'code' in error
          ? serverCodes.find((candidate) => candidate === error.code)
          : undefined;
        const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : undefined;
        return {
          ok: false,
          error: {
            code: code ?? httpErrorCodes[response.status] ?? 'SERVICE_UNAVAILABLE',
            ...(message !== undefined && { message }),
            retryable: outcomeUnknown || transientError || response.status === 429,
            ...(outcomeUnknown && { outcomeUnknown }),
          },
        };
      }

      const data: unknown = successStatus === 204 ? undefined : await response.json().catch(() => null);
      if (auth.currentUser !== user || controller.signal.aborted) break;
      return { ok: true, data };
    }

    return unauthenticated;
  }

  try {
    return await Promise.race([send(), timeout]);
  } catch (error) {
    if (error instanceof FirebaseError && [
      'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled', 'auth/user-not-found',
    ].includes(error.code)) {
      return unauthenticated;
    }
    return networkFailure();
  } finally {
    clearTimeout(timer);
  }
}
