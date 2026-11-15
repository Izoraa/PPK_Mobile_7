import { Redirect } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';

import { formatAttendanceTimestamp } from '@/features/attendance/format';
import {
  useAttendanceSessionMetadata,
  useMyAttendanceHistory,
} from '@/features/attendance/subscriptions';
import { AsyncState } from '@/components/common/AsyncState';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';

export default function AttendanceHistoryScreen() {
  const { currentUser } = useApp();
  const historyState = useMyAttendanceHistory(currentUser?.role === 'student');
  const sessionIds = useMemo(
    () => historyState.records.map((record) => record.sessionId),
    [historyState.records],
  );
  const sessionMetadata = useAttendanceSessionMetadata(sessionIds);

  if (currentUser?.role !== 'student') return <Redirect href="/" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.appName}>LabCheckIn</ThemedText>
        </View>
        <View style={styles.historyContent}>
          <View style={styles.historyHeader}>
            <ThemedText type="title" style={styles.pageTitle}>Riwayat Presensi</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              Riwayat kehadiran akun mahasiswa yang sedang login.
            </ThemedText>
            <ThemedText type="subtitle" style={styles.activeUser}>
              {currentUser.name}
            </ThemedText>
          </View>
          <AsyncState
            status={historyState.status === 'ready' && historyState.records.length === 0 ? 'empty' : historyState.status}
            error={historyState.error}
            fromCache={historyState.fromCache}
            hasPendingWrites={historyState.hasPendingWrites}
            onRetry={historyState.retry}
            emptyTitle="Belum ada riwayat presensi"
            emptyMessage="Belum ada presensi yang tercatat untuk akun ini."
          >
            <FlatList
              data={historyState.records}
              keyExtractor={(attendance) => attendance.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.attendanceCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeading}>
                      <ThemedText type="subtitle" style={styles.cardText}>
                        {sessionMetadata[item.sessionId]?.title ?? `Sesi ${item.sessionId}`}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.roomText}>
                        {sessionMetadata[item.sessionId]
                          ? `${sessionMetadata[item.sessionId]?.room} · Kelas ${item.classId}`
                          : `Kelas ${item.classId} · Detail sesi belum tersedia`}
                      </ThemedText>
                    </View>
                    <View style={styles.statusBadge}>
                      <ThemedText type="smallBold" style={styles.statusText}>Hadir</ThemedText>
                    </View>
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.dateTime}>
                    {formatAttendanceTimestamp(item.checkedInAt ?? item.createdAt ?? '')}
                  </ThemedText>
                  {sessionMetadata[item.sessionId]?.startsAt ? (
                    <ThemedText themeColor="textSecondary" style={styles.sessionTime}>
                      Jadwal: {formatAttendanceTimestamp(sessionMetadata[item.sessionId]?.startsAt ?? '')}
                    </ThemedText>
                  ) : null}
                </View>
              )}
            />
          </AsyncState>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  safeArea: { flex: 1 },
  historyContent: { flex: 1 },
  historyHeader: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  listContent: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#25D366',
  },
  appName: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 36 },
  pageTitle: { fontSize: 24, lineHeight: 32, marginBottom: spacing.xs },
  description: { marginTop: spacing.xs, marginBottom: spacing.md },
  activeUser: { marginBottom: spacing.xs },
  attendanceCard: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E7EAF2',
    gap: spacing.md,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardHeading: { flex: 1, gap: spacing.xs },
  cardText: { color: colors.text },
  roomText: { color: colors.textMuted, fontSize: 14 },
  sessionTime: { color: colors.textMuted, fontSize: 14 },
  statusBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#EDF8EE',
  },
  statusText: { color: '#3E9B45' },
  dateTime: { color: colors.textMuted, fontSize: 15 },
});
