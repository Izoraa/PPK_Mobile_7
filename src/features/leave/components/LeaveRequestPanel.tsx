import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AttendanceState } from '@/features/attendance/hooks';
import { colors, radius, spacing } from '@/theme';
import { getErrorMessage } from '@/utils/errors';

import { LeaveRequestForm } from './LeaveRequestForm';
import { submitLeave } from '../leaveService';

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionIsLive: boolean;
  attendanceState: AttendanceState;
};

function Notice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Pengajuan izin</Text>
      <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
      {retry ? (
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryLabel}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LeaveRequestPanel({
  sessionId,
  sessionTitle,
  sessionIsLive,
  attendanceState,
}: Props) {
  const { status, session, participation, error, retry } = attendanceState;

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Pengajuan izin</Text>
        <ActivityIndicator accessibilityLabel="Memeriksa kelayakan pengajuan izin" color={colors.primary} />
      </View>
    );
  }

  if (status === 'error' || error) {
    const message = error?.code === 'UNAUTHENTICATED'
      ? 'Sesi login tidak tersedia. Masuk kembali untuk mengajukan izin.'
      : error?.code === 'FORBIDDEN'
        ? 'Akun ini tidak memiliki akses ke sesi atau bukan anggota aktif kelas.'
        : 'Kelayakan pengajuan izin belum dapat dipastikan.';
    return <Notice message={message} retry={error?.retryable ? retry : undefined} />;
  }

  if (!session || !sessionIsLive) {
    return <Notice message="Data sesi belum terkonfirmasi dari server. Pengajuan izin belum dapat dilakukan." />;
  }

  if (session.isArchived) {
    return <Notice message="Sesi sudah diarsipkan. Pengajuan izin baru tidak dapat dibuat." />;
  }

  if (session.status === 'closed') {
    return <Notice message="Sesi sudah ditutup. Pengajuan izin tidak dapat dibuat." />;
  }

  if (participation?.kind === 'attendance') {
    return <Notice message="Presensi untuk sesi ini sudah tercatat. Kamu tidak dapat mengajukan izin." />;
  }

  if (participation?.kind === 'leave') {
    return <Notice message="Pengajuan izin untuk sesi ini sudah tercatat." />;
  }

  return (
    <LeaveRequestForm
      sessionTitle={sessionTitle}
      sessionStatus={session.status}
      isEligible
      onSubmit={(reason) => submitLeave({ sessionId, reason })}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginVertical: spacing.sm,
  },
  heading: { color: colors.text, fontSize: 16, fontWeight: '700' },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  retryButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
