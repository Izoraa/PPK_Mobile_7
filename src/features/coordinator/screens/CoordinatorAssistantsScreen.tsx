import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabBarDivider } from '@/components/TabBarDivider';
import {
  approveAssistant,
  rejectAssistant,
  subscribeAssistants,
} from '@/features/coordinator/coordinatorService';
import type { AssistantUser } from '@/features/coordinator/types';
import { colors, radius, spacing, shadows } from '@/theme';

export default function CoordinatorAssistantsScreen() {
  const [assistants, setAssistants] = useState<AssistantUser[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAssistants((list) => {
      if (!active) return;
      setAssistants(list);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const pendingList = useMemo(() => assistants.filter((a) => a.isPending), [assistants]);
  const activeList = useMemo(() => assistants.filter((a) => !a.isPending && a.role === 'assistant'), [assistants]);

  const handleApprove = async (user: AssistantUser) => {
    Alert.alert(
      'ACC Pendaftaran Asisten',
      `Setujui pendaftaran ${user.name} sebagai Asisten Praktikum?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui (ACC)',
          onPress: async () => {
            setProcessingId(user.id);
            const res = await approveAssistant(user.id);
            setProcessingId(null);
            if (!res.ok) {
              Alert.alert('Gagal', 'Terjadi kesalahan saat menyetujui asisten.');
            }
          },
        },
      ],
    );
  };

  const handleReject = async (user: AssistantUser) => {
    Alert.alert(
      'Tolak Pendaftaran Asisten',
      `Tolak permohonan asisten untuk ${user.name}? Akun akan tetap sebagai praktikan biasa.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tolak',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(user.id);
            const res = await rejectAssistant(user.id);
            setProcessingId(null);
            if (!res.ok) {
              Alert.alert('Gagal', 'Terjadi kesalahan saat menolak pendaftaran.');
            }
          },
        },
      ],
    );
  };

  const currentData = activeTab === 'pending' ? pendingList : activeList;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Manajemen Asisten</Text>
        <Text style={styles.subtitle}>Verifikasi pendaftaran dan daftar asisten aktif laboratorium</Text>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Menunggu ACC ({pendingList.length})
            </Text>
            {pendingList.length > 0 ? <View style={styles.pendingDot} /> : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Asisten Aktif ({activeList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data asisten…</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isProcessing = processingId === item.id;
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() ?? 'A'}</Text>
                  </View>
                  <View style={styles.identity}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.studentNumber ? (
                      <Text style={styles.nim}>NIM: {item.studentNumber}</Text>
                    ) : null}
                  </View>
                </View>

                {item.isPending ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(item)}
                      disabled={isProcessing}
                      activeOpacity={0.8}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>✓ Setujui (ACC)</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(item)}
                      disabled={isProcessing}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectBtnText}>Tolak</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.activeTagRow}>
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>✓ Asisten Terdaftar</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'pending'
                  ? 'Tidak ada permohonan asisten yang menunggu ACC.'
                  : 'Belum ada asisten praktikum yang aktif.'}
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
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textMuted },
  tabContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.neutralBg,
    padding: 4,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
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
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C7D7FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  nim: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  approveBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { color: colors.dangerText, fontWeight: '700', fontSize: 13 },
  activeTagRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  activeTagText: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
