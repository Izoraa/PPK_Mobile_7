import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useApp } from '@/state/AppContext';
import { useGeotagPoints, useLabActivities, useDeviceLocation, getLabActivitySummary, type GeotagId, type GeotagPoint, type LabSessionActivity } from '@/features/geotag';
import { colors, radius, spacing } from '@/theme';

const LOCAL_MAP_URI = 'file:///android_asset/labcheckin-map/index.html';
const MAP_USER_AGENT = 'LabCheckInMobile/1.0 (Android; educational app)';

function formatSessionTime(date: Date, timeZone: string): string {
  return date.toLocaleString('id-ID', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sessionStatusLabel(status: LabSessionActivity['status']): string {
  if (status === 'open') return 'Berlangsung';
  if (status === 'closed') return 'Ditutup';
  return 'Akan berlangsung';
}

function ActivityItem({ title, session }: { title: string; session: LabSessionActivity | null }) {
  if (!session) {
    return (
      <View style={styles.activityItem}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.mutedText}>Tidak ada sesi</Text>
      </View>
    );
  }

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityHeading}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={[styles.statusChip, session.status === 'open' ? styles.openChip : styles.upcomingChip]}>
          {sessionStatusLabel(session.status)}
        </Text>
      </View>
      <Text style={styles.sessionName}>{session.title}</Text>
      <Text style={styles.mutedText}>
        {session.className}{session.classCode ? ` · ${session.classCode}` : ''}
      </Text>
      <Text style={styles.mutedText}>
        {formatSessionTime(session.startsAt, session.timeZone)}–{formatSessionTime(session.endsAt, session.timeZone)}
      </Text>
    </View>
  );
}

export default function MapsScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const geotags = useGeotagPoints();
  const activities = useLabActivities(currentUser?.id ?? null, currentUser?.role ?? null);
  const deviceLocation = useDeviceLocation();
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedGeotagId, setSelectedGeotagId] = useState<GeotagId | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const script = `window.setGeotagPoints(${JSON.stringify(geotags.points)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [geotags.points, mapReady]);

  useEffect(() => {
    if (!mapReady || !deviceLocation.location) return;
    const script = `window.setUserLocation(${JSON.stringify(deviceLocation.location)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [deviceLocation.location, mapReady]);

  const selectedPoint = useMemo<GeotagPoint | null>(
    () => geotags.points.find((point) => point.geotagId === selectedGeotagId) ?? null,
    [geotags.points, selectedGeotagId],
  );

  useEffect(() => {
    if (!selectedPoint || !mapReady) return;
    webViewRef.current?.injectJavaScript(`window.selectGeotag(${JSON.stringify(selectedPoint.geotagId)}); true;`);
  }, [selectedPoint, mapReady]);

  const handleMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; geotagId?: GeotagId };
      if (message.type === 'map-ready') setMapReady(true);
      if (message.type === 'geotag-select' && message.geotagId) setSelectedGeotagId(message.geotagId);
      if (message.type === 'tile-error') setTileFailed(true);
      if (message.type === 'tile-ready') setTileFailed(false);
    } catch {
      // Ignore malformed messages from the embedded map document.
    }
  }, []);

  const retryTiles = useCallback(() => {
    setTileFailed(false);
    webViewRef.current?.injectJavaScript('window.retryMapTiles(); true;');
  }, []);

  if (geotags.status === 'loading') {
    return <StatePanel title="Memuat titik laboratorium" loading />;
  }

  if (geotags.status === 'error' && geotags.points.length === 0) {
    return (
      <StatePanel
        title={geotags.error?.message ?? 'Titik laboratorium gagal dimuat.'}
        actionLabel={geotags.error?.retryable ? 'Coba lagi' : undefined}
        onAction={geotags.error?.retryable ? geotags.retry : undefined}
      />
    );
  }

  if (Platform.OS !== 'android') {
    return <StatePanel title="Peta LabCheckIn tersedia pada aplikasi Android." />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Peta Laboratorium</Text>
        <Text style={styles.subheading}>Pilih marker untuk melihat lokasi dan aktivitas praktikum.</Text>
        {currentUser?.role === 'coordinator' ? (
          <View style={styles.adminActions}>
            <Pressable
              accessibilityRole="button"
              style={[styles.manageButton, styles.secondaryManageButton]}
              onPress={() => router.push('/(coordinator)/manage-laboratories' as any)}
            >
              <Text style={styles.manageButtonText}>Kelola Ruang</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.manageButton}
              onPress={() => router.push('/(coordinator)/geotags' as any)}
            >
              <Text style={styles.manageButtonText}>Atur Geotag</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {geotags.status === 'error' ? (
        <InlineNotice message={geotags.error?.message ?? 'Data geotag terbaru gagal dimuat.'} actionLabel="Coba lagi" onAction={geotags.retry} />
      ) : null}

      {deviceLocation.status === 'idle' ? (
        <InlineNotice
          message="Izinkan lokasi saat digunakan untuk menampilkan posisi perangkat pada peta."
          actionLabel="Tampilkan posisi saya"
          onAction={() => { void deviceLocation.start(); }}
        />
      ) : null}
      {deviceLocation.status === 'loading' ? (
        <InlineNotice message="Mengambil posisi perangkat…" loading />
      ) : null}
      {deviceLocation.status === 'denied' ? (
        <InlineNotice
          message={deviceLocation.canAskAgain
            ? 'Izin lokasi ditolak. Peta laboratorium tetap tersedia tanpa posisi perangkat.'
            : 'Izin lokasi dimatikan untuk aplikasi. Aktifkan dari pengaturan aplikasi.'}
          actionLabel={deviceLocation.canAskAgain ? 'Coba minta izin' : 'Buka pengaturan'}
          onAction={() => {
            if (deviceLocation.canAskAgain) void deviceLocation.start();
            else void Linking.openSettings();
          }}
        />
      ) : null}
      {deviceLocation.status === 'services-disabled' ? (
        <InlineNotice message="Layanan lokasi perangkat mati." actionLabel="Aktifkan lokasi" onAction={() => { void deviceLocation.enableLocationServices(); }} />
      ) : null}
      {deviceLocation.status === 'error' ? (
        <InlineNotice message="Posisi perangkat belum dapat diperoleh. Periksa GPS dan koneksi, lalu coba lagi." actionLabel="Coba lagi" onAction={() => { void deviceLocation.start(); }} />
      ) : null}
      {tileFailed ? (
        <InlineNotice message="Peta dasar gagal dimuat. Periksa koneksi internet." actionLabel="Muat ulang peta" onAction={retryTiles} />
      ) : null}

      <View style={styles.mapFrame}>
        <WebView<{}>
          ref={webViewRef}
          source={{ uri: LOCAL_MAP_URI }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          userAgent={MAP_USER_AGENT}
          allowFileAccess
          mixedContentMode="never"
          onMessage={handleMapMessage}
          onLoadEnd={() => setMapReady(true)}
          onError={() => setTileFailed(true)}
          onHttpError={() => setTileFailed(true)}
          accessibilityLabel="Peta interaktif OpenStreetMap titik laboratorium"
        />
        {!mapReady ? (
          <View style={styles.mapLoading} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mutedText}>Menyiapkan peta…</Text>
          </View>
        ) : null}
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
        </View>
      </View>

      {selectedPoint ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.geotagBadge}><Text style={styles.geotagBadgeText}>{selectedPoint.geotagId}</Text></View>
            <View style={styles.detailTitleWrap}>
              <Text style={styles.detailTitle}>{selectedPoint.name}</Text>
              <Text style={styles.mutedText}>Radius presensi {selectedPoint.radiusMeters} m</Text>
            </View>
          </View>
          <Text style={styles.coordinateText}>
            {selectedPoint.latitude.toFixed(7)}, {selectedPoint.longitude.toFixed(7)}
          </Text>
          <View style={styles.separator} />
          {activities.status === 'loading' ? (
            <View style={styles.activityLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.mutedText}>Memuat aktivitas…</Text></View>
          ) : activities.status === 'error' ? (
            <View style={styles.activityItem}>
              <Text style={styles.mutedText}>{activities.error?.message}</Text>
              {activities.error?.retryable ? <Text onPress={activities.retry} style={styles.retryText}>Coba lagi</Text> : null}
            </View>
          ) : (
            <>
              {(() => {
                const summary = getLabActivitySummary(selectedPoint, activities.sessions, new Date(clock));
                return <>
                  <ActivityItem title="Sedang berlangsung" session={summary.current} />
                  <ActivityItem title="Berikutnya" session={summary.next} />
                </>;
              })()}
            </>
          )}
        </View>
      ) : (
        <View style={styles.selectionHint}><Text style={styles.mutedText}>Pilih marker untuk melihat detail lokasi dan aktivitas.</Text></View>
      )}
    </SafeAreaView>
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
      <Text accessibilityRole={loading ? undefined : 'alert'} style={styles.stateText}>{title}</Text>
      {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} /> : null}
    </SafeAreaView>
  );
}

function InlineNotice({
  message,
  actionLabel,
  onAction,
  loading = false,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.notice}>
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      <Text style={styles.noticeText}>{message}</Text>
      {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} compact /> : null}
    </View>
  );
}

function ActionButton({ label, onPress, compact = false }: { label: string; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, compact && styles.actionButtonCompact]}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  adminActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  manageButton: { minHeight: 40, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryManageButton: { backgroundColor: colors.textMuted },
  manageButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subheading: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  mapFrame: { flex: 1, minHeight: 240, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#E2E8F0' },
  map: { flex: 1, backgroundColor: '#E2E8F0' },
  mapLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#F1F5F9' },
  attribution: { position: 'absolute', right: 6, bottom: 6, zIndex: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FFFFFFE8' },
  attributionText: { color: '#334155', fontSize: 10 },
  detailCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs, maxHeight: 250 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailTitleWrap: { flex: 1 },
  geotagBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  geotagBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  detailTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  coordinateText: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  activityItem: { gap: 2, paddingVertical: spacing.xs },
  activityHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  sessionName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  mutedText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  statusChip: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 10, fontWeight: '700' },
  openChip: { color: '#166534', backgroundColor: '#DCFCE7' },
  upcomingChip: { color: '#1D4ED8', backgroundColor: '#DBEAFE' },
  activityLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  retryText: { alignSelf: 'flex-start', marginTop: 4, color: colors.primary, fontSize: 13, fontWeight: '700' },
  selectionHint: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  noticeText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 },
  actionButton: { minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionButtonCompact: { minHeight: 36, paddingHorizontal: spacing.sm },
  actionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statePanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  stateText: { color: colors.text, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
