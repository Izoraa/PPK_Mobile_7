# LabCheckIn — Pembagian Kerja Sprint 4 (4 Porsi Programmer — Revisi Final)

**Proyek:** LabCheckIn (PPK Mobile — Kelompok 7)  
**Tema Sprint 4:** Manajemen Laboratorium oleh Aslab, Dashboard Keberlangsungan Lab, Sistem Keterlambatan & Denda, Integrasi Payment Gateway (Midtrans Sandbox), Penyempurnaan AI Analisis Sentimen Izin, dan Finalisasi Antarmuka  
**Project Manager (PM):** Jordan Tenggara *(tidak masuk daftar 4 programmer; fokus manajemen backlog, penguncian kontrak, koordinasi merge, dan acceptance/UAT)*  
**Tanggal Penyusunan:** 26 November 2026 *(Revisi 2 — Payment Gateway Midtrans End-to-End disatukan ke Maulana)*  
**Acuan:** `Pertemuan 9 Sprint 4 Lab B2 D1.docx`, User Story Sprint 1–3, Dokumen Kesepakatan Sprint 1–3, dan audit repositori aktual `PPK_Mobile_7`.

---

## 1. Ringkasan Rekomendasi Pembagian (End-to-End Vertical Slice & Minim Konflik)

Pembagian disusun menjadi **4 porsi seimbang (10 SRS per programmer, total `S4-SRS-01` s.d. `S4-SRS-40`)** dengan prinsip:
1. **Satu paket *end-to-end* untuk Payment Gateway & Denda (Maulana):** Backend Midtrans, Webhook, Notifikasi Pembayaran, hingga UI Tagihan/Checkout/Riwayat Pembayaran Praktikan berada pada satu pemilik agar tidak ada hambatan tunggu (*bottleneck*) kontrak Snap Token/WebView antar-programmer.
2. **Linearitas kuat dari Sprint 1–3:** Setiap programmer melanjutkan modul yang sudah dikuasai dan dibangunnya di sprint sebelumnya.
3. **Isolasi kepemilikan file & folder:** Setiap porsi memiliki folder fitur masing-masing sehingga kerja paralel berjalan mulus tanpa konflik Git maupun konflik semantik.

| Porsi | Programmer Rekomendasi | Rentang SRS | Fokus Utama Sprint 4 | Garis Linear dari Sprint 1–3 |
| :--- | :--- | :--- | :--- | :--- |
| **Porsi 1** | **Maulana Ghazzam Adil Al Faiq** | `S4-SRS-01` – `S4-SRS-10` | **End-to-End Keterlambatan, Denda, Payment Gateway Midtrans (Backend + Checkout UI + Riwayat Bayar), Notifikasi Pembayaran & Security Rules** | **S1:** Jadwal/Detail → **S2:** Auth, Firebase Foundation & Rules → **S3:** Express API (`labcheckin-api`), QR + Lokasi Check-in, Refactor Notifikasi API |
| **Porsi 2** | **Hasta Putra Wildantara** | `S4-SRS-11` – `S4-SRS-20` | **Manajemen Lab Aslab, 3 Jalur Bulk/Single Insert Terpisah (+ Template & Staging `ScrollView`), Perpindahan Praktikan/Aslab, Konfigurasi Radius & Grace Period** | **S1:** Check-in Panel → **S2:** PM & Role Coordinator (`src/features/coordinator/`) → **S3:** Geotag, Maps, Manajemen Lab & Aktivitas (`src/features/geotag/`) |
| **Porsi 3** | **Hanif Ihsanul Huda** | `S4-SRS-21` – `S4-SRS-30` | **Dashboard Keberlangsungan Lab & Keuangan Denda Aslab (Filter Hari/Minggu/Bulan), Fokus Operasional Sesi Asprak & Monitoring Presensi/Keterlambatan, QA Integrasi** | **S1:** Rekap & Riwayat Kehadiran → **S2:** Presensi, Rekap Realtime, Review Izin (`leave-review`) & QA → **S3:** PM (menguasai arsitektur lintas modul) |
| **Porsi 4** | **Izzatu Khoirul Fata** | `S4-SRS-31` – `S4-SRS-40` | **Upgrade AI Analisis Sentimen & Pengelolaan Izin (+ *Excused Absence* Bebas Denda), Navigasi 3 Peran, Komponen Status/Error & Finalisasi Antarmuka (UI/UX Polish) Seluruh Aplikasi** | **S1:** Setup & Navigasi → **S2:** Pengajuan Izin, AI Worker (`src/features/leave/`), Konsistensi UI/Navigasi → **S3:** Permission/Error UX & Revamp Auth UI |

---

## 2. Alasan Rekomendasi Penugasan per Anggota

### Porsi 1 → **Maulana Ghazzam Adil Al Faiq**
* **Mengapa paling tepat (Sepaket Backend + Payment End-to-End):** Alur Midtrans Sandbox sangat erat antara backend (`create-transaction`, verifikasi SHA-512 `midtrans-webhook`, rekonsiliasi status, antrean push notification) dan frontend (`StudentFinesScreen`, WebView checkout Snap, pembacaan status `pending`/`success`/`failed`, dan `PaymentHistoryScreen`). Karena Maulana sudah memegang `labcheckin-api`, transaksi `check-in` (tempat perhitungan *grace period* & pembuatan denda terjadi), dan `firestore.rules`, menggabungkan seluruh alur **Denda + Midtrans (Backend & UI)** pada Maulana membuat pengujian *end-to-end* jauh lebih cepat dan bebas miskomunikasi kontrak.
* **Dampak anti-bentrok:** Seluruh kode denda & pembayaran terisolasi di backend `labcheckin-api`, `src/features/fines/`, `src/features/payments/`, `src/app/(student)/payments/`, `src/features/notifications/`, dan `firestore.rules`.

### Porsi 2 → **Hasta Putra Wildantara**
* **Mengapa paling tepat:** Hasta adalah pembuat `src/features/coordinator/` (manajemen lab, kelas, asisten) sekaligus pemilik `src/features/geotag/` (koordinat, radius, peta). Kebutuhan Sprint 4 nomor 1 (Role Aslab, konfigurasi cakupan lokasi & batas keterlambatan/denda, 3 fitur bulk insert terpisah dengan template + *staging `ScrollView`*, serta perpindahan praktikan/aslab) adalah pengembangan langsung dari modul miliknya.
* **Dampak anti-bentrok:** Seluruh fitur bulk insert ditempatkan di folder baru `src/features/aslab-bulk/` dan layar manajemen lab di `src/features/coordinator/screens/`, tidak bersinggungan dengan dashboard (Hanif), pembayaran (Maulana), maupun AI/izin (Izzatu).

### Porsi 3 → **Hanif Ihsanul Huda**
* **Mengapa paling tepat:** Hanif memiliki rekam jejak kuat di agregasi data *real-time*, rekapitulasi kehadiran (`AttendanceList`), pemeriksaan izin (`leave-review`), dan pengujian integrasi lintas fitur (Sprint 1 & 2), serta menjadi PM di Sprint 3. Kebutuhan Sprint 4 nomor 2 (Dashboard Aslab + filter Hari/Minggu/Bulan + riwayat kegiatan & keuangan denda) dan nomor 3 (pengelolaan sesi terfokus Asprak + pembatasan akses Asprak) adalah kelanjutan natural dari spesialisasinya.
* **Dampak anti-bentrok:** Agregasi dashboard terisolasi di `src/features/aslab-dashboard/` dan komponen operasional Asprak di `ScheduleScreen.tsx`, `SessionDetailScreen.tsx`, `SessionControl.tsx`, serta `AttendanceList.tsx`.

### Porsi 4 → **Izzatu Khoirul Fata**
* **Mengapa paling tepat:** Izzatu adalah pemilik modul pengajuan izin + AI Worker (`src/features/leave/`), pemilik komponen `AsyncState` & `permissions`, serta pemilik revamp/polish UI sejak Sprint 2–3. Dengan pindahnya UI pembayaran ke Maulana, Izzatu mendapat ruang penuh untuk menyempurnakan **AI Analisis Sentimen Izin** (beserta integrasi *excused absence* bebas denda) DAN memimpin **Finalisasi Antarmuka & Navigasi 3 Peran** (salah satu tuntutan eksplisit Sprint 4 agar seluruh aplikasi tampil modern, konsisten, dan mudah digunakan semua peran).
* **Dampak anti-bentrok:** Upgrade AI & izin berada di `src/features/leave/` (plus komponen reusable `AiSentimentBadge.tsx`), sedangkan finalisasi tema/komponen bersama/navigasi berada di `src/theme/index.ts`, `src/components/common/`, dan `src/components/app-tabs.tsx`.

---

## 3. Rincian Pekerjaan & Daftar SRS Sprint 4 (`S4-SRS-01` – `S4-SRS-40`)

### Porsi 1: End-to-End Keterlambatan, Denda, Payment Gateway Midtrans & Notifikasi — **Maulana**

| ID | Kebutuhan (SRS) | Kriteria Penerimaan (Acceptance Criteria) |
| :--- | :--- | :--- |
| **S4-SRS-01** | Sinkronisasi peran 3-level (**Aslab**, **Asprak**, **Praktikan**) & pembaruan `firestore.rules` | Rules membedakan kewenangan Aslab (`coordinator`), Asprak (`assistant`), dan Praktikan (`student`). Asprak ditolak di level rules jika mencoba mengubah distribusi praktikan atau konfigurasi lab global. Koleksi `fines` dan `paymentTransactions` bersifat *read-only* bagi klien (hanya ditulis Admin SDK). |
| **S4-SRS-02** | Perhitungan keterlambatan berbasis *grace period* di backend check-in | `POST /api/v1/attendance/check-in` membandingkan waktu server `checkedInAt` terhadap `startsAt + gracePeriodMinutes`. Jika `checkedInAt <= batas`, status `on_time`; jika lewat, status `late` beserta `lateMinutes`. |
| **S4-SRS-03** | Pembuatan tagihan denda otomatis, idempoten & proteksi bebas denda untuk izin disetujui | Setiap kejadian `late` membuat **tepat satu** dokumen `fines/{sessionId}_{studentId}` secara atomik dengan nominal tetap dari kebijakan lab/sesi, terhubung ke `studentId`, `sessionId`, `classId`, `labId`, dan `participationId`. Izin disetujui (`excused_absence`) **tidak pernah** menghasilkan tagihan denda dan tidak mengubah status menjadi hadir. |
| **S4-SRS-04** | Endpoint pembuatan transaksi Midtrans Sandbox (`POST /api/v1/payments/create-transaction`) | Backend memverifikasi Firebase ID Token & kepemilikan tagihan, menolak tagihan yang sudah `paid`, memanggil Midtrans Snap Sandbox API menggunakan Server Key di server (tidak pernah di client), menyimpan `paymentTransactions/{orderId}` (`status: 'pending'`), lalu mengembalikan `snapToken` & `redirectUrl`. |
| **S4-SRS-05** | Endpoint Webhook Midtrans (`POST /api/v1/payments/midtrans-webhook`) & rekonsiliasi status | Backend memverifikasi `signature_key` SHA-512 Midtrans, memetakan status (`settlement`/`capture` → `success`, `pending` → `pending`, `deny`/`cancel`/`expire` → `failed`), memperbarui `paymentTransactions` & `fines` secara idempoten **tanpa mengubah status kehadiran praktikan**, serta menyediakan `GET /api/v1/payments/:orderId/status`. |
| **S4-SRS-06** | Integrasi Push Notification denda & pembayaran di worker backend + deep-link tap | Backend mengantrekan & mengirim push notification ke praktikan saat: (1) tagihan denda baru dibuat (`FINE_CREATED`), (2) pembayaran sukses (`PAYMENT_SUCCEEDED`), (3) pembayaran gagal/kedaluwarsa (`PAYMENT_FAILED`), serta menuntaskan event `SESSION_OPENED`/`SCHEDULE_CHANGED`. Tap notifikasi di `useNotifications.ts` langsung mengarahkan ke halaman tagihan/riwayat pembayaran. |
| **S4-SRS-07** | Halaman Daftar Tagihan Denda Praktikan (`StudentFinesScreen`) | Praktikan melihat daftar tagihan denda miliknya (nama sesi, tanggal, durasi keterlambatan, nominal tetap, status `unpaid`/`pending`/`paid`/`failed`) dengan informasi jelas bahwa pembayaran denda tidak mengubah status kehadiran. |
| **S4-SRS-08** | Alur Checkout Payment Gateway Midtrans Sandbox di Aplikasi (`MidtransCheckoutModal`) | Menekan tombol **Bayar Denda** memanggil `POST /api/v1/payments/create-transaction`, lalu mengarahkan praktikan ke halaman pembayaran Midtrans Sandbox melalui WebView (`react-native-webview`) atau in-app browser tanpa menyimpan secret key di aplikasi. |
| **S4-SRS-09** | Penanganan status pembayaran (`pending`, `success`, `failed`) berbasis verifikasi server | Setelah keluar dari halaman Midtrans, aplikasi **tidak mengklaim lunas hanya dari respons client**, melainkan menampilkan status sinkron dari listener Firestore / endpoint rekonsiliasi backend (`pending`, `success`, `failed`) beserta tombol coba bayar ulang jika gagal/kedaluwarsa. |
| **S4-SRS-10** | Halaman Riwayat Transaksi & Pembayaran Praktikan Persisten (`PaymentHistoryScreen`) | Menyediakan halaman riwayat pembayaran lengkap (nama sesi, tanggal tagihan, nominal, waktu transaksi, order ID, dan status pembayaran) berbasis Firestore yang tetap tersedia setelah aplikasi ditutup dan dibuka kembali, disertai uji keamanan rules & webhook. |

---

### Porsi 2: Manajemen Lab Aslab, 3 Bulk Insert & Perpindahan — **Hasta**

| ID | Kebutuhan (SRS) | Kriteria Penerimaan (Acceptance Criteria) |
| :--- | :--- | :--- |
| **S4-SRS-11** | Penyelarasan manajemen data laboratorium oleh Aslab | Aslab dapat menambah, melihat, mengubah, dan menonaktifkan laboratorium beserta metadata: nama lab, mata kuliah terkait, deskripsi lokasi, koordinat (`latitude`, `longitude`), dan status aktif di Firestore. |
| **S4-SRS-12** | Pengaturan cakupan lokasi presensi & batasan keterlambatan (kebijakan denda) | Pada form tambah/edit laboratorium, Aslab dapat menetapkan **radius validasi presensi** (meter), **durasi grace period keterlambatan** (menit), dan **nominal denda tetap** (Rupiah) yang tersimpan di Firestore dan dibaca langsung oleh backend check-in Maulana. |
| **S4-SRS-13** | Generator & unduhan 3 file template bulk insert terpisah | Menyediakan tombol unduh template CSV/spreadsheet terpisah untuk: (1) Template Bulk Laboratorium per Mata Kuliah, (2) Template Bulk Praktikan ke Lab, dan (3) Template Bulk Asprak ke Lab, lengkap dengan header valid. |
| **S4-SRS-14** | Komponen staging interaktif (`ScrollView`) untuk review bulk insert | Setelah file bulk dipilih dan di-parse, setiap baris tampil sebagai kartu dalam `ScrollView` yang memungkinkan Aslab secara fleksibel melakukan **Accept / Deny** per baris, **edit/update** nilai sel, serta **mengisi kolom yang masih kosong** dengan indikator validasi real-time sebelum disimpan. |
| **S4-SRS-15** | Fitur Single & Bulk Insert **Laboratorium** (terpisah, berdasarkan 1 mata kuliah) | Aslab dapat membuat 1 laboratorium (single) atau banyak laboratorium sekaligus (bulk via template + staging `ScrollView`) yang terikat pada satu mata kuliah yang dipilih. |
| **S4-SRS-16** | Fitur Single & Bulk Insert **Praktikan** ke laboratorium tertentu (terpisah) | Aslab dapat memasukkan 1 praktikan (single) atau banyak praktikan sekaligus (bulk via template + staging `ScrollView`) ke laboratorium/kelas target, dengan deteksi duplikasi dan validasi akun terdaftar. |
| **S4-SRS-17** | Fitur Single & Bulk Insert **Asprak** ke laboratorium tertentu (terpisah) | Aslab dapat menugaskan 1 asprak (single) atau banyak asprak sekaligus (bulk via template + staging `ScrollView`) ke laboratorium/kelas target secara terpisah dari bulk lab dan bulk praktikan. |
| **S4-SRS-18** | Fitur pemindahan **Praktikan** antar laboratorium | Aslab dapat memindahkan praktikan dari Lab A ke Lab B. Keanggotaan lama dinonaktifkan dan keanggotaan baru diaktifkan tanpa menghapus riwayat presensi, izin, atau denda lama. Jadwal praktikum tidak ikut dipindah. |
| **S4-SRS-19** | Fitur pemindahan **Aslab / Asprak** antar laboratorium | Aslab dapat memindahkan penugasan Aslab/Asprak antar laboratorium/kelas yang dikelola tanpa memindahkan jadwal praktikum. |
| **S4-SRS-20** | Validasi input, feedback batch commit & sinkronisasi Peta/Geotag | Perubahan koordinat/radius lab otomatis tercermin pada peta interaktif (`MapsScreen.tsx`); proses bulk insert menampilkan ringkasan berhasil/gagal per baris dan mencegah duplikasi saat submit ganda. |

---

### Porsi 3: Dashboard Keberlangsungan Lab & Keuangan Aslab + Fokus Sesi Asprak — **Hanif**

| ID | Kebutuhan (SRS) | Kriteria Penerimaan (Acceptance Criteria) |
| :--- | :--- | :--- |
| **S4-SRS-21** | Ringkasan KPI Dashboard Aslab dari data Firestore real-time | Dashboard Aslab menampilkan jumlah laboratorium dikelola, jumlah praktikan aktif, jumlah sesi sedang berlangsung, serta ringkasan status kegiatan pada setiap laboratorium secara real-time. |
| **S4-SRS-22** | Filter periode **Hari, Minggu, dan Bulan** pada Dashboard Aslab | Tersedia kontrol filter segmen (`Hari Ini`, `Minggu Ini`, `Bulan Ini`) yang menyaring jadwal, riwayat kegiatan lab, dan riwayat keuangan denda secara konsisten. |
| **S4-SRS-23** | Monitoring status kegiatan, lokasi, waktu, serta jadwal berjalan & mendatang | Menampilkan daftar status setiap lab, lokasi & jam pelaksanaan, sesi yang sedang berlangsung (`open`), serta jadwal praktikum yang akan datang (`not_open`) berdasarkan data Firestore. |
| **S4-SRS-24** | Riwayat kegiatan laboratorium pada Dashboard Aslab | Menampilkan riwayat sesi praktikum yang telah selesai (`closed`) sesuai filter hari/minggu/bulan, lengkap dengan lab, mata kuliah, waktu, jumlah hadir, jumlah terlambat, dan jumlah izin. |
| **S4-SRS-25** | Riwayat keuangan hasil denda praktikum pada Dashboard Aslab | Membaca koleksi `fines` dan `paymentTransactions` (skema Maulana) secara real-time untuk menampilkan total denda terkumpul (`paid`), denda tertunda/belum bayar (`unpaid`/`pending`), serta rincian per lab/sesi sesuai filter hari/minggu/bulan. |
| **S4-SRS-26** | Fokus ruang lingkup Asprak & penutupan akses manajemen lab/distribusi | Antarmuka Asprak hanya menampilkan kelas, jadwal, dan sesi tanggung jawabnya; tombol/route distribusi praktikan (tambah/pindah peserta) dan konfigurasi seluruh lab disembunyikan/diblokir untuk Asprak dan dialihkan ke Aslab. |
| **S4-SRS-27** | Pengelolaan siklus sesi oleh Asprak secara real-time | Asprak dapat membuka sesi saat dimulai, memantau perubahan secara real-time, dan menutup sesi setelah selesai; perubahan status langsung terlihat di aplikasi praktikan tanpa refresh manual. |
| **S4-SRS-28** | Monitoring presensi & status keterlambatan oleh Asprak | `AttendanceList` pada detail sesi menampilkan daftar praktikan hadir dengan penanda jelas **Tepat Waktu** vs **Terlambat (+X menit)** serta status tagihan dendanya (tanpa mencampur izin sebagai hadir). |
| **S4-SRS-29** | Integrasi tampilan *Excused Absence* & bebas denda di rekap Asprak | Praktikan yang izinnya disetujui Asprak tampil pada kategori **Tidak Hadir dengan Izin (Excused Absence)** dengan keterangan **Bebas Denda**, tidak dihitung sebagai hadir dan tidak memiliki tagihan denda. |
| **S4-SRS-30** | Paket uji integrasi & bukti demo lintas 3 peran (Aslab, Asprak, Praktikan) | Menjalankan dan mendokumentasikan checklist UAT Sprint 4 (alur Aslab bulk/dashboard, Asprak sesi/presensi/izin, Praktikan terlambat→denda→Midtrans→notifikasi→riwayat) bersama PM Jordan. |

---

### Porsi 4: AI Analisis Sentimen & Pengelolaan Izin + Navigasi 3 Peran & Finalisasi Antarmuka — **Izzatu**

| ID | Kebutuhan (SRS) | Kriteria Penerimaan (Acceptance Criteria) |
| :--- | :--- | :--- |
| **S4-SRS-31** | Penyempurnaan alur pengajuan izin terintegrasi konteks lab, sesi & denda | Praktikan dapat mengajukan izin pada sesi praktikum tertentu dengan validasi lengkap, informasi jelas terkait efek izin terhadap presensi & pembebasan denda, serta sinkronisasi real-time dengan struktur lab/sesi terbaru. |
| **S4-SRS-32** | Upgrade Integrasi AI: Analisis Sentimen alasan izin melalui API pengajar | Memperbarui adapter AI (`aiService.ts` + Cloudflare Worker / backend AI sesuai kontrak pengajar) untuk melakukan **analisis sentimen** (`positive`/`neutral`/`negative` + skor/ringkasan bila tersedia, bersama kategori) dan menyimpannya ke object `ai` pada dokumen izin di Firestore. |
| **S4-SRS-33** | Komponen tampilan Analisis Sentimen AI untuk Praktikan & Asprak | Menampilkan kartu/badge hasil analisis sentimen & kategori AI secara informatif di `LeaveDetailScreen` & `MyLeavesScreen`, serta menyediakan komponen reusable `AiSentimentBadge` yang langsung tampil di layar tinjau izin Asprak (`LeaveReviewCard`, `LeaveReviewDetail`). |
| **S4-SRS-34** | Jaminan AI hanya informasi pendukung & status *Excused Absence* Bebas Denda | Label eksplisit menegaskan hasil analisis sentimen AI bukan penentu keputusan otomatis; saat izin berstatus `approved`, antarmuka praktikan menegaskan **Tidak Hadir dengan Izin (Excused Absence)** dan **Bebas Denda Keterlambatan**. |
| **S4-SRS-35** | Penanganan gangguan layanan AI & mekanisme retry aman | Jika layanan AI timeout/gagal/mengembalikan format rusak, pengajuan izin tetap tersimpan, Asprak tetap dapat menerima/menolak secara manual, dan tersedia tombol coba ulang analisis AI yang aman tanpa membuat duplikasi izin. |
| **S4-SRS-36** | Penyelarasan Navigasi & Tab Bar 3 Peran (`app-tabs.tsx`) | Memperbarui tab bar & jalur navigasi untuk **Aslab**, **Asprak**, dan **Praktikan** agar bersih dan intuitif — termasuk menyediakan titik masuk rapi ke menu **Tagihan & Riwayat Pembayaran** (route Maulana), **Bulk & Transfer** (route Hasta), dan **Dashboard** (route Hanif). |
| **S4-SRS-37** | Standarisasi komponen status, feedback & permission Sprint 4 | Memperbarui `StatusBadge`, `AsyncState`, `EmptyState`, `ConfirmModal`, serta kartu permission/error agar mendukung seluruh status baru Sprint 4 (`on_time`, `late`, `excused_absence`, `unpaid`, `pending`, `paid`, `failed`, sentimen AI) dengan copy Bahasa Indonesia yang seragam. |
| **S4-SRS-38** | Finalisasi antarmuka (UI/UX Polish) alur **Praktikan** | Audit & penyelarasan visual seluruh layar Praktikan (Auth, Beranda Jadwal, Presensi QR+GPS, Peta, Izin, Riwayat, dan keselarasan tema layar Tagihan/Pembayaran bersama Maulana) agar modern dan konsisten dengan `src/theme/index.ts`. |
| **S4-SRS-39** | Finalisasi antarmuka (UI/UX Polish) alur **Asprak & Aslab** | Audit & penyelarasan visual layar Asprak & Aslab (Dashboard, Manajemen Lab, Staging Bulk `ScrollView`, Detail Sesi, Tinjau Izin) agar bebas dari tombol terpotong, *text overflow*, atau inkonsistensi jarak/warna. |
| **S4-SRS-40** | Audit akhir viewport mobile, aksesibilitas & kesiapan demo UI | Memastikan seluruh layar baru Sprint 4 memakai `SafeAreaView` dari `react-native-safe-area-context` (aman dari notch/kamera), `KeyboardAvoidingView` pada form, zero error SDK mentah di UI, dan lulus `npx tsc --noEmit`. |

---

## 4. Matriks Kepemilikan File (Anti-Konflik)

**Aturan Emas:** Setiap programmer hanya mengubah file di area miliknya. Perubahan file bersama (`package.json`, `app.json`, `src/types/index.ts`, `firestore.rules`) wajib melewati koordinasi PM **Jordan** dan integrator **Maulana**.

| Area / Folder / File | Pemilik Utama | Reviewer | Catatan Koordinasi |
| :--- | :--- | :--- | :--- |
| Backend Express (`labcheckin-api`), Midtrans Server & Webhook, Push Worker | **Maulana** | Jordan (PM) | Server Key Midtrans & Admin SDK hanya di env server |
| `firestore.rules`, `firestore.indexes.json`, `src/lib/labCheckInApi.ts` | **Maulana** | Hasta & Hanif | Lock rules & indexes di M1 & sebelum merge akhir |
| `src/features/fines/*`, `src/features/payments/*`, `src/app/(student)/payments/*`, `src/features/notifications/*` | **Maulana** | Izzatu | **100% end-to-end Payment Gateway & Denda di Maulana** (API + Checkout WebView + Daftar Tagihan + Riwayat Bayar) |
| `src/features/aslab-bulk/*`, `src/app/(coordinator)/bulk-*.tsx`, `src/app/(coordinator)/transfer.tsx` | **Hasta** | Hanif | Folder baru 100% milik Hasta (3 bulk terpisah + template + `ScrollView` staging) |
| `src/features/coordinator/coordinatorService.ts`, `src/features/coordinator/screens/*`, `src/features/geotag/*` | **Hasta** | Maulana | Menambah field `gracePeriodMinutes`, `fineAmount`, `course` pada lab |
| `src/features/aslab-dashboard/*`, `src/features/coordinator/components/CoordinatorDashboard.tsx` | **Hanif** | Hasta | Dashboard KPI, filter Hari/Minggu/Bulan, riwayat kegiatan & keuangan denda |
| `src/screens/ScheduleScreen.tsx`, `SessionDetailScreen.tsx`, `src/components/session/SessionControl.tsx`, `AttendanceList.tsx`, `src/app/(assistant)/*` | **Hanif** | Maulana | Fokus operasional Asprak, badge tepat waktu/terlambat/excused, hapus menu distribusi dari Asprak |
| `src/features/leave/*`, AI Sentiment Adapter/Worker, `src/features/leave/components/AiSentimentBadge.tsx` | **Izzatu** | Hanif | Upgrade AI sentimen; Hanif cukup me-render `AiSentimentBadge` di layar review Asprak |
| `src/components/app-tabs.tsx`, `src/theme/index.ts`, `src/components/common/*`, visual QA pass akhir | **Izzatu** | Jordan (PM) | Finalisasi UI/UX & tab 3 peran melalui PR terkoordinasi setelah fitur lain merge |
| `package.json`, `package-lock.json`, `app.json`, `src/types/index.ts` | **Maulana** *(integrator)* | Jordan (PM) | Ajukan kebutuhan library (mis. `expo-document-picker`, `expo-file-system`, `expo-sharing`) di M1 |

---

## 5. Penamaan Branch & Urutan Merge yang Disarankan

### Branch per Programmer
* **Maulana:** `feat/s4-fines-midtrans-e2e`
* **Hasta:** `feat/s4-aslab-management-bulk`
* **Hanif:** `feat/s4-dashboard-asprak-ops`
* **Izzatu:** `feat/s4-ai-sentiment-ui-finalization`

### Urutan Milestone & Merge (Dikoordinasikan PM Jordan)
1. **M1 — Kontrak, Kredensial & Fondasi (Hari 1–2):**
   - **Maulana** menyiapkan akun **Midtrans Sandbox** (`MIDTRANS_SERVER_KEY` & Webhook URL di `labcheckin-api`).
   - **Izzatu** memastikan **API AI Analisis Sentimen** di Cloudflare Worker aktif serta menyetel 6 variabel `EXPO_PUBLIC_*` di **EAS Environment Variables** dan meng-upload **FCM V1 Service Account Key** di **EAS Credentials** (`izzatukhoirulfata/my-app`).
   - **Hasta** mengonfirmasi kebutuhan library CSV/file picker (`expo-document-picker`, `expo-file-system`, `expo-sharing`).
   - Maulana merilis PR kecil berisi shared types (`fines`, `paymentTransactions`, lab `gracePeriodMinutes`/`fineAmount`, `ai.sentiment`), route path pembayaran (`/(student)/payments`), dan pembaruan `package.json` sekali jalan.
   - Semua programmer menarik (`git pull`) M1 ke branch masing-masing agar tipe dan navigasi langsung klop.
2. **M2 — Implementasi Paralel Tanpa Saling Tunggu (Hari 2–5):**
   - **Maulana:** Check-in grace period + fine idempoten + Midtrans backend/webhook + Push notif pembayaran + UI Tagihan, Checkout Midtrans & Riwayat Pembayaran Praktikan.
   - **Hasta:** Config lab (radius + grace period + denda) + 3 template + 3 bulk insert (`ScrollView` review) + transfer praktikan/aslab.
   - **Hanif:** Dashboard Aslab (Hari/Minggu/Bulan + riwayat kegiatan & keuangan denda) + fokus operasional sesi/presensi Asprak.
   - **Izzatu:** Upgrade AI Analisis Sentimen & izin bebas denda + penyelarasan `StatusBadge`/`AsyncState` & Tab Bar 3 peran.
3. **M3 — Urutan Merge ke `main` (Hari 5–6):**
   1. **Maulana** (`feat/s4-fines-midtrans-e2e`) — Backend, Rules, Denda & Payment End-to-End
   2. **Hasta** (`feat/s4-aslab-management-bulk`) — Manajemen Lab, Kebijakan Denda, 3 Bulk Insert & Transfer
   3. **Hanif** (`feat/s4-dashboard-asprak-ops`) — Dashboard Aslab & Operasional Asprak
   4. **Izzatu** (`feat/s4-ai-sentiment-ui-finalization`) — AI Sentimen, Tab Bar 3 Peran, & Finalisasi UI/UX Pass terakhir di atas seluruh layar yang sudah tergabung!
4. **M4 — UAT Lintas Perangkat & Release Build (Hari 6–7):**
   - Hanif + Jordan (PM) menjalankan skenario demo 3 peran (Aslab, Asprak, Praktikan) dengan Firebase nyata, Midtrans Sandbox, API AI Sentimen, dan Push Notification.
