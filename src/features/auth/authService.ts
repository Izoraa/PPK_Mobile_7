import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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

export type AccountIdentity =
  | { status: 'ready'; user: User }
  | { status: 'profileMissing' | 'profileIncomplete' | 'assistantPending' };

async function readAccountIdentity(expectedUid: string): Promise<Result<AccountIdentity>> {
  const profile = await getActiveProfileAccount(expectedUid);
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
}

export async function restoreIdentity(): Promise<Result<AccountIdentity | { status: 'signedOut' }>> {
  try {
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const uid = auth.currentUser?.uid;
    if (!uid) return { ok: true, data: { status: 'signedOut' } };

    const result = await readAccountIdentity(uid);
    if (!result.ok && result.error.code === 'UNAUTHENTICATED' && !auth.currentUser) {
      return { ok: true, data: { status: 'signedOut' } };
    }
    return result;
  } catch {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
  }
}

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

export async function login({ email, password }: EmailPasswordInput): Promise<Result<AccountIdentity>> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

  try {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), normalizedEmail, password);
    return await readAccountIdentity(user.uid);
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

export async function logout(): Promise<Result<void>> {
  try {
    await signOut(getFirebaseAuth());
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
  }
}
