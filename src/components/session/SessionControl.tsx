import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../state/AppContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { CONFIRM_OPEN_SESSION, CONFIRM_CLOSE_SESSION } from '../../utils/messages';
import { colors, radius, spacing } from '../../theme';
import { formatTime } from '../../utils/format';

export interface SessionControlProps {
  sessionId: string;
}

type ModalAction = 'open' | 'close' | null;

export function SessionControl({ sessionId }: SessionControlProps) {
  const { getSession, openSession, closeSession } = useApp();
  const session = getSession(sessionId);
  const [pendingAction, setPendingAction] = useState<ModalAction>(null);

  if (!session) {
    return null;
  }

  const handleConfirm = () => {
    if (pendingAction === 'open') {
      openSession(sessionId);
    } else if (pendingAction === 'close') {
      closeSession(sessionId);
    }
    setPendingAction(null);
  };

  const handleCancel = () => {
    setPendingAction(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pengelolaan Sesi</Text>

      {/* SRS-06: Tombol Buka Sesi hanya muncul saat status not_open */}
      {session.status === 'not_open' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Sesi praktikum belum dibuka. Buka sesi agar praktikan dapat mulai melakukan presensi.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.openButton]}
            onPress={() => setPendingAction('open')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Buka Sesi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SRS-07: Tombol Tutup Sesi hanya muncul saat status open */}
      {session.status === 'open' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Sesi praktikum sedang berlangsung.
            {session.openedAt && ` Dibuka pukul ${formatTime(session.openedAt)}.`}
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={() => setPendingAction('close')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Tutup Sesi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status closed: Tidak menampilkan tombol buka/tutup, hanya informasi */}
      {session.status === 'closed' && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedTitle}>Sesi Telah Ditutup</Text>
          <Text style={styles.closedDescription}>
            Kegiatan praktikum telah selesai
            {session.closedAt && ` pada pukul ${formatTime(session.closedAt)}`}. Sesi yang telah ditutup tidak dapat dibuka kembali.
          </Text>
        </View>
      )}

      {/* SRS-09: Konfirmasi modal sebelum membuka atau menutup sesi */}
      <ConfirmModal
        visible={pendingAction !== null}
        title={
          pendingAction === 'open'
            ? CONFIRM_OPEN_SESSION.title
            : CONFIRM_CLOSE_SESSION.title
        }
        message={
          pendingAction === 'open'
            ? CONFIRM_OPEN_SESSION.message
            : CONFIRM_CLOSE_SESSION.message
        }
        confirmLabel={pendingAction === 'open' ? 'Buka Sekarang' : 'Tutup Sesi'}
        cancelLabel="Batal"
        isDestructive={pendingAction === 'close'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  content: {
    marginTop: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  button: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButton: {
    backgroundColor: colors.success,
  },
  closeButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  closedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 2,
  },
  closedDescription: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
});
