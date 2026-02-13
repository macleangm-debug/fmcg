import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import WaitlistModal, { WaitlistProductInfo } from './WaitlistModal';

const isWeb = Platform.OS === 'web';

// Software Galaxy Theme
const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
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
    id: 'payments',
    name: 'Payment Solution',
    tagline: 'Unified Payments',
    description: 'Accept payments anywhere with our secure, unified payment solution.',
    icon: 'card-outline',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    gradientColors: ['#DC2626', '#B91C1C'],
    route: '/payment',
    features: ['Card Payments', 'Mobile Money', 'QR Payments', 'Payment Links'],
    comingSoon: true,
  },
  {
    id: 'bulk_sms',
    name: 'Bulk SMS',
    tagline: 'Mass Communication',
    description: 'Reach customers instantly with our reliable bulk SMS platform.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    gradientColors: ['#F59E0B', '#D97706'],
    route: '/bulk-sms',
    features: ['Bulk Messaging', 'Contact Groups', 'Scheduled Messages', 'Delivery Reports'],
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
];

interface ProductSwitcherProps {
  currentProductId?: string;
}

interface UserAccess {
  app_id: string;
  subscribed: boolean;
}

export default function ProductSwitcher({ currentProductId }: ProductSwitcherProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isAuthenticated, user, logout } = useAuthStore();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<typeof ALL_APPS[0] | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Waitlist modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistApp, setWaitlistApp] = useState<WaitlistProductInfo | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAccess();
    }
  }, [isAuthenticated]);

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
    setShowDropdown(false);
    
    if (app.comingSoon) {
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
      setWaitlistApp(waitlistInfo);
      setShowWaitlistModal(true);
      return;
    }
    
    if (isSubscribed(app.id)) {
      // Subscribed - navigate directly to dashboard
      router.push(app.route as any);
    } else {
      // Not subscribed - show beautiful trial modal
      setSelectedApp(app);
      setShowTrialModal(true);
    }
  };

  const handleStartTrial = async () => {
    if (!selectedApp) return;
    
    setIsSubscribing(true);
    try {
      await api.post(`/galaxy/subscribe/${selectedApp.id}`);
      await fetchUserAccess();
      setShowTrialModal(false);
      setSelectedApp(null);
      // Navigate to the app dashboard
      router.push(selectedApp.route as any);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    router.replace('/landing');
  };

  if (!isWeb) return null;

  return (
    <View style={styles.container}>
      {/* App Grid Button - Use native button for web */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: THEME.lightGray,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Ionicons name="apps" size={22} color={THEME.gray} />
      </button>

      {/* Apps Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdown, isMobile && styles.dropdownMobile]}>
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <View style={styles.logoSmall}>
                <View style={styles.logoOrbit}>
                  <View style={styles.logoDot} />
                </View>
              </View>
              <Text style={styles.dropdownTitle}>Software Galaxy</Text>
            </View>

            {/* Apps Grid */}
            <View style={styles.appsGrid}>
              {ALL_APPS.map(app => {
                const isCurrent = app.id === currentProductId;
                const hasAccess = isSubscribed(app.id);
                
                return (
                  <div
                    key={app.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrent) handleAppSelect(app);
                    }}
                    style={{
                      width: '32%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: 6,
                      borderRadius: 10,
                      cursor: isCurrent ? 'default' : 'pointer',
                      backgroundColor: isCurrent ? THEME.lightGray : 'transparent',
                      marginBottom: 4,
                    }}
                  >
                    <View style={[styles.appIcon, { backgroundColor: app.bgColor }]}>
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
                      styles.appName,
                      isCurrent && styles.appNameActive,
                      app.comingSoon && styles.appNameDisabled,
                    ]} numberOfLines={1}>
                      {app.name}
                    </Text>
                  </div>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* User Section */}
            {isAuthenticated ? (
              <View style={styles.userSection}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={18} color={THEME.gray} />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.loginBtn}
                onPress={() => {
                  setShowDropdown(false);
                  router.push('/(auth)/login');
                }}
              >
                <Ionicons name="log-in-outline" size={18} color={THEME.primary} />
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>
            )}

            {/* Explore Link */}
            <TouchableOpacity 
              style={styles.exploreLink}
              onPress={() => {
                setShowDropdown(false);
                router.push('/landing');
              }}
            >
              <Text style={styles.exploreLinkText}>Explore all products</Text>
              <Ionicons name="arrow-forward" size={14} color={THEME.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Free Trial Confirmation Modal */}
      <Modal
        visible={showTrialModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTrialModal(false);
          setSelectedApp(null);
        }}
      >
        <View style={styles.trialModalOverlay}>
          <View style={styles.trialModal}>
            {selectedApp && (
              <>
                {/* Gradient Header */}
                <LinearGradient
                  colors={selectedApp.gradientColors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.trialModalHeader}
                >
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setShowTrialModal(false);
                      setSelectedApp(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={THEME.white} />
                  </TouchableOpacity>
                  
                  <View style={styles.trialAppIconLarge}>
                    <Ionicons name={selectedApp.icon as any} size={48} color={THEME.white} />
                  </View>
                  <Text style={styles.trialAppName}>{selectedApp.name}</Text>
                  <Text style={styles.trialAppTagline}>{selectedApp.tagline}</Text>
                </LinearGradient>

                {/* Content */}
                <ScrollView style={styles.trialModalContent}>
                  <Text style={styles.trialDescription}>
                    {selectedApp.description}
                  </Text>

                  {/* Features List */}
                  <Text style={styles.featuresTitle}>What you'll get:</Text>
                  <View style={styles.featuresList}>
                    {selectedApp.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <View style={[styles.featureCheck, { backgroundColor: selectedApp.bgColor }]}>
                          <Ionicons name="checkmark" size={14} color={selectedApp.color} />
                        </View>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Trial Info */}
                  <View style={styles.trialInfo}>
                    <Ionicons name="gift-outline" size={20} color={selectedApp.color} />
                    <Text style={styles.trialInfoText}>
                      <Text style={{ fontWeight: '700' }}>14-day free trial</Text> - No credit card required
                    </Text>
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={styles.trialActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowTrialModal(false);
                      setSelectedApp(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.startTrialButton, { backgroundColor: selectedApp.color }]}
                    onPress={handleStartTrial}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <ActivityIndicator color={THEME.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="rocket-outline" size={18} color={THEME.white} />
                        <Text style={styles.startTrialButtonText}>Start Free Trial</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
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
    gap: 4,
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
});
