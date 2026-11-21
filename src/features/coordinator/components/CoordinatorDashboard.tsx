import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { TabBarDivider } from '@/components/TabBarDivider';
import {
  approveAssistant,
  subscribeActiveAssistants,
  subscribeAllClasses,
  subscribeAssistants,
  subscribeLaboratories,
} from '@/features/coordinator/coordinatorService';
import type { AssistantUser, LaboratoryDoc } from '@/features/coordinator/types';
import type { ClassDoc } from '@/features/practicum';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing, shadows } from '@/theme';

export default function CoordinatorDashboard() {
  const router = useRouter();
  const { currentUser } = useApp();

  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [assistants, setAssistants] = useState<AssistantUser[]>([]);
  const [activeAssistantsList, setActiveAssistantsList] = useState<Array<{ id: string; name: string }>>([]);
  const [laboratories, setLaboratories] = useState<LaboratoryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubClasses = subscribeAllClasses((list) => {
      if (!active) return;
      setClasses(list);
      setLoading(false);
    });

    const unsubAssistants = subscribeAssistants((list) => {
      if (!active) return;
      setAssistants(list);
    });

    const unsubActiveAssistants = subscribeActiveAssistants((list) => {
      if (!active) return;
      setActiveAssistantsList(list);
    });

    const unsubLabs = subscribeLaboratories((list) => {
      if (!active) return;
      setLaboratories(list);
    });

    return () => {
      active = false;
      unsubClasses();
      unsubAssistants();
      unsubActiveAssistants();
      unsubLabs();
    };
  }, []);

  const assistantMap = useMemo(() => {
    const map = new Map<string, string>();
    activeAssistantsList.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [activeAssistantsList]);

  const activeClasses = useMemo(() => classes.filter((c) => !c.isArchived), [classes]);
  const pendingAssistants = useMemo(() => assistants.filter((a) => a.isPending), [assistants]);
  const activeAssistants = useMemo(() => assistants.filter((a) => !a.isPending && a.role === 'assistant'), [assistants]);
  const activeLabs = useMemo(() => laboratories.filter((l) => l.isActive), [laboratories]);

  const handleQuickApprove = async (id: string) => {
    await approveAssistant(id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>LABCHECKIN</Text>
          </View>
          <Text style={styles.title}>Dashboard Koordinator</Text>
          <Text style={styles.userName}>{currentUser?.name} • Administrator Lab</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(coordinator)/classes/new' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Buka Kelas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat statistik laboratorium…</Text>
        </View>
      ) : (
        <FlatList
          data={activeClasses}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              {/* 4 Stat Cards */}
              <View style={styles.statsGrid}>
                {/* Total Kelas */}
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => router.push('/(tabs)/coordinator-classes' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.statNumber}>{activeClasses.length}</Text>
                  <Text style={styles.statLabel}>Kelas Aktif</Text>
                  <Text style={styles.statHint}>Kelola Kelas →</Text>
                </TouchableOpacity>

                {/* Pending Asisten */}
                <TouchableOpacity
                  style={[styles.statCard, pendingAssistants.length > 0 && styles.statCardWarning]}
                  onPress={() => router.push('/(tabs)/coordinator-assistants' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.statNumber, pendingAssistants.length > 0 && styles.statNumberWarning]}>
                    {pendingAssistants.length}
                  </Text>
                  <Text style={styles.statLabel}>Menunggu ACC</Text>
                  <Text style={[styles.statHint, pendingAssistants.length > 0 && styles.statHintWarning]}>
                    {pendingAssistants.length > 0 ? 'Perlu Disetujui ⚠️' : 'Semua Beres ✓'}
                  </Text>
                </TouchableOpacity>

                {/* Asisten Aktif */}
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => router.push('/(tabs)/coordinator-assistants' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.statNumber}>{activeAssistants.length}</Text>
                  <Text style={styles.statLabel}>Asisten Aktif</Text>
                  <Text style={styles.statHint}>Daftar Asisten →</Text>
                </TouchableOpacity>

                {/* Ruang Lab */}
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => router.push('/(tabs)/coordinator-laboratories' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.statNumber}>{activeLabs.length}</Text>
                  <Text style={styles.statLabel}>Ruang Lab Aktif</Text>
                  <Text style={styles.statHint}>Kelola Ruangan →</Text>
                </TouchableOpacity>
              </View>

              {/* Pending Approvals Quick Section */}
              {pendingAssistants.length > 0 && (
                <View style={styles.pendingSection}>
                  <View style={styles.pendingSectionHeader}>
                    <Text style={styles.pendingSectionTitle}>
                      ⚠️ Permohonan Akun Asisten ({pendingAssistants.length})
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/coordinator-assistants' as any)}
                    >
                      <Text style={styles.seeAllText}>Lihat Semua →</Text>
                    </TouchableOpacity>
                  </View>
                  {pendingAssistants.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.pendingItem}>
                      <View style={styles.pendingItemInfo}>
                        <Text style={styles.pendingItemName}>{item.name}</Text>
                        <Text style={styles.pendingItemEmail}>{item.email}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.quickApproveBtn}
                        onPress={() => handleQuickApprove(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickApproveText}>ACC Cepat</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionHeader}>Daftar Kelas Praktikum Aktif</Text>
            </View>
          }
          renderItem={({ item }) => {
            const assistantName = assistantMap.get(item.assistantId) || 'Belum ditentukan';
            return (
              <View style={styles.classCard}>
                <View style={styles.classCardTop}>
                  <Text style={styles.courseName}>{item.course}</Text>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                </View>
                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.assistantText}>👨‍🏫 Asisten Pengampu: {assistantName}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada kelas praktikum yang dibuka.</Text>
            </View>
          }
        />
      )}
      <TabBarDivider />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  userName: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 14 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statCardWarning: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  statNumber: { fontSize: 26, fontWeight: '800', color: colors.primary },
  statNumberWarning: { color: colors.warningText },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statHint: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  statHintWarning: { color: colors.warningText },

  // Pending Section
  pendingSection: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    marginBottom: spacing.lg,
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pendingSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.warningText },
  seeAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingItemInfo: { flex: 1 },
  pendingItemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  pendingItemEmail: { fontSize: 12, color: colors.textMuted },
  quickApproveBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  quickApproveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Class list
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  classCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  courseName: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  codeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  codeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  className: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  assistantText: { fontSize: 13, color: colors.textMuted },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
