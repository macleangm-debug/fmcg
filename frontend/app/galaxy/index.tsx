import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useGalaxyStore, GalaxyAppId } from '../../src/store/galaxyStore';

// Software Galaxy Theme Colors
const GALAXY_THEME = {
  primary: '#00B4D8',      // Cyan blue
  primaryDark: '#0077B6',  // Darker blue
  secondary: '#023E8A',    // Navy blue
  dark: '#03071E',         // Almost black
  light: '#CAF0F8',        // Light cyan
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

interface Solution {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: string[];
  route: string;
  features: string[];
  pricing: string;
  isAvailable: boolean;
  isNew?: boolean;
  isPopular?: boolean;
}

const SOLUTIONS: Solution[] = [
  {
    id: 'retailpro',
    name: 'Retail Pro',
    tagline: 'Complete retail management',
    description: 'Point of sale, customer management, orders, and sales analytics for retail businesses.',
    icon: 'cart-outline',
    color: '#2563EB',
    gradient: ['#2563EB', '#3B82F6'],
    route: '/products/retail-pro',
    features: ['Point of Sale (POS)', 'Customer Management', 'Order Tracking', 'Sales Reports', 'Multi-payment Support'],
    pricing: 'From $29/month',
    isAvailable: true,
    isPopular: true,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock & product control',
    description: 'Complete inventory management with stock tracking, product catalog, and supplier management.',
    icon: 'cube-outline',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
    route: '/galaxy/coming-soon',
    features: ['Product Catalog', 'Stock Tracking', 'Low Stock Alerts', 'Supplier Management', 'Barcode Support'],
    pricing: 'From $19/month',
    isAvailable: false,
    isNew: true,
  },
  {
    id: 'payments',
    name: 'Payment Solution',
    tagline: 'Accept payments anywhere',
    description: 'Integrated payment processing with multiple gateways, mobile money, and card payments.',
    icon: 'card-outline',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
    route: '/galaxy/coming-soon',
    features: ['Multi-gateway Support', 'Mobile Money', 'Card Payments', 'Payment Links', 'Transaction Reports'],
    pricing: 'From $15/month',
    isAvailable: false,
  },
  {
    id: 'bulksms',
    name: 'Bulk SMS',
    tagline: 'Reach customers instantly',
    description: 'Send promotional messages, alerts, and notifications to thousands of customers at once.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
    route: '/galaxy/coming-soon',
    features: ['Mass Messaging', 'Contact Groups', 'Scheduled SMS', 'Delivery Reports', 'Templates'],
    pricing: 'Pay-as-you-go',
    isAvailable: false,
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional invoices',
    description: 'Create, send, and track professional invoices. Get paid faster with online payments.',
    icon: 'document-text-outline',
    color: '#EF4444',
    gradient: ['#EF4444', '#F87171'],
    route: '/galaxy/coming-soon',
    features: ['Invoice Templates', 'Online Payments', 'Recurring Invoices', 'Payment Reminders', 'Tax Calculations'],
    pricing: 'From $12/month',
    isAvailable: false,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Financial clarity',
    description: 'Complete accounting solution with expense tracking, financial reports, and tax management.',
    icon: 'calculator-outline',
    color: '#EC4899',
    gradient: ['#EC4899', '#F472B6'],
    route: '/galaxy/coming-soon',
    features: ['Expense Tracking', 'Financial Reports', 'Tax Management', 'Bank Reconciliation', 'Multi-currency'],
    pricing: 'From $25/month',
    isAvailable: false,
    isNew: true,
  },
];

export default function SoftwareGalaxyHome() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isMediumScreen = width > 768;
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const { fetchUserAccess, subscribeToApp, generateSSOToken, userAppAccess, isLoading: galaxyLoading } = useGalaxyStore();
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [loadingApp, setLoadingApp] = useState<string | null>(null);

  // Fetch user's app access when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUserAccess(token);
    }
  }, [isAuthenticated, token]);

  // Map solution IDs to Galaxy App IDs
  const solutionToAppId: Record<string, GalaxyAppId> = {
    'retailpro': 'retail_pro',
    'inventory': 'inventory',
    'payments': 'payments',
    'bulksms': 'bulk_sms',
    'invoicing': 'invoicing',
    'accounting': 'accounting',
  };

  // Check if user has access to a specific app
  const hasAccess = (solutionId: string): boolean => {
    const appId = solutionToAppId[solutionId];
    if (!appId) return false;
    const access = userAppAccess.find(a => a.app.app_id === appId);
    return access?.subscription?.status === 'active';
  };

  const handleSolutionPress = async (solution: Solution) => {
    if (solution.isAvailable) {
      // Navigate directly to the product landing page
      router.push(solution.route as any);
    } else {
      // Handle coming soon apps
      if (isAuthenticated && token) {
        const appId = solutionToAppId[solution.id];
        setLoadingApp(solution.id);
        try {
          const result = await subscribeToApp(token, appId);
          Alert.alert('Waitlist', result.message);
        } catch (error) {
          router.push('/galaxy/coming-soon' as any);
        } finally {
          setLoadingApp(null);
        }
      } else {
        router.push('/galaxy/coming-soon' as any);
      }
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          {/* Software Galaxy Logo representation */}
          <View style={styles.logoIcon}>
            <View style={styles.logoOrbit}>
              <View style={styles.logoDot} />
            </View>
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoTextSoftware}>SOFTWARE</Text>
            <Text style={styles.logoTextGalaxy}>GALAXY</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {isAuthenticated ? (
            <TouchableOpacity 
              style={styles.userButton}
              onPress={() => router.push('/(tabs)/dashboard')}
            >
              <Ionicons name="person-circle" size={32} color={GALAXY_THEME.primary} />
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.authButtons}>
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.registerButton}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.registerButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderHero = () => (
    <LinearGradient
      colors={[GALAXY_THEME.dark, GALAXY_THEME.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {/* Decorative stars */}
      <View style={styles.starsContainer}>
        {[...Array(20)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.star, 
              { 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3,
              }
            ]} 
          />
        ))}
      </View>
      
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>One Platform.{'\n'}Infinite Possibilities.</Text>
        <Text style={styles.heroSubtitle}>
          Access all your business tools with a single sign-on. 
          Retail, Inventory, Payments, SMS, Invoicing & more.
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity 
            style={styles.heroPrimaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.heroPrimaryButtonText}>Start Free Trial</Text>
            <Ionicons name="arrow-forward" size={20} color={GALAXY_THEME.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroSecondaryButton}>
            <Ionicons name="play-circle" size={24} color={GALAXY_THEME.white} />
            <Text style={styles.heroSecondaryButtonText}>Watch Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderSolutionCard = (solution: Solution) => {
    const userHasAccess = hasAccess(solution.id);
    const isLoadingThisApp = loadingApp === solution.id;
    
    return (
      <TouchableOpacity
        key={solution.id}
        style={[
          styles.solutionCard,
          isLargeScreen && styles.solutionCardLarge,
          isMediumScreen && !isLargeScreen && styles.solutionCardMedium,
          userHasAccess && styles.solutionCardActive,
        ]}
        onPress={() => handleSolutionPress(solution)}
        activeOpacity={0.8}
        disabled={isLoadingThisApp}
      >
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {userHasAccess && (
            <View style={[styles.badge, styles.activeBadge]}>
              <Ionicons name="checkmark-circle" size={10} color="#FFFFFF" />
              <Text style={styles.badgeText}>ACTIVE</Text>
            </View>
          )}
          {solution.isNew && !userHasAccess && (
            <View style={[styles.badge, styles.newBadge]}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
          {solution.isPopular && !userHasAccess && (
            <View style={[styles.badge, styles.popularBadge]}>
              <Ionicons name="star" size={10} color="#FFFFFF" />
              <Text style={styles.badgeText}>POPULAR</Text>
            </View>
          )}
          {!solution.isAvailable && (
            <View style={[styles.badge, styles.comingSoonBadge]}>
              <Text style={styles.badgeText}>COMING SOON</Text>
            </View>
          )}
        </View>

        {/* Icon Header */}
        <LinearGradient
          colors={solution.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.solutionIconContainer}
        >
          {isLoadingThisApp ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name={solution.icon} size={32} color="#FFFFFF" />
          )}
        </LinearGradient>

        {/* Content */}
        <Text style={styles.solutionName}>{solution.name}</Text>
        <Text style={styles.solutionTagline}>{solution.tagline}</Text>
        <Text style={styles.solutionDescription} numberOfLines={2}>
          {solution.description}
        </Text>

        {/* Features */}
        <View style={styles.featuresList}>
          {solution.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={14} color={solution.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pricing & Action */}
        <View style={styles.solutionFooter}>
          <Text style={styles.solutionPricing}>{solution.pricing}</Text>
          <View style={[styles.solutionAction, { backgroundColor: solution.color }]}>
            {isLoadingThisApp ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.solutionActionText}>
                  {solution.isAvailable 
                    ? (userHasAccess ? 'Open' : 'Get Started') 
                    : 'Notify Me'}
                </Text>
                <Ionicons 
                  name={solution.isAvailable 
                    ? (userHasAccess ? 'arrow-forward' : 'rocket-outline')
                    : 'notifications-outline'} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSolutions = () => (
    <View style={styles.solutionsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Our Solutions</Text>
        <Text style={styles.sectionSubtitle}>
          Everything you need to run your business, all in one place
        </Text>
      </View>
      
      <View style={styles.solutionsGrid}>
        {SOLUTIONS.map(renderSolutionCard)}
      </View>
    </View>
  );

  const renderFeatures = () => (
    <View style={styles.featuresSection}>
      <LinearGradient
        colors={[GALAXY_THEME.light, '#FFFFFF']}
        style={styles.featuresGradient}
      >
        <Text style={styles.featuresSectionTitle}>Why Software Galaxy?</Text>
        
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="key-outline" size={28} color="#2563EB" />
            </View>
            <Text style={styles.featureCardTitle}>Single Sign-On</Text>
            <Text style={styles.featureCardDesc}>
              One account to access all solutions. No more password fatigue.
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="sync-outline" size={28} color="#10B981" />
            </View>
            <Text style={styles.featureCardTitle}>Seamless Integration</Text>
            <Text style={styles.featureCardDesc}>
              All apps work together. Data flows automatically between solutions.
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.featureCardTitle}>Enterprise Security</Text>
            <Text style={styles.featureCardDesc}>
              Bank-level encryption and compliance with global standards.
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="trending-up-outline" size={28} color="#EC4899" />
            </View>
            <Text style={styles.featureCardTitle}>Scale As You Grow</Text>
            <Text style={styles.featureCardDesc}>
              Start with what you need. Add more solutions as your business grows.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.footerContent}>
        <View style={styles.footerBrand}>
          <View style={styles.footerLogoContainer}>
            <View style={styles.logoIcon}>
              <View style={styles.logoOrbit}>
                <View style={styles.logoDot} />
              </View>
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={[styles.logoTextSoftware, { color: '#FFFFFF' }]}>SOFTWARE</Text>
              <Text style={[styles.logoTextGalaxy, { color: GALAXY_THEME.primary }]}>GALAXY</Text>
            </View>
          </View>
          <Text style={styles.footerTagline}>
            Powering businesses with integrated solutions
          </Text>
        </View>
        
        <View style={styles.footerLinks}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>Solutions</Text>
            {SOLUTIONS.map(s => (
              <TouchableOpacity key={s.id}>
                <Text style={styles.footerLink}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>Company</Text>
            <TouchableOpacity><Text style={styles.footerLink}>About Us</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Careers</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Contact</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Blog</Text></TouchableOpacity>
          </View>
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>Support</Text>
            <TouchableOpacity><Text style={styles.footerLink}>Help Center</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Documentation</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>API Reference</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Status</Text></TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={styles.footerBottom}>
        <Text style={styles.footerCopyright}>
          © 2025 Software Galaxy. All rights reserved.
        </Text>
        <View style={styles.footerSocial}>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-twitter" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-linkedin" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-facebook" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderHero()}
        {renderSolutions()}
        {renderFeatures()}
        {renderFooter()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
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
    borderColor: GALAXY_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GALAXY_THEME.primary,
    position: 'absolute',
    top: -4,
    right: 4,
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  logoTextSoftware: {
    fontSize: 10,
    fontWeight: '600',
    color: GALAXY_THEME.gray,
    letterSpacing: 2,
  },
  logoTextGalaxy: {
    fontSize: 18,
    fontWeight: '800',
    color: GALAXY_THEME.dark,
    marginTop: -4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GALAXY_THEME.dark,
  },
  registerButton: {
    backgroundColor: GALAXY_THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: GALAXY_THEME.dark,
  },
  // Hero
  hero: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 28,
    maxWidth: 600,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  heroPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GALAXY_THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  heroPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Solutions
  solutionsSection: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: GALAXY_THEME.dark,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: GALAXY_THEME.gray,
    marginTop: 12,
    textAlign: 'center',
  },
  solutionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  solutionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  solutionCardMedium: {
    width: '47%',
  },
  solutionCardLarge: {
    width: '30%',
  },
  solutionCardActive: {
    borderColor: GALAXY_THEME.primary,
    borderWidth: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadge: {
    backgroundColor: '#10B981',
  },
  popularBadge: {
    backgroundColor: '#F59E0B',
  },
  comingSoonBadge: {
    backgroundColor: '#6B7280',
  },
  activeBadge: {
    backgroundColor: GALAXY_THEME.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  solutionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  solutionName: {
    fontSize: 20,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
  },
  solutionTagline: {
    fontSize: 14,
    color: GALAXY_THEME.gray,
    marginTop: 4,
  },
  solutionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#4B5563',
  },
  solutionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  solutionPricing: {
    fontSize: 14,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
  },
  solutionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  solutionActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Features Section
  featuresSection: {
    marginTop: 20,
  },
  featuresGradient: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  featuresSectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: GALAXY_THEME.dark,
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  featureCard: {
    width: '45%',
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
    textAlign: 'center',
  },
  featureCardDesc: {
    fontSize: 14,
    color: GALAXY_THEME.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  // Footer
  footer: {
    backgroundColor: GALAXY_THEME.dark,
    paddingTop: 60,
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 40,
  },
  footerBrand: {
    maxWidth: 300,
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  footerTagline: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 60,
  },
  footerColumn: {
    gap: 12,
  },
  footerColumnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerCopyright: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerSocial: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
