import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Country auto-detection utility
const detectCountryFromTimezone = (): { countryCode: string; currency: string; currencySymbol: string } => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryMap: Record<string, { countryCode: string; currency: string; currencySymbol: string }> = {
      'Africa/Dar_es_Salaam': { countryCode: 'TZ', currency: 'TZS', currencySymbol: 'TSh' },
      'Africa/Nairobi': { countryCode: 'KE', currency: 'KES', currencySymbol: 'KSh' },
      'Africa/Kampala': { countryCode: 'UG', currency: 'UGX', currencySymbol: 'USh' },
      'Africa/Lagos': { countryCode: 'NG', currency: 'NGN', currencySymbol: '₦' },
      'Africa/Johannesburg': { countryCode: 'ZA', currency: 'ZAR', currencySymbol: 'R' },
      'Africa/Accra': { countryCode: 'GH', currency: 'GHS', currencySymbol: 'GH₵' },
      'America/New_York': { countryCode: 'US', currency: 'USD', currencySymbol: '$' },
      'America/Los_Angeles': { countryCode: 'US', currency: 'USD', currencySymbol: '$' },
      'Europe/London': { countryCode: 'GB', currency: 'GBP', currencySymbol: '£' },
      'Asia/Dubai': { countryCode: 'AE', currency: 'AED', currencySymbol: 'AED' },
    };
    
    // Find matching timezone or default
    for (const [tz, config] of Object.entries(countryMap)) {
      if (timezone.includes(tz.split('/')[1]) || timezone === tz) {
        return config;
      }
    }
    
    // Default to Tanzania
    return { countryCode: 'TZ', currency: 'TZS', currencySymbol: 'TSh' };
  } catch {
    return { countryCode: 'TZ', currency: 'TZS', currencySymbol: 'TSh' };
  }
};

// Sample products for quick start
const SAMPLE_PRODUCTS = [
  { name: 'Product A', price: 5000, sku: 'SKU001' },
  { name: 'Product B', price: 10000, sku: 'SKU002' },
  { name: 'Product C', price: 15000, sku: 'SKU003' },
  { name: 'Product D', price: 2500, sku: 'SKU004' },
];

interface QuickStartWizardProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (config: QuickStartConfig) => void;
  isNewBusiness: boolean;
}

export interface QuickStartConfig {
  businessName: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  addSampleProducts: boolean;
  setupComplete: boolean;
}

type QuickStartStep = 'welcome' | 'business' | 'ready';

const QuickStartWizard: React.FC<QuickStartWizardProps> = ({
  visible,
  onClose,
  onComplete,
  isNewBusiness,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== 'web' || width < 768;
  
  const [step, setStep] = useState<QuickStartStep>('welcome');
  const [businessName, setBusinessName] = useState('');
  const [detectedConfig, setDetectedConfig] = useState(detectCountryFromTimezone());
  const [addSampleProducts, setAddSampleProducts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    if (visible && isMobile) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, isMobile, height]);
  
  const handleClose = () => {
    if (isMobile) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      onClose();
    }
  };
  
  const handleSkipToSelling = () => {
    setIsLoading(true);
    // Use defaults and start immediately
    setTimeout(() => {
      onComplete({
        businessName: businessName || 'My Business',
        ...detectedConfig,
        addSampleProducts: true,
        setupComplete: false, // Partial setup, will prompt later
      });
    }, 500);
  };
  
  const handleCompleteSetup = () => {
    setIsLoading(true);
    setTimeout(() => {
      onComplete({
        businessName: businessName || 'My Business',
        ...detectedConfig,
        addSampleProducts,
        setupComplete: true,
      });
    }, 500);
  };
  
  if (!visible) return null;
  
  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.welcomeIcon}>
        <Ionicons name="storefront-outline" size={64} color="#2563EB" />
      </View>
      
      <Text style={styles.welcomeTitle}>Welcome to RetailPro!</Text>
      <Text style={styles.welcomeSubtitle}>
        Let's get you selling in under 60 seconds
      </Text>
      
      <View style={styles.detectedInfo}>
        <View style={styles.detectedRow}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <Text style={styles.detectedText}>
            Detected: {detectedConfig.countryCode} ({detectedConfig.currencySymbol})
          </Text>
          <TouchableOpacity style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.optionCards}>
        {/* Quick Start Option */}
        <TouchableOpacity 
          style={[styles.optionCard, styles.recommendedCard]}
          onPress={handleSkipToSelling}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
          </View>
          <View style={styles.optionIconContainer}>
            <Ionicons name="flash-outline" size={32} color="#2563EB" />
          </View>
          <Text style={styles.optionTitle}>Start Selling Now</Text>
          <Text style={styles.optionDescription}>
            Skip setup and start immediately with sample products. You can customize everything later.
          </Text>
          <View style={styles.optionFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Sample products added</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Auto-detected currency</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Ready in 10 seconds</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Custom Setup Option */}
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setStep('business')}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="settings-outline" size={32} color="#6B7280" />
          </View>
          <Text style={styles.optionTitle}>Custom Setup</Text>
          <Text style={styles.optionDescription}>
            Set your business name and preferences before starting.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderBusinessStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Quick Setup</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <Text style={styles.inputLabel}>What's your business name?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., John's Store, ABC Supermarket"
        placeholderTextColor="#9CA3AF"
        value={businessName}
        onChangeText={setBusinessName}
        autoFocus
      />
      
      <View style={styles.detectedInfoSection}>
        <Text style={styles.sectionLabel}>Auto-detected Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Country: {detectedConfig.countryCode}</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="cash-outline" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Currency: {detectedConfig.currency} ({detectedConfig.currencySymbol})</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Sample Products Toggle */}
      <TouchableOpacity 
        style={styles.sampleToggle}
        onPress={() => setAddSampleProducts(!addSampleProducts)}
      >
        <View style={[styles.checkbox, addSampleProducts && styles.checkboxChecked]}>
          {addSampleProducts && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <View style={styles.sampleToggleContent}>
          <Text style={styles.sampleToggleTitle}>Add sample products to try</Text>
          <Text style={styles.sampleToggleSubtitle}>
            4 sample products to help you explore the system
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={[styles.primaryBtn, !businessName && styles.primaryBtnDisabled]}
          onPress={handleCompleteSetup}
          disabled={!businessName || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Complete Setup</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipBtn}
          onPress={handleSkipToSelling}
        >
          <Text style={styles.skipBtnText}>Skip for now, start selling</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const content = (
    <ScrollView 
      style={styles.scrollContent}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      {step === 'welcome' && renderWelcomeStep()}
      {step === 'business' && renderBusinessStep()}
    </ScrollView>
  );
  
  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View 
          style={[
            styles.mobileSheet,
            { 
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom,
            }
          ]}
        >
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          {content}
        </Animated.View>
      </View>
    );
  }
  
  // Desktop: Centered modal
  return (
    <View style={styles.desktopOverlay}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.desktopModal}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
        {content}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mobileSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '70%',
  },
  desktopOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 520,
    maxWidth: '90%',
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 24,
    paddingTop: 40,
  },
  stepContent: {
    flex: 1,
  },
  welcomeIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  detectedInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectedText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  optionCards: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  recommendedCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  optionFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn: {
    padding: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  detectedInfoSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    color: '#374151',
  },
  editText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  sampleToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 32,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sampleToggleContent: {
    flex: 1,
  },
  sampleToggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  sampleToggleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomActions: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});

export default QuickStartWizard;
