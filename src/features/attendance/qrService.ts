import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AppErrorCode, Result } from "@/types";

import { checkSessionQrPayload } from "./qrPayload";

const QR_VALIDITY_MS = 15 * 60 * 1000;
const HTTP_DATE_PRECISION_MS = 1000;

type SessionAttendanceQr = {
  sessionId: string;
  qrPayload: string;
  expiresAt: string;
  displayUntil: number;
};

type QrApiResponse = { response: Response; body: unknown; requestedAt: number };

export type QrVerificationErrorCode = AppErrorCode
  | "QR_INVALID"
  | "QR_SESSION_MISMATCH"
  | "QR_EXPIRED"
  | "RATE_LIMITED";

type QrVerificationResult =
  | { ok: true }
  | { ok: false; error: { code: QrVerificationErrorCode; retryable: boolean } };

function readErrorCode(body: unknown): unknown {
  if (
    typeof body === "object" && body !== null && "error" in body &&
    typeof body.error === "object" && body.error !== null && "code" in body.error
  ) {
    return body.error.code;
  }
  return undefined;
}

function qrRequestError(status: number, body: unknown): Result<never> {
  const code = readErrorCode(body);
  if (code === "SESSION_CLOSED" || code === "SESSION_ARCHIVED" || code === "CLASS_ARCHIVED") {
    return { ok: false, error: { code, retryable: false } };
  }

  const codes: Partial<Record<number, AppErrorCode>> = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
  };
  return {
    ok: false,
    error: {
      code: codes[status] ?? "SERVICE_UNAVAILABLE",
      retryable: status === 429 || status >= 500,
    },
  };
}

async function postQrRequest(
  action: "issue" | "validate",
  requestBody: { sessionId: string; qrPayload?: string },
  signal?: AbortSignal,
): Promise<Result<QrApiResponse>> {
  const baseUrl = process.env.EXPO_PUBLIC_LABCHECKIN_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl || !(/^https:\/\//i.test(baseUrl) || (__DEV__ && /^http:\/\//i.test(baseUrl)))) {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: false } };
  }

  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      return { ok: false, error: { code: "UNAUTHENTICATED", retryable: false } };
    }

    const idToken = await user.getIdToken();
    if (auth.currentUser !== user) {
      return { ok: false, error: { code: "UNAUTHENTICATED", retryable: false } };
    }

    const requestedAt = performance.now();
    const response = await fetch(`${baseUrl}/api/v1/attendance/qr/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal,
    });
    const body: unknown = await response.json().catch(() => null);

    if (auth.currentUser !== user) {
      return { ok: false, error: { code: "UNAUTHENTICATED", retryable: false } };
    }
    return { ok: true, data: { response, body, requestedAt } };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code === "auth/user-token-expired" || code === "auth/invalid-user-token" || code === "auth/user-disabled") {
      return { ok: false, error: { code: "UNAUTHENTICATED", retryable: false } };
    }
    return { ok: false, error: { code: "NETWORK_ERROR", retryable: true } };
  }
}

export async function requestSessionAttendanceQr(
  sessionId: string,
  signal?: AbortSignal,
): Promise<Result<SessionAttendanceQr>> {
  const result = await postQrRequest("issue", { sessionId }, signal);
  if (!result.ok) return result;

  const { response, body, requestedAt } = result.data;
  if (!response.ok) return qrRequestError(response.status, body);

  if (
    typeof body !== "object" || body === null ||
    !("sessionId" in body) || body.sessionId !== sessionId ||
    !("qrPayload" in body) || typeof body.qrPayload !== "string" ||
    checkSessionQrPayload(body.qrPayload, sessionId) !== "matching" ||
    !("expiresAt" in body) || typeof body.expiresAt !== "string"
  ) {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } };
  }

  const { qrPayload, expiresAt } = body;
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } };
  }

  const responseTimeMs = Date.parse(response.headers.get("Date") ?? "");
  const displayWindowMs = Number.isFinite(responseTimeMs)
    ? Math.min(QR_VALIDITY_MS, expiresAtMs - responseTimeMs - HTTP_DATE_PRECISION_MS)
    : QR_VALIDITY_MS;
  // Start at the request to account for transit and avoid using the device wall clock.
  const displayUntil = requestedAt + displayWindowMs;
  return { ok: true, data: { sessionId, qrPayload, expiresAt, displayUntil } };
}

export async function verifySessionAttendanceQr(
  sessionId: string,
  qrPayload: string,
  signal: AbortSignal,
): Promise<QrVerificationResult> {
  const result = await postQrRequest("validate", { sessionId, qrPayload }, signal);
  if (!result.ok) return result;

  const { response, body } = result.data;
  if (!response.ok) {
    const code = readErrorCode(body);
    if (code === "QR_INVALID" || code === "QR_SESSION_MISMATCH" || code === "QR_EXPIRED") {
      return { ok: false, error: { code, retryable: false } };
    }
    if (response.status === 429) {
      return { ok: false, error: { code: "RATE_LIMITED", retryable: true } };
    }
    if (response.status === 404) {
      return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: false } };
    }
    return qrRequestError(response.status, body);
  }

  if (
    response.status !== 200 ||
    typeof body !== "object" || body === null || !("ok" in body) || body.ok !== true ||
    !("data" in body) || typeof body.data !== "object" || body.data === null ||
    !("sessionId" in body.data) || body.data.sessionId !== sessionId ||
    !("qrVerified" in body.data) || body.data.qrVerified !== true
  ) {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } };
  }

  return { ok: true };
}
