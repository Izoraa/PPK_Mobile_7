import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { TabBarDivider } from '@/components/TabBarDivider';
import {
  archiveClassByCoordinator,
  subscribeActiveAssistants,
  subscribeAllClasses,
} from '@/features/coordinator/coordinatorService';
import type { ClassDoc } from '@/features/practicum';
import { colors, radius, spacing, shadows } from '@/theme';

export default function CoordinatorClassesScreen() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [assistants, setAssistants] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubClasses = subscribeAllClasses((list) => {
      if (!active) return;
      setClasses(list);
      setLoading(false);
    });

    const unsubAssistants = subscribeActiveAssistants((list) => {
      if (!active) return;
      setAssistants(list);
    });

    return () => {
      active = false;
      unsubClasses();
      unsubAssistants();
    };
  }, []);

  const assistantMap = useMemo(() => {
    const map = new Map<string, string>();
    assistants.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [assistants]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q) ||
        (assistantMap.get(c.assistantId) || '').toLowerCase().includes(q),
    );
  }, [classes, searchQuery, assistantMap]);

  const handleArchive = (item: ClassDoc) => {
    Alert.alert(
      'Arsipkan Kelas',
      `Apakah Anda yakin ingin mengarsipkan kelas "${item.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Arsipkan',
          style: 'destructive',
          onPress: async () => {
            const res = await archiveClassByCoordinator(item.id);
            if (!res.ok) {
              Alert.alert('Gagal', 'Tidak dapat mengarsipkan kelas.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Manajemen Kelas</Text>
            <Text style={styles.subtitle}>Buka kelas baru dan tentukan asisten pengampu</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(coordinator)/classes/new' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Kelas Baru</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Cari kelas, kode, atau asisten pengampu…"
          placeholderTextColor="#98A2B3"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat daftar kelas…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClasses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const assistantName = assistantMap.get(item.assistantId) || 'Belum ada asisten';
            return (
              <View style={[styles.card, item.isArchived && styles.cardArchived]}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>
                    {item.isArchived && (
                      <View style={styles.archivedBadge}>
                        <Text style={styles.archivedText}>Diarsipkan</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.courseName}>{item.course}</Text>
                </View>

                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.assistantText}>👨‍🏫 Asisten: {assistantName}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/(coordinator)/classes/${item.id}/edit` as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editBtnText}>Ubah / Pindah Asisten</Text>
                  </TouchableOpacity>

                  {!item.isArchived && (
                    <TouchableOpacity
                      style={styles.archiveBtn}
                      onPress={() => handleArchive(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.archiveBtnText}>Arsipkan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada kelas yang sesuai pencarian.</Text>
            </View>
          }
        />
      )}
      <TabBarDivider />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 14 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardArchived: { opacity: 0.65 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  codeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  codeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  archivedBadge: {
    backgroundColor: colors.neutralBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  archivedText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  courseName: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  className: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  assistantText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editBtn: {
    flex: 1,
    minHeight: 40,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C7D7FE',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  archiveBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBtnText: { color: colors.dangerText, fontWeight: '700', fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
