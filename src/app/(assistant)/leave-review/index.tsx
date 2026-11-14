import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import { useLeaveReviewMetadata, usePendingLeaveReviews } from '@/features/leave-review/hooks';
import { LeaveReviewCard } from '@/features/leave-review/components/LeaveReviewCard';
import { LeaveReviewDetail } from '@/features/leave-review/components/LeaveReviewDetail';
import type { LeaveReviewRecord } from '@/features/leave-review/types';
import { colors, spacing } from '@/theme';

export default function LeaveReviewQueueScreen() {
  const queue = usePendingLeaveReviews(true);
  const metadata = useLeaveReviewMetadata(queue.records);
  const [selected, setSelected] = useState<LeaveReviewRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (queue.status === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel="Memuat antrean izin" color={colors.primary} />
        <Text style={styles.message}>Memuat antrean pengajuan izin…</Text>
      </SafeAreaView>
    );
  }

  if (queue.status === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>Antrean izin belum dapat dimuat.</Text>
        <Pressable accessibilityRole="button" onPress={queue.retry} style={styles.retry}>
          <Text style={styles.retryText}>Coba lagi</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={queue.records}
        keyExtractor={(record) => record.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Review pengajuan izin</Text>
            <Text style={styles.subtitle}>Antrean pending yang perlu diputuskan secara manual.</Text>
            {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title="Tidak ada pengajuan pending" message="Antrean izin yang perlu direview akan muncul di sini." />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const key = item.sessionId + ':' + item.classId;
          return (
            <LeaveReviewCard
              record={item}
              metadata={metadata[key]}
              onPress={() => { setNotice(null); setSelected(item); }}
            />
          );
        }}
      />
      <LeaveReviewDetail
        record={selected}
        metadata={selected ? metadata[selected.sessionId + ':' + selected.classId] : undefined}
        onClose={() => setSelected(null)}
        onError={(message) => { setNotice(message); setSelected(null); }}
        onSuccess={(message) => { setNotice(message); setSelected(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background },
  list: { flexGrow: 1, padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  message: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  notice: { color: colors.success, fontSize: 14 },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  retryText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  separator: { height: spacing.sm },
});
