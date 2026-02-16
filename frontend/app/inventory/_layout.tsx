import React, { useEffect, useState } from 'react';
import { Tabs, Slot, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';

// Inventory theme colors
const COLORS = {
  primary: '#059669',
  primaryLight: '#D1FAE5',
  inactive: '#9CA3AF',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

// Custom Tab Bar with centered Add Stock button
function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  
  // Tab items configuration (excluding hidden ones)
  const visibleTabs = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  return (
    <View style={tabBarStyles.container}>
      {/* Left tabs: Dashboard, Products */}
      <View style={tabBarStyles.leftTabs}>
        {visibleTabs.slice(0, 2).map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabBarStyles.tabItem}
            >
              {options.tabBarIcon?.({ 
                color: isFocused ? COLORS.primary : COLORS.inactive, 
                size: 24 
              })}
              <Text style={[
                tabBarStyles.tabLabel,
                { color: isFocused ? COLORS.primary : COLORS.inactive }
              ]}>
                {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center: Add Stock Button */}
      <TouchableOpacity 
        style={tabBarStyles.addButton}
        onPress={() => router.push('/inventory?openAdd=true')}
      >
        <View style={tabBarStyles.addButtonInner}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </View>
        <Text style={tabBarStyles.addButtonLabel}>Add Stock</Text>
      </TouchableOpacity>

      {/* Right tabs: Categories, History */}
      <View style={tabBarStyles.rightTabs}>
        {visibleTabs.slice(2, 4).map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabBarStyles.tabItem}
            >
              {options.tabBarIcon?.({ 
                color: isFocused ? COLORS.primary : COLORS.inactive, 
                size: 24 
              })}
              <Text style={[
                tabBarStyles.tabLabel,
                { color: isFocused ? COLORS.primary : COLORS.inactive }
              ]}>
                {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 88 : 70,
    alignItems: 'flex-end',
  },
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    marginTop: -30,
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
});

export default function InventoryLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { isAuthenticated, user } = useAuthStore();
  
  // Check if we're on web desktop
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // For web desktop, use the sidebar layout
  if (isWebDesktop) {
    return (
      <View style={styles.webContainer}>
        <WebSidebarLayout>
          <Slot />
        </WebSidebarLayout>
      </View>
    );
  }

  // For mobile, use bottom tabs with custom tab bar
  return (
    <View style={styles.mobileContainer}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
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
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: 'Categories',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="movements"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens for web sidebar navigation */}
        <Tabs.Screen
          name="suppliers"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="purchase-orders"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="receiving"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
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
});
