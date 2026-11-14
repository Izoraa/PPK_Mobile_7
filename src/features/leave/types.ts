import type { Timestamp } from 'firebase/firestore';

import type { AppErrorCode } from '@/types';

export type LeaveDecisionStatus = 'pending' | 'approved' | 'rejected';

export type LeaveAiStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface LeaveAiClassification {
  status: LeaveAiStatus;
  category: string | null;
  confidence: number | null;
  modelVersion: string | null;
  classifiedAt: Timestamp | null;
  errorCode: string | null;
  requestId: string | null;
  startedAt: Timestamp | null;
  attemptCount: number;
}

export interface LeaveRequestRecord {
  sessionId: string;
  classId: string;
  assistantId: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  reason: string;
  status: LeaveDecisionStatus;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  reviewNote: string | null;
  ai: LeaveAiClassification;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface LeaveSnapshot<T> {
  data: T;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface LeaveListenerError {
  code: AppErrorCode;
  retryable: boolean;
}
