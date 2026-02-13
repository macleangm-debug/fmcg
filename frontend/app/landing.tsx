import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/authStore';
import ProductSwitcher from '../src/components/ProductSwitcher';
import FreeTrialModal, { ProductInfo } from '../src/components/FreeTrialModal';
import WaitlistModal, { WaitlistProductInfo } from '../src/components/WaitlistModal';
import api from '../src/api/client';

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

// Product Apps Data with dashboard routes
const PRODUCTS = [
  {
    id: 'retail_pro',
    name: 'Retail Pro',
    tagline: 'Complete Retail Management',
    description: 'All-in-one retail management platform for sales, inventory, customers, and analytics. Perfect for stores of any size.',
    icon: 'storefront-outline',
    color: '#2563EB',
    bgColor: '#EEF2FF',
    features: ['Point of Sale (POS)', 'Inventory Management', 'Customer Tracking', 'Sales Analytics', 'Multi-location Support', 'Staff Management'],
    pricing: { starter: 'Free', business: '$29/mo', enterprise: '$99/mo' },
    route: '/products/retail-pro',
    dashboardRoute: '/(tabs)/dashboard',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    description: 'Powerful inventory management system with real-time tracking, low stock alerts, and comprehensive reporting.',
    icon: 'cube-outline',
    color: '#059669',
    bgColor: '#D1FAE5',
    features: ['Real-time Stock Tracking', 'Low Stock Alerts', 'Barcode Scanning', 'Stock Movement History', 'Supplier Management', 'Bulk Import/Export'],
    pricing: { starter: 'Free', business: '$19/mo', enterprise: '$59/mo' },
    route: '/products/inventory',
    dashboardRoute: '/inventory',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing',
    description: 'Create, send, and track professional invoices effortlessly. Get paid faster with automated reminders.',
    icon: 'document-text-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    features: ['Custom Invoice Templates', 'Automated Reminders', 'Payment Tracking', 'Multi-currency Support', 'Client Portal', 'Financial Reports'],
    pricing: { starter: 'Free', business: '$15/mo', enterprise: '$49/mo' },
    route: '/products/invoicing',
    dashboardRoute: '/invoicing',
  },
  {
    id: 'payments',
    name: 'Payment Solution',
    tagline: 'Unified Payment Processing',
    description: 'Accept payments anywhere with our secure, unified payment solution. Support for cards, mobile money, and more.',
    icon: 'card-outline',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    features: ['Card Payments', 'Mobile Money', 'QR Code Payments', 'Payment Links', 'Recurring Billing', 'Fraud Protection'],
    pricing: { starter: 'Free', business: '1.5% + $0.25', enterprise: 'Custom' },
    route: '/products/payment',
    dashboardRoute: '/payment',
    comingSoon: true,
  },
  {
    id: 'bulk_sms',
    name: 'Bulk SMS',
    tagline: 'Mass Communication Made Easy',
    description: 'Reach your customers instantly with our reliable bulk SMS platform. Perfect for marketing and notifications.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    features: ['Bulk Messaging', 'Contact Groups', 'Scheduled Messages', 'Delivery Reports', 'Personalization', 'API Access'],
    pricing: { starter: '$0.02/SMS', business: '$0.015/SMS', enterprise: 'Custom' },
    route: '/products/bulk-sms',
    comingSoon: true,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Simplified Business Accounting',
    description: 'Manage your finances with ease. Track expenses, generate reports, and stay tax-ready all year round.',
    icon: 'calculator-outline',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    features: ['Expense Tracking', 'Bank Reconciliation', 'Financial Reports', 'Tax Calculations', 'Multi-currency', 'Budgeting'],
    pricing: { starter: 'Free', business: '$25/mo', enterprise: '$79/mo' },
    route: '/products/accounting',
    comingSoon: true,
  },
];

// Stats
const STATS = [
  { value: '50K+', label: 'Active Businesses' },
  { value: '100M+', label: 'Transactions Processed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

// Testimonials
const TESTIMONIALS = [
  {
    text: "Software Galaxy transformed our business operations. We now manage everything from one platform!",
    author: "James Mwangi",
    role: "CEO, Retail Chain",
    avatar: "JM",
  },
  {
    text: "The inventory system saved us hours every week. Low stock alerts are a game changer.",
    author: "Sarah Akinyi",
    role: "Operations Manager",
    avatar: "SA",
  },
  {
    text: "Professional invoicing made easy. Our clients love the clean invoices and we get paid faster.",
    author: "David Okonkwo",
    role: "Freelance Consultant",
    avatar: "DO",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isAuthenticated, user, logout } = useAuthStore();
  
  // User subscriptions state
  const [userAccess, setUserAccess] = useState<{app_id: string; subscribed: boolean}[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  
  // Free Trial Modal state
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  
  // Waitlist Modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistProduct, setWaitlistProduct] = useState<WaitlistProductInfo | null>(null);

  // Redirect mobile users to login
  useEffect(() => {
    if (!isWeb) {
      router.replace('/(auth)/login');
    }
  }, []);

  // Fetch user subscriptions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAccess();
    }
  }, [isAuthenticated]);

  const fetchUserAccess = async () => {
    setLoadingAccess(true);
    try {
      const response = await api.get('/galaxy/user/access');
      // Map the API response to our expected format
      const appAccess = response.data.app_access || [];
      const mappedAccess = appAccess.map((item: any) => ({
        app_id: item.app?.app_id || item.app_id,
        subscribed: item.subscription?.status === 'active'
      }));
      setUserAccess(mappedAccess);
    } catch (error) {
      console.error('Failed to fetch user access:', error);
    } finally {
      setLoadingAccess(false);
    }
  };

  const isSubscribed = (appId: string) => {
    // Handle both hyphen and underscore formats
    const normalizedId = appId.replace(/-/g, '_');
    return userAccess.some(access => {
      const accessId = access.app_id?.replace(/-/g, '_');
      return accessId === normalizedId && access.subscribed;
    });
  };

  const handleStartTrial = (product: typeof PRODUCTS[0]) => {
    // Get the current auth state at the time of click (not from closure)
    const currentAuthState = useAuthStore.getState();
    
    // Check token from localStorage as fallback
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // If we have a token in localStorage, we should proceed even if state is stale
    if (!currentAuthState.isAuthenticated && !token) {
      router.push('/(auth)/login');
      return;
    }
    
    // Show the beautiful trial modal instead of directly subscribing
    const productInfo: ProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      icon: product.icon,
      color: product.color,
      bgColor: product.bgColor,
      gradientColors: [product.color, shadeColor(product.color, -20)] as [string, string],
      features: product.features.slice(0, 4), // Show first 4 features
      dashboardRoute: product.dashboardRoute,
    };
    
    setSelectedProduct(productInfo);
    setShowTrialModal(true);
  };
  
  const handleJoinWaitlist = (product: typeof PRODUCTS[0]) => {
    // Show the waitlist modal for coming soon products
    const productInfo: WaitlistProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      icon: product.icon,
      color: product.color,
      bgColor: product.bgColor,
      gradientColors: [product.color, shadeColor(product.color, -20)] as [string, string],
      features: product.features.slice(0, 4), // Show first 4 features
    };
    
    setWaitlistProduct(productInfo);
    setShowWaitlistModal(true);
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

  const handleLogout = () => {
    logout();
    setUserAccess([]);
  };

  const scrollToSection = (sectionId: string) => {
    if (isWeb) {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToProduct = (product: typeof PRODUCTS[0]) => {
    if (product.comingSoon) {
      router.push(`/products/${product.id}` as any);
    } else {
      router.push(`/products/${product.id}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Navigation Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <TouchableOpacity style={styles.logo} onPress={() => router.push('/')}>
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
          
          {!isMobile && (
            <View style={styles.navLinks}>
              <TouchableOpacity onPress={() => scrollToSection('products')}>
                <Text style={styles.navLink}>Products</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('features')}>
                <Text style={styles.navLink}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('pricing')}>
                <Text style={styles.navLink}>Pricing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('testimonials')}>
                <Text style={styles.navLink}>Testimonials</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Auth Dependent Header Actions */}
          {isAuthenticated ? (
            <View style={styles.headerActions}>
              {/* Google Apps-style Product Switcher */}
              <ProductSwitcher currentProductId="home" />
              <View style={styles.userInfoHeader}>
                <View style={styles.userAvatarSmall}>
                  <Text style={styles.userAvatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                {!isMobile && (
                  <Text style={styles.userNameHeader}>{user?.name || 'User'}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.logoutBtn}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={18} color={THEME.gray} />
                {!isMobile && <Text style={styles.logoutBtnText}>Logout</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.loginBtn}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.loginBtnText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.signUpBtn}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.signUpBtnText}>Get Started Free</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hero Section - Always visible */}
        <LinearGradient
          colors={[THEME.dark, THEME.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Stars background */}
          <View style={styles.starsContainer}>
            {[...Array(30)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.star, 
                  { 
                    left: `${Math.random() * 100}%`, 
                    top: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.5 + 0.3,
                    width: Math.random() * 3 + 1,
                    height: Math.random() * 3 + 1,
                  }
                ]} 
              />
            ))}
          </View>
          
          <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
              Your Business Universe,{'\n'}
              <Text style={styles.heroHighlight}>One Platform</Text>
            </Text>
            <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
              Software Galaxy brings all your business tools together. From retail to inventory, 
              invoicing to payments – manage everything from a single, powerful platform.
            </Text>
            <View style={[styles.heroCTA, isMobile && styles.heroCTAMobile]}>
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                <Ionicons name="arrow-forward" size={20} color={THEME.dark} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.ctaSecondary}
                onPress={() => scrollToSection('products')}
              >
                <Ionicons name="apps-outline" size={24} color={THEME.white} />
                <Text style={styles.ctaSecondaryText}>Explore Products</Text>
              </TouchableOpacity>
            </View>
            
            {/* Stats */}
            <View style={[styles.heroStats, isMobile && styles.heroStatsMobile]}>
              {STATS.map((stat, index) => (
                <View key={index} style={styles.heroStat}>
                  <Text style={styles.heroStatNumber}>{stat.value}</Text>
                  <Text style={styles.heroStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Products Section - Shows subscription status for logged in users */}
        <View style={styles.productsSection} nativeID="products">
          <Text style={styles.sectionTitle}>
            {isAuthenticated ? 'Available Apps' : 'Our Product Suite'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {isAuthenticated 
              ? 'Start a free trial to explore these tools' 
              : 'Powerful, integrated tools designed for modern businesses'}
          </Text>
          
          <View style={[styles.productsGrid, isMobile && styles.productsGridMobile]}>
            {PRODUCTS.map((product) => {
              const subscribed = isSubscribed(product.id);
              
              // Navigate to product landing page
              const goToProductPage = () => {
                router.push(product.route as any);
              };
              
              return (
                <View 
                  key={product.id}
                  style={[styles.productCard, isMobile && styles.productCardMobile]}
                >
                  {/* Clickable card content area - navigates to product page */}
                  <TouchableOpacity 
                    style={styles.productCardContent}
                    onPress={goToProductPage}
                    activeOpacity={0.7}
                  >
                    {/* Subscription Badge */}
                    {subscribed && !product.comingSoon && (
                      <View style={[styles.subscribedBadge, { backgroundColor: product.color }]}>
                        <Ionicons name="checkmark-circle" size={14} color={THEME.white} />
                        <Text style={styles.subscribedBadgeText}>Subscribed</Text>
                      </View>
                    )}
                    
                    {/* Coming Soon Badge */}
                    {product.comingSoon && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    )}
                    
                    <View style={[styles.productIconContainer, { backgroundColor: product.bgColor }]}>
                      <Ionicons name={product.icon as any} size={32} color={product.color} />
                    </View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productTagline}>{product.tagline}</Text>
                    <Text style={styles.productDescription}>{product.description}</Text>
                    <View style={styles.productFeatures}>
                      {product.features.slice(0, 3).map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={product.color} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                  
                  {/* CTA Button - Different for subscribed vs non-subscribed */}
                  {subscribed && !product.comingSoon ? (
                    <TouchableOpacity 
                      style={[styles.productCTA, { backgroundColor: product.color }]}
                      onPress={() => router.push(product.dashboardRoute as any)}
                    >
                      <Text style={styles.productCTAText}>Open Dashboard</Text>
                      <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                    </TouchableOpacity>
                  ) : product.comingSoon ? (
                    isWeb ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleJoinWaitlist(product);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          backgroundColor: product.color,
                          paddingTop: 14,
                          paddingBottom: 14,
                          paddingLeft: 24,
                          paddingRight: 24,
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          width: '100%',
                          marginTop: 24,
                        }}
                      >
                        <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Join Waitlist</span>
                        <Ionicons name="notifications-outline" size={16} color={THEME.white} />
                      </button>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.productCTA, { backgroundColor: product.color }]}
                        onPress={() => handleJoinWaitlist(product)}
                      >
                        <Text style={styles.productCTAText}>Join Waitlist</Text>
                        <Ionicons name="notifications-outline" size={16} color={THEME.white} />
                      </TouchableOpacity>
                    )
                  ) : isAuthenticated ? (
                    isWeb ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStartTrial(product);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          backgroundColor: product.color,
                          paddingTop: 14,
                          paddingBottom: 14,
                          paddingLeft: 24,
                          paddingRight: 24,
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          width: '100%',
                          marginTop: 24,
                        }}
                      >
                        <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Start Free Trial</span>
                        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                      </button>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.productCTA, { backgroundColor: product.color }]}
                        onPress={() => handleStartTrial(product)}
                      >
                        <Text style={styles.productCTAText}>Start Free Trial</Text>
                        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity 
                      style={[styles.productCTA, { backgroundColor: product.color }]}
                      onPress={() => navigateToProduct(product)}
                    >
                      <Text style={styles.productCTAText}>Learn More</Text>
                      <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection} nativeID="features">
          <LinearGradient
            colors={[THEME.secondary, THEME.dark]}
            style={styles.featuresGradient}
          >
            <Text style={[styles.sectionTitle, { color: THEME.white }]}>
              Why Choose Software Galaxy?
            </Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.light }]}>
              Everything you need to run and grow your business
            </Text>
            
            <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
              {[
                { icon: 'planet-outline', title: 'All-in-One Platform', desc: 'Access all your business tools from a single dashboard' },
                { icon: 'sync-outline', title: 'Seamless Integration', desc: 'All apps work together, sharing data automatically' },
                { icon: 'shield-checkmark-outline', title: 'Enterprise Security', desc: 'Bank-grade encryption keeps your data safe' },
                { icon: 'phone-portrait-outline', title: 'Mobile First', desc: 'Manage your business from anywhere, any device' },
                { icon: 'flash-outline', title: 'Lightning Fast', desc: 'Optimized for speed, even with large datasets' },
                { icon: 'headset-outline', title: '24/7 Support', desc: 'Expert help whenever you need it' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureIconWrapper}>
                    <Ionicons name={feature.icon as any} size={28} color={THEME.primary} />
                  </View>
                  <Text style={styles.featureCardTitle}>{feature.title}</Text>
                  <Text style={styles.featureCardDesc}>{feature.desc}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection} nativeID="pricing">
          <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
          <Text style={styles.sectionSubtitle}>
            Start free, upgrade when you're ready. No hidden fees.
          </Text>
          
          <View style={[styles.pricingGrid, isMobile && styles.pricingGridMobile]}>
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: 'forever',
                features: ['Up to 100 products', '1 user', 'Basic reports', 'Community support', 'Core features'],
                highlighted: false,
              },
              {
                name: 'Business',
                price: '$49',
                period: '/month',
                features: ['Unlimited products', '10 users', 'Advanced analytics', 'Priority support', 'All apps included', 'API access'],
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: 'pricing',
                features: ['Unlimited everything', 'Unlimited users', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
                highlighted: false,
              },
            ].map((plan, index) => (
              <View 
                key={index}
                style={[
                  styles.pricingCard,
                  plan.highlighted && styles.pricingCardHighlighted,
                  isMobile && styles.pricingCardMobile,
                ]}
              >
                {plan.highlighted && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                <Text style={styles.pricingName}>{plan.name}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{plan.price}</Text>
                  <Text style={styles.pricingPeriod}>{plan.period}</Text>
                </View>
                <View style={styles.pricingFeatures}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.pricingFeatureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
                      <Text style={styles.pricingFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity 
                  style={[
                    styles.pricingButton,
                    plan.highlighted && styles.pricingButtonHighlighted,
                  ]}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={[
                    styles.pricingButtonText,
                    plan.highlighted && styles.pricingButtonTextHighlighted,
                  ]}>
                    {plan.price === 'Free' ? 'Start Free' : plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.testimonialsSection} nativeID="testimonials">
          <Text style={styles.sectionTitle}>Trusted by Businesses</Text>
          <Text style={styles.sectionSubtitle}>
            See what our customers have to say
          </Text>
          
          <View style={[styles.testimonialsGrid, isMobile && styles.testimonialsGridMobile]}>
            {TESTIMONIALS.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <View style={styles.testimonialAvatar}>
                    <Text style={styles.testimonialInitials}>{testimonial.avatar}</Text>
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>{testimonial.author}</Text>
                    <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <LinearGradient
          colors={[THEME.primary, THEME.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaSection}
        >
          <Text style={styles.ctaSectionTitle}>Ready to Transform Your Business?</Text>
          <Text style={styles.ctaSectionSubtitle}>
            Join thousands of businesses already using Software Galaxy
          </Text>
          <TouchableOpacity 
            style={styles.ctaSectionButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.ctaSectionButtonText}>Start Your Free Trial</Text>
            <Ionicons name="rocket-outline" size={20} color={THEME.primary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerContent, isMobile && styles.footerContentMobile]}>
            <View style={styles.footerBrand}>
              <View style={styles.logo}>
                <View style={styles.logoIconSmall}>
                  <View style={styles.logoOrbitSmall}>
                    <View style={styles.logoDotSmall} />
                  </View>
                </View>
                <View>
                  <Text style={[styles.logoTextSmall, { color: THEME.gray }]}>SOFTWARE</Text>
                  <Text style={[styles.logoTextLarge, { color: THEME.white, fontSize: 20 }]}>GALAXY</Text>
                </View>
              </View>
              <Text style={styles.footerTagline}>
                Your complete business management universe
              </Text>
            </View>
            
            <View style={[styles.footerLinks, isMobile && styles.footerLinksMobile]}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Products</Text>
                {PRODUCTS.map((product) => (
                  <TouchableOpacity key={product.id} onPress={() => navigateToProduct(product)}>
                    <Text style={styles.footerLink}>{product.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Company</Text>
                <Text style={styles.footerLink}>About Us</Text>
                <Text style={styles.footerLink}>Careers</Text>
                <Text style={styles.footerLink}>Blog</Text>
                <Text style={styles.footerLink}>Contact</Text>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Support</Text>
                <Text style={styles.footerLink}>Help Center</Text>
                <Text style={styles.footerLink}>Documentation</Text>
                <Text style={styles.footerLink}>API Reference</Text>
                <Text style={styles.footerLink}>Status</Text>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Legal</Text>
                <Text style={styles.footerLink}>Privacy Policy</Text>
                <Text style={styles.footerLink}>Terms of Service</Text>
                <Text style={styles.footerLink}>Cookie Policy</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>
              © 2025 Software Galaxy. All rights reserved.
            </Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-twitter" size={20} color={THEME.gray} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-linkedin" size={20} color={THEME.gray} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-facebook" size={20} color={THEME.gray} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Free Trial Modal */}
      <FreeTrialModal
        visible={showTrialModal}
        product={selectedProduct}
        onClose={() => {
          setShowTrialModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={fetchUserAccess}
      />
      
      {/* Waitlist Modal */}
      <WaitlistModal
        visible={showWaitlistModal}
        product={waitlistProduct}
        onClose={() => {
          setShowWaitlistModal(false);
          setWaitlistProduct(null);
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
  navLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  navLink: {
    fontSize: 14,
    color: THEME.gray,
    fontWeight: '500',
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
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signUpBtnText: {
    fontSize: 14,
    color: THEME.white,
    fontWeight: '600',
  },
  // Logged-in user header styles
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.white,
  },
  userNameHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.dark,
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
  logoutBtnText: {
    fontSize: 13,
    color: THEME.gray,
    fontWeight: '500',
  },
  // Welcome Section for logged-in users
  welcomeSection: {
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  welcomeContent: {
    maxWidth: 600,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: THEME.light,
  },
  // Subscription Badge
  subscribedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscribedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.white,
  },
  heroSection: {
    paddingHorizontal: 40,
    paddingVertical: 100,
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
    borderRadius: 10,
    backgroundColor: THEME.white,
  },
  heroContent: {
    maxWidth: 900,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heroContentMobile: {
    paddingHorizontal: 0,
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: THEME.white,
    textAlign: 'center',
    lineHeight: 68,
  },
  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroHighlight: {
    color: THEME.primary,
  },
  heroSubtitle: {
    fontSize: 20,
    color: THEME.light,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 32,
    maxWidth: 700,
  },
  heroSubtitleMobile: {
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
    backgroundColor: THEME.primary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    color: THEME.dark,
    fontWeight: '700',
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: THEME.light,
    borderRadius: 12,
  },
  ctaSecondaryText: {
    fontSize: 16,
    color: THEME.white,
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 60,
    marginTop: 80,
  },
  heroStatsMobile: {
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.primary,
  },
  heroStatLabel: {
    fontSize: 14,
    color: THEME.light,
    marginTop: 4,
  },
  productsSection: {
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
    maxWidth: 600,
    alignSelf: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 60,
  },
  productsGridMobile: {
    flexDirection: 'column',
  },
  productCard: {
    width: 360,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  productCardMobile: {
    width: '100%',
  },
  productCardContent: {
    flex: 1,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.white,
  },
  productIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.dark,
  },
  productTagline: {
    fontSize: 14,
    color: THEME.gray,
    marginTop: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginTop: 16,
  },
  productFeatures: {
    marginTop: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
  },
  productCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  productCTAText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.white,
  },
  featuresSection: {
    overflow: 'hidden',
  },
  featuresGradient: {
    paddingHorizontal: 40,
    paddingVertical: 100,
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
    width: 320,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,180,216,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.white,
    marginBottom: 8,
  },
  featureCardDesc: {
    fontSize: 14,
    color: THEME.light,
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
    borderColor: THEME.primary,
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: THEME.primary,
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
    borderColor: THEME.primary,
    alignItems: 'center',
  },
  pricingButtonHighlighted: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  pricingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.primary,
  },
  pricingButtonTextHighlighted: {
    color: THEME.white,
  },
  testimonialsSection: {
    paddingHorizontal: 40,
    paddingVertical: 100,
    backgroundColor: THEME.lightGray,
  },
  testimonialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 60,
  },
  testimonialsGridMobile: {
    flexDirection: 'column',
  },
  testimonialCard: {
    width: 360,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testimonialText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 28,
    marginTop: 16,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 14,
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.white,
  },
  testimonialName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.dark,
  },
  testimonialRole: {
    fontSize: 13,
    color: THEME.gray,
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
    color: THEME.primary,
  },
  footer: {
    backgroundColor: THEME.dark,
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 32,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  footerContentMobile: {
    flexDirection: 'column',
    gap: 48,
  },
  footerBrand: {
    maxWidth: 300,
  },
  footerTagline: {
    fontSize: 14,
    color: THEME.gray,
    marginTop: 16,
    lineHeight: 22,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 80,
  },
  footerLinksMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  footerColumn: {
    gap: 12,
  },
  footerColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.white,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: THEME.gray,
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerCopyright: {
    fontSize: 14,
    color: THEME.gray,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
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
