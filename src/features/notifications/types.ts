import type { Timestamp } from 'firebase/firestore';

export type NotificationEventType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export interface DeviceTokenDoc {
  id: string; // `${uid}_${platform}` or token hash
  uid: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceName?: string | null;
  lastSeenAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

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
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_SUPPORTED'
  | 'UNAUTHENTICATED'
  | 'TOKEN_FETCH_FAILED'
  | 'FIRESTORE_ERROR'
  | 'NETWORK_ERROR';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: NotificationErrorCode; message: string; retryable: boolean } };
