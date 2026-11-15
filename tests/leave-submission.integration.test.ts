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
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

let mockAuth: Auth;
let mockFirestore: Firestore;

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: () => mockAuth,
  getFirebaseFirestore: () => mockFirestore,
}));

import { submitLeave } from '@/features/leave/leaveService';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rulesEnvironment: RulesTestEnvironment;
let accountCounter = 0;

async function createStudent(): Promise<User> {
  accountCounter += 1;
  const credential = await createUserWithEmailAndPassword(
    auth,
    `leave-submit-${accountCounter}-${Date.now()}@example.test`,
    'Password123!',
  );
  return credential.user;
}

async function seedLeaveScenario(uid: string, options: {
  sessionStatus?: 'not_open' | 'open' | 'closed';
  classArchived?: boolean;
  existingParticipation?: 'attendance' | 'leave' | null;
} = {}) {
  const {
    sessionStatus = 'not_open',
    classArchived = false,
    existingParticipation = null,
  } = options;

  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      uid,
      email: auth.currentUser?.email,
      name: 'Praktikan Uji',
      studentNumber: 'TEST-001',
      role: 'student',
      requestedRole: 'student',
    });
    await setDoc(doc(adminDb, 'classes', 'class-1'), {
      name: 'Kelas Uji',
      code: 'TEST-1',
      course: 'Praktikum Uji',
      timeZone: 'Asia/Jakarta',
      assistantId: 'assistant-1',
      isArchived: classArchived,
    });
    await setDoc(doc(adminDb, 'sessions', 'session-1'), {
      classId: 'class-1',
      assistantId: 'assistant-1',
      title: 'Sesi Uji',
      room: 'Lab Uji',
      timeZone: 'Asia/Jakarta',
      status: sessionStatus,
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'memberships', `class-1_${uid}`), {
      classId: 'class-1',
      assistantId: 'assistant-1',
      studentId: uid,
      studentName: 'Praktikan Uji',
      studentNumber: 'TEST-001',
      isActive: true,
    });

    if (existingParticipation) {
      await setDoc(doc(adminDb, 'sessions', 'session-1', 'participations', uid), {
        sessionId: 'session-1',
        classId: 'class-1',
        assistantId: 'assistant-1',
        studentId: uid,
        studentName: 'Praktikan Uji',
        studentNumber: 'TEST-001',
        kind: existingParticipation,
        ...(existingParticipation === 'leave' ? {
          reason: 'Pengajuan izin yang sudah tersimpan.',
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          ai: {
            status: 'pending',
            category: null,
            confidence: null,
            modelVersion: null,
            classifiedAt: null,
            errorCode: null,
            requestId: null,
            startedAt: null,
            attemptCount: 0,
          },
        } : { checkedInAt: new Date() }),
      });
    }
  });
}

function participationReference(uid: string) {
  return doc(db, 'sessions', 'session-1', 'participations', uid);
}

beforeAll(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-leave-submit-app',
  }, `leave-submit-${Date.now()}`);
  auth = getAuth(app);
  db = getFirestore(app);
  mockAuth = auth;
  mockFirestore = db;

  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(auth);
});

afterEach(async () => {
  const currentUser = auth.currentUser;
  if (currentUser) await deleteUser(currentUser);
  await signOut(auth);
  await clearFirestoreEmulatorData();
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
});

describe('Leave submission with Firebase Emulator', () => {
  test.each(['not_open', 'open'] as const)(
    'stores a pending leave and pending AI state for a %s session',
    async (sessionStatus) => {
      const student = await createStudent();
      await seedLeaveScenario(student.uid, { sessionStatus });

      const result = await submitLeave({
        sessionId: 'session-1',
        reason: '  Izin karena sakit.  ',
      });

      expect(result).toEqual({
        ok: true,
        data: { sessionId: 'session-1', studentId: student.uid },
      });

      const stored = await getDoc(participationReference(student.uid));
      expect(stored.exists()).toBe(true);
      expect(stored.data()).toMatchObject({
        sessionId: 'session-1',
        classId: 'class-1',
        assistantId: 'assistant-1',
        studentId: student.uid,
        kind: 'leave',
        reason: 'Izin karena sakit.',
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        ai: {
          status: 'pending',
          category: null,
          confidence: null,
          modelVersion: null,
          classifiedAt: null,
          errorCode: null,
          requestId: null,
          startedAt: null,
          attemptCount: 0,
        },
      });
      expect(stored.data()?.createdAt).toBeDefined();
      expect(stored.data()?.updatedAt).toBeDefined();
    },
  );

  test('a repeated submission cannot overwrite the first request or create another record', async () => {
    const student = await createStudent();
    await seedLeaveScenario(student.uid);

    const first = await submitLeave({ sessionId: 'session-1', reason: 'Alasan izin pertama.' });
    const second = await submitLeave({ sessionId: 'session-1', reason: 'Alasan izin kedua.' });

    expect(first.ok).toBe(true);
    expect(second).toEqual({
      ok: false,
      error: { code: 'ALREADY_SUBMITTED', retryable: false },
    });
    const stored = await getDoc(participationReference(student.uid));
    expect(stored.data()?.reason).toBe('Alasan izin pertama.');
  });

  test('an AI failure leaves the saved request and manual decision status intact', async () => {
    const student = await createStudent();
    await seedLeaveScenario(student.uid);

    const first = await submitLeave({ sessionId: 'session-1', reason: 'Permohonan izin karena sakit.' });
    expect(first.ok).toBe(true);

    await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(context.firestore(), 'sessions', 'session-1', 'participations', student.uid),
        {
          'ai.status': 'failed',
          'ai.errorCode': 'MODEL_TIMEOUT',
          'ai.attemptCount': 1,
        },
      );
    });

    const retry = await submitLeave({ sessionId: 'session-1', reason: 'Permohonan ulang yang berbeda.' });
    expect(retry).toEqual({
      ok: false,
      error: { code: 'ALREADY_SUBMITTED', retryable: false },
    });

    const stored = await getDoc(participationReference(student.uid));
    expect(stored.exists()).toBe(true);
    expect(stored.data()).toMatchObject({
      reason: 'Permohonan izin karena sakit.',
      status: 'pending',
      ai: { status: 'failed', errorCode: 'MODEL_TIMEOUT', attemptCount: 1 },
    });
  });

  test.each([
    ['attendance', 'ALREADY_CHECKED_IN'],
    ['leave', 'ALREADY_SUBMITTED'],
  ] as const)(
    'a pre-existing %s participation blocks a new leave',
    async (kind, expectedCode) => {
      const student = await createStudent();
      await seedLeaveScenario(student.uid, { existingParticipation: kind });

      const result = await submitLeave({ sessionId: 'session-1', reason: 'Saya izin karena sakit.' });

      expect(result).toEqual({
        ok: false,
        error: { code: expectedCode, retryable: false },
      });
      const stored = await getDoc(participationReference(student.uid));
      expect(stored.data()?.kind).toBe(kind);
    },
  );

  test('concurrent submissions create at most one participation record', async () => {
    const student = await createStudent();
    await seedLeaveScenario(student.uid);

    const results = await Promise.all([
      submitLeave({ sessionId: 'session-1', reason: 'Pengajuan izin pertama.' }),
      submitLeave({ sessionId: 'session-1', reason: 'Pengajuan izin kedua.' }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const stored = await getDoc(participationReference(student.uid));
    expect(stored.exists()).toBe(true);
    expect(stored.data()?.kind).toBe('leave');
  });
});
