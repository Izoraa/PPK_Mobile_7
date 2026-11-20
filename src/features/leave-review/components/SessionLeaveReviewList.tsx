import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AsyncState } from "@/components/common/AsyncState";
import {
  useLeaveReviewMetadata,
  useSessionPendingLeaveReviews,
} from "@/features/leave-review/hooks";
import type { LeaveReviewRecord } from "@/features/leave-review/types";
import { colors, spacing } from "@/theme";

import { LeaveReviewCard } from "./LeaveReviewCard";
import { LeaveReviewDetail } from "./LeaveReviewDetail";

type Props = {
  sessionId: string;
};

export function SessionLeaveReviewList({ sessionId }: Props) {
  const queue = useSessionPendingLeaveReviews(sessionId);
  const metadata = useLeaveReviewMetadata(queue.records);
  const [selected, setSelected] = useState<LeaveReviewRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const status =
    queue.status === "ready" && queue.records.length === 0
      ? "empty"
      : queue.status;

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Pengajuan izin sesi
      </Text>

      {notice ? (
        <Text accessibilityRole="alert" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      <AsyncState
        status={status}
        error={queue.error}
        fromCache={queue.fromCache}
        hasPendingWrites={queue.hasPendingWrites}
        onRetry={queue.retry}
        emptyTitle="Belum ada pengajuan izin"
        emptyMessage="Semua pengajuan izin sesi ini akan muncul di sini, termasuk yang sudah diputuskan."
      >
        <View style={styles.list}>
          {queue.records.map((record, index) => {
            const key = `${record.sessionId}:${record.classId}`;

            return (
              <LeaveReviewCard
                key={`${record.sessionId}_${record.studentId}_${index}`}
                record={record}
                metadata={metadata[key]}
                onPress={() => {
                  setNotice(null);
                  setSelected(record);
                }}
              />
            );
          })}
        </View>
      </AsyncState>

      <LeaveReviewDetail
        record={selected}
        metadata={
          selected
            ? metadata[`${selected.sessionId}:${selected.classId}`]
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  notice: {
    color: colors.success,
    fontSize: 14,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
});
