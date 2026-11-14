import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import SessionRestoration from '@/features/auth/components/SessionRestoration';
import { AuthProvider } from '@/providers/AuthProvider';
import { AppProvider } from '@/state/AppContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{ headerShown: false }}
            screenLayout={({ children }) => <SessionRestoration>{children}</SessionRestoration>}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="account" />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </AppProvider>
  );
}
