import { useState } from 'react';
import { Redirect } from 'expo-router';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceList } from '@/components/session/AttendanceList';
import { CheckInPanel } from '@/components/session/CheckInPanel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';
import type { Session } from '@/types';
import { formatDate } from '@/utils/format';

const STATUS_LABELS: Record<Session['status'], string> = {
  not_open: 'Belum dibuka',
  open: 'Sedang berlangsung',
  closed: 'Selesai',
};

export default function AttendanceScreen() {
  const { currentUser, sessions, getAttendancesBySession } = useApp();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  if (!currentUser) return <Redirect href="/" />;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.appName}>LabCheckIn</ThemedText>
        </View>
        <FlatList
          data={sessions}
          keyExtractor={(session) => session.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.pageTitle}>
                Rekap Presensi
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.pageDescription}>
                Pilih sesi untuk melihat mahasiswa yang sudah hadir.
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="Belum ada sesi"
              message="Belum ada sesi praktikum yang tersedia untuk direkap."
            />
          }
          renderItem={({ item }) => {
            const attendanceCount = getAttendancesBySession(item.id).length;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedSession(item)}
                style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeading}>
                    <ThemedText type="subtitle" style={styles.cardText}>
                      {item.room}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.cardText}>
                      {item.course}
                    </ThemedText>
                  </View>
                  <View style={styles.countBadge}>
                    <ThemedText type="smallBold" style={styles.countText}>
                      {attendanceCount}
                    </ThemedText>
                    <ThemedText type="small" style={styles.countLabel}>
                      hadir
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.sessionInfo}>
                  {formatDate(item.date)} · {item.startTime}–{item.endTime}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small" style={styles.cardSecondaryText}>
                  {STATUS_LABELS[item.status]} · Ketuk untuk melihat daftar mahasiswa
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>

      <Modal
        visible={selectedSession !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.bottomSheet}>
            {selectedSession && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeading}>
                    <ThemedText style={styles.sheetRoom}>{selectedSession.room}</ThemedText>
                    <ThemedText style={styles.sheetCourse}>{selectedSession.course}</ThemedText>
                    <ThemedText style={styles.sheetDetails}>
                      {formatDate(selectedSession.date)} · {selectedSession.startTime}–{selectedSession.endTime}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityLabel="Tutup detail presensi"
                    accessibilityRole="button"
                    onPress={() => setSelectedSession(null)}
                    style={styles.closeButton}>
                    <ThemedText style={styles.closeButtonText}>×</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.sheetContent}>
                  <CheckInPanel sessionId={selectedSession.id} />

                  <ThemedText type="subtitle" style={styles.sheetListTitle}>
                    Mahasiswa yang hadir
                  </ThemedText>
                  <AttendanceList
                    sessionId={selectedSession.id}
                    emptyTitle="Belum ada mahasiswa yang presensi"
                    emptyMessage="Belum ada kehadiran yang tercatat pada sesi ini."
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#25D366',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'left',
  },
  pageTitle: {
    color: '#000000',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  pageDescription: {
    marginTop: spacing.xs,
  },
  sessionCard: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardHeading: {
    flex: 1,
    gap: spacing.xs,
  },
  cardText: {
    color: colors.text,
  },
  countBadge: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#E8F5EA',
  },
  countText: {
    color: '#2E8B3C',
    fontSize: 18,
  },
  countLabel: {
    color: '#2E8B3C',
  },
  sessionInfo: {
    color: colors.textMuted,
    fontSize: 15,
  },
  cardSecondaryText: {
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomSheet: {
    maxHeight: '82%',
    minHeight: '82%',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: '#25D366',
  },
  sheetHeading: {
    flex: 1,
    gap: spacing.xs,
  },
  sheetRoom: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  sheetCourse: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  sheetDetails: {
    color: '#D6DEFA',
    fontSize: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },
  sheetContent: {
    flex: 1,
    padding: spacing.md,
  },
  sheetListTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
