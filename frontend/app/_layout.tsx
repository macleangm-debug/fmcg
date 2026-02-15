import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { useBusinessStore } from '../src/store/businessStore';
import { ModalProvider } from '../src/context/ModalContext';
import GlobalModals from '../src/components/GlobalModals';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { loadUser, isLoading, isAuthenticated } = useAuthStore();
  const { loadSettings } = useBusinessStore();
  const [ready, setReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts explicitly
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
          'ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.log('Font loading error:', error);
        // Continue even if fonts fail to load
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

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

  // Hide splash screen when app is ready
  const onLayoutRootView = useCallback(async () => {
    if (ready && fontsLoaded) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded]);

  // Show loading until both ready flag is set AND fonts are loaded
  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
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
