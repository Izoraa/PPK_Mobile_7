import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceList } from '@/components/session/AttendanceList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';
import { formatDate } from '@/utils/format';

export default function AttendanceScreen() {
  const { sessions } = useApp();
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId?: string }>();
  const requestedSessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    requestedSessionId ?? sessions[0]?.id ?? null,
  );

  useEffect(() => {
    if (requestedSessionId) {
      setSelectedSessionId(
        sessions.some((session) => session.id === requestedSessionId)
          ? requestedSessionId
          : null,
      );
      return;
    }

    if (!selectedSessionId || !sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0]?.id ?? null);
    }
  }, [requestedSessionId, selectedSessionId, sessions]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Daftar Presensi
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Pilih sesi untuk melihat praktikan yang sudah melakukan presensi.
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionPicker}>
          {sessions.map((session) => {
            const isSelected = session.id === selectedSessionId;

            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedSessionId(session.id)}
                style={[styles.sessionButton, isSelected && styles.selectedSessionButton]}>
                <ThemedText type="smallBold">{session.course}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {formatDate(session.date)} · {session.id}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedSession ? (
          <View style={styles.listContainer}>
            <ThemedText type="subtitle" style={styles.sessionTitle}>
              {selectedSession.course}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sessionDetails}>
              {formatDate(selectedSession.date)} · {selectedSession.room} · {selectedSession.id}
            </ThemedText>
            <AttendanceList sessionId={selectedSession.id} />
          </View>
        ) : (
          <EmptyState
            title="Sesi belum dipilih"
            message="Pilih sesi untuk melihat daftar presensinya."
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  description: {
    marginBottom: spacing.xs,
  },
  sessionPicker: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sessionButton: {
    minWidth: 180,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSessionButton: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  listContainer: {
    flex: 1,
  },
  sessionTitle: {
    marginBottom: spacing.xs,
  },
  sessionDetails: {
    marginBottom: spacing.sm,
  },
});
