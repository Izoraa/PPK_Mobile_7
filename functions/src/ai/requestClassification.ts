import { randomUUID } from 'node:crypto';

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

import {
  MAX_ATTEMPTS,
  MAX_REASON_CODE_POINTS,
  MIN_REASON_CODE_POINTS,
  PROCESSING_LEASE_MS,
  RETRY_COOLDOWN_MS,
} from './contract.js';
import { classifyReason, ProviderFailure } from './provider.js';

if (getApps().length === 0) initializeApp();

const AI_API_KEY = defineSecret('AI_API_KEY');
const FUNCTION_REGION = process.env.AI_FUNCTIONS_REGION?.trim() || 'us-central1';

type Input = { sessionId: string; studentId: string };
type Output = { aiStatus: 'pending' | 'processing' | 'succeeded' | 'failed' };
type StoredRecord = Record<string, unknown>;

class RequestFailure extends Error {
  constructor(
    readonly callableCode: 'unauthenticated' | 'permission-denied' | 'invalid-argument'
      | 'not-found' | 'failed-precondition' | 'resource-exhausted' | 'unavailable',
    readonly appCode: string,
    readonly retryable: boolean,
  ) {
    super(appCode);
    this.name = 'RequestFailure';
  }
}

function isObject(value: unknown): value is StoredRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDocumentId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 128
    && !value.includes('/')
    && value !== '.'
    && value !== '..';
}

function parseInput(data: unknown): Input {
  if (!isObject(data)
    || Object.keys(data).length !== 2
    || !isDocumentId(data.sessionId)
    || !isDocumentId(data.studentId)) {
    throw new RequestFailure('invalid-argument', 'VALIDATION_ERROR', false);
  }
  return { sessionId: data.sessionId, studentId: data.studentId };
}

function appError(
  callableCode: ConstructorParameters<typeof HttpsError>[0],
  appCode: string,
  retryable: boolean,
  message = 'Klasifikasi AI belum tersedia.',
): HttpsError {
  return new HttpsError(callableCode, message, { appCode, retryable });
}

function failFromProvider(error: ProviderFailure): HttpsError {
  if (error.appCode === 'AI_TIMEOUT') {
    return appError('deadline-exceeded', error.appCode, true);
  }
  if (error.appCode === 'AI_INVALID_RESPONSE') {
    return appError('data-loss', error.appCode, error.retryable);
  }
  if (error.retryable) return appError('unavailable', error.appCode, true);
  return appError('failed-precondition', error.appCode, false);
}

function storedFailureCode(error: unknown): string {
  if (error instanceof ProviderFailure && !error.retryable) return 'AI_UNAVAILABLE_PERMANENT';
  if (error instanceof ProviderFailure) return error.appCode;
  return 'AI_UNAVAILABLE';
}

function mapFailure(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof RequestFailure) {
    return appError(error.callableCode, error.appCode, error.retryable, 'Permintaan klasifikasi tidak dapat diproses.');
  }
  if (error instanceof ProviderFailure) return failFromProvider(error);
  return appError('unavailable', 'SERVICE_UNAVAILABLE', true);
}

function timestampMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

function getFirestoreClient() {
  return getFirestore();
}

async function claimClassification(request: CallableRequest<unknown>, input: Input) {
  const uid = request.auth?.uid;
  if (!uid) throw new RequestFailure('unauthenticated', 'UNAUTHENTICATED', false);

  const db = getFirestoreClient();
  const userRef = db.doc(`users/${uid}`);
  const sessionRef = db.doc(`sessions/${input.sessionId}`);
  const participationRef = db.doc(`sessions/${input.sessionId}/participations/${input.studentId}`);
  const requestId = randomUUID();

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, sessionSnapshot, participationSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(sessionRef),
      transaction.get(participationRef),
    ]);
    if (!userSnapshot.exists) throw new RequestFailure('permission-denied', 'FORBIDDEN', false);
    if (!sessionSnapshot.exists || !participationSnapshot.exists) {
      throw new RequestFailure('not-found', 'NOT_FOUND', false);
    }

    const user = userSnapshot.data();
    const session = sessionSnapshot.data();
    const record = participationSnapshot.data();
    if (!user || !session || !record) {
      throw new RequestFailure('not-found', 'NOT_FOUND', false);
    }

    const classId = session.classId;
    if (!isDocumentId(classId)) throw new RequestFailure('failed-precondition', 'SERVICE_UNAVAILABLE', false);
    const classSnapshot = await transaction.get(db.doc(`classes/${classId}`));
    const classData = classSnapshot.data();
    if (!classSnapshot.exists || !classData) throw new RequestFailure('not-found', 'NOT_FOUND', false);

    const isStudentOwner = uid === input.studentId
      && user.role === 'student'
      && user.requestedRole === 'student';
    const isAssistantOwner = user.role === 'assistant'
      && session.assistantId === uid
      && classData.assistantId === uid;
    if (!isStudentOwner && !isAssistantOwner) {
      throw new RequestFailure('permission-denied', 'FORBIDDEN', false);
    }

    if (record.kind !== 'leave'
      || record.sessionId !== input.sessionId
      || record.studentId !== input.studentId
      || record.classId !== classId
      || record.assistantId !== session.assistantId
      || classData.assistantId !== session.assistantId) {
      throw new RequestFailure('failed-precondition', 'SERVICE_UNAVAILABLE', false);
    }

    const reason = typeof record.reason === 'string' ? record.reason.trim() : '';
    const reasonLength = Array.from(reason).length;
    if (reasonLength < MIN_REASON_CODE_POINTS || reasonLength > MAX_REASON_CODE_POINTS) {
      throw new RequestFailure('failed-precondition', 'VALIDATION_ERROR', false);
    }

    const ai = isObject(record.ai) ? record.ai : null;
    if (!ai || !['pending', 'processing', 'succeeded', 'failed'].includes(String(ai.status))) {
      throw new RequestFailure('failed-precondition', 'SERVICE_UNAVAILABLE', false);
    }
    if (ai.status === 'succeeded') return { status: 'succeeded' as const, requestId: null, reason: null };

    const now = Date.now();
    const startedAt = timestampMillis(ai.startedAt);
    if (ai.status === 'processing' && startedAt !== null && now - startedAt < PROCESSING_LEASE_MS) {
      return { status: 'processing' as const, requestId: null, reason: null };
    }

    const attemptCount = typeof ai.attemptCount === 'number' && Number.isInteger(ai.attemptCount)
      ? ai.attemptCount
      : -1;
    if (attemptCount < 0 || attemptCount >= MAX_ATTEMPTS) {
      throw new RequestFailure('resource-exhausted', 'CONFLICT', false);
    }

    if (ai.status === 'failed' && ai.errorCode === 'AI_UNAVAILABLE_PERMANENT') {
      throw new RequestFailure('failed-precondition', 'AI_UNAVAILABLE', false);
    }
    const retryAfterAt = timestampMillis(ai.retryAfterAt);
    if (retryAfterAt !== null && now < retryAfterAt) {
      throw new RequestFailure('resource-exhausted', 'CONFLICT', false);
    }
    if (startedAt !== null && now - startedAt < RETRY_COOLDOWN_MS) {
      throw new RequestFailure('resource-exhausted', 'CONFLICT', false);
    }

    transaction.update(participationRef, {
      'ai.status': 'processing',
      'ai.category': null,
      'ai.confidence': null,
      'ai.modelVersion': null,
      'ai.classifiedAt': null,
      'ai.errorCode': null,
      'ai.retryAfterAt': null,
      'ai.requestId': requestId,
      'ai.startedAt': Timestamp.fromMillis(now),
      'ai.attemptCount': attemptCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: 'processing' as const, requestId, reason };
  });
}

async function saveFailure(input: Input, requestId: string, error: unknown): Promise<void> {
  const db = getFirestoreClient();
  const ref = db.doc(`sessions/${input.sessionId}/participations/${input.studentId}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const ai = isObject(data?.ai) ? data.ai : null;
    if (!snapshot.exists || !ai || ai.requestId !== requestId || ai.status !== 'processing') return;
    transaction.update(ref, {
      'ai.status': 'failed',
      'ai.category': null,
      'ai.confidence': null,
      'ai.modelVersion': null,
      'ai.classifiedAt': null,
      'ai.errorCode': storedFailureCode(error),
      'ai.retryAfterAt': error instanceof ProviderFailure && error.retryAfterMs !== null
        ? Timestamp.fromMillis(Date.now() + error.retryAfterMs)
        : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export const requestClassification = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 45,
    secrets: [AI_API_KEY],
  },
  async (request): Promise<Output> => {
    let input: Input;
    let claim: Awaited<ReturnType<typeof claimClassification>>;
    try {
      input = parseInput(request.data);
      claim = await claimClassification(request, input);
    } catch (error) {
      throw mapFailure(error);
    }
    if (!claim.requestId || !claim.reason) return { aiStatus: claim.status };

    const startedAt = Date.now();
    try {
      const apiKey = (process.env.AI_PROVIDER_MODE?.trim() || 'mock') === 'live'
        ? AI_API_KEY.value()
        : null;
      const classification = await classifyReason(claim.reason, apiKey);
      const ref = getFirestoreClient().doc(
        `sessions/${input.sessionId}/participations/${input.studentId}`,
      );
      const saved = await getFirestoreClient().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const record = snapshot.data();
        const ai = isObject(record?.ai) ? record.ai : null;
        if (!snapshot.exists || !ai || ai.requestId !== claim.requestId || ai.status !== 'processing') {
          return false;
        }
        if (record?.reason !== claim.reason) {
          transaction.update(ref, {
            'ai.status': 'failed',
            'ai.category': null,
            'ai.confidence': null,
            'ai.modelVersion': null,
            'ai.classifiedAt': null,
            'ai.errorCode': 'CONFLICT',
            'ai.retryAfterAt': null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return false;
        }
        transaction.update(ref, {
          'ai.status': 'succeeded',
          'ai.category': classification.category,
          'ai.confidence': classification.confidence,
          'ai.modelVersion': classification.modelVersion,
          'ai.classifiedAt': FieldValue.serverTimestamp(),
          'ai.errorCode': null,
          'ai.retryAfterAt': null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return true;
      });

      console.info('AI classification finished', {
        requestId: claim.requestId,
        durationMs: Date.now() - startedAt,
        outcome: saved ? 'saved' : 'stale',
      });
      if (!saved) {
        const latest = await ref.get();
        const latestStatus = latest.data()?.ai?.status;
        return { aiStatus: latestStatus === 'succeeded' || latestStatus === 'failed'
          ? latestStatus
          : 'processing' };
      }
      return { aiStatus: 'succeeded' };
    } catch (error) {
      try {
        await saveFailure(input, claim.requestId, error);
      } catch {
        console.error('AI failure state could not be saved', { requestId: claim.requestId });
      }
      const safeError = mapFailure(error);
      console.warn('AI classification failed', {
        requestId: claim.requestId,
        durationMs: Date.now() - startedAt,
        callableCode: safeError.code,
        upstreamStatus: error instanceof ProviderFailure ? error.httpStatus : null,
      });
      throw safeError;
    }
  },
);
