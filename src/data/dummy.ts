import { User, Session, Attendance } from '../types';

export const USERS: User[] = [
  { id: 'ast1', name: 'Kak Rina (Asisten)', role: 'assistant' },
  { id: 'ast2', name: 'Kak Dimas (Asisten)', role: 'assistant' },
  { id: 'stu1', name: 'Andi Pratama', studentNumber: '24001', role: 'student' },
  { id: 'stu2', name: 'Bella Sari', studentNumber: '24002', role: 'student' },
  { id: 'stu3', name: 'Citra Lestari', studentNumber: '24003', role: 'student' },
  { id: 'stu4', name: 'Dani Kurniawan', studentNumber: '24004', role: 'student' },
];

export const SESSIONS: Session[] = [
  {
    id: 'sess1',
    course: 'Pemrograman Mobile',
    room: 'Lab Komputer 1',
    date: '2026-10-26',
    startTime: '08:00',
    endTime: '10:00',
    status: 'not_open',
    assistantId: 'ast1',
    openedAt: null,
    closedAt: null,
  },
  {
    id: 'sess2',
    course: 'Basis Data',
    room: 'Lab Komputer 2',
    date: '2026-10-26',
    startTime: '10:30',
    endTime: '12:30',
    status: 'open',
    assistantId: 'ast1',
    openedAt: '2026-10-26T03:30:00.000Z',
    closedAt: null,
  },
  {
    id: 'sess3',
    course: 'Jaringan Komputer',
    room: 'Lab Jaringan',
    date: '2026-10-19',
    startTime: '13:00',
    endTime: '15:00',
    status: 'closed',
    assistantId: 'ast2',
    openedAt: '2026-10-19T06:00:00.000Z',
    closedAt: '2026-10-19T08:00:00.000Z',
  },
  {
    id: 'sess4',
    course: 'Pemrograman Mobile',
    room: 'Lab Komputer 1',
    date: '2026-10-27',
    startTime: '08:00',
    endTime: '10:00',
    status: 'not_open',
    assistantId: 'ast2',
    openedAt: null,
    closedAt: null,
  },
];

// Riwayat awal: stu1 dan stu2 hadir di sess3. stu3 dan stu4 belum punya riwayat
// (berguna untuk menguji tampilan "riwayat kosong").
export const ATTENDANCES: Attendance[] = [
  { id: 'att1', sessionId: 'sess3', studentId: 'stu1', checkedInAt: '2026-10-19T06:05:00.000Z' },
  { id: 'att2', sessionId: 'sess3', studentId: 'stu2', checkedInAt: '2026-10-19T06:12:00.000Z' },
];
