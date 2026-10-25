import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import AttendanceList from '../components/session/AttendanceList';
import CheckInPanel from '../components/session/CheckInPanel';
import SessionControl from '../components/session/SessionControl';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';

export interface SessionDetailScreenProps {
  route: { params: { sessionId: string } };
  navigation: {
    canGoBack: () => boolean;
    goBack: () => void;
    navigate: (screen: 'Schedule') => void;
  };
}

export default function SessionDetailScreen({ route, navigation }: SessionDetailScreenProps) {
  const { currentUser, getSession, switchRole } = useApp();
  // Resolve on every Context render so session controls update these details.
  const sessionId = route?.params?.sessionId;
  const session = typeof sessionId === 'string' ? getSession(sessionId) : undefined;

  function returnToSchedule() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Schedule');
  }

  if (!currentUser) return null;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={returnToSchedule}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Kembali ke jadwal</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={switchRole}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Ganti peran</Text>
          </Pressable>
        </View>
        {!session ? (
          <EmptyState title="Sesi tidak ditemukan" message="Silakan kembali ke jadwal untuk memilih sesi yang tersedia." />
        ) : (
          <>
            <View style={styles.details}>
              <Text accessibilityRole="header" style={styles.title}>{session.course}</Text>
              <Text style={styles.label}>Laboratorium / ruang kelas</Text>
              <Text style={styles.value}>{session.room}</Text>
              <Text style={styles.label}>Tanggal</Text>
              <Text style={styles.value}>{formatDate(session.date)}</Text>
              <View style={styles.times}>
                <View style={styles.time}>
                  <Text style={styles.label}>Waktu mulai</Text>
                  <Text style={styles.value}>{session.startTime}</Text>
                </View>
                <View style={styles.time}>
                  <Text style={styles.label}>Waktu selesai</Text>
                  <Text style={styles.value}>{session.endTime}</Text>
                </View>
              </View>
              <Text style={styles.label}>Status sesi</Text>
              <StatusBadge status={session.status} />
            </View>
            {currentUser.role === 'assistant' && (
              <>
                <SessionControl sessionId={session.id} />
                <AttendanceList sessionId={session.id} />
              </>
            )}
            {currentUser.role === 'student' && <CheckInPanel sessionId={session.id} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: {
    minHeight: spacing.xl + spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  details: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: colors.text, fontSize: 16 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  time: { gap: spacing.sm },
});
