import { Link, useRouter, type Href } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import SessionCard from '../components/session/SessionCard';
import { useApp } from '../state/AppContext';
import { colors, spacing } from '../theme';
import type { Session } from '../types';
import { EMPTY_STATE_TEXT } from '../utils/messages';

export default function ScheduleScreen() {
  const { currentUser, sessions } = useApp();
  const router = useRouter();
  const visibleSessions = sessions
    .filter((session) => currentUser && (
      currentUser.role === 'student' || session.assistantId === currentUser.id
    ))
    .sort((first, second) =>
      first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime)
    );

  if (!currentUser) return null;
  const detailPath = currentUser.role === 'assistant'
    ? '/(assistant)/assistant/sessions/[sessionId]'
    : '/(student)/sessions/[sessionId]';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <FlatList<Session>
        data={visibleSessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Jadwal praktikum</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Link href="../account" style={styles.accountLink}>Akun</Link>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push({ pathname: detailPath, params: { sessionId: item.id } } as Href)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState {...EMPTY_STATE_TEXT.schedule} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  userName: { color: colors.textMuted, fontSize: 16 },
  accountLink: { alignSelf: 'flex-start', color: colors.primary, fontSize: 16, paddingVertical: spacing.md },
  separator: { height: spacing.md },
});
