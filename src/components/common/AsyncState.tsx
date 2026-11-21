import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import type { AppErrorCode } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import { colors, radius, spacing, shadows } from '@/theme';

type AsyncStatus = 'loading' | 'empty' | 'error' | 'ready';

type Props = {
  status: AsyncStatus;
  children?: ReactNode;
  error?: {
    code: AppErrorCode;
    retryable: boolean;
  } | null;
  fromCache?: boolean;
  hasPendingWrites?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
};

export function AsyncState({
  status,
  children,
  error,
  fromCache = false,
  hasPendingWrites = false,
  onRetry,
  emptyTitle = 'Belum ada data',
  emptyMessage = 'Data akan muncul di sini jika tersedia.',
}: Props) {
  const notices = (
    <>
      {fromCache ? (
        <View style={styles.noticeCard}>
          <Text style={styles.notice}>
            Menampilkan data tersimpan (luring). Data ini belum diverifikasi dari server.
          </Text>
        </View>
      ) : null}
      {hasPendingWrites ? (
        <View style={[styles.noticeCard, styles.pendingCard]}>
          <Text style={[styles.notice, styles.pendingNotice]}>
            Perubahan lokal sedang disinkronkan ke server…
          </Text>
        </View>
      ) : null}
    </>
  );

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        {notices}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.body}>Memuat data…</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    const errorCode = error?.code ?? 'SERVICE_UNAVAILABLE';
    const canRetry = Boolean(error?.retryable && onRetry);

    return (
      <View style={styles.container}>
        {notices}
        <View style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Terjadi Kendala</Text>
          <Text accessibilityRole="alert" style={styles.error}>
            {getErrorMessage(errorCode)}
          </Text>

          {canRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>Coba lagi</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={styles.container}>
        {notices}
        <EmptyState title={emptyTitle} message={emptyMessage} />

        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>Muat ulang</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.ready}>
      {notices}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  ready: {
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  noticeCard: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingCard: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  notice: {
    color: colors.neutralText,
    fontSize: 13,
    lineHeight: 18,
  },
  pendingNotice: {
    color: colors.warningText,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorIcon: {
    fontSize: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  error: {
    color: colors.dangerText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    minHeight: 46,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 130,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
