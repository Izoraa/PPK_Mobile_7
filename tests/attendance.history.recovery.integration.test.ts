import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
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
import { getAttendanceSessionMetadata } from '@/features/attendance/subscriptions';
import {
  clearFirestoreEmulatorData,
  createFirebaseTestEnvironment,
  FIREBASE_TEST_PROJECT_ID,
} from './helpers/firebase-emulator';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;
const TEST_PASSWORD = 'Password123!';

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: jest.fn(() => {
    throw new Error('The history recovery test initializes its Firebase app first.');
  }),
}));

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rulesEnvironment: RulesTestEnvironment;

function historyQuery(firestore: Firestore, uid: string): Query<DocumentData> {
  return query(
    collectionGroup(firestore, 'participations'),
    where('studentId', '==', uid),
    where('kind', '==', 'attendance'),
    orderBy('createdAt', 'desc'),
  );
}

function waitForHistorySnapshot(
  firestoreQuery: Query<DocumentData>,
  predicate: (docs: { id: string; data: () => DocumentData }[]) => boolean,
): Promise<{ id: string; data: () => DocumentData }[]> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for attendance history snapshot.'));
    }, 5_000);

    unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        if (!predicate(snapshot.docs)) return;
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

async function createTestApp(): Promise<void> {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-history-recovery-app-id',
  });
  auth = getAuth(app);
  db = getFirestore(app);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
}

async function seedHistoryFixture(uid: string): Promise<void> {
  await rulesEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      uid,
      email: 'history-student@example.test',
      role: 'student',
      requestedRole: 'student',
    });
    await setDoc(doc(adminDb, 'classes', 'history-class'), {
      name: 'Kelas History',
      code: 'HISTORY-1',
      course: 'Praktikum History',
      timeZone: 'Asia/Jakarta',
      assistantId: 'history-assistant',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'history-session'), {
      classId: 'history-class',
      assistantId: 'history-assistant',
      title: 'Pertemuan History 1',
      room: 'Lab A',
      startsAt: Timestamp.fromMillis(10_000),
      endsAt: Timestamp.fromMillis(20_000),
      timeZone: 'Asia/Jakarta',
      status: 'closed',
      isArchived: false,
    });
    await setDoc(doc(adminDb, 'sessions', 'history-session', 'participations', uid), {
      sessionId: 'history-session',
      classId: 'history-class',
      assistantId: 'history-assistant',
      studentId: uid,
      studentName: 'Student History',
      studentNumber: 'H-001',
      kind: 'attendance',
      createdAt: Timestamp.fromMillis(30_000),
      updatedAt: Timestamp.fromMillis(30_000),
      checkedInAt: Timestamp.fromMillis(30_000),
    });
    await setDoc(doc(adminDb, 'sessions', 'history-session', 'participations', 'leave-record'), {
      sessionId: 'history-session',
      classId: 'history-class',
      assistantId: 'history-assistant',
      studentId: uid,
      studentName: 'Student History',
      studentNumber: 'H-001',
      kind: 'leave',
      status: 'approved',
      createdAt: Timestamp.fromMillis(40_000),
      updatedAt: Timestamp.fromMillis(40_000),
    });
  });
}

beforeAll(async () => {
  rulesEnvironment = await createFirebaseTestEnvironment();
});

beforeEach(async () => {
  await clearFirestoreEmulatorData();
  await createTestApp();
});

afterEach(async () => {
  await signOut(auth).catch(() => undefined);
  await deleteApp(app);
  await clearFirestoreEmulatorData();
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
});

test('reads recognizable session metadata without changing the attendance contract', async () => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    `history-${Date.now()}@example.test`,
    TEST_PASSWORD,
  );
  await seedHistoryFixture(credential.user.uid);

  const metadata = await getAttendanceSessionMetadata('history-session');

  expect(metadata).toEqual({
    id: 'history-session',
    title: 'Pertemuan History 1',
    room: 'Lab A',
    startsAt: new Date(10_000).toISOString(),
    endsAt: new Date(20_000).toISOString(),
    timeZone: 'Asia/Jakarta',
  });
});

test('restores the existing history after Firebase app reinitialization and listener reattach', async () => {
  const email = `history-restart-${Date.now()}@example.test`;
  const credential = await createUserWithEmailAndPassword(auth, email, TEST_PASSWORD);
  const uid = credential.user.uid;
  await seedHistoryFixture(uid);

  const firstDocs = await waitForHistorySnapshot(historyQuery(db, uid), (docs) => docs.length === 1);
  expect(firstDocs[0].data()).toMatchObject({
    studentId: uid,
    kind: 'attendance',
    sessionId: 'history-session',
  });

  await signOut(auth);
  await deleteApp(app);

  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${FIREBASE_TEST_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_TEST_PROJECT_ID,
    appId: 'demo-history-recovery-app-id-restarted',
  });
  auth = getAuth(app);
  db = getFirestore(app);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  await signInWithEmailAndPassword(auth, email, TEST_PASSWORD);

  const restoredDocs = await waitForHistorySnapshot(historyQuery(db, uid), (docs) => docs.length === 1);
  expect(restoredDocs.map((item) => item.data().sessionId)).toEqual(['history-session']);
  expect(restoredDocs.every((item) => item.data().studentId === uid)).toBe(true);
  expect(restoredDocs.every((item) => item.data().kind === 'attendance')).toBe(true);
});
