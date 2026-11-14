import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { ConfirmModal } from '@/components/common/ConfirmModal';
import { CONFIRM_OPEN_SESSION, CONFIRM_CLOSE_SESSION } from '@/utils/messages';
import { colors, radius, spacing } from '@/theme';
import {
  openSession as openSessionService,
  closeSession as closeSessionService,
  subscribeSession,
  type SessionDoc,
  type SessionStatus,
} from '@/features/practicum';

export interface SessionControlProps {
  sessionId: string;
  initialSession?: SessionDoc | null;
  onStatusChanged?: (status: SessionStatus) => void;
}

type ModalAction = 'open' | 'close' | null;

export function SessionControl({ sessionId, initialSession, onStatusChanged }: SessionControlProps) {
  const [session, setSession] = useState<SessionDoc | null>(initialSession ?? null);
  const [pendingAction, setPendingAction] = useState<ModalAction>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession]);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeSession(
      sessionId,
      (doc) => {
        if (doc) {
          setSession(doc);
          if (onStatusChanged) onStatusChanged(doc.status);
        }
      },
      (err) => console.error('Error listening to session:', err)
    );

    return () => unsubscribe();
  }, [sessionId, onStatusChanged]);

  if (!session) {
    return null;
  }

  const handleConfirm = async () => {
    const action = pendingAction;
    setPendingAction(null);
    setErrorMsg(null);
    setSubmitting(true);

    if (action === 'open') {
      const res = await openSessionService(sessionId);
      if (!res.ok) {
        setErrorMsg(res.error.message || 'Gagal membuka sesi.');
      }
    } else if (action === 'close') {
      const res = await closeSessionService(sessionId);
      if (!res.ok) {
        setErrorMsg(res.error.message || 'Gagal menutup sesi.');
      }
    }
    setSubmitting(false);
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pengelolaan Sesi</Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* S2-SRS-20: Sesi not_open -> Buka Sesi */}
      {session.status === 'not_open' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Sesi praktikum belum dibuka. Buka sesi agar praktikan dapat mulai melakukan presensi.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.openButton, submitting && styles.disabledButton]}
            onPress={() => setPendingAction('open')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Buka Sesi</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* S2-SRS-20: Sesi open -> Tutup Sesi */}
      {session.status === 'open' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Sesi praktikum sedang berlangsung.
            {session.openedAt && ` Dibuka pukul ${formatTimestamp(session.openedAt)}.`}
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.closeButton, submitting && styles.disabledButton]}
            onPress={() => setPendingAction('close')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Tutup Sesi</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* S2-SRS-20: Sesi closed -> Tidak dapat dibuka kembali */}
      {session.status === 'closed' && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedTitle}>Sesi Telah Ditutup</Text>
          <Text style={styles.closedDescription}>
            Kegiatan praktikum telah selesai
            {session.closedAt && ` pada pukul ${formatTimestamp(session.closedAt)}`}. Sesi yang telah ditutup tidak dapat dibuka kembali.
          </Text>
        </View>
      )}

      {/* Konfirmasi modal sebelum membuka atau menutup sesi */}
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
        onCancel={() => setPendingAction(null)}
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
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  openButton: {
    backgroundColor: colors.success,
  },
  closeButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.neutral,
  },
  closedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  closedDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});

export default SessionControl;
