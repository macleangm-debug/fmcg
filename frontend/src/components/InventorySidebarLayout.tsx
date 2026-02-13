import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import ProductSwitcher from './ProductSwitcher';
import LinkedAppsSidebar from './LinkedAppsSidebar';
import ContextSwitcher from './ContextSwitcher';

interface InventorySidebarLayoutProps {
  children: React.ReactNode;
}

// Inventory theme colors - Green based
const theme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#059669', // Green for inventory
  primaryLight: '#D1FAE5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  sidebarBg: '#FFFFFF',
  sidebarText: '#374151',
  sidebarActiveText: '#059669',
  sidebarActiveBg: '#D1FAE5',
};

export default function InventorySidebarLayout({ children }: InventorySidebarLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  
  const currentPath = '/' + segments.join('/');
  
  // Only show sidebar on web with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await logout();
        router.replace('/landing');
      }
    } else {
      await logout();
      router.replace('/landing');
    }
  };

  // Navigation items for Inventory app - Reorganized for better UX
  
  // Stock Management - Primary tasks
  const stockItems = [
    { name: '/inventory', label: 'Dashboard', icon: 'grid-outline' },
    { name: '/inventory/products', label: 'Products', icon: 'cube-outline' },
    { name: '/inventory/movements', label: 'Movements', icon: 'swap-horizontal-outline' },
    { name: '/inventory/low-stock', label: 'Low Stock', icon: 'alert-circle-outline' },
  ];

  // Catalog - Organization
  const catalogItems = [
    { name: '/inventory/categories', label: 'Categories', icon: 'folder-outline' },
    { name: '/inventory/suppliers', label: 'Suppliers', icon: 'business-outline' },
    { name: '/inventory/locations', label: 'Locations', icon: 'location-outline' },
  ];

  // Orders & Procurement
  const procurementItems = [
    { name: '/inventory/purchase-orders', label: 'Purchase Orders', icon: 'document-text-outline' },
    { name: '/inventory/receiving', label: 'Receiving', icon: 'archive-outline' },
  ];

  // Insights - Reports
  const insightsItems = [
    { name: '/inventory/reports', label: 'Reports', icon: 'bar-chart-outline' },
    { name: '/inventory/alerts', label: 'Alerts', icon: 'notifications-outline' },
  ];

  // Settings
  const settingsItems = [
    { name: '/inventory/settings', label: 'Settings', icon: 'settings-outline' },
  ];

  const isActive = (name: string) => {
    if (name === '/inventory' && currentPath === '/inventory') return true;
    if (name !== '/inventory' && currentPath.startsWith(name)) return true;
    return false;
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
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>Inventory</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Context Switcher - Business & Location (no add buttons - linked app) */}
          <ContextSwitcher 
            allowAddBusiness={false} 
            allowAddLocation={false}
            onBusinessSwitch={() => router.replace('/inventory')}
            onLocationSwitch={() => {}}
          />
          
          {/* Product Switcher */}
          <ProductSwitcher currentProductId="inventory" />
          
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Body with Sidebar + Content */}
      <View style={styles.bodyContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            {/* Stock Management Section */}
            <Text style={styles.navSectionTitle}>STOCK</Text>
            {stockItems.map((item) => (
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

            {/* Catalog Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>CATALOG</Text>
            {catalogItems.map((item) => (
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

            {/* Procurement Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>PROCUREMENT</Text>
            {procurementItems.map((item) => (
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

            {/* Insights Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>INSIGHTS</Text>
            {insightsItems.map((item) => (
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

            {/* Settings Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>SETTINGS</Text>
            {settingsItems.map((item) => (
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

            {/* Linked Apps Section - Dynamic apps that can be linked */}
            <LinkedAppsSidebar 
              currentProductId="inventory"
              themeColor={theme.primary}
              themeBgColor={theme.primaryLight}
            />
            
            {/* Back to Galaxy */}
            <View style={styles.backSection}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/landing')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={theme.primary} />
                <Text style={styles.backButtonText}>Back to Galaxy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {children}
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
  betaBadge: {
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.primary,
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
    maxWidth: 140,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  userEmail: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
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
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D97706',
  },
  backSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.primary,
  },
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: theme.background,
  },
});
