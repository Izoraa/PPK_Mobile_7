import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';
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
      activeOpacity={0.75}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
        <StatusBadge status={session.status} size="sm" />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.roomBadge}>Ruang {session.room}</Text>
        {timeDisplay ? <Text style={styles.timeText}>• {timeDisplay}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
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
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  roomBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  timeText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default SessionCard;
