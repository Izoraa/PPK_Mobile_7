import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export interface AttendanceListProps {
  sessionId: string;
}

export function AttendanceList({ sessionId }: AttendanceListProps) {
  // Stub for Hanif (SRS-15, SRS-17)
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AttendanceList stub (Session ID: {sessionId})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
