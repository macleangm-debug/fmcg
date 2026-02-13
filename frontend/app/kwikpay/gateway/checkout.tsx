import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import api from '../../../src/api/client';

interface MNOProvider {
  code: string;
  name: string;
  provider: string;
  color: string;
}

interface Bank {
  code: string;
  name: string;
  color: string;
}

interface CheckoutConfig {
  merchant: {
    prefix: string;
    business_name: string;
    category: string;
    logo_url?: string;
  };
  institution: {
    name: string;
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
  };
  country: {
    code: string;
    name: string;
    currency: string;
    currency_symbol: string;
  };
  payment_methods: {
    mobile_money: { enabled: boolean; providers: MNOProvider[] };
    bank_transfer: { enabled: boolean; banks: Bank[] };
    card: { enabled: boolean; provider: string; supported: string[] };
    qr: { enabled: boolean; providers: string[]; description: string };
  };
  branding: {
    powered_by: string;
    tagline: string;
  };
}

export default function KwikCheckoutPage() {
  const params = useLocalSearchParams();
  const merchantPrefix = (params.prefix as string) || 'KWK-CRDB-00001-BA';
  const initialAmount = params.amount ? parseFloat(params.amount as string) : 0;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [amount, setAmount] = useState(initialAmount.toString());
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedMNO, setSelectedMNO] = useState<MNOProvider | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedMNO, setDetectedMNO] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showAllBanks, setShowAllBanks] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await api.get(`/kwikcheckout/config/${merchantPrefix}`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching checkout config:', error);
      Alert.alert('Error', 'Failed to load checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [merchantPrefix]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const detectMNO = useCallback(async (phone: string) => {
    if (phone.length >= 4 && config) {
      try {
        const response = await api.post('/kwikcheckout/detect-mno', {
          phone,
          country_code: config.country.code,
        });
        setDetectedMNO(response.data);
        if (response.data.detected) {
          const mno = config.payment_methods.mobile_money.providers.find(
            (p) => p.code === response.data.mno_code
          );
          if (mno) setSelectedMNO(mno);
        }
      } catch (error) {
        console.error('MNO detection error:', error);
      }
    }
  }, [config]);

  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const timer = setTimeout(() => detectMNO(phoneNumber), 500);
      return () => clearTimeout(timer);
    }
  }, [phoneNumber, detectMNO]);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (selectedMethod === 'mobile_money' && !phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (selectedMethod === 'bank_transfer' && !selectedBank) {
      Alert.alert('Error', 'Please select your bank');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/kwikcheckout/pay', {
        merchant_prefix: merchantPrefix,
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        customer_phone: phoneNumber || undefined,
        bank_code: selectedBank?.code || undefined,
      });

      setPaymentResult(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!config) return value.toString();
    return `${config.country.currency_symbol} ${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading KwikCheckout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Checkout not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Payment success screen
  if (paymentResult) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.resultIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.resultTitle}>Payment Initiated</Text>
          <Text style={styles.resultAmount}>{formatCurrency(paymentResult.amount)}</Text>
          <Text style={styles.resultRef}>Ref: {paymentResult.tx_ref}</Text>

          {paymentResult.mno && (
            <View style={styles.instructionCard}>
              <Ionicons name="phone-portrait" size={24} color="#10B981" />
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>{paymentResult.mno.name}</Text>
                <Text style={styles.instructionText}>{paymentResult.mno.instructions}</Text>
              </View>
            </View>
          )}

          {paymentResult.bank_transfer && (
            <View style={styles.instructionCard}>
              <Ionicons name="business" size={24} color="#3B82F6" />
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Bank Transfer</Text>
                <Text style={styles.instructionText}>Reference: {paymentResult.bank_transfer.reference}</Text>
                <Text style={styles.instructionText}>{paymentResult.bank_transfer.instructions}</Text>
              </View>
            </View>
          )}

          {paymentResult.qr && (
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>Scan to Pay</Text>
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={120} color="#111827" />
              </View>
              <Text style={styles.qrInstructions}>{paymentResult.qr.instructions}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.newPaymentBtn} onPress={() => setPaymentResult(null)}>
            <Text style={styles.newPaymentText}>Make Another Payment</Text>
          </TouchableOpacity>

          {/* Powered by KwikPay */}
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by</Text>
            <Text style={styles.poweredByBrand}>KwikPay</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const primaryColor = config.institution.primary_color || '#10B981';
  const visibleBanks = showAllBanks 
    ? config.payment_methods.bank_transfer.banks 
    : config.payment_methods.bank_transfer.banks.slice(0, 8);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: primaryColor }]}>
          <Text style={styles.headerTitle}>Pay to</Text>
          <Text style={styles.merchantName}>{config.merchant.business_name}</Text>
          <Text style={styles.merchantCategory}>{config.merchant.category}</Text>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Amount ({config.country.currency})</Text>
          <View style={styles.amountInputWrapper}>
            <Text style={styles.currencySymbol}>{config.country.currency_symbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsSection}>
          {/* Mobile Money */}
          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'mobile_money' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('mobile_money')}
          >
            <View style={styles.methodHeader}>
              <Ionicons name="phone-portrait" size={24} color="#10B981" />
              <Text style={styles.methodTitle}>Mobile Money</Text>
              {selectedMethod === 'mobile_money' && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>

            {selectedMethod === 'mobile_money' && (
              <View style={styles.methodContent}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholder="0754 123 456"
                  placeholderTextColor="#9CA3AF"
                />
                {detectedMNO?.detected && (
                  <View style={[styles.detectedMNO, { backgroundColor: detectedMNO.color + '20' }]}>
                    <Text style={[styles.detectedMNOText, { color: detectedMNO.color }]}>
                      {detectedMNO.name} detected
                    </Text>
                  </View>
                )}
                <View style={styles.mnoGrid}>
                  {config.payment_methods.mobile_money.providers.map((mno) => (
                    <TouchableOpacity
                      key={mno.code}
                      style={[
                        styles.mnoItem,
                        selectedMNO?.code === mno.code && { borderColor: mno.color, backgroundColor: mno.color + '10' }
                      ]}
                      onPress={() => setSelectedMNO(mno)}
                    >
                      <View style={[styles.mnoIcon, { backgroundColor: mno.color }]}>
                        <Text style={styles.mnoInitial}>{mno.name.charAt(0)}</Text>
                      </View>
                      <Text style={styles.mnoName}>{mno.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Bank Transfer */}
          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'bank_transfer' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('bank_transfer')}
          >
            <View style={styles.methodHeader}>
              <Ionicons name="business" size={24} color="#3B82F6" />
              <Text style={styles.methodTitle}>Bank Transfer</Text>
              {selectedMethod === 'bank_transfer' && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
              )}
            </View>

            {selectedMethod === 'bank_transfer' && (
              <View style={styles.methodContent}>
                <Text style={styles.inputLabel}>Select Your Bank</Text>
                <View style={styles.bankGrid}>
                  {visibleBanks.map((bank) => (
                    <TouchableOpacity
                      key={bank.code}
                      style={[
                        styles.bankItem,
                        selectedBank?.code === bank.code && { borderColor: bank.color, backgroundColor: bank.color + '10' }
                      ]}
                      onPress={() => setSelectedBank(bank)}
                    >
                      <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                        <Text style={styles.bankInitial}>{bank.code.substring(0, 2)}</Text>
                      </View>
                      <Text style={styles.bankName} numberOfLines={1}>{bank.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {config.payment_methods.bank_transfer.banks.length > 8 && (
                  <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllBanks(!showAllBanks)}>
                    <Text style={styles.showMoreText}>
                      {showAllBanks ? 'Show Less' : `+ ${config.payment_methods.bank_transfer.banks.length - 8} More Banks`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Card Payment */}
          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'card' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('card')}
          >
            <View style={styles.methodHeader}>
              <Ionicons name="card" size={24} color="#8B5CF6" />
              <Text style={styles.methodTitle}>Card Payment</Text>
              {selectedMethod === 'card' && (
                <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
              )}
            </View>
            {selectedMethod === 'card' && (
              <View style={styles.methodContent}>
                <Text style={styles.cardInfo}>Pay securely with Visa or Mastercard via {config.payment_methods.card.provider}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* QR Code */}
          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'qr' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('qr')}
          >
            <View style={styles.methodHeader}>
              <Ionicons name="qr-code" size={24} color="#F59E0B" />
              <Text style={styles.methodTitle}>Scan QR Code</Text>
              {selectedMethod === 'qr' && (
                <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
              )}
            </View>
            {selectedMethod === 'qr' && (
              <View style={styles.methodContent}>
                <Text style={styles.qrInfo}>{config.payment_methods.qr.description}</Text>
                <View style={styles.qrProviders}>
                  {config.payment_methods.qr.providers.map((provider, index) => (
                    <View key={index} style={styles.qrProviderTag}>
                      <Text style={styles.qrProviderText}>{provider}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: primaryColor }, (!selectedMethod || processing) && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={!selectedMethod || processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay {amount ? formatCurrency(parseFloat(amount)) : ''}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Powered by KwikPay */}
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.poweredByBrand}>KwikPay</Text>
        </View>

        {/* Country Info */}
        <View style={styles.countryInfo}>
          <Ionicons name="globe-outline" size={14} color="#9CA3AF" />
          <Text style={styles.countryText}>{config.country.name}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 16, fontSize: 18, color: '#EF4444' },
  scrollContent: { padding: 20 },
  header: { padding: 24, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
  headerTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  merchantName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  merchantCategory: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, textTransform: 'capitalize' },
  amountSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#E5E7EB' },
  currencySymbol: { fontSize: 24, fontWeight: '600', color: '#6B7280', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#111827' },
  methodsSection: { gap: 12 },
  methodCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#E5E7EB' },
  methodCardSelected: { borderColor: '#10B981' },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  methodContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  phoneInput: { backgroundColor: '#F3F4F6', padding: 14, borderRadius: 10, fontSize: 16, color: '#111827' },
  detectedMNO: { marginTop: 8, padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
  detectedMNOText: { fontSize: 13, fontWeight: '600' },
  mnoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mnoItem: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  mnoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mnoInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  mnoName: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankItem: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  bankIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bankInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  bankName: { fontSize: 12, fontWeight: '500', color: '#374151', flex: 1 },
  showMoreBtn: { marginTop: 12, alignItems: 'center' },
  showMoreText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  cardInfo: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  qrInfo: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  qrProviders: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  qrProviderTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  qrProviderText: { fontSize: 12, fontWeight: '500', color: '#92400E' },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 12, marginTop: 24, gap: 8 },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  poweredBy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 4 },
  poweredByText: { fontSize: 12, color: '#9CA3AF' },
  poweredByBrand: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  countryInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 4 },
  countryText: { fontSize: 12, color: '#9CA3AF' },
  resultContainer: { padding: 24, alignItems: 'center' },
  resultIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  resultTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  resultAmount: { fontSize: 36, fontWeight: '700', color: '#10B981', marginTop: 8 },
  resultRef: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  instructionCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginTop: 24, gap: 12, width: '100%' },
  instructionContent: { flex: 1 },
  instructionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  instructionText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  qrContainer: { alignItems: 'center', marginTop: 24 },
  qrTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 },
  qrPlaceholder: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16 },
  qrInstructions: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  newPaymentBtn: { backgroundColor: '#F3F4F6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginTop: 24 },
  newPaymentText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
