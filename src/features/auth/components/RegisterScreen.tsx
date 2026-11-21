import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { spacing } from '@/theme';
import type { AppErrorCode, Role } from '@/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'student', label: 'Praktikan' },
  { value: 'assistant', label: 'Asisten praktikum' },
];

const brand = {
  blue: '#0D21A1',
  yellow: '#EEC643',
  white: '#FFFFFF',
  ink: '#101828',
  muted: '#667085',
  border: '#D9DEEA',
  error: '#B42318',
  errorBg: '#FEF3F2',
};

const profileStatusMessages: Record<ProfileStatus, string> = {
  student: 'Profil praktikan sudah tersimpan.',
  assistantPending: 'Permintaan akun asisten menunggu aktivasi oleh pengelola.',
  assistant: 'Akun asisten sudah aktif.',
  coordinator: 'Akun koordinator laboratorium aktif.',
};

const registrationErrorMessages: Partial<Record<AppErrorCode, string>> = {
  CONFLICT: 'Email ini sudah terdaftar. Masuk dengan akun tersebut atau gunakan email lain.',
  VALIDATION_ERROR: 'Periksa alamat email dan data pendaftaran, lalu coba lagi.',
  PASSWORD_POLICY: 'Kata sandi belum memenuhi kebijakan proyek. Perbaiki kata sandi, lalu coba lagi.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Pendaftaran belum tersedia. Coba lagi nanti.',
};

const profileErrorMessages: Partial<Record<AppErrorCode, string>> = {
  VALIDATION_ERROR: 'Isi nama lengkap dan NIM, lalu pilih jenis akun yang valid.',
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
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Inter_400Regular, Inter_500Medium });
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
    const profileValidationError = validateProfile(profile);
    const validationError = profileValidationError ?? (step.kind === 'credentials' ? validateRegistration(credentials) : null);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    if (step.kind === 'credentials') {
      const result = await register(credentials);
      if (!result.ok) {
        setIsSubmitting(false);
        setErrorMessage(registrationErrorMessages[result.error.code] ?? 'Pendaftaran gagal. Coba lagi nanti.');
        submissionLocked.current = false;
        return;
      }

      setPassword('');
      setPasswordConfirmation('');
      const profileResult = await saveRegistrationProfile(result.data.uid, profile);
      setIsSubmitting(false);
      if (profileResult.ok) {
        setStep({ kind: 'complete', status: profileResult.data });
        return;
      }

      setStep({ kind: 'profile', uid: result.data.uid, email: email.trim() });
      setErrorMessage(profileErrorMessages[profileResult.error.code] ?? 'Profil belum dapat disimpan. Coba lagi.');
      setCanRetryProfile(profileResult.error.retryable);
      submissionLocked.current = false;
      return;
    }

    if (step.kind !== 'profile') {
      setIsSubmitting(false);
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
  const isRegistrationForm = step.kind === 'credentials' || step.kind === 'profile';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Biru dengan Logo di Tengah */}
          <View style={styles.headerSection}>
            <Image
              accessibilityLabel="Logo LabCheckIn"
              resizeMode="contain"
              source={require('@/assets/logos/logo_putih.png')}
              style={styles.logo}
            />
          </View>

          {/* Kartu Putih Melengkung Penuh ke Samping & Bawah */}
          <View style={styles.bottomCard}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
                {step.kind === 'profile' ? 'Lengkapi profil' : 'Buat akun'}
              </Text>
              <Text style={[styles.description, fontsLoaded && styles.inter]}>
                {step.kind === 'profile'
                  ? 'Lengkapi data profil akun Anda.'
                  : 'Pilih peran dan isi data untuk mulai menggunakan LabCheckIn.'}
              </Text>
            </View>

            {step.kind === 'checking' && (
              <ActivityIndicator accessibilityLabel="Memeriksa profil" color={brand.blue} style={styles.loader} />
            )}

            {step.kind === 'complete' && (
              <Text accessibilityRole="alert" style={[styles.statusMessage, fontsLoaded && styles.inter]}>
                {profileStatusMessages[step.status]}
              </Text>
            )}

            {isRegistrationForm && (
              <View style={styles.formFields}>
                <View accessibilityRole="radiogroup" accessibilityLabel="Pilih peran" style={styles.field}>
                  <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Saya mendaftar sebagai</Text>
                  <View style={styles.roleRow}>
                    {roleOptions.map(({ value, label }) => {
                      const selected = requestedRole === value;
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: isSubmitting }}
                          disabled={isSubmitting}
                          onPress={() => setRequestedRole(value)}
                          style={[styles.roleOption, selected && styles.selectedRoleOption]}
                        >
                          <Text
                            style={[
                              styles.roleLabel,
                              selected && styles.selectedRoleLabel,
                              fontsLoaded && styles.interMedium,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {requestedRole === 'assistant' && (
                  <Text style={[styles.helperText, fontsLoaded && styles.inter]}>
                    Akun asisten memerlukan persetujuan pengelola.
                  </Text>
                )}

                {/* Garis Pembatas */}
                <View style={styles.divider} />

                <View style={styles.field}>
                  <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Nama lengkap</Text>
                  <TextInput
                    accessibilityLabel="Nama lengkap"
                    autoComplete="name"
                    editable={!isSubmitting}
                    onChangeText={setName}
                    placeholder="Masukkan nama lengkap"
                    placeholderTextColor="#98A2B3"
                    style={[styles.input, fontsLoaded && styles.inter]}
                    value={name}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, fontsLoaded && styles.interMedium]}>NIM</Text>
                  <TextInput
                    accessibilityLabel="NIM"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    onChangeText={setStudentNumber}
                    placeholder="Masukkan NIM"
                    placeholderTextColor="#98A2B3"
                    style={[styles.input, fontsLoaded && styles.inter]}
                    value={studentNumber}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Email</Text>
                  <TextInput
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!isSubmitting && step.kind === 'credentials'}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="nama@email.com"
                    placeholderTextColor="#98A2B3"
                    style={[styles.input, fontsLoaded && styles.inter, step.kind === 'profile' && styles.readOnlyInput]}
                    value={step.kind === 'profile' ? step.email : email}
                  />
                </View>

                {step.kind === 'credentials' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Kata sandi</Text>
                      <TextInput
                        accessibilityLabel="Kata sandi"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect={false}
                        editable={!isSubmitting}
                        onChangeText={setPassword}
                        placeholder="Buat kata sandi"
                        placeholderTextColor="#98A2B3"
                        secureTextEntry
                        style={[styles.input, fontsLoaded && styles.inter]}
                        value={password}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Konfirmasi kata sandi</Text>
                      <TextInput
                        accessibilityLabel="Konfirmasi kata sandi"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect={false}
                        editable={!isSubmitting}
                        onChangeText={setPasswordConfirmation}
                        onSubmitEditing={submitRegistration}
                        placeholder="Ulangi kata sandi"
                        placeholderTextColor="#98A2B3"
                        returnKeyType="go"
                        secureTextEntry
                        style={[styles.input, fontsLoaded && styles.inter]}
                        value={passwordConfirmation}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {errorMessage && (
              <Text accessibilityRole="alert" style={[styles.error, fontsLoaded && styles.inter]}>
                {errorMessage}
              </Text>
            )}

            {(step.kind === 'unavailable' || (step.kind === 'complete' && step.status === 'assistantPending')) && (
              <Pressable accessibilityRole="button" onPress={checkProfileAgain} style={styles.submitButton}>
                <Text style={[styles.submitLabel, fontsLoaded && styles.interMedium]}>Periksa status profil</Text>
              </Pressable>
            )}

            {isRegistrationForm && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={submitRegistration}
                style={({ pressed }) => [styles.submitButton, pressed && !isSubmitting && styles.pressed]}
              >
                {isSubmitting && <ActivityIndicator color={brand.yellow} />}
                <Text style={[styles.submitLabel, fontsLoaded && styles.interMedium]}>
                  {isSubmitting ? 'Memproses…' : step.kind === 'credentials' ? 'Daftar' : profileSubmitLabel}
                </Text>
              </Pressable>
            )}

            {!isSubmitting && (
              <Link href="./login" dismissTo style={[styles.backLink, fontsLoaded && styles.interMedium]}>
                Sudah punya akun? <Text style={styles.backLinkHighlight}>Masuk</Text>
              </Link>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D21A1',
  },
  body: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: '#0D21A1',
  },
  headerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: 140,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
  },
  bottomCard: {
    flex: 1,
    backgroundColor: brand.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60, // ruang ekstra di bawah agar nyaman di-scroll saat keyboard aktif
    gap: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  heading: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    color: '#0D21A1',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: brand.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  poppins: {
    fontFamily: 'Poppins_600SemiBold',
  },
  inter: {
    fontFamily: 'Inter_400Regular',
  },
  interMedium: {
    fontFamily: 'Inter_500Medium',
  },
  formFields: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: brand.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    color: brand.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    backgroundColor: brand.white,
  },
  selectedRoleOption: {
    borderColor: brand.blue,
    backgroundColor: '#FFF9E5',
  },
  roleLabel: {
    color: brand.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedRoleLabel: {
    color: brand.blue,
  },
  divider: {
    height: 2,
    backgroundColor: '#0D21A1',
    marginVertical: spacing.xs,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    backgroundColor: brand.white,
    color: brand.ink,
    fontSize: 15,
  },
  readOnlyInput: {
    backgroundColor: '#F2F4F7',
    color: brand.muted,
  },
  error: {
    color: brand.error,
    backgroundColor: brand.errorBg,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  statusMessage: {
    color: brand.ink,
    backgroundColor: '#F5F7FD',
    padding: spacing.lg,
    borderRadius: 12,
    fontSize: 15,
  },
  loader: {
    marginVertical: spacing.md,
  },
  submitButton: {
    minHeight: 52,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  submitLabel: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  backLink: {
    color: brand.muted,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  backLinkHighlight: {
    color: brand.blue,
    fontWeight: '700',
  },
});