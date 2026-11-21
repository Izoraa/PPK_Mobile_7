import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { colors, radius, spacing, shadows } from '@/theme';

import { subscribeMyLeaves } from '../leaveSubscriptions';
import type { LeaveListenerError, LeaveRequestRecord } from '../types';

type ViewState = {
  status: 'loading' | 'ready' | 'error';
  data: LeaveRequestRecord[];
  fromCache: boolean;
  hasPendingWrites: boolean;
  error: LeaveListenerError | null;
};

const initialState: ViewState = {
  status: 'loading',
  data: [],
  fromCache: false,
  hasPendingWrites: false,
  error: null,
};

function formatTimestamp(timestamp: LeaveRequestRecord['createdAt']): string {
  return timestamp
    ? timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Waktu pengajuan belum tersedia';
}

export default function MyLeavesScreen() {
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_500Medium });
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ViewState>(initialState);

  useEffect(() => {
    setState(initialState);
    return subscribeMyLeaves(
      (snapshot) => setState({
        status: 'ready',
        data: snapshot.data,
        fromCache: snapshot.fromCache,
        hasPendingWrites: snapshot.hasPendingWrites,
        error: null,
      }),
      (error) => setState((previous) => ({ ...previous, status: 'error', error })),
    );
  }, [attempt]);

  const displayStatus = state.status === 'ready' && state.data.length === 0
    ? 'empty'
    : state.status;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.titleContainer}>
          <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
            Izin Saya
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.headerInfo}>
        <Text style={[styles.subtitle, fontsLoaded && styles.inter]}>
          Pantau riwayat dan status persetujuan izin praktikum Anda
        </Text>
      </View>

      <AsyncState
        status={displayStatus}
        error={state.error}
        fromCache={state.fromCache}
        hasPendingWrites={state.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle="Belum Ada Pengajuan Izin"
        emptyMessage="Pengajuan izin yang Anda kirimkan akan muncul secara lengkap di sini."
      >
        <FlatList
          data={state.data}
          keyExtractor={(item, index) => `${item.sessionId}_${item.studentId}_${index}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({
                pathname: '/(student)/leaves/[sessionId]',
                params: { sessionId: item.sessionId },
              } as Href)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardHeading}>
                  <Text style={[styles.cardTitle, fontsLoaded && styles.poppins]}>Pengajuan Izin</Text>
                  <Text style={[styles.date, fontsLoaded && styles.inter]}>{formatTimestamp(item.createdAt)}</Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>

              <View style={styles.reasonBox}>
                <Text style={[styles.reasonLabel, fontsLoaded && styles.interMedium]}>Alasan Izin</Text>
                <Text style={[styles.reason, fontsLoaded && styles.inter]}>{item.reason}</Text>
              </View>

              {item.reviewNote ? (
                <View style={styles.noteBox}>
                  <Text style={[styles.noteLabel, fontsLoaded && styles.interMedium]}>Catatan Pemeriksa</Text>
                  <Text numberOfLines={3} style={[styles.noteText, fontsLoaded && styles.inter]}>{item.reviewNote}</Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.detailLink}>Lihat detail pengajuan →</Text>
              </View>
            </Pressable>
          )}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  topBarSpacer: { width: 44, height: 44 },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  headerInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  inter: { fontFamily: 'Inter_400Regular' },
  interMedium: { fontFamily: 'Inter_500Medium' },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  separator: { height: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeading: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  date: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  reasonBox: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.neutralBg,
  },
  reasonLabel: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  reason: { color: colors.text, fontSize: 14, lineHeight: 21 },
  noteBox: {
    gap: 4,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  noteLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  noteText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  cardFooter: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pressed: { opacity: 0.8 },
});
