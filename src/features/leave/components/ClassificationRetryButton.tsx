import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LeaveAiClassification } from '../types';
import { requestClassification } from '../aiService';
import { getErrorMessage } from '@/utils/errors';
import { colors, radius, spacing } from '@/theme';

type Props = {
  sessionId: string;
  studentId: string;
  ai: Pick<LeaveAiClassification, 'status' | 'attemptCount' | 'errorCode'>;
};

export function ClassificationRetryButton({ sessionId, studentId, ai }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const autoStarted = useRef(false);
  const canTry = ai.status !== 'succeeded' && ai.status !== 'processing';

  async function retry() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestClassification({ sessionId, studentId });
      if (result.ok) {
        setMessage(result.data.aiStatus === 'succeeded'
          ? 'Klasifikasi tersedia. Status diperbarui dari server.'
          : result.data.aiStatus === 'processing'
            ? 'Klasifikasi sedang diproses oleh server.'
            : 'Pengajuan tetap tersimpan. Klasifikasi AI belum tersedia; asisten tetap dapat memeriksa.');
      } else {
        setMessage(getErrorMessage(result.error.code));
      }
    } catch {
      setMessage('Layanan klasifikasi belum tersedia. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (ai.status !== 'pending' || autoStarted.current) return;
    autoStarted.current = true;
    void retry();
  }, [ai.status, sessionId, studentId]);

  if (ai.status === 'succeeded') return null;

  return (
    <View style={styles.container}>
      {ai.status === 'pending' || ai.status === 'processing' || busy ? (
        <View accessibilityRole="progressbar" style={styles.progress}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.message}>Klasifikasi AI sedang diproses…</Text>
        </View>
      ) : canTry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void retry()}
          style={[styles.button, busy && styles.disabled]}
        >
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.label}>{busy ? 'Meminta klasifikasi…' : 'Coba klasifikasi AI lagi'}</Text>
        </Pressable>
      ) : null}
      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginTop: spacing.xs },
  progress: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  button: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  disabled: { opacity: 0.65 },
  label: { color: colors.primary, fontWeight: '600' },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
