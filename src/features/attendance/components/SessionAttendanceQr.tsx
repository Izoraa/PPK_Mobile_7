import { Image } from "expo-image";
import { Bytes } from "firebase/firestore";
import encodeQR from "qr";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, shadows } from "@/theme";
import type { AppErrorCode } from "@/types";
import { getErrorMessage } from "@/utils/errors";

import { requestSessionAttendanceQr } from "../qrService";

type DisplayState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; imageUri: string; expiresAt: string; displayUntil: number }
  | { status: "expired" }
  | { status: "error"; message: string; retryable: boolean };

const qrErrorMessages: Partial<Record<AppErrorCode, string>> = {
  CLASS_ARCHIVED: "Kelas sudah diarsipkan.",
  SESSION_ARCHIVED: "Sesi sudah diarsipkan.",
  SESSION_CLOSED: "Sesi sudah ditutup.",
};

export function SessionAttendanceQr({ sessionId }: { sessionId: string }) {
  const [display, setDisplay] = useState<DisplayState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        request.current?.abort();
        setDisplay((current) =>
          current.status === "loading" || current.status === "ready" ? { status: "idle" } : current,
        );
      }
    });
    return () => {
      subscription.remove();
      request.current?.abort();
    };
  }, []);

  const displayUntil = display.status === "ready" ? display.displayUntil : null;
  useEffect(() => {
    if (displayUntil === null) return;

    const timeout = setTimeout(() => {
      setDisplay((current) =>
        current.status === "ready" && current.displayUntil === displayUntil
          ? { status: "expired" }
          : current,
      );
    }, Math.ceil(Math.max(0, displayUntil - performance.now())));

    return () => clearTimeout(timeout);
  }, [displayUntil]);

  const showImageError = () => {
    setDisplay({
      status: "error",
      message: "Kode QR presensi gagal ditampilkan.",
      retryable: true,
    });
  };

  const showQr = async () => {
    if (request.current) return;

    const controller = new AbortController();
    request.current = controller;
    setDisplay({ status: "loading" });

    try {
      const result = await requestSessionAttendanceQr(sessionId, controller.signal);
      if (controller.signal.aborted) return;

      if (!result.ok) {
        const { code, retryable } = result.error;
        setDisplay({
          status: "error",
          message: qrErrorMessages[code] ?? getErrorMessage(code),
          retryable,
        });
        return;
      }

      const { qrPayload, expiresAt, displayUntil } = result.data;
      if (displayUntil <= performance.now()) {
        setDisplay({ status: "expired" });
        return;
      }

      const gif = encodeQR(qrPayload, "gif", { border: 4, scale: 4 });
      const base64 = Bytes.fromUint8Array(gif).toBase64();
      setDisplay({
        status: "ready",
        imageUri: `data:image/gif;base64,${base64}`,
        expiresAt,
        displayUntil,
      });
    } catch {
      if (controller.signal.aborted) return;
      setDisplay({
        status: "error",
        message: "Pengambilan kode QR bermasalah.",
        retryable: true,
      });
    } finally {
      if (request.current === controller) {
        request.current = null;
      }
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Tiket Presensi QR Sesi
      </Text>
      <Text style={styles.subtitle}>
        Tampilkan kode QR dinamis ini kepada praktikan di dalam laboratorium untuk presensi kehadiran.
      </Text>

      {display.status === "ready" && (
        <View style={styles.qrContainer}>
          <View style={styles.qrFrame}>
            <Image
              accessibilityLabel="Kode QR presensi sesi"
              contentFit="contain"
              onError={showImageError}
              source={{ uri: display.imageUri }}
              style={styles.qrImage}
            />
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>
              Kode aktif hingga {new Date(display.expiresAt).toLocaleTimeString("id-ID")}
            </Text>
          </View>
        </View>
      )}

      {display.status === "expired" && (
        <View style={styles.expiredBox}>
          <Text style={styles.expiredText}>⏰ Masa aktif tiket QR telah berakhir. Perbarui untuk menampilkan tiket baru.</Text>
        </View>
      )}

      {display.status === "error" && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            ⚠️ {display.message}
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={display.status === "loading"}
        onPress={showQr}
        style={({ pressed }) => [
          styles.button,
          display.status === "loading" && styles.disabledButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {display.status === "loading"
            ? "Menyiapkan Kode QR…"
            : display.status === "ready"
              ? "Perbarui Kode QR"
              : "Tampilkan Kode QR Presensi"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  qrContainer: {
    alignItems: "center",
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  qrFrame: {
    padding: spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeBadgeText: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: "700",
  },
  expiredBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  expiredText: {
    color: colors.warningText,
    fontSize: 13,
    fontWeight: "600",
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
