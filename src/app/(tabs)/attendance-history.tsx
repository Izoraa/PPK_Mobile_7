import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useMemo } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AsyncState } from '@/components/common/AsyncState';
import { formatAttendanceTimestamp } from '@/features/attendance/format';
import {
  useAttendanceSessionMetadata,
  useMyAttendanceHistory,
} from '@/features/attendance/subscriptions';
import { useApp } from '@/state/AppContext';
import { spacing } from '@/theme';

const brand = {
  blue: '#0D21A1',
  yellow: '#EEC643',
  white: '#FFFFFF',
  ink: '#172033',
  muted: '#667085',
  border: '#E5EAF3',
  page: '#F5F7FC',
};

export default function AttendanceHistoryScreen() {
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_500Medium });
  const { currentUser } = useApp();
  const historyState = useMyAttendanceHistory(currentUser?.role === 'student');
  const sessionIds = useMemo(
    () => historyState.records.map((record) => record.sessionId),
    [historyState.records],
  );
  const sessionMetadata = useAttendanceSessionMetadata(sessionIds);

  if (currentUser?.role !== 'student') return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
            Riwayat presensi
          </Text>
          <Text style={[styles.description, fontsLoaded && styles.inter]}>
            Catatan kehadiran praktikum Anda.
          </Text>
        </View>

        <View style={styles.nameCard}>
          <View style={styles.nameMarker} />
          <Text style={[styles.studentName, fontsLoaded && styles.interMedium]} numberOfLines={1}>
            {currentUser.name}
          </Text>
        </View>

        <AsyncState
          status={historyState.status === 'ready' && historyState.records.length === 0 ? 'empty' : historyState.status}
          error={historyState.error}
          fromCache={historyState.fromCache}
          hasPendingWrites={historyState.hasPendingWrites}
          onRetry={historyState.retry}
          emptyTitle="Belum ada riwayat presensi"
          emptyMessage="Presensi yang sudah tercatat akan muncul di sini."
        >
          <FlatList
            data={historyState.records}
            keyExtractor={(attendance) => attendance.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const metadata = sessionMetadata[item.sessionId];
              const attendanceTime = formatAttendanceTimestamp(item.checkedInAt ?? item.createdAt ?? '');
              const className = metadata?.className ?? `Kelas ${item.classId}`;

              return (
                <View style={styles.attendanceCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeading}>
                      <Text style={[styles.cardTitle, fontsLoaded && styles.poppins]}>{className}</Text>
                      <Text style={[styles.cardSubtitle, fontsLoaded && styles.inter]}>
                        {metadata?.title ?? `Sesi ${item.sessionId}`}
                        {metadata?.room ? `  ·  Ruang ${metadata.room}` : ''}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={[styles.statusText, fontsLoaded && styles.interMedium]}>Hadir</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.timeRow}>
                    <View style={styles.timeMarker} />
                    <View style={styles.timeCopy}>
                      <Text style={[styles.timeLabel, fontsLoaded && styles.interMedium]}>Waktu presensi</Text>
                      <Text style={[styles.timeValue, fontsLoaded && styles.inter]}>{attendanceTime}</Text>
                    </View>
                  </View>

                </View>
              );
            }}
          />
        </AsyncState>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.page },
  content: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  heading: { gap: spacing.xs, paddingHorizontal: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { color: brand.blue, fontSize: 26, fontWeight: '600' },
  description: { color: brand.muted, fontSize: 14, lineHeight: 21 },
  nameCard: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: brand.blue },
  nameMarker: { width: 4, height: 25, borderRadius: 2, backgroundColor: brand.yellow },
  studentName: { flex: 1, color: brand.white, fontSize: 14, fontWeight: '600' },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  inter: { fontFamily: 'Inter_400Regular' },
  interMedium: { fontFamily: 'Inter_500Medium' },
  listContent: { paddingBottom: spacing.xl },
  separator: { height: spacing.md },
  attendanceCard: { gap: spacing.md, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: brand.border, backgroundColor: brand.white },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardHeading: { flex: 1, gap: spacing.xs },
  cardTitle: { color: brand.ink, fontSize: 16, fontWeight: '600' },
  cardSubtitle: { color: brand.muted, fontSize: 13, lineHeight: 19 },
  statusBadge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF7D8' },
  statusText: { color: brand.blue, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: brand.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeMarker: { width: 4, height: 34, borderRadius: 2, backgroundColor: brand.yellow },
  timeCopy: { flex: 1, gap: 3 },
  timeLabel: { color: brand.muted, fontSize: 12 },
  timeValue: { color: brand.ink, fontSize: 14 },
});
