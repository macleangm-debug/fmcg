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
import OfflineStatusIndicator from './common/OfflineStatusIndicator';

interface WebSidebarLayoutProps {
  children: React.ReactNode;
}

// Product-specific theme configurations
const PRODUCT_THEMES: Record<string, { 
  primary: string; 
  primaryDark: string; 
  primaryLight: string;
  name: string;
}> = {
  // RetailPro - Default green theme
  dashboard: { primary: '#1B4332', primaryDark: '#0F2D21', primaryLight: '#D8F3DC', name: 'RetailPro' },
  retailpro: { primary: '#1B4332', primaryDark: '#0F2D21', primaryLight: '#D8F3DC', name: 'RetailPro' },
  // Inventory - Blue theme
  inventory: { primary: '#1E40AF', primaryDark: '#1E3A8A', primaryLight: '#DBEAFE', name: 'Inventory' },
  // Invoicing - Indigo theme
  invoicing: { primary: '#4F46E5', primaryDark: '#3730A3', primaryLight: '#E0E7FF', name: 'Invoicing' },
  // KwikPay - Emerald theme
  kwikpay: { primary: '#047857', primaryDark: '#065F46', primaryLight: '#D1FAE5', name: 'KwikPay' },
  // UniTxt - Amber theme
  unitxt: { primary: '#D97706', primaryDark: '#B45309', primaryLight: '#FEF3C7', name: 'UniTxt' },
  // Expenses - Red theme
  expenses: { primary: '#DC2626', primaryDark: '#B91C1C', primaryLight: '#FEE2E2', name: 'Expenses' },
  // Loyalty - Pink theme
  loyalty: { primary: '#DB2777', primaryDark: '#BE185D', primaryLight: '#FCE7F3', name: 'Loyalty' },
};

// Base theme colors
const baseTheme = {
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#1B4332',
  primaryLight: '#D8F3DC',
  success: '#40916C',
  successLight: '#95D5B2',
  warning: '#F59E0B',
  error: '#DC2626',
  accent: '#E9A319',
  // Default sidebar theme - Dark Green
  sidebarBg: '#1B4332',
  sidebarText: '#95D5B2',
  sidebarActiveText: '#FFFFFF',
  sidebarActiveBg: 'rgba(255, 255, 255, 0.15)',
  sidebarHover: 'rgba(255, 255, 255, 0.08)',
  sidebarDivider: 'rgba(255, 255, 255, 0.1)',
};

// Helper to get current product theme based on route
const getProductTheme = (segments: string[]) => {
  const productSegment = segments.find(seg => 
    Object.keys(PRODUCT_THEMES).includes(seg.toLowerCase())
  )?.toLowerCase();
  
  // Check if we're on a product-specific route
  if (productSegment && PRODUCT_THEMES[productSegment]) {
    return PRODUCT_THEMES[productSegment];
  }
  
  // Default to RetailPro/dashboard theme
  return PRODUCT_THEMES.dashboard;
};

// Helper to get current product ID from route
const getCurrentProductId = (segments: string[]): string => {
  const productSegment = segments.find(seg => 
    Object.keys(PRODUCT_THEMES).includes(seg.toLowerCase())
  )?.toLowerCase();
  
  if (productSegment) {
    return productSegment;
  }
  
  // Default to retailpro for dashboard/tabs routes
  return 'retailpro';
};

// Map route segment to ProductSwitcher app.id
const ROUTE_TO_APP_ID: Record<string, string> = {
  'retailpro': 'retail_pro',
  'dashboard': 'retail_pro',
  '(tabs)': 'retail_pro',
  'inventory': 'inventory',
  'invoicing': 'invoicing',
  'kwikpay': 'kwikpay',
  'unitxt': 'bulk_sms',
  'expenses': 'expenses',
  'loyalty': 'loyalty',
};

// Helper to get ProductSwitcher app.id from route
const getAppIdFromRoute = (segments: string[]): string => {
  const productSegment = segments.find(seg => 
    ROUTE_TO_APP_ID[seg.toLowerCase()]
  )?.toLowerCase();
  
  if (productSegment) {
    return ROUTE_TO_APP_ID[productSegment];
  }
  
  // Default to retail_pro
  return 'retail_pro';
};

// Product-specific sidebar menu configurations
interface NavItem {
  name: string;
  label: string;
  icon: string;
  badge?: number;
}

interface ProductMenuConfig {
  sections: {
    title: string;
    items: NavItem[];
  }[];
}

const PRODUCT_MENUS: Record<string, ProductMenuConfig> = {
  retailpro: {
    sections: [
      {
        title: 'SALES',
        items: [
          { name: '/(tabs)/dashboard', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/(tabs)/cart', label: 'New Sale', icon: 'cart-outline' },
          { name: '/(tabs)/orders', label: 'Orders', icon: 'receipt-outline' },
        ]
      },
      {
        title: 'CATALOG',
        items: [
          { name: '/(tabs)/customers', label: 'Customers', icon: 'people-outline' },
          { name: '/admin/products', label: 'Products', icon: 'cube-outline' },
          { name: '/admin/categories', label: 'Categories', icon: 'folder-outline' },
        ]
      },
      {
        title: 'INSIGHTS',
        items: [
          { name: '/admin/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/admin/staff', label: 'Staff', icon: 'people-circle-outline' },
          { name: '/admin/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  unitxt: {
    sections: [
      {
        title: 'SMS',
        items: [
          { name: '/unitxt', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/unitxt/campaign/new', label: 'New Campaign', icon: 'send-outline' },
          { name: '/unitxt/campaigns', label: 'Campaigns', icon: 'chatbubbles-outline' },
        ]
      },
      {
        title: 'CONTACTS',
        items: [
          { name: '/unitxt/contacts', label: 'Contacts', icon: 'people-outline' },
          { name: '/unitxt/groups', label: 'Groups', icon: 'folder-outline' },
          { name: '/unitxt/templates', label: 'Templates', icon: 'document-text-outline' },
        ]
      },
      {
        title: 'ACCOUNT',
        items: [
          { name: '/unitxt/credits', label: 'SMS Credits', icon: 'wallet-outline' },
          { name: '/unitxt/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/unitxt/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  inventory: {
    sections: [
      {
        title: 'STOCK',
        items: [
          { name: '/inventory', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/inventory/stock', label: 'Stock Levels', icon: 'layers-outline' },
          { name: '/inventory/receive', label: 'Receive Stock', icon: 'arrow-down-outline' },
        ]
      },
      {
        title: 'MANAGEMENT',
        items: [
          { name: '/inventory/warehouses', label: 'Warehouses', icon: 'business-outline' },
          { name: '/inventory/transfers', label: 'Transfers', icon: 'swap-horizontal-outline' },
          { name: '/inventory/adjustments', label: 'Adjustments', icon: 'create-outline' },
        ]
      },
      {
        title: 'ALERTS',
        items: [
          { name: '/inventory/alerts', label: 'Low Stock Alerts', icon: 'alert-circle-outline' },
          { name: '/inventory/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/inventory/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  invoicing: {
    sections: [
      {
        title: 'INVOICES',
        items: [
          { name: '/invoicing', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/invoicing/new', label: 'New Invoice', icon: 'add-circle-outline' },
          { name: '/invoicing/list', label: 'All Invoices', icon: 'document-text-outline' },
        ]
      },
      {
        title: 'QUOTES',
        items: [
          { name: '/invoicing/quotes', label: 'Quotes', icon: 'reader-outline' },
          { name: '/invoicing/recurring', label: 'Recurring', icon: 'repeat-outline' },
        ]
      },
      {
        title: 'CLIENTS',
        items: [
          { name: '/invoicing/clients', label: 'Clients', icon: 'people-outline' },
          { name: '/invoicing/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/invoicing/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  kwikpay: {
    sections: [
      {
        title: 'PAYMENTS',
        items: [
          { name: '/kwikpay', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/kwikpay/transactions', label: 'Transactions', icon: 'swap-vertical-outline' },
          { name: '/kwikpay/collect', label: 'Collect Payment', icon: 'card-outline' },
        ]
      },
      {
        title: 'TOOLS',
        items: [
          { name: '/kwikpay/links', label: 'Payment Links', icon: 'link-outline' },
          { name: '/kwikpay/qr', label: 'QR Codes', icon: 'qr-code-outline' },
        ]
      },
      {
        title: 'FINANCE',
        items: [
          { name: '/kwikpay/settlements', label: 'Settlements', icon: 'wallet-outline' },
          { name: '/kwikpay/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/kwikpay/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  expenses: {
    sections: [
      {
        title: 'EXPENSES',
        items: [
          { name: '/expenses', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/expenses/add', label: 'Add Expense', icon: 'add-circle-outline' },
          { name: '/expenses/list', label: 'All Expenses', icon: 'list-outline' },
        ]
      },
      {
        title: 'RECEIPTS',
        items: [
          { name: '/expenses/scan', label: 'Scan Receipt', icon: 'camera-outline' },
          { name: '/expenses/receipts', label: 'Receipts', icon: 'document-attach-outline' },
        ]
      },
      {
        title: 'BUDGETS',
        items: [
          { name: '/expenses/categories', label: 'Categories', icon: 'folder-outline' },
          { name: '/expenses/budgets', label: 'Budgets', icon: 'pie-chart-outline' },
          { name: '/expenses/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/expenses/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
  loyalty: {
    sections: [
      {
        title: 'LOYALTY',
        items: [
          { name: '/loyalty', label: 'Dashboard', icon: 'grid-outline' },
          { name: '/loyalty/programs', label: 'Programs', icon: 'ribbon-outline' },
          { name: '/loyalty/rewards', label: 'Rewards', icon: 'gift-outline' },
        ]
      },
      {
        title: 'MEMBERS',
        items: [
          { name: '/loyalty/members', label: 'Members', icon: 'people-outline' },
          { name: '/loyalty/tiers', label: 'Tiers', icon: 'trophy-outline' },
          { name: '/loyalty/points', label: 'Points History', icon: 'time-outline' },
        ]
      },
      {
        title: 'CAMPAIGNS',
        items: [
          { name: '/loyalty/campaigns', label: 'Campaigns', icon: 'megaphone-outline' },
          { name: '/loyalty/reports', label: 'Reports', icon: 'bar-chart-outline' },
        ]
      },
      {
        title: 'SETTINGS',
        items: [
          { name: '/loyalty/settings', label: 'Settings', icon: 'settings-outline' },
        ]
      }
    ]
  },
};

// Use a static reference for the StyleSheet (base styles)
const theme = baseTheme;

export default function WebSidebarLayout({ children }: WebSidebarLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { businessSettings } = useBusinessStore();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Get dynamic product theme based on current route
  const productTheme = getProductTheme(segments);
  const currentProductId = getCurrentProductId(segments);
  // Sidebar stays light with themed accents - NOT full colored
  const dynamicSidebarBg = '#FFFFFF';
  const dynamicSidebarText = '#6B7280';
  const dynamicSidebarActiveText = productTheme.primary;
  const dynamicSidebarActiveBg = productTheme.primaryLight;
  const dynamicHeaderBg = productTheme.primary;
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<{ name: string; is_trial: boolean } | null>(null);
  
  const userRole = user?.role || '';
  const displayRole = userRole ? userRole.replace('_', ' ').toUpperCase() : 'Loading...';
  const currentPath = '/' + segments.join('/');
  
  // Only show sidebar on web with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  
  // Get product-specific menu configuration
  const productMenu = PRODUCT_MENUS[currentProductId] || PRODUCT_MENUS.retailpro;
  
  // Add cart badge to New Sale item for RetailPro
  const getMenuWithBadges = () => {
    return productMenu.sections.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.name === '/(tabs)/cart' && cartCount > 0) {
          return { ...item, badge: cartCount };
        }
        return item;
      })
    }));
  };
  
  const menuSections = getMenuWithBadges();
  
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
      {/* Top Header Bar with User Info - Dynamic Theme */}
      <View style={[styles.topHeader, { backgroundColor: dynamicHeaderBg, borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Icon name="storefront" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandName, { color: '#FFFFFF' }]} numberOfLines={1}>
            {businessSettings?.name || productTheme.name}
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
          <ProductSwitcher currentProductId={getAppIdFromRoute(segments)} />
          
          {/* User Info */}
          <View style={[styles.userInfo, { borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: '#FFFFFF' }]} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={[styles.userRole, { color: 'rgba(255, 255, 255, 0.7)' }]}>{displayRole}</Text>
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
        {/* Sidebar - Light background with themed accents */}
        <View style={[styles.sidebar, { backgroundColor: dynamicSidebarBg, borderRightWidth: 1, borderRightColor: '#E5E7EB' }]}>
          {/* Main Navigation - Product-Specific Menus */}
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            {menuSections.map((section, sectionIndex) => (
              <View key={section.title}>
                <Text style={[styles.navSectionTitle, { color: '#9CA3AF', marginTop: sectionIndex > 0 ? 24 : 0 }]}>
                  {section.title}
                </Text>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.navItem, isActive(item.name) && { backgroundColor: dynamicSidebarActiveBg }]}
                    onPress={() => handleNavPress(item.name)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={isActive(item.name) ? dynamicSidebarActiveText : dynamicSidebarText}
                    />
                    <Text style={[styles.navLabel, { color: isActive(item.name) ? dynamicSidebarActiveText : dynamicSidebarText, fontWeight: isActive(item.name) ? '600' : '500' }]}>
                      {item.label}
                    </Text>
                    {item.badge && item.badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Refer & Earn Section - Highlighted for visibility */}
            <View style={styles.referralSection}>
              <TouchableOpacity
                style={[styles.referralButton, { backgroundColor: productTheme.primaryLight, borderColor: productTheme.primary }, isActive('/(tabs)/referral') && styles.referralButtonActive]}
                onPress={() => handleNavPress('/(tabs)/referral')}
                activeOpacity={0.7}
                data-testid="sidebar-refer-earn-btn"
              >
                <View style={[styles.referralIconContainer, { backgroundColor: productTheme.primary }]}>
                  <Icon name="gift" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.referralTextContainer}>
                  <Text style={[styles.referralButtonText, { color: productTheme.primary }]}>Refer & Earn</Text>
                  <Text style={[styles.referralSubtext, { color: productTheme.primary }]}>Get $10 per referral</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={productTheme.primary} />
              </TouchableOpacity>
              
              {/* Affiliate Partner Dashboard Link */}
              <TouchableOpacity
                style={[styles.affiliateButton, isActive('/affiliate-dashboard') && styles.affiliateButtonActive]}
                onPress={() => handleNavPress('/affiliate-dashboard')}
                activeOpacity={0.7}
                data-testid="sidebar-affiliate-dashboard-btn"
              >
                <View style={[styles.referralIconContainer, { backgroundColor: '#E9A319' }]}>
                  <Icon name="people" size={18} color="#1B4332" />
                </View>
                <View style={styles.referralTextContainer}>
                  <Text style={styles.affiliateButtonText}>Affiliate Program</Text>
                  <Text style={[styles.referralSubtext, { color: '#6B7280' }]}>Become a partner</Text>
                </View>
                <Icon name="chevron-forward" size={18} color="#E9A319" />
              </TouchableOpacity>
            </View>

            {/* Linked Apps Section - Dynamic apps that can be linked */}
            {['admin', 'manager', 'superadmin'].includes(userRole) && (
              <LinkedAppsSidebar 
                currentProductId="retailpro"
                themeColor={productTheme.primary}
                themeBgColor={productTheme.primaryLight}
              />
            )}
            
            {/* Offline Status Indicator */}
            <OfflineStatusIndicator 
              theme={{ 
                primary: productTheme.primary, 
                primaryLight: productTheme.primaryLight 
              }} 
            />
            
            {/* Help Section */}
            <View style={[styles.helpSection, { borderTopColor: '#E5E7EB' }]}>
              <TouchableOpacity
                style={[styles.helpButton, { backgroundColor: '#F3F4F6' }]}
                onPress={handleOpenHelp}
                activeOpacity={0.7}
              >
                <Icon name="help-circle-outline" size={20} color="#6B7280" />
                <Text style={[styles.helpButtonText, { color: '#6B7280' }]}>Help & Support</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Main Content - Light background, NOT full-bleed theme color */}
        <View style={[styles.mainContent, { backgroundColor: '#F5F5F0' }]}>
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
    borderRightWidth: 0,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
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
    backgroundColor: '#E9A319',
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
    color: '#1B4332',
  },
  // Referral Section - Updated for dark sidebar
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
    backgroundColor: 'rgba(64, 145, 108, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(149, 213, 178, 0.3)',
  },
  referralButtonActive: {
    backgroundColor: 'rgba(64, 145, 108, 0.5)',
    borderColor: 'rgba(149, 213, 178, 0.5)',
  },
  referralIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#40916C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTextContainer: {
    flex: 1,
  },
  referralButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  referralSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  // Affiliate Button - Updated for dark sidebar
  affiliateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 163, 25, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(233, 163, 25, 0.3)',
    marginTop: 10,
  },
  affiliateButtonActive: {
    backgroundColor: 'rgba(233, 163, 25, 0.3)',
    borderColor: 'rgba(233, 163, 25, 0.5)',
  },
  affiliateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9A319',
  },
  // Help Section - Updated for dark sidebar
  helpSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.sidebarDivider,
    marginTop: 'auto',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#95D5B2',
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
