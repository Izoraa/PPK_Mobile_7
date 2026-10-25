<<<<<<< Updated upstream
import * as Device from 'expo-device';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to&nbsp;Expo
          </ThemedText>
        </ThemedView>

        <ThemedText type="code" style={styles.code}>
          get started
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
=======
import React, { useState, useEffect } from 'react';
import { useApp } from '@/state/AppContext';
import RolePickerScreen from '@/screens/RolePickerScreen';
import ScheduleScreen from '@/screens/ScheduleScreen';
import SessionDetailScreen from '@/screens/SessionDetailScreen';

export default function HomeScreen() {
  const { currentUser } = useApp();
  const [currentScreen, setCurrentScreen] = useState<'schedule' | 'detail'>('schedule');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Saat currentUser null (misal setelah klik 'Ganti peran'), pastikan state layar kembali ke schedule
  useEffect(() => {
    if (!currentUser) {
      setCurrentScreen('schedule');
      setActiveSessionId(null);
    }
  }, [currentUser]);

  // 1. Jika pengguna belum memilih peran / identitas
  if (!currentUser) {
    return <RolePickerScreen />;
  }

  // 2. Jika pengguna membuka detail sesi praktikum
  if (currentScreen === 'detail' && activeSessionId) {
    return (
      <SessionDetailScreen
        route={{ params: { sessionId: activeSessionId } }}
        navigation={{
          canGoBack: () => true,
          goBack: () => {
            setCurrentScreen('schedule');
            setActiveSessionId(null);
          },
          navigate: () => {
            setCurrentScreen('schedule');
            setActiveSessionId(null);
          },
        }}
      />
    );
  }

  // 3. Jika pengguna sudah memilih peran, tampilkan jadwal sesi praktikum
  return (
    <ScheduleScreen
      navigation={{
        navigate: (screen, params) => {
          if (screen === 'SessionDetail' && params?.sessionId) {
            setActiveSessionId(params.sessionId);
            setCurrentScreen('detail');
          }
        },
      }}
    />
  );
}
>>>>>>> Stashed changes
