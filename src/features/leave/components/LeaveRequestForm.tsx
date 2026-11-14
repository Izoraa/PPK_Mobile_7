import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
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
        Ajukan izin
      </Text>

      <Text style={styles.label}>Sesi</Text>
      <Text style={styles.session}>{sessionTitle}</Text>

      <AiSupportNotice />

      {!sessionAcceptsLeave ? (
        <Text style={styles.error}>Izin tidak dapat diajukan untuk sesi yang sudah ditutup.</Text>
      ) : !isEligible ? (
        <Text style={styles.error}>
          {eligibilityMessage ?? 'Anda belum dapat mengajukan izin untuk sesi ini.'}
        </Text>
      ) : null}

      <Text style={styles.label}>Alasan izin</Text>
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
        placeholder="Jelaskan alasan izin (10–1.000 karakter)"
        placeholderTextColor={colors.textMuted}
        textAlignVertical="top"
        style={styles.input}
      />
      <Text style={styles.counter}>{Array.from(reason.trim()).length}/1.000 karakter</Text>

      {validationMessage ? <Text style={styles.error}>{validationMessage}</Text> : null}
      {submitError ? <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text> : null}
      {isSubmitted ? (
        <Text accessibilityRole="alert" style={styles.success}>
          Pengajuan izin berhasil dikirim.
        </Text>
      ) : null}

      <Text style={styles.notice}>
        Periksa alasan sebelum mengirim. Pengajuan tidak dapat diedit atau dibatalkan setelah dikirim.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Mengirim…' : isSubmitted ? 'Sudah dikirim' : 'Kirim pengajuan izin'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '700' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  session: { color: colors.text, fontSize: 16 },
  input: {
    minHeight: 140,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 16,
  },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  notice: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
