import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type SessionStatus = 'not_open' | 'open' | 'closed';

export interface StatusBadgeProps {
  status: SessionStatus;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; bg: string; text: string }> = {
  not_open: {
    label: 'Belum dibuka',
    bg: colors.neutral,
    text: '#FFFFFF',
  },
  open: {
    label: 'Dibuka',
    bg: colors.success,
    text: '#FFFFFF',
  },
  closed: {
    label: 'Ditutup',
    bg: colors.danger,
    text: '#FFFFFF',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: colors.neutral,
    text: '#FFFFFF',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
