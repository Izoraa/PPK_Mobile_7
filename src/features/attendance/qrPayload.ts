export function checkSessionQrPayload(qrPayload: string, sessionId: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(qrPayload);
  } catch {
    return 'invalid';
  }

  if (
    typeof payload !== 'object' || payload === null ||
    Object.keys(payload).length !== 3 ||
    !('v' in payload) || payload.v !== 1 ||
    !('sessionId' in payload) || typeof payload.sessionId !== 'string' || !payload.sessionId ||
    !('token' in payload) || typeof payload.token !== 'string' || !payload.token.trim()
  ) {
    return 'invalid';
  }

  return payload.sessionId === sessionId ? 'matching' : 'session-mismatch';
}
