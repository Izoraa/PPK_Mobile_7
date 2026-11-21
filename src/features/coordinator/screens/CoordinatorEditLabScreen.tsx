import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { updateLaboratory } from '@/features/coordinator/coordinatorService';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { colors, radius, spacing } from '@/theme';

export default function CoordinatorEditLabScreen() {
  const router = useRouter();
  const { labId } = useLocalSearchParams<{ labId: string }>();

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!labId) return;

    const fetchLab = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'laboratories', labId));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || '');
          setCapacity(data.capacity ? String(data.capacity) : '');
          setDescription(data.description || '');
          setIsActive(data.isActive ?? true);
        } else {
          setErrorMsg('Laboratorium tidak ditemukan.');
        }
      } catch (err: any) {
        setErrorMsg('Gagal memuat data laboratorium.');
      } finally {
        setLoading(false);
      }
    };

    fetchLab();
  }, [labId]);

  const handleSubmit = async () => {
    if (!labId) return;
    setErrorMsg(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama laboratorium wajib diisi.');
      return;
    }

    setSubmitting(true);
    const res = await updateLaboratory(labId, {
      name: trimmedName,
      capacity: capacity ? Number(capacity) : undefined,
      description: description.trim() || undefined,
      isActive,
    });
    setSubmitting(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg('Gagal menyimpan perubahan.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Batal</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Ubah Laboratorium</Text>
            <Text style={styles.subtitle}>Perbarui informasi ruangan laboratorium</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Nama Lab */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Laboratorium / Ruangan</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Kapasitas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Kapasitas Mahasiswa (Opsional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          {/* Deskripsi / Lokasi */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Keterangan / Lokasi (Opsional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Status Switch */}
          <View style={[styles.formGroup, styles.switchRow]}>
            <View>
              <Text style={styles.label}>Status Laboratorium</Text>
              <Text style={styles.hintText}>
                {isActive ? 'Aktif (Dapat dipilih untuk sesi)' : 'Nonaktif (Disembunyikan dari pilihan)'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted },
  keyboardView: { flex: 1 },
  scrollContent: { padding: spacing.md },
  header: { marginBottom: spacing.lg },
  backButton: { marginBottom: spacing.xs },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 14 },
  formGroup: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  hintText: { fontSize: 12, color: colors.textMuted },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
