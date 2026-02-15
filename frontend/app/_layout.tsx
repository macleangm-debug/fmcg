import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../src/store/authStore';
import { useBusinessStore } from '../src/store/businessStore';
import { ModalProvider } from '../src/context/ModalContext';
import GlobalModals from '../src/components/GlobalModals';

export default function RootLayout() {
  const { loadUser, isLoading, isAuthenticated } = useAuthStore();
  const { loadSettings } = useBusinessStore();
  const [ready, setReady] = useState(false);

  // Load fonts for web compatibility
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadUser();
      } catch (error) {
        console.log('Load user error:', error);
      } finally {
        // Always set ready after attempting to load user
        setReady(true);
      }
    };
    
    initialize();
  }, []);

  // Load business settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  // Show loading until both ready flag is set AND fonts are loaded
  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ModalProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <GlobalModals />
      </ModalProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
