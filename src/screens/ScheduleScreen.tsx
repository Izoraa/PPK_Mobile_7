import React, { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import SessionCard from '../components/session/SessionCard';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import { EMPTY_STATE_TEXT } from '../utils/messages';
import {
  subscribeClasses,
  subscribeSessions,
  type ClassDoc,
  type SessionDoc,
} from '@/features/practicum';

export default function ScheduleScreen() {
  const { currentUser, sessions: dummySessions } = useApp();
  const router = useRouter();

  const [liveSessions, setLiveSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubSessions: (() => void)[] = [];

    // Subscribe to user's classes (either assistant classes or student enrolled classes)
    const scope =
      currentUser.role === 'assistant'
        ? { assistantId: currentUser.id }
        : { studentId: currentUser.id };

    const unsubClasses = subscribeClasses(
      scope,
      (classList: ClassDoc[]) => {
        // Clean up previous session listeners
        unsubSessions.forEach((unsub) => unsub());
        unsubSessions = [];

        if (classList.length === 0) {
          setLiveSessions([]);
          setLoading(false);
          return;
        }

        const sessionMap = new Map<string, SessionDoc>();
        let completed = 0;

        classList.forEach((cls) => {
          const unsub = subscribeSessions(
            cls.id,
            (sessionsForClass) => {
              sessionsForClass.forEach((s) => {
                sessionMap.set(s.id, s);
              });
              setLiveSessions(Array.from(sessionMap.values()));
              completed++;
              if (completed >= classList.length) {
                setLoading(false);
              }
            },
            (err) => {
              console.error('Error listening to sessions for class:', cls.id, err);
              setLoading(false);
            }
          );
          unsubSessions.push(unsub);
        });
      },
      (err) => {
        console.error('Error listening to classes:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubClasses();
      unsubSessions.forEach((unsub) => unsub());
    };
  }, [currentUser]);

  if (!currentUser) return null;

  // Use live sessions if available, otherwise fallback to local AppContext dummy sessions
  const displaySessions = liveSessions.length > 0 ? liveSessions : dummySessions;

  const sortedSessions = [...displaySessions].sort((a: any, b: any) => {
    const aDate = a.startsAt?.toDate ? a.startsAt.toDate().getTime() : 0;
    const bDate = b.startsAt?.toDate ? b.startsAt.toDate().getTime() : 0;
    if (aDate && bDate) return aDate - bDate;
    if (a.date && b.date) {
      return a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || '');
    }
    return 0;
  });

  const detailPath =
    currentUser.role === 'assistant'
      ? '/(assistant)/assistant/sessions/[sessionId]'
      : '/(student)/sessions/[sessionId]';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={sortedSessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Jadwal praktikum</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Link href="../account" style={styles.accountLink}>Akun</Link>
            {currentUser.role === 'student' && (
              <Link href="/(student)/leaves/index" style={styles.accountLink}>Izin saya</Link>
            )}
            {currentUser.role === 'assistant' && (
              <TouchableOpacity
                style={styles.manageClassBtn}
                onPress={() => router.push('/(assistant)/classes' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.manageClassText}>Kelola Kelas & Peserta →</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item as any}
            onPress={() => {
              const target = detailPath.replace('[sessionId]', item.id);
              router.push(target as any);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Memuat jadwal praktikum...</Text>
            </View>
          ) : (
            <EmptyState
              title={EMPTY_STATE_TEXT.schedule.title}
              message={
                currentUser.role === 'assistant'
                  ? 'Belum ada sesi praktikum aktif. Gunakan menu "Kelola Kelas & Peserta" di atas untuk membuat kelas dan sesi.'
                  : EMPTY_STATE_TEXT.schedule.message
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  userName: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  accountLink: { color: colors.primary, fontSize: 16, paddingVertical: spacing.xs },
  manageClassBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  manageClassText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  separator: { height: spacing.sm },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
});
