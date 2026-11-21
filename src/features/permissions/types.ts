export type PermissionType = 'camera' | 'location' | 'notification';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

export interface PermissionDetails {
  type: PermissionType;
  title: string;
  description: string;
  impactMessage: string;
  actionGuide: string;
}

export const PERMISSION_METADATA: Record<PermissionType, PermissionDetails> = {
  camera: {
    type: 'camera',
    title: 'Izin Akses Kamera',
    description: 'Aplikasi memerlukan izin kamera untuk memindai kode QR sesi praktikum.',
    impactMessage: 'Tanpa izin kamera, Anda tidak dapat memindai QR code untuk melakukan presensi.',
    actionGuide: 'Ketuk tombol di bawah untuk mengizinkan akses kamera atau buka Pengaturan aplikasi.',
  },
  location: {
    type: 'location',
    title: 'Izin Akses Lokasi (GPS)',
    description: 'Aplikasi memerlukan akses lokasi untuk memastikan Anda berada di dalam radius laboratorium.',
    impactMessage: 'Tanpa izin lokasi, kehadiran Anda tidak dapat divalidasi terhadap titik lab yang ditentukan.',
    actionGuide: 'Aktifkan izin lokasi (presisi/tinggi) di Pengaturan perangkat Anda agar presensi valid.',
  },
  notification: {
    type: 'notification',
    title: 'Izin Notifikasi',
    description: 'Aplikasi memerlukan izin notifikasi untuk mengirimkan info pembukaan sesi, perubahan jadwal, dan status izin.',
    impactMessage: 'Tanpa izin notifikasi, Anda mungkin tertinggal pengumuman penting seputar praktikum.',
    actionGuide: 'Aktifkan notifikasi melalui Pengaturan perangkat untuk menerima pembaruan secara realtime.',
  },
};