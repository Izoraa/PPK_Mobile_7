import type { Timestamp } from 'firebase/firestore';
import type { Role } from '@/types';
import type { AttendancePolicy } from '@/features/practicum/attendancePolicy';

export interface LaboratoryDoc {
  id: string;
  name: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CreateLaboratoryInput {
  name: string;
  capacity?: number;
  description?: string;
}

export interface UpdateLaboratoryInput {
  name?: string;
  capacity?: number;
  description?: string;
  isActive?: boolean;
}

export interface AssistantUser {
  id: string;
  name: string;
  email: string;
  studentNumber?: string;
  role: Role;
  requestedRole: Role;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  isPending: boolean;
}

export interface CreateClassByCoordinatorInput extends AttendancePolicy {
  name: string;
  code: string;
  course: string;
  timeZone?: string;
  assistantId: string;
}

export interface CoordinatorStats {
  totalClasses: number;
  totalLaboratories: number;
  totalAssistants: number;
  pendingAssistantsCount: number;
}
