import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

export function getFirebaseAuth(): Auth {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!apiKey || !projectId || !appId) {
    throw new Error('Firebase client configuration is incomplete.');
  }

  return getAuth(initializeApp({ apiKey, authDomain, projectId, appId }));
}
