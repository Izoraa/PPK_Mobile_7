import { Pressable, StyleSheet, Text, View } from 'react-native';

import { leaveAiStatusLabels, type LeaveReviewMetadata, type LeaveReviewRecord } from '../types';
import { colors, radius, spacing, shadows } from '@/theme';
import { StatusBadge } from '@/components/common/StatusBadge';

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
        <StatusBadge status={record.status} size="sm" />
      </View>

      <View style={styles.reasonBox}>
        <Text numberOfLines={3} style={styles.reason}>{record.reason}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaBadge}>{metadata?.sessionTitle ?? record.sessionId}</Text>
        <Text style={styles.meta}>• {formatCreatedAt(record.createdAt)}</Text>
      </View>

      {record.ai.status === 'succeeded' ? (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 AI: {aiSummary}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  secondary: { color: colors.textMuted, fontSize: 13 },
  reasonBox: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reason: { color: colors.text, fontSize: 14, lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  meta: { color: colors.textMuted, fontSize: 12 },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  aiBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
