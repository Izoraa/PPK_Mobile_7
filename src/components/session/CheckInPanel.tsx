import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { formatTime } from '../../utils/format';
import {
  CHECK_IN_ERROR_MESSAGES,
  CHECK_IN_SUCCESS_MESSAGE,
} from '../../utils/messages';
import { ConfirmModal } from '../common/ConfirmModal';
import { checkIn } from '../../features/attendance/service';
import { useAttendanceState } from '../../features/attendance/hooks';

export interface CheckInPanelProps {
  sessionId: string;
}

/**
 * CheckInPanel – Hasta (SRS-10 to SRS-14)
 *
 * Displays a check-in interface for students on the SessionDetail screen.
 * - SRS-10: Check-in button active only when session status is 'open'.
 * - SRS-11: Records check-in time via checkIn() from useApp().
 * - SRS-12: Prevents duplicate check-in using hasCheckedIn().
 * - SRS-13: Shows success/failure feedback via a modal (ConfirmModal).
 * - SRS-14: Shows contextual info when session is not_open, closed,
 *           or the student has already checked in.
 */
export function CheckInPanel({ sessionId }: CheckInPanelProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryableError, setRetryableError] = useState(false);
  const { status, session, participation, error, retry } = useAttendanceState(sessionId);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Presensi</Text>
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
        <Text style={styles.heading}>Presensi</Text>
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
        <Text style={styles.heading}>Presensi</Text>
        <Text style={styles.infoBannerText}>Sesi tidak ditemukan.</Text>
      </View>
    );
  }

  const alreadyCheckedIn = participation?.kind === 'attendance';
  const rejectedLeave = participation?.kind === 'leave' && participation.status === 'rejected';
  const hasBlockingParticipation = participation !== null && !alreadyCheckedIn && !rejectedLeave;
  const isOpen = session.status === 'open';
  const isNotOpen = session.status === 'not_open';
  const isClosed = session.status === 'closed';

  const getInfoBanner = (): { message: string; color: string } | null => {
    if (alreadyCheckedIn) return { message: CHECK_IN_ERROR_MESSAGES.ALREADY_CHECKED_IN, color: colors.success };
    if (hasBlockingParticipation) {
      if (participation?.kind === 'leave' && participation.status === 'approved') {
        return { message: 'Pengajuan izin disetujui. Presensi tidak dapat dibuat.', color: colors.neutral };
      }
      return { message: 'Pengajuan izin masih menunggu keputusan. Presensi tidak dapat dibuat.', color: colors.neutral };
    }
    if (session.isArchived) return { message: 'Sesi sudah diarsipkan. Presensi tidak dapat dilakukan.', color: colors.danger };
    if (isNotOpen) return { message: CHECK_IN_ERROR_MESSAGES.SESSION_NOT_OPEN, color: colors.neutral };
    if (isClosed) return { message: CHECK_IN_ERROR_MESSAGES.SESSION_CLOSED, color: colors.danger };
    return null;
  };

  const handleCheckIn = async () => {
    if (!isOpen || alreadyCheckedIn || hasBlockingParticipation || isSubmitting) return;
    setIsSubmitting(true);
    setRetryableError(false);
    const result = await checkIn(sessionId);

    if (result.ok) {
      setModalTitle('Presensi Berhasil');
      setModalMessage(CHECK_IN_SUCCESS_MESSAGE(formatTime(result.data.checkedInAt)));
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
    }

    setIsSubmitting(false);
    setModalVisible(true);
  };

  const dismissModal = () => {
    setModalVisible(false);
  };

  const infoBanner = getInfoBanner();

  // Can the student press check-in? Only when session is open AND not already checked in (SRS-10, SRS-12)
  const canCheckIn = isOpen && !session.isArchived && !alreadyCheckedIn && !hasBlockingParticipation && !isSubmitting;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Presensi</Text>

      {/* SRS-14: Info banner when check-in is not possible */}
      {infoBanner && (
        <View
          style={[styles.infoBanner, { borderLeftColor: infoBanner.color }]}
        >
          <Text style={styles.infoBannerText}>{infoBanner.message}</Text>
        </View>
      )}

      {/* SRS-10: Check-in button only when session is open */}
      {isOpen && (
        <TouchableOpacity
          style={[
            styles.checkInButton,
            !canCheckIn && styles.checkInButtonDisabled,
          ]}
            onPress={() => { void handleCheckIn(); }}
          disabled={!canCheckIn}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.checkInButtonText,
              !canCheckIn && styles.checkInButtonTextDisabled,
            ]}
          >
            {isSubmitting ? 'Menyimpan...' : alreadyCheckedIn ? 'Sudah Tercatat' : 'Presensi'}
          </Text>
        </TouchableOpacity>
      )}

      {retryableError && !isSubmitting && (
        <Pressable
          onPress={() => {
            setRetryableError(false);
            retry();
          }}
          style={styles.retryButton}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Periksa status lagi</Text>
        </Pressable>
      )}

      {/* SRS-13: Feedback modal using ConfirmModal */}
      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmLabel="OK"
        cancelLabel="Tutup"
        onConfirm={dismissModal}
        onCancel={dismissModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoBanner: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  checkInButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonDisabled: {
    backgroundColor: colors.border,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkInButtonTextDisabled: {
    color: colors.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
