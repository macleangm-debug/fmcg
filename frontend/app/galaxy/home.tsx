import React, { useEffect, useState, useRef } from 'react';
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
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useGalaxyStore, EcosystemProduct, AvailableProduct } from '../../src/store/galaxyStore';
import { SokoColorfulLogo } from '../../src/components/SokoLogo';
import UpgradeModal from '../../src/components/UpgradeModal';
import { trialNotificationService } from '../../src/services/trialNotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 16;
const NUM_COLUMNS = 3;
const ICON_SIZE = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

// Dark Cosmic Theme Colors
const COLORS = {
  bgStart: '#1a1a3e',
  bgMid: '#2d2d5a',
  bgEnd: '#1a1a3e',
  primary: '#4ecdc4',
  secondary: '#ff6b9d',
  accent: '#a78bfa',
  white: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  sectionBg: 'rgba(255, 255, 255, 0.05)',
};

// ============== ECOSYSTEM APPS ==============
const ECOSYSTEM_APPS: Record<string, { 
  bgColor: string;
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  tagline: string;
}> = {
  kwikpay: { 
    bgColor: '#d1fae5', 
    iconColor: '#059669', 
    icon: 'card',
    name: 'KwikPay',
    tagline: 'Accept Payments Anywhere'
  },
  retailpro: { 
    bgColor: '#e0e7ff', 
    iconColor: '#4f46e5', 
    icon: 'storefront',
    name: 'RetailPro',
    tagline: 'Complete POS Solution'
  },
  invoicing: { 
    bgColor: '#ede9fe', 
    iconColor: '#7c3aed', 
    icon: 'document-text',
    name: 'Invoicing',
    tagline: 'Professional Billing'
  },
  inventory: { 
    bgColor: '#d1fae5', 
    iconColor: '#10b981', 
    icon: 'cube',
    name: 'Inventory',
    tagline: 'Stock Management'
  },
  unitxt: { 
    bgColor: '#fef3c7', 
    iconColor: '#d97706', 
    icon: 'chatbubble-ellipses',
    name: 'UniTxt',
    tagline: 'SMS & WhatsApp'
  },
  crm: { 
    bgColor: '#fce7f3', 
    iconColor: '#ec4899', 
    icon: 'people',
    name: 'CRM',
    tagline: 'Customer Relations'
  },
  expenses: { 
    bgColor: '#fee2e2', 
    iconColor: '#ef4444', 
    icon: 'wallet',
    name: 'Expenses',
    tagline: 'Track Business Spending'
  },
};

// Animated App Icon with scale + glow effect
const AnimatedAppIcon = ({ 
  id, 
  config, 
  isLinked,
  trialStatus,
  daysRemaining,
  onPress, 
  onLongPress,
  onUpgradePress,
}: { 
  id: string;
  config: { bgColor: string; iconColor: string; icon: keyof typeof Ionicons.glyphMap; name: string };
  isLinked: boolean;
  trialStatus?: 'active' | 'expiring' | 'expired' | null;
  daysRemaining?: number;
  onPress: () => void;
  onLongPress?: () => void;
  onUpgradePress?: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  // Get trial badge color
  const getTrialBadgeStyle = () => {
    if (trialStatus === 'expiring') return { bg: '#f59e0b', text: '#fff' }; // Warning orange
    if (trialStatus === 'expired') return { bg: '#ef4444', text: '#fff' }; // Red
    return { bg: '#8b5cf6', text: '#fff' }; // Purple for active trial
  };

  const badgeStyle = getTrialBadgeStyle();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.appWrapper}
      data-testid={`app-${id}`}
    >
      <Animated.View style={[
        styles.appIconContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {/* Glow effect */}
        <Animated.View style={[
          styles.glowEffect,
          { 
            backgroundColor: config.iconColor,
            opacity: glowOpacity,
          }
        ]} />
        
        <View style={[styles.appIconBg, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={32} color={config.iconColor} />
          
          {/* Linked badge - green checkmark */}
          {isLinked && !trialStatus && (
            <View style={styles.linkedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
          
          {/* Trial badge with expiration warning */}
          {trialStatus && (
            <View style={[styles.trialBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.trialBadgeText, { color: badgeStyle.text }]}>
                {trialStatus === 'expired' ? 'EXPIRED' : 
                 trialStatus === 'expiring' ? `${daysRemaining}d` : 'TRIAL'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
      <Text style={styles.appName} numberOfLines={1}>{config.name}</Text>
      
      {/* Expiration warning text - tappable for upgrade */}
      {(trialStatus === 'expiring' || trialStatus === 'expired') && daysRemaining !== undefined && (
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            onUpgradePress?.();
          }}
          data-testid={`upgrade-${id}`}
        >
          <Text style={styles.expiringText}>
            {trialStatus === 'expired' ? 'Tap to upgrade' : 
             daysRemaining <= 1 ? 'Expires today!' : `${daysRemaining} days left`}
          </Text>
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

// Star background
const Stars = () => {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(star => (
        <View
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#FFFFFF',
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
};

export default function GalaxyHome() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout, isLoading: authLoading } = useAuthStore();
  const { 
    linkedProducts,
    availableProducts,
    fetchApps, 
    fetchUserAccess, 
    fetchEcosystemProducts,
    linkProduct,
    unlinkProduct,
    isLoading 
  } = useGalaxyStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; tagline: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [linking, setLinking] = useState(false);
  
  // Upgrade modal state
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeProduct, setUpgradeProduct] = useState<{
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    daysRemaining: number;
  } | null>(null);

  // Initialize trial notification service
  useEffect(() => {
    trialNotificationService.initialize();
    trialNotificationService.requestNotificationPermission();
  }, []);

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
        fetchEcosystemProducts(token),
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Check if product is linked
  const isProductLinked = (productId: string): boolean => {
    return linkedProducts.some(p => p.product_id === productId);
  };

  // Get trial status and days remaining for a product
  const getTrialInfo = (productId: string): { status: 'active' | 'expiring' | 'expired' | null; daysRemaining: number } => {
    const product = linkedProducts.find(p => p.product_id === productId);
    if (!product) return { status: null, daysRemaining: 0 };
    
    // Check if product is in trial
    if (product.status !== 'trial') return { status: null, daysRemaining: 0 };
    
    // Calculate days remaining from linked_at date (14 day trial)
    const linkedAt = product.linked_at ? new Date(product.linked_at) : new Date();
    const trialEndDate = new Date(linkedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    const now = new Date();
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return { status: 'expired', daysRemaining: 0 };
    if (daysRemaining <= 3) return { status: 'expiring', daysRemaining };
    return { status: 'active', daysRemaining };
  };

  // Handle app press
  const handleAppPress = (productId: string, isLinked: boolean) => {
    if (isLinked) {
      // Navigate to the app
      switch (productId) {
        case 'kwikpay':
          router.push('/kwikpay');
          break;
        case 'retailpro':
          router.push('/(tabs)/dashboard');
          break;
        case 'invoicing':
          router.push('/invoicing');
          break;
        case 'inventory':
          router.push('/inventory');
          break;
        case 'unitxt':
          router.push('/unitxt');
          break;
        case 'expenses':
          router.push('/expenses');
          break;
        case 'crm':
          router.push('/crm');
          break;
        default:
          router.push('/galaxy/coming-soon');
      }
    } else {
      // Show link modal
      const config = ECOSYSTEM_APPS[productId];
      if (config) {
        setSelectedProduct({ id: productId, name: config.name, tagline: config.tagline });
        setModalVisible(true);
      }
    }
  };

  // Show upgrade modal for expiring/expired trials
  const handleShowUpgrade = (productId: string) => {
    const config = ECOSYSTEM_APPS[productId];
    const trialInfo = getTrialInfo(productId);
    
    if (config) {
      setUpgradeProduct({
        id: productId,
        name: config.name,
        icon: config.icon,
        color: config.iconColor,
        daysRemaining: trialInfo.daysRemaining,
      });
      setUpgradeModalVisible(true);
    }
  };

  // Handle plan selection for upgrade
  const handleSelectPlan = async (planId: string): Promise<void> => {
    // In a real implementation, this would call Stripe or your payment provider
    // For now, we'll simulate a successful upgrade
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Refresh the ecosystem products to reflect the upgrade
    if (token) {
      await fetchEcosystemProducts(token);
    }
    
    Alert.alert(
      '🎉 Upgrade Successful!',
      `Your subscription has been activated. Enjoy ${upgradeProduct?.name}!`
    );
  };

  // Link product
  const handleLinkProduct = async () => {
    if (!token || !selectedProduct) return;
    
    setLinking(true);
    const result = await linkProduct(token, selectedProduct.id);
    setLinking(false);
    
    if (result.success) {
      setModalVisible(false);
      Alert.alert('🎉 Success!', `${selectedProduct.name} is now linked to your ecosystem!`);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  // Unlink product
  const handleUnlinkProduct = (productId: string, productName: string) => {
    if (!token) return;
    
    Alert.alert(
      'Unlink App',
      `Remove ${productName} from your ecosystem? You can always link it again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            const result = await unlinkProduct(token, productId);
            if (result.success) {
              Alert.alert('Done', `${productName} has been unlinked.`);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/galaxy');
  };

  // Get linked count
  const linkedCount = linkedProducts.length;
  const availableCount = Object.keys(ECOSYSTEM_APPS).length - linkedCount;

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]}
      style={styles.container}
    >
      <Stars />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SokoColorfulLogo size={48} />
            <View style={styles.headerText}>
              <Text style={styles.logoTitle}>Soko</Text>
              <Text style={styles.logoSubtitle}>Your Super App</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn} data-testid="notification-btn">
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {isLoading && !refreshing ? (
            <View style={styles.loadingInner}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="apps" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>My Ecosystem</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {linkedCount > 0 
                    ? `${linkedCount} linked · Tap to open, hold to unlink`
                    : 'Tap any app to link it to your ecosystem'
                  }
                </Text>
              </View>

              {/* Apps Grid - Properly aligned 3 columns */}
              <View style={styles.appsGrid}>
                {Object.entries(ECOSYSTEM_APPS).map(([id, config]) => {
                  const isLinked = isProductLinked(id);
                  const trialInfo = getTrialInfo(id);
                  return (
                    <AnimatedAppIcon
                      key={id}
                      id={id}
                      config={config}
                      isLinked={isLinked}
                      trialStatus={trialInfo.status}
                      daysRemaining={trialInfo.daysRemaining}
                      onPress={() => handleAppPress(id, isLinked)}
                      onLongPress={isLinked ? () => handleUnlinkProduct(id, config.name) : undefined}
                      onUpgradePress={trialInfo.status === 'expiring' || trialInfo.status === 'expired' 
                        ? () => handleShowUpgrade(id) 
                        : undefined}
                    />
                  );
                })}
              </View>

              {/* Stats Card */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Ionicons name="link" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.statNumber}>{linkedCount}</Text>
                  <Text style={styles.statLabel}>Linked</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                    <Ionicons name="add-circle" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.statNumber}>{availableCount}</Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
                    <Ionicons name="cube" size={18} color={COLORS.accent} />
                  </View>
                  <Text style={styles.statNumber}>{Object.keys(ECOSYSTEM_APPS).length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>

              {/* How It Works Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>How Ecosystem Linking Works</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoBullet}><Text style={styles.infoBulletText}>1</Text></View>
                  <Text style={styles.infoText}>Tap an unlinked app to add it to your ecosystem</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoBullet}><Text style={styles.infoBulletText}>2</Text></View>
                  <Text style={styles.infoText}>Linked apps share data and work together</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoBullet}><Text style={styles.infoBulletText}>3</Text></View>
                  <Text style={styles.infoText}>Long-press any linked app to unlink it</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* User Footer */}
        <View style={styles.footer}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} data-testid="logout-btn">
            <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        </View>

        {/* Link Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              {selectedProduct && ECOSYSTEM_APPS[selectedProduct.id] && (
                <>
                  <View style={[
                    styles.modalIcon, 
                    { backgroundColor: ECOSYSTEM_APPS[selectedProduct.id].bgColor }
                  ]}>
                    <Ionicons 
                      name={ECOSYSTEM_APPS[selectedProduct.id].icon} 
                      size={44} 
                      color={ECOSYSTEM_APPS[selectedProduct.id].iconColor} 
                    />
                  </View>
                  
                  <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedProduct.tagline}</Text>
                  
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.benefitText}>Sync data across all your linked apps</Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.benefitText}>Automate workflows between products</Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.benefitText}>Get unified business insights</Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <Ionicons name="gift" size={20} color="#f59e0b" />
                      <Text style={styles.benefitText}>14-day free trial included</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleLinkProduct}
                    disabled={linking}
                    data-testid="confirm-link-btn"
                  >
                    <LinearGradient
                      colors={[COLORS.primary, '#34d399']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.linkButtonGradient}
                    >
                      {linking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="link" size={20} color="#FFFFFF" />
                          <Text style={styles.linkButtonText}>Link to My Ecosystem</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Upgrade Modal for Trial Expiration */}
        {upgradeProduct && (
          <UpgradeModal
            visible={upgradeModalVisible}
            onClose={() => {
              setUpgradeModalVisible(false);
              setUpgradeProduct(null);
            }}
            productName={upgradeProduct.name}
            productIcon={upgradeProduct.icon}
            productColor={upgradeProduct.color}
            daysRemaining={upgradeProduct.daysRemaining}
            onSelectPlan={handleSelectPlan}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgStart,
  },
  loadingInner: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    gap: 2,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 28,
  },
  
  // Apps Grid - Fixed alignment
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  appWrapper: {
    width: ICON_SIZE,
    alignItems: 'center',
    marginBottom: 20,
  },
  appIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
  },
  appIconBg: {
    width: ICON_SIZE - 16,
    height: ICON_SIZE - 16,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
    textAlign: 'center',
  },
  linkedBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgMid,
  },
  trialBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.bgMid,
  },
  trialBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  expiringText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#f59e0b',
    marginTop: 2,
  },
  
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.sectionBg,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Info Card
  infoCard: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBulletText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  userDetails: {
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  userEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitsList: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  linkButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  linkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
});
