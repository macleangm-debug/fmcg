import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';

export default function LoyaltyLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();
  
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // Web desktop: wrap with sidebar layout
  if (isWebDesktop) {
    return (
      <WebSidebarLayout>
        <Slot />
      </WebSidebarLayout>
    );
  }

  // Mobile: just render content
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
