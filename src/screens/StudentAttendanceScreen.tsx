import { Link, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StudentQrScanner } from '@/features/attendance/components/StudentQrScanner';
import { subscribeSession, type SessionDoc } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
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
      emptyTitle="Sesi tidak ditemukan"
      emptyMessage="Kembali ke jadwal untuk memilih sesi praktikum."
    >
      {session && (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.body}>{session.room}</Text>
          <Text style={styles.body}>
            {session.startsAt?.toDate?.().toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
          <StatusBadge status={session.status} />
          {session.isArchived ? (
            <Text style={styles.body}>Sesi sudah diarsipkan.</Text>
          ) : isFocused && session.status === 'open' && !metadata.fromCache && !metadata.hasPendingWrites ? (
            <StudentQrScanner />
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
            <Text style={styles.backLabel}>{id ? 'Kembali ke detail sesi' : 'Kembali ke jadwal'}</Text>
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
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  sessionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
