import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AppErrorCode, Result } from "@/types";

type SessionAttendanceQr = {
  sessionId: string;
  qrPayload: string;
  expiresAt: string;
};

function qrRequestError(status: number, body: unknown): Result<never> {
  if (
    typeof body === "object" && body !== null && "error" in body &&
    typeof body.error === "object" && body.error !== null && "code" in body.error
  ) {
    const code = body.error.code;
    if (code === "SESSION_CLOSED" || code === "SESSION_ARCHIVED" || code === "CLASS_ARCHIVED") {
      return { ok: false, error: { code, retryable: false } };
    }
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

export async function requestSessionAttendanceQr(
  sessionId: string,
  signal?: AbortSignal,
): Promise<Result<SessionAttendanceQr>> {
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
    const response = await fetch(`${baseUrl}/api/v1/attendance/qr/issue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
      signal,
    });
    const body: unknown = await response.json().catch(() => null);

    if (auth.currentUser !== user) {
      return { ok: false, error: { code: "UNAUTHENTICATED", retryable: false } };
    }
    if (!response.ok) {
      return qrRequestError(response.status, body);
    }
    if (
      typeof body !== "object" || body === null ||
      !("sessionId" in body) || body.sessionId !== sessionId ||
      !("qrPayload" in body) || typeof body.qrPayload !== "string" || !body.qrPayload ||
      !("expiresAt" in body) || typeof body.expiresAt !== "string" || !body.expiresAt
    ) {
      return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } };
    }

    const { qrPayload, expiresAt } = body;
    return { ok: true, data: { sessionId, qrPayload, expiresAt } };
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", retryable: true } };
  }
}
