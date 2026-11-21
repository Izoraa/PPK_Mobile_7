import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Link, Redirect } from 'expo-router';
import { useRef, useState } from 'react';
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

import { login, restoreIdentity } from '@/features/auth/authService';
import { validateCredentials } from '@/features/auth/validation';
import { useAuthRestoration } from '@/providers/AuthProvider';
import { useApp } from '@/state/AppContext';
import { spacing } from '@/theme';
import type { AppErrorCode } from '@/types';

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

const loginErrorMessages: Partial<Record<AppErrorCode, string>> = {
  VALIDATION_ERROR: 'Masukkan email yang valid dan isi kata sandi.',
  UNAUTHENTICATED: 'Email atau kata sandi salah, atau akun tidak dapat digunakan.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa jaringan, lalu coba lagi.',
  FORBIDDEN: 'Profil akun tidak dapat diakses. Hubungi pengelola aplikasi.',
};

const profileNotices = {
  profileMissing: 'Profil akun belum dibuat. Lengkapi profil untuk melanjutkan.',
  profileIncomplete: 'Data profil akun belum lengkap. Hubungi pengelola aplikasi.',
  assistantPending: 'Permintaan akun asisten menunggu persetujuan pengelola. Periksa kembali status setelah disetujui.',
};

export default function LoginScreen() {
  const { currentUser, setAuthenticatedUser } = useApp();
  const { state: restoration } = useAuthRestoration();
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<keyof typeof profileNotices | null>(
    restoration.status === 'profileIncomplete' ? restoration.notice : null,
  );

  const submissionLocked = useRef(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  async function submitLogin(): Promise<void> {
    if (submissionLocked.current) return;

    const validationError = validateCredentials({ email, password });
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

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

  async function checkActivation(): Promise<void> {
    if (submissionLocked.current) return;

    submissionLocked.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await restoreIdentity();
    if (result.ok) {
      if (result.data.status === 'ready') {
        setPassword('');
        setAuthenticatedUser(result.data.user);
        return;
      }
      if (result.data.status === 'signedOut') {
        setProfileNotice(null);
        setErrorMessage('Sesi sudah berakhir. Masuk kembali untuk memeriksa aktivasi.');
      } else {
        setProfileNotice(result.data.status);
      }
    } else {
      setErrorMessage(loginErrorMessages[result.error.code] ?? 'Status aktivasi belum dapat diperiksa. Coba lagi.');
    }

    setIsSubmitting(false);
    submissionLocked.current = false;
  }

  if (currentUser) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.yellowShape} />
      <View pointerEvents="none" style={styles.blueShape} />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo LabCheckIn */}
          <Image
            accessibilityLabel="Logo LabCheckIn"
            resizeMode="contain"
            source={require('@/assets/logos/logo_LCI.png')}
            style={styles.logo}
          />

          <View style={styles.card}>
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={[styles.title, fontsLoaded && styles.poppins]}>
                Selamat datang
              </Text>
              <Text style={[styles.subtitle, fontsLoaded && styles.inter]}>
                Masuk untuk melanjutkan ke akun Anda.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                onChangeText={setEmail}
                onFocus={() => scrollViewRef.current?.scrollTo({ y: 50, animated: true })}
                placeholder="nama@email.com"
                placeholderTextColor="#98A2B3"
                style={[styles.input, fontsLoaded && styles.inter]}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, fontsLoaded && styles.interMedium]}>Kata sandi</Text>
              <TextInput
                accessibilityLabel="Kata sandi"
                autoCapitalize="none"
                autoComplete="current-password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={setPassword}
                onFocus={() => scrollViewRef.current?.scrollTo({ y: 130, animated: true })}
                onSubmitEditing={submitLogin}
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#98A2B3"
                returnKeyType="go"
                secureTextEntry
                style={[styles.input, fontsLoaded && styles.inter]}
                value={password}
              />
            </View>

            {errorMessage && (
              <Text accessibilityRole="alert" style={[styles.error, fontsLoaded && styles.inter]}>
                {errorMessage}
              </Text>
            )}

            {profileNotice && (
              <Text accessibilityRole="alert" style={[styles.notice, fontsLoaded && styles.inter]}>
                {profileNotices[profileNotice]}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={submitLogin}
              style={({ pressed }) => [styles.submitButton, pressed && !isSubmitting && styles.pressed]}
            >
              {isSubmitting && <ActivityIndicator color={brand.yellow} />}
              <Text style={[styles.submitLabel, fontsLoaded && styles.interMedium]}>
                {isSubmitting ? 'Memeriksa akun' : 'Masuk'}
              </Text>
            </Pressable>

            {profileNotice === 'assistantPending' && (
              <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={checkActivation} style={styles.link}>
                <Text style={[styles.linkLabel, fontsLoaded && styles.interMedium]}>Periksa status aktivasi</Text>
              </Pressable>
            )}

            {!isSubmitting && (profileNotice === null || profileNotice === 'profileMissing') && (
              <Link href="/register" style={[styles.link, fontsLoaded && styles.interMedium]}>
                {profileNotice === 'profileMissing' ? 'Lengkapi profil' : 'Daftar akun'}
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
    backgroundColor: '#F5F7FD',
  },
  yellowShape: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: brand.yellow,
    top: -160,
    right: -160,
  },
  blueShape: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: brand.blue,
    bottom: -120,
    left: -120,
  },
  body: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginTop: -60,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: brand.blue,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  intro: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: brand.ink,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    color: brand.muted,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  poppins: {
    fontFamily: 'Poppins_600SemiBold',
  },
  poppinsBold: {
    fontFamily: 'Poppins_700Bold',
  },
  inter: {
    fontFamily: 'Inter_400Regular',
  },
  interMedium: {
    fontFamily: 'Inter_500Medium',
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: brand.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    backgroundColor: brand.white,
    color: brand.ink,
    fontSize: 16,
  },
  error: {
    color: brand.error,
    backgroundColor: brand.errorBg,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 54,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitLabel: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  notice: {
    color: brand.blue,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  link: {
    color: brand.blue,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  linkLabel: {
    color: brand.blue,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});