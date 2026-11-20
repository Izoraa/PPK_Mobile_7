import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AsyncState } from "@/components/common/AsyncState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TabBarDivider } from "@/components/TabBarDivider";
import CoordinatorDashboard from "@/features/coordinator/components/CoordinatorDashboard";
import {
  subscribeClasses,
  subscribeSessions,
  type ClassDoc,
  type SessionDoc,
} from "@/features/practicum";
import { useApp } from "@/state/AppContext";
import { colors, radius, spacing } from "@/theme";
import type { AppErrorCode } from "@/types";

type LoadStatus = "loading" | "ready" | "error";
type DataMetadata = { fromCache: boolean; hasPendingWrites: boolean };

function safeError(error: Error): { code: AppErrorCode; retryable: boolean } {
  const code = "code" in error ? String(error.code) : "";
  if (code === "permission-denied")
    return { code: "FORBIDDEN", retryable: false };
  if (code === "unauthenticated")
    return { code: "UNAUTHENTICATED", retryable: false };
  if (code === "unavailable" || code === "deadline-exceeded") {
    return { code: "NETWORK_ERROR", retryable: true };
  }
  return { code: "SERVICE_UNAVAILABLE", retryable: true };
}

function formatSessionSchedule(startsAt: any, endsAt: any) {
  if (!startsAt) return "";
  const start = startsAt?.toDate ? startsAt.toDate() : new Date(startsAt);
  const end = endsAt?.toDate ? endsAt.toDate() : new Date(endsAt);
  const dateStr = start.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startTime = start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const endTime = end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateStr}, ${startTime} - ${endTime}`;
}

export default function ScheduleScreen() {
  const { currentUser } = useApp();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<{
    code: AppErrorCode;
    retryable: boolean;
  } | null>(null);
  const [metadata, setMetadata] = useState<DataMetadata>({
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!currentUser) {
      setClasses([]);
      setSessions([]);
      setStatus("ready");
      return;
    }

    let active = true;
    let failed = false;
    setStatus("loading");
    setError(null);

    const onFailure = (loadError: Error) => {
      if (!active || failed) return;
      failed = true;
      setError(safeError(loadError));
      setStatus("error");
    };

    // TAMPILAN ASISTEN: Subscribe ke kelas yang diampu + sesi dari seluruh kelas tersebut
    if (currentUser.role === "assistant") {
      let unsubSessions: Array<() => void> = [];
      const sessionLists = new Map<string, SessionDoc[]>();

      const unsubClasses = subscribeClasses(
        { assistantId: currentUser.id, includeArchived: false },
        (classList) => {
          if (!active) return;
          unsubSessions.forEach((unsubscribe) => unsubscribe());
          unsubSessions = [];
          sessionLists.clear();
          setClasses(classList);

          if (classList.length === 0) {
            setSessions([]);
            setStatus("ready");
            return;
          }

          // Kelas sudah didapat, set status ready agar kelas langsung tampil
          setStatus("ready");

          // Subscribe ke sesi dari setiap kelas untuk ringkasan jadwal sesi aktif/mendatang
          classList.forEach((practicumClass) => {
            const unsubscribe = subscribeSessions(
              practicumClass.id,
              (classSessions) => {
                if (!active || failed) return;
                sessionLists.set(practicumClass.id, classSessions);
                setSessions([...sessionLists.values()].flat());
              },
              onFailure,
              (snapshotMetadata) => {
                if (!active || failed) return;
                setMetadata(snapshotMetadata);
              },
            );
            unsubSessions.push(unsubscribe);
          });
        },
        onFailure,
        (snapshotMetadata) => {
          if (!active || failed) return;
          setMetadata(snapshotMetadata);
        },
      );

      return () => {
        active = false;
        unsubClasses();
        unsubSessions.forEach((unsubscribe) => unsubscribe());
      };
    }

    // TAMPILAN MAHASISWA: Subscribe ke sesi kelas yang diikuti mahasiswa
    let unsubSessions: Array<() => void> = [];
    const sessionLists = new Map<string, SessionDoc[]>();

    const unsubClasses = subscribeClasses(
      { studentId: currentUser.id },
      (classList) => {
        if (!active) return;
        unsubSessions.forEach((unsubscribe) => unsubscribe());
        unsubSessions = [];
        sessionLists.clear();
        setClasses(classList);

        if (classList.length === 0) {
          setSessions([]);
          setStatus("ready");
          return;
        }

        // Kelas sudah didapat, set status ready agar kelas langsung tampil
        setStatus("ready");

        // Subscribe ke sesi dari setiap kelas untuk ringkasan jadwal sesi aktif/mendatang
        classList.forEach((practicumClass) => {
          const unsubscribe = subscribeSessions(
            practicumClass.id,
            (classSessions) => {
              if (!active || failed) return;
              sessionLists.set(practicumClass.id, classSessions);
              setSessions([...sessionLists.values()].flat());
            },
            onFailure,
            (snapshotMetadata) => {
              if (!active || failed) return;
              setMetadata(snapshotMetadata);
            },
          );
          unsubSessions.push(unsubscribe);
        });
      },
      onFailure,
      (snapshotMetadata) => {
        if (!active || failed) return;
        setMetadata(snapshotMetadata);
      },
    );

    return () => {
      active = false;
      unsubClasses();
      unsubSessions.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser, attempt]);

  if (!currentUser) return null;

  const isAssistant = currentUser.role === "assistant";
  const detailPath = isAssistant
    ? "/(assistant)/assistant/sessions/[sessionId]"
    : "/(student)/sessions/[sessionId]";
  const sectionTitle = isAssistant
    ? "Daftar Kelas yang Diampu"
    : "Daftar Kelas yang Diikuti";
  const emptyTitle = isAssistant
    ? "Belum ada kelas aktif"
    : "Belum terdaftar di kelas praktikum";
  const emptyMessage = isAssistant
    ? "Buat kelas pertama Anda untuk memulai pengelolaan jadwal dan peserta praktikum."
    : "Anda belum terdaftar dalam kelas praktikum apa pun. Hubungi asisten praktikum Anda untuk mendaftarkan akun.";

  // Map classId -> ClassDoc untuk lookup nama kelas dan matkul
  const classMap = new Map<string, ClassDoc>(classes.map((c) => [c.id, c]));

  // Hitung sesi yang sedang dibuka dan sesi mendatang terdekat (maksimal 3 item gabungan)
  const now = Date.now();
  const openSessions = sessions
    .filter((s) => s.status === "open" && !s.isArchived)
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());

  const upcomingSessions = sessions
    .filter((s) => s.status === "not_open" && !s.isArchived)
    .sort((a, b) => {
      // Prioritaskan sesi yang waktu selesainya belum lewat
      const aFuture = a.endsAt.toMillis() >= now;
      const bFuture = b.endsAt.toMillis() >= now;
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      // Jika sama-sama masa depan: urutkan yang paling dekat (startsAt naik)
      if (aFuture && bFuture) {
        return a.startsAt.toMillis() - b.startsAt.toMillis();
      }
      // Jika sama-sama sudah lewat hari ini: urutkan yang paling mendekati waktu sekarang (startsAt turun)
      return b.startsAt.toMillis() - a.startsAt.toMillis();
    });

  const MAX_SUMMARY_ITEMS = 3;
  // Sisakan slot untuk jadwal mendatang jika ada, agar tidak hanya sesi dibuka saja yang tampil
  const maxOpen =
    upcomingSessions.length > 0 ? MAX_SUMMARY_ITEMS - 1 : MAX_SUMMARY_ITEMS;
  const displayedOpenSessions = openSessions.slice(0, maxOpen);
  const remainingSlots = MAX_SUMMARY_ITEMS - displayedOpenSessions.length;
  const displayedUpcomingSessions = upcomingSessions.slice(0, remainingSlots);

  const renderSummarySessionCard = (session: SessionDoc, isOpen: boolean) => {
    const cls = classMap.get(session.classId);
    const classTitle = cls?.name || cls?.course;
    const hintText = isAssistant
      ? (isOpen ? "Kelola presensi sesi ini →" : "Lihat detail sesi praktikum →")
      : (isOpen ? "Masuk ke sesi presensi →" : "Lihat detail sesi praktikum →");

    return (
      <TouchableOpacity
        key={session.id}
        style={[
          styles.sessionSummaryCard,
          isOpen && styles.sessionSummaryCardOpen,
        ]}
        onPress={() =>
          router.push(detailPath.replace("[sessionId]", session.id) as never)
        }
        activeOpacity={0.7}
      >
        <View style={styles.sessionSummaryHeader}>
          {classTitle ? (
            <Text style={styles.sessionSummaryClass} numberOfLines={1}>
              {classTitle}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <StatusBadge status={session.status} />
        </View>

        <Text style={styles.sessionSummaryTitle} numberOfLines={1}>
          {session.title || "Sesi Praktikum"}
        </Text>

        <Text style={styles.sessionSummaryRoom}>Ruang: {session.room}</Text>

        <Text style={styles.sessionSummaryTime}>
          {formatSessionSchedule(session.startsAt, session.endsAt)}
        </Text>

        <View style={styles.sessionSummaryFooter}>
          <Text style={styles.sessionSummaryHint}>{hintText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (currentUser.role === 'coordinator') {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <CoordinatorDashboard />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text accessibilityRole="header" style={styles.title}>
            Kelas Praktikum
          </Text>
          <Text style={styles.userName}>{currentUser.name}</Text>
        </View>
        {isAssistant ? null : (
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={() => router.push("/(student)/leaves" as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveButtonText}>Izin Saya</Text>
          </TouchableOpacity>
        )}
      </View>

      <AsyncState
        status={status === "ready" && classes.length === 0 ? "empty" : status}
        error={error}
        fromCache={metadata.fromCache}
        hasPendingWrites={metadata.hasPendingWrites}
        onRetry={() => setAttempt((value) => value + 1)}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
      >
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.sectionHeader}>{sectionTitle}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.classCard}
              onPress={() => {
                if (isAssistant) {
                  router.push(`/(assistant)/classes/${item.id}` as never);
                } else {
                  router.push(`/(student)/classes/${item.id}` as never);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.classCardTop}>
                <Text style={styles.courseName}>{item.course}</Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              </View>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.cardHint}>
                {isAssistant
                  ? "Ketuk untuk detail, sesi, dan peserta →"
                  : "Ketuk untuk melihat daftar sesi praktikum →"}
              </Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={styles.summarySectionContainer}>
              <View style={styles.summarySectionHeader}>
                <Text style={styles.summarySectionTitle}>Jadwal Terdekat</Text>
              </View>

              {/* 1. Sesi yang sedang dibuka */}
              {displayedOpenSessions.length > 0 && (
                <View style={styles.subSectionBlock}>
                  <View style={styles.subSectionBadgeRow}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.subSectionLabel}>Sedang Dibuka</Text>
                  </View>
                  {displayedOpenSessions.map((session) =>
                    renderSummarySessionCard(session, true),
                  )}
                </View>
              )}

              {/* 2. Sesi mendatang terdekat */}
              {displayedUpcomingSessions.length > 0 && (
                <View style={styles.subSectionBlock}>
                  <Text style={styles.subSectionLabel}>
                    {displayedOpenSessions.length > 0
                      ? "Sesi Mendatang Terdekat"
                      : "Mendatang Terdekat"}
                  </Text>
                  {displayedUpcomingSessions.map((session) =>
                    renderSummarySessionCard(session, false),
                  )}
                </View>
              )}

              {/* 3. Jika tidak ada sesi dibuka dan tidak ada sesi mendatang */}
              {displayedOpenSessions.length === 0 &&
                displayedUpcomingSessions.length === 0 && (
                  <View style={styles.emptySummaryCard}>
                    <Text style={styles.emptySummaryText}>
                      Tidak ada sesi yang sedang dibuka atau jadwal mendatang.
                    </Text>
                  </View>
                )}
            </View>
          }
        />
      </AsyncState>
      <TabBarDivider />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.sm, padding: spacing.md },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  userName: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  accountLink: {
    color: colors.primary,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  leaveButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  leaveButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  separator: { height: spacing.sm },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  classCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  courseName: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  codeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  className: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },

  // Styling Ringkasan Sesi
  summarySectionContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summarySectionHeader: {
    marginBottom: spacing.sm,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  summarySectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  subSectionBlock: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subSectionBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  sessionSummaryCardOpen: {
    borderColor: colors.success,
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
  },
  sessionSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sessionSummaryClass: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sessionSummaryRoom: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionSummaryTime: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  sessionSummaryFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionSummaryHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  emptySummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptySummaryText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
