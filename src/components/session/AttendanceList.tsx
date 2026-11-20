import { FlatList, StyleSheet, Text, View } from 'react-native';

import { formatAttendanceTimestamp } from '@/features/attendance/format';
import {
  useSessionAttendance,
  useSessionParticipationSummary,
} from '@/features/attendance/subscriptions';
import { useApp } from '../../state/AppContext';
import { colors, radius, spacing } from '../../theme';
import type { Attendance } from '../../types';
import { formatDate, formatTime } from '../../utils/format';
import { EmptyState } from '../common/EmptyState';

export interface AttendanceListProps {
  sessionId?: string;
  attendances?: Attendance[];
  emptyTitle?: string;
  emptyMessage?: string;
  hideSummary?: boolean;
  onlySummary?: boolean;
}

export function AttendanceList({
  sessionId,
  attendances,
  emptyTitle = 'Belum ada praktikan yang presensi',
  emptyMessage = 'Daftar kehadiran masih kosong untuk konteks ini.',
  hideSummary = false,
  onlySummary = false,
}: AttendanceListProps) {
  const { currentUser, getAttendancesBySession, getSession, getUserById } = useApp();
  const showSummary = currentUser?.role === 'assistant' && (onlySummary || !hideSummary);
  const remote = useSessionAttendance(attendances || onlySummary ? null : sessionId ?? null);
  const summary = useSessionParticipationSummary(
    sessionId ?? null,
    !attendances && showSummary,
  );

  const summaryCard = showSummary ? (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Ringkasan sesi</Text>
      {summary.fromCache ? (
        <Text style={styles.summaryMessage}>Menampilkan data tersimpan; belum terverifikasi dari server.</Text>
      ) : null}
      {summary.hasPendingWrites ? (
        <Text style={styles.summaryMessage}>Perubahan sedang disinkronkan.</Text>
      ) : null}
      {summary.status === 'loading' ? (
        <Text style={styles.summaryMessage}>Memuat ringkasan...</Text>
      ) : summary.status === 'error' ? (
        <View>
          <Text style={styles.summaryMessage}>Ringkasan sesi belum dapat dimuat.</Text>
          {summary.error?.retryable ? (
            <Text accessibilityRole="button" onPress={summary.retry} style={styles.retryText}>
              Coba lagi
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.summaryGrid}>
          <Text style={styles.summaryItem}>Hadir: {summary.records[0]?.attendanceCount ?? 0}</Text>
          <Text style={styles.summaryItem}>Izin pending: {summary.records[0]?.pendingLeaveCount ?? 0}</Text>
          <Text style={styles.summaryItem}>Izin disetujui: {summary.records[0]?.approvedLeaveCount ?? 0}</Text>
          <Text style={styles.summaryItem}>Izin ditolak: {summary.records[0]?.rejectedLeaveCount ?? 0}</Text>
        </View>
      )}
    </View>
  ) : null;

  if (onlySummary) return summaryCard;

  if (!attendances && sessionId && remote.status === 'loading') {
    return <EmptyState title="Memuat rekap presensi" message="Mengambil data kehadiran dari server." />;
  }

  if (!attendances && sessionId && remote.status === 'error') {
    return (
      <View style={styles.emptyList}>
        <EmptyState title="Rekap presensi gagal dimuat" message="Periksa koneksi atau hak akses sesi ini." />
        {remote.error?.retryable && (
          <Text accessibilityRole="button" onPress={remote.retry} style={styles.retryText}>
            Coba lagi
          </Text>
        )}
      </View>
    );
  }

  if (!attendances && sessionId) {
    return (
      <View style={styles.remoteContainer}>
        {summaryCard}
        {remote.fromCache ? (
          <Text style={styles.dataNotice}>Menampilkan daftar tersimpan; belum terverifikasi dari server.</Text>
        ) : null}
        {remote.hasPendingWrites ? <Text style={styles.dataNotice}>Perubahan sedang disinkronkan.</Text> : null}
        <FlatList
          data={remote.records}
          keyExtractor={(record, index) => `${record.id || record.studentId || index}_${index}`}
          contentContainerStyle={remote.records.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.textContainer}>
                <Text style={styles.name}>{item.studentName}</Text>
                {item.studentNumber && <Text style={styles.studentNumber}>NIM {item.studentNumber}</Text>}
                <Text style={styles.time}>
                  {formatAttendanceTimestamp(item.checkedInAt ?? item.createdAt ?? '')}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  const records = attendances ?? (sessionId ? getAttendancesBySession(sessionId) : []);

  return (
    <FlatList
      data={records}
      keyExtractor={(attendance, index) => `${attendance.id || attendance.studentId || index}_${index}`}
      contentContainerStyle={records.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      renderItem={({ item }) => {
        const student = getUserById(item.studentId);
        const session = getSession(item.sessionId);

        return (
          <View style={styles.row}>
            <View style={styles.textContainer}>
              <Text style={styles.name}>{student?.name ?? 'Praktikan tidak ditemukan'}</Text>
              {student?.studentNumber && (
                <Text style={styles.studentNumber}>NIM {student.studentNumber}</Text>
              )}
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
  remoteContainer: { flex: 1 },
  dataNotice: { paddingVertical: spacing.xs, color: colors.textMuted, fontSize: 13 },
  summary: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  summaryMessage: { color: colors.textMuted, fontSize: 14 },
  summaryGrid: { gap: spacing.xs },
  summaryItem: { color: colors.text, fontSize: 14 },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#E5E7EB',
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
  studentNumber: {
    color: colors.textMuted,
    fontSize: 14,
  },
  time: {
    color: colors.textMuted,
    fontSize: 14,
  },
  retryText: {
    alignSelf: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
