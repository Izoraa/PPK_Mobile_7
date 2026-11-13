import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { Result } from '@/types';

interface RegisterInput {
  email: string;
  password: string;
}

interface RegisterData {
  uid: string;
}

export async function register({ email, password }: RegisterInput): Promise<Result<RegisterData>> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

  try {
    const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), normalizedEmail, password);
    return { ok: true, data: { uid: user.uid } };
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : undefined;

    switch (code) {
      case 'auth/email-already-in-use':
        return { ok: false, error: { code: 'CONFLICT', retryable: false } };
      case 'auth/invalid-email':
      case 'auth/weak-password':
      case 'auth/password-does-not-meet-requirements':
        return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
      case 'auth/network-request-failed':
        return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
      default:
        return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: code === 'auth/too-many-requests' } };
    }
  }
}
