import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { leaveAiStatusLabels, type LeaveReviewMetadata, type LeaveReviewRecord } from '../types';
import { colors, radius, spacing } from '@/theme';
import { LeaveReviewActions } from './LeaveReviewActions';

export interface LeaveReviewDetailProps {
  record: LeaveReviewRecord | null;
  metadata?: LeaveReviewMetadata;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('id-ID') : 'Belum tersedia';
}

export function LeaveReviewDetail({ record, metadata, onClose, onSuccess, onError }: LeaveReviewDetailProps) {
  if (!record) return null;
  const aiAvailable = record.ai.status === 'succeeded';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>Detail pengajuan izin</Text>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>Tutup</Text>
              </Pressable>
            </View>
            <Text style={styles.name}>{record.studentName}</Text>
            <Text style={styles.meta}>{record.studentNumber ? `NIM ${record.studentNumber}` : 'NIM tidak tersedia'}</Text>
            <Text style={styles.label}>Sesi</Text>
            <Text style={styles.value}>{metadata?.sessionTitle ?? record.sessionId}</Text>
            <Text style={styles.label}>Kelas</Text>
            <Text style={styles.value}>{metadata?.className ?? record.classId}</Text>
            <Text style={styles.label}>Alasan izin</Text>
            <Text style={styles.value}>{record.reason}</Text>
            <Text style={styles.label}>Waktu pengajuan</Text>
            <Text style={styles.value}>{formatDate(record.createdAt)}</Text>
            <Text style={styles.label}>Informasi AI</Text>
            <Text style={styles.value}>Status: {leaveAiStatusLabels[record.ai.status]}</Text>
            {aiAvailable ? <Text style={styles.value}>Kategori: {record.ai.category ?? 'Tidak tersedia'}</Text> : null}
            {aiAvailable && record.ai.confidence !== null ? (
              <Text style={styles.value}>Confidence: {record.ai.confidence}</Text>
            ) : null}
            {record.ai.status === 'failed' && record.ai.errorCode ? (
              <Text style={styles.meta}>Detail kegagalan: {record.ai.errorCode}</Text>
            ) : null}
            {record.ai.modelVersion ? <Text style={styles.meta}>Model: {record.ai.modelVersion}</Text> : null}
            {record.ai.attemptCount > 0 ? <Text style={styles.meta}>Percobaan: {record.ai.attemptCount}</Text> : null}
            {record.ai.classifiedAt ? <Text style={styles.meta}>Diklasifikasikan: {formatDate(record.ai.classifiedAt)}</Text> : null}
            <LeaveReviewActions record={record} onError={onError} onSuccess={onSuccess} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  content: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 },
  close: { padding: spacing.sm },
  closeText: { color: colors.primary, fontWeight: '600' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 14 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  value: { color: colors.text, fontSize: 15, lineHeight: 21 },
});
