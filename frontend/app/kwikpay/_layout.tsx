import React, { useEffect, useState } from 'react';
import { Tabs, Slot, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { subscriptionApi } from '../../src/api/client';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';
import ContextSwitcher from '../../src/components/ContextSwitcher';

// KwikPay theme colors - Green for payments/finance
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  inactive: '#9CA3AF',
  white: '#FFFFFF',
  border: '#E5E7EB',
  dark: '#111827',
};

export default function KwikPayLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated, user } = useAuthStore();
  const userRole = user?.role || 'admin';
  
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  
  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);
  
  // Fetch subscription on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const subResponse = await subscriptionApi.getStatus();
        setSubscription(subResponse.data);
      } catch (error) {
        console.log('Failed to fetch subscription:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // Get subscription badge info
  const getSubscriptionBadge = () => {
    const planName = subscription?.plan_name || 'starter';
    const colors: Record<string, { bg: string; text: string }> = {
      starter: { bg: '#D1FAE5', text: '#10B981' },
      professional: { bg: '#FEF3C7', text: '#D97706' },
      enterprise: { bg: '#DBEAFE', text: '#2563EB' },
    };
    return {
      name: planName.charAt(0).toUpperCase() + planName.slice(1),
      ...colors[planName] || colors.starter,
    };
  };
  
  const badge = getSubscriptionBadge();

  if (isWebDesktop) {
    return (
      <View style={styles.webContainer}>
        <WebSidebarLayout>
          <Slot />
        </WebSidebarLayout>
      </View>
    );
  }

  // Mobile layout - matching RetailPro standard
  return (
    <View style={styles.mobileContainer}>
      {/* Mobile Header with Context Switcher - Same as RetailPro */}
      <SafeAreaView edges={['top']} style={styles.mobileHeader}>
        <View style={styles.mobileHeaderContent}>
          {/* Context Switcher for admin users */}
          {['admin', 'manager', 'superadmin'].includes(userRole) ? (
            <ContextSwitcher 
              allowAddBusiness={false} 
              allowAddLocation={false}
              onBusinessSwitch={() => router.replace('/kwikpay')}
              onLocationSwitch={() => {}}
            />
          ) : (
            <View style={styles.logoContainer}>
              <Ionicons name="card" size={20} color={COLORS.primary} />
              <Text style={styles.logoText}>KwikPay</Text>
            </View>
          )}
          
          {/* Subscription Badge */}
          <View style={[styles.subscriptionBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.subscriptionBadgeText, { color: badge.text }]}>
              {badge.name}
            </Text>
          </View>
        </View>
      </SafeAreaView>
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.inactive,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 88 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="checkout"
          options={{
            title: 'Checkout',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.addButton}>
                <View style={[styles.addButtonInner, focused && styles.addButtonFocused]}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="payouts"
          options={{
            title: 'Payouts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="collect" options={{ href: null }} />
        <Tabs.Screen name="mobile-money" options={{ href: null }} />
        <Tabs.Screen name="payment-links" options={{ href: null }} />
        <Tabs.Screen name="recurring" options={{ href: null }} />
        <Tabs.Screen name="disputes" options={{ href: null }} />
        <Tabs.Screen name="fraud" options={{ href: null }} />
        <Tabs.Screen name="multi-currency" options={{ href: null }} />
        <Tabs.Screen name="virtual-accounts" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="roles" options={{ href: null }} />
        <Tabs.Screen name="invoicing" options={{ href: null }} />
        <Tabs.Screen name="qr-codes" options={{ href: null }} />
        <Tabs.Screen name="split-payments" options={{ href: null }} />
        <Tabs.Screen name="api-docs" options={{ href: null }} />
        <Tabs.Screen name="webhooks" options={{ href: null }} />
        <Tabs.Screen name="checkout-themes" options={{ href: null }} />
        <Tabs.Screen name="gateway" options={{ href: null }} />
        <Tabs.Screen name="kwikcheckout" options={{ href: null }} />
        <Tabs.Screen name="compliance" options={{ href: null }} />
        <Tabs.Screen name="onboarding" options={{ href: null }} />
        <Tabs.Screen name="developers" options={{ href: null }} />
      </Tabs>
      <FloatingHelpButton />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
  },
  // Mobile Header - Same as RetailPro
  mobileHeader: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Add Button - Prominent FAB style (same as RetailPro Add Sale)
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonFocused: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 1.05 }],
  },
});
