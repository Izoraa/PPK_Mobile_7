import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { PaymentCheckout } from '@/features/payments/paymentCheckoutService';
import { formatRupiah, paymentAttemptStatusLabels } from '@/features/payments/paymentPresentation';
import { mergePaymentAttemptStatus, subscribePaymentStatus, type PaymentAttemptStatus } from '@/features/payments/paymentStatusService';
import type { PaymentStatusCheck } from '@/features/payments/usePaymentStatusChecks';
import { colors, radius, spacing } from '@/theme';

import type { StudentFine } from '../studentFinesService';

type Props = {
  fine: StudentFine;
  studentId: string;
  orderId: string | null;
  checkoutLink: PaymentCheckout | null;
  checkoutError: string | null;
  creating: boolean;
  checkoutBusy: boolean;
  fromCache: boolean;
  check: PaymentStatusCheck | undefined;
  onPay: () => void;
  onOpenCheckout: (payment: PaymentCheckout) => void;
  onCheckStatus: () => void;
};

const fineStatusLabels: Record<StudentFine['status'], string> = {
  unpaid: 'Belum dibayar',
  pending: 'pending', // The shared badge displays “Menunggu”.
  paid: 'Lunas',
  failed: 'Pembayaran gagal',
};

function formatFineDate(fine: StudentFine): string {
  const sessionDate = fine.session?.startsAt;
  if (sessionDate) return sessionDate.toLocaleDateString('id-ID', { dateStyle: 'long' });
  if (fine.createdAt) {
    return `Tagihan dibuat ${fine.createdAt.toLocaleDateString('id-ID', { dateStyle: 'long' })}`;
  }
  return 'Tanggal tidak tersedia';
}

export function StudentFineCard({
  fine, studentId, orderId, checkoutLink, checkoutError, creating, checkoutBusy, fromCache,
  check, onPay, onOpenCheckout, onCheckStatus,
}: Props) {
  const [snapshotStatus, setSnapshotStatus] = useState<PaymentAttemptStatus>();
  const fineId = fine.id;

  useEffect(() => {
    if (!orderId) return;
    return subscribePaymentStatus({ fineId, orderId }, studentId, (status) => {
      setSnapshotStatus((previous) => mergePaymentAttemptStatus(previous, status));
    });
  }, [fineId, orderId, studentId]);

  const status = mergePaymentAttemptStatus(snapshotStatus, check?.status);
  const canPay = !fromCache && fine.status !== 'paid' && status !== 'success';
  const retry = fine.status === 'failed' || status === 'failed';
  const paymentLabel = retry ? 'Coba Bayar Lagi'
    : fine.status === 'pending' || orderId ? 'Lanjutkan Pembayaran' : 'Bayar Denda';
  const disabled = checkoutBusy || check?.checking === true;
  const openLink = canPay && !retry ? checkoutLink : null;

  return (
    <View style={styles.card}>
      <Text style={styles.sessionTitle}>{fine.sessionTitle ?? fine.session?.title ?? 'Judul sesi tidak tersedia'}</Text>
      <Text style={styles.body}>{formatFineDate(fine)}</Text>
      <Text style={styles.body}>Terlambat {fine.lateMinutes} menit</Text>
      <Text style={styles.amount}>{formatRupiah(fine.amount)}</Text>
      <Text style={styles.label}>Status tagihan</Text>
      <StatusBadge status={fineStatusLabels[fine.status]} size="sm" />

      {orderId && (
        <View style={styles.attempt}>
          <Text style={styles.label}>Status transaksi</Text>
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {status ? paymentAttemptStatusLabels[status] : 'Belum terverifikasi'}
          </Text>
          <Text style={styles.body}>Nomor pesanan {orderId}</Text>
          {status !== 'success' && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: check?.checking, disabled }}
              disabled={disabled}
              onPress={onCheckStatus}
              style={({ pressed }) => [styles.statusButton, (disabled || pressed) && styles.pressed]}
            >
              <Text style={styles.statusButtonText}>
                {check?.checking ? 'Memeriksa status…' : 'Periksa Status'}
              </Text>
            </Pressable>
          )}
          {check?.error && status !== 'success' && (
            <Text accessibilityRole="alert" style={styles.error}>{check.error}</Text>
          )}
        </View>
      )}

      {openLink && !disabled && (
        <Link
          href={openLink.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          onPress={() => onOpenCheckout(openLink)}
          style={[styles.payButton, styles.payButtonText, styles.payLink]}
        >
          Buka Halaman Pembayaran
        </Link>
      )}
      {canPay && !openLink && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: creating }}
          disabled={disabled}
          onPress={onPay}
          style={({ pressed }) => [styles.payButton, (disabled || pressed) && styles.pressed]}
        >
          <Text style={styles.payButtonText}>
            {creating ? 'Menyiapkan pembayaran…' : paymentLabel}
          </Text>
        </Pressable>
      )}
      {checkoutError && canPay && <Text accessibilityRole="alert" style={styles.error}>{checkoutError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sessionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  amount: { color: colors.text, fontSize: 18, fontWeight: '700' },
  attempt: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  payButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  payButtonText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  payLink: { lineHeight: 28 },
  statusButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  statusButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  error: { color: colors.dangerText, fontSize: 14, lineHeight: 20 },
});
