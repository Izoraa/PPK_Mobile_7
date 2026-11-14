import { Link, Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login } from '@/features/auth/authService';
import { useApp } from '@/state/AppContext';
import { colors, radius, spacing } from '@/theme';
import type { AppErrorCode } from '@/types';

const loginErrorMessages: Partial<Record<AppErrorCode, string>> = {
  VALIDATION_ERROR: 'Masukkan email yang valid dan isi kata sandi.',
  UNAUTHENTICATED: 'Email atau kata sandi salah, atau akun tidak dapat digunakan.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  FORBIDDEN: 'Profil akun tidak dapat diakses. Hubungi pengelola aplikasi.',
};

const profileNotices = {
  profileMissing: 'Profil akun belum dibuat. Lengkapi profil untuk melanjutkan.',
  profileIncomplete: 'Data profil akun belum lengkap. Hubungi pengelola aplikasi.',
  assistantPending: 'Permintaan akun asisten menunggu aktivasi. Masuk kembali setelah pengelola mengaktifkan akun.',
};

export default function LoginScreen() {
  const { currentUser, setAuthenticatedUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<keyof typeof profileNotices | null>(null);
  const submissionLocked = useRef(false);

  async function submitLogin(): Promise<void> {
    if (submissionLocked.current) return;

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setProfileNotice(null);

    const result = await login({ email, password });
    if (result.ok) {
      setPassword('');
      if (result.data.status === 'ready') {
        setAuthenticatedUser(result.data.user);
        return;
      }
      setProfileNotice(result.data.status);
    } else {
      setErrorMessage(loginErrorMessages[result.error.code] ?? 'Login gagal. Coba lagi nanti.');
    }

    setIsSubmitting(false);
    submissionLocked.current = false;
  }

  if (currentUser) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Masuk ke LabCheckIn</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              style={styles.input}
              value={email}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Kata sandi</Text>
            <TextInput
              accessibilityLabel="Kata sandi"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={submitLogin}
              returnKeyType="go"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
          {profileNotice && (
            <Text accessibilityRole="alert" style={styles.label}>{profileNotices[profileNotice]}</Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={submitLogin}
            style={styles.submitButton}
          >
            {isSubmitting && <ActivityIndicator color={colors.card} />}
            <Text style={styles.submitLabel}>{isSubmitting ? 'Memeriksa akun…' : 'Masuk'}</Text>
          </Pressable>

          {!isSubmitting && (profileNotice === null || profileNotice === 'profileMissing') && (
            <Link href="/register" style={styles.link}>
              {profileNotice === 'profileMissing' ? 'Lengkapi profil' : 'Daftar akun'}
            </Link>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 480, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  field: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 16 },
  submitButton: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitLabel: { color: colors.card, fontSize: 16, fontWeight: '700' },
  link: { color: colors.primary, fontSize: 16, paddingVertical: spacing.md, textAlign: 'center' },
});
