import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';

// Preset Units of Measure
const PRESET_UNITS = [
  { code: 'pcs', name: 'Pieces' },
  { code: 'kg', name: 'Kilograms' },
  { code: 'litre', name: 'Litres' },
  { code: 'box', name: 'Boxes' },
  { code: 'pack', name: 'Packs' },
  { code: 'metre', name: 'Metres' },
  { code: 'roll', name: 'Rolls' },
  { code: 'dozen', name: 'Dozen' },
  { code: 'bag', name: 'Bags' },
  { code: 'bottle', name: 'Bottles' },
];

export interface InventoryQuickStartConfig {
  defaultLocation: string;
  skuMode: 'auto' | 'manual';
  defaultUnit: string;
  setupComplete: boolean;
}

interface InventoryQuickStartWizardProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (config: InventoryQuickStartConfig) => void;
  onOpenAddItem: () => void;
}

const InventoryQuickStartWizard: React.FC<InventoryQuickStartWizardProps> = ({
  visible,
  onClose,
  onComplete,
  onOpenAddItem,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== 'web' || width < 768;
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'welcome' | 'custom'>('welcome');
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  
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
  
  // Quick Start - Auto-create default location and open Add Item
  const handleStartTrackingNow = async () => {
    setIsLoading(true);
    try {
      // Create default location "Main Store"
      try {
        await api.post('/inventory/locations', {
          name: 'Main Store',
          type: 'store',
          is_default: true,
        });
      } catch (e) {
        // Location might already exist, ignore error
        console.log('Default location may already exist');
      }
      
      // Complete with default config
      onComplete({
        defaultLocation: 'Main Store',
        skuMode: 'auto',
        defaultUnit: 'pcs',
        setupComplete: false, // Partial setup
      });
      
      // Close wizard and open Add Item modal
      handleClose();
      setTimeout(() => {
        onOpenAddItem();
      }, 300);
    } catch (error) {
      console.log('Quick start error:', error);
      // Still proceed even if location creation fails
      onComplete({
        defaultLocation: 'Main Store',
        skuMode: 'auto',
        defaultUnit: 'pcs',
        setupComplete: false,
      });
      handleClose();
      setTimeout(() => {
        onOpenAddItem();
      }, 300);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Custom Setup - Let user configure before starting
  const handleCustomSetup = async () => {
    setIsLoading(true);
    try {
      // Create default location
      try {
        await api.post('/inventory/locations', {
          name: 'Main Store',
          type: 'store',
          is_default: true,
        });
      } catch (e) {
        console.log('Default location may already exist');
      }
      
      onComplete({
        defaultLocation: 'Main Store',
        skuMode: 'auto',
        defaultUnit: selectedUnit,
        setupComplete: true,
      });
      
      handleClose();
    } catch (error) {
      console.log('Custom setup error:', error);
      onComplete({
        defaultLocation: 'Main Store',
        skuMode: 'auto',
        defaultUnit: selectedUnit,
        setupComplete: true,
      });
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!visible) return null;
  
  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.welcomeIcon}>
        <Ionicons name="cube-outline" size={64} color="#059669" />
      </View>
      
      <Text style={styles.welcomeTitle}>Welcome to Inventory!</Text>
      <Text style={styles.welcomeSubtitle}>
        Manage stock, suppliers, and warehouses easily.
      </Text>
      
      <View style={styles.optionCards}>
        {/* Quick Start Option - Recommended */}
        <TouchableOpacity 
          style={[styles.optionCard, styles.recommendedCard]}
          onPress={handleStartTrackingNow}
          disabled={isLoading}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
          </View>
          <View style={[styles.optionIconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="flash-outline" size={32} color="#059669" />
          </View>
          <Text style={styles.optionTitle}>Start Tracking Stock Now</Text>
          <Text style={styles.optionDescription}>
            Skip setup and start immediately. We'll create a default location for you.
          </Text>
          <View style={styles.optionFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Default location: Main Store</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Auto-generate SKU codes</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Ready in 10 seconds</Text>
            </View>
          </View>
          {isLoading && (
            <ActivityIndicator color="#059669" style={{ marginTop: 12 }} />
          )}
        </TouchableOpacity>
        
        {/* Custom Setup Option */}
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setStep('custom')}
          disabled={isLoading}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="settings-outline" size={32} color="#6B7280" />
          </View>
          <Text style={styles.optionTitle}>Custom Setup</Text>
          <Text style={styles.optionDescription}>
            Configure your preferred unit of measure before starting.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderCustomStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Quick Setup</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.setupInfo}>
        <View style={styles.setupInfoRow}>
          <Ionicons name="location-outline" size={20} color="#059669" />
          <View style={styles.setupInfoText}>
            <Text style={styles.setupInfoLabel}>Default Location</Text>
            <Text style={styles.setupInfoValue}>Main Store</Text>
          </View>
        </View>
        <View style={styles.setupInfoRow}>
          <Ionicons name="barcode-outline" size={20} color="#059669" />
          <View style={styles.setupInfoText}>
            <Text style={styles.setupInfoLabel}>SKU Mode</Text>
            <Text style={styles.setupInfoValue}>Auto-generate</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.sectionLabel}>Default Unit of Measure</Text>
      <Text style={styles.sectionHint}>Select your most commonly used unit</Text>
      
      <View style={styles.unitsGrid}>
        {PRESET_UNITS.map((unit) => (
          <TouchableOpacity
            key={unit.code}
            style={[
              styles.unitOption,
              selectedUnit === unit.code && styles.unitOptionActive
            ]}
            onPress={() => setSelectedUnit(unit.code)}
          >
            <Text style={[
              styles.unitOptionText,
              selectedUnit === unit.code && styles.unitOptionTextActive
            ]}>
              {unit.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={handleCustomSetup}
          disabled={isLoading}
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
          onPress={handleStartTrackingNow}
          disabled={isLoading}
        >
          <Text style={styles.skipBtnText}>Skip for now, start tracking</Text>
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
      {step === 'custom' && renderCustomStep()}
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
    zIndex: 1000,
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
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#059669',
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
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  setupInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  setupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setupInfoText: {
    flex: 1,
  },
  setupInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  setupInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unitOptionActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  unitOptionTextActive: {
    color: '#059669',
    fontWeight: '600',
  },
  bottomActions: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
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

export default InventoryQuickStartWizard;
