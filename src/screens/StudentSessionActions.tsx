import { useAttendanceState } from '@/features/attendance/hooks';
import { LeaveRequestPanel } from '@/features/leave/components/LeaveRequestPanel';
import { CheckInPanel } from '@/components/session/CheckInPanel';

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionIsLive: boolean;
};

export function StudentSessionActions({ sessionId, sessionTitle, sessionIsLive }: Props) {
  const attendanceState = useAttendanceState(sessionId);

  return (
    <>
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
