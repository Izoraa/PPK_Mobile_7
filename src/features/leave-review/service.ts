import {
  collection,
  collectionGroup,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type FirestoreError,
  type Query,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import {
  getAttendanceAuth,
  getAttendanceFirestore,
} from "@/features/attendance/service";
import { requestLabCheckInApi } from "@/lib/labCheckInApi";
import type { Result } from "@/types";
import type {
  LeaveAi,
  LeaveAiStatus,
  LeaveReviewError,
  LeaveReviewMetadata,
  LeaveReviewRecord,
} from "./types";

export type LeaveReviewDecision = {
  sessionId: string;
  studentId: string;
  status: "approved" | "rejected";
  reviewedBy: string;
  reviewNote: string | null;
};

const pendingDecisions = new Set<string>();

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toISOString();
  }
  return value instanceof Date ? value.toISOString() : null;
}

function isLeaveAiStatus(value: unknown): value is LeaveAiStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "succeeded" ||
    value === "failed"
  );
}

function readAi(value: unknown): LeaveAi | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    !isLeaveAiStatus(data.status) ||
    (typeof data.category !== "string" && data.category !== null) ||
    (typeof data.confidence !== "number" && data.confidence !== null) ||
    (typeof data.modelVersion !== "string" && data.modelVersion !== null) ||
    (typeof data.errorCode !== "string" && data.errorCode !== null) ||
    (typeof data.requestId !== "string" && data.requestId !== null) ||
    typeof data.attemptCount !== "number" ||
    !Number.isInteger(data.attemptCount)
  )
    return null;

  return {
    status: data.status,
    category: data.category,
    confidence: data.confidence,
    modelVersion: data.modelVersion,
    classifiedAt: timestampToIso(data.classifiedAt),
    errorCode: data.errorCode,
    requestId: data.requestId,
    startedAt: timestampToIso(data.startedAt),
    attemptCount: data.attemptCount,
  };
}

export function createPendingLeaveReviewQuery(): Query<DocumentData> {
  const uid = getAttendanceAuth().currentUser?.uid;
  if (!uid) throw new Error("UNAUTHENTICATED");

  return query(
    collectionGroup(getAttendanceFirestore(), "participations"),
    where("assistantId", "==", uid),
    where("kind", "==", "leave"),
    where("status", "==", "pending"),
  );
}

export function parseLeaveReviewRecord(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): LeaveReviewRecord | null {
  const data = snapshot.data();
  const ai = readAi(data.ai);
  if (
    typeof data.sessionId !== "string" ||
    typeof data.classId !== "string" ||
    typeof data.assistantId !== "string" ||
    typeof data.studentId !== "string" ||
    typeof data.studentName !== "string" ||
    (typeof data.studentNumber !== "string" && data.studentNumber !== null) ||
    data.kind !== "leave" ||
    (data.status !== "pending" && data.status !== "approved" && data.status !== "rejected") ||
    typeof data.reason !== "string" ||
    !ai
  )
    return null;

  return {
    id: snapshot.id,
    sessionId: data.sessionId,
    classId: data.classId,
    assistantId: data.assistantId,
    studentId: data.studentId,
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    kind: "leave",
    reason: data.reason,
    status: data.status,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    reviewedBy: typeof data.reviewedBy === "string" ? data.reviewedBy : null,
    reviewedAt: timestampToIso(data.reviewedAt),
    reviewNote: typeof data.reviewNote === "string" ? data.reviewNote : null,
    ai,
  };
}

export async function getLeaveReviewMetadata(
  sessionId: string,
  classId: string,
): Promise<LeaveReviewMetadata> {
  try {
    const db = getAttendanceFirestore();
    const [sessionSnapshot, classSnapshot] = await Promise.all([
      getDocFromServer(doc(db, "sessions", sessionId)),
      getDocFromServer(doc(db, "classes", classId)),
    ]);
    return {
      sessionTitle:
        sessionSnapshot.exists() &&
          typeof sessionSnapshot.data().title === "string"
          ? sessionSnapshot.data().title
          : null,
      className:
        classSnapshot.exists() && typeof classSnapshot.data().name === "string"
          ? classSnapshot.data().name
          : null,
    };
  } catch {
    return { sessionTitle: null, className: null };
  }
}

function mapListenerError(error: FirestoreError): LeaveReviewError {
  switch (error.code) {
    case "permission-denied":
      return { code: "FORBIDDEN", retryable: false };
    case "unauthenticated":
      return { code: "UNAUTHENTICATED", retryable: false };
    case "unavailable":
    case "deadline-exceeded":
      return { code: "NETWORK_ERROR", retryable: true };
    default:
      return { code: "SERVICE_UNAVAILABLE", retryable: true };
  }
}

async function reviewLeave(
  sessionId: string,
  studentId: string,
  status: "approved" | "rejected",
  reviewNote: string | null,
): Promise<Result<LeaveReviewDecision>> {
  if (!sessionId.trim() || !studentId.trim()) {
    return { ok: false, error: { code: "VALIDATION_ERROR", retryable: false } };
  }

  const note = reviewNote?.trim() ?? null;
  if ((note !== null && note.length > 500) || (status === "rejected" && (note?.length ?? 0) < 5)) {
    return { ok: false, error: { code: "VALIDATION_ERROR", retryable: false } };
  }

  // The student ID is only unique within a session.
  const leaveId = JSON.stringify([sessionId, studentId]);
  if (pendingDecisions.has(leaveId)) {
    return { ok: false, error: { code: "CONFLICT", retryable: false } };
  }
  pendingDecisions.add(leaveId);

  try {
    const user = getAttendanceAuth().currentUser;
    if (!user) {
      return {
        ok: false,
        error: { code: "UNAUTHENTICATED", retryable: false },
      };
    }

    const action = status === "approved" ? "approve" : "reject";
    const result = await requestLabCheckInApi(`/api/leave/${encodeURIComponent(leaveId)}/${action}`, {
      method: "POST",
      body: { reviewNote: note },
      successStatus: 200,
      user,
    });
    if (!result.ok) return result;

    const response = result.data;
    if (
      !response || typeof response !== "object" ||
      !("ok" in response) || response.ok !== true ||
      !("data" in response) || !response.data || typeof response.data !== "object" ||
      !("sessionId" in response.data) || response.data.sessionId !== sessionId ||
      !("studentId" in response.data) || response.data.studentId !== studentId ||
      !("status" in response.data) || response.data.status !== status ||
      !("reviewedBy" in response.data) || response.data.reviewedBy !== user.uid ||
      !("reviewNote" in response.data) || response.data.reviewNote !== note
    ) {
      return {
        ok: false,
        error: { code: "SERVICE_UNAVAILABLE", retryable: true },
      };
    }

    // The existing Firestore listeners reconcile the queue and read the server timestamps.
    return { ok: true, data: { sessionId, studentId, status, reviewedBy: user.uid, reviewNote: note } };
  } catch {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } };
  } finally {
    pendingDecisions.delete(leaveId);
  }
}

export function approveLeave(
  sessionId: string,
  studentId: string,
  reviewNote: string | null = null,
): Promise<Result<LeaveReviewDecision>> {
  return reviewLeave(sessionId, studentId, "approved", reviewNote);
}

export function rejectLeave(
  sessionId: string,
  studentId: string,
  reviewNote: string,
): Promise<Result<LeaveReviewDecision>> {
  return reviewLeave(sessionId, studentId, "rejected", reviewNote);
}

export function subscribePendingLeaveReviews(
  onChange: (
    records: LeaveReviewRecord[],
    metadata: { fromCache: boolean; hasPendingWrites: boolean },
  ) => void,
  onError: (error: LeaveReviewError) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      createPendingLeaveReviewQuery(),
      { includeMetadataChanges: true },
      (snapshot) => {
        const records = snapshot.docs
          .map(parseLeaveReviewRecord)
          .filter((record): record is LeaveReviewRecord => record !== null);
        onChange(records, {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites:
            snapshot.metadata.hasPendingWrites ||
            snapshot.docs.some(
              (document) => document.metadata.hasPendingWrites,
            ),
        });
      },
      (error: FirestoreError) => onError(mapListenerError(error)),
    );
  } catch (error) {
    onError({
      code:
        error instanceof Error && error.message === "UNAUTHENTICATED"
          ? "UNAUTHENTICATED"
          : "SERVICE_UNAVAILABLE",
      retryable: error instanceof Error && error.message !== "UNAUTHENTICATED",
    });
    return () => { };
  }
}

export function subscribeSessionPendingLeaveReviews(
  sessionId: string,
  onChange: (
    records: LeaveReviewRecord[],
    metadata: { fromCache: boolean; hasPendingWrites: boolean },
  ) => void,
  onError: (error: LeaveReviewError) => void,
): Unsubscribe {
  if (!sessionId.trim()) {
    onError({ code: "VALIDATION_ERROR", retryable: false });
    return () => { };
  }

  try {
    const sessionParticipations = collection(
      getAttendanceFirestore(),
      "sessions",
      sessionId,
      "participations",
    );

    const sessionQuery = query(
      sessionParticipations,
      where("kind", "==", "leave"),
    );

    return onSnapshot(
      sessionQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const records = snapshot.docs
          .map(parseLeaveReviewRecord)
          .filter((record): record is LeaveReviewRecord => record !== null);

        onChange(records, {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites:
            snapshot.metadata.hasPendingWrites ||
            snapshot.docs.some(
              (document) => document.metadata.hasPendingWrites,
            ),
        });
      },
      (error: FirestoreError) => onError(mapListenerError(error)),
    );
  } catch (error) {
    onError({
      code:
        error instanceof Error && error.message === "UNAUTHENTICATED"
          ? "UNAUTHENTICATED"
          : "SERVICE_UNAVAILABLE",
      retryable: !(
        error instanceof Error && error.message === "UNAUTHENTICATED"
      ),
    });
    return () => { };
  }
}
