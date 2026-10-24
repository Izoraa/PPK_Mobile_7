import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export interface CheckInPanelProps {
  sessionId: string;
}

export function CheckInPanel({ sessionId }: CheckInPanelProps) {
  // Stub for Hasta (SRS-10 to SRS-14)
  return (
    <View style={styles.container}>
      <Text style={styles.text}>CheckInPanel stub (Session ID: {sessionId})</Text>
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
