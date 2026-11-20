# LabCheckIn --- Dokumen Kesepakatan Tim Sprint 3

**Tema:** Location-Based Attendance, Maps, and Push Notification\
**Project Manager:** Hanif Ihsanul Huda\
**Anggota:** Maulana Ghazzam Adil Al Faiq, Hasta Putra Wildantara,
Jordan Tenggara, Izzatu Khoirul Fata\
**Sprint:** 3\
**Status dokumen:** Pedoman kerja awal untuk implementasi Sprint 3.
Keputusan yang masih menunggu data resmi atau hasil pemeriksaan
repository ditandai secara eksplisit.

------------------------------------------------------------------------

## Tujuan dokumen

Dokumen ini menjadi acuan kerja bersama untuk seluruh anggota dan AI
agent yang membantu implementasi. Tujuannya agar setiap anggota memahami
ruang lingkup, tanggung jawab, aturan integrasi, keputusan teknis, dan
cara melaporkan kendala tanpa saling mengubah pekerjaan.

Dokumen ini digunakan bersama dokumen pembagian **36 SRS Sprint 3** yang
telah dibagikan PM. Jika terdapat perbedaan penulisan atau detail,
dokumen SRS yang dibagikan PM menjadi acuan kebutuhan fitur; Agreement
ini mengatur cara implementasi dan koordinasinya.

**Penting:** Agreement ini bukan bukti bahwa konfigurasi atau fitur
sudah tersedia di repository/Firebase. Setiap anggota wajib memeriksa
kondisi aktual sebelum menganggap sesuatu sudah terpasang atau berjalan.

## 1. Sprint goal dan batas cakupan

**Sprint goal:** menambahkan presensi berbasis QR Code dan validasi
lokasi, pengelolaan serta tampilan lokasi laboratorium pada Maps,
informasi aktivitas praktikum per lokasi, dan push notification untuk
peristiwa penting.

Alur utama yang harus dapat didemokan:

1.  Asisten membuka sesi praktikum dan menampilkan QR Code.
2.  Praktikan membuka halaman presensi, memindai QR, lalu sistem
    memvalidasi QR, sesi, keanggotaan kelas, dan lokasi perangkat.
3.  Jika seluruh validasi lolos, presensi disimpan dan hasilnya terlihat
    pada rekap asisten yang sudah ada.
4.  Pengguna membuka Maps, melihat titik laboratorium dan posisi
    perangkat, memilih marker, serta melihat informasi praktikum yang
    sedang/akan berlangsung.
5.  Pengguna terkait menerima push notification untuk peristiwa Sprint 3
    yang ditentukan.

Semua 36 SRS pada dokumen pembagian merupakan cakupan Sprint 3. Jangan
mengurangi kebutuhan wajib hanya karena implementasi teknis memiliki
dependensi.

**Di luar cakupan kecuali ada instruksi baru:** membuat ulang
autentikasi, membangun ulang seluruh fitur Sprint 2, mengganti Firebase
Project, membuat sistem chat, atau menambahkan fitur yang tidak
tercantum pada SRS.

## 2. Titik awal dari Sprint 2 dan pemeriksaan awal

Sprint 3 melanjutkan aplikasi LabCheckIn yang sudah memiliki pekerjaan
Sprint 2. Karena itu:

-   Gunakan Firebase Project Sprint 2 yang sudah ditentukan tim:
    `labcheckin-58c73`.
-   File `LabCheckIn_Firebase_Team.txt` dari Sprint 2 tetap menjadi
    referensi konfigurasi Firebase client yang sudah dibagikan.
-   Jangan membuat Firebase Project baru tanpa persetujuan PM.
-   Jangan menganggap FCM, Google Maps, QR scanner, geolocation, Cloud
    Functions, atau Security Rules yang dibutuhkan Sprint 3 sudah
    dikonfigurasi hanya karena Firebase sudah digunakan.
-   Jangan menganggap struktur Firestore atau kode Sprint 2 sama dengan
    rancangan di dokumen ini. Periksa repository dan Firebase yang
    benar-benar digunakan terlebih dahulu.

Setiap anggota memulai dengan pemeriksaan **read-only** pada bagian yang
berkaitan dengan pekerjaannya: struktur folder dan route,
package/dependency, konfigurasi, service, tipe data, koleksi Firestore,
Security Rules, dan alur Sprint 2 yang akan disentuh.

Hasil pemeriksaan dicatat singkat: 1. Hal yang sudah tersedia dan
lokasinya. 2. Hal yang belum tersedia. 3. File atau konfigurasi yang
kemungkinan perlu diubah. 4. Risiko konflik atau dampak ke fitur Sprint
2. 5. Kebutuhan akses, API key, project setting, atau keputusan PM.

Pemeriksaan ini dapat dilakukan paralel. Anggota tidak perlu menunggu PM
memeriksa semua hal terlebih dahulu. Jika konfigurasi belum tersedia,
laporkan kebutuhan dan lanjutkan bagian yang tidak bergantung padanya
menggunakan mock/stub sementara yang diberi label jelas. Mock tidak
boleh dianggap sebagai integrasi selesai dan tidak boleh menjadi
fallback diam-diam saat layanan nyata gagal.

## 3. Pembagian tanggung jawab dan kepemilikan pekerjaan

Pembagian SRS tetap seperti dokumen yang sudah dibagikan. Nomor SRS dan
penanggung jawab tidak diubah oleh Agreement ini.

  -----------------------------------------------------------------------
  Anggota                 Tanggung jawab SRS      Fokus pekerjaan
  ----------------------- ----------------------- -----------------------
  **Maulana Ghazzam Adil  S3-SRS-01--10           QR Code, presensi
  Al Faiq**                                       berbasis lokasi,
                                                  validasi kehadiran,
                                                  penyimpanan presensi

  **Hasta Putra           S3-SRS-11--20           Geotag, pengelolaan
  Wildantara**                                    titik lokasi, Maps,
                                                  informasi aktivitas lab

  **Jordan Tenggara**     S3-SRS-21--28           Firebase Cloud
                                                  Messaging, token
                                                  perangkat, push
                                                  notification

  **Izzatu Khoirul Fata** S3-SRS-29--36           Permission dan
                                                  penanganan kegagalan
                                                  lintas fitur
  -----------------------------------------------------------------------

### Tanggung jawab lintas fitur

-   Maulana dan Hasta menyepakati kontrak data lokasi yang dipakai
    bersama oleh Maps dan validasi presensi.
-   Maulana dan Jordan menyepakati kebutuhan data/event yang diperlukan
    untuk alur presensi dan notifikasi jika ada keterkaitan.
-   Jordan bertanggung jawab memeriksa kebutuhan serta konfigurasi FCM;
    PM mengoordinasikan perubahan konfigurasi bersama.
-   Hasta bertanggung jawab memeriksa kebutuhan serta konfigurasi
    Maps/geolocation; PM mengoordinasikan perubahan konfigurasi bersama.
-   Maulana memeriksa struktur Firestore dan kebutuhan Security Rules
    yang berkaitan dengan presensi, berkoordinasi dengan Hasta untuk
    data lokasi, serta meminta persetujuan PM sebelum perubahan
    berdampak luas.
-   Izzatu menyepakati pola pesan error, loading, empty, permission
    denied, dan retry dengan pemilik fitur terkait.
-   Setiap pemilik SRS bertanggung jawab atas implementasi, validasi,
    pengujian, dan bukti acceptance untuk SRS miliknya.
-   PM mengoordinasikan keputusan lintas fitur, prioritas, integrasi,
    dan penerimaan hasil. PM tidak otomatis mengambil alih implementasi
    teknis anggota lain.

### Kepemilikan file

Jangan menetapkan atau mengasumsikan path file baru sebelum memeriksa
repository aktual. Pada awal pekerjaan, setiap anggota mencatat file
yang akan dibuat/diubah dan mengabarkan file bersama yang berpotensi
disentuh.

File konfigurasi bersama, dependency/lockfile, inisialisasi Firebase,
tipe/service global, route/layout bersama, Firestore Rules, dan
konfigurasi build tidak boleh diubah sepihak. Jika dua anggota perlu
menyentuh file yang sama, sepakati satu pemilik perubahan utama dan cara
integrasinya terlebih dahulu.

## 4. Acuan SRS dan acceptance criteria

Dokumen pembagian 36 SRS yang dibagikan PM adalah daftar kebutuhan dan
pembagian resmi Sprint 3. Setiap anggota wajib membaca seluruh SRS
miliknya beserta acceptance criteria, bukan hanya judul SRS.

Pemetaan cakupan:

  -----------------------------------------------------------------------
  Rentang SRS                         Cakupan
  ----------------------------------- -----------------------------------
  S3-SRS-01--10                       QR, validasi sesi/kelas/lokasi,
                                      pencegahan presensi ganda,
                                      penyimpanan dan rekap

  S3-SRS-11--20                       Pengelolaan geotag, empat titik,
                                      Maps, posisi pengguna, aktivitas
                                      lab

  S3-SRS-21--28                       Registrasi token FCM, target
                                      penerima, pengiriman dan penanganan
                                      token

  S3-SRS-29--36                       Permission kamera/lokasi/notifikasi
                                      serta loading, empty, error dan
                                      retry
  -----------------------------------------------------------------------

SRS lintas fitur dikerjakan bersama pemilik modul terkait, tetapi satu
orang tetap menjadi penanggung jawab utama sesuai pembagian. Jika
acceptance criteria belum dapat diuji karena data resmi atau konfigurasi
belum tersedia, catat sebagai blocked/dependency; jangan menyatakan Done
berdasarkan tampilan UI saja.

## 5. Keputusan bisnis dan teknis Sprint 3

Bagian ini membedakan keputusan yang sudah ditetapkan tim dari detail
yang masih menunggu pemeriksaan atau informasi resmi.

### 5.1 QR Code dan masa berlaku

Keputusan tim:

1.  QR Code digunakan untuk alur presensi praktikan.
2.  QR hanya dapat diterbitkan untuk sesi yang statusnya `open`.
3.  Setiap QR berlaku **15 menit sejak diterbitkan**, dihitung
    berdasarkan waktu tepercaya/server, bukan jam perangkat pengguna.
4.  Setelah QR kedaluwarsa, asisten dapat membuka/menerbitkan QR baru
    selama sesi masih `open`.
5.  QR yang sudah kedaluwarsa tidak dapat dipakai untuk presensi.
6.  Ketika sesi berubah menjadi `closed`, QR tidak dapat diterbitkan
    lagi dan QR yang sebelumnya diterbitkan tidak dapat digunakan,
    meskipun masa 15 menitnya belum habis.
7.  QR harus terikat pada sesi yang benar dan tidak boleh dapat dipakai
    untuk sesi lain.
8.  Pemindaian QR saja tidak cukup untuk menyatakan presensi berhasil.
    Validasi sesi, kelas/keanggotaan, lokasi, dan pencegahan presensi
    ganda tetap wajib.

Aturan teknis yang harus dipenuhi: - QR memuat token/identitas validasi
yang tidak mudah ditebak; jangan menaruh data pribadi atau secret di
dalam QR. - Sistem memvalidasi token, sesi, masa berlaku, dan status
sesi terhadap sumber data tepercaya. - Jangan hanya mengandalkan timer
atau validasi di UI/perangkat. - Penanganan QR kedaluwarsa, QR tidak
valid, QR sesi lain, kamera gagal, dan sesi sudah ditutup harus jelas. -
Detail apakah penerbitan QR baru langsung membatalkan QR sebelumnya
perlu ditetapkan dalam kontrak implementasi. Default yang disarankan:
hanya satu QR aktif untuk satu sesi; penerbitan QR baru menggantikan
token aktif sebelumnya.

### 5.2 Lokasi A, B, C, D

-   Sistem menyiapkan dukungan untuk empat identitas titik geotag
    sementara: A, B, C, dan D.
-   **Nama resmi, koordinat, dan radius setiap titik belum ditetapkan
    dalam dokumen ini.**
-   Penanggung jawab Hasta menunggu informasi resmi dari asisten
    praktikum.
-   Jangan mengarang, menebak, atau menggunakan koordinat/radius contoh
    sebagai data produksi.
-   Selama menunggu, implementasi struktur, UI placeholder, dan
    pengujian menggunakan fixture/mock yang diberi label sementara
    diperbolehkan.
-   Setelah data resmi diterima, Hasta mencatat sumber dan nilai yang
    diberikan, lalu mengabarkan Maulana karena data lokasi dipakai juga
    oleh validasi presensi.

### 5.3 Validasi lokasi presensi

-   Presensi hanya diterima jika lokasi perangkat berada di dalam radius
    titik yang berlaku untuk sesi tersebut.
-   Lokasi yang dipakai harus berasal dari pembacaan perangkat saat
    proses presensi, bukan lokasi statis yang diketik pengguna.
-   Jika lokasi tidak tersedia, permission ditolak, layanan lokasi mati,
    akurasi tidak memadai, atau perangkat berada di luar radius, sistem
    menolak presensi dan menampilkan alasan yang dapat dipahami.
-   Nilai radius dan koordinat harus berasal dari data lokasi yang
    disepakati, bukan hardcode berbeda pada tiap fitur.
-   Validasi tidak boleh hanya berupa pemeriksaan UI. Mekanisme
    tepercaya untuk memverifikasi token, status sesi, dan pencatatan
    presensi harus ditinjau bersama sebelum implementasi final. Jika
    kemampuan backend/Cloud Functions belum tersedia, laporkan sebagai
    kebutuhan/risiko kepada PM; jangan diam-diam mengganti validasi
    server dengan klaim keamanan dari klien.

### 5.4 Firebase, FCM, dan Google Maps

-   Firebase Project yang digunakan tetap project Sprint 2
    `labcheckin-58c73`.
-   Firestore tetap menjadi sumber data utama untuk data yang disimpan
    pada Sprint 3.
-   Push notification menggunakan **Firebase Cloud Messaging (FCM)**
    sesuai arahan dosen.
-   Google Maps/geolocation membutuhkan konfigurasi dan dependency yang
    sesuai dengan platform serta versi Expo/React Native di repository
    aktual.
-   Firebase client `apiKey` pada file konfigurasi lama **bukan otomatis
    Google Maps API key**. Jangan menyalin atau menganggapnya sebagai
    konfigurasi Maps.
-   Jordan memeriksa FCM; Hasta memeriksa Maps/geolocation. Pemeriksaan
    dapat paralel dan read-only.
-   Jika ada API key atau konfigurasi baru, gunakan mekanisme
    environment/config yang sesuai, batasi key sesuai layanan/platform,
    dan jangan memasukkan secret ke repository.
-   Periksa kompatibilitas package/API dengan versi proyek sebelum
    memasang atau mengubah dependency.
-   Perubahan `package.json`, lockfile, app config, native config,
    Firebase config, atau project setting harus dikoordinasikan dan
    disetujui PM sebelum diterapkan.

### 5.5 Firestore dan Security Rules

-   Periksa koleksi, dokumen, field, query, index, dan Rules yang sudah
    digunakan Sprint 2 sebelum mengusulkan perubahan.
-   Jangan membuat duplikasi koleksi atau mengganti nama field yang
    sudah dipakai fitur lama tanpa koordinasi.
-   Data yang dibutuhkan Sprint 3 dapat mencakup lokasi/geotag, QR
    aktif/masa berlaku, presensi, dan token perangkat FCM. Nama koleksi,
    bentuk dokumen, dan field final ditetapkan setelah pemeriksaan
    schema aktual.
-   Maulana mengoordinasikan rancangan perubahan Firestore/Rules untuk
    presensi; Hasta menjadi rekan koordinasi untuk data geotag; Jordan
    untuk kebutuhan token FCM.
-   Rules harus membatasi akses berdasarkan autentikasi, role,
    kepemilikan, kelas/sesi, dan field yang boleh diubah.
-   Jangan menganggap menyembunyikan tombol di UI sebagai keamanan.
-   Perubahan Rules/schema yang berdampak pada Sprint 2 harus direview
    dan disetujui PM serta pemilik fitur yang terdampak.
-   Uji operasi yang diizinkan dan ditolak, bukan hanya alur normal.

## 6. Arsitektur dan teknologi

Gunakan stack dan pola yang sudah ada di repository. Jangan mengganti
framework, Firebase project, router, atau pola arsitektur hanya karena
preferensi pribadi/AI agent.

Komponen teknologi yang dibutuhkan: - Firebase Authentication yang sudah
digunakan Sprint 2 untuk identitas pengguna. - Cloud Firestore sebagai
sumber data persisten. - Firebase Cloud Messaging untuk push
notification. - Google Maps untuk peta dan marker lokasi. - Layanan
geolocation perangkat untuk memperoleh posisi pengguna. - Pemindaian QR
melalui kamera/perangkat. - Backend tepercaya bila dibutuhkan untuk
penerbitan/validasi token QR, validasi status sesi, dan pencatatan
presensi yang tidak boleh dimanipulasi klien.

Sebelum memilih atau memasang library, periksa dependency yang sudah
ada, versi SDK, dokumentasi resmi yang cocok dengan versi proyek, serta
konsekuensi native/development build. Jangan memasang beberapa library
dengan fungsi yang sama.

## 7. Kontrak data dan Firestore

Kontrak data final ditetapkan setelah inspeksi repository dan Firestore.
Agreement ini tidak mengunci nama koleksi atau field yang belum
diperiksa.

Minimal data/relasi yang harus dapat direpresentasikan: - Titik
laboratorium: identitas A--D, nama resmi, koordinat, radius, dan status
aktif jika dibutuhkan. - Sesi praktikum: identitas sesi, kelas,
pemilik/asisten, status sesi, dan relasi ke lokasi. - QR sesi: sesi
terkait, token/identitas validasi, waktu terbit, waktu kedaluwarsa,
serta status valid/tidak berlaku. - Presensi: praktikan, sesi, kelas,
waktu server, status, dan informasi validasi yang diperlukan untuk
audit. - Token perangkat: UID pemilik, token FCM, informasi perangkat
seperlunya, dan waktu pembaruan. - Jadwal/aktivitas lab: relasi lokasi,
kelas/praktikum, waktu, dan status sesi.

Aturan: 1. Gunakan ID dokumen stabil; jangan membuat identitas record
berdasarkan `Date.now()` saja. 2. Gunakan timestamp server untuk waktu
audit dan masa berlaku yang menentukan validitas. 3. Hindari menyimpan
data yang sama pada banyak tempat jika dapat dirujuk secara konsisten.
4. Query harus sesuai dengan Security Rules dan index yang dibutuhkan.
5. Sertakan contoh dokumen dan tipe data dalam handoff. 6. Perubahan
schema harus diberitahukan kepada semua producer/consumer yang terdampak
sebelum digabung.

## 8. Kontrak operasi presensi

Alur presensi minimal:

1.  Praktikan login dan membuka halaman presensi yang terpisah dari
    halaman detail sesi.
2.  Aplikasi meminta akses kamera/lokasi sesuai kebutuhan dan
    menampilkan informasi sesi.
3.  Praktikan memindai QR.
4.  Sistem memvalidasi token QR, masa berlaku 15 menit, kecocokan sesi,
    dan status sesi `open`.
5.  Sistem memvalidasi bahwa praktikan merupakan anggota kelas yang
    relevan dan belum memiliki record presensi untuk sesi tersebut.
6.  Sistem memperoleh lokasi perangkat dan membandingkannya dengan
    koordinat/radius lokasi yang terhubung ke sesi.
7.  Hanya jika seluruh validasi lolos, sistem menyimpan satu record
    presensi.
8.  UI menyatakan berhasil hanya setelah mendapat konfirmasi penyimpanan
    yang tepercaya.
9.  Rekap asisten yang sudah ada menampilkan record baru melalui
    mekanisme data yang digunakan proyek.

Kondisi penolakan: - QR tidak valid, kedaluwarsa, atau untuk sesi
lain. - Sesi belum dibuka atau sudah ditutup. - Praktikan tidak
terdaftar pada kelas/sesi. - Lokasi di luar radius atau tidak dapat
diverifikasi. - Presensi untuk sesi yang sama sudah tercatat. -
Permintaan gagal karena jaringan/backend.

Pencegahan duplikasi harus berlaku lintas tap dan lintas perangkat.
Jangan mengandalkan tombol disabled atau pemeriksaan lokal saja. Operasi
tulis harus dirancang agar dua permintaan bersamaan tidak membuat dua
record.

## 9. Kontrak event dan notifikasi

Peristiwa notifikasi Sprint 3: - Sesi praktikum dibuka. - Jadwal
praktikum berubah. - Pengajuan izin praktikan disetujui. - Pengajuan
izin praktikan ditolak.

Ketentuan: - Notifikasi dikirim hanya kepada pengguna yang relevan
berdasarkan kelas, sesi, jadwal, atau pengajuan izin. - Token FCM
dikelola berdasarkan akun/perangkat dan diperbarui ketika berubah. -
Token tidak valid/expired ditangani dan dibersihkan sesuai respons
layanan. - Hindari mengirim data pribadi atau informasi sensitif
berlebihan di payload notifikasi. - Aplikasi tetap harus menampilkan
data terbaru dari Firestore; notifikasi bukan sumber kebenaran data. -
Pengiriman notifikasi tidak boleh membuat perubahan data utama gagal
atau menyebabkan keputusan izin/presensi berubah. - Tentukan payload
minimum, identitas event, penerima, dan navigasi tujuan bersama sebelum
integrasi. - Uji foreground, background, aplikasi tertutup, permission
ditolak, token invalid, serta kondisi jaringan yang relevan.

Jordan menjadi penanggung jawab utama FCM. Pemilik fitur yang
menghasilkan peristiwa (sesi/jadwal/izin) wajib berkoordinasi dengan
Jordan mengenai kapan event dianggap sah dan siapa penerimanya.

## 10. Keamanan dan akses

Prinsip minimum: - Pengguna harus terautentikasi untuk melakukan operasi
yang memerlukan identitas. - Role dan kepemilikan sumber daya harus
diverifikasi; jangan menerima role/UID/owner dari input klien sebagai
bukti otorisasi. - Praktikan hanya dapat mengakses data yang menjadi
haknya. - Asisten hanya dapat mengelola sesi/lokasi dan melihat data
kelas yang menjadi tanggung jawabnya. - Token QR tidak boleh mudah
ditebak, tidak memuat secret, dan tidak dapat dipakai setelah
kedaluwarsa atau sesi ditutup. - Praktikan tidak dapat menulis presensi
yang melewati validasi QR, sesi, kelas, dan lokasi. - Token FCM hanya
dapat dikelola untuk akun/perangkat yang sesuai. - Jangan menyimpan
service-account key, private key, credential admin, atau secret di
aplikasi klien maupun repository. - Jangan mengubah Rules menjadi
terbuka untuk memudahkan demo. - Uji akses langsung ke Firestore/backend
sesuai kemampuan test proyek, bukan hanya melalui UI.

Maulana mengoordinasikan pemeriksaan Rules bersama PM. Setiap pemilik
fitur tetap bertanggung jawab melaporkan akses yang dibutuhkan dan
menguji akses yang seharusnya ditolak.

## 11. Navigasi dan UI

-   Ikuti struktur navigasi dan pola UI yang sudah ada.
-   Halaman presensi harus terpisah dari detail sesi sesuai SRS.
-   Halaman Maps menampilkan marker titik laboratorium dan posisi
    pengguna saat halaman aktif, sesuai izin yang diberikan.
-   Memilih marker menampilkan informasi lokasi dan aktivitas praktikum
    yang relevan.
-   Tampilkan status sesi dengan label yang konsisten.
-   Minta permission pada konteks yang jelas dan jelaskan alasan
    penggunaan kamera/lokasi/notifikasi.
-   Sediakan loading, empty, error, permission denied, layanan lokasi
    mati, QR gagal dipindai, dan retry yang sesuai.
-   Jangan menampilkan error SDK mentah, API key, token, atau informasi
    sensitif.
-   Jangan mengubah route/layout bersama tanpa koordinasi dengan
    pemiliknya dan PM.

## 12. Cara kerja Git, handoff, dan integrasi

### Branch dan perubahan

-   Setiap anggota bekerja pada branch fitur masing-masing, bukan
    langsung pada branch utama.
-   Gunakan branch dengan nama yang jelas, misalnya
    `feat/s3-qr-attendance`, `feat/s3-lab-map`,
    `feat/s3-push-notification`, dan `feat/s3-permission-errors`.
    Sesuaikan dengan aturan repository yang berlaku.
-   Jangan mengerjakan fitur Sprint 3 langsung di `main`.
-   Jangan melakukan force push, reset, rebase destruktif, atau
    menghapus pekerjaan anggota lain.
-   Jangan memakai `git add .` secara otomatis. Periksa daftar perubahan
    dan stage hanya file yang memang menjadi bagian pekerjaan.
-   Jangan commit `.env` berisi secret, service-account JSON,
    credential, `node_modules`, build output, atau file lokal pribadi.
-   Perubahan dependency/config/shared files harus dikoordinasikan
    sebelum dilakukan.

### Pull request dan merge

-   Buat PR kecil berdasarkan kelompok SRS agar mudah direview.
-   Deskripsi PR harus mencantumkan SRS yang dikerjakan, ringkasan
    perubahan, file yang disentuh, kontrak/schema/rules/config yang
    berubah, hasil pengujian, dan langkah demo.
-   Minta reviewer yang memahami modul terkait.
-   Sebelum merge, sinkronkan branch dengan branch dasar sesuai prosedur
    tim dan periksa perubahan yang masuk.
-   **PM mengoordinasikan merge dan membantu penyelesaian konflik,
    tetapi penyelesaian konflik bukan sekadar memilih "ours/theirs".**
    Pemilik file/f fitur wajib membantu memeriksa konflik dan memastikan
    hasil gabungan tidak menghilangkan perilaku atau perubahan milik
    anggota lain.
-   Konflik semantik dapat terjadi meskipun Git tidak menampilkan
    conflict marker, misalnya dua anggota memakai nama field, status,
    atau kontrak berbeda. Karena itu, kontrak harus dibicarakan sebelum
    merge.
-   Setelah merge, jalankan pemeriksaan integrasi yang disepakati.
    Jangan menganggap merge berhasil berarti fitur sudah benar.

### Handoff wajib dari setiap anggota

-   Daftar SRS yang selesai/belum selesai.
-   Daftar file yang dibuat/diubah.
-   Kontrak type/service dan contoh data.
-   Perubahan Firestore schema, query/index, Security Rules, dependency,
    atau konfigurasi.
-   Pengujian yang dijalankan dan hasilnya.
-   Cara menjalankan/demo fitur.
-   Known issues, mock/stub, dan blocker yang masih ada.

## 13. Milestone dan pekerjaan PM

Tanggal/deadline belum ditetapkan dalam dokumen ini. Gunakan milestone
sebagai urutan kerja, bukan janji tanggal.

  -----------------------------------------------------------------------
  Milestone               Hasil yang diharapkan   Peran PM
  ----------------------- ----------------------- -----------------------
  M1 --- Pemeriksaan awal Semua anggota memahami  Mengumpulkan hasil
                          repository,             pemeriksaan dan blocker
                          konfigurasi, file       
                          terkait, dan dependency 

  M2 --- Kontrak          Kontrak lokasi, QR,     Menyatukan keputusan
  integrasi               presensi, token, event  lintas anggota
                          notifikasi, dan         
                          perubahan schema        
                          disepakati              

  M3 --- Implementasi     Tiap anggota            Memantau progres dan
  paralel                 mengerjakan SRS         mencegah konflik
                          masing-masing; bagian   
                          independen tidak        
                          menunggu konfigurasi    
                          yang belum tersedia     

  M4 --- Integrasi        QR + lokasi +           Mengatur urutan merge
                          presensi + Maps +       dan review
                          aktivitas lab + FCM     
                          terhubung               

  M5 --- Pengujian lintas Skenario normal, gagal, Memimpin acceptance dan
  fitur                   permission, keamanan,   pencatatan bug
                          dan multi-perangkat     
                          diuji                   

  M6 --- Demo/release     Tiga alur demo berjalan Memastikan kesiapan
  candidate               dan bukti tersedia      demo berdasarkan hasil
                                                  uji
  -----------------------------------------------------------------------

Board kerja yang disarankan:
`Backlog → Ready → In Progress → Review → QA → Done`, dengan label
`Blocked` dan alasan blocker. Setiap kartu berisi SRS, owner, reviewer,
acceptance criteria, dependency, PR, dan bukti uji.

### Tugas PM

-   Membagikan SRS dan Agreement ini kepada anggota.
-   Memastikan setiap anggota melakukan pemeriksaan awal dan melaporkan
    hasilnya.
-   Mengambil keputusan atas perubahan lintas fitur/config/schema
    setelah mendengar pemilik terkait.
-   Menjaga agar pekerjaan Sprint 2 tidak rusak oleh perubahan Sprint 3.
-   Mengatur reviewer, urutan merge, integrasi, dan acceptance.
-   Mencatat keputusan baru agar semua anggota dan AI agent memakai
    acuan yang sama.

## 14. Acceptance test dan demo

Tiga alur demo wajib:

### A. Presensi QR + lokasi

-   Asisten membuka sesi dan menampilkan QR.
-   Praktikan memindai QR yang masih berlaku.
-   Sistem memvalidasi sesi, kelas, lokasi, dan duplikasi.
-   Presensi berhasil disimpan dan terlihat pada rekap asisten.
-   Tunjukkan penolakan untuk QR kedaluwarsa, sesi ditutup, lokasi di
    luar radius, atau presensi ganda.

### B. Maps + aktivitas laboratorium

-   Peta menampilkan titik A, B, C, D setelah data resmi tersedia.
-   Posisi pengguna tampil sesuai permission dan diperbarui ketika
    halaman Maps aktif.
-   Memilih marker menampilkan informasi lab.
-   Informasi praktikum saat ini dan berikutnya sesuai data Firestore.

### C. Push notification

-   Tunjukkan notifikasi untuk peristiwa yang termasuk cakupan.
-   Buktikan penerima yang benar memperoleh notifikasi.
-   Buktikan perubahan data tetap dapat dilihat dari aplikasi/Firestore,
    bukan hanya dari isi notifikasi.

### Skenario negatif dan pengujian minimum

  -----------------------------------------------------------------------
  Skenario                            Hasil yang diharapkan
  ----------------------------------- -----------------------------------
  QR lebih dari 15 menit              Ditolak sebagai kedaluwarsa

  QR baru diterbitkan saat sesi masih QR baru dapat dipakai sesuai masa
  terbuka                             berlakunya

  Sesi ditutup                        QR tidak dapat
                                      diterbitkan/digunakan

  QR untuk sesi lain/tidak valid      Ditolak

  Lokasi di luar radius               Presensi ditolak dengan penjelasan

  Lokasi tidak tersedia atau          Tidak ada presensi; pengguna
  permission ditolak                  mendapat petunjuk

  Praktikan bukan anggota kelas       Presensi ditolak

  Presensi dikirim dua kali/dua       Maksimal satu record
  perangkat                           

  Jaringan gagal saat presensi        Tidak ada sukses palsu; retry aman

  Maps permission ditolak             Peta/lokasi menampilkan keadaan
                                      yang sesuai dan tidak crash

  Token FCM invalid                   Ditangani tanpa merusak data utama

  Notifikasi untuk pengguna lain      Tidak boleh terkirim ke pengguna
                                      yang tidak relevan

  Loading/empty/error                 Ada tampilan dan tindakan pemulihan
                                      yang jelas
  -----------------------------------------------------------------------

Catat perangkat, akun/role uji, sesi/lokasi yang digunakan, langkah,
hasil aktual, hasil yang diharapkan, dan bukti. Jangan memakai data
lokasi contoh sebagai bukti bahwa empat lokasi resmi sudah selesai.

### Definition of Done

Satu SRS dapat dinyatakan Done jika: - Acceptance criteria SRS
terpenuhi. - Tidak hanya berupa UI/mock; integrasi nyata tersedia untuk
bagian yang memang membutuhkan backend. - Validasi dan akses diuji pada
jalur normal serta jalur penolakan. - Loading, empty, error, dan retry
yang relevan tersedia. - Tidak merusak alur Sprint 2. - Perubahan
file/config/schema didokumentasikan. - Bukti pengujian dan demo
diserahkan kepada PM.

Sprint dinyatakan siap demo setelah tiga alur utama terintegrasi,
pengujian negatif penting lulus, dan blocker yang tersisa dinyatakan
secara terbuka.

## 15. Risiko, dependensi, dan keputusan terbuka

  -----------------------------------------------------------------------------
  Item                    Dampak            Penanggung jawab  Tindakan
                                            tindak lanjut     
  ----------------------- ----------------- ----------------- -----------------
  Nama/koordinat/radius   Validasi lokasi   Hasta             Menunggu data
  A--D belum diberikan    dan data peta                       resmi asisten
                          belum bisa                          praktikum;
                          memakai data                        gunakan fixture
                          final                               sementara yang
                                                              jelas

  Konfigurasi FCM belum   Push notification Jordan            Periksa project,
  diverifikasi            belum dapat diuji                   platform, token,
                          end-to-end                          permission, dan
                                                              kebutuhan
                                                              backend; laporkan
                                                              blocker

  Konfigurasi Maps belum  Peta belum dapat  Hasta             Periksa API key,
  diverifikasi            diuji pada                          restriction,
                          perangkat target                    billing jika
                                                              relevan, package,
                                                              dan
                                                              kompatibilitas
                                                              platform

  Schema/Rules Sprint 2   Risiko merusak    Maulana + PM      Audit read-only,
  belum diperiksa         fitur lama atau                     usulkan perubahan
                          membuat query                       kecil, review
                          ditolak                             dengan pemilik
                                                              terdampak

  Backend tepercaya untuk Validasi klien    Maulana + PM      Periksa kemampuan
  QR/presensi belum       saja berisiko                       backend yang
  dipastikan              dimanipulasi                        tersedia dan
                                                              laporkan
                                                              kebutuhan sebelum
                                                              mengunci
                                                              implementasi

  File bersama disentuh   Konflik Git atau  Semua pemilik     Tentukan pemilik
  beberapa anggota        konflik kontrak   terkait; PM       perubahan utama
                                            koordinasi        dan kontrak
                                                              sebelum edit

  Versi library tidak     Build gagal atau  Pemilik fitur     Periksa versi
  cocok dengan proyek     perlu native      terkait           proyek dan
                          rebuild                             dokumentasi
                                                              sebelum memasang
                                                              dependency

  Data/event notifikasi   Penerima atau isi Jordan + pemilik  Sepakati event,
  tidak konsisten         notifikasi salah  event             payload,
                                                              penerima, dan
                                                              waktu pengiriman
  -----------------------------------------------------------------------------

## 16. Template instruksi untuk AI agent programmer

Salin template ini dan isi bagian dalam tanda kurung sebelum meminta AI
agent bekerja:

> Saya adalah **\[nama anggota\]**, programmer LabCheckIn Sprint 3.
> Tanggung jawab saya adalah **\[rentang S3-SRS\]** sesuai dokumen
> pembagian SRS dan `LabCheckIn_Team_Agreement_Sprint_3.md`.
>
> Sebelum mengubah apa pun, periksa repository aktual, struktur file,
> dependency, konfigurasi, pola implementasi, dan fitur Sprint 2 yang
> terkait. Jangan mengasumsikan file, collection, field, package, atau
> konfigurasi sudah ada jika belum diperiksa.
>
> Kerjakan hanya SRS yang menjadi tanggung jawab saya. Jangan mengambil
> alih SRS anggota lain. Jika perlu menyentuh file bersama, dependency,
> route/layout bersama, Firebase config, Firestore schema/Rules, atau
> file yang dimiliki anggota lain, jelaskan alasan dan dampaknya
> terlebih dahulu lalu minta koordinasi/approval PM.
>
> Jangan membuat Firebase Project baru. Gunakan project Sprint 2 yang
> telah ditentukan tim. Jangan menaruh secret, service-account key, atau
> credential dalam source code/repository. Jangan mengganti stack atau
> memasang dependency sebelum memeriksa kompatibilitas versi proyek.
>
> Lakukan pemeriksaan awal secara read-only. Laporkan file yang akan
> diubah, dependensi, kontrak data, risiko konflik, dan kebutuhan
> konfigurasi. Jika ada konfigurasi yang belum tersedia, kerjakan bagian
> independen dengan mock/stub yang diberi label jelas dan laporkan
> blocker; jangan mengklaim integrasi selesai.
>
> Ikuti keputusan QR 15 menit, sesi `open`/`closed`, validasi lokasi,
> Firestore, FCM, permission, dan aturan integrasi pada Agreement.
> Jangan mengarang koordinat/radius A--D; tunggu data resmi asisten
> praktikum.
>
> Implementasikan acceptance criteria SRS, termasuk loading/empty/error,
> validasi, akses, retry, dan pengujian relevan. Jangan hanya membuat
> UI. Jangan mengubah atau menghapus pekerjaan orang lain.
>
> Setelah selesai, laporkan SRS yang terpenuhi, file yang berubah,
> kontrak/schema/config yang berubah, dependency, hasil pengujian, cara
> demo, mock/stub, dan blocker. Jangan commit, push, merge, atau
> melakukan operasi Git destruktif tanpa instruksi eksplisit.

## 17. Referensi teknis

Gunakan dokumentasi yang sesuai dengan versi dependency yang benar-benar
terpasang. Artikel referensi Sprint 3 dari tim dapat menjadi bahan
belajar, tetapi keputusan API/package harus diverifikasi terhadap
dokumentasi resmi dan kompatibilitas proyek.

-   [Expo ---
    Location](https://docs.expo.dev/versions/latest/sdk/location/)
-   [Expo --- Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
-   [Expo ---
    Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
-   [React Native
    Maps](https://github.com/react-native-maps/react-native-maps)
-   [Firebase Cloud
    Messaging](https://firebase.google.com/docs/cloud-messaging)
-   [Firestore realtime
    listeners](https://firebase.google.com/docs/firestore/query-data/listen)
-   [Firestore
    transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
-   [Firestore Security
    Rules](https://firebase.google.com/docs/firestore/security/get-started)
-   [Firebase Cloud
    Functions](https://firebase.google.com/docs/functions)

------------------------------------------------------------------------

## Penutup

Dokumen ini menjadi pedoman kerja Sprint 3 bersama dokumen pembagian 36
SRS. Anggota dapat mulai melakukan pemeriksaan dan mengerjakan bagian
masing-masing secara paralel. Hal yang belum tersedia harus dicatat
sebagai dependency atau blocker, bukan diisi dengan asumsi.

Perubahan terhadap keputusan bersama harus dibicarakan dengan PM dan
pemilik fitur yang terdampak, kemudian dicatat agar seluruh anggota
menggunakan acuan yang sama.
