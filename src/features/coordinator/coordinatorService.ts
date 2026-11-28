import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import type { ClassDoc, Result as PracticumResult } from '@/features/practicum';
import { isFineAmount, isGracePeriodMinutes, readAttendancePolicy } from '@/features/practicum/attendancePolicy';
import type { Result } from '@/types';
import type {
  AssistantUser,
  CreateClassByCoordinatorInput,
  CreateLaboratoryInput,
  LaboratoryDoc,
  UpdateLaboratoryInput,
} from './types';

// ============================================================================
// 1. MANAJEMEN RUANG / LABORATORIUM
// ============================================================================

export function subscribeLaboratories(
  onChange: (labs: LaboratoryDoc[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const labRef = collection(db, 'laboratories');
  const q = query(labRef, orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: LaboratoryDoc[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          capacity: data.capacity,
          description: data.description,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      onChange(list);
    },
    (err) => {
      console.error('Error subscribeLaboratories:', err);
      onError?.(err);
    },
  );
}

export async function createLaboratory(
  input: CreateLaboratoryInput,
): Promise<Result<{ labId: string }>> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }

  try {
    const db = getFirebaseFirestore();
    const docRef = await addDoc(collection(db, 'laboratories'), {
      name,
      ...(input.capacity ? { capacity: Number(input.capacity) } : {}),
      ...(input.description ? { description: input.description.trim() } : {}),
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: { labId: docRef.id } };
  } catch (err: any) {
    console.error('Error createLaboratory:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export async function updateLaboratory(
  labId: string,
  input: UpdateLaboratoryInput,
): Promise<Result<void>> {
  try {
    const db = getFirebaseFirestore();
    const labRef = doc(db, 'laboratories', labId);

    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.capacity !== undefined) updateData.capacity = Number(input.capacity);
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    await updateDoc(labRef, updateData);
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error('Error updateLaboratory:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export async function toggleLaboratoryActive(
  labId: string,
  currentStatus: boolean,
): Promise<Result<void>> {
  return updateLaboratory(labId, { isActive: !currentStatus });
}

export async function deleteLaboratory(labId: string): Promise<Result<void>> {
  try {
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, 'laboratories', labId));
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error('Error deleteLaboratory:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

// ============================================================================
// 2. MANAJEMEN ASISTEN PRAKTIKUM (ACC / PERSETUJUAN PENDAFTARAN)
// ============================================================================

export function subscribeAssistants(
  onChange: (assistants: AssistantUser[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const usersRef = collection(db, 'users');
  // Ambil semua pengguna yang mendaftar atau berstatus asisten
  const q = query(usersRef, where('requestedRole', '==', 'assistant'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AssistantUser[] = snapshot.docs.map((d) => {
        const data = d.data();
        const role = data.role ?? 'student';
        const requestedRole = data.requestedRole ?? 'assistant';
        const isPending = role === 'student' && requestedRole === 'assistant';

        return {
          id: d.id,
          name: data.name ?? '',
          email: data.email ?? '',
          studentNumber: data.studentNumber,
          role,
          requestedRole,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
          isPending,
        };
      });

      // Urutkan: yang pending di paling atas, kemudian berdasarkan nama
      list.sort((a, b) => {
        if (a.isPending !== b.isPending) return a.isPending ? -1 : 1;
        return a.name.localeCompare(b.name, 'id');
      });

      onChange(list);
    },
    (err) => {
      console.error('Error subscribeAssistants:', err);
      onError?.(err);
    },
  );
}

export async function approveAssistant(userId: string): Promise<Result<void>> {
  try {
    const db = getFirebaseFirestore();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'assistant',
      updatedAt: serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error('Error approveAssistant:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export async function rejectAssistant(userId: string): Promise<Result<void>> {
  try {
    const db = getFirebaseFirestore();
    const userRef = doc(db, 'users', userId);
    // Kembalikan requestedRole menjadi student
    await updateDoc(userRef, {
      requestedRole: 'student',
      updatedAt: serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error('Error rejectAssistant:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export function subscribeActiveAssistants(
  onChange: (assistants: Array<{ id: string; name: string; email: string }>) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'assistant'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? '',
        email: d.data().email ?? '',
      }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      onChange(list);
    },
    (err) => {
      console.error('Error subscribeActiveAssistants:', err);
      onError?.(err);
    },
  );
}

// ============================================================================
// 3. MANAJEMEN KELAS PRAKTIKUM (KOORDINATOR)
// ============================================================================

const invalidAttendancePolicy = {
  code: 'VALIDATION_ERROR',
  message: 'Toleransi keterlambatan harus bilangan bulat minimal 0 menit dan denda harus bilangan bulat lebih dari Rp0.',
  retryable: false,
} as const;

export function subscribeAllClasses(
  onChange: (classes: ClassDoc[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const classesRef = collection(db, 'classes');
  const q = query(classesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClassDoc[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          code: data.code ?? '',
          course: data.course ?? '',
          timeZone: data.timeZone ?? 'Asia/Jakarta',
          assistantId: data.assistantId ?? '',
          isArchived: Boolean(data.isArchived),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      onChange(list);
    },
    (err) => {
      console.error('Error subscribeAllClasses:', err);
      onError?.(err);
    },
  );
}

export async function createClassByCoordinator(
  input: CreateClassByCoordinatorInput,
): Promise<PracticumResult<{ classId: string }>> {
  const name = input.name.trim();
  const code = input.code.trim();
  const course = input.course.trim();
  const assistantId = input.assistantId.trim();
  const timeZone = (input.timeZone ?? 'Asia/Jakarta').trim();

  if (!name || !code || !course || !assistantId) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', retryable: false } };
  }
  const policy = readAttendancePolicy(input.gracePeriodMinutes, input.fineAmount);
  if (!policy) return { ok: false, error: invalidAttendancePolicy };

  try {
    const db = getFirebaseFirestore();
    const docRef = await addDoc(collection(db, 'classes'), {
      name,
      code,
      course,
      timeZone,
      assistantId,
      ...policy,
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: { classId: docRef.id } };
  } catch (err: any) {
    console.error('Error createClassByCoordinator:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export async function updateClassByCoordinator(
  classId: string,
  input: Partial<CreateClassByCoordinatorInput> & { isArchived?: boolean },
): Promise<PracticumResult<void>> {
  const { gracePeriodMinutes, fineAmount } = input;
  if (
    (gracePeriodMinutes !== undefined && !isGracePeriodMinutes(gracePeriodMinutes)) ||
    (fineAmount !== undefined && !isFineAmount(fineAmount))
  ) {
    return { ok: false, error: invalidAttendancePolicy };
  }

  try {
    const db = getFirebaseFirestore();
    const classRef = doc(db, 'classes', classId);

    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code.trim();
    if (input.course !== undefined) updateData.course = input.course.trim();
    if (input.timeZone !== undefined) updateData.timeZone = input.timeZone.trim();
    if (input.assistantId !== undefined) updateData.assistantId = input.assistantId.trim();
    if (gracePeriodMinutes !== undefined) updateData.gracePeriodMinutes = gracePeriodMinutes;
    if (fineAmount !== undefined) updateData.fineAmount = fineAmount;
    if (input.isArchived !== undefined) updateData.isArchived = input.isArchived;

    await updateDoc(classRef, updateData);
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error('Error updateClassByCoordinator:', err);
    return { ok: false, error: { code: 'NETWORK_ERROR', retryable: true } };
  }
}

export async function archiveClassByCoordinator(classId: string): Promise<PracticumResult<void>> {
  return updateClassByCoordinator(classId, { isArchived: true });
}
