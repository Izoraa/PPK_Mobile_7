import { FirebaseError } from 'firebase/app';
import {
  collectionGroup,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';

import type {
  LeaveAiClassification,
  LeaveDecisionStatus,
  LeaveListenerError,
  LeaveRequestRecord,
  LeaveSnapshot,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableTimestamp(value: unknown): value is Timestamp | null {
  return value === null || value instanceof Timestamp;
}

function isDecisionStatus(value: unknown): value is LeaveDecisionStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

function parseAiClassification(value: unknown): LeaveAiClassification | null {
  if (!isRecord(value)) return null;

  const { status, category, confidence, modelVersion, classifiedAt, errorCode,
    requestId, startedAt, attemptCount } = value;

  if ((status !== 'pending' && status !== 'processing' && status !== 'succeeded' && status !== 'failed')
    || !isNullableString(category)
    || (confidence !== null && (typeof confidence !== 'number' || !Number.isFinite(confidence)))
    || !isNullableString(modelVersion)
    || !isNullableTimestamp(classifiedAt)
    || !isNullableString(errorCode)
    || !isNullableString(requestId)
    || !isNullableTimestamp(startedAt)
    || typeof attemptCount !== 'number' || !Number.isInteger(attemptCount) || attemptCount < 0) {
    return null;
  }

  return {
    status,
    category,
    confidence,
    modelVersion,
    classifiedAt,
    errorCode,
    requestId,
    startedAt,
    attemptCount,
  };
}

function parseLeaveRequest(snapshot: DocumentSnapshot): LeaveRequestRecord | null {
  const data: unknown = snapshot.data({ serverTimestamps: 'estimate' });
  if (!isRecord(data)) return null;

  const ai = parseAiClassification(data.ai);
  if (!ai
    || data.kind !== 'leave'
    || typeof data.sessionId !== 'string'
    || !data.sessionId
    || typeof data.classId !== 'string'
    || typeof data.assistantId !== 'string'
    || typeof data.studentId !== 'string'
    || typeof data.studentName !== 'string'
    || typeof data.studentNumber !== 'string'
    || typeof data.reason !== 'string'
    || !isDecisionStatus(data.status)
    || !isNullableString(data.reviewedBy)
    || !isNullableTimestamp(data.reviewedAt)
    || !isNullableString(data.reviewNote)
    || !isNullableTimestamp(data.createdAt)
    || !isNullableTimestamp(data.updatedAt)) {
    return null;
  }

  return {
    sessionId: data.sessionId,
    classId: data.classId,
    assistantId: data.assistantId,
    studentId: data.studentId,
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    reason: data.reason,
    status: data.status,
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAt,
    reviewNote: data.reviewNote,
    ai,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapListenerError(error: unknown): LeaveListenerError {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-token-expired':
      case 'unauthenticated':
        return { code: 'UNAUTHENTICATED', retryable: false };
      case 'permission-denied':
        return { code: 'FORBIDDEN', retryable: false };
      case 'unavailable':
      case 'deadline-exceeded':
        return { code: 'NETWORK_ERROR', retryable: true };
      case 'not-found':
        return { code: 'NOT_FOUND', retryable: false };
      default:
        return { code: 'SERVICE_UNAVAILABLE', retryable: false };
    }
  }

  return { code: 'SERVICE_UNAVAILABLE', retryable: false };
}

function noSubscription(): Unsubscribe {
  return () => undefined;
}

export function subscribeMyLeaves(
  onChange: (snapshot: LeaveSnapshot<LeaveRequestRecord[]>) => void,
  onError: (error: LeaveListenerError) => void,
): Unsubscribe {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      onError({ code: 'UNAUTHENTICATED', retryable: false });
      return noSubscription();
    }

    const leaveQuery = query(
      collectionGroup(getFirebaseFirestore(), 'participations'),
      where('studentId', '==', user.uid),
      where('kind', '==', 'leave'),
      orderBy('createdAt', 'desc'),
    );

    return onSnapshot(
      leaveQuery,
      { includeMetadataChanges: true },
      (querySnapshot) => {
        const requests: LeaveRequestRecord[] = [];
        for (const document of querySnapshot.docs) {
          const request = parseLeaveRequest(document);
          if (!request || request.studentId !== user.uid || document.id !== user.uid) {
            onError({ code: 'SERVICE_UNAVAILABLE', retryable: false });
            return;
          }
          requests.push(request);
        }

        onChange({
          data: requests,
          fromCache: querySnapshot.metadata.fromCache,
          hasPendingWrites: querySnapshot.metadata.hasPendingWrites
            || querySnapshot.docs.some((document) => document.metadata.hasPendingWrites),
        });
      },
      (error) => onError(mapListenerError(error)),
    );
  } catch (error) {
    onError(mapListenerError(error));
    return noSubscription();
  }
}

export function subscribeMyLeave(
  sessionId: string,
  onChange: (snapshot: LeaveSnapshot<LeaveRequestRecord | null>) => void,
  onError: (error: LeaveListenerError) => void,
): Unsubscribe {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId || normalizedSessionId.includes('/')
    || normalizedSessionId === '.' || normalizedSessionId === '..') {
    onError({ code: 'VALIDATION_ERROR', retryable: false });
    return noSubscription();
  }

  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      onError({ code: 'UNAUTHENTICATED', retryable: false });
      return noSubscription();
    }

    const participationRef = doc(
      getFirebaseFirestore(),
      'sessions',
      normalizedSessionId,
      'participations',
      user.uid,
    );

    return onSnapshot(
      participationRef,
      { includeMetadataChanges: true },
      (document) => {
        if (!document.exists()) {
          onChange({
            data: null,
            fromCache: document.metadata.fromCache,
            hasPendingWrites: document.metadata.hasPendingWrites,
          });
          return;
        }

        const request = parseLeaveRequest(document);
        if (!request || request.studentId !== user.uid || request.sessionId !== normalizedSessionId
          || document.id !== user.uid) {
          onError({ code: 'SERVICE_UNAVAILABLE', retryable: false });
          return;
        }

        onChange({
          data: request,
          fromCache: document.metadata.fromCache,
          hasPendingWrites: document.metadata.hasPendingWrites,
        });
      },
      (error) => onError(mapListenerError(error)),
    );
  } catch (error) {
    onError(mapListenerError(error));
    return noSubscription();
  }
}
