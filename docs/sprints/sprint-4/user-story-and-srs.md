# Sprint 4 — User Story, Pembagian Kerja & Daftar SRS

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 4 |
| **Tema** | Manajemen Laboratorium oleh Aslab, Dashboard Keberlangsungan Lab, Keterlambatan & Denda, Midtrans Sandbox, AI Analisis Sentimen Izin, dan Finalisasi Antarmuka |
| **Project Manager** | Jordan Tenggara |
| **Rentang SRS** | `S4-SRS-01` – `S4-SRS-40` (40 SRS) |
| **Status** | 🚧 Sedang Berjalan (Aktif) |

---

## 1. Deskripsi & Kebutuhan Sprint

Pada Sprint 4, aplikasi disempurnakan dengan memisahkan kewenangan **Asisten Laboratorium (Aslab)** dan **Asisten Praktikum (Asprak)**, menambahkan dashboard pemantauan & keuangan denda untuk Aslab, mengintegrasikan perhitungan keterlambatan (*grace period*), pengelolaan denda, pembayaran **Midtrans Sandbox**, notifikasi & riwayat pembayaran, analisis sentimen AI untuk pengajuan izin, serta finalisasi antarmuka lintas peran.

### Kebutuhan Fungsional Utama
1. **Manajemen laboratorium oleh Aslab:** CRUD lab, konfigurasi cakupan lokasi presensi & batas keterlambatan/denda, 3 fitur *single/bulk insert* terpisah (lab per mata kuliah, praktikan ke lab, asprak ke lab) dengan *downloadable template* & review interaktif `ScrollView` (accept/deny, update, isi sel kosong), serta pemindahan praktikan & aslab/asprak antar lab (tanpa pindah jadwal).
2. **Dashboard keberlangsungan laboratorium (Aslab):** Jumlah lab & praktikan, status kegiatan tiap lab, lokasi & waktu pelaksanaan, jadwal berjalan & mendatang, riwayat kegiatan lab, riwayat keuangan denda, serta filter **hari, minggu, dan bulan**.
3. **Pengelolaan sesi oleh Asprak:** Fokus pada kelas/jadwal/sesi tanggung jawabnya (buka, pantau presensi, tutup) tersinkronisasi *real-time*, tanpa kewenangan distribusi praktikan atau konfigurasi seluruh lab.
4. **Perhitungan keterlambatan & pengelolaan denda:** Mekanisme *grace period* konfigurabel, nominal denda tetap, maksimal 1 tagihan per keterlambatan, pembayaran denda tidak mengubah status kehadiran, dan izin disetujui dicatat sebagai *excused absence* bebas denda.
5. **Integrasi Payment Gateway (Midtrans Sandbox):** Alur client–server–Midtrans (secret key hanya di server), daftar tagihan, transaksi backend, halaman pembayaran, verifikasi webhook backend, status `pending`/`success`/`failed`, dan riwayat transaksi.
6. **Notifikasi & riwayat pembayaran:** Push notification saat tagihan denda baru dibuat, pembayaran berhasil, dan pembayaran gagal; halaman riwayat pembayaran persisten di Firestore.
7. **Integrasi AI (analisis sentimen) & finalisasi UI:** Analisis sentimen alasan izin via API AI pengajar sebagai informasi pendukung, tahan gangguan AI, integrasi *excused absence* bebas denda, dan finalisasi UI/UX modern & konsisten di seluruh peran.

---

## 2. Ringkasan Pembagian Kerja

| Porsi | Programmer | Rentang SRS | Fokus Utama | Branch Fitur |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Maulana Ghazzam Adil Al Faiq** | `S4-SRS-01` – `S4-SRS-10` | *End-to-end* keterlambatan, denda, Payment Gateway Midtrans (backend, webhook, checkout UI, riwayat bayar), push notifikasi pembayaran, & Security Rules | `feat/s4-fines-midtrans-e2e` |
| **2** | **Hasta Putra Wildantara** | `S4-SRS-11` – `S4-SRS-20` | Manajemen lab Aslab, radius & *grace period*/denda, 3 jalur *bulk/single insert* terpisah (+ template & *staging `ScrollView`*), & perpindahan praktikan/aslab | `feat/s4-aslab-management-bulk` |
| **3** | **Hanif Ihsanul Huda** | `S4-SRS-21` – `S4-SRS-30` | Dashboard keberlangsungan lab & keuangan denda Aslab (filter hari/minggu/bulan), fokus operasional sesi & monitoring telat/izin Asprak, & QA integrasi | `feat/s4-dashboard-asprak-ops` |
| **4** | **Izzatu Khairul Fata** | `S4-SRS-31` – `S4-SRS-40` | Upgrade AI analisis sentimen & pengelolaan izin bebas denda, navigasi/tab 3 peran, komponen status/error, & finalisasi antarmuka (UI/UX polish) seluruh aplikasi | `feat/s4-ai-sentiment-ui-finalization` |

---

## 3. Daftar Lengkap SRS & User Story

### Porsi 1 — Maulana Ghazzam Adil Al Faiq (`S4-SRS-01` – `S4-SRS-10`)

| Kode SRS | User Story |
| :--- | :--- |
| `S4-SRS-01` | Sebagai sistem, saya ingin membatasi hak akses tiga peran (Aslab, Asprak, dan Praktikan) melalui Firestore Security Rules agar Asprak tidak dapat mengubah konfigurasi lab atau distribusi praktikan, serta data tagihan dan pembayaran hanya ditulis oleh backend tepercaya. |
| `S4-SRS-02` | Sebagai sistem, saya ingin menghitung keterlambatan presensi secara otomatis di backend berdasarkan perbandingan waktu server terhadap waktu mulai sesi dan durasi *grace period* agar status tepat waktu atau terlambat tercatat akurat. |
| `S4-SRS-03` | Sebagai sistem, saya ingin menerbitkan maksimal satu tagihan denda bernominal tetap secara atomik untuk setiap kejadian keterlambatan (terhubung ke praktikan, sesi, dan presensi) serta membebaskan praktikan dengan izin disetujui (*excused absence*) dari denda. |
| `S4-SRS-04` | Sebagai praktikan, saya ingin transaksi pembayaran denda dibuat melalui backend ke Midtrans Sandbox agar proses pembayaran aman tanpa menyimpan secret key di aplikasi mobile. |
| `S4-SRS-05` | Sebagai sistem, saya ingin memverifikasi callback/webhook Midtrans (SHA-512) di backend untuk memperbarui status transaksi (`pending`, `success`, `failed`) dan status tagihan tanpa mengubah status kehadiran praktikan, disertai endpoint rekonsiliasi status. |
| `S4-SRS-06` | Sebagai praktikan, saya ingin menerima push notification saat tagihan denda baru dibuat, pembayaran berhasil, atau pembayaran gagal serta dapat mengetuk notifikasi menuju halaman terkait agar segera mengetahui status tagihan saya. |
| `S4-SRS-07` | Sebagai praktikan, saya ingin melihat daftar tagihan denda beserta rincian sesi, keterlambatan, nominal tetap, status tagihan, dan informasi bahwa pembayaran tidak mengubah status kehadiran. |
| `S4-SRS-08` | Sebagai praktikan, saya ingin diarahkan ke halaman pembayaran Midtrans Sandbox melalui WebView/in-app browser dari detail tagihan agar dapat menyelesaikan pembayaran denda secara langsung. |
| `S4-SRS-09` | Sebagai praktikan, saya ingin melihat pembaruan status pembayaran (`pending`, `success`, `failed`) berbasis verifikasi server serta tombol coba bayar ulang bila gagal agar tidak terjadi klaim lunas palsu. |
| `S4-SRS-10` | Sebagai praktikan, saya ingin melihat halaman riwayat transaksi dan pembayaran persisten (sesi, tanggal tagihan, nominal, waktu transaksi, order ID, status) di Firestore agar tetap tersedia setelah aplikasi ditutup dan dibuka kembali. |

### Porsi 2 — Hasta Putra Wildantara (`S4-SRS-11` – `S4-SRS-20`)

| Kode SRS | User Story |
| :--- | :--- |
| `S4-SRS-11` | Sebagai Aslab, saya ingin menambah, melihat, mengubah, dan menonaktifkan data ruang laboratorium fisik (`laboratories`) beserta nama, deskripsi, kapasitas, `geotagId`, `geoPoint`, dan `radiusMeters` agar 1 ruang fisik dapat digunakan oleh berbagai mata kuliah. |
| `S4-SRS-12` | Sebagai Aslab, saya ingin mengatur ruang lab default (`labId`), durasi *grace period* keterlambatan (`gracePeriodMinutes`), dan nominal denda tetap (`fineAmount`) pada setiap kelas praktikum (`classes`) agar kebijakan keterlambatan & denda melekat pada mata kuliah/kelas terkait dan di-snapshot ke sesi. |
| `S4-SRS-13` | Sebagai Aslab, saya ingin mengunduh tiga file template CSV/spreadsheet terpisah untuk bulk insert kelas/grup lab per mata kuliah, praktikan ke kelas, dan asprak ke kelas agar pengisian data massal sesuai format. |
| `S4-SRS-14` | Sebagai Aslab, saya ingin melihat setiap baris data hasil unggah bulk insert dalam daftar `ScrollView` interaktif agar dapat menerima/menolak baris (accept/deny), mengubah data, dan melengkapi kolom kosong dengan validasi sebelum disimpan. |
| `S4-SRS-15` | Sebagai Aslab, saya ingin melakukan single dan bulk insert untuk membuat sejumlah kelas/grup laboratorium (`classes`) sekaligus berdasarkan satu mata kuliah (`course`) lengkap dengan tautan ruang fisik (`labId`), *grace period*, dan denda secara terpisah. |
| `S4-SRS-16` | Sebagai Aslab, saya ingin melakukan single dan bulk insert data praktikan (`memberships`) ke kelas/grup laboratorium tertentu secara terpisah dengan deteksi duplikasi dan validasi akun terdaftar. |
| `S4-SRS-17` | Sebagai Aslab, saya ingin melakukan single dan bulk insert penugasan asprak (`assistantId`) ke kelas/grup laboratorium tertentu secara terpisah agar penugasan asprak tertata rapi. |
| `S4-SRS-18` | Sebagai Aslab, saya ingin memindahkan praktikan dari satu kelas/grup laboratorium ke kelas/grup lainnya tanpa memindahkan jadwal praktikum atau menghapus riwayat presensi, izin, maupun denda lama. |
| `S4-SRS-19` | Sebagai Aslab, saya ingin memindahkan penugasan Aslab atau Asprak antar kelas/grup laboratorium tanpa memindahkan jadwal praktikum agar rotasi pengampu berjalan fleksibel. |
| `S4-SRS-20` | Sebagai Aslab, saya ingin perubahan koordinat dan radius laboratorium langsung tersinkronisasi ke peta interaktif (`MapsScreen`) serta proses batch commit menampilkan ringkasan hasil tanpa duplikasi. |

### Porsi 3 — Hanif Ihsanul Huda (`S4-SRS-21` – `S4-SRS-30`)

| Kode SRS | User Story |
| :--- | :--- |
| `S4-SRS-21` | Sebagai Aslab, saya ingin melihat ringkasan KPI jumlah laboratorium, jumlah praktikan aktif, jumlah sesi berjalan, dan status kegiatan tiap lab secara real-time di dashboard. |
| `S4-SRS-22` | Sebagai Aslab, saya ingin memfilter informasi dashboard berdasarkan **hari, minggu, dan bulan** agar pemantauan jadwal, riwayat kegiatan, dan keuangan denda terstruktur. |
| `S4-SRS-23` | Sebagai Aslab, saya ingin melihat status setiap lab, lokasi & waktu pelaksanaan, serta jadwal praktikum yang sedang berlangsung (`open`) dan mendatang (`not_open`) berdasarkan data Firestore. |
| `S4-SRS-24` | Sebagai Aslab, saya ingin melihat riwayat kegiatan laboratorium (sesi `closed`) beserta jumlah hadir, terlambat, dan izin sesuai filter periode untuk evaluasi praktikum. |
| `S4-SRS-25` | Sebagai Aslab, saya ingin melihat riwayat keuangan hasil denda praktikum (total lunas, tertunda/belum bayar, dan rincian per lab/sesi) pada dashboard sesuai filter hari/minggu/bulan. |
| `S4-SRS-26` | Sebagai Asprak, saya ingin hanya melihat kelas, jadwal, dan sesi tanggung jawab saya tanpa menu distribusi praktikan maupun konfigurasi seluruh laboratorium agar kewenangan terpisah tegas. |
| `S4-SRS-27` | Sebagai Asprak, saya ingin membuka sesi saat dimulai dan menutup sesi setelah selesai dengan sinkronisasi real-time ke aplikasi praktikan agar periode presensi terkendali. |
| `S4-SRS-28` | Sebagai Asprak, saya ingin memantau daftar presensi praktikan beserta penanda **Tepat Waktu** vs **Terlambat (+X menit)** dan status tagihan dendanya secara real-time. |
| `S4-SRS-29` | Sebagai Asprak, saya ingin melihat praktikan yang izinnya disetujui tercatat sebagai **Tidak Hadir dengan Izin (*Excused Absence*)** dan **Bebas Denda**, terpisah dari daftar hadir. |
| `S4-SRS-30` | Sebagai tim pengembang, saya ingin seluruh alur Sprint 4 lintas 3 peran teruji secara *end-to-end* bersama PM Jordan dengan bukti acceptance lengkap agar bebas regresi dan siap demo. |

### Porsi 4 — Izzatu Khairul Fata (`S4-SRS-31` – `S4-SRS-40`)

| Kode SRS | User Story |
| :--- | :--- |
| `S4-SRS-31` | Sebagai praktikan, saya ingin mengajukan izin pada sesi praktikum tertentu yang terintegrasi dengan struktur laboratorium, sesi, dan kebijakan denda Sprint 4. |
| `S4-SRS-32` | Sebagai sistem, saya ingin melakukan **analisis sentimen** terhadap alasan pengajuan izin melalui API model AI pengajar (beserta klasifikasi kategori) dan menyimpannya ke Firestore. |
| `S4-SRS-33` | Sebagai Asprak dan praktikan, saya ingin melihat hasil analisis sentimen AI pada detail pengajuan dan layar peninjauan izin melalui komponen tampilan yang jelas (`AiSentimentBadge`). |
| `S4-SRS-34` | Sebagai pengguna, saya ingin hasil analisis sentimen AI ditegaskan hanya sebagai informasi pendukung (bukan pengambil keputusan otomatis) serta izin yang disetujui tampil real-time sebagai *excused absence* bebas denda. |
| `S4-SRS-35` | Sebagai pengguna, saya ingin pengajuan izin tetap tersimpan, pemeriksaan manual Asprak tetap berjalan, dan tersedia tombol retry aman ketika layanan AI timeout atau gagal. |
| `S4-SRS-36` | Sebagai pengguna, saya ingin navigasi dan tab bar (`app-tabs.tsx`) tersusun rapi sesuai kewenangan 3 peran (Aslab, Asprak, Praktikan) dengan akses mudah ke Pembayaran, Bulk/Transfer, dan Dashboard. |
| `S4-SRS-37` | Sebagai pengguna, saya ingin `StatusBadge`, `AsyncState`, `EmptyState`, `ConfirmModal`, dan kartu permission/error konsisten mendukung seluruh status baru Sprint 4 (`on_time`, `late`, `excused_absence`, `unpaid`, `pending`, `paid`, `failed`, sentimen AI). |
| `S4-SRS-38` | Sebagai praktikan, saya ingin seluruh antarmuka layar praktikan tampil modern, konsisten dengan `src/theme/index.ts`, dan mudah digunakan. |
| `S4-SRS-39` | Sebagai Aslab dan Asprak, saya ingin seluruh antarmuka pengelolaan lab, bulk insert `ScrollView`, dashboard, sesi, dan tinjau izin tampil rapi tanpa elemen terpotong atau *overflow*. |
| `S4-SRS-40` | Sebagai pengguna perangkat mobile, saya ingin seluruh layar aman dari kamera/notch (`SafeAreaView`), responsif terhadap keyboard (`KeyboardAvoidingView`), bermicrocopy Indonesia seragam, dan lolos `npx tsc --noEmit`. |

---

## 4. Alur Demo & Deliverable Utama

1. **Alur 1 — Aslab Manajemen Lab, Bulk Insert & Transfer:** Aslab mengatur radius, *grace period*, & denda → mengunduh template → bulk insert terpisah dengan review `ScrollView` (accept/deny/edit/isi kosong) → memindahkan praktikan & asprak antar lab → memantau Dashboard dengan filter Hari/Minggu/Bulan.
2. **Alur 2 — Asprak Sesi & Keterlambatan → Midtrans Sandbox:** Asprak membuka sesi → praktikan presensi tepat waktu (tanpa denda) & praktikan lain terlambat melewati *grace period* → 1 tagihan denda tercipta + push notif `FINE_CREATED` → praktikan bayar via Midtrans Sandbox → webhook verifikasi lunas + push notif `PAYMENT_SUCCEEDED` → status hadir tidak berubah → tampil di Riwayat Pembayaran Praktikan & Dashboard Keuangan Aslab.
3. **Alur 3 — AI Analisis Sentimen Izin & Bebas Denda:** Praktikan mengajukan izin → API AI menganalisis sentimen (termasuk uji fallback saat AI gagal) → Asprak menyetujui manual → tercatat *excused absence* + bebas denda (tidak menjadi hadir).

---

## 5. Matriks Kepemilikan File (Anti-Konflik) & Urutan Merge

| Area / Folder / File | Pemilik Utama | Reviewer |
| :--- | :--- | :--- |
| Backend Express (`labcheckin-api`), Midtrans Server & Webhook, Push Worker | **Maulana** | Jordan (PM) |
| `firestore.rules`, `firestore.indexes.json`, `src/lib/labCheckInApi.ts` | **Maulana** | Hasta & Hanif |
| `src/features/fines/*`, `src/features/payments/*`, `src/app/(student)/payments/*`, `src/features/notifications/*` | **Maulana** | Izzatu |
| `src/features/aslab-bulk/*`, `src/app/(coordinator)/bulk-*.tsx`, `src/app/(coordinator)/transfer.tsx` | **Hasta** | Hanif |
| `src/features/coordinator/coordinatorService.ts`, `src/features/coordinator/screens/*`, `src/features/geotag/*` | **Hasta** | Maulana |
| `src/features/aslab-dashboard/*`, `src/features/coordinator/components/CoordinatorDashboard.tsx` | **Hanif** | Hasta |
| `src/screens/ScheduleScreen.tsx`, `SessionDetailScreen.tsx`, `SessionControl.tsx`, `AttendanceList.tsx`, `src/app/(assistant)/*` | **Hanif** | Maulana |
| `src/features/leave/*`, AI Sentiment Adapter/Worker, `AiSentimentBadge.tsx` | **Izzatu** | Hanif |
| `src/components/app-tabs.tsx`, `src/theme/index.ts`, `src/components/common/*`, visual QA pass akhir | **Izzatu** | Jordan (PM) |
| `package.json`, `package-lock.json`, `app.json`, `src/types/index.ts` | **Maulana** *(integrator)* | Jordan (PM) |

**Urutan Merge ke `integration/sprint-4`:**
1. **Maulana** (`feat/s4-fines-midtrans-e2e`)
2. **Hasta** (`feat/s4-aslab-management-bulk`)
3. **Hanif** (`feat/s4-dashboard-asprak-ops`)
4. **Izzatu** (`feat/s4-ai-sentiment-ui-finalization`)
5. **PM Jordan** melakukan PR final `integration/sprint-4` → `main` (menggunakan *Merge Commit*) setelah UAT lulus.
