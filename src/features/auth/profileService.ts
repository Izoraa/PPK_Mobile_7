import { FirebaseError } from 'firebase/app';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import type { Result } from '@/types';

interface ProfileAccount {
  uid: string;
  email: string;
}

interface StudentProfileInput {
  name: string;
  studentNumber: string;
}

export async function getActiveProfileAccount(): Promise<Result<ProfileAccount>> {
  try {
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user?.email) {
      return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
    }

    return { ok: true, data: { uid: user.uid, email: user.email } };
  } catch {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: false } };
  }
}

export async function saveStudentProfile(
  expectedUid: string,
  input: StudentProfileInput,
): Promise<Result<'created' | 'existing'>> {
  const name = input.name.trim();
  const studentNumber = input.studentNumber.trim();
  if (!name || !studentNumber) {
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
    return await runTransaction<Result<'created' | 'existing'>>(db, async (transaction) => {
      const snapshot = await transaction.get(profile);
      if (auth.currentUser?.uid !== uid) {
        return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
      }
      if (snapshot.exists()) {
        return { ok: true, data: 'existing' };
      }

      transaction.set(profile, {
        uid,
        email,
        name,
        studentNumber,
        role: 'student',
        requestedRole: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ok: true, data: 'created' };
    });
  } catch (error) {
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
}
