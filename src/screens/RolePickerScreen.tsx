import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/common/EmptyState';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing } from '../theme';
import type { Role, User } from '../types';

const roleOptions: { role: Role; label: string }[] = [
  { role: 'student', label: 'Praktikan' },
  { role: 'assistant', label: 'Asisten Praktikum' },
];

export default function RolePickerScreen() {
  const { users, selectUser } = useApp();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const availableUsers = users.filter((user) => user.role === selectedRole);
  const selectedUser = availableUsers.find((user) => user.id === selectedUserId);

  function chooseRole(role: Role) {
    if (role !== selectedRole) {
      setSelectedRole(role);
      setSelectedUserId(null);
    }
  }

  function confirmSelection() {
    if (selectedRole && selectedUser?.role === selectedRole) {
      // AppProvider and RootNavigator handle the transition after selection.
      selectUser(selectedUser.id);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList<User>
        data={availableUsers}
        keyExtractor={(user) => user.id}
        extraData={selectedUserId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>LabCheckIn</Text>
            <Text style={styles.description}>Pilih peran dan identitas untuk melanjutkan.</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Peran</Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {roleOptions.map(({ role, label }) => (
                <Pressable
                  key={role}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedRole === role }}
                  onPress={() => chooseRole(role)}
                  style={({ pressed }) => [
                    styles.option,
                    selectedRole === role && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.selectionLabel}>
                    {selectedRole === role ? 'Terpilih' : 'Pilih'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Identitas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedUserId === item.id }}
            onPress={() => setSelectedUserId(item.id)}
            style={({ pressed }) => [
              styles.option,
              selectedUserId === item.id && styles.selectedOption,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.optionLabel}>{item.name}</Text>
            {item.studentNumber ? <Text style={styles.description}>NIM: {item.studentNumber}</Text> : null}
            <Text style={styles.selectionLabel}>
              {selectedUserId === item.id ? 'Terpilih' : 'Pilih identitas'}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title={selectedRole ? 'Belum ada identitas' : 'Pilih peran terlebih dahulu'}
            message={selectedRole ? 'Identitas untuk peran ini belum tersedia.' : undefined}
          />
        }
        ListFooterComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedUser }}
            disabled={!selectedUser}
            onPress={confirmSelection}
            style={({ pressed }) => [
              styles.confirmButton,
              !selectedUser && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.confirmLabel}>Masuk</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  options: { gap: spacing.sm },
  option: {
    minHeight: spacing.xl + spacing.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedOption: { borderColor: colors.primary, borderWidth: 2 },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  selectionLabel: { color: colors.primary, fontSize: 14 },
  separator: { height: spacing.sm },
  confirmButton: {
    minHeight: spacing.xl + spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  disabledButton: { backgroundColor: colors.neutral },
  confirmLabel: { color: colors.card, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
