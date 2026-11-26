# Sprint 3 — User Story, Pembagian Kerja & Daftar SRS

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 3 |
| **Tema** | Location-Based Attendance (QR Code + GPS), Maps Laboratorium, dan Push Notification |
| **Project Manager** | Hanif Ihsanul Huda |
| **Rentang SRS** | `S3-SRS-01` – `S3-SRS-36` (36 SRS) |
| **Status** | ✅ Selesai (Arsip Historis) |

---

## 1. Deskripsi & Kebutuhan Sprint

Pada Sprint 3, aplikasi dilengkapi dengan validasi keberadaan fisik praktikan menggunakan **QR Code (masa berlaku 15 menit)** dan **geolocation/GPS radius laboratorium**, **Peta Interaktif Laboratorium** lengkap dengan informasi aktivitas praktikum yang sedang berlangsung maupun berikutnya, serta **Push Notification (FCM)** untuk peristiwa penting.

### Kebutuhan Fungsional Utama
1. **Halaman Presensi Terpisah:** Halaman khusus untuk melihat info sesi dan melakukan presensi (dengan pemindaian QR Code).
2. **Validasi Lokasi Presensi:** Memeriksa koordinat perangkat terhadap radius laboratorium sebagai bagian sah dari pencatatan presensi.
3. **Pengelolaan Lokasi Laboratorium:** Menyimpan identitas titik geotag (A, B, C, D), koordinat, dan radius presensi di Cloud Firestore.
4. **Peta Laboratorium Interaktif:** Menampilkan marker laboratorium dan posisi perangkat pengguna secara *real-time*.
5. **Informasi Aktivitas Laboratorium:** Menampilkan praktikum yang sedang berlangsung dan praktikum berikutnya per laboratorium dari Firestore.
6. **Push Notification:** Memberi notifikasi saat sesi dibuka, jadwal diubah, izin disetujui, dan izin ditolak.
7. **Penanganan Izin & Kondisi Perangkat:** Meminta izin kamera/lokasi/notifikasi serta menangani penolakan izin, GPS mati, lokasi gagal diperoleh, dan gangguan jaringan.

---

## 2. Ringkasan Pembagian Kerja

| Porsi | Programmer | Rentang SRS | Fokus Utama |
| :---: | :--- | :--- | :--- |
| **1** | **Maulana Ghazzam Adil Al Faiq** | `S3-SRS-01` – `S3-SRS-10` | QR Code, presensi berbasis lokasi, validasi kehadiran, & penyimpanan presensi |
| **2** | **Hasta Putra Wildantara** | `S3-SRS-11` – `S3-SRS-20` | Pengelolaan titik geotag laboratorium, peta interaktif, & informasi aktivitas praktikum |
| **3** | **Jordan Tenggara** | `S3-SRS-21` – `S3-SRS-28` | Registrasi perangkat, pengelolaan token, & push notification menggunakan FCM |
| **4** | **Izzatu Khairul Fata** | `S3-SRS-29` – `S3-SRS-36` | Pengelolaan permission perangkat, penanganan kegagalan, & pemulihan proses presensi |

---

## 3. Daftar Lengkap SRS & User Story

### Porsi 1 — Maulana Ghazzam Adil Al Faiq (`S3-SRS-01` – `S3-SRS-10`)

| Kode SRS | User Story |
| :--- | :--- |
| `S3-SRS-01` | Sebagai asisten, saya ingin menampilkan QR Code khusus untuk sesi praktikum yang sedang dibuka agar praktikan dapat melakukan presensi melalui pemindaian QR Code. |
| `S3-SRS-02` | Sebagai sistem, saya ingin menghasilkan QR Code yang memuat identitas sesi dan token validasi agar setiap QR Code terhubung dengan sesi praktikum yang sesuai. |
| `S3-SRS-03` | Sebagai sistem, saya ingin menentukan masa berlaku QR Code agar QR Code yang sudah kedaluwarsa tidak dapat digunakan untuk melakukan presensi. |
| `S3-SRS-04` | Sebagai praktikan, saya ingin mengakses halaman presensi yang terpisah dari halaman detail sesi, melihat informasi dan status sesi, serta memindai QR Code menggunakan kamera perangkat agar dapat melakukan presensi pada sesi praktikum yang sesuai. |
| `S3-SRS-05` | Sebagai sistem, saya ingin memvalidasi keaslian QR Code dan kecocokan identitas sesi agar QR Code yang tidak valid atau berasal dari sesi lain ditolak. |
| `S3-SRS-06` | Sebagai sistem, saya ingin memastikan sesi praktikum masih terbuka dan praktikan terdaftar pada kelas terkait agar presensi hanya dapat dilakukan oleh pengguna yang berhak. |
| `S3-SRS-07` | Sebagai sistem, saya ingin memeriksa koordinat perangkat praktikan terhadap titik geotag dan radius laboratorium yang berlaku serta menampilkan hasil pemeriksaan lokasi agar presensi hanya dapat dilakukan dari lokasi yang diizinkan dan praktikan mengetahui hasil validasinya. |
| `S3-SRS-08` | Sebagai sistem, saya ingin menolak presensi apabila validasi QR Code, status sesi, keanggotaan kelas, atau lokasi tidak terpenuhi agar data kehadiran tetap valid. |
| `S3-SRS-09` | Sebagai sistem, saya ingin mencegah presensi ganda pada sesi yang sama meskipun praktikan menggunakan perangkat berbeda agar satu praktikan hanya memiliki satu catatan kehadiran pada sesi tersebut. |
| `S3-SRS-10` | Sebagai praktikan, saya ingin melihat hasil presensi yang berhasil disimpan di Cloud Firestore beserta waktu dan statusnya agar mengetahui bahwa kehadiran telah tercatat dan tercermin pada rekap kehadiran asisten. |

### Porsi 2 — Hasta Putra Wildantara (`S3-SRS-11` – `S3-SRS-20`)

| Kode SRS | User Story |
| :--- | :--- |
| `S3-SRS-11` | Sebagai asisten, saya ingin memilih titik laboratorium yang digunakan untuk sesi praktikum agar lokasi presensi sesuai dengan tempat pelaksanaan kegiatan. |
| `S3-SRS-12` | Sebagai asisten, saya ingin mengatur koordinat latitude dan longitude setiap titik geotag agar sistem memiliki referensi lokasi laboratorium yang tepat. |
| `S3-SRS-13` | Sebagai asisten, saya ingin mengatur radius presensi pada setiap titik geotag agar batas jarak yang diperbolehkan dapat disesuaikan dengan ketentuan laboratorium. |
| `S3-SRS-14` | Sebagai sistem, saya ingin mendukung empat identitas titik geotag sementara (A, B, C, dan D) agar setiap lokasi dapat dikelola dan digunakan sebagai referensi validasi presensi. |
| `S3-SRS-15` | Sebagai sistem, saya ingin menyimpan dan mengambil informasi titik geotag beserta nama, koordinat, dan radiusnya melalui Cloud Firestore agar data lokasi konsisten bagi seluruh pengguna. |
| `S3-SRS-16` | Sebagai pengguna, saya ingin melihat peta interaktif yang menampilkan marker empat titik geotag laboratorium agar dapat mengetahui persebaran lokasi laboratorium di lingkungan Informatika. |
| `S3-SRS-17` | Sebagai pengguna, saya ingin melihat posisi perangkat saya pada peta dan memperoleh pembaruan posisi selama halaman Maps digunakan agar dapat mengetahui lokasi saya terhadap laboratorium. |
| `S3-SRS-18` | Sebagai pengguna, saya ingin memilih marker pada peta untuk melihat nama, identitas, koordinat, dan informasi laboratorium agar dapat mengenali lokasi yang dipilih. |
| `S3-SRS-19` | Sebagai praktikan, saya ingin melihat informasi praktikum yang sedang berlangsung pada setiap titik lokasi (nama praktikum, kelas, waktu pelaksanaan, status sesi) agar mengetahui aktivitas saat ini. |
| `S3-SRS-20` | Sebagai praktikan, saya ingin melihat informasi praktikum berikutnya pada setiap titik lokasi dan memperoleh pembaruan ketika jadwal atau status sesi berubah agar mengetahui kegiatan berikutnya. |

### Porsi 3 — Jordan Tenggara (`S3-SRS-21` – `S3-SRS-28`)

| Kode SRS | User Story |
| :--- | :--- |
| `S3-SRS-21` | Sebagai pengguna, saya ingin perangkat saya terdaftar pada Firebase Cloud Messaging (FCM) agar dapat menerima push notification dari aplikasi. |
| `S3-SRS-22` | Sebagai sistem, saya ingin menyimpan, memperbarui, dan mengelola token FCM berdasarkan identitas akun serta perangkat agar notifikasi dapat dikirim ke perangkat yang benar. |
| `S3-SRS-23` | Sebagai praktikan, saya ingin menerima notifikasi ketika sesi praktikum dibuka oleh asisten agar mengetahui bahwa periode presensi telah dimulai. |
| `S3-SRS-24` | Sebagai praktikan, saya ingin menerima notifikasi ketika jadwal praktikum yang saya ikuti mengalami perubahan agar mengetahui informasi jadwal terbaru. |
| `S3-SRS-25` | Sebagai praktikan, saya ingin menerima notifikasi ketika pengajuan izin saya disetujui oleh asisten agar mengetahui hasil pemeriksaan pengajuan izin. |
| `S3-SRS-26` | Sebagai praktikan, saya ingin menerima notifikasi ketika pengajuan izin saya ditolak oleh asisten agar mengetahui hasil pemeriksaan pengajuan izin. |
| `S3-SRS-27` | Sebagai sistem, saya ingin menentukan penerima notifikasi berdasarkan kelas, sesi, jadwal, atau identitas pemohon agar notifikasi hanya dikirim kepada pengguna yang relevan. |
| `S3-SRS-28` | Sebagai sistem, saya ingin menangani respons pengiriman FCM dan token perangkat yang tidak valid agar kegagalan pengiriman tertangani tanpa mengganggu proses utama aplikasi. |

### Porsi 4 — Izzatu Khairul Fata (`S3-SRS-29` – `S3-SRS-36`)

| Kode SRS | User Story |
| :--- | :--- |
| `S3-SRS-29` | Sebagai pengguna, saya ingin aplikasi meminta izin penggunaan kamera ketika akan memindai QR Code agar fitur pemindaian dapat digunakan sesuai persetujuan saya. |
| `S3-SRS-30` | Sebagai pengguna, saya ingin aplikasi meminta izin akses lokasi ketika akan melakukan presensi atau menggunakan peta agar sistem dapat memperoleh koordinat perangkat. |
| `S3-SRS-31` | Sebagai pengguna, saya ingin aplikasi meminta izin notifikasi agar perangkat dapat menerima push notification sesuai persetujuan saya. |
| `S3-SRS-32` | Sebagai pengguna, saya ingin memperoleh informasi dan arahan ketika izin kamera, lokasi, atau notifikasi ditolak agar mengetahui fitur yang terdampak dan cara mengaktifkan izinnya. |
| `S3-SRS-33` | Sebagai pengguna, saya ingin memperoleh pemberitahuan ketika GPS atau layanan lokasi perangkat tidak aktif agar dapat mengaktifkannya sebelum melanjutkan proses. |
| `S3-SRS-34` | Sebagai pengguna, saya ingin memperoleh informasi ketika koordinat lokasi gagal diperoleh, layanan lokasi mengalami gangguan, atau pemindaian QR gagal agar dapat mencoba kembali tanpa mencatat presensi tidak valid. |
| `S3-SRS-35` | Sebagai pengguna, saya ingin memperoleh informasi ketika terjadi gangguan jaringan atau layanan aplikasi agar mengetahui proses belum berhasil dan dapat mencoba kembali setelah koneksi tersedia. |
| `S3-SRS-36` | Sebagai pengguna, saya ingin aplikasi menampilkan kondisi loading, data kosong, dan kegagalan pemuatan informasi secara jelas agar memahami kondisi aplikasi serta tindakan pemulihannya. |

---

## 4. Alur Demo & Deliverable Utama

1. **Alur 1 — Presensi Berbasis Lokasi & QR:** Asisten membuka sesi dan menampilkan QR → Praktikan membuka halaman presensi dan memindai QR → Sistem memvalidasi QR, sesi, keanggotaan, dan radius lokasi → Presensi tersimpan dan tampil pada rekap asisten.
2. **Alur 2 — Peta & Informasi Laboratorium:** Pengguna membuka Maps → Posisi pengguna & marker lab tampil → Pengguna memilih marker → Informasi praktikum berjalan & berikutnya tampil dari Firestore.
3. **Alur 3 — Push Notification:** Asisten membuka sesi, mengubah jadwal, atau memutuskan izin → Sistem mengirim push notification ke penerima yang relevan → Pengguna menerima pemberitahuan.
