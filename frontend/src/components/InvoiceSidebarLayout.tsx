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

interface InvoiceSidebarLayoutProps {
  children: React.ReactNode;
}

// Invoice app theme colors (purple theme)
const theme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#7C3AED', // Purple for invoicing
  primaryLight: '#EDE9FE',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  sidebarBg: '#FFFFFF',
  sidebarText: '#374151',
  sidebarActiveText: '#7C3AED',
  sidebarActiveBg: '#EDE9FE',
};

export default function InvoiceSidebarLayout({ children }: InvoiceSidebarLayoutProps) {
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

  // Navigation items for Invoice app - Reorganized for better UX
  
  // Sales & Billing - Primary revenue tasks
  const salesItems = [
    { name: '/invoicing', label: 'Dashboard', icon: 'grid-outline' },
    { name: '/invoicing/list', label: 'Invoices', icon: 'document-text-outline' },
    { name: '/invoicing/quotes', label: 'Quotes', icon: 'clipboard-outline' },
    { name: '/invoicing/recurring', label: 'Recurring', icon: 'repeat-outline' },
    { name: '/invoicing/payments', label: 'Payments', icon: 'card-outline' },
  ];

  // Contacts & Catalog - Data management
  const catalogItems = [
    { name: '/invoicing/clients', label: 'Clients', icon: 'people-outline' },
    { name: '/invoicing/products', label: 'Products & Services', icon: 'cube-outline' },
  ];

  // Insights - Reports & Analytics
  const insightsItems = [
    { name: '/invoicing/reports', label: 'Reports', icon: 'bar-chart-outline' },
  ];

  // Configuration - Settings & Admin
  const configItems = [
    { name: '/invoicing/categories', label: 'Categories', icon: 'folder-outline' },
    { name: '/invoicing/reminders', label: 'Reminders', icon: 'notifications-outline' },
    { name: '/invoicing/staff', label: 'Staff', icon: 'person-outline' },
    { name: '/invoicing/settings', label: 'Settings', icon: 'settings-outline' },
  ];

  const isActive = (name: string) => {
    if (name === '/invoicing' && currentPath === '/invoicing') return true;
    if (name !== '/invoicing' && currentPath.startsWith(name)) return true;
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
            <Ionicons name="document-text" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>Invoicing</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Context Switcher - Business & Location (no add buttons - linked app) */}
          <ContextSwitcher 
            allowAddBusiness={false} 
            allowAddLocation={false}
            onBusinessSwitch={() => router.replace('/invoicing')}
            onLocationSwitch={() => {}}
          />
          
          {/* Apps Grid with Popup - using ProductSwitcher */}
          <ProductSwitcher currentProductId="invoicing" />
          
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={styles.userRole}>{user?.role?.replace('_', ' ').toUpperCase() || 'USER'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Body with Sidebar + Content */}
      <View style={styles.bodyContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            {/* Sales & Billing Section */}
            <Text style={styles.navSectionTitle}>SALES & BILLING</Text>
            {salesItems.map((item) => (
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

            {/* Contacts & Catalog Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>CONTACTS & CATALOG</Text>
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

            {/* Configuration Section */}
            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>CONFIGURATION</Text>
            {configItems.map((item) => (
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
              currentProductId="invoicing"
              themeColor={theme.primary}
              themeBgColor={theme.primaryLight}
            />

            {/* Help Section */}
            <View style={styles.helpSection}>
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => router.push('/help')}
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
