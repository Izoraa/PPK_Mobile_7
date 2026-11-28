import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
} from './helpers/firebase-emulator';

const classOne = {
  name: 'Kelas Satu',
  code: 'LAB-1',
  course: 'Praktikum',
  timeZone: 'Asia/Jakarta',
  assistantId: 'assistant-1',
  isArchived: false,
};

const sessionOne = {
  classId: 'class-1',
  assistantId: 'assistant-1',
  title: 'Sesi Satu',
  room: 'Lab A',
  startsAt: new Date('2026-01-01T08:00:00.000Z'),
  endsAt: new Date('2026-01-01T10:00:00.000Z'),
  timeZone: 'Asia/Jakarta',
  status: 'open',
  isArchived: false,
  openedAt: new Date('2026-01-01T07:55:00.000Z'),
  closedAt: null,
};

const sessionTwo = {
  ...sessionOne,
};

const leaveOne = {
  sessionId: 'session-1',
  classId: 'class-1',
  assistantId: 'assistant-1',
  studentId: 'student-1',
  studentName: 'Student One',
  studentNumber: 'S001',
  kind: 'leave',
  reason: 'Tidak enak badan dan perlu beristirahat.',
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
};

let testEnvironment!: RulesTestEnvironment;

function studentDb(uid: string) {
  return testEnvironment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
  }).firestore();
}

function assistantDb(uid: string) {
  return testEnvironment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
  }).firestore();
}

async function seedBaseData() {
  if (!testEnvironment) throw new Error('Firebase test environment was not initialized.');
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

  await setDoc(doc(adminDb, 'users', 'student-1'), {
    uid: 'student-1',
    email: 'student-1@example.test',
    role: 'student',
    requestedRole: 'student',
  });
  await setDoc(doc(adminDb, 'users', 'student-2'), {
    uid: 'student-2',
    email: 'student-2@example.test',
    role: 'student',
    requestedRole: 'student',
  });
  await setDoc(doc(adminDb, 'users', 'assistant-1'), {
    uid: 'assistant-1',
    email: 'assistant-1@example.test',
    role: 'assistant',
  });
  await setDoc(doc(adminDb, 'users', 'assistant-2'), {
    uid: 'assistant-2',
    email: 'assistant-2@example.test',
    role: 'assistant',
  });

  await setDoc(doc(adminDb, 'classes', 'class-1'), classOne);
  await setDoc(doc(adminDb, 'sessions', 'session-1'), sessionOne);
  await setDoc(doc(adminDb, 'sessions', 'session-2'), sessionTwo);
  await setDoc(doc(adminDb, 'memberships', 'class-1_student-1'), {
    classId: 'class-1',
    studentId: 'student-1',
    assistantId: 'assistant-1',
    studentName: 'Student One',
    studentNumber: 'S001',
    isActive: true,
  });
  await setDoc(doc(adminDb, 'memberships', 'class-1_student-2'), {
    classId: 'class-1',
    studentId: 'student-2',
    assistantId: 'assistant-1',
    studentName: 'Student Two',
    studentNumber: 'S002',
    isActive: true,
  });
  await setDoc(doc(adminDb, 'sessions', 'session-1', 'participations', 'student-1'), {
    ...leaveOne,
  });
    await setDoc(doc(adminDb, 'sessions', 'session-1', 'participations', 'student-2'), {
      ...leaveOne,
      studentId: 'student-2',
      studentName: 'Student Two',
      studentNumber: 'S002',
    });
  });
}

beforeAll(async () => {
  testEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  if (!testEnvironment) throw new Error('Firebase test environment was not initialized.');
  await clearFirestoreEmulatorData();
  await seedBaseData();
});

afterEach(async () => {
  await clearFirestoreEmulatorData();
});

afterAll(async () => {
  if (testEnvironment) await testEnvironment.cleanup();
});

describe('Firestore Security Rules: attendance policy', () => {
  test('copies the coordinator policy into an immutable session snapshot', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'coordinator-1'), { role: 'coordinator' });
    });
    const coordinatorDb = testEnvironment.authenticatedContext('coordinator-1').firestore();
    const db = assistantDb('assistant-1');
    const classRef = doc(coordinatorDb, 'classes', 'class-1');
    const policy = { gracePeriodMinutes: 0, fineAmount: 10000 };
    const newClass = { ...classOne, ...policy, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db, 'classes', 'new-class'), newClass));
    await assertSucceeds(setDoc(doc(coordinatorDb, 'classes', 'new-class'), newClass));
    await assertSucceeds(updateDoc(classRef, { ...policy, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'classes', 'class-1'), {
      fineAmount: 1,
      updatedAt: serverTimestamp(),
    }));

    const session = {
      ...sessionOne,
      status: 'not_open',
      openedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const sessionRef = doc(db, 'sessions', 'new-session');
    await assertFails(setDoc(sessionRef, session));
    await assertFails(setDoc(sessionRef, { ...session, ...policy, gracePeriodMinutes: 5 }));
    await assertFails(setDoc(sessionRef, { ...session, ...policy, fineAmount: 1 }));
    await assertSucceeds(runTransaction(db, async (transaction) => {
      const course = await transaction.get(doc(db, 'classes', 'class-1'));
      transaction.set(sessionRef, {
        ...session,
        gracePeriodMinutes: course.get('gracePeriodMinutes'),
        fineAmount: course.get('fineAmount'),
      });
    }));

    await assertSucceeds(updateDoc(classRef, { fineAmount: 15000, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(sessionRef, { fineAmount: 15000, updatedAt: serverTimestamp() }));
    const snapshot = await assertSucceeds(getDoc(sessionRef));
    expect(snapshot.data()).toMatchObject(policy);
  });
});

describe('Firestore Security Rules: participation access', () => {
  test('rejects unauthenticated access', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(
      getDoc(doc(unauthenticatedDb, 'sessions', 'session-1', 'participations', 'student-1')),
    );
  });

  test('allows a student to read their own participation', async () => {
    await assertSucceeds(
      getDoc(doc(studentDb('student-1'), 'sessions', 'session-1', 'participations', 'student-1')),
    );
  });

  test('rejects a student reading another student participation', async () => {
    await assertFails(
      getDoc(doc(studentDb('student-1'), 'sessions', 'session-1', 'participations', 'student-2')),
    );
  });

  test('allows an assistant to query their own leave queue', async () => {
    const leaveQueue = query(
      collectionGroup(assistantDb('assistant-1'), 'participations'),
      where('assistantId', '==', 'assistant-1'),
      where('kind', '==', 'leave'),
    );

    await assertSucceeds(getDocs(leaveQueue));
  });

  test('rejects an assistant querying another assistant leave queue', async () => {
    const otherQueue = query(
      collectionGroup(assistantDb('assistant-2'), 'participations'),
      where('assistantId', '==', 'assistant-1'),
      where('kind', '==', 'leave'),
    );

    await assertFails(getDocs(otherQueue));
  });
});

describe('Firestore Security Rules: attendance creation', () => {
  test('allows a member to create attendance while the session is open', async () => {
    const attendance = {
      sessionId: 'session-2',
      classId: 'class-1',
      assistantId: 'assistant-1',
      studentId: 'student-1',
      studentName: 'Student One',
      studentNumber: 'S001',
      kind: 'attendance',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      checkedInAt: serverTimestamp(),
    };

    await assertSucceeds(
      setDoc(
        doc(studentDb('student-1'), 'sessions', 'session-2', 'participations', 'student-1'),
        attendance,
      ),
    );
  });

  test('rejects attendance with missing checkedInAt', async () => {
    const invalidAttendance = {
      sessionId: 'session-2',
      classId: 'class-1',
      assistantId: 'assistant-1',
      studentId: 'student-1',
      studentName: 'Student One',
      studentNumber: 'S001',
      kind: 'attendance',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await assertFails(
      setDoc(
        doc(studentDb('student-1'), 'sessions', 'session-2', 'participations', 'student-1'),
        invalidAttendance,
      ),
    );
  });
});

describe('Firestore Security Rules: leave review', () => {
  test('allows the owning assistant to approve a pending leave', async () => {
    await assertSucceeds(
      updateDoc(
        doc(assistantDb('assistant-1'), 'sessions', 'session-1', 'participations', 'student-1'),
        {
          status: 'approved',
          reviewedBy: 'assistant-1',
          reviewedAt: serverTimestamp(),
          reviewNote: null,
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  test('rejects a leave review by another assistant', async () => {
    await assertFails(
      updateDoc(
        doc(assistantDb('assistant-2'), 'sessions', 'session-1', 'participations', 'student-1'),
        {
          status: 'approved',
          reviewedBy: 'assistant-2',
          reviewedAt: serverTimestamp(),
          reviewNote: null,
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });
});
