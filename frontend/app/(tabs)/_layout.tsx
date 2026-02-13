import React, { useEffect } from 'react';
import { Tabs, useRouter, useSegments, Slot } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';

// Role-based tab access configuration
// admin: Full access to everything + all admin tools
// manager: Full access to everything + some admin tools (Staff, Products, Promotions, Expenses, Categories)
// sales_staff: ONLY Add Sale functionality
// front_desk: ONLY Add Sale functionality (same as sales_staff)
// finance: Dashboard, Reports, Expenses (financial section)

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { user } = useAuthStore();
  const userRole = user?.role || 'sales_staff';
  
  // Only show web sidebar on web platform with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  // Redirect sales_staff and front_desk to cart tab
  useEffect(() => {
    if ((userRole === 'sales_staff' || userRole === 'front_desk') && segments[1] !== 'cart') {
      router.replace('/(tabs)/cart');
    }
  }, [userRole, segments]);

  // Define which tabs each role can see
  const canAccessTab = (tabName: string): boolean => {
    // Admin, Manager, Superadmin can access all tabs
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'superadmin') {
      return true;
    }
    
    // Sales Staff and Front Desk: ONLY Add Sale (cart) tab
    if (userRole === 'sales_staff' || userRole === 'front_desk') {
      return tabName === 'cart';
    }
    
    // Finance: Dashboard and Orders (for financial tracking)
    if (userRole === 'finance') {
      return ['dashboard', 'orders'].includes(tabName);
    }
    
    return true; // Default allow
  };

  // For web desktop, use the sidebar layout with floating help button
  if (isWebDesktop) {
    return (
      <View style={styles.webContainer}>
        <WebSidebarLayout>
          <Slot />
        </WebSidebarLayout>
        <FloatingHelpButton />
      </View>
    );
  }

  // For mobile and small screens, use the bottom tabs with floating help button
  return (
    <View style={styles.mobileContainer}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
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
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
            href: canAccessTab('dashboard') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
            href: canAccessTab('products') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Add Sale',
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="add-circle-outline" size={size} color={color} />
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Ionicons name="ellipse" size={16} color="#DC2626" />
                  </View>
                )}
              </View>
            ),
            href: canAccessTab('cart') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Customers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
            href: canAccessTab('customers') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
            href: canAccessTab('orders') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="WebLayout"
          options={{
            href: null, // Hide from tabs
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
});
