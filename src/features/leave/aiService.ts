import { getFirebaseAuth } from '@/lib/firebase/client';
import type { AppErrorCode, Result } from '@/types';

import type { LeaveSubmissionRef } from './leaveService';

export type ClassificationStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

type ClassificationOutput = {
  aiStatus: ClassificationStatus;
  category?: string;
};

function mapHttpError(status: number): {
  code: AppErrorCode;
  retryable: boolean;
} {
  switch (status) {
    case 400:
      return { code: 'VALIDATION_ERROR', retryable: false };
    case 401:
      return { code: 'UNAUTHENTICATED', retryable: false };
    case 403:
      return { code: 'FORBIDDEN', retryable: false };
    case 404:
      return { code: 'NOT_FOUND', retryable: false };
    case 409:
    case 429:
      return { code: 'CONFLICT', retryable: false };
    default:
      return { code: 'AI_UNAVAILABLE', retryable: true };
  }
}

export async function requestClassification(
  input: LeaveSubmissionRef,
): Promise<Result<ClassificationOutput>> {
  try {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      return {
        ok: false,
        error: { code: 'UNAUTHENTICATED', retryable: false },
      };
    }

    const baseUrl = process.env.EXPO_PUBLIC_LEAVE_AI_API_URL?.trim();

    if (!baseUrl) {
      return {
        ok: false,
        error: { code: 'SERVICE_UNAVAILABLE', retryable: false },
      };
    }

    const idToken = await user.getIdToken();
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/classify-leave`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: input.sessionId,
          studentId: input.studentId,
        }),
      },
    );

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: mapHttpError(response.status),
      };
    }

    if (
      typeof body !== 'object'
      || body === null
      || !('aiStatus' in body)
    ) {
      return {
        ok: false,
        error: { code: 'SERVICE_UNAVAILABLE', retryable: true },
      };
    }

    const aiStatus = body.aiStatus;

    if (
      aiStatus !== 'pending'
      && aiStatus !== 'processing'
      && aiStatus !== 'succeeded'
      && aiStatus !== 'failed'
    ) {
      return {
        ok: false,
        error: { code: 'SERVICE_UNAVAILABLE', retryable: true },
      };
    }

    const category =
      'category' in body && typeof body.category === 'string'
        ? body.category
        : undefined;

    return {
      ok: true,
      data: { aiStatus, category },
    };
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', retryable: true },
    };
  }
}