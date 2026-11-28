import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, shadows, spacing } from "@/theme";

import {
  AttendanceFailureCard,
  LocationServiceAlert,
  PermissionPromptCard,
  type FailureReason,
} from "@/features/permissions";
import { readAttendanceLocation } from "../location";
import { checkSessionQrPayload } from "../qrPayload";
import {
  getAttendanceApiErrorMessage,
  requestSessionAttendanceCheckIn,
  verifySessionAttendanceQr,
} from "../qrService";

type ScanState =
  | { status: "idle" | "scanning" | "camera-error" }
  | { status: "verifying"; payload: string }
  | { status: "retryable-error"; payload: string; message: string }
  | { status: "location-ready"; payload: string; message?: string }
  | { status: "reading-location" | "submitting" }
  | { status: "submitted-error"; message: string }
  | { status: "rejected"; message: string };

function ScannerButton({
  label,
  onPress,
  disabled = false,
}: {
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
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function StudentQrScanner({
  sessionId,
  onConfirmed,
}: {
  sessionId: string;
  onConfirmed: (checkedInAt: string) => void;
}) {
  const [permission, requestPermission, getPermission] = useCameraPermissions({
    get: false,
  });
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const [requesting, setRequesting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const checkInRequest = useRef<AbortController | null>(null);
  const [appActive, setAppActive] = useState(
    () => !AppState.currentState || AppState.currentState === "active",
  );

  const refreshPermission = useCallback(async () => {
    try {
      await getPermission();
      setPermissionError(null);
    } catch {
      setPermissionError("Status izin kamera belum dapat diperiksa.");
    }
  }, [getPermission]);

  useEffect(() => {
    void refreshPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
      if (state === "active") void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  useEffect(
    () => () => {
      checkInRequest.current?.abort();
      checkInRequest.current = null;
    },
    [sessionId],
  );

  const pendingScan = scan.status === "verifying" ? scan : null;
  useEffect(() => {
    if (!pendingScan) return;

    const controller = new AbortController();
    void verifySessionAttendanceQr(
      sessionId,
      pendingScan.payload,
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;

      setScan((current) => {
        if (current !== pendingScan) return current;
        if (result.ok) {
          return { status: "location-ready", payload: pendingScan.payload };
        }

        const message = getAttendanceApiErrorMessage(result.error.code);
        return result.error.retryable
          ? { status: "retryable-error", payload: pendingScan.payload, message }
          : { status: "rejected", message };
      });
    });

    return () => controller.abort();
  }, [pendingScan, sessionId]);

  const submitAttendance = async () => {
    if (
      scan.status !== "location-ready" ||
      !appActive ||
      checkInRequest.current
    )
      return;

    const { payload } = scan;
    const controller = new AbortController();
    const { signal } = controller;
    checkInRequest.current = controller;
    setScan({ status: "reading-location" });

    try {
      const reading = await readAttendanceLocation(signal);
      if (signal.aborted) return;
      if (!reading.ok) {
        setScan({
          status: "location-ready",
          payload,
          message: reading.message,
        });
        return;
      }
      if (AppState.currentState && AppState.currentState !== "active") {
        setScan({
          status: "location-ready",
          payload,
          message: "Buka kembali aplikasi dan coba ambil lokasi lagi.",
        });
        return;
      }

      setScan({ status: "submitting" });
      const result = await requestSessionAttendanceCheckIn(
        {
          sessionId,
          qrPayload: payload,
          location: reading.location,
        },
        signal,
      );
      if (signal.aborted) return;

      console.log(result);

      if (result.ok) {
        onConfirmed(result.data.checkedInAt);
      } else {
        const { code, message, retryable } = result.error;
        const feedback =
          code === "NETWORK_ERROR" || code === "SERVICE_UNAVAILABLE"
            ? `${message} Status presensi belum dapat dikonfirmasi.`
            : message;
        setScan(
          retryable
            ? { status: "location-ready", payload, message: feedback }
            : { status: "submitted-error", message: feedback },
        );
      }
    } finally {
      if (checkInRequest.current === controller) {
        checkInRequest.current = null;
      }
    }
  };

  const startScan = async () => {
    if (requesting) return;
    if (!permission?.granted) {
      setRequesting(true);
      try {
        const next = await requestPermission();
        if (!next.granted) {
          setScan({ status: "idle" });
          return;
        }
      } finally {
        setRequesting(false);
      }
    }
    setScan({ status: "scanning" });
  };

  const onBarcodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (type !== "qr") return;
    setScan((current) => {
      if (current.status !== "scanning") return current;

      const result = checkSessionQrPayload(data, sessionId);
      return result === "matching"
        ? { status: "verifying", payload: data }
        : {
            status: "rejected",
            message:
              result === "session-mismatch"
                ? getAttendanceApiErrorMessage("QR_SESSION_MISMATCH")
                : "Format kode QR presensi tidak valid.",
          };
    });
  };

  // 1. Izin Kamera Ditolak / Belum Diberikan (S3-SRS-29 & S3-SRS-32)
  if (!permission?.granted) {
    return (
      <View style={styles.content}>
        <PermissionPromptCard
          type="camera"
          canAskAgain={permission?.canAskAgain !== false}
          onRequestPermission={startScan}
        />
        {permissionError ? (
          <Text style={styles.errorText}>⚠️ {permissionError}</Text>
        ) : null}
      </View>
    );
  }

  // 2. Kamera Sedang Aktif Memindai QR (S3-SRS-29)
  if (scan.status === "scanning") {
    return (
      <View style={styles.content}>
        <View style={styles.cameraBox}>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            style={styles.camera}
          />
        </View>
        <Text style={styles.helperText}>
          Arahkan kamera ke kode QR presensi yang ditampilkan asisten
        </Text>
        <ScannerButton
          label="Batal Pindai"
          onPress={() => setScan({ status: "idle" })}
        />
      </View>
    );
  }

  // 3. QR Berhasil Terbaca, Tahap Validasi Lokasi & GPS (S3-SRS-30, S3-SRS-33, S3-SRS-34)
  if (scan.status === "location-ready") {
    // 3a. Kasus GPS Perangkat Mati (S3-SRS-33)
    if (scan.message?.includes("Layanan lokasi tidak aktif")) {
      return (
        <View style={styles.content}>
          <LocationServiceAlert onRetry={submitAttendance} />
          <ScannerButton label="Pindai Ulang QR" onPress={startScan} />
        </View>
      );
    }

    // 3b. Kasus Izin Lokasi Ditolak (S3-SRS-30 & S3-SRS-32)
    if (scan.message?.includes("Izin lokasi diperlukan")) {
      return (
        <View style={styles.content}>
          <PermissionPromptCard
            type="location"
            canAskAgain={false}
            onRequestPermission={submitAttendance}
            onCancel={() => setScan({ status: "idle" })}
          />
        </View>
      );
    }
    return (
      <View style={styles.content}>
        <View style={styles.successCard}>
          <Text style={styles.promptTitle}>Kode QR Terverifikasi</Text>
          <Text style={styles.body}>
            Lanjutkan untuk memverifikasi lokasi dan mencatat kehadiran Anda.
          </Text>
          {scan.message ? (
            <Text style={styles.errorText}>{scan.message}</Text>
          ) : null}
          <ScannerButton
            label="Kirim Presensi Sekarang"
            onPress={submitAttendance}
          />
        </View>
      </View>
    );
  }

  if (
    scan.status === "verifying" ||
    scan.status === "reading-location" ||
    scan.status === "submitting"
  ) {
    const label =
      scan.status === "verifying"
        ? "Memverifikasi tiket QR…"
        : scan.status === "reading-location"
          ? "Memeriksa lokasi kehadiran…"
          : "Mencatat presensi ke server…";
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator
          accessibilityLabel={label}
          color={colors.primary}
          size="large"
        />
        <Text style={styles.loadingLabel}>{label}</Text>
      </View>
    );
  }

  if (
    scan.status === "rejected" ||
    scan.status === "retryable-error" ||
    scan.status === "submitted-error"
  ) {
    const isNetwork =
      scan.message?.toLowerCase().includes("koneksi") ||
      scan.message?.toLowerCase().includes("jaringan");
    const isLocation = scan.message?.toLowerCase().includes("lokasi");
    const failureReason: FailureReason = isNetwork
      ? "network"
      : isLocation
        ? "location_failed"
        : "qr_invalid";

    return (
      <View style={styles.content}>
        <AttendanceFailureCard
          reason={failureReason}
          customMessage={scan.message}
          onRetry={
            scan.status === "retryable-error"
              ? () =>
                  setScan((curr) =>
                    curr.status === "retryable-error"
                      ? { status: "verifying", payload: curr.payload }
                      : curr,
                  )
              : startScan
          }
          onCancel={() => setScan({ status: "idle" })}
        />
      </View>
    );
  }
  const cameraError = scan.status === "camera-error";
  return (
    <View style={styles.content}>
      {cameraError && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            Kamera tidak dapat dibuka. Silakan coba lagi.
          </Text>
        </View>
      )}
      <ScannerButton label="Buka Kamera Pindai QR" onPress={startScan} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, marginTop: spacing.sm },
  cameraBox: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
  },
  camera: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    aspectRatio: 1,
    backgroundColor: colors.text,
  },
  helperText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
  button: {
    alignSelf: "flex-start",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.85 },
  disabledButton: { opacity: 0.65 },
  buttonLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  successCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
    gap: spacing.sm,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: { color: colors.dangerText, fontSize: 13, fontWeight: "600" },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
