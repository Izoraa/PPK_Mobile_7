import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function SessionDetailScreen() {
  // Stub for Maulana (SRS-03, SRS-05)
  // This screen will mount SessionControl (Jordan), AttendanceList (Hanif), CheckInPanel (Hasta)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SessionDetailScreen Stub</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});
