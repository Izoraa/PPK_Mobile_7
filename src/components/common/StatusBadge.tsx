import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import type { SessionStatus } from '../../types';

export interface StatusBadgeProps {
  status: SessionStatus;
}

const statusAppearance = {
  not_open: { label: 'Belum dibuka', color: colors.neutral },
  open: { label: 'Dibuka', color: colors.success },
  closed: { label: 'Ditutup', color: colors.danger },
} satisfies Record<SessionStatus, { label: string; color: string }>;

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = statusAppearance[status];

  return (
    <View accessible accessibilityLabel={`Status sesi: ${label}`} style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.sm },
  label: { color: colors.text, fontSize: 14, flexShrink: 1 },
});
