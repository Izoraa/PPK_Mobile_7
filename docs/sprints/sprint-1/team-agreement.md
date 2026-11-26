# LabCheckIn — Dokumen Kesepakatan Tim (Sprint 1)

| Metadata | Keterangan |
| :--- | :--- |
| **Proyek** | LabCheckIn (PPK Mobile — Kelompok 7) |
| **Sprint** | Sprint 1 |
| **Tema** | Antarmuka dan Alur Praktikum (Data Lokal / Dummy) |
| **Project Manager** | — *(Koordinasi bersama tim)* |
| **Tim Programmer** | Maulana Ghazzam Adil Al Faiq, Jordan Tenggara, Hasta Putra Wildantara, Hanif Ihsanul Huda |
| **Status Dokumen** | ✅ Arsip Historis (Selesai) |

Dokumen ini adalah **acuan bersama** untuk 4 anggota tim pada Sprint 1. Tujuannya satu: kode dari 4 orang bisa digabung tanpa bentrok.

**Aturan bahasa:** penjelasan memakai bahasa Indonesia. Semua *penamaan teknis* (nama produk, branch, file, komponen, fungsi, tipe, nilai status, kode error, commit message) memakai **bahasa Inggris**. Teks yang tampil di layar aplikasi (label, pesan, judul) tetap **bahasa Indonesia**, karena pengguna aplikasinya orang Indonesia.

> **Catatan untuk AI yang membaca dokumen ini:** ikuti dokumen ini sebagai sumber kebenaran. Jangan mengubah nama file, nama tipe, nama fungsi, atau bentuk data pada bagian **Kontrak** (bagian 4 sampai 8) tanpa persetujuan tim. Kerjakan hanya bagian milik pengguna (lihat bagian 3). Semua identifier di kode harus berbahasa Inggris sesuai dokumen ini. Jika butuh perubahan kontrak, jelaskan alasannya agar pengguna bisa membahasnya dengan tim.

---

## 1. Ringkasan proyek

- **Nama aplikasi:** LabCheckIn
- **Fungsi:** mencatat kehadiran (check-in) praktikum.
- **Dua peran:** `student` (praktikan) dan `assistant` (asisten praktikum).
- **Sprint 1:** hanya desain antarmuka dan alur. **Tanpa database, tanpa login.** Data memakai dummy lokal dan perubahan disimpan di *state* selama aplikasi berjalan.
- **Hasil akhir yang dinilai (alur demo):**
  1. Assistant membuka sesi
  2. Student melakukan check-in
  3. Assistant melihat rekap kehadiran
  4. Assistant menutup sesi
  
  Informasi harus konsisten di kedua peran.

## 2. Tech stack dan keputusan teknis (default)

| Hal | Keputusan |
|---|---|
| Framework | React Native dengan **Expo** |
| Bahasa | **TypeScript** (membantu AI dan manusia konsisten soal bentuk data) |
| Build | **EAS Build** (APK profil `preview`) |
| Navigasi | **React Navigation** (native-stack + bottom-tabs) |
| State bersama | **React Context + useReducer** (tanpa library tambahan) |
| Modal / bottom sheet | Komponen `Modal` bawaan React Native (tanpa library tambahan) |
| Styling | `StyleSheet` + **flexbox**, warna dan jarak dari `src/theme` |

**Aturan:** jangan menambah library baru tanpa kabar ke grup. Alasannya supaya `package.json` tidak bentrok.

### Perintah setup

```bash
npx create-expo-app@latest labcheckin --template blank-typescript
cd labcheckin
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npx expo start
```

## 3. Pembagian kerja dan kepemilikan file

| Anggota | Bagian | SRS | File yang dimiliki |
|---|---|---|---|
| **Maulana** | Schedule and session detail, role picker | 01-05 | `screens/RolePickerScreen.tsx`, `screens/ScheduleScreen.tsx`, `screens/SessionDetailScreen.tsx`, `components/session/SessionCard.tsx`, `components/common/StatusBadge.tsx`, `components/common/EmptyState.tsx` |
| **Jordan** | Session management (open/close) | 06-09 | `components/session/SessionControl.tsx`, `components/common/ConfirmModal.tsx`, plus kerangka fondasi (state, tipe, dummy; lihat Langkah 0) |
| **Hasta** | Student check-in | 10-14 | `components/session/CheckInPanel.tsx` |
| **Hanif** | Attendance recap and history | 15-17 | `components/session/AttendanceList.tsx`, `screens/AttendanceHistoryScreen.tsx` |

**Aturan emas:** edit hanya file milikmu. Kalau perlu mengubah file orang lain, minta orangnya atau bahas di grup.

### Langkah 0: Fondasi (dikerjakan dulu, target hari pertama)

Dikerjakan oleh satu orang (usulan: Jordan), lalu di-push ke `main`. Isinya:

1. Project Expo dari perintah setup di atas
2. File `src/types/index.ts`, `src/data/dummy.ts`, `src/state/AppContext.tsx` (kode acuan ada di bagian 5 sampai 7)
3. `src/theme/index.ts`, `src/utils/format.ts`, `src/utils/messages.ts`
4. **File kosong (stub)** untuk semua komponen di tabel di atas, supaya setiap orang tinggal mengisi
5. `RootNavigator` dasar

Selama Langkah 0 belum selesai, anggota lain tetap bisa mulai dengan menyalin kode di bagian 5 sampai 7.

### Struktur folder

```
labcheckin/
  App.tsx
  eas.json
  src/
    types/index.ts
    data/dummy.ts
    state/AppContext.tsx
    navigation/RootNavigator.tsx
    theme/index.ts
    utils/format.ts
    utils/messages.ts
    screens/
      RolePickerScreen.tsx
      ScheduleScreen.tsx
      SessionDetailScreen.tsx
      AttendanceHistoryScreen.tsx
    components/
      common/   StatusBadge.tsx  EmptyState.tsx  ConfirmModal.tsx
      session/  SessionCard.tsx  SessionControl.tsx  CheckInPanel.tsx  AttendanceList.tsx
```

---

## 4. Aturan status sesi (Kontrak)

Status sesi hanya punya 3 nilai dan bergerak **satu arah**:

```
not_open  ->  open  ->  closed
```

| Nilai di kode | Label di layar | Warna badge | Assistant boleh | Student boleh |
|---|---|---|---|---|
| `not_open` | Belum dibuka | abu-abu (`neutral`) | Open session | Tidak bisa check-in |
| `open` | Dibuka | hijau (`success`) | Close session | **Check-in** |
| `closed` | Ditutup | merah (`danger`) | Hanya melihat rekap | Tidak bisa check-in |

Aturan tambahan:

- Sesi yang sudah `closed` **tidak bisa dibuka lagi**.
- Sesi `not_open` tidak bisa langsung ditutup.
- Open dan close **wajib lewat konfirmasi modal** (SRS-09).

## 5. Tipe data (Kontrak)

File: `src/types/index.ts`

```ts
export type Role = 'student' | 'assistant';

export type SessionStatus = 'not_open' | 'open' | 'closed';

export interface User {
  id: string;
  name: string;
  studentNumber?: string;   // only for students (NIM)
  role: Role;
}

export interface Session {
  id: string;
  course: string;           // nama praktikum
  room: string;             // kelas / laboratorium
  date: string;             // 'YYYY-MM-DD'
  startTime: string;        // 'HH:mm'
  endTime: string;          // 'HH:mm'
  status: SessionStatus;
  assistantId: string;
  openedAt: string | null;  // ISO string
  closedAt: string | null;  // ISO string
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  checkedInAt: string;      // ISO string
}

export type CheckInError =
  | 'SESSION_NOT_OPEN'
  | 'SESSION_CLOSED'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_A_STUDENT';

export type CheckInResult =
  | { ok: true; attendance: Attendance }
  | { ok: false; reason: CheckInError };
```

## 6. Data dummy (Kontrak)

File: `src/data/dummy.ts`

```ts
import { User, Session, Attendance } from '../types';

export const USERS: User[] = [
  { id: 'ast1', name: 'Kak Rina (Asisten)', role: 'assistant' },
  { id: 'ast2', name: 'Kak Dimas (Asisten)', role: 'assistant' },
  { id: 'stu1', name: 'Andi Pratama', studentNumber: '24001', role: 'student' },
  { id: 'stu2', name: 'Bella Sari', studentNumber: '24002', role: 'student' },
  { id: 'stu3', name: 'Citra Lestari', studentNumber: '24003', role: 'student' },
  { id: 'stu4', name: 'Dani Kurniawan', studentNumber: '24004', role: 'student' },
];

export const SESSIONS: Session[] = [
  { id: 'sess1', course: 'Pemrograman Mobile', room: 'Lab Komputer 1',
    date: '2026-10-26', startTime: '08:00', endTime: '10:00',
    status: 'not_open', assistantId: 'ast1', openedAt: null, closedAt: null },
  { id: 'sess2', course: 'Basis Data', room: 'Lab Komputer 2',
    date: '2026-10-26', startTime: '10:30', endTime: '12:30',
    status: 'open', assistantId: 'ast1', openedAt: '2026-10-26T03:30:00.000Z', closedAt: null },
  { id: 'sess3', course: 'Jaringan Komputer', room: 'Lab Jaringan',
    date: '2026-10-19', startTime: '13:00', endTime: '15:00',
    status: 'closed', assistantId: 'ast2',
    openedAt: '2026-10-19T06:00:00.000Z', closedAt: '2026-10-19T08:00:00.000Z' },
  { id: 'sess4', course: 'Pemrograman Mobile', room: 'Lab Komputer 1',
    date: '2026-10-27', startTime: '08:00', endTime: '10:00',
    status: 'not_open', assistantId: 'ast2', openedAt: null, closedAt: null },
];

// Riwayat awal: stu1 dan stu2 hadir di sess3. stu3 dan stu4 belum punya riwayat
// (berguna untuk menguji tampilan "riwayat kosong").
export const ATTENDANCES: Attendance[] = [
  { id: 'att1', sessionId: 'sess3', studentId: 'stu1', checkedInAt: '2026-10-19T06:05:00.000Z' },
  { id: 'att2', sessionId: 'sess3', studentId: 'stu2', checkedInAt: '2026-10-19T06:12:00.000Z' },
];
```

**Cara menguji kondisi khusus:**

| Kondisi | Cara menguji |
|---|---|
| Jadwal kosong | Ubah `SESSIONS` jadi `[]` sementara |
| Sesi belum dibuka | Pakai `sess1` atau `sess4` |
| Sudah check-in | Pilih `stu1` atau `stu2` lalu buka `sess3`, atau check-in dua kali di `sess2` |
| Rekap kosong | Pilih assistant, buka `sess2` sebelum ada yang check-in |
| Riwayat student kosong | Pilih `stu3` atau `stu4` |

## 7. State bersama (Kontrak)

File: `src/state/AppContext.tsx`. Ini kode acuan yang berfungsi penuh. Semua orang **memakai lewat hook `useApp()`**, bukan membuat state sendiri.

```tsx
import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { Attendance, Session, CheckInResult, User } from '../types';
import { USERS, SESSIONS, ATTENDANCES } from '../data/dummy';

interface State {
  users: User[];
  sessions: Session[];
  attendances: Attendance[];
  currentUserId: string | null;
}

type Action =
  | { type: 'SELECT_USER'; userId: string }
  | { type: 'SWITCH_ROLE' }
  | { type: 'OPEN_SESSION'; sessionId: string; at: string }
  | { type: 'CLOSE_SESSION'; sessionId: string; at: string }
  | { type: 'ADD_ATTENDANCE'; attendance: Attendance };

const initialState: State = {
  users: USERS,
  sessions: SESSIONS,
  attendances: ATTENDANCES,
  currentUserId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_USER':
      return { ...state, currentUserId: action.userId };
    case 'SWITCH_ROLE':
      return { ...state, currentUserId: null };
    case 'OPEN_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId && s.status === 'not_open'
            ? { ...s, status: 'open', openedAt: action.at }
            : s
        ),
      };
    case 'CLOSE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId && s.status === 'open'
            ? { ...s, status: 'closed', closedAt: action.at }
            : s
        ),
      };
    case 'ADD_ATTENDANCE':
      return { ...state, attendances: [...state.attendances, action.attendance] };
    default:
      return state;
  }
}

export interface AppContextValue {
  // data
  currentUser: User | null;
  users: User[];
  sessions: Session[];
  // actions
  selectUser: (userId: string) => void;
  switchRole: () => void;                              // kembali ke RolePicker
  openSession: (sessionId: string) => boolean;         // true jika berhasil
  closeSession: (sessionId: string) => boolean;        // true jika berhasil
  checkIn: (sessionId: string) => CheckInResult;       // memakai currentUser
  // helpers (selectors)
  getSession: (sessionId: string) => Session | undefined;
  getAttendancesBySession: (sessionId: string) => Attendance[]; // urut waktu naik
  getAttendancesByStudent: (studentId: string) => Attendance[];
  hasCheckedIn: (sessionId: string, studentId: string) => boolean;
  getUserById: (userId: string) => User | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<AppContextValue>(() => {
    const getSession = (id: string) => state.sessions.find((s) => s.id === id);
    const getUserById = (id: string) => state.users.find((u) => u.id === id);
    const hasCheckedIn = (sessionId: string, studentId: string) =>
      state.attendances.some((a) => a.sessionId === sessionId && a.studentId === studentId);
    const currentUser = state.currentUserId ? getUserById(state.currentUserId) ?? null : null;

    return {
      currentUser,
      users: state.users,
      sessions: state.sessions,

      selectUser: (userId) => dispatch({ type: 'SELECT_USER', userId }),
      switchRole: () => dispatch({ type: 'SWITCH_ROLE' }),

      openSession: (sessionId) => {
        const s = getSession(sessionId);
        if (!s || s.status !== 'not_open') return false;
        dispatch({ type: 'OPEN_SESSION', sessionId, at: new Date().toISOString() });
        return true;
      },
      closeSession: (sessionId) => {
        const s = getSession(sessionId);
        if (!s || s.status !== 'open') return false;
        dispatch({ type: 'CLOSE_SESSION', sessionId, at: new Date().toISOString() });
        return true;
      },

      checkIn: (sessionId): CheckInResult => {
        const s = getSession(sessionId);
        if (!currentUser || currentUser.role !== 'student' || !s) {
          return { ok: false, reason: 'NOT_A_STUDENT' };
        }
        if (s.status === 'not_open') return { ok: false, reason: 'SESSION_NOT_OPEN' };
        if (s.status === 'closed') return { ok: false, reason: 'SESSION_CLOSED' };
        if (hasCheckedIn(sessionId, currentUser.id)) return { ok: false, reason: 'ALREADY_CHECKED_IN' };

        const attendance: Attendance = {
          id: `att${Date.now()}`,
          sessionId,
          studentId: currentUser.id,
          checkedInAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_ATTENDANCE', attendance });
        return { ok: true, attendance };
      },

      getSession,
      getUserById,
      hasCheckedIn,
      getAttendancesBySession: (sessionId) =>
        state.attendances
          .filter((a) => a.sessionId === sessionId)
          .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)),
      getAttendancesByStudent: (studentId) =>
        state.attendances.filter((a) => a.studentId === studentId),
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
```

Bungkus aplikasi di `App.tsx`: `<AppProvider><NavigationContainer>...</NavigationContainer></AppProvider>`.

## 8. Komponen bersama dan pesan teks (Kontrak)

### Komponen yang dipakai bersama

| Komponen | Pemilik | Props |
|---|---|---|
| `StatusBadge` | Maulana | `{ status: SessionStatus }` |
| `EmptyState` | Maulana | `{ title: string; message?: string }` |
| `ConfirmModal` | Jordan | `{ visible: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void }` |

`ConfirmModal` juga boleh dipakai Hasta dan Hanif untuk menampilkan info pendukung.

### Titik pemasangan di halaman detail sesi

`SessionDetailScreen` (milik Maulana) menerima `route.params.sessionId`, menampilkan info sesi, lalu memasang komponen berikut sesuai peran:

```tsx
{currentUser.role === 'assistant' && <SessionControl sessionId={sessionId} />}   {/* Jordan */}
{currentUser.role === 'assistant' && <AttendanceList sessionId={sessionId} />}   {/* Hanif */}
{currentUser.role === 'student' && <CheckInPanel sessionId={sessionId} />}       {/* Hasta */}
```

Setiap komponen di atas hanya menerima prop `sessionId: string`.

### Pesan teks standar

File: `src/utils/messages.ts`. Identifier berbahasa Inggris, isi teks berbahasa Indonesia karena tampil di layar. Dipakai agar teks seragam di seluruh aplikasi.

```ts
import { CheckInError } from '../types';

export const CHECK_IN_ERROR_MESSAGES: Record<CheckInError, string> = {
  SESSION_NOT_OPEN: 'Sesi belum dibuka oleh asisten. Presensi belum bisa dilakukan.',
  SESSION_CLOSED: 'Sesi sudah ditutup. Presensi tidak bisa dilakukan lagi.',
  ALREADY_CHECKED_IN: 'Kehadiran kamu sudah tercatat di sesi ini.',
  NOT_A_STUDENT: 'Hanya praktikan yang dapat melakukan presensi.',
};

export const CHECK_IN_SUCCESS_MESSAGE = (time: string) =>
  `Presensi berhasil dicatat pukul ${time}.`;

export const CONFIRM_OPEN_SESSION = {
  title: 'Buka sesi?',
  message: 'Setelah dibuka, praktikan dapat melakukan presensi.',
};
export const CONFIRM_CLOSE_SESSION = {
  title: 'Tutup sesi?',
  message: 'Setelah ditutup, praktikan tidak dapat presensi lagi dan sesi tidak bisa dibuka kembali.',
};

export const EMPTY_STATE_TEXT = {
  schedule: { title: 'Belum ada jadwal', message: 'Jadwal praktikum belum tersedia.' },
  attendees: { title: 'Belum ada yang presensi', message: 'Daftar kehadiran masih kosong.' },
  history: { title: 'Belum ada riwayat', message: 'Kamu belum melakukan presensi pada sesi mana pun.' },
};
```

### Pembantu format

File: `src/utils/format.ts`

```ts
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (yyyyMmDd: string) =>
  new Date(yyyyMmDd).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
```

### Tema

File: `src/theme/index.ts`

```ts
export const colors = {
  primary: '#2563EB',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',   // status open
  neutral: '#94A3B8',   // status not_open
  danger: '#DC2626',    // status closed
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 12, lg: 20 };
```

---

## 9. Navigasi

Nama route memakai bahasa Inggris. Judul yang tampil di header/tab memakai bahasa Indonesia.

```
RolePicker  (form: pick a role, then pick an identity from dummy data)
   |
   |-- Assistant:  Stack -> Schedule -> SessionDetail
   |                ("Ganti peran" button in header)
   |
   |-- Student:    Bottom Tabs
                    |- Tab "Jadwal":  Schedule -> SessionDetail
                    |- Tab "Riwayat": AttendanceHistory
                    ("Ganti peran" button in header)
```

- Memilih peran dan identitas memakai **form sederhana** (pilihan radio atau daftar). Itu memenuhi syarat "gunakan form".
- "Ganti peran" memanggil `switchRole()` lalu kembali ke `RolePicker`. Data sesi dan presensi **tidak direset**, jadi alur demo tetap konsisten.

## 10. Aturan tampilan

- Tata letak memakai **flexbox**. Hindari ukuran piksel mati untuk lebar halaman.
- Pakai `SafeAreaView` dan `ScrollView` / `FlatList` untuk daftar.
- Semua daftar wajib punya `ListEmptyComponent` berisi `EmptyState`.
- Warna, jarak, dan radius **hanya** dari `src/theme`.
- Teks pesan **hanya** dari `src/utils/messages.ts`.
- Tombol aksi yang tidak relevan **disembunyikan atau dinonaktifkan**, tidak boleh dibiarkan aktif lalu error.

## 11. Cara kerja Git

- Branch utama: `main`. Jangan push langsung ke `main` kecuali Langkah 0.
- Branch per orang:
  - `feat/schedule-detail` (Maulana)
  - `feat/session-management` (Jordan)
  - `feat/check-in` (Hasta)
  - `feat/attendance-recap` (Hanif)
- Commit message berbahasa Inggris, singkat dan jelas, format `type(scope): description`. Contoh:
  - `feat(session): add confirmation modal for opening a session`
  - `fix(check-in): block duplicate check-in on the same session`
  - `docs: update team agreement`
- Sebelum membuat Pull Request: `git pull origin main`, jalankan aplikasi, pastikan tidak error.
- Judul Pull Request juga berbahasa Inggris, contoh: `feat: session management (SRS-06 to SRS-09)`.
- Urutan merge yang disarankan: Langkah 0, lalu Maulana, lalu Jordan, lalu Hasta, lalu Hanif.
- Jangan commit `node_modules`. Jangan ubah `package.json` tanpa kabar ke grup.

## 12. EAS (build)

Dikerjakan **satu orang** (satu akun Expo) untuk build bersama.

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas.json` (profil `preview` menghasilkan APK yang bisa langsung dipasang):

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": {}
  }
}
```

```bash
eas build -p android --profile preview
```

Selama pengembangan cukup `npx expo start` dan buka lewat Expo Go. Build EAS dilakukan setelah semua bagian digabung.

## 13. Skenario demo (harus berjalan mulus)

1. Buka aplikasi lalu pilih peran **Assistant** (Kak Rina), dengan form pilih peran dan identitas.
2. Lihat jadwal lalu buka detail sesi **sess1** (status: Belum dibuka).
3. Tekan **Buka sesi** lalu muncul modal konfirmasi lalu **Ya**. Status berubah menjadi **Dibuka** dan rekap tampil kosong.
4. **Ganti peran** menjadi **Student** (Andi) lalu buka detail **sess1** lalu tombol presensi aktif.
5. Tekan **Presensi** lalu muncul umpan balik "Presensi berhasil dicatat pukul HH:MM". Tombol berubah menjadi "sudah tercatat".
6. Coba presensi lagi lalu ditolak dengan pesan "sudah tercatat". Tidak ada data ganda.
7. Buka tab **Riwayat** lalu presensi sess1 muncul beserta waktunya.
8. **Ganti peran** menjadi **Assistant** lalu buka sess1 lalu daftar hadir menampilkan Andi beserta jamnya.
9. Tekan **Tutup sesi** lalu muncul modal konfirmasi lalu **Ya**. Status berubah menjadi **Ditutup**.
10. Ganti ke Student lalu buka sess1 lalu presensi tidak bisa dilakukan, dengan info "sesi sudah ditutup".

## 14. Daftar periksa per orang (Definition of Done)

### Maulana (SRS-01 sampai 05)
- [ ] Form pilih peran dan identitas dari data dummy (01)
- [ ] Daftar jadwal tampil dengan `StatusBadge` (02)
- [ ] Detail sesi memuat `course`, `room`, waktu, dan status (03)
- [ ] Jadwal kosong menampilkan `EmptyState` (04)
- [ ] Tap kartu jadwal membuka `SessionDetail` (05)
- [ ] `SessionDetailScreen` sudah memasang `SessionControl`, `AttendanceList`, `CheckInPanel` sesuai peran

### Jordan (SRS-06 sampai 09)
- [ ] Tombol **Buka sesi** hanya muncul pada status `not_open` (06)
- [ ] Tombol **Tutup sesi** hanya muncul pada status `open` (07)
- [ ] Status di layar langsung berubah setelah buka/tutup (08)
- [ ] Buka dan tutup selalu lewat `ConfirmModal` (09)
- [ ] Sesi `closed` tidak menampilkan tombol buka/tutup (hanya info)

### Hasta (SRS-10 sampai 14)
- [ ] Tombol presensi aktif hanya saat status `open` (10)
- [ ] Waktu hadir tercatat lewat `checkIn` (11)
- [ ] Check-in kedua di sesi yang sama ditolak (12)
- [ ] Umpan balik berhasil/gagal tampil (misalnya Alert atau banner), memakai `CHECK_IN_*` messages (13)
- [ ] Info alasan tampil saat sesi belum dibuka, sudah ditutup, atau sudah check-in (14)

### Hanif (SRS-15 sampai 17)
- [ ] `AttendanceList` menampilkan nama student dan jam hadir untuk assistant (15)
- [ ] `AttendanceHistoryScreen` menampilkan catatan milik student yang sedang aktif (16)
- [ ] Daftar hadir kosong menampilkan `EmptyState` (17)
- [ ] Riwayat kosong menampilkan `EmptyState`

## 15. Template prompt untuk AI (salin dan tempel)

> Saya anggota tim proyek LabCheckIn (React Native, Expo, TypeScript). Berikut dokumen kesepakatan tim kami: [tempel dokumen ini]. Saya mengerjakan bagian **[nama bagian]** (SRS-[nomor]) dengan file milik saya: **[daftar file]**. Tolong tulis kode hanya untuk file milik saya, ikuti tipe data, nama fungsi, tema, dan pesan teks di dokumen, dan pakai `useApp()` untuk state. Semua identifier, nama branch, dan commit message harus berbahasa Inggris. Jangan membuat state global baru dan jangan menambah library. Jika ada kebutuhan yang tidak tercakup dokumen, beri tahu saya dan jangan mengubah kontrak sendiri.

## 16. Hal yang masih perlu diputuskan tim

- [ ] Setuju dengan nama **LabCheckIn**?
- [ ] Setuju TypeScript (bukan JavaScript)?
- [ ] Siapa yang mengerjakan Langkah 0 (usulan: Jordan)?
- [ ] Siapa yang memegang akun Expo untuk build EAS?
- [ ] Tenggat internal untuk merge tiap bagian
