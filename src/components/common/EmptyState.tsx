import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
