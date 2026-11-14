import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { AsyncState } from '@/components/common/AsyncState';
import { colors, radius, spacing } from '@/theme';

import { AiSupportNotice } from '../components/AiSupportNotice';
import { subscribeMyLeave } from '../leaveSubscriptions';
import type { LeaveListenerError, LeaveRequestRecord } from '../types';

type ViewState = {
  status: 'loading' | 'ready' | 'error';
  data: LeaveRequestRecord | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
  error: LeaveListenerError | null;
};

const initialState: ViewState = {
  status: 'loading',
  data: null,
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
    case 'failed': return 'Klasifikasi AI belum tersedia. Asisten tetap dapat memeriksa.';
  }
}

function formatTimestamp(timestamp: LeaveRequestRecord['reviewedAt']): string | null {
  return timestamp
    ? timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
}

export default function LeaveDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ViewState>(initialState);

  useEffect(() => {
    setState(initialState);
    if (typeof sessionId !== 'string') {
      setState({ ...initialState, status: 'error', error: { code: 'NOT_FOUND', retryable: false } });
      return;
    }

    return subscribeMyLeave(
      sessionId,
      (snapshot) => setState({
        status: 'ready',
        data: snapshot.data,
        fromCache: snapshot.fromCache,
        hasPendingWrites: snapshot.hasPendingWrites,
        error: null,
      }),
      (error) => setState((previous) => ({ ...previous, status: 'error', error })),
    );
  }, [sessionId, attempt]);

  const displayStatus = state.status === 'ready' && state.data === null
    ? 'empty'
    : state.status;
  const request = state.data;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Link href="/(student)/leaves/index" asChild>
          <Pressable style={styles.backButton}>
            <Text style={styles.backText}>Kembali ke izin saya</Text>
          </Pressable>
        </Link>
        <Text accessibilityRole="header" style={styles.title}>Detail pengajuan izin</Text>
      </View>

      <AsyncState
        status={displayStatus}
        error={state.error}
        fromCache={state.fromCache}
        hasPendingWrites={state.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle="Pengajuan izin tidak ditemukan"
        emptyMessage="Data izin ini tidak tersedia di akun Anda."
      >
        {request ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sesi</Text>
              <Text style={styles.value}>{request.sessionId}</Text>
              <Text style={styles.sectionTitle}>Alasan izin</Text>
              <Text style={styles.value}>{request.reason}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Keputusan asisten</Text>
              <Text style={styles.value}>{decisionLabel(request.status)}</Text>
              {request.reviewNote ? (
                <>
                  <Text style={styles.sectionTitle}>Catatan pemeriksa</Text>
                  <Text style={styles.value}>{request.reviewNote}</Text>
                </>
              ) : null}
              {formatTimestamp(request.reviewedAt) ? (
                <Text style={styles.muted}>Diperiksa pada {formatTimestamp(request.reviewedAt)}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Klasifikasi AI</Text>
              <Text style={styles.value}>{aiLabel(request.ai.status)}</Text>
              {request.ai.status === 'succeeded' && request.ai.category ? (
                <Text style={styles.value}>Kategori: {request.ai.category}</Text>
              ) : null}
              <AiSupportNotice />
            </View>
          </ScrollView>
        ) : null}
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.sm, padding: spacing.md },
  content: { gap: spacing.md, padding: spacing.md, paddingTop: 0 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  sectionTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  value: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
