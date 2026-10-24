import type { AttendanceRecord } from './types';

export const CURRENT_PRAKTIKAN = {
  id: 'praktikan-001',
  name: 'Alya Putri',
};

export const DUMMY_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'attendance-001',
    praktikanId: CURRENT_PRAKTIKAN.id,
    praktikanName: CURRENT_PRAKTIKAN.name,
    timestamp: '2026-10-22T08:15:00+07:00',
  },
  {
    id: 'attendance-002',
    praktikanId: 'praktikan-002',
    praktikanName: 'Bima Pratama',
    timestamp: '2026-10-22T08:19:00+07:00',
  },
  {
    id: 'attendance-003',
    praktikanId: 'praktikan-003',
    praktikanName: 'Citra Lestari',
    timestamp: '2026-10-22T08:23:00+07:00',
  },
];

export function getAttendanceHistoryForPraktikan(
  records: AttendanceRecord[],
  praktikanId: string,
) {
  return records.filter((record) => record.praktikanId === praktikanId);
}
