import { FlatList, StyleSheet, Text, View } from 'react-native';

import { formatAttendanceTimestamp } from '@/features/attendance/format';
import {
  useSessionAttendance,
  useSessionParticipationSummary,
} from '@/features/attendance/subscriptions';
import { useApp } from '../../state/AppContext';
import { colors, radius, spacing, shadows } from '../../theme';
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
      <Text style={styles.summaryTitle}>Ringkasan Kehadiran Sesi</Text>
      {summary.fromCache ? (
        <Text style={styles.summaryMessage}>Menampilkan data tersimpan; belum terverifikasi dari server.</Text>
      ) : null}
      {summary.hasPendingWrites ? (
        <Text style={styles.summaryMessage}>Perubahan sedang disinkronkan ke server…</Text>
      ) : null}
      {summary.status === 'loading' ? (
        <Text style={styles.summaryMessage}>Memuat ringkasan kehadiran…</Text>
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
          <View style={[styles.summaryTile, styles.tileHadir]}>
            <Text style={[styles.summaryNumber, styles.textHadir]}>{summary.records[0]?.attendanceCount ?? 0}</Text>
            <Text style={[styles.summaryLabel, styles.textHadir]}>Hadir</Text>
          </View>
          <View style={[styles.summaryTile, styles.tilePending]}>
            <Text style={[styles.summaryNumber, styles.textPending]}>{summary.records[0]?.pendingLeaveCount ?? 0}</Text>
            <Text style={[styles.summaryLabel, styles.textPending]}>Izin Menunggu</Text>
          </View>
          <View style={[styles.summaryTile, styles.tileApproved]}>
            <Text style={[styles.summaryNumber, styles.textApproved]}>{summary.records[0]?.approvedLeaveCount ?? 0}</Text>
            <Text style={[styles.summaryLabel, styles.textApproved]}>Izin Disetujui</Text>
          </View>
          <View style={[styles.summaryTile, styles.tileRejected]}>
            <Text style={[styles.summaryNumber, styles.textRejected]}>{summary.records[0]?.rejectedLeaveCount ?? 0}</Text>
            <Text style={[styles.summaryLabel, styles.textRejected]}>Izin Ditolak</Text>
          </View>
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>✓</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.name}>{item.studentName}</Text>
                {item.studentNumber ? (
                  <Text style={styles.studentNumber}>NIM {item.studentNumber}</Text>
                ) : null}
                <Text style={styles.time}>
                  Waktu: {formatAttendanceTimestamp(item.checkedInAt ?? item.createdAt ?? '')}
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✓</Text>
            </View>
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
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  summaryMessage: { color: colors.textMuted, fontSize: 13 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryTile: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  tileHadir: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  tilePending: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  tileApproved: { backgroundColor: colors.primaryLight, borderColor: '#C7D7FE' },
  tileRejected: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  summaryNumber: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  textHadir: { color: colors.successText },
  textPending: { color: colors.warningText },
  textApproved: { color: colors.primary },
  textRejected: { color: colors.dangerText },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  studentNumber: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  retryText: {
    alignSelf: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
