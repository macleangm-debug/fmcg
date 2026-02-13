import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/authStore';
import ProductSwitcher from '../src/components/ProductSwitcher';
import FreeTrialModal, { ProductInfo } from '../src/components/FreeTrialModal';
import WaitlistModal, { WaitlistProductInfo } from '../src/components/WaitlistModal';
import GeneralTrialModal from '../src/components/GeneralTrialModal';
import VideoModal from '../src/components/VideoModal';
import InteractiveDemo from './components/InteractiveDemo';
import MarketingNav from './components/MarketingNav';
import api from '../src/api/client';

const isWeb = Platform.OS === 'web';

// Professional Dark Theme
const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  accent: '#FF6B6B',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  cardHover: '#1A1A25',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
  textSubtle: '#5A5A6E',
  success: '#00C48C',
  warning: '#FFB800',
};

// Available Apps
const AVAILABLE_APPS = [
  {
    id: 'retail_pro',
    name: 'RetailPro',
    tagline: 'Complete Retail Management',
    description: 'All-in-one retail management platform for sales, inventory, customers, and analytics.',
    icon: 'storefront-outline',
    color: '#3B82F6',
    features: ['Point of Sale', 'Inventory', 'Analytics', 'Multi-location'],
    route: '/products/retail-pro',
    dashboardRoute: '/(tabs)/dashboard',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    description: 'Powerful inventory tracking with real-time alerts and comprehensive reporting.',
    icon: 'cube-outline',
    color: '#10B981',
    features: ['Real-time Tracking', 'Low Stock Alerts', 'Barcode Support', 'Reports'],
    route: '/products/inventory',
    dashboardRoute: '/inventory',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing',
    description: 'Create and track professional invoices. Get paid faster with automated reminders.',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    features: ['Custom Templates', 'Auto Reminders', 'Multi-currency', 'Reports'],
    route: '/products/invoicing',
    dashboardRoute: '/invoicing',
  },
  {
    id: 'bulk_sms',
    name: 'UniTxt',
    tagline: 'Mass Communication',
    description: 'Reach customers instantly with reliable bulk messaging and campaign management.',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    features: ['Bulk SMS', 'Contact Groups', 'Scheduling', 'Analytics'],
    route: '/products/bulk-sms',
    dashboardRoute: '/unitxt',
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Rewards',
    description: 'Build lasting customer relationships with points, rewards, and loyalty programs.',
    icon: 'heart-outline',
    color: '#EC4899',
    features: ['Points System', 'Reward Tiers', 'Referrals', 'Analytics'],
    route: '/products/loyalty',
    dashboardRoute: '/loyalty',
  },
];

// Coming Soon Apps
const COMING_SOON_APPS = [
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Unified Payments',
    description: 'Accept payments anywhere with cards, mobile money, and bank transfers.',
    icon: 'card-outline',
    color: '#00D4FF',
    features: ['Card Payments', 'Mobile Money', 'Payouts', 'API'],
    route: '/products/kwikpay',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Business Accounting',
    description: 'Manage finances, track expenses, and stay tax-ready all year round.',
    icon: 'calculator-outline',
    color: '#06B6D4',
    features: ['Expense Tracking', 'Bank Sync', 'Tax Reports', 'Budgeting'],
    route: '/products/accounting',
  },
  {
    id: 'crm',
    name: 'CRM',
    tagline: 'Customer Management',
    description: 'Track leads, manage pipelines, and grow your customer relationships.',
    icon: 'people-outline',
    color: '#6366F1',
    features: ['Lead Management', 'Sales Pipeline', 'Automation', 'Analytics'],
    route: '/products/crm',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Expense Tracking',
    description: 'Track and manage all business expenses with receipt scanning and approvals.',
    icon: 'wallet-outline',
    color: '#EF4444',
    features: ['Receipt Scan', 'Categories', 'Approvals', 'Reports'],
    route: '/products/expenses',
  },
];

// Stats with animation
const STATS = [
  { value: '50K+', label: 'Active Businesses', icon: 'business-outline' },
  { value: '$2B+', label: 'Transactions Processed', icon: 'trending-up-outline' },
  { value: '99.9%', label: 'Uptime Guarantee', icon: 'shield-checkmark-outline' },
  { value: '24/7', label: 'Expert Support', icon: 'headset-outline' },
];

// Enterprise Features
const FEATURES = [
  {
    icon: 'planet-outline',
    title: 'Unified Platform',
    description: 'All your business tools in one powerful ecosystem. Seamless data flow across applications.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC 2 compliance, and advanced threat protection.',
  },
  {
    icon: 'analytics-outline',
    title: 'Real-time Analytics',
    description: 'Deep insights and predictive analytics to drive data-informed decisions.',
  },
  {
    icon: 'cloud-outline',
    title: 'Cloud Native',
    description: 'Built for scale with 99.9% uptime SLA and automatic backups.',
  },
  {
    icon: 'code-slash-outline',
    title: 'Developer APIs',
    description: 'RESTful APIs, webhooks, and SDKs for seamless integrations.',
  },
  {
    icon: 'globe-outline',
    title: 'Global Ready',
    description: 'Multi-currency, multi-language support for international operations.',
  },
];

// Testimonials
const TESTIMONIALS = [
  {
    quote: "Software Galaxy transformed how we operate. Managing 15 stores from one platform saved us countless hours.",
    author: "James Mwangi",
    role: "CEO, Retail Chain",
    company: "MegaMart Kenya",
  },
  {
    quote: "The inventory system alone paid for itself in the first month. Low stock alerts are a game changer.",
    author: "Sarah Akinyi",
    role: "Operations Director",
    company: "TechSupply Co.",
  },
  {
    quote: "Professional invoicing with automated reminders. Our collection rate improved by 40% in 3 months.",
    author: "David Okonkwo",
    role: "Finance Manager",
    company: "ConsultPro",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const { isAuthenticated, user } = useAuthStore();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // State
  const [userAccess, setUserAccess] = useState<{app_id: string; subscribed: boolean}[]>([]);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistProduct, setWaitlistProduct] = useState<WaitlistProductInfo | null>(null);
  const [showGeneralTrialModal, setShowGeneralTrialModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    if (!isWeb) {
      router.replace('/(auth)/login');
    }
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Testimonial rotation
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAccess();
    }
  }, [isAuthenticated]);

  const fetchUserAccess = async () => {
    try {
      const response = await api.get('/galaxy/user/access');
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
    const normalizedId = appId.replace(/-/g, '_');
    return userAccess.some(access => {
      const accessId = access.app_id?.replace(/-/g, '_');
      return accessId === normalizedId && access.subscribed;
    });
  };

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

  const handleStartTrial = (product: typeof AVAILABLE_APPS[0]) => {
    const currentAuthState = useAuthStore.getState();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!currentAuthState.isAuthenticated && !token) {
      router.push('/(auth)/login');
      return;
    }
    
    const productInfo: ProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      icon: product.icon,
      color: product.color,
      bgColor: shadeColor(product.color, 80),
      gradientColors: [product.color, shadeColor(product.color, -20)] as [string, string],
      features: product.features,
      dashboardRoute: product.dashboardRoute,
    };
    
    setSelectedProduct(productInfo);
    setShowTrialModal(true);
  };
  
  const handleJoinWaitlist = (product: typeof COMING_SOON_APPS[0]) => {
    const productInfo: WaitlistProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      icon: product.icon,
      color: product.color,
      bgColor: shadeColor(product.color, 80),
      gradientColors: [product.color, shadeColor(product.color, -20)] as [string, string],
      features: product.features,
    };
    
    setWaitlistProduct(productInfo);
    setShowWaitlistModal(true);
  };

  const scrollToSection = (sectionId: string) => {
    if (isWeb) {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // CSS for web animations
  const webStyles = isWeb ? `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .float-animation { animation: float 6s ease-in-out infinite; }
    .pulse-animation { animation: pulse 3s ease-in-out infinite; }
    .card-hover:hover { transform: translateY(-8px); transition: all 0.3s ease; }
    .glow-border { box-shadow: 0 0 30px rgba(0, 212, 255, 0.3); }
  ` : '';

  return (
    <SafeAreaView style={styles.container}>
      {isWeb && <style dangerouslySetInnerHTML={{ __html: webStyles }} />}
      
      {/* New Marketing Navigation with Search & Mega Dropdown */}
      <MarketingNav />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[THEME.darker, THEME.dark, '#0F0F1A']}
            style={styles.heroGradient}
          >
            {/* Animated background elements */}
            <View style={styles.heroBackground}>
              <View style={[styles.glowOrb, styles.glowOrb1]} />
              <View style={[styles.glowOrb, styles.glowOrb2]} />
              <View style={[styles.glowOrb, styles.glowOrb3]} />
            </View>
            
            <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
              <View style={styles.heroBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>Trusted by 50,000+ businesses</Text>
              </View>
              
              <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
                The Operating System{'\n'}for Modern Business
              </Text>
              
              <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
                Unify your operations with enterprise-grade tools for retail, inventory,{'\n'}
                invoicing, payments, and customer engagement — all in one platform.
              </Text>
              
              <View style={[styles.heroCTA, isMobile && styles.heroCTAMobile]}>
                <TouchableOpacity 
                  style={styles.primaryBtn}
                  onPress={() => setShowGeneralTrialModal(true)}
                  data-testid="hero-start-trial-btn"
                >
                  <LinearGradient
                    colors={[THEME.primary, THEME.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    <Text style={styles.primaryBtnText}>Start Free Trial</Text>
                    <Ionicons name="arrow-forward" size={20} color={THEME.dark} />
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryBtn}
                  onPress={() => setShowInteractiveDemo(true)}
                  data-testid="landing-watch-demo-btn"
                >
                  <Ionicons name="play-circle" size={22} color={THEME.primary} />
                  <Text style={styles.secondaryBtnText}>Explore Demo</Text>
                </TouchableOpacity>
              </View>
              
              {/* Stats Row */}
              <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
                {STATS.map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Ionicons name={stat.icon as any} size={20} color={THEME.primary} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Available Products */}
        <View style={styles.section} nativeID="products">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>AVAILABLE NOW</Text>
            </View>
            <Text style={styles.sectionTitle}>Power Your Business Today</Text>
            <Text style={styles.sectionSubtitle}>
              Production-ready applications to transform your operations
            </Text>
          </View>
          
          <View style={[styles.productsGrid, isMobile && styles.productsGridMobile]}>
            {AVAILABLE_APPS.map((app) => {
              const subscribed = isSubscribed(app.id);
              
              return (
                <View key={app.id} style={[styles.productCard, isMobile && styles.productCardMobile]}>
                  <View style={styles.productCardInner}>
                    {subscribed && (
                      <View style={styles.subscribedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={THEME.success} />
                        <Text style={styles.subscribedText}>Active</Text>
                      </View>
                    )}
                    
                    <View style={[styles.productIcon, { backgroundColor: `${app.color}20` }]}>
                      <Ionicons name={app.icon as any} size={28} color={app.color} />
                    </View>
                    
                    <Text style={styles.productName}>{app.name}</Text>
                    <Text style={styles.productTagline}>{app.tagline}</Text>
                    <Text style={styles.productDesc}>{app.description}</Text>
                    
                    <View style={styles.productFeatures}>
                      {app.features.map((feature, idx) => (
                        <View key={idx} style={styles.featureTag}>
                          <Text style={styles.featureTagText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                    
                    <View style={styles.productActions}>
                      {subscribed ? (
                        <TouchableOpacity 
                          style={[styles.productBtn, { backgroundColor: app.color }]}
                          onPress={() => router.push(app.dashboardRoute as any)}
                        >
                          <Text style={styles.productBtnText}>Open Dashboard</Text>
                          <Ionicons name="arrow-forward" size={16} color={THEME.text} />
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity 
                            style={[styles.productBtn, { backgroundColor: app.color }]}
                            onPress={() => handleStartTrial(app)}
                          >
                            <Text style={styles.productBtnText}>Start Trial</Text>
                            <Ionicons name="arrow-forward" size={16} color={THEME.text} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.learnMoreBtn}
                            onPress={() => router.push(app.route as any)}
                          >
                            <Text style={styles.learnMoreText}>Learn More</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Coming Soon Products */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBadge, styles.comingSoonBadge]}>
              <Ionicons name="rocket-outline" size={14} color={THEME.warning} />
              <Text style={[styles.sectionBadgeText, { color: THEME.warning }]}>COMING SOON</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: THEME.text }]}>What's Next</Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.textMuted }]}>
              Join the waitlist for early access to upcoming products
            </Text>
          </View>
          
          <View style={[styles.productsGrid, isMobile && styles.productsGridMobile]}>
            {COMING_SOON_APPS.map((app) => (
              <View key={app.id} style={[styles.comingSoonCard, isMobile && styles.productCardMobile]}>
                <View style={styles.productCardInner}>
                  <View style={[styles.productIcon, { backgroundColor: `${app.color}15` }]}>
                    <Ionicons name={app.icon as any} size={28} color={app.color} />
                  </View>
                  
                  <Text style={[styles.productName, { color: THEME.text }]}>{app.name}</Text>
                  <Text style={[styles.productTagline, { color: THEME.textMuted }]}>{app.tagline}</Text>
                  <Text style={[styles.productDesc, { color: THEME.textSubtle }]}>{app.description}</Text>
                  
                  <View style={styles.productFeatures}>
                    {app.features.map((feature, idx) => (
                      <View key={idx} style={[styles.featureTag, styles.featureTagDark]}>
                        <Text style={[styles.featureTagText, { color: THEME.textMuted }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.waitlistBtn, { borderColor: app.color }]}
                    onPress={() => handleJoinWaitlist(app)}
                  >
                    <Ionicons name="notifications-outline" size={16} color={app.color} />
                    <Text style={[styles.waitlistBtnText, { color: app.color }]}>Join Waitlist</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Soko Ecosystem Section */}
        <View style={[styles.section, styles.sectionDark]} nativeID="ecosystem">
          <View style={styles.sectionHeader}>
            <View style={styles.sokoLogoLarge}>
              <LinearGradient
                colors={[THEME.primary, THEME.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sokoLogoGradient}
              >
                <Ionicons name="planet" size={40} color={THEME.dark} />
              </LinearGradient>
            </View>
            <Text style={[styles.sectionTitle, { color: THEME.text, marginTop: 24 }]}>
              The Soko Ecosystem
            </Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.textMuted, maxWidth: 600 }]}>
              All your business tools, unified under one platform. Data flows seamlessly,
              users sign in once, and your entire operation works as one.
            </Text>
          </View>
          
          <View style={[styles.ecosystemGrid, isMobile && styles.ecosystemGridMobile]}>
            <View style={styles.ecosystemCard}>
              <View style={styles.ecosystemIconWrap}>
                <Ionicons name="git-network-outline" size={28} color={THEME.primary} />
              </View>
              <Text style={styles.ecosystemCardTitle}>Connected Data</Text>
              <Text style={styles.ecosystemCardDesc}>
                Customer profiles, products, and transactions sync automatically across all apps
              </Text>
            </View>
            <View style={styles.ecosystemCard}>
              <View style={styles.ecosystemIconWrap}>
                <Ionicons name="phone-portrait-outline" size={28} color={THEME.primary} />
              </View>
              <Text style={styles.ecosystemCardTitle}>PWA Ready</Text>
              <Text style={styles.ecosystemCardDesc}>
                Install on any device. Works offline with automatic sync when back online
              </Text>
            </View>
            <View style={styles.ecosystemCard}>
              <View style={styles.ecosystemIconWrap}>
                <Ionicons name="key-outline" size={28} color={THEME.primary} />
              </View>
              <Text style={styles.ecosystemCardTitle}>Single Sign-On</Text>
              <Text style={styles.ecosystemCardDesc}>
                One login for all products. Seamless authentication across your entire suite
              </Text>
            </View>
            <View style={styles.ecosystemCard}>
              <View style={styles.ecosystemIconWrap}>
                <Ionicons name="code-slash-outline" size={28} color={THEME.primary} />
              </View>
              <Text style={styles.ecosystemCardTitle}>Open APIs</Text>
              <Text style={styles.ecosystemCardDesc}>
                Build custom integrations with RESTful APIs and webhooks for every product
              </Text>
            </View>
          </View>
          
          {/* Visual Ecosystem Diagram */}
          <View style={styles.ecosystemDiagram}>
            <View style={styles.ecosystemDiagramCenter}>
              <LinearGradient
                colors={[THEME.primary, THEME.secondary]}
                style={styles.ecosystemDiagramCore}
              >
                <Text style={styles.ecosystemDiagramCoreText}>SOKO</Text>
                <Text style={styles.ecosystemDiagramCoreSubtext}>Super App</Text>
              </LinearGradient>
            </View>
            <View style={styles.ecosystemDiagramApps}>
              {[
                { name: 'RetailPro', color: '#3B82F6', icon: 'storefront-outline' },
                { name: 'KwikPay', color: '#00D4FF', icon: 'card-outline' },
                { name: 'Inventory', color: '#10B981', icon: 'cube-outline' },
                { name: 'Invoicing', color: '#8B5CF6', icon: 'document-text-outline' },
                { name: 'UniTxt', color: '#F59E0B', icon: 'chatbubbles-outline' },
                { name: 'Loyalty', color: '#EC4899', icon: 'heart-outline' },
              ].map((app, idx) => (
                <View key={idx} style={[styles.ecosystemDiagramApp, { borderColor: app.color }]}>
                  <Ionicons name={app.icon as any} size={18} color={app.color} />
                  <Text style={[styles.ecosystemDiagramAppName, { color: app.color }]}>{app.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section} nativeID="features">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>ENTERPRISE READY</Text>
            </View>
            <Text style={styles.sectionTitle}>Built for Scale</Text>
            <Text style={styles.sectionSubtitle}>
              Enterprise-grade infrastructure powering businesses of all sizes
            </Text>
          </View>
          
          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
                <View style={styles.featureIconWrap}>
                  <LinearGradient
                    colors={[`${THEME.primary}30`, `${THEME.secondary}30`]}
                    style={styles.featureIconGradient}
                  >
                    <Ionicons name={feature.icon as any} size={24} color={THEME.primary} />
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: THEME.text }]}>Trusted by Industry Leaders</Text>
          </View>
          
          <View style={styles.testimonialContainer}>
            <View style={styles.testimonialCard}>
              <View style={styles.quoteIcon}>
                <Ionicons name="chatbubble-ellipses" size={32} color={THEME.primary} />
              </View>
              <Text style={styles.testimonialQuote}>
                "{TESTIMONIALS[activeTestimonial].quote}"
              </Text>
              <View style={styles.testimonialAuthor}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorInitial}>
                    {TESTIMONIALS[activeTestimonial].author.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{TESTIMONIALS[activeTestimonial].author}</Text>
                  <Text style={styles.authorRole}>
                    {TESTIMONIALS[activeTestimonial].role}, {TESTIMONIALS[activeTestimonial].company}
                  </Text>
                </View>
              </View>
              
              <View style={styles.testimonialDots}>
                {TESTIMONIALS.map((_, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.dot, idx === activeTestimonial && styles.dotActive]}
                    onPress={() => setActiveTestimonial(idx)}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCTA}>
          <LinearGradient
            colors={[THEME.dark, THEME.darker]}
            style={styles.finalCTAGradient}
          >
            <View style={styles.finalCTAContent}>
              <Text style={styles.finalCTATitle}>Ready to Transform Your Business?</Text>
              <Text style={styles.finalCTASubtitle}>
                Join thousands of businesses already using Software Galaxy
              </Text>
              <TouchableOpacity 
                style={styles.finalCTABtn}
                onPress={() => setShowGeneralTrialModal(true)}
                data-testid="final-cta-start-trial-btn"
              >
                <LinearGradient
                  colors={[THEME.primary, THEME.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.finalCTABtnGradient}
                >
                  <Text style={styles.finalCTABtnText}>Start Your Free Trial</Text>
                  <Ionicons name="rocket" size={20} color={THEME.dark} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerContent, isMobile && styles.footerContentMobile]}>
            <View style={styles.footerBrand}>
              <View style={[styles.logo, styles.logoContainerFooter]}>
                <Image 
                  source={require('../assets/images/software-galaxy-logo.png')}
                  style={{ width: 120, height: 32, resizeMode: 'contain' }}
                />
              </View>
              <Text style={styles.footerTagline}>
                The operating system for modern business
              </Text>
            </View>
            
            <View style={[styles.footerLinks, isMobile && styles.footerLinksMobile]}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Products</Text>
                {[...AVAILABLE_APPS.slice(0, 4)].map((app) => (
                  <TouchableOpacity key={app.id} onPress={() => router.push(app.route as any)}>
                    <Text style={styles.footerLink}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Company</Text>
                <Text style={styles.footerLink}>About Us</Text>
                <Text style={styles.footerLink}>Careers</Text>
                <Text style={styles.footerLink}>Blog</Text>
                <Text style={styles.footerLink}>Press</Text>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Resources</Text>
                <Text style={styles.footerLink}>Documentation</Text>
                <Text style={styles.footerLink}>API Reference</Text>
                <Text style={styles.footerLink}>Status</Text>
                <Text style={styles.footerLink}>Help Center</Text>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Legal</Text>
                <Text style={styles.footerLink}>Privacy Policy</Text>
                <Text style={styles.footerLink}>Terms of Service</Text>
                <Text style={styles.footerLink}>Security</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.footerBottom}>
            <Text style={styles.copyright}>© 2025 Software Galaxy. All rights reserved.</Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-twitter" size={18} color={THEME.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-linkedin" size={18} color={THEME.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Ionicons name="logo-github" size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <FreeTrialModal
        visible={showTrialModal}
        product={selectedProduct}
        onClose={() => {
          setShowTrialModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={fetchUserAccess}
      />
      
      <WaitlistModal
        visible={showWaitlistModal}
        product={waitlistProduct}
        onClose={() => {
          setShowWaitlistModal(false);
          setWaitlistProduct(null);
        }}
      />
      
      <GeneralTrialModal
        visible={showGeneralTrialModal}
        onClose={() => setShowGeneralTrialModal(false)}
      />
      
      <VideoModal
        visible={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoId="dQw4w9WgXcQ"
        title="Software Galaxy Overview"
        subtitle="See how our platform transforms your business"
        productColor={THEME.primary}
      />
      
      <InteractiveDemo
        visible={showInteractiveDemo}
        onClose={() => setShowInteractiveDemo(false)}
        onStartTrial={() => setShowGeneralTrialModal(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.text,
  },
  // Navigation
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navMobile: {
    paddingHorizontal: 20,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainerFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGradientSmall: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.textMuted,
    letterSpacing: 2,
  },
  logoName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.dark,
    marginTop: -2,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 36,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSubtle,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.dark,
  },
  ctaBtn: {
    backgroundColor: THEME.dark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.dark,
  },
  // Hero
  hero: {
    overflow: 'hidden',
  },
  heroGradient: {
    paddingTop: 80,
    paddingBottom: 100,
    position: 'relative',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  glowOrb1: {
    width: 600,
    height: 600,
    backgroundColor: THEME.primary,
    top: -200,
    left: -200,
    opacity: 0.1,
  },
  glowOrb2: {
    width: 400,
    height: 400,
    backgroundColor: THEME.secondary,
    top: 100,
    right: -100,
    opacity: 0.1,
  },
  glowOrb3: {
    width: 300,
    height: 300,
    backgroundColor: THEME.accent,
    bottom: -100,
    left: '40%',
    opacity: 0.08,
  },
  heroContent: {
    maxWidth: 1000,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    zIndex: 1,
  },
  heroContentMobile: {
    paddingHorizontal: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    marginBottom: 32,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.textMuted,
  },
  heroTitle: {
    fontSize: 64,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 72,
    letterSpacing: -1,
  },
  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 20,
    color: THEME.textMuted,
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
    gap: 16,
    marginTop: 48,
  },
  heroCTAMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.dark,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.textMuted,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginTop: 80,
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  statsRowMobile: {
    flexWrap: 'wrap',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 4,
  },
  // Sections
  section: {
    paddingHorizontal: 48,
    paddingVertical: 100,
    backgroundColor: THEME.text,
  },
  sectionDark: {
    backgroundColor: THEME.dark,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 60,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${THEME.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  comingSoonBadge: {
    backgroundColor: `${THEME.warning}15`,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME.dark,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 600,
  },
  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  productsGridMobile: {
    flexDirection: 'column',
  },
  productCard: {
    width: 340,
    backgroundColor: THEME.text,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  productCardMobile: {
    width: '100%',
  },
  productCardInner: {
    padding: 28,
  },
  subscribedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${THEME.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscribedText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.success,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.dark,
  },
  productTagline: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 4,
  },
  productDesc: {
    fontSize: 14,
    color: THEME.textSubtle,
    lineHeight: 22,
    marginTop: 12,
  },
  productFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  featureTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureTagDark: {
    backgroundColor: THEME.card,
  },
  featureTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.textSubtle,
  },
  productActions: {
    marginTop: 24,
    gap: 12,
  },
  productBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  productBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  learnMoreBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textMuted,
  },
  // Coming Soon Cards
  comingSoonCard: {
    width: 280,
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 24,
  },
  waitlistBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Features
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
  featureCard: {
    width: 340,
    backgroundColor: THEME.text,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIconWrap: {
    marginBottom: 20,
  },
  featureIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 22,
  },
  // Testimonials
  testimonialContainer: {
    alignItems: 'center',
  },
  testimonialCard: {
    maxWidth: 700,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quoteIcon: {
    marginBottom: 24,
  },
  testimonialQuote: {
    fontSize: 20,
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 32,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.dark,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  authorRole: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 2,
  },
  testimonialDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
  },
  dotActive: {
    backgroundColor: THEME.primary,
    width: 24,
  },
  // Pricing
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    alignItems: 'stretch',
  },
  pricingGridMobile: {
    flexDirection: 'column',
  },
  pricingCard: {
    width: 320,
    backgroundColor: THEME.text,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingCardMobile: {
    width: '100%',
  },
  pricingCardPro: {
    backgroundColor: THEME.dark,
    borderColor: THEME.primary,
    borderWidth: 2,
    position: 'relative',
  },
  popularTag: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.dark,
    letterSpacing: 0.5,
  },
  pricingName: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.dark,
    textAlign: 'center',
  },
  pricingPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 16,
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: THEME.dark,
  },
  pricingPeriod: {
    fontSize: 16,
    color: THEME.textMuted,
    marginLeft: 4,
  },
  pricingDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  pricingFeatures: {
    marginTop: 32,
    gap: 14,
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: THEME.textSubtle,
  },
  pricingBtn: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.dark,
    alignItems: 'center',
  },
  pricingBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.dark,
  },
  pricingBtnPro: {
    marginTop: 32,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pricingBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  pricingBtnTextPro: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.dark,
  },
  // Final CTA
  finalCTA: {
    overflow: 'hidden',
  },
  finalCTAGradient: {
    paddingVertical: 100,
    paddingHorizontal: 48,
  },
  finalCTAContent: {
    alignItems: 'center',
  },
  finalCTATitle: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
  },
  finalCTASubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  finalCTABtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 40,
  },
  finalCTABtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  finalCTABtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.dark,
  },
  // Footer
  footer: {
    backgroundColor: THEME.darker,
    paddingHorizontal: 48,
    paddingTop: 80,
    paddingBottom: 32,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 60,
  },
  footerContentMobile: {
    flexDirection: 'column',
    gap: 48,
  },
  footerBrand: {
    maxWidth: 280,
  },
  footerTagline: {
    fontSize: 14,
    color: THEME.textSubtle,
    marginTop: 16,
    lineHeight: 22,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 64,
  },
  footerLinksMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  footerColumn: {
    gap: 12,
  },
  footerColumnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerLink: {
    fontSize: 14,
    color: THEME.textSubtle,
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  copyright: {
    fontSize: 13,
    color: THEME.textSubtle,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soko Ecosystem
  sokoLogoLarge: {
    marginBottom: 0,
  },
  sokoLogoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecosystemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 60,
  },
  ecosystemGridMobile: {
    flexDirection: 'column',
  },
  ecosystemCard: {
    width: 260,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ecosystemIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: `${THEME.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ecosystemCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  ecosystemCardDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  ecosystemDiagram: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 40,
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ecosystemDiagramCenter: {
    marginBottom: 32,
  },
  ecosystemDiagramCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecosystemDiagramCoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.dark,
  },
  ecosystemDiagramCoreSubtext: {
    fontSize: 11,
    color: THEME.dark,
    opacity: 0.7,
  },
  ecosystemDiagramApps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  ecosystemDiagramApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: THEME.darker,
  },
  ecosystemDiagramAppName: {
    fontSize: 13,
    fontWeight: '600',
  },
});
