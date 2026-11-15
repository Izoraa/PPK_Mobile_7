import { useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AsyncState } from '@/components/common/AsyncState';
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Review pengajuan izin</Text>
        <Text style={styles.subtitle}>Antrean pending yang perlu diputuskan secara manual.</Text>
        {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      </View>
      <AsyncState
        status={queue.status === 'ready' && queue.records.length === 0 ? 'empty' : queue.status}
        error={queue.error}
        fromCache={queue.fromCache}
        hasPendingWrites={queue.hasPendingWrites}
        onRetry={queue.retry}
        emptyTitle="Tidak ada pengajuan pending"
        emptyMessage="Antrean izin yang perlu direview akan muncul di sini."
      >
        <FlatList
          data={queue.records}
          keyExtractor={(record) => record.id}
          contentContainerStyle={styles.list}
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
      </AsyncState>
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
  list: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  header: { gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  notice: { color: colors.success, fontSize: 14 },
  separator: { height: spacing.sm },
});
