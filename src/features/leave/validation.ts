export type LeaveReasonValidation =
  | { valid: true; value: string }
  | { valid: false; error: 'empty' | 'too_short' | 'too_long' };

export function validateLeaveReason(input: string): LeaveReasonValidation {
  const value = input.trim();
  const length = Array.from(value).length;

  if (length === 0) return { valid: false, error: 'empty' };
  if (length < 10) return { valid: false, error: 'too_short' };
  if (length > 1000) return { valid: false, error: 'too_long' };

  return { valid: true, value };
}