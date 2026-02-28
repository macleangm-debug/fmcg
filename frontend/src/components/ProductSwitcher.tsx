import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../context/ModalContext';
import WaitlistModal, { WaitlistProductInfo } from './WaitlistModal';
import { SokoIconLogo, SokoColorfulLogo, SokoHorizontalLogo, PoweredBySoko, SOKO_COLORS } from './SokoLogo';

const isWeb = Platform.OS === 'web';

// Software Galaxy Theme - Space Theme
const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  // Space theme colors
  spaceDeep: '#0F172A',
  spacePurple: '#4C1D95',
  spaceBlue: '#1E3A5F',
  starWhite: '#F8FAFC',
  starGlow: 'rgba(255, 255, 255, 0.8)',
};

// All available apps with full details
const ALL_APPS = [
  {
    id: 'retail_pro',
    name: 'Retail Pro',
    tagline: 'Complete Retail Management',
    description: 'All-in-one retail management platform for sales, inventory, customers, and analytics.',
    icon: 'storefront-outline',
    color: '#2563EB',
    bgColor: '#EEF2FF',
    gradientColors: ['#2563EB', '#1D4ED8'],
    route: '/(tabs)/dashboard',
    features: ['Point of Sale', 'Inventory Management', 'Customer Tracking', 'Sales Analytics'],
    comingSoon: false,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    description: 'Powerful inventory management with real-time tracking and comprehensive reporting.',
    icon: 'cube-outline',
    color: '#059669',
    bgColor: '#D1FAE5',
    gradientColors: ['#059669', '#047857'],
    route: '/inventory',
    features: ['Real-time Tracking', 'Low Stock Alerts', 'Barcode Scanning', 'Movement History'],
    comingSoon: false,
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing',
    description: 'Create, send, and track professional invoices with automated reminders.',
    icon: 'document-text-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    gradientColors: ['#7C3AED', '#6D28D9'],
    route: '/invoicing',
    features: ['Custom Templates', 'Automated Reminders', 'Payment Tracking', 'Multi-currency'],
    comingSoon: false,
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Unified Payments',
    description: 'Accept payments anywhere with our secure, unified payment solution.',
    icon: 'card-outline',
    color: '#10B981',
    bgColor: '#D1FAE5',
    gradientColors: ['#10B981', '#059669'],
    route: '/kwikpay',
    features: ['Card Payments', 'Mobile Money', 'Payouts', 'API Integration'],
    comingSoon: false,
  },
  {
    id: 'bulk_sms',
    name: 'UniTxt',
    tagline: 'Mass Communication',
    description: 'Reach customers instantly with our reliable bulk messaging platform.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    gradientColors: ['#F59E0B', '#D97706'],
    route: '/unitxt',
    features: ['Bulk Messaging', 'Contact Groups', 'Scheduled Messages', 'Delivery Reports'],
    comingSoon: false,
  },
  {
    id: 'intime',
    name: 'InTime',
    tagline: 'Time & Attendance',
    description: 'Effortless time and attendance tracking - no hardware required.',
    icon: 'time-outline',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    gradientColors: ['#8B5CF6', '#7C3AED'],
    route: '/intime',
    features: ['Clock In/Out', 'Shift Management', 'Leave Tracking', 'Reports & Analytics'],
    comingSoon: true,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Business Accounting',
    description: 'Manage finances with ease. Track expenses and generate reports.',
    icon: 'calculator-outline',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    gradientColors: ['#0891B2', '#0E7490'],
    route: '/accounting',
    features: ['Expense Tracking', 'Bank Reconciliation', 'Financial Reports', 'Tax Calculations'],
    comingSoon: true,
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Smart Expense Tracking',
    description: 'Track, categorize, and manage all your business expenses.',
    icon: 'wallet-outline',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    gradientColors: ['#EF4444', '#DC2626'],
    route: '/expenses',
    features: ['Receipt Scanning', 'Auto-categorization', 'Approval Workflows', 'Expense Reports'],
    comingSoon: false,
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Retention & Rewards',
    description: 'Build lasting relationships with points, rewards, and loyalty tiers.',
    icon: 'heart-outline',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    gradientColors: ['#EC4899', '#DB2777'],
    route: '/loyalty',
    features: ['Points System', 'Reward Tiers', 'Referral Bonuses', 'Retention Analytics'],
    comingSoon: false,
  },
];

interface ProductSwitcherProps {
  currentProductId?: string;
}

interface UserAccess {
  app_id: string;
  subscribed: boolean;
}

// Animated Star Component
const AnimatedStar = ({ delay, size, left, top }: { delay: number; size: number; left: string; top: string }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    const timer = setTimeout(() => animation.start(), delay);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, []);
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: THEME.starWhite,
        opacity,
        shadowColor: THEME.starWhite,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: size,
      }}
    />
  );
};

// Generate random stars
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 2000,
    size: Math.random() * 3 + 1,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
  }));
};

const STARS = generateStars(30);

// Get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function ProductSwitcher({ currentProductId }: ProductSwitcherProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const { isAuthenticated, user, logout } = useAuthStore();
  const { openTrialModal } = useModal();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<typeof ALL_APPS[0] | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Two-mode menu: 'compact' (current) or 'full' (expanded launcher)
  const [menuMode, setMenuMode] = useState<'compact' | 'full'>('compact');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Waitlist modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistApp, setWaitlistApp] = useState<WaitlistProductInfo | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAccess();
    }
  }, [isAuthenticated]);
  
  // Reset menu mode when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setMenuMode('compact');
      setSearchQuery('');
    }
  }, [showDropdown]);

  const fetchUserAccess = async () => {
    try {
      const response = await api.get('/galaxy/user/access');
      // Map the API response correctly
      const appAccess = response.data.app_access || [];
      const mappedAccess = appAccess.map((item: any) => ({
        app_id: item.app?.app_id || item.app_id,
        subscribed: item.subscription?.status === 'active'
      }));
      setUserAccess(mappedAccess);
    } catch (error) {
      console.error('Failed to fetch user access:', error);
    }
  };

  const isSubscribed = (appId: string) => {
    // Normalize IDs (handle both hyphen and underscore)
    const normalizedId = appId.replace(/-/g, '_');
    return userAccess.some(access => {
      const accessId = access.app_id?.replace(/-/g, '_');
      return accessId === normalizedId && access.subscribed;
    });
  };

  const handleAppSelect = async (app: typeof ALL_APPS[0]) => {
    console.log('handleAppSelect called for:', app.name);
    
    if (app.comingSoon) {
      console.log('App is coming soon, showing waitlist modal');
      // Show waitlist modal for coming soon apps
      const waitlistInfo: WaitlistProductInfo = {
        id: app.id,
        name: app.name,
        tagline: app.tagline,
        description: app.description,
        icon: app.icon,
        color: app.color,
        bgColor: app.bgColor,
        gradientColors: app.gradientColors as [string, string],
        features: app.features,
      };
      setShowDropdown(false);
      setWaitlistApp(waitlistInfo);
      setShowWaitlistModal(true);
      return;
    }
    
    const subscribed = isSubscribed(app.id);
    console.log('Is subscribed:', subscribed);
    
    if (subscribed) {
      // Subscribed - navigate directly to dashboard
      console.log('Navigating to:', app.route);
      setShowDropdown(false);
      router.push(app.route as any);
    } else {
      // Not subscribed - show beautiful trial modal via global context
      console.log('Showing trial modal for:', app.name);
      setSelectedApp(app);
      setShowDropdown(false); // Close dropdown first
      
      // Use setTimeout to ensure dropdown closes before opening trial modal
      setTimeout(() => {
        openTrialModal(
          {
            id: app.id,
            name: app.name,
            tagline: app.tagline,
            description: app.description,
            icon: app.icon,
            color: app.color,
            bgColor: app.bgColor,
            gradientColors: app.gradientColors as [string, string],
            features: app.features,
            route: app.route,
          },
          () => handleStartTrial(app)
        );
      }, 150);
    }
  };

  const handleStartTrial = async (app: typeof ALL_APPS[0]) => {
    setIsSubscribing(true);
    try {
      await api.post(`/galaxy/subscribe/${app.id}`);
      await fetchUserAccess();
      setSelectedApp(null);
      // Navigate to the app dashboard
      router.push(app.route as any);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setShowDropdown(false);
    logout();
    router.replace('/landing');
  };

  // Filter apps based on search query
  const filteredApps = ALL_APPS.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get subscribed apps count
  const subscribedAppsCount = ALL_APPS.filter(app => isSubscribed(app.id)).length;

  // 3x3 Grid Icon Component
  const GridIcon = () => (
    <View style={styles.gridIconContainer}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <View key={i} style={styles.gridDot} />
      ))}
    </View>
  );

  // Stars Background Component
  const StarsBackground = () => (
    <View style={styles.starsContainer}>
      {STARS.map(star => (
        <AnimatedStar key={star.id} {...star} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* App Grid Button with 3x3 dots */}
      <TouchableOpacity
        style={styles.gridButton}
        onPress={() => setShowDropdown(!showDropdown)}
        activeOpacity={0.7}
        testID="soko-launcher-btn"
        accessibilityLabel="Open Soko Launcher"
      >
        <GridIcon />
      </TouchableOpacity>

      {/* Apps Dropdown Modal - Space Theme with Two Modes */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            // Only close if waitlist modal is not showing and in compact mode
            if (menuMode === 'compact' && !showWaitlistModal) {
              setShowDropdown(false);
            }
          }}
        >
          {menuMode === 'compact' ? (
            /* COMPACT MODE - Quick Switcher */
            <TouchableOpacity 
              activeOpacity={1}
              style={[styles.dropdown, isMobile && styles.dropdownMobile]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Space Background */}
              <LinearGradient
                colors={[THEME.spaceDeep, THEME.spacePurple]}
                style={styles.spaceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <StarsBackground />
              </LinearGradient>
              
              {/* Header with Soko Branding */}
              <View style={styles.dropdownHeader}>
                <SokoColorfulLogo size={36} color="light" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.dropdownTitleSpace}>Soko</Text>
                  <Text style={styles.dropdownSubtitle}>Your Super App</Text>
                </View>
              </View>

              {/* Apps Grid - 3 items per row */}
              <View style={styles.appsGrid}>
                {ALL_APPS.map(app => {
                  const isCurrent = app.id === currentProductId;
                  const hasAccess = isSubscribed(app.id);
                  
                  return (
                    <TouchableOpacity
                      key={app.id}
                      style={[
                        styles.appItem,
                        isCurrent && styles.appItemActiveSpace
                      ]}
                      onPress={() => {
                        if (!isCurrent) {
                          handleAppSelect(app);
                        }
                      }}
                      disabled={isCurrent}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.appIconSpace, { backgroundColor: app.bgColor }]}>
                        <Ionicons name={app.icon as any} size={22} color={app.color} />
                        {app.comingSoon && (
                          <View style={styles.comingSoonDot} />
                        )}
                        {hasAccess && !app.comingSoon && (
                          <View style={[styles.subscribedBadge, { backgroundColor: app.color }]}>
                            <Ionicons name="checkmark" size={10} color={THEME.white} />
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.appNameSpace,
                        isCurrent && styles.appNameActiveSpace,
                        app.comingSoon && styles.appNameDisabledSpace,
                      ]} numberOfLines={1}>
                        {app.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Expand to Full Mode */}
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={() => setMenuMode('full')}
              >
                <Text style={styles.expandButtonText}>View all apps</Text>
                <Ionicons name="expand-outline" size={16} color={THEME.primary} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerSpace} />

              {/* User Section */}
              {isAuthenticated ? (
                <View style={styles.userSectionSpace}>
                  <View style={styles.userInfoSpace}>
                    <View style={styles.avatarSpace}>
                      <Text style={styles.avatarTextSpace}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.userDetailsSpace}>
                      <Text style={styles.userNameSpace}>{user?.name || 'User'}</Text>
                      <Text style={styles.userEmailSpace}>{user?.email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.logoutBtnSpace} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color="#F87171" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.loginBtnSpace}
                  onPress={() => {
                    setShowDropdown(false);
                    router.push('/(auth)/login');
                  }}
                >
                  <Ionicons name="log-in-outline" size={18} color={THEME.primary} />
                  <Text style={styles.loginTextSpace}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* FULL MODE - Full Screen Launcher */
            <View style={styles.fullLauncher}>
              <LinearGradient
                colors={[THEME.spaceDeep, '#1E1B4B', THEME.spacePurple]}
                style={styles.fullLauncherGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <StarsBackground />
                
                {/* Header with Back Button and Soko Logo */}
                <View style={styles.fullLauncherHeader}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setMenuMode('compact')}
                  >
                    <Ionicons name="chevron-back" size={24} color={THEME.white} />
                  </TouchableOpacity>
                  
                  {/* Soko Logo in center */}
                  <View style={styles.fullHeaderLogo}>
                    <SokoColorfulLogo size={28} color="light" />
                    <Text style={styles.fullHeaderLogoText}>Soko</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.closeFullButton}
                    onPress={() => setShowDropdown(false)}
                  >
                    <Ionicons name="close" size={24} color={THEME.white} />
                  </TouchableOpacity>
                </View>

                {/* Greeting Section */}
                <View style={styles.greetingSection}>
                  <Text style={styles.greetingText}>
                    {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
                  </Text>
                  <Text style={styles.greetingSubtext}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search apps..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{subscribedAppsCount}</Text>
                    <Text style={styles.statLabel}>Active Apps</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{ALL_APPS.length}</Text>
                    <Text style={styles.statLabel}>Total Apps</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{ALL_APPS.filter(a => a.comingSoon).length}</Text>
                    <Text style={styles.statLabel}>Coming Soon</Text>
                  </View>
                </View>

                {/* Apps Grid - Full View */}
                <ScrollView 
                  style={styles.fullAppsScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionTitleFull}>All Apps</Text>
                  <View style={styles.fullAppsGrid}>
                    {filteredApps.map(app => {
                      const isCurrent = app.id === currentProductId;
                      const hasAccess = isSubscribed(app.id);
                      
                      return (
                        <TouchableOpacity
                          key={app.id}
                          style={[
                            styles.fullAppItem,
                            isCurrent && styles.fullAppItemActive
                          ]}
                          onPress={() => {
                            if (!isCurrent) handleAppSelect(app);
                          }}
                          activeOpacity={isCurrent ? 1 : 0.7}
                          disabled={isCurrent}
                        >
                          <View style={[styles.fullAppIcon, { backgroundColor: app.bgColor }]}>
                            <Ionicons name={app.icon as any} size={28} color={app.color} />
                            {app.comingSoon && (
                              <View style={styles.comingSoonBadgeFull}>
                                <Text style={styles.comingSoonTextFull}>Soon</Text>
                              </View>
                            )}
                            {hasAccess && !app.comingSoon && (
                              <View style={[styles.subscribedBadgeFull, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="checkmark" size={12} color={THEME.white} />
                              </View>
                            )}
                          </View>
                          <Text style={[
                            styles.fullAppName,
                            isCurrent && styles.fullAppNameActive,
                          ]} numberOfLines={1}>
                            {app.name}
                          </Text>
                          <Text style={styles.fullAppTagline} numberOfLines={1}>
                            {app.tagline}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  {/* Powered By Footer */}
                  <View style={styles.poweredByFooter}>
                    <Text style={styles.poweredByText}>Powered by</Text>
                    <View style={styles.poweredByLogo}>
                      <View style={styles.logoOrbitFooter}>
                        <View style={styles.logoDotFooter} />
                      </View>
                      <Text style={styles.poweredByBrand}>Software Galaxy</Text>
                    </View>
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          )}
        </View>
      </Modal>
      
      {/* Waitlist Modal for Coming Soon Apps */}
      <WaitlistModal
        visible={showWaitlistModal}
        product={waitlistApp}
        onClose={() => {
          setShowWaitlistModal(false);
          setWaitlistApp(null);
        }}
      />

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
              <Ionicons name="log-out-outline" size={32} color="#DC2626" />
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
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gridButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.lightGray,
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
    backgroundColor: THEME.gray,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  dropdown: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 20,
    width: 320,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  dropdownMobile: {
    width: 280,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOrbit: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME.primary,
    borderStyle: 'dashed',
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    position: 'absolute',
    top: -3,
    right: 3,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.dark,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  appItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  appItemActive: {
    backgroundColor: THEME.lightGray,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  comingSoonDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: THEME.white,
  },
  subscribedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.white,
  },
  appName: {
    fontSize: 11,
    color: THEME.dark,
    textAlign: 'center',
    fontWeight: '500',
  },
  appNameActive: {
    fontWeight: '700',
    color: THEME.primary,
  },
  appNameDisabled: {
    color: THEME.gray,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  userSection: {
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.dark,
  },
  userEmail: {
    fontSize: 12,
    color: THEME.gray,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: THEME.lightGray,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 13,
    color: THEME.gray,
    fontWeight: '500',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: THEME.lightGray,
    borderRadius: 8,
  },
  loginText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  exploreLinkText: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: '500',
  },
  // Trial Modal Styles
  trialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  trialModal: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  trialModalHeader: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialAppIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trialAppName: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 4,
  },
  trialAppTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  trialModalContent: {
    padding: 24,
    maxHeight: 300,
  },
  trialDescription: {
    fontSize: 15,
    color: THEME.gray,
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: THEME.dark,
    fontWeight: '500',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    padding: 16,
    backgroundColor: THEME.lightGray,
    borderRadius: 12,
  },
  trialInfoText: {
    fontSize: 14,
    color: THEME.gray,
    flex: 1,
  },
  trialActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: THEME.gray,
    fontWeight: '600',
  },
  startTrialButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startTrialButtonText: {
    fontSize: 15,
    color: THEME.white,
    fontWeight: '700',
  },
  // Logout Confirmation Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModal: {
    backgroundColor: THEME.white,
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
    color: THEME.dark,
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: THEME.gray,
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
    color: THEME.gray,
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
    color: THEME.white,
  },
  // Space Theme Styles
  spaceGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  galaxyLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOrbitSpace: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDotSpace: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  dropdownTitleSpace: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.white,
  },
  dropdownSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  appIconSpace: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  appItemActiveSpace: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  appNameSpace: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  appNameActiveSpace: {
    color: THEME.primary,
    fontWeight: '700',
  },
  appNameDisabledSpace: {
    color: 'rgba(255,255,255,0.5)',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  dividerSpace: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 12,
  },
  userSectionSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarSpace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 180, 216, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  avatarTextSpace: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  userDetailsSpace: {
    flex: 1,
  },
  userNameSpace: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.white,
  },
  userEmailSpace: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  logoutBtnSpace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(248,113,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 180, 216, 0.15)',
    borderRadius: 10,
  },
  loginTextSpace: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  // Full Launcher Mode Styles
  fullLauncher: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullLauncherGradient: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  fullLauncherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFullButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullHeaderLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullHeaderLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.white,
    letterSpacing: 1,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.white,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
  },
  fullAppsScrollView: {
    flex: 1,
  },
  sectionTitleFull: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  fullAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 24,
  },
  fullAppItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fullAppItemActive: {
    backgroundColor: 'rgba(0, 180, 216, 0.15)',
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  fullAppIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  fullAppName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  fullAppNameActive: {
    color: THEME.primary,
  },
  fullAppTagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  comingSoonBadgeFull: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonTextFull: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.white,
  },
  subscribedBadgeFull: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.spaceDeep,
  },
  poweredByFooter: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  poweredByText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  poweredByLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoOrbitFooter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 180, 216, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDotFooter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  poweredByBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});
