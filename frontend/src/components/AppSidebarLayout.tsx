import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useCartStore } from '../store/cartStore';
import ProductSwitcher from './ProductSwitcher';
import LinkedAppsSidebar from './LinkedAppsSidebar';
import ContextSwitcher from './ContextSwitcher';
import OfflineStatusIndicator from './OfflineStatusIndicator';

// App Configuration Interface
export interface AppConfig {
  appId: 'retailpro' | 'inventory' | 'invoicing';
  appName: string;
  appIcon: keyof typeof Ionicons.glyphMap;
  theme: {
    primary: string;
    primaryLight: string;
    sidebarActiveText: string;
    sidebarActiveBg: string;
  };
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  comingSoon?: boolean;
}

interface AppSidebarLayoutProps {
  children: React.ReactNode;
  appConfig: AppConfig;
  navSections: NavSection[];
  showCart?: boolean;
  showLinkedApps?: boolean;
  showHelpButton?: boolean;
  showBackToGalaxy?: boolean;
  onHelpPress?: () => void;
}

// Base theme colors
const baseTheme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  sidebarBg: '#FFFFFF',
  sidebarText: '#374151',
  error: '#DC2626',
};

export default function AppSidebarLayout({
  children,
  appConfig,
  navSections,
  showCart = false,
  showLinkedApps = true,
  showHelpButton = true,
  showBackToGalaxy = false,
  onHelpPress,
}: AppSidebarLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { businessSettings } = useBusinessStore();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentPath = '/' + segments.join('/');
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const isActive = (name: string) => {
    // Handle exact match for dashboard routes
    const dashboardRoutes = ['/inventory', '/invoicing', '/(tabs)/dashboard'];
    if (dashboardRoutes.includes(name) && currentPath === name) return true;
    
    // Handle partial matching
    if (name !== '/inventory' && name !== '/invoicing' && name !== '/(tabs)/dashboard') {
      return currentPath.includes(name.replace('/(tabs)', ''));
    }
    return false;
  };

  const handleNavPress = (name: string) => {
    router.push(name as any);
  };

  const handleHelp = () => {
    if (onHelpPress) {
      onHelpPress();
    } else {
      router.push('/help');
    }
  };

  // Compute display name - use business name for RetailPro or app name
  const displayName = appConfig.appId === 'retailpro' 
    ? (businessSettings?.name || appConfig.appName)
    : appConfig.appName;

  // For mobile or small screens, just render children (no sidebar)
  if (!isWebDesktop) {
    return <>{children}</>;
  }

  const styles = createStyles(appConfig.theme);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoContainer, { backgroundColor: appConfig.theme.primary }]}>
            <Ionicons name={appConfig.appIcon} size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Context Switcher - Business & Location */}
          {/* allowAddBusiness/Location based on whether this is the main app (retailpro) */}
          <ContextSwitcher 
            allowAddBusiness={appConfig.appId === 'retailpro'} 
            allowAddLocation={appConfig.appId === 'retailpro'}
            onBusinessSwitch={() => router.replace(`/${appConfig.appId === 'retailpro' ? '(tabs)/dashboard' : appConfig.appId}`)}
            onLocationSwitch={() => {}}
          />
          
          {/* Product Switcher */}
          <ProductSwitcher currentProductId={appConfig.appId === 'retailpro' ? 'retail_pro' : appConfig.appId} />

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: appConfig.theme.primary }]}>
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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={confirmLogout}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Body with Sidebar + Content */}
      <View style={styles.bodyContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            {navSections.map((section, sectionIndex) => (
              <View key={section.title}>
                <Text style={[styles.navSectionTitle, sectionIndex > 0 && { marginTop: 24 }]}>
                  {section.title}
                </Text>
                {section.items.map((item) => {
                  // Handle cart badge
                  const badge = item.name === '/(tabs)/cart' && showCart ? cartCount : item.badge;
                  
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                      onPress={() => handleNavPress(item.name)}
                      activeOpacity={0.7}
                      disabled={item.comingSoon}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={isActive(item.name) ? appConfig.theme.sidebarActiveText : baseTheme.sidebarText}
                      />
                      <Text style={[styles.navLabel, isActive(item.name) && { color: appConfig.theme.sidebarActiveText, fontWeight: '600' }]}>
                        {item.label}
                      </Text>
                      {badge && badge > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                      )}
                      {item.comingSoon && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>SOON</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Linked Apps Section */}
            {showLinkedApps && (
              <LinkedAppsSidebar
                currentProductId={appConfig.appId}
                themeColor={appConfig.theme.primary}
                themeBgColor={appConfig.theme.primaryLight}
              />
            )}

            {/* Back to Galaxy */}
            {showBackToGalaxy && (
              <View style={styles.backSection}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.push('/landing')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={appConfig.theme.primary} />
                  <Text style={[styles.backButtonText, { color: appConfig.theme.primary }]}>Back to Galaxy</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Offline Status Indicator */}
            <View style={styles.offlineSection}>
              <OfflineStatusIndicator showInHeader />
            </View>

            {/* Help Section */}
            {showHelpButton && (
              <View style={styles.helpSection}>
                <TouchableOpacity
                  style={[styles.helpButton, { backgroundColor: appConfig.theme.primaryLight }]}
                  onPress={handleHelp}
                  activeOpacity={0.7}
                >
                  <Ionicons name="help-circle-outline" size={20} color={appConfig.theme.primary} />
                  <Text style={[styles.helpButtonText, { color: appConfig.theme.primary }]}>Help & Support</Text>
                </TouchableOpacity>
              </View>
            )}
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

// Pre-defined app configurations
export const APP_CONFIGS: Record<string, AppConfig> = {
  retailpro: {
    appId: 'retailpro',
    appName: 'RetailPro',
    appIcon: 'storefront',
    theme: {
      primary: '#2563EB',
      primaryLight: '#EFF6FF',
      sidebarActiveText: '#2563EB',
      sidebarActiveBg: '#EFF6FF',
    },
  },
  inventory: {
    appId: 'inventory',
    appName: 'Inventory',
    appIcon: 'cube',
    theme: {
      primary: '#059669',
      primaryLight: '#D1FAE5',
      sidebarActiveText: '#059669',
      sidebarActiveBg: '#D1FAE5',
    },
  },
  invoicing: {
    appId: 'invoicing',
    appName: 'Invoicing',
    appIcon: 'document-text',
    theme: {
      primary: '#7C3AED',
      primaryLight: '#EDE9FE',
      sidebarActiveText: '#7C3AED',
      sidebarActiveBg: '#EDE9FE',
    },
  },
};

const createStyles = (theme: AppConfig['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: baseTheme.background,
  },
  topHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: baseTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: baseTheme.border,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: baseTheme.text,
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
    borderLeftColor: baseTheme.border,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    color: baseTheme.text,
  },
  userRole: {
    fontSize: 10,
    color: baseTheme.textSecondary,
    marginTop: 1,
  },
  // Logout Modal
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  logoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: baseTheme.text,
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: baseTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: baseTheme.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  logoutConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Body
  bodyContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: baseTheme.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: baseTheme.border,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: baseTheme.textMuted,
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
    color: baseTheme.sidebarText,
    flex: 1,
  },
  badge: {
    backgroundColor: baseTheme.error,
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
  // Back Section
  backSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: baseTheme.border,
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
  },
  // Help Section
  helpSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: baseTheme.border,
    marginTop: 'auto',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: baseTheme.background,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
