import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { AsyncState } from '@/components/common/AsyncState';
import { getFirebaseFirestore } from '@/lib/firebase/client';
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

type SessionContext = { className: string; course: string; sessionTitle: string; startsAt: Date | null };
const emptyContext: SessionContext = {
  className: 'Informasi kelas tidak tersedia',
  course: 'Informasi praktikum tidak tersedia',
  sessionTitle: 'Informasi sesi tidak tersedia',
  startsAt: null,
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
  const [sessionContext, setSessionContext] = useState<SessionContext>(emptyContext);

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

  useEffect(() => {
    let active = true;
    const request = state.data;
    if (!request) return () => { active = false; };

    void Promise.all([
      getDoc(doc(getFirebaseFirestore(), 'sessions', request.sessionId)),
      getDoc(doc(getFirebaseFirestore(), 'classes', request.classId)),
    ]).then(([sessionSnapshot, classSnapshot]) => {
      if (!active) return;
      const session = sessionSnapshot.data();
      const course = classSnapshot.data();
      setSessionContext({
        className: typeof course?.name === 'string' ? course.name : emptyContext.className,
        course: typeof course?.course === 'string' ? course.course : emptyContext.course,
        sessionTitle: typeof session?.title === 'string' ? session.title : emptyContext.sessionTitle,
        startsAt: session?.startsAt && typeof session.startsAt.toDate === 'function'
          ? session.startsAt.toDate()
          : null,
      });
    }).catch(() => {
      if (active) setSessionContext(emptyContext);
    });

    return () => { active = false; };
  }, [state.data]);

  const displayStatus = state.status === 'ready' && state.data === null
    ? 'empty'
    : state.status;
  const request = state.data;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Link href="/(student)/leaves" asChild>
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
              <Text style={styles.sectionHeading}>Informasi praktikum</Text>
              <Text style={styles.sectionTitle}>Kelas</Text>
              <Text style={styles.value}>{sessionContext.className}</Text>
              <Text style={styles.sectionTitle}>Praktikum</Text>
              <Text style={styles.value}>{sessionContext.course}</Text>
              <Text style={styles.sectionTitle}>Sesi</Text>
              <Text style={styles.value}>{sessionContext.sessionTitle}</Text>
              <Text style={styles.sectionTitle}>Tanggal kelas</Text>
              <Text style={styles.value}>{sessionContext.startsAt?.toLocaleString('id-ID') ?? 'Tanggal tidak tersedia'}</Text>

              <View style={styles.divider} />

              <Text style={styles.sectionHeading}>Informasi izin</Text>
              <Text style={styles.sectionTitle}>Alasan izin</Text>
              <Text style={styles.value}>{request.reason}</Text>
              <Text style={styles.sectionTitle}>Keputusan asisten</Text>
              <Text style={styles.value}>{decisionLabel(request.status)}</Text>
              <Text style={styles.sectionTitle}>Catatan pemeriksa</Text>
              <Text style={styles.value}>{request.reviewNote || 'Belum ada catatan pemeriksa.'}</Text>
              {formatTimestamp(request.reviewedAt) ? (
                <Text style={styles.muted}>Diperiksa pada {formatTimestamp(request.reviewedAt)}</Text>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.sectionHeading}>Klasifikasi AI</Text>
              <Text style={styles.value}>{aiLabel(request.ai.status)}</Text>
              {request.ai.status === 'succeeded' && request.ai.category ? (
                <Text style={styles.value}>Kategori: {request.ai.category}</Text>
              ) : null}
              {request.ai.status !== 'succeeded' ? (
                <Text style={styles.muted}>Pengajuan tetap tersimpan; asisten dapat memeriksa meski klasifikasi AI belum tersedia.</Text>
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
  content: { padding: spacing.md, paddingTop: 0 },
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
  sectionHeading: { color: colors.text, fontSize: 17, fontWeight: '700' },
  divider: { height: 2, backgroundColor: '#2563EB', marginVertical: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  value: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
