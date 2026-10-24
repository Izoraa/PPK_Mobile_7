import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../../state/AppContext';
import type { Attendance } from '../../types';
import { formatDate, formatTime } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';
import { EmptyState } from '../common/EmptyState';

export interface AttendanceListProps {
  sessionId?: string;
  attendances?: Attendance[];
  emptyTitle?: string;
  emptyMessage?: string;
}

export function AttendanceList({
  sessionId,
  attendances,
  emptyTitle = 'Belum ada praktikan yang presensi',
  emptyMessage = 'Daftar kehadiran masih kosong untuk konteks ini.',
}: AttendanceListProps) {
  const { getAttendancesBySession, getSession, getUserById } = useApp();
  const records = attendances ?? (sessionId ? getAttendancesBySession(sessionId) : []);

  return (
    <FlatList
      data={records}
      keyExtractor={(attendance) => attendance.id}
      contentContainerStyle={records.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      renderItem={({ item }) => {
        const student = getUserById(item.studentId);
        const session = getSession(item.sessionId);

        return (
          <View style={styles.row}>
            <View style={styles.textContainer}>
              <Text style={styles.name}>{student?.name ?? 'Praktikan tidak ditemukan'}</Text>
              <Text style={styles.time}>
                {session ? `${session.course} · ` : ''}
                {session ? `${formatDate(session.date)} · ` : ''}
                {formatTime(item.checkedInAt)}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textContainer: {
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
