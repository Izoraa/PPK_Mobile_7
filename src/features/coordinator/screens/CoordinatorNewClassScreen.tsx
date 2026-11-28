import React, { useEffect, useState } from 'react';
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
import { Picker } from '@expo/ui/community/picker';

import {
  createClassByCoordinator,
  subscribeActiveAssistants,
} from '@/features/coordinator/coordinatorService';
import { colors, radius, spacing } from '@/theme';

export default function CoordinatorNewClassScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [course, setCourse] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState('');
  const [fineAmount, setFineAmount] = useState('');

  const [assistants, setAssistants] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeActiveAssistants((list) => {
      if (!active) return;
      setAssistants(list);
      setLoadingAssistants(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setErrorMsg(null);
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedCourse = course.trim();

    if (!trimmedName || !trimmedCode || !trimmedCourse) {
      setErrorMsg('Nama kelas, kode kelas, dan mata kuliah wajib diisi.');
      return;
    }

    if (!assistantId) {
      setErrorMsg('Silakan pilih asisten pengampu untuk kelas ini.');
      return;
    }

    setSubmitting(true);
    const res = await createClassByCoordinator({
      name: trimmedName,
      code: trimmedCode,
      course: trimmedCourse,
      timeZone,
      assistantId,
      gracePeriodMinutes: Number(gracePeriodMinutes.trim() || NaN),
      fineAmount: Number(fineAmount.trim() || NaN),
    });
    setSubmitting(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg(res.error.message ?? 'Gagal membuka kelas baru. Periksa kembali koneksi Anda.');
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
            <Text style={styles.title}>Buka Kelas Praktikum Baru</Text>
            <Text style={styles.subtitle}>
              Sebagai koordinator, tentukan kelas dan asisten yang bertugas mengampu.
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Nama Kelas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Kelas</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Sistem Operasi B"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Mata Kuliah */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Mata Kuliah</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Sistem Operasi"
              placeholderTextColor={colors.textMuted}
              value={course}
              onChangeText={setCourse}
            />
          </View>

          {/* Kode Kelas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Kode Kelas</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: SO-B-2026"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={setCode}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Toleransi Keterlambatan (menit)</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Toleransi keterlambatan dalam menit"
              inputMode="numeric"
              value={gracePeriodMinutes}
              onChangeText={setGracePeriodMinutes}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Denda Keterlambatan (Rp)</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Denda keterlambatan dalam rupiah"
              inputMode="numeric"
              value={fineAmount}
              onChangeText={setFineAmount}
            />
          </View>

          {/* Asisten Pengampu Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Asisten Pengampu</Text>
            {loadingAssistants ? (
              <View style={[styles.input, styles.loadingRow]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Memuat daftar asisten...</Text>
              </View>
            ) : (
              <Picker
                selectedValue={assistantId}
                onValueChange={(val) => setAssistantId(String(val))}
                style={styles.input}
              >
                <Picker.Item label="Pilih Asisten Pengampu..." value="" />
                {assistants.map((ast, index) => (
                  <Picker.Item key={`${ast.id}_${index}`} label={`${ast.name} (${ast.email})`} value={ast.id} />
                ))}
              </Picker>
            )}
            {assistants.length === 0 && !loadingAssistants ? (
              <Text style={styles.hintWarning}>
                ⚠️ Belum ada asisten aktif. Pastikan Anda telah meng-ACC pendaftaran asisten terlebih dahulu.
              </Text>
            ) : null}
          </View>

          {/* Zona Waktu */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Zona Waktu</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={timeZone}
              editable={false}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Buka Kelas Praktikum</Text>
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
  disabledInput: { backgroundColor: '#F1F5F9', color: colors.textMuted },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontSize: 14, color: colors.textMuted },
  hintWarning: { fontSize: 12, color: '#D97706', marginTop: 4 },
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
