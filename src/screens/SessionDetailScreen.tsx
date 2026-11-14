import React, { useEffect, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { AttendanceList } from '../components/session/AttendanceList';
import { CheckInPanel } from '../components/session/CheckInPanel';
import { SessionControl } from '../components/session/SessionControl';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';
import { subscribeSession, type SessionDoc } from '@/features/practicum';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { currentUser, getSession } = useApp();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [liveSession, setLiveSession] = useState<SessionDoc | null>(null);

  useEffect(() => {
    if (!sessionId || typeof sessionId !== 'string') return;

    const unsubscribe = subscribeSession(
      sessionId,
      (doc) => setLiveSession(doc),
      (err) => console.error('Error listening to session detail:', err)
    );

    return () => unsubscribe();
  }, [sessionId]);

  if (!currentUser) return null;

  // Prefer live Firestore session, fallback to dummy
  const dummyCandidate = typeof sessionId === 'string' ? getSession(sessionId) : undefined;
  
  let sessionData: {
    id: string;
    course: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    status: 'not_open' | 'open' | 'closed';
    assistantId: string;
  } | null = null;

  if (liveSession) {
    let dateStr = '-';
    let startStr = '-';
    let endStr = '-';
    if (liveSession.startsAt?.toDate) {
      const s = liveSession.startsAt.toDate();
      dateStr = s.toISOString().split('T')[0];
      startStr = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (liveSession.endsAt?.toDate) {
      const e = liveSession.endsAt.toDate();
      endStr = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    sessionData = {
      id: liveSession.id,
      course: liveSession.title,
      room: liveSession.room,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      status: liveSession.status,
      assistantId: liveSession.assistantId,
    };
  } else if (dummyCandidate) {
    sessionData = dummyCandidate;
  }

  const session = currentUser.role === 'assistant' && sessionData?.assistantId !== currentUser.id
    ? null
    : sessionData;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Link href="/" dismissTo asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonLabel}>Kembali ke jadwal</Text>
            </Pressable>
          </Link>

          {currentUser.role === 'assistant' && session && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/(assistant)/sessions/${session.id}/edit` as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Ubah / Arsipkan Sesi</Text>
            </TouchableOpacity>
          )}
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  editButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  editButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  details: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: colors.text, fontSize: 16 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  time: { gap: spacing.sm },
});
