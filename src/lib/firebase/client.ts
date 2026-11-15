import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions';

import { getPlatformAuth } from './auth';

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!apiKey || !projectId || !appId) {
    throw new Error('Firebase client configuration is incomplete.');
  }

  return initializeApp({ apiKey, authDomain, projectId, appId });
}

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;
  const auth = getPlatformAuth(getFirebaseApp());
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (emulatorHost) connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  firebaseAuth = auth;
  return auth;
}

let firebaseFirestore: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  if (firebaseFirestore) return firebaseFirestore;
  const db = getFirestore(getFirebaseApp());
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (emulatorHost) connectFirestoreEmulator(db, emulatorHost, 8080);
  firebaseFirestore = db;
  return db;
}

let firebaseFunctions: Functions | null = null;

export function getFirebaseFunctions(): Functions {
  if (firebaseFunctions) return firebaseFunctions;
  const region = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION?.trim() || 'us-central1';
  const functions = getFunctions(getFirebaseApp(), region);
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (emulatorHost) connectFunctionsEmulator(functions, emulatorHost, 5001);
  firebaseFunctions = functions;
  return firebaseFunctions;
}

let firebaseAuth: Auth | null = null;
