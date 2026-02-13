import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import FreeTrialModal, { ProductInfo } from '../../src/components/FreeTrialModal';
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

// Product data
const PRODUCTS: Record<string, any> = {
  'retail-pro': {
    id: 'retail-pro',
    name: 'Retail Pro',
    tagline: 'Complete Retail Management Solution',
    description: 'All-in-one retail management platform designed to help businesses of any size manage sales, inventory, customers, and analytics with ease.',
    longDescription: 'Retail Pro is the flagship product of Software Galaxy, offering a comprehensive suite of tools for modern retailers. From quick point-of-sale transactions to deep analytics insights, Retail Pro empowers you to make data-driven decisions and grow your business.',
    icon: 'storefront-outline',
    color: '#2563EB',
    bgColor: '#EEF2FF',
    gradientColors: ['#2563EB', '#1D4ED8'],
    dashboardRoute: '/(tabs)/dashboard',
    features: [
      { icon: 'cart-outline', title: 'Point of Sale', desc: 'Fast, intuitive POS system with support for multiple payment methods' },
      { icon: 'cube-outline', title: 'Inventory Management', desc: 'Real-time stock tracking with low stock alerts and automatic reordering' },
      { icon: 'people-outline', title: 'Customer Management', desc: 'Track customer purchases, build loyalty programs, and personalize marketing' },
      { icon: 'bar-chart-outline', title: 'Sales Analytics', desc: 'Comprehensive reports and insights to drive growth' },
      { icon: 'business-outline', title: 'Multi-location', desc: 'Manage multiple stores from a single dashboard' },
      { icon: 'people-circle-outline', title: 'Staff Management', desc: 'Role-based access control and performance tracking' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['Up to 100 products', '1 user', 'Basic reports'] },
      { name: 'Business', price: '$29', period: '/month', features: ['Unlimited products', '5 users', 'Advanced analytics', 'Multi-location'], highlighted: true },
      { name: 'Enterprise', price: '$99', period: '/month', features: ['Everything in Business', 'Unlimited users', 'API access', 'Dedicated support'] },
    ],
    screenshots: [],
    comingSoon: false,
  },
  'inventory': {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    description: 'Powerful standalone inventory management system with real-time tracking, comprehensive reporting, and seamless integration capabilities.',
    longDescription: 'Take control of your stock with our dedicated Inventory application. Perfect for businesses that need focused inventory management without the full retail suite. Track stock levels, manage suppliers, and never run out of essential items.',
    icon: 'cube-outline',
    color: '#059669',
    bgColor: '#D1FAE5',
    gradientColors: ['#059669', '#047857'],
    dashboardRoute: '/inventory',
    features: [
      { icon: 'layers-outline', title: 'Real-time Tracking', desc: 'Monitor stock levels across all locations in real-time' },
      { icon: 'notifications-outline', title: 'Smart Alerts', desc: 'Automatic notifications when stock reaches minimum levels' },
      { icon: 'barcode-outline', title: 'Barcode Scanning', desc: 'Quick stock updates with barcode and QR code support' },
      { icon: 'time-outline', title: 'Movement History', desc: 'Complete audit trail of all stock movements' },
      { icon: 'people-outline', title: 'Supplier Management', desc: 'Manage vendor relationships and purchase orders' },
      { icon: 'cloud-upload-outline', title: 'Bulk Operations', desc: 'Import and export data via CSV and Excel' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['Up to 500 items', '1 location', 'Basic reports'] },
      { name: 'Business', price: '$19', period: '/month', features: ['Unlimited items', '5 locations', 'Advanced analytics'], highlighted: true },
      { name: 'Enterprise', price: '$59', period: '/month', features: ['Everything in Business', 'Unlimited locations', 'API access'] },
    ],
    screenshots: [],
    comingSoon: false,
  },
  'invoicing': {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing Made Simple',
    description: 'Create, send, and track professional invoices effortlessly. Get paid faster with automated reminders and multiple payment options.',
    longDescription: 'Streamline your billing process with our professional invoicing solution. Create beautiful invoices in seconds, send them directly to clients, and track payments automatically. With support for multiple currencies and automated reminders, you\'ll get paid faster.',
    icon: 'document-text-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    gradientColors: ['#7C3AED', '#6D28D9'],
    dashboardRoute: '/invoicing',
    features: [
      { icon: 'create-outline', title: 'Custom Templates', desc: 'Beautiful, professional invoice templates with your branding' },
      { icon: 'alarm-outline', title: 'Auto Reminders', desc: 'Automated payment reminders to reduce late payments' },
      { icon: 'card-outline', title: 'Payment Tracking', desc: 'Track payment status from sent to paid' },
      { icon: 'globe-outline', title: 'Multi-currency', desc: 'Send invoices in any currency with automatic conversion' },
      { icon: 'laptop-outline', title: 'Client Portal', desc: 'Let clients view and pay invoices online' },
      { icon: 'analytics-outline', title: 'Financial Reports', desc: 'Track revenue, outstanding payments, and more' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['10 invoices/month', '1 user', 'Basic templates'] },
      { name: 'Business', price: '$15', period: '/month', features: ['Unlimited invoices', '5 users', 'Custom branding'], highlighted: true },
      { name: 'Enterprise', price: '$49', period: '/month', features: ['Everything in Business', 'API access', 'White label'] },
    ],
    screenshots: [],
    comingSoon: false,
  },
  'payment': {
    id: 'payment',
    name: 'Payment Solution',
    tagline: 'Unified Payment Processing',
    description: 'Accept payments anywhere with our secure, unified payment solution. Support for cards, mobile money, and more.',
    longDescription: 'Accept payments seamlessly with our unified payment platform. Whether your customers prefer credit cards, mobile money, or bank transfers, we\'ve got you covered. With competitive rates and instant settlements, growing your business has never been easier.',
    icon: 'card-outline',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    gradientColors: ['#DC2626', '#B91C1C'],
    dashboardRoute: '/payment',
    features: [
      { icon: 'card-outline', title: 'Card Payments', desc: 'Accept Visa, Mastercard, and more' },
      { icon: 'phone-portrait-outline', title: 'Mobile Money', desc: 'M-Pesa, Airtel Money, and other local options' },
      { icon: 'qr-code-outline', title: 'QR Payments', desc: 'Accept payments via QR codes' },
      { icon: 'link-outline', title: 'Payment Links', desc: 'Share payment links via SMS or email' },
      { icon: 'sync-outline', title: 'Recurring Billing', desc: 'Set up subscriptions and recurring payments' },
      { icon: 'shield-checkmark-outline', title: 'Fraud Protection', desc: 'Advanced security to protect your business' },
    ],
    pricing: [
      { name: 'Standard', price: '2.9%', period: '+ $0.30', features: ['All payment methods', 'Instant settlements', 'Basic dashboard'] },
      { name: 'Business', price: '1.5%', period: '+ $0.25', features: ['Volume discounts', 'Priority support', 'Advanced analytics'], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: 'pricing', features: ['Custom rates', 'Dedicated account manager', 'SLA guarantee'] },
    ],
    screenshots: [],
    comingSoon: true,
  },
  'bulk-sms': {
    id: 'bulk-sms',
    name: 'Bulk SMS',
    tagline: 'Mass Communication Made Easy',
    description: 'Reach your customers instantly with our reliable bulk SMS platform. Perfect for marketing campaigns and notifications.',
    longDescription: 'Connect with your customers at scale using our powerful bulk SMS platform. Whether you\'re running marketing campaigns, sending transactional alerts, or appointment reminders, our platform ensures your messages are delivered reliably and quickly.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    gradientColors: ['#F59E0B', '#D97706'],
    dashboardRoute: '/bulk-sms',
    features: [
      { icon: 'send-outline', title: 'Bulk Messaging', desc: 'Send thousands of messages in seconds' },
      { icon: 'people-outline', title: 'Contact Groups', desc: 'Organize contacts into targeted groups' },
      { icon: 'calendar-outline', title: 'Scheduled Messages', desc: 'Schedule messages for optimal delivery times' },
      { icon: 'checkmark-done-outline', title: 'Delivery Reports', desc: 'Real-time delivery status for every message' },
      { icon: 'person-outline', title: 'Personalization', desc: 'Personalize messages with customer data' },
      { icon: 'code-slash-outline', title: 'API Access', desc: 'Integrate SMS into your applications' },
    ],
    pricing: [
      { name: 'Pay-as-you-go', price: '$0.02', period: '/SMS', features: ['No monthly fees', 'Basic dashboard', 'Email support'] },
      { name: 'Business', price: '$0.015', period: '/SMS', features: ['Volume discounts', 'Priority delivery', 'API access'], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: 'pricing', features: ['Best rates', 'Dedicated line', 'SLA guarantee'] },
    ],
    screenshots: [],
    comingSoon: true,
  },
  'accounting': {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Simplified Business Accounting',
    description: 'Manage your finances with ease. Track expenses, generate reports, and stay tax-ready all year round.',
    longDescription: 'Take the complexity out of business accounting. Our intuitive accounting software helps you track income and expenses, reconcile bank statements, generate financial reports, and stay prepared for tax season. Perfect for small to medium businesses.',
    icon: 'calculator-outline',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    gradientColors: ['#0891B2', '#0E7490'],
    dashboardRoute: '/accounting',
    features: [
      { icon: 'wallet-outline', title: 'Expense Tracking', desc: 'Track and categorize all business expenses' },
      { icon: 'git-compare-outline', title: 'Bank Reconciliation', desc: 'Automatically match bank transactions' },
      { icon: 'document-text-outline', title: 'Financial Reports', desc: 'P&L, balance sheets, and more' },
      { icon: 'calculator-outline', title: 'Tax Calculations', desc: 'Automated tax calculations and reports' },
      { icon: 'globe-outline', title: 'Multi-currency', desc: 'Handle transactions in any currency' },
      { icon: 'trending-up-outline', title: 'Budgeting', desc: 'Set budgets and track performance' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['Basic bookkeeping', '1 user', 'Standard reports'] },
      { name: 'Business', price: '$25', period: '/month', features: ['Full accounting', '5 users', 'Tax preparation'], highlighted: true },
      { name: 'Enterprise', price: '$79', period: '/month', features: ['Everything in Business', 'Unlimited users', 'API access'] },
    ],
    screenshots: [],
    comingSoon: true,
  },
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isAuthenticated, user, logout } = useAuthStore();
  
  // Free Trial Modal state
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialProductInfo, setTrialProductInfo] = useState<ProductInfo | null>(null);
  
  const product = PRODUCTS[id as string];

  // Redirect mobile users
  useEffect(() => {
    if (!isWeb) {
      router.replace('/(auth)/login');
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/landing');
  };
  
  // Helper to darken a color for gradient
  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const handleStartTrial = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    
    if (!product) return;
    
    // Show the beautiful trial modal
    const productInfo: ProductInfo = {
      id: (id as string).replace(/-/g, '_'), // Convert to underscore for API
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      icon: product.icon,
      color: product.color,
      bgColor: product.bgColor,
      gradientColors: product.gradientColors as [string, string],
      features: product.features.slice(0, 4).map(f => f.title), // Extract feature titles
      dashboardRoute: product.dashboardRoute || '/(tabs)/dashboard',
    };
    
    setTrialProductInfo(productInfo);
    setShowTrialModal(true);
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={THEME.gray} />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/landing')}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <>
                <ProductSwitcher />
                <View style={styles.userSection}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.loginBtn}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.signUpBtn, { backgroundColor: product.color }]}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.signUpBtnText}>
                    {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={product.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {product.comingSoon && (
            <View style={styles.comingSoonBanner}>
              <Ionicons name="rocket-outline" size={18} color={THEME.white} />
              <Text style={styles.comingSoonBannerText}>Coming Soon</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.backLink}
            onPress={() => router.push('/landing')}
          >
            <Ionicons name="arrow-back" size={20} color={THEME.white} />
            <Text style={styles.backLinkText}>Back to Products</Text>
          </TouchableOpacity>
          
          <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
            <View style={[styles.productIconLarge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={product.icon} size={48} color={THEME.white} />
            </View>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
              {product.name}
            </Text>
            <Text style={styles.heroTagline}>{product.tagline}</Text>
            <Text style={[styles.heroDescription, isMobile && styles.heroDescriptionMobile]}>
              {product.longDescription}
            </Text>
            
            <View style={[styles.heroCTA, isMobile && styles.heroCTAMobile]}>
              {isWeb ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartTrial();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: THEME.white,
                    paddingTop: 16,
                    paddingBottom: 16,
                    paddingLeft: 32,
                    paddingRight: 32,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: product.color, fontSize: 16, fontWeight: '600' }}>
                    {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
                  </span>
                  <Ionicons name="arrow-forward" size={20} color={product.color} />
                </button>
              ) : (
                <TouchableOpacity 
                  style={styles.ctaButton}
                  onPress={handleStartTrial}
                >
                  <Text style={[styles.ctaButtonText, { color: product.color }]}>
                    {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={product.color} />
                </TouchableOpacity>
              )}
              {!product.comingSoon && (
                <TouchableOpacity style={styles.ctaSecondary}>
                  <Ionicons name="play-circle-outline" size={24} color={THEME.white} />
                  <Text style={styles.ctaSecondaryText}>Watch Demo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <Text style={styles.sectionSubtitle}>
            Everything you need to {product.id === 'retail-pro' ? 'run your retail business' : 
              product.id === 'inventory' ? 'manage your stock' :
              product.id === 'invoicing' ? 'get paid faster' :
              product.id === 'payment' ? 'accept payments' :
              product.id === 'bulk-sms' ? 'reach your customers' :
              'manage your finances'}
          </Text>
          
          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            {product.features.map((feature: any, index: number) => (
              <View key={index} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
                <View style={[styles.featureIconWrapper, { backgroundColor: product.bgColor }]}>
                  <Ionicons name={feature.icon} size={28} color={product.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Simple Pricing</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the plan that fits your needs
          </Text>
          
          <View style={[styles.pricingGrid, isMobile && styles.pricingGridMobile]}>
            {product.pricing.map((plan: any, index: number) => (
              <View 
                key={index}
                style={[
                  styles.pricingCard,
                  plan.highlighted && [styles.pricingCardHighlighted, { borderColor: product.color }],
                  isMobile && styles.pricingCardMobile,
                ]}
              >
                {plan.highlighted && (
                  <View style={[styles.popularBadge, { backgroundColor: product.color }]}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                <Text style={styles.pricingName}>{plan.name}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{plan.price}</Text>
                  <Text style={styles.pricingPeriod}>{plan.period}</Text>
                </View>
                <View style={styles.pricingFeatures}>
                  {plan.features.map((feature: string, idx: number) => (
                    <View key={idx} style={styles.pricingFeatureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={product.color} />
                      <Text style={styles.pricingFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity 
                  style={[
                    styles.pricingButton,
                    { borderColor: product.color },
                    plan.highlighted && { backgroundColor: product.color },
                  ]}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={[
                    styles.pricingButtonText,
                    { color: product.color },
                    plan.highlighted && { color: THEME.white },
                  ]}>
                    {product.comingSoon ? 'Join Waitlist' : 'Get Started'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <LinearGradient
          colors={product.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaSection}
        >
          <Text style={styles.ctaSectionTitle}>
            {product.comingSoon ? 'Be the First to Know' : `Ready to Try ${product.name}?`}
          </Text>
          <Text style={styles.ctaSectionSubtitle}>
            {product.comingSoon 
              ? 'Join our waitlist and get early access when we launch' 
              : 'Start your free trial today. No credit card required.'}
          </Text>
          <TouchableOpacity 
            style={styles.ctaSectionButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={[styles.ctaSectionButtonText, { color: product.color }]}>
              {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
            </Text>
            <Ionicons name={product.comingSoon ? 'mail-outline' : 'rocket-outline'} size={20} color={product.color} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <TouchableOpacity style={styles.logo} onPress={() => router.push('/landing')}>
              <View style={styles.logoIconSmall}>
                <View style={styles.logoOrbitSmall}>
                  <View style={styles.logoDotSmall} />
                </View>
              </View>
              <View>
                <Text style={[styles.logoTextSmall, { color: THEME.gray }]}>SOFTWARE</Text>
                <Text style={[styles.logoTextLarge, { color: THEME.white, fontSize: 18 }]}>GALAXY</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.footerCopyright}>
              © 2025 Software Galaxy. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Free Trial Modal */}
      <FreeTrialModal
        visible={showTrialModal}
        product={trialProductInfo}
        onClose={() => {
          setShowTrialModal(false);
          setTrialProductInfo(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: THEME.gray,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: THEME.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loginBtnText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  signUpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signUpBtnText: {
    fontSize: 14,
    color: THEME.white,
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.dark,
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: THEME.white,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.gray,
  },
  heroSection: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 100,
    position: 'relative',
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  comingSoonBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.white,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  backLinkText: {
    fontSize: 14,
    color: THEME.white,
    fontWeight: '500',
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroContentMobile: {
    paddingHorizontal: 0,
  },
  productIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: THEME.white,
    textAlign: 'center',
  },
  heroTitleMobile: {
    fontSize: 40,
  },
  heroTagline: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  heroDescription: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 30,
    maxWidth: 700,
  },
  heroDescriptionMobile: {
    fontSize: 16,
    lineHeight: 26,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 48,
  },
  heroCTAMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  ctaSecondaryText: {
    fontSize: 16,
    color: THEME.white,
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 40,
    paddingVertical: 100,
    backgroundColor: THEME.lightGray,
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME.dark,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 18,
    color: THEME.gray,
    textAlign: 'center',
    marginTop: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 60,
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
  featureCard: {
    width: 340,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: THEME.gray,
    lineHeight: 22,
  },
  pricingSection: {
    paddingHorizontal: 40,
    paddingVertical: 100,
    backgroundColor: THEME.white,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 60,
  },
  pricingGridMobile: {
    flexDirection: 'column',
  },
  pricingCard: {
    width: 320,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  pricingCardMobile: {
    width: '100%',
  },
  pricingCardHighlighted: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    fontSize: 12,
    color: THEME.white,
    fontWeight: '600',
  },
  pricingName: {
    fontSize: 22,
    fontWeight: '600',
    color: THEME.dark,
    textAlign: 'center',
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 16,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: '700',
    color: THEME.dark,
  },
  pricingPeriod: {
    fontSize: 16,
    color: THEME.gray,
    marginLeft: 4,
  },
  pricingFeatures: {
    marginTop: 32,
    gap: 14,
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: '#374151',
  },
  pricingButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  pricingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSection: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  ctaSectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.white,
    textAlign: 'center',
  },
  ctaSectionSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 16,
  },
  ctaSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 40,
    gap: 10,
  },
  ctaSectionButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: THEME.dark,
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerCopyright: {
    fontSize: 14,
    color: THEME.gray,
  },
  logoIconSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOrbitSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME.primary,
    borderStyle: 'dashed',
  },
  logoDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    position: 'absolute',
    top: -3,
    right: 3,
  },
});
