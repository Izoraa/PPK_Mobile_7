import React, { useEffect, useState } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase/client';
import { updateClass, archiveClass, type ClassDoc } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import { ConfirmModal } from '@/components/common/ConfirmModal';

export default function EditClassScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [course, setCourse] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

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
          setTimeZone(d.timeZone ?? 'Asia/Jakarta');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat detail kelas.');
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [classId]);

  const handleSave = async () => {
    if (!classId) return;
    setErrorMsg(null);

    if (!name.trim() || !code.trim() || !course.trim()) {
      setErrorMsg('Semua field wajib diisi.');
      return;
    }

    setSaving(true);
    const res = await updateClass(classId, {
      name: name.trim(),
      code: code.trim(),
      course: course.trim(),
      timeZone: timeZone.trim(),
    });
    setSaving(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg(res.error.message || 'Gagal memperbarui kelas.');
    }
  };

  const handleArchive = async () => {
    if (!classId) return;
    setShowArchiveModal(false);
    setSaving(true);
    const res = await archiveClass(classId);
    setSaving(false);

    if (res.ok) {
      router.replace('/(assistant)/classes' as any);
    } else {
      setErrorMsg(res.error.message || 'Gagal mengarsipkan kelas.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kode Kelas</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mata Praktikum</Text>
            <TextInput
              style={styles.input}
              value={course}
              onChangeText={setCourse}
            />
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
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.archiveButton}
            onPress={() => setShowArchiveModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.archiveText}>Arsipkan Kelas Ini</Text>
          </TouchableOpacity>
          <Text style={styles.archiveHint}>
            Kelas yang diarsipkan tidak akan muncul di daftar aktif, namun bukti riwayat dan kehadiran tetap tersimpan.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showArchiveModal}
        title="Arsipkan Kelas?"
        message="Kelas yang diarsipkan tidak dapat menerima sesi atau presensi baru. Anda tetap dapat melihat riwayatnya."
        confirmLabel="Ya, Arsipkan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  archiveButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  archiveText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  archiveHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

