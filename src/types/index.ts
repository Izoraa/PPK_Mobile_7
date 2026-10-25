export type Role = 'student' | 'assistant';

export type SessionStatus = 'not_open' | 'open' | 'closed';

export interface User {
  id: string;
  name: string;
  studentNumber?: string; // only for students (NIM)
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
