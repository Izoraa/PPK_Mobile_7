import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type ScanState =
  | { status: 'idle' | 'scanning' | 'camera-error' }
  | { status: 'scanned'; payload: string };

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

export function StudentQrScanner() {
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
    if (type !== 'qr' || !data) return;
    setScan((current) => current.status === 'scanning' ? { status: 'scanned', payload: data } : current);
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

  const scanned = scan.status === 'scanned';
  const cameraError = scan.status === 'camera-error';
  return (
    <View style={styles.content}>
      {scanned && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          Kode QR dipindai. Presensi belum tercatat.
        </Text>
      )}
      {cameraError && (
        <Text accessibilityRole="alert" style={styles.body}>Kamera tidak dapat dibuka. Coba lagi.</Text>
      )}
      <ScannerButton label={scanned ? 'Pindai Ulang' : 'Buka Kamera'} onPress={startScan} />
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
