import React, { useEffect } from 'react';
import { Tabs, Slot, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import InvoiceSidebarLayout from '../../src/components/InvoiceSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';

// Invoice theme colors (Purple)
const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  inactive: '#9CA3AF',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

// Custom Tab Bar with centered New Invoice button
function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  
  // Tab items configuration (excluding hidden ones)
  const visibleTabs = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  // For invoicing we have 4 tabs: Invoices, Clients, Items, Reports
  // Layout: [Invoices] [Clients] [+ New Invoice] [Items] [Reports]
  
  return (
    <View style={tabBarStyles.container}>
      {/* Left tabs: Invoices, Clients */}
      <View style={tabBarStyles.leftTabs}>
        {visibleTabs.slice(0, 2).map((route: any) => {
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
                size: 22 
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

      {/* Center: New Invoice Button */}
      <TouchableOpacity 
        style={tabBarStyles.addButton}
        onPress={() => router.push('/invoicing/create')}
      >
        <View style={tabBarStyles.addButtonInner}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </View>
        <Text style={tabBarStyles.addButtonLabel}>New</Text>
      </TouchableOpacity>

      {/* Right tabs: Items, Reports */}
      <View style={tabBarStyles.rightTabs}>
        {visibleTabs.slice(2, 4).map((route: any) => {
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
                size: 22 
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

export default function InvoicingLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();
  
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
        <InvoiceSidebarLayout>
          <Slot />
        </InvoiceSidebarLayout>
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
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="list"
          options={{
            title: 'Invoices',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Items',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
            href: null, // Hide from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
            href: null, // Hide from tab bar - accessible via sidebar on web
          }}
        />
        <Tabs.Screen
          name="[id]"
          options={{
            title: 'Details',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
            href: null, // Hide from tab bar
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen
          name="create"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="staff"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="quotes"
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
