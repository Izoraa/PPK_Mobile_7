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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { createSession } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';

export default function CreateSessionScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');

  // Dates: default to today 08:00 to 10:00
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(todayStr); // YYYY-MM-DD
  const [startTimeStr, setStartTimeStr] = useState('08:00'); // HH:mm
  const [endTimeStr, setEndTimeStr] = useState('10:00'); // HH:mm

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!classId) return;
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    const trimmedRoom = room.trim();

    if (!trimmedTitle || !trimmedRoom) {
      setErrorMsg('Judul sesi dan ruangan wajib diisi.');
      return;
    }

    // Parse start and end Date
    const startsAt = new Date(`${dateStr.trim()}T${startTimeStr.trim()}:00`);
    const endsAt = new Date(`${dateStr.trim()}T${endTimeStr.trim()}:00`);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      setErrorMsg('Format tanggal atau jam tidak valid (gunakan YYYY-MM-DD dan HH:mm).');
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setErrorMsg('Waktu selesai harus sesudah waktu mulai.');
      return;
    }

    setLoading(true);
    const result = await createSession({
      classId,
      title: trimmedTitle,
      room: trimmedRoom,
      startsAt,
      endsAt,
      timeZone: timeZone.trim(),
    });
    setLoading(false);

    if (result.ok) {
      router.back();
    } else {
      setErrorMsg(result.error.message || 'Gagal membuat sesi.');
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
            <Text style={styles.title}>Tambah Sesi Praktikum</Text>
            <Text style={styles.subtitle}>Sesi baru akan dibuat dengan status Belum Dibuka.</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Judul / Pertemuan</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Pertemuan 1 - Pengenalan Modul"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ruangan / Laboratorium</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Lab Komputer 3"
              placeholderTextColor={colors.textMuted}
              value={room}
              onChangeText={setRoom}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-11-20"
              placeholderTextColor={colors.textMuted}
              value={dateStr}
              onChangeText={setDateStr}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
              <TextInput
                style={styles.input}
                placeholder="08:00"
                placeholderTextColor={colors.textMuted}
                value={startTimeStr}
                onChangeText={setStartTimeStr}
              />
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                value={endTimeStr}
                onChangeText={setEndTimeStr}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Zona Waktu</Text>
            <TextInput
              style={styles.input}
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
              <Text style={styles.submitText}>Simpan Sesi</Text>
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
    marginBottom: spacing.xs,
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
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
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
    marginTop: spacing.md,
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

