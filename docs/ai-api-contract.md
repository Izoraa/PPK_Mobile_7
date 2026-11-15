# Kontrak integrasi klasifikasi AI — Sprint 2

Status: **implementasi lokal dengan mock; integrasi live belum diverifikasi**. Callable, validasi hasil, state AI Firestore, timeout, dan retry tersedia di source. Mode mock aktif secara default. Mode live tetap terkunci sampai ID model dan akun provider diverifikasi serta deployment/backend disetujui.

## Lokasi dan kepemilikan

- Lokasi source yang disepakati untuk modul AI: `functions/src/ai/`.
- Handler callable: `functions/src/ai/requestClassification.ts`.
- Adapter provider: `functions/src/ai/provider.ts`.
- Validasi/normalisasi respons: `functions/src/ai/validation.ts`.
- Izzatu pemilik implementasi; Maulana membantu integrasi backend dan Firebase.
- **Host/deployment belum dikunci.** Source Firebase Functions dan emulator sudah disiapkan; PM dan Maulana tetap perlu memeriksa akses proyek, region, billing, dan fasilitas backend sebelum deployment.

## Kontrak aplikasi ke backend

Gunakan Firebase Callable Function bernama `requestClassification`. Aplikasi hanya mengirim referensi pengajuan, bukan alasan, API key, hasil AI, atau keputusan izin.

```ts
requestClassification({
  sessionId: string,
  studentId: string,
}): Promise<Result<{ aiStatus: 'pending' | 'processing' | 'succeeded' | 'failed' }>>
```

Aturan handler:

1. Wajib menolak pemanggil tanpa Firebase Auth yang valid.
2. Izinkan hanya pemohon (`auth.uid === studentId`) atau asisten yang memiliki kelas/sesi terkait.
3. Baca `sessions/{sessionId}/participations/{studentId}` dari Firestore Admin SDK. Pastikan `kind === 'leave'` dan ambil alasan dari record tersimpan; jangan percaya alasan dari payload klien.
4. Tolak pengajuan yang tidak ada atau tidak sah. Jangan membuat atau mengubah keputusan izin.
5. Klaim klasifikasi secara atomik sebelum panggilan jaringan. Hanya satu klaim aktif per pengajuan; simpan `requestId`, `startedAt`, naikkan `attemptCount`, dan set `ai.status = 'processing'`.
6. Setelah klaim berhasil, panggil adapter di luar transaksi. Simpan hanya field `ai` yang tervalidasi dan `updatedAt`, dengan syarat `requestId` masih sama. Jangan overwrite seluruh dokumen.
7. Kegagalan provider mengubah `ai.status` menjadi `failed`; `status` keputusan tetap `pending` kecuali sudah diputuskan manusia.

Respons callable tidak memuat API key, alasan, atau raw response provider. Klien memperoleh hasil lengkap melalui Firestore listener milik SRS 33.

## Kontrak internal adapter

```ts
interface InstructorClassifier {
  classify(input: { reason: string }): Promise<unknown>;
}
```

Adapter menerima alasan yang sudah dibaca dan divalidasi server. Berdasarkan dokumen verifikasi PM, adapter live sementara memakai New API compatible `POST /v1/chat/completions` dengan Bearer token dan hanya mengirim alasan. Kandidat ini perlu diverifikasi terhadap akun pengajar. Jangan kirim UID, nama, NIM, email, atau data kelas.

Normalisasi hasil ke field yang sudah ada pada schema izin:

```ts
{
  status: 'succeeded',
  category: string,
  confidence: number | null,
  modelVersion: string | null,
  classifiedAt: Timestamp,
  errorCode: null,
  requestId: string,
  startedAt: Timestamp,
  attemptCount: number,
}
```

Kategori aplikasi (`illness`, `family`, `academic`, `other`, `unclear`) adalah enum LabCheckIn dan harus dikembalikan persis oleh provider. Jangan membuat nilai confidence; simpan null karena kontrak provider tidak mengembalikannya. Respons tidak valid dipetakan ke `AI_INVALID_RESPONSE`; jangan menyimpan raw response.

## Batas waktu dan retry

- Timeout provider yang diusulkan kesepakatan tim: 15 detik, menunggu batas resmi provider.
- Cooldown retry yang diusulkan: 30 detik; maksimum 3 percobaan, menunggu kuota resmi.
- Lease `processing` lebih dari 60 detik boleh dipulihkan. Hasil request lama diabaikan jika `requestId` sudah berubah.
- Retry hanya mengulang klasifikasi record yang sama. Ia tidak membuat pengajuan baru atau mengubah `status`, `reviewedBy`, `reviewedAt`, maupun `reviewNote`.
- Pesan gagal untuk pengguna: “Pengajuan tetap tersimpan. Klasifikasi AI belum tersedia; asisten tetap dapat memeriksa.”

Nilai di atas adalah baseline usulan dari kesepakatan tim; PM perlu mengunci nilai final jika kontrak/kuota provider mensyaratkan batas lain.

## Informasi upstream yang sudah diketahui dan yang masih dibutuhkan

| Item | Status |
|---|---|
| Base URL yang diberikan PM | `https://aotianzz.xyz/v1` (belum diverifikasi dengan dokumentasi/request resmi) |
| API key | **Tidak dicatat di repo atau dokumen.** Key yang dikirim di chat harus dicabut/diganti; simpan pengganti hanya di secret manager backend setelah host diputuskan. |
| Endpoint path dan metode | Kandidat New API `POST /v1/chat/completions`; belum diuji ke akun pengajar |
| Header/skema autentikasi | Kandidat `Authorization: Bearer`; belum diuji ke akun pengajar |
| Nama/ID model | PM menyebut `gpt 6.1 sol`; ID API dan akses model belum terverifikasi |
| Contoh request/response JSON | Ada rancangan OpenAI-compatible; bentuk aktual belum diuji |
| Daftar kategori valid | Enum aplikasi dirancang sebagai `illness`, `family`, `academic`, `other`, `unclear`; perlu penerimaan pengajar |
| Confidence/model version | Confidence disimpan null; model memakai ID dari respons bila tersedia |
| Batas input, kuota, retry, timeout resmi | Belum diberikan |
| Izin mengirim alasan izin ke layanan eksternal dan kebijakan retensi data | Perlu dikonfirmasi PM/pengajar |
| Host backend dan deployment | Source Functions tersedia; region, billing, akses project, dan deployment menunggu PM/Maulana |

Panggilan live memerlukan `AI_PROVIDER_MODE=live`, `AI_MODEL_VERIFIED=true`, model yang terverifikasi, persetujuan penggunaan alasan ke layanan eksternal, dan secret `AI_API_KEY` di Secret Manager. `.env.example` mempertahankan mock sebagai default. Jangan gunakan alasan praktikan pada tes live tanpa persetujuan kuota dan data.

## Acceptance integrasi

- Firebase Emulator membuktikan otorisasi, ownership, deduplikasi proses, respons rusak, timeout, dan perlindungan keputusan izin.
- Adapter mock boleh dipakai untuk pengujian UI dan error flow, tetapi tidak membuktikan integrasi pengajar.
- Acceptance produksi memerlukan minimal satu request provider yang berhasil, hasil tervalidasi tersimpan, dan bukti bahwa status keputusan izin tidak berubah.
