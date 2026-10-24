import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function AttendanceEmptyState() {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Belum ada presensi
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        Belum ada praktikan yang tercatat hadir pada sesi ini.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
