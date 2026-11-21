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
import { colors, radius, spacing } from '@/theme';

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
          <Text style={styles.loadingText}>Memuat data asisten...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isProcessing = processingId === item.id;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.studentNumber ? (
                      <Text style={styles.studentNumber}>NIM: {item.studentNumber}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, item.isPending ? styles.badgePending : styles.badgeActive]}>
                    <Text style={[styles.badgeText, item.isPending ? styles.badgeTextPending : styles.badgeTextActive]}>
                      {item.isPending ? 'Menunggu' : 'Aktif'}
                    </Text>
                  </View>
                </View>

                {item.isPending ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(item)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.rejectBtnText}>Tolak</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(item)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.approveBtnText}>✓ ACC / Terima</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {activeTab === 'pending'
                  ? 'Tidak ada pendaftaran asisten menunggu ACC'
                  : 'Belum ada asisten praktikum aktif'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'Permohonan akun baru yang mendaftar sebagai asisten akan muncul di sini.'
                  : 'Asisten yang telah disetujui akan ditampilkan pada daftar ini.'}
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
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
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
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  studentNumber: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextPending: { color: '#B45309' },
  badgeTextActive: { color: '#16A34A' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  rejectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  approveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 110,
    alignItems: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 290 },
});
