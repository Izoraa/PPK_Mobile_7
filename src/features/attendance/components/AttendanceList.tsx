import { FlatList, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { formatAttendanceTimestamp } from '../format';
import { AttendanceEmptyState } from './AttendanceEmptyState';
import type { AttendanceRecord } from '../types';

type AttendanceListProps = {
  records: AttendanceRecord[];
};

export function AttendanceList({ records }: AttendanceListProps) {
  return (
    <FlatList
      data={records}
      keyExtractor={(record) => record.id}
      contentContainerStyle={records.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={<AttendanceEmptyState />}
      renderItem={({ item }) => (
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedView style={styles.rowText}>
            <ThemedText type="smallBold">{item.praktikanName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatAttendanceTimestamp(item.timestamp)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.four,
  },
  row: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    gap: Spacing.one,
  },
});
