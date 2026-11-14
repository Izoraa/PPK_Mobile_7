# Aktivasi akun asisten

1. Calon asisten memilih **Asisten praktikum** saat melengkapi profil. Firestore menyimpan `requestedRole: 'assistant'` dengan `role: 'student'` sampai aktivasi.
2. Hasta memverifikasi identitas calon asisten. Maulana mencocokkan UID dan alamat email yang disetujui dengan akun di Firebase Authentication pada proyek yang sama.
3. Dari PowerShell 7.5 atau lebih baru, Maulana menjalankan perintah berikut setelah masuk ke Google Cloud CLI. Akun operator memerlukan izin impersonasi pada service account provisioning. Service account memerlukan izin IAM untuk mencari akun Firebase Auth serta membaca dan memperbarui dokumen Firestore proyek.

```powershell
./scripts/approve-assistant.ps1 -ProjectId 'PROJECT_ID' -Uid 'FIREBASE_AUTH_UID' -ApprovedEmail 'EMAIL_DARI_FIREBASE_AUTH' -ServiceAccount 'ACCOUNT@PROJECT_ID.iam.gserviceaccount.com'
```

Gunakan alamat email persis seperti yang ditampilkan Firebase Authentication. Skrip memeriksa bahwa UID dan email cocok dengan akun Auth yang aktif, lalu mencocokkan permintaan peran pada profil sebelum mengubah `role` dan `updatedAt`. Jika profil berubah selama proses, penulisan gagal dan operator dapat menjalankan ulang perintah untuk akun yang sama. Untuk melihat status terbaru, pengguna membuka kembali layar registrasi dengan sesi akun yang masih aktif.

Aturan profil dan koleksi domain disimpan di `firestore.rules`. Proyek perlu menerapkan rules terkait sebelum digunakan. Tinjau seluruh aturan proyek saat mengintegrasikan perubahan karena pengaturan Firestore yang dipublikasikan menggunakan satu ruleset.
