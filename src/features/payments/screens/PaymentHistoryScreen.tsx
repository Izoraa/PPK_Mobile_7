import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing } from '@/theme';
import type { Result } from '@/types';

import {
  createHistoryFineReader,
  subscribePaymentHistory,
  type PaymentHistoryFine,
  type PaymentHistorySnapshot,
  type PaymentHistoryTransaction,
} from '../paymentHistoryService';
import { formatRupiah, paymentAttemptStatusLabels } from '../paymentPresentation';

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });
const transactionTimeFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function PaymentHistoryScreen() {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'student') return null;

  return <PaymentHistoryList key={currentUser.id} studentId={currentUser.id} />;
}

function PaymentHistoryList({ studentId }: { studentId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<PaymentHistorySnapshot> | null>(null);
  const readFine = useMemo(() => createHistoryFineReader(studentId), [studentId]);

  useEffect(() => {
    return subscribePaymentHistory(studentId, setResult);
  }, [studentId, attempt]);

  function reload() {
    setResult(null);
    setAttempt((value) => value + 1);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(student)/payments' as Href);
    }
  }

  const snapshot = result?.ok ? result.data : null;
  const fromCache = snapshot?.fromCache ?? false;
  const status = !result ? 'loading'
    : !result.ok ? 'error'
    : result.data.transactions.length === 0 ? 'empty' : 'ready';

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
        <Text accessibilityRole="header" style={styles.title}>Riwayat Pembayaran</Text>
      </View>

      <AsyncState
        status={status}
        error={result?.ok === false ? result.error : null}
        fromCache={fromCache}
        onRetry={reload}
        emptyTitle={fromCache ? 'Riwayat belum dapat diperiksa' : 'Belum ada riwayat pembayaran'}
        emptyMessage={fromCache ? 'Periksa koneksi internet untuk memuat riwayat.' : 'Transaksi denda Anda akan muncul di sini.'}
      >
        <FlatList
          data={snapshot?.transactions ?? []}
          keyExtractor={(transaction) => transaction.orderId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <PaymentHistoryCard transaction={item} readFine={readFine} fromCache={fromCache} />
          )}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

function PaymentHistoryCard({ transaction, readFine, fromCache }: {
  transaction: PaymentHistoryTransaction;
  readFine: ReturnType<typeof createHistoryFineReader>;
  fromCache: boolean;
}) {
  const [fine, setFine] = useState<PaymentHistoryFine | null>();
  const { fineId } = transaction;

  useEffect(() => {
    if (fromCache) return;
    let active = true;
    void readFine(fineId).then((linkedFine) => {
      if (active) setFine(linkedFine);
    });
    return () => { active = false; };
  }, [fineId, fromCache, readFine]);

  const fineDate = fine?.createdAt ? dateFormatter.format(fine.createdAt)
    : fine === undefined && !fromCache ? 'Memuat…' : 'Tidak tersedia';

  return (
    <View style={styles.card}>
      <Text style={styles.sessionTitle}>{transaction.sessionTitle ?? fine?.sessionTitle ?? 'Judul sesi tidak tersedia'}</Text>
      <Text style={styles.amount}>{formatRupiah(transaction.amount)}</Text>
      <StatusBadge
        status={transaction.status === 'pending' ? 'pending' : paymentAttemptStatusLabels[transaction.status]}
        size="sm"
      />

      <View style={styles.detail}>
        <Text style={styles.label}>Tanggal tagihan</Text>
        <Text style={styles.value}>{fineDate}</Text>
      </View>
      <View style={styles.detail}>
        <Text style={styles.label}>Waktu transaksi</Text>
        <Text style={styles.value}>{transactionTimeFormatter.format(transaction.createdAt)}</Text>
      </View>
      <View style={styles.detail}>
        <Text style={styles.label}>Nomor pesanan</Text>
        <Text selectable style={styles.value}>{transaction.orderId}</Text>
      </View>
    </View>
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
  detail: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
