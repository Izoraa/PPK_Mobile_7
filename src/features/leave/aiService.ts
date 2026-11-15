import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { getFirebaseFunctions } from '@/lib/firebase/client';
import type { AppErrorCode, Result } from '@/types';

import type { LeaveSubmissionRef } from './leaveService';

export type ClassificationStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

type ClassificationOutput = { aiStatus: ClassificationStatus };
type ClassificationInput = { sessionId: string; studentId: string };

function mapCallableError(error: unknown): { code: AppErrorCode; retryable: boolean } {
  if (error instanceof FirebaseError) {
    const details = error.customData?.details;
    if (typeof details === 'object' && details !== null) {
      const payload = details as Record<string, unknown>;
      const code = payload.appCode;
      const retryable = payload.retryable;
      if ((code === 'AI_TIMEOUT' || code === 'AI_UNAVAILABLE' || code === 'AI_INVALID_RESPONSE'
        || code === 'UNAUTHENTICATED' || code === 'FORBIDDEN' || code === 'VALIDATION_ERROR'
        || code === 'NOT_FOUND' || code === 'CONFLICT' || code === 'SERVICE_UNAVAILABLE')
        && typeof retryable === 'boolean') {
        return { code, retryable };
      }
    }

    switch (error.code) {
      case 'functions/unauthenticated': return { code: 'UNAUTHENTICATED', retryable: false };
      case 'functions/permission-denied': return { code: 'FORBIDDEN', retryable: false };
      case 'functions/invalid-argument': return { code: 'VALIDATION_ERROR', retryable: false };
      case 'functions/not-found': return { code: 'NOT_FOUND', retryable: false };
      case 'functions/resource-exhausted': return { code: 'CONFLICT', retryable: false };
      case 'functions/deadline-exceeded': return { code: 'AI_TIMEOUT', retryable: true };
      case 'functions/unavailable': return { code: 'AI_UNAVAILABLE', retryable: true };
      case 'functions/data-loss': return { code: 'AI_INVALID_RESPONSE', retryable: true };
      default: return { code: 'SERVICE_UNAVAILABLE', retryable: true };
    }
  }

  return { code: 'SERVICE_UNAVAILABLE', retryable: true };
}

export async function requestClassification(
  input: LeaveSubmissionRef,
): Promise<Result<ClassificationOutput>> {
  const payload: ClassificationInput = {
    sessionId: input.sessionId,
    studentId: input.studentId,
  };

  try {
    const callable = httpsCallable<ClassificationInput, ClassificationOutput>(
      getFirebaseFunctions(),
      'requestClassification',
    );
    const response = await callable(payload);
    const status = response.data?.aiStatus;
    if (status !== 'pending' && status !== 'processing' && status !== 'succeeded' && status !== 'failed') {
      return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
    }
    return { ok: true, data: { aiStatus: status } };
  } catch (error) {
    return { ok: false, error: mapCallableError(error) };
  }
}
