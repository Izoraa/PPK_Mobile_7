import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import type { Session } from '../../types';
import { formatDate } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';

export interface SessionCardProps {
  session: Session;
  onPress: (sessionId: string) => void;
}

export default function SessionCard({ session, onPress }: SessionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Membuka detail sesi praktikum"
      onPress={() => onPress(session.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.course}>{session.course}</Text>
      <Text style={styles.room}>{session.room}</Text>
      <Text style={styles.date}>{formatDate(session.date)}</Text>
      <Text style={styles.time}>{session.startTime} – {session.endTime}</Text>
      <StatusBadge status={session.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: spacing.xl + spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  pressed: { borderColor: colors.primary, backgroundColor: colors.background },
  course: { color: colors.text, fontSize: 18, fontWeight: '700' },
  room: { color: colors.text, fontSize: 16 },
  date: { color: colors.textMuted, fontSize: 14 },
  time: { color: colors.text, fontSize: 16, fontWeight: '500' },
});
