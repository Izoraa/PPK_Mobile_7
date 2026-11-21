import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
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
import { colors, radius, spacing, shadows } from "../theme";
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
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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
              <Text style={styles.buttonLabel}>← Kembali ke jadwal</Text>
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
                <View style={styles.detailsHeader}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {session.course}
                  </Text>
                  <StatusBadge status={session.status} />
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoTile}>
                    <Text style={styles.label}>Laboratorium / Ruang</Text>
                    <Text style={styles.value}>{session.room}</Text>
                  </View>
                  <View style={styles.infoTile}>
                    <Text style={styles.label}>Tanggal</Text>
                    <Text style={styles.value}>{formatDate(session.date)}</Text>
                  </View>
                  <View style={styles.infoTile}>
                    <Text style={styles.label}>Waktu Mulai</Text>
                    <Text style={styles.value}>{session.startTime}</Text>
                  </View>
                  <View style={styles.infoTile}>
                    <Text style={styles.label}>Waktu Selesai</Text>
                    <Text style={styles.value}>{session.endTime}</Text>
                  </View>
                </View>
              </View>
              {currentUser.role === "assistant" && (
                <>
                  <SessionControl sessionId={session.id} />
                  {liveSession?.status === "open" &&
                    liveSession.id === sessionId &&
                    !liveSession.isArchived &&
                    !metadata.fromCache &&
                    !metadata.hasPendingWrites && (
                      <SessionAttendanceQr
                        key={session.id}
                        sessionId={session.id}
                      />
                    )}
                  {/* 1. Card Ringkasan Sesi */}
                  <AttendanceList sessionId={session.id} onlySummary />

                  {/* 2. Dua Tombol Bersebelahan */}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.attendanceBtn]}
                      onPress={() => setShowAttendanceModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>Daftar Hadir</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.leaveBtn]}
                      onPress={() => setShowLeaveModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionBtnText, styles.leaveBtnText]}>Daftar Izin</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 3. Bottom Sheet: Daftar Praktikan Hadir */}
                  <Modal
                    visible={showAttendanceModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowAttendanceModal(false)}
                  >
                    <View style={styles.sheetBackdrop}>
                      <Pressable
                        style={styles.sheetDismissArea}
                        onPress={() => setShowAttendanceModal(false)}
                      />
                      <View style={styles.bottomSheet}>
                        <View style={styles.handleBar} />
                        <View style={styles.sheetHeader}>
                          <Text style={styles.sheetTitle}>
                            Daftar Praktikan Hadir
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowAttendanceModal(false)}
                            style={styles.sheetCloseButton}
                          >
                            <Text style={styles.sheetCloseText}>Tutup</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.sheetBody}>
                          <AttendanceList sessionId={session.id} hideSummary />
                        </View>
                      </View>
                    </View>
                  </Modal>

                  {/* 4. Bottom Sheet: Daftar Pengajuan Izin */}
                  <Modal
                    visible={showLeaveModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowLeaveModal(false)}
                  >
                    <View style={styles.sheetBackdrop}>
                      <Pressable
                        style={styles.sheetDismissArea}
                        onPress={() => setShowLeaveModal(false)}
                      />
                      <View style={styles.bottomSheet}>
                        <View style={styles.handleBar} />
                        <View style={styles.sheetHeader}>
                          <Text style={styles.sheetTitle}>
                            Pengajuan Izin Sesi
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowLeaveModal(false)}
                            style={styles.sheetCloseButton}
                          >
                            <Text style={styles.sheetCloseText}>Tutup</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView
                          style={styles.sheetBody}
                          contentContainerStyle={{ paddingBottom: spacing.lg }}
                        >
                          <SessionLeaveReviewList sessionId={session.id} />
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
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
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  buttonLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  editButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C7D7FE',
    backgroundColor: colors.primaryLight,
  },
  editButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  details: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoTile: {
    backgroundColor: colors.neutralBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "500", marginBottom: 2 },
  value: { color: colors.text, fontSize: 15, fontWeight: "600" },
  times: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  time: { gap: spacing.sm },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  attendanceBtn: {
    backgroundColor: colors.primary,
  },
  leaveBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  leaveBtnText: {
    color: colors.primary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 40, 0.55)",
    justifyContent: "flex-end",
  },
  sheetDismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    height: "75%",
    maxHeight: "88%",
    minHeight: 350,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    ...shadows.lg,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sheetCloseButton: {
    padding: spacing.xs,
  },
  sheetCloseText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  sheetBody: {
    flex: 1,
    width: "100%",
  },
});
