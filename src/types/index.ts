export type Role = 'student' | 'assistant';

export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PASSWORD_POLICY'
  | 'PROFILE_INCOMPLETE'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'CLASS_ARCHIVED'
  | 'SESSION_ARCHIVED'
  | 'SESSION_CLOSED'
  | 'NOT_ENROLLED'
  | 'ALREADY_CHECKED_IN'
  | 'ALREADY_SUBMITTED'
  | 'PARTICIPATION_CONFLICT'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; retryable: boolean } };

export type SessionStatus = 'not_open' | 'open' | 'closed';

export interface User {
  id: string;
  name: string;
  studentNumber?: string; // NIM, included for student and assistant accounts when available
  role: Role;
}

export interface Session {
  id: string;
  course: string; // nama praktikum
  room: string; // kelas / laboratorium
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  status: SessionStatus;
  assistantId: string;
  openedAt: string | null; // ISO string
  closedAt: string | null; // ISO string
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  checkedInAt: string; // ISO string
}

export type CheckInError =
  | 'SESSION_NOT_OPEN'
  | 'SESSION_CLOSED'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_A_STUDENT';

export type CheckInResult =
  | { ok: true; attendance: Attendance }
  | { ok: false; reason: CheckInError };
