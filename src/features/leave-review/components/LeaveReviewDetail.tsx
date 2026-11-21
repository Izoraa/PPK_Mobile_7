import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { leaveAiStatusLabels, type LeaveReviewMetadata, type LeaveReviewRecord } from '../types';
import { colors, radius, spacing, shadows } from '@/theme';
import { LeaveReviewActions } from './LeaveReviewActions';
import { AiSupportNotice } from '@/features/leave/components/AiSupportNotice';
import { ClassificationRetryButton } from '@/features/leave/components/ClassificationRetryButton';

export interface LeaveReviewDetailProps {
  record: LeaveReviewRecord | null;
  metadata?: LeaveReviewMetadata;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('id-ID') : 'Belum tersedia';
}

function failureMessage(code: string | null) {
  switch (code) {
    case 'AI_TIMEOUT': return 'Klasifikasi melewati batas waktu.';
    case 'AI_INVALID_RESPONSE': return 'Respons klasifikasi tidak dapat divalidasi.';
    case 'AI_UNAVAILABLE_PERMANENT': return 'Konfigurasi layanan AI perlu diperiksa.';
    case 'AI_UNAVAILABLE': return 'Layanan AI sedang tidak tersedia.';
    case 'CONFLICT': return 'Klasifikasi tidak dapat diulang untuk data ini.';
    default: return 'Klasifikasi AI belum tersedia.';
  }
}

export function LeaveReviewDetail({ record, metadata, onClose, onSuccess, onError }: LeaveReviewDetailProps) {
  if (!record) return null;
  const aiAvailable = record.ai.status === 'succeeded';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>Detail Pengajuan Izin</Text>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>Tutup</Text>
              </Pressable>
            </View>

            <View style={styles.profileTile}>
              <Text style={styles.name}>{record.studentName}</Text>
              <Text style={styles.meta}>{record.studentNumber ? `NIM ${record.studentNumber}` : 'NIM tidak tersedia'}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Sesi Praktikum:</Text>
                <Text style={styles.value}>{metadata?.sessionTitle ?? record.sessionId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Kelas:</Text>
                <Text style={styles.value}>{metadata?.className ?? record.classId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Waktu Pengajuan:</Text>
                <Text style={styles.value}>{formatDate(record.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.reasonCard}>
              <Text style={styles.reasonHeading}>Alasan Izin Mahasiswa</Text>
              <Text style={styles.reasonText}>{record.reason}</Text>
            </View>

            <View style={styles.aiCard}>
              <Text style={styles.aiHeading}>Informasi Analisis AI</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>Status: {leaveAiStatusLabels[record.ai.status]}</Text>
              </View>
              {aiAvailable ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Kategori:</Text>
                  <Text style={[styles.value, styles.categoryText]}>{record.ai.category ?? 'Tidak tersedia'}</Text>
                </View>
              ) : null}
              {aiAvailable && record.ai.confidence !== null ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Confidence:</Text>
                  <Text style={styles.value}>{record.ai.confidence}</Text>
                </View>
              ) : null}
              {record.ai.status === 'failed' && record.ai.errorCode ? (
                <Text style={styles.metaError}>{failureMessage(record.ai.errorCode)}</Text>
              ) : null}
              {record.ai.classifiedAt ? <Text style={styles.meta}>Diklasifikasikan: {formatDate(record.ai.classifiedAt)}</Text> : null}
              <ClassificationRetryButton
                sessionId={record.sessionId}
                studentId={record.studentId}
                ai={record.ai}
              />
              <AiSupportNotice />
            </View>

            <LeaveReviewActions record={record} onError={onError} onSuccess={onSuccess} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.lg,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  close: { padding: spacing.xs },
  closeText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  profileTile: {
    backgroundColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  value: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  categoryText: { color: colors.primary, fontWeight: '700' },
  reasonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reasonHeading: { color: colors.text, fontSize: 14, fontWeight: '700' },
  reasonText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiHeading: { color: colors.text, fontSize: 14, fontWeight: '700' },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  aiBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  metaError: { color: colors.dangerText, fontSize: 13 },
});
