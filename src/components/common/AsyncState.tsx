import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import type { AppErrorCode } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import { colors, radius, spacing } from '@/theme';

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
        <Text style={styles.notice}>
          Menampilkan data tersimpan. Data ini belum terverifikasi dari server.
        </Text>
      ) : null}
      {hasPendingWrites ? (
        <Text style={styles.notice}>
          Perubahan sedang disinkronkan.
        </Text>
      ) : null}
    </>
  );

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        {notices}
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.body}>Memuat data…</Text>
      </View>
    );
  }

  if (status === 'error') {
    const errorCode = error?.code ?? 'SERVICE_UNAVAILABLE';
    const canRetry = Boolean(error?.retryable && onRetry);

    return (
      <View style={styles.container}>
        {notices}
        <Text accessibilityRole="alert" style={styles.error}>
          {getErrorMessage(errorCode)}
        </Text>

        {canRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Coba lagi</Text>
          </Pressable>
        ) : null}
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
            style={styles.button}
          >
            <Text style={styles.buttonText}>Muat ulang</Text>
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  ready: {
    flex: 1,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  notice: {
    alignSelf: 'stretch',
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});