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
import { colors, radius, spacing } from '@/theme';

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
          <Text style={styles.title}>Dashboard Koordinator</Text>
          <Text style={styles.userName}>{currentUser?.name} • Admin Lab</Text>
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
          <Text style={styles.loadingText}>Memuat statistik laboratorium...</Text>
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
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{activeClasses.length}</Text>
                  <Text style={styles.statLabel}>Kelas Aktif</Text>
                  <Text style={styles.statHint}>Kelola Kelas →</Text>
                </TouchableOpacity>

                {/* Pending Asisten */}
                <TouchableOpacity
                  style={[styles.statCard, pendingAssistants.length > 0 && styles.statCardWarning]}
                  onPress={() => router.push('/(tabs)/coordinator-assistants' as any)}
                  activeOpacity={0.7}
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
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{activeAssistants.length}</Text>
                  <Text style={styles.statLabel}>Asisten Aktif</Text>
                  <Text style={styles.statHint}>Daftar Asisten →</Text>
                </TouchableOpacity>

                {/* Ruang Lab */}
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => router.push('/(tabs)/coordinator-laboratories' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{activeLabs.length}</Text>
                  <Text style={styles.statLabel}>Ruang Lab Aktif</Text>
                  <Text style={styles.statHint}>Kelola Lab →</Text>
                </TouchableOpacity>
              </View>

              {/* Notifikasi Asisten Pending (Jika Ada) */}
              {pendingAssistants.length > 0 ? (
                <View style={styles.pendingSection}>
                  <View style={styles.pendingSectionHeader}>
                    <Text style={styles.pendingSectionTitle}>
                      ⚠️ Pendaftaran Asisten Butuh ACC ({pendingAssistants.length})
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/coordinator-assistants' as any)}
                    >
                      <Text style={styles.seeAllText}>Lihat Semua</Text>
                    </TouchableOpacity>
                  </View>

                  {pendingAssistants.slice(0, 3).map((item, index) => (
                    <View key={`${item.id}_${index}`} style={styles.pendingItem}>
                      <View style={styles.pendingItemInfo}>
                        <Text style={styles.pendingItemName}>{item.name}</Text>
                        <Text style={styles.pendingItemEmail}>{item.email}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.quickApproveBtn}
                        onPress={() => handleQuickApprove(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickApproveText}>✓ ACC</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={styles.sectionHeader}>Daftar Seluruh Kelas Praktikum ({activeClasses.length})</Text>
            </View>
          }
          renderItem={({ item }) => {
            const assistantName = assistantMap.get(item.assistantId) || 'Asisten belum ditetapkan';
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
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  userName: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  statNumber: { fontSize: 26, fontWeight: '700', color: colors.text },
  statNumberWarning: { color: '#D97706' },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statHint: { fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  statHintWarning: { color: '#D97706' },

  // Pending Section
  pendingSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: spacing.lg,
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pendingSectionTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  seeAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 6,
  },
  pendingItemInfo: { flex: 1 },
  pendingItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  pendingItemEmail: { fontSize: 12, color: colors.textMuted },
  quickApproveBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  quickApproveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Class list
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  classCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  courseName: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  codeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: { fontSize: 11, fontWeight: '600', color: colors.text },
  className: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  assistantText: { fontSize: 13, color: colors.textMuted },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
