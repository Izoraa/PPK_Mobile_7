import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  approveLeave,
  rejectLeave,
  subscribePendingLeaveReviews,
} from '@/features/leave-review/service';
import type { LeaveReviewRecord } from '@/features/leave-review/types';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;
const LEAVE_AI = {
  status: 'pending',
  category: null,
  confidence: null,
  modelVersion: null,
  classifiedAt: null,
  errorCode: null,
  requestId: null,
  startedAt: null,
  attemptCount: 0,
};

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The E2E test initializes its emulator-connected Firebase app first.');
  }),
}));

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rulesEnvironment: RulesTestEnvironment;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let accountCounter = 0;
const createdAccounts: { email: string; password: string }[] = [];

function leaveReference(studentId: string) {
  return doc(db, 'sessions', 'session-e2e', 'participations', studentId);
}

async function createAccount(prefix: string): Promise<{ user: User; email: string; password: string }> {
  accountCounter += 1;
  const email = `${prefix}-${accountCounter}-${Date.now()}@example.test`;
  const password = 'Password123!';
  createdAccounts.push({ email, password });
  const user = (await createUserWithEmailAndPassword(auth, email, password)).user;
  return { user, email, password };
}

async function seedDomain(studentUid: string, assistantUid: string) {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', studentUid), {
      uid: studentUid,
      email: `${studentUid}@example.test`,
      name: 'Student E2E',
      studentNumber: 'E2E-001',
      role: 'student',
      requestedRole: 'student',
    });
    await setDoc(doc(adminDb, 'users', assistantUid), {
      uid: assistantUid,
      email: `${assistantUid}@example.test`,
      role: 'assistant',
    });
    await setDoc(doc(adminDb, 'classes', 'class-e2e'), {
      name: 'Kelas E2E',
      code: 'E2E-LEAVE',
      course: 'Integration Testing',
      timeZone: 'Asia/Jakarta',
      assistantId: assistantUid,
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'session-e2e'), {
      classId: 'class-e2e',
      assistantId: assistantUid,
      title: 'Sesi E2E Leave',
      room: 'Lab E2E',
      timeZone: 'Asia/Jakarta',
      status: 'open',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'memberships', `class-e2e_${studentUid}`), {
      classId: 'class-e2e',
      assistantId: assistantUid,
      studentId: studentUid,
      studentName: 'Student E2E',
      studentNumber: 'E2E-001',
      isActive: true,
    });
  });
}

async function submitLeaveAsStudent(studentUid: string, assistantUid: string, reason: string) {
  await setDoc(leaveReference(studentUid), {
    sessionId: 'session-e2e',
    classId: 'class-e2e',
    assistantId: assistantUid,
    studentId: studentUid,
    studentName: 'Student E2E',
    studentNumber: 'E2E-001',
    kind: 'leave',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reason,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    ai: LEAVE_AI,
  });
}

function createQueueWatcher() {
  const snapshots: LeaveReviewRecord[][] = [];
  const waiters: {
    predicate: (records: LeaveReviewRecord[]) => boolean;
    resolve: (records: LeaveReviewRecord[]) => void;
    reject: (error: unknown) => void;
  }[] = [];
  let unsubscribe = () => {};

  unsubscribe = subscribePendingLeaveReviews(
    (records) => {
      snapshots.push(records);
      for (let index = waiters.length - 1; index >= 0; index -= 1) {
        const waiter = waiters[index];
        if (!waiter.predicate(records)) continue;
        waiters.splice(index, 1);
        waiter.resolve(records);
      }
    },
    (error) => {
      while (waiters.length > 0) waiters.pop()?.reject(error);
    },
  );

  return {
    waitFor(predicate: (records: LeaveReviewRecord[]) => boolean) {
      const existing = snapshots.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise<LeaveReviewRecord[]>((resolve, reject) => {
        waiters.push({ predicate, resolve, reject });
      });
    },
    unsubscribe,
  };
}

async function switchIdentity(account: { email: string; password: string }) {
  await signOut(auth);
  return (await signInWithEmailAndPassword(auth, account.email, account.password)).user;
}

beforeAll(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-leave-e2e-app-id',
  });
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
  await signOut(auth);
  for (const account of createdAccounts.splice(0)) {
    try {
      await signInWithEmailAndPassword(auth, account.email, account.password);
      if (auth.currentUser) await deleteUser(auth.currentUser);
    } catch {
      // Cleanup remains idempotent if a test already removed the account.
    }
    await signOut(auth);
  }
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
});

describe('End-to-end student leave to assistant review', () => {
  test('student creates a rules-validated leave and owner approves it through production listener/service', async () => {
    const student = await createAccount('student-e2e');
    const assistant = await createAccount('assistant-e2e');
    await seedDomain(student.user.uid, assistant.user.uid);

    await switchIdentity(student);
    await submitLeaveAsStudent(student.user.uid, assistant.user.uid, 'Student sedang sakit dan perlu istirahat.');
    const submitted = await getDoc(leaveReference(student.user.uid));
    expect(submitted.data()).toMatchObject({
      kind: 'leave',
      status: 'pending',
      studentId: student.user.uid,
      assistantId: assistant.user.uid,
      reason: 'Student sedang sakit dan perlu istirahat.',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      ai: LEAVE_AI,
    });
    expect(submitted.id).toBe(student.user.uid);
    expect(submitted.data()?.createdAt).toBeDefined();
    expect(submitted.data()?.updatedAt).toBeDefined();

    await switchIdentity(assistant);
    const watcher = createQueueWatcher();
    try {
      const pending = await watcher.waitFor((records) => records.length === 1);
      expect(pending[0]).toMatchObject({
        studentId: student.user.uid,
        studentName: 'Student E2E',
        reason: 'Student sedang sakit dan perlu istirahat.',
        status: 'pending',
      });

      const approved = await approveLeave('session-e2e', student.user.uid);
      expect(approved).toMatchObject({
        ok: true,
        data: { status: 'approved', reviewedBy: assistant.user.uid, reviewNote: null },
      });

      expect(await watcher.waitFor((records) => records.length === 0)).toHaveLength(0);
    } finally {
      watcher.unsubscribe();
    }
    const stored = (await getDoc(leaveReference(student.user.uid))).data();
    expect(stored).toMatchObject({
      status: 'approved',
      reviewedBy: assistant.user.uid,
      reviewNote: null,
      ai: LEAVE_AI,
    });
    expect(stored?.reviewedAt).toBeDefined();
    expect(stored?.updatedAt).toBeDefined();
  });

  test('student creates a rules-validated leave and owner rejects it through production listener/service', async () => {
    const student = await createAccount('student-e2e-reject');
    const assistant = await createAccount('assistant-e2e-reject');
    await seedDomain(student.user.uid, assistant.user.uid);

    await switchIdentity(student);
    await submitLeaveAsStudent(student.user.uid, assistant.user.uid, 'Student memiliki keperluan keluarga mendesak.');
    await switchIdentity(assistant);
    const watcher = createQueueWatcher();
    try {
      const pending = await watcher.waitFor((records) => records.length === 1);
      expect(pending[0].studentId).toBe(student.user.uid);

      const rejected = await rejectLeave('session-e2e', student.user.uid, 'Bukti belum lengkap.');
      expect(rejected).toMatchObject({
        ok: true,
        data: { status: 'rejected', reviewedBy: assistant.user.uid, reviewNote: 'Bukti belum lengkap.' },
      });

      expect(await watcher.waitFor((records) => records.length === 0)).toHaveLength(0);
    } finally {
      watcher.unsubscribe();
    }
    const stored = (await getDoc(leaveReference(student.user.uid))).data();
    expect(stored).toMatchObject({
      status: 'rejected',
      reviewedBy: assistant.user.uid,
      reviewNote: 'Bukti belum lengkap.',
      ai: LEAVE_AI,
    });
    expect(stored?.reviewedAt).toBeDefined();
    expect(stored?.updatedAt).toBeDefined();
  });
});
