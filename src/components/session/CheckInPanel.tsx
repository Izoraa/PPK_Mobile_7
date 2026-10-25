import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../state/AppContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { colors, radius, spacing } from '../../theme';
import { formatTime } from '../../utils/format';
import {
  CHECK_IN_ERROR_MESSAGES,
  CHECK_IN_SUCCESS_MESSAGE,
} from '../../utils/messages';
import { CheckInError } from '../../types';

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
  const { getSession, checkIn, hasCheckedIn, currentUser } = useApp();

  // Local state for the feedback modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const session = getSession(sessionId);

  // Guard: no session or no current user
  if (!session || !currentUser) {
    return null;
  }

  const alreadyCheckedIn = hasCheckedIn(sessionId, currentUser.id);
  const isOpen = session.status === 'open';
  const isNotOpen = session.status === 'not_open';
  const isClosed = session.status === 'closed';

  // Determine which info banner to show (SRS-14)
  const getInfoBanner = (): { message: string; color: string } | null => {
    if (isNotOpen) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.SESSION_NOT_OPEN,
        color: colors.neutral,
      };
    }
    if (isClosed) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.SESSION_CLOSED,
        color: colors.danger,
      };
    }
    if (isOpen && alreadyCheckedIn) {
      return {
        message: CHECK_IN_ERROR_MESSAGES.ALREADY_CHECKED_IN,
        color: colors.success,
      };
    }
    return null;
  };

  // Handle the check-in action (SRS-10, SRS-11, SRS-12, SRS-13)
  const handleCheckIn = () => {
    const result = checkIn(sessionId);

    if (result.ok) {
      // SRS-11 & SRS-13: success feedback with recorded time
      const timeFormatted = formatTime(result.attendance.checkedInAt);
      setModalTitle('Presensi Berhasil');
      setModalMessage(CHECK_IN_SUCCESS_MESSAGE(timeFormatted));
    } else {
      // SRS-13: failure feedback
      setModalTitle('Presensi Gagal');
      setModalMessage(CHECK_IN_ERROR_MESSAGES[result.reason as CheckInError]);
    }

    setModalVisible(true);
  };

  const dismissModal = () => {
    setModalVisible(false);
  };

  const infoBanner = getInfoBanner();

  // Can the student press check-in? Only when session is open AND not already checked in (SRS-10, SRS-12)
  const canCheckIn = isOpen && !alreadyCheckedIn;

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
          onPress={handleCheckIn}
          disabled={!canCheckIn}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.checkInButtonText,
              !canCheckIn && styles.checkInButtonTextDisabled,
            ]}
          >
            {alreadyCheckedIn ? 'Sudah Tercatat' : 'Presensi'}
          </Text>
        </TouchableOpacity>
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
});
