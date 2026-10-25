import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionStatus } from '../../types';
import { colors, radius, spacing } from '../../theme';

export interface StatusBadgeProps {
  status: SessionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Stub for Maulana (SRS-02)
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
});
