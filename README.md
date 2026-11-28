# LabCheckIn — Aplikasi Manajemen & Presensi Praktikum Laboratorium

> Aplikasi mobile lintas platform berbasis **React Native (Expo SDK 58)** untuk manajemen laboratorium, presensi praktikum berbasis QR Code & GPS, pengajuan izin berbantuan AI (klasifikasi kategori & rencana analisis sentimen Sprint 4), notifikasi push real-time, serta pengelolaan denda keterlambatan terintegrasi **Midtrans Sandbox** *(target Sprint 4)*.

![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-0D21A1?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.88-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Status](https://img.shields.io/badge/Status-Sprint%204%20In%20Progress-EEC643?style=flat-square)

---

## Daftar Isi

1. [Tentang Proyek](#1-tentang-proyek)
2. [Identitas Anggota Kelompok](#2-identitas-anggota-kelompok)
3. [Ringkasan Evolusi & Master Tabel SRS (Sprint 1 – Sprint 4)](#3-ringkasan-evolusi--master-tabel-srs-sprint-1--sprint-4)
4. [Cara Reproduce & Menjalankan Proyek](#4-cara-reproduce--menjalankan-proyek)
5. [Arsitektur, Struktur Direktori & Dokumentasi Kontrak](#5-arsitektur-struktur-direktori--dokumentasi-kontrak)
6. [Pengujian & Pemeriksaan Kualitas](#6-pengujian--pemeriksaan-kualitas)
7. [Database Seeder & Data Uji (Tahap Akhir Sprint 4)](#7-database-seeder--data-uji-tahap-akhir-sprint-4)
8. [Alur Kontribusi & Branching Git](#8-alur-kontribusi--branching-git)

---

## 1. Tentang Proyek

**LabCheckIn** adalah aplikasi mobile yang dikembangkan oleh **Kelompok 7 — PPK Mobile** untuk mendigitalisasi seluruh operasional kegiatan praktikum di laboratorium Informatika secara *real-time*, aman, dan terverifikasi.

### Tiga Peran Pengguna Utama

| Peran (Label UI) | Enum Internal | Ruang Lingkup & Wewenang |
| :--- | :--- | :--- |
| **Asisten Laboratorium (Aslab)** | `coordinator` | Mengelola data laboratorium, koordinat/radius presensi, kebijakan *grace period* & denda, 3 jalur *single/bulk insert* (lab, praktikan, asprak) beserta template & review interaktif, memindahkan praktikan/aslab antar lab, serta memantau **Dashboard Keberlangsungan Lab & Keuangan Denda** (filter hari/minggu/bulan). |
| **Asisten Praktikum (Asprak)** | `assistant` | Fokus pada pelaksanaan kelas tanggung jawabnya: melihat jadwal/sesi, membuka & menutup sesi secara *real-time*, menerbitkan QR presensi (berlaku 15 menit), memantau kehadiran & keterlambatan praktikan, serta memeriksa & memutuskan pengajuan izin dengan dukungan analisis AI. |
| **Praktikan** | `student` | Melihat jadwal & detail sesi kelasnya, melakukan presensi QR Code tervalidasi lokasi GPS & *grace period*, melihat peta interaktif & aktivitas lab, mengajukan & memantau izin, melihat tagihan denda, membayar denda via **Midtrans Sandbox**, menerima *push notification*, serta melihat riwayat presensi & pembayaran. |

### Teknologi yang Digunakan (*Tech Stack*)

| Lapisan | Teknologi |
| :--- | :--- |
| **Frontend Mobile** | React Native `0.88.1`, Expo SDK `58`, TypeScript, Expo Router (`src/app/`) |
| **Autentikasi & Database** | Firebase Authentication (Email/Password) & Cloud Firestore |
| **Trusted Backend API** | LabCheckIn Express REST API (`EXPO_PUBLIC_LABCHECKIN_API_URL`) untuk QR, check-in, review izin, worker notifikasi, serta *(Sprint 4)* *grace period*, denda, & Midtrans |
| **AI Service** | Cloudflare Worker / API Model AI Pengajar (`EXPO_PUBLIC_LEAVE_AI_API_URL`) untuk klasifikasi kategori & *(Sprint 4)* analisis sentimen alasan izin |
| **Payment Gateway** | Midtrans Sandbox *(target Sprint 4 — Snap Checkout + verifikasi SHA-512 Webhook di backend)* |
| **Peta & Geotag** | Leaflet Offline Assets (`assets/maps/dist/`) + `react-native-webview` + `expo-location` |
| **Push Notification** | Expo Push Service + Firebase Cloud Messaging (FCM V1) |
| **Build & Distribusi** | EAS Build (`development` untuk dev client, `preview` untuk APK demo) |

---

## 2. Identitas Anggota Kelompok

| No | Nama Lengkap | NIM | GitHub | Peran di Sprint 4 | Fokus Utama (Sprint 4) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Jordan Tenggara** | `24060124120044` | [@jordantenggara](https://github.com/jordantenggara) | **Project Manager (PM)** | Manajemen backlog & kontrak lintas modul, koordinasi `integration/sprint-4` → `main`, dokumentasi, & acceptance/UAT |
| 2 | **Maulana Ghazzam Adil Al Faiq** | `24060124130083` | [@kafeyangasli](https://github.com/kafeyangasli) | Programmer (Porsi 1) | *Grace period* & denda otomatis, Payment Gateway Midtrans Sandbox (*end-to-end* backend, webhook, checkout UI, riwayat bayar), push notifikasi pembayaran, & `firestore.rules` |
| 3 | **Hasta Putra Wildantara** | `24060124130119` | [@hastaputrawildantara99](https://github.com/hastaputrawildantara99) | Programmer (Porsi 2) | Manajemen laboratorium Aslab, konfigurasi radius & batas keterlambatan/denda, 3 fitur *bulk/single insert* terpisah (+ template & *staging `ScrollView`*), perpindahan praktikan & aslab/asprak |
| 4 | **Hanif Ihsanul Huda** | `24060124140183` | [@hanifihsann](https://github.com/hanifihsann) | Programmer (Porsi 3) | Dashboard keberlangsungan lab & riwayat keuangan denda Aslab (filter hari/minggu/bulan), pengelolaan sesi & monitoring presensi/keterlambatan/izin Asprak, & QA integrasi |
| 5 | **Izzatu Khairul Fata** | `24060124120039` | [@Izoraa](https://github.com/Izoraa) | Programmer (Porsi 4) | Upgrade AI analisis sentimen & integrasi *excused absence* bebas denda, penanganan gangguan AI, penyelarasan navigasi/tab 3 peran, & finalisasi UI/UX seluruh aplikasi |

---

## 3. Ringkasan Evolusi & Master Tabel SRS (Sprint 1 – Sprint 4)

### Ringkasan Roadmap per Sprint

| Sprint | Tema Utama | PM | Rentang Kode SRS | Arsip Detail | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **Sprint 1** | Antarmuka & Alur Praktikum (Data Lokal/Dummy) | — | `SRS-01` – `SRS-17` (17 SRS) | [SRS](docs/sprints/sprint-1/user-story-and-srs.md) · [Agreement](docs/sprints/sprint-1/team-agreement.md) | ✅ Selesai |
| **Sprint 2** | Data Dinamis dengan Firebase Auth, Firestore & AI Izin | Hasta | `S2-SRS-01` – `S2-SRS-40` (40 SRS) | [SRS](docs/sprints/sprint-2/user-story-and-srs.md) · [Agreement](docs/sprints/sprint-2/team-agreement.md) | ✅ Selesai |
| **Sprint 3** | Presensi QR + Lokasi GPS, Maps Laboratorium & Push Notification | Hanif | `S3-SRS-01` – `S3-SRS-36` (36 SRS) | [SRS](docs/sprints/sprint-3/user-story-and-srs.md) · [Agreement](docs/sprints/sprint-3/team-agreement.md) | ✅ Selesai |
| **Sprint 4** | Manajemen Lab Aslab, Dashboard Keuangan, Denda, Midtrans Sandbox, AI Sentimen & Finalisasi UI | Jordan | `S4-SRS-01` – `S4-SRS-40` (40 SRS) | [SRS](docs/sprints/sprint-4/user-story-and-srs.md) · [Agreement](docs/sprints/sprint-4/team-agreement.md) | 🚧 Sedang Berjalan |

> **Keterangan Status pada Master Tabel:**  
> ✅ **Aktif / Selesai** · 🔄 **Diperbarui / Digantikan oleh Sprint berikutnya** · 🚧 **Target Sprint 4 (In Progress)**

---

### Sprint 4 — Target Aktif (`S4-SRS-01` – `S4-SRS-40`)

| Kode SRS | Modul / Fitur | Ringkasan Kebutuhan | PIC | Status |
| :--- | :--- | :--- | :--- | :---: |
| `S4-SRS-01` | Keamanan & 3 Peran | Pembaruan `firestore.rules` untuk Aslab, Asprak, Praktikan; `fines` & `paymentTransactions` hanya ditulis backend | Maulana | 🚧 |
| `S4-SRS-02` | *Grace Period* | Perhitungan keterlambatan otomatis di backend check-in (`on_time` vs `late` + `lateMinutes`) | Maulana | 🚧 |
| `S4-SRS-03` | Tagihan Denda | Pembuatan maksimal 1 tagihan denda nominal tetap per keterlambatan; izin disetujui bebas denda | Maulana | 🚧 |
| `S4-SRS-04` | Midtrans Backend | Endpoint `POST /api/v1/payments/create-transaction` (Midtrans Sandbox, Server Key hanya di server) | Maulana | 🚧 |
| `S4-SRS-05` | Webhook Midtrans | Verifikasi SHA-512 webhook, update `pending`/`success`/`failed` & pelunasan tanpa mengubah status kehadiran | Maulana | 🚧 |
| `S4-SRS-06` | Push Notif Pembayaran | Notifikasi `FINE_CREATED`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED` (+ sesi) & *deep-link* tap | Maulana | 🚧 |
| `S4-SRS-07` | Daftar Tagihan | Layar daftar tagihan denda praktikan lengkap dengan rincian sesi, keterlambatan, dan nominal tetap | Maulana | 🚧 |
| `S4-SRS-08` | Checkout Midtrans | Alur pembayaran Midtrans Sandbox di aplikasi via WebView / in-app browser | Maulana | 🚧 |
| `S4-SRS-09` | Status Pembayaran | Pembaruan status `pending`/`success`/`failed` berbasis verifikasi server + coba bayar ulang | Maulana | 🚧 |
| `S4-SRS-10` | Riwayat Pembayaran | Riwayat transaksi & pembayaran persisten di Firestore (tetap tersedia setelah restart) | Maulana | 🚧 |
| `S4-SRS-11` | Manajemen Ruang Lab | CRUD ruang lab fisik (`laboratories`: nama, deskripsi, kapasitas, `geotagId`, `geoPoint`, `radiusMeters`) | Hasta | 🚧 |
| `S4-SRS-12` | Kebijakan Kelas | Pengaturan ruang default (`labId`), *grace period* (`gracePeriodMinutes`), & denda tetap (`fineAmount`) di `classes` | Hasta | 🚧 |
| `S4-SRS-13` | Template Bulk | 3 file template unduhan terpisah untuk bulk insert Kelas/Lab per Matkul, Praktikan, dan Asprak | Hasta | 🚧 |
| `S4-SRS-14` | Staging `ScrollView` | Tampilan preview per baris dalam `ScrollView` (Accept/Deny, edit/update, & isi sel kosong) | Hasta | 🚧 |
| `S4-SRS-15` | Bulk/Single Kelas Lab | Single & bulk insert banyak kelas/grup lab (`classes`) sekaligus berdasarkan satu mata kuliah (terpisah) | Hasta | 🚧 |
| `S4-SRS-16` | Bulk/Single Praktikan | Single & bulk insert data praktikan (`memberships`) ke kelas/grup lab tertentu (terpisah) | Hasta | 🚧 |
| `S4-SRS-17` | Bulk/Single Asprak | Single & bulk insert penugasan asprak ke kelas/grup lab tertentu (terpisah) | Hasta | 🚧 |
| `S4-SRS-18` | Pindah Praktikan | Memindahkan praktikan antar kelas/grup lab tanpa memindah jadwal atau menghapus riwayat lama | Hasta | 🚧 |
| `S4-SRS-19` | Pindah Aslab/Asprak | Memindahkan penugasan Aslab/Asprak antar kelas/grup lab tanpa memindah jadwal praktikum | Hasta | 🚧 |
| `S4-SRS-20` | Sinkronisasi Maps & Batch | Sinkronisasi koordinat/radius ke `MapsScreen`, laporan hasil batch, & pencegahan duplikasi | Hasta | 🚧 |
| `S4-SRS-21` | KPI Dashboard Aslab | Ringkasan real-time jumlah lab, jumlah praktikan, dan status kegiatan tiap lab dari Firestore | Hanif | 🚧 |
| `S4-SRS-22` | Filter Periode | Filter **Hari, Minggu, dan Bulan** untuk jadwal, riwayat kegiatan, dan keuangan denda | Hanif | 🚧 |
| `S4-SRS-23` | Monitoring Jadwal Lab | Status tiap lab, lokasi & waktu, jadwal sedang berlangsung (`open`) & mendatang (`not_open`) | Hanif | 🚧 |
| `S4-SRS-24` | Riwayat Kegiatan Lab | Daftar sesi selesai (`closed`) beserta ringkasan kehadiran, keterlambatan, dan izin | Hanif | 🚧 |
| `S4-SRS-25` | Riwayat Keuangan Denda | Total & rincian keuangan denda (lunas vs tertunda/belum bayar) sesuai filter periode | Hanif | 🚧 |
| `S4-SRS-26` | Pembatasan Akses Asprak | Asprak hanya melihat kelas/sesi tanggung jawabnya; akses distribusi & konfigurasi lab ditutup | Hanif | 🚧 |
| `S4-SRS-27` | Siklus Sesi Asprak | Buka & tutup sesi praktikum tersinkronisasi *real-time* dengan aplikasi praktikan | Hanif | 🚧 |
| `S4-SRS-28` | Monitoring Presensi Telat | Rekap kehadiran Asprak menampilkan status `Tepat Waktu` vs `Terlambat` & status denda | Hanif | 🚧 |
| `S4-SRS-29` | *Excused Absence* Rekap | Izin disetujui tampil sebagai tidak hadir dengan izin & bebas denda (terpisah dari hadir) | Hanif | 🚧 |
| `S4-SRS-30` | QA Integrasi Sprint 4 | Pengujian lintas 3 peran (Aslab, Asprak, Praktikan) & bukti acceptance/demo bersama PM | Hanif | 🚧 |
| `S4-SRS-31` | Pengajuan Izin S4 | Penyempurnaan alur pengajuan izin praktikan terintegrasi konteks lab, sesi, & kebijakan denda | Izzatu | 🚧 |
| `S4-SRS-32` | AI Analisis Sentimen | Upgrade adapter/worker AI ke analisis sentimen alasan izin via API pengajar & simpan ke Firestore | Izzatu | 🚧 |
| `S4-SRS-33` | Tampilan Sentimen AI | Kartu/badge hasil analisis sentimen AI tampil jelas pada Praktikan & Asprak | Izzatu | 🚧 |
| `S4-SRS-34` | AI Pendukung & Bebas Denda | Penegasan AI hanya informasi pendukung; status izin disetujui real-time sebagai *excused absence* bebas denda | Izzatu | 🚧 |
| `S4-SRS-35` | Ketahanan Gangguan AI | Fallback aman & retry saat layanan AI timeout/error tanpa menghambat pengajuan/pemeriksaan | Izzatu | 🚧 |
| `S4-SRS-36` | Navigasi & Tab 3 Peran | Penyelarasan `app-tabs.tsx` & akses rapi ke Pembayaran, Bulk/Transfer, dan Dashboard | Izzatu | 🚧 |
| `S4-SRS-37` | Komponen Status & Error | Standarisasi `StatusBadge`, `AsyncState`, `EmptyState`, & permission untuk seluruh status Sprint 4 | Izzatu | 🚧 |
| `S4-SRS-38` | Finalisasi UI Praktikan | Penyelarasan visual modern & konsisten seluruh layar Praktikan sesuai `src/theme/index.ts` | Izzatu | 🚧 |
| `S4-SRS-39` | Finalisasi UI Asprak & Aslab | Penyelarasan visual layar Asprak & Aslab bebas *overflow*/terpotong | Izzatu | 🚧 |
| `S4-SRS-40` | Audit Viewport & Polish | Audit akhir `SafeAreaView` (notch/kamera), `KeyboardAvoidingView`, microcopy Indonesia, & zero error TS | Izzatu | 🚧 |

---

<details>
<summary><strong>Arsip Master SRS Sprint 3 (S3-SRS-01 – S3-SRS-36) — Klik untuk membuka</strong></summary>

| Kode SRS | Fokus / Ringkasan Kebutuhan | PIC | Status |
| :--- | :--- | :--- | :---: |
| `S3-SRS-01` – `S3-SRS-03` | Penerbitan QR Code sesi `open` dengan identitas sesi, token validasi, & masa berlaku 15 menit | Maulana | ✅ Aktif |
| `S3-SRS-04` – `S3-SRS-06` | Halaman presensi terpisah, pemindaian QR kamera, validasi keaslian QR, sesi `open`, & keanggotaan | Maulana | ✅ Aktif |
| `S3-SRS-07` – `S3-SRS-10` | Validasi koordinat & radius lab, penolakan kondisi tidak valid, anti-duplikasi, & simpan ke Firestore | Maulana | 🔄 Diperluas `S4-SRS-02..03` |
| `S3-SRS-11` – `S3-SRS-15` | Pemilihan titik lab, pengelolaan koordinat & radius 4 titik geotag (A–D) di Firestore | Hasta | 🔄 Diperluas `S4-SRS-11..12` |
| `S3-SRS-16` – `S3-SRS-20` | Peta interaktif Leaflet (marker lab & posisi pengguna real-time) serta info praktikum berjalan & berikutnya | Hasta | ✅ Aktif |
| `S3-SRS-21` – `S3-SRS-22` | Registrasi perangkat FCM & pengelolaan siklus token akun/perangkat | Jordan | ✅ Aktif (via API) |
| `S3-SRS-23` – `S3-SRS-26` | Push notification saat sesi dibuka, jadwal berubah, izin disetujui, & izin ditolak | Jordan | 🔄 Diperluas `S4-SRS-06` |
| `S3-SRS-27` – `S3-SRS-28` | Penentuan target penerima notifikasi & penanganan token tidak valid tanpa mengganggu alur utama | Jordan | ✅ Aktif |
| `S3-SRS-29` – `S3-SRS-33` | Permintaan izin kamera/lokasi/notifikasi, panduan saat izin ditolak, & deteksi GPS mati | Izzatu | ✅ Aktif |
| `S3-SRS-34` – `S3-SRS-36` | Penanganan gagal lokasi/QR/jaringan serta state loading, empty, error, & retry lintas fitur | Izzatu | 🔄 Diperluas `S4-SRS-37` |

</details>

<details>
<summary><strong>Arsip Master SRS Sprint 2 (S2-SRS-01 – S2-SRS-40) — Klik untuk membuka</strong></summary>

| Kode SRS | Fokus / Ringkasan Kebutuhan | PIC | Status |
| :--- | :--- | :--- | :---: |
| `S2-SRS-01` – `S2-SRS-06` | Registrasi, simpan profil UID, aktivasi peran aman, login, logout bersih, & pemulihan sesi Firebase Auth | Maulana | ✅ Aktif |
| `S2-SRS-07` – `S2-SRS-10` | Guard navigasi berbasis peran, validasi auth, persistensi server, & Firebase Security Rules | Maulana | 🔄 Diperluas `S4-SRS-01` |
| `S2-SRS-11` – `S2-SRS-15` | CRUD kelas, pengarsipan kelas, & pengelolaan peserta kelas | Jordan | 🔄 Dialihkan ke Aslab (`S4-SRS-11..19`) |
| `S2-SRS-16` – `S2-SRS-20` | Pembuatan jadwal/sesi, tampilan detail sesuai peran, ubah/arsip sesi `not_open`, & buka/tutup konfirmasi | Jordan | ✅ Aktif (Asprak) |
| `S2-SRS-21` – `S2-SRS-24` | Check-in Firestore, validasi keanggotaan/status, pencegahan presensi ganda atomik, & pemulihan error | Hanif | 🔄 Diperluas `S3-SRS-01..10`, `S4-SRS-02` |
| `S2-SRS-25` – `S2-SRS-26` | Rekap kehadiran asisten (terpisah dari izin) & riwayat presensi praktikan | Hanif | 🔄 Diperluas `S4-SRS-28..29` |
| `S2-SRS-27` – `S2-SRS-30` | Daftar/detail pemeriksaan izin, keputusan manual asisten, sinkronisasi realtime, & verifikasi integrasi | Hanif | ✅ Aktif |
| `S2-SRS-31` – `S2-SRS-33` | Form pengajuan izin, simpan izin sebelum panggil AI, & pemantauan status izin praktikan | Izzatu | 🔄 Diperluas `S4-SRS-31..34` |
| `S2-SRS-34` – `S2-SRS-38` | Integrasi API AI klasifikasi alasan izin, validasi hasil, fallback timeout, retry aman, & disclaimer pendukung | Izzatu | 🔄 Diperluas `S4-SRS-32..35` |
| `S2-SRS-39` – `S2-SRS-40` | State loading/empty/error/jaringan & konsistensi navigasi/UI mobile | Izzatu | 🔄 Diperluas `S4-SRS-36..40` |

</details>

<details>
<summary><strong>Arsip Master SRS Sprint 1 (SRS-01 – SRS-17) — Klik untuk membuka</strong></summary>

| Kode SRS | Fokus / Ringkasan Kebutuhan | PIC | Status |
| :--- | :--- | :--- | :---: |
| `SRS-01` | Memilih peran & identitas dari data dummy | Maulana | 🔄 Digantikan `S2-SRS-01..07` |
| `SRS-02` – `SRS-05` | Daftar jadwal, detail sesi, tampilan jadwal kosong, & navigasi jadwal → detail | Maulana | ✅ Aktif (Firestore) |
| `SRS-06` – `SRS-09` | Buka/tutup sesi oleh asisten, pembaruan status, & modal konfirmasi | Jordan | ✅ Aktif (Firestore) |
| `SRS-10` – `SRS-14` | Presensi praktikan saat sesi terbuka, catat waktu, anti-duplikasi, umpan balik, & info kondisi | Hasta | 🔄 Diperluas `S3-SRS-01..10`, `S4-SRS-02` |
| `SRS-15` – `SRS-17` | Daftar kehadiran praktikan untuk asisten, riwayat praktikan, & empty state | Hanif | ✅ Aktif (Firestore) |

</details>

---

## 4. Cara Reproduce & Menjalankan Proyek

### Prasyarat
* **Node.js** ≥ 20 & **npm** (proyek ini menggunakan `package-lock.json`, bukan `bun.lock`)
* **Android Studio** (untuk emulator) atau **perangkat Android fisik** (wajib untuk pengujian kamera QR, GPS, dan push notification)
* **Expo Dev Client** (aplikasi menggunakan modul native SDK 58 seperti `expo-camera`, `expo-location`, `expo-notifications`, `expo-crypto`, `react-native-webview`)

### Langkah 1 — Clone & Install Dependensi

```bash
git clone https://github.com/Izoraa/PPK_Mobile_7.git
cd PPK_Mobile_7
npm install
```

### Langkah 2 — Konfigurasi Environment Lokal (`.env.local`)

Salin `.env.example` menjadi `.env.local` di root proyek, lalu isi dengan konfigurasi Firebase & endpoint API yang dibagikan secara internal kepada tim/penguji:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=<firebase-web-api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-project-id>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<firebase-web-app-id>
EXPO_PUBLIC_LABCHECKIN_API_URL=https://api.example.com
EXPO_PUBLIC_LEAVE_AI_API_URL=https://leave-ai.example.workers.dev
```

> ⚠️ **Keamanan Kredensial:** Jangan pernah menaruh `MIDTRANS_SERVER_KEY`, `AI_API_KEY`, atau file `firebase-adminsdk.json` di `.env.local` maupun repositori Git. Seluruh secret hanya disimpan di backend server & secret manager.

### Langkah 3 — Menjalankan Aplikasi (Development)

1. **Jalankan Metro Bundler (dengan *clear cache*):**
   ```bash
   npx expo start --dev-client -c
   ```
   *(Jika HP dan laptop berbeda jaringan / Wi-Fi kampus membatasi LAN, tambahkan `--tunnel`)*:
   ```bash
   npx expo start --dev-client --tunnel
   ```
2. **Buka di Perangkat:**
   * **Android (Dev Client APK):** Buka aplikasi dev client yang terpasang di HP lalu scan QR code dari terminal.
   * **Web (untuk pengujian multi-peran bersamaan di laptop):** Tekan tombol **`w`** pada terminal Metro untuk membuka `http://localhost:8081`.

### Langkah 4 — Build APK Menggunakan EAS Build

Pastikan 6 variabel `EXPO_PUBLIC_*` sudah terdaftar di **EAS Environment Variables** dan **FCM V1 Service Account Key** sudah ter-upload di **EAS Credentials** sebelum melakukan build:

```bash
# Development Client APK (untuk ngoding & hot reload)
npx eas-cli@latest build -p android --profile development

# Preview APK Mandiri (untuk demo tanpa laptop)
npx eas-cli@latest build -p android --profile preview
```

---

## 5. Arsitektur, Struktur Direktori & Dokumentasi Kontrak

```text
PPK_Mobile_7/
├── app.json                    # Konfigurasi Expo, plugin kamera/lokasi/notif/Leaflet, googleServicesFile
├── eas.json                    # Profil build EAS (development, preview APK, production)
├── firestore.rules             # Firebase Security Rules lintas peran
├── firestore.indexes.json      # Composite & collection-group indexes Firestore
├── .env.example                # Template variabel environment publik
├── assets/
│   ├── images/ & logos/        # Ikon, splash screen, & logo LabCheckIn
│   └── maps/                   # Aset Leaflet offline (CSS, JS, marker icons)
├── docs/                       # Dokumentasi kontrak teknis, API, & arsip historis sprint
│   └── sprints/                # Arsip kronologis Sprint 1–4 (user story, SRS, agreement)
├── plugins/                    # Custom Expo config plugin (withLeafletMapAssets)
├── scripts/                    # Skrip utilitas (approve-assistant.ps1, reset-project.js)
├── src/
│   ├── app/                    # Expo Router screens & layouts ((auth), (tabs), (coordinator), (assistant), (student))
│   ├── components/             # Komponen bersama (app-tabs, common/*, session/*)
│   ├── features/
│   │   ├── auth/               # Login, Register, Account, Session Restoration
│   │   ├── coordinator/        # Manajemen Lab/Kelas/Asprak & Dashboard Aslab
│   │   ├── geotag/             # Koordinat, radius, Maps Leaflet, & aktivitas lab
│   │   ├── practicum/          # Service kelas, keanggotaan, & siklus sesi
│   │   ├── attendance/         # QR issuer/scanner, GPS check-in, & rekap
│   │   ├── leave/              # Pengajuan izin praktikan & integrasi AI
│   │   ├── leave-review/       # Pemeriksaan & keputusan izin Asprak
│   │   ├── notifications/      # Registrasi token & deep-link push notification
│   │   └── permissions/        # Penanganan izin kamera/lokasi/notifikasi & error UX
│   ├── lib/                    # Inisialisasi Firebase client & LabCheckIn API client
│   ├── providers/              # AuthProvider
│   ├── screens/                # Layar utama (Schedule, SessionDetail, AttendanceHistory, StudentAttendance)
│   ├── state/                  # AppContext
│   ├── theme/                  # Design system tokens (Cobalt #0D21A1, Gold #EEC643, Canvas #F5F7FD)
│   └── utils/                  # Formatter, pesan standar Indonesia, & pemetaan error
└── tests/                      # Unit & integration tests (Jest + Firebase Emulator)
```

### Dokumentasi Kontrak Teknis & Arsip Sprint
* **[Indeks Arsip Historis Sprint 1 – Sprint 4](docs/sprints/README.md)**
* [Master Agreement & Business Rules Terpadu (Sprint 1–4)](docs/sprints/sprint-4/team-agreement.md)
* [User Story, Pembagian Kerja & SRS Sprint 4](docs/sprints/sprint-4/user-story-and-srs.md)
* [Kontrak REST API LabCheckIn](docs/labcheckin-api.md)
* [Kontrak Push Notification & Review Izin](docs/push-notifications.md)
* [Kontrak Integrasi AI](docs/ai-api-contract.md)
* [Kontrak Akses Firestore](docs/firestore-access.md)
* [Rancangan Kontrak Data Firestore](docs/LabCheckIn_Firestore_Data_Contract.md)
* [Panduan Provisioning Akun Asisten](docs/assistant-provisioning.md)

---

## 6. Pengujian & Pemeriksaan Kualitas

Jalankan pemeriksaan berikut sebelum membuka Pull Request:

```bash
# TypeScript typecheck (wajib 0 error)
npx tsc --noEmit

# Linting Expo
npx expo lint

# Diagnosa kompatibilitas dependensi & konfigurasi Expo
npx expo-doctor

# Unit test
npm test

# Pengujian Security Rules dengan Firebase Emulator Suite
npm run test:emulator
```

---

## 7. Database Seeder & Data Uji (Tahap Akhir Sprint 4)

> 🚧 **Status: Ditunda hingga akhir integrasi Sprint 4.**  
> Skrip seeder database **sengaja disusun paling akhir setelah seluruh 4 programmer menyelesaikan merge ke `integration/sprint-4`** agar seluruh skema akhir koleksi Firestore (`users`, `laboratories` [ruang fisik & geotag], `classes` [course, `labId`, `gracePeriodMinutes`, `fineAmount`], `memberships`, `sessions`, `participations` + `ai.sentiment`, `fines`, dan `paymentTransactions`) sudah 100% stabil dan tidak perlu dirombak ulang.

**Rencana Cakupan Seeder Final (`scripts/seed-demo-data.*`):**
* [ ] Akun uji default untuk ketiga peran: **1 Aslab (`coordinator`)**, **2 Asprak (`assistant`)**, dan **3 Praktikan (`student`)** *(kredensial demo dicatat terpisah pada panduan UAT, tidak di-hardcode secret produksi)*.
* [ ] 4 data ruang laboratorium fisik kanonik (`laboratories`) lengkap dengan `geotagId`, `geoPoint`, dan `radiusMeters`.
* [ ] Sampel kelas (`classes` dengan `course`, `labId`, `gracePeriodMinutes`, & `fineAmount`), keanggotaan aktif, sesi `not_open` / `open` / `closed`, riwayat presensi (`on_time` & `late`), contoh tagihan denda (`unpaid` & `paid`), serta contoh pengajuan izin + hasil analisis sentimen AI.
* [ ] 3 file contoh CSV bulk insert (Lab, Praktikan, Asprak) untuk demonstrasi cepat fitur *bulk insert* Aslab.

---

## 8. Alur Kontribusi & Branching Git

Proyek menggunakan alur integrasi terkendali agar `main` selalu bersih dan siap demo:

```text
main  ◄── (PR oleh PM Jordan) ──  integration/sprint-4  ◄── (PR oleh 4 Programmer) ──  feat/s4-*
```

1. **Branch fitur programmer (bercabang dari `integration/sprint-4`):**
   * `feat/s4-fines-midtrans-e2e` — Maulana
   * `feat/s4-aslab-management-bulk` — Hasta
   * `feat/s4-dashboard-asprak-ops` — Hanif
   * `feat/s4-ai-sentiment-ui-finalization` — Izzatu
2. **Aturan Pull Request:**
   * Base branch PR programmer adalah **`integration/sprint-4`** (bukan `main`).
   * Gunakan format commit `type(scope): description` dalam Bahasa Inggris (contoh: `feat(payments): integrate Midtrans sandbox webhook`).
   * Pastikan `npx tsc --noEmit` dan `npx expo lint` lulus sebelum merge.
   * Merge dari `integration/sprint-4` ke `main` menggunakan **Merge Commit** oleh PM setelah lulus pengujian integrasi.
