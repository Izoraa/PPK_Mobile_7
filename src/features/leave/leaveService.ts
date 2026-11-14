import { FirebaseError } from 'firebase/app';
import {
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import type { AppErrorCode, Result } from '@/types';

import { validateLeaveReason } from './validation';

export interface LeaveSubmissionRef {
  sessionId: string;
  studentId: string;
}

export interface SubmitLeaveInput {
  sessionId: string;
  reason: string;
}

class LeaveSubmitError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly retryable = false,
  ) {
    super(code);
    this.name = 'LeaveSubmitError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDocument(snapshot: DocumentSnapshot): Record<string, unknown> | null {
  const data: unknown = snapshot.data();
  return isRecord(data) ? data : null;
}

function mapFailure(error: unknown): { code: AppErrorCode; retryable: boolean } {
  if (error instanceof LeaveSubmitError) {
    return { code: error.code, retryable: error.retryable };
  }

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
      case 'aborted':
        return { code: 'CONFLICT', retryable: true };
      case 'not-found':
        return { code: 'NOT_FOUND', retryable: false };
      default:
        return { code: 'SERVICE_UNAVAILABLE', retryable: false };
    }
  }

  return { code: 'SERVICE_UNAVAILABLE', retryable: false };
}

export async function submitLeave(
  input: SubmitLeaveInput,
): Promise<Result<LeaveSubmissionRef>> {
  const reason = validateLeaveReason(input.reason);
  const sessionId = input.sessionId.trim();

  if (!reason.valid || !sessionId || sessionId.includes('/') || sessionId === '.' || sessionId === '..') {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const db = getFirebaseFirestore();
    const uid = user.uid;
    const userRef = doc(db, 'users', uid);
    const sessionRef = doc(db, 'sessions', sessionId);
    const participationRef = doc(db, 'sessions', sessionId, 'participations', uid);

    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const userData = readDocument(userSnapshot);
      if (!userData) throw new LeaveSubmitError('PROFILE_INCOMPLETE');
      if (userData.uid !== uid || userData.role !== 'student' || userData.requestedRole !== 'student') {
        throw new LeaveSubmitError('FORBIDDEN');
      }
      if (typeof userData.name !== 'string' || !userData.name.trim()
        || typeof userData.studentNumber !== 'string' || !userData.studentNumber.trim()) {
        throw new LeaveSubmitError('PROFILE_INCOMPLETE');
      }

      const sessionSnapshot = await transaction.get(sessionRef);
      const session = readDocument(sessionSnapshot);
      if (!session) throw new LeaveSubmitError('NOT_FOUND');

      const { classId, assistantId, status, isArchived } = session;
      if (typeof classId !== 'string' || !classId || classId.includes('/')
        || classId === '.' || classId === '..'
        || typeof assistantId !== 'string' || !assistantId || typeof isArchived !== 'boolean') {
        throw new LeaveSubmitError('SERVICE_UNAVAILABLE');
      }
      if (isArchived) throw new LeaveSubmitError('SESSION_ARCHIVED');
      if (status === 'closed') throw new LeaveSubmitError('SESSION_CLOSED');
      if (status !== 'not_open' && status !== 'open') {
        throw new LeaveSubmitError('SERVICE_UNAVAILABLE');
      }

      const classRef = doc(db, 'classes', classId);
      const membershipRef = doc(db, 'memberships', `${classId}_${uid}`);
      const classSnapshot = await transaction.get(classRef);
      const membershipSnapshot = await transaction.get(membershipRef);
      const participationSnapshot = await transaction.get(participationRef);

      const classData = readDocument(classSnapshot);
      const membership = readDocument(membershipSnapshot);
      if (!classData) throw new LeaveSubmitError('NOT_FOUND');
      if (classData.isArchived === true) throw new LeaveSubmitError('CLASS_ARCHIVED');
      if (classData.isArchived !== false || classData.assistantId !== assistantId) {
        throw new LeaveSubmitError('SERVICE_UNAVAILABLE');
      }
      if (!membership || membership.classId !== classId || membership.studentId !== uid
        || membership.isActive !== true || membership.assistantId !== assistantId) {
        throw new LeaveSubmitError('NOT_ENROLLED');
      }
      if (membership.studentName !== userData.name
        || membership.studentNumber !== userData.studentNumber) {
        throw new LeaveSubmitError('PROFILE_INCOMPLETE');
      }

      if (participationSnapshot.exists()) {
        const participation = readDocument(participationSnapshot);
        if (participation?.kind === 'attendance') {
          throw new LeaveSubmitError('ALREADY_CHECKED_IN');
        }
        if (participation?.kind === 'leave') {
          throw new LeaveSubmitError('ALREADY_SUBMITTED');
        }
        throw new LeaveSubmitError('PARTICIPATION_CONFLICT');
      }

      if (auth.currentUser?.uid !== uid) {
        throw new LeaveSubmitError('UNAUTHENTICATED');
      }

      transaction.set(participationRef, {
        sessionId,
        classId,
        assistantId,
        studentId: uid,
        studentName: membership.studentName,
        studentNumber: membership.studentNumber,
        kind: 'leave',
        reason: reason.value,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        ai: {
          status: 'pending',
          category: null,
          confidence: null,
          modelVersion: null,
          classifiedAt: null,
          errorCode: null,
          requestId: null,
          startedAt: null,
          attemptCount: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { ok: true, data: { sessionId, studentId: uid } };
  } catch (error) {
    return { ok: false, error: mapFailure(error) };
  }
}
