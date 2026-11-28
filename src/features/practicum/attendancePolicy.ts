export interface AttendancePolicy {
  gracePeriodMinutes: number;
  fineAmount: number;
}

export function isGracePeriodMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isFineAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function readAttendancePolicy(
  gracePeriodMinutes: unknown,
  fineAmount: unknown,
): AttendancePolicy | null {
  if (!isGracePeriodMinutes(gracePeriodMinutes) || !isFineAmount(fineAmount)) {
    return null;
  }

  return { gracePeriodMinutes, fineAmount };
}
