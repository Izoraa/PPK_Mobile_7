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
