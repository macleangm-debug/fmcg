import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useGalaxyStore, GalaxyApp, GalaxyAppId } from '../../src/store/galaxyStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const ICON_CONTAINER_WIDTH = (SCREEN_WIDTH - 48) / NUM_COLUMNS;

const GALAXY_THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

// App configurations with colors and icons
const APP_CONFIG: Record<string, { 
  gradient: string[]; 
  icon: keyof typeof Ionicons.glyphMap;
  features: string[];
}> = {
  retail_pro: { 
    gradient: ['#2563EB', '#3B82F6'], 
    icon: 'cart',
    features: ['Point of Sale', 'Customer Management', 'Order Tracking', 'Sales Reports'],
  },
  inventory: { 
    gradient: ['#10B981', '#34D399'], 
    icon: 'cube',
    features: ['Stock Tracking', 'Product Catalog', 'Low Stock Alerts', 'Barcode Support'],
  },
  payments: { 
    gradient: ['#8B5CF6', '#A78BFA'], 
    icon: 'card',
    features: ['Card Payments', 'Mobile Money', 'Payment Links', 'Transaction Reports'],
  },
  bulk_sms: { 
    gradient: ['#F59E0B', '#FBBF24'], 
    icon: 'chatbubbles',
    features: ['Mass Messaging', 'Contact Groups', 'Scheduled SMS', 'Delivery Reports'],
  },
  invoicing: { 
    gradient: ['#EF4444', '#F87171'], 
    icon: 'document-text',
    features: ['Invoice Templates', 'Online Payments', 'Recurring Invoices', 'Tax Support'],
  },
  accounting: { 
    gradient: ['#EC4899', '#F472B6'], 
    icon: 'calculator',
    features: ['Expense Tracking', 'Financial Reports', 'Tax Management', 'Multi-currency'],
  },
};

export default function GalaxyHome() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout, isLoading: authLoading } = useAuthStore();
  const { apps, userAppAccess, fetchApps, fetchUserAccess, subscribeToApp, isLoading } = useGalaxyStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<GalaxyApp | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.replace('/galaxy');
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadData();
    }
  }, [isAuthenticated, token]);

  const loadData = async () => {
    if (token) {
      await Promise.all([
        fetchApps(),
        fetchUserAccess(token),
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Check if user has subscription to an app
  const isSubscribed = (appId: GalaxyAppId): boolean => {
    return userAppAccess.some(a => a.app.app_id === appId && a.subscription?.status === 'active');
  };

  // Handle app icon press
  const handleAppPress = (app: GalaxyApp) => {
    if (isSubscribed(app.app_id)) {
      // User is subscribed - go directly to the app dashboard
      navigateToApp(app.app_id);
    } else {
      // Not subscribed - show info modal
      setSelectedApp(app);
      setModalVisible(true);
    }
  };

  // Navigate to app based on ID and user role
  const navigateToApp = (appId: GalaxyAppId) => {
    switch (appId) {
      case 'retail_pro':
        // Navigate based on user role
        if (user?.role === 'superadmin') {
          router.push('/superadmin');
        } else if (user?.role === 'admin' || user?.role === 'manager') {
          router.push('/(tabs)/dashboard');
        } else {
          router.push('/(tabs)/pos');
        }
        break;
      case 'inventory':
        // Navigate to Inventory app
        router.push('/inventory');
        break;
      case 'invoicing':
        // Navigate to Invoicing app
        router.push('/invoicing');
        break;
      default:
        // Other apps coming soon
        router.push('/galaxy/coming-soon');
    }
  };

  // Start free trial
  const handleStartTrial = async () => {
    if (!token || !selectedApp) return;
    
    setSubscribing(true);
    const result = await subscribeToApp(token, selectedApp.app_id);
    setSubscribing(false);
    
    if (result.success) {
      setModalVisible(false);
      // Navigate to the app immediately
      navigateToApp(selectedApp.app_id);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/galaxy');
  };

  // Get first name
  const firstName = user?.name?.split(' ')[0] || 'User';
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Render app icon
  const renderAppIcon = (app: GalaxyApp) => {
    const config = APP_CONFIG[app.app_id] || { gradient: ['#6B7280', '#9CA3AF'], icon: 'apps' };
    const subscribed = isSubscribed(app.app_id);
    const isAvailable = app.status === 'available';
    
    return (
      <TouchableOpacity
        key={app.app_id}
        style={styles.appIconWrapper}
        onPress={() => handleAppPress(app)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.appIcon,
              !isAvailable && styles.appIconDisabled,
            ]}
          >
            <Ionicons name={config.icon} size={32} color="#FFFFFF" />
          </LinearGradient>
          
          {/* Subscription badge */}
          {subscribed && (
            <View style={styles.subscribedBadge}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
          
          {/* Coming soon overlay */}
          {!isAvailable && (
            <View style={styles.comingSoonOverlay}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render app info modal
  const renderAppModal = () => {
    if (!selectedApp) return null;
    const config = APP_CONFIG[selectedApp.app_id] || { gradient: ['#6B7280', '#9CA3AF'], icon: 'apps', features: [] };
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {/* App Icon */}
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalAppIcon}
            >
              <Ionicons name={config.icon} size={40} color="#FFFFFF" />
            </LinearGradient>
            
            {/* App Info */}
            <Text style={styles.modalAppName}>{selectedApp.name}</Text>
            <Text style={styles.modalTagline}>{selectedApp.tagline}</Text>
            <Text style={styles.modalDescription}>{selectedApp.description}</Text>
            
            {/* Features */}
            <View style={styles.featuresContainer}>
              {config.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={config.gradient[0]} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            {/* Pricing */}
            <Text style={styles.pricingText}>{selectedApp.pricing}</Text>
            
            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.trialButton, { backgroundColor: config.gradient[0] }]}
              onPress={handleStartTrial}
              disabled={subscribing}
            >
              {subscribing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.trialButtonText}>Start Free Trial</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GALAXY_THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={GALAXY_THEME.gray} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GALAXY_THEME.primary}
          />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GALAXY_THEME.primary} />
          </View>
        ) : (
          <>
            {/* Apps Grid */}
            <FlatList
              data={apps}
              renderItem={({ item }) => renderAppIcon(item)}
              keyExtractor={(item) => item.app_id}
              numColumns={4}
              scrollEnabled={false}
              contentContainerStyle={styles.appsGrid}
              columnWrapperStyle={styles.gridRow}
            />
            
            {/* Quick Stats for subscribed apps */}
            {userAppAccess.length > 0 && (
              <View style={styles.statsSection}>
                <Text style={styles.statsTitle}>Your Apps</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{userAppAccess.length}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{apps.length - userAppAccess.length}</Text>
                    <Text style={styles.statLabel}>Available</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      {/* App Info Modal */}
      {renderAppModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greeting: {
    fontSize: 14,
    color: GALAXY_THEME.gray,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  // Apps Grid
  appsGrid: {
    paddingVertical: 8,
  },
  gridRow: {
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  appIconWrapper: {
    width: ICON_CONTAINER_WIDTH,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  appIconDisabled: {
    opacity: 0.5,
  },
  subscribedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  comingSoonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  appName: {
    fontSize: 11,
    fontWeight: '500',
    color: GALAXY_THEME.dark,
    marginTop: 6,
    textAlign: 'center',
  },
  // Stats Section
  statsSection: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GALAXY_THEME.dark,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: GALAXY_THEME.primary,
  },
  statLabel: {
    fontSize: 13,
    color: GALAXY_THEME.gray,
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalAppIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalAppName: {
    fontSize: 24,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
    marginBottom: 4,
  },
  modalTagline: {
    fontSize: 15,
    fontWeight: '500',
    color: GALAXY_THEME.primary,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: GALAXY_THEME.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  pricingText: {
    fontSize: 16,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
    marginBottom: 20,
  },
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  trialButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: GALAXY_THEME.gray,
  },
});
