import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface MobileMoneyProvider {
  id: string;
  name: string;
  country: string;
  currency: string;
  min_amount: number;
  max_amount: number;
  prefixes: string[];
}

export default function MobileMoneyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<MobileMoneyProvider[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  
  // Payment form
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/kwikpay/mobile-money/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data?.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleInitiatePayment = async () => {
    if (!phone || !amount) {
      Alert.alert('Error', 'Please enter phone number and amount');
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/kwikpay/mobile-money/initiate', {
        phone: phone.startsWith('+') ? phone : `+255${phone.replace(/^0/, '')}`,
        amount: parseFloat(amount),
        currency: 'TZS',
        description: description || 'Payment',
        provider: selectedProvider?.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPaymentResult(response.data);
      Alert.alert('Success', 'Payment request sent! Customer will receive a prompt on their phone.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-TZ').format(value);
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'mpesa': return 'phone-portrait';
      case 'tigo_pesa': return 'wallet';
      case 'airtel_money': return 'cash';
      case 'halopesa': return 'card';
      default: return 'cash';
    }
  };

  const getProviderColor = (id: string) => {
    switch (id) {
      case 'mpesa': return '#E60000';
      case 'tigo_pesa': return '#00377B';
      case 'airtel_money': return '#FF0000';
      case 'halopesa': return '#FF6600';
      default: return COLORS.primary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading providers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Mobile Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProviders} />}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Accept payments via M-Pesa, Tigo Pesa, Airtel Money, and Halopesa. 
            Customers receive a USSD prompt on their phone to confirm payment.
          </Text>
        </View>

        {/* Quick Pay Button */}
        <TouchableOpacity
          style={styles.quickPayButton}
          onPress={() => {
            setSelectedProvider(null);
            setShowPaymentModal(true);
          }}
        >
          <View style={styles.quickPayIcon}>
            <Ionicons name="flash" size={28} color={COLORS.white} />
          </View>
          <View style={styles.quickPayContent}>
            <Text style={styles.quickPayTitle}>Quick Payment</Text>
            <Text style={styles.quickPaySubtitle}>Auto-detect carrier from phone number</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Providers Grid */}
        <Text style={styles.sectionTitle}>Select Provider</Text>
        <View style={styles.providersGrid}>
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              onPress={() => {
                setSelectedProvider(provider);
                setShowPaymentModal(true);
              }}
            >
              <View style={[styles.providerIcon, { backgroundColor: getProviderColor(provider.id) + '20' }]}>
                <Ionicons name={getProviderIcon(provider.id) as any} size={28} color={getProviderColor(provider.id)} />
              </View>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerPrefixes}>
                {provider.prefixes.join(', ')}
              </Text>
              <View style={styles.providerLimits}>
                <Text style={styles.limitText}>
                  Min: {formatAmount(provider.min_amount)} TZS
                </Text>
                <Text style={styles.limitText}>
                  Max: {formatAmount(provider.max_amount)} TZS
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Mobile Money Payments</Text>
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No recent payments</Text>
          <Text style={styles.emptyText}>Mobile money payments will appear here</Text>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProvider ? `Pay with ${selectedProvider.name}` : 'Quick Payment'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowPaymentModal(false);
                setPaymentResult(null);
                setPhone('');
                setAmount('');
                setDescription('');
              }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {paymentResult ? (
              <View style={styles.resultContainer}>
                <View style={[styles.resultIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.resultTitle}>Payment Initiated!</Text>
                <Text style={styles.resultText}>
                  A payment prompt has been sent to {paymentResult.phone}
                </Text>
                <View style={styles.resultDetails}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Transaction ID</Text>
                    <Text style={styles.resultValue}>{paymentResult.transaction_id}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Amount</Text>
                    <Text style={styles.resultValue}>TZS {formatAmount(paymentResult.amount)}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Provider</Text>
                    <Text style={styles.resultValue}>{paymentResult.provider}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.warningLight }]}>
                      <Text style={[styles.statusText, { color: COLORS.warning }]}>
                        {paymentResult.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    setShowPaymentModal(false);
                    setPaymentResult(null);
                    setPhone('');
                    setAmount('');
                    setDescription('');
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+255</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="712 345 678"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={styles.inputLabel}>Amount (TZS)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="50,000"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Payment for..."
                  placeholderTextColor={COLORS.gray}
                />

                {selectedProvider && (
                  <View style={styles.providerInfo}>
                    <Ionicons name="information-circle" size={16} color={COLORS.secondary} />
                    <Text style={styles.providerInfoText}>
                      Limit: {formatAmount(selectedProvider.min_amount)} - {formatAmount(selectedProvider.max_amount)} TZS
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.payButton, processing && styles.payButtonDisabled]}
                  onPress={handleInitiatePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color={COLORS.white} />
                      <Text style={styles.payButtonText}>Send Payment Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondaryLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.secondary,
    lineHeight: 18,
  },
  quickPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickPayIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickPayContent: {
    flex: 1,
  },
  quickPayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  quickPaySubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 12,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  providerCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  providerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  providerPrefixes: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  providerLimits: {
    marginTop: 8,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 10,
    color: COLORS.gray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  countryCode: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRightWidth: 0,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.dark,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    color: COLORS.dark,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  providerInfoText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  resultContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultDetails: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
