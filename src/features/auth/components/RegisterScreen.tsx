import { Link } from 'expo-router';
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

import { register } from '@/features/auth/authService';
import { colors, radius, spacing } from '@/theme';

const registrationErrorMessages = {
  CONFLICT: 'Email ini sudah terdaftar. Gunakan alamat email lain.',
  VALIDATION_ERROR: 'Masukkan email yang valid dan kata sandi yang memenuhi kebijakan proyek Firebase.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Pendaftaran belum tersedia. Coba lagi nanti.',
};

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const submissionLocked = useRef(false);

  async function submitRegistration(): Promise<void> {
    if (submissionLocked.current) return;

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await register({ email, password });
    setIsSubmitting(false);

    if (result.ok) {
      setPassword('');
      setIsRegistered(true);
      return;
    }

    setErrorMessage(registrationErrorMessages[result.error.code]);
    submissionLocked.current = false;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Daftar akun</Text>

          {isRegistered ? (
            <Text accessibilityRole="alert" style={styles.label}>Akun berhasil dibuat.</Text>
          ) : (
            <>
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
                  autoComplete="new-password"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  onSubmitEditing={submitRegistration}
                  returnKeyType="go"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={submitRegistration}
                style={styles.submitButton}
              >
                {isSubmitting && <ActivityIndicator color={colors.card} />}
                <Text style={styles.submitLabel}>{isSubmitting ? 'Mendaftarkan…' : 'Daftar'}</Text>
              </Pressable>
            </>
          )}

          {!isSubmitting && <Link href="/" dismissTo style={styles.backLink}>Kembali ke beranda</Link>}
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
  backLink: { color: colors.primary, fontSize: 16, paddingVertical: spacing.md, textAlign: 'center' },
});
