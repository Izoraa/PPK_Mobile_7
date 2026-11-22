import type { AppErrorCode } from '@/types';

export type NotificationEventType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export interface NotificationPayload {
  title: string;
  body: string;
  data: {
    eventType: NotificationEventType;
    sessionId?: string;
    classId?: string;
    leaveId?: string;
    studentId?: string;
    targetUrl?: string;
    timestamp: number;
    [key: string]: any;
  };
}

export type NotificationErrorCode =
  | AppErrorCode
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_SUPPORTED'
  | 'TOKEN_FETCH_FAILED';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: NotificationErrorCode; retryable: boolean } };
