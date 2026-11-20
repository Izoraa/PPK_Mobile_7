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
import { Picker } from '@expo/ui/community/picker';

import {
  subscribeActiveAssistants,
  updateClassByCoordinator,
} from '@/features/coordinator/coordinatorService';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { colors, radius, spacing } from '@/theme';

export default function CoordinatorEditClassScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [course, setCourse] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [isArchived, setIsArchived] = useState(false);

  const [assistants, setAssistants] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssistants, setLoadingAssistants] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubAssistants = subscribeActiveAssistants((list) => {
      if (!active) return;
      setAssistants(list);
      setLoadingAssistants(false);
    });

    return () => {
      active = false;
      unsubAssistants();
    };
  }, []);

  useEffect(() => {
    if (!classId) return;

    const fetchClass = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'classes', classId));
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name ?? '');
          setCode(d.code ?? '');
          setCourse(d.course ?? '');
          setAssistantId(d.assistantId ?? '');
          setTimeZone(d.timeZone ?? 'Asia/Jakarta');
          setIsArchived(Boolean(d.isArchived));
        } else {
          setErrorMsg('Kelas tidak ditemukan.');
        }
      } catch (err: any) {
        setErrorMsg('Gagal memuat data kelas.');
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [classId]);

  const handleSubmit = async () => {
    if (!classId) return;
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
    const res = await updateClassByCoordinator(classId, {
      name: trimmedName,
      code: trimmedCode,
      course: trimmedCourse,
      assistantId,
      timeZone,
      isArchived,
    });
    setSubmitting(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg('Gagal menyimpan perubahan kelas. Periksa koneksi Anda.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat data kelas...</Text>
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
            <Text style={styles.title}>Ubah Kelas Praktikum</Text>
            <Text style={styles.subtitle}>
              Perbarui informasi kelas atau ganti asisten pengampu praktikum.
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

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
                {assistants.map((ast) => (
                  <Picker.Item key={ast.id} label={`${ast.name} (${ast.email})`} value={ast.id} />
                ))}
              </Picker>
            )}
          </View>

          {/* Status Arsip Switch */}
          <View style={styles.switchGroup}>
            <View style={styles.switchInfo}>
              <Text style={styles.label}>Status Kelas</Text>
              <Text style={styles.switchDesc}>
                {isArchived ? 'Kelas diarsipkan (tidak aktif)' : 'Kelas aktif dan dapat digunakan'}
              </Text>
            </View>
            <Switch
              value={!isArchived}
              onValueChange={(active) => setIsArchived(!active)}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  keyboardView: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.xs, paddingVertical: spacing.xs },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  formGroup: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  switchInfo: { flex: 1, paddingRight: spacing.md },
  switchDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
