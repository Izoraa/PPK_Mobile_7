import type { AppErrorCode, Result, SessionStatus } from '@/types';

export type AttendanceRecord = {
  id: string;
  praktikanId: string;
  praktikanName: string;
  timestamp: string;
};

export type AttendanceSession = {
  id: string;
  classId: string;
  assistantId: string;
  status: SessionStatus;
  isArchived: boolean;
};

export type AttendanceParticipation = {
  id: string;
  kind: 'attendance' | 'leave';
  status: 'pending' | 'approved' | 'rejected' | null;
  checkedInAt: string | null;
};

export type FirestoreAttendanceRecord = {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  checkedInAt: string | null;
  createdAt: string | null;
};

export type SessionParticipationSummary = {
  attendanceCount: number;
  pendingLeaveCount: number;
  approvedLeaveCount: number;
  rejectedLeaveCount: number;
};

export type AttendanceSessionMetadata = {
  id: string;
  title: string;
  room: string;
  startsAt: string | null;
  endsAt: string | null;
  timeZone: string;
};

export type AttendanceError = {
  code: AppErrorCode;
  retryable: boolean;
};

export type AttendanceResult<T> = Result<T>;
