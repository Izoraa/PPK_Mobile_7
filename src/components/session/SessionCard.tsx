import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { StatusBadge, type SessionStatus } from '@/components/common/StatusBadge';

export interface SessionCardProps {
  session: {
    id: string;
    course?: string;
    title?: string;
    room: string;
    status: SessionStatus;
    date?: string;
    startTime?: string;
    endTime?: string;
    startsAt?: any;
    endsAt?: any;
  };
  onPress?: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const displayTitle = session.title || session.course || 'Sesi Praktikum';

  let timeDisplay = '';
  if (session.date && session.startTime && session.endTime) {
    timeDisplay = `${session.date} • ${session.startTime} - ${session.endTime}`;
  } else if (session.startsAt?.toDate) {
    const s = session.startsAt.toDate();
    timeDisplay = s.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
        <StatusBadge status={session.status} />
      </View>
      <Text style={styles.room}>Ruang: {session.room}</Text>
      {timeDisplay ? <Text style={styles.time}>{timeDisplay}</Text> : null}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  room: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
});

export default SessionCard;
