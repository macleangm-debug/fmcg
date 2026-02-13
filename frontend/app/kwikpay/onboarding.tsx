import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Country {
  code: string;
  name: string;
  currency: string;
  currency_symbol: string;
  phone_prefix: string;
  banks: { code: string; name: string }[];
  mobile_money: string[];
}

interface FeeStructure {
  transaction_fees: {
    [key: string]: { percent: number; fixed: number; description: string };
  };
  payout_fees: { [key: string]: { amount: number; description: string } };
  settlement_period: string;
  minimum_payout: { [key: string]: number };
}

interface OnboardingStatus {
  onboarding_step: number;
  business_id?: string;
  checkout_code?: string;
  business_name?: string;
  bank_account?: any;
}

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Store', icon: 'storefront-outline' },
  { value: 'restaurant', label: 'Restaurant / Food', icon: 'restaurant-outline' },
  { value: 'services', label: 'Professional Services', icon: 'briefcase-outline' },
  { value: 'online', label: 'Online / E-commerce', icon: 'globe-outline' },
  { value: 'other', label: 'Other', icon: 'apps-outline' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showBusinessTypePicker, setShowBusinessTypePicker] = useState(false);
  
  // Form data
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    business_type: 'retail',
    owner_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    country_code: 'TZ',
    address: '',
    city: '',
    tax_id: '',
    website: '',
    expected_monthly_volume: '',
  });

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
    branch: '',
    swift_code: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [feesAccepted, setFeesAccepted] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  const selectedCountry = countries.find(c => c.code === businessForm.country_code);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch countries and fee structure in parallel
      const [countriesRes, feesRes, statusRes] = await Promise.all([
        api.get('/merchant-onboarding/countries'),
        api.get('/merchant-onboarding/fee-structure'),
        api.get('/merchant-onboarding/status').catch(() => ({ data: { onboarding_step: 1 } })),
      ]);

      setCountries(countriesRes.data.countries);
      setFeeStructure(feesRes.data);
      
      if (statusRes.data.onboarding_step > 1) {
        setOnboardingStatus(statusRes.data);
        setCurrentStep(statusRes.data.onboarding_step);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleBusinessRegistration = async () => {
    if (!businessForm.business_name || !businessForm.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/merchant-onboarding/register', businessForm);
      
      if (response.data.success) {
        setOnboardingStatus({
          ...onboardingStatus,
          onboarding_step: 2,
          business_id: response.data.business_id,
          checkout_code: response.data.checkout_code,
        });
        setCurrentStep(2);
        Alert.alert('Success', `Business registered! Your checkout code is: ${response.data.checkout_code}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankSetup = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      Alert.alert('Error', 'Please fill in all required bank details');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/merchant-onboarding/bank-account', bankForm);
      
      if (response.data.success) {
        setOnboardingStatus({
          ...onboardingStatus,
          onboarding_step: 3,
          bank_account: bankForm,
        });
        setCurrentStep(3);
        Alert.alert('Success', 'Bank account added successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!termsAccepted || !feesAccepted) {
      Alert.alert('Error', 'Please accept both the terms and fee structure');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/merchant-onboarding/complete', {
        accept_terms: termsAccepted,
        accept_fees: feesAccepted,
      });
      
      if (response.data.success) {
        setCurrentStep(4);
        Alert.alert(
          'Congratulations!',
          'Your merchant account is now active. You can start accepting payments!',
          [
            { text: 'Go to Dashboard', onPress: () => router.push('/kwikpay') }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted,
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}>{step}</Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive,
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Business Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about your business</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.input}
          value={businessForm.business_name}
          onChangeText={(text) => setBusinessForm({ ...businessForm, business_name: text })}
          placeholder="Enter your business name"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Type *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowBusinessTypePicker(true)}
        >
          <Ionicons
            name={BUSINESS_TYPES.find(t => t.value === businessForm.business_type)?.icon as any || 'business-outline'}
            size={20}
            color={COLORS.gray}
          />
          <Text style={styles.selectButtonText}>
            {BUSINESS_TYPES.find(t => t.value === businessForm.business_type)?.label || 'Select Type'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Country *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowCountryPicker(true)}
        >
          <Ionicons name="location-outline" size={20} color={COLORS.gray} />
          <Text style={styles.selectButtonText}>
            {selectedCountry?.name || 'Select Country'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Owner Name *</Text>
        <TextInput
          style={styles.input}
          value={businessForm.owner_name}
          onChangeText={(text) => setBusinessForm({ ...businessForm, owner_name: text })}
          placeholder="Full name of business owner"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <View style={styles.phoneInputContainer}>
          <Text style={styles.phonePrefix}>{selectedCountry?.phone_prefix || '+255'}</Text>
          <TextInput
            style={styles.phoneInput}
            value={businessForm.phone}
            onChangeText={(text) => setBusinessForm({ ...businessForm, phone: text })}
            placeholder="712345678"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={businessForm.email}
          onChangeText={(text) => setBusinessForm({ ...businessForm, email: text })}
          placeholder="business@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Address</Text>
        <TextInput
          style={styles.input}
          value={businessForm.address}
          onChangeText={(text) => setBusinessForm({ ...businessForm, address: text })}
          placeholder="Street address"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>City</Text>
        <TextInput
          style={styles.input}
          value={businessForm.city}
          onChangeText={(text) => setBusinessForm({ ...businessForm, city: text })}
          placeholder="City"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        onPress={handleBusinessRegistration}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Bank Account Setup</Text>
      <Text style={styles.stepSubtitle}>Where should we send your payouts?</Text>

      {onboardingStatus?.checkout_code && (
        <View style={styles.infoCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Business Registered!</Text>
            <Text style={styles.infoCardText}>
              Your checkout code: <Text style={styles.codeText}>{onboardingStatus.checkout_code}</Text>
            </Text>
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bank *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowBankPicker(true)}
        >
          <Ionicons name="business-outline" size={20} color={COLORS.gray} />
          <Text style={styles.selectButtonText}>
            {bankForm.bank_name || 'Select your bank'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Account Number *</Text>
        <TextInput
          style={styles.input}
          value={bankForm.account_number}
          onChangeText={(text) => setBankForm({ ...bankForm, account_number: text })}
          placeholder="Enter account number"
          keyboardType="number-pad"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Account Name *</Text>
        <TextInput
          style={styles.input}
          value={bankForm.account_name}
          onChangeText={(text) => setBankForm({ ...bankForm, account_name: text })}
          placeholder="Name on bank account"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Branch (Optional)</Text>
        <TextInput
          style={styles.input}
          value={bankForm.branch}
          onChangeText={(text) => setBankForm({ ...bankForm, branch: text })}
          placeholder="Branch name"
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        onPress={handleBankSetup}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Accept</Text>
      <Text style={styles.stepSubtitle}>Review our terms and fee structure</Text>

      {/* Fee Structure Card */}
      {feeStructure && (
        <View style={styles.feeCard}>
          <Text style={styles.feeCardTitle}>Transaction Fees</Text>
          {Object.entries(feeStructure.transaction_fees).map(([key, fee]) => (
            <View key={key} style={styles.feeRow}>
              <Text style={styles.feeLabel}>{fee.description}</Text>
              <Text style={styles.feeValue}>{fee.percent}%</Text>
            </View>
          ))}
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Settlement Period</Text>
            <Text style={styles.feeValue}>{feeStructure.settlement_period}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Payout Fee ({selectedCountry?.currency || 'TZS'})</Text>
            <Text style={styles.feeValue}>
              {selectedCountry?.currency_symbol || 'TSh'} {feeStructure.payout_fees[selectedCountry?.currency || 'TZS']?.amount || 500}
            </Text>
          </View>
        </View>
      )}

      {/* Terms Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setTermsAccepted(!termsAccepted)}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      {/* Fees Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setFeesAccepted(!feesAccepted)}
      >
        <View style={[styles.checkbox, feesAccepted && styles.checkboxChecked]}>
          {feesAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
        </View>
        <Text style={styles.checkboxLabel}>
          I understand and accept the fee structure above
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!termsAccepted || !feesAccepted || submitting) && styles.buttonDisabled
        ]}
        onPress={handleCompleteOnboarding}
        disabled={!termsAccepted || !feesAccepted || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Complete Setup</Text>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.successContent}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
      </View>
      <Text style={styles.successTitle}>You're All Set!</Text>
      <Text style={styles.successSubtitle}>
        Your merchant account is now active and ready to accept payments.
      </Text>

      {onboardingStatus?.checkout_code && (
        <View style={styles.checkoutInfo}>
          <Text style={styles.checkoutLabel}>Your Checkout URL</Text>
          <View style={styles.checkoutUrlBox}>
            <Text style={styles.checkoutUrl}>/pay/{onboardingStatus.checkout_code}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.nextStepsCard}>
        <Text style={styles.nextStepsTitle}>Next Steps</Text>
        <View style={styles.nextStepItem}>
          <Ionicons name="card-outline" size={20} color={COLORS.primary} />
          <Text style={styles.nextStepText}>Create your first checkout link</Text>
        </View>
        <View style={styles.nextStepItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.nextStepText}>Complete KYC verification</Text>
        </View>
        <View style={styles.nextStepItem}>
          <Ionicons name="code-slash-outline" size={20} color={COLORS.primary} />
          <Text style={styles.nextStepText}>Integrate with your website</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/kwikpay')}
      >
        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Merchant Onboarding</Text>
          <Text style={styles.pageSubtitle}>Set up your payment account</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Business</Text>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Bank</Text>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Review</Text>
          <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>Done</Text>
        </View>
        {renderStepIndicator()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {countries.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.optionItem,
                    businessForm.country_code === country.code && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setBusinessForm({ ...businessForm, country_code: country.code });
                    setBankForm({ ...bankForm, bank_name: '', bank_code: '' });
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{country.name}</Text>
                  <Text style={styles.optionSubtext}>{country.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bank Picker Modal */}
      <Modal visible={showBankPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectedCountry?.banks.map(bank => (
                <TouchableOpacity
                  key={bank.code}
                  style={[
                    styles.optionItem,
                    bankForm.bank_code === bank.code && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setBankForm({ ...bankForm, bank_name: bank.name, bank_code: bank.code });
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{bank.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Business Type Picker Modal */}
      <Modal visible={showBusinessTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Business Type</Text>
              <TouchableOpacity onPress={() => setShowBusinessTypePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {BUSINESS_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.optionItem,
                    businessForm.business_type === type.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setBusinessForm({ ...businessForm, business_type: type.value });
                    setShowBusinessTypePicker(false);
                  }}
                >
                  <Ionicons name={type.icon as any} size={20} color={COLORS.gray} />
                  <Text style={[styles.optionText, { marginLeft: 12 }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  stepNumberActive: {
    color: COLORS.white,
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
  },
  stepContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.gray,
    backgroundColor: COLORS.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  infoCardText: {
    fontSize: 13,
    color: COLORS.dark,
    marginTop: 2,
  },
  codeText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  feeCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  feeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 22,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  successContent: {
    alignItems: 'center',
    padding: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  checkoutInfo: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  checkoutLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  checkoutUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  checkoutUrl: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  nextStepsCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  nextStepText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  optionSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
});
