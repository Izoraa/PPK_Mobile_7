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
          <Pressable accessibilityRole="button" style={styles.attendanceButton}>
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
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  attendanceLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
