import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createSession } from '@/features/practicum';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { colors, radius, spacing } from '@/theme';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Picker } from '@expo/ui/community/picker';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

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
  const [rawHour = '', rawMinute = ''] = value.split(':');

  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, index) =>
    String(minHour + index).padStart(2, '0'),
  );

  const allMinutes = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, '0'),
  );

  const selectedHour = hours.includes(rawHour) ? rawHour : hours[0];

  const minutes =
    lastHourOnlyZeroMinutes && Number(selectedHour) === maxHour
      ? ['00']
      : allMinutes;

  const selectedMinute = minutes.includes(rawMinute) ? rawMinute : '00';

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
        onValueChange={(val) => {
          const nextHour = String(val);
          const nextMinute =
            lastHourOnlyZeroMinutes && Number(nextHour) === maxHour
              ? '00'
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
        onValueChange={(val) => {
          onChange(`${selectedHour}:${String(val)}`);
        }}
      >
        {minutes.map((minute) => (
          <Picker.Item key={minute} label={minute} value={minute} />
        ))}
      </Picker>
    </View>
  );
}

export default function CreateSessionScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [labOptions, setLabOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateStr, setDateStr] = useState(formatLocalDate(new Date()));
  const [startTimeStr, setStartTimeStr] = useState('08:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const db = getFirebaseFirestore();
        const labSnapshot = await getDocs(
          query(collection(db, 'laboratories'), where('isActive', '==', true)),
        );

        setLabOptions(
          labSnapshot.docs
            .map((labDoc) => ({
              id: labDoc.id,
              name: labDoc.data().name,
            }))
            .filter((lab) => typeof lab.name === 'string' && lab.name.trim())
            .sort((a, b) => a.name.localeCompare(b.name, 'id')),
        );
      } catch (err: any) {
        console.error('Gagal memuat laboratorium:', err);
      }
    };

    fetchLaboratories();
  }, []);

  const handleSubmit = async () => {
    if (!classId) return;
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    const trimmedRoom = room.trim();

    if (!trimmedTitle || !trimmedRoom) {
      setErrorMsg('Judul sesi dan ruangan wajib diisi.');
      return;
    }

    const isValidTime = (
      val: string,
      minHour: number,
      maxHour: number,
      lastHourOnlyZeroMinutes = false,
    ) => {
      if (!/^\d{2}:\d{2}$/.test(val)) return false;

      const [hourText, minuteText] = val.split(':');
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
      setErrorMsg('Jam mulai harus antara 07:00 dan 19:59.');
      return;
    }

    if (!isValidTime(endTimeStr, 8, 21, true)) {
      setErrorMsg('Jam selesai harus antara 08:00 dan 21:00.');
      return;
    }

    const startsAt = new Date(`${dateStr.trim()}T${startTimeStr.trim()}:00`);
    const endsAt = new Date(`${dateStr.trim()}T${endTimeStr.trim()}:00`);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      setErrorMsg('Format tanggal atau jam tidak valid.');
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setErrorMsg('Waktu selesai harus sesudah waktu mulai.');
      return;
    }

    if (startsAt.getTime() < Date.now()) {
      setErrorMsg('Waktu mulai tidak boleh kurang dari waktu saat ini.');
      return;
    }

    setLoading(true);
    const result = await createSession({
      classId,
      title: trimmedTitle,
      room: trimmedRoom,
      startsAt,
      endsAt,
      timeZone: 'Asia/Jakarta',
    });
    setLoading(false);

    if (result.ok) {
      router.back();
    } else {
      setErrorMsg(result.error.message || 'Gagal membuat sesi.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Batal</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Tambah Sesi Praktikum</Text>
            <Text style={styles.subtitle}>Sesi baru akan dibuat dengan status Belum Dibuka.</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Judul / Pertemuan */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Judul / Pertemuan</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Pertemuan 1 - Pengenalan Modul"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Ruangan / Laboratorium Dropdown */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ruangan / Laboratorium</Text>
            <Picker
              selectedValue={room}
              onValueChange={(value) => setRoom(String(value))}
              style={styles.input}
            >
              <Picker.Item label="Pilih laboratorium" value="" />
              {labOptions.map((lab) => (
                <Picker.Item key={lab.id} label={lab.name} value={lab.name} />
              ))}
            </Picker>
          </View>

          {/* Tanggal Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={{ color: dateStr ? colors.text : colors.textMuted }}>
                {dateStr || 'Pilih tanggal'}
              </Text>
            </TouchableOpacity>

            {showDatePicker ? (
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

          {/* Jam Mulai & Jam Selesai TimeField */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
              <TimeField
                value={startTimeStr}
                onChange={setStartTimeStr}
                disabled={loading}
                minHour={7}
                maxHour={19}
              />
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
              <TimeField
                value={endTimeStr}
                onChange={setEndTimeStr}
                disabled={loading}
                minHour={8}
                maxHour={21}
                lastHourOnlyZeroMinutes
              />
            </View>
          </View>

          {/* Tombol Simpan */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Simpan Sesi</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#F1F5F9',
    color: colors.textMuted,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeSegment: {
    width: 72,
    textAlign: 'center',
  },
  timeSeparator: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
