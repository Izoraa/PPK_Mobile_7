import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Link, Redirect, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logout } from '@/features/auth/authService';
import { useApp } from '@/state/AppContext';
import { spacing } from '@/theme';

const brand = {
  blue: '#0D21A1',
  yellow: '#EEC643',
  white: '#FFFFFF',
  ink: '#101828',
  muted: '#667085',
  border: '#E3E8F2',
  error: '#B42318',
  errorBackground: '#FEF3F2',
  danger: '#D92D20',
  dangerBorder: '#FDA29B',
};

export default function AccountScreen() {
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_500Medium });
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

  const initials = currentUser.name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
  const roleLabel = currentUser.role === 'assistant' ? 'Asisten praktikum' : 'Praktikan';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
            Profil akun
          </Text>
          <Text style={[styles.description, fontsLoaded && styles.inter]}>
            Informasi akun LabCheckIn Anda.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View pointerEvents="none" style={styles.profileAccent} />
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, fontsLoaded && styles.poppins]}>{initials || 'L'}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.name, fontsLoaded && styles.poppins]}>{currentUser.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={[styles.roleText, fontsLoaded && styles.interMedium]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, fontsLoaded && styles.poppins]}>Informasi pribadi</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailMarker} />
            <View style={styles.detailCopy}>
              <Text style={[styles.detailLabel, fontsLoaded && styles.interMedium]}>Nama lengkap</Text>
              <Text style={[styles.detailValue, fontsLoaded && styles.inter]}>{currentUser.name}</Text>
            </View>
          </View>
          {currentUser.studentNumber ? (
            <View style={styles.detailRow}>
              <View style={styles.detailMarker} />
              <View style={styles.detailCopy}>
                <Text style={[styles.detailLabel, fontsLoaded && styles.interMedium]}>NIM</Text>
                <Text style={[styles.detailValue, fontsLoaded && styles.inter]}>{currentUser.studentNumber}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <View style={styles.detailMarker} />
            <View style={styles.detailCopy}>
              <Text style={[styles.detailLabel, fontsLoaded && styles.interMedium]}>Jenis akun</Text>
              <Text style={[styles.detailValue, fontsLoaded && styles.inter]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {logoutFailed && (
          <Text accessibilityRole="alert" style={[styles.error, fontsLoaded && styles.inter]}>
            Gagal keluar dari akun. Coba lagi.
          </Text>
        )}
        <Pressable
          accessibilityLabel="Keluar dari akun"
          accessibilityRole="button"
          accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && !isSigningOut && styles.pressed]}
        >
          {isSigningOut && <ActivityIndicator color={brand.white} />}
          <Text style={[styles.logoutLabel, fontsLoaded && styles.interMedium]}>
            {isSigningOut ? 'Sedang keluar...' : 'Keluar dari akun'}
          </Text>
        </Pressable>
        {!isSigningOut && (
          <Link href="/" dismissTo style={[styles.link, fontsLoaded && styles.interMedium]}>
            Kembali ke beranda
          </Link>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FD' },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { color: brand.blue, fontSize: 28, fontWeight: '600' },
  description: { color: brand.muted, fontSize: 14, lineHeight: 21 },
  poppins: { fontFamily: 'Poppins_600SemiBold' },
  inter: { fontFamily: 'Inter_400Regular' },
  interMedium: { fontFamily: 'Inter_500Medium' },
  profileCard: {
    minHeight: 154,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: brand.blue,
  },
  profileAccent: {
    position: 'absolute',
    width: 124,
    height: 124,
    top: -72,
    right: -30,
    borderRadius: 62,
    backgroundColor: brand.yellow,
  },
  avatar: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 33,
    backgroundColor: brand.yellow,
    borderWidth: 3,
    borderColor: '#FFFFFF80',
  },
  avatarText: { color: brand.blue, fontSize: 23, fontWeight: '600' },
  profileCopy: { flex: 1, gap: spacing.sm },
  name: { color: brand.white, fontSize: 20, fontWeight: '600' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: brand.yellow },
  roleText: { color: brand.blue, fontSize: 12, fontWeight: '600' },
  detailsCard: { gap: spacing.md, padding: spacing.lg, borderRadius: 20, backgroundColor: brand.white, borderWidth: 1, borderColor: brand.border },
  sectionTitle: { marginBottom: spacing.xs, color: brand.ink, fontSize: 17, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  detailMarker: { width: 4, height: 32, borderRadius: 2, backgroundColor: brand.yellow },
  detailCopy: { flex: 1, gap: 4 },
  detailLabel: { color: brand.muted, fontSize: 12 },
  detailValue: { color: brand.ink, fontSize: 15 },
  error: { color: brand.error, backgroundColor: brand.errorBackground, borderRadius: 10, padding: spacing.md, fontSize: 14, lineHeight: 20 },
  logoutButton: {
    minHeight: 52,
    padding: spacing.md,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: brand.danger,
    backgroundColor: brand.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutLabel: { color: brand.white, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  link: { color: brand.blue, fontSize: 14, fontWeight: '600', paddingVertical: spacing.sm, textAlign: 'center' },
});
