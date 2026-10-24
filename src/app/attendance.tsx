import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  DUMMY_ATTENDANCE_RECORDS,
} from '@/features/attendance/data';
import { AttendanceList } from '@/features/attendance/components/AttendanceList';

export default function AttendanceScreen() {
  const [records, setRecords] = useState(DUMMY_ATTENDANCE_RECORDS);
  const hasRecords = records.length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Daftar Presensi
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Daftar praktikan yang sudah melakukan presensi pada sesi ini.
        </ThemedText>

        <Pressable
          accessibilityLabel={hasRecords ? 'Simulasikan data presensi kosong' : 'Tampilkan data presensi dummy'}
          accessibilityRole="button"
          onPress={() => setRecords(hasRecords ? [] : DUMMY_ATTENDANCE_RECORDS)}
          style={({ pressed }) => [styles.demoButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold">
            {hasRecords ? 'Simulasikan data kosong' : 'Tampilkan data dummy'}
          </ThemedText>
        </Pressable>

        <ThemedView style={styles.listContainer}>
          <AttendanceList records={records} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  description: {
    marginBottom: Spacing.one,
  },
  demoButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#DDEBFF',
  },
  pressed: {
    opacity: 0.7,
  },
  listContainer: {
    flex: 1,
  },
});
