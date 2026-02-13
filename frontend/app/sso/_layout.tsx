import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function SSOLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: isWeb ? 'none' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="apps" />
      <Stack.Screen name="register-app" />
      <Stack.Screen name="developer" />
    </Stack>
  );
}
