import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { Result, User } from '@/types';

import { getActiveProfileAccount } from './profileService';

interface EmailPasswordInput {
  email: string;
  password: string;
}

interface RegisterData {
  uid: string;
}

type LoginData =
  | { status: 'ready'; user: User }
  | { status: 'profileMissing' | 'profileIncomplete' | 'assistantPending' };

export async function register({ email, password }: EmailPasswordInput): Promise<Result<RegisterData>> {
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

export async function login({ email, password }: EmailPasswordInput): Promise<Result<LoginData>> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

  try {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), normalizedEmail, password);
    const profile = await getActiveProfileAccount(user.uid);
    if (!profile.ok) return profile;

    if (profile.data.applicationUser) {
      return { ok: true, data: { status: 'ready', user: profile.data.applicationUser } };
    }

    switch (profile.data.profileStatus) {
      case null:
        return { ok: true, data: { status: 'profileMissing' } };
      case 'assistantPending':
        return { ok: true, data: { status: 'assistantPending' } };
      default:
        return { ok: true, data: { status: 'profileIncomplete' } };
    }
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : undefined;
    switch (code) {
      case 'auth/invalid-email':
        return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/user-disabled':
        return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
      case 'auth/network-request-failed':
        return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
      default:
        return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: code === 'auth/too-many-requests' } };
    }
  }
}
