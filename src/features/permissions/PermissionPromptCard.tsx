import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { PERMISSION_METADATA, type PermissionType } from './types';

interface PermissionPromptCardProps {
  type: PermissionType;
  canAskAgain?: boolean;
  onRequestPermission: () => void;
  onCancel?: () => void;
}

export function PermissionPromptCard({
  type,
  canAskAgain = true,
  onRequestPermission,
  onCancel,
}: PermissionPromptCardProps) {
  const meta = PERMISSION_METADATA[type];

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{type === 'camera' ? '📷' : type === 'location' ? '📍' : '🔔'}</Text>
        <Text style={styles.title}>{meta.title}</Text>
      </View>

      <Text style={styles.description}>{meta.description}</Text>

      <View style={styles.impactBox}>
        <Text style={styles.impactTitle}>Fitur yang terdampak:</Text>
        <Text style={styles.impactText}>{meta.impactMessage}</Text>
      </View>

      <Text style={styles.actionGuide}>{meta.actionGuide}</Text>

      <View style={styles.buttonContainer}>
        {canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={onRequestPermission}
          >
            <Text style={styles.primaryButtonText}>Izinkan Akses</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            onPress={handleOpenSettings}
          >
            <Text style={styles.settingsButtonText}>Buka Pengaturan Perangkat</Text>
          </Pressable>
        )}

        {onCancel && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
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
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  impactBox: {
    backgroundColor: '#FFF9E5',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#EEC643',
    marginVertical: spacing.xs,
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A5E0B',
    marginBottom: 2,
  },
  impactText: {
    fontSize: 13,
    color: '#594405',
    lineHeight: 18,
  },
  actionGuide: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#0D21A1',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#0D21A1',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});