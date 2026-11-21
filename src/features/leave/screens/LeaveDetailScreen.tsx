import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { doc, getDoc } from 'firebase/firestore';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { colors, radius, spacing, shadows } from '@/theme';

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

function aiLabel(status: LeaveRequestRecord['ai']['status']): string {
  switch (status) {
    case 'pending': return 'Menunggu klasifikasi AI';
    case 'processing': return 'Klasifikasi AI sedang diproses…';
    case 'succeeded': return 'Klasifikasi AI berhasil tersedia';
    case 'failed': return 'Klasifikasi AI belum tersedia. Asisten tetap dapat memeriksa.';
  }
}

function formatTimestamp(timestamp: LeaveRequestRecord['reviewedAt']): string | null {
  return timestamp
    ? timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
}

export default function LeaveDetailScreen() {
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold });
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
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke izin saya" style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </Link>
        <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>Detail Pengajuan Izin</Text>
        <View style={styles.headerSpacer} />
      </View>

      <AsyncState
        status={displayStatus}
        error={state.error}
        fromCache={state.fromCache}
        hasPendingWrites={state.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle="Pengajuan Izin Tidak Ditemukan"
        emptyMessage="Data izin ini tidak tersedia di akun Anda."
      >
        {request ? (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Status & Praktikum Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionHeading}>Sesi Praktikum</Text>
                <StatusBadge status={request.status} />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kelas:</Text>
                <Text style={styles.infoValue}>{sessionContext.className}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mata Praktikum:</Text>
                <Text style={styles.infoValue}>{sessionContext.course}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Judul Sesi:</Text>
                <Text style={styles.infoValue}>{sessionContext.sessionTitle}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Waktu Mulai:</Text>
                <Text style={styles.infoValue}>{sessionContext.startsAt?.toLocaleString('id-ID') ?? 'Tanggal tidak tersedia'}</Text>
              </View>
            </View>

            {/* Informasi Izin */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Alasan Izin</Text>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>

              {request.reviewNote ? (
                <View style={styles.reviewNoteBox}>
                  <Text style={styles.reviewNoteLabel}>Catatan Pemeriksa:</Text>
                  <Text style={styles.reviewNoteText}>{request.reviewNote}</Text>
                  {formatTimestamp(request.reviewedAt) ? (
                    <Text style={styles.muted}>Diperiksa pada {formatTimestamp(request.reviewedAt)}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Informasi AI */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Dukungan AI</Text>
              <View style={styles.aiStatusBadge}>
                <Text style={styles.aiStatusText}>{aiLabel(request.ai.status)}</Text>
              </View>
              {request.ai.status === 'succeeded' && request.ai.category ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kategori Terdeteksi:</Text>
                  <Text style={[styles.infoValue, styles.categoryText]}>{request.ai.category}</Text>
                </View>
              ) : null}
              {request.ai.status !== 'succeeded' ? (
                <Text style={styles.muted}>
                  Pengajuan tetap tersimpan dan asisten tetap dapat memeriksa permohonan izin ini.
                </Text>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.md, gap: spacing.md },
  title: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 24, fontWeight: '600' },
  headerSpacer: { width: 44, height: 44 },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionHeading: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  reasonBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  reviewNoteBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 4,
  },
  reviewNoteLabel: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  reviewNoteText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  aiStatusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  aiStatusText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  categoryText: { color: colors.primary, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
