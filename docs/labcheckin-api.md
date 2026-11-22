# Dokumentasi API LabCheckIn

LabCheckIn menggunakan **REST API** mandiri berbasis HTTP dengan format **JSON**. Gunakan HTTPS di produksi. Rute presensi memakai awalan `/api/v1`. Registrasi perangkat dan peninjauan izin memakai awalan `/api`. [Kontrak izin dan notifikasi push](push-notifications.md)

| Lingkungan | Base URL                                                               |
| ---------- | ---------------------------------------------------------------------- |
| Lokal      | `http://127.0.0.1:3000`                                                |
| Produksi   | `https://api.example.com` sebagai contoh. Ganti dengan domain API tim. |

## Autentikasi

Setelah pengguna masuk melalui Firebase Auth, ambil ID token dengan `user.getIdToken()`. Kirim header `Authorization: Bearer <firebase-id-token>` untuk setiap permintaan ke rute yang memerlukan autentikasi. API mengambil UID dari token yang telah diverifikasi. [Dokumentasi Firebase ID token](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

## Endpoint yang tersedia

### GET /health

Rute publik untuk memeriksa apakah proses API merespons. Permintaan dapat dikirim langsung tanpa isi atau token.

**Respons `200 OK`**

```json
{ "status": "ok" }
```

### GET /api/v1/auth/me

Mengembalikan UID pengguna yang sudah terautentikasi. Permintaan hanya memerlukan header `Authorization`.

**Respons `200 OK`**

```json
{ "ok": true, "data": { "uid": "firebase-uid" } }
```

### POST /api/v1/attendance/qr/issue

Menerbitkan QR untuk asisten yang memiliki sesi dan kelas tersebut. Sesi dan kelas harus aktif, dengan status sesi `open`.

**Permintaan** dengan header `Authorization` dan `Content-Type: application/json`. Isi JSON hanya memuat `sessionId` bertipe `string`, sesuai ID dokumen sesi di Firestore.

```json
{ "sessionId": "session123" }
```

**Respons `200 OK`**

```json
{
  "sessionId": "session123",
  "qrPayload": "{\"v\":1,\"sessionId\":\"session123\",\"token\":\"<token-acak>\"}",
  "expiresAt": "2026-11-20T10:15:00.000Z"
}
```

Ketiga properti respons bertipe `string`. Gunakan nilai `qrPayload` langsung sebagai teks QR. Di dalamnya terdapat versi payload `v`, ID sesi, dan token. `expiresAt` memakai format ISO 8601 dalam UTC. QR berlaku 15 menit dan digantikan saat asisten menerbitkan QR baru. Hindari mencatat `qrPayload` ke log.

### POST /api/v1/attendance/qr/validate

Memeriksa QR dan kelayakan mahasiswa dalam satu transaksi baca saja di Firestore. QR harus cocok dengan sesi yang diminta, sesuai dengan token aktif, dan belum kedaluwarsa menurut waktu server Firestore.

API menggunakan UID dari Firebase Auth. Profil pengguna harus memiliki `role` dan `requestedRole` bernilai `student`. Sesi dan kelas harus ada dan aktif, sesi harus berstatus `open`, dan keduanya harus memiliki asisten yang sama. Keanggotaan kelas harus aktif serta cocok dengan UID mahasiswa, kelas, dan asisten sesi.

**Permintaan** dengan header `Authorization` dan `Content-Type: application/json`. Kirim tepat dua properti bertipe `string`. Ambil `sessionId` dari halaman presensi dan kirim teks mentah hasil pemindaian kamera sebagai `qrPayload`.

```json
{
  "sessionId": "session123",
  "qrPayload": "{\"v\":1,\"sessionId\":\"session123\",\"token\":\"<token-acak>\"}"
}
```

**Respons `200 OK`** dengan header `Cache-Control: no-store`.

```json
{ "ok": true, "data": { "sessionId": "session123", "qrVerified": true } }
```

`qrVerified: true` mengonfirmasi kredensial QR dan kelayakan mahasiswa untuk sesi tersebut. Validasi lokasi dan pencatatan presensi merupakan bagian dari alur check-in.

### POST /api/v1/attendance/check-in

**Permintaan** dengan header `Authorization` dan `Content-Type: application/json`. Kirim ID sesi dari halaman presensi, teks QR asli dari kamera, dan lokasi perangkat. Semua angka lokasi pada contoh hanya menunjukkan format permintaan.

```json
{
  "sessionId": "session123",
  "qrPayload": "{\"v\":1,\"sessionId\":\"session123\",\"token\":\"<token-acak>\"}",
  "location": { "latitude": 0, "longitude": 0, "accuracyMeters": 12.5 }
}
```

API mengambil UID mahasiswa dari Firebase Auth. Setelah pemeriksaan QR, sesi, kelas, dan keanggotaan lolos, permintaan saat ini berhenti dengan `503 SERVICE_UNAVAILABLE` karena verifikasi lokasi masih menunggu kontrak yang disetujui.

**Respons `200 OK` setelah verifikasi lokasi tersedia** dengan header `Cache-Control: no-store`. API membaca `checkedInAt` dari dokumen yang sudah disimpan dan mengembalikannya sebagai ISO 8601 UTC.

```json
{
  "ok": true,
  "data": {
    "sessionId": "session123",
    "status": "present",
    "checkedInAt": "2026-11-20T12:00:00.000Z"
  }
}
```

## Respons galat

Gunakan status HTTP dan `error.code` untuk menentukan tindakan di aplikasi.

```json
{
  "ok": false,
  "error": {
    "code": "SESSION_CLOSED",
    "message": "The session is closed."
  }
}
```

| HTTP | `error.code`                                          | Arti                                                                                                              |
| ---- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 400  | `INVALID_JSON`, `INVALID_REQUEST`, `VALIDATION_ERROR` | JSON, isi permintaan, atau `sessionId` tidak valid.                                                               |
| 400  | `QR_INVALID`                                          | QR tidak valid, sudah digantikan, atau tidak cocok dengan token aktif.                                            |
| 400  | `QR_SESSION_MISMATCH`                                 | QR berasal dari sesi lain.                                                                                        |
| 401  | `UNAUTHENTICATED`                                     | ID token tidak dikirim atau ditolak.                                                                              |
| 403  | `FORBIDDEN`                                           | Pengguna tidak berwenang menerbitkan QR atau profilnya tidak memenuhi syarat sebagai mahasiswa untuk validasi QR. |
| 403  | `NOT_ENROLLED`                                        | Keanggotaan kelas tidak ditemukan, tidak aktif, atau tidak cocok dengan UID mahasiswa, kelas, atau asisten sesi.  |
| 404  | `NOT_FOUND`                                           | Rute, sesi, atau kelas tidak ditemukan.                                                                           |
| 409  | `SESSION_NOT_OPEN`, `SESSION_CLOSED`                  | Sesi belum dibuka atau sudah ditutup.                                                                             |
| 409  | `SESSION_ARCHIVED`, `CLASS_ARCHIVED`                  | Sesi atau kelas tidak aktif.                                                                                      |
| 410  | `QR_EXPIRED`                                          | Masa berlaku QR telah habis.                                                                                      |
| 413  | `PAYLOAD_TOO_LARGE`                                   | Isi JSON melebihi 16 KiB.                                                                                         |
| 415  | `UNSUPPORTED_MEDIA_TYPE`, `UNSUPPORTED_ENCODING`      | Tipe konten atau encoding tidak didukung.                                                                         |
| 422  | `LOCATION_UNAVAILABLE`                                | Lokasi perangkat wajib disertakan untuk check-in.                                                                 |
| 429  | `RATE_LIMITED`                                        | Batas permintaan tercapai. Periksa header `Retry-After`.                                                          |
| 500  | `INTERNAL_ERROR`                                      | Terjadi galat pada server, misalnya data asisten sesi dan kelas tidak konsisten.                                  |
| 503  | `SERVICE_UNAVAILABLE`                                 | Verifikasi Firebase Auth, verifikasi lokasi check-in, atau konfirmasi waktu presensi sedang tidak tersedia.       |

Rute `/api/v1` dibatasi 120 permintaan per menit per IP yang dilihat API.

## Contoh Expo dengan TypeScript

Panggil fungsi ini setelah asisten masuk dan membuka sesi. Tampilkan QR dari `qrPayload` setelah respons sukses. [Panduan Firebase di Expo](https://docs.expo.dev/guides/using-firebase/)

```ts
import type { User } from "firebase/auth";

type ResponsQr = { sessionId: string; qrPayload: string; expiresAt: string };

async function terbitkanQr(
  baseUrl: string,
  user: User,
  sessionId: string,
): Promise<ResponsQr> {
  const idToken = await user.getIdToken();
  const response = await fetch(`${baseUrl}/api/v1/attendance/qr/issue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  const hasil = await response.json().catch(() => null);
  if (!response.ok || !hasil) {
    throw new Error(hasil?.error?.code ?? `HTTP_${response.status}`);
  }
  return hasil as ResponsQr;
}
```

## Status integrasi

- Verifikasi lokasi menunggu skema Firestore dan tautan lokasi pada sesi, koordinat dan radius resmi, aturan batas radius, ambang akurasi, batas usia pembacaan GPS, perlakuan geotag yang hilang atau dinonaktifkan, dan kebijakan lokasi tiruan untuk platform yang mendukungnya.
- CORS belum dikonfigurasi. Expo Web yang dihosting pada origin berbeda memerlukan konfigurasi CORS. [Dokumentasi CORS Express](https://expressjs.com/en/resources/middleware/cors/)

### Kebijakan partisipasi untuk check-in

Check-in memakai satu dokumen di `sessions/{sessionId}/participations/{studentId}`, dengan ID mahasiswa dari Firebase Auth. Hasil berikut berlaku setelah verifikasi lokasi lolos.

| Dokumen partisipasi saat check-in                         | Hasil                                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Dokumen belum ada                                         | Buat dokumen `kind: "attendance"` secara transaksional.                                                                                      |
| Izin berstatus `rejected` dan kehadiran belum tercatat    | Tambahkan `attendanceCreatedAt`, `attendanceUpdatedAt`, dan `attendanceCheckedInAt` ke dokumen izin yang sama. Riwayat izin tetap tersimpan. |
| Kehadiran sudah tercatat, termasuk pada izin yang ditolak | `409 ALREADY_CHECKED_IN`.                                                                                                                    |
| Izin masih menunggu atau disetujui                        | `409 PARTICIPATION_CONFLICT`.                                                                                                                |

### Migrasi penulisan presensi

Pada `PPK_Mobile_7/firestore.rules`, aturan `allow create` melalui `validParticipation` masih mengizinkan mahasiswa membuat dokumen `kind: "attendance"` secara langsung. Aturan `allow update` pada versi repositori saat ini hanya mengizinkan peninjauan izin oleh asisten. Izin klien untuk menambah stempel presensi pada izin yang ditolak sudah dihapus dari versi tersebut. Status aturan yang diterapkan di Firebase perlu dikonfirmasi sebelum rilis.

Saat migrasi, arahkan penulisan presensi Expo ke API dan batasi pembuatan presensi langsung di Firestore. Jika aturan lama masih diterapkan, batasi juga pembaruan stempel presensi izin ditolak oleh klien. Pertahankan pembuatan izin serta akses baca untuk status mahasiswa, riwayat, dan rekap asisten. Arahkan peninjauan izin ke endpoint API sesuai kontrak migrasi. [Kontrak izin dan notifikasi push](push-notifications.md)
