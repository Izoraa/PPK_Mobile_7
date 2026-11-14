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
import EmptyState from '@/components/common/EmptyState';

export default function AssistantClassDetailScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [classData, setClassData] = useState<ClassDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const db = getFirebaseFirestore();
    const fetchClass = async () => {
      try {
        const snap = await getDoc(doc(db, 'classes', classId));
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
        }
      } catch (err) {
        console.error('Error fetching class:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClass();

    const unsubscribe = subscribeSessions(
      classId,
      (list) => setSessions(list),
      (err) => console.error('Error subscribing sessions:', err)
    );

    return () => unsubscribe();
  }, [classId]);

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <Text style={styles.errorText}>Kelas tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Kembali ke Daftar Kelas</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(assistant)/classes' as any)} style={styles.backButton}>
          <Text style={styles.backText}>← Semua Kelas</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{classData.name}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{classData.code}</Text>
          </View>
        </View>
        <Text style={styles.courseSubtitle}>{classData.course}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => router.push(`/(assistant)/classes/${classId}/edit` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionOutlineText}>Ubah Kelas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => router.push(`/(assistant)/classes/${classId}/members` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionOutlineText}>Kelola Peserta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPrimaryBtn}
            onPress={() => router.push(`/(assistant)/classes/${classId}/sessions/new` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionPrimaryText}>+ Sesi</Text>
          </TouchableOpacity>
        </View>
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
            onPress={() => router.push(`/(assistant)/assistant/sessions/${item.id}` as any)}
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
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada sesi"
            message="Tambahkan sesi praktikum untuk mulai membuka absensi mahasiswa."
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionOutlineBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  actionOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  actionPrimaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  errorText: {
    fontSize: 16,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
