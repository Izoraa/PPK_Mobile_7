import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserResultType } from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ExternalLink } from '@/components/external-link';
import { createPaymentCheckout, type PaymentCheckout } from '@/features/payments/paymentCheckoutService';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing } from '@/theme';
import type { Result } from '@/types';
import { getErrorMessage } from '@/utils/errors';

import { getStudentFines, type StudentFine } from '../studentFinesService';

type CheckoutState =
  | { kind: 'creating'; fineId: string }
  | { kind: 'ready'; payment: PaymentCheckout }
  | { kind: 'error'; fineId: string; message: string };

const statusLabels: Record<StudentFine['status'], string> = {
  unpaid: 'Belum dibayar',
  pending: 'pending', // The shared badge displays “Menunggu”.
  paid: 'Lunas',
  failed: 'Pembayaran gagal',
};

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatFineDate(fine: StudentFine): string {
  const sessionDate = fine.session?.startsAt;
  if (sessionDate) return sessionDate.toLocaleDateString('id-ID', { dateStyle: 'long' });
  if (fine.createdAt) {
    return `Tagihan dibuat ${fine.createdAt.toLocaleDateString('id-ID', { dateStyle: 'long' })}`;
  }
  return 'Tanggal tidak tersedia';
}

export default function StudentFinesScreen() {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'student') return null;

  return <StudentFinesList key={currentUser.id} studentId={currentUser.id} />;
}

function StudentFinesList({ studentId }: { studentId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<StudentFine[]> | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const activeCheckout = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void getStudentFines(studentId).then((fines) => {
      if (active) setResult(fines);
    });
    return () => { active = false; };
  }, [attempt, studentId]);

  useEffect(() => () => { activeCheckout.current = null; }, []);

  function reload() {
    setResult(null);
    setAttempt((value) => value + 1);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  async function payFine(fineId: string) {
    if (activeCheckout.current !== null) return;
    activeCheckout.current = fineId;
    setCheckout({ kind: 'creating', fineId });

    let failureMessage = 'Pembayaran belum dapat disiapkan. Silakan coba lagi.';
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user || user.uid !== studentId) {
        setCheckout({ kind: 'error', fineId, message: getErrorMessage('UNAUTHENTICATED') });
        return;
      }

      const response = await createPaymentCheckout(fineId, user);
      if (activeCheckout.current !== fineId) return;
      if (auth.currentUser !== user) {
        setCheckout({ kind: 'error', fineId, message: getErrorMessage('UNAUTHENTICATED') });
        return;
      }
      if (!response.ok) {
        const message = response.error.code === 'NOT_FOUND'
          ? 'Tagihan denda tidak ditemukan.'
          : getErrorMessage(response.error.code);
        setCheckout({ kind: 'error', fineId, message });
        return;
      }

      if (Platform.OS !== 'web') {
        failureMessage = 'Halaman pembayaran tidak dapat dibuka.';
        const browser = await openBrowserAsync(response.data.redirectUrl);
        if (browser.type === WebBrowserResultType.LOCKED) throw new Error(failureMessage);
      }

      if (activeCheckout.current === fineId) {
        setCheckout(auth.currentUser === user
          ? { kind: 'ready', payment: response.data }
          : { kind: 'error', fineId, message: getErrorMessage('UNAUTHENTICATED') });
      }
    } catch {
      if (activeCheckout.current === fineId) {
        setCheckout({ kind: 'error', fineId, message: failureMessage });
      }
    } finally {
      if (activeCheckout.current === fineId) activeCheckout.current = null;
    }
  }

  const status = !result ? 'loading'
    : !result.ok ? 'error'
    : result.data.length === 0 ? 'empty' : 'ready';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Tagihan Denda</Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.body}>
          Membayar denda keterlambatan tidak mengubah catatan presensi Anda.
        </Text>
      </View>

      <AsyncState
        status={status}
        error={result?.ok === false ? result.error : null}
        onRetry={reload}
        emptyTitle="Belum ada tagihan denda"
        emptyMessage="Tagihan keterlambatan Anda akan muncul di sini."
      >
        <FlatList
          data={result?.ok ? result.data : []}
          keyExtractor={(fine) => fine.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const payment = checkout?.kind === 'ready' && checkout.payment.fineId === item.id
              ? checkout.payment : null;
            const creating = checkout?.kind === 'creating';
            const creatingForThisFine = creating && checkout.fineId === item.id;
            const error = checkout?.kind === 'error' && checkout.fineId === item.id ? checkout.message : null;

            return (
              <View style={styles.card}>
                <Text style={styles.sessionTitle}>
                  {item.sessionTitle ?? item.session?.title ?? 'Judul sesi tidak tersedia'}
                </Text>
                <Text style={styles.body}>{formatFineDate(item)}</Text>
                <Text style={styles.body}>Terlambat {item.lateMinutes} menit</Text>
                <Text style={styles.amount}>{rupiahFormatter.format(item.amount)}</Text>
                <StatusBadge status={statusLabels[item.status]} size="sm" />
                {payment && (
                  <>
                    <Text style={styles.body}>Nomor pesanan {payment.orderId}</Text>
                    {Platform.OS === 'web' && (
                      <ExternalLink
                        href={payment.redirectUrl}
                        rel="noopener noreferrer"
                        style={[styles.payButton, styles.payButtonText, styles.payLink]}
                      >
                        Buka Halaman Pembayaran
                      </ExternalLink>
                    )}
                  </>
                )}
                {item.status === 'unpaid' && !payment && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: creating, busy: creatingForThisFine }}
                    disabled={creating}
                    onPress={() => { void payFine(item.id); }}
                    style={({ pressed }) => [styles.payButton, (creating || pressed) && styles.pressed]}
                  >
                    <Text style={styles.payButtonText}>
                      {creatingForThisFine ? 'Menyiapkan pembayaran…' : 'Bayar Denda'}
                    </Text>
                  </Pressable>
                )}
                {error && <Text accessibilityRole="alert" style={styles.checkoutError}>{error}</Text>}
              </View>
            );
          }}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: 24 },
  pressed: { opacity: 0.7 },
  title: { flex: 1, color: colors.primary, fontSize: 18, fontWeight: '700' },
  notice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
  },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sessionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  amount: { color: colors.text, fontSize: 18, fontWeight: '700' },
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
  checkoutError: { color: colors.dangerText, fontSize: 14, lineHeight: 20 },
});
