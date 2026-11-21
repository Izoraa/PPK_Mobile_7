import { Stack } from 'expo-router';

export default function CoordinatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="classes/new" />
      <Stack.Screen name="classes/[classId]/edit" />
      <Stack.Screen name="laboratories/new" />
      <Stack.Screen name="laboratories/[labId]/edit" />
      <Stack.Screen name="manage-laboratories" />
      <Stack.Screen name="geotags" />
    </Stack>
  );
}
