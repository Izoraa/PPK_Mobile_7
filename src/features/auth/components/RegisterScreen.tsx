import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { getActiveProfileAccount, saveStudentProfile } from '@/features/auth/profileService';
import { colors, radius, spacing } from '@/theme';
import type { AppErrorCode } from '@/types';

const registrationErrorMessages: Partial<Record<AppErrorCode, string>> = {
  CONFLICT: 'Email ini sudah terdaftar. Gunakan alamat email lain.',
  VALIDATION_ERROR: 'Masukkan email yang valid dan kata sandi yang memenuhi kebijakan proyek Firebase.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Pendaftaran belum tersedia. Coba lagi nanti.',
};

const profileErrorMessages: Partial<Record<AppErrorCode, string>> = {
  VALIDATION_ERROR: 'Nama lengkap dan NIM wajib diisi.',
  NETWORK_ERROR: 'Profil belum terkonfirmasi. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Penyimpanan profil belum tersedia. Coba lagi nanti.',
  UNAUTHENTICATED: 'Sesi akun sudah berakhir. Masuk kembali untuk melanjutkan profil.',
  FORBIDDEN: 'Firestore menolak akses ke profil. Hubungi pengelola aplikasi.',
};

type RegistrationStep =
  | { kind: 'checking' | 'credentials' | 'unavailable' }
  | { kind: 'profile'; uid: string; email: string }
  | { kind: 'complete'; outcome: 'created' | 'existing' };

export default function RegisterScreen() {
  const [step, setStep] = useState<RegistrationStep>({ kind: 'checking' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetryProfile, setCanRetryProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLocked = useRef(false);

  useEffect(() => {
    let active = true;
    void getActiveProfileAccount().then((result) => {
      if (!active) return;

      if (result.ok) {
        setStep({ kind: 'profile', ...result.data });
      } else if (result.error.code === 'UNAUTHENTICATED') {
        setStep({ kind: 'credentials' });
      } else {
        setErrorMessage('Pendaftaran belum tersedia. Coba lagi nanti.');
        setStep({ kind: 'unavailable' });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    submissionLocked.current = false;
  }, [step.kind]);

  async function submitRegistration(): Promise<void> {
    if (submissionLocked.current || (step.kind !== 'credentials' && step.kind !== 'profile')) return;

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    if (step.kind === 'credentials') {
      const result = await register({ email, password });
      setIsSubmitting(false);
      if (result.ok) {
        setPassword('');
        setStep({ kind: 'profile', uid: result.data.uid, email: email.trim() });
        return;
      }
      setErrorMessage(registrationErrorMessages[result.error.code] ?? 'Pendaftaran gagal. Coba lagi nanti.');
      submissionLocked.current = false;
      return;
    }

    const result = await saveStudentProfile(step.uid, { name, studentNumber });
    setIsSubmitting(false);
    if (result.ok) {
      setStep({ kind: 'complete', outcome: result.data });
      return;
    }

    setErrorMessage(profileErrorMessages[result.error.code] ?? 'Profil belum dapat disimpan. Coba lagi.');
    setCanRetryProfile(result.error.retryable);
    submissionLocked.current = false;
  }

  const profileSubmitLabel = canRetryProfile ? 'Coba simpan lagi' : 'Simpan profil';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            {step.kind === 'profile' ? 'Lengkapi profil praktikan' : 'Daftar akun'}
          </Text>

          {step.kind === 'checking' && <ActivityIndicator color={colors.primary} />}
          {step.kind === 'complete' && (
            <Text accessibilityRole="alert" style={styles.label}>
              {step.outcome === 'created' ? 'Profil praktikan berhasil disimpan.' : 'Profil akun sudah tersimpan.'}
            </Text>
          )}
          {step.kind === 'credentials' && (
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
            </>
          )}
          {step.kind === 'profile' && (
            <>
              <Text style={styles.label}>{step.email}</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Nama lengkap</Text>
                <TextInput
                  accessibilityLabel="Nama lengkap"
                  autoComplete="name"
                  editable={!isSubmitting}
                  onChangeText={setName}
                  style={styles.input}
                  value={name}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>NIM</Text>
                <TextInput
                  accessibilityLabel="NIM"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={setStudentNumber}
                  onSubmitEditing={submitRegistration}
                  returnKeyType="go"
                  style={styles.input}
                  value={studentNumber}
                />
              </View>
            </>
          )}

          {errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
          {(step.kind === 'credentials' || step.kind === 'profile') && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={submitRegistration}
              style={styles.submitButton}
            >
              {isSubmitting && <ActivityIndicator color={colors.card} />}
              <Text style={styles.submitLabel}>
                {step.kind === 'credentials' ? 'Daftar' : profileSubmitLabel}
              </Text>
            </Pressable>
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
