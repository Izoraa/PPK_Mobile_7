import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmModal } from '@/components/common/ConfirmModal';
import { approveLeave, rejectLeave } from '../service';
import type { LeaveReviewRecord } from '../types';
import { colors, radius, spacing, shadows } from '@/theme';

export interface LeaveReviewActionsProps {
  record: LeaveReviewRecord;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function errorMessage(code: string) {
  switch (code) {
    case 'FORBIDDEN': return 'Anda tidak berwenang meninjau pengajuan ini.';
    case 'CONFLICT': return 'Pengajuan sudah ditinjau oleh pengguna lain.';
    case 'NETWORK_ERROR': return 'Koneksi bermasalah. Silakan coba lagi.';
    case 'UNAUTHENTICATED': return 'Sesi akun berakhir. Silakan login kembali.';
    case 'VALIDATION_ERROR': return 'Data review tidak valid.';
    default: return 'Review izin gagal diproses. Silakan coba lagi.';
  }
}

export function LeaveReviewActions({ record, onSuccess, onError }: LeaveReviewActionsProps) {
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
  const [approveVisible, setApproveVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  async function confirmApprove() {
    if (processing) return;
    setApproveVisible(false);
    setProcessing('approve');
    const result = await approveLeave(record.sessionId, record.studentId);
    setProcessing(null);
    if (result.ok) onSuccess('Pengajuan izin disetujui.');
    else onError(errorMessage(result.error.code));
  }

  async function confirmReject() {
    const note = reviewNote.trim();
    if (note.length < 5 || note.length > 500) {
      setNoteError('Catatan penolakan harus berisi 5–500 karakter.');
      return;
    }
    if (processing) return;
    setNoteError(null);
    setRejectVisible(false);
    setProcessing('reject');
    const result = await rejectLeave(record.sessionId, record.studentId, note);
    setProcessing(null);
    if (result.ok) {
      setReviewNote('');
      onSuccess('Pengajuan izin ditolak.');
    } else onError(errorMessage(result.error.code));
  }

  return (
    <>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={processing !== null}
          onPress={() => setApproveVisible(true)}
          style={({ pressed }) => [
            styles.button,
            styles.approve,
            processing !== null && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {processing === 'approve' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>✓ Setujui Izin</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={processing !== null}
          onPress={() => setRejectVisible(true)}
          style={({ pressed }) => [
            styles.button,
            styles.reject,
            processing !== null && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {processing === 'reject' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>✕ Tolak Izin</Text>
          )}
        </Pressable>
      </View>

      <ConfirmModal
        visible={approveVisible}
        title="Setujui Pengajuan Izin?"
        message="Keputusan ini akan disimpan sebagai keputusan manual asisten. Praktikan akan ditandai hadir dengan status izin."
        confirmLabel="Setujui Sekarang"
        cancelLabel="Batal"
        onCancel={() => setApproveVisible(false)}
        onConfirm={confirmApprove}
      />

      <Modal visible={rejectVisible} transparent animationType="fade" onRequestClose={() => setRejectVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Tolak Pengajuan Izin?</Text>
            <Text style={styles.message}>Masukkan alasan penolakan untuk praktikan (5–500 karakter).</Text>
            <TextInput
              accessibilityLabel="Catatan penolakan"
              multiline
              maxLength={500}
              onChangeText={(value) => { setReviewNote(value); setNoteError(null); }}
              placeholder="Contoh: Surat keterangan dokter belum dilampirkan atau tidak valid"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              value={reviewNote}
            />
            <Text style={styles.counter}>{reviewNote.length}/500</Text>
            {noteError ? <Text accessibilityRole="alert" style={styles.error}>{noteError}</Text> : null}
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" onPress={() => setRejectVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={confirmReject} style={styles.rejectButton}>
                <Text style={styles.buttonText}>Tolak Izin</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  error: { color: colors.dangerText, fontSize: 13, fontWeight: '600' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  cancelText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  rejectButton: {
    minHeight: 44,
    minWidth: 100,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
