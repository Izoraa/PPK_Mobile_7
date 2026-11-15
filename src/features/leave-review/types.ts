import type { AppErrorCode } from '@/types';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveAiStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export const leaveAiStatusLabels: Record<LeaveAiStatus, string> = {
  pending: 'Menunggu klasifikasi',
  processing: 'Sedang diproses',
  succeeded: 'Berhasil diklasifikasikan',
  failed: 'Klasifikasi gagal',
};

export type LeaveAi = {
  status: LeaveAiStatus;
  category: string | null;
  confidence: number | null;
  modelVersion: string | null;
  classifiedAt: string | null;
  errorCode: string | null;
  requestId: string | null;
  startedAt: string | null;
  attemptCount: number;
};

export type LeaveReviewRecord = {
  id: string;
  sessionId: string;
  classId: string;
  assistantId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  kind: 'leave';
  reason: string;
  status: LeaveStatus;
  createdAt: string | null;
  updatedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  ai: LeaveAi;
};

export type LeaveReviewError = {
  code: AppErrorCode;
  retryable: boolean;
};

export type LeaveReviewQueueState = {
  status: 'loading' | 'ready' | 'error';
  records: LeaveReviewRecord[];
  error: LeaveReviewError | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
  retry: () => void;
};

export type LeaveReviewMetadata = {
  sessionTitle: string | null;
  className: string | null;
};
