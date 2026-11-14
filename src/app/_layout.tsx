import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import SessionRestoration from '@/features/auth/components/SessionRestoration';
import { AuthProvider, useAuthRestoration } from '@/providers/AuthProvider';
import { AppProvider, useApp } from '@/state/AppContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { currentUser } = useApp();
  const { state } = useAuthRestoration();
  // The screen layout holds initial deep links until restoration resolves.
  const restoring = state.status === 'initializing' || state.status === 'error';
  const hasIdentity = currentUser !== null;
  const loginRoute = '/login' as Href;
  const roleFallback = hasIdentity ? '/' : loginRoute;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{ headerShown: false }}
        screenLayout={({ children }) => <SessionRestoration>{children}</SessionRestoration>}
      >
        <Stack.Protected guard={!hasIdentity} redirectTo="/">
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
        </Stack.Protected>
        <Stack.Protected guard={restoring || hasIdentity} redirectTo={loginRoute}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" />
        </Stack.Protected>
        <Stack.Protected guard={restoring || currentUser?.role === 'student'} redirectTo={roleFallback}>
          <Stack.Screen name="(student)" />
        </Stack.Protected>
        <Stack.Protected guard={restoring || currentUser?.role === 'assistant'} redirectTo={roleFallback}>
          <Stack.Screen name="(assistant)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
