import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useApp } from '@/state/AppContext';
import { subscribeClasses, type ClassDoc } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import EmptyState from '@/components/common/EmptyState';

export default function AssistantClassesScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'assistant') {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeClasses(
      { assistantId: currentUser.id, includeArchived: false },
      (list) => {
        setClasses(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
            <Text style={styles.backText}>← Kembali ke Jadwal</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Kelas Praktikum</Text>
          <Text style={styles.subtitle}>Kelola praktikum dan peserta Anda</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(assistant)/classes/new' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Buat Kelas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat kelas...</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(assistant)/classes/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <Text style={styles.courseName}>{item.course}</Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              </View>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.cardHint}>Ketuk untuk detail, sesi, dan peserta →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada kelas aktif"
              message="Buat kelas pertama Anda untuk memulai pengelolaan jadwal dan peserta praktikum."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  courseName: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  codeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});

