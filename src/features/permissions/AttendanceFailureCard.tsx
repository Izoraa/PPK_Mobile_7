import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export type FailureReason =
  | 'network'
  | 'location_failed'
  | 'qr_invalid'
  | 'server_error';

interface AttendanceFailureCardProps {
  reason: FailureReason;
  customMessage?: string;
  isRetrying?: boolean;
  onRetry: () => void;
  onCancel?: () => void;
}

const FAILURE_DETAILS: Record<FailureReason, { title: string; defaultMessage: string }> = {
  network: {
    title: 'Gangguan Koneksi Jaringan',
    defaultMessage: 'Koneksi internet bermasalah atau waktu permintaan habis. Presensi Anda belum tersimpan di server.',
  },
  location_failed: {
    title: 'Koordinat Lokasi Tidak Terbaca',
    defaultMessage: 'Gagal memperoleh koordinat GPS yang akurat dari perangkat. Presensi tidak dapat diproses tanpa lokasi valid.',
  },
  qr_invalid: {
    title: 'Kode QR Tidak Valid',
    defaultMessage: 'Kode QR yang dipindai tidak sesuai dengan sesi ini atau masa berlakunya telah habis.',
  },
  server_error: {
    title: 'Layanan Sedang Bermasalah',
    defaultMessage: 'Server belum dapat mengonfirmasi kehadiran Anda saat ini. Tidak ada data presensi tidak valid yang tercatat.',
  },
};

export function AttendanceFailureCard({
  reason,
  customMessage,
  isRetrying = false,
  onRetry,
  onCancel,
}: AttendanceFailureCardProps) {
  const info = FAILURE_DETAILS[reason];
  const displayMessage = customMessage || info.defaultMessage;

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {info.title}
      </Text>

      <Text accessibilityRole="alert" style={styles.message}>
        {displayMessage}
      </Text>

      <View style={styles.safetyBox}>
        <Text style={styles.safetyText}>
          <Text style={styles.safetyBold}>Keamanan Presensi:</Text> Sistem mencegah pencatatan presensi yang tidak valid. Anda dapat mencoba kembali secara aman.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isRetrying, disabled: isRetrying }}
          disabled={isRetrying}
          style={({ pressed }) => [styles.primaryButton, pressed && !isRetrying && styles.pressed]}
          onPress={onRetry}
        >
          {isRetrying && <ActivityIndicator color="#FFFFFF" size="small" style={styles.spinner} />}
          <Text style={styles.primaryButtonText}>
            {isRetrying ? 'Mencoba kembali…' : 'Coba Lagi'}
          </Text>
        </Pressable>

        {onCancel && (
          <Pressable
            accessibilityRole="button"
            disabled={isRetrying}
            style={({ pressed }) => [styles.secondaryButton, pressed && !isRetrying && styles.pressed]}
            onPress={onCancel}
          >
            <Text style={styles.secondaryButtonText}>Batal</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: spacing.sm,
    shadowColor: colors.danger,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dangerText,
  },
  message: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  safetyBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginVertical: 2,
  },
  safetyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  safetyBold: {
    fontWeight: '700',
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#0D21A1', // brand blue
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});