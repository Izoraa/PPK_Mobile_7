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
  setDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  approveLeave,
  getLeaveReviewMetadata,
  rejectLeave,
  subscribePendingLeaveReviews,
} from '@/features/leave-review/service';
import { leaveAiStatusLabels, type LeaveReviewRecord } from '@/features/leave-review/types';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The leave review integration test must initialize its Firebase app first.');
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

const initialAi = {
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

function leaveReference(studentId: string, sessionId = 'session-1') {
  return doc(db, 'sessions', sessionId, 'participations', studentId);
}

async function createAssistant(): Promise<User> {
  accountCounter += 1;
  const email = `reviewer-${accountCounter}-${Date.now()}@example.test`;
  const password = 'Password123!';
  createdAccounts.push({ email, password });
  return (await createUserWithEmailAndPassword(auth, email, password)).user;
}

async function switchToAssistant(account: { email: string; password: string }): Promise<User> {
  await signOut(auth);
  return (await signInWithEmailAndPassword(auth, account.email, account.password)).user;
}

async function seedReviewDomain(ownerUid: string, otherAssistantUid = 'assistant-other') {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', ownerUid), {
      uid: ownerUid,
      email: `${ownerUid}@example.test`,
      role: 'assistant',
    });
    await setDoc(doc(adminDb, 'users', otherAssistantUid), {
      uid: otherAssistantUid,
      email: `${otherAssistantUid}@example.test`,
      role: 'assistant',
    });
    await setDoc(doc(adminDb, 'classes', 'class-1'), {
      name: 'Kelas Leave Review',
      code: 'LEAVE-1',
      course: 'Praktikum Leave',
      timeZone: 'Asia/Jakarta',
      assistantId: ownerUid,
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'session-1'), {
      classId: 'class-1',
      assistantId: ownerUid,
      title: 'Sesi Leave Review',
      room: 'Lab Leave',
      timeZone: 'Asia/Jakarta',
      status: 'open',
      isArchived: false,
    });
  });
}

async function seedLeave(
  assistantId: string,
  studentId: string,
  options: {
    status?: 'pending' | 'approved' | 'rejected';
    reviewNote?: string | null;
    ai?: typeof initialAi;
  } = {},
) {
  const status = options.status ?? 'pending';
  const createdAt = Timestamp.fromMillis(1_000);
  const reviewedAt = status === 'pending' ? null : Timestamp.fromMillis(2_000);
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(
      context.firestore(),
      'sessions',
      'session-1',
      'participations',
      studentId,
    ), {
      sessionId: 'session-1',
      classId: 'class-1',
      assistantId,
      studentId,
      studentName: `Student ${studentId}`,
      studentNumber: `NIM-${studentId}`,
      kind: 'leave',
      reason: 'Tidak enak badan dan perlu beristirahat.',
      status,
      reviewedBy: status === 'pending' ? null : assistantId,
      reviewedAt,
      reviewNote: options.reviewNote ?? (status === 'pending' ? null : 'Keputusan tersimpan.'),
      ai: options.ai ?? initialAi,
      createdAt,
      updatedAt: reviewedAt ?? createdAt,
    });
  });
}

async function seedAttendance(assistantId: string, studentId: string) {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(
      context.firestore(),
      'sessions',
      'session-1',
      'participations',
      studentId,
    ), {
      sessionId: 'session-1',
      classId: 'class-1',
      assistantId,
      studentId,
      studentName: `Student ${studentId}`,
      studentNumber: `NIM-${studentId}`,
      kind: 'attendance',
      checkedInAt: Timestamp.fromMillis(1_000),
      createdAt: Timestamp.fromMillis(1_000),
      updatedAt: Timestamp.fromMillis(1_000),
    });
  });
}

function waitForQueue(
  predicate: (records: LeaveReviewRecord[]) => boolean,
): Promise<LeaveReviewRecord[]> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for leave review queue.'));
    }, 5_000);
    unsubscribe = subscribePendingLeaveReviews(
      (records) => {
        if (!predicate(records)) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(records);
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      },
    );
  });
}

async function readLeave(studentId: string) {
  return getDoc(leaveReference(studentId));
}

beforeAll(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-leave-review-app-id',
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
      // The account may already have been removed by a previous cleanup step.
    }
    await signOut(auth);
  }
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
});

describe('Pending leave queue', () => {
  test('shows only pending leave requests owned by the assistant', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid, 'assistant-other');
    await seedLeave(owner.uid, 'student-pending');
    await seedLeave(owner.uid, 'student-approved', { status: 'approved' });
    await seedLeave(owner.uid, 'student-rejected', { status: 'rejected' });
    await seedLeave('assistant-other', 'student-other');
    await seedAttendance(owner.uid, 'student-attendance');

    const records = await waitForQueue((items) => items.length === 1);

    expect(records[0]).toMatchObject({
      studentId: 'student-pending',
      assistantId: owner.uid,
      kind: 'leave',
      status: 'pending',
    });
  });

  test('starts empty and receives a new pending request realtime', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);

    expect(await waitForQueue((items) => items.length === 0)).toHaveLength(0);
    const update = waitForQueue((items) => items.length === 1);
    await seedLeave(owner.uid, 'student-new');

    expect((await update)[0].studentId).toBe('student-new');
  });

  test('exposes session/class metadata and explicit AI status for review details', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-metadata');

    const records = await waitForQueue((items) => items.length === 1);
    const metadata = await getLeaveReviewMetadata(records[0].sessionId, records[0].classId);

    expect(metadata).toEqual({
      sessionTitle: 'Sesi Leave Review',
      className: 'Kelas Leave Review',
    });
    expect(records[0]).toMatchObject({
      sessionId: 'session-1',
      classId: 'class-1',
      ai: { status: 'pending' },
    });
    expect(leaveAiStatusLabels[records[0].ai.status]).toBe('Menunggu klasifikasi');
    expect(leaveAiStatusLabels.processing).toBe('Sedang diproses');
    expect(leaveAiStatusLabels.succeeded).toBe('Berhasil diklasifikasikan');
    expect(leaveAiStatusLabels.failed).toBe('Klasifikasi gagal');
  });

  test('reports an unauthenticated permission error', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-pending');
    await signOut(auth);

    const unauthenticated = new Promise<void>((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = subscribePendingLeaveReviews(() => resolve(), (error) => {
        unsubscribe();
        reject(error);
      });
    });
    await expect(unauthenticated).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  test('rejects a queue query from another assistant', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-owner');
    const other = await createAssistant();
    await switchToAssistant(createdAccounts[createdAccounts.length - 1]);

    const queue = waitForQueue(() => true);

    expect(other.uid).not.toBe(owner.uid);
    await expect(queue).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('stops queue callbacks after unsubscribe', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    let callbackCount = 0;
    const unsubscribe = subscribePendingLeaveReviews(() => {
      callbackCount += 1;
    }, () => undefined);

    await new Promise((resolve) => setTimeout(resolve, 300));
    unsubscribe();
    const countAfterUnsubscribe = callbackCount;
    await seedLeave(owner.uid, 'student-after-unsubscribe');
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callbackCount).toBe(countAfterUnsubscribe);
  });
});

describe('Approve and reject leave', () => {
  test('approves a pending leave and preserves AI metadata', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-approve');

    const result = await approveLeave('session-1', 'student-approve');

    expect(result.ok).toBe(true);
    const stored = (await readLeave('student-approve')).data();
    expect(stored).toMatchObject({
      status: 'approved',
      reviewedBy: owner.uid,
      reviewNote: null,
      ai: initialAi,
    });
    expect(stored?.reviewedAt).toBeDefined();
    expect(stored?.updatedAt).toBeDefined();
  });

  test('stores an optional trimmed approve note', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-approve-note');

    const result = await approveLeave('session-1', 'student-approve-note', '  Catatan setuju  ');

    expect(result).toMatchObject({ ok: true, data: { reviewNote: 'Catatan setuju' } });
  });

  test('rejects a leave with a required trimmed note and preserves AI metadata', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-reject');

    const result = await rejectLeave('session-1', 'student-reject', '  Alasan ditolak  ');

    expect(result).toMatchObject({ ok: true, data: { status: 'rejected', reviewNote: 'Alasan ditolak' } });
    const stored = (await readLeave('student-reject')).data();
    expect(stored).toMatchObject({
      status: 'rejected',
      reviewedBy: owner.uid,
      reviewNote: 'Alasan ditolak',
      ai: initialAi,
    });
    expect(stored?.reviewedAt).toBeDefined();
    expect(stored?.updatedAt).toBeDefined();
  });

  test.each(['', '1234', ' '.repeat(501)])('rejects invalid rejection note: %j', async (note) => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-invalid-note');

    await expect(rejectLeave('session-1', 'student-invalid-note', note)).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION_ERROR', retryable: false },
    });
  });

  test('rejects review by another assistant', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-other-reviewer');
    const other = await createAssistant();
    await switchToAssistant(createdAccounts[createdAccounts.length - 1]);

    const result = await approveLeave('session-1', 'student-other-reviewer');

    expect(result).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
    expect(other.uid).not.toBe(owner.uid);
  });

  test('rejects processing an already-decided leave', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-processed');
    expect((await approveLeave('session-1', 'student-processed')).ok).toBe(true);

    const secondDecision = await rejectLeave('session-1', 'student-processed', 'Sudah diproses');

    expect(secondDecision).toEqual({ ok: false, error: { code: 'CONFLICT', retryable: false } });
  });

  test('allows only one decision from concurrent transactions', async () => {
    const owner = await createAssistant();
    await seedReviewDomain(owner.uid);
    await seedLeave(owner.uid, 'student-race');

    const results = await Promise.all([
      approveLeave('session-1', 'student-race'),
      rejectLeave('session-1', 'student-race', 'Keputusan race'),
    ]);
    const successful = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(['CONFLICT', 'FORBIDDEN']).toContain(failed[0].error.code);
    const stored = (await readLeave('student-race')).data();
    expect(['approved', 'rejected']).toContain(stored?.status);
    expect(stored?.reviewedBy).toBe(owner.uid);
    expect(stored?.reviewedAt).toBeDefined();
    expect(stored?.updatedAt).toBeDefined();
  });
});
