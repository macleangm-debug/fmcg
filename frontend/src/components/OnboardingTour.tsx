import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../store/onboardingStore';

type UserRole = 'admin' | 'manager' | 'sales_staff';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  roles: UserRole[];
  tip?: string;
}

interface OnboardingTourProps {
  visible: boolean;
  onClose: () => void;
  userRole: UserRole;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RetailPro!',
    description: 'Let\'s take a quick tour to help you get started with managing your retail business efficiently.',
    icon: 'sparkles',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'This is your command center. View today\'s sales, orders, customers, and inventory at a glance. Low stock alerts will appear here automatically.',
    icon: 'grid-outline',
    route: '/(tabs)/dashboard',
    roles: ['admin', 'manager', 'sales_staff'],
    tip: 'Check your dashboard daily to stay on top of your business!',
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    description: 'Process sales quickly! Browse products, add to cart, select payment method, and complete transactions in seconds.',
    icon: 'cart-outline',
    route: '/(tabs)/cart',
    roles: ['admin', 'manager', 'sales_staff'],
    tip: 'Use the search bar to find products faster during busy hours.',
  },
  {
    id: 'products',
    title: 'Product Catalog',
    description: 'Browse your entire product inventory. On mobile, tap any product to see details or add it to a sale.',
    icon: 'cube-outline',
    route: '/(tabs)/products',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'orders',
    title: 'Order History',
    description: 'View all transactions, filter by date, and access detailed receipts. Perfect for tracking sales and handling customer inquiries.',
    icon: 'receipt-outline',
    route: '/(tabs)/orders',
    roles: ['admin', 'manager', 'sales_staff'],
    tip: 'Use date filters to quickly find specific transactions.',
  },
  {
    id: 'customers',
    title: 'Customer Management',
    description: 'Build relationships! Add customers, track their purchase history, and identify your best buyers.',
    icon: 'people-outline',
    route: '/(tabs)/customers',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'admin_products',
    title: 'Product Management',
    description: 'Add new products, update prices, manage variants (sizes, colors), and organize by categories.',
    icon: 'cube-outline',
    route: '/admin/products',
    roles: ['admin', 'manager'],
    tip: 'Set low stock thresholds to get automatic alerts before running out.',
  },
  {
    id: 'inventory',
    title: 'Stock Control',
    description: 'Monitor inventory levels, record stock arrivals, and track all movements. Never run out of popular items!',
    icon: 'layers-outline',
    route: '/admin/stock',
    roles: ['admin', 'manager'],
  },
  {
    id: 'expenses',
    title: 'Expense Tracking',
    description: 'Record business expenses by category. Track rent, utilities, supplies, and more for accurate profit calculations.',
    icon: 'wallet-outline',
    route: '/admin/expenses',
    roles: ['admin', 'manager'],
  },
  {
    id: 'promotions',
    title: 'Promotions',
    description: 'Create discounts and special offers. Set percentage or fixed discounts, define validity periods, and boost your sales!',
    icon: 'pricetag-outline',
    route: '/admin/promotions',
    roles: ['admin', 'manager'],
  },
  {
    id: 'staff',
    title: 'Team Management',
    description: 'Add staff members and assign roles. Control who can access which features to keep your business secure.',
    icon: 'person-outline',
    route: '/admin/staff',
    roles: ['admin'],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Customize your business profile, set currency, configure tax rates, and personalize your receipts.',
    icon: 'settings-outline',
    route: '/admin/settings',
    roles: ['admin'],
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You\'ve completed the tour! Remember, you can always access Help from the floating button or your profile menu. Happy selling!',
    icon: 'checkmark-circle',
    roles: ['admin', 'manager', 'sales_staff'],
  },
];

export default function OnboardingTour({ visible, onClose, userRole }: OnboardingTourProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const router = useRouter();
  const { markTourAsSeen, completeStep } = useOnboardingStore();
  
  const filteredSteps = TOUR_STEPS.filter(step => step.roles.includes(userRole));
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  const currentStep = filteredSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === filteredSteps.length - 1;
  const progress = ((currentStepIndex + 1) / filteredSteps.length) * 100;

  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
    }
  }, [visible]);

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const handleNext = () => {
    completeStep(currentStep.id);
    
    if (isLastStep) {
      markTourAsSeen();
      onClose();
    } else {
      animateTransition(() => {
        setCurrentStepIndex(prev => prev + 1);
      });
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      animateTransition(() => {
        setCurrentStepIndex(prev => prev - 1);
      });
    }
  };

  const handleSkip = () => {
    markTourAsSeen();
    onClose();
  };

  const handleTryIt = () => {
    if (currentStep.route) {
      onClose();
      setTimeout(() => {
        router.push(currentStep.route as any);
      }, 300);
    }
  };

  const getIconColor = () => {
    if (currentStep.id === 'welcome') return '#8B5CF6';
    if (currentStep.id === 'complete') return '#10B981';
    return '#2563EB';
  };

  const getIconBgColor = () => {
    if (currentStep.id === 'welcome') return '#F3E8FF';
    if (currentStep.id === 'complete') return '#D1FAE5';
    return '#DBEAFE';
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isWeb && styles.containerWeb]}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentStepIndex + 1} of {filteredSteps.length}
            </Text>
          </View>

          {/* Content */}
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={[styles.iconContainer, { backgroundColor: getIconBgColor() }]}>
              <Ionicons name={currentStep.icon} size={48} color={getIconColor()} />
            </View>

            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.description}>{currentStep.description}</Text>

            {currentStep.tip && (
              <View style={styles.tipContainer}>
                <Ionicons name="bulb-outline" size={18} color="#D97706" />
                <Text style={styles.tipText}>{currentStep.tip}</Text>
              </View>
            )}

            {currentStep.route && !isFirstStep && !isLastStep && (
              <TouchableOpacity style={styles.tryItButton} onPress={handleTryIt}>
                <Ionicons name="open-outline" size={18} color="#2563EB" />
                <Text style={styles.tryItText}>Go there now</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {!isFirstStep ? (
              <Pressable style={styles.navButton} onPress={handlePrevious}>
                <Ionicons name="chevron-back" size={20} color="#6B7280" />
                <Text style={styles.navButtonText}>Back</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip Tour</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.nextButton, isLastStep && styles.finishButton]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              {!isLastStep && (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {/* Step dots */}
          <View style={styles.dotsContainer}>
            {filteredSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStepIndex && styles.activeDot,
                  index < currentStepIndex && styles.completedDot,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  containerWeb: {
    maxWidth: 480,
    padding: 32,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  tryItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  tryItText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  finishButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 28,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    backgroundColor: '#2563EB',
    width: 24,
  },
  completedDot: {
    backgroundColor: '#93C5FD',
  },
});
