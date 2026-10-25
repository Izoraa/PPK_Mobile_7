import { Redirect } from 'expo-router';
import { SafeAreaView, FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { colors, spacing } from '@/theme';
import { useApp } from '@/state/AppContext';
import { formatDate, formatTime } from '@/utils/format';

export default function AttendanceHistoryScreen() {
  const { currentUser, getAttendancesByStudent, getSession } = useApp();

  if (!currentUser) return <Redirect href="/" />;
  if (currentUser.role !== 'student') return <Redirect href="/attendance" />;

  const history = getAttendancesByStudent(currentUser.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.appName}>LabCheckIn</ThemedText>
        </View>
        <FlatList
          data={history}
          keyExtractor={(attendance) => attendance.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <ThemedText type="title" style={styles.pageTitle}>
                Riwayat Presensi
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Riwayat kehadiran praktikan aktif.
              </ThemedText>

              <ThemedText type="subtitle" style={styles.activeUser}>
                {currentUser.name}
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="Belum ada riwayat presensi"
              message="Belum ada catatan kehadiran untuk praktikan ini."
            />
          }
          renderItem={({ item }) => {
            const session = getSession(item.sessionId);

            return (
              <View style={styles.attendanceCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardHeading}>
                    <ThemedText type="subtitle" style={styles.cardText}>
                      {session?.course ?? 'Mata kuliah'}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.roomText}>
                      {session?.room ?? item.sessionId}
                    </ThemedText>
                  </View>
                  <View style={styles.statusBadge}>
                    <ThemedText type="smallBold" style={styles.statusText}>
                      Hadir
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.dateTime}>
                  {session ? formatDate(session.date) : 'Tanggal tidak tersedia'} · {formatTime(item.checkedInAt)}
                </ThemedText>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#25D366',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'left',
  },
  pageTitle: {
    color: '#000000',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  description: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  activeUser: {
    color: '#000000',
    marginBottom: spacing.xs,
  },
  attendanceCard: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E7EAF2',
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeading: {
    flex: 1,
    gap: spacing.xs,
  },
  cardText: {
    color: colors.text,
  },
  roomText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#EDF8EE',
  },
  statusText: {
    color: '#3E9B45',
  },
  dateTime: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
