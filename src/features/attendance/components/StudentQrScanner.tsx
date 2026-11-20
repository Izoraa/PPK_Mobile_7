import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { getErrorMessage } from '@/utils/errors';

import { checkSessionQrPayload } from '../qrPayload';
import { verifySessionAttendanceQr, type QrVerificationErrorCode } from '../qrService';

type ScanState =
  | { status: 'idle' | 'scanning' | 'camera-error' | 'verified' }
  | { status: 'verifying'; payload: string }
  | { status: 'retryable-error'; payload: string; message: string }
  | { status: 'rejected'; message: string };

const sessionMismatchMessage = 'Kode QR ini untuk sesi praktikum lain.';

function getVerificationMessage(code: QrVerificationErrorCode): string {
  switch (code) {
    case 'QR_INVALID':
      return 'Kode QR presensi tidak valid atau sudah diganti. Pindai kode terbaru dari asisten.';
    case 'QR_SESSION_MISMATCH':
      return sessionMismatchMessage;
    case 'QR_EXPIRED':
      return 'Kode QR sudah kedaluwarsa. Minta kode baru kepada asisten.';
    case 'RATE_LIMITED':
      return 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
    default:
      return getErrorMessage(code);
  }
}

function ScannerButton({ label, onPress, disabled = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabledButton]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function StudentQrScanner({ sessionId }: { sessionId: string }) {
  const [permission, requestPermission, getPermission] = useCameraPermissions({ get: false });
  const [scan, setScan] = useState<ScanState>({ status: 'idle' });
  const [requesting, setRequesting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [appActive, setAppActive] = useState(() =>
    !AppState.currentState || AppState.currentState === 'active',
  );

  const refreshPermission = useCallback(async () => {
    try {
      await getPermission();
      setPermissionError(null);
    } catch {
      setPermissionError('Status izin kamera belum dapat diperiksa.');
    }
  }, [getPermission]);

  useEffect(() => {
    void refreshPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state === 'active') void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const pendingScan = scan.status === 'verifying' ? scan : null;
  useEffect(() => {
    if (!pendingScan) return;

    const controller = new AbortController();
    void verifySessionAttendanceQr(sessionId, pendingScan.payload, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      setScan((current) => {
        if (current !== pendingScan) return current;
        if (result.ok) return { status: 'verified' };

        const message = getVerificationMessage(result.error.code);
        return result.error.retryable
          ? { status: 'retryable-error', payload: pendingScan.payload, message }
          : { status: 'rejected', message };
      });
    });

    return () => controller.abort();
  }, [pendingScan, sessionId]);

  const startScan = async () => {
    if (!permission || requesting) return;
    if (permission.granted) {
      setScan({ status: 'scanning' });
      return;
    }
    if (!permission.canAskAgain) return;

    setRequesting(true);
    try {
      const result = await requestPermission();
      if (result.granted) setScan({ status: 'scanning' });
    } catch {
      setPermissionError('Izin kamera belum dapat diminta.');
    } finally {
      setRequesting(false);
    }
  };

  const capture = ({ type, data }: BarcodeScanningResult) => {
    if (type !== 'qr') return;
    setScan((current) => {
      if (current.status !== 'scanning') return current;

      const result = checkSessionQrPayload(data, sessionId);
      return result === 'matching'
        ? { status: 'verifying', payload: data }
        : {
          status: 'rejected',
          message: result === 'session-mismatch' ? sessionMismatchMessage : 'Format kode QR presensi tidak valid.',
        };
    });
  };

  if (permissionError) {
    return (
      <View style={styles.content}>
        <Text accessibilityRole="alert" style={styles.body}>{permissionError}</Text>
        <ScannerButton label="Coba Lagi" onPress={refreshPermission} />
      </View>
    );
  }

  if (!permission) {
    return <ActivityIndicator accessibilityLabel="Memeriksa izin kamera" color={colors.primary} />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;
    const web = Platform.OS === 'web';

    return (
      <View style={styles.content}>
        <Text style={styles.body}>
          {canAskAgain
            ? 'Izinkan akses kamera untuk memindai kode QR dari asisten.'
            : web
              ? 'Aktifkan izin kamera di pengaturan situs pada peramban.'
              : 'Aktifkan izin kamera untuk aplikasi ini di Pengaturan perangkat.'}
        </Text>
        {canAskAgain ? (
          <ScannerButton label="Izinkan Kamera" onPress={startScan} disabled={requesting} />
        ) : (
          <ScannerButton
            label={web ? 'Periksa Izin Lagi' : 'Buka Pengaturan'}
            onPress={web ? refreshPermission : () => {
              void Linking.openSettings().catch(() => {
                setPermissionError('Pengaturan tidak dapat dibuka. Buka Pengaturan perangkat untuk mengizinkan kamera.');
              });
            }}
          />
        )}
      </View>
    );
  }

  if (scan.status === 'scanning') {
    return (
      <View style={styles.content}>
        <Text style={styles.body}>Arahkan kamera ke kode QR presensi dari asisten.</Text>
        {appActive && (
          <CameraView
            accessibilityLabel="Kamera pemindai kode QR"
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={capture}
            onMountError={() => setScan((current) =>
              current.status === 'scanning' ? { status: 'camera-error' } : current,
            )}
          />
        )}
        <ScannerButton label="Tutup Kamera" onPress={() => setScan({ status: 'idle' })} />
      </View>
    );
  }

  if (scan.status === 'verifying') {
    return (
      <View style={styles.content}>
        <ActivityIndicator accessibilityLabel="Memverifikasi kode QR" color={colors.primary} />
        <Text style={styles.body}>Memverifikasi kode QR…</Text>
      </View>
    );
  }

  const verified = scan.status === 'verified';
  const failed = scan.status === 'rejected' || scan.status === 'retryable-error';
  const cameraError = scan.status === 'camera-error';
  return (
    <View style={styles.content}>
      {verified && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          Kode QR terverifikasi. Presensi belum tercatat.
        </Text>
      )}
      {failed && (
        <Text accessibilityRole="alert" style={styles.body}>{scan.message}</Text>
      )}
      {scan.status === 'retryable-error' && (
        <ScannerButton
          label="Coba Verifikasi Lagi"
          onPress={() => setScan((current) => current.status === 'retryable-error'
            ? { status: 'verifying', payload: current.payload }
            : current)}
        />
      )}
      {cameraError && (
        <Text accessibilityRole="alert" style={styles.body}>Kamera tidak dapat dibuka. Coba lagi.</Text>
      )}
      <ScannerButton label={verified || failed ? 'Pindai Ulang' : 'Buka Kamera'} onPress={startScan} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, marginTop: spacing.sm },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  camera: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.text,
  },
  button: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  disabledButton: { opacity: 0.65 },
  buttonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
