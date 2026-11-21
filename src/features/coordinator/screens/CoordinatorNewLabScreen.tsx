import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { createLaboratory } from '@/features/coordinator/coordinatorService';
import { colors, radius, spacing } from '@/theme';

export default function CoordinatorNewLabScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama laboratorium wajib diisi.');
      return;
    }

    setSubmitting(true);
    const res = await createLaboratory({
      name: trimmedName,
      capacity: capacity ? Number(capacity) : undefined,
      description: description.trim() || undefined,
    });
    setSubmitting(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg('Gagal menambahkan laboratorium. Periksa kembali jaringan Anda.');
    }
  };

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
            <Text style={styles.title}>Tambah Ruang / Lab Baru</Text>
            <Text style={styles.subtitle}>
              Ruang lab yang aktif dapat dipilih oleh asisten saat menjadwalkan sesi.
            </Text>
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
              placeholder="Contoh: Lab Komputer 3"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Kapasitas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Kapasitas Mahasiswa (Opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 40"
              placeholderTextColor={colors.textMuted}
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
              placeholder="Contoh: Gedung Bersama Lantai 2 Sayap Barat"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
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
              <Text style={styles.submitText}>Simpan Laboratorium</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
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
