import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/api/client';

const { width } = Dimensions.get('window');

interface PaymentProvider {
  code: string;
  name: string;
  color: string;
}

interface CheckoutConfig {
  checkout_code: string;
  merchant: { name: string; logo_url?: string };
  country: { code: string; name: string; currency: string; currency_symbol: string };
  theme: { color: string };
  payment_methods: {
    mobile_money: { enabled: boolean; providers: PaymentProvider[] };
    bank_transfer: { enabled: boolean; banks: PaymentProvider[] };
    card: { enabled: boolean; provider: string };
    qr: { enabled: boolean; providers: string[] };
  };
  branding: { powered_by: string; tagline: string };
}

const COLORS = {
  bg: '#0A0A0B',
  card: '#141417',
  cardHover: '#1A1A1F',
  border: '#2A2A30',
  white: '#FFFFFF',
  gray: '#8B8B92',
  lightGray: '#B4B4BC',
  success: '#00D084',
  successGlow: 'rgba(0, 208, 132, 0.2)',
  error: '#FF4B4B',
  accent: '#7C3AED',
  accentLight: 'rgba(124, 58, 237, 0.15)',
};

export default function PublicCheckoutPage() {
  const params = useLocalSearchParams();
  const checkoutCode = params.code as string;
  const initialAmount = params.amount ? parseFloat(params.amount as string) : 0;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toString() : '');
  const [step, setStep] = useState<'amount' | 'method' | 'details' | 'processing' | 'success'>('amount');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedMNO, setDetectedMNO] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showAllBanks, setShowAllBanks] = useState(false);
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [step]);

  useEffect(() => {
    if (processing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [processing]);

  const fetchConfig = useCallback(async () => {
    if (!checkoutCode) {
      setError('Invalid checkout link');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/pay/${checkoutCode}`);
      setConfig(response.data);
      if (initialAmount > 0) {
        setStep('method');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Checkout not found');
    } finally {
      setLoading(false);
    }
  }, [checkoutCode, initialAmount]);

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
          if (mno) setSelectedProvider(mno);
        }
      } catch (err) {
        console.error('MNO detection error:', err);
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
    if (!config) return;

    setProcessing(true);
    setStep('processing');
    
    try {
      const response = await api.post(`/pay/${checkoutCode}`, {
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        customer_phone: phoneNumber || undefined,
        bank_code: selectedMethod === 'bank_transfer' ? selectedProvider?.code : undefined,
      });

      setPaymentResult(response.data);
      setTimeout(() => setStep('success'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.');
      setStep('details');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!config) return value.toLocaleString();
    return `${config.country.currency_symbol} ${value.toLocaleString()}`;
  };

  const themeColor = config?.theme?.color || '#7C3AED';

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0B', '#151518', '#0A0A0B']} style={styles.gradientBg}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingPulse}>
              <Ionicons name="wallet-outline" size={48} color={themeColor} />
            </View>
            <Text style={styles.loadingText}>Preparing checkout...</Text>
            <View style={styles.loadingDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.dot, { animationDelay: `${i * 200}ms` }]} />
              ))}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error State
  if (error || !config) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0B', '#151518', '#0A0A0B']} style={styles.gradientBg}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <View style={styles.errorIconBg}>
                <Ionicons name="warning-outline" size={48} color={COLORS.error} />
              </View>
            </View>
            <Text style={styles.errorTitle}>Link Unavailable</Text>
            <Text style={styles.errorText}>{error || 'This checkout link is invalid or expired.'}</Text>
            <View style={styles.errorHint}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
              <Text style={styles.errorHintText}>Check the link or contact the merchant</Text>
            </View>
          </View>
          <Footer />
        </LinearGradient>
      </View>
    );
  }

  // Success Screen
  if (step === 'success' && paymentResult) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0B', '#0D1F15', '#0A0A0B']} style={styles.gradientBg}>
          <ScrollView contentContainerStyle={styles.successContainer}>
            <Animated.View style={[styles.successContent, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.successIconRing}>
                <View style={styles.successIconInner}>
                  <Ionicons name="checkmark" size={56} color={COLORS.success} />
                </View>
              </View>
              <Text style={styles.successTitle}>Payment Initiated</Text>
              <Text style={styles.successAmount}>{formatCurrency(paymentResult.amount)}</Text>
              <Text style={styles.successMerchant}>to {config.merchant.name}</Text>
              
              <View style={styles.refCard}>
                <View style={styles.refHeader}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.refLabel}>Reference</Text>
                </View>
                <Text style={styles.refValue}>{paymentResult.tx_ref}</Text>
              </View>

              {paymentResult.instructions && (
                <View style={[styles.instructionsCard, { borderColor: themeColor + '40' }]}>
                  <View style={[styles.instructionsIcon, { backgroundColor: themeColor + '20' }]}>
                    <Ionicons 
                      name={paymentResult.instructions.type === 'ussd' ? 'phone-portrait' : 'information-circle'} 
                      size={24} 
                      color={themeColor} 
                    />
                  </View>
                  <View style={styles.instructionsContent}>
                    <Text style={styles.instructionsTitle}>
                      {paymentResult.instructions.type === 'ussd' ? paymentResult.instructions.mno : 'Next Steps'}
                    </Text>
                    <Text style={styles.instructionsText}>{paymentResult.instructions.message}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity 
                style={styles.newPaymentBtn}
                onPress={() => {
                  setStep('amount');
                  setAmount('');
                  setSelectedMethod(null);
                  setSelectedProvider(null);
                  setPhoneNumber('');
                  setPaymentResult(null);
                  setError(null);
                }}
                data-testid="new-payment-btn"
              >
                <Ionicons name="refresh" size={18} color={COLORS.white} />
                <Text style={styles.newPaymentText}>Make Another Payment</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
          <Footer />
        </LinearGradient>
      </View>
    );
  }

  // Processing Screen
  if (step === 'processing') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0B', '#151518', '#0A0A0B']} style={styles.gradientBg}>
          <View style={styles.processingContainer}>
            <Animated.View style={[styles.processingIcon, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.processingRing, { borderColor: themeColor }]} />
              <ActivityIndicator size="large" color={themeColor} />
            </Animated.View>
            <Text style={styles.processingTitle}>Processing Payment</Text>
            <Text style={styles.processingText}>Please wait...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0B', '#151518', '#0A0A0B']} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.merchantBadge}>
              <View style={[styles.merchantAvatar, { backgroundColor: themeColor + '30' }]}>
                <Text style={[styles.merchantInitial, { color: themeColor }]}>
                  {config.merchant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.payingTo}>Paying to</Text>
                <Text style={styles.merchantName}>{config.merchant.name}</Text>
              </View>
            </View>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.securityText}>Secure</Text>
            </View>
          </View>

          {/* Amount Step */}
          {step === 'amount' && (
            <Animated.View 
              style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <Text style={styles.stepLabel}>Enter Amount</Text>
              <View style={styles.amountCard}>
                <Text style={styles.currencyBig}>{config.country.currency_symbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.border}
                  autoFocus
                  data-testid="amount-input"
                />
              </View>
              
              {/* Quick amounts */}
              <View style={styles.quickAmounts}>
                {[1000, 5000, 10000, 50000].map((quickAmt) => (
                  <TouchableOpacity
                    key={quickAmt}
                    style={[styles.quickAmountBtn, amount === quickAmt.toString() && styles.quickAmountActive]}
                    onPress={() => setAmount(quickAmt.toString())}
                    data-testid={`quick-amount-${quickAmt}`}
                  >
                    <Text style={[styles.quickAmountText, amount === quickAmt.toString() && styles.quickAmountTextActive]}>
                      {config.country.currency_symbol}{(quickAmt / 1000).toFixed(0)}K
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.continueBtn, 
                  { backgroundColor: themeColor },
                  (!amount || parseFloat(amount) <= 0) && styles.continueBtnDisabled
                ]}
                onPress={() => amount && parseFloat(amount) > 0 && setStep('method')}
                disabled={!amount || parseFloat(amount) <= 0}
                data-testid="continue-btn"
              >
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Method Selection */}
          {step === 'method' && (
            <Animated.View 
              style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              {/* Amount Summary */}
              <TouchableOpacity style={styles.amountSummary} onPress={() => setStep('amount')} data-testid="change-amount-btn">
                <View>
                  <Text style={styles.amountSummaryLabel}>Amount</Text>
                  <Text style={styles.amountSummaryValue}>{formatCurrency(parseFloat(amount))}</Text>
                </View>
                <View style={styles.changeBtn}>
                  <Ionicons name="pencil" size={14} color={COLORS.gray} />
                </View>
              </TouchableOpacity>

              <Text style={styles.stepLabel}>Select Payment Method</Text>

              {/* Mobile Money */}
              {config.payment_methods.mobile_money.enabled && (
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => { setSelectedMethod('mobile_money'); setStep('details'); }}
                  activeOpacity={0.7}
                  data-testid="method-mobile-money"
                >
                  <View style={[styles.methodIconBox, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="phone-portrait" size={24} color="#10B981" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Mobile Money</Text>
                    <Text style={styles.methodDesc}>
                      {config.payment_methods.mobile_money.providers.slice(0, 3).map(p => p.name).join(' • ')}
                    </Text>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Bank Transfer */}
              {config.payment_methods.bank_transfer.enabled && (
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => { setSelectedMethod('bank_transfer'); setStep('details'); }}
                  activeOpacity={0.7}
                  data-testid="method-bank-transfer"
                >
                  <View style={[styles.methodIconBox, { backgroundColor: '#3B82F620' }]}>
                    <Ionicons name="business" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Bank Transfer</Text>
                    <Text style={styles.methodDesc}>
                      {config.payment_methods.bank_transfer.banks.length} banks available
                    </Text>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Card */}
              {config.payment_methods.card.enabled && (
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => { setSelectedMethod('card'); setStep('details'); }}
                  activeOpacity={0.7}
                  data-testid="method-card"
                >
                  <View style={[styles.methodIconBox, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="card" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Debit/Credit Card</Text>
                    <Text style={styles.methodDesc}>Visa • Mastercard</Text>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </View>
                </TouchableOpacity>
              )}

              {/* QR Code */}
              {config.payment_methods.qr.enabled && (
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => { setSelectedMethod('qr'); handlePayment(); }}
                  activeOpacity={0.7}
                  data-testid="method-qr"
                >
                  <View style={[styles.methodIconBox, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="qr-code" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Scan QR Code</Text>
                    <Text style={styles.methodDesc}>Pay with any banking app</Text>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Details Step */}
          {step === 'details' && (
            <Animated.View 
              style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <TouchableOpacity style={styles.backRow} onPress={() => setStep('method')} data-testid="back-btn">
                <Ionicons name="arrow-back" size={20} color={COLORS.gray} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              {/* Amount Summary */}
              <View style={styles.amountSummaryCompact}>
                <Text style={styles.amountSummaryLabel}>Amount</Text>
                <Text style={styles.amountSummaryValue}>{formatCurrency(parseFloat(amount))}</Text>
              </View>

              {/* Mobile Money Details */}
              {selectedMethod === 'mobile_money' && (
                <>
                  <Text style={styles.stepLabel}>Enter Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.phonePrefix}>
                      <Text style={styles.phonePrefixText}>+{config.country.code === 'TZ' ? '255' : config.country.code === 'KE' ? '254' : '256'}</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="7XX XXX XXX"
                      placeholderTextColor={COLORS.border}
                      autoFocus
                      data-testid="phone-input"
                    />
                  </View>
                  
                  {detectedMNO?.detected && (
                    <View style={[styles.detectedBadge, { backgroundColor: detectedMNO.color + '20', borderColor: detectedMNO.color + '40' }]}>
                      <View style={[styles.detectedDot, { backgroundColor: detectedMNO.color }]} />
                      <Text style={[styles.detectedText, { color: detectedMNO.color }]}>
                        {detectedMNO.name}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.selectProviderLabel}>Or select provider</Text>
                  <View style={styles.providersGrid}>
                    {config.payment_methods.mobile_money.providers.map((mno) => (
                      <TouchableOpacity
                        key={mno.code}
                        style={[
                          styles.providerItem,
                          selectedProvider?.code === mno.code && { 
                            borderColor: mno.color, 
                            backgroundColor: mno.color + '15' 
                          }
                        ]}
                        onPress={() => setSelectedProvider(mno)}
                        data-testid={`provider-${mno.code}`}
                      >
                        <View style={[styles.providerIcon, { backgroundColor: mno.color }]}>
                          <Text style={styles.providerInitial}>{mno.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.providerName}>{mno.name}</Text>
                        {selectedProvider?.code === mno.code && (
                          <Ionicons name="checkmark-circle" size={18} color={mno.color} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Bank Transfer Details */}
              {selectedMethod === 'bank_transfer' && (
                <>
                  <Text style={styles.stepLabel}>Select Your Bank</Text>
                  <View style={styles.banksGrid}>
                    {(showAllBanks ? config.payment_methods.bank_transfer.banks : config.payment_methods.bank_transfer.banks.slice(0, 6)).map((bank) => (
                      <TouchableOpacity
                        key={bank.code}
                        style={[
                          styles.bankItem,
                          selectedProvider?.code === bank.code && { 
                            borderColor: bank.color, 
                            backgroundColor: bank.color + '15' 
                          }
                        ]}
                        onPress={() => setSelectedProvider(bank)}
                        data-testid={`bank-${bank.code}`}
                      >
                        <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                          <Text style={styles.bankInitial}>{bank.code.substring(0, 2)}</Text>
                        </View>
                        <Text style={styles.bankName} numberOfLines={1}>{bank.name}</Text>
                        {selectedProvider?.code === bank.code && (
                          <Ionicons name="checkmark-circle" size={16} color={bank.color} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {config.payment_methods.bank_transfer.banks.length > 6 && (
                    <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllBanks(!showAllBanks)}>
                      <Text style={[styles.showMoreText, { color: themeColor }]}>
                        {showAllBanks ? 'Show Less' : `+ ${config.payment_methods.bank_transfer.banks.length - 6} More`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Card Details */}
              {selectedMethod === 'card' && (
                <>
                  <Text style={styles.stepLabel}>Card Payment</Text>
                  <View style={styles.cardSecureBox}>
                    <Ionicons name="lock-closed" size={20} color={COLORS.success} />
                    <Text style={styles.cardSecureText}>
                      You'll be redirected to {config.payment_methods.card.provider} for secure payment
                    </Text>
                  </View>
                  <View style={styles.cardLogos}>
                    <View style={styles.cardLogo}>
                      <Text style={styles.cardLogoText}>VISA</Text>
                    </View>
                    <View style={styles.cardLogo}>
                      <Text style={styles.cardLogoText}>MC</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Pay Button */}
              <TouchableOpacity
                style={[
                  styles.payBtn, 
                  { backgroundColor: themeColor },
                  (processing || (selectedMethod === 'mobile_money' && !phoneNumber) || (selectedMethod === 'bank_transfer' && !selectedProvider)) && styles.payBtnDisabled
                ]}
                onPress={handlePayment}
                disabled={processing || (selectedMethod === 'mobile_money' && !phoneNumber) || (selectedMethod === 'bank_transfer' && !selectedProvider)}
                data-testid="pay-btn"
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color={COLORS.white} />
                    <Text style={styles.payBtnText}>Pay {formatCurrency(parseFloat(amount))}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
        <Footer />
      </LinearGradient>
    </View>
  );
}

const Footer = () => (
  <View style={styles.footer}>
    <View style={styles.footerContent}>
      <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
      <Text style={styles.footerText}>Secured by</Text>
      <Text style={styles.footerBrand}>KwikPay</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gradientBg: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingPulse: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20 
  },
  loadingText: { marginTop: 24, fontSize: 16, color: COLORS.lightGray, letterSpacing: 0.5 },
  loadingDots: { flexDirection: 'row', marginTop: 16, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gray },
  
  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorIconContainer: { marginBottom: 24 },
  errorIconBg: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: COLORS.error + '15', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.error + '30'
  },
  errorTitle: { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  errorText: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22 },
  errorHint: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, 
    marginTop: 24, padding: 12, borderRadius: 8, backgroundColor: COLORS.card 
  },
  errorHintText: { fontSize: 13, color: COLORS.gray },
  
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  merchantBadge: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  merchantAvatar: { 
    width: 48, height: 48, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center' 
  },
  merchantInitial: { fontSize: 20, fontWeight: '700' },
  payingTo: { fontSize: 12, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 1 },
  merchantName: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginTop: 2 },
  securityBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.card 
  },
  securityText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  
  // Steps
  stepContainer: { padding: 24 },
  stepLabel: { 
    fontSize: 14, fontWeight: '600', color: COLORS.gray, 
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 
  },
  
  // Amount
  amountCard: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.card, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border 
  },
  currencyBig: { fontSize: 32, fontWeight: '300', color: COLORS.gray, marginRight: 8 },
  amountInput: { 
    flex: 1, fontSize: 48, fontWeight: '700', color: COLORS.white, 
    padding: 0, fontVariant: ['tabular-nums'] 
  },
  quickAmounts: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickAmountBtn: { 
    flex: 1, paddingVertical: 12, borderRadius: 10, 
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' 
  },
  quickAmountActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  quickAmountText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  quickAmountTextActive: { color: COLORS.accent },
  continueBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 18, borderRadius: 14, marginTop: 24, gap: 8 
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  
  // Amount Summary
  amountSummary: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border 
  },
  amountSummaryCompact: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24 
  },
  amountSummaryLabel: { fontSize: 13, color: COLORS.gray },
  amountSummaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 2 },
  changeBtn: { 
    width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.cardHover, 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  // Methods
  methodCard: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border 
  },
  methodIconBox: { 
    width: 52, height: 52, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center' 
  },
  methodInfo: { flex: 1, marginLeft: 14 },
  methodName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  methodDesc: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  methodArrow: { 
    width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.cardHover, 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  // Back
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { fontSize: 14, color: COLORS.gray },
  
  // Phone Input
  phoneInputContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 
  },
  phonePrefix: { 
    paddingHorizontal: 16, paddingVertical: 18, 
    backgroundColor: COLORS.cardHover, borderRightWidth: 1, borderRightColor: COLORS.border 
  },
  phonePrefixText: { fontSize: 16, fontWeight: '600', color: COLORS.gray },
  phoneInput: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.white, padding: 16 },
  
  // Detected
  detectedBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 8,
    borderWidth: 1, marginBottom: 20 
  },
  detectedDot: { width: 8, height: 8, borderRadius: 4 },
  detectedText: { fontSize: 14, fontWeight: '600' },
  
  // Providers
  selectProviderLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  providersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  providerItem: { 
    width: '48%', flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, gap: 10,
    borderWidth: 1, borderColor: COLORS.border 
  },
  providerIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  providerInitial: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  providerName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.white },
  
  // Banks
  banksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bankItem: { 
    width: '48%', flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12, gap: 10,
    borderWidth: 1, borderColor: COLORS.border 
  },
  bankIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  bankInitial: { color: COLORS.white, fontWeight: '700', fontSize: 11 },
  bankName: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.white },
  showMoreBtn: { alignItems: 'center', marginTop: 16 },
  showMoreText: { fontSize: 14, fontWeight: '600' },
  
  // Card
  cardSecureBox: { 
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, 
    backgroundColor: COLORS.successGlow, borderRadius: 12, padding: 16, 
    borderWidth: 1, borderColor: COLORS.success + '30' 
  },
  cardSecureText: { flex: 1, fontSize: 14, color: COLORS.success, lineHeight: 20 },
  cardLogos: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 },
  cardLogo: { 
    backgroundColor: COLORS.card, paddingHorizontal: 24, paddingVertical: 12, 
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border 
  },
  cardLogoText: { fontSize: 16, fontWeight: '700', color: COLORS.lightGray },
  
  // Pay Button
  payBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 18, borderRadius: 14, marginTop: 28, gap: 10 
  },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  
  // Processing
  processingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  processingIcon: { marginBottom: 24 },
  processingRing: { 
    position: 'absolute', width: 80, height: 80, borderRadius: 40, 
    borderWidth: 2, opacity: 0.3 
  },
  processingTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  processingText: { fontSize: 15, color: COLORS.gray, marginTop: 8 },
  
  // Success
  successContainer: { flexGrow: 1, padding: 32, paddingTop: 60, alignItems: 'center' },
  successContent: { alignItems: 'center', width: '100%' },
  successIconRing: { 
    width: 120, height: 120, borderRadius: 60, 
    backgroundColor: COLORS.successGlow, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.success + '30' 
  },
  successIconInner: { 
    width: 88, height: 88, borderRadius: 44, 
    backgroundColor: COLORS.success + '20', justifyContent: 'center', alignItems: 'center' 
  },
  successTitle: { fontSize: 26, fontWeight: '700', color: COLORS.white, marginTop: 24 },
  successAmount: { fontSize: 40, fontWeight: '700', color: COLORS.success, marginTop: 8 },
  successMerchant: { fontSize: 16, color: COLORS.gray, marginTop: 4 },
  refCard: { 
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginTop: 28, width: '100%',
    borderWidth: 1, borderColor: COLORS.border 
  },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refLabel: { fontSize: 12, color: COLORS.gray, textTransform: 'uppercase' },
  refValue: { fontSize: 18, fontWeight: '600', color: COLORS.white, marginTop: 6, fontFamily: 'monospace' },
  instructionsCard: { 
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14, 
    padding: 16, marginTop: 20, gap: 14, width: '100%', borderWidth: 1 
  },
  instructionsIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  instructionsContent: { flex: 1 },
  instructionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  instructionsText: { fontSize: 14, color: COLORS.gray, marginTop: 4, lineHeight: 20 },
  newPaymentBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 32, paddingVertical: 14, paddingHorizontal: 24, 
    borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border 
  },
  newPaymentText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  
  // Footer
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg + 'F0' 
  },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerText: { fontSize: 12, color: COLORS.gray },
  footerBrand: { fontSize: 12, fontWeight: '700', color: COLORS.success },
});
