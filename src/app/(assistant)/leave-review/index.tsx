import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AsyncState } from '@/components/common/AsyncState';
import { LeaveReviewCard } from '@/features/leave-review/components/LeaveReviewCard';
import { LeaveReviewDetail } from '@/features/leave-review/components/LeaveReviewDetail';
import {
  useLeaveReviewMetadata,
  usePendingLeaveReviews,
} from '@/features/leave-review/hooks';
import type { LeaveReviewRecord } from '@/features/leave-review/types';
import { colors, spacing } from '@/theme';

export default function LeaveReviewQueueScreen() {
  const router = useRouter();
  const queue = usePendingLeaveReviews(true);
  const metadata = useLeaveReviewMetadata(queue.records);
  const [selected, setSelected] = useState<LeaveReviewRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedRecord = useMemo(() => {
    if (!selected) return null;
    return queue.records.find((record) => record.id === selected.id) ?? selected;
  }, [queue.records, selected]);

  useEffect(() => {
    if (!selected || !selectedRecord) return;
    if (selected !== selectedRecord) setSelected(selectedRecord);
  }, [selected, selectedRecord]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <Text accessibilityRole="header" style={styles.title}>
          Review pengajuan izin
        </Text>
        <Text style={styles.subtitle}>
          Antrean pending yang perlu diputuskan secara manual.
        </Text>

        {notice ? (
          <Text accessibilityRole="alert" style={styles.notice}>
            {notice}
          </Text>
        ) : null}
      </View>

      <AsyncState
        status={
          queue.status === 'ready' && queue.records.length === 0
            ? 'empty'
            : queue.status
        }
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
                onPress={() => {
                  setNotice(null);
                  setSelected(item);
                }}
              />
            );
          }}
        />
      </AsyncState>

      <LeaveReviewDetail
        record={selectedRecord}
        metadata={
          selectedRecord
            ? metadata[selectedRecord.sessionId + ':' + selectedRecord.classId]
            : undefined
        }
        onClose={() => setSelected(null)}
        onError={(message) => {
          setNotice(message);
          setSelected(null);
        }}
        onSuccess={(message) => {
          setNotice(message);
          setSelected(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  header: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  backArrow: {
    color: '#2563EB',
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
  },
  notice: {
    color: colors.success,
    fontSize: 14,
  },
  separator: {
    height: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
