import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function ScheduleScreen() {
  // Stub for Maulana (SRS-02, SRS-04, SRS-05)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScheduleScreen Stub</Text>
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
