import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { createClass } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';

export default function CreateClassScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [course, setCourse] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!name.trim() || !code.trim() || !course.trim()) {
      setErrorMsg('Semua field wajib diisi.');
      return;
    }

    setLoading(true);
    const result = await createClass({
      name: name.trim(),
      code: code.trim(),
      course: course.trim(),
      timeZone: timeZone.trim(),
    });
    setLoading(false);

    if (result.ok) {
      router.replace(`/(assistant)/classes/${result.data.classId}` as any);
    } else {
      setErrorMsg(result.error.message || 'Gagal membuat kelas.');
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
              <Text style={styles.backText}>← Kembali</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Buat Kelas Praktikum</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Kelas</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Kelas 3A, Kelompok B"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kode Kelas</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: PPK-A-2026"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mata Praktikum</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Pemrograman Perangkat Keras"
              placeholderTextColor={colors.textMuted}
              value={course}
              onChangeText={setCourse}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Zona Waktu</Text>
            <TextInput
              style={styles.input}
              placeholder="Asia/Jakarta"
              placeholderTextColor={colors.textMuted}
              value={timeZone}
              onChangeText={setTimeZone}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Simpan Kelas</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

