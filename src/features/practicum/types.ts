import type { Timestamp } from 'firebase/firestore';

export type SessionStatus = 'not_open' | 'open' | 'closed';

export type PracticumErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CLASS_ARCHIVED'
  | 'SESSION_ARCHIVED'
  | 'SESSION_NOT_OPEN'
  | 'SESSION_CLOSED'
  | 'NOT_ENROLLED'
  | 'CONFLICT'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: PracticumErrorCode; message?: string; retryable: boolean } };

export interface ClassDoc {
  id: string;
  name: string;
  code: string;
  course: string;
  timeZone: string;
  assistantId: string;
  isArchived: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface MembershipDoc {
  id: string; // `${classId}_${studentId}`
  classId: string;
  studentId: string;
  assistantId: string;
  studentName: string;
  studentNumber: string;
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SessionDoc {
  id: string;
  classId: string;
  assistantId: string;
  title: string;
  room: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  timeZone: string;
  status: SessionStatus;
  isArchived: boolean;
  openedAt: Timestamp | null;
  closedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CreateClassInput {
  name: string;
  code: string;
  course: string;
  timeZone?: string;
}

export interface UpdateClassInput {
  name?: string;
  code?: string;
  course?: string;
  timeZone?: string;
}

export interface UpsertMembershipInput {
  classId: string;
  studentId: string;
  isActive?: boolean;
}

export interface CreateSessionInput {
  classId: string;
  title: string;
  room: string;
  startsAt: Date;
  endsAt: Date;
  timeZone?: string;
}

export interface UpdateSessionInput {
  title?: string;
  room?: string;
  startsAt?: Date;
  endsAt?: Date;
  timeZone?: string;
}

