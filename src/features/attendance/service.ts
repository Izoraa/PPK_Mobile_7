import { FirebaseError, getApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  runTransaction,
  serverTimestamp,
  type Firestore,
  type Transaction,
  type Timestamp,
} from 'firebase/firestore';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { AttendanceError, AttendanceResult, AttendanceSession } from './types';

export type FirestoreAttendance = {
  id: string;
  sessionId: string;
  classId: string;
  assistantId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  kind: 'attendance';
  checkedInAt: string;
};

type FirestoreSessionData = {
  classId: string;
  assistantId: string;
  status: AttendanceSession['status'];
  isArchived: boolean;
};

type FirestoreMembershipData = {
  classId: string;
  assistantId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  isActive: boolean;
};

type FirestoreProfileData = {
  role: unknown;
  requestedRole: unknown;
};

type CheckInRecord = {
  sessionId: string;
  classId: string;
  assistantId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  kind: 'attendance';
  createdAt: unknown;
  updatedAt: unknown;
  checkedInAt: unknown;
};

let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

/** Reuses the Firebase app initialized by the existing client module. */
function getAttendanceFirebase(): { auth: Auth; db: Firestore } {
  if (cachedAuth && cachedFirestore) return { auth: cachedAuth, db: cachedFirestore };

  const app = getApps().length > 0 ? getApp() : getFirebaseAuth().app;
  cachedAuth = getAuth(app);
  cachedFirestore = getFirestore(app);
  return { auth: cachedAuth, db: cachedFirestore };
}

function isSessionStatus(value: unknown): value is AttendanceSession['status'] {
  return value === 'not_open' || value === 'open' || value === 'closed';
}

function readSession(id: string, value: unknown): AttendanceSession | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<FirestoreSessionData>;
  if (
    typeof data.classId !== 'string'
    || typeof data.assistantId !== 'string'
    || !isSessionStatus(data.status)
    || typeof data.isArchived !== 'boolean'
  ) return null;

  return {
    id,
    classId: data.classId,
    assistantId: data.assistantId,
    status: data.status,
    isArchived: data.isArchived,
  };
}

function readMembership(value: unknown): FirestoreMembershipData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<FirestoreMembershipData>;
  if (
    typeof data.classId !== 'string'
    || typeof data.assistantId !== 'string'
    || typeof data.studentId !== 'string'
    || typeof data.studentName !== 'string'
    || (typeof data.studentNumber !== 'string' && data.studentNumber !== null)
    || typeof data.isActive !== 'boolean'
  ) return null;
  return data as FirestoreMembershipData;
}

function readProfile(value: unknown): FirestoreProfileData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<FirestoreProfileData>;
  return data.role !== undefined && data.requestedRole !== undefined
    ? { role: data.role, requestedRole: data.requestedRole }
    : null;
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const timestamp = value as Timestamp;
    return timestamp.toDate().toISOString();
  }
  return value instanceof Date ? value.toISOString() : null;
}

function mapFirebaseError(error: unknown): AttendanceError {
  const code = error instanceof FirebaseError ? error.code : undefined;
  switch (code) {
    case 'permission-denied':
      return { code: 'FORBIDDEN', retryable: false };
    case 'unauthenticated':
      return { code: 'UNAUTHENTICATED', retryable: false };
    case 'aborted':
      return { code: 'CONFLICT', retryable: true };
    case 'unavailable':
    case 'deadline-exceeded':
    case 'network-request-failed':
      return { code: 'NETWORK_ERROR', retryable: true };
    default:
      return { code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
}

export function getAttendanceSessionReference(sessionId: string) {
  return doc(getAttendanceFirebase().db, 'sessions', sessionId);
}

export function getAttendanceParticipationReference(sessionId: string, studentId: string) {
  return doc(getAttendanceFirebase().db, 'sessions', sessionId, 'participations', studentId);
}

export function getAttendanceAuth() {
  return getAttendanceFirebase().auth;
}

export function getAttendanceFirestore() {
  return getAttendanceFirebase().db;
}

export function parseAttendanceSession(id: string, value: unknown) {
  return readSession(id, value);
}

export async function checkIn(sessionId: string): Promise<AttendanceResult<FirestoreAttendance>> {
  try {
    const { auth, db } = getAttendanceFirebase();
    const user = auth.currentUser;
    if (!user) return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };

    const sessionReference = doc(db, 'sessions', sessionId);
    const profileReference = doc(db, 'users', user.uid);
    const participationReference = doc(db, 'sessions', sessionId, 'participations', user.uid);
    let rejectedLeaveCheckIn = false;

    const transactionResult = await runTransaction<AttendanceResult<CheckInRecord>>(db, async (transaction: Transaction) => {
      const profileSnapshot = await transaction.get(profileReference);
      const sessionSnapshot = await transaction.get(sessionReference);
      if (!sessionSnapshot.exists()) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
      }

      const session = readSession(sessionId, sessionSnapshot.data());
      if (!session || session.isArchived) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
      }
      if (session.status !== 'open') {
        return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
      }

      const classSnapshot = await transaction.get(doc(db, 'classes', session.classId));
      const membershipSnapshot = await transaction.get(
        doc(db, 'memberships', `${session.classId}_${user.uid}`),
      );
      const participationSnapshot = await transaction.get(participationReference);

      const profile = readProfile(profileSnapshot.data());
      const membership = readMembership(membershipSnapshot.data());
      const classData = classSnapshot.data() as { isArchived?: unknown } | undefined;
      if (
        !profile
        || profile.role !== 'student'
        || profile.requestedRole !== 'student'
        || !classSnapshot.exists()
        || classData?.isArchived !== false
        || !membership
        || !membershipSnapshot.exists()
        || !membership.isActive
        || membership.classId !== session.classId
        || membership.studentId !== user.uid
        || membership.assistantId !== session.assistantId
      ) {
        return { ok: false, error: { code: 'FORBIDDEN', retryable: false } };
      }

      if (participationSnapshot.exists()) {
        const existing = participationSnapshot.data() as {
          kind?: unknown;
          status?: unknown;
          attendanceCheckedInAt?: unknown;
        };
        if (existing.kind !== 'leave' || existing.status !== 'rejected') {
          return { ok: false, error: { code: 'CONFLICT', retryable: false } };
        }
        if (existing.attendanceCheckedInAt) {
          return { ok: false, error: { code: 'CONFLICT', retryable: false } };
        }
        rejectedLeaveCheckIn = true;
      }

      const record: CheckInRecord = {
        sessionId,
        classId: session.classId,
        assistantId: session.assistantId,
        studentId: user.uid,
        studentName: membership.studentName,
        studentNumber: membership.studentNumber,
        kind: 'attendance',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        checkedInAt: serverTimestamp(),
      };
      if (rejectedLeaveCheckIn) {
        transaction.update(participationReference, {
          attendanceCreatedAt: serverTimestamp(),
          attendanceUpdatedAt: serverTimestamp(),
          attendanceCheckedInAt: serverTimestamp(),
        });
      } else {
        transaction.set(participationReference, record);
      }
      return { ok: true, data: record };
    });

    if (!transactionResult.ok) return transactionResult;

    let checkedInAt = new Date().toISOString();
    const confirmedData = transactionResult.data;

    try {
      let confirmedSnapshot;
      try {
        confirmedSnapshot = await getDocFromServer(participationReference);
      } catch {
        confirmedSnapshot = await getDoc(participationReference);
      }
      if (confirmedSnapshot.exists()) {
        const confirmed = confirmedSnapshot.data() as (Partial<CheckInRecord> & {
          attendanceCheckedInAt?: unknown;
        }) | undefined;
        const serverIso = timestampToIso(rejectedLeaveCheckIn
          ? confirmed?.attendanceCheckedInAt
          : confirmed?.checkedInAt);
        if (serverIso) {
          checkedInAt = serverIso;
        }
      }
    } catch {
      // Non-fatal: the transaction already committed and attendance is recorded
    }

    return {
      ok: true,
      data: {
        id: participationReference.id,
        sessionId,
        classId: confirmedData.classId,
        assistantId: confirmedData.assistantId,
        studentId: user.uid,
        studentName: confirmedData.studentName,
        studentNumber: confirmedData.studentNumber,
        kind: 'attendance',
        checkedInAt,
      },
    };
  } catch (error) {
    return { ok: false, error: mapFirebaseError(error) };
  }
}
