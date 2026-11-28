import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AppErrorCode, Result } from "@/types";
import { getErrorMessage } from "@/utils/errors";
import { CHECK_IN_ERROR_MESSAGES } from "@/utils/messages";

import { checkSessionQrPayload } from "./qrPayload";

const QR_VALIDITY_MS = 15 * 60 * 1000;
const HTTP_DATE_PRECISION_MS = 1000;

type SessionAttendanceQr = {
  sessionId: string;
  qrPayload: string;
  expiresAt: string;
  displayUntil: number;
};

type AttendanceCheckInRequest = {
  sessionId: string;
  qrPayload: string;
  location: { latitude: number; longitude: number; accuracyMeters: number };
};

type AttendanceApiRequest =
  | { path: "qr/issue"; body: { sessionId: string } }
  | { path: "qr/validate"; body: { sessionId: string; qrPayload: string } }
  | { path: "check-in"; body: AttendanceCheckInRequest };

type AttendanceApiResponse = { response: Response; body: unknown; requestedAt: number };

type AttendanceApiErrorCode = AppErrorCode
  | "QR_INVALID"
  | "QR_SESSION_MISMATCH"
  | "QR_EXPIRED"
  | "SESSION_NOT_OPEN"
  | "LOCATION_UNAVAILABLE"
  | "OUTSIDE_GEOFENCE"
  | "RATE_LIMITED";

type AttendanceApiError = { code: AttendanceApiErrorCode; retryable: boolean };
type AttendanceApiFailure = { ok: false; error: AttendanceApiError };

type AttendanceCheckInResult =
  | { ok: true; data: { sessionId: string; status: "present"; checkedInAt: string } }
  | { ok: false; error: AttendanceApiError & { message: string } };

export function getAttendanceApiErrorMessage(code: AttendanceApiErrorCode): string {
  switch (code) {
    case "QR_INVALID":
      return "Kode QR presensi tidak valid atau sudah diganti. Pindai kode terbaru dari asisten.";
    case "QR_SESSION_MISMATCH":
      return "Kode QR ini untuk sesi praktikum lain.";
    case "QR_EXPIRED":
      return "Kode QR sudah kedaluwarsa. Minta kode baru kepada asisten.";
    case "FORBIDDEN":
      return CHECK_IN_ERROR_MESSAGES.NOT_A_STUDENT;
    case "SESSION_NOT_OPEN":
    case "SESSION_CLOSED":
      return CHECK_IN_ERROR_MESSAGES[code];
    case "SESSION_ARCHIVED":
      return "Sesi sudah diarsipkan. Presensi tidak dapat dilakukan.";
    case "CLASS_ARCHIVED":
      return "Kelas sudah diarsipkan. Presensi tidak dapat dilakukan.";
    case "NOT_FOUND":
      return "Sesi atau kelas praktikum tidak ditemukan.";
    case "LOCATION_UNAVAILABLE":
      return "Lokasi perangkat belum tersedia. Aktifkan layanan lokasi dan coba lagi.";
    case "OUTSIDE_GEOFENCE":
      return "Kamu berada di luar radius presensi laboratorium. Dekati lokasi laboratorium lalu coba lagi.";
    case "RATE_LIMITED":
      return "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.";
    default:
      return getErrorMessage(code);
  }
}

function readErrorCode(body: unknown): unknown {
  if (
    typeof body === "object" && body !== null && "error" in body &&
    typeof body.error === "object" && body.error !== null && "code" in body.error
  ) {
    return body.error.code;
  }
  return undefined;
}

function qrRequestError(status: number, body: unknown): Extract<Result<never>, { ok: false }> {
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

function studentAttendanceError(status: number, body: unknown): AttendanceApiFailure {
  const code = readErrorCode(body);
  switch (code) {
    case "QR_INVALID":
    case "QR_SESSION_MISMATCH":
    case "QR_EXPIRED":
    case "NOT_ENROLLED":
    case "SESSION_NOT_OPEN":
    case "ALREADY_CHECKED_IN":
    case "PARTICIPATION_CONFLICT":
      return { ok: false, error: { code, retryable: false } };
    case "LOCATION_UNAVAILABLE":
    case "OUTSIDE_GEOFENCE":
      return { ok: false, error: { code, retryable: true } };
  }
  if (status === 429) {
    return { ok: false, error: { code: "RATE_LIMITED", retryable: true } };
  }
  if (status === 404 && code !== "NOT_FOUND") {
    return { ok: false, error: { code: "SERVICE_UNAVAILABLE", retryable: false } };
  }
  return qrRequestError(status, body);
}

async function postAttendanceRequest(
  request: AttendanceApiRequest,
  signal?: AbortSignal,
): Promise<Result<AttendanceApiResponse>> {
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
    const response = await fetch(`${baseUrl}/api/v1/attendance/${request.path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body),
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
  const result = await postAttendanceRequest({ path: "qr/issue", body: { sessionId } }, signal);
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
): Promise<{ ok: true } | AttendanceApiFailure> {
  const result = await postAttendanceRequest({ path: "qr/validate", body: { sessionId, qrPayload } }, signal);
  if (!result.ok) return result;

  const { response, body } = result.data;
  if (!response.ok) return studentAttendanceError(response.status, body);

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

export async function requestSessionAttendanceCheckIn(
  { sessionId, qrPayload, location }: AttendanceCheckInRequest,
  signal?: AbortSignal,
): Promise<AttendanceCheckInResult> {
  const failure = (error: AttendanceApiError): AttendanceCheckInResult => ({
    ok: false,
    error: { ...error, message: getAttendanceApiErrorMessage(error.code) },
  });

  const { latitude, longitude, accuracyMeters } = location;
  if (
    !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
    !Number.isFinite(accuracyMeters) || accuracyMeters < 0
  ) {
    return failure({ code: "LOCATION_UNAVAILABLE", retryable: true });
  }

  const result = await postAttendanceRequest({
    path: "check-in",
    body: { sessionId, qrPayload, location: { latitude, longitude, accuracyMeters } },
  }, signal);
  if (!result.ok) return failure(result.error);

  const { response, body } = result.data;
  if (!response.ok) return failure(studentAttendanceError(response.status, body).error);

  if (
    response.status !== 200 ||
    typeof body !== "object" || body === null || !("ok" in body) || body.ok !== true ||
    !("data" in body) || typeof body.data !== "object" || body.data === null ||
    !("sessionId" in body.data) || body.data.sessionId !== sessionId ||
    !("status" in body.data) || body.data.status !== "present" ||
    !("checkedInAt" in body.data) || typeof body.data.checkedInAt !== "string"
  ) {
    return failure({ code: "SERVICE_UNAVAILABLE", retryable: true });
  }

  const checkedInAt = body.data.checkedInAt;
  const timestamp = Date.parse(checkedInAt);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== checkedInAt) {
    return failure({ code: "SERVICE_UNAVAILABLE", retryable: true });
  }

  return { ok: true, data: { sessionId, status: "present", checkedInAt } };
}
