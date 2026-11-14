import { FirebaseError } from 'firebase/app';
import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import type { Result, Role } from '@/types';

export type ProfileStatus = 'student' | 'assistantPending' | 'assistant';

interface ProfileAccount {
  uid: string;
  email: string;
  profileStatus: ProfileStatus | null;
}

interface RegistrationProfileInput {
  name: string;
  studentNumber: string;
  requestedRole: Role;
}

function readProfileStatus(role: unknown, requestedRole: unknown): ProfileStatus {
  if (role === 'student' && requestedRole === 'student') return 'student';
  if (role === 'student' && requestedRole === 'assistant') return 'assistantPending';
  if (role === 'assistant' && requestedRole === 'assistant') return 'assistant';
  throw new Error('Invalid profile role.');
}

export async function getActiveProfileAccount(): Promise<Result<ProfileAccount>> {
  try {
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user?.email) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const profile = await getDocFromServer(doc(getFirebaseFirestore(), 'users', user.uid));
    if (auth.currentUser?.uid !== user.uid) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    const data = profile.data();
    const profileStatus = data ? readProfileStatus(data.role, data.requestedRole) : null;
    return { ok: true, data: { uid: user.uid, email: user.email, profileStatus } };
  } catch (error) {
    return profileFailure(error);
  }
}

export async function saveRegistrationProfile(
  expectedUid: string,
  input: RegistrationProfileInput,
): Promise<Result<ProfileStatus>> {
  const { requestedRole } = input;
  const name = input.name.trim();
  const studentNumber = requestedRole === 'student' ? input.studentNumber.trim() : null;
  if (!name || (requestedRole !== 'student' && requestedRole !== 'assistant') || studentNumber === '') {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

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
        return { ok: true, data: readProfileStatus(existing.role, existing.requestedRole) };
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
      return { ok: true, data: readProfileStatus('student', requestedRole) };
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
