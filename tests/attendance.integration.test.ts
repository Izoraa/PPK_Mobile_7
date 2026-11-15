/* eslint-disable import/first */
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getFirestore,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

// The test initializes its own emulator-connected Firebase app before invoking
// the service. This only prevents Jest from loading the native persistence
// bootstrap used by the app's client fallback.
jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The attendance integration test must initialize its Firebase app first.');
  }),
}));

import { checkIn } from '@/features/attendance/service';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rulesEnvironment: RulesTestEnvironment;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let userCounter = 0;

function participationReference(uid: string, sessionId = 'session-1') {
  return doc(db, 'sessions', sessionId, 'participations', uid);
}

async function signInTestUser(): Promise<User> {
  userCounter += 1;
  const credential = await createUserWithEmailAndPassword(
    auth,
    `attendance-${userCounter}-${Date.now()}@example.test`,
    'Password123!',
  );
  return credential.user;
}

async function seedScenario(
  uid: string,
  options: {
    role?: 'student' | 'assistant';
    requestedRole?: 'student' | 'assistant';
    membership?: 'active' | 'inactive' | 'missing';
    sessionStatus?: 'not_open' | 'open' | 'closed';
    classArchived?: boolean;
    existingParticipation?: boolean;
    existingLeaveStatus?: 'pending' | 'approved' | 'rejected';
  } = {},
) {
  const {
    role = 'student',
    requestedRole = 'student',
    membership = 'active',
    sessionStatus = 'open',
    classArchived = false,
    existingParticipation = false,
    existingLeaveStatus,
  } = options;

  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      uid,
      email: `${uid}@example.test`,
      role,
      requestedRole,
    });
    await setDoc(doc(adminDb, 'classes', 'class-1'), {
      name: 'Kelas Test',
      code: 'TEST-1',
      course: 'Praktikum Test',
      timeZone: 'Asia/Jakarta',
      assistantId: 'assistant-1',
      isArchived: classArchived,
    });
    await setDoc(doc(adminDb, 'sessions', 'session-1'), {
      classId: 'class-1',
      assistantId: 'assistant-1',
      title: 'Sesi Test',
      room: 'Lab Test',
      timeZone: 'Asia/Jakarta',
      status: sessionStatus,
      isArchived: false,
    });

    if (membership !== 'missing') {
      await setDoc(doc(adminDb, 'memberships', `class-1_${uid}`), {
        classId: 'class-1',
        assistantId: 'assistant-1',
        studentId: uid,
        studentName: 'Student Test',
        studentNumber: 'TEST-001',
        isActive: membership === 'active',
      });
    }

    if (existingParticipation) {
      await setDoc(doc(adminDb, 'sessions', 'session-1', 'participations', uid), {
        kind: 'attendance',
        studentId: uid,
      });
    }

    if (existingLeaveStatus) {
      await setDoc(doc(adminDb, 'sessions', 'session-1', 'participations', uid), {
        kind: 'leave',
        status: existingLeaveStatus,
        studentId: uid,
      });
    }
  });
}

beforeAll(async () => {
  app = initializeApp(
    {
      apiKey: 'demo-api-key',
      authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
      projectId: FIREBASE_TEST_PROJECT_ID,
      appId: 'demo-app-id',
    },
  );
  auth = getAuth(app);
  db = getFirestore(app);

  if (!authEmulatorConnected) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    authEmulatorConnected = true;
  }
  if (!firestoreEmulatorConnected) {
    connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    firestoreEmulatorConnected = true;
  }

  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(auth);
});

afterEach(async () => {
  await clearFirestoreEmulatorData();
  const currentUser = auth.currentUser;
  if (currentUser) await deleteUser(currentUser);
  await signOut(auth);
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
});

describe('Attendance integration with Firebase Emulator', () => {
  test('check-in succeeds and persists the Auth UID in participation', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid);
    const result = await checkIn('session-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.studentId).toBe(user.uid);
    expect(result.data.sessionId).toBe('session-1');
    expect(result.data.kind).toBe('attendance');
    expect(result.data.checkedInAt).toEqual(expect.any(String));

    const stored = await getDoc(participationReference(user.uid));
    expect(stored.exists()).toBe(true);
    expect(stored.data()).toMatchObject({
      sessionId: 'session-1',
      classId: 'class-1',
      assistantId: 'assistant-1',
      studentId: user.uid,
      studentName: 'Student Test',
      studentNumber: 'TEST-001',
      kind: 'attendance',
    });
    expect(stored.data()?.createdAt).toBeDefined();
    expect(stored.data()?.updatedAt).toBeDefined();
    expect(stored.data()?.checkedInAt).toBeDefined();
  });

  test('rejects a duplicate check-in', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { existingParticipation: true });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'CONFLICT', retryable: false } });
  });

  test.each(['pending', 'approved'] as const)('rejects check-in when leave is %s', async (status) => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { existingLeaveStatus: status });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'CONFLICT', retryable: false } });
    expect((await getDoc(participationReference(user.uid))).data()).toMatchObject({
      kind: 'leave',
      status,
    });
  });

  test('allows check-in after a rejected leave without changing the leave decision', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { existingLeaveStatus: 'rejected' });

    const result = await checkIn('session-1');

    expect(result.ok).toBe(true);
    const leave = await getDoc(participationReference(user.uid));
    const attendance = await getDoc(participationReference(user.uid));
    expect(leave.data()).toMatchObject({ kind: 'leave', status: 'rejected' });
    expect(attendance.data()).toMatchObject({
      kind: 'leave',
      status: 'rejected',
      studentId: user.uid,
    });
    expect(attendance.data()?.attendanceCheckedInAt).toBeDefined();
  });

  test('allows only one concurrent check-in after a rejected leave', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { existingLeaveStatus: 'rejected' });

    const results = await Promise.all([checkIn('session-1'), checkIn('session-1')]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error.code === 'CONFLICT')).toHaveLength(1);
    expect((await getDoc(participationReference(user.uid))).data()?.attendanceCheckedInAt).toBeDefined();
  });

  test('rejects a user who is not signed in', async () => {
    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } });
  });

  test('rejects a non-student role', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { role: 'assistant', requestedRole: 'assistant' });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
  });

  test.each([
    ['missing membership', 'missing'],
    ['inactive membership', 'inactive'],
  ])('rejects a user with %s', async (_label, membership) => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { membership: membership as 'missing' | 'inactive' });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
  });

  test('rejects check-in when the session is not open', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { sessionStatus: 'closed' });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } });
  });

  test('rejects check-in when the class is archived', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid, { classArchived: true });

    const result = await checkIn('session-1');

    expect(result).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
  });

  test('recovers from an emulator client network failure without creating a duplicate', async () => {
    const user = await signInTestUser();
    await seedScenario(user.uid);

    await disableNetwork(db);
    try {
      const failed = await checkIn('session-1');
      expect(failed).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    } finally {
      await enableNetwork(db);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    const retried = await checkIn('session-1');
    expect(retried.ok || retried.error.code === 'CONFLICT').toBe(true);

    const stored = await getDoc(participationReference(user.uid));
    expect(stored.exists()).toBe(true);
    expect(stored.data()).toMatchObject({
      kind: 'attendance',
      studentId: user.uid,
      sessionId: 'session-1',
    });
  });
});
