# LabCheckIn — Dokumen Kesepakatan Tim & Aturan Bisnis Terpadu (Sprint 1 – Sprint 4)

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 4 *(Master Synchronized Baseline Sprint 1–4)* |
| **Tema** | Manajemen Lab Aslab, Dashboard Keuangan, Keterlambatan & Denda, Midtrans Sandbox, AI Analisis Sentimen & Finalisasi UI |
| **Project Manager** | Jordan Tenggara |
| **Tim Programmer** | Maulana Ghazzam Adil Al Faiq, Hasta Putra Wildantara, Hanif Ihsanul Huda, Izzatu Khairul Fata |
| **Status Dokumen** | 🚧 Aktif — Versi 4.1 (26 November 2026) |

**Status:** Sumber Kebenaran Tunggal (*Single Source of Truth*) untuk tim dan AI agent pada Sprint 4. Dokumen ini menyatukan seluruh keputusan yang masih berlaku dari Sprint 1–3, mencatat secara eksplisit aturan lama yang telah diperbarui/digantikan, serta mengunci aturan bisnis, kontrak data, API, dan keamanan Sprint 4.

> **Aturan Bahasa:** Penjelasan dokumen dan seluruh teks yang tampil di layar aplikasi (*UI copy*, label, pesan error) memakai **Bahasa Indonesia**. Seluruh identifier teknis (nama file, route, tipe, fungsi, enum status, kode error, nama branch, dan commit message) memakai **Bahasa Inggris**.

---

## 1. Evolusi Sistem & Penyelarasan Lintas Sprint (Sprint 1 → Sprint 4)

Agar tidak ada kebingungan antara kesepakatan lama dan terbaru, tabel berikut merangkum evolusi fitur dan aturan yang **berlaku final di Sprint 4**:

| Dimensi | Sprint 1 (UI Lokal) | Sprint 2 (Firebase & AI) | Sprint 3 (QR, GPS, Maps & FCM) | **Sprint 4 (Finalisasi — Berlaku Sekarang)** |
| :--- | :--- | :--- | :--- | :--- |
| **Peran Pengguna** | 2 peran dummy (`student`, `assistant`) | 2 peran Auth (`student`, `assistant`) | Muncul peran `coordinator` (admin lab) | **3 peran resmi:** **Aslab** (`coordinator`), **Asprak** (`assistant`), dan **Praktikan** (`student`) |
| **Kewenangan Lab & Peserta** | Dummy lokal | Asisten membuat kelas & menambah peserta | Koordinator mulai mengelola lab/kelas/asisten | **Hanya Aslab** yang mengelola lab, konfigurasi lokasi/grace period/denda, 3 jenis bulk/single insert, & pemindahan praktikan/aslab. **Asprak dibatasi hanya mengelola sesi, presensi, & tinjau izin.** |
| **Presensi** | Tap tombol lokal | Write langsung ke Firestore | Scan QR 15 menit + validasi GPS radius via Express API | QR + GPS + **perhitungan keterlambatan otomatis (*grace period*)** di backend → menghasilkan **1 tagihan denda nominal tetap** bila terlambat |
| **Pengajuan Izin & AI** | Belum ada | Simpan izin + Klasifikasi kategori AI | Review izin dipindah ke Express API + Push Notif | **Upgrade AI Analisis Sentimen** (+ kategori) sebagai info pendukung; izin disetujui = **`excused_absence`** & **bebas denda** (tidak menjadi hadir) |
| **Denda & Pembayaran** | Belum ada | Belum ada | Belum ada | **Midtrans Sandbox** (Client → Backend API → Midtrans → Signed Webhook → Firestore) + Riwayat Pembayaran Praktikan + Riwayat Keuangan Dashboard Aslab |
| **Push Notification** | Belum ada | Belum ada | Sesi dibuka, jadwal diubah, izin disetujui/ditolak | Ditambah **Tagihan denda dibuat**, **Pembayaran berhasil**, **Pembayaran gagal/butuh tindakan** (semua melalui backend worker) |
| **Navigasi & UI** | React Navigation (rencana awal) → Expo Router | Expo Router + Firebase Auth Guard | Harmonisasi tema Cobalt/Gold + SafeAreaView | **Finalisasi antarmuka** seragam lintas 3 peran, responsif keyboard/notch, konsisten dengan `src/theme/index.ts` |

---

## 2. Arsitektur & Stack Teknologi Final

| Lapisan | Keputusan Teknis Final | Catatan Kepatuhan |
| :--- | :--- | :--- |
| **Mobile App** | React Native + **Expo SDK 58** + **TypeScript** | Selalu gunakan `npx expo install <pkg>` untuk library baru; jangan ganti framework. |
| **Navigasi** | **Expo Router** (`src/app/`) | File route hanya di `src/app/`; logika fitur di `src/features/`. |
| **Autentikasi** | **Firebase Authentication** (Email/Password) | UID adalah satu-satunya sumber identitas sah; tidak ada role picker dummy. |
| **Database** | **Cloud Firestore** (Project: `<firebase-project-id>`) | Jangan membuat proyek Firebase baru. Snapshot real-time menjadi sumber kebenaran UI. |
| **Trusted Backend API** | **LabCheckIn Express API** (`EXPO_PUBLIC_LABCHECKIN_API_URL`) | Menangani QR issue/validate, check-in + grace period + denda, Midtrans checkout & webhook, device token, review izin, dan push worker. |
| **AI Service** | **Backend / Cloudflare Worker AI** (`EXPO_PUBLIC_LEAVE_AI_API_URL`) | Menghubungi API model AI pengajar untuk analisis sentimen & klasifikasi alasan izin; secret API key tidak boleh di client. |
| **Maps & Geotag** | **Leaflet Offline Assets + `react-native-webview`** + `expo-location` | Koordinat & radius lab dibaca dari koleksi kanonik Firestore (`laboratories` / `labLocations`). |
| **Payment Gateway** | **Midtrans Sandbox** (Snap) | Secret/Server Key hanya di backend; status akhir wajib dari verifikasi webhook backend. |
| **Push Notification** | **Expo Push / FCM** (via Backend Worker) | `googleServicesFile: "./google-services.json"` wajib terdaftar di `app.json` untuk native build Android. |
| **Build & Distribusi** | **EAS Build** (`development` untuk dev client, `preview` untuk APK demo) | Jalankan `npx tsc --noEmit` & `npx expo lint` sebelum PR/build. |

---

## 3. Aturan Bisnis Terpadu (Business Rules — Final Sprint 1 s.d. Sprint 4)

Seluruh aturan berikut bersifat **mengikat** pada UI, service, backend API, dan Firestore Security Rules:

### A. Peran, Identitas & Pemisahan Kewenangan
1. **Mapping Peran Internal vs Label UI:**
   * `coordinator` → ditampilkan sebagai **Asisten Laboratorium (Aslab)**. *(Dipertahankan enum `coordinator` di Firestore agar kompatibel 100% dengan data & rules Sprint 3 tanpa migrasi destruktif, kecuali tim menyepakati migrasi eksplisit bersama PM).*
   * `assistant` → ditampilkan sebagai **Asisten Praktikum (Asprak)**.
   * `student` → ditampilkan sebagai **Praktikan**.
2. **Keamanan Registrasi & Promosi Peran:**
   * Pendaftaran umum melalui aplikasi selalu menghasilkan `role: 'student'`.
   * Pendaftaran sebagai calon Asprak (`requestedRole: 'assistant'`) berstatus tertunda hingga disetujui oleh **Aslab** (`coordinator`) atau skrip provisioning tepercaya. Klien tidak dapat menaikkan perannya sendiri.
   * Logout wajib memutus seluruh listener Firestore, membersihkan state pengguna, dan menghapus registrasi token perangkat (`DELETE /api/device-tokens`) agar tidak ada kebocoran data/notifikasi antar akun.
3. **Batas Wewenang Tegas (Update Sprint 4):**
   * **Aslab (`coordinator`)**: Mengelola data laboratorium, koordinat/radius lokasi, kebijakan keterlambatan (*grace period*) & nominal denda, menjalankan 3 fitur bulk/single insert terpisah, memindahkan praktikan & aslab/asprak antar lab, menyetujui akun asprak, serta memantau Dashboard Keberlangsungan Lab & Keuangan Denda.
   * **Asprak (`assistant`)**: **Hanya** melihat kelas/jadwal/sesi yang menjadi tanggung jawabnya, membuka/menutup sesi, menerbitkan QR presensi, memantau kehadiran & keterlambatan, serta memeriksa/memutuskan pengajuan izin praktikan kelasnya. **Asprak dilarang mengelola distribusi praktikan maupun konfigurasi laboratorium global.**
   * **Praktikan (`student`)**: Melihat jadwal & detail sesi kelasnya, melakukan presensi QR + lokasi, melihat peta & aktivitas lab, mengajukan & memantau izin, melihat tagihan denda, membayar via Midtrans Sandbox, serta melihat riwayat presensi & riwayat pembayaran miliknya sendiri.

### B. Pemisahan Ruang Lab Fisik vs Kelas Praktikum, Bulk Insert & Perpindahan (Baru di Sprint 4)
4. **Pemisahan Entitas Ruang Fisik (`laboratories`) vs Kelas/Grup Praktikum (`classes`):**
   * **`laboratories/{labId}` (Tempat / Ruang Fisik & Geotag):** Murni menyimpan data fisik & lokasi ruangan: `name`, `description`, `capacity`, `geotagId` (`A`/`B`/`C`/`D`), `geoPoint` (`latitude`, `longitude`), **cakupan radius presensi (`radiusMeters`)**, dan `isActive`. **Satu ruang lab fisik bebas digunakan oleh banyak mata kuliah/kelas berbeda** (tidak menyimpan `course`, `gracePeriodMinutes`, maupun `fineAmount`).
   * **`classes/{classId}` (Kelas / Grup Praktikum per Mata Kuliah):** Menyimpan `name`, `code`, **`course`** (1 mata kuliah), **`labId`** (ruang lab fisik default di `laboratories`), `assistantId` (Asprak pengampu), **`gracePeriodMinutes`** (durasi toleransi keterlambatan kebijakan kelas/matkul), dan **`fineAmount`** (nominal denda tetap IDR kebijakan kelas/matkul).
   * **`sessions/{sessionId}` (Snapshot Kebijakan):** Saat sesi dibuat, `gracePeriodMinutes` dan `fineAmount` disalin (*snapshot*) dari `classes/{classId}` (serta merujuk ruang fisik `labId`) agar perubahan kebijakan kelas di kemudian hari tidak mengubah perhitungan historis sesi yang sudah berjalan/selesai.
   * Satu sumber kebenaran: Peta (Maps) & validasi GPS membaca `laboratories/{labId}`, sedangkan perhitungan keterlambatan & denda membaca `sessions/{sessionId}` (snapshot dari `classes/{classId}`).
5. **Pemisahan 3 Fitur Bulk / Single Insert:**
   * Tersedia **3 alur bulk/single insert yang terpisah** (bukan satu file gabungan):
     1. Bulk / Single Insert **Kelas/Grup Praktikum (`classes`)** sekaligus berdasarkan satu **mata kuliah (`course`)**, masing-masing menautkan ruang fisik (`labId`), `gracePeriodMinutes`, dan `fineAmount`.
     2. Bulk / Single Insert **Praktikan (`memberships`)** ke kelas/grup lab tertentu.
     3. Bulk / Single Insert **Asprak (`assistantId`)** ke kelas/grup lab tertentu.
   * Masing-masing dari ketiga alur menyediakan **downloadable file template** (CSV/spreadsheet).
6. **Staging Interaktif (`ScrollView`) Sebelum Simpan:**
   * Setiap baris data dari file bulk wajib dirender sebagai daftar kartu di dalam `ScrollView` yang dapat diatur Aslab sebelum commit: **Accept / Deny** per baris, **ubah/edit** data, dan **melengkapi kolom kosong**. Hanya baris berstatus *accepted* & valid yang dikirim ke database.
7. **Aturan Perpindahan (Transfer):**
   * Mendukung pemindahan **Praktikan** antar kelas/grup lab (`classes`) dan pemindahan penugasan **Aslab/Asprak** antar kelas/grup lab.
   * **Tidak ada fitur perpindahan jadwal praktikum** — jadwal/sesi (`sessions`) tetap melekat pada kelas asalnya.
   * Pemindahan praktikan menonaktifkan keanggotaan (`memberships`) lama tanpa menghapus catatan historis presensi, izin, atau denda pada kelas sebelumnya.

### C. Siklus Hidup Sesi, QR Code & Presensi Berbasis Lokasi
8. **Transisi Status Sesi Satu Arah:**
   * Status sesi hanya bergerak satu arah: `not_open` → `open` → `closed`.
   * Pembukaan dan penutupan sesi dilakukan manual oleh Asprak pemilik sesi dan **wajib melalui modal konfirmasi**.
   * Sesi `closed` tidak dapat dibuka kembali. Sesi `not_open` tidak dapat langsung ditutup.
   * Metadata sesi hanya dapat diubah saat berstatus `not_open`; setelah `open` atau `closed`, metadata dikunci demi integritas bukti historis.
   * Operasi hapus kelas/sesi menggunakan **soft delete (`isArchived: true`)** agar riwayat tetap utuh.
9. **Aturan QR Code & Validasi Lokasi (Sprint 3):**
   * QR hanya diterbitkan saat sesi `open`, memuat token acak yang tidak mudah ditebak (tanpa data pribadi/secret), dan berlaku **15 menit** menurut waktu server.
   * Menerbitkan QR baru otomatis menggantikan/mencabut QR sebelumnya. Penutupan sesi langsung menggugurkan seluruh QR aktif sesi tersebut.
   * Presensi hanya sah jika **seluruh syarat terpenuhi** di backend: autentikasi valid, role `student`, keanggotaan kelas aktif, sesi `open`, QR cocok & belum kedaluwarsa, koordinat GPS perangkat segar berada di dalam radius lab, serta belum ada record partisipasi sebelumnya.
10. **Satu Partisipasi per Praktikan per Sesi (Atomik):**
    * Path dokumen partisipasi adalah `sessions/{sessionId}/participations/{studentId}` (ID dokumen = UID praktikan).
    * Satu praktikan hanya boleh memiliki **maksimal satu** presensi per sesi (anti-duplikasi lintas tap & lintas perangkat).
    * Jika praktikan sudah mengajukan izin berstatus `pending` atau `approved`, check-in ditolak (`PARTICIPATION_CONFLICT`). Jika izin berstatus `rejected`, presensi boleh tercatat dengan mempertahankan riwayat izin pada dokumen yang sama sesuai kontrak API Sprint 3.

### D. Keterlambatan (*Grace Period*) & Pengelolaan Denda (Baru di Sprint 4)
11. **Rumus Penentuan Tepat Waktu vs Terlambat:**
    * Dihitung di **backend** menggunakan waktu server saat presensi (`checkedInAt`) dibandingkan terhadap waktu mulai sesi (`session.startsAt`) dan durasi toleransi (`gracePeriodMinutes`):
      * Batas toleransi: `deadline = session.startsAt + gracePeriodMinutes`
      * Jika `checkedInAt <= deadline` → **`on_time` (Tepat Waktu)**, `lateMinutes = 0`, **tidak ada denda**.
      * Jika `checkedInAt > deadline` → **`late` (Terlambat)**, `lateMinutes = ceil((checkedInAt - deadline) / 60s)`, **otomatis menerbitkan tagihan denda**.
12. **Aturan Tagihan Denda:**
    * Nominal denda bersifat **tetap (flat)** per kejadian keterlambatan (bukan progresif per menit, kecuali diubah kebijakan resmi).
    * **1 kejadian keterlambatan = tepat 1 tagihan** (ID dokumen deterministik `fines/{sessionId}_{studentId}` untuk mencegah tagihan ganda).
    * Setiap tagihan wajib terhubung ke `studentId`, `sessionId`, `classId`, `labId`, dan `participationId`.
13. **Pemisahan Status Pembayaran dan Status Kehadiran (Kritis):**
    * **Pembayaran denda TIDAK mengubah status kehadiran praktikan.** Praktikan yang terlambat dan melunasi dendanya tetap memiliki catatan kehadiran `present` dengan penanda keterlambatan `late`, sementara status tagihannya berubah menjadi `paid`.
14. **Pembebasan Denda untuk Izin Disetujui (*Excused Absence*):**
    * Praktikan dengan pengajuan izin berstatus `approved` dicatat sebagai **Tidak Hadir dengan Izin (`excused_absence`)** dan **dibebaskan dari denda keterlambatan**.
    * Keputusan persetujuan izin **tidak pernah** mengubah catatan kehadiran menjadi hadir (`present`), dan rekap kehadiran tetap memisahkan `Hadir` dari `Izin Diterima`.

### E. Payment Gateway (Midtrans Sandbox) & Notifikasi Pembayaran (Baru di Sprint 4)
15. **Alur Transaksi Client–Server–Midtrans:**
    * Aplikasi mobile memanggil backend untuk membuat transaksi pembayaran → backend memanggil Midtrans Snap Sandbox API menggunakan Server Key → backend mengembalikan `snapToken`/`redirectUrl` → aplikasi membuka halaman pembayaran Midtrans.
    * **Secret Key / Server Key Midtrans dilarang keras** disimpan di aplikasi React Native, `.env` client (`EXPO_PUBLIC_*`), atau repositori publik.
16. **Otoritas Status Pembayaran:**
    * Status transaksi pembayaran: **`pending`**, **`success`**, atau **`failed`**.
    * **Status akhir pembayaran dilarang ditentukan hanya dari respons/redirect client.** Perubahan status final `paymentTransactions` dan `fines` hanya sah setelah backend memverifikasi **callback/webhook Midtrans** (validasi `signature_key` SHA-512) atau rekonsiliasi server-ke-server ke API Midtrans.
17. **Pemicu Push Notification Terpadu (Sprint 3 + Sprint 4):**
    * Seluruh pengiriman push dilakukan melalui **backend worker** (bukan tembakan langsung dari aplikasi mobile) ke token perangkat aktif milik penerima terkait:
      * **Sprint 3:** `SESSION_OPENED`, `SCHEDULE_CHANGED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`.
      * **Sprint 4:** `FINE_CREATED` (tagihan baru), `PAYMENT_SUCCEEDED` (pembayaran sukses), `PAYMENT_FAILED` (pembayaran gagal/kedaluwarsa).
    * Kegagalan pengiriman notifikasi tidak boleh membatalkan mutasi data utama (presensi, keputusan izin, maupun pelunasan tagihan). Firestore selalu menjadi sumber kebenaran utama.

### F. Pengajuan Izin & AI Analisis Sentimen (Sprint 2 + Upgrade Sprint 4)
18. **Alur & Ketahanan Izin:**
    * Praktikan dapat mengajukan izin pada sesi `not_open` atau `open` (tidak setelah `closed`) dengan alasan 10–1.000 karakter.
    * Pengajuan disimpan ke Firestore (`status: 'pending'`, `ai.status: 'pending'`) **sebelum** layanan AI dipanggil.
    * Setelah tersimpan, sistem memanggil API AI pengajar melalui adapter backend/worker untuk melakukan **analisis sentimen** (serta klasifikasi kategori bila tersedia) dan menyimpan hasilnya ke object `ai`.
    * Kegagalan/timeout AI mengubah `ai.status` menjadi `failed` tanpa menghilangkan pengajuan dan tanpa menghambat pemeriksaan Asprak; tombol retry yang aman tetap tersedia.
19. **AI Hanya Informasi Pendukung (Non-Otomatis):**
    * Hasil analisis sentimen & kategori AI **hanya informasi pendukung** bagi Asprak. Tidak ada aturan/fungsi otomatis yang menyetujui atau menolak izin berdasarkan hasil AI.
    * Keputusan Asprak bersifat manual dengan konfirmasi, hanya sekali (`pending → approved | rejected`). Penolakan wajib disertai catatan 5–500 karakter; penerimaan catatan opsional maks. 500 karakter.

---

## 4. Kontrak Data Firestore Terpadu (Sprint 1–4)

### 4.1 Path Koleksi Kanonik

```text
users/{uid}
laboratories/{labId}                              # Murni ruang fisik & geotag (koordinat, radius, kapasitas)
classes/{classId}                                 # Kelas/grup praktikum per 1 course + labId + gracePeriod & fineAmount
memberships/{classId}_{studentId}                 # Keanggotaan praktikan pada kelas
sessions/{sessionId}                              # Jadwal sesi + snapshot gracePeriodMinutes & fineAmount dari kelas
sessions/{sessionId}/participations/{studentId}   # Partisipasi unik: attendance | leave
fines/{sessionId}_{studentId}                     # [BARU S4] Tagihan denda (maks 1 per kejadian terlambat)
paymentTransactions/{orderId}                     # [BARU S4] Riwayat transaksi Midtrans Sandbox
deviceTokens/{installationId}                     # Token Expo/FCM (dikelola backend)
notificationJobs/{jobId}                          # Antrean push notification worker (dikelola backend)
```

### 4.2 Skema Field Kunci & Penambahan Sprint 4

| Koleksi | Field Wajib & Penambahan Sprint 4 |
| :--- | :--- |
| **`users/{uid}`** | `uid`, `name`, `email`, `studentNumber: string \| null`, `role: 'student' \| 'assistant' \| 'coordinator'`, `requestedRole`, `createdAt`, `updatedAt`. |
| **`laboratories/{labId}`** *(Ruang Fisik)* | `name`, `description`, `capacity`, `geotagId: 'A'\|'B'\|'C'\|'D'\|string`, `geoPoint: GeoPoint` *(latitude, longitude)*, `radiusMeters: number`, `isActive`, `createdAt`, `updatedAt`. *(Tidak menyimpan `course`, `gracePeriodMinutes`, atau `fineAmount` agar 1 ruang fisik bebas dipakai banyak mata kuliah).* |
| **`classes/{classId}`** *(Kelas / Grup Praktikum)* | `name`, `code`, `course` *(1 mata kuliah)*, **`labId: string`** *(S4 — ruang fisik default di `laboratories`)*, **`gracePeriodMinutes: number`** *(S4 — durasi toleransi keterlambatan, mis. default 15)*, **`fineAmount: number`** *(S4 — nominal denda tetap IDR)*, `timeZone` (`Asia/Jakarta`), `assistantId`, `aslabId` *(opsional)*, `isArchived`, `createdAt`, `updatedAt`. |
| **`memberships/{classId}_{studentId}`** | `classId`, `studentId`, `assistantId`, `studentName`, `studentNumber`, `isActive`, `transferredFromClassId?: string \| null` *(S4 audit transfer antar kelas)*, `createdAt`, `updatedAt`. |
| **`sessions/{sessionId}`** | `classId`, `labId` *(ruang fisik sesi, default dari `classes.labId`)*, `assistantId`, `title`, `room`, `startsAt`, `endsAt`, `timeZone`, **`gracePeriodMinutes: number`** *(S4 — snapshot dari `classes.gracePeriodMinutes`)*, **`fineAmount: number`** *(S4 — snapshot dari `classes.fineAmount`)*, `status: 'not_open' \| 'open' \| 'closed'`, `isArchived`, `openedAt`, `closedAt`, `createdAt`, `updatedAt`. |
| **`sessions/{sessionId}/participations/{studentId}`** | **Shared:** `sessionId`, `classId`, `labId`, `assistantId`, `studentId`, `studentName`, `studentNumber`, `kind: 'attendance' \| 'leave'`, `createdAt`, `updatedAt`.<br>**Attendance:** `checkedInAt`, `locationId`, `validationMethod: 'qr_location'`, **`attendanceStatus: 'on_time' \| 'late'`** *(S4)*, **`lateMinutes: number`** *(S4)*, **`fineId: string \| null`** *(S4)*.<br>**Leave:** `reason`, `status: 'pending' \| 'approved' \| 'rejected'`, `reviewedBy`, `reviewedAt`, `reviewNote`, **`absenceType: 'excused_absence' \| null`** *(S4 saat approved)*, **`fineExempt: boolean`** *(S4, `true` saat approved)*, `ai: { status, category, sentiment: 'positive' \| 'neutral' \| 'negative' \| null, sentimentScore: number \| null, sentimentSummary: string \| null, confidence, modelVersion, classifiedAt, errorCode, requestId, startedAt, attemptCount }`. |
| **`fines/{sessionId}_{studentId}`** *(Baru S4)* | `id`, `studentId`, `studentName`, `studentNumber`, `sessionId`, `sessionTitle`, `classId`, `labId`, `labName`, `participationId`, `amount: number`, `currency: 'IDR'`, `lateMinutes: number`, `status: 'unpaid' \| 'pending' \| 'paid' \| 'failed'`, `latestOrderId: string \| null`, `paidAt: Timestamp \| null`, `createdAt`, `updatedAt`. |
| **`paymentTransactions/{orderId}`** *(Baru S4)* | `orderId`, `fineId`, `studentId`, `sessionId`, `sessionTitle`, `labId`, `amount: number`, `currency: 'IDR'`, `provider: 'midtrans_sandbox'`, `snapToken: string \| null`, `redirectUrl: string \| null`, `paymentType: string \| null` *(dari webhook Midtrans)*, `midtransTransactionId: string \| null`, `midtransTransactionStatus: string \| null`, `status: 'pending' \| 'success' \| 'failed'`, `createdAt`, `paidAt: Timestamp \| null`, `updatedAt`. |

---

## 5. Kontrak API Backend Terpadu (`labcheckin-api`)

Semua request terautentikasi memakai header `Authorization: Bearer <Firebase ID Token>` dan `Content-Type: application/json`.

| Method & Endpoint | Pemanggil | Fungsi | Respons Sukses |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/attendance/qr/issue` | Asprak | Menerbitkan QR sesi `open` (15 menit) | `200` `{ sessionId, qrPayload, expiresAt }` |
| `POST /api/v1/attendance/qr/validate` | Praktikan | Validasi QR & keanggotaan | `200` `{ ok: true, data: { qrVerified: true } }` |
| `POST /api/v1/attendance/check-in` | Praktikan | Validasi QR + GPS + **grace period** + buat attendance + **buat fine jika terlambat** + antre notif `FINE_CREATED` | `200` `{ ok: true, data: { sessionId, status: 'present', attendanceStatus: 'on_time'\|'late', lateMinutes, checkedInAt, fineId } }` |
| `POST /api/device-tokens` | Mobile App | Daftar token Expo/FCM perangkat | `204` |
| `DELETE /api/device-tokens` | Mobile App | Hapus token saat logout | `204` |
| `POST /api/leave/:leaveId/approve` | Asprak | Setujui izin → `excused_absence`, `fineExempt: true`, antre notif `LEAVE_APPROVED` | `200` decision + queued job |
| `POST /api/leave/:leaveId/reject` | Asprak | Tolak izin (note 5–500 char) + antre notif `LEAVE_REJECTED` | `200` decision + queued job |
| **`POST /api/v1/payments/create-transaction`** *(S4)* | Praktikan | Buat transaksi Midtrans Sandbox untuk `fineId` | `200` `{ ok: true, data: { orderId, fineId, amount, snapToken, redirectUrl, status: 'pending' } }` |
| **`POST /api/v1/payments/midtrans-webhook`** *(S4)* | Midtrans Server | Verifikasi SHA-512 signature, update `paymentTransactions` & `fines`, antre notif `PAYMENT_SUCCEEDED` / `PAYMENT_FAILED` | `200` `{ ok: true }` |
| **`GET /api/v1/payments/:orderId/status`** *(S4)* | Praktikan | Cek/rekonsiliasi status transaksi secara aman dari backend | `200` `{ ok: true, data: { orderId, fineId, status, paidAt } }` |
| `POST /classify-leave` *(AI Worker)* | Praktikan / Asprak | Analisis **sentimen** & kategori alasan izin via API AI pengajar | `200` `{ aiStatus, category, sentiment }` |

---

## 6. Matriks Hak Akses & Security Rules Terpadu

| Resource | Belum Login | Praktikan (`student`) | Asprak (`assistant`) | Aslab (`coordinator`) | Backend Admin SDK |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users/{uid}` | Ditolak | Baca & buat profil awal sendiri (`role: student`) | Baca profil sendiri & daftar student terbatas | Baca semua user; ACC promosi `student`↔`assistant` | Akses penuh terverifikasi |
| `laboratories/{labId}` | Ditolak | Baca (untuk Maps & validasi) | Baca (tidak boleh ubah konfigurasi ruang) | **CRUD ruang fisik** (nama, deskripsi, kapasitas, geotagId, geoPoint, radiusMeters) | Validasi lokasi check-in |
| `classes/{classId}` | Ditolak | Baca kelas yang diikuti aktif | Baca kelas miliknya sendiri (tidak ubah distribusi/kebijakan denda) | **CRUD kelas, set `gracePeriodMinutes` & `fineAmount`, bulk insert per course, transfer Asprak/Aslab** | Validasi sesi, grace period & denda |
| `memberships` | Ditolak | Baca milik sendiri | Baca anggota kelas miliknya saja *(read-only)* | **Single/Bulk insert & transfer praktikan antar lab** | Validasi keanggotaan |
| `sessions/{sessionId}` | Ditolak | Baca sesi kelasnya | **CRUD, buka & tutup sesi miliknya** | Baca seluruh sesi (Dashboard & riwayat) | Validasi check-in & notif |
| `participations` | Ditolak | Baca milik sendiri; create `leave` awal (`pending`) | Baca rekap sesi miliknya; review izin via API | Baca rekap lintas lab untuk Dashboard | Create `attendance`, update `leave` review & `ai` |
| **`fines`** *(S4)* | Ditolak | **Baca milik sendiri saja** (`studentId == auth.uid`) | Baca denda pada sesi/kelas miliknya *(read-only)* | **Baca seluruh denda lab** untuk Dashboard Keuangan *(read-only)* | **Satu-satunya penulis** (create saat telat, update status via webhook) |
| **`paymentTransactions`** *(S4)* | Ditolak | **Baca milik sendiri saja** (`studentId == auth.uid`) | Ditolak | **Baca untuk riwayat keuangan lab** *(read-only)* | **Satu-satunya penulis** (create & webhook update) |
| `deviceTokens` & `notificationJobs` | Ditolak | Ditolak (klien pakai API) | Ditolak (klien pakai API) | Ditolak | **Satu-satunya pembaca & penulis** |

---

## 7. Standar Navigasi, UI/UX & Kode

1. **Design System Tunggal (`src/theme/index.ts`):**
   * Warna utama: Royal Cobalt Blue (`#0D21A1`), Accent Gold (`#EEC643`), Canvas (`#F5F7FD`), Surface (`#FFFFFF`), Ink (`#101828`), Muted (`#667085`), Success (`#12B76A`), Warning (`#F79009`), Danger (`#D92D20`).
   * Seluruh halaman wajib memakai `SafeAreaView` dari `react-native-safe-area-context` (`edges={['top', 'left', 'right']}`), mendukung `KeyboardAvoidingView` pada form, serta menangani `loading`, `empty`, `error`, dan `retry` melalui komponen bersama (`AsyncState`, `EmptyState`, `StatusBadge`, `ConfirmModal`).
2. **Struktur Navigasi 3 Peran:**
   * **Aslab (`(coordinator)` + tabs):** Dashboard Keberlangsungan & Keuangan (Filter Hari/Minggu/Bulan) · Manajemen Lab & Peta (+ Bulk Insert Lab/Praktikan/Asprak & Transfer) · Manajemen Kelas & Asprak · Akun.
   * **Asprak (`(assistant)` + tabs):** Beranda Jadwal & Sesi Saya · Buat Sesi · Detail Sesi (Buka/Tutup, QR, Rekap Hadir/Telat/Izin) · Tinjau Izin (dengan Sentimen AI) · Akun.
   * **Praktikan (`(student)` + tabs):** Beranda Jadwal & Sesi · Presensi QR & Lokasi · Peta & Aktivitas Lab · Izin Saya (dengan Sentimen AI) · **Tagihan Denda & Riwayat Pembayaran** · Riwayat Presensi · Akun.
3. **Aturan Git & Quality Gate:**
   * Jangan push langsung ke `main`. Semua perubahan melalui PR kecil dengan review minimal 1 rekan + persetujuan PM Jordan.
   * Wajib lulus `npx tsc --noEmit` dan `npx expo lint` sebelum PR di-merge.
   * Dilarang commit `.env.local`, secret Midtrans, API key AI, atau `service-account.json`.

---

## 8. Matriks Acceptance Test & Skenario Demo Sprint 4

| ID Uji | Skenario Pengujian | Hasil yang Diharapkan | Pemilik |
| :--- | :--- | :--- | :--- |
| **S4-AT-01** | Aslab mengatur koordinat & radius pada Ruang Lab (`laboratories`), serta *grace period* (mis. 15 mnt) & nominal denda tetap (mis. Rp10.000) pada Kelas Praktikum (`classes`) | Tersimpan terpisah rapi di Firestore, radius tampil di Maps, dan snapshot kebijakan kelas langsung dipakai backend saat check-in | Hasta + Maulana |
| **S4-AT-02** | Aslab mengunduh 3 template CSV terpisah (Lab, Praktikan, Asprak) | Ketiga file template terunduh dengan format kolom yang benar & terpisah | Hasta |
| **S4-AT-03** | Aslab mengunggah bulk file → review di `ScrollView` → deny 1 baris, edit/isi kolom kosong 1 baris, accept sisanya → submit | Hanya baris *accepted* & valid yang tersimpan ke Firestore; baris *denied* tidak masuk | Hasta |
| **S4-AT-04** | Aslab memindahkan Praktikan dari Lab A ke Lab B, dan memindahkan Asprak antar lab | Keanggotaan/penugasan berpindah tanpa memindahkan jadwal dan tanpa menghapus riwayat lama | Hasta |
| **S4-AT-05** | Aslab membuka Dashboard & mengganti filter **Hari / Minggu / Bulan** | Jumlah lab, praktikan, status lab, jadwal berjalan/mendatang, riwayat kegiatan, & riwayat keuangan denda berubah akurat sesuai periode | Hanif |
| **S4-AT-06** | Asprak mencoba mengakses fitur distribusi praktikan / konfigurasi lab global (via UI & manipulasi Firestore langsung) | Diblokir di UI dan ditolak oleh `firestore.rules` (`FORBIDDEN`) | Hanif + Maulana |
| **S4-AT-07** | Praktikan check-in QR+GPS **sebelum/tepat** batas *grace period* | Presensi tercatat `on_time`, **tidak ada** dokumen di `fines`, rekap Asprak menampilkan "Tepat Waktu" | Maulana + Hanif |
| **S4-AT-08** | Praktikan check-in QR+GPS **setelah** melewati *grace period* (uji juga double-tap/2 perangkat) | Presensi tercatat `late`, tercipta **tepat 1 tagihan** di `fines`, praktikan menerima push notification `FINE_CREATED` | Maulana + Hanif |
| **S4-AT-09** | Praktikan membayar denda via Midtrans Sandbox hingga **Settlement (Sukses)** | Webhook terverifikasi → status transaksi `success`, status tagihan `paid`, status kehadiran **tetap `present`/`late` (tidak berubah)**, push notification `PAYMENT_SUCCEEDED` masuk, tampil di Riwayat Pembayaran & Dashboard Keuangan Aslab | Maulana + Hanif |
| **S4-AT-10** | Simulasi pembayaran Midtrans **Failed / Expired / Cancel** | Webhook memperbarui status `failed`, praktikan menerima push notification `PAYMENT_FAILED`, tombol coba bayar ulang tersedia | Maulana |
| **S4-AT-11** | Manipulasi klien: praktikan mencoba mengubah status `fines` menjadi `paid` langsung ke Firestore atau memalsukan webhook tanpa signature valid | Ditolak tegas oleh `firestore.rules` dan ditolak `401/403` oleh verifikasi SHA-512 webhook backend | Maulana |
| **S4-AT-12** | Tutup paksa aplikasi praktikan lalu buka kembali halaman Riwayat Pembayaran | Riwayat tagihan & transaksi tetap tampil lengkap (sesi, tanggal, nominal, waktu transaksi, status) dari Firestore | Maulana |
| **S4-AT-13** | Praktikan mengajukan izin → API AI menganalisis sentimen → Asprak menyetujui izin | Sentimen tersimpan di Firestore & tampil di kedua peran; keputusan manual Asprak menandai `excused_absence` + **bebas denda** (tidak menjadi hadir, tidak menghasilkan tagihan) | Izzatu + Hanif + Maulana |
| **S4-AT-14** | Simulasi layanan AI timeout / mati saat praktikan mengajukan izin | Pengajuan tetap tersimpan, muncul fallback jelas + tombol retry, Asprak tetap bisa menerima/menolak izin | Izzatu |
| **S4-AT-15** | Audit UI/UX akhir pada perangkat Android (notch/kamera, keyboard, rotasi/scroll) di ketiga peran | Seluruh layar seragam dengan tema LabCheckIn, tidak ada elemen terpotong, tidak ada error konsol/crash | Izzatu + Jordan (PM) |

---

## 9. Kredensial, Environment & Kepemilikan Infrastruktur (Wajib Sebelum Build)

| Infrastruktur / Kredensial | Penanggung Jawab (PIC) | Lokasi Penyimpanan yang Sah | Catatan Keamanan & Status |
| :--- | :--- | :--- | :--- |
| **Midtrans Sandbox** (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`, Webhook URL) | **Maulana** | Environment server backend `labcheckin-api` saja | **Dilarang keras** ditaruh di `.env.local` mobile, EAS mobile env, atau repo Git. Daftarkan Payment Notification URL ke `https://api.example.com/api/v1/payments/midtrans-webhook`. |
| **Firebase Admin SDK Service Account** (`<firebase-adminsdk-service-account>.json`) | **Maulana** | Server backend `labcheckin-api` / Secret Manager | Jangan pernah di-commit ke GitHub. |
| **AI Analisis Sentimen API** (`EXPO_PUBLIC_LEAVE_AI_API_URL` + secret API key model pengajar) | **Izzatu** | Secret API key hanya di Cloudflare Worker (`leave-ai.example.workers.dev`); hanya URL publik di `.env.local` | Pastikan kuota & format respon sentimen API pengajar terverifikasi. |
| **EAS Environment Variables** (6 variabel `EXPO_PUBLIC_*` untuk `development` & `preview`) | **Izzatu** *(pemegang akun Expo `izzatukhoirulfata`)* | Dashboard Expo (`expo.dev` → Project `my-app` → Environment Variables) atau `npx eas-cli@latest env:push` | Wajib memuat: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_LABCHECKIN_API_URL`, `EXPO_PUBLIC_LEAVE_AI_API_URL`. Tanpa ini, APK hasil EAS Build akan gagal koneksi Firebase/API. |
| **FCM V1 Service Account Key (Push Notification Android)** | **Izzatu** *(pemegang akun Expo `izzatukhoirulfata`)* | Dashboard Expo → `Credentials` → `Android` (`com.izzatukhoirulfata.myapp`) → `FCM V1 service account key` | Upload 1x file JSON Service Account Firebase (`<firebase-project-id>`) agar Expo Push Service dapat mengirim push notification ke APK Android. |
| **Maps / Geotag (Leaflet Offline)** | **Hasta** | Aset lokal `assets/maps/dist/` + `plugins/withLeafletMapAssets.js` | Tidak memerlukan Google Maps API Key eksternal. |

### Checklist Kredensial PM (Jordan) Sebelum Build Final:
- [ ] **Maulana:** Akun Midtrans Sandbox siap, `MIDTRANS_SERVER_KEY` terpasang di `labcheckin-api`, dan Webhook URL publik aktif.
- [ ] **Izzatu:** Endpoint AI Analisis Sentimen aktif di Cloudflare Worker dan diuji dengan input nyata.
- [ ] **Izzatu (Akun Expo):** 6 variabel `EXPO_PUBLIC_*` sudah terpasang di EAS Environment Variables (`development` & `preview`) **dan** `FCM V1 service account key` sudah ter-upload di EAS Credentials.

---

## 10. Risiko, Ketergantungan & Checklist Kickoff PM (Jordan)

| Risiko / Dependensi | Dampak | Mitigasi & Pemilik |
| :--- | :--- | :--- |
| **Kredensial & Webhook Midtrans Sandbox** | Checkout & webhook tidak bisa diuji end-to-end | **Maulana** menyiapkan akun Midtrans Sandbox + mendaftarkan Webhook URL `labcheckin-api` di Hari 1 (dipantau PM Jordan). |
| **Endpoint & skema respon Analisis Sentimen AI pengajar** | Field `ai.sentiment` bisa berbeda dengan ekspektasi | **Izzatu** memverifikasi format respon API AI pengajar & memperbarui Cloudflare Worker dengan adapter normalisasi (dipantau PM Jordan). |
| **EAS Env Variables & FCM V1 Key belum terpasang di Cloud Expo** | APK hasil EAS Build kehilangan env Firebase/API atau gagal menerima push notification | **Izzatu** (pemegang akun Expo) mengunggah 6 variabel `EXPO_PUBLIC_*` ke EAS Environment Variables dan file FCM V1 Service Account Key ke EAS Credentials sebelum build APK. |
| **Penambahan library file picker / export CSV untuk Bulk Insert** | Risiko butuh rebuild native dev client | **Hasta** mengajukan paket (`expo-document-picker`, `expo-file-system`, `expo-sharing`) di M1 agar Maulana & PM Jordan mengunci `package.json` sekali saja sebelum EAS build. |
| **Ketidaksinkronan enum role `coordinator` vs istilah "Aslab"** | Query atau Rules gagal jika ada programmer menulis `'aslab'` sementara database menyimpan `'coordinator'` | **Keputusan Terkunci:** Di kode & Firestore tetap gunakan `'coordinator'` (Aslab), `'assistant'` (Asprak), `'student'` (Praktikan). Hanya label tampilan UI yang menggunakan "Aslab", "Asprak", "Praktikan". |
| **Regresi fitur Sprint 2 & Sprint 3** | Fitur QR, Maps, atau Notifikasi rusak saat integrasi Sprint 4 | Wajib jalankan `npx tsc --noEmit` + uji regresi alur Sprint 2–3 sebelum merge ke `main`. |

---

## 11. Template Instruksi untuk AI Agent Programmer (Sprint 4)

> Saya adalah **[Nama Anggota]**, programmer tim LabCheckIn Sprint 4. Project Manager kami adalah **Jordan Tenggara**.  
> Tanggung jawab saya adalah **[Porsi X: S4-SRS-xx sampai S4-SRS-xx]** sesuai dokumen `LabCheckIn_Work_Split_Sprint_4.md` dan `LabCheckIn_Complete_Agreement_and_Business_Rules_Sprint_1_to_4.md`.
>
> **Aturan wajib sebelum menulis kode:**
> 1. Lakukan pemeriksaan *read-only* terhadap repositori aktual terlebih dahulu. Jangan mengasumsikan file atau field sudah ada sebelum membacanya.
> 2. Kerjakan **hanya** SRS dan file milik porsi saya. Jangan mengubah file milik programmer lain, `package.json`, `app.json`, `firestore.rules`, atau shared contracts tanpa persetujuan PM Jordan.
> 3. Patuhi kontrak peran (`coordinator` = Aslab, `assistant` = Asprak, `student` = Praktikan), kontrak koleksi Firestore (`laboratories`, `fines`, `paymentTransactions`, `participations`), keamanan Midtrans (secret key hanya di backend, status final hanya dari webhook), dan prinsip AI hanya sebagai pendukung (bukan pengambil keputusan otomatis).
> 4. Gunakan design system `src/theme/index.ts`, `SafeAreaView` dari `react-native-safe-area-context`, dan sediakan state loading/empty/error/retry.
> 5. Jalankan `npx tsc --noEmit` sebelum selesai, dan jangan lakukan operasi Git destruktif tanpa instruksi eksplisit.
