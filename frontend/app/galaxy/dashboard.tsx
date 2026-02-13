import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

// Software Galaxy Theme
const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  accent: '#0096C7',
  light: '#CAF0F8',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

// All available apps
const ALL_APPS = [
  {
    id: 'retail-pro',
    name: 'Retail Pro',
    description: 'Complete retail management with POS, inventory, and analytics',
    icon: 'storefront-outline',
    color: '#2563EB',
    bgColor: '#EEF2FF',
    route: '/(tabs)/dashboard',
    webRoute: '/(tabs)/dashboard',
    comingSoon: false,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Smart stock management with real-time tracking',
    icon: 'cube-outline',
    color: '#059669',
    bgColor: '#D1FAE5',
    route: '/inventory',
    webRoute: '/inventory',
    comingSoon: false,
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    description: 'Professional invoicing and payment tracking',
    icon: 'document-text-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    route: '/invoicing',
    webRoute: '/invoicing',
    comingSoon: false,
  },
  {
    id: 'payment',
    name: 'KwikPay',
    description: 'Unified payment processing for all channels',
    icon: 'card-outline',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    route: '/payment',
    webRoute: '/payment',
    comingSoon: true,
  },
  {
    id: 'bulk-sms',
    name: 'UniTxt',
    description: 'Mass communication and marketing campaigns',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    route: '/bulk-sms',
    webRoute: '/bulk-sms',
    comingSoon: true,
  },
  {
    id: 'intime',
    name: 'InTime',
    description: 'Time & attendance tracking - no hardware required',
    icon: 'time-outline',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    route: '/intime',
    webRoute: '/intime',
    comingSoon: true,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    description: 'Simplified business accounting and reports',
    icon: 'calculator-outline',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    route: '/accounting',
    webRoute: '/accounting',
    comingSoon: true,
  },
];

interface UserAccess {
  app_id: string;
  subscribed: boolean;
  trial_ends?: string;
}

export default function WebDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user, logout, isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [showAppModal, setShowAppModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<typeof ALL_APPS[0] | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Redirect non-authenticated users
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    
    // Redirect mobile users to mobile home
    if (!isWeb) {
      router.replace('/galaxy/home');
      return;
    }
    
    fetchUserAccess();
  }, [isAuthenticated]);

  const fetchUserAccess = async () => {
    try {
      const response = await api.get('/galaxy/user/access');
      setUserAccess(response.data.apps || []);
    } catch (error) {
      console.error('Failed to fetch user access:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = (appId: string) => {
    return userAccess.some(access => access.app_id === appId && access.subscribed);
  };

  const handleAppClick = (app: typeof ALL_APPS[0]) => {
    if (app.comingSoon) {
      setSelectedApp(app);
      setShowAppModal(true);
      return;
    }
    
    if (isSubscribed(app.id)) {
      // Go to the app
      router.push(app.webRoute as any);
    } else {
      // Show subscription modal
      setSelectedApp(app);
      setShowAppModal(true);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedApp) return;
    
    setSubscribing(true);
    try {
      await api.post(`/galaxy/subscribe/${selectedApp.id}`);
      await fetchUserAccess();
      setShowAppModal(false);
      // Navigate to the app after subscribing
      router.push(selectedApp.webRoute as any);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setSubscribing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/landing');
  };

  const subscribedApps = ALL_APPS.filter(app => isSubscribed(app.id) && !app.comingSoon);
  const availableApps = ALL_APPS.filter(app => !isSubscribed(app.id) && !app.comingSoon);
  const comingSoonApps = ALL_APPS.filter(app => app.comingSoon);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity style={styles.logo} onPress={() => router.push('/landing')}>
          <View style={styles.logoIcon}>
            <View style={styles.logoOrbit}>
              <View style={styles.logoDot} />
            </View>
          </View>
          <View>
            <Text style={styles.logoTextSmall}>SOFTWARE</Text>
            <Text style={styles.logoTextLarge}>GALAXY</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            {!isMobile && (
              <View>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={THEME.gray} />
            {!isMobile && <Text style={styles.logoutText}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <LinearGradient
          colors={[THEME.dark, THEME.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.welcomeSection, isMobile && styles.welcomeSectionMobile]}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Access your business tools or explore new products
            </Text>
          </View>
        </LinearGradient>

        {/* Subscribed Apps */}
        {subscribedApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Apps</Text>
            <View style={[styles.appsGrid, isMobile && styles.appsGridMobile]}>
              {subscribedApps.map(app => (
                <TouchableOpacity 
                  key={app.id}
                  style={[styles.appCard, isMobile && styles.appCardMobile]}
                  onPress={() => handleAppClick(app)}
                >
                  <View style={[styles.appIconContainer, { backgroundColor: app.bgColor }]}>
                    <Ionicons name={app.icon as any} size={28} color={app.color} />
                  </View>
                  <View style={styles.appInfo}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appDescription}>{app.description}</Text>
                  </View>
                  <View style={[styles.appStatus, { backgroundColor: app.color }]}>
                    <Ionicons name="checkmark" size={14} color={THEME.white} />
                    <Text style={styles.appStatusText}>Active</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.openBtn, { backgroundColor: app.color }]}
                    onPress={() => router.push(app.webRoute as any)}
                  >
                    <Text style={styles.openBtnText}>Open</Text>
                    <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Available Apps */}
        {availableApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Apps</Text>
            <Text style={styles.sectionSubtitle}>Start a free trial to explore these tools</Text>
            <View style={[styles.appsGrid, isMobile && styles.appsGridMobile]}>
              {availableApps.map(app => (
                <TouchableOpacity 
                  key={app.id}
                  style={[styles.appCard, styles.appCardAvailable, isMobile && styles.appCardMobile]}
                  onPress={() => handleAppClick(app)}
                >
                  <View style={[styles.appIconContainer, { backgroundColor: app.bgColor }]}>
                    <Ionicons name={app.icon as any} size={28} color={app.color} />
                  </View>
                  <View style={styles.appInfo}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appDescription}>{app.description}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.trialBtn, { borderColor: app.color }]}
                    onPress={() => handleAppClick(app)}
                  >
                    <Text style={[styles.trialBtnText, { color: app.color }]}>Start Free Trial</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Coming Soon Apps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <Text style={styles.sectionSubtitle}>New apps launching soon - join the waitlist!</Text>
          <View style={[styles.appsGrid, isMobile && styles.appsGridMobile]}>
            {comingSoonApps.map(app => (
              <TouchableOpacity 
                key={app.id}
                style={[styles.appCard, styles.appCardComingSoon, isMobile && styles.appCardMobile]}
                onPress={() => handleAppClick(app)}
              >
                <View style={styles.comingSoonBadge}>
                  <Ionicons name="rocket-outline" size={12} color={THEME.white} />
                  <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                </View>
                <View style={[styles.appIconContainer, { backgroundColor: app.bgColor, opacity: 0.7 }]}>
                  <Ionicons name={app.icon as any} size={28} color={app.color} />
                </View>
                <View style={styles.appInfo}>
                  <Text style={[styles.appName, { color: THEME.gray }]}>{app.name}</Text>
                  <Text style={styles.appDescription}>{app.description}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.waitlistBtn}
                  onPress={() => handleAppClick(app)}
                >
                  <Text style={styles.waitlistBtnText}>Join Waitlist</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Explore Products Link */}
        <View style={styles.exploreSection}>
          <TouchableOpacity 
            style={styles.exploreBtn}
            onPress={() => router.push('/landing')}
          >
            <Ionicons name="apps-outline" size={20} color={THEME.primary} />
            <Text style={styles.exploreBtnText}>Explore All Products</Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* App Modal */}
      <Modal visible={showAppModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowAppModal(false)}
            >
              <Ionicons name="close" size={24} color={THEME.gray} />
            </TouchableOpacity>
            
            {selectedApp && (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: selectedApp.bgColor }]}>
                  <Ionicons name={selectedApp.icon as any} size={48} color={selectedApp.color} />
                </View>
                
                <Text style={styles.modalTitle}>{selectedApp.name}</Text>
                <Text style={styles.modalDescription}>{selectedApp.description}</Text>
                
                {selectedApp.comingSoon ? (
                  <>
                    <View style={styles.comingSoonInfo}>
                      <Ionicons name="rocket-outline" size={24} color={THEME.primary} />
                      <Text style={styles.comingSoonInfoText}>
                        This app is currently in development and will be available soon!
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: selectedApp.color }]}
                      onPress={() => setShowAppModal(false)}
                    >
                      <Ionicons name="mail-outline" size={20} color={THEME.white} />
                      <Text style={styles.modalBtnText}>Join Waitlist</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.trialInfo}>
                      <Ionicons name="time-outline" size={20} color={THEME.primary} />
                      <Text style={styles.trialInfoText}>14-day free trial • No credit card required</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: selectedApp.color }]}
                      onPress={handleSubscribe}
                      disabled={subscribing}
                    >
                      {subscribing ? (
                        <ActivityIndicator size="small" color={THEME.white} />
                      ) : (
                        <>
                          <Ionicons name="rocket-outline" size={20} color={THEME.white} />
                          <Text style={styles.modalBtnText}>Start Free Trial</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                
                <TouchableOpacity 
                  style={styles.learnMoreBtn}
                  onPress={() => {
                    setShowAppModal(false);
                    router.push(`/products/${selectedApp.id}` as any);
                  }}
                >
                  <Text style={styles.learnMoreText}>Learn more about {selectedApp.name}</Text>
                  <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightGray,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerMobile: {
    paddingHorizontal: 16,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOrbit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: THEME.primary,
    borderStyle: 'dashed',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
    position: 'absolute',
    top: -4,
    right: 4,
  },
  logoTextSmall: {
    fontSize: 8,
    fontWeight: '600',
    color: THEME.gray,
    letterSpacing: 2,
  },
  logoTextLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.dark,
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: THEME.lightGray,
  },
  logoutText: {
    fontSize: 14,
    color: THEME.gray,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  welcomeSectionMobile: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  welcomeContent: {
    maxWidth: 600,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: THEME.light,
  },
  section: {
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: THEME.gray,
    marginBottom: 24,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  appsGridMobile: {
    flexDirection: 'column',
  },
  appCard: {
    width: 340,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  appCardMobile: {
    width: '100%',
  },
  appCardAvailable: {
    borderStyle: 'dashed',
  },
  appCardComingSoon: {
    opacity: 0.8,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.gray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.white,
  },
  appIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appInfo: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 13,
    color: THEME.gray,
    lineHeight: 20,
  },
  appStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  appStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.white,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.white,
  },
  trialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  trialBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: THEME.lightGray,
  },
  waitlistBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.gray,
  },
  exploreSection: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  exploreBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 32,
    width: 420,
    maxWidth: '100%',
    alignItems: 'center',
  },
  modalContentMobile: {
    width: '100%',
    padding: 24,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: THEME.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.light,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  trialInfoText: {
    fontSize: 13,
    color: THEME.secondary,
    fontWeight: '500',
  },
  comingSoonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  comingSoonInfoText: {
    flex: 1,
    fontSize: 13,
    color: THEME.gray,
    lineHeight: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  learnMoreText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '500',
  },
});
