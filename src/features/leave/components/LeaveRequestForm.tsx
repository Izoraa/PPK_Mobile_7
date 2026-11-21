import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, shadows } from '@/theme';
import type { Result, SessionStatus } from '@/types';
import { getErrorMessage } from '@/utils/errors';

import { AiSupportNotice } from './AiSupportNotice';
import type { LeaveSubmissionRef } from '../leaveService';
import { validateLeaveReason } from '../validation';

type Props = {
  sessionTitle: string;
  sessionStatus: SessionStatus;
  isEligible: boolean;
  eligibilityMessage?: string;
  onSubmit: (reason: string) => Promise<Result<LeaveSubmissionRef>>;
};

export function LeaveRequestForm({
  sessionTitle,
  sessionStatus,
  isEligible,
  eligibilityMessage,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validation = validateLeaveReason(reason);
  const sessionAcceptsLeave =
    sessionStatus === 'not_open' || sessionStatus === 'open';

  const validationMessage = !showValidation || validation.valid
    ? null
    : validation.error === 'empty'
      ? 'Alasan wajib diisi.'
      : validation.error === 'too_short'
        ? 'Alasan minimal 10 karakter.'
        : 'Alasan maksimal 1.000 karakter.';

  const canSubmit =
    sessionAcceptsLeave &&
    isEligible &&
    validation.valid &&
    !isSubmitting &&
    !isSubmitted;

  async function handleSubmit() {
    setShowValidation(true);
    setSubmitError(null);

    if (!sessionAcceptsLeave || !isEligible || !validation.valid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(validation.value);
      if (result.ok) {
        setIsSubmitted(true);
      } else {
        setSubmitError(getErrorMessage(result.error.code));
      }
    } catch {
      setSubmitError(getErrorMessage('SERVICE_UNAVAILABLE'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        Ajukan Izin Praktikum
      </Text>

      <View style={styles.sessionBox}>
        <Text style={styles.sessionLabel}>Sesi Praktikum:</Text>
        <Text style={styles.sessionTitle}>{sessionTitle}</Text>
      </View>

      <AiSupportNotice />

      {!sessionAcceptsLeave ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>Izin tidak dapat diajukan untuk sesi yang sudah ditutup.</Text>
        </View>
      ) : !isEligible ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>
            {eligibilityMessage ?? 'Anda belum dapat mengajukan izin untuk sesi ini.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Alasan Izin</Text>
        <TextInput
          accessibilityLabel="Alasan izin"
          value={reason}
          onChangeText={(value) => {
            setReason(value);
            setSubmitError(null);
          }}
          editable={!isSubmitting && !isSubmitted}
          multiline
          maxLength={1000}
          placeholder="Jelaskan alasan izin Anda secara jelas (10–1.000 karakter)"
          placeholderTextColor="#98A2B3"
          textAlignVertical="top"
          style={styles.input}
        />
        <Text style={styles.counter}>{Array.from(reason.trim()).length}/1.000 karakter</Text>
      </View>

      {validationMessage ? <Text style={styles.errorText}>⚠️ {validationMessage}</Text> : null}
      {submitError ? <Text accessibilityRole="alert" style={styles.errorText}>⚠️ {submitError}</Text> : null}
      {isSubmitted ? (
        <View style={styles.successBox}>
          <Text accessibilityRole="alert" style={styles.success}>
            ✅ Pengajuan izin berhasil dikirimkan.
          </Text>
        </View>
      ) : null}

      <Text style={styles.notice}>
        Catatan: Periksa alasan sebelum mengirim. Pengajuan tidak dapat diedit setelah dikirim.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && canSubmit && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Mengirimkan…' : isSubmitted ? 'Sudah Dikirim' : 'Kirim Pengajuan Izin'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  sessionBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  sessionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  sessionTitle: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  field: {
    gap: spacing.xs,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 120,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  errorBox: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  error: { color: colors.dangerText, fontSize: 13, fontWeight: '500' },
  errorText: { color: colors.dangerText, fontSize: 13, fontWeight: '600' },
  successBox: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  success: { color: colors.successText, fontSize: 14, fontWeight: '600' },
  notice: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
