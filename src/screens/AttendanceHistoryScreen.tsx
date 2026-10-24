import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function AttendanceHistoryScreen() {
  // Stub for Hanif (SRS-16)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AttendanceHistoryScreen Stub</Text>
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
