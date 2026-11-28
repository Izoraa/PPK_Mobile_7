import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing } from '@/theme';
import type { Result } from '@/types';

import { getStudentFines, type StudentFine } from '../studentFinesService';

const statusLabels: Record<StudentFine['status'], string> = {
  unpaid: 'Belum dibayar',
  pending: 'pending', // The shared badge displays “Menunggu”.
  paid: 'Lunas',
  failed: 'Pembayaran gagal',
};

export default function StudentFinesScreen() {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'student') return null;

  return <StudentFinesList key={currentUser.id} studentId={currentUser.id} />;
}

function StudentFinesList({ studentId }: { studentId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<StudentFine[]> | null>(null);

  useEffect(() => {
    let active = true;
    void getStudentFines(studentId).then((fines) => {
      if (active) setResult(fines);
    });
    return () => { active = false; };
  }, [attempt, studentId]);

  function reload() {
    setResult(null);
    setAttempt((value) => value + 1);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const status = !result ? 'loading'
    : !result.ok ? 'error'
    : result.data.length === 0 ? 'empty' : 'ready';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Tagihan Denda</Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.body}>
          Membayar denda keterlambatan tidak mengubah catatan presensi Anda.
        </Text>
      </View>

      <AsyncState
        status={status}
        error={result?.ok === false ? result.error : null}
        onRetry={reload}
        emptyTitle="Belum ada tagihan denda"
        emptyMessage="Tagihan keterlambatan Anda akan muncul di sini."
      >
        <FlatList
          data={result?.ok ? result.data : []}
          keyExtractor={(fine) => fine.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.sessionTitle}>{item.session?.title ?? 'Judul sesi tidak tersedia'}</Text>
              <Text style={styles.body}>
                {item.session?.startsAt?.toLocaleDateString('id-ID', { dateStyle: 'long' })
                  ?? 'Tanggal sesi tidak tersedia'}
              </Text>
              <StatusBadge status={statusLabels[item.status]} size="sm" />
            </View>
          )}
        />
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: 24 },
  pressed: { opacity: 0.7 },
  title: { flex: 1, color: colors.primary, fontSize: 18, fontWeight: '700' },
  notice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
  },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sessionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
