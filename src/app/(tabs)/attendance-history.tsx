import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { TabBarDivider } from '@/components/TabBarDivider';
import { formatAttendanceTimestamp } from '@/features/attendance/format';
import {
  useAttendanceClassNames,
  useAttendanceSessionMetadata,
  useMyAttendanceHistory,
} from '@/features/attendance/subscriptions';
import { subscribeClasses, type ClassDoc } from '@/features/practicum';
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
  const [studentClasses, setStudentClasses] = useState<ClassDoc[]>([]);
  const historyState = useMyAttendanceHistory(currentUser?.role === 'student');
  const sessionIds = useMemo(
    () => historyState.records.map((record) => record.sessionId),
    [historyState.records],
  );
  const classIds = useMemo(
    () => historyState.records.map((record) => record.classId).filter(Boolean),
    [historyState.records],
  );
  const sessionMetadata = useAttendanceSessionMetadata(sessionIds);
  const directClassNames = useAttendanceClassNames(classIds);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return;
    const unsubscribe = subscribeClasses({ studentId: currentUser.id, includeArchived: true }, (classes) => {
      setStudentClasses(classes);
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const classMap = useMemo(() => {
    return new Map<string, ClassDoc>(studentClasses.map((c) => [c.id, c]));
  }, [studentClasses]);

  if (currentUser?.role !== 'student') return <Redirect href="/" />;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.topBar}>
        <Text accessibilityRole="header" style={[styles.topBarTitle, fontsLoaded && styles.poppins]}>
          Riwayat presensi
        </Text>
      </View>
      <View style={styles.content}>
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
              const matchedClass = classMap.get(item.classId);
              const className =
                matchedClass?.name ||
                matchedClass?.course ||
                directClassNames[item.classId] ||
                metadata?.className ||
                (studentClasses.length === 1 ? studentClasses[0]?.name : null) ||
                'Kelas Praktikum';

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
      <TabBarDivider />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.white },
  topBar: { height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.white, borderBottomWidth: 1, borderBottomColor: '#E6EAF2' },
  topBarTitle: { textAlign: 'center', color: brand.blue, fontSize: 18, fontWeight: '600' },
  content: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, backgroundColor: brand.page },
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
  statusBadge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#16A34A' },
  statusText: { color: brand.white, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: brand.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeMarker: { width: 4, height: 34, borderRadius: 2, backgroundColor: brand.yellow },
  timeCopy: { flex: 1, gap: 3 },
  timeLabel: { color: brand.muted, fontSize: 12 },
  timeValue: { color: brand.ink, fontSize: 14 },
});
