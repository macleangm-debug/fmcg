import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusinessStore } from '../../src/store/businessStore';
import api from '../../src/api/client';

// KwikPay Premium Theme
const COLORS = {
  // Primary gradient colors
  gradientStart: '#059669',
  gradientMid: '#10B981',
  gradientEnd: '#34D399',
  
  // Accent colors
  accent: '#10B981',
  accentLight: '#D1FAE5',
  accentDark: '#047857',
  
  // Payment method colors
  card: '#6366F1',
  cardLight: '#E0E7FF',
  qr: '#8B5CF6',
  qrLight: '#EDE9FE',
  mobile: '#F59E0B',
  mobileLight: '#FEF3C7',
  
  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  
  // Neutrals
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  border: '#E2E8F0',
  white: '#FFFFFF',
  
  // Glass effect
  glass: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};

type PaymentMethod = 'card' | 'qr' | 'mobile_money';
type CheckoutMode = 'embedded' | 'modal' | 'redirect';

interface PaymentResult {
  success: boolean;
  tx_ref: string;
  status: string;
  qr_code_base64?: string;
  redirect_url?: string;
  ussd_code?: string;
}

const PAYMENT_METHODS = [
  {
    id: 'card' as PaymentMethod,
    name: 'Card',
    fullName: 'Debit/Credit Card',
    description: 'Visa, Mastercard, Verve',
    icon: 'card',
    color: COLORS.card,
    bgColor: COLORS.cardLight,
    gradient: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'qr' as PaymentMethod,
    name: 'QR Code',
    fullName: 'Scan & Pay',
    description: 'EcobankPay, Bank Apps',
    icon: 'qr-code',
    color: COLORS.qr,
    bgColor: COLORS.qrLight,
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'mobile_money' as PaymentMethod,
    name: 'Mobile Money',
    fullName: 'Mobile Wallet',
    description: 'M-Pesa, Tigo, Airtel',
    icon: 'phone-portrait',
    color: COLORS.mobile,
    bgColor: COLORS.mobileLight,
    gradient: ['#F59E0B', '#D97706'],
  },
];

export default function CollectPaymentPage() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 900;
  const { formatNumber } = useBusinessStore();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState<'amount' | 'method' | 'processing' | 'result'>('amount');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [description, setDescription] = useState('');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('embedded');

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    // Pulse animation for processing
    if (step === 'processing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [step]);

  const formatDisplayAmount = (value: string) => {
    const num = parseFloat(value) || 0;
    return formatNumber(num);
  };

  const handleAmountInput = (digit: string) => {
    if (digit === 'clear') {
      setAmount('');
    } else if (digit === 'back') {
      setAmount(prev => prev.slice(0, -1));
    } else if (digit === '.' && amount.includes('.')) {
      return;
    } else {
      setAmount(prev => prev + digit);
    }
  };

  const handleInitiatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setStep('processing');
    setLoading(true);

    try {
      const response = await api.post('/kwikpay/payments/initiate', {
        amount: parseFloat(amount),
        currency,
        payment_method: selectedMethod,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        description: description || 'Payment collection',
      });

      setPaymentResult(response.data);
      setStep('result');
    } catch (error: any) {
      console.error('Payment failed:', error);
      // Mock for demo
      setPaymentResult({
        success: true,
        tx_ref: `ECO-${Date.now()}`,
        status: 'pending',
        qr_code_base64: selectedMethod === 'qr' ? 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAA2UlEQVR4nO3YMQ6AIBCEYczzeDa8iRdwJ9ZYGLKQEGMhFExhZzPfAhz4AXoqLwAAAAAAAAAA+KFpzp0+YB9g1DkHTkxpqQHaWtYdONsVgNqWPmAf4DjXxLhY1x041xWAWt5zoPYAOPZpLpz9CkDtsY8B8I8DVpAAEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEiABEuB/BbS1pDtwbiuPCLW8pwHae8x1BaC2ZQ2obekDaqB+LYCBTHmuAAAAAAAAAAAAPuUNI/0QEr7PqNcAAAAASUVORK5CYII=' : undefined,
        ussd_code: selectedMethod === 'mobile_money' ? '*150*00#' : undefined,
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async (status: 'succeeded' | 'failed') => {
    if (!paymentResult?.tx_ref) return;
    
    try {
      await api.post(`/kwikpay/payments/${paymentResult.tx_ref}/simulate-complete?status=${status}`);
      setPaymentResult(prev => ({ ...prev!, status }));
    } catch (error) {
      setPaymentResult(prev => ({ ...prev!, status }));
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedMethod('card');
    setCustomerPhone('');
    setCustomerEmail('');
    setDescription('');
    setPaymentResult(null);
    setStep('amount');
  };

  // Numpad component
  const NumPad = () => (
    <View style={styles.numpadContainer}>
      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'back']].map((row, rowIdx) => (
        <View key={rowIdx} style={styles.numpadRow}>
          {row.map((digit) => (
            <TouchableOpacity
              key={digit}
              style={[styles.numpadKey, digit === 'back' && styles.numpadKeySpecial]}
              onPress={() => handleAmountInput(digit)}
              activeOpacity={0.7}
            >
              {digit === 'back' ? (
                <Ionicons name="backspace-outline" size={24} color={COLORS.dark} />
              ) : (
                <Text style={styles.numpadKeyText}>{digit}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );

  // Amount Step
  const renderAmountStep = () => (
    <Animated.View 
      style={[
        styles.stepContent,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Amount Display */}
      <View style={styles.amountDisplayContainer}>
        <Text style={styles.currencyLabel}>{currency}</Text>
        <Text style={styles.amountDisplay}>
          {amount ? formatDisplayAmount(amount) : '0'}
        </Text>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => handleAmountInput('clear')}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Amounts */}
      <View style={styles.quickAmountsRow}>
        {[5000, 10000, 25000, 50000, 100000].map((quickAmount) => (
          <TouchableOpacity
            key={quickAmount}
            style={[
              styles.quickAmountChip,
              amount === quickAmount.toString() && styles.quickAmountChipActive
            ]}
            onPress={() => setAmount(quickAmount.toString())}
          >
            <Text style={[
              styles.quickAmountText,
              amount === quickAmount.toString() && styles.quickAmountTextActive
            ]}>
              {quickAmount >= 1000 ? `${quickAmount / 1000}K` : quickAmount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Numpad */}
      <NumPad />

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!amount || parseFloat(amount) <= 0) && styles.primaryButtonDisabled
        ]}
        onPress={() => setStep('method')}
        disabled={!amount || parseFloat(amount) <= 0}
      >
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Method Selection Step
  const renderMethodStep = () => (
    <Animated.View 
      style={[
        styles.stepContent,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Amount Summary */}
      <View style={styles.summaryBadge}>
        <Text style={styles.summaryBadgeLabel}>Collecting</Text>
        <Text style={styles.summaryBadgeAmount}>{currency} {formatDisplayAmount(amount)}</Text>
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      
      <View style={styles.methodsContainer}>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected
            ]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedMethod === method.id ? method.gradient : [COLORS.lightGray, COLORS.lightGray]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.methodCardGradient}
            >
              <View style={[
                styles.methodIconWrapper,
                { backgroundColor: selectedMethod === method.id ? 'rgba(255,255,255,0.25)' : method.bgColor }
              ]}>
                <Ionicons 
                  name={method.icon as any} 
                  size={28} 
                  color={selectedMethod === method.id ? COLORS.white : method.color} 
                />
              </View>
              <Text style={[
                styles.methodName,
                selectedMethod === method.id && styles.methodNameSelected
              ]}>
                {method.name}
              </Text>
              <Text style={[
                styles.methodDescription,
                selectedMethod === method.id && styles.methodDescriptionSelected
              ]}>
                {method.description}
              </Text>
              {selectedMethod === method.id && (
                <View style={styles.methodCheck}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Customer Details (Optional) */}
      <Text style={styles.sectionTitle}>Customer Details (Optional)</Text>
      
      {selectedMethod === 'mobile_money' && (
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholderTextColor={COLORS.gray}
          />
        </View>
      )}

      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email (for receipt)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={customerEmail}
          onChangeText={setCustomerEmail}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Ionicons name="document-text-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      {/* Checkout Mode Selection */}
      <Text style={styles.sectionTitle}>Checkout Experience</Text>
      <View style={styles.modeSelector}>
        {[
          { id: 'embedded', label: 'Embedded', icon: 'layers-outline' },
          { id: 'modal', label: 'Popup', icon: 'albums-outline' },
          { id: 'redirect', label: 'Full Page', icon: 'expand-outline' },
        ].map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeOption,
              checkoutMode === mode.id && styles.modeOptionActive
            ]}
            onPress={() => setCheckoutMode(mode.id as CheckoutMode)}
          >
            <Ionicons 
              name={mode.icon as any} 
              size={18} 
              color={checkoutMode === mode.id ? COLORS.accent : COLORS.gray} 
            />
            <Text style={[
              styles.modeLabel,
              checkoutMode === mode.id && styles.modeLabelActive
            ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('amount')}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.accent} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleInitiatePayment}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="flash" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Collect Payment</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Processing Step
  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <Animated.View style={[styles.processingCircle, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.processingGradient}
        >
          <ActivityIndicator size="large" color={COLORS.white} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.processingTitle}>Processing Payment</Text>
      <Text style={styles.processingSubtitle}>Please wait while we initiate your payment...</Text>
    </View>
  );

  // Result Step
  const renderResultStep = () => {
    if (!paymentResult) return null;

    const isSuccess = paymentResult.status === 'succeeded';
    const isPending = paymentResult.status === 'pending';
    const isFailed = paymentResult.status === 'failed';

    return (
      <Animated.View 
        style={[
          styles.resultContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Status Icon */}
        <View style={[
          styles.statusIconContainer,
          isSuccess && styles.statusSuccess,
          isPending && styles.statusPending,
          isFailed && styles.statusFailed,
        ]}>
          <Ionicons 
            name={isSuccess ? 'checkmark' : isPending ? 'time' : 'close'} 
            size={48} 
            color={COLORS.white} 
          />
        </View>

        <Text style={styles.resultTitle}>
          {isSuccess ? 'Payment Successful!' : isPending ? 'Payment Initiated' : 'Payment Failed'}
        </Text>
        
        <Text style={styles.resultAmount}>{currency} {formatDisplayAmount(amount)}</Text>
        
        <Text style={styles.resultRef}>Ref: {paymentResult.tx_ref}</Text>

        {/* QR Code Display */}
        {selectedMethod === 'qr' && paymentResult.qr_code_base64 && isPending && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Scan to Pay</Text>
            <View style={styles.qrWrapper}>
              <Image
                source={{ uri: `data:image/png;base64,${paymentResult.qr_code_base64}` }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.qrHint}>Open your banking app and scan this QR code</Text>
          </View>
        )}

        {/* USSD Code Display */}
        {selectedMethod === 'mobile_money' && paymentResult.ussd_code && isPending && (
          <View style={styles.ussdSection}>
            <Text style={styles.ussdTitle}>Dial to Pay</Text>
            <View style={styles.ussdWrapper}>
              <Text style={styles.ussdCode}>{paymentResult.ussd_code}</Text>
            </View>
            <Text style={styles.ussdHint}>Dial this code on your phone to complete payment</Text>
          </View>
        )}

        {/* Sandbox Controls */}
        {isPending && (
          <View style={styles.sandboxSection}>
            <View style={styles.sandboxBadge}>
              <Ionicons name="flask" size={16} color={COLORS.warning} />
              <Text style={styles.sandboxBadgeText}>Sandbox Mode</Text>
            </View>
            <Text style={styles.sandboxHint}>Simulate payment outcome:</Text>
            <View style={styles.sandboxButtons}>
              <TouchableOpacity
                style={styles.simulateSuccessBtn}
                onPress={() => simulatePayment('succeeded')}
              >
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                <Text style={styles.simulateBtnText}>Mark Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.simulateFailBtn}
                onPress={() => simulatePayment('failed')}
              >
                <Ionicons name="close" size={18} color={COLORS.white} />
                <Text style={styles.simulateBtnText}>Mark Failed</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* New Payment Button */}
        <TouchableOpacity style={styles.newPaymentButton} onPress={resetForm}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
          <Text style={styles.newPaymentButtonText}>New Payment</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Content */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isLargeScreen && styles.scrollContentLarge
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerBrand}>
              <View style={styles.headerLogo}>
                <Ionicons name="flash" size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.headerTitle}>KwikPay</Text>
            </View>
            <View style={styles.headerSecure}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              <Text style={styles.headerSecureText}>Secure</Text>
            </View>
          </View>

          {/* Main Card */}
          <View style={[styles.mainCard, isLargeScreen && styles.mainCardLarge]}>
            {/* Progress Indicator */}
            {step !== 'processing' && step !== 'result' && (
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: step === 'amount' ? '50%' : '100%' }
                ]} />
              </View>
            )}

            {/* Step Content */}
            {step === 'amount' && renderAmountStep()}
            {step === 'method' && renderMethodStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'result' && renderResultStep()}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Powered by</Text>
            <Text style={styles.footerBrand}>KwikPay</Text>
            <Text style={styles.footerText}>• Secure Payments</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentLarge: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerBack: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSecure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerSecureText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
  },

  // Main Card
  mainCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
  },
  mainCardLarge: {
    padding: 32,
  },

  // Progress Bar
  progressBar: {
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },

  // Step Content
  stepContent: {},

  // Amount Display
  amountDisplayContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -2,
  },
  clearButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },

  // Quick Amounts
  quickAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  quickAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
  },
  quickAmountChipActive: {
    backgroundColor: COLORS.accentLight,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  quickAmountTextActive: {
    color: COLORS.accent,
  },

  // Numpad
  numpadContainer: {
    marginBottom: 24,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  numpadKey: {
    width: 72,
    height: 56,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeySpecial: {
    backgroundColor: COLORS.border,
  },
  numpadKeyText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.dark,
  },

  // Primary Button
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Summary Badge
  summaryBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryBadgeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent,
    marginBottom: 4,
  },
  summaryBadgeAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accentDark,
  },

  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },

  // Payment Methods
  methodsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  methodCardSelected: {},
  methodCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  methodIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  methodNameSelected: {
    color: COLORS.white,
  },
  methodDescription: {
    fontSize: 13,
    color: COLORS.gray,
  },
  methodDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  methodCheck: {
    position: 'absolute',
    right: 16,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: COLORS.dark,
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modeOptionActive: {
    backgroundColor: COLORS.white,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  modeLabelActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: COLORS.accentLight,
    borderRadius: 16,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Processing
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  processingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 24,
  },
  processingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
  },

  // Result
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusSuccess: {
    backgroundColor: COLORS.success,
  },
  statusPending: {
    backgroundColor: COLORS.warning,
  },
  statusFailed: {
    backgroundColor: COLORS.danger,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  resultAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  resultRef: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
  },

  // QR Section
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrHint: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 250,
  },

  // USSD Section
  ussdSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ussdTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  ussdWrapper: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: COLORS.mobileLight,
    borderRadius: 12,
  },
  ussdCode: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.mobile,
    letterSpacing: 2,
  },
  ussdHint: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 250,
  },

  // Sandbox Section
  sandboxSection: {
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
  },
  sandboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sandboxBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
  sandboxHint: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
  },
  sandboxButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  simulateSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.success,
    borderRadius: 10,
  },
  simulateFailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
  },
  simulateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // New Payment Button
  newPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.accentLight,
    borderRadius: 12,
  },
  newPaymentButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
});
