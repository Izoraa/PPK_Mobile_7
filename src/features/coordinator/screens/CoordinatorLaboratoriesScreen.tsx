import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { TabBarDivider } from '@/components/TabBarDivider';
import {
  deleteLaboratory,
  subscribeLaboratories,
  toggleLaboratoryActive,
} from '@/features/coordinator/coordinatorService';
import type { LaboratoryDoc } from '@/features/coordinator/types';
import { colors, radius, spacing, shadows } from '@/theme';

export default function CoordinatorLaboratoriesScreen() {
  const router = useRouter();
  const [laboratories, setLaboratories] = useState<LaboratoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeLaboratories((list) => {
      if (!active) return;
      setLaboratories(list);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleToggleActive = async (lab: LaboratoryDoc) => {
    setTogglingId(lab.id);
    const res = await toggleLaboratoryActive(lab.id, lab.isActive);
    setTogglingId(null);
    if (!res.ok) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengubah status laboratorium.');
    }
  };

  const handleDelete = (lab: LaboratoryDoc) => {
    Alert.alert(
      'Hapus Laboratorium',
      `Apakah Anda yakin ingin menghapus "${lab.name}"? Ruangan ini tidak akan dapat dipilih lagi pada sesi praktikum.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteLaboratory(lab.id);
            if (!res.ok) {
              Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus laboratorium.');
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
          <View>
            <Text style={styles.title}>Manajemen Ruang / Lab</Text>
            <Text style={styles.subtitle}>Kelola ketersediaan laboratorium untuk praktikum</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(coordinator)/laboratories/new' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Tambah Lab</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat daftar laboratorium...</Text>
        </View>
      ) : (
        <FlatList
          data={laboratories}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isToggling = togglingId === item.id;
            return (
              <View style={[styles.card, !item.isActive && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleGroup}>
                    <Text style={styles.labName}>{item.name}</Text>
                    {item.capacity ? (
                      <Text style={styles.capacityText}>Kapasitas: {item.capacity} mahasiswa</Text>
                    ) : null}
                    {item.description ? (
                      <Text style={styles.descText}>{item.description}</Text>
                    ) : null}
                  </View>

                  <View style={styles.switchGroup}>
                    <Text style={[styles.statusLabel, item.isActive ? styles.statusActive : styles.statusInactive]}>
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </Text>
                    <Switch
                      value={item.isActive}
                      onValueChange={() => handleToggleActive(item)}
                      disabled={isToggling}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push({
                      pathname: '/(coordinator)/laboratories/[labId]/edit' as any,
                      params: { labId: item.id },
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editBtnText}>Ubah</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteBtnText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Belum ada laboratorium</Text>
              <Text style={styles.emptySubtitle}>
                Tambahkan ruang laboratorium agar dapat digunakan saat asisten membuat sesi praktikum.
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
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 14 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardInactive: {
    opacity: 0.7,
    backgroundColor: colors.neutralBg,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleGroup: { flex: 1, marginRight: spacing.sm },
  labName: { fontSize: 17, fontWeight: '700', color: colors.text },
  capacityText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  descText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  switchGroup: { alignItems: 'center', gap: 2 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  statusActive: { color: colors.successText },
  statusInactive: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  editBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C7D7FE',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  deleteBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 13, color: colors.dangerText, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
});
