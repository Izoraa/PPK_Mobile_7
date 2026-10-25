import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import SessionCard from '../components/session/SessionCard';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import type { Session } from '../types';
import { EMPTY_STATE_TEXT } from '../utils/messages';

// Structural props accept either role's React Navigation stack without assuming
// a parameter-list export from the foundation navigator, which is not present yet.
export interface ScheduleScreenProps {
  navigation: {
    navigate: (screen: 'SessionDetail', params: { sessionId: string }) => void;
  };
}

export default function ScheduleScreen({ navigation }: ScheduleScreenProps) {
  const { currentUser, sessions, switchRole } = useApp();
  const visibleSessions = sessions
    .filter((session) => currentUser && (
      currentUser.role === 'student' || session.assistantId === currentUser.id
    ))
    .sort((first, second) =>
      first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime)
    );

  if (!currentUser) return null;

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
            <Pressable
              accessibilityRole="button"
              onPress={switchRole}
              style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
            >
              <Text style={styles.switchLabel}>Ganti peran</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={(sessionId) => navigation.navigate('SessionDetail', { sessionId })}
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
  switchButton: {
    alignSelf: 'flex-start',
    minHeight: spacing.xl + spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  switchLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  separator: { height: spacing.md },
  pressed: { opacity: 0.7 },
});
