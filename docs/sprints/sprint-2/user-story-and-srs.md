# Sprint 2 — User Story, Pembagian Kerja & Daftar SRS

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 2 |
| **Tema** | Data Dinamis dengan Firebase Authentication, Cloud Firestore & Klasifikasi Izin Berbantuan AI |
| **Project Manager** | Hasta Putra Wildantara |
| **Rentang SRS** | `S2-SRS-01` – `S2-SRS-40` (40 SRS) |
| **Status** | ✅ Selesai (Arsip Historis) |

---

## 1. Deskripsi & Kebutuhan Sprint

Pada Sprint 2, aplikasi berevolusi dari data lokal menjadi aplikasi multi-pengguna *real-time* yang persisten dengan mengintegrasikan **Firebase Authentication**, **Cloud Firestore**, serta **API Model AI** dari pengajar untuk membantu klasifikasi alasan pengajuan izin praktikan.

### Kebutuhan Fungsional Utama
1. **Autentikasi pengguna:** Registrasi, login, dan logout melalui Firebase Authentication dengan identitas dan peran (`student` / `assistant`).
2. **Pengelolaan data praktikum (CRUD):** Data kelas, peserta, jadwal, dan sesi disimpan dan dikelola di Cloud Firestore.
3. **Presensi terintegrasi:** Presensi hanya saat sesi dibuka, tersimpan di Firestore, dan maksimal satu kali per sesi per praktikan.
4. **Sinkronisasi data real-time & persistensi:** Perubahan sesi, presensi, dan rekap langsung terlihat tanpa restart dan tetap tersedia setelah aplikasi ditutup.
5. **Pengajuan izin:** Praktikan mengajukan izin untuk sesi tertentu dengan alasan ketidakhadiran yang tersimpan dan dapat dipantau statusnya.
6. **Integrasi AI:** Mengirim alasan izin ke API model AI pengajar untuk klasifikasi kategori sebagai informasi pendukung (bukan pengambil keputusan otomatis).
7. **Pemeriksaan izin:** Asisten melihat daftar pengajuan izin beserta hasil klasifikasi AI, kemudian menerima atau menolak secara manual.
8. **Validasi & keamanan data:** Penanganan input tidak valid, kegagalan autentikasi/layanan, serta pembatasan akses melalui Firebase Security Rules.

---

## 2. Ringkasan Pembagian Kerja

| Porsi | Programmer | Rentang SRS | Fokus Utama |
| :---: | :--- | :--- | :--- |
| **1** | **Maulana Ghazzam Adil Al Faiq** | `S2-SRS-01` – `S2-SRS-10` | Autentikasi, profil pengguna, persistensi data, & keamanan akses (Security Rules) |
| **2** | **Jordan Tenggara** | `S2-SRS-11` – `S2-SRS-20` | Pengelolaan kelas, peserta, jadwal, & sesi praktikum |
| **3** | **Hanif Ihsanul Huda** | `S2-SRS-21` – `S2-SRS-30` | Presensi, rekap & riwayat kehadiran, pemeriksaan izin, sinkronisasi realtime, & pengujian integrasi |
| **4** | **Izzatu Khairul Fata** | `S2-SRS-31` – `S2-SRS-40` | Pengajuan & status izin, integrasi AI, penanganan gangguan layanan, & konsistensi navigasi/UI |

---

## 3. Daftar Lengkap SRS & User Story

### Porsi 1 — Maulana Ghazzam Adil Al Faiq (`S2-SRS-01` – `S2-SRS-10`)

| Kode SRS | User Story |
| :--- | :--- |
| `S2-SRS-01` | Sebagai pengguna, saya ingin melakukan registrasi melalui Firebase Authentication agar memiliki akun pribadi. |
| `S2-SRS-02` | Sebagai pengguna, saya ingin profil dan peran tersimpan berdasarkan UID akun agar data terhubung dengan identitas yang benar. |
| `S2-SRS-03` | Sebagai calon asisten, saya ingin memperoleh hak akses setelah verifikasi agar kewenangan asisten diberikan secara aman. |
| `S2-SRS-04` | Sebagai pengguna, saya ingin login menggunakan akun terdaftar agar dapat mengakses aplikasi sesuai peran. |
| `S2-SRS-05` | Sebagai pengguna, saya ingin logout dengan aman agar sesi dan data pribadi tidak terlihat oleh pengguna berikutnya. |
| `S2-SRS-06` | Sebagai pengguna, saya ingin sesi login dipulihkan ketika aplikasi dibuka kembali agar tidak perlu login ulang selama sesi masih valid. |
| `S2-SRS-07` | Sebagai pengguna, saya ingin akses halaman dan tindakan dibatasi berdasarkan autentikasi serta peran agar hanya fitur yang berwenang dapat digunakan. |
| `S2-SRS-08` | Sebagai pengguna, saya ingin memperoleh pesan validasi dan kegagalan autentikasi yang jelas agar dapat memperbaiki input atau mencoba kembali. |
| `S2-SRS-09` | Sebagai pengguna, saya ingin data yang berhasil disimpan tetap tersedia setelah aplikasi ditutup atau dibuka di perangkat lain agar informasi tidak hilang. |
| `S2-SRS-10` | Sebagai pengguna, saya ingin data dilindungi Firebase Security Rules dan otorisasi backend agar tidak dapat diakses atau diubah tanpa kewenangan. |

### Porsi 2 — Jordan Tenggara (`S2-SRS-11` – `S2-SRS-20`)

| Kode SRS | User Story |
| :--- | :--- |
| `S2-SRS-11` | Sebagai asisten, saya ingin membuat kelas praktikum agar kegiatan dan peserta dapat dikelola sesuai tanggung jawab saya. |
| `S2-SRS-12` | Sebagai pengguna, saya ingin melihat kelas yang saya kelola atau ikuti agar informasi sesuai kewenangan saya. |
| `S2-SRS-13` | Sebagai asisten, saya ingin mengubah informasi kelas milik saya agar data praktikum tetap sesuai kebutuhan. |
| `S2-SRS-14` | Sebagai asisten, saya ingin mengarsipkan kelas yang tidak digunakan agar daftar kelas aktif tetap relevan tanpa menghapus riwayat. |
| `S2-SRS-15` | Sebagai asisten, saya ingin menambah, melihat, menonaktifkan, dan mengaktifkan kembali peserta agar keanggotaan kelas dapat dikelola. |
| `S2-SRS-16` | Sebagai asisten, saya ingin membuat jadwal dan sesi beserta ruang serta waktunya agar peserta mengetahui pelaksanaan praktikum. |
| `S2-SRS-17` | Sebagai praktikan, saya ingin melihat jadwal dan detail sesi kelas yang saya ikuti agar mengetahui waktu, tempat, dan status kegiatan. |
| `S2-SRS-18` | Sebagai asisten, saya ingin mengubah informasi sesi yang belum dibuka agar perubahan jadwal dapat disampaikan kepada peserta. |
| `S2-SRS-19` | Sebagai asisten, saya ingin mengarsipkan sesi yang belum dibuka agar sesi yang dibatalkan tidak muncul pada daftar aktif tanpa menghilangkan pengajuan tersimpan. |
| `S2-SRS-20` | Sebagai asisten, saya ingin membuka dan menutup sesi melalui konfirmasi agar periode presensi dapat dikendalikan dengan aman. |

### Porsi 3 — Hanif Ihsanul Huda (`S2-SRS-21` – `S2-SRS-30`)

| Kode SRS | User Story |
| :--- | :--- |
| `S2-SRS-21` | Sebagai praktikan, saya ingin melakukan presensi pada sesi terbuka agar kehadiran tersimpan di Firestore berdasarkan akun dan sesi yang diikuti. |
| `S2-SRS-22` | Sebagai praktikan, saya ingin presensi hanya dapat dilakukan ketika memenuhi ketentuan keanggotaan dan status sesi agar kehadiran yang tercatat valid. |
| `S2-SRS-23` | Sebagai praktikan, saya ingin sistem mencegah presensi ganda meskipun menggunakan dua perangkat agar hanya satu kehadiran tercatat pada sesi yang sama. |
| `S2-SRS-24` | Sebagai praktikan, saya ingin melihat proses, hasil, dan pesan kegagalan presensi agar mengetahui apakah kehadiran benar-benar tersimpan. |
| `S2-SRS-25` | Sebagai asisten, saya ingin melihat daftar kehadiran dan ringkasan izin agar dapat memantau partisipasi peserta tanpa menyamakan izin dengan hadir. |
| `S2-SRS-26` | Sebagai praktikan, saya ingin melihat riwayat presensi beserta sesi dan waktunya agar dapat memeriksa kehadiran sebelumnya. |
| `S2-SRS-27` | Sebagai asisten, saya ingin melihat pengajuan izin beserta alasan dan klasifikasi AI agar memiliki informasi pendukung saat memeriksa pengajuan. |
| `S2-SRS-28` | Sebagai asisten, saya ingin menerima atau menolak izin secara manual dengan keputusan yang tersimpan agar praktikan mengetahui hasil pemeriksaan. |
| `S2-SRS-29` | Sebagai pengguna, saya ingin perubahan sesi, presensi, klasifikasi, dan keputusan izin muncul secara realtime agar informasi konsisten tanpa menjalankan ulang aplikasi. |
| `S2-SRS-30` | Sebagai Project Manager, saya ingin memperoleh bukti pengujian alur presensi dan izin lintas pengguna serta perangkat yang dikoordinasikan Hanif agar dapat menilai kesiapan demo. |

### Porsi 4 — Izzatu Khairul Fata (`S2-SRS-31` – `S2-SRS-40`)

| Kode SRS | User Story |
| :--- | :--- |
| `S2-SRS-31` | Sebagai praktikan, saya ingin mengisi alasan ketidakhadiran pada sesi yang memenuhi ketentuan agar dapat mengajukan izin. |
| `S2-SRS-32` | Sebagai praktikan, saya ingin pengajuan izin disimpan sebelum AI dipanggil agar pengajuan tidak hilang ketika layanan AI bermasalah. |
| `S2-SRS-33` | Sebagai praktikan, saya ingin memantau status izin, hasil klasifikasi, dan catatan pemeriksa agar mengetahui perkembangan pengajuan saya. |
| `S2-SRS-34` | Sebagai praktikan, saya ingin alasan izin dikirim secara aman ke API model AI pengajar agar diperoleh prediksi kategori alasan. |
| `S2-SRS-35` | Sebagai pengguna terkait, saya ingin hasil klasifikasi AI yang valid tersimpan bersama pengajuan agar dapat dilihat kembali sebagai informasi pendukung. |
| `S2-SRS-36` | Sebagai praktikan, saya ingin pengajuan tetap tersimpan dan dapat diperiksa ketika AI gagal atau tidak merespons agar proses izin tidak terhambat. |
| `S2-SRS-37` | Sebagai pemohon atau asisten terkait, saya ingin mencoba ulang klasifikasi yang gagal secara aman agar hasil AI dapat diperoleh tanpa membuat pengajuan ganda. |
| `S2-SRS-38` | Sebagai pengguna, saya ingin klasifikasi AI dijelaskan sebagai informasi pendukung agar keputusan menerima atau menolak izin tetap dilakukan oleh asisten. |
| `S2-SRS-39` | Sebagai pengguna, saya ingin kondisi loading, data kosong, input tidak valid, dan gangguan layanan ditampilkan dengan jelas agar mengetahui tindakan pemulihan yang tersedia. |
| `S2-SRS-40` | Sebagai pengguna, saya ingin navigasi dan antarmuka mobile konsisten serta sesuai peran agar dapat menggunakan aplikasi tanpa halaman rusak atau alur yang membingungkan. |

---

## 4. Alur Demo & Deliverable Utama

1. **Alur 1 — Presensi Realtime:** Asisten login → membuka sesi → praktikan login dan melakukan presensi → data tersimpan di Firestore → asisten melihat rekap kehadiran secara *real-time* → asisten menutup sesi.
2. **Alur 2 — Pengajuan Izin & AI:** Praktikan login → mengajukan izin → AI mengklasifikasikan alasan → asisten memeriksa dan memberikan keputusan → praktikan melihat status pengajuannya secara *real-time*.
