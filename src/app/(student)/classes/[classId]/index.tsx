import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase/client';
import {
  subscribeSessions,
  type ClassDoc,
  type SessionDoc,
} from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AsyncState } from '@/components/common/AsyncState';
import EmptyState from '@/components/common/EmptyState';
import type { AppErrorCode } from '@/types';

export default function StudentClassDetailScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [classData, setClassData] = useState<ClassDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<{ code: AppErrorCode; retryable: boolean } | null>(null);
  const [metadata, setMetadata] = useState({ fromCache: false, hasPendingWrites: false });

  useEffect(() => {
    if (!classId || typeof classId !== 'string') {
      setClassData(null);
      setStatus('ready');
      return;
    }

    let active = true;
    let failed = false;
    let classLoaded = false;
    let sessionsLoaded = false;
    setStatus('loading');
    setError(null);
    const db = getFirebaseFirestore();

    const fail = (loadError: Error) => {
      if (!active || failed) return;
      failed = true;
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
    };

    const fetchClass = async () => {
      try {
        const snap = await getDoc(doc(db, 'classes', classId));
        if (!active || failed) return;
        if (snap.exists()) {
          const d = snap.data();
          setClassData({
            id: snap.id,
            name: d.name ?? '',
            code: d.code ?? '',
            course: d.course ?? '',
            timeZone: d.timeZone ?? 'Asia/Jakarta',
            assistantId: d.assistantId ?? '',
            isArchived: Boolean(d.isArchived),
            createdAt: d.createdAt ?? null,
            updatedAt: d.updatedAt ?? null,
          });
        } else {
          setClassData(null);
        }
        setMetadata((previous) => ({
          fromCache: previous.fromCache || snap.metadata.fromCache,
          hasPendingWrites: previous.hasPendingWrites || snap.metadata.hasPendingWrites,
        }));
        classLoaded = true;
        if (sessionsLoaded) setStatus('ready');
      } catch (loadError) {
        fail(loadError instanceof Error ? loadError : new Error('SERVICE_UNAVAILABLE'));
      }
    };

    const unsubscribe = subscribeSessions(
      classId,
      (list) => {
        if (!active || failed) return;
        setSessions(list);
        sessionsLoaded = true;
        if (classLoaded) setStatus('ready');
      },
      fail,
      (snapshotMetadata) => {
        if (!active || failed) return;
        setMetadata((previous) => ({
          fromCache: previous.fromCache || snapshotMetadata.fromCache,
          hasPendingWrites: previous.hasPendingWrites || snapshotMetadata.hasPendingWrites,
        }));
      },
    );
    void fetchClass();

    return () => { active = false; unsubscribe(); };
  }, [classId, attempt]);

  if (status !== 'ready' || !classData) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <AsyncState
          status={status === 'ready' ? 'empty' : status}
          error={error}
          fromCache={metadata.fromCache}
          hasPendingWrites={metadata.hasPendingWrites}
          onRetry={() => setAttempt((value) => value + 1)}
          emptyTitle="Kelas tidak ditemukan"
          emptyMessage="Kelas ini tidak tersedia di akun Anda."
        >
          <View />
        </AsyncState>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Kembali ke Beranda</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Kembali ke Beranda</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{classData.name}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{classData.code}</Text>
          </View>
        </View>
        <Text style={styles.courseSubtitle}>{classData.course}</Text>
        {metadata.fromCache ? (
          <Text style={styles.metadataNotice}>Menampilkan data tersimpan; belum terverifikasi dari server.</Text>
        ) : null}
        {metadata.hasPendingWrites ? (
          <Text style={styles.metadataNotice}>Perubahan sedang disinkronkan.</Text>
        ) : null}
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionHeader}>Daftar Sesi Praktikum ({sessions.length})</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => router.push(`/(student)/sessions/${item.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionTitle}>{item.title}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.sessionRoom}>Ruang: {item.room}</Text>
            <Text style={styles.sessionTime}>
              {item.startsAt?.toDate ? item.startsAt.toDate().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }) : ''}
            </Text>
            <View style={styles.sessionCardFooter}>
              <Text style={styles.sessionHint}>
                {item.status === 'open' ? 'Buka sesi untuk presensi →' : 'Lihat detail sesi →'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada sesi"
            message="Belum ada sesi praktikum yang dijadwalkan untuk kelas ini."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
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
  courseSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  metadataNotice: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionRoom: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sessionCardFooter: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
});
