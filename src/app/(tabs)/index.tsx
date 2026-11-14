import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/state/AppContext';
import ScheduleScreen from '@/screens/ScheduleScreen';

export default function HomeRoute() {
  const { currentUser } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        {currentUser?.role === 'assistant' ? (
          <Link href="/leave-review" asChild>
            <Pressable accessibilityRole="button" style={styles.actionButton}>
              <Text style={styles.actionLabel}>Review izin</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      <View style={styles.schedule}>
        <ScheduleScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#208AEF',
  },
  actionLabel: { color: '#FFFFFF', fontWeight: '700' },
  schedule: { flex: 1 },
});
