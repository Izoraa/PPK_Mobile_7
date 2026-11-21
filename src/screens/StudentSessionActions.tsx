import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAttendanceState } from '@/features/attendance/hooks';
import { LeaveRequestPanel } from '@/features/leave/components/LeaveRequestPanel';
import { CheckInPanel } from '@/components/session/CheckInPanel';
import { radius, spacing } from '@/theme';

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionIsLive: boolean;
};

export function StudentSessionActions({ sessionId, sessionTitle, sessionIsLive }: Props) {
  const attendanceState = useAttendanceState(sessionId);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.attendanceButton, pressed && styles.pressed]}
        onPress={() => router.push(`/(student)/attendance/${encodeURIComponent(sessionId)}` as any)}
      >
        <Text style={styles.attendanceLabel}>Buka Presensi QR</Text>
      </Pressable>

      <CheckInPanel sessionId={sessionId} attendanceState={attendanceState} />
      <LeaveRequestPanel
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        sessionIsLive={sessionIsLive}
        attendanceState={attendanceState}
      />
    </>
  );
}

const styles = StyleSheet.create({
  attendanceButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: '#0D21A1', // Warna biru solid LabCheckIn
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: '#0D21A1',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: {
    opacity: 0.85,
  },
  attendanceLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});