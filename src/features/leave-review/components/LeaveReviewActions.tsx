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
import { colors, radius, spacing } from '@/theme';

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
          style={[styles.button, styles.approve, processing !== null && styles.disabled]}
        >
          {processing === 'approve' ? <ActivityIndicator color={colors.card} /> : <Text style={styles.buttonText}>Setujui</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={processing !== null}
          onPress={() => setRejectVisible(true)}
          style={[styles.button, styles.reject, processing !== null && styles.disabled]}
        >
          {processing === 'reject' ? <ActivityIndicator color={colors.card} /> : <Text style={styles.buttonText}>Tolak</Text>}
        </Pressable>
      </View>

      <ConfirmModal
        visible={approveVisible}
        title="Setujui pengajuan izin?"
        message="Keputusan ini akan disimpan sebagai keputusan manual asisten. Hasil AI tidak menentukan keputusan ini."
        confirmLabel="Setujui"
        onCancel={() => setApproveVisible(false)}
        onConfirm={confirmApprove}
      />

      <Modal visible={rejectVisible} transparent animationType="fade" onRequestClose={() => setRejectVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Tolak pengajuan izin?</Text>
            <Text style={styles.message}>Masukkan alasan keputusan. Catatan wajib berisi 5–500 karakter.</Text>
            <TextInput
              accessibilityLabel="Catatan penolakan"
              multiline
              maxLength={500}
              onChangeText={(value) => { setReviewNote(value); setNoteError(null); }}
              placeholder="Catatan reviewer"
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
                <Text style={styles.buttonText}>Tolak</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  disabled: { opacity: 0.55 },
  buttonText: { color: colors.card, fontSize: 15, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: spacing.md },
  dialog: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, color: colors.text, padding: spacing.sm, textAlignVertical: 'top' },
  counter: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  error: { color: colors.danger, fontSize: 13 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  rejectButton: { minHeight: 44, minWidth: 80, borderRadius: radius.sm, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
});
