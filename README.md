# PPK Mobile 7 – Lab Check‑In App

## Deskripsi
Aplikasi Expo/React Native untuk mengelola presensi praktikum di laboratorium. Menggunakan Expo Router (file‑based routing) dan Expo Dev Client (karena menggunakan modul native SDK 58 seperti @expo/ui, expo-glass-effect, react-native-worklets).

## Fitur Utama
- **Presensi**: menampilkan daftar sesi, jumlah mahasiswa hadir, dan detail sesi.
- **Riwayat Presensi**: melihat histori kehadiran per sesi.
- **Manajemen Sesi (asisten)**:
  - Buka sesi (SRS‑06)
  - Tutup sesi (SRS‑07)
  - Tampilkan status terkini (SRS‑08)
  - Konfirmasi aksi dengan modal (SRS‑09).
- **Navigasi Tab** menggunakan `expo-router/native-tabs`.
- **Tema**: dukungan light/dark mode, komponen UI premium (@expo/ui).

## Prasyarat
- Node ≥ 20
- Bun (jika ada `bun.lock`) atau npm/yarn
- Android Studio (emulator) atau perangkat Android dengan USB‑debugging aktif
- Expo CLI (`npx expo`) – instal dengan `npm i -g expo-cli`

## Instalasi
```bash
# Clone repo
git clone https://github.com/Izoraa/PPK_Mobile_7.git
cd PPK_Mobile_7

# Install dependencies (pakai bun jika ada bun.lock)
# bun
bun install
# atau npm
npm install
```

## Menjalankan (Development)
1. **Bangun Development Build** (hanya sekali atau saat menambah native module):
   ```bash
   npx expo install expo-dev-client
   npx eas build --profile development --platform android   # atau ios
   ```
   Install APK yang di‑download pada perangkat.
2. **Mulai Metro Bundler dengan dev client:**
   ```bash
   npx expo start --dev-client
   ```
   Scan QR code menggunakan aplikasi dev client yang sudah ter‑install.

## Skrip NPM
| Skrip | Keterangan |
|------|------------|
| `start` | `expo start` – untuk Expo Go (tidak cocok dengan native module ini) |
| `android` | `expo start --android` – membuka di emulator/device (butuh dev client) |
| `ios` | `expo start --ios` |
| `web` | `expo start --web` |
| `lint` | `expo lint` |
| `typecheck` | `npx tsc --noEmit` |
| `doctor` | `npx expo-doctor` |

## Menambahkan Screen Baru
1. Buat komponen di `src/screens/YourScreen.tsx`.
2. Buat file route di `src/app/your-screen.tsx` yang men‑export komponen tersebut.
3. Tambahkan tab di [src/components/app-tabs.tsx](file:///d:/CODING/KULIAH/SEMESTER%205/PPK_mobile/LabCheckIn/PPK_Mobile_7/src/components/app-tabs.tsx) (atau ubah [_layout.tsx](file:///d:/CODING/KULIAH/SEMESTER%205/PPK_mobile/LabCheckIn/PPK_Mobile_7/src/app/_layout.tsx)).
