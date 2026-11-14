import { Link, Redirect, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logout } from '@/features/auth/authService';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing } from '@/theme';

export default function AccountScreen() {
  const { currentUser, clearAuthenticatedUser } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const logoutLocked = useRef(false);
  usePreventRemove(isSigningOut && currentUser !== null);

  async function handleLogout(): Promise<void> {
    if (logoutLocked.current) return;

    logoutLocked.current = true;
    setIsSigningOut(true);
    setLogoutFailed(false);

    const result = await logout();
    if (result.ok) {
      setIsSigningOut(false);
      clearAuthenticatedUser();
      return;
    }

    setLogoutFailed(true);
    setIsSigningOut(false);
    logoutLocked.current = false;
  }

  if (!currentUser) return <Redirect href="./login" />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Akun</Text>
        {!isSigningOut && (
          <>
            <Text style={styles.label}>{currentUser.name}</Text>
            <Text style={styles.label}>{currentUser.role === 'assistant' ? 'Asisten praktikum' : 'Praktikan'}</Text>
          </>
        )}
        {logoutFailed && (
          <Text accessibilityRole="alert" style={styles.error}>Gagal keluar dari akun. Coba lagi.</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          {isSigningOut && <ActivityIndicator color={colors.card} />}
          <Text style={styles.logoutLabel}>{isSigningOut ? 'Sedang keluar…' : 'Keluar dari akun'}</Text>
        </Pressable>
        {!isSigningOut && <Link href="/" dismissTo style={styles.link}>Kembali ke beranda</Link>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignSelf: 'center', width: '100%', maxWidth: 480, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  label: { color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 16 },
  logoutButton: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutLabel: { color: colors.card, fontSize: 16, fontWeight: '700' },
  link: { color: colors.primary, fontSize: 16, paddingVertical: spacing.md, textAlign: 'center' },
});
