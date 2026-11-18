import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { subscribeClasses, subscribeSessions, type SessionDoc } from '@/features/practicum';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';
import type { AppErrorCode } from '@/types';
import SessionCard from '../components/session/SessionCard';

type LoadStatus = 'loading' | 'ready' | 'error';
type DataMetadata = { fromCache: boolean; hasPendingWrites: boolean };

function safeError(error: Error): { code: AppErrorCode; retryable: boolean } {
  const code = 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return { code: 'FORBIDDEN', retryable: false };
  if (code === 'unauthenticated') return { code: 'UNAUTHENTICATED', retryable: false };
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return { code: 'NETWORK_ERROR', retryable: true };
  }
  return { code: 'SERVICE_UNAVAILABLE', retryable: true };
}

export default function ScheduleScreen() {
  const { currentUser } = useApp();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<{ code: AppErrorCode; retryable: boolean } | null>(null);
  const [metadata, setMetadata] = useState<DataMetadata>({ fromCache: false, hasPendingWrites: false });

  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      setStatus('ready');
      return;
    }

    let active = true;
    let failed = false;
    let unsubSessions: Array<() => void> = [];
    const sessionLists = new Map<string, SessionDoc[]>();
    const sessionMetadata = new Map<string, DataMetadata>();
    let classesMetadata: DataMetadata = { fromCache: false, hasPendingWrites: false };

    setStatus('loading');
    setError(null);

    const onFailure = (loadError: Error) => {
      if (!active || failed) return;
      failed = true;
      setError(safeError(loadError));
      setStatus('error');
    };

    const scope = currentUser.role === 'assistant'
      ? { assistantId: currentUser.id }
      : { studentId: currentUser.id };

    const unsubClasses = subscribeClasses(
      scope,
      (classList) => {
        if (!active) return;
        unsubSessions.forEach((unsubscribe) => unsubscribe());
        unsubSessions = [];
        sessionLists.clear();
        sessionMetadata.clear();
        setSessions([]);
        setStatus('loading');

        if (classList.length === 0) {
          setStatus('ready');
          return;
        }

        const loadedClassIds = new Set<string>();
        classList.forEach((practicumClass) => {
          const unsubscribe = subscribeSessions(
            practicumClass.id,
            (classSessions) => {
              if (!active || failed) return;
              sessionLists.set(practicumClass.id, classSessions);
              loadedClassIds.add(practicumClass.id);
              setSessions([...sessionLists.values()].flat());
              if (loadedClassIds.size === classList.length) setStatus('ready');
            },
            onFailure,
            (snapshotMetadata) => {
              if (!active || failed) return;
              sessionMetadata.set(practicumClass.id, snapshotMetadata);
              setMetadata({
                fromCache: classesMetadata.fromCache
                  || [...sessionMetadata.values()].some((item) => item.fromCache),
                hasPendingWrites: classesMetadata.hasPendingWrites
                  || [...sessionMetadata.values()].some((item) => item.hasPendingWrites),
              });
            },
          );
          unsubSessions.push(unsubscribe);
        });
      },
      onFailure,
      (snapshotMetadata) => {
        if (!active || failed) return;
        classesMetadata = snapshotMetadata;
        setMetadata({
          fromCache: snapshotMetadata.fromCache || [...sessionMetadata.values()].some((item) => item.fromCache),
          hasPendingWrites: snapshotMetadata.hasPendingWrites
            || [...sessionMetadata.values()].some((item) => item.hasPendingWrites),
        });
      },
    );

    return () => {
      active = false;
      unsubClasses();
      unsubSessions.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser, attempt]);

  if (!currentUser) return null;

  const sortedSessions = [...sessions].sort((first, second) => (
    first.startsAt.toMillis() - second.startsAt.toMillis()
  ));
  const detailPath = currentUser.role === 'assistant'
    ? '/(assistant)/assistant/sessions/[sessionId]'
    : '/(student)/sessions/[sessionId]';

  return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Jadwal praktikum
          </Text>

          <Text style={styles.userName}>{currentUser.name}</Text>

          <Link href="../account" style={styles.accountLink}>
            Akun
          </Link>

          {currentUser.role === 'student' ? (
            <Link href="/(student)/leaves" style={styles.accountLink}>
              Izin saya
            </Link>
          ) : null}

          {currentUser.role === 'assistant' ? (
            <Link href="/(assistant)/classes" style={styles.accountLink}>
              Kelola Kelas & Peserta →
            </Link>
          ) : null}
        </View>

        <AsyncState
          status={status === 'ready' && sessions.length === 0 ? 'empty' : status}
          error={error}
          fromCache={metadata.fromCache}
          hasPendingWrites={metadata.hasPendingWrites}
          onRetry={() => setAttempt((value) => value + 1)}
          emptyTitle="Belum ada sesi praktikum"
          emptyMessage={
            currentUser.role === 'assistant'
              ? 'Belum ada sesi praktikum aktif. Gunakan menu "Kelola Kelas & Peserta" di atas untuk membuat kelas dan sesi.'
              : 'Sesi praktikum dari kelas yang Anda ikuti akan muncul di sini.'
          }
        >
          <FlatList
            data={sortedSessions}
            keyExtractor={(session) => session.id}
            contentContainerStyle={styles.content}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <SessionCard
                session={item as never}
                onPress={() =>
                  router.push(detailPath.replace('[sessionId]', item.id) as never)
                }
              />
            )}
          />
        </AsyncState>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.sm, padding: spacing.md },
  content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  userName: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  accountLink: { color: colors.primary, fontSize: 16, paddingVertical: spacing.xs },
  separator: { height: spacing.sm },
});
