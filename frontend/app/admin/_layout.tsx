import { Stack, Slot } from 'expo-router';
import { Platform } from 'react-native';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';

const isWeb = Platform.OS === 'web';

export default function AdminLayout() {
  if (isWeb) {
    return (
      <WebSidebarLayout>
        <Slot />
      </WebSidebarLayout>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="staff" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="products" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="stock" />
    </Stack>
  );
}
