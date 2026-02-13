import { Stack, Slot, useRouter, usePathname } from 'expo-router';
import { Platform, View, StyleSheet, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isDesktop) {
    return (
      <WebSidebarLayout>
        <Slot />
      </WebSidebarLayout>
    );
  }

  // Mobile view uses Stack navigation (Stock removed - now in Inventory linked app)
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="staff" />
        <Stack.Screen name="promotions" />
        <Stack.Screen name="products" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="expenses" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
