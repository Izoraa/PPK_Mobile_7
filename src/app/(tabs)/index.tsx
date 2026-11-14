import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useApp } from '@/state/AppContext';
import ScheduleScreen from '@/screens/ScheduleScreen';
import SessionDetailScreen from '@/screens/SessionDetailScreen';

export default function HomeScreen() {
  const { currentUser } = useApp();
  const [currentScreen, setCurrentScreen] = useState<'schedule' | 'detail'>('schedule');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  if (!currentUser) {
    return <Redirect href="../login" />;
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
