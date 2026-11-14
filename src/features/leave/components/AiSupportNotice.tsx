import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export function AiSupportNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Klasifikasi AI hanya sebagai pendukung</Text>
      <Text style={styles.message}>
        Alasan izin dapat diklasifikasikan oleh AI. Hasilnya hanya prediksi, bukan keputusan.
        Keputusan menerima atau menolak izin tetap dibuat oleh asisten.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
