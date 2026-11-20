import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';

import type { AttendanceState } from '@/features/attendance/hooks';
import { colors, radius, spacing } from '@/theme';
import { subscribeMyLeave } from '../leaveSubscriptions';
import type { LeaveRequestRecord } from '../types';
import { LeaveRequestForm } from './LeaveRequestForm';
import { submitLeave } from '../leaveService';

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionIsLive: boolean;
  attendanceState: AttendanceState;
};

const brand = {
  blue: '#0D21A1',
  yellow: '#EEC643',
  white: '#FFFFFF',
  ink: '#172033',
  muted: '#667085',
  border: '#E5EAF3',
  page: '#F5F7FC',
};

function decisionLabel(status: LeaveRequestRecord['status']): string {
  switch (status) {
    case 'pending': return 'Menunggu pemeriksaan';
    case 'approved': return 'Diterima';
    case 'rejected': return 'Ditolak';
  }
}

function formatTimestamp(timestamp: LeaveRequestRecord['createdAt']): string {
  return timestamp
    ? timestamp.toDate().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';
}

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

function ExistingLeaveCard({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_500Medium });
  const [leave, setLeave] = useState<LeaveRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeMyLeave(
      sessionId,
      (snapshot) => {
        setLeave(snapshot.data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Pengajuan izin</Text>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!leave) {
    return <Notice message="Pengajuan izin untuk sesi ini sudah tercatat." />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({
        pathname: '/(student)/leaves/[sessionId]',
        params: { sessionId: leave.sessionId },
      } as Href)}
      style={({ pressed }) => [
        styles.card,
        styles.yellowCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardHeading}>
          <Text style={[styles.cardTitle, fontsLoaded && styles.poppins]}>Pengajuan izin</Text>
          <Text style={[styles.date, fontsLoaded && styles.inter]}>{formatTimestamp(leave.createdAt)}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          leave.status === 'rejected' && styles.rejectedBadge,
          leave.status === 'approved' && styles.approvedBadge,
          leave.status === 'pending' && styles.pendingBadge,
        ]}>
          <Text style={[
            styles.statusText,
            leave.status === 'rejected' && styles.rejected,
            leave.status === 'approved' && styles.approved,
            leave.status === 'pending' && styles.pending,
            fontsLoaded && styles.interMedium,
          ]}>
            {decisionLabel(leave.status)}
          </Text>
        </View>
      </View>
      <View style={styles.reasonBox}>
        <Text style={[styles.reasonLabel, fontsLoaded && styles.interMedium]}>Alasan izin</Text>
        <Text style={[styles.reason, fontsLoaded && styles.inter]}>{leave.reason}</Text>
      </View>
      {leave.reviewNote ? (
        <View style={styles.noteBox}>
          <Text style={[styles.noteLabel, fontsLoaded && styles.interMedium]}>Catatan pemeriksa</Text>
          <Text numberOfLines={3} style={[styles.noteText, fontsLoaded && styles.inter]}>{leave.reviewNote}</Text>
        </View>
      ) : null}
    </Pressable>
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
    return <ExistingLeaveCard sessionId={sessionId} />;
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

  // Styling Card Pengajuan Izin
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: brand.border,
    borderRadius: 18,
    backgroundColor: brand.white,
    shadowColor: brand.blue,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginVertical: spacing.sm,
  },
  yellowCard: { borderLeftColor: brand.yellow },
  pressed: { opacity: 0.75 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeading: { flex: 1, gap: spacing.xs },
  cardTitle: { color: brand.ink, fontSize: 16, fontWeight: '600' },
  date: { color: brand.muted, fontSize: 12, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  rejectedBadge: { backgroundColor: '#FEE4E2' },
  approvedBadge: { backgroundColor: '#E8F5E9' },
  pendingBadge: { backgroundColor: brand.yellow },
  statusText: { fontSize: 12, fontWeight: '600' },
  reasonBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DDFD',
    backgroundColor: '#F3F5FF',
  },
  reasonLabel: { color: brand.blue, fontSize: 12, fontWeight: '600' },
  reason: { color: brand.ink, fontSize: 14, lineHeight: 21 },
  noteBox: { gap: spacing.xs, paddingTop: spacing.xs },
  noteLabel: { color: brand.muted, fontSize: 12 },
  noteText: { color: brand.ink, fontSize: 13, lineHeight: 19 },
  rejected: { color: '#B42318' },
  approved: { color: '#188038' },
  pending: { color: '#946C00' },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  inter: { fontFamily: 'Inter_400Regular' },
  interMedium: { fontFamily: 'Inter_500Medium' },
});
