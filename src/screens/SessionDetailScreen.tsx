<<<<<<< Updated upstream
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
=======
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { AttendanceList } from '../components/session/AttendanceList';
import { CheckInPanel } from '../components/session/CheckInPanel';
import { SessionControl } from '../components/session/SessionControl';

import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';

export interface SessionDetailScreenProps {
  route: { params: { sessionId: string } };
  navigation: {
    canGoBack: () => boolean;
    goBack: () => void;
    navigate: (screen: 'Schedule') => void;
  };
}

export default function SessionDetailScreen({ route, navigation }: SessionDetailScreenProps) {
  const { currentUser, getSession, switchRole } = useApp();
  // Resolve on every Context render so session controls update these details.
  const sessionId = route?.params?.sessionId;
  const session = typeof sessionId === 'string' ? getSession(sessionId) : undefined;

  function returnToSchedule() {
    navigation.goBack();
    navigation.navigate('Schedule');
  }

  if (!currentUser) return null;
>>>>>>> Stashed changes

export function SessionDetailScreen() {
  // Stub for Maulana (SRS-03, SRS-05)
  // This screen will mount SessionControl (Jordan), AttendanceList (Hanif), CheckInPanel (Hasta)
  return (
<<<<<<< Updated upstream
    <View style={styles.container}>
      <Text style={styles.title}>SessionDetailScreen Stub</Text>
    </View>
=======
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={returnToSchedule}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Kembali ke jadwal</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => switchRole()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Ganti peran</Text>
          </Pressable>
        </View>
        {!session ? (
          <EmptyState title="Sesi tidak ditemukan" message="Silakan kembali ke jadwal untuk memilih sesi yang tersedia." />
        ) : (
          <>
            <View style={styles.details}>
              <Text accessibilityRole="header" style={styles.title}>{session.course}</Text>
              <Text style={styles.label}>Laboratorium / ruang kelas</Text>
              <Text style={styles.value}>{session.room}</Text>
              <Text style={styles.label}>Tanggal</Text>
              <Text style={styles.value}>{formatDate(session.date)}</Text>
              <View style={styles.times}>
                <View style={styles.time}>
                  <Text style={styles.label}>Waktu mulai</Text>
                  <Text style={styles.value}>{session.startTime}</Text>
                </View>
                <View style={styles.time}>
                  <Text style={styles.label}>Waktu selesai</Text>
                  <Text style={styles.value}>{session.endTime}</Text>
                </View>
              </View>
              <Text style={styles.label}>Status sesi</Text>
              <StatusBadge status={session.status} />
            </View>
            {currentUser.role === 'assistant' && (
              <>
                <SessionControl sessionId={session.id} />
                <AttendanceList sessionId={session.id} />
              </>
            )}
            {currentUser.role === 'student' && <CheckInPanel sessionId={session.id} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
>>>>>>> Stashed changes
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});
