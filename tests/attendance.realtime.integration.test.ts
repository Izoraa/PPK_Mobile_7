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
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase/firestore';
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

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The realtime integration test must initialize its Firebase app first.');
  }),
}));

let app: FirebaseApp;
let assistantApp: FirebaseApp;
let auth: Auth;
let assistantAuth: Auth;
let db: Firestore;
let assistantDb: Firestore;
let rulesEnvironment: RulesTestEnvironment;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let userCounter = 0;

function sessionQuery(firestore: Firestore, sessionId: string): Query<DocumentData> {
  return query(
    collection(firestore, 'sessions', sessionId, 'participations'),
    where('kind', '==', 'attendance'),
  );
}

function historyQuery(): Query<DocumentData> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('History test requires an authenticated user.');

  return query(
    collectionGroup(db, 'participations'),
    where('studentId', '==', uid),
    where('kind', '==', 'attendance'),
    orderBy('createdAt', 'desc'),
  );
}

async function signInTestUser(): Promise<User> {
  userCounter += 1;
  const credential = await createUserWithEmailAndPassword(
    auth,
    `realtime-${userCounter}-${Date.now()}@example.test`,
    'Password123!',
  );
  return credential.user;
}

async function signInAssistantUser(): Promise<User> {
  userCounter += 1;
  const credential = await createUserWithEmailAndPassword(
    assistantAuth,
    `assistant-${userCounter}-${Date.now()}@example.test`,
    'Password123!',
  );
  return credential.user;
}

async function seedDomain(uid: string, assistantUid = 'assistant-1') {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      uid,
      email: `${uid}@example.test`,
      role: 'student',
      requestedRole: 'student',
    });
    await setDoc(doc(adminDb, 'users', assistantUid), {
      uid: assistantUid,
      email: `${assistantUid}@example.test`,
      role: 'assistant',
    });
    await setDoc(doc(adminDb, 'classes', 'class-1'), {
      name: 'Kelas Realtime',
      code: 'REALTIME-1',
      course: 'Praktikum Realtime',
      timeZone: 'Asia/Jakarta',
      assistantId: assistantUid,
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'memberships', `class-1_${uid}`), {
      classId: 'class-1',
      assistantId: assistantUid,
      studentId: uid,
      studentName: 'Student Realtime',
      studentNumber: 'RT-001',
      isActive: true,
    });
    for (const sessionId of ['session-1', 'session-2']) {
      await setDoc(doc(adminDb, 'sessions', sessionId), {
        classId: 'class-1',
          assistantId: assistantUid,
        title: `Sesi ${sessionId}`,
        room: 'Lab Realtime',
        timeZone: 'Asia/Jakarta',
        status: 'open',
        isArchived: false,
      });
    }
  });
}

async function seedHistoryRecord(
  studentId: string,
  sessionId: string,
  createdAt: Timestamp,
  studentName = 'Student History',
) {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'sessions', sessionId, 'participations', studentId), {
      sessionId,
      classId: 'class-1',
      assistantId: 'assistant-1',
      studentId,
      studentName,
      studentNumber: studentId === auth.currentUser?.uid ? 'RT-001' : 'RT-002',
      kind: 'attendance',
      createdAt,
      updatedAt: createdAt,
      checkedInAt: createdAt,
    });
  });
}

function waitForSnapshot(
  firestoreQuery: Query<DocumentData>,
  predicate: (snapshot: { docs: { id: string; data: () => DocumentData }[] }) => boolean,
): Promise<{ id: string; data: () => DocumentData }[]> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for Firestore snapshot.'));
    }, 5_000);

    unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        if (!predicate(snapshot)) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(snapshot.docs);
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      },
    );
  });
}

beforeAll(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-realtime-app-id',
  });
  assistantApp = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-assistant-app-id',
  }, 'attendance-assistant-list');
  auth = getAuth(app);
  assistantAuth = getAuth(assistantApp);
  db = getFirestore(app);
  assistantDb = getFirestore(assistantApp);

  if (!authEmulatorConnected) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    connectAuthEmulator(assistantAuth, AUTH_EMULATOR_URL, { disableWarnings: true });
    authEmulatorConnected = true;
  }
  if (!firestoreEmulatorConnected) {
    connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    connectFirestoreEmulator(assistantDb, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    firestoreEmulatorConnected = true;
  }
  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await signOut(auth);
  await signOut(assistantAuth);
});

afterEach(async () => {
  await clearFirestoreEmulatorData();
  if (auth.currentUser) await deleteUser(auth.currentUser);
  if (assistantAuth.currentUser) await deleteUser(assistantAuth.currentUser);
  await signOut(auth);
  await signOut(assistantAuth);
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteApp(app);
  await deleteApp(assistantApp);
});

describe('Realtime attendance list', () => {
  test('starts empty and receives a student check-in without refresh', async () => {
    const student = await signInTestUser();
    const assistant = await signInAssistantUser();
    await seedDomain(student.uid, assistant.uid);

    const initial = await waitForSnapshot(sessionQuery(assistantDb, 'session-1'), (snapshot) => snapshot.docs.length === 0);
    expect(initial).toHaveLength(0);

    const updatePromise = waitForSnapshot(sessionQuery(assistantDb, 'session-1'), (snapshot) => snapshot.docs.length === 1);
    await checkIn('session-1');
    const [attendance] = await updatePromise;

    expect(attendance.data()).toMatchObject({
      sessionId: 'session-1',
      studentId: student.uid,
      studentName: 'Student Realtime',
      studentNumber: 'RT-001',
      kind: 'attendance',
    });
  });

  test('switching sessionId stops the old listener and observes the new session', async () => {
    const student = await signInTestUser();
    const assistant = await signInAssistantUser();
    await seedDomain(student.uid, assistant.uid);

    const oldSessionInitial = await waitForSnapshot(sessionQuery(assistantDb, 'session-1'), (snapshot) => snapshot.docs.length === 0);
    expect(oldSessionInitial).toHaveLength(0);

    const newSessionInitial = await waitForSnapshot(sessionQuery(assistantDb, 'session-2'), (snapshot) => snapshot.docs.length === 0);
    expect(newSessionInitial).toHaveLength(0);

    const newSessionUpdate = waitForSnapshot(sessionQuery(assistantDb, 'session-2'), (snapshot) => snapshot.docs.length === 1);
    await checkIn('session-2');
    const [attendance] = await newSessionUpdate;

    expect(attendance.data().sessionId).toBe('session-2');
    expect(attendance.data().studentId).toBe(student.uid);
  });

  test('listener cleanup prevents callbacks after unsubscribe', async () => {
    const student = await signInTestUser();
    const assistant = await signInAssistantUser();
    await seedDomain(student.uid, assistant.uid);
    let callbackCount = 0;
    const unsubscribe = onSnapshot(sessionQuery(assistantDb, 'session-1'), () => {
      callbackCount += 1;
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    unsubscribe();
    const countAfterUnsubscribe = callbackCount;
    await checkIn('session-1');
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callbackCount).toBe(countAfterUnsubscribe);
  });

  test('reports a permission error for an unauthenticated listener', async () => {
    await seedDomain('student-without-auth');
    const unauthenticatedDb = rulesEnvironment.unauthenticatedContext().firestore();

    await expect(new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(
        query(collection(unauthenticatedDb, 'sessions', 'session-1', 'participations')),
        resolve,
        (error) => {
          unsubscribe();
          reject(error);
        },
      );
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('Attendance history', () => {
  test('is empty for a new student', async () => {
    const student = await signInTestUser();
    await seedDomain(student.uid);

    const docs = await waitForSnapshot(historyQuery(), (snapshot) => snapshot.docs.length === 0);

    expect(docs).toHaveLength(0);
  });

  test('returns only the logged-in student and orders newest first', async () => {
    const student = await signInTestUser();
    await seedDomain(student.uid);
    await seedHistoryRecord(student.uid, 'history-old', Timestamp.fromMillis(1_000));
    await seedHistoryRecord(student.uid, 'history-new', Timestamp.fromMillis(3_000));
    await seedHistoryRecord('student-b', 'history-other', Timestamp.fromMillis(4_000), 'Student B');

    const docs = await waitForSnapshot(historyQuery(), (snapshot) => snapshot.docs.length === 2);

    expect(docs.map((item) => item.data().studentId)).toEqual([student.uid, student.uid]);
    expect(docs.map((item) => item.data().sessionId)).toEqual(['history-new', 'history-old']);
  });

  test('receives a newly added attendance record in realtime', async () => {
    const student = await signInTestUser();
    await seedDomain(student.uid);
    await seedHistoryRecord(student.uid, 'history-old', Timestamp.fromMillis(1_000));
    await seedHistoryRecord('student-b', 'history-other', Timestamp.fromMillis(5_000), 'Student B');

    const initial = await waitForSnapshot(historyQuery(), (snapshot) => snapshot.docs.length === 1);
    expect(initial[0].data().studentId).toBe(student.uid);

    const updatePromise = waitForSnapshot(historyQuery(), (snapshot) => snapshot.docs.length === 2);
    await seedHistoryRecord(student.uid, 'history-new', Timestamp.fromMillis(6_000));
    const docs = await updatePromise;

    expect(docs[0].data().sessionId).toBe('history-new');
    expect(docs.every((item) => item.data().studentId === student.uid)).toBe(true);
  });

  test('listener cleanup prevents history callbacks after unsubscribe', async () => {
    const student = await signInTestUser();
    await seedDomain(student.uid);
    let callbackCount = 0;
    const unsubscribe = onSnapshot(historyQuery(), () => {
      callbackCount += 1;
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    unsubscribe();
    const countAfterUnsubscribe = callbackCount;
    await seedHistoryRecord(student.uid, 'history-after-unsubscribe', Timestamp.fromMillis(7_000));
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callbackCount).toBe(countAfterUnsubscribe);
  });
});
