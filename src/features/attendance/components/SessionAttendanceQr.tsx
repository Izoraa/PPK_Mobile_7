import { Image } from "expo-image";
import { Bytes } from "firebase/firestore";
import encodeQR from "qr";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme";
import type { AppErrorCode } from "@/types";
import { getErrorMessage } from "@/utils/errors";

import { requestSessionAttendanceQr } from "../qrService";

type DisplayState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; imageUri: string }
  | { status: "error"; message: string; retryable: boolean };

const qrErrorMessages: Partial<Record<AppErrorCode, string>> = {
  CLASS_ARCHIVED: "Kelas sudah diarsipkan.",
  SESSION_ARCHIVED: "Sesi sudah diarsipkan.",
  SESSION_CLOSED: "Sesi sudah ditutup.",
};

export function SessionAttendanceQr({ sessionId }: { sessionId: string }) {
  const [display, setDisplay] = useState<DisplayState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

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

      const gif = encodeQR(result.data.qrPayload, "gif", { border: 4, scale: 4 });
      const base64 = Bytes.fromUint8Array(gif).toBase64();
      setDisplay({ status: "ready", imageUri: `data:image/gif;base64,${base64}` });
    } catch {
      if (!controller.signal.aborted) showImageError();
    } finally {
      request.current = null;
    }
  };

  const loading = display.status === "loading";

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Kode QR Presensi
      </Text>
      {display.status === "ready" ? (
        <Image
          accessible
          accessibilityLabel="Kode QR presensi untuk sesi ini"
          source={{ uri: display.imageUri }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="none"
          onError={showImageError}
        />
      ) : (
        <>
          {display.status === "error" && (
            <Text accessibilityRole="alert" style={styles.message}>
              {display.message}
            </Text>
          )}
          {(display.status !== "error" || display.retryable) && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={showQr}
              style={[styles.button, loading && styles.disabledButton]}
            >
              <Text style={styles.buttonLabel}>
                {loading ? "Memuat kode QR…" : "Tampilkan Kode QR"}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  image: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 248,
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
  },
  message: { color: colors.textMuted, fontSize: 14 },
  button: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
  },
  disabledButton: { opacity: 0.65 },
  buttonLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
