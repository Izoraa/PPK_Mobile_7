import { FirebaseError } from 'firebase/app';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { getConfirmedDocument } from '@/lib/firebase/serverRead';
import type { Result, User } from '@/types';

import { validateProfile, type RegistrationProfileInput } from './validation';

export type ProfileStatus = 'student' | 'assistantPending' | 'assistant' | 'coordinator';

interface ProfileAccount {
  uid: string;
  email: string;
  profileExists: boolean;
  profileStatus: ProfileStatus | null;
  applicationUser: User | null;
}

function readProfileStatus(data: Record<string, unknown>, uid: string, email: string): ProfileStatus | null {
  const { uid: profileUid, email: profileEmail, name, studentNumber, role, requestedRole } = data;
  if (profileUid !== uid || typeof profileEmail !== 'string'
    || profileEmail.trim().toLowerCase() !== email.toLowerCase()
    || typeof name !== 'string' || !name.trim()) return null;

  if (role === 'coordinator') {
    return 'coordinator';
  }
  if (role === 'student' && requestedRole === 'student' && typeof studentNumber === 'string' && studentNumber.trim()) {
    return 'student';
  }
  if (role === 'student' && requestedRole === 'assistant') return 'assistantPending';
  if (role === 'assistant' && requestedRole === 'assistant') return 'assistant';
  return null;
}

export async function getActiveProfileAccount(expectedUid?: string): Promise<Result<ProfileAccount>> {
  try {
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user?.email || (expectedUid !== undefined && user.uid !== expectedUid)) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const profile = await getConfirmedDocument(doc(getFirebaseFirestore(), 'users', user.uid));
    if (auth.currentUser?.uid !== user.uid) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const data: Record<string, unknown> | undefined = profile.data();
    const name = data?.name;
    const studentNumber = data?.studentNumber;
    const profileStatus = data ? readProfileStatus(data, user.uid, user.email) : null;
    let applicationUser: User | null = null;
    if (typeof name === 'string' && name.trim()) {
      if (profileStatus === 'coordinator') {
        applicationUser = {
          id: user.uid,
          name,
          ...(typeof studentNumber === 'string' && studentNumber.trim() ? { studentNumber } : {}),
          role: 'coordinator',
        };
      } else if (profileStatus === 'assistant') {
        applicationUser = {
          id: user.uid,
          name,
          ...(typeof studentNumber === 'string' && studentNumber.trim() ? { studentNumber } : {}),
          role: 'assistant',
        };
      } else if (profileStatus === 'student' && typeof studentNumber === 'string' && studentNumber.trim()) {
        applicationUser = { id: user.uid, name, studentNumber, role: 'student' };
      }
    }

    return {
      ok: true,
      data: { uid: user.uid, email: user.email, profileExists: profile.exists(), profileStatus, applicationUser },
    };
  } catch (error) {
    return profileFailure(error);
  }
}

export async function saveRegistrationProfile(
  expectedUid: string,
  input: RegistrationProfileInput,
): Promise<Result<ProfileStatus>> {
  if (validateProfile(input)) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }
  const { requestedRole } = input;
  const name = input.name.trim();
  const studentNumber = input.studentNumber.trim();

  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user?.email || user.uid !== expectedUid) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const { uid, email } = user;
    const db = getFirebaseFirestore();
    const profile = doc(db, 'users', uid);
    return await runTransaction<Result<ProfileStatus>>(db, async (transaction) => {
      const snapshot = await transaction.get(profile);
      if (auth.currentUser?.uid !== uid) {
        return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
      }
      const existing = snapshot.data();
      if (existing) {
        const status = readProfileStatus(existing, uid, email);
        return status
          ? { ok: true, data: status }
          : { ok: false, error: { code: 'PROFILE_INCOMPLETE', retryable: false } };
      }

      transaction.set(profile, {
        uid,
        email,
        name,
        studentNumber,
        role: 'student',
        requestedRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ok: true, data: requestedRole === 'assistant' ? 'assistantPending' : 'student' };
    });
  } catch (error) {
    return profileFailure(error);
  }
}

function profileFailure(error: unknown): Extract<Result<never>, { ok: false }> {
  const code = error instanceof FirebaseError ? error.code : undefined;
  switch (code) {
    case 'unauthenticated':
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    case 'permission-denied':
      return { ok: false, error: { code: 'FORBIDDEN', retryable: false } };
    case 'unavailable':
    case 'deadline-exceeded':
      return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
    default:
      return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
  }
}
