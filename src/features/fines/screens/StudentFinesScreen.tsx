import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserResultType } from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { createPaymentCheckout, type PaymentCheckout } from '@/features/payments/paymentCheckoutService';
import type { PaymentOrder } from '@/features/payments/paymentStatusService';
import { usePaymentStatusChecks } from '@/features/payments/usePaymentStatusChecks';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';
import type { Result } from '@/types';
import { getErrorMessage } from '@/utils/errors';

import { StudentFineCard } from '../components/StudentFineCard';
import { subscribeStudentFines, type StudentFinesSnapshot } from '../studentFinesService';

type CheckoutState =
  | { kind: 'creating'; fineId: string }
  | { kind: 'ready' | 'opened'; payment: PaymentCheckout }
  | { kind: 'error'; fineId: string; message: string };

export default function StudentFinesScreen() {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'student') return null;

  return <StudentFinesList key={currentUser.id} studentId={currentUser.id} />;
}

function StudentFinesList({ studentId }: { studentId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<StudentFinesSnapshot> | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const activeCheckout = useRef<string | null>(null);
  const browserOrder = useRef<PaymentOrder | null>(null);
  const { checks, checkStatus } = usePaymentStatusChecks(studentId);

  const reconcileReturnedOrder = useCallback(() => {
    const order = browserOrder.current;
    if (!order) return;
    browserOrder.current = null;
    setCheckout((previous) => previous?.kind === 'ready' && previous.payment.orderId === order.orderId
      ? { kind: 'opened', payment: previous.payment } : previous);
    void checkStatus(order);
  }, [checkStatus]);

  useEffect(() => {
    return subscribeStudentFines(studentId, setResult);
  }, [attempt, studentId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcileReturnedOrder();
    });
    return () => {
      subscription?.remove();
      activeCheckout.current = null;
      browserOrder.current = null;
    };
  }, [reconcileReturnedOrder]);

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

  async function payFine(fineId: string, orderId: string | null) {
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
        const code = response.error.code;
        if (code === 'CONFLICT' && orderId) void checkStatus({ fineId, orderId });
        const message = code === 'NOT_FOUND' ? 'Tagihan denda tidak ditemukan.'
          : code === 'CONFLICT' ? 'Pembayaran sedang diproses atau tagihan telah berubah.'
          : getErrorMessage(code);
        setCheckout({ kind: 'error', fineId, message });
        return;
      }

      const payment = response.data;
      if (Platform.OS === 'web') {
        setCheckout({ kind: 'ready', payment });
        return;
      }

      failureMessage = 'Halaman pembayaran tidak dapat dibuka.';
      browserOrder.current = { fineId, orderId: payment.orderId };
      const browser = await openBrowserAsync(payment.redirectUrl);
      if (browser.type === WebBrowserResultType.LOCKED) throw new Error(failureMessage);

      if (activeCheckout.current === fineId) {
        setCheckout(auth.currentUser === user
          ? { kind: 'opened', payment }
          : { kind: 'error', fineId, message: getErrorMessage('UNAUTHENTICATED') });
        // On Android the promise resolves at launch. AppState handles the return.
        if (browser.type === WebBrowserResultType.CANCEL || browser.type === WebBrowserResultType.DISMISS) {
          reconcileReturnedOrder();
        }
      }
    } catch {
      if (browserOrder.current?.fineId === fineId) browserOrder.current = null;
      if (activeCheckout.current === fineId) {
        setCheckout({ kind: 'error', fineId, message: failureMessage });
      }
    } finally {
      if (activeCheckout.current === fineId) activeCheckout.current = null;
    }
  }

  const snapshot = result?.ok ? result.data : null;
  const fromCache = snapshot?.fromCache ?? false;
  const status = !result ? 'loading'
    : !result.ok ? 'error'
    : result.data.fines.length === 0 ? 'empty' : 'ready';

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
        fromCache={fromCache}
        onRetry={reload}
        emptyTitle={fromCache ? 'Tagihan belum dapat diperiksa' : 'Belum ada tagihan denda'}
        emptyMessage={fromCache ? 'Periksa koneksi internet untuk memuat tagihan.' : 'Tagihan keterlambatan Anda akan muncul di sini.'}
      >
        <FlatList
          data={snapshot?.fines ?? []}
          keyExtractor={(fine) => fine.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const payment = (checkout?.kind === 'ready' || checkout?.kind === 'opened')
              && checkout.payment.fineId === item.id ? checkout.payment : null;
            const orderId = item.orderId ?? payment?.orderId ?? null;
            const checkoutBusy = checkout?.kind === 'creating';
            const checkoutError = checkout?.kind === 'error' && checkout.fineId === item.id ? checkout.message : null;

            return (
              <StudentFineCard
                key={orderId ?? item.id}
                fine={item}
                studentId={studentId}
                orderId={orderId}
                checkoutLink={checkout?.kind === 'ready' && payment?.orderId === orderId ? payment : null}
                checkoutError={checkoutError}
                creating={checkoutBusy && checkout.fineId === item.id}
                checkoutBusy={checkoutBusy}
                fromCache={fromCache}
                check={orderId ? checks.get(orderId) : undefined}
                onPay={() => { void payFine(item.id, orderId); }}
                onOpenCheckout={(opening) => {
                  browserOrder.current = { fineId: opening.fineId, orderId: opening.orderId };
                }}
                onCheckStatus={() => { if (orderId) void checkStatus({ fineId: item.id, orderId }); }}
              />
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
});
