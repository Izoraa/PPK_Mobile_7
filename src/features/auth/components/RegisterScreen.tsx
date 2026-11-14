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
import { getActiveProfileAccount, saveRegistrationProfile, type ProfileStatus } from '@/features/auth/profileService';
import { validateProfile, validateRegistration } from '@/features/auth/validation';
import { colors, radius, spacing } from '@/theme';
import type { AppErrorCode, Role } from '@/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'student', label: 'Praktikan' },
  { value: 'assistant', label: 'Asisten praktikum' },
];

const profileStatusMessages: Record<ProfileStatus, string> = {
  student: 'Profil praktikan sudah tersimpan.',
  assistantPending: 'Permintaan akun asisten menunggu aktivasi oleh pengelola.',
  assistant: 'Akun asisten sudah aktif.',
};

const registrationErrorMessages: Partial<Record<AppErrorCode, string>> = {
  CONFLICT: 'Email ini sudah terdaftar. Masuk dengan akun tersebut atau gunakan email lain.',
  VALIDATION_ERROR: 'Periksa alamat email dan data pendaftaran, lalu coba lagi.',
  PASSWORD_POLICY: 'Kata sandi belum memenuhi kebijakan proyek. Perbaiki kata sandi, lalu coba lagi.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Pendaftaran belum tersedia. Coba lagi nanti.',
};

const profileErrorMessages: Partial<Record<AppErrorCode, string>> = {
  VALIDATION_ERROR: 'Isi nama lengkap dan, jika mendaftar sebagai praktikan, isi NIM.',
  PROFILE_INCOMPLETE: 'Data profil akun belum lengkap. Hubungi pengelola aplikasi.',
  NETWORK_ERROR: 'Profil belum terkonfirmasi. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Penyimpanan profil belum tersedia. Coba lagi nanti.',
  UNAUTHENTICATED: 'Sesi akun sudah berakhir. Masuk kembali untuk melanjutkan profil.',
  FORBIDDEN: 'Firestore menolak akses ke profil. Hubungi pengelola aplikasi.',
};

type RegistrationStep =
  | { kind: 'checking' | 'credentials' | 'unavailable' }
  | { kind: 'profile'; uid: string; email: string }
  | { kind: 'complete'; status: ProfileStatus };

export default function RegisterScreen() {
  const [step, setStep] = useState<RegistrationStep>({ kind: 'checking' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [requestedRole, setRequestedRole] = useState<Role>('student');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetryProfile, setCanRetryProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileCheckAttempt, setProfileCheckAttempt] = useState(0);
  const submissionLocked = useRef(false);

  useEffect(() => {
    let active = true;
    void getActiveProfileAccount().then((result) => {
      if (!active) return;

      if (result.ok) {
        const { uid, email, profileExists, profileStatus, applicationUser } = result.data;
        if (profileStatus === 'assistantPending' || (profileStatus && applicationUser)) {
          setStep({ kind: 'complete', status: profileStatus });
        } else if (profileExists) {
          setErrorMessage(profileErrorMessages.PROFILE_INCOMPLETE ?? 'Hubungi pengelola aplikasi.');
          setStep({ kind: 'unavailable' });
        } else {
          setStep({ kind: 'profile', uid, email });
        }
      } else if (result.error.code === 'UNAUTHENTICATED') {
        setStep({ kind: 'credentials' });
      } else {
        setErrorMessage(profileErrorMessages[result.error.code] ?? 'Pendaftaran belum tersedia. Coba lagi nanti.');
        setStep({ kind: 'unavailable' });
      }
    });
    return () => {
      active = false;
    };
  }, [profileCheckAttempt]);

  useEffect(() => {
    submissionLocked.current = false;
  }, [step.kind]);

  async function submitRegistration(): Promise<void> {
    if (submissionLocked.current || (step.kind !== 'credentials' && step.kind !== 'profile')) return;

    const credentials = { email, password, passwordConfirmation };
    const profile = { name, studentNumber, requestedRole };
    const validationError = step.kind === 'credentials' ? validateRegistration(credentials) : validateProfile(profile);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    if (step.kind === 'credentials') {
      const result = await register(credentials);
      setIsSubmitting(false);
      if (result.ok) {
        setPassword('');
        setPasswordConfirmation('');
        setStep({ kind: 'profile', uid: result.data.uid, email: email.trim() });
        return;
      }
      setErrorMessage(registrationErrorMessages[result.error.code] ?? 'Pendaftaran gagal. Coba lagi nanti.');
      submissionLocked.current = false;
      return;
    }

    const result = await saveRegistrationProfile(step.uid, profile);
    setIsSubmitting(false);
    if (result.ok) {
      setStep({ kind: 'complete', status: result.data });
      return;
    }

    setErrorMessage(profileErrorMessages[result.error.code] ?? 'Profil belum dapat disimpan. Coba lagi.');
    setCanRetryProfile(result.error.retryable);
    submissionLocked.current = false;
  }

  function checkProfileAgain() {
    setErrorMessage(null);
    setStep({ kind: 'checking' });
    setProfileCheckAttempt((previous) => previous + 1);
  }

  const profileSubmitLabel = canRetryProfile ? 'Coba simpan lagi' : 'Simpan profil';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            {step.kind === 'profile' ? 'Lengkapi profil' : 'Daftar akun'}
          </Text>

          {step.kind === 'checking' && <ActivityIndicator accessibilityLabel="Memeriksa profil" color={colors.primary} />}
          {step.kind === 'complete' && (
            <Text accessibilityRole="alert" style={styles.label}>
              {profileStatusMessages[step.status]}
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
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Konfirmasi kata sandi</Text>
                <TextInput
                  accessibilityLabel="Konfirmasi kata sandi"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={setPasswordConfirmation}
                  onSubmitEditing={submitRegistration}
                  returnKeyType="go"
                  secureTextEntry
                  style={styles.input}
                  value={passwordConfirmation}
                />
              </View>
            </>
          )}
          {step.kind === 'profile' && (
            <>
              <Text style={styles.label}>{step.email}</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Jenis akun" style={styles.field}>
                <Text style={styles.label}>Jenis akun</Text>
                {roleOptions.map(({ value, label }) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: requestedRole === value, disabled: isSubmitting }}
                    disabled={isSubmitting}
                    onPress={() => setRequestedRole(value)}
                    style={[styles.roleOption, requestedRole === value && styles.selectedRoleOption]}
                  >
                    <Text style={styles.label}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              {requestedRole === 'assistant' && (
                <Text style={styles.description}>Akun asisten memerlukan persetujuan pengelola.</Text>
              )}
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
              {requestedRole === 'student' && (
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
              )}
            </>
          )}

          {errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
          {(step.kind === 'unavailable' || (step.kind === 'complete' && step.status === 'assistantPending')) && (
            <Pressable accessibilityRole="button" onPress={checkProfileAgain} style={styles.submitButton}>
              <Text style={styles.submitLabel}>Periksa status profil</Text>
            </Pressable>
          )}
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

          {!isSubmitting && <Link href="./login" dismissTo style={styles.backLink}>Kembali ke login</Link>}
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
  description: { color: colors.textMuted, fontSize: 16 },
  roleOption: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  selectedRoleOption: { borderColor: colors.primary },
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
