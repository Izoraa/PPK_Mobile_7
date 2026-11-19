import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';

import { AsyncState } from '@/components/common/AsyncState';
import { spacing } from '@/theme';

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

function decisionLabel(status: LeaveRequestRecord['status']): string {
  switch (status) {
    case 'pending': return 'Menunggu pemeriksaan';
    case 'approved': return 'Diterima';
    case 'rejected': return 'Ditolak';
  }
}

const brand = {
  blue: '#0D21A1',
  yellow: '#EEC643',
  white: '#FFFFFF',
  ink: '#172033',
  muted: '#667085',
  border: '#E4E9F2',
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
          Izin saya
        </Text>
        <Text style={[styles.subtitle, fontsLoaded && styles.inter]}>
          Lihat status pengajuan izin Anda.
        </Text>
      </View>

      <AsyncState
        status={displayStatus}
        error={state.error}
        fromCache={state.fromCache}
        hasPendingWrites={state.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle="Belum ada pengajuan izin"
        emptyMessage="Pengajuan izin yang Anda kirim akan muncul di sini."
      >
        <FlatList
          data={state.data}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({
                pathname: '/(student)/leaves/[sessionId]',
                params: { sessionId: item.sessionId },
              } as Href)}
              style={({ pressed }) => [
                styles.card,
                index % 2 === 0 ? styles.yellowCard : styles.blueCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardHeading}>
                  <Text style={[styles.cardTitle, fontsLoaded && styles.poppins]}>Pengajuan izin</Text>
                  <Text style={[styles.date, fontsLoaded && styles.inter]}>{formatTimestamp(item.createdAt)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  item.status === 'rejected' && styles.rejectedBadge,
                  item.status === 'approved' && styles.approvedBadge,
                  item.status === 'pending' && styles.pendingBadge,
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'rejected' && styles.rejected,
                    item.status === 'approved' && styles.approved,
                    item.status === 'pending' && styles.pending,
                    fontsLoaded && styles.interMedium,
                  ]}>{decisionLabel(item.status)}</Text>
                </View>
              </View>
              <View style={styles.reasonBox}>
                <Text style={[styles.reasonLabel, fontsLoaded && styles.interMedium]}>Alasan izin</Text>
                <Text style={[styles.reason, fontsLoaded && styles.inter]}>{item.reason}</Text>
              </View>
              {item.reviewNote ? (
                <View style={styles.noteBox}>
                  <Text style={[styles.noteLabel, fontsLoaded && styles.interMedium]}>Catatan pemeriksa</Text>
                  <Text numberOfLines={3} style={[styles.noteText, fontsLoaded && styles.inter]}>{item.reviewNote}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FC' },
  header: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { color: brand.blue, fontSize: 25, fontWeight: '600' },
  subtitle: { color: brand.muted, fontSize: 14, lineHeight: 20 },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  inter: { fontFamily: 'Inter_400Regular' },
  interMedium: { fontFamily: 'Inter_500Medium' },
  list: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  separator: { height: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: brand.border,
    borderRadius: 18,
    backgroundColor: brand.white,
    shadowColor: brand.blue,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  yellowCard: { borderLeftColor: brand.yellow },
  blueCard: { borderLeftColor: brand.blue },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  backButton: { padding: spacing.xs },
  backArrow: { color: brand.blue, fontSize: 28, lineHeight: 32 },
  cardHeading: { flex: 1, gap: spacing.xs },
  cardTitle: { color: brand.ink, fontSize: 16, fontWeight: '600' },
  date: { color: brand.muted, fontSize: 12, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  rejectedBadge: { backgroundColor: '#FEE4E2' },
  approvedBadge: { backgroundColor: '#E8F5E9' },
  pendingBadge: { backgroundColor: brand.yellow },
  statusText: { fontSize: 12, fontWeight: '600' },
  reasonBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DDFD',
    backgroundColor: '#F3F5FF',
  },
  reasonLabel: { color: brand.blue, fontSize: 12, fontWeight: '600' },
  reason: { color: brand.ink, fontSize: 14, lineHeight: 21 },
  noteBox: { gap: spacing.xs, paddingTop: spacing.xs },
  noteLabel: { color: brand.muted, fontSize: 12 },
  noteText: { color: brand.ink, fontSize: 13, lineHeight: 19 },
  rejected: { color: '#B42318' },
  approved: { color: '#188038' },
  pending: { color: '#946C00' },
  pressed: { opacity: 0.75 },
});


