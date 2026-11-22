import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { updateGeotagPoint, useGeotagPoints, type GeotagId } from "@/features/geotag";
import { useApp } from "@/state/AppContext";
import { colors, radius, spacing } from "@/theme";

export default function GeotagManagementScreen() {
  const { currentUser } = useApp();
  const geotags = useGeotagPoints();
  const [selectedId, setSelectedId] = useState<GeotagId | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedPoint = useMemo(
    () => geotags.points.find((point) => point.geotagId === selectedId) ?? null,
    [geotags.points, selectedId],
  );

  useEffect(() => {
    if (!selectedId && geotags.points.length) {
      setSelectedId(geotags.points[0].geotagId);
    } else if (selectedId && !geotags.points.some((point) => point.geotagId === selectedId)) {
      setSelectedId(geotags.points[0]?.geotagId ?? null);
    }
  }, [geotags.points, selectedId]);

  useEffect(() => {
    if (!selectedPoint) return;
    setLatitude(String(selectedPoint.latitude));
    setLongitude(String(selectedPoint.longitude));
    setRadiusMeters(String(selectedPoint.radiusMeters));
  }, [selectedPoint?.id, selectedPoint?.latitude, selectedPoint?.longitude, selectedPoint?.radiusMeters]);

  const parsedLatitude = Number(latitude.trim());
  const parsedLongitude = Number(longitude.trim());
  const parsedRadius = Number(radiusMeters.trim());
  const fieldsValid =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    radiusMeters.trim() !== "" &&
    Number.isFinite(parsedLatitude) &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    Number.isFinite(parsedLongitude) &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180 &&
    Number.isFinite(parsedRadius) &&
    parsedRadius > 0;

  const handleSave = async () => {
    if (!selectedPoint || !fieldsValid || saving) return;

    setSaving(true);
    setNotice(null);
    const result = await updateGeotagPoint(
      selectedPoint.id,
      parsedLatitude,
      parsedLongitude,
      parsedRadius,
    );
    setSaving(false);

    if (result.ok) {
      setNotice({ type: "success", text: `Titik ${selectedPoint.geotagId} berhasil diperbarui.` });
    } else {
      setNotice({ type: "error", text: result.error.message });
    }
  };

  if (currentUser?.role !== "coordinator") {
    return <StatePanel title="Halaman ini hanya dapat digunakan oleh coordinator." />;
  }

  if (geotags.status === "loading") {
    return <StatePanel title="Memuat titik geotag…" loading />;
  }

  if (geotags.status === "error" && geotags.points.length === 0) {
    return (
      <StatePanel
        title={geotags.error?.message ?? "Titik geotag gagal dimuat."}
        actionLabel={geotags.error?.retryable ? "Coba lagi" : undefined}
        onAction={geotags.error?.retryable ? geotags.retry : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Pengaturan Titik Geotag</Text>
          <Text style={styles.subtitle}>Ubah koordinat dan radius presensi. Akses dibatasi untuk coordinator.</Text>
        </View>

        {geotags.status === "error" ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{geotags.error?.message}</Text>
            {geotags.error?.retryable ? <Pressable onPress={geotags.retry}><Text style={styles.retryText}>Coba lagi</Text></Pressable> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pilih titik</Text>
          <View style={styles.pointList}>
            {geotags.points.map((point) => (
              <Pressable
                key={point.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedId === point.geotagId }}
                onPress={() => {
                  setSelectedId(point.geotagId);
                  setNotice(null);
                }}
                style={[styles.pointButton, selectedId === point.geotagId && styles.pointButtonSelected]}
              >
                <Text style={[styles.pointBadge, selectedId === point.geotagId && styles.pointBadgeSelected]}>{point.geotagId}</Text>
                <Text style={styles.pointName} numberOfLines={1}>{point.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {selectedPoint ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{selectedPoint.geotagId} · {selectedPoint.name}</Text>
            <Text style={styles.helpText}>Nilai disimpan ke dokumen laboratorium terpilih.</Text>

            <Field label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="Contoh: -7.0482375" />
            <Field label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="Contoh: 110.440765625" />
            <Field label="Radius presensi (meter)" value={radiusMeters} onChangeText={setRadiusMeters} keyboardType="numbers-and-punctuation" placeholder="Contoh: 50" />

            {!fieldsValid ? (
              <Text style={styles.validationText}>Masukkan latitude −90 sampai 90, longitude −180 sampai 180, dan radius lebih dari 0.</Text>
            ) : null}

            {notice ? (
              <View style={[styles.noticeBox, notice.type === "success" ? styles.successBox : styles.errorBox]}>
                <Text style={styles.noticeText}>{notice.text}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSave()}
              disabled={!fieldsValid || saving}
              style={[styles.saveButton, (!fieldsValid || saving) && styles.disabledButton]}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Simpan perubahan</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}><Text style={styles.helpText}>Tidak ada titik geotag yang tersedia.</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...inputProps
}: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function StatePanel({
  title,
  loading = false,
  actionLabel,
  onAction,
}: {
  title: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.statePanel}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text accessibilityRole={loading ? undefined : "alert"} style={styles.stateText}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.saveButton}>
          <Text style={styles.saveText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  card: { padding: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  pointList: { gap: spacing.xs },
  pointButton: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  pointButtonSelected: { borderColor: colors.primary, backgroundColor: "#EFF6FF" },
  pointBadge: { width: 28, height: 28, textAlign: "center", textAlignVertical: "center", borderRadius: 14, overflow: "hidden", color: colors.textMuted, backgroundColor: "#E2E8F0", fontWeight: "800" },
  pointBadgeSelected: { color: "#FFFFFF", backgroundColor: colors.primary },
  pointName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  helpText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.background, fontSize: 15 },
  validationText: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  noticeBox: { padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: spacing.xs },
  successBox: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  errorBox: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  noticeText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  saveButton: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  disabledButton: { opacity: 0.5 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  statePanel: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  stateText: { color: colors.text, fontSize: 15, textAlign: "center", lineHeight: 22 },
});
