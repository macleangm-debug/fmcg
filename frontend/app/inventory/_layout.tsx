import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function InventoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="items" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="movements" />
    </Stack>
  );
}
