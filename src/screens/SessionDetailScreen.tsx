import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionAttendanceQr } from "@/features/attendance/components/SessionAttendanceQr";
import { SessionLeaveReviewList } from "@/features/leave-review/components/SessionLeaveReviewList";
import { subscribeSession, type SessionDoc } from "@/features/practicum";
import type { AppErrorCode } from "@/types";
import { AsyncState } from "../components/common/AsyncState";
import { StatusBadge } from "../components/common/StatusBadge";
import { AttendanceList } from "../components/session/AttendanceList";
import { SessionControl } from "../components/session/SessionControl";
import { useApp } from "../state/AppContext";
import { colors, radius, spacing } from "../theme";
import { formatDate } from "../utils/format";
import { StudentSessionActions } from "./StudentSessionActions";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [liveSession, setLiveSession] = useState<SessionDoc | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<{
    code: AppErrorCode;
    retryable: boolean;
  } | null>(null);
  const [metadata, setMetadata] = useState({
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!sessionId || typeof sessionId !== "string") {
      setLiveSession(null);
      setStatus("ready");
      return;
    }

    const unsubscribe = subscribeSession(
      sessionId,
      (doc) => {
        setLiveSession(doc);
        setStatus("ready");
        setError(null);
      },
      (loadError) => {
        const code = "code" in loadError ? String(loadError.code) : "";
        const mapped =
          code === "permission-denied"
            ? { code: "FORBIDDEN" as const, retryable: false }
            : code === "unauthenticated"
              ? { code: "UNAUTHENTICATED" as const, retryable: false }
              : code === "unavailable" || code === "deadline-exceeded"
                ? { code: "NETWORK_ERROR" as const, retryable: true }
                : { code: "SERVICE_UNAVAILABLE" as const, retryable: true };
        setError(mapped);
        setStatus("error");
      },
      setMetadata,
    );

    return () => unsubscribe();
  }, [sessionId, attempt]);

  if (!currentUser) return null;

  let sessionData: {
    id: string;
    course: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "not_open" | "open" | "closed";
    assistantId: string;
  } | null = null;

  if (liveSession) {
    let dateStr = "-";
    let startStr = "-";
    let endStr = "-";
    if (liveSession.startsAt?.toDate) {
      const s = liveSession.startsAt.toDate();
      dateStr = s.toISOString().split("T")[0];
      startStr = s.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (liveSession.endsAt?.toDate) {
      const e = liveSession.endsAt.toDate();
      endStr = e.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    sessionData = {
      id: liveSession.id,
      course: liveSession.title,
      room: liveSession.room,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      status: liveSession.status,
      assistantId: liveSession.assistantId,
    };
  }

  const session =
    currentUser.role === "assistant" &&
    sessionData?.assistantId !== currentUser.id
      ? null
      : sessionData;

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Link href="/" dismissTo asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonLabel}>Kembali ke jadwal</Text>
            </Pressable>
          </Link>

          {currentUser.role === "assistant" && session && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push(`/(assistant)/sessions/${session.id}/edit` as any)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Ubah / Arsipkan Sesi</Text>
            </TouchableOpacity>
          )}
        </View>

        <AsyncState
          status={status === "ready" && !session ? "empty" : status}
          error={error}
          fromCache={metadata.fromCache}
          hasPendingWrites={metadata.hasPendingWrites}
          onRetry={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
          emptyTitle="Sesi tidak ditemukan"
          emptyMessage="Silakan kembali ke jadwal untuk memilih sesi yang tersedia."
        >
          {session ? (
            <>
              <View style={styles.details}>
                <Text accessibilityRole="header" style={styles.title}>
                  {session.course}
                </Text>
                <Text style={styles.label}>Laboratorium / ruang kelas</Text>
                <Text style={styles.value}>{session.room}</Text>
                <Text style={styles.label}>Tanggal</Text>
                <Text style={styles.value}>{formatDate(session.date)}</Text>
                <View style={styles.times}>
                  <View style={styles.time}>
                    <Text style={styles.label}>Waktu mulai</Text>
                    <Text style={styles.value}>{session.startTime}</Text>
                  </View>
                  <View style={styles.time}>
                    <Text style={styles.label}>Waktu selesai</Text>
                    <Text style={styles.value}>{session.endTime}</Text>
                  </View>
                </View>
                <Text style={styles.label}>Status sesi</Text>
                <StatusBadge status={session.status} />
              </View>

              {currentUser.role === "assistant" && (
                <>
                  <SessionControl sessionId={session.id} />
                  {liveSession?.status === "open" &&
                    liveSession.id === sessionId &&
                    !liveSession.isArchived &&
                    !metadata.fromCache &&
                    !metadata.hasPendingWrites && (
                      <SessionAttendanceQr key={session.id} sessionId={session.id} />
                    )}
                  <AttendanceList sessionId={session.id} />
                  <SessionLeaveReviewList sessionId={session.id} />
                </>
              )}
              {currentUser.role === "student" && (
                <StudentSessionActions
                  sessionId={session.id}
                  sessionTitle={liveSession?.title ?? session.course}
                  sessionIsLive={liveSession?.id === session.id}
                />
              )}
            </>
          ) : null}
        </AsyncState>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonLabel: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  editButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  editButtonText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  details: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: colors.text, fontSize: 16 },
  times: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  time: { gap: spacing.sm },
});
