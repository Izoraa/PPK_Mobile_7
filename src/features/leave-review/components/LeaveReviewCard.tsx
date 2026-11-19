import { Pressable, StyleSheet, Text, View } from 'react-native';

import { leaveAiStatusLabels, type LeaveReviewMetadata, type LeaveReviewRecord } from '../types';
import { colors, radius, spacing } from '@/theme';

export interface LeaveReviewCardProps {
  record: LeaveReviewRecord;
  metadata?: LeaveReviewMetadata;
  onPress: () => void;
}

function formatCreatedAt(value: string | null) {
  if (!value) return 'Waktu pengajuan belum tersedia';
  return new Date(value).toLocaleString('id-ID');
}

export function LeaveReviewCard({ record, metadata, onPress }: LeaveReviewCardProps) {
  const aiSummary = record.ai.status === 'succeeded'
    ? record.ai.category ?? 'Kategori tidak tersedia'
    : leaveAiStatusLabels[record.ai.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka pengajuan izin ${record.studentName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.name}>{record.studentName}</Text>
          <Text style={styles.secondary}>
            {record.studentNumber ? `NIM ${record.studentNumber}` : 'NIM tidak tersedia'}
          </Text>
        </View>
        <Text style={[
          styles.pending,
          record.status === 'approved' && styles.approved,
          record.status === 'rejected' && styles.rejected,
        ]}>
          {record.status === 'pending' ? 'Pending' : record.status === 'approved' ? 'Diterima' : 'Ditolak'}
        </Text>
      </View>
      <Text numberOfLines={3} style={styles.reason}>{record.reason}</Text>
      <Text style={styles.meta}>Sesi: {metadata?.sessionTitle ?? record.sessionId}</Text>
      <Text style={styles.meta}>Kelas: {metadata?.className ?? record.classId}</Text>
      <Text style={styles.meta}>Diajukan: {formatCreatedAt(record.createdAt)}</Text>
      <Text style={styles.meta}>AI: {leaveAiStatusLabels[record.ai.status]}</Text>
      {record.ai.status === 'succeeded' ? <Text style={styles.meta}>Kategori: {aiSummary}</Text> : null}
      {record.ai.status === 'failed' && record.ai.errorCode ? (
        <Text style={styles.meta}>Detail kegagalan: {record.ai.errorCode}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  identity: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  secondary: { color: colors.textMuted, fontSize: 14 },
  pending: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  approved: { color: colors.success },
  rejected: { color: colors.danger },
  reason: { color: colors.text, fontSize: 15, lineHeight: 21 },
  meta: { color: colors.textMuted, fontSize: 13 },
});
