import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Linking,
  Modal,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import Icon from './Icon';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useBusinessStore } from '../store/businessStore';
import { subscriptionApi } from '../api/client';
import ProductSwitcher from './ProductSwitcher';
import LinkedAppsSidebar from './LinkedAppsSidebar';
import ContextSwitcher from './ContextSwitcher';

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
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<{ name: string; is_trial: boolean } | null>(null);
  
  const userRole = user?.role || 'sales_staff';
  const currentPath = '/' + segments.join('/');
  
  // Only show sidebar on web with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  
  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await subscriptionApi.getStatus();
        if (response.data?.plan) {
          setSubscriptionPlan({
            name: response.data.plan.name || 'Starter',
            is_trial: response.data.is_trial || false,
          });
        }
      } catch (error) {
        console.log('Could not fetch subscription status');
      }
    };
    if (user) {
      fetchSubscription();
    }
  }, [user]);
  
  const handleOpenHelp = () => {
    // Navigate to help page
    router.push('/help');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  // 3x3 Grid Icon Component
  const GridIcon = () => (
    <View style={styles.gridIconContainer}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <View key={i} style={styles.gridDot} />
      ))}
    </View>
  );

  // Define navigation items based on role - Reorganized for better UX
  const getNavItems = () => {
    const items: { name: string; label: string; icon: string; badge?: number }[] = [];
    
    // Dashboard - for all except sales_staff
    if (!['sales_staff', 'front_desk'].includes(userRole)) {
      items.push({ name: '/(tabs)/dashboard', label: 'Dashboard', icon: 'grid-outline' });
    }
    
    // Add Sale - for all (primary action)
    items.push({ name: '/(tabs)/cart', label: 'New Sale', icon: 'cart-outline', badge: cartCount });
    
    // Orders - for admin, manager, finance
    if (['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) {
      items.push({ name: '/(tabs)/orders', label: 'Orders', icon: 'receipt-outline' });
    }
    
    return items;
  };

  // Customers & Products section
  const getCatalogItems = () => {
    if (!['admin', 'manager', 'superadmin'].includes(userRole)) return [];
    
    return [
      { name: '/(tabs)/customers', label: 'Customers', icon: 'people-outline' },
      { name: '/admin/products', label: 'Products', icon: 'cube-outline' },
      { name: '/admin/categories', label: 'Categories', icon: 'folder-outline' },
    ];
  };

  // Promotions section (Stock is now in Inventory linked app)
  const getPromotionsItems = () => {
    if (!['admin', 'manager', 'superadmin'].includes(userRole)) return [];
    
    return [
      { name: '/admin/promotions', label: 'Promotions', icon: 'pricetag-outline' },
    ];
  };

  // Reports & Finance section
  const getFinanceItems = () => {
    if (!['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) return [];
    
    return [
      { name: '/admin/reports', label: 'Reports', icon: 'bar-chart-outline' },
      { name: '/admin/expenses', label: 'Expenses', icon: 'wallet-outline' },
    ];
  };

  // Settings & Admin section
  const getSettingsItems = () => {
    if (!['admin', 'superadmin'].includes(userRole)) return [];
    
    const items = [
      { name: '/admin/staff', label: 'Staff', icon: 'people-circle-outline' },
      { name: '/admin/settings', label: 'Settings', icon: 'settings-outline' },
    ];
    
    // Add Platform Admin for superadmins
    if (userRole === 'superadmin') {
      items.push({ name: '/platform-admin', label: 'Platform Admin', icon: 'shield-outline' });
    }
    
    return items;
  };

  const navItems = getNavItems();
  const catalogItems = getCatalogItems();
  const promotionsItems = getPromotionsItems();
  const financeItems = getFinanceItems();
  const settingsItems = getSettingsItems();

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
            <Icon name="storefront" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName} numberOfLines={1}>
            {businessSettings?.name || 'RetailPro'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Unified Context Switcher - Business + Location + Subscription */}
          {['admin', 'manager', 'superadmin'].includes(userRole) && (
            <ContextSwitcher 
              allowAddBusiness={true} 
              allowAddLocation={true}
              onBusinessSwitch={() => router.replace('/(tabs)/dashboard')}
              onLocationSwitch={() => {}}
            />
          )}
          
          {/* Apps Grid with Popup - using ProductSwitcher */}
          <ProductSwitcher currentProductId="retail_pro" />
          
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
            {/* Icon */}
            <View style={styles.logoutIconContainer}>
              <Icon name="log-out-outline" size={32} color="#DC2626" />
            </View>
            
            {/* Title */}
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            
            {/* Message */}
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to log out of your account?
            </Text>
            
            {/* Buttons */}
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
                <Icon name="log-out-outline" size={18} color="#FFFFFF" />
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
          {/* Main Navigation */}
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            <Text style={styles.navSectionTitle}>SALES</Text>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => handleNavPress(item.name)}
                activeOpacity={0.7}
              >
                <Icon
                  name={item.icon}
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

            {/* Customers & Catalog Section */}
            {catalogItems.length > 0 && (
              <>
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
              </>
            )}

            {/* Insights Section - Reports only, Expenses moves to Linked Apps */}
            {financeItems.length > 0 && (
              <>
                <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>INSIGHTS</Text>
                {financeItems.filter(item => item.name === '/admin/reports').map((item) => (
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

            {/* Settings Section */}
            {settingsItems.length > 0 && (
              <>
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
              </>
            )}

            {/* Refer & Earn Section - Highlighted for visibility */}
            <View style={styles.referralSection}>
              <TouchableOpacity
                style={[styles.referralButton, isActive('/(tabs)/referral') && styles.referralButtonActive]}
                onPress={() => handleNavPress('/(tabs)/referral')}
                activeOpacity={0.7}
                data-testid="sidebar-refer-earn-btn"
              >
                <View style={styles.referralIconContainer}>
                  <Ionicons name="gift" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.referralTextContainer}>
                  <Text style={styles.referralButtonText}>Refer & Earn</Text>
                  <Text style={styles.referralSubtext}>Get $10 per referral</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6366F1" />
              </TouchableOpacity>
              
              {/* Affiliate Partner Dashboard Link */}
              <TouchableOpacity
                style={[styles.affiliateButton, isActive('/affiliate-dashboard') && styles.affiliateButtonActive]}
                onPress={() => handleNavPress('/affiliate-dashboard')}
                activeOpacity={0.7}
                data-testid="sidebar-affiliate-dashboard-btn"
              >
                <View style={[styles.referralIconContainer, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="people" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.referralTextContainer}>
                  <Text style={styles.affiliateButtonText}>Affiliate Program</Text>
                  <Text style={styles.referralSubtext}>Become a partner</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#10B981" />
              </TouchableOpacity>
            </View>

            {/* Linked Apps Section - Dynamic apps that can be linked */}
            {['admin', 'manager', 'superadmin'].includes(userRole) && (
              <LinkedAppsSidebar 
                currentProductId="retailpro"
                themeColor={theme.primary}
                themeBgColor={theme.primaryLight}
              />
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
  // Subscription Badge Styles
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    marginRight: 8,
  },
  subscriptionBadgePro: {
    backgroundColor: '#7C3AED',
  },
  subscriptionBadgeEnterprise: {
    backgroundColor: '#1F2937',
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  subscriptionBadgeTextLight: {
    color: '#FFFFFF',
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
  // Grid Icon Styles
  gridButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.textSecondary,
  },
  // Logout Modal Styles
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
    color: theme.text,
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: theme.textSecondary,
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
    color: theme.textSecondary,
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
  // Referral Section
  referralSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  referralButtonActive: {
    backgroundColor: '#E0E7FF',
    borderColor: '#A5B4FC',
  },
  referralIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTextContainer: {
    flex: 1,
  },
  referralButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  referralSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  // Affiliate Button
  affiliateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 10,
  },
  affiliateButtonActive: {
    backgroundColor: '#A7F3D0',
    borderColor: '#6EE7B7',
  },
  affiliateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
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
