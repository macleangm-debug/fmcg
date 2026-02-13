import React, { useEffect, useState, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import FreeTrialModal, { ProductInfo } from '../../src/components/FreeTrialModal';
import WaitlistModal, { WaitlistProductInfo } from '../../src/components/WaitlistModal';
import VideoModal from '../../src/components/VideoModal';
import PRODUCTS from '../../data/products';

const isWeb = Platform.OS === 'web';

// Professional Theme
const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
  textSubtle: '#5A5A6E',
  success: '#00C48C',
  warning: '#FFB800',
  lightBg: '#F8FAFC',
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isAuthenticated, user } = useAuthStore();
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeDemo, setActiveDemo] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  
  // Modals
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialProductInfo, setTrialProductInfo] = useState<ProductInfo | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistProduct, setWaitlistProduct] = useState<WaitlistProductInfo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // Interactive Features Section
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [featureDemoStep, setFeatureDemoStep] = useState(0);
  
  const product = PRODUCTS[id as string];

  useEffect(() => {
    if (!isWeb) {
      router.replace('/(auth)/login');
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    
    // Demo rotation
    if (product?.demoScreens) {
      const interval = setInterval(() => {
        setActiveDemo(prev => (prev + 1) % product.demoScreens.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [product]);
  
  // Animated step rotation for How It Works section
  useEffect(() => {
    if (product?.demoSteps) {
      const stepInterval = setInterval(() => {
        setActiveStep(prev => (prev + 1) % product.demoSteps.length);
      }, 2500);
      return () => clearInterval(stepInterval);
    }
  }, [product]);
  
  // Feature demo step animation when expanded
  useEffect(() => {
    if (expandedFeature !== null && product?.interactiveFeatures?.[expandedFeature]) {
      const feature = product.interactiveFeatures[expandedFeature];
      if (feature?.demo?.steps) {
        const stepInterval = setInterval(() => {
          setFeatureDemoStep(prev => (prev + 1) % feature.demo.steps.length);
        }, 2000);
        return () => clearInterval(stepInterval);
      }
    }
  }, [expandedFeature, product]);

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
    if (!product) return;
    
    const productInfo: ProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.heroSubtitle,
      icon: product.features[0]?.icon || 'cube-outline',
      color: product.color,
      bgColor: shadeColor(product.color, 80),
      gradientColors: product.gradientColors as [string, string],
      features: product.features.slice(0, 4).map((f: any) => f.title),
      dashboardRoute: product.dashboardRoute,
    };
    
    setTrialProductInfo(productInfo);
    setShowTrialModal(true);
  };
  
  const handleJoinWaitlist = () => {
    if (!product) return;
    
    const productInfo: WaitlistProductInfo = {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.heroSubtitle,
      icon: product.features[0]?.icon || 'cube-outline',
      color: product.color,
      bgColor: shadeColor(product.color, 80),
      gradientColors: product.gradientColors as [string, string],
      features: product.features.slice(0, 4).map((f: any) => f.title),
    };
    
    setWaitlistProduct(productInfo);
    setShowWaitlistModal(true);
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={THEME.textMuted} />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/landing')}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Web CSS for animations
  const webStyles = isWeb ? `
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    @keyframes slideIn { 0% { transform: translateX(-10px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
    @keyframes progressBar { 0% { width: 0%; } 100% { width: 100%; } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 5px ${product.color}40; } 50% { box-shadow: 0 0 20px ${product.color}60; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes stepPulse { 0%, 100% { transform: scale(1); background-color: ${product.color}20; } 50% { transform: scale(1.05); background-color: ${product.color}30; } }
    .demo-card { transition: all 0.3s ease; }
    .demo-card:hover { transform: scale(1.02); }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .step-active { animation: glow 1.5s ease-in-out infinite; }
    .step-progress { animation: progressBar 2.5s linear infinite; }
    .step-content { transition: all 0.3s ease; }
    .interactive-feature-card { transition: all 0.3s ease; cursor: pointer; }
    .interactive-feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
    .feature-expanded { animation: slideUp 0.3s ease forwards; }
    .demo-step-active { animation: stepPulse 2s ease-in-out infinite; }
    .try-feature-btn { transition: all 0.2s ease; }
    .try-feature-btn:hover { transform: scale(1.05); }
  ` : '';

  return (
    <SafeAreaView style={styles.container}>
      {isWeb && <style dangerouslySetInnerHTML={{ __html: webStyles }} />}
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={isWeb ? { flex: 1, height: '100%' } : undefined}
        contentContainerStyle={isWeb ? { flexGrow: 1 } : undefined}
      >
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <TouchableOpacity style={styles.logo} onPress={() => router.push('/landing')}>
            <Image 
              source={require('../../assets/images/software-galaxy-logo.png')}
              style={{ width: 150, height: 40, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <>
                <ProductSwitcher />
                <View style={styles.userBadge}>
                  <Text style={styles.userInitial}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ctaBtn, { backgroundColor: product.color }]}
                  onPress={product.comingSoon ? handleJoinWaitlist : handleStartTrial}
                >
                  <Text style={styles.ctaBtnText}>
                    {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Hero */}
        <Animated.View style={[{ opacity: fadeAnim }]}>
          <LinearGradient
            colors={product.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {product.comingSoon && (
              <View style={styles.comingSoonBanner}>
                <Ionicons name="rocket-outline" size={16} color={THEME.text} />
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.backLink} onPress={() => router.push('/landing')}>
              <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backLinkText}>Back to Products</Text>
            </TouchableOpacity>
            
            <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
              <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
                {product.heroTitle}
              </Text>
              <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
                {product.heroSubtitle}
              </Text>
              
              <View style={[styles.heroCTA, isMobile && styles.heroCTAMobile]}>
                <TouchableOpacity 
                  style={styles.primaryBtn}
                  onPress={product.comingSoon ? handleJoinWaitlist : handleStartTrial}
                >
                  <Text style={[styles.primaryBtnText, { color: product.color }]}>
                    {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
                  </Text>
                  <Ionicons name={product.comingSoon ? 'notifications-outline' : 'arrow-forward'} size={20} color={product.color} />
                </TouchableOpacity>
                
                {!product.comingSoon && (
                  <TouchableOpacity 
                    style={styles.secondaryBtn}
                    onPress={() => setShowVideoModal(true)}
                    data-testid="watch-demo-btn"
                  >
                    <Ionicons name="play-circle" size={22} color={THEME.text} />
                    <Text style={styles.secondaryBtnText}>Watch Demo</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Stats */}
              <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
                {product.stats.map((stat: any, index: number) => (
                  <View key={index} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Mobile First Section - Standalone Feature Highlight */}
        {product.mobileFirst && (
          <View style={styles.mobileFirstSection}>
            <View style={styles.mobileFirstInner}>
              {/* Phone Mockup Side */}
              <View style={styles.phoneMockupContainer}>
                <View style={styles.phoneMockup}>
                  <View style={styles.phoneNotch} />
                  <View style={[styles.phoneScreen, { backgroundColor: `${product.color}15` }]}>
                    <Ionicons name="phone-portrait-outline" size={60} color={product.color} />
                    <Text style={[styles.phoneScreenText, { color: product.color }]}>
                      {product.name}
                    </Text>
                  </View>
                </View>
                <View style={[styles.phoneGlow, { backgroundColor: product.color }]} />
              </View>
              
              {/* Content Side */}
              <View style={styles.mobileFirstTextContent}>
                <View style={[styles.mobileFirstBadge, { backgroundColor: `${product.color}15` }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={product.color} />
                  <Text style={[styles.mobileFirstBadgeText, { color: product.color }]}>WORKS ON YOUR PHONE</Text>
                </View>
                
                <Text style={styles.mobileFirstHeadline}>{product.mobileFirst.headline}</Text>
                <Text style={styles.mobileFirstSubheadline}>{product.mobileFirst.subheadline}</Text>
                
                <View style={styles.mobileFirstFeaturesList}>
                  {product.mobileFirst.features.map((feature: any, index: number) => (
                    <View key={index} style={styles.mobileFirstFeatureItem}>
                      <View style={[styles.mobileFirstFeatureCheck, { backgroundColor: `${product.color}15` }]}>
                        <Ionicons name={feature.icon} size={18} color={product.color} />
                      </View>
                      <Text style={styles.mobileFirstFeatureItemText}>{feature.text}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.noHardwareBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#00C48C" />
                  <Text style={styles.noHardwareText}>No expensive hardware needed</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Demo Section */}
        <View style={styles.demoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>INTERACTIVE DEMO</Text>
            <Text style={styles.sectionTitle}>See {product.name} in Action</Text>
            <Text style={styles.sectionSubtitle}>
              {product.comingSoon 
                ? 'Preview what\'s coming - beautiful interfaces designed for productivity'
                : 'Explore the powerful features that make your work easier'}
            </Text>
          </View>
          
          <View style={[styles.demoContainer, isMobile && styles.demoContainerMobile]}>
            {/* Desktop Demo Preview */}
            <View style={[styles.demoPreview, { borderColor: product.color }]}>
              <View style={styles.demoHeader}>
                <View style={styles.demoControls}>
                  <View style={[styles.demoControl, { backgroundColor: '#FF5F57' }]} />
                  <View style={[styles.demoControl, { backgroundColor: '#FEBC2E' }]} />
                  <View style={[styles.demoControl, { backgroundColor: '#28C840' }]} />
                </View>
                <Text style={styles.demoTitle}>{product.name} - {product.demoScreens[activeDemo].title}</Text>
              </View>
              <View style={styles.demoBody}>
                <LinearGradient
                  colors={[`${product.color}10`, `${product.color}05`]}
                  style={styles.demoGradient}
                >
                  <Ionicons name={product.features[activeDemo]?.icon || 'cube-outline'} size={80} color={product.color} />
                  <Text style={[styles.demoScreenTitle, { color: product.color }]}>
                    {product.demoScreens[activeDemo].title}
                  </Text>
                  <Text style={styles.demoScreenDesc}>
                    {product.demoScreens[activeDemo].description}
                  </Text>
                </LinearGradient>
              </View>
            </View>
            
            {/* Demo Navigation */}
            <View style={styles.demoNav}>
              {product.demoScreens.map((screen: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.demoNavItem,
                    index === activeDemo && [styles.demoNavItemActive, { borderColor: product.color }],
                  ]}
                  onPress={() => setActiveDemo(index)}
                >
                  <Text style={[
                    styles.demoNavNumber,
                    index === activeDemo && { color: product.color },
                  ]}>
                    {index + 1}
                  </Text>
                  <View>
                    <Text style={[
                      styles.demoNavTitle,
                      index === activeDemo && { color: THEME.dark },
                    ]}>
                      {screen.title}
                    </Text>
                    <Text style={styles.demoNavDesc}>{screen.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* PWA & Mobile Section */}
        <View style={[styles.section, styles.sectionAlt]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionBadge, { color: product.color, backgroundColor: `${product.color}20` }]}>
              MULTI-PLATFORM
            </Text>
            <Text style={styles.sectionTitle}>Works Everywhere</Text>
            <Text style={styles.sectionSubtitle}>
              Access {product.name} on any device - desktop, tablet, or mobile
            </Text>
          </View>
          
          <View style={[styles.devicesContainer, isMobile && styles.devicesContainerMobile]}>
            {/* Desktop Mockup */}
            <View style={styles.deviceDesktop}>
              <View style={styles.deviceDesktopScreen}>
                <View style={styles.deviceDesktopHeader}>
                  <View style={styles.deviceDesktopDots}>
                    <View style={[styles.deviceDot, { backgroundColor: '#FF5F57' }]} />
                    <View style={[styles.deviceDot, { backgroundColor: '#FEBC2E' }]} />
                    <View style={[styles.deviceDot, { backgroundColor: '#28C840' }]} />
                  </View>
                </View>
                <LinearGradient
                  colors={[product.color, product.gradientColors[1]]}
                  style={styles.deviceDesktopContent}
                >
                  <Ionicons name={product.features[0]?.icon || 'desktop-outline'} size={40} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.deviceLabel}>Web Dashboard</Text>
                </LinearGradient>
              </View>
              <View style={styles.deviceDesktopStand} />
              <View style={styles.deviceDesktopBase} />
            </View>
            
            {/* Tablet Mockup */}
            <View style={styles.deviceTablet}>
              <View style={styles.deviceTabletScreen}>
                <LinearGradient
                  colors={[product.color, product.gradientColors[1]]}
                  style={styles.deviceTabletContent}
                >
                  <Ionicons name={product.features[1]?.icon || 'tablet-portrait-outline'} size={32} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.deviceLabel}>Tablet View</Text>
                </LinearGradient>
              </View>
            </View>
            
            {/* Phone Mockup */}
            <View style={styles.devicePhone}>
              <View style={styles.devicePhoneNotch} />
              <View style={styles.devicePhoneScreen}>
                <LinearGradient
                  colors={[product.color, product.gradientColors[1]]}
                  style={styles.devicePhoneContent}
                >
                  <Ionicons name={product.features[2]?.icon || 'phone-portrait-outline'} size={28} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.deviceLabelSmall}>PWA Mobile</Text>
                </LinearGradient>
              </View>
              <View style={styles.devicePhoneBar} />
            </View>
          </View>
          
          <View style={styles.platformFeatures}>
            <View style={styles.platformFeature}>
              <View style={[styles.platformFeatureIcon, { backgroundColor: `${product.color}15` }]}>
                <Ionicons name="cloud-offline-outline" size={24} color={product.color} />
              </View>
              <Text style={styles.platformFeatureTitle}>Offline Ready</Text>
              <Text style={styles.platformFeatureDesc}>Work without internet, sync when connected</Text>
            </View>
            <View style={styles.platformFeature}>
              <View style={[styles.platformFeatureIcon, { backgroundColor: `${product.color}15` }]}>
                <Ionicons name="download-outline" size={24} color={product.color} />
              </View>
              <Text style={styles.platformFeatureTitle}>Install as App</Text>
              <Text style={styles.platformFeatureDesc}>Add to home screen for native experience</Text>
            </View>
            <View style={styles.platformFeature}>
              <View style={[styles.platformFeatureIcon, { backgroundColor: `${product.color}15` }]}>
                <Ionicons name="sync-outline" size={24} color={product.color} />
              </View>
              <Text style={styles.platformFeatureTitle}>Real-time Sync</Text>
              <Text style={styles.platformFeatureDesc}>Data syncs across all your devices</Text>
            </View>
            <View style={styles.platformFeature}>
              <View style={[styles.platformFeatureIcon, { backgroundColor: `${product.color}15` }]}>
                <Ionicons name="notifications-outline" size={24} color={product.color} />
              </View>
              <Text style={styles.platformFeatureTitle}>Push Notifications</Text>
              <Text style={styles.platformFeatureDesc}>Stay updated with instant alerts</Text>
            </View>
          </View>
        </View>

        {/* Animated Demo Walkthrough */}
        {product.demoSteps && (
          <View style={[styles.section, styles.sectionDark]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionBadge, { color: product.color, backgroundColor: `${product.color}20` }]}>
                HOW IT WORKS
              </Text>
              <Text style={[styles.sectionTitle, { color: THEME.text }]}>
                See It In Action
              </Text>
              <Text style={[styles.sectionSubtitle, { color: THEME.textMuted }]}>
                A quick walkthrough of key workflows
              </Text>
            </View>
            
            <View style={styles.demoWalkthrough}>
              {product.demoSteps.map((step: any, index: number) => {
                const isActive = index === activeStep;
                const isCompleted = index < activeStep;
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.demoStep,
                      isActive && styles.demoStepActive,
                    ]}
                    className={isActive ? 'step-active' : ''}
                  >
                    <View style={[
                      styles.demoStepNumber, 
                      { backgroundColor: isActive || isCompleted ? product.color : `${product.color}40` }
                    ]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color={THEME.text} />
                      ) : (
                        <Text style={styles.demoStepNumberText}>{index + 1}</Text>
                      )}
                    </View>
                    {index < product.demoSteps.length - 1 && (
                      <View style={[styles.demoStepLine, { backgroundColor: `${product.color}30` }]}>
                        {isActive && (
                          <View 
                            style={[styles.demoStepLineProgress, { backgroundColor: product.color }]}
                            className="step-progress"
                          />
                        )}
                      </View>
                    )}
                    <View style={[
                      styles.demoStepContent,
                      isActive && { transform: [{ scale: 1.02 }] }
                    ]}>
                      <Text style={[
                        styles.demoStepTitle,
                        isActive && { color: product.color }
                      ]}>{step.title}</Text>
                      <View style={styles.demoStepFlow}>
                        <View style={[
                          styles.demoStepAction,
                          isActive && { backgroundColor: `${product.color}15` }
                        ]}>
                          <Ionicons 
                            name="hand-left-outline" 
                            size={16} 
                            color={isActive ? product.color : THEME.textMuted} 
                          />
                          <Text style={[
                            styles.demoStepActionText,
                            isActive && { color: product.color }
                          ]}>{step.action}</Text>
                        </View>
                        <Ionicons 
                          name="arrow-forward" 
                          size={20} 
                          color={isActive ? product.color : `${product.color}50`} 
                        />
                        <View style={[
                          styles.demoStepResult, 
                          { borderColor: isActive ? product.color : `${product.color}40` },
                          isActive && { backgroundColor: `${product.color}10` }
                        ]}>
                          <Ionicons 
                            name="checkmark-circle" 
                            size={16} 
                            color={isActive ? product.color : `${product.color}60`} 
                          />
                          <Text style={[
                            styles.demoStepResultText, 
                            { color: isActive ? product.color : `${product.color}80` }
                          ]}>{step.result}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Case Studies */}
        {product.caseStudies && product.caseStudies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>SUCCESS STORIES</Text>
              <Text style={styles.sectionTitle}>Trusted By Industry Leaders</Text>
              <Text style={styles.sectionSubtitle}>
                See how businesses like yours are succeeding with {product.name}
              </Text>
            </View>
            
            <View style={[styles.caseStudiesGrid, isMobile && styles.caseStudiesGridMobile]}>
              {product.caseStudies.map((study: any, index: number) => (
                <View key={index} style={styles.caseStudyCard}>
                  <View style={styles.caseStudyHeader}>
                    <View style={[styles.caseStudyLogo, { backgroundColor: `${product.color}15` }]}>
                      <Ionicons name={study.logo} size={28} color={product.color} />
                    </View>
                    <View style={styles.caseStudyCompanyInfo}>
                      <Text style={styles.caseStudyCompany}>{study.company}</Text>
                      <Text style={styles.caseStudyIndustry}>{study.industry}</Text>
                      <View style={styles.caseStudyLocation}>
                        <Ionicons name="location-outline" size={12} color={THEME.textMuted} />
                        <Text style={styles.caseStudyLocationText}>{study.location}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.caseStudyQuote, { borderLeftColor: product.color }]}>
                    <Ionicons name="chatbubble-outline" size={20} color={`${product.color}50`} style={styles.quoteIcon} />
                    <Text style={styles.caseStudyQuoteText}>"{study.quote}"</Text>
                  </View>
                  
                  <View style={styles.caseStudyAuthor}>
                    <View style={[styles.authorAvatar, { backgroundColor: product.color }]}>
                      <Text style={styles.authorInitial}>{study.author.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.authorName}>{study.author}</Text>
                      <Text style={styles.authorRole}>{study.role}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.caseStudyMetrics}>
                    {study.metrics.map((metric: any, mIndex: number) => (
                      <View key={mIndex} style={styles.caseStudyMetric}>
                        <Text style={[styles.metricValue, { color: product.color }]}>{metric.value}</Text>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interactive Features Section */}
        {product.interactiveFeatures && (
          <View style={[styles.section, styles.sectionDark]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionBadge, { color: product.color, backgroundColor: `${product.color}20` }]}>
                INTERACTIVE FEATURES
              </Text>
              <Text style={[styles.sectionTitle, { color: THEME.text }]}>
                Explore {product.name} Features
              </Text>
              <Text style={[styles.sectionSubtitle, { color: THEME.textMuted }]}>
                Click on any feature to see how it works
              </Text>
            </View>
            
            <View style={[styles.interactiveFeaturesGrid, isMobile && styles.interactiveFeaturesGridMobile]}>
              {product.interactiveFeatures.map((feature: any, index: number) => {
                const isExpanded = expandedFeature === index;
                
                return (
                  <TouchableOpacity
                    key={feature.id}
                    style={[
                      styles.interactiveFeatureCard,
                      isExpanded && [styles.interactiveFeatureCardExpanded, { borderColor: product.color }],
                      isMobile && styles.interactiveFeatureCardMobile,
                    ]}
                    onPress={() => {
                      setExpandedFeature(isExpanded ? null : index);
                      setFeatureDemoStep(0);
                    }}
                    activeOpacity={0.8}
                    className="interactive-feature-card"
                  >
                    {/* Card Header */}
                    <View style={styles.interactiveFeatureHeader}>
                      <View style={[styles.interactiveFeatureIcon, { backgroundColor: `${product.color}15` }]}>
                        <Ionicons name={feature.icon as any} size={24} color={product.color} />
                      </View>
                      <View style={styles.interactiveFeatureTitleSection}>
                        <Text style={[styles.interactiveFeatureTitle, isExpanded && { color: product.color }]}>
                          {feature.title}
                        </Text>
                        <Text style={styles.interactiveFeatureDesc} numberOfLines={isExpanded ? undefined : 2}>
                          {feature.description}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={THEME.textMuted}
                      />
                    </View>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={styles.interactiveFeatureExpanded} className="feature-expanded">
                        {/* Demo Steps */}
                        <View style={styles.featureDemoSection}>
                          <Text style={styles.featureDemoLabel}>HOW IT WORKS</Text>
                          <View style={styles.featureDemoSteps}>
                            {feature.demo.steps.map((step: string, stepIndex: number) => {
                              const isActiveStep = stepIndex === featureDemoStep;
                              const isCompleted = stepIndex < featureDemoStep;
                              
                              return (
                                <View
                                  key={stepIndex}
                                  style={[
                                    styles.featureDemoStep,
                                    isActiveStep && { backgroundColor: `${product.color}15` },
                                  ]}
                                  className={isActiveStep ? 'demo-step-active' : ''}
                                >
                                  <View style={[
                                    styles.featureDemoStepNumber,
                                    (isActiveStep || isCompleted) && { backgroundColor: product.color },
                                  ]}>
                                    {isCompleted ? (
                                      <Ionicons name="checkmark" size={12} color={THEME.text} />
                                    ) : (
                                      <Text style={styles.featureDemoStepNumberText}>{stepIndex + 1}</Text>
                                    )}
                                  </View>
                                  <Text style={[
                                    styles.featureDemoStepText,
                                    isActiveStep && { color: THEME.text, fontWeight: '600' },
                                  ]}>
                                    {step}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                        
                        {/* Metrics */}
                        <View style={styles.featureMetrics}>
                          {feature.demo.metrics.map((metric: string, mIndex: number) => (
                            <View key={mIndex} style={[styles.featureMetricBadge, { backgroundColor: `${product.color}10` }]}>
                              <Ionicons name="checkmark-circle" size={14} color={product.color} />
                              <Text style={[styles.featureMetricText, { color: product.color }]}>{metric}</Text>
                            </View>
                          ))}
                        </View>
                        
                        {/* Integrations */}
                        <View style={styles.featureIntegrations}>
                          <Text style={styles.featureIntegrationsLabel}>INTEGRATES WITH</Text>
                          <View style={styles.featureIntegrationsList}>
                            {feature.integrations.map((integration: string, iIndex: number) => (
                              <View key={iIndex} style={styles.featureIntegrationBadge}>
                                <Text style={styles.featureIntegrationText}>{integration}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                        
                        {/* CTA Button */}
                        <TouchableOpacity
                          style={[styles.featureCTAButton, { backgroundColor: product.color }]}
                          onPress={product.comingSoon ? handleJoinWaitlist : handleStartTrial}
                          className="try-feature-btn"
                        >
                          <Text style={styles.featureCTAButtonText}>
                            {product.comingSoon ? 'Join Waitlist' : `Try ${feature.title}`}
                          </Text>
                          <Ionicons name="arrow-forward" size={16} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* View All Features CTA */}
            <View style={styles.viewAllFeaturesContainer}>
              <TouchableOpacity
                style={[styles.viewAllFeaturesBtn, { borderColor: product.color }]}
                onPress={() => router.push('/features')}
              >
                <Text style={[styles.viewAllFeaturesBtnText, { color: product.color }]}>
                  Compare All Products Features
                </Text>
                <Ionicons name="arrow-forward" size={16} color={product.color} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Legacy Features Section - Fallback */}
        {!product.interactiveFeatures && (
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionBadge, { color: product.color, backgroundColor: `${product.color}20` }]}>
              FEATURES
            </Text>
            <Text style={[styles.sectionTitle, { color: THEME.text }]}>
              Everything You Need
            </Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.textMuted }]}>
              Powerful features to transform your operations
            </Text>
          </View>
          
          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            {product.features.map((feature: any, index: number) => (
              <View key={index} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
                <View style={[styles.featureIcon, { backgroundColor: `${product.color}15` }]}>
                  <Ionicons name={feature.icon} size={28} color={product.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
                <View style={styles.featureHighlights}>
                  {feature.highlights.map((h: string, i: number) => (
                    <View key={i} style={styles.highlightTag}>
                      <Ionicons name="checkmark" size={12} color={product.color} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Use Cases / Target Clients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>TARGET CLIENTS</Text>
            <Text style={styles.sectionTitle}>Built For Your Industry</Text>
            <Text style={styles.sectionSubtitle}>
              {product.name} is designed for diverse businesses across multiple sectors
            </Text>
          </View>
          
          <View style={[styles.useCasesGrid, isMobile && styles.useCasesGridMobile]}>
            {product.useCases.map((useCase: any, index: number) => (
              <View key={index} style={[styles.useCaseCard, { borderLeftColor: product.color }]}>
                {useCase.icon && (
                  <View style={[styles.useCaseIcon, { backgroundColor: `${product.color}15` }]}>
                    <Ionicons name={useCase.icon} size={24} color={product.color} />
                  </View>
                )}
                <Text style={styles.useCaseTitle}>{useCase.title}</Text>
                <Text style={styles.useCaseDesc}>{useCase.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionBadge, { color: product.color, backgroundColor: `${product.color}20` }]}>
              PRICING
            </Text>
            <Text style={[styles.sectionTitle, { color: THEME.text }]}>
              Simple, Transparent Pricing
            </Text>
          </View>
          
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
                  <View style={[styles.popularTag, { backgroundColor: product.color }]}>
                    <Text style={styles.popularTagText}>MOST POPULAR</Text>
                  </View>
                )}
                <Text style={styles.pricingName}>{plan.name}</Text>
                <View style={styles.pricingPrice}>
                  <Text style={styles.pricingAmount}>{plan.price}</Text>
                  <Text style={styles.pricingPeriod}>{plan.period}</Text>
                </View>
                <View style={styles.pricingFeatures}>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.pricingFeatureRow}>
                      <Ionicons name="checkmark" size={16} color={product.color} />
                      <Text style={styles.pricingFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity 
                  style={[
                    styles.pricingBtn,
                    plan.highlighted && { backgroundColor: product.color },
                  ]}
                  onPress={product.comingSoon ? handleJoinWaitlist : handleStartTrial}
                >
                  <Text style={[
                    styles.pricingBtnText,
                    plan.highlighted && { color: THEME.dark },
                  ]}>
                    {product.comingSoon ? 'Join Waitlist' : 'Get Started'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <LinearGradient
          colors={product.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.finalCTA}
        >
          <Text style={styles.finalCTATitle}>
            {product.comingSoon ? 'Be the First to Know' : `Ready to Try ${product.name}?`}
          </Text>
          <Text style={styles.finalCTASubtitle}>
            {product.comingSoon 
              ? 'Join our waitlist for early access when we launch'
              : 'Start your free trial today. No credit card required.'}
          </Text>
          <TouchableOpacity 
            style={styles.finalCTABtn}
            onPress={product.comingSoon ? handleJoinWaitlist : handleStartTrial}
          >
            <Text style={[styles.finalCTABtnText, { color: product.color }]}>
              {product.comingSoon ? 'Join Waitlist' : 'Start Free Trial'}
            </Text>
            <Ionicons name={product.comingSoon ? 'notifications-outline' : 'rocket'} size={20} color={product.color} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logo} onPress={() => router.push('/landing')}>
            <Image 
              source={require('../../assets/images/software-galaxy-logo.png')}
              style={{ width: 130, height: 35, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
          <Text style={styles.copyright}>© 2025 Software Galaxy. All rights reserved.</Text>
        </View>
      </ScrollView>
      
      <FreeTrialModal
        visible={showTrialModal}
        product={trialProductInfo}
        onClose={() => {
          setShowTrialModal(false);
          setTrialProductInfo(null);
        }}
      />
      
      <WaitlistModal
        visible={showWaitlistModal}
        product={waitlistProduct}
        onClose={() => {
          setShowWaitlistModal(false);
          setWaitlistProduct(null);
        }}
      />
      
      <VideoModal
        visible={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoId={product?.demoVideoId}
        title={`${product?.name} Demo`}
        subtitle={`See how ${product?.name} works`}
        productColor={product?.color}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightBg,
    height: '100%',
    ...(Platform.OS === 'web' ? { overflow: 'auto' as any } : {}),
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: THEME.textMuted,
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
    color: THEME.dark,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerMobile: {
    paddingHorizontal: 20,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    fontSize: 8,
    fontWeight: '600',
    color: THEME.textMuted,
    letterSpacing: 2,
  },
  logoName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.dark,
    marginTop: -2,
  },
  headerActions: {
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
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 80,
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
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  backLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroContentMobile: {
    paddingHorizontal: 0,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    letterSpacing: -1,
  },
  heroTitleMobile: {
    fontSize: 36,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 28,
    maxWidth: 600,
  },
  heroSubtitleMobile: {
    fontSize: 16,
    lineHeight: 26,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  heroCTAMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.text,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 48,
    marginTop: 60,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statsRowMobile: {
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  // Demo Section
  demoSection: {
    paddingHorizontal: 48,
    paddingVertical: 80,
    backgroundColor: THEME.text,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    backgroundColor: `${THEME.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.dark,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 500,
  },
  demoContainer: {
    flexDirection: 'row',
    gap: 40,
    maxWidth: 1100,
    alignSelf: 'center',
  },
  demoContainerMobile: {
    flexDirection: 'column',
  },
  demoPreview: {
    flex: 1,
    backgroundColor: THEME.dark,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1A1A25',
    gap: 16,
  },
  demoControls: {
    flexDirection: 'row',
    gap: 8,
  },
  demoControl: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  demoTitle: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  demoBody: {
    padding: 32,
    minHeight: 300,
  },
  demoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
  },
  demoScreenTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
  },
  demoScreenDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 8,
  },
  demoNav: {
    width: 320,
    gap: 12,
  },
  demoNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: THEME.lightBg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  demoNavItemActive: {
    backgroundColor: THEME.text,
    borderWidth: 2,
  },
  demoNavNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  demoNavTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  demoNavDesc: {
    fontSize: 13,
    color: THEME.textSubtle,
    marginTop: 2,
  },
  // Sections
  section: {
    paddingHorizontal: 48,
    paddingVertical: 80,
    backgroundColor: THEME.text,
  },
  sectionDark: {
    backgroundColor: THEME.dark,
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
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIcon: {
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
    color: THEME.text,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 22,
    marginBottom: 16,
  },
  featureHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.darker,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  highlightText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  // Interactive Features
  interactiveFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    paddingHorizontal: 16,
  },
  interactiveFeaturesGridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  interactiveFeatureCard: {
    width: 380,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  interactiveFeatureCardExpanded: {
    backgroundColor: `${THEME.card}`,
  },
  interactiveFeatureCardMobile: {
    width: '100%',
  },
  interactiveFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  interactiveFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  interactiveFeatureTitleSection: {
    flex: 1,
  },
  interactiveFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  interactiveFeatureDesc: {
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  interactiveFeatureExpanded: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  featureDemoSection: {
    marginBottom: 16,
  },
  featureDemoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  featureDemoSteps: {
    gap: 8,
  },
  featureDemoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  featureDemoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDemoStepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.text,
  },
  featureDemoStepText: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  featureMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  featureMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featureMetricText: {
    fontSize: 12,
    fontWeight: '500',
  },
  featureIntegrations: {
    marginBottom: 16,
  },
  featureIntegrationsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  featureIntegrationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureIntegrationBadge: {
    backgroundColor: THEME.darker,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureIntegrationText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  featureCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  featureCTAButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  viewAllFeaturesContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  viewAllFeaturesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  viewAllFeaturesBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Use Cases
  useCasesGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  useCasesGridMobile: {
    flexDirection: 'column',
  },
  useCaseCard: {
    width: 300,
    padding: 24,
    backgroundColor: THEME.text,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  useCaseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 8,
  },
  useCaseDesc: {
    fontSize: 14,
    color: THEME.textMuted,
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
    width: 300,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    position: 'relative',
  },
  pricingCardMobile: {
    width: '100%',
  },
  pricingCardHighlighted: {
    borderWidth: 2,
  },
  popularTag: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.dark,
    letterSpacing: 0.5,
  },
  pricingName: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'center',
  },
  pricingPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 12,
  },
  pricingAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME.text,
  },
  pricingPeriod: {
    fontSize: 14,
    color: THEME.textMuted,
    marginLeft: 4,
  },
  pricingFeatures: {
    marginTop: 28,
    gap: 12,
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  pricingBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  pricingBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  // Final CTA
  finalCTA: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  finalCTATitle: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
  },
  finalCTASubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 16,
  },
  finalCTABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.text,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 40,
  },
  finalCTABtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 32,
    backgroundColor: THEME.darker,
  },
  copyright: {
    fontSize: 13,
    color: THEME.textSubtle,
  },
  // PWA & Multi-platform Section
  sectionAlt: {
    backgroundColor: '#F1F5F9',
  },
  devicesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    marginBottom: 60,
  },
  devicesContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 30,
  },
  // Desktop Device
  deviceDesktop: {
    alignItems: 'center',
  },
  deviceDesktopScreen: {
    width: 320,
    height: 200,
    backgroundColor: THEME.dark,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#2A2A35',
  },
  deviceDesktopHeader: {
    height: 28,
    backgroundColor: '#1A1A25',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  deviceDesktopDots: {
    flexDirection: 'row',
    gap: 6,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceDesktopContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDesktopStand: {
    width: 60,
    height: 30,
    backgroundColor: '#D1D5DB',
    marginTop: -2,
  },
  deviceDesktopBase: {
    width: 120,
    height: 8,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
  },
  // Tablet Device
  deviceTablet: {
    alignItems: 'center',
  },
  deviceTabletScreen: {
    width: 180,
    height: 240,
    backgroundColor: THEME.dark,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#2A2A35',
  },
  deviceTabletContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Phone Device
  devicePhone: {
    alignItems: 'center',
  },
  devicePhoneNotch: {
    width: 60,
    height: 20,
    backgroundColor: '#2A2A35',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  devicePhoneScreen: {
    width: 120,
    height: 240,
    backgroundColor: THEME.dark,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#2A2A35',
  },
  devicePhoneContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devicePhoneBar: {
    width: 40,
    height: 4,
    backgroundColor: '#2A2A35',
    borderRadius: 2,
    position: 'absolute',
    bottom: 8,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  deviceLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
  },
  // Platform Features
  platformFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  platformFeature: {
    width: 220,
    backgroundColor: THEME.text,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  platformFeatureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  platformFeatureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 4,
  },
  platformFeatureDesc: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  // Demo Walkthrough
  demoWalkthrough: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  demoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    position: 'relative',
  },
  demoStepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    zIndex: 2,
  },
  demoStepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.dark,
  },
  demoStepLine: {
    position: 'absolute',
    left: 19,
    top: 45,
    width: 2,
    height: 60,
    overflow: 'hidden',
  },
  demoStepLineProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  demoStepActive: {
    // Active step styling handled via className for CSS animations
  },
  demoStepContent: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  demoStepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 12,
  },
  demoStepFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  demoStepAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.darker,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  demoStepActionText: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  demoStepResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  demoStepResultText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Case Studies
  caseStudiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  caseStudiesGridMobile: {
    flexDirection: 'column',
  },
  caseStudyCard: {
    width: 360,
    backgroundColor: THEME.text,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  caseStudyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  caseStudyLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  caseStudyCompanyInfo: {
    flex: 1,
  },
  caseStudyCompany: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.dark,
  },
  caseStudyIndustry: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  caseStudyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  caseStudyLocationText: {
    fontSize: 12,
    color: THEME.textSubtle,
  },
  caseStudyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingVertical: 8,
    marginBottom: 20,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  caseStudyQuoteText: {
    fontSize: 14,
    color: THEME.textSubtle,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  caseStudyAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.dark,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.dark,
  },
  authorRole: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  caseStudyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  caseStudyMetric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  // Use Case Icon
  useCaseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  // Mobile First Section - New Design with Phone Mockup
  mobileFirstSection: {
    backgroundColor: THEME.lightBg,
    paddingVertical: 60,
    paddingHorizontal: 48,
  },
  mobileFirstInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    gap: 60,
  },
  phoneMockupContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  phoneMockup: {
    width: 220,
    height: 440,
    backgroundColor: THEME.dark,
    borderRadius: 36,
    padding: 8,
    borderWidth: 3,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },
  phoneNotch: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 24,
    backgroundColor: THEME.dark,
    borderRadius: 12,
    zIndex: 10,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneScreenText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  phoneGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
    bottom: -20,
  },
  mobileFirstTextContent: {
    flex: 1,
    maxWidth: 500,
  },
  mobileFirstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  mobileFirstBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mobileFirstHeadline: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.dark,
    marginBottom: 12,
  },
  mobileFirstSubheadline: {
    fontSize: 18,
    color: THEME.textMuted,
    marginBottom: 28,
    lineHeight: 28,
  },
  mobileFirstFeaturesList: {
    gap: 16,
    marginBottom: 24,
  },
  mobileFirstFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mobileFirstFeatureCheck: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFirstFeatureItemText: {
    fontSize: 16,
    color: THEME.dark,
    fontWeight: '500',
  },
  noHardwareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    gap: 8,
    alignSelf: 'flex-start',
  },
  noHardwareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C48C',
  },
});
