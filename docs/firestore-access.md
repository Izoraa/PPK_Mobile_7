# Kontrak akses Firestore Sprint 2

`firebase.json` menunjuk ke rules dan indeks Firestore dalam repositori. Akses klien dibatasi oleh UID, peran dari profil, dan relasi kelas. Profil dengan permintaan asisten yang belum disetujui belum dapat mengakses koleksi domain sebagai praktikan atau asisten.

| Pembacaan | Batas query |
|---|---|
| Kelas asisten | Filter `assistantId == uid`. Daftar aktif juga memfilter `isArchived == false`. |
| Kelas praktikan | Baca membership dengan `studentId == uid`. Baca dokumen kelas berdasarkan ID jika membership aktif. |
| Membership kelas bagi asisten | Filter `classId` dan `assistantId == uid` pada kelas miliknya. |
| Jadwal | Query per `classId` yang dapat diakses. Jadwal aktif memfilter `isArchived == false` dan mengurutkan `startsAt` naik. Setelah membership nonaktif, praktikan masih dapat membuka sesi yang memiliki record partisipasinya. |
| Rekap satu sesi | Query subkoleksi partisipasi sesi untuk asisten pemilik kelas. Praktikan membaca dokumen partisipasinya langsung dengan UID sebagai ID. |
| Riwayat praktikan | Query grup `participations` dengan `studentId == uid` dan `kind` sesuai layar, urut `createdAt` turun untuk menampilkan catatan terbaru. |
| Antrean izin asisten | Query grup `participations` dengan `assistantId == uid` dan `kind == 'leave' serta filter `status` jika diperlukan. |

Query grup mengandalkan `studentId`, `assistantId`, dan `kind` yang dikunci sejak dokumen dibuat. Simpan nama koleksi `participations` khusus untuk record sesi dengan kontrak tersebut.

Batas metadata sebelum disimpan adalah 200 karakter untuk nama kelas, mata praktikum, judul sesi, dan ruang, 64 karakter untuk kode kelas, serta 100 karakter untuk zona waktu. Nilai tersebut harus terisi setelah spasi tepi dipangkas.

## Batas backend

- Enrolment memakai Admin SDK dan transaksi yang memeriksa token pemanggil, peran asisten, kepemilikan kelas aktif, dan profil praktikan yang dituju. Backend mengambil nama dan NIM dari profil serta menetapkan ID dan pemilik membership dari kelas. Profil dengan permintaan asisten yang tertunda tidak memenuhi syarat sebagai praktikan.
- Klasifikasi AI memakai Admin SDK dan memeriksa token, identitas pemilik permintaan atau asisten pemilik kelas, jenis record izin, serta status proses. Hasil hanya boleh ditulis untuk `requestId` yang masih aktif. Batasi penulisan ke field `ai` dan `updatedAt`.
- Rules menolak mutasi membership oleh klien dan perubahan field AI setelah izin dibuat. Endpoint enrolment dan klasifikasi perlu menegakkan pemeriksaan di atas pada saat diintegrasikan.
