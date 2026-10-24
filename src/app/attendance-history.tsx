import { SafeAreaView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  CURRENT_PRAKTIKAN,
  DUMMY_ATTENDANCE_RECORDS,
  getAttendanceHistoryForPraktikan,
} from '@/features/attendance/data';
import { AttendanceList } from '@/features/attendance/components/AttendanceList';

export default function AttendanceHistoryScreen() {
  const history = getAttendanceHistoryForPraktikan(
    DUMMY_ATTENDANCE_RECORDS,
    CURRENT_PRAKTIKAN.id,
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Riwayat Presensi
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.identity}>
          Praktikan aktif: {CURRENT_PRAKTIKAN.name} ({CURRENT_PRAKTIKAN.id})
        </ThemedText>
        <ThemedView style={styles.listContainer}>
          <AttendanceList records={history} />
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
  identity: {
    marginBottom: Spacing.one,
  },
  listContainer: {
    flex: 1,
  },
});
