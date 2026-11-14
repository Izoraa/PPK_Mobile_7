import type { AppErrorCode } from '@/types';

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: 'Sesi login tidak ditemukan. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses ke data ini.',
  VALIDATION_ERROR: 'Periksa kembali data yang Anda masukkan.',
  PASSWORD_POLICY: 'Kata sandi belum memenuhi ketentuan.',
  PROFILE_INCOMPLETE: 'Profil akun belum lengkap. Lengkapi profil lalu coba lagi.',
  NETWORK_ERROR: 'Koneksi terganggu. Periksa internet lalu coba lagi.',
  SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia. Coba lagi beberapa saat.',
  CONFLICT: 'Data sudah berubah atau diproses. Muat ulang untuk melihat status terbaru.',
  NOT_FOUND: 'Data sesi tidak ditemukan.',
  CLASS_ARCHIVED: 'Kelas sudah diarsipkan. Pengajuan izin baru tidak dapat dibuat.',
  SESSION_ARCHIVED: 'Sesi sudah diarsipkan. Pengajuan izin baru tidak dapat dibuat.',
  SESSION_CLOSED: 'Sesi sudah ditutup. Pengajuan izin tidak dapat dibuat.',
  NOT_ENROLLED: 'Anda bukan anggota aktif kelas ini.',
  ALREADY_CHECKED_IN: 'Presensi untuk sesi ini sudah tercatat.',
  ALREADY_SUBMITTED: 'Pengajuan izin untuk sesi ini sudah tercatat.',
  PARTICIPATION_CONFLICT: 'Anda sudah memiliki partisipasi untuk sesi ini.',
};

export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code];
}
