import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { ConfirmModal } from '@/components/common/ConfirmModal';
import { CONFIRM_OPEN_SESSION, CONFIRM_CLOSE_SESSION } from '@/utils/messages';
import { colors, radius, spacing, shadows } from '@/theme';
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
      if (!isStarted()) {
        setErrorMsg(`Sesi hanya bisa dibuka setelah melewati atau sama dengan jam mulai (${formatDateTime(session.startsAt)}).`);
        setSubmitting(false);
        return;
      }
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
    const date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (ts: any) => {
    if (!ts) return '';
    const date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isStarted = () => {
    if (!session?.startsAt) return true;
    const startTime = typeof (session.startsAt as any)?.toDate === 'function'
      ? (session.startsAt as any).toDate().getTime()
      : new Date(session.startsAt as any).getTime();
    return Date.now() >= startTime;
  };

  const canOpen = isStarted();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Pengelolaan Sesi</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>Akses Asisten</Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* S2-SRS-20: Sesi not_open -> Buka Sesi */}
      {session.status === 'not_open' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Sesi praktikum belum dibuka. Buka sesi agar praktikan dapat mulai memindai kode QR atau mengajukan izin.
          </Text>
          {!canOpen && (
            <View style={styles.notStartedNotice}>
              <Text style={styles.notStartedText}>
                ⚠️ Sesi hanya bisa dibuka setelah melewati atau sama dengan jam mulai ({formatDateTime(session.startsAt)}).
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              styles.openButton,
              (!canOpen || submitting) && styles.disabledButton,
            ]}
            onPress={() => {
              if (!canOpen) {
                setErrorMsg(`Sesi hanya bisa dibuka setelah melewati atau sama dengan jam mulai (${formatDateTime(session.startsAt)}).`);
                return;
              }
              setPendingAction('open');
            }}
            disabled={submitting || !canOpen}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {canOpen ? 'Buka Sesi' : 'Belum Memasuki Jam Mulai'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* S2-SRS-20: Sesi open -> Tutup Sesi */}
      {session.status === 'open' && (
        <View style={styles.content}>
          <View style={styles.liveBanner}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBannerText}>
              Sesi sedang berlangsung
              {session.openedAt ? ` (sejak ${formatTimestamp(session.openedAt)})` : ''}
            </Text>
          </View>
          <Text style={styles.description}>
            Tutup sesi setelah seluruh rangkaian praktikum dan presensi selesai dilakukan.
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
              <Text style={styles.buttonText}>Tutup Sesi Praktikum</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Sesi closed */}
      {session.status === 'closed' && (
        <View style={styles.closedInfoBox}>
          <Text style={styles.closedInfoTitle}>Sesi Telah Ditutup</Text>
          <Text style={styles.closedInfoText}>
            Presensi telah dikunci. Anda masih dapat meninjau rekap kehadiran dan verifikasi izin praktikan.
          </Text>
        </View>
      )}

      <ConfirmModal
        visible={pendingAction !== null}
        title={pendingAction === 'open' ? CONFIRM_OPEN_SESSION.title : CONFIRM_CLOSE_SESSION.title}
        message={pendingAction === 'open' ? CONFIRM_OPEN_SESSION.message : CONFIRM_CLOSE_SESSION.message}
        confirmLabel={pendingAction === 'open' ? 'Buka Sekarang' : 'Tutup Sekarang'}
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
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  roleTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  roleTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    gap: spacing.md,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveBannerText: {
    color: colors.successText,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  openButton: {
    backgroundColor: colors.success,
  },
  closeButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#94A3B8',
  },
  notStartedNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  notStartedText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '500',
  },
  closedInfoBox: {
    backgroundColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closedInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  closedInfoText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});

export default SessionControl;
