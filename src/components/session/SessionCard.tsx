import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Session } from '../../types';
import { colors, radius, spacing } from '../../theme';

export interface SessionCardProps {
  session: Session;
  onPress?: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  // Stub for Maulana (SRS-02, SRS-05)
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (onPress) {
          (onPress as any)(session.id);
        }
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.course}>{session.course}</Text>
      <Text style={styles.room}>{session.room}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  course: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  room: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default SessionCard;

