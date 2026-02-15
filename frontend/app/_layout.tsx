import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
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
  const [fontTimeout, setFontTimeout] = useState(false);

  // Load fonts using useFonts hook - load from assets folder for better web support
  const [fontsLoaded, fontError] = useFonts({
    Ionicons: require('../assets/fonts/Ionicons.ttf'),
    ionicons: require('../assets/fonts/Ionicons.ttf'),
  });

  // Font loading timeout - proceed after 3 seconds even if fonts fail
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fontsLoaded) {
        console.log('Font loading timeout - proceeding without fonts');
        setFontTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

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
    if (ready && (fontsLoaded || fontTimeout)) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded, fontTimeout]);

  // Determine if we should show the app
  const shouldShowApp = ready && (fontsLoaded || fontTimeout || fontError);

  // Show loading until ready
  if (!shouldShowApp) {
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
