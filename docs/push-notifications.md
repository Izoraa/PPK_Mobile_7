# Push notifications API handoff

The Expo app uses the LabCheckIn Express API for device registration and leave decisions. The API uses the Firebase ID token to identify the caller, writes decisions and notification jobs in Firestore, and delivers pushes through its worker. [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens) · [Expo push notifications overview](https://docs.expo.dev/push-notifications/overview/)

## Request contract

Every request uses `Authorization: Bearer <Firebase ID token>` and `Content-Type: application/json`. The app retries a `401` once with a force-refreshed token. Keep authentication ahead of all mutations so this retry is safe. [Firebase User.getIdToken](https://firebase.google.com/docs/reference/js/auth.user#getidtoken)

| Method and route | JSON body sent by the app | Success |
| --- | --- | --- |
| `POST /api/device-tokens` | `{"installationId":"<id>","expoPushToken":"ExponentPushToken[...]"}` | `204`, empty |
| `DELETE /api/device-tokens` | `{"installationId":"<id>"}` | `204`, empty, including repeated deletion |
| `POST /api/leave/:leaveId/approve` | `{"reviewNote":null}` or an optional trimmed note up to 500 characters | `200`, decision and a queued job |
| `POST /api/leave/:leaveId/reject` | `{"reviewNote":"<trimmed reason, 5–500 characters>"}` | `200`, decision and a queued job |

The app persists a 32-character hex installation ID generated from 16 random bytes. The same installation ID is used across restarts and account switches. The API scopes deletion to the caller and installation. It transfers ownership of existing registrations for the same installation or Expo token when a different account registers.

`leaveId` is `encodeURIComponent(JSON.stringify([sessionId, studentId]))`. Both IDs are required because Firestore stores each student's leave under `sessions/{sessionId}/participations/{studentId}`. The API returns the following response shape.

```json
{
  "ok": true,
  "data": {
    "sessionId": "session-id",
    "studentId": "student-uid",
    "status": "rejected",
    "reviewedBy": "assistant-uid",
    "reviewNote": "Bukti belum lengkap.",
    "notification": { "status": "queued", "jobId": "<job ID>" }
  }
}
```

The decision transaction writes `status`, `reviewedBy`, `reviewNote`, `reviewedAt`, and `updatedAt` and queues the notification. The app's existing Firestore listeners read the canonical timestamps and decision data for both the assistant and student views. The decision response reports a committed job. Delivery proceeds asynchronously.

The mobile app maps `400` to input validation, `401` to sign-in required, `403` to insufficient permission, `404` to missing leave, and `409` to a leave that can no longer be decided. Transport failures, `429`, and `5xx` allow a user retry. After an ambiguous response, the listener can reconcile a decision already committed by the API. The server's pending-status check prevents a second decision or job.

## Release coordination

- Deploy the four API routes and start the notification worker before cutting clients over. Keep the app and API on the same Firebase project. Roll out the app and the Firestore rule change together because older app versions still write leave decisions directly. The current rules have no client cancellation operation. The prepared rules preserve the existing participation reads and valid student creates, including both leave and attendance, and restrict the decision updates and notification data to server writers. [Firestore rules structure](https://firebase.google.com/docs/firestore/security/rules-structure)
- Existing token documents with `uid` and `token` use the legacy schema. Delivery through the worker begins after an installation registers through the API. Plan legacy record cleanup or retention on the server.
- Logout waits for the current registration request, attempts installation deletion while authenticated, and then signs out. If a request times out, the server may already have accepted it. Failed deletion can leave a stale registration, and a late registration from a timed-out request can race deletion. A backend expiry or ordering mechanism would be needed to close those cases. A later successful registration for the installation transfers its ownership.
- The Express leave sender currently uses generic English copy. The previous app used the Indonesian titles “Pengajuan Izin Disetujui” and “Pengajuan Izin Ditolak” and included a review note in the body when available. Match the Indonesian copy and confirm with the product owner whether the push should show the note on the lock screen. The authenticated leave detail continues to show the exact note. Preserve `data.eventType` as `LEAVE_APPROVED` or `LEAVE_REJECTED` and `data.sessionId` for notification taps. [Expo incoming notifications](https://docs.expo.dev/push-notifications/receiving-notifications/)
- If the Expo web app uses a different origin, allow that origin and the `Authorization` and `Content-Type` headers for the leave POST routes and their CORS preflight.

## Session alerts pending backend dispatch

The existing `openSession` and `updateSession` actions still commit their Firestore session updates. The client dispatcher previously selected active class members and sent `SESSION_OPENED` and `SCHEDULE_CHANGED` from the app. These alerts require a trusted sender before rollout. The Express worker in the current workspace handles leave decisions.

Use a trusted consumer of committed updates to `sessions/{sessionId}` to schedule these alerts without a second client request. Detect a `not_open` to `open` transition for `SESSION_OPENED` and a change to `title`, `room`, `timeZone`, `startsAt`, or `endsAt` for `SCHEDULE_CHANGED`. Deduplicate by source event ID or committed update version. Resolve active membership and eligible student device registrations on the server. Send the existing Indonesian titles “Sesi Praktikum Dibuka” and “Perubahan Jadwal Praktikum” with the session details, and preserve uppercase `data.eventType`, `data.sessionId`, `data.classId`, and the millisecond `data.timestamp`.

## Expo configuration

Set the existing `EXPO_PUBLIC_LABCHECKIN_API_URL` to the API origin in local development and EAS. Production requires HTTPS. Use the EAS project configured in `app.json` and configure FCM and APNs credentials for the target applications. Ship a native build that includes SDK 58's `expo-crypto` module. Keep Firebase Admin credentials and any Expo push access token in the API environment. [Expo environment variables](https://docs.expo.dev/guides/environment-variables/) · [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) · [Expo SDK 58 Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/)
