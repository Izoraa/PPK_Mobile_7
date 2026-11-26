# Sprint 1 — User Story, Pembagian Kerja & Daftar SRS

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 1 |
| **Tema** | Antarmuka dan Alur Praktikum (Data Lokal / Dummy) |
| **Project Manager** | — *(Belum ditetapkan formal; koordinasi bersama)* |
| **Rentang SRS** | `SRS-01` – `SRS-17` (17 SRS) |
| **Status** | ✅ Selesai (Arsip Historis) |

---

## 1. Deskripsi & Kebutuhan Sprint

Pada Sprint 1, tim membangun fondasi aplikasi React Native untuk mendemonstrasikan dua sisi pengguna (**Praktikan** dan **Asisten**) tanpa database maupun sistem kredensial. Seluruh identitas pengguna, jadwal, dan sesi menggunakan data lokal (*dummy*) dan dikelola di *state* selama aplikasi berjalan.

### Kebutuhan Fungsional Utama
1. **Jadwal dan detail sesi:** Pengguna dapat melihat jadwal serta informasi sesi (nama praktikum, kelas/lab, waktu, dan status sesi).
2. **Pengelolaan sesi:** Asisten dapat membuka dan menutup sesi dengan perubahan status yang langsung terlihat pada antarmuka.
3. **Pencatatan presensi:** Praktikan dapat melakukan presensi ketika sesi dibuka; aplikasi mencatat waktu kehadiran, memberikan umpan balik, dan mencegah presensi ganda pada sesi yang sama.
4. **Rekapitulasi sederhana:** Asisten dapat melihat daftar praktikan yang sudah presensi beserta waktunya; praktikan dapat melihat catatan kehadirannya sendiri.
5. **Interaksi yang jelas:** Menggunakan form untuk pemilihan peran/identitas serta modal/bottom sheet untuk konfirmasi dan informasi pendukung.
6. **Tata letak & kondisi khusus:** Menggunakan Flexbox, navigasi antar halaman, dan menangani daftar kosong, sesi belum dibuka, sesi ditutup, serta presensi sudah tercatat.

---

## 2. Ringkasan Pembagian Kerja

| Porsi | Programmer | Rentang SRS | Fokus Utama |
| :---: | :--- | :--- | :--- |
| **1** | **Maulana Ghazzam Adil Al Faiq** | `SRS-01` – `SRS-05` | Jadwal, detail sesi, & role picker |
| **2** | **Jordan Tenggara** | `SRS-06` – `SRS-09` | Pengelolaan sesi praktikum (buka/tutup + modal konfirmasi) & fondasi state |
| **3** | **Hasta Putra Wildantara** | `SRS-10` – `SRS-14` | Presensi praktikan, validasi lokal, & umpan balik |
| **4** | **Hanif Ihsanul Huda** | `SRS-15` – `SRS-17` | Rekap sederhana & catatan riwayat kehadiran |

---

## 3. Daftar Lengkap SRS & User Story

### Porsi 1 — Maulana Ghazzam Adil Al Faiq (`SRS-01` – `SRS-05`)

| Kode SRS | User Story |
| :--- | :--- |
| `SRS-01` | Sebagai pengguna, saya ingin memilih peran (Praktikan atau Asisten Praktikum) dan identitas dari data dummy agar dapat menggunakan aplikasi sesuai peran saya. |
| `SRS-02` | Sebagai praktikan atau asisten, saya ingin melihat jadwal praktikum agar mengetahui jadwal kegiatan praktikum. |
| `SRS-03` | Sebagai praktikan atau asisten, saya ingin melihat detail sesi yang mencakup nama praktikum, kelas/laboratorium, waktu, dan status agar mengetahui informasi sesi praktikum. |
| `SRS-04` | Sebagai pengguna, saya ingin melihat informasi ketika daftar jadwal masih kosong agar mengetahui bahwa belum ada jadwal yang tersedia. |
| `SRS-05` | Sebagai pengguna, saya ingin berpindah dari halaman jadwal ke halaman detail sesi agar dapat melihat informasi sesi yang dipilih. |

### Porsi 2 — Jordan Tenggara (`SRS-06` – `SRS-09`)

| Kode SRS | User Story |
| :--- | :--- |
| `SRS-06` | Sebagai asisten praktikum, saya ingin membuka sesi praktikum agar praktikan dapat melakukan presensi ketika sesi dimulai. |
| `SRS-07` | Sebagai asisten praktikum, saya ingin menutup sesi praktikum setelah kegiatan selesai agar status sesi menunjukkan bahwa kegiatan telah berakhir. |
| `SRS-08` | Sebagai pengguna, saya ingin melihat perubahan status sesi setelah asisten membuka atau menutup sesi agar mengetahui kondisi sesi terkini. |
| `SRS-09` | Sebagai asisten praktikum, saya ingin mendapatkan konfirmasi sebelum membuka atau menutup sesi agar dapat memastikan tindakan yang dilakukan (menggunakan modal). |

### Porsi 3 — Hasta Putra Wildantara (`SRS-10` – `SRS-14`)

| Kode SRS | User Story |
| :--- | :--- |
| `SRS-10` | Sebagai praktikan, saya ingin melakukan presensi ketika sesi praktikum telah dibuka agar kehadiran saya tercatat. |
| `SRS-11` | Sebagai praktikan, saya ingin waktu kehadiran dicatat ketika presensi berhasil agar terdapat catatan waktu presensi. |
| `SRS-12` | Sebagai praktikan, saya ingin sistem mencegah presensi lebih dari satu kali pada sesi yang sama agar tidak terjadi pencatatan kehadiran ganda. |
| `SRS-13` | Sebagai praktikan, saya ingin mendapatkan umpan balik setelah melakukan presensi agar mengetahui apakah presensi berhasil atau tidak dapat dilakukan. |
| `SRS-14` | Sebagai praktikan, saya ingin melihat informasi ketika sesi belum dibuka atau presensi sudah tercatat agar mengetahui alasan presensi tidak dapat dilakukan. |

### Porsi 4 — Hanif Ihsanul Huda (`SRS-15` – `SRS-17`)

| Kode SRS | User Story |
| :--- | :--- |
| `SRS-15` | Sebagai asisten praktikum, saya ingin melihat daftar praktikan yang telah melakukan presensi beserta waktu kehadirannya agar dapat memantau kehadiran praktikan. |
| `SRS-16` | Sebagai praktikan, saya ingin melihat catatan kehadiran saya sendiri agar dapat mengetahui riwayat presensi. |
| `SRS-17` | Sebagai asisten praktikum, saya ingin melihat informasi ketika belum ada praktikan yang melakukan presensi agar mengetahui bahwa daftar kehadiran masih kosong. |

---

## 4. Alur Demo & Deliverable Utama

1. **Alur Utama Sprint 1:** Asisten buka sesi → Praktikan melakukan presensi → Asisten melihat rekap kehadiran → Asisten menutup sesi, dengan informasi yang konsisten pada kedua peran dalam state aplikasi.
