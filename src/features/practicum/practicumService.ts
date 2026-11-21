import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { dispatchNotification } from '../notifications';
import type {
  ClassDoc,
  CreateClassInput,
  CreateSessionInput,
  MembershipDoc,
  Result,
  SessionDoc,
  StudentUserItem,
  UpdateClassInput,
  UpdateSessionInput,
  UpsertMembershipInput,
} from './types';

// Helper to map Firestore class doc
function toClassDoc(id: string, data: Record<string, any>): ClassDoc {
  return {
    id,
    name: data.name ?? '',
    code: data.code ?? '',
    course: data.course ?? '',
    timeZone: data.timeZone ?? 'Asia/Jakarta',
    assistantId: data.assistantId ?? '',
    isArchived: Boolean(data.isArchived),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// Helper to map Firestore membership doc
function toMembershipDoc(id: string, data: Record<string, any>): MembershipDoc {
  return {
    id,
    classId: data.classId ?? '',
    studentId: data.studentId ?? '',
    assistantId: data.assistantId ?? '',
    studentName: data.studentName ?? '',
    studentNumber: data.studentNumber ?? '',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// Helper to map Firestore session doc
function toSessionDoc(id: string, data: Record<string, any>): SessionDoc {
  return {
    id,
    classId: data.classId ?? '',
    assistantId: data.assistantId ?? '',
    title: data.title ?? '',
    room: data.room ?? '',
    startsAt: data.startsAt ?? Timestamp.now(),
    endsAt: data.endsAt ?? Timestamp.now(),
    timeZone: data.timeZone ?? 'Asia/Jakarta',
    status: data.status ?? 'not_open',
    isArchived: Boolean(data.isArchived),
    openedAt: data.openedAt ?? null,
    closedAt: data.closedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// -------------------------------------------------------------
// S2-SRS-11, S2-SRS-12, S2-SRS-13, S2-SRS-14: CLASS OPERATIONS
// -------------------------------------------------------------

export async function createClass(input: CreateClassInput): Promise<Result<{ classId: string }>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  const name = input.name.trim();
  const code = input.code.trim();
  const course = input.course.trim();
  const timeZone = (input.timeZone ?? 'Asia/Jakarta').trim();

  if (!name || !code || !course) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Semua field kelas wajib diisi.', retryable: false } };
  }

  try {
    const docRef = await addDoc(collection(db, 'classes'), {
      name,
      code,
      course,
      timeZone,
      assistantId: user.uid,
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: { classId: docRef.id } };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export async function updateClass(classId: string, input: UpdateClassInput): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const classRef = doc(db, 'classes', classId);
    const snap = await getDoc(classRef);

    if (!snap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.', retryable: false } };
    }

    const current = snap.data();
    if (current.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Anda bukan pemilik kelas ini.', retryable: false } };
    }

    if (current.isArchived) {
      return { ok: false, error: { code: 'CLASS_ARCHIVED', message: 'Kelas sudah diarsipkan.', retryable: false } };
    }

    const updates: Record<string, any> = { updatedAt: serverTimestamp() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.code !== undefined) updates.code = input.code.trim();
    if (input.course !== undefined) updates.course = input.course.trim();
    if (input.timeZone !== undefined) updates.timeZone = input.timeZone.trim();

    await updateDoc(classRef, updates);
    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export async function archiveClass(classId: string): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const classRef = doc(db, 'classes', classId);
    const snap = await getDoc(classRef);

    if (!snap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.', retryable: false } };
    }

    const current = snap.data();
    if (current.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Anda bukan pemilik kelas ini.', retryable: false } };
    }

    if (current.isArchived) {
      return { ok: true, data: undefined };
    }

    await updateDoc(classRef, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export function subscribeClasses(
  scope: { assistantId?: string; studentId?: string; includeArchived?: boolean },
  onChange: (classes: ClassDoc[]) => void,
  onError?: (err: Error) => void,
  onMetadata?: (metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const classesRef = collection(db, 'classes');

  if (scope.assistantId) {
    const constraints: any[] = [where('assistantId', '==', scope.assistantId)];
    if (!scope.includeArchived) {
      constraints.push(where('isArchived', '==', false));
    }
    const q = query(classesRef, ...constraints);

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => toClassDoc(docSnap.id, docSnap.data()));
        onChange(list);
        onMetadata?.({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites
            || snapshot.docs.some((document) => document.metadata.hasPendingWrites),
        });
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  if (scope.studentId) {
    // For students: first observe memberships where studentId == scope.studentId
    const memQuery = query(
      collection(db, 'memberships'),
      where('studentId', '==', scope.studentId),
      where('isActive', '==', true)
    );

    return onSnapshot(
      memQuery,
      { includeMetadataChanges: true },
      async (memSnap) => {
        const rawClassIds = memSnap.docs.map((d) => d.data().classId).filter(Boolean);
        const classIds = Array.from(new Set(rawClassIds));
        if (classIds.length === 0) {
          onChange([]);
          onMetadata?.({
            fromCache: memSnap.metadata.fromCache,
            hasPendingWrites: memSnap.metadata.hasPendingWrites
              || memSnap.docs.some((document) => document.metadata.hasPendingWrites),
          });
          return;
        }

        // Fetch the corresponding classes
        try {
          const classDocs: ClassDoc[] = [];
          let classDocsFromCache = false;
          let classDocsHavePendingWrites = false;
          for (const cid of classIds) {
            const cSnap = await getDoc(doc(db, 'classes', cid));
            classDocsFromCache ||= cSnap.metadata.fromCache;
            classDocsHavePendingWrites ||= cSnap.metadata.hasPendingWrites;
            if (cSnap.exists()) {
              const cData = cSnap.data();
              if (scope.includeArchived || !cData.isArchived) {
                classDocs.push(toClassDoc(cSnap.id, cData));
              }
            }
          }
          const uniqueClassDocs = Array.from(new Map(classDocs.map((c) => [c.id, c])).values());
          onChange(uniqueClassDocs);
          onMetadata?.({
            fromCache: memSnap.metadata.fromCache || classDocsFromCache,
            hasPendingWrites: memSnap.metadata.hasPendingWrites
              || memSnap.docs.some((document) => document.metadata.hasPendingWrites)
              || classDocsHavePendingWrites,
          });
        } catch (e: any) {
          if (onError) onError(e);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  // Fallback: empty listener
  onChange([]);
  return () => { };
}

// -------------------------------------------------------------
// S2-SRS-15: MEMBERSHIP OPERATIONS
// -------------------------------------------------------------

export async function upsertMembership(input: UpsertMembershipInput): Promise<Result<{ membershipId: string }>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  const isActive = input.isActive ?? true;

  if (!classId || !studentId) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Class ID dan Student UID wajib diisi.', retryable: false } };
  }

  try {
    // 1. Verify class existence and assistant ownership
    const classSnap = await getDoc(doc(db, 'classes', classId));
    if (!classSnap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.', retryable: false } };
    }
    const classData = classSnap.data();
    if (classData.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik kelas yang dapat mengelola peserta.', retryable: false } };
    }
    if (classData.isArchived) {
      return { ok: false, error: { code: 'CLASS_ARCHIVED', message: 'Kelas sudah diarsipkan.', retryable: false } };
    }

    // 2. Verify target student exists and has 'student' role
    const studentUserSnap = await getDoc(doc(db, 'users', studentId));
    if (!studentUserSnap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Pengguna dengan UID ini tidak ditemukan.', retryable: false } };
    }
    const studentUserData = studentUserSnap.data();
    if (studentUserData.role !== 'student') {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'UID yang ditambahkan bukan praktikan.', retryable: false } };
    }

    // 3. Document ID pattern: `${classId}_${studentId}`
    const membershipId = `${classId}_${studentId}`;
    const memRef = doc(db, 'memberships', membershipId);
    const existingSnap = await getDoc(memRef);

    if (existingSnap.exists()) {
      await updateDoc(memRef, {
        isActive,
        studentName: studentUserData.name ?? '',
        studentNumber: studentUserData.studentNumber ?? '',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(memRef, {
        classId,
        studentId,
        assistantId: classData.assistantId,
        studentName: studentUserData.name ?? '',
        studentNumber: studentUserData.studentNumber ?? '',
        isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { ok: true, data: { membershipId } };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export function subscribeMembers(
  classId: string,
  onChange: (members: MembershipDoc[]) => void,
  onError?: (err: Error) => void,
  onMetadata?: (metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(collection(db, 'memberships'), where('classId', '==', classId));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => toMembershipDoc(docSnap.id, docSnap.data()));
      onChange(list);
      onMetadata?.({
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites
          || snapshot.docs.some((document) => document.metadata.hasPendingWrites),
      });
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

// -------------------------------------------------------------
// S2-SRS-16, 17, 18, 19, 20: SESSION OPERATIONS
// -------------------------------------------------------------

export async function createSession(input: CreateSessionInput): Promise<Result<{ sessionId: string }>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  const classId = input.classId.trim();
  const title = input.title.trim();
  const room = input.room.trim();
  const timeZone = (input.timeZone ?? 'Asia/Jakarta').trim();

  if (!classId || !title || !room) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Judul, ruang, dan kelas wajib diisi.', retryable: false } };
  }

  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Waktu selesai harus sesudah waktu mulai.', retryable: false } };
  }

  try {
    // Verify class ownership
    const classSnap = await getDoc(doc(db, 'classes', classId));
    if (!classSnap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.', retryable: false } };
    }
    const classData = classSnap.data();
    if (classData.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik kelas yang dapat membuat sesi.', retryable: false } };
    }
    if (classData.isArchived) {
      return { ok: false, error: { code: 'CLASS_ARCHIVED', message: 'Kelas sudah diarsipkan.', retryable: false } };
    }

    const conflict = await findConflictingSession(room, input.startsAt, input.endsAt);
    if (conflict) {
      const fmtStart = conflict.startsAt.toTimeString().substring(0, 5);
      const fmtEnd = conflict.endsAt.toTimeString().substring(0, 5);
      return {
        ok: false,
        error: {
          code: 'CONFLICT',
          message: `Ruangan "${room}" sudah digunakan oleh sesi "${conflict.title}" pada ${fmtStart}–${fmtEnd}. Pilih ruangan atau waktu lain.`,
          retryable: false,
        },
      };
    }

    if (input.startsAt.getTime() < Date.now()) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Waktu mulai tidak boleh kurang dari waktu saat ini.',
          retryable: false,
        },
      };
    }

    const docRef = await addDoc(collection(db, 'sessions'), {
      classId,
      assistantId: user.uid,
      title,
      room,
      startsAt: Timestamp.fromDate(input.startsAt),
      endsAt: Timestamp.fromDate(input.endsAt),
      timeZone,
      status: 'not_open',
      isArchived: false,
      openedAt: null,
      closedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: { sessionId: docRef.id } };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export async function updateSession(sessionId: string, input: UpdateSessionInput): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);

    if (!snap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Sesi tidak ditemukan.', retryable: false } };
    }

    if (input.startsAt && input.startsAt.getTime() < Date.now()) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Waktu mulai tidak boleh kurang dari waktu saat ini.',
          retryable: false,
        },
      };
    }

    const current = snap.data();
    if (current.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Anda bukan pemilik sesi ini.', retryable: false } };
    }

    if (current.isArchived) {
      return { ok: false, error: { code: 'SESSION_ARCHIVED', message: 'Sesi sudah diarsipkan.', retryable: false } };
    }

    // S2-SRS-18: Metadata can only be edited when status is 'not_open'
    if (current.status !== 'not_open') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Sesi yang sudah dibuka atau ditutup tidak dapat diubah.', retryable: false } };
    }

    const finalRoom = (input.room !== undefined ? input.room.trim() : current.room) as string;
    const finalStartsAt = input.startsAt ?? current.startsAt?.toDate?.();
    const finalEndsAt = input.endsAt ?? current.endsAt?.toDate?.();
    // Cek konflik jadwal, kecualikan sesi ini sendiri (excludeId)
    if (finalRoom && finalStartsAt && finalEndsAt) {
      const conflict = await findConflictingSession(
        finalRoom,
        finalStartsAt,
        finalEndsAt,
        sessionId,  // <-- ini yang membuat sesi sendiri tidak dianggap konflik
      );
      if (conflict) {
        const fmtStart = conflict.startsAt.toTimeString().substring(0, 5);
        const fmtEnd = conflict.endsAt.toTimeString().substring(0, 5);
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `Ruangan "${finalRoom}" sudah digunakan oleh sesi "${conflict.title}" pada ${fmtStart}–${fmtEnd}. Pilih ruangan atau waktu lain.`,
            retryable: false,
          },
        };
      }
    }

    const updates: Record<string, any> = { updatedAt: serverTimestamp() };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.room !== undefined) updates.room = input.room.trim();
    if (input.timeZone !== undefined) updates.timeZone = input.timeZone.trim();
    if (input.startsAt !== undefined) updates.startsAt = Timestamp.fromDate(input.startsAt);
    if (input.endsAt !== undefined) updates.endsAt = Timestamp.fromDate(input.endsAt);

    await updateDoc(sessionRef, updates);

    // S3-SRS-24: Notify enrolled students when session schedule is modified
    void dispatchNotification('SCHEDULE_CHANGED', {
      sessionId,
      classId: current.classId,
      title: 'Perubahan Jadwal Praktikum',
      body: `Jadwal sesi "${input.title ?? current.title}" telah diperbarui.`,
    });

    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export async function archiveSession(sessionId: string): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);

    if (!snap.exists()) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Sesi tidak ditemukan.', retryable: false } };
    }

    const current = snap.data();
    if (current.assistantId !== user.uid) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Anda bukan pemilik sesi ini.', retryable: false } };
    }

    // S2-SRS-19: Open session must be closed first before archiving
    if (current.status === 'open') {
      return { ok: false, error: { code: 'CONFLICT', message: 'Sesi terbuka harus ditutup terlebih dahulu sebelum diarsipkan.', retryable: false } };
    }

    await updateDoc(sessionRef, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message, retryable: true } };
  }
}

export async function openSession(sessionId: string): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    let sessionData: any = null;

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(sessionRef);
      if (!snap.exists()) {
        throw new Error('NOT_FOUND: Sesi tidak ditemukan.');
      }

      const data = snap.data();
      sessionData = data;
      if (data.assistantId !== user.uid) {
        throw new Error('FORBIDDEN: Anda bukan pemilik sesi ini.');
      }

      if (data.isArchived) {
        throw new Error('SESSION_ARCHIVED: Sesi sudah diarsipkan.');
      }

      if (data.status !== 'not_open') {
        throw new Error(`CONFLICT: Sesi sudah dalam status ${data.status}.`);
      }

      if (data.startsAt) {
        const startsAtDate = data.startsAt.toDate ? data.startsAt.toDate() : new Date(data.startsAt);
        if (Date.now() < startsAtDate.getTime()) {
          throw new Error('NOT_STARTED: Sesi hanya bisa dibuka setelah melewati atau sama dengan jam mulai.');
        }
      }

      txn.update(sessionRef, {
        status: 'open',
        openedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    // S3-SRS-23: Notify enrolled students when session is opened
    if (sessionData) {
      void dispatchNotification('SESSION_OPENED', {
        sessionId,
        classId: sessionData.classId,
        title: 'Sesi Praktikum Dibuka',
        body: `Sesi "${sessionData.title}" di ruang ${sessionData.room} telah dibuka. Silakan lakukan presensi.`,
      });
    }

    return { ok: true, data: undefined };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('FORBIDDEN')) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik sesi yang dapat membuka sesi.', retryable: false } };
    }
    if (msg.includes('SESSION_ARCHIVED')) {
      return { ok: false, error: { code: 'SESSION_ARCHIVED', message: 'Sesi sudah diarsipkan.', retryable: false } };
    }
    if (msg.includes('CONFLICT')) {
      return { ok: false, error: { code: 'CONFLICT', message: 'Sesi tidak dapat dibuka kembali atau sudah ditutup.', retryable: false } };
    }
    if (msg.includes('NOT_STARTED')) {
      return { ok: false, error: { code: 'NOT_STARTED' as any, message: 'Sesi hanya bisa dibuka setelah melewati atau sama dengan jam mulai.', retryable: false } };
    }
    return { ok: false, error: { code: 'NETWORK_ERROR', message: msg, retryable: true } };
  }
}

export async function closeSession(sessionId: string): Promise<Result<void>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const user = auth.currentUser;

  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false } };
  }

  try {
    const sessionRef = doc(db, 'sessions', sessionId);

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(sessionRef);
      if (!snap.exists()) {
        throw new Error('NOT_FOUND: Sesi tidak ditemukan.');
      }

      const data = snap.data();
      if (data.assistantId !== user.uid) {
        throw new Error('FORBIDDEN: Anda bukan pemilik sesi ini.');
      }

      if (data.isArchived) {
        throw new Error('SESSION_ARCHIVED: Sesi sudah diarsipkan.');
      }

      if (data.status !== 'open') {
        throw new Error(`CONFLICT: Sesi tidak sedang dibuka (status: ${data.status}).`);
      }

      txn.update(sessionRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { ok: true, data: undefined };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('FORBIDDEN')) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik sesi yang dapat menutup sesi.', retryable: false } };
    }
    if (msg.includes('CONFLICT')) {
      return { ok: false, error: { code: 'CONFLICT', message: 'Sesi harus berstatus terbuka untuk dapat ditutup.', retryable: false } };
    }
    return { ok: false, error: { code: 'NETWORK_ERROR', message: msg, retryable: true } };
  }
}

export function subscribeSessions(
  classId: string,
  onChange: (sessions: SessionDoc[]) => void,
  onError?: (err: Error) => void,
  onMetadata?: (metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, 'sessions'),
    where('classId', '==', classId),
    where('isArchived', '==', false)
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => toSessionDoc(docSnap.id, docSnap.data()));
      onChange(list);
      onMetadata?.({
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites
          || snapshot.docs.some((document) => document.metadata.hasPendingWrites),
      });
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export function subscribeSession(
  sessionId: string,
  onChange: (session: SessionDoc | null) => void,
  onError?: (err: Error) => void,
  onMetadata?: (metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const sessionRef = doc(db, 'sessions', sessionId);

  return onSnapshot(
    sessionRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
      } else {
        onChange(toSessionDoc(snap.id, snap.data()));
      }
      onMetadata?.({
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      });
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function getStudentUsers(): Promise<Result<StudentUserItem[]>> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();

  if (!auth.currentUser) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir.', retryable: false },
    };
  }

  try {
    // Query hanya user dengan role student
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    );
    const snapshot = await getDocs(q);

    const students: StudentUserItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      students.push({
        uid: docSnap.id,
        name: data.name || 'Tanpa Nama',
        studentNumber: data.studentNumber || '-',
        email: data.email || '',
      });
    });

    // Urutkan berdasarkan NIM atau Nama secara alfabetis
    students.sort((a, b) =>
      (a.studentNumber || '').localeCompare(b.studentNumber || '') ||
      a.name.localeCompare(b.name)
    );

    return { ok: true, data: students };
  } catch (err: any) {
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', message: err.message, retryable: true },
    };
  }
}

async function findConflictingSession(
  room: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<{ title: string; startsAt: Date; endsAt: Date } | null> {
  const db = getFirebaseFirestore();

  // 1. Ambil semua sesi aktif di ruangan yang sama (lintas kelas & asisten)
  const q = query(
    collection(db, 'sessions'),
    where('room', '==', room),
    where('isArchived', '==', false),
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    // Abaikan sesi yang sedang diedit ini sendiri
    if (excludeId && docSnap.id === excludeId) continue;

    const data = docSnap.data();
    const existingStart: Date = data.startsAt?.toDate?.() ?? new Date(0);
    const existingEnd: Date = data.endsAt?.toDate?.() ?? new Date(0);

    // Cek apakah ada irisan jam (overlap)
    const isOverlap =
      startsAt.getTime() < existingEnd.getTime() &&
      existingStart.getTime() < endsAt.getTime();

    if (isOverlap) {
      return {
        title: data.title ?? 'Sesi tanpa judul',
        startsAt: existingStart,
        endsAt: existingEnd,
      };
    }
  }

  return null;
}