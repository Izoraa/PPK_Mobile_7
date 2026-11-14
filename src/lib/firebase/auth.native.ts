import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError, type FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';

// The SDK's shared declarations omit this export from its React Native entry point.
const { getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): firebaseAuth.Persistence;
};

const persistence = getReactNativePersistence(AsyncStorage);

export function getPlatformAuth(app: FirebaseApp): firebaseAuth.Auth {
  try {
    return firebaseAuth.initializeAuth(app, { persistence });
  } catch (error) {
    // Fast Refresh can reload this module while the Firebase App still exists.
    if (error instanceof FirebaseError && error.code === 'auth/already-initialized') {
      return firebaseAuth.getAuth(app);
    }
    throw error;
  }
}
