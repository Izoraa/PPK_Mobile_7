import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export function AiSupportNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Klasifikasi AI hanya sebagai pendukung</Text>
      <Text style={styles.message}>
        Alasan izin dapat diklasifikasikan oleh AI sebagai referensi awal. Keputusan akhir tetap sepenuhnya ditentukan oleh asisten praktikum.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  title: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
