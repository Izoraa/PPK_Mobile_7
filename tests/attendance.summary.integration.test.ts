import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

import {
  subscribeSessionParticipationSummaries,
  subscribeSessionParticipationSummary,
} from '@/features/attendance/subscriptions';
import type { SessionParticipationSummary } from '@/features/attendance/types';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The summary integration test must initialize its Firebase app first.');
  }),
}));

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;
const SESSION_ID = 'summary-session';
const CLASS_ID = 'summary-class';
const ASSISTANT_ID = 'summary-assistant';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rulesEnvironment: RulesTestEnvironment;
let assistantUid: string;

function waitForSummary(
  predicate: (summary: SessionParticipationSummary) => boolean,
): Promise<SessionParticipationSummary> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for participation summary.'));
    }, 5_000);

    unsubscribe = subscribeSessionParticipationSummary(
      SESSION_ID,
      (summary) => {
        if (!predicate(summary)) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(summary);
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(new Error(error.code));
      },
    );
  });
}

async function seedDomain() {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', assistantUid), {
      uid: assistantUid,
      email: `${assistantUid}@example.test`,
      name: 'Assistant Summary',
      studentNumber: null,
      role: 'assistant',
      requestedRole: 'assistant',
    });
    await setDoc(doc(adminDb, 'classes', CLASS_ID), {
      name: 'Kelas Summary',
      code: 'SUMMARY-1',
      course: 'Praktikum Summary',
      timeZone: 'Asia/Jakarta',
      assistantId: assistantUid,
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', SESSION_ID), {
      classId: CLASS_ID,
      assistantId: assistantUid,
      title: 'Sesi Summary',
      room: 'Lab Summary',
      timeZone: 'Asia/Jakarta',
      status: 'open',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'summary-session-next'), {
      classId: CLASS_ID,
      assistantId: assistantUid,
      title: 'Sesi Summary Berikutnya',
      room: 'Lab Summary 2',
      timeZone: 'Asia/Jakarta',
      status: 'open',
      isArchived: false,
    });

    const common = {
      sessionId: SESSION_ID,
      classId: CLASS_ID,
      assistantId: assistantUid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(doc(adminDb, 'sessions', SESSION_ID, 'participations', 'student-attendance'), {
      ...common,
      studentId: 'student-attendance',
      studentName: 'Student Hadir',
      studentNumber: 'SUM-001',
      kind: 'attendance',
      checkedInAt: Timestamp.now(),
    });
    for (const [studentId, status] of [
      ['student-pending', 'pending'],
      ['student-approved', 'approved'],
      ['student-rejected', 'rejected'],
    ] as const) {
      await setDoc(doc(adminDb, 'sessions', SESSION_ID, 'participations', studentId), {
        ...common,
        studentId,
        studentName: studentId,
        studentNumber: null,
        kind: 'leave',
        reason: 'Alasan izin yang cukup panjang.',
        status,
        reviewedBy: status === 'pending' ? null : assistantUid,
        reviewedAt: status === 'pending' ? null : Timestamp.now(),
        reviewNote: status === 'rejected' ? 'Catatan penolakan' : null,
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
    }
  });
}

beforeAll(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-attendance-summary-app-id',
  });
  auth = getAuth(app);
  db = getFirestore(app);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(auth);
  const account = await createUserWithEmailAndPassword(
    auth,
    `summary-assistant-${Date.now()}@example.test`,
    'Password123!',
  );
  assistantUid = account.user.uid;
  await seedDomain();
});

afterEach(async () => {
  await clearFirestoreEmulatorData();
  if (auth.currentUser) await deleteUser(auth.currentUser);
  await signOut(auth);
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
});

test('counts attendance and each leave status separately', async () => {
  const summaryPromise = waitForSummary((summary) => summary.attendanceCount === 1);
  const user = auth.currentUser;
  if (!user) throw new Error('Assistant test user was not created.');
  const summary = await summaryPromise;

  expect(user.uid).toBe(assistantUid);
  expect(summary).toEqual({
    attendanceCount: 1,
    pendingLeaveCount: 1,
    approvedLeaveCount: 1,
    rejectedLeaveCount: 1,
  });
});

test('deduplicates session IDs and cleans all summary listeners together', async () => {
  let callbackCount = 0;
  let latestSummaries: Record<string, SessionParticipationSummary> = {};
  let resolveInitial: (() => void) | null = null;
  const initial = new Promise<void>((resolve) => { resolveInitial = resolve; });
  const unsubscribe = subscribeSessionParticipationSummaries(
    [SESSION_ID, SESSION_ID, 'summary-session-next'],
    (summaries) => {
      callbackCount += 1;
      latestSummaries = summaries;
      if (
        latestSummaries[SESSION_ID]?.attendanceCount === 1
        && latestSummaries['summary-session-next']?.attendanceCount === 0
      ) {
        resolveInitial?.();
      }
    },
    (error) => { throw new Error(error.error.code); },
  );

  await initial;
  const callbackCountAfterInitial = callbackCount;
  const waitForUpdate = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for deduplicated summary update.')), 5_000);
    const check = () => {
      if (latestSummaries[SESSION_ID]?.attendanceCount === 2) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 25);
      }
    };
    check();
  });

  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions', SESSION_ID, 'participations', 'student-attendance-2'), {
      sessionId: SESSION_ID,
      classId: CLASS_ID,
      assistantId: assistantUid,
      studentId: 'student-attendance-2',
      studentName: 'Student Hadir 2',
      studentNumber: 'SUM-002',
      kind: 'attendance',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      checkedInAt: Timestamp.now(),
    });
  });

  await waitForUpdate;
  expect(callbackCount).toBe(callbackCountAfterInitial + 1);

  unsubscribe();
  const callbackCountAfterUnsubscribe = callbackCount;
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions', SESSION_ID, 'participations', 'student-attendance-3'), {
      sessionId: SESSION_ID,
      classId: CLASS_ID,
      assistantId: assistantUid,
      studentId: 'student-attendance-3',
      studentName: 'Student Hadir 3',
      studentNumber: 'SUM-003',
      kind: 'attendance',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      checkedInAt: Timestamp.now(),
    });
    await setDoc(doc(context.firestore(), 'sessions', 'summary-session-next', 'participations', 'next-attendance'), {
      sessionId: 'summary-session-next',
      classId: CLASS_ID,
      assistantId: assistantUid,
      studentId: 'next-attendance',
      studentName: 'Student Next',
      studentNumber: 'SUM-004',
      kind: 'attendance',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      checkedInAt: Timestamp.now(),
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(callbackCount).toBe(callbackCountAfterUnsubscribe);
});

test('does not create summary listeners when disabled for student scope', async () => {
  let callbackCount = 0;
  const unsubscribe = subscribeSessionParticipationSummaries(
    [SESSION_ID, 'summary-session-next'],
    () => { callbackCount += 1; },
    () => { throw new Error('Disabled subscription should not report an error.'); },
    false,
  );

  await new Promise((resolve) => setTimeout(resolve, 300));
  unsubscribe();
  expect(callbackCount).toBe(0);
});

test('updates attendance count and leave status counts in realtime', async () => {
  await waitForSummary((summary) => summary.attendanceCount === 1);

  const attendanceUpdate = waitForSummary((summary) => summary.attendanceCount === 2);
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions', SESSION_ID, 'participations', 'student-attendance-2'), {
      sessionId: SESSION_ID,
      classId: CLASS_ID,
      assistantId: assistantUid,
      studentId: 'student-attendance-2',
      studentName: 'Student Hadir 2',
      studentNumber: 'SUM-002',
      kind: 'attendance',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      checkedInAt: Timestamp.now(),
    });
  });
  await expect(attendanceUpdate).resolves.toMatchObject({ attendanceCount: 2 });

  const leaveUpdate = waitForSummary((summary) => (
    summary.pendingLeaveCount === 0 && summary.approvedLeaveCount === 2
  ));
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'sessions', SESSION_ID, 'participations', 'student-pending'), {
      status: 'approved',
      reviewedBy: assistantUid,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
  await expect(leaveUpdate).resolves.toMatchObject({
    attendanceCount: 2,
    pendingLeaveCount: 0,
    approvedLeaveCount: 2,
    rejectedLeaveCount: 1,
  });
});

test('does not call the old session after unsubscribe and follows the new session', async () => {
  let oldSessionCallbacks = 0;
  const unsubscribeOld = subscribeSessionParticipationSummary(
    SESSION_ID,
    () => { oldSessionCallbacks += 1; },
    (error) => { throw new Error(error.code); },
  );
  await waitForSummary((summary) => summary.attendanceCount === 1);
  unsubscribeOld();
  const callbackCountAfterUnsubscribe = oldSessionCallbacks;

  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions', 'summary-session-next', 'participations', 'next-attendance'), {
      sessionId: 'summary-session-next',
      classId: CLASS_ID,
      assistantId: assistantUid,
      studentId: 'next-attendance',
      studentName: 'Student Next',
      studentNumber: 'SUM-003',
      kind: 'attendance',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      checkedInAt: Timestamp.now(),
    });
  });

  const nextSummary = new Promise<SessionParticipationSummary>((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for next session summary.'));
    }, 5_000);
    unsubscribe = subscribeSessionParticipationSummary(
      'summary-session-next',
      (summary) => {
        if (summary.attendanceCount !== 1) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(summary);
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(new Error(error.code));
      },
    );
  });

  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(oldSessionCallbacks).toBe(callbackCountAfterUnsubscribe);
  await expect(nextSummary).resolves.toMatchObject({
    attendanceCount: 1,
    pendingLeaveCount: 0,
    approvedLeaveCount: 0,
    rejectedLeaveCount: 0,
  });
});
