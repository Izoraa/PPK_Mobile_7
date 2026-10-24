import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceList } from '@/components/session/AttendanceList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApp } from '@/state/AppContext';
import { colors, spacing } from '@/theme';

export default function AttendanceHistoryScreen() {
  const { currentUser, users, selectUser, getAttendancesByStudent } = useApp();
  const students = users.filter((user) => user.role === 'student');
  const history = currentUser ? getAttendancesByStudent(currentUser.id) : [];
  const isStudent = currentUser?.role === 'student';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Riwayat Presensi
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Pilih praktikan untuk mencoba riwayat presensi berdasarkan identitas aktif.
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.userPicker}>
          {students.map((student) => {
            const isSelected = student.id === currentUser?.id;

            return (
              <Pressable
                key={student.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => selectUser(student.id)}
                style={[styles.userButton, isSelected && styles.selectedUserButton]}>
                <ThemedText type="smallBold">{student.name}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {student.id}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listContainer}>
          {currentUser && isStudent ? (
            <>
              <ThemedText type="subtitle" style={styles.identity}>
                {currentUser.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.identityDetails}>
                ID praktikan: {currentUser.id}
              </ThemedText>
              <AttendanceList
                attendances={history}
                emptyTitle="Belum ada riwayat presensi"
                emptyMessage="Praktikan ini belum memiliki catatan kehadiran."
              />
            </>
          ) : (
            <EmptyState
              title="Praktikan belum dipilih"
              message="Pilih salah satu praktikan untuk melihat riwayat miliknya."
            />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  description: {
    marginBottom: spacing.xs,
  },
  userPicker: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  userButton: {
    minWidth: 150,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedUserButton: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  listContainer: {
    flex: 1,
  },
  identity: {
    marginBottom: spacing.xs,
  },
  identityDetails: {
    marginBottom: spacing.sm,
  },
});
