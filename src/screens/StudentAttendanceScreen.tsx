import { Link, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StudentQrScanner } from '@/features/attendance/components/StudentQrScanner';
import { formatAttendanceTimestamp } from '@/features/attendance/format';
import { useMyConfirmedSessionAttendance } from '@/features/attendance/subscriptions';
import { subscribeSession, type SessionDoc } from '@/features/practicum';
import { colors, radius, spacing, shadows } from '@/theme';
import type { AppErrorCode } from '@/types';

type LoadError = { code: AppErrorCode; retryable: boolean };

function mapSessionError(error: Error): LoadError {
  const code = 'code' in error ? error.code : null;
  switch (code) {
    case 'permission-denied':
      return { code: 'FORBIDDEN', retryable: false };
    case 'unauthenticated':
      return { code: 'UNAUTHENTICATED', retryable: false };
    case 'deadline-exceeded':
    case 'unavailable':
      return { code: 'NETWORK_ERROR', retryable: true };
    default:
      return { code: 'SERVICE_UNAVAILABLE', retryable: true };
  }
}

function StudentAttendanceSession({ sessionId }: { sessionId: string }) {
  const isFocused = useIsFocused();
  const attendance = useMyConfirmedSessionAttendance(sessionId);
  const [apiCheckedInAt, setApiCheckedInAt] = useState<string | null>(null);
  const checkedInAt = (attendance.status === 'ready' ? attendance.checkedInAt : null) ?? apiCheckedInAt;
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<LoadError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [metadata, setMetadata] = useState({ fromCache: false, hasPendingWrites: false });

  useEffect(() => subscribeSession(
    sessionId,
    (value) => {
      setSession(value);
      setStatus('ready');
      setError(null);
    },
    (listenerError) => {
      setError(mapSessionError(listenerError));
      setStatus('error');
    },
    setMetadata,
  ), [sessionId, attempt]);

  return (
    <AsyncState
      status={status === 'ready' && !session ? 'empty' : status}
      error={error}
      fromCache={metadata.fromCache}
      hasPendingWrites={metadata.hasPendingWrites}
      onRetry={() => {
        setStatus('loading');
        setAttempt((value) => value + 1);
      }}
      emptyTitle="Sesi Tidak Ditemukan"
      emptyMessage="Kembali ke jadwal untuk memilih sesi praktikum yang tersedia."
    >
      {session && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.sessionTitle}>{session.title}</Text>
            <StatusBadge status={session.status} size="sm" />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.roomBadge}>Ruang {session.room}</Text>
            <Text style={styles.metaBullet}>•</Text>
            <Text style={styles.metaText}>
              {session.startsAt?.toDate?.().toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </View>

          {checkedInAt && (
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedIcon}>✅</Text>
              <Text accessibilityLiveRegion="polite" style={styles.attendanceStatus}>
                Presensi Anda berhasil tercatat pada {formatAttendanceTimestamp(checkedInAt)}.
              </Text>
            </View>
          )}

          {!checkedInAt && attendance.status === 'unconfirmed' && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>⏳ Status presensi menunggu konfirmasi server.</Text>
            </View>
          )}

          {!checkedInAt && attendance.status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ Status presensi belum dapat diperiksa dari server.</Text>
            </View>
          )}

          {session.isArchived ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>Sesi praktikum ini sudah diarsipkan.</Text>
            </View>
          ) : isFocused && !checkedInAt && session.status === 'open' && !metadata.fromCache && !metadata.hasPendingWrites ? (
            <View style={styles.scannerContainer}>
              <StudentQrScanner sessionId={session.id} onConfirmed={setApiCheckedInAt} />
            </View>
          ) : null}
        </View>
      )}
    </AsyncState>
  );
}

export default function StudentAttendanceScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const id = typeof sessionId === 'string' && sessionId && !sessionId.includes('/') ? sessionId : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link
          href={id ? { pathname: '/(student)/sessions/[sessionId]', params: { sessionId: id } } : '/'}
          dismissTo
          asChild
        >
          <Pressable accessibilityRole="button" style={styles.backButton}>
            <Text style={styles.backLabel}>← {id ? 'Kembali ke detail sesi' : 'Kembali ke jadwal'}</Text>
          </Pressable>
        </Link>
        <Text accessibilityRole="header" style={styles.title}>Presensi Praktikum</Text>
        {id ? (
          <StudentAttendanceSession key={id} sessionId={id} />
        ) : (
          <AsyncState status="empty" emptyTitle="Sesi tidak ditemukan" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  backLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  roomBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  metaBullet: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    marginTop: spacing.xs,
  },
  confirmedIcon: {
    fontSize: 20,
  },
  attendanceStatus: {
    color: colors.successText,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  noticeBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    color: colors.neutralText,
    fontSize: 13,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '500',
  },
  scannerContainer: {
    marginTop: spacing.sm,
  },
});
