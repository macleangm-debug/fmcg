import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentApi, subscriptionApi } from '../api/client';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  paymentType: 'subscription' | 'linked_app' | 'upgrade';
  appId?: string;
  appName?: string;
  planId?: string;
  amount: number;
  originalAmount?: number;
}

interface PaymentConfig {
  country_code: string;
  currency: string;
  symbol: string;
  currency_name: string;
  payment_methods: string[];
  default_method: string;
  exchange_rate: number;
  mobile_providers: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
  stripe_enabled: boolean;
  test_mode: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  paymentType,
  appId,
  appName,
  planId,
  amount,
  originalAmount,
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');

  useEffect(() => {
    if (visible) {
      fetchPaymentConfig();
      setStep('method');
      setPhoneNumber('');
      setSelectedProvider('');
    }
  }, [visible]);

  const fetchPaymentConfig = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getConfig();
      setPaymentConfig(response.data);
      setSelectedMethod(response.data.default_method);
      if (response.data.mobile_providers?.length > 0) {
        setSelectedProvider(response.data.mobile_providers[0].id);
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocalAmount = () => {
    if (!paymentConfig) return amount;
    return Math.round(amount * paymentConfig.exchange_rate);
  };

  const formatAmount = (amt: number) => {
    if (!paymentConfig) return `$${amt}`;
    return `${paymentConfig.symbol}${amt.toLocaleString()}`;
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    if (method === 'stripe') {
      setStep('details');
    } else if (paymentConfig?.mobile_providers && paymentConfig.mobile_providers.length > 0) {
      setSelectedProvider(paymentConfig.mobile_providers[0].id);
      setStep('details');
    }
  };

  const handlePayment = async () => {
    // Validate phone number for mobile payments
    if (selectedMethod !== 'stripe' && !phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    try {
      setProcessing(true);
      setStep('processing');

      if (paymentConfig?.test_mode) {
        // In test mode, simulate payment success
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (paymentType === 'linked_app' && appId) {
          await subscriptionApi.simulatePayment(appId);
        }
        
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        // Real payment flow
        const response = await paymentApi.initiatePayment({
          payment_type: paymentType,
          payment_method: selectedMethod as any,
          amount: getLocalAmount(),
          currency: paymentConfig?.currency || 'USD',
          app_id: appId,
          plan_id: planId,
          phone_number: phoneNumber,
        });

        if (response.data.success) {
          if (selectedMethod === 'stripe' && response.data.checkout_url) {
            // Redirect to Stripe checkout
            if (Platform.OS === 'web') {
              window.location.href = response.data.checkout_url;
            }
          } else {
            // Mobile money - show processing
            setStep('processing');
            // Poll for status or wait for callback
          }
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
      setStep('details');
    } finally {
      setProcessing(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      
      {/* Stripe/Card Option */}
      {paymentConfig?.payment_methods.includes('stripe') && (
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'stripe' && styles.methodCardSelected,
          ]}
          onPress={() => handleMethodSelect('stripe')}
        >
          <View style={[styles.methodIcon, { backgroundColor: '#635BFF20' }]}>
            <Ionicons name="card" size={24} color="#635BFF" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Card Payment</Text>
            <Text style={styles.methodDesc}>Visa, Mastercard, Amex</Text>
          </View>
          <Ionicons 
            name={selectedMethod === 'stripe' ? 'checkmark-circle' : 'chevron-forward'} 
            size={24} 
            color={selectedMethod === 'stripe' ? '#10B981' : '#9CA3AF'} 
          />
        </TouchableOpacity>
      )}

      {/* Mobile Money Options */}
      {paymentConfig?.mobile_providers && paymentConfig.mobile_providers.length > 0 && (
        <>
          <Text style={styles.dividerText}>or pay with Mobile Money</Text>
          {paymentConfig.mobile_providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.methodCard,
                selectedMethod !== 'stripe' && selectedProvider === provider.id && styles.methodCardSelected,
              ]}
              onPress={() => {
                setSelectedMethod('mobile_money');
                setSelectedProvider(provider.id);
                setStep('details');
              }}
            >
              <View style={[styles.methodIcon, { backgroundColor: `${provider.color}20` }]}>
                <Ionicons name={provider.icon as any} size={24} color={provider.color} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{provider.name}</Text>
                <Text style={styles.methodDesc}>Pay with your phone</Text>
              </View>
              <Ionicons 
                name={selectedProvider === provider.id ? 'checkmark-circle' : 'chevron-forward'} 
                size={24} 
                color={selectedProvider === provider.id ? '#10B981' : '#9CA3AF'} 
              />
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.detailsContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('method')}>
        <Ionicons name="arrow-back" size={20} color="#6B7280" />
        <Text style={styles.backButtonText}>Change payment method</Text>
      </TouchableOpacity>

      {/* Payment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        {appName && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{appName}</Text>
            {originalAmount && originalAmount !== amount && (
              <Text style={styles.summaryOriginal}>${originalAmount}/mo</Text>
            )}
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>{formatAmount(getLocalAmount())}</Text>
        </View>
        {paymentConfig?.currency !== 'USD' && (
          <Text style={styles.exchangeNote}>
            ≈ ${amount} USD (rate: 1 USD = {paymentConfig?.exchange_rate} {paymentConfig?.currency})
          </Text>
        )}
      </View>

      {/* Phone Number Input for Mobile Money */}
      {selectedMethod !== 'stripe' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.countryCodeBox}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.countryCodeText}>
                {paymentConfig?.country_code === 'TZ' ? '+255' :
                 paymentConfig?.country_code === 'KE' ? '+254' :
                 paymentConfig?.country_code === 'UG' ? '+256' :
                 paymentConfig?.country_code === 'RW' ? '+250' :
                 paymentConfig?.country_code === 'GH' ? '+233' :
                 paymentConfig?.country_code === 'NG' ? '+234' :
                 paymentConfig?.country_code === 'ZA' ? '+27' : '+1'}
              </Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder={
                paymentConfig?.country_code === 'TZ' ? '712345678' :
                paymentConfig?.country_code === 'KE' ? '712345678' :
                paymentConfig?.country_code === 'UG' ? '772345678' :
                paymentConfig?.country_code === 'RW' ? '788345678' :
                paymentConfig?.country_code === 'GH' ? '241234567' :
                paymentConfig?.country_code === 'NG' ? '8123456789' :
                paymentConfig?.country_code === 'ZA' ? '821234567' : '1234567890'
              }
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={(text) => {
                // Remove non-digits
                const digits = text.replace(/\D/g, '');
                // Format based on country
                let formatted = digits;
                if (paymentConfig?.country_code === 'TZ' || paymentConfig?.country_code === 'KE') {
                  // Format: XXX XXX XXX (9 digits)
                  if (digits.length <= 3) formatted = digits;
                  else if (digits.length <= 6) formatted = `${digits.slice(0,3)} ${digits.slice(3)}`;
                  else formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,9)}`;
                } else if (paymentConfig?.country_code === 'NG') {
                  // Format: XXX XXX XXXX (10 digits)
                  if (digits.length <= 3) formatted = digits;
                  else if (digits.length <= 6) formatted = `${digits.slice(0,3)} ${digits.slice(3)}`;
                  else formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`;
                } else if (paymentConfig?.country_code === 'ZA' || paymentConfig?.country_code === 'GH') {
                  // Format: XX XXX XXXX (9 digits)
                  if (digits.length <= 2) formatted = digits;
                  else if (digits.length <= 5) formatted = `${digits.slice(0,2)} ${digits.slice(2)}`;
                  else formatted = `${digits.slice(0,2)} ${digits.slice(2,5)} ${digits.slice(5,9)}`;
                } else {
                  // Default format: XXX XXX XXXX
                  if (digits.length <= 3) formatted = digits;
                  else if (digits.length <= 6) formatted = `${digits.slice(0,3)} ${digits.slice(3)}`;
                  else formatted = `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`;
                }
                setPhoneNumber(formatted);
              }}
              keyboardType="phone-pad"
              maxLength={12}
            />
          </View>
          <Text style={styles.inputHint}>
            Enter your {selectedProvider?.includes('mpesa') ? 'M-Pesa' : 'mobile money'} registered number (9 digits)
          </Text>
        </View>
      )}

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, processing && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <Text style={styles.payButtonText}>
              {selectedMethod === 'stripe' ? 'Pay with Card' : 'Pay Now'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {paymentConfig?.test_mode && (
        <View style={styles.testModeNotice}>
          <Ionicons name="information-circle" size={16} color="#F59E0B" />
          <Text style={styles.testModeText}>Test Mode - No real charges</Text>
        </View>
      )}
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.processingTitle}>Processing Payment</Text>
      {selectedMethod !== 'stripe' && (
        <>
          <Text style={styles.processingDesc}>
            Please check your phone for the payment prompt
          </Text>
          <Text style={styles.processingHint}>
            Enter your PIN to complete the transaction
          </Text>
        </>
      )}
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
      </View>
      <Text style={styles.successTitle}>Payment Successful!</Text>
      <Text style={styles.successDesc}>
        {appName ? `${appName} has been activated` : 'Your subscription is now active'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {step === 'success' ? 'Complete' : 'Payment'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            ) : step === 'method' ? (
              renderMethodSelection()
            ) : step === 'details' ? (
              renderPaymentDetails()
            ) : step === 'processing' ? (
              renderProcessing()
            ) : (
              renderSuccess()
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  methodContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF5FF',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  methodDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dividerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    marginVertical: 8,
  },
  detailsContainer: {
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryOriginal: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  exchangeNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputContainer: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
    minWidth: 85,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    letterSpacing: 1,
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  testModeText: {
    fontSize: 12,
    color: '#92400E',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  processingDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  processingHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  successDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PaymentModal;
