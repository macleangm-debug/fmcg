import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
  success: '#00C48C',
};

// Available products for trial
const TRIAL_PRODUCTS = [
  {
    id: 'retail_pro',
    name: 'RetailPro',
    tagline: 'Complete Retail Management',
    icon: 'storefront-outline',
    color: '#3B82F6',
    dashboardRoute: '/(tabs)/dashboard',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    icon: 'cube-outline',
    color: '#10B981',
    dashboardRoute: '/inventory',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    dashboardRoute: '/invoicing',
  },
  {
    id: 'bulk_sms',
    name: 'UniTxt',
    tagline: 'Mass Communication',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    dashboardRoute: '/unitxt',
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Rewards',
    icon: 'heart-outline',
    color: '#EC4899',
    dashboardRoute: '/loyalty',
  },
];

interface GeneralTrialModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GeneralTrialModal({ visible, onClose }: GeneralTrialModalProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedProduct, setSelectedProduct] = useState<typeof TRIAL_PRODUCTS[0] | null>(null);

  const handleProductSelect = (product: typeof TRIAL_PRODUCTS[0]) => {
    setSelectedProduct(product);
  };

  const handleStartTrial = () => {
    if (!selectedProduct) return;
    
    if (!isAuthenticated) {
      // Close modal and redirect to login with product context
      onClose();
      router.push('/(auth)/login');
      return;
    }
    
    // Navigate to product page to complete signup
    onClose();
    router.push(`/products/${selectedProduct.id.replace('_', '-')}` as any);
  };

  if (!isWeb) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <LinearGradient
                colors={[THEME.primary, THEME.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <Ionicons name="rocket" size={24} color={THEME.dark} />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Start Your Free Trial</Text>
                <Text style={styles.headerSubtitle}>14 days free, no credit card required</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Product Selection */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Choose a product to try:</Text>
            
            <View style={styles.productGrid}>
              {TRIAL_PRODUCTS.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard,
                    selectedProduct?.id === product.id && [
                      styles.productCardSelected,
                      { borderColor: product.color },
                    ],
                  ]}
                  onPress={() => handleProductSelect(product)}
                  data-testid={`trial-product-${product.id}`}
                >
                  <View style={[styles.productIcon, { backgroundColor: `${product.color}20` }]}>
                    <Ionicons name={product.icon as any} size={24} color={product.color} />
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productTagline}>{product.tagline}</Text>
                  {selectedProduct?.id === product.id && (
                    <View style={[styles.selectedCheck, { backgroundColor: product.color }]}>
                      <Ionicons name="checkmark" size={14} color={THEME.text} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Benefits */}
            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={THEME.success} />
                <Text style={styles.benefitText}>Full access to all features</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={THEME.success} />
                <Text style={styles.benefitText}>No credit card required</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={THEME.success} />
                <Text style={styles.benefitText}>Cancel anytime</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.startBtn,
                !selectedProduct && styles.startBtnDisabled,
              ]}
              onPress={handleStartTrial}
              disabled={!selectedProduct}
              data-testid="start-trial-btn"
            >
              <LinearGradient
                colors={selectedProduct ? [selectedProduct.color, THEME.secondary] : ['#555', '#444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtnGradient}
              >
                <Text style={styles.startBtnText}>
                  {isAuthenticated ? 'Start Free Trial' : 'Sign Up & Start Trial'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={THEME.text} />
              </LinearGradient>
            </TouchableOpacity>
            {!isAuthenticated && (
              <Text style={styles.loginHint}>
                Already have an account?{' '}
                <Text 
                  style={styles.loginLink}
                  onPress={() => {
                    onClose();
                    router.push('/(auth)/login');
                  }}
                >
                  Sign in
                </Text>
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: THEME.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  productCard: {
    width: '48%',
    backgroundColor: THEME.darker,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  productCardSelected: {
    backgroundColor: `${THEME.primary}10`,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  productTagline: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  selectedCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefits: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: THEME.text,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    alignItems: 'center',
  },
  startBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  loginHint: {
    marginTop: 16,
    fontSize: 14,
    color: THEME.textMuted,
  },
  loginLink: {
    color: THEME.primary,
    fontWeight: '600',
  },
});
