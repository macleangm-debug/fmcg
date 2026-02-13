import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  Animated,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';

// Premium Dark Theme
const THEME = {
  bg: '#0A0A0F',
  bgCard: '#12121A',
  bgCardHover: '#1A1A25',
  primary: '#14B8A6',
  primaryGlow: 'rgba(20, 184, 166, 0.3)',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  border: '#1F1F2E',
  success: '#10B981',
  danger: '#EF4444',
};

// App data with correct availability
const APPS = {
  available: [
    { id: 'retailpro', name: 'RetailPro', tagline: 'Complete POS & Retail', icon: 'cart', color: '#3B82F6', features: ['Point of Sale', 'Inventory', 'Reports'] },
    { id: 'inventory', name: 'Inventory', tagline: 'Stock Management', icon: 'cube', color: '#10B981', features: ['Stock Tracking', 'Alerts', 'Suppliers'] },
    { id: 'invoicing', name: 'Invoicing', tagline: 'Professional Invoices', icon: 'document-text', color: '#EF4444', features: ['Templates', 'Payments', 'Tracking'] },
    { id: 'unitxt', name: 'UniTxt', tagline: 'Bulk SMS Platform', icon: 'chatbubbles', color: '#F59E0B', features: ['Mass SMS', 'Groups', 'Analytics'] },
    { id: 'loyalty', name: 'Loyalty', tagline: 'Customer Rewards', icon: 'gift', color: '#EC4899', features: ['Points', 'Rewards', 'Analytics'] },
  ],
  comingSoon: [
    { id: 'kwikpay', name: 'KwikPay', tagline: 'Payment Processing', icon: 'card', color: '#8B5CF6' },
    { id: 'accounting', name: 'Accounting', tagline: 'Financial Management', icon: 'calculator', color: '#06B6D4' },
    { id: 'crm', name: 'CRM', tagline: 'Customer Relations', icon: 'people', color: '#F97316' },
    { id: 'expenses', name: 'Expenses', tagline: 'Expense Tracking', icon: 'wallet', color: '#84CC16' },
  ],
};

// Stats for social proof
const STATS = [
  { value: '10,000+', label: 'Active Businesses' },
  { value: '500K+', label: 'Transactions/Month' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

// Testimonials
const TESTIMONIALS = [
  { name: 'James Mwangi', role: 'CEO, Nairobi Retail', text: 'Software Galaxy transformed how we manage our 5 stores. Everything is connected now.', avatar: 'JM' },
  { name: 'Sarah Okonkwo', role: 'Owner, Lagos Fashion', text: 'The invoicing module saved us hours every week. Our cash flow improved by 40%.', avatar: 'SO' },
  { name: 'David Kimani', role: 'Manager, Kampala Electronics', text: 'Best investment for our business. The support team is incredible.', avatar: 'DK' },
];

export default function SoftwareGalaxyHome() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  
  // Popup states
  const [showTimedPopup, setShowTimedPopup] = useState(false);
  const [showScrollPopup, setShowScrollPopup] = useState(false);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [hasShownTimedPopup, setHasShownTimedPopup] = useState(false);
  const [hasShownScrollPopup, setHasShownScrollPopup] = useState(false);
  const [email, setEmail] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);
  
  // Timed popup (8 seconds)
  useEffect(() => {
    if (!hasShownTimedPopup && !isAuthenticated) {
      const timer = setTimeout(() => {
        setShowTimedPopup(true);
        setHasShownTimedPopup(true);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [hasShownTimedPopup, isAuthenticated]);
  
  // Exit intent (mouse leaves viewport - web only)
  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0 && !showExitPopup) {
          setShowExitPopup(true);
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [showExitPopup, isAuthenticated]);
  
  // Handle scroll for scroll-triggered popup
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollPercent = scrollY / (contentHeight - height);
    
    if (scrollPercent > 0.5 && !hasShownScrollPopup && !isAuthenticated) {
      setShowScrollPopup(true);
      setHasShownScrollPopup(true);
    }
  };
  
  const navigateToAuth = (mode: 'trial' | 'demo') => {
    setShowTimedPopup(false);
    setShowScrollPopup(false);
    setShowExitPopup(false);
    if (mode === 'trial') {
      router.push('/(auth)/register' as any);
    } else {
      router.push('/(auth)/login' as any);
    }
  };

  // Popup Component
  const ConversionPopup = ({ 
    visible, 
    onClose, 
    title, 
    subtitle, 
    type 
  }: { 
    visible: boolean; 
    onClose: () => void; 
    title: string; 
    subtitle: string;
    type: 'exit' | 'timed' | 'scroll';
  }) => (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.popupOverlay} onPress={onClose}>
        <Pressable style={styles.popupContainer} onPress={e => e.stopPropagation()}>
          <LinearGradient
            colors={type === 'exit' ? ['#7C3AED', '#4F46E5'] : type === 'timed' ? ['#14B8A6', '#0D9488'] : ['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.popupGradient}
          >
            <TouchableOpacity style={styles.popupClose} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.popupIcon}>
              <Ionicons 
                name={type === 'exit' ? 'gift' : type === 'timed' ? 'rocket' : 'star'} 
                size={48} 
                color="#FFF" 
              />
            </View>
            
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupSubtitle}>{subtitle}</Text>
            
            {type === 'exit' && (
              <View style={styles.popupOffer}>
                <Text style={styles.popupOfferText}>🎁 Get 30% OFF your first 3 months!</Text>
              </View>
            )}
            
            <View style={styles.popupActions}>
              <TouchableOpacity 
                style={styles.popupButtonPrimary}
                onPress={() => navigateToAuth('trial')}
              >
                <Text style={styles.popupButtonPrimaryText}>Start Free Trial</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.popupButtonSecondary}
                onPress={() => navigateToAuth('demo')}
              >
                <Text style={styles.popupButtonSecondaryText}>Request Demo</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // App Card Component
  const AppCard = ({ app, isComingSoon = false }: { app: any; isComingSoon?: boolean }) => (
    <TouchableOpacity 
      style={[styles.appCard, isComingSoon && styles.appCardComingSoon]}
      activeOpacity={0.8}
      onPress={() => !isComingSoon && router.push(`/${app.id}` as any)}
    >
      <View style={[styles.appIconContainer, { backgroundColor: `${app.color}20` }]}>
        <Ionicons name={app.icon as any} size={28} color={app.color} />
      </View>
      <Text style={styles.appName}>{app.name}</Text>
      <Text style={styles.appTagline}>{app.tagline}</Text>
      {isComingSoon ? (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      ) : (
        <View style={styles.availableBadge}>
          <Ionicons name="checkmark-circle" size={14} color={THEME.success} />
          <Text style={styles.availableText}>Available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Navigation */}
        <SafeAreaView edges={['top']}>
          <View style={styles.nav}>
            <View style={styles.navLeft}>
              <Image 
                source={require('../../assets/images/software-galaxy-logo.png')}
                style={styles.navLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.navRight}>
              {!isMobile && (
                <>
                  <TouchableOpacity style={styles.navLink}>
                    <Text style={styles.navLinkText}>Features</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navLink}>
                    <Text style={styles.navLinkText}>Pricing</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity 
                style={styles.navButtonOutline}
                onPress={() => router.push('/(auth)/login' as any)}
              >
                <Text style={styles.navButtonOutlineText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navButtonPrimary}
                onPress={() => router.push('/(auth)/register' as any)}
              >
                <Text style={styles.navButtonPrimaryText}>Start Free</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[THEME.bg, '#0F172A', THEME.bg]}
            style={styles.heroGradient}
          >
            {/* Decorative elements */}
            <View style={styles.heroGlow} />
            <View style={styles.heroGlow2} />
            
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color={THEME.primary} />
                <Text style={styles.heroBadgeText}>Trusted by 10,000+ African Businesses</Text>
              </View>
              
              <Text style={styles.heroTitle}>
                Run Your Entire{'\n'}
                <Text style={styles.heroTitleAccent}>Business</Text> From{'\n'}
                One Platform
              </Text>
              
              <Text style={styles.heroSubtitle}>
                Retail, inventory, invoicing, payments & more — all connected.{'\n'}
                Stop juggling apps. Start growing your business.
              </Text>
              
              <View style={styles.heroCTAs}>
                <TouchableOpacity 
                  style={styles.ctaPrimary}
                  onPress={() => router.push('/(auth)/register' as any)}
                >
                  <LinearGradient
                    colors={[THEME.primary, '#0D9488']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaPrimaryGradient}
                  >
                    <Text style={styles.ctaPrimaryText}>Start 14-Day Free Trial</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.ctaSecondary}
                  onPress={() => router.push('/(auth)/login' as any)}
                >
                  <Ionicons name="play-circle" size={24} color={THEME.primary} />
                  <Text style={styles.ctaSecondaryText}>Watch Demo</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.heroNote}>No credit card required • Cancel anytime</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {STATS.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Available Apps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>OUR PRODUCTS</Text>
            <Text style={styles.sectionTitle}>Apps Available Now</Text>
            <Text style={styles.sectionSubtitle}>
              Start using these powerful tools today with your free trial
            </Text>
          </View>
          
          <View style={[styles.appsGrid, isMobile && styles.appsGridMobile]}>
            {APPS.available.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </View>
        </View>

        {/* Coming Soon Section */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.comingSoonHeader}>
              <Ionicons name="rocket" size={24} color={THEME.accent} />
              <Text style={styles.sectionLabel}>COMING SOON</Text>
            </View>
            <Text style={styles.sectionTitle}>More Apps on the Way</Text>
            <Text style={styles.sectionSubtitle}>
              Join the waitlist to get early access and exclusive discounts
            </Text>
          </View>
          
          <View style={[styles.appsGrid, isMobile && styles.appsGridMobile]}>
            {APPS.comingSoon.map(app => (
              <AppCard key={app.id} app={app} isComingSoon />
            ))}
          </View>
          
          <TouchableOpacity style={styles.waitlistButton}>
            <Text style={styles.waitlistButtonText}>Join Waitlist for Early Access</Text>
            <Ionicons name="notifications" size={20} color={THEME.accent} />
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>WHY CHOOSE US</Text>
            <Text style={styles.sectionTitle}>Everything You Need to Succeed</Text>
          </View>
          
          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            {[
              { icon: 'sync', title: 'All-in-One Platform', desc: 'No more switching between apps. Everything works together seamlessly.' },
              { icon: 'phone-portrait', title: 'Works Everywhere', desc: 'Access your business from any device — desktop, tablet, or phone.' },
              { icon: 'shield-checkmark', title: 'Bank-Level Security', desc: 'Your data is encrypted and protected with enterprise-grade security.' },
              { icon: 'headset', title: '24/7 Support', desc: 'Our team is always here to help you succeed, day or night.' },
              { icon: 'trending-up', title: 'Real-Time Analytics', desc: 'Make smarter decisions with live insights into your business.' },
              { icon: 'flash', title: 'Lightning Fast', desc: 'Built for speed. No lag, no waiting, just results.' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={28} color={THEME.primary} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TESTIMONIALS</Text>
            <Text style={styles.sectionTitle}>Loved by Business Owners</Text>
          </View>
          
          <View style={[styles.testimonialsGrid, isMobile && styles.testimonialsGridMobile]}>
            {TESTIMONIALS.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <View style={styles.testimonialStars}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons key={i} name="star" size={16} color={THEME.accent} />
                  ))}
                </View>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <View style={styles.testimonialAvatar}>
                    <Text style={styles.testimonialAvatarText}>{testimonial.avatar}</Text>
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>{testimonial.name}</Text>
                    <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCTA}>
          <LinearGradient
            colors={['#14B8A6', '#0D9488', '#0F766E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.finalCTAGradient}
          >
            <Text style={styles.finalCTATitle}>Ready to Transform Your Business?</Text>
            <Text style={styles.finalCTASubtitle}>
              Join thousands of businesses already using Software Galaxy
            </Text>
            <View style={styles.finalCTAButtons}>
              <TouchableOpacity 
                style={styles.finalCTAButtonPrimary}
                onPress={() => router.push('/(auth)/register' as any)}
              >
                <Text style={styles.finalCTAButtonPrimaryText}>Start Your Free Trial</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.finalCTAButtonSecondary}
                onPress={() => router.push('/(auth)/login' as any)}
              >
                <Text style={styles.finalCTAButtonSecondaryText}>Talk to Sales</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerTop}>
            <View style={styles.footerBrand}>
              <Image 
                source={require('../../assets/images/software-galaxy-logo.png')}
                style={styles.footerLogo}
                resizeMode="contain"
              />
              <Text style={styles.footerTagline}>Powering African Businesses</Text>
            </View>
            <View style={styles.footerLinks}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Products</Text>
                {APPS.available.map(app => (
                  <TouchableOpacity key={app.id}>
                    <Text style={styles.footerLink}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Company</Text>
                <TouchableOpacity><Text style={styles.footerLink}>About Us</Text></TouchableOpacity>
                <TouchableOpacity><Text style={styles.footerLink}>Careers</Text></TouchableOpacity>
                <TouchableOpacity><Text style={styles.footerLink}>Contact</Text></TouchableOpacity>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Support</Text>
                <TouchableOpacity><Text style={styles.footerLink}>Help Center</Text></TouchableOpacity>
                <TouchableOpacity><Text style={styles.footerLink}>Documentation</Text></TouchableOpacity>
                <TouchableOpacity><Text style={styles.footerLink}>API</Text></TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>© 2025 Software Galaxy. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Popups */}
      <ConversionPopup
        visible={showTimedPopup}
        onClose={() => setShowTimedPopup(false)}
        title="🚀 Ready to Scale?"
        subtitle="Get instant access to all our business tools and start growing today."
        type="timed"
      />
      
      <ConversionPopup
        visible={showScrollPopup}
        onClose={() => setShowScrollPopup(false)}
        title="⭐ You're Interested!"
        subtitle="Take your business to the next level with our all-in-one platform."
        type="scroll"
      />
      
      <ConversionPopup
        visible={showExitPopup}
        onClose={() => setShowExitPopup(false)}
        title="Wait! Don't Miss Out!"
        subtitle="Get an exclusive 30% discount on your first 3 months."
        type="exit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scrollView: { flex: 1 },
  
  // Navigation
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: THEME.bg },
  navLeft: { flexDirection: 'row', alignItems: 'center' },
  navLogo: { width: 160, height: 45 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLink: { paddingHorizontal: 12, paddingVertical: 8 },
  navLinkText: { color: THEME.textMuted, fontSize: 14, fontWeight: '500' },
  navButtonOutline: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.border },
  navButtonOutlineText: { color: THEME.text, fontSize: 14, fontWeight: '600' },
  navButtonPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: THEME.primary },
  navButtonPrimaryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  
  // Hero
  hero: { minHeight: 600 },
  heroGradient: { flex: 1, paddingVertical: 80, paddingHorizontal: 20, position: 'relative', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: THEME.primaryGlow, opacity: 0.5 },
  heroGlow2: { position: 'absolute', bottom: -50, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  heroContent: { maxWidth: 900, alignSelf: 'center', alignItems: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20, 184, 166, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
  heroBadgeText: { color: THEME.primary, fontSize: 13, fontWeight: '600' },
  heroTitle: { fontSize: 52, fontWeight: '800', color: THEME.text, textAlign: 'center', lineHeight: 62, marginBottom: 20 },
  heroTitleAccent: { color: THEME.primary },
  heroSubtitle: { fontSize: 18, color: THEME.textMuted, textAlign: 'center', lineHeight: 28, marginBottom: 40, maxWidth: 600 },
  heroCTAs: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  ctaPrimary: { borderRadius: 12, overflow: 'hidden' },
  ctaPrimaryGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 16 },
  ctaPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  ctaSecondaryText: { color: THEME.primary, fontSize: 16, fontWeight: '600' },
  heroNote: { color: THEME.textDim, fontSize: 13 },
  
  // Stats
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 40, paddingHorizontal: 20, backgroundColor: THEME.bgCard, flexWrap: 'wrap' },
  statItem: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  statValue: { fontSize: 32, fontWeight: '800', color: THEME.primary, marginBottom: 4 },
  statLabel: { fontSize: 14, color: THEME.textMuted },
  
  // Sections
  section: { paddingVertical: 80, paddingHorizontal: 20 },
  sectionDark: { backgroundColor: THEME.bgCard },
  sectionHeader: { alignItems: 'center', marginBottom: 48 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: THEME.primary, letterSpacing: 2, marginBottom: 12 },
  sectionTitle: { fontSize: 36, fontWeight: '800', color: THEME.text, textAlign: 'center', marginBottom: 12 },
  sectionSubtitle: { fontSize: 16, color: THEME.textMuted, textAlign: 'center', maxWidth: 500 },
  
  // Apps Grid
  appsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, maxWidth: 1200, alignSelf: 'center' },
  appsGridMobile: { gap: 12 },
  appCard: { width: 200, backgroundColor: THEME.bgCard, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  appCardComingSoon: { opacity: 0.7 },
  appIconContainer: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  appTagline: { fontSize: 13, color: THEME.textMuted, marginBottom: 12 },
  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  availableText: { fontSize: 12, color: THEME.success, fontWeight: '600' },
  comingSoonBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  comingSoonText: { fontSize: 11, color: THEME.accent, fontWeight: '600' },
  comingSoonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  waitlistButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginTop: 40, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  waitlistButtonText: { color: THEME.accent, fontSize: 16, fontWeight: '600' },
  
  // Features
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 1100, alignSelf: 'center' },
  featuresGridMobile: { gap: 16 },
  featureCard: { width: 320, backgroundColor: THEME.bgCard, borderRadius: 16, padding: 28, borderWidth: 1, borderColor: THEME.border },
  featureIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(20, 184, 166, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  featureTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  featureDesc: { fontSize: 14, color: THEME.textMuted, lineHeight: 22 },
  
  // Testimonials
  testimonialsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 1100, alignSelf: 'center' },
  testimonialsGridMobile: { gap: 16 },
  testimonialCard: { width: 340, backgroundColor: THEME.bg, borderRadius: 16, padding: 28, borderWidth: 1, borderColor: THEME.border },
  testimonialStars: { flexDirection: 'row', gap: 2, marginBottom: 16 },
  testimonialText: { fontSize: 15, color: THEME.text, lineHeight: 24, marginBottom: 20, fontStyle: 'italic' },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testimonialAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  testimonialAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  testimonialName: { fontSize: 15, fontWeight: '700', color: THEME.text },
  testimonialRole: { fontSize: 13, color: THEME.textMuted },
  
  // Final CTA
  finalCTA: { margin: 20, borderRadius: 24, overflow: 'hidden' },
  finalCTAGradient: { paddingVertical: 60, paddingHorizontal: 24, alignItems: 'center' },
  finalCTATitle: { fontSize: 32, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  finalCTASubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32 },
  finalCTAButtons: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  finalCTAButtonPrimary: { backgroundColor: '#FFF', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 12 },
  finalCTAButtonPrimaryText: { color: THEME.primary, fontSize: 16, fontWeight: '700' },
  finalCTAButtonSecondary: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 12 },
  finalCTAButtonSecondaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Footer
  footer: { backgroundColor: THEME.bgCard, paddingTop: 60, paddingHorizontal: 20 },
  footerTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', maxWidth: 1100, alignSelf: 'center', width: '100%', marginBottom: 40 },
  footerBrand: { marginBottom: 24 },
  footerLogo: { width: 180, height: 50, marginBottom: 12 },
  footerTagline: { color: THEME.textMuted, fontSize: 14 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 60 },
  footerColumn: { minWidth: 120 },
  footerColumnTitle: { color: THEME.text, fontSize: 14, fontWeight: '700', marginBottom: 16 },
  footerLink: { color: THEME.textMuted, fontSize: 14, marginBottom: 10 },
  footerBottom: { borderTopWidth: 1, borderTopColor: THEME.border, paddingVertical: 24, alignItems: 'center' },
  footerCopyright: { color: THEME.textDim, fontSize: 13 },
  
  // Popups
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  popupContainer: { width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden' },
  popupGradient: { padding: 32, alignItems: 'center' },
  popupClose: { position: 'absolute', top: 16, right: 16, padding: 8 },
  popupIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  popupTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  popupSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  popupOffer: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 24 },
  popupOfferText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  popupActions: { width: '100%', gap: 12 },
  popupButtonPrimary: { backgroundColor: '#FFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  popupButtonPrimaryText: { color: '#0D9488', fontSize: 16, fontWeight: '700' },
  popupButtonSecondary: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  popupButtonSecondaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
