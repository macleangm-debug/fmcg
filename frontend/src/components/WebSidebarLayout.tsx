import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useBusinessStore } from '../store/businessStore';

interface WebSidebarLayoutProps {
  children: React.ReactNode;
}

// Inline theme colors
const theme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  sidebarBg: '#FFFFFF',
  sidebarText: '#374151',
  sidebarActiveText: '#2563EB',
  sidebarActiveBg: '#EFF6FF',
};

export default function WebSidebarLayout({ children }: WebSidebarLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { businessSettings } = useBusinessStore();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const userRole = user?.role || 'sales_staff';
  const currentPath = '/' + segments.join('/');
  
  // Only show sidebar on web with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  
  const handleOpenHelp = () => {
    // Navigate to help page
    router.push('/help');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await logout();
        router.replace('/(auth)/login');
      }
    } else {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  // Define navigation items based on role
  const getNavItems = () => {
    const items: { name: string; label: string; icon: string; badge?: number }[] = [];
    
    // Dashboard - for all except sales_staff
    if (!['sales_staff', 'front_desk'].includes(userRole)) {
      items.push({ name: '/(tabs)/dashboard', label: 'Dashboard', icon: 'grid-outline' });
    }
    
    // Add Sale - for all
    items.push({ name: '/(tabs)/cart', label: 'Add Sale', icon: 'cart-outline', badge: cartCount });
    
    // Orders - for admin, manager, finance
    if (['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) {
      items.push({ name: '/(tabs)/orders', label: 'Orders', icon: 'receipt-outline' });
    }
    
    // Customers - for admin, manager
    if (['admin', 'manager', 'superadmin'].includes(userRole)) {
      items.push({ name: '/(tabs)/customers', label: 'Customers', icon: 'people-outline' });
    }
    
    return items;
  };

  const getAdminItems = () => {
    if (!['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) return [];
    
    const items: { name: string; label: string; icon: string }[] = [];
    
    if (['admin', 'manager', 'superadmin'].includes(userRole)) {
      items.push({ name: '/admin/products', label: 'Products', icon: 'cube-outline' });
      items.push({ name: '/admin/stock', label: 'Stock', icon: 'layers-outline' });
      items.push({ name: '/admin/categories', label: 'Categories', icon: 'folder-outline' });
      items.push({ name: '/admin/promotions', label: 'Promotions', icon: 'pricetag-outline' });
    }
    
    if (['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) {
      items.push({ name: '/admin/expenses', label: 'Expenses', icon: 'wallet-outline' });
      items.push({ name: '/admin/reports', label: 'Reports', icon: 'bar-chart-outline' });
    }
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      items.push({ name: '/admin/staff', label: 'Staff', icon: 'people-circle-outline' });
      items.push({ name: '/admin/settings', label: 'Settings', icon: 'settings-outline' });
    }
    
    return items;
  };

  const navItems = getNavItems();
  const adminItems = getAdminItems();

  const isActive = (name: string) => {
    return currentPath.includes(name.replace('/(tabs)', ''));
  };

  const handleNavPress = (name: string) => {
    router.push(name as any);
  };

  // For mobile or small screens, just render children (no sidebar)
  if (!isWebDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar with User Info */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName} numberOfLines={1}>
            {businessSettings?.name || 'RetailPro'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={styles.userRole}>{userRole.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body with Sidebar + Content */}
      <View style={styles.bodyContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          {/* Main Navigation */}
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            <Text style={styles.navSectionTitle}>MAIN MENU</Text>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => handleNavPress(item.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.name) ? theme.sidebarActiveText : theme.sidebarText}
                />
                <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {item.badge && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Admin Section */}
            {adminItems.length > 0 && (
              <>
                <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>MANAGEMENT</Text>
                {adminItems.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                    onPress={() => handleNavPress(item.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isActive(item.name) ? theme.sidebarActiveText : theme.sidebarText}
                    />
                    <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            
            {/* Help Section */}
            <View style={styles.helpSection}>
              <TouchableOpacity
                style={styles.helpButton}
                onPress={handleOpenHelp}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={20} color={theme.primary} />
                <Text style={styles.helpButtonText}>Help & Support</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  // Top Header
  topHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    maxWidth: 120,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  userRole: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.error,
  },
  // Body
  bodyContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: theme.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: theme.sidebarActiveBg,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.sidebarText,
    flex: 1,
  },
  navLabelActive: {
    color: theme.sidebarActiveText,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: theme.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Help Section
  helpSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 'auto',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.primaryLight,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.primary,
  },
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
