import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import { checkIn } from '@/features/attendance/service';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

// The production service is initialized against the first client. The second
// client below competes through the real Firestore SDK and emulator.
jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The concurrent attendance test must initialize its Firebase app first.');
  }),
}));

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;

let primaryApp: FirebaseApp;
let competingApp: FirebaseApp;
let primaryAuth: Auth;
let competingAuth: Auth;
let primaryDb: Firestore;
let competingDb: Firestore;
let rulesEnvironment: RulesTestEnvironment;

async function seedScenario(uid: string, email: string) {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      uid,
      email,
      name: 'Student Concurrent',
      studentNumber: 'CONCURRENT-001',
      role: 'student',
      requestedRole: 'student',
    });
    await setDoc(doc(adminDb, 'classes', 'class-concurrent'), {
      name: 'Kelas Concurrent',
      code: 'CONCURRENT-1',
      course: 'Praktikum Concurrent',
      timeZone: 'Asia/Jakarta',
      assistantId: 'assistant-concurrent',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'session-concurrent'), {
      classId: 'class-concurrent',
      assistantId: 'assistant-concurrent',
      title: 'Sesi Concurrent',
      room: 'Lab Concurrent',
      timeZone: 'Asia/Jakarta',
      status: 'open',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'memberships', `class-concurrent_${uid}`), {
      classId: 'class-concurrent',
      assistantId: 'assistant-concurrent',
      studentId: uid,
      studentName: 'Student Concurrent',
      studentNumber: 'CONCURRENT-001',
      isActive: true,
    });
  });
}

async function competingClientCheckIn(uid: string): Promise<'success' | 'conflict'> {
  const participationReference = doc(
    competingDb,
    'sessions',
    'session-concurrent',
    'participations',
    uid,
  );

  try {
    await runTransaction(competingDb, async (transaction) => {
      const existing = await transaction.get(participationReference);
      if (existing.exists()) throw new Error('CONFLICT');

      transaction.set(participationReference, {
        sessionId: 'session-concurrent',
        classId: 'class-concurrent',
        assistantId: 'assistant-concurrent',
        studentId: uid,
        studentName: 'Student Concurrent',
        studentNumber: 'CONCURRENT-001',
        kind: 'attendance',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        checkedInAt: serverTimestamp(),
      });
    });
    return 'success';
  } catch (value) {
    if (value instanceof Error && value.message === 'CONFLICT') return 'conflict';
    const code = typeof value === 'object' && value && 'code' in value
      ? String(value.code)
      : '';
    if (code === 'aborted' || code === 'failed-precondition') return 'conflict';
    throw value;
  }
}

beforeAll(async () => {
  primaryApp = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-attendance-concurrent-primary',
  });
  competingApp = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-attendance-concurrent-competing',
  }, 'attendance-concurrent-competing');

  primaryAuth = getAuth(primaryApp);
  competingAuth = getAuth(competingApp);
  primaryDb = getFirestore(primaryApp);
  competingDb = getFirestore(competingApp);
  connectAuthEmulator(primaryAuth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectAuthEmulator(competingAuth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(primaryDb, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  connectFirestoreEmulator(competingDb, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(primaryAuth);
  await signOut(competingAuth);
});

afterEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(competingAuth);
  if (primaryAuth.currentUser) await deleteUser(primaryAuth.currentUser);
  await signOut(primaryAuth);
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(primaryApp);
  await deleteApp(competingApp);
});

test('allows only one concurrent check-in from two clients using the same Auth UID', async () => {
  const email = `attendance-concurrent-${Date.now()}@example.test`;
  const password = 'Password123!';
  const primaryUser = (await createUserWithEmailAndPassword(primaryAuth, email, password)).user;
  await signInWithEmailAndPassword(competingAuth, email, password);
  await seedScenario(primaryUser.uid, email);

  const [productionResult, competingResult] = await Promise.all([
    checkIn('session-concurrent'),
    competingClientCheckIn(primaryUser.uid),
  ]);

  const outcomes = [
    productionResult.ok ? 'success' : productionResult.error.code === 'CONFLICT' ? 'conflict' : productionResult.error.code,
    competingResult,
  ];
  expect(outcomes.filter((outcome) => outcome === 'success')).toHaveLength(1);
  expect(outcomes.filter((outcome) => outcome === 'conflict')).toHaveLength(1);

  const stored = await getDoc(doc(
    primaryDb,
    'sessions',
    'session-concurrent',
    'participations',
    primaryUser.uid,
  ));
  expect(stored.exists()).toBe(true);
  expect(stored.id).toBe(primaryUser.uid);
  expect(stored.data()).toMatchObject({
    kind: 'attendance',
    studentId: primaryUser.uid,
    sessionId: 'session-concurrent',
  });
});
