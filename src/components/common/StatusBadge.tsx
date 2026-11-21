import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type SessionStatus = 'not_open' | 'open' | 'closed';

export interface StatusBadgeProps {
  status: SessionStatus | string;
  size?: 'sm' | 'md';
}

interface StatusStyleConfig {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const STATUS_CONFIG: Record<string, StatusStyleConfig> = {
  not_open: {
    label: 'Belum dibuka',
    bg: colors.neutralBg,
    border: colors.neutralBorder,
    text: colors.neutralText,
    dot: colors.neutral,
  },
  open: {
    label: 'Dibuka',
    bg: colors.successBg,
    border: colors.successBorder,
    text: colors.successText,
    dot: colors.success,
  },
  closed: {
    label: 'Ditutup',
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    text: colors.dangerText,
    dot: colors.danger,
  },
  pending: {
    label: 'Menunggu',
    bg: colors.warningBg,
    border: colors.warningBorder,
    text: colors.warningText,
    dot: colors.warning,
  },
  approved: {
    label: 'Disetujui',
    bg: colors.successBg,
    border: colors.successBorder,
    text: colors.successText,
    dot: colors.success,
  },
  rejected: {
    label: 'Ditolak',
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    text: colors.dangerText,
    dot: colors.danger,
  },
  present: {
    label: 'Hadir',
    bg: colors.successBg,
    border: colors.successBorder,
    text: colors.successText,
    dot: colors.success,
  },
  late: {
    label: 'Terlambat',
    bg: colors.warningBg,
    border: colors.warningBorder,
    text: colors.warningText,
    dot: colors.warning,
  },
  leave: {
    label: 'Izin',
    bg: colors.primaryLight,
    border: '#C7D7FE',
    text: colors.primary,
    dot: colors.primary,
  },
  alpha: {
    label: 'Alpha',
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    text: colors.dangerText,
    dot: colors.danger,
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: colors.neutralBg,
    border: colors.neutralBorder,
    text: colors.neutralText,
    dot: colors.neutral,
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSm,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View style={[styles.dot, isSmall && styles.dotSm, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, isSmall && styles.textSm, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});

export default StatusBadge;
