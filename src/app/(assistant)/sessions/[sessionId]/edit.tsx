import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/common/ConfirmModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  archiveSession,
  updateSession,
  type SessionDoc,
} from "@/features/practicum";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { colors, radius, spacing } from "@/theme";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Picker } from "@expo/ui/community/picker";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return year && month && day ? new Date(year, month - 1, day, 12) : new Date();
}

type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  minHour: number;
  maxHour: number;
  lastHourOnlyZeroMinutes?: boolean;
};

function TimeField({
  value,
  onChange,
  disabled,
  minHour,
  maxHour,
  lastHourOnlyZeroMinutes = false,
}: TimeFieldProps) {
  const [rawHour = "", rawMinute = ""] = value.split(":");

  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, index) =>
    String(minHour + index).padStart(2, "0"),
  );

  const allMinutes = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, "0"),
  );

  const selectedHour = hours.includes(rawHour) ? rawHour : hours[0];

  const minutes =
    lastHourOnlyZeroMinutes && Number(selectedHour) === maxHour
      ? ["00"]
      : allMinutes;

  const selectedMinute = minutes.includes(rawMinute) ? rawMinute : "00";

  return (
    <View style={styles.timeInputRow}>
      <Picker
        selectedValue={selectedHour}
        enabled={!disabled}
        style={[
          styles.input,
          styles.timeSegment,
          disabled && styles.disabledInput,
        ]}
        onValueChange={(value) => {
          const nextHour = String(value);
          const nextMinute =
            lastHourOnlyZeroMinutes && Number(nextHour) === maxHour
              ? "00"
              : selectedMinute;

          onChange(`${nextHour}:${nextMinute}`);
        }}
      >
        {hours.map((hour) => (
          <Picker.Item key={hour} label={hour} value={hour} />
        ))}
      </Picker>

      <Text style={styles.timeSeparator}>:</Text>

      <Picker
        selectedValue={selectedMinute}
        enabled={!disabled}
        style={[
          styles.input,
          styles.timeSegment,
          disabled && styles.disabledInput,
        ]}
        onValueChange={(value) => {
          onChange(`${selectedHour}:${String(value)}`);
        }}
      >
        {minutes.map((minute) => (
          <Picker.Item key={minute} label={minute} value={minute} />
        ))}
      </Picker>
    </View>
  );
}

export default function EditSessionScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [labOptions, setLabOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeZone, setTimeZone] = useState("Asia/Jakarta");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const db = getFirebaseFirestore();
        const labSnapshot = await getDocs(
          query(collection(db, "laboratories"), where("isActive", "==", true)),
        );

        setLabOptions(
          labSnapshot.docs
            .map((labDoc) => ({
              id: labDoc.id,
              name: labDoc.data().name,
            }))
            .filter((lab) => typeof lab.name === "string" && lab.name.trim())
            .sort((a, b) => a.name.localeCompare(b.name, "id")),
        );
        const snap = await getDoc(doc(db, "sessions", sessionId));
        if (snap.exists()) {
          const d = snap.data();
          const sess: SessionDoc = {
            id: snap.id,
            classId: d.classId ?? "",
            assistantId: d.assistantId ?? "",
            title: d.title ?? "",
            room: d.room ?? "",
            startsAt: d.startsAt,
            endsAt: d.endsAt,
            timeZone: d.timeZone ?? "Asia/Jakarta",
            status: d.status ?? "not_open",
            isArchived: Boolean(d.isArchived),
            openedAt: d.openedAt ?? null,
            closedAt: d.closedAt ?? null,
            createdAt: d.createdAt ?? null,
            updatedAt: d.updatedAt ?? null,
          };
          setSession(sess);
          setTitle(sess.title);
          setRoom(sess.room);
          setTimeZone(sess.timeZone);

          if (sess.startsAt?.toDate) {
            const sDate = sess.startsAt.toDate();
            setDateStr(formatLocalDate(sDate));
            setStartTimeStr(sDate.toTimeString().substring(0, 5));
          }
          if (sess.endsAt?.toDate) {
            const eDate = sess.endsAt.toDate();
            setEndTimeStr(eDate.toTimeString().substring(0, 5));
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat sesi.");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleSave = async () => {
    if (!sessionId || !session) return;
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    const trimmedRoom = room.trim();

    if (!trimmedTitle || !trimmedRoom) {
      setErrorMsg("Judul dan ruangan wajib diisi.");
      return;
    }

    const isValidTime = (
      value: string,
      minHour: number,
      maxHour: number,
      lastHourOnlyZeroMinutes = false,
    ) => {
      if (!/^\d{2}:\d{2}$/.test(value)) return false;

      const [hourText, minuteText] = value.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);

      return (
        hour >= minHour &&
        hour <= maxHour &&
        minute >= 0 &&
        minute <= 59 &&
        (!lastHourOnlyZeroMinutes || hour !== maxHour || minute === 0)
      );
    };

    if (!isValidTime(startTimeStr, 7, 19)) {
      setErrorMsg("Jam mulai harus antara 07:00 dan 19:59.");
      return;
    }

    if (!isValidTime(endTimeStr, 8, 21, true)) {
      setErrorMsg("Jam selesai harus antara 08:00 dan 21:00.");
      return;
    }
    const startsAt = new Date(`${dateStr.trim()}T${startTimeStr.trim()}:00`);
    const endsAt = new Date(`${dateStr.trim()}T${endTimeStr.trim()}:00`);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      setErrorMsg("Format tanggal atau jam tidak valid.");
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setErrorMsg("Waktu selesai harus sesudah waktu mulai.");
      return;
    }

    if (startsAt.getTime() < Date.now()) {
      setErrorMsg("Waktu mulai tidak boleh kurang dari waktu saat ini.");
      return;
    }

    setSaving(true);
    const res = await updateSession(sessionId, {
      title: trimmedTitle,
      room: trimmedRoom,
      startsAt,
      endsAt,
      timeZone: timeZone.trim(),
    });
    setSaving(false);

    if (res.ok) {
      router.back();
    } else {
      setErrorMsg(res.error.message || "Gagal memperbarui sesi.");
    }
  };

  const handleArchive = async () => {
    if (!sessionId) return;
    setShowArchiveModal(false);
    setSaving(true);
    const res = await archiveSession(sessionId);
    setSaving(false);

    if (res.ok) {
      router.replace("/(assistant)/classes" as any);
    } else {
      setErrorMsg(res.error.message || "Gagal mengarsipkan sesi.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={styles.centerContainer}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={styles.centerContainer}
      >
        <Text style={styles.errorText}>Sesi tidak ditemukan.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLocked = session.status !== "not_open";

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Kembali</Text>
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Ubah Sesi Praktikum</Text>
              <StatusBadge status={session.status} />
            </View>
          </View>

          {isLocked ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedTitle}>
                Perubahan Metadata Terkunci
              </Text>
              <Text style={styles.lockedText}>
                Sesi yang sudah dibuka atau ditutup tidak dapat diubah
                metadatanya agar bukti catatan riwayat presensi tetap konsisten.
              </Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Judul / Pertemuan</Text>
            <TextInput
              style={[styles.input, isLocked && styles.disabledInput]}
              value={title}
              onChangeText={setTitle}
              editable={!isLocked}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ruangan / Laboratorium</Text>
            <Picker
              selectedValue={room}
              onValueChange={(value) => setRoom(String(value))}
              enabled={!isLocked}
              style={[styles.input, isLocked && styles.disabledInput]}
            >
              <Picker.Item label="Pilih laboratorium" value="" />
              {labOptions.map((lab) => (
                <Picker.Item key={lab.id} label={lab.name} value={lab.name} />
              ))}
            </Picker>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TouchableOpacity
              style={[styles.input, isLocked && styles.disabledInput]}
              onPress={() => setShowDatePicker(true)}
              disabled={isLocked}
              activeOpacity={0.8}
            >
              <Text style={{ color: dateStr ? colors.text : colors.textMuted }}>
                {dateStr || "Pilih tanggal"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && !isLocked ? (
              <DateTimePicker
                value={parseLocalDate(dateStr)}
                mode="date"
                presentation="dialog"
                onValueChange={(_event, selectedDate) => {
                  setDateStr(formatLocalDate(selectedDate));
                  setShowDatePicker(false);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            ) : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
              <TimeField
                value={startTimeStr}
                onChange={setStartTimeStr}
                disabled={isLocked}
                minHour={7}
                maxHour={19}
              />
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
              <TimeField
                value={endTimeStr}
                onChange={setEndTimeStr}
                disabled={isLocked}
                minHour={8}
                maxHour={21}
                lastHourOnlyZeroMinutes
              />
            </View>
          </View>

          {!isLocked ? (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Simpan Perubahan Sesi</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.archiveButton,
              session.status === "open" && styles.disabledButton,
            ]}
            onPress={() => {
              if (session.status === "open") {
                setErrorMsg(
                  "Sesi yang sedang dibuka harus ditutup terlebih dahulu sebelum dapat diarsipkan.",
                );
              } else {
                setShowArchiveModal(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.archiveText}>Arsipkan Sesi Ini</Text>
          </TouchableOpacity>
          <Text style={styles.archiveHint}>
            Sesi yang diarsipkan akan dihapus dari daftar aktif. Riwayat dan
            izin yang sudah ada tetap tersimpan.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showArchiveModal}
        title="Arsipkan Sesi?"
        message="Sesi akan disembunyikan dari daftar aktif. Presensi dan izin yang tercatat tidak akan dihapus."
        confirmLabel="Ya, Arsipkan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  lockedBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  lockedText: {
    fontSize: 13,
    color: "#B45309",
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  disabledInput: {
    backgroundColor: "#F1F5F9",
    color: colors.textMuted,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  archiveButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
  },
  archiveText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  archiveHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  timeSegment: {
    width: 72,
    textAlign: "center",
  },
  timeSeparator: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
});
