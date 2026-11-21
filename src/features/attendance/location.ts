import * as Location from 'expo-location';

const LOCATION_TIMEOUT_MS = 20_000;
const LOCATION_UNAVAILABLE = 'Lokasi perangkat belum dapat diperoleh. Aktifkan layanan lokasi dan coba lagi.';

type AttendanceLocationResult =
  | { ok: true; location: { latitude: number; longitude: number; accuracyMeters: number } }
  | { ok: false; message: string };

async function getForegroundLocation(isStopped: () => boolean): Promise<AttendanceLocationResult> {
  if (!(await Location.hasServicesEnabledAsync())) {
    return { ok: false, message: 'Layanan lokasi tidak aktif atau tidak tersedia. Aktifkan lokasi lalu coba lagi.' };
  }
  if (isStopped()) return { ok: false, message: LOCATION_UNAVAILABLE };

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, message: 'Izin lokasi diperlukan untuk presensi. Izinkan akses lokasi di pengaturan perangkat atau situs.' };
  }
  if (isStopped()) return { ok: false, message: LOCATION_UNAVAILABLE };

  // The SDK's web adapter forwards maximumAge to browser geolocation.
  const options = { accuracy: Location.Accuracy.High, timeInterval: 0, maximumAge: 0, mayShowUserSettingsDialog: false };
  const { coords: { latitude, longitude, accuracy } } = await Location.getCurrentPositionAsync(options);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return { ok: false, message: LOCATION_UNAVAILABLE };
  }
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0) {
    return { ok: false, message: 'Akurasi lokasi belum tersedia. Aktifkan lokasi presisi lalu coba lagi.' };
  }

  return { ok: true, location: { latitude, longitude, accuracyMeters: accuracy } };
}

export async function readAttendanceLocation(signal: AbortSignal): Promise<AttendanceLocationResult> {
  if (signal.aborted) return { ok: false, message: LOCATION_UNAVAILABLE };

  let stopped = false;
  let stop = () => {};
  const deadline = new Promise<AttendanceLocationResult>((resolve) => {
    stop = () => {
      stopped = true;
      resolve({ ok: false, message: 'Waktu pengambilan lokasi habis. Coba lagi.' });
    };
  });
  const timeout = setTimeout(stop, LOCATION_TIMEOUT_MS);
  signal.addEventListener('abort', stop, { once: true });

  try {
    return await Promise.race([deadline, getForegroundLocation(() => stopped)]);
  } catch {
    return { ok: false, message: LOCATION_UNAVAILABLE };
  } finally {
    signal.removeEventListener('abort', stop);
    clearTimeout(timeout);
  }
}
