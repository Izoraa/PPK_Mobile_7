# LabCheckIn — Dokumen Kesepakatan Tim (Sprint 2)

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 2 |
| **Tema** | Data Dinamis dengan Firebase dan Klasifikasi Alasan Izin Menggunakan AI |
| **Project Manager** | Hasta Putra Wildantara |
| **Tim Programmer** | Maulana Ghazzam Adil Al Faiq, Jordan Tenggara, Hanif Ihsanul Huda, Izzatu Khairul Fata |
| **Status Dokumen** | ✅ Arsip Historis (Selesai) |

**Tanggal penyusunan:** 12 November 2026.  
**Dasar:** user story Sprint 2 dari pengajar, dokumen kesepakatan Sprint 1, dan pemeriksaan repository `PPK_Mobile_7-main`.

Dokumen ini membedakan **kebutuhan wajib pengajar** dari **keputusan desain tim yang diusulkan**. Delapan kelompok kebutuhan pengajar tetap wajib. Pilihan seperti cara aktivasi asisten, pengarsipan data, dan batas waktu izin adalah keputusan desain yang dijelaskan di sini agar implementasi empat programmer konsisten. Detail API pengajar yang belum diberikan tidak dianggap sudah diketahui.

Penjelasan dan teks antarmuka menggunakan bahasa Indonesia. Identifier, nama file, tipe, fungsi, branch, status, kode error, dan commit message menggunakan bahasa Inggris. Nomor `S2-SRS-xx` khusus Sprint 2, tidak menggantikan nomor SRS Sprint 1.

---

## 1. Sprint goal dan batas cakupan

**Sprint goal:** praktikan dan asisten menggunakan akun masing-masing untuk mengakses data praktikum yang persisten dan tersinkronisasi, menjalankan presensi, serta mengajukan dan memeriksa izin dengan klasifikasi AI sebagai informasi pendukung.

Dua alur wajib selesai dari awal sampai akhir:

1. Asisten login → membuka sesi → praktikan login pada perangkat lain → melakukan presensi → Firestore menyimpan kehadiran → rekap asisten berubah tanpa refresh manual → asisten menutup sesi.
2. Praktikan login → mengajukan izin → pengajuan tersimpan → API AI mengklasifikasikan alasan → asisten melihat alasan dan klasifikasi → asisten menerima/menolak → praktikan melihat keputusan tanpa restart.

Semua SRS pada bagian 4 termasuk **Must Have**. Urutan pengerjaan membedakan dependensi, bukan mengubah fitur wajib menjadi opsional.

**Di luar cakupan awal:** QR/GPS, lampiran surat, push notification, ekspor laporan, registrasi sosial, chat, pelatihan model AI, admin dashboard lengkap, banding izin, dan antrean presensi offline. Jangan memasukkan fitur tersebut sebelum dua alur wajib dan pengujian keamanan selesai.

## 2. Titik awal dari Sprint 1

| Area | Kondisi yang ditemukan | Implikasi Sprint 2 |
|---|---|---|
| Framework | `expo ~58.0.16`, TypeScript, entry `expo-router/entry` | Pertahankan SDK dan Expo Router; baca dokumentasi versi yang sesuai sebelum mengubah API. |
| Identitas | Role picker dan identitas dummy | Ganti dengan Firebase Auth; role picker tidak boleh menjadi mekanisme login produksi. |
| State | `src/state/AppContext.tsx`, Context + reducer dengan data lokal | Data server menjadi sumber kebenaran; state UI mengikuti listener, bukan menyalin dummy. |
| Check-in | `CheckInPanel` dan validasi lokal tersedia | Pertahankan perilaku UI, ubah operasi menjadi async dan validasi transaksi/rules. |
| Sesi | Buka/tutup dan modal konfirmasi tersedia | Pertahankan transisi satu arah, tambah otorisasi pemilik kelas. |
| Rekap/riwayat | Implementasi aktif pada route dan komponen; masih ada stub/struktur lama | Gunakan implementasi aktif; konsolidasikan setelah pemakaian diperiksa. |
| Navigasi | Perpindahan jadwal–detail memakai state lokal; tab `Explore` merujuk route yang tidak ada | Migrasikan ke route detail nyata; bersihkan tab starter. |
| UI | Kartu jadwal belum memiliki badge lengkap; badge masih menampilkan status teknis | Lengkapi label Indonesia dan warna status. |
| Pemeriksaan | Typecheck sebelumnya menemukan 3 error terkait `/explore` dan callback `SessionCard`; konfigurasi ESLint belum tersedia | Masukkan perbaikan baseline ke milestone fondasi, bukan menganggap Sprint 1 sudah bersih. |

Tidak adanya database/login pada Sprint 1 sesuai cakupan saat itu. Dokumen Sprint 1 menyebut React Navigation, tetapi agreement Sprint 2 mengikuti proyek aktual dan `AGENTS.md`: **Expo Router**. Hasil inspeksi kode bukan bukti bahwa seluruh demo telah diuji di perangkat.

## 3. Tim, tanggung jawab, dan kepemilikan

| Anggota | Tanggung jawab utama | SRS milik utama | Hasil serah terima |
|---|---|---|---|
| **Hasta — PM** | Mengunci scope dan keputusan bisnis, mengelola backlog, dependensi, risiko, acceptance/UAT, dan koordinasi pengajar | Tidak dijadikan programmer kelima | Board SRS, keputusan tercatat, jadwal integrasi, bukti acceptance dan demo |
| **Maulana Ghazzam Adil Al Faiq** | Autentikasi, profil/role, fondasi Firebase, guard navigasi, koordinator rules | 01–10 | Login/registrasi/logout, provider identitas, konfigurasi bersama, rules terintegrasi |
| **Jordan Tenggara** | Kelas, peserta, jadwal, sesi, dan pengarsipan | 11–20 | CRUD praktikum, keanggotaan, kendali sesi yang aman |
| **Hanif Ihsanul Huda** | Presensi, rekap/riwayat, pemeriksaan izin, integrasi realtime dan pengujian lintas fitur | 21–30 | Check-in persisten, rekap realtime, keputusan izin, bukti demo |
| **Izzatu Khoirul Fata** | Pengajuan/status izin, adapter API AI, backend klasifikasi, pola kegagalan layanan, konsistensi navigasi/UI | 31–40 | Pengajuan persisten, klasifikasi tersimpan, fallback/retry, komponen status layanan, integrasi UI |

Masing-masing programmer memiliki tepat 10 SRS dengan nomor berurutan. Tugas konsistensi navigasi/UI dipindahkan dari Maulana ke Izzatu; Maulana tetap memiliki guard autentikasi/role, sedangkan Jordan tetap memiliki komponen jadwal. Jumlah yang sama tidak otomatis menyamakan kompleksitas pekerjaan. API AI dan rules memiliki ketidakpastian tinggi; PM meninjau estimasi setelah endpoint AI dan kontrak fondasi tersedia. Setiap pemilik fitur tetap menulis validasi, aturan akses yang dibutuhkan, dan pengujian fiturnya. Maulana mengintegrasikan rules, bukan mengerjakan seluruh keamanan sendirian. Hanif mengoordinasikan demo, bukan menggantikan QA seluruh anggota.

### Kepemilikan file

| Area/file | Pemilik perubahan utama | Reviewer integrasi |
|---|---|---|
| `src/lib/firebase/`, `src/features/auth/`, `src/providers/AuthProvider.tsx` | Maulana | Izzatu |
| `src/app/_layout.tsx`, route auth, guard autentikasi/role | Maulana | Izzatu |
| Konfigurasi tab, pembersihan route starter, konsistensi navigasi dan UI lintas fitur | Izzatu sebagai integrator | Maulana; pemilik route/komponen terkait |
| `package.json`, lockfile, `firebase.json`, `.env.example`, konfigurasi lint/build | Maulana | Pemilik kebutuhan terkait |
| `src/types/index.ts`, kontrak service, `firestore.rules`, `firestore.indexes.json` | Maulana sebagai integrator | Semua pemilik kontrak terkait |
| `src/features/practicum/`, route kelas/sesi, `SessionCard`, `StatusBadge`, `SessionControl` | Jordan | Hanif |
| `functions/src/practicum/` untuk pengelolaan peserta | Jordan | Maulana |
| `src/features/attendance/`, `CheckInPanel`, rekap/riwayat | Hanif | Jordan |
| `src/features/leave-review/`, halaman pemeriksaan izin | Hanif | Izzatu |
| `src/features/leave/`, route pengajuan/status izin | Izzatu | Hanif |
| `functions/src/ai/`, adapter API pengajar | Izzatu | Maulana |
| `functions/src/index.ts`, inisialisasi backend, script provisioning asisten | Maulana | Jordan/Izzatu sesuai fungsi |
| `src/components/common/AsyncState.tsx`, `src/utils/errors.ts`, pesan layanan bersama | Izzatu | Maulana |
| `src/theme/`, pesan domain | Pemilik fitur melalui PR terkoordinasi | Pemilik integrasi |
| `tests/rules/`, `tests/integration/` | Masing-masing pemilik fitur; Hanif mengoordinasikan suite | Maulana |
| Agreement, checklist acceptance, catatan keputusan | Hasta | Tim |

Folder di atas adalah **rencana struktur**, bukan klaim bahwa seluruh file sudah ada. Perubahan file bersama dilakukan dalam PR kecil oleh integrator atau dikoordinasikan sebelum coding. Jangan menyalin service/context global ke empat versi berbeda.

## 4. Software Requirements Specification (SRS)

### A. Autentikasi, identitas, persistensi, dan keamanan — Maulana

| ID | Requirement | Kriteria penerimaan |
|---|---|---|
| S2-SRS-01 | Registrasi melalui Firebase Authentication memakai email dan password | Input valid membuat akun Auth; email duplikat/password tidak memenuhi kebijakan ditangani; submit berulang dicegah selama proses. |
| S2-SRS-02 | Menyimpan profil pengguna berdasarkan UID Auth | `users/{uid}` berisi nama, NIM untuk praktikan, dan role; password tidak disimpan di Firestore; kegagalan pembuatan profil dapat dipulihkan tanpa membuat akun Auth kedua. |
| S2-SRS-03 | Menyediakan akun praktikan dan asisten secara aman | Registrasi umum tidak dapat memberi hak asisten sendiri; permintaan role asisten menunggu provisioning tepercaya; kedua jenis akun dapat login setelah siap. |
| S2-SRS-04 | Login menggunakan Firebase Authentication | Kredensial benar membuka aplikasi sesuai profil; kegagalan login tampil dalam bahasa Indonesia; form tidak berpindah ke halaman utama sebelum identitas siap. |
| S2-SRS-05 | Logout dan pembersihan state pengguna | Logout mengakhiri sesi, melepas listener, dan menghapus state pengguna lama; login akun B tidak menampilkan data privat akun A walau sesaat. |
| S2-SRS-06 | Memulihkan sesi login | Saat aplikasi dibuka ulang, status Auth diperiksa dengan indikator loading; sesi valid dan profil dipulihkan tanpa role picker dummy. |
| S2-SRS-07 | Membatasi halaman berdasarkan autentikasi/role | Pengguna belum login diarahkan ke login; deep link ke halaman asisten ditolak untuk praktikan; loading profil tidak dianggap sebagai role default. |
| S2-SRS-08 | Menangani validasi dan kegagalan autentikasi | Email/nama/NIM wajib sesuai profil, password dan konfirmasi cocok; error jaringan, login, profil hilang, dan aktivasi asisten memiliki pesan serta tindakan pemulihan. |
| S2-SRS-09 | Persistensi server dan pemulihan data | Data yang sudah diakui server muncul kembali setelah aplikasi ditutup dan login ulang, termasuk pada perangkat kedua; tidak kembali ke dummy. |
| S2-SRS-10 | Firebase Security Rules dan otorisasi backend | Uji akses langsung menolak spoof UID, eskalasi role, akses lintas kelas, presensi ganda, perubahan keputusan/AI ilegal; backend Admin SDK memvalidasi izin sendiri. |

### B. Kelas, peserta, jadwal, dan sesi — Jordan

| ID | Requirement | Kriteria penerimaan |
|---|---|---|
| S2-SRS-11 | Asisten membuat kelas | Nama/kode kelas dan mata praktikum valid tersimpan; `assistantId` berasal dari UID login, bukan input bebas; kelas langsung muncul bagi pemilik. |
| S2-SRS-12 | Menampilkan kelas sesuai kewenangan | Asisten melihat kelas miliknya; praktikan melihat kelas yang diikutinya; pengguna lain tidak dapat membaca kelas lewat manipulasi ID. |
| S2-SRS-13 | Asisten mengubah informasi kelas | Pemilik dapat mengubah nama/kode/mata praktikum; ID/pemilik tetap; perubahan terlihat pada pengguna terkait. |
| S2-SRS-14 | Asisten menghapus kelas dari penggunaan aktif | Aksi hapus memakai arsip dan konfirmasi; kelas tidak lagi muncul pada daftar aktif; riwayat tetap terbaca dan aktivitas baru diblokir. |
| S2-SRS-15 | Asisten mengelola peserta kelas | Dapat menambah peserta terdaftar berdasarkan UID yang dibagikan peserta, melihat daftar, menonaktifkan, dan mengaktifkan kembali; duplikasi dan UID nonpraktikan ditolak; tidak membuat akun Auth orang lain. |
| S2-SRS-16 | Asisten membuat jadwal/sesi | Sesi memuat kelas, judul/pertemuan, ruang, waktu mulai/selesai dan zona waktu; akhir harus sesudah awal; sesi baru berstatus `not_open`. |
| S2-SRS-17 | Menampilkan jadwal/detail yang relevan | Praktikan hanya dapat melihat sesi kelasnya; detail menampilkan waktu, ruang, status, dan tindakan sesuai role serta kondisi partisipasi. |
| S2-SRS-18 | Asisten mengubah sesi yang belum dibuka | Pemilik dapat mengubah metadata sesi `not_open`; relasi kelas/pemilik tidak berubah; setelah `open` atau `closed`, metadata dikunci agar bukti historis konsisten. |
| S2-SRS-19 | Asisten menghapus sesi dari daftar aktif | Sesi `not_open` dapat diarsipkan dengan konfirmasi; bukti izin yang sudah ada tetap tersimpan dan bisa diperiksa; sesi terbuka harus ditutup terlebih dahulu, sesi tertutup tetap menjadi riwayat. |
| S2-SRS-20 | Asisten membuka/menutup sesi | Konfirmasi wajib; hanya pemilik dapat mengubah `not_open → open → closed`; waktu server disimpan; sesi tidak bisa dibuka ulang atau langsung ditutup dari `not_open`. |

### C. Presensi, pemeriksaan izin, realtime, dan pengujian — Hanif

| ID | Requirement | Kriteria penerimaan |
|---|---|---|
| S2-SRS-21 | Menyimpan presensi praktikan ke Firestore | Praktikan aktif pada kelas dapat check-in pada sesi `open`; UID, sesi, kelas, dan waktu server tercatat; UI sukses hanya setelah transaksi dikonfirmasi. |
| S2-SRS-22 | Memvalidasi hak dan kondisi check-in | Ditolak jika belum login, bukan praktikan, bukan peserta aktif, kelas/sesi diarsipkan, atau sesi belum dibuka/sudah ditutup; validasi tidak hanya di tombol UI. |
| S2-SRS-23 | Mencegah presensi ganda secara atomik | Dua tap atau dua perangkat dengan UID yang sama menghasilkan maksimal satu record; tidak dapat menimpa waktu presensi pertama; konflik dengan pengajuan izin juga ditolak. |
| S2-SRS-24 | Menampilkan hasil dan pemulihan check-in | Tombol loading saat mengirim; keberhasilan berisi waktu hadir; timeout/koneksi gagal tidak menghasilkan sukses palsu; retry membaca hasil server agar tidak menggandakan record. |
| S2-SRS-25 | Menampilkan rekap kehadiran asisten | Pemilik sesi melihat nama/NIM, waktu hadir, jumlah hadir, dan ringkasan izin; izin diterima tidak dihitung sebagai hadir; daftar kosong memiliki pesan. |
| S2-SRS-26 | Menampilkan riwayat praktikan | Praktikan hanya melihat record miliknya beserta sesi/waktu; hasil tetap tersedia setelah restart dan tidak bocor ke akun lain. |
| S2-SRS-27 | Menampilkan daftar/detail izin untuk pemeriksaan | Asisten pemilik kelas dapat melihat pemohon, sesi, alasan, status keputusan, kategori AI atau status kegagalannya; dapat memfilter pengajuan yang menunggu. |
| S2-SRS-28 | Asisten menerima atau menolak izin | Aksi manual dengan konfirmasi menyimpan keputusan, UID pemeriksa, waktu server, dan catatan; alasan penolakan wajib; keputusan hanya sekali dari `pending`, termasuk saat dua perangkat memeriksa bersamaan. |
| S2-SRS-29 | Sinkronisasi realtime | Perubahan sesi, presensi, klasifikasi, dan keputusan muncul pada pengguna terkait tanpa restart/refresh manual; listener dilepas saat scope berubah/logout. |
| S2-SRS-30 | Verifikasi integrasi dan paket demo | Lint/typecheck lulus, rules dan skenario konflik diuji, kedua alur dijalankan lintas perangkat dengan Firebase nyata serta API pengajar; bukti hasil dan build dicatat. |

### D. Pengajuan izin, AI, penanganan error, dan konsistensi UI — Izzatu

| ID | Requirement | Kriteria penerimaan |
|---|---|---|
| S2-SRS-31 | Form pengajuan izin untuk sesi tertentu | Praktikan aktif dapat memilih sesi `not_open`/`open` dan mengisi alasan 10–1.000 karakter setelah trim; sesi/kelas arsip atau sesi `closed` ditolak; belum pernah hadir/mengajukan untuk sesi itu. |
| S2-SRS-32 | Menyimpan izin sebelum memanggil AI | Firestore menyimpan pengajuan `pending` dan klasifikasi `pending` terlebih dahulu; maksimal satu record partisipasi per UID/sesi; kegagalan AI tidak menghilangkan pengajuan. |
| S2-SRS-33 | Praktikan memantau izin miliknya | Daftar/detail menampilkan alasan, status menunggu/diterima/ditolak, hasil AI bila ada, serta catatan pemeriksa; status keputusan dan status AI dibedakan. |
| S2-SRS-34 | Mengirim alasan ke API model pengajar | Backend memverifikasi pengguna, mengambil alasan dari record tersimpan, dan memanggil endpoint pengajar melalui adapter; hanya data yang diperlukan dikirim; payload mengikuti spesifikasi aktual pengajar. |
| S2-SRS-35 | Memvalidasi dan menyimpan hasil klasifikasi | Kategori valid disimpan bersama pengajuan, beserta waktu klasifikasi dan confidence/model version bila memang diberikan; payload rusak/kategori tidak dikenal tidak dianggap berhasil. |
| S2-SRS-36 | Menangani AI timeout/gagal | Batas tunggu diberlakukan; UI menyatakan klasifikasi belum tersedia; pengajuan tetap `pending` kecuali sudah diputuskan manusia; asisten tetap dapat memeriksa. |
| S2-SRS-37 | Menyediakan retry klasifikasi yang aman | Pemohon atau asisten terkait dapat mencoba ulang saat gagal/tertunda; satu proses aktif per pengajuan; retry tidak membuat izin baru atau menimpa keputusan; proses macet memiliki pemulihan. |
| S2-SRS-38 | Menjelaskan AI hanya sebagai pendukung | Label menyatakan prediksi AI bukan keputusan; tidak ada aturan atau fungsi yang mengubah keputusan menjadi diterima/ditolak berdasarkan kategori/confidence. |
| S2-SRS-39 | State loading, empty, error, dan gangguan jaringan | Semua halaman data memiliki state tersebut dan retry; formulir tidak hilang saat gagal; data cache ditandai belum terverifikasi; error mentah/secret tidak ditampilkan. |
| S2-SRS-40 | Konsistensi navigasi dan UI mobile | Tidak ada route starter rusak; detail memakai Expo Router; back Android/keyboard/scroll berfungsi; label Indonesia dan badge konsisten; kontrol mengikuti role. |

Kebutuhan lintas fitur tetap dikerjakan bersama pemilik modul terkait. Pemilik SRS mengoordinasikan integrasi dan bukti acceptance; S2-SRS-30 dikoordinasikan Hanif dan diterima oleh Hasta sebagai PM.

### Pemetaan ke delapan kebutuhan pengajar

| Kebutuhan pengajar | SRS terkait |
|---|---|
| 1. Autentikasi dan peran | 01–08, 10, 40 |
| 2. CRUD data praktikum | 10–20 |
| 3. Presensi terintegrasi | 21–26 |
| 4. Realtime dan persistensi | 09, 25–26, 29, 33 |
| 5. Pengajuan izin | 31–33 |
| 6. Integrasi AI | 34–38 |
| 7. Pemeriksaan izin | 27–29, 33 |
| 8. Validasi dan keamanan | 08, 10, 22–24, 30–31, 35–37, 39–40 |

## 5. Keputusan bisnis yang diusulkan untuk implementasi

Keputusan berikut menjadi baseline rancangan, dan perlu dikonfirmasi saat kickoff. Jangan menganggapnya persyaratan eksplisit pengajar.

1. **Registrasi email/password.** Pengguna baru ber-role `student`. Pilihan mendaftar sebagai asisten membuat `requestedRole: 'assistant'`, bukan langsung memberi hak asisten. Maulana menjalankan provisioning tepercaya untuk akun yang identitasnya dikonfirmasi PM. Tidak perlu membangun dashboard admin pada sprint ini.
2. **Satu asisten pemilik per kelas.** `assistantId` pada kelas menjadi dasar hak kelola; asisten tidak otomatis berwenang atas seluruh kelas. Transfer pemilik/co-assistant di luar scope.
3. **Peserta ditambahkan oleh pemilik kelas memakai UID akun terdaftar.** Praktikan dapat menyalin UID pada halaman akun. Tidak perlu membuka direktori semua pengguna atau mengimplementasikan kode undangan pada sprint ini.
4. **Jadwal melekat pada sesi.** Setiap sesi mempunyai awal/akhir dan ruang sendiri; koleksi jadwal terpisah belum diperlukan. Waktu disimpan sebagai timestamp, ditampilkan memakai zona waktu kelas. Default usulan `Asia/Jakarta`, dikonfirmasi PM sesuai kampus.
5. **Buka/tutup manual menentukan presensi.** Jam jadwal adalah informasi; tidak ada pembukaan/penutupan otomatis. Setelah `closed`, sesi tidak dapat dibuka kembali.
6. **Satu partisipasi per praktikan per sesi:** hadir **atau** pengajuan izin. Setelah pengajuan dikirim, tidak ada edit, pembatalan, pengajuan ulang, atau konversi ke hadir pada sprint ini, termasuk jika ditolak. UI harus menjelaskan sebelum konfirmasi. Jika pengajar menghendaki pembatalan/peralihan, ubah kontrak ini sebelum implementasi.
7. **Izin dapat diajukan saat `not_open` atau `open`;** tidak setelah `closed`. Asisten tetap boleh memutuskan izin setelah sesi ditutup/diarsipkan agar pengajuan tidak menggantung.
8. **Keputusan final sekali:** `pending → approved` atau `pending → rejected`. Penolakan memerlukan catatan 5–500 karakter; catatan penerimaan opsional, maksimal 500 karakter. AI tidak memiliki hak mengubah keputusan.
9. **Delete menggunakan soft delete/arsip.** Menghapus kelas/sesi dari daftar aktif mempertahankan riwayat. Menonaktifkan peserta tidak menghapus bukti lamanya. Ini definisi operasi D pada rancangan CRUD; PM mengonfirmasi apakah rubrik pengajar mewajibkan penghapusan fisik. Jika iya, tambahkan penghapusan terbatas untuk data tanpa relasi, bukan cascade tanpa kontrol.
10. **Kelas arsip melarang aktivitas baru**, tetapi pemilik boleh menutup sesi yang sudah terbuka serta memeriksa izin lama. Sesi yang diarsipkan kehilangan tindakan baru; riwayat tetap tersedia.
11. **Data tersimpan berarti sudah diakui server.** Mutasi kritis memerlukan koneksi; jangan menampilkan kehadiran/izin sukses hanya karena state lokal berubah. Persistensi Firestore server tidak sama dengan jaminan penyimpanan cache offline pada perangkat.
12. **Rekap tidak menyamakan izin dengan hadir.** Tampilkan Hadir, Izin menunggu, Izin diterima, Izin ditolak. Jika menampilkan peserta tanpa record, gunakan “Belum tercatat”; jangan otomatis memberi label “alpa” tanpa kebijakan tambahan.

## 6. Arsitektur dan teknologi

| Bagian | Keputusan rancangan |
|---|---|
| Mobile | React Native + Expo SDK 58 yang sudah digunakan; TypeScript |
| Navigasi | Expo Router, file route hanya di `src/app/` |
| Identitas | Firebase Authentication; UID adalah identitas otoritatif |
| Data | Cloud Firestore, bukan Realtime Database |
| Integrasi klien | Firebase JavaScript SDK modular; satu inisialisasi aplikasi/Auth/Firestore |
| State | `AuthProvider` untuk sesi/profil; hook listener per fitur; Context tambahan hanya untuk scope bersama yang diperlukan |
| AI dan enrolment | Backend tepercaya, usulan Cloud Functions for Firebase callable |
| Validasi | Form → service → Security Rules; backend Admin SDK wajib melakukan otorisasi dan validasi sendiri |
| Build | EAS development/preview sesuai konfigurasi proyek; akun build dikoordinasikan Maulana |

Firebase JS SDK mendukung Auth dan Firestore pada React Native; versi dipilih mengikuti panduan Expo dan dikunci pada lockfile setelah integrasi. Jangan memasang Firebase JS SDK dan React Native Firebase bersamaan tanpa kebutuhan yang jelas. [Panduan Expo Firebase](https://docs.expo.dev/guides/using-firebase/).

**Dependensi layanan:** penggunaan Cloud Functions sebagai host backend adalah pilihan desain tambahan. PM dan Maulana memeriksa akses proyek, kebutuhan billing/deployment, serta fasilitas backend dari pengajar sebelum mengunci host. Persiapan deployment Functions dijelaskan di [panduan resmi Firebase](https://firebase.google.com/docs/functions/get-started). Jika memakai backend tepercaya lain, kontrak internal dan verifikasi token tetap sama; jangan memindahkan secret API ke aplikasi untuk menghindari kebutuhan backend.

### Langkah fondasi — sebelum implementasi paralel

1. Maulana menyiapkan proyek Firebase pengembangan, Email/Password Auth, Firestore, konfigurasi lokal contoh tanpa secret, dan target emulator.
2. Tim mengunci skema, status, interface service, aturan akses, dan keputusan bisnis bagian 5. Izzatu memperoleh kontrak API pengajar melalui PM.
3. Maulana mengintegrasikan shared types, AuthProvider, route skeleton, pesan error, rules awal default-deny, dan konfigurasi lint. Jordan/Hanif/Izzatu membantu perbaikan baseline sesuai kepemilikan file dan integrasi UI.
4. Maulana menyiapkan satu akun asisten tepercaya; akun praktikan menggunakan registrasi aplikasi. UID dummy tidak dipakai untuk akses produksi.
5. Setiap pemilik menyediakan service stub dengan kontrak yang sama untuk pengembangan UI, lalu menggantinya dengan Firestore/API sebelum acceptance. Mock bukan bukti integrasi selesai.

Repository saat ini memakai `package-lock.json`, tanpa `bun.lock`; gunakan npm/npx. Untuk penambahan dependency aplikasi gunakan `npx expo install <package>`. Jangan menjalankan perintah setup contoh dari Sprint 1 untuk membuat ulang proyek.

## 7. Struktur data Firestore (kontrak usulan)

### 7.1 Path dokumen

```text
users/{uid}
classes/{classId}
memberships/{classId}_{studentId}
sessions/{sessionId}
sessions/{sessionId}/participations/{studentId}
```

`classId` dan `sessionId` dibuat oleh Firestore auto-ID. ID membership adalah gabungan `classId + '_' + studentId`, tanpa di-parse kembali. Partisipasi memakai UID sebagai document ID, **bukan** auto-ID. Satu path untuk hadir maupun izin membuat konflik keduanya dapat dicegah secara atomik tanpa dua koleksi yang saling berlomba.

### 7.2 Field dan arti

| Dokumen | Field wajib/aturan |
|---|---|
| `users/{uid}` | `uid`, `name`, `email`, `studentNumber: string \| null`, `role: student \| assistant`, `requestedRole: student \| assistant`, `createdAt`, `updatedAt`. UID cocok dengan Auth/path; role awal student; role hanya dipromosikan proses admin tepercaya. |
| `classes/{classId}` | `name`, `code`, `course`, `timeZone`, `assistantId`, `isArchived`, `createdAt`, `updatedAt`. Pemilik immutable. |
| `memberships/{classId}_{studentId}` | `classId`, `studentId`, `assistantId`, `studentName`, `studentNumber`, `isActive`, `createdAt`, `updatedAt`. Nama/NIM disalin oleh backend dari profil terdaftar; UI tidak menjadi sumber identitas. |
| `sessions/{sessionId}` | `classId`, `assistantId`, `title`, `room`, `startsAt`, `endsAt`, `timeZone`, `status`, `isArchived`, `openedAt: Timestamp \| null`, `closedAt: Timestamp \| null`, `createdAt`, `updatedAt`. Pemilik sama dengan kelas; `classId`/pemilik immutable. |
| Partisipasi, field bersama | `sessionId`, `classId`, `assistantId`, `studentId`, `studentName`, `studentNumber`, `kind: attendance \| leave`, `createdAt`, `updatedAt`. Nilai relasi divalidasi terhadap sesi dan membership; snapshot nama/NIM harus cocok dengan membership. |
| Tambahan `kind: attendance` | `checkedInAt`. Tidak mempunyai field keputusan/AI. Setelah tercipta, record immutable bagi semua klien. |
| Tambahan `kind: leave` | `reason`, `status: pending \| approved \| rejected`, `reviewedBy: string \| null`, `reviewedAt: Timestamp \| null`, `reviewNote: string \| null`, serta object `ai`. |
| Object `ai` | `status: pending \| processing \| succeeded \| failed`, `category: string \| null`, `confidence: number \| null`, `modelVersion: string \| null`, `classifiedAt: Timestamp \| null`, `errorCode: string \| null`, `requestId: string \| null`, `startedAt: Timestamp \| null`, `attemptCount: number`. |

Semua waktu audit disimpan dengan waktu server. `startsAt`/`endsAt` adalah waktu jadwal yang dipilih asisten dan dinormalisasi sesuai zona waktu; bukan waktu perangkat yang digunakan untuk membuktikan check-in. Timestamp yang belum terselesaikan di snapshot pending tidak boleh menyebabkan crash UI.

Saat izin dibuat, `status = pending`; seluruh field review null. `ai.status = pending`, `attemptCount = 0`, field hasil/proses lainnya null. Klien hanya boleh membuat nilai awal ini; perubahan AI dilakukan backend. Nilai kategori/normalisasi confidence mengikuti kontrak API aktual, belum ditentukan oleh dokumen ini.

`studentName`/`studentNumber` merupakan snapshot untuk tampilan historis; UID tetap dasar akses. Profil pengguna lain tidak perlu dibaca langsung oleh layar rekap. Edit profil umum di luar kebutuhan registrasi/pemulihan tidak masuk sprint ini.

### 7.3 Pembacaan dan query

| Layar | Query/scope yang disepakati |
|---|---|
| Kelas asisten | `classes` dengan `assistantId == auth.uid`; filter arsip sesuai layar |
| Kelas praktikan | `memberships` dengan `studentId == auth.uid`; ambil dokumen kelas berdasarkan `classId`; membership nonaktif hanya untuk konteks riwayat |
| Jadwal/detail | Query `sessions` dengan `classId` kelas yang berhak diakses; filter arsip untuk daftar aktif; urut `startsAt` |
| Peserta kelas | `memberships` dengan `classId` dan `assistantId == auth.uid` |
| Rekap satu sesi | Subkoleksi `sessions/{sessionId}/participations`, hanya pemilik sesi |
| Record praktikan pada sesi | Dokumen `sessions/{sessionId}/participations/{auth.uid}` |
| Riwayat/izin praktikan | Collection-group `participations`, filter `studentId == auth.uid`, tambah `kind` sesuai layar, urut `createdAt` |
| Antrean izin asisten | Collection-group `participations`, filter `assistantId == auth.uid`, `kind == leave`, dan status bila diperlukan |

Query wajib sesuai rules. Firestore tidak mengunduh seluruh data lalu menyaring hak akses di klien; query yang berpotensi membaca data terlarang dapat ditolak seluruhnya. [Dokumentasi keamanan query](https://firebase.google.com/docs/firestore/security/rules-query).

Maulana mencatat index composite/collection-group yang diperlukan query di `firestore.indexes.json`; pemilik fitur mengirim kombinasi filter/sort yang sebenarnya dipakai. Rules collection-group menggunakan versi 2 dengan syarat pemilik/student yang eksplisit; jangan menambahkan wildcard read luas hanya agar query berhasil. Gunakan limit/paginasi pada daftar panjang dan hindari listener per baris rekap.

## 8. Kontrak operasi, state, dan transaksi

Kontrak berikut merupakan target interface internal, bukan implementasi Firebase lengkap. Satu modul shared mengekspor tipe yang digunakan semua programmer.

```ts
type Role = 'student' | 'assistant';
type SessionStatus = 'not_open' | 'open' | 'closed';
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type AiStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

type AppErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION_ERROR'
  | 'NOT_FOUND' | 'PROFILE_INCOMPLETE' | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE' | 'CONFLICT' | 'CLASS_ARCHIVED'
  | 'SESSION_ARCHIVED' | 'SESSION_NOT_OPEN' | 'SESSION_CLOSED'
  | 'NOT_ENROLLED' | 'ALREADY_CHECKED_IN' | 'ALREADY_SUBMITTED'
  | 'PARTICIPATION_CONFLICT' | 'ALREADY_REVIEWED'
  | 'AI_TIMEOUT' | 'AI_UNAVAILABLE' | 'AI_INVALID_RESPONSE';

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; retryable: boolean } };

type AsyncState<T> = {
  data: T;
  status: 'loading' | 'ready' | 'error';
  error: { code: AppErrorCode; retryable: boolean } | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
};
```

### Interface service yang harus disediakan

`RecordRef` pada tabel adalah `{ sessionId: string; studentId: string }`. `Unsubscribe` adalah fungsi pelepas listener. Input form tidak boleh menerima UID aktor/pemilik sebagai sumber otorisasi.

| Modul/pemilik | Operasi yang disepakati |
|---|---|
| Auth — Maulana | `register(input)`, `login(input)`, `logout()`, `observeIdentity(onChange, onError)`; mutasi mengembalikan Promise Result; observer memberi fase initializing/signedOut/profileIncomplete/ready. |
| Kelas — Jordan | `createClass(input)`, `updateClass(classId, input)`, `archiveClass(classId)`, `subscribeClasses(scope, onChange, onError)` |
| Peserta — Jordan | `upsertMembership({ classId, studentId, isActive })`, `subscribeMembers(classId, onChange, onError)`; upsert melalui backend agar profil disalin tanpa membuka direktori pengguna. |
| Sesi — Jordan | `createSession(input)`, `updateSession(sessionId, input)`, `archiveSession(sessionId)`, `openSession(sessionId)`, `closeSession(sessionId)`, `subscribeSessions(classId, onChange, onError)`, `subscribeSession(sessionId, onChange, onError)` |
| Presensi — Hanif | `checkIn(sessionId): Promise<Result<RecordRef>>`, `subscribeAttendance(sessionId, onChange, onError)`, `subscribeMyHistory(onChange, onError)` |
| Izin — Izzatu | `submitLeave({ sessionId, reason }): Promise<Result<RecordRef>>`, `subscribeMyLeaves(onChange, onError)`, `requestClassification(ref): Promise<Result<{ aiStatus: AiStatus }>>` |
| Pemeriksaan — Hanif | `subscribeLeaveQueue(filters, onChange, onError)`, `subscribeParticipation(ref, onChange, onError)`, `reviewLeave({ sessionId, studentId, decision, reviewNote }): Promise<Result<RecordRef>>` |

Semua mutasi lain juga mengembalikan `Promise<Result<...>>`; semua subscribe mengembalikan `Unsubscribe`. Tipe input/output lengkap ditulis pada milestone fondasi, mengikuti schema bagian 7; jangan memakai `any`. `decision` hanya `approved | rejected`.

API Sprint 1 yang sinkron (`checkIn`, `openSession`, `closeSession`) **berubah menjadi async**. Pemanggil harus `await`, mengelola loading/error, dan menunggu acknowledgment server. `selectUser()`/`switchRole()` tidak tersedia pada alur produksi. PM mencatat perubahan kontrak ini pada handoff ke tim.

### Aturan transaksi

- **Check-in:** baca sesi, kelas, membership, dan dokumen partisipasi dalam transaksi; validasi status/keanggotaan; buat record hanya jika belum ada. Rules mengulang validasi penting. Jangan mengandalkan `hasCheckedIn()` di UI atau ID berbasis `Date.now()`.
- **Submit izin:** pola transaksi yang sama, tetapi sesi boleh `not_open` atau `open`, `kind = leave`, dan status awal sesuai kontrak. Simpan dahulu; AI dipanggil sesudah commit, tidak di dalam callback transaksi.
- **Buka/tutup:** transaksi memeriksa status terkini dan pemilik; persaingan close/check-in harus dievaluasi ulang. Presensi yang commit sebelum penutupan sah; yang terjadi setelah status tertutup ditolak.
- **Review izin:** transaksi memeriksa `kind = leave`, pemilik kelas, dan `status = pending`; hanya field review/status/update time yang berubah. Review kedua menerima `ALREADY_REVIEWED` dan memuat keputusan terbaru.
- **Record sudah ada setelah timeout:** baca record server; tampilkan hasil yang sudah tercatat atau konflik, jangan membuat path baru.
- **Callback transaksi bebas efek samping:** tidak memunculkan modal, memanggil AI, atau mengubah state UI di dalamnya karena callback dapat dijalankan ulang. Transaksi klien gagal saat offline. [Dokumentasi transaksi](https://firebase.google.com/docs/firestore/manage-data/transactions).

Snapshot Firestore menjadi sumber state data. Jangan menambah record lokal permanen setelah mutasi sekaligus menambahnya lagi ketika listener datang. Listener memakai ID dokumen untuk identitas, memperhatikan pending write/cache, menangani error, dan dilepas ketika UID, kelas, sesi, atau layar berubah. [Dokumentasi listener realtime](https://firebase.google.com/docs/firestore/query-data/listen).

## 9. Kontrak integrasi AI dan fallback

### Alur normal

1. Praktikan mengonfirmasi alasan → `submitLeave` commit ke Firestore.
2. UI menyatakan **“Pengajuan tersimpan. Klasifikasi AI sedang diproses.”**
3. Klien meminta `requestClassification({ sessionId, studentId })` ke backend, bukan mengirim secret atau keputusan izin.
4. Backend memverifikasi Auth, pemohon/pemilik kelas, jenis record, dan status klasifikasi; membaca alasan dari Firestore.
5. Backend mengklaim proses melalui transaksi (`requestId`, `startedAt`, `attemptCount`, status `processing`), lalu memanggil API pengajar di luar transaksi.
6. Adapter memvalidasi respons dan menyimpan hanya field AI serta `updatedAt`; listener memperbarui kedua peran.
7. Hanif menampilkan hasil AI dan tombol keputusan asisten; keputusan tidak bergantung pada berhasil/gagalnya AI.

Callable Functions menyertakan token Auth yang tersedia dan memvalidasinya, tetapi handler tetap wajib menolak pemanggil tanpa login serta memeriksa hak atas record. [Dokumentasi callable Firebase](https://firebase.google.com/docs/functions/callable).

### Timeout, retry, dan keamanan respons

- Usulan timeout panggilan API: **15 detik**, disesuaikan dengan batas pengajar. Payload bukan JSON, field hilang, atau kategori tidak sesuai kontrak dipetakan menjadi `AI_INVALID_RESPONSE`.
- Gangguan AI mengubah `ai.status` menjadi `failed`, bukan `status` keputusan. Pesan: **“Pengajuan tetap tersimpan. Klasifikasi AI belum tersedia; asisten tetap dapat memeriksa.”**
- Jika aplikasi ditutup setelah submit sebelum panggilan AI, record tetap `pending`. Halaman detail menyediakan “Coba klasifikasi” bagi pemohon/asisten terkait setelah dibuka kembali.
- Usulan cooldown retry 30 detik dan batas 3 percobaan per pengajuan. Setelah batas tercapai, pemeriksaan manual tetap tersedia. Batas final mengikuti kuota pengajar.
- `processing` lebih dari 60 detik dianggap lease kedaluwarsa dan dapat diklaim ulang. Hanya hasil dengan `requestId` yang masih aktif boleh disimpan; hasil request lama diabaikan.
- AI yang selesai setelah asisten memutuskan izin hanya memperbarui field AI. Jangan menggunakan overwrite seluruh dokumen yang dapat menghapus keputusan.
- Kategori dan confidence tidak boleh direkayasa ketika API tidak memberikannya. Jika API tidak memberi confidence/model version, simpan null.
- Simpan data terstruktur yang diperlukan, bukan seluruh raw response, token, atau stack trace. Jangan log alasan izin secara bebas karena dapat berisi informasi pribadi.
- API key pengajar/service-account credential hanya di backend/secret manager, bukan `EXPO_PUBLIC_*`, source mobile, atau repo.

### Informasi yang harus diperoleh dari pengajar

PM mengumpulkan: base URL/endpoint, metode HTTP, autentikasi, request/response contoh, daftar kategori, bentuk confidence, batas panjang input, kuota/rate limit, timeout, dan aturan penggunaan data. Izzatu menulis pemetaan aktual di `docs/ai-api-contract.md` pada implementasi. Nama endpoint/payload pengajar **tidak diada-adakan** oleh agreement ini.

Mock adapter boleh digunakan untuk UI, sukses/gagal/timeout testing. Acceptance integrasi AI tetap memerlukan minimal satu request berhasil ke model pengajar dengan hasil tersimpan; mock tidak menggantikan bukti tersebut.

## 10. Matriks akses dan Security Rules

| Resource/operasi | Belum login | Praktikan | Asisten | Backend tepercaya |
|---|---|---|---|---|
| Profil | Ditolak | Baca milik sendiri; buat profil awal sendiri | Baca milik sendiri | Provisioning role dan pembacaan terbatas untuk enrolment |
| Kelas | Ditolak | Baca kelas dengan membership; nonaktif hanya konteks riwayat | CRUD/arsip kelas milik sendiri | Operasi administratif terkontrol |
| Membership | Ditolak | Baca milik sendiri | Baca peserta kelas sendiri; mutasi lewat backend | Verifikasi pemilik, akun student, salin profil, upsert |
| Sesi | Ditolak | Baca sesi kelas yang diikuti/riwayat | CRUD dan transisi sesi kelas sendiri | Tidak diperlukan untuk alur standar |
| Presensi | Ditolak | Create milik sendiri jika memenuhi aturan; baca sendiri | Baca sesi milik sendiri; tidak mengubah bukti hadir | Pemeliharaan di luar alur aplikasi |
| Izin | Ditolak | Create dan baca sendiri; tidak mengubah keputusan/alasan setelah submit | Baca serta review izin kelas sendiri | Hanya pembaruan AI sesuai otorisasi |
| Field AI | Ditolak | Hanya baca dalam record sendiri | Hanya baca dalam record kelas sendiri | Mengubah field AI setelah memverifikasi pemanggil dan respons |

Ketentuan implementasi rules:

1. Default-deny untuk path/operasi yang tidak didaftarkan. `request.auth != null` saja tidak cukup.
2. UID path/record harus cocok dengan aktor untuk create student; role dibaca dari profil tepercaya. Registrasi profil hanya mengizinkan role student, tidak menerima promosi dari klien.
3. Validasi whitelist field, tipe, enum, panjang teks, waktu, relasi kelas/sesi, kepemilikan, dan membership; hindari celah penambahan field rahasia/status palsu.
4. Pemilik kelas dan relasi identitas immutable. `assistantId` yang disalin ke session/membership/participation harus berasal dari kelas/sesi kanonik, bukan input penyerang.
5. Presensi create-only, ID dokumen sama dengan UID praktikan, waktu audit sama dengan `request.time` melalui server timestamp; update/delete klien ditolak.
6. Izin create dengan status pending dan AI awal persis kontrak. Klien tidak boleh mengubah alasan, identitas, `kind`, atau field AI sesudah submit. Asisten hanya mengubah status/review fields dan `updatedAt`, dengan transisi final sekali.
7. Baca partisipasi hanya pemilik record atau pemilik sesi/kelas. Praktikan tidak dapat mengunduh daftar seluruh peserta atau alasan izin orang lain.
8. Keanggotaan nonaktif tidak boleh membuat partisipasi baru, tetapi bukti historis pemilik record tetap terbaca. Arsip tidak menghapus akses pemeriksaan riwayat yang sah.
9. Server/Admin SDK tidak dibatasi Security Rules seperti klien; semua endpoint backend mengulang cek token, role, resource ownership, input, dan field yang boleh ditulis. [Kondisi Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
10. Pengujian menembakkan request langsung ke emulator, bukan hanya menekan tombol UI. Rules test mencakup allow dan deny per role serta transisi data. [Panduan uji rules](https://firebase.google.com/docs/rules/unit-tests).

## 11. Navigasi dan kondisi antarmuka

Usulan route minimal; route group tidak membuat hak akses secara otomatis, sehingga guard dan rules tetap diperlukan.

```text
src/app/
  _layout.tsx
  index.tsx                         # redirect berdasarkan status Auth
  (auth)/
    _layout.tsx
    login.tsx
    register.tsx
  (student)/
    _layout.tsx
    schedule.tsx
    history.tsx
    leaves/index.tsx
    leaves/[sessionId].tsx
    sessions/[sessionId].tsx
    sessions/[sessionId]/leave.tsx
  (assistant)/
    _layout.tsx
    classes/index.tsx
    classes/new.tsx
    classes/[classId]/index.tsx
    classes/[classId]/edit.tsx
    classes/[classId]/members.tsx
    classes/[classId]/sessions/new.tsx
    sessions/[sessionId]/index.tsx
    sessions/[sessionId]/edit.tsx
    leave-review/index.tsx
    leave-review/[sessionId]/[studentId].tsx
  account.tsx                       # nama, role, UID untuk dibagikan, logout
```

Route file memasang screen/komponen fitur; service, types, dan hooks berada di luar `src/app/`. Detail membaca ID menggunakan Expo Router, bukan objek navigation palsu. Karena kedua group memiliki detail sesi, link internal harus menyebut group tujuan secara eksplisit; deep link eksternal diselesaikan berdasarkan role dan diuji agar tidak membuka screen group yang salah. Nama route dan penggunaan group dikunci Izzatu bersama Maulana sebelum anggota menambahkan link; perubahan route fitur dikoordinasikan dengan pemiliknya. [Panduan Expo Router](https://docs.expo.dev/router/introduction/).

| Kondisi | Perilaku wajib |
|---|---|
| Auth/profile sedang diperiksa | Loading, jangan menampilkan data atau menu role sebelumnya |
| Belum login | Login/registrasi; deep link dilindungi |
| Profil belum lengkap | Halaman pemulihan profil; jangan menganggap registrasi ulang diperlukan |
| Permintaan asisten belum aktif | Informasi menunggu aktivasi; tidak ada hak asisten |
| Data dimuat | Loading/skeleton; bedakan dari daftar kosong |
| Daftar kosong | Pesan sesuai konteks, CTA tambah hanya untuk pemilik yang berhak |
| Koneksi terganggu | Tanda belum tersinkron, retry; jangan mengklaim data cache pasti terbaru |
| Mutasi berjalan | Tombol nonaktif dan indikator; sukses hanya setelah konfirmasi server |
| AI gagal | Izin tetap tampil, status klasifikasi terpisah, retry jika tersedia |
| Akses ditolak/data tidak ditemukan | Pesan aman dan jalan kembali; jangan render data lama |

Label status: `not_open` → “Belum dibuka”, `open` → “Dibuka”, `closed` → “Ditutup”; izin `pending` → “Menunggu pemeriksaan”, `approved` → “Diterima”, `rejected` → “Ditolak”. AI `pending/processing/succeeded/failed` tidak menggunakan label keputusan izin.

Gunakan tema bersama, safe area, form yang tetap terlihat saat keyboard terbuka, daftar yang dapat di-scroll, dan konfirmasi aksi penting. Hindari nested daftar virtual dalam ScrollView searah pada rekap. Tampilkan error yang dapat ditindaklanjuti, tanpa error SDK mentah.

## 12. Cara kerja Git, handoff, dan integrasi

Branch usulan:

| Anggota | Branch fitur |
|---|---|
| Maulana | `feat/s2-auth-foundation` |
| Jordan | `feat/s2-practicum-management` |
| Hanif | `feat/s2-attendance-review` |
| Izzatu | `feat/s2-leave-ai` |

- `main` harus dapat dibangun; perubahan masuk melalui PR dan minimal satu reviewer. Bagi pekerjaan menjadi PR kecil per kelompok SRS, jangan menunggu satu branch besar selesai seluruhnya.
- Commit berbahasa Inggris, misalnya `feat(attendance): persist unique session check-in`.
- Deskripsi PR mencantumkan SRS, perilaku sebelum/sesudah, query/index/rules terdampak, pengujian, dan langkah demo. Sertakan kontrak berubah jika ada.
- Update branch dari `main` sebelum integrasi. Jangan membuat perubahan skema/status secara sepihak; koordinasikan dengan pemilik producer dan consumer, serta catat keputusan PM.
- Perubahan dependency/config dilakukan Maulana setelah kebutuhan disampaikan; commit lockfile yang sesuai. Jangan commit credential, `.env` berisi secret, service-account JSON, atau `node_modules`.
- Pemilik fitur menyerahkan types/service, contoh data, query/index, aturan akses, empty/error states, dan bukti uji. “UI sudah tampil” belum cukup untuk handoff.
- Stub/mock ditandai eksplisit dan tidak boleh menjadi fallback diam-diam ketika Firebase gagal.

Urutan integrasi: fondasi kontrak/Auth/rules → kelas/peserta/sesi → presensi/rekap → pengajuan + API AI + review → pengujian dua perangkat dan perbaikan. UI masing-masing tetap dapat dikerjakan bersamaan setelah kontrak awal tersedia.

## 13. Milestone dan pekerjaan PM

Tanggal serta kapasitas belum diberikan; gunakan milestone berikut sebagai urutan, bukan janji tenggat atau estimasi velocity.

| Milestone | Exit criteria | Koordinasi Hasta |
|---|---|---|
| M0 — Kickoff dan kontrak | API pengajar diminta; keputusan bagian 5, schema, role provisioning, host backend, file owner dan route disepakati | Konfirmasi rubrik CRUD/delete, waktu sprint, kuota/akses layanan, dan estimasi tim |
| M1 — Fondasi siap | Login dua role, shared types/service, rules awal, baseline lint/typecheck selesai; semua anggota dapat menjalankan proyek | Pastikan tidak ada anggota terblokir konfigurasi/akun |
| M2 — Data praktikum | Asisten mengelola kelas/peserta/sesi; praktikan melihat jadwal yang benar | Review CRUD dan pemisahan akses sebelum fitur transaksi |
| M3 — Alur presensi | Dua perangkat menjalankan buka → hadir → rekap realtime → tutup; data bertahan setelah restart | Acceptance alur pertama; triase bug konflik/duplikasi |
| M4 — Alur izin | Submit → API pengajar → review → status realtime, termasuk fallback AI gagal | Acceptance alur kedua; cek AI tidak membuat keputusan |
| M5 — Release candidate | Rules test, skenario negatif, lint/typecheck dan build lulus; dokumentasi dan bukti demo lengkap | Putuskan siap demo berdasarkan bukti, bukan persentase coding |

Board minimum: `Backlog → Ready → In Progress → Review → QA → Done`, dengan label `Blocked` dan penyebabnya. Setiap kartu berisi ID SRS, owner, reviewer, acceptance criteria, dependensi, estimasi tim, PR, dan bukti uji.

PM memantau SRS yang lulus acceptance, blocker, defect kritis, dan kesiapan dua alur demo. Daily singkat membahas hasil kemarin, target berikutnya, dan hambatan. Perubahan scope dicatat bersama dampak waktu/dependensi; jangan menambah fitur tanpa mengurangi atau menata ulang kapasitas.

## 14. Acceptance test dan skenario demo

### Data uji minimum

- Dua akun asisten (A dan B), dua praktikan peserta (P1/P2), satu praktikan bukan peserta (P3).
- Dua kelas dengan pemilik berbeda; P1/P2 hanya menjadi peserta kelas A.
- Sesi terpisah untuk demo presensi dan demo izin, agar aturan satu partisipasi tidak berbenturan.
- Minimal dua perangkat/emulator/browser session yang login bersamaan. Berpindah role dalam satu aplikasi saja tidak membuktikan sinkronisasi multiuser.

### Daftar uji yang harus dicatat

| Uji | Langkah inti | Hasil yang diharapkan | SRS |
|---|---|---|---|
| AT-01 | Registrasi valid, duplikat, password tidak valid; simulasi profil gagal dibuat | Akun valid tersimpan, error jelas, profil dapat dipulihkan tanpa akun kedua | 01–03, 08 |
| AT-02 | Login, restart, logout, login akun lain, deep link role berbeda | Sesi dipulihkan, state lama bersih, akses terlarang ditolak | 04–07, 09, 40 |
| AT-03 | Buat/baca/edit/arsip kelas; tambah/nonaktifkan/aktifkan peserta | Perubahan persisten, duplikasi dicegah, peserta nonaktif tidak dapat membuat aktivitas | 11–15 |
| AT-04 | Buat/edit/arsip sesi; buka/tutup; coba buka ulang | Metadata valid, transisi ilegal ditolak, riwayat dipertahankan | 16–20 |
| AT-05 | Asisten A membuka sesi; P1 hadir dari perangkat kedua | Satu record tersimpan; rekap A berubah tanpa reload; setelah restart tetap ada | 09, 21, 24–26, 29 |
| AT-06 | Dua perangkat P1 check-in bersamaan; lalu asisten menutup saat check-in lain berlangsung | Maksimal satu record P1; transaksi menentukan hasil sah; tidak ada hadir setelah sesi tertutup | 22–23 |
| AT-07 | P3 mencoba hadir; student mencoba buka sesi; B mencoba mengubah kelas A langsung melalui SDK | Ditolak rules/backend, bukan hanya tombol tersembunyi | 10, 22 |
| AT-08 | P2 mengajukan izin sesi lain; dua submit bersamaan; mencoba hadir setelah izin | Satu record izin; konflik partisipasi ditolak; alasan kosong/terlalu panjang ditolak | 31–32 |
| AT-09 | Panggil model pengajar dengan alasan valid | Kategori tersimpan dan tampil; status keputusan tetap pending | 34–35, 38 |
| AT-10 | AI timeout, respons rusak, jaringan putus, aplikasi ditutup sebelum panggilan AI | Pengajuan tidak hilang; fallback jelas; retry aman tanpa duplikasi | 33, 36–37, 39 |
| AT-11 | Asisten menerima izin; pada izin lain menolak dengan catatan | Identitas/waktu pemeriksa tersimpan; praktikan melihat status realtime; izin bukan hadir | 25, 27–29, 33 |
| AT-12 | Dua perangkat asisten memutuskan izin bersamaan; AI lama selesai belakangan | Hanya keputusan pertama sah; AI tidak menimpa keputusan | 28, 37–38 |
| AT-13 | Student mengubah role, UID, status izin, field AI, atau membaca alasan orang lain langsung | Semua operasi ilegal ditolak; mutation backend juga menolak pemanggil tak berhak | 03, 10 |
| AT-14 | Loading, daftar kosong, offline, error listener, keluar/masuk layar berulang | UI dapat pulih, tidak ada sukses palsu/duplikasi listener atau data akun lama | 29, 39–40 |
| AT-15 | Tutup semua aplikasi lalu buka/login ulang | Data kelas, sesi, presensi, izin, klasifikasi dan keputusan yang sudah commit tetap tersedia | 09, 30 |

Target uji tim untuk realtime: pada koneksi stabil, perubahan tampil dalam **maksimal 5 detik** tanpa refresh manual. Ini target pengujian aplikasi, bukan jaminan SLA Firebase; catat kondisi jaringan jika gagal. Tes konkurensi memakai dua client aktif, bukan hanya klik dua kali secara berurutan.

### Definition of Done per SRS

- [ ] Acceptance criteria SRS terpenuhi dengan Firebase nyata atau emulator sesuai jenis uji.
- [ ] Tidak bergantung pada dummy untuk alur produksi.
- [ ] Validasi, loading, empty, error, serta retry yang relevan tersedia.
- [ ] Query, index, rules, dan otorisasi backend konsisten; uji allow/deny lulus.
- [ ] Kontrak shared dan consumer terkait telah diperbarui tanpa merusak integrasi.
- [ ] PR direview, lint/typecheck lulus, hasil uji dicatat dengan akun/perangkat/skenario.
- [ ] PM menerima bukti hasil terhadap acceptance criteria.

### Definition of Done sprint

- [ ] Semua S2-SRS-01 sampai S2-SRS-40 telah diterima atau kekurangannya dinyatakan eksplisit; jangan menyebut sprint lengkap bila kebutuhan wajib belum terpenuhi.
- [ ] Kedua demo utama berjalan lintas pengguna/perangkat, dengan Firebase dan API pengajar.
- [ ] Uji keamanan dan konflik transaksi lulus; tidak ada eskalasi role, kebocoran lintas kelas, atau duplikasi presensi.
- [ ] Tidak ada keputusan izin otomatis dari AI.
- [ ] README setup, environment example, rules/index, langkah provisioning asisten, dan kontrak AI tersedia.
- [ ] Build demo dapat dipasang/dijalankan; Maulana mencatat akun proyek dan langkah build, tanpa menyertakan password akun pada dokumen publik.

Perintah pemeriksaan proyek (setelah fondasi dependency/config siap):

```bash
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

Tambahkan script test rules/integrasi ketika implementasi tersedia dan jalankan di Emulator Suite. Jangan menganggap TypeScript lulus sebagai bukti rules aman atau demo realtime berhasil. Jika lint belum dikonfigurasi, Maulana mengerjakan setup pada PR fondasi, bukan membiarkan instalasi otomatis tersembunyi pada PR fitur.

## 15. Risiko, dependensi, dan keputusan terbuka

| Item | Dampak | Pemilik tindak lanjut | Tindakan |
|---|---|---|---|
| Endpoint/credential/skema AI belum diberikan | Adapter belum bisa diverifikasi terhadap model pengajar | Hasta + Izzatu | Dapatkan kontrak dan satu request contoh; UI/error flow dapat dikerjakan dengan mock sementara |
| Host backend/billing/izin deploy belum dikonfirmasi | Proxy AI dan enrolment tidak bisa dirilis | Hasta + Maulana | Pastikan fasilitas dan akun sebelum mengunci milestone implementasi backend |
| Aktivasi role asisten | Role bebas akan membuka akses tanpa kewenangan | Hasta + Maulana | Konfirmasi mekanisme provisioning; siapkan dua akun asisten untuk pengujian |
| Definisi delete pada rubrik | Soft delete mungkin perlu penjelasan kepada pengajar | Hasta | Konfirmasi arsip memenuhi CRUD; sesuaikan kontrak sebelum coding bila harus hard delete |
| Kebijakan izin final/tidak bisa dibatalkan | Memengaruhi UX dan interaksi izin-presensi | Hasta + Hanif + Izzatu | Konfirmasi keputusan bagian 5, termasuk batas waktu dan catatan penolakan |
| Schema/query berbeda antar programmer | Integrasi macet atau query ditolak rules | Maulana + semua programmer | Kunci kontrak awal dan review perubahan lintas modul |
| Beban AI/review tidak merata | Satu fitur menjadi bottleneck sprint | Hasta | Estimasi bersama; pisahkan adapter, UI, review dan QA dalam kartu kecil |
| Deadline/kapasitas belum ada | Tidak dapat menentukan tanggal merge realistis | Hasta | Isi durasi sprint, jam kerja tersedia, dan tanggal demo saat kickoff |

Checklist keputusan kickoff:

- [ ] Empat programmer menerima pembagian dan reviewer.
- [ ] Durasi, kapasitas, tanggal demo, serta tenggat integrasi diisi.
- [ ] Kebijakan bisnis bagian 5 disepakati, termasuk zona waktu kampus.
- [ ] Proyek Firebase, pemegang akun EAS, dan pemegang akses backend ditetapkan.
- [ ] Cara aktivasi asisten dan penambahan peserta disepakati.
- [ ] Kontrak API pengajar diperoleh atau blocker tercatat dengan target penyelesaian.
- [ ] Tipe shared, path Firestore, interface service, route, dan rules matrix dikunci untuk mulai coding.

### Catatan validasi saat dokumen dibuat

- Penomoran 40 SRS diperiksa: lengkap, unik, dan berurutan; seluruh kebutuhan pengajar mempunyai pemetaan.
- `npx tsc --noEmit` dijalankan ulang: masih gagal pada tiga error baseline (`/explore`, tipe callback `SessionCard`, dan parameter callback implicit `any`).
- `npx expo lint` dicoba: belum dapat berjalan karena konfigurasi ESLint belum tersedia; tawaran instalasi/config otomatis ditolak agar pekerjaan dokumentasi ini tidak mengubah dependency aplikasi.
- Tidak ada implementasi fitur, perubahan source aplikasi, atau deployment dalam pekerjaan penyusunan agreement ini. Status pemeriksaan di atas bukan kelulusan Sprint 2.

## 16. Template tugas programmer

> Saya **[nama]**, programmer LabCheckIn Sprint 2. Saya mengerjakan **[ID S2-SRS]**, dengan file utama **[daftar file]**. Acuan saya adalah agreement Sprint 2 dan kondisi repository saat ini. Implementasikan acceptance criteria memakai Firebase Auth sebagai identitas, Firestore sebagai data utama, serta Expo Router. Ikuti kontrak schema/service, rules, dan state async yang disepakati. Sertakan validasi, loading/empty/error, pengujian keamanan dan konkurensi yang relevan. Laporkan perubahan kontrak/dependency/file bersama sebelum mengintegrasikannya. Jangan menganggap mock AI sebagai integrasi selesai atau memberi keputusan izin otomatis dari klasifikasi.

Template ini untuk pelaksanaan tugas yang ditugaskan PM; isi dokumen bukan izin melakukan deployment, menghubungi anggota, atau mengubah sistem eksternal tanpa penugasan terkait.

## 17. Referensi teknis

Referensi resmi diperiksa pada penyusunan dokumen. Implementasi tetap perlu memeriksa API sesuai versi package yang akhirnya terpasang.

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) dan [indeks dokumentasi Expo](https://docs.expo.dev/llms.txt).
- [Firebase dengan Expo](https://docs.expo.dev/guides/using-firebase/).
- [Firebase Authentication](https://firebase.google.com/docs/auth/web/start).
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen).
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) dan [keamanan query](https://firebase.google.com/docs/firestore/security/rules-query).
- [Pengujian Security Rules](https://firebase.google.com/docs/rules/unit-tests).
- [Firebase callable functions](https://firebase.google.com/docs/functions/callable) dan [persiapan deployment](https://firebase.google.com/docs/functions/get-started).

---

**Dokumen ini menyusun pekerjaan Sprint 2; belum merupakan implementasi fitur atau bukti lulus pengujian aplikasi.**
