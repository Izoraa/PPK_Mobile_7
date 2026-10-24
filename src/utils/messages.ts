import { CheckInError } from '../types';

export const CHECK_IN_ERROR_MESSAGES: Record<CheckInError, string> = {
  SESSION_NOT_OPEN: 'Sesi belum dibuka oleh asisten. Presensi belum bisa dilakukan.',
  SESSION_CLOSED: 'Sesi sudah ditutup. Presensi tidak bisa dilakukan lagi.',
  ALREADY_CHECKED_IN: 'Kehadiran kamu sudah tercatat di sesi ini.',
  NOT_A_STUDENT: 'Hanya praktikan yang dapat melakukan presensi.',
};

export const CHECK_IN_SUCCESS_MESSAGE = (time: string) =>
  `Presensi berhasil dicatat pukul ${time}.`;

export const CONFIRM_OPEN_SESSION = {
  title: 'Buka sesi?',
  message: 'Setelah dibuka, praktikan dapat melakukan presensi.',
};

export const CONFIRM_CLOSE_SESSION = {
  title: 'Tutup sesi?',
  message: 'Setelah ditutup, praktikan tidak dapat presensi lagi dan sesi tidak bisa dibuka kembali.',
};

export const EMPTY_STATE_TEXT = {
  schedule: { title: 'Belum ada jadwal', message: 'Jadwal praktikum belum tersedia.' },
  attendees: { title: 'Belum ada yang presensi', message: 'Daftar kehadiran masih kosong.' },
  history: { title: 'Belum ada riwayat', message: 'Kamu belum melakukan presensi pada sesi mana pun.' },
};
