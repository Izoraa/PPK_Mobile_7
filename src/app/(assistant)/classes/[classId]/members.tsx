import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  subscribeMembers,
  upsertMembership,
  type MembershipDoc,
} from '@/features/practicum';
import { colors, radius, spacing } from '@/theme';
import EmptyState from '@/components/common/EmptyState';

export default function ClassMembersScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [members, setMembers] = useState<MembershipDoc[]>([]);
  const [studentUid, setStudentUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;

    const unsubscribe = subscribeMembers(
      classId,
      (list) => {
        setMembers(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing members:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classId]);

  const handleAddMember = async () => {
    if (!classId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const uid = studentUid.trim();
    if (!uid) {
      setErrorMsg('Masukkan UID praktikan.');
      return;
    }

    setSubmitting(true);
    const res = await upsertMembership({
      classId,
      studentId: uid,
      isActive: true,
    });
    setSubmitting(false);

    if (res.ok) {
      setStudentUid('');
      setSuccessMsg('Praktikan berhasil ditambahkan ke kelas.');
    } else {
      setErrorMsg(res.error.message || 'Gagal menambahkan praktikan.');
    }
  };

  const handleToggleActive = async (member: MembershipDoc) => {
    if (!classId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await upsertMembership({
      classId,
      studentId: member.studentId,
      isActive: !member.isActive,
    });

    if (!res.ok) {
      setErrorMsg(res.error.message || 'Gagal mengubah status peserta.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Kembali ke Kelas</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Kelola Peserta Kelas</Text>
          <Text style={styles.subtitle}>
            Tambahkan praktikan terdaftar menggunakan UID akun mereka.
          </Text>
        </View>

        <View style={styles.addSection}>
          <Text style={styles.inputLabel}>Tambah Praktikan Baru</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Tempel UID praktikan (dari menu Akun)"
              placeholderTextColor={colors.textMuted}
              value={studentUid}
              onChangeText={setStudentUid}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.addButton, submitting && styles.disabledButton]}
              onPress={handleAddMember}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.addButtonText}>Tambah</Text>
              )}
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.listHeader}>Daftar Peserta Terdaftar ({members.length})</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.memberCard, !item.isActive && styles.inactiveCard]}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.studentName || 'Nama belum tersedia'}</Text>
                  <Text style={styles.memberSub}>
                    NIM: {item.studentNumber || '-'} • UID: {item.studentId.substring(0, 8)}...
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.isActive ? colors.success : colors.danger },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.isActive ? colors.success : colors.danger },
                      ]}
                    >
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    item.isActive ? styles.deactivateBtn : styles.activateBtn,
                  ]}
                  onPress={() => handleToggleActive(item)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      item.isActive ? styles.deactivateText : styles.activateText,
                    ]}
                  >
                    {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                title="Belum ada peserta"
                message="Minta praktikan menyalin UID mereka dari menu Akun dan masukkan di formulir atas."
              />
            }
          />
        )}
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
  header: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  addSection: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  listHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  memberInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  memberSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deactivateBtn: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  deactivateText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  activateBtn: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  activateText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '500',
  },
});
