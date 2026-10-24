import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    isDestructive ? styles.destructiveButton : styles.primaryButton,
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
