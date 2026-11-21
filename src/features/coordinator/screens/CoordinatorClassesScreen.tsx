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
import { colors, radius, spacing } from '@/theme';

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
          placeholder="Cari kelas, kode, atau asisten..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat daftar kelas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClasses}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const assistantName = assistantMap.get(item.assistantId) || 'Asisten belum ditetapkan';
            return (
              <View style={[styles.card, item.isArchived && styles.cardArchived]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.courseName}>{item.course}</Text>
                  <View style={[styles.badge, item.isArchived ? styles.badgeArchived : styles.badgeActive]}>
                    <Text style={[styles.badgeText, item.isArchived ? styles.badgeTextArchived : styles.badgeTextActive]}>
                      {item.isArchived ? 'Diarsipkan' : 'Aktif'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.codeText}>Kode: {item.code}</Text>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <View style={styles.assistantInfo}>
                    <Text style={styles.assistantLabel}>Asisten Pengampu:</Text>
                    <Text style={styles.assistantName}>👨‍🏫 {assistantName}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => router.push({
                        pathname: '/(coordinator)/classes/[classId]/edit' as any,
                        params: { classId: item.id },
                      })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editBtnText}>Ubah</Text>
                    </TouchableOpacity>

                    {!item.isArchived ? (
                      <TouchableOpacity
                        style={styles.archiveBtn}
                        onPress={() => handleArchive(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.archiveBtnText}>Arsipkan</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Belum ada kelas praktikum</Text>
              <Text style={styles.emptySubtitle}>
                Klik tombol "+ Kelas Baru" di atas untuk membuka kelas praktikum.
              </Text>
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
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 14 },
  listContent: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardArchived: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  courseName: { fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1 },
  className: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
  codeText: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assistantInfo: { flex: 1 },
  assistantLabel: { fontSize: 11, color: colors.textMuted },
  assistantName: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeArchived: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: '#16A34A' },
  badgeTextArchived: { color: colors.textMuted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  editBtnText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  archiveBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  archiveBtnText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
});
