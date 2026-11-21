import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface LocationServiceAlertProps {
  onRetry: () => void;
  isChecking?: boolean;
}

export function LocationServiceAlert({ onRetry, isChecking = false }: LocationServiceAlertProps) {
  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.openSettings();
      } else {
        await Linking.openSettings();
      }
    } catch {
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Layanan Lokasi (GPS) Tidak Aktif</Text>
      </View>

      <Text style={styles.description}>
        Sistem mendeteksi bahwa GPS atau layanan lokasi pada perangkat Anda sedang dimatikan.
      </Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Perhatian:</Text>
        <Text style={styles.warningText}>
          Presensi praktikum mewajibkan validasi lokasi perangkat. Anda harus mengaktifkan GPS terlebih dahulu sebelum dapat mengirim presensi.
        </Text>
      </View>

      <Text style={styles.guideText}>
        Silakan aktifkan GPS melalui menu pengaturan cepat (quick settings) atau menu pengaturan perangkat Anda.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isChecking}
          style={({ pressed }) => [styles.primaryButton, pressed && !isChecking && styles.pressed]}
          onPress={onRetry}
        >
          <Text style={styles.primaryButtonText}>
            {isChecking ? 'Memeriksa GPS…' : 'Sudah Aktif, Periksa Ulang'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={handleOpenSettings}
        >
          <Text style={styles.secondaryButtonText}>Buka Pengaturan</Text>
        </Pressable>
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
    borderColor: '#FEDF89',
    gap: spacing.sm,
    shadowColor: '#F79009',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B54708',
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FFFAEB',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#F79009',
    marginVertical: spacing.xs,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B54708',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#7A2E0E',
    lineHeight: 18,
  },
  guideText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    flex: 1.3,
    minHeight: 46,
    backgroundColor: '#0D21A1', // brand blue
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});