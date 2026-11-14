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
import { updateSession, archiveSession, type SessionDoc } from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { StatusBadge } from '@/components/common/StatusBadge';

export default function EditSessionScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [dateStr, setDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        if (snap.exists()) {
          const d = snap.data();
          const sess: SessionDoc = {
            id: snap.id,
            classId: d.classId ?? '',
            assistantId: d.assistantId ?? '',
            title: d.title ?? '',
            room: d.room ?? '',
            startsAt: d.startsAt,
            endsAt: d.endsAt,
            timeZone: d.timeZone ?? 'Asia/Jakarta',
            status: d.status ?? 'not_open',
            isArchived: Boolean(d.isArchived),
            openedAt: d.openedAt ?? null,
            closedAt: d.closedAt ?? null,
            createdAt: d.createdAt ?? null,
            updatedAt: d.updatedAt ?? null,
          };
          setSession(sess);
          setTitle(sess.title);
          setRoom(sess.room);
          setTimeZone(sess.timeZone);

          if (sess.startsAt?.toDate) {
            const sDate = sess.startsAt.toDate();
            setDateStr(sDate.toISOString().split('T')[0]);
            setStartTimeStr(sDate.toTimeString().substring(0, 5));
          }
          if (sess.endsAt?.toDate) {
            const eDate = sess.endsAt.toDate();
            setEndTimeStr(eDate.toTimeString().substring(0, 5));
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat sesi.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleSave = async () => {
    if (!sessionId || !session) return;
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    const trimmedRoom = room.trim();

    if (!trimmedTitle || !trimmedRoom) {
      setErrorMsg('Judul dan ruangan wajib diisi.');
      return;
    }

    const startsAt = new Date(`${dateStr.trim()}T${startTimeStr.trim()}:00`);
    const endsAt = new Date(`${dateStr.trim()}T${endTimeStr.trim()}:00`);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      setErrorMsg('Format tanggal atau jam tidak valid.');
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setErrorMsg('Waktu selesai harus sesudah waktu mulai.');
      return;
    }

    setSaving(true);
    const res = await updateSession(sessionId, {
      title: trimmedTitle,
      room: trimmedRoom,
      startsAt,
      endsAt,
      timeZone: timeZone.trim(),
    });
    setSaving(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg(res.error.message || 'Gagal memperbarui sesi.');
    }
  };

  const handleArchive = async () => {
    if (!sessionId) return;
    setShowArchiveModal(false);
    setSaving(true);
    const res = await archiveSession(sessionId);
    setSaving(false);

    if (res.ok) {
      router.replace('/(assistant)/classes' as any);
    } else {
      setErrorMsg(res.error.message || 'Gagal mengarsipkan sesi.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centerContainer}>
        <Text style={styles.errorText}>Sesi tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLocked = session.status !== 'not_open';

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
            <View style={styles.titleRow}>
              <Text style={styles.title}>Ubah Sesi Praktikum</Text>
              <StatusBadge status={session.status} />
            </View>
          </View>

          {isLocked ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedTitle}>Perubahan Metadata Terkunci</Text>
              <Text style={styles.lockedText}>
                Sesi yang sudah dibuka atau ditutup tidak dapat diubah metadatanya agar bukti catatan riwayat presensi tetap konsisten.
              </Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Judul / Pertemuan</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              value={title}
              onChangeText={setTitle}
              editable={!isLocked}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ruangan / Laboratorium</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              value={room}
              onChangeText={setRoom}
              editable={!isLocked}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              value={dateStr}
              onChangeText={setDateStr}
              editable={!isLocked}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
              <TextInput
                style={[styles.input, isLocked && styles.disabledInput]}
                value={startTimeStr}
                onChangeText={setStartTimeStr}
                editable={!isLocked}
              />
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
              <TextInput
                style={[styles.input, isLocked && styles.disabledInput]}
                value={endTimeStr}
                onChangeText={setEndTimeStr}
                editable={!isLocked}
              />
            </View>
          </View>

          {!isLocked ? (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Simpan Perubahan Sesi</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.archiveButton, session.status === 'open' && styles.disabledButton]}
            onPress={() => {
              if (session.status === 'open') {
                setErrorMsg('Sesi yang sedang dibuka harus ditutup terlebih dahulu sebelum dapat diarsipkan.');
              } else {
                setShowArchiveModal(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.archiveText}>Arsipkan Sesi Ini</Text>
          </TouchableOpacity>
          <Text style={styles.archiveHint}>
            Sesi yang diarsipkan akan dihapus dari daftar aktif. Riwayat dan izin yang sudah ada tetap tersimpan.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showArchiveModal}
        title="Arsipkan Sesi?"
        message="Sesi akan disembunyikan dari daftar aktif. Presensi dan izin yang tercatat tidak akan dihapus."
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
    marginBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  lockedBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  lockedText: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
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
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: colors.textMuted,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
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

