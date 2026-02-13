import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  accent: '#10B981',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  cardHover: '#1A1A25',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface InteractiveDemoProps {
  visible: boolean;
  onClose: () => void;
  onStartTrial?: () => void;
}

// Demo screens representing different parts of the app
const DEMO_SCREENS = [
  {
    id: 'welcome',
    title: 'Welcome to Software Galaxy',
    subtitle: 'Your all-in-one business management platform',
    description: 'Explore our unified ecosystem of apps designed to help African businesses grow.',
    icon: 'planet',
    color: '#00D4FF',
    features: [
      { icon: 'storefront', label: 'RetailPro - Point of Sale' },
      { icon: 'cube', label: 'Inventory Management' },
      { icon: 'document-text', label: 'Professional Invoicing' },
      { icon: 'chatbubbles', label: 'Bulk SMS Marketing' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Powerful Dashboard',
    subtitle: 'Real-time insights at a glance',
    description: 'Monitor sales, inventory, and customer activity in real-time. Make data-driven decisions.',
    icon: 'analytics',
    color: '#3B82F6',
    mockData: {
      todaySales: '$4,250',
      totalOrders: '127',
      lowStock: '5',
      customers: '89',
    },
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    subtitle: 'Fast and intuitive checkout',
    description: 'Process sales in seconds. Accept cash, cards, and mobile money. Works offline too!',
    icon: 'cart',
    color: '#10B981',
    mockCart: [
      { name: 'Premium Coffee Beans', qty: 2, price: 24.99 },
      { name: 'Organic Honey', qty: 1, price: 12.50 },
      { name: 'Dark Chocolate Bar', qty: 3, price: 4.99 },
    ],
  },
  {
    id: 'inventory',
    title: 'Smart Inventory',
    subtitle: 'Never run out of stock',
    description: 'Real-time stock tracking, low stock alerts, and automatic reorder points.',
    icon: 'cube',
    color: '#8B5CF6',
    mockInventory: [
      { name: 'Coffee Beans', stock: 45, status: 'good' },
      { name: 'Tea Leaves', stock: 8, status: 'low' },
      { name: 'Sugar 1kg', stock: 120, status: 'good' },
      { name: 'Milk 500ml', stock: 3, status: 'critical' },
    ],
  },
  {
    id: 'reports',
    title: 'Business Reports',
    subtitle: 'Data that drives growth',
    description: 'Sales trends, profit margins, best sellers, and customer insights - all automated.',
    icon: 'bar-chart',
    color: '#F59E0B',
    mockChart: true,
  },
  {
    id: 'getstarted',
    title: 'Ready to Get Started?',
    subtitle: 'Join 50,000+ African businesses',
    description: 'Start your free 14-day trial. No credit card required. Cancel anytime.',
    icon: 'rocket',
    color: '#EC4899',
    cta: true,
  },
];

export default function InteractiveDemo({ visible, onClose, onStartTrial }: InteractiveDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  
  const isMobile = width < 768;
  const currentScreen = DEMO_SCREENS[currentStep];
  const totalSteps = DEMO_SCREENS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const animateTransition = (direction: 'next' | 'prev') => {
    setIsAnimating(true);
    
    // Fade out and slide
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'next' ? -50 : 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change step
      if (direction === 'next' && currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else if (direction === 'prev' && currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
      
      // Reset position and fade in
      slideAnim.setValue(direction === 'next' ? 50 : -50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsAnimating(false));
    });
  };

  const handleNext = () => {
    if (!isAnimating && currentStep < totalSteps - 1) {
      animateTransition('next');
    }
  };

  const handlePrev = () => {
    if (!isAnimating && currentStep > 0) {
      animateTransition('prev');
    }
  };

  const handleDotPress = (index: number) => {
    if (!isAnimating && index !== currentStep) {
      const direction = index > currentStep ? 'next' : 'prev';
      setIsAnimating(true);
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(index);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => setIsAnimating(false));
      });
    }
  };

  const renderScreenContent = () => {
    switch (currentScreen.id) {
      case 'welcome':
        return (
          <View style={styles.contentSection}>
            <View style={styles.featuresGrid}>
              {currentScreen.features?.map((feature, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.featureCard,
                    { 
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: `${currentScreen.color}20` }]}>
                    <Ionicons name={feature.icon as any} size={24} color={currentScreen.color} />
                  </View>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </Animated.View>
              ))}
            </View>
          </View>
        );

      case 'dashboard':
        return (
          <View style={styles.contentSection}>
            <View style={styles.mockDashboard}>
              {Object.entries(currentScreen.mockData || {}).map(([key, value], idx) => (
                <View key={idx} style={styles.dashboardCard}>
                  <Text style={styles.dashboardValue}>{value}</Text>
                  <Text style={styles.dashboardLabel}>
                    {key === 'todaySales' ? "Today's Sales" : 
                     key === 'totalOrders' ? 'Total Orders' :
                     key === 'lowStock' ? 'Low Stock Items' : 'New Customers'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'pos':
        return (
          <View style={styles.contentSection}>
            <View style={styles.mockPOS}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>Current Cart</Text>
                <Text style={styles.cartCount}>{currentScreen.mockCart?.length} items</Text>
              </View>
              {currentScreen.mockCart?.map((item, idx) => (
                <View key={idx} style={styles.cartItem}>
                  <View style={styles.cartItemLeft}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemQty}>Qty: {item.qty}</Text>
                  </View>
                  <Text style={styles.cartItemPrice}>${(item.qty * item.price).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalLabel}>Total</Text>
                <Text style={styles.cartTotalValue}>
                  ${currentScreen.mockCart?.reduce((sum, item) => sum + (item.qty * item.price), 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentBtns}>
                <View style={[styles.paymentBtn, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="cash-outline" size={20} color="#10B981" />
                  <Text style={[styles.paymentBtnText, { color: '#10B981' }]}>Cash</Text>
                </View>
                <View style={[styles.paymentBtn, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="card-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.paymentBtnText, { color: '#3B82F6' }]}>Card</Text>
                </View>
                <View style={[styles.paymentBtn, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.paymentBtnText, { color: '#F59E0B' }]}>M-Pesa</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'inventory':
        return (
          <View style={styles.contentSection}>
            <View style={styles.mockInventory}>
              {currentScreen.mockInventory?.map((item, idx) => (
                <View key={idx} style={styles.inventoryItem}>
                  <View style={styles.inventoryLeft}>
                    <View style={[styles.inventoryIcon, { 
                      backgroundColor: item.status === 'critical' ? '#EF444420' : 
                                       item.status === 'low' ? '#F59E0B20' : '#10B98120' 
                    }]}>
                      <Ionicons 
                        name="cube-outline" 
                        size={18} 
                        color={item.status === 'critical' ? '#EF4444' : 
                               item.status === 'low' ? '#F59E0B' : '#10B981'} 
                      />
                    </View>
                    <View>
                      <Text style={styles.inventoryName}>{item.name}</Text>
                      <Text style={styles.inventoryStock}>{item.stock} in stock</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: item.status === 'critical' ? '#EF444420' : 
                                     item.status === 'low' ? '#F59E0B20' : '#10B98120' 
                  }]}>
                    <Text style={[styles.statusText, { 
                      color: item.status === 'critical' ? '#EF4444' : 
                             item.status === 'low' ? '#F59E0B' : '#10B981' 
                    }]}>
                      {item.status === 'critical' ? 'Critical' : 
                       item.status === 'low' ? 'Low Stock' : 'In Stock'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );

      case 'reports':
        return (
          <View style={styles.contentSection}>
            <View style={styles.mockReports}>
              <Text style={styles.reportTitle}>Sales This Week</Text>
              <View style={styles.chartBars}>
                {[65, 40, 80, 55, 90, 70, 85].map((height, idx) => (
                  <View key={idx} style={styles.chartBarContainer}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { height: height, backgroundColor: idx === 6 ? '#00D4FF' : '#00D4FF40' }
                      ]} 
                    />
                    <Text style={styles.chartLabel}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.reportStats}>
                <View style={styles.reportStat}>
                  <Text style={styles.reportStatValue}>$28,450</Text>
                  <Text style={styles.reportStatLabel}>This Week</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={[styles.reportStatValue, { color: '#10B981' }]}>+23%</Text>
                  <Text style={styles.reportStatLabel}>Growth</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'getstarted':
        return (
          <View style={styles.contentSection}>
            <View style={styles.ctaSection}>
              <View style={styles.ctaBenefits}>
                {[
                  '14-day free trial',
                  'No credit card required',
                  'Full access to all features',
                  'Cancel anytime',
                ].map((benefit, idx) => (
                  <View key={idx} style={styles.ctaBenefit}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.ctaBenefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  onClose();
                  onStartTrial?.();
                }}
                data-testid="demo-start-trial-btn"
              >
                <LinearGradient
                  colors={['#00D4FF', '#7B61FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButtonGradient}
                >
                  <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (!isWeb) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, isMobile && styles.modalMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentScreen.color}20` }]}>
                <Ionicons name={currentScreen.icon as any} size={24} color={currentScreen.color} />
              </View>
              <View>
                <Text style={styles.stepIndicator}>Step {currentStep + 1} of {totalSteps}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: currentScreen.color }]} />
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} data-testid="interactive-demo-close">
              <Ionicons name="close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentInner}>
            <Animated.View
              style={[
                styles.animatedContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {/* Screen Title */}
              <View style={styles.titleSection}>
                <Text style={styles.title}>{currentScreen.title}</Text>
                <Text style={styles.subtitle}>{currentScreen.subtitle}</Text>
                <Text style={styles.description}>{currentScreen.description}</Text>
              </View>

              {/* Dynamic Content */}
              {renderScreenContent()}
            </Animated.View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Navigation Dots */}
            <View style={styles.dots}>
              {DEMO_SCREENS.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dot,
                    idx === currentStep && styles.dotActive,
                    { backgroundColor: idx === currentStep ? currentScreen.color : THEME.border },
                  ]}
                  onPress={() => handleDotPress(idx)}
                />
              ))}
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnPrev, currentStep === 0 && styles.navBtnDisabled]}
                onPress={handlePrev}
                disabled={currentStep === 0 || isAnimating}
              >
                <Ionicons name="arrow-back" size={20} color={currentStep === 0 ? THEME.textMuted : THEME.text} />
                <Text style={[styles.navBtnText, currentStep === 0 && styles.navBtnTextDisabled]}>Previous</Text>
              </TouchableOpacity>

              {currentStep < totalSteps - 1 ? (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navBtnNext, { backgroundColor: currentScreen.color }]}
                  onPress={handleNext}
                  disabled={isAnimating}
                >
                  <Text style={styles.navBtnTextNext}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color={THEME.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navBtnNext, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    onClose();
                    onStartTrial?.();
                  }}
                >
                  <Text style={styles.navBtnTextNext}>Get Started</Text>
                  <Ionicons name="rocket" size={20} color={THEME.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    backgroundColor: THEME.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalMobile: {
    maxWidth: '100%',
    maxHeight: '95%',
    borderRadius: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 6,
  },
  progressBarContainer: {
    width: 100,
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.darker,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    padding: 24,
  },
  animatedContent: {
    flex: 1,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: THEME.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: THEME.textMuted,
    lineHeight: 22,
  },
  contentSection: {
    marginTop: 8,
  },
  // Welcome Screen
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: THEME.cardHover,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  // Dashboard Screen
  mockDashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: THEME.cardHover,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  dashboardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
  },
  dashboardLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
  // POS Screen
  mockPOS: {
    backgroundColor: THEME.cardHover,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  cartCount: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  cartItemLeft: {},
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text,
  },
  cartItemQty: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
  },
  cartTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  cartTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.primary,
  },
  paymentBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  paymentBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Inventory Screen
  mockInventory: {
    gap: 10,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.cardHover,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  inventoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inventoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  inventoryStock: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Reports Screen
  mockReports: {
    backgroundColor: THEME.cardHover,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 20,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 8,
  },
  chartBarContainer: {
    alignItems: 'center',
    gap: 6,
  },
  chartBar: {
    width: 30,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  reportStat: {
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
  },
  reportStatLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
  // CTA Screen
  ctaSection: {
    alignItems: 'center',
  },
  ctaBenefits: {
    gap: 12,
    marginBottom: 24,
  },
  ctaBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaBenefitText: {
    fontSize: 15,
    color: THEME.text,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.text,
  },
  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  navBtnPrev: {
    backgroundColor: THEME.cardHover,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  navBtnNext: {
    backgroundColor: THEME.primary,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  navBtnTextDisabled: {
    color: THEME.textMuted,
  },
  navBtnTextNext: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
});
