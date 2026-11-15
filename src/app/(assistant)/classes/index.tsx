import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useApp } from '@/state/AppContext';
import { subscribeClasses, type ClassDoc } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import { AsyncState } from '@/components/common/AsyncState';
import type { AppErrorCode } from '@/types';

export default function AssistantClassesScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<{ code: AppErrorCode; retryable: boolean } | null>(null);
  const [metadata, setMetadata] = useState({ fromCache: false, hasPendingWrites: false });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'assistant') {
      setClasses([]);
      setStatus('ready');
      return;
    }

    let active = true;
    setStatus('loading');
    setError(null);
    const unsubscribe = subscribeClasses(
      { assistantId: currentUser.id, includeArchived: false },
      (list) => {
        if (!active) return;
        setClasses(list);
      },
      (loadError) => {
        if (!active) return;
        const code = 'code' in loadError ? String(loadError.code) : '';
        const mapped = code === 'permission-denied'
          ? { code: 'FORBIDDEN' as const, retryable: false }
          : code === 'unauthenticated'
            ? { code: 'UNAUTHENTICATED' as const, retryable: false }
            : code === 'unavailable' || code === 'deadline-exceeded'
              ? { code: 'NETWORK_ERROR' as const, retryable: true }
              : { code: 'SERVICE_UNAVAILABLE' as const, retryable: true };
        setError(mapped);
        setStatus('error');
      },
      (snapshotMetadata) => {
        if (!active) return;
        setMetadata(snapshotMetadata);
        setStatus('ready');
      },
    );

    return () => { active = false; unsubscribe(); };
  }, [currentUser, attempt]);

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

      <AsyncState
        status={status === 'ready' && classes.length === 0 ? 'empty' : status}
        error={error}
        fromCache={metadata.fromCache}
        hasPendingWrites={metadata.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle="Belum ada kelas aktif"
        emptyMessage="Buat kelas pertama Anda untuk memulai pengelolaan jadwal dan peserta praktikum."
      >
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
        />
      </AsyncState>
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

