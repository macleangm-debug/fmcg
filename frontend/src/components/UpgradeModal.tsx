/**
 * Upgrade Modal Component
 * Shows upgrade options when trial is expiring or expired
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  savings?: string;
}

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
  productIcon: keyof typeof Ionicons.glyphMap;
  productColor: string;
  daysRemaining?: number;
  onSelectPlan: (planId: string) => Promise<void>;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    currency: 'USD',
    period: 'monthly',
    features: [
      'Up to 100 transactions/month',
      'Basic analytics',
      'Email support',
      'Single user',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 24.99,
    currency: 'USD',
    period: 'monthly',
    features: [
      'Unlimited transactions',
      'Advanced analytics',
      'Priority support',
      'Up to 5 users',
      'API access',
      'Custom reports',
    ],
    popular: true,
  },
  {
    id: 'professional_yearly',
    name: 'Professional',
    price: 249.99,
    currency: 'USD',
    period: 'yearly',
    features: [
      'Everything in Professional',
      'Save 17% ($50/year)',
      'Dedicated account manager',
      'Unlimited users',
    ],
    savings: 'Save $50/year',
  },
];

export default function UpgradeModal({
  visible,
  onClose,
  productName,
  productIcon,
  productColor,
  daysRemaining,
  onSelectPlan,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isExpired = daysRemaining !== undefined && daysRemaining <= 0;
  const isExpiring = daysRemaining !== undefined && daysRemaining <= 3;

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a plan to continue.');
      return;
    }

    setLoading(true);
    try {
      await onSelectPlan(selectedPlan);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to process upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.productIcon, { backgroundColor: productColor + '20' }]}>
              <Ionicons name={productIcon} size={32} color={productColor} />
            </View>
            <Text style={styles.title}>
              {isExpired ? 'Trial Expired' : 'Upgrade'} {productName}
            </Text>
            <Text style={styles.subtitle}>
              {isExpired
                ? 'Your free trial has ended. Choose a plan to continue.'
                : isExpiring
                ? `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left! Upgrade now to keep your data.`
                : 'Choose a plan that works for you'}
            </Text>
            
            {!isExpired && (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Plans */}
          <ScrollView style={styles.plansContainer} showsVerticalScrollIndicator={false}>
            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.popular && styles.planCardPopular,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.7}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                
                {plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currency}>{plan.currency}</Text>
                    <Text style={styles.price}>{plan.price}</Text>
                    <Text style={styles.period}>/{plan.period === 'yearly' ? 'year' : 'mo'}</Text>
                  </View>
                </View>
                
                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={18} 
                        color={selectedPlan === plan.id ? '#10B981' : '#9CA3AF'} 
                      />
                      <Text style={[
                        styles.featureText,
                        selectedPlan === plan.id && styles.featureTextSelected,
                      ]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {selectedPlan === plan.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.upgradeButton, !selectedPlan && styles.upgradeButtonDisabled]}
              onPress={handleUpgrade}
              disabled={loading || !selectedPlan}
            >
              <LinearGradient
                colors={selectedPlan ? ['#10B981', '#059669'] : ['#9CA3AF', '#6B7280']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="rocket" size={20} color="#FFFFFF" />
                    <Text style={styles.upgradeButtonText}>
                      {selectedPlan ? 'Upgrade Now' : 'Select a Plan'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {!isExpired && (
              <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
            
            <Text style={styles.secureText}>
              <Ionicons name="shield-checkmark" size={12} color="#9CA3AF" />
              {' '}Secure payment powered by Stripe
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  planCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  planCardPopular: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  featureTextSelected: {
    color: '#111827',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  secureText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
