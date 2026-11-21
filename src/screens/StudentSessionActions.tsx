import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAttendanceState } from '@/features/attendance/hooks';
import { LeaveRequestPanel } from '@/features/leave/components/LeaveRequestPanel';
import { CheckInPanel } from '@/components/session/CheckInPanel';
import { colors, radius, spacing } from '@/theme';

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionIsLive: boolean;
};

export function StudentSessionActions({ sessionId, sessionTitle, sessionIsLive }: Props) {
  const attendanceState = useAttendanceState(sessionId);

  return (
    <>
      {sessionIsLive && (
        <Link href={`/(student)/attendance/${encodeURIComponent(sessionId)}` as Href} asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.attendanceButton, pressed && styles.pressed]}
          >
            <Text style={styles.attendanceIcon}>📷</Text>
            <Text style={styles.attendanceLabel}>Buka Presensi QR</Text>
          </Pressable>
        </Link>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginBottom: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  attendanceIcon: {
    fontSize: 18,
  },
  attendanceLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
