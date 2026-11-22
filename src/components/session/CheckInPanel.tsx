import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, shadows } from '../../theme';
import { formatTime } from '../../utils/format';
import {
  CHECK_IN_ERROR_MESSAGES,
  CHECK_IN_SUCCESS_MESSAGE,
} from '../../utils/messages';
import { ConfirmModal } from '../common/ConfirmModal';
import { getErrorMessage } from '../../utils/errors';
import { checkIn } from '../../features/attendance/service';
import type { AttendanceState } from '../../features/attendance/hooks';
import { useAttendanceState } from '../../features/attendance/hooks';

export interface CheckInPanelProps {
  sessionId: string;
  attendanceState?: AttendanceState;
}

export function CheckInPanel({ sessionId, attendanceState: sharedAttendanceState }: CheckInPanelProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryableError, setRetryableError] = useState(false);
  const localAttendanceState = useAttendanceState(sessionId, !sharedAttendanceState);
  const { status, session, participation, error, retry } = sharedAttendanceState ?? localAttendanceState;

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Presensi Kehadiran</Text>
        <ActivityIndicator accessibilityLabel="Memuat status presensi" color={colors.primary} />
      </View>
    );
  }

  if (status !== 'ready' || error) {
    const message = error?.code === 'UNAUTHENTICATED'
      ? 'Sesi login tidak tersedia. Masuk kembali untuk melakukan presensi.'
      : error?.code === 'FORBIDDEN'
        ? 'Akun ini tidak memiliki akses ke sesi atau belum terdaftar sebagai anggota kelas.'
        : 'Status presensi belum dapat dimuat. Periksa koneksi lalu coba lagi.';
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Presensi Kehadiran</Text>
        <Text style={styles.infoBannerText}>{message}</Text>
        {error?.retryable && (
          <Pressable onPress={retry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryButtonText}>Coba lagi</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Presensi Kehadiran</Text>
        <Text style={styles.infoBannerText}>Sesi praktikum tidak ditemukan.</Text>
      </View>
    );
  }

  const alreadyCheckedIn = participation?.kind === 'attendance';
  const rejectedLeave = participation?.kind === 'leave' && participation.status === 'rejected';
  const hasBlockingParticipation = participation !== null && !alreadyCheckedIn && !rejectedLeave;
  const isOpen = session.status === 'open';
  const isNotOpen = session.status === 'not_open';
  const isClosed = session.status === 'closed';

  const getInfoBanner = (): { message: string; color: string; bg: string; border: string } | null => {
    if (alreadyCheckedIn) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.ALREADY_CHECKED_IN,
        color: colors.successText,
        bg: colors.successBg,
        border: colors.successBorder,
      };
    }
    if (hasBlockingParticipation) {
      if (participation?.kind === 'leave' && participation.status === 'approved') {
        return {
          message: 'Pengajuan izin telah disetujui. Kehadiran tercatat sebagai izin.',
          color: colors.primary,
          bg: colors.primaryLight,
          border: '#C7D7FE',
        };
      }
      return {
        message: 'Pengajuan izin Anda masih menunggu pemeriksaan asisten.',
        color: colors.warningText,
        bg: colors.warningBg,
        border: colors.warningBorder,
      };
    }
    if (session.isArchived) {
      return {
        message: 'Sesi sudah diarsipkan. Presensi tidak dapat dilakukan.',
        color: colors.dangerText,
        bg: colors.dangerBg,
        border: colors.dangerBorder,
      };
    }
    if (isNotOpen) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.SESSION_NOT_OPEN,
        color: colors.neutralText,
        bg: colors.neutralBg,
        border: colors.border,
      };
    }
    if (isClosed) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.SESSION_CLOSED,
        color: colors.dangerText,
        bg: colors.dangerBg,
        border: colors.dangerBorder,
      };
    }
    return null;
  };

  const handleCheckIn = async () => {
    if (!isOpen || alreadyCheckedIn || hasBlockingParticipation || isSubmitting) return;
    setIsSubmitting(true);
    setRetryableError(false);

    try {
      const result = await checkIn(sessionId);

      if (result.ok) {
        setModalTitle('Presensi Berhasil');
        setModalMessage(CHECK_IN_SUCCESS_MESSAGE(formatTime(result.data.checkedInAt)));
        setModalVisible(true);
      } else {
        if (alreadyCheckedIn || participation?.kind === 'attendance') {
          setModalTitle('Presensi Berhasil');
          setModalMessage('Presensi kamu sudah berhasil tercatat.');
          setModalVisible(true);
        } else {
          const message = result.error.code === 'CONFLICT'
            ? 'Presensi atau pengajuan untuk sesi ini sudah tercatat.'
            : result.error.code === 'FORBIDDEN'
              ? 'Kamu belum terdaftar sebagai anggota aktif kelas ini.'
              : result.error.code === 'UNAUTHENTICATED'
                ? 'Sesi login sudah berakhir. Masuk kembali untuk melanjutkan.'
                : session.status === 'closed'
                  ? CHECK_IN_ERROR_MESSAGES.SESSION_CLOSED
                  : session.status === 'not_open'
                    ? CHECK_IN_ERROR_MESSAGES.SESSION_NOT_OPEN
                    : 'Status presensi belum dapat dipastikan. Periksa koneksi, lalu muat ulang status sebelum mencoba lagi.';
          setModalTitle('Presensi Gagal');
          setModalMessage(message);
          setRetryableError(result.error.retryable);
          setModalVisible(true);
        }
      }
    } catch {
      setModalTitle('Presensi Gagal');
      setModalMessage('Terjadi kesalahan. Silakan coba lagi.');
      setRetryableError(true);
      setModalVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const banner = getInfoBanner();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Presensi Kehadiran</Text>

      {banner ? (
        <View style={[styles.infoBanner, { backgroundColor: banner.bg, borderColor: banner.border }]}>
          <Text style={[styles.infoBannerText, { color: banner.color }]}>{banner.message}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.checkInButton,
          (!isOpen || alreadyCheckedIn || hasBlockingParticipation || isSubmitting) && styles.checkInButtonDisabled,
        ]}
        onPress={handleCheckIn}
        disabled={!isOpen || alreadyCheckedIn || hasBlockingParticipation || isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text
            style={[
              styles.checkInButtonText,
              (!isOpen || alreadyCheckedIn || hasBlockingParticipation) && styles.checkInButtonTextDisabled,
            ]}
          >
            {alreadyCheckedIn
              ? 'Sudah Presensi'
              : hasBlockingParticipation
                ? 'Izin Diajukan'
                : 'Presensi Mandiri'}
          </Text>
        )}
      </TouchableOpacity>

      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmLabel={retryableError ? 'Coba Lagi' : 'OK'}
        cancelLabel={retryableError ? 'Tutup' : undefined}
        onConfirm={() => {
          setModalVisible(false);
          if (retryableError) handleCheckIn();
        }}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  checkInButton: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  checkInButtonDisabled: {
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  checkInButtonTextDisabled: {
    color: colors.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CheckInPanel;
