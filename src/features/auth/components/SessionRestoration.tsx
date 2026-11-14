import { type Href, useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthRestoration } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function SessionRestoration({ children }: { children: ReactNode }) {
  const { state, retry, continueToLogin } = useAuthRestoration();
  const router = useRouter();

  function openLogin() {
    // The local generated route types may predate the existing login screen.
    router.replace('/login' as Href);
    continueToLogin();
  }

  if (state.status !== 'initializing' && state.status !== 'error') return <>{children}</>;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        {state.status === 'initializing' ? (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text accessibilityRole="progressbar" style={styles.message}>Memeriksa sesi akun…</Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.message}>
              {state.code === 'NETWORK_ERROR'
                ? 'Sesi belum dapat diperiksa. Periksa koneksi internet.'
                : 'Sesi akun belum dapat dipulihkan.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.action}>
              <Text style={styles.actionLabel}>Coba lagi</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openLogin} style={styles.action}>
              <Text style={styles.actionLabel}>Gunakan form login</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  content: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  message: { color: colors.text, fontSize: 16, textAlign: 'center' },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  actionLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
