import { useEffect, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AsyncState } from '@/components/common/AsyncState';
import { colors, radius, spacing } from '@/theme';

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

function aiLabel(status: LeaveRequestRecord['ai']['status']): string {
  switch (status) {
    case 'pending': return 'Menunggu klasifikasi AI';
    case 'processing': return 'Klasifikasi AI sedang diproses';
    case 'succeeded': return 'Klasifikasi AI tersedia';
    case 'failed': return 'Klasifikasi AI belum tersedia';
  }
}

function formatTimestamp(timestamp: LeaveRequestRecord['createdAt']): string {
  return timestamp
    ? timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Waktu pengajuan belum tersedia';
}

export default function MyLeavesScreen() {
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

        <Text accessibilityRole="header" style={styles.title}>
          Izin saya
        </Text>
        <Text style={styles.subtitle}>
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
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({
                pathname: '/(student)/leaves/[sessionId]',
                params: { sessionId: item.sessionId },
              } as Href)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>Pengajuan izin</Text>
                <Text style={styles.date}>{formatTimestamp(item.createdAt)}</Text>
              </View>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Alasan izin</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>
              <Text style={[
                styles.decision,
                item.status === 'rejected' && styles.rejected,
                item.status === 'approved' && styles.approved,
                item.status === 'pending' && styles.pending,
              ]}>
                Keputusan: {decisionLabel(item.status)}
              </Text>
              {item.reviewNote ? (
                <Text numberOfLines={2} style={styles.ai}>Catatan pemeriksa: {item.reviewNote}</Text>
              ) : null}
            </Pressable>
          )}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.xs, padding: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.md, paddingTop: 0 },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
  },
  backArrow: {
    color: '#2563EB',
    fontSize: 28,
    lineHeight: 32,
  },
  cardHeading: { gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  date: { color: colors.textMuted, fontSize: 13 },
  reasonBox: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  reasonLabel: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  reason: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  decision: { fontSize: 14, fontWeight: '700' },
  rejected: { color: colors.danger },
  approved: { color: colors.success },
  pending: { color: '#CA8A04' },
  ai: { color: colors.textMuted, fontSize: 13 },
  pressed: { opacity: 0.75 },
});


