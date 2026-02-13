import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  TextInput,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { businessApi, subscriptionApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import LinkedAppsManager from '../../src/components/LinkedAppsManager';

// Country data
const COUNTRIES = [
  { name: 'Kenya', code: '+254', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
  { name: 'Tanzania', code: '+255', cities: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Zanzibar'] },
  { name: 'Uganda', code: '+256', cities: ['Kampala', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'] },
  { name: 'Rwanda', code: '+250', cities: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi'] },
  { name: 'Nigeria', code: '+234', cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'] },
  { name: 'South Africa', code: '+27', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'] },
  { name: 'Ghana', code: '+233', cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema'] },
  { name: 'United States', code: '+1', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'] },
  { name: 'United Kingdom', code: '+44', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool'] },
  { name: 'India', code: '+91', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'] },
  { name: 'United Arab Emirates', code: '+971', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'] },
];

const CURRENCIES = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

export default function UnitxtSettings() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { loadSettings: reloadBusinessSettings } = useBusinessStore();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'messaging' | 'apps' | 'subscription'>('general');

  // Business form state
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('+1');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formCurrencySymbol, setFormCurrencySymbol] = useState('$');

  // Messaging settings (user-friendly, no provider details)
  const [defaultSenderName, setDefaultSenderName] = useState('');
  const [defaultCountryCode, setDefaultCountryCode] = useState('+1');
  const [enableDeliveryReports, setEnableDeliveryReports] = useState(true);
  const [enableLowCreditAlerts, setEnableLowCreditAlerts] = useState(true);
  const [lowCreditThreshold, setLowCreditThreshold] = useState('100');
  const [enableAutoRetry, setEnableAutoRetry] = useState(true);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState('3');

  // Sender ID Management
  const [senderIds, setSenderIds] = useState<Array<{
    id: string;
    name: string;
    status: 'active' | 'pending' | 'rejected';
    createdAt: string;
    usageCount: number;
    country?: string;
    countryCode?: string;
  }>>([]);
  const [showAddSenderIdModal, setShowAddSenderIdModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Separate confirmation modal
  const [newSenderId, setNewSenderId] = useState('');
  const [senderIdError, setSenderIdError] = useState('');
  const [registeringSenderId, setRegisteringSenderId] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [selectedCountryForSenderId, setSelectedCountryForSenderId] = useState<{name: string, code: string} | null>(null);
  const [showCountrySelectModal, setShowCountrySelectModal] = useState(false);
  const SENDER_ID_COST = 100;

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [availableApps, setAvailableApps] = useState<any[]>([]);

  // Modals
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const allowedRoles = ['admin', 'superadmin'];
    if (currentUser && !allowedRoles.includes(currentUser?.role)) {
      Alert.alert('Access Denied', 'Only admins can access settings');
      router.back();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const businessRes = await businessApi.get();
      const b = businessRes.data;
      setFormName(b.name || '');
      setFormAddress(b.address || '');
      setFormCity(b.city || '');
      setFormCountry(b.country || '');
      setFormCountryCode(b.country_code || '+1');
      setFormPhone(b.phone || '');
      setFormEmail(b.email || '');
      setFormCurrency(b.currency || 'USD');
      setFormCurrencySymbol(b.currency_symbol || '$');
      setDefaultSenderName(b.name || '');
      setDefaultCountryCode(b.country_code || '+1');
    } catch (error) {
      console.log('Failed to fetch business settings:', error);
      // Set default values if business fetch fails
      setFormName('My Business');
      setFormCurrency('USD');
      setFormCurrencySymbol('$');
      setFormCountryCode('+1');
      setDefaultCountryCode('+1');
    }

    // Fetch Sender IDs and Credits
    try {
      const senderIdsRes = await api.get('/unitxt/sender-ids');
      setSenderIds(senderIdsRes.data?.sender_ids?.map((s: any) => ({
        id: s.id,
        name: s.name,
        status: s.status as 'active' | 'pending' | 'rejected',
        createdAt: s.created_at,
        usageCount: s.usage_count,
      })) || []);
      setUserCredits(senderIdsRes.data?.credits_balance || 0);
    } catch (error) {
      console.log('Failed to fetch sender IDs:', error);
      setSenderIds([]);
    }

    // Fetch credits separately if needed
    try {
      const creditsRes = await api.get('/unitxt/credits');
      setUserCredits(creditsRes.data?.balance || 0);
    } catch {
      // Credits already set from sender-ids call or default to 0
    }

    try {
      const subscriptionRes = await subscriptionApi.getStatus();
      setCurrentPlan(subscriptionRes.data);
      setSubscription({
        plan_name: subscriptionRes.data?.plan?.name || 'Starter',
        status: subscriptionRes.data?.status || 'active',
        days_remaining: subscriptionRes.data?.days_remaining || 30,
        is_trial: subscriptionRes.data?.is_trial || false,
      });
    } catch {
      setSubscription({
        plan_name: 'Starter',
        status: 'active',
        days_remaining: 30,
        is_trial: true,
      });
    }

    try {
      const plansRes = await subscriptionApi.getPlans();
      setPlans(plansRes.data?.plans || []);
    } catch {
      setPlans([]);
    }

    try {
      const availableRes = await subscriptionApi.getAvailableApps();
      setAvailableApps(availableRes.data?.available_apps || []);
    } catch {
      setAvailableApps([]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleSaveBusiness = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    setSaving(true);
    try {
      await businessApi.update({
        name: formName.trim(),
        address: formAddress.trim() || undefined,
        city: formCity || undefined,
        country: formCountry || undefined,
        country_code: formCountryCode,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        currency: formCurrency,
        currency_symbol: formCurrencySymbol,
      });
      
      await reloadBusinessSettings();
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Sender ID Validation
  const validateSenderId = (id: string): string | null => {
    if (!id.trim()) {
      return 'Sender ID is required';
    }
    if (id.length > 11) {
      return 'Sender ID must be 11 characters or less';
    }
    if (!/^[A-Za-z0-9]+$/.test(id)) {
      return 'Only letters and numbers allowed (no spaces or special characters)';
    }
    if (/^\d+$/.test(id)) {
      return 'Sender ID cannot be all numbers';
    }
    if (senderIds.some(s => s.name.toUpperCase() === id.toUpperCase())) {
      return 'This Sender ID is already registered';
    }
    return null;
  };

  // Register new Sender ID - Step 1: Validate and show confirmation modal
  const handleContinueRegistration = () => {
    const upperCaseSenderId = newSenderId.toUpperCase().trim();
    const error = validateSenderId(upperCaseSenderId);
    
    if (error) {
      setSenderIdError(error);
      return;
    }

    if (!selectedCountryForSenderId) {
      setSenderIdError('Please select a country for this Sender ID');
      return;
    }

    if (userCredits < SENDER_ID_COST) {
      setSenderIdError(`Insufficient credits. You need ${SENDER_ID_COST} credits but only have ${userCredits}.`);
      return;
    }

    // Close input modal and show confirmation modal
    setShowAddSenderIdModal(false);
    setShowConfirmModal(true);
  };

  // Register new Sender ID - Step 2: Confirm and submit
  const handleConfirmRegistration = async () => {
    const upperCaseSenderId = newSenderId.toUpperCase().trim();
    
    setRegisteringSenderId(true);
    try {
      const response = await api.post('/unitxt/sender-ids', {
        name: upperCaseSenderId,
        country: selectedCountryForSenderId?.name,
        country_code: selectedCountryForSenderId?.code
      });
      
      if (response.data.success) {
        const newId = {
          id: response.data.sender_id.id,
          name: response.data.sender_id.name,
          status: response.data.sender_id.status as 'active' | 'pending' | 'rejected',
          createdAt: response.data.sender_id.created_at,
          usageCount: response.data.sender_id.usage_count,
          country: selectedCountryForSenderId?.name,
          countryCode: selectedCountryForSenderId?.code,
        };
        setSenderIds(prev => [...prev, newId]);
        setUserCredits(response.data.credits_remaining);
        
        // Reset and close
        setShowConfirmModal(false);
        setNewSenderId('');
        setSenderIdError('');
        setSelectedCountryForSenderId(null);
        
        // Show success
        if (Platform.OS === 'web') {
          window.alert(`✅ Sender ID "${upperCaseSenderId}" submitted for approval!\n\n⏱ Estimated approval: 24-72 hours\n💳 ${response.data.credits_deducted} credits deducted\n🌍 Country: ${selectedCountryForSenderId?.name}`);
        } else {
          Alert.alert(
            'Submitted for Approval',
            `Sender ID "${upperCaseSenderId}" has been submitted!\n\n⏱ Estimated approval: 24-72 hours\n💳 ${response.data.credits_deducted} credits deducted\n🌍 Country: ${selectedCountryForSenderId?.name}`
          );
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to register Sender ID. Please try again.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setRegisteringSenderId(false);
    }
  };

  // Cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setShowAddSenderIdModal(true); // Go back to input modal
  };

  // Delete Sender ID
  const handleDeleteSenderId = (id: string, name: string) => {
    Alert.alert(
      'Delete Sender ID',
      `Are you sure you want to delete "${name}"?\n\nNote: Credits are not refundable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/unitxt/sender-ids/${id}`);
              if (response.data.success) {
                setSenderIds(prev => prev.filter(s => s.id !== id));
                Alert.alert('Deleted', `Sender ID "${name}" has been removed.`);
              }
            } catch (err: any) {
              const errorMessage = err.response?.data?.detail || 'Failed to delete Sender ID.';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleSaveMessagingSettings = async () => {
    setSaving(true);
    try {
      // Save messaging-specific settings
      // In production, this would call a Unitxt-specific API
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save messaging settings');
    } finally {
      setSaving(false);
    }
  };

  const getCitiesForCountry = () => {
    const country = COUNTRIES.find(c => c.name === formCountry);
    return country?.cities || [];
  };

  const handleSelectCountry = (country: typeof COUNTRIES[0]) => {
    setFormCountry(country.name);
    setFormCountryCode(country.code);
    setDefaultCountryCode(country.code);
    setFormCity('');
    setShowCountryModal(false);
  };

  const handleSelectCurrency = (currency: typeof CURRENCIES[0]) => {
    setFormCurrency(currency.code);
    setFormCurrencySymbol(currency.symbol);
    setShowCurrencyModal(false);
  };

  const allowedRoles = ['admin', 'superadmin'];
  if (currentUser && !allowedRoles.includes(currentUser?.role)) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.tabActive]}
          onPress={() => setActiveTab('general')}
        >
          <Ionicons name="settings-outline" size={18} color={activeTab === 'general' ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messaging' && styles.tabActive]}
          onPress={() => setActiveTab('messaging')}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={activeTab === 'messaging' ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.tabText, activeTab === 'messaging' && styles.tabTextActive]}>Messaging</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'apps' && styles.tabActive]}
          onPress={() => setActiveTab('apps')}
        >
          <Ionicons name="apps-outline" size={18} color={activeTab === 'apps' ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.tabText, activeTab === 'apps' && styles.tabTextActive]}>Apps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
          onPress={() => setActiveTab('subscription')}
        >
          <Ionicons name="card-outline" size={18} color={activeTab === 'subscription' ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Mobile Card Container */}
      <View style={styles.mobileCardContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.listInsideCard}
          >
          {/* General Tab */}
          {activeTab === 'general' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                <Input
                  label="Business Name *"
                  placeholder="Enter your business name"
                  value={formName}
                  onChangeText={setFormName}
                  leftIcon={<Ionicons name="business-outline" size={20} color={COLORS.gray} />}
                />
                
                <Input
                  label="Address"
                  placeholder="Enter your street address"
                  value={formAddress}
                  onChangeText={setFormAddress}
                  leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray} />}
                />

                {/* Country Dropdown */}
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>Country</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Ionicons name="globe-outline" size={20} color={COLORS.gray} />
                    <Text style={[styles.dropdownText, !formCountry && styles.dropdownPlaceholder]}>
                      {formCountry || 'Select country'}
                    </Text>
                    <Text style={styles.countryCode}>{formCountryCode}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                {/* City Dropdown */}
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>City</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      if (!formCountry) {
                        Alert.alert('Select Country', 'Please select a country first');
                        return;
                      }
                      setShowCityModal(true);
                    }}
                  >
                    <Ionicons name="location-outline" size={20} color={COLORS.gray} />
                    <Text style={[styles.dropdownText, !formCity && styles.dropdownPlaceholder]}>
                      {formCity || 'Select city'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                {/* Currency Dropdown */}
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>Currency</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowCurrencyModal(true)}
                  >
                    <Text style={styles.currencySymbol}>{formCurrencySymbol}</Text>
                    <Text style={styles.dropdownText}>
                      {formCurrency} - {CURRENCIES.find(c => c.code === formCurrency)?.name || formCurrency}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Ionicons name="call-outline" size={20} color={COLORS.gray} />
                      <Text style={styles.countryCodeText}>{formCountryCode}</Text>
                    </View>
                    <TextInput
                      style={styles.phoneNumberInput}
                      placeholder="123456789"
                      placeholderTextColor="#9CA3AF"
                      value={formPhone}
                      onChangeText={setFormPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                
                <Input
                  label="Email"
                  placeholder="Enter your email address"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray} />}
                />
              </View>

              <Button
                title="Save Business Details"
                onPress={handleSaveBusiness}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          )}

          {/* Messaging Tab */}
          {activeTab === 'messaging' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Sender Settings</Text>
                
                <Input
                  label="Default Sender Name"
                  placeholder="Your Business Name"
                  value={defaultSenderName}
                  onChangeText={setDefaultSenderName}
                  leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.gray} />}
                />
                <Text style={styles.inputHint}>This name appears as the sender on SMS messages</Text>

                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>Default Country Code</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Ionicons name="globe-outline" size={20} color={COLORS.gray} />
                    <Text style={styles.dropdownText}>{defaultCountryCode}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>Default country code for phone numbers without one</Text>
              </View>

              {/* Sender ID Management */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Sender IDs</Text>
                    <Text style={styles.sectionSubtitle}>Register custom sender names for your messages</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addSenderIdBtn}
                    onPress={() => setShowAddSenderIdModal(true)}
                  >
                    <Ionicons name="add" size={18} color={COLORS.white} />
                    <Text style={styles.addSenderIdBtnText}>Add New</Text>
                  </TouchableOpacity>
                </View>

                {/* Credits Balance */}
                <View style={styles.creditsBalanceCard}>
                  <View style={styles.creditsIcon}>
                    <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.creditsInfo}>
                    <Text style={styles.creditsLabel}>Available Credits</Text>
                    <Text style={styles.creditsValue}>{userCredits.toLocaleString()}</Text>
                  </View>
                  <View style={styles.senderIdCost}>
                    <Text style={styles.costLabel}>Cost per Sender ID</Text>
                    <Text style={styles.costValue}>{SENDER_ID_COST} credits</Text>
                  </View>
                </View>

                {/* Sender IDs List */}
                {senderIds.length === 0 ? (
                  <View style={styles.emptySenderIds}>
                    <Ionicons name="pricetag-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.emptyTitle}>No Sender IDs</Text>
                    <Text style={styles.emptySubtitle}>Register a custom Sender ID to personalize your messages</Text>
                  </View>
                ) : (
                  <View style={styles.senderIdsList}>
                    {senderIds.map((senderId) => (
                      <View key={senderId.id} style={styles.senderIdCard}>
                        <View style={styles.senderIdMain}>
                          <View style={styles.senderIdIcon}>
                            <Ionicons name="pricetag" size={20} color={COLORS.primary} />
                          </View>
                          <View style={styles.senderIdInfo}>
                            <Text style={styles.senderIdName}>{senderId.name}</Text>
                            <View style={styles.senderIdMeta}>
                              <View style={[
                                styles.statusBadge,
                                { backgroundColor: senderId.status === 'active' ? COLORS.successLight : 
                                  senderId.status === 'pending' ? COLORS.primaryLight : COLORS.dangerLight }
                              ]}>
                                <View style={[
                                  styles.statusDot,
                                  { backgroundColor: senderId.status === 'active' ? COLORS.success : 
                                    senderId.status === 'pending' ? COLORS.primary : COLORS.danger }
                                ]} />
                                <Text style={[
                                  styles.statusText,
                                  { color: senderId.status === 'active' ? COLORS.success : 
                                    senderId.status === 'pending' ? COLORS.primary : COLORS.danger }
                                ]}>
                                  {senderId.status.charAt(0).toUpperCase() + senderId.status.slice(1)}
                                </Text>
                              </View>
                              <Text style={styles.senderIdDate}>Added {senderId.createdAt}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.senderIdStats}>
                          <Text style={styles.senderIdUsage}>{senderId.usageCount.toLocaleString()}</Text>
                          <Text style={styles.senderIdUsageLabel}>messages sent</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteSenderIdBtn}
                          onPress={() => handleDeleteSenderId(senderId.id, senderId.name)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.senderIdInfo2}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
                  <Text style={styles.senderIdInfoText}>
                    Sender IDs appear as the "From" name when recipients receive your SMS. Use names like your business name, event name, or brand.
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Delivery & Notifications</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Delivery Reports</Text>
                    <Text style={styles.settingDescription}>Track message delivery status in real-time</Text>
                  </View>
                  <Switch
                    value={enableDeliveryReports}
                    onValueChange={setEnableDeliveryReports}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    thumbColor={enableDeliveryReports ? COLORS.primary : COLORS.gray}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Low Credit Alerts</Text>
                    <Text style={styles.settingDescription}>Get notified when credits are running low</Text>
                  </View>
                  <Switch
                    value={enableLowCreditAlerts}
                    onValueChange={setEnableLowCreditAlerts}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    thumbColor={enableLowCreditAlerts ? COLORS.primary : COLORS.gray}
                  />
                </View>

                {enableLowCreditAlerts && (
                  <View style={styles.thresholdInput}>
                    <Text style={styles.thresholdLabel}>Alert when credits fall below:</Text>
                    <TextInput
                      style={styles.thresholdValue}
                      keyboardType="number-pad"
                      value={lowCreditThreshold}
                      onChangeText={setLowCreditThreshold}
                      placeholder="Enter threshold"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Message Handling</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Auto-Retry Failed Messages</Text>
                    <Text style={styles.settingDescription}>Automatically retry sending failed messages</Text>
                  </View>
                  <Switch
                    value={enableAutoRetry}
                    onValueChange={setEnableAutoRetry}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    thumbColor={enableAutoRetry ? COLORS.primary : COLORS.gray}
                  />
                </View>

                {enableAutoRetry && (
                  <View style={styles.thresholdInput}>
                    <Text style={styles.thresholdLabel}>Maximum retry attempts:</Text>
                    <TextInput
                      style={styles.thresholdValue}
                      keyboardType="number-pad"
                      value={maxRetryAttempts}
                      onChangeText={setMaxRetryAttempts}
                      placeholder="Enter attempts"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              </View>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={24} color={COLORS.blue} />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>Message Credits</Text>
                  <Text style={styles.infoCardText}>
                    SMS messages cost 1 credit per 160 characters. WhatsApp messages cost 2 credits each.
                  </Text>
                  <TouchableOpacity 
                    style={styles.infoCardLink}
                    onPress={() => router.push('/unitxt/credits')}
                  >
                    <Text style={styles.infoCardLinkText}>Manage Credits →</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Save Messaging Settings"
                onPress={handleSaveMessagingSettings}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          )}

          {/* Apps Tab */}
          {activeTab === 'apps' && (
            <View>
              <LinkedAppsManager 
                productId="unitxt"
                currentPlan={currentPlan}
                onRefresh={fetchData}
              />
            </View>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <View>
              {/* Current Subscription */}
              <View style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View>
                    <Text style={styles.subscriptionLabel}>YOUR SUBSCRIPTION</Text>
                    <View style={styles.subscriptionNameRow}>
                      <Text style={styles.subscriptionName}>
                        UniTxt {subscription?.plan_name || 'Starter'}
                      </Text>
                      {subscription?.is_trial && (
                        <View style={styles.trialBadge}>
                          <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          <Text style={styles.trialBadgeText}>Trial</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={styles.subscriptionStats}>
                  <View style={styles.subscriptionStat}>
                    <Text style={styles.subscriptionStatValue}>{subscription?.days_remaining || 30}</Text>
                    <Text style={styles.subscriptionStatLabel}>Days Left</Text>
                  </View>
                  <View style={styles.subscriptionDivider} />
                  <View style={styles.subscriptionStat}>
                    <Text style={[styles.subscriptionStatValue, { color: COLORS.success }]}>
                      {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={styles.subscriptionStatLabel}>Status</Text>
                  </View>
                </View>
              </View>

              {/* Available Plans */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Available Plans</Text>
                
                {plans.length > 0 ? (
                  <View style={styles.plansList}>
                    {plans.map((plan) => {
                      const isCurrentPlan = currentPlan?.plan?.id === plan.id;
                      return (
                        <View 
                          key={plan.id} 
                          style={[
                            styles.planCard,
                            isCurrentPlan && styles.planCardCurrent,
                            plan.id === 'professional' && styles.planCardPopular,
                          ]}
                        >
                          {plan.id === 'professional' && (
                            <View style={styles.popularBanner}>
                              <Text style={styles.popularBannerText}>Best Value</Text>
                            </View>
                          )}
                          
                          <Text style={styles.planName}>{plan.name}</Text>
                          <Text style={styles.planDescription}>{plan.description}</Text>
                          
                          <View style={styles.planPricing}>
                            <Text style={styles.planPrice}>${plan.price}</Text>
                            <Text style={styles.planPriceLabel}>/month</Text>
                          </View>

                          <View style={styles.planFeatures}>
                            {plan.features?.slice(0, 4).map((feature: any, idx: number) => (
                              <View key={idx} style={styles.planFeatureRow}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.planFeatureText}>{feature.name || feature}</Text>
                              </View>
                            ))}
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.planButton,
                              isCurrentPlan && styles.planButtonCurrent,
                            ]}
                            disabled={isCurrentPlan}
                          >
                            <Text style={[
                              styles.planButtonText,
                              isCurrentPlan && styles.planButtonTextCurrent,
                            ]}>
                              {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noPlansMessage}>
                    <Ionicons name="information-circle-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.noPlansText}>Plans will be available soon.</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Add Sender ID Modal */}
      <Modal visible={showAddSenderIdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Sender ID</Text>
              <TouchableOpacity onPress={() => {
                setShowAddSenderIdModal(false);
                setNewSenderId('');
                setSenderIdError('');
                setSelectedCountryForSenderId(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.senderIdModalContent}>
              {/* Cost Info */}
              <View style={styles.costInfoCard}>
                <Ionicons name="pricetag" size={24} color={COLORS.primary} />
                <View style={styles.costInfoText}>
                  <Text style={styles.costInfoTitle}>Registration Cost</Text>
                  <Text style={styles.costInfoValue}>{SENDER_ID_COST} Credits</Text>
                </View>
                <View style={styles.costInfoBalance}>
                  <Text style={styles.balanceLabel}>Your Balance</Text>
                  <Text style={[
                    styles.balanceValue,
                    { color: userCredits >= SENDER_ID_COST ? COLORS.success : COLORS.danger }
                  ]}>{userCredits.toLocaleString()}</Text>
                </View>
              </View>

              {/* Input Field */}
              <View style={styles.senderIdInputContainer}>
                <Text style={styles.senderIdInputLabel}>Sender ID Name</Text>
                <TextInput
                  style={[
                    styles.senderIdInput,
                    senderIdError ? styles.senderIdInputError : null
                  ]}
                  placeholder="e.g., WEDDING, MYSHOP"
                  placeholderTextColor={COLORS.gray}
                  value={newSenderId}
                  onChangeText={(text) => {
                    setNewSenderId(text.toUpperCase());
                    setSenderIdError('');
                  }}
                  maxLength={11}
                  autoCapitalize="characters"
                />
                <View style={styles.senderIdInputMeta}>
                  <Text style={styles.charCount}>{newSenderId.length}/11 characters</Text>
                </View>
              </View>

              {/* Country Selection */}
              <View style={styles.senderIdInputContainer}>
                <Text style={styles.senderIdInputLabel}>Target Country</Text>
                <TouchableOpacity 
                  style={[styles.countrySelectBtn, senderIdError && !selectedCountryForSenderId && styles.senderIdInputError]}
                  onPress={() => setShowCountrySelectModal(true)}
                >
                  {selectedCountryForSenderId ? (
                    <View style={styles.selectedCountryRow}>
                      <Ionicons name="location" size={20} color={COLORS.primary} />
                      <Text style={styles.selectedCountryText}>
                        {selectedCountryForSenderId.name} ({selectedCountryForSenderId.code})
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.selectedCountryRow}>
                      <Ionicons name="globe-outline" size={20} color={COLORS.gray} />
                      <Text style={styles.placeholderText}>Select country for this Sender ID</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>
                <Text style={styles.countryHint}>
                  Sender IDs must be registered per country due to telecom regulations
                </Text>
              </View>

              {/* Error Message */}
              {senderIdError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorBoxText}>{senderIdError}</Text>
                </View>
              )}

              {/* Rules */}
              <View style={styles.senderIdRules}>
                <Text style={styles.rulesTitle}>Requirements:</Text>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={newSenderId.length > 0 && newSenderId.length <= 11 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={newSenderId.length > 0 && newSenderId.length <= 11 ? COLORS.success : COLORS.gray} 
                  />
                  <Text style={styles.ruleText}>Maximum 11 characters</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={/^[A-Za-z0-9]+$/.test(newSenderId) && newSenderId.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/^[A-Za-z0-9]+$/.test(newSenderId) && newSenderId.length > 0 ? COLORS.success : COLORS.gray} 
                  />
                  <Text style={styles.ruleText}>Letters and numbers only</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={!/^\d+$/.test(newSenderId) && newSenderId.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={!/^\d+$/.test(newSenderId) && newSenderId.length > 0 ? COLORS.success : COLORS.gray} 
                  />
                  <Text style={styles.ruleText}>Cannot be all numbers</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons 
                    name={selectedCountryForSenderId ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={selectedCountryForSenderId ? COLORS.success : COLORS.gray} 
                  />
                  <Text style={styles.ruleText}>Country selected</Text>
                </View>
              </View>

              {/* Continue Button - Centered */}
              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  (userCredits < SENDER_ID_COST || !newSenderId.trim() || !selectedCountryForSenderId) && styles.continueBtnDisabled
                ]}
                onPress={handleContinueRegistration}
                disabled={userCredits < SENDER_ID_COST || !newSenderId.trim() || !selectedCountryForSenderId}
              >
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal - Separate */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="help-circle" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Registration</Text>
            <Text style={styles.confirmModalText}>
              Register Sender ID "{newSenderId.toUpperCase()}" for {selectedCountryForSenderId?.name}?
            </Text>
            
            <View style={styles.confirmModalDetails}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Sender ID:</Text>
                <Text style={styles.confirmDetailValue}>{newSenderId.toUpperCase()}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Country:</Text>
                <Text style={styles.confirmDetailValue}>{selectedCountryForSenderId?.name} ({selectedCountryForSenderId?.code})</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Cost:</Text>
                <Text style={styles.confirmDetailValue}>{SENDER_ID_COST} credits</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Balance after:</Text>
                <Text style={[styles.confirmDetailValue, { color: COLORS.success }]}>{userCredits - SENDER_ID_COST} credits</Text>
              </View>
            </View>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={handleCancelConfirmation}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalBtn, registeringSenderId && styles.continueBtnDisabled]} 
                onPress={handleConfirmRegistration}
                disabled={registeringSenderId}
              >
                {registeringSenderId ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country Selection Modal for Sender ID */}
      <Modal visible={showCountrySelectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountrySelectModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountryForSenderId?.code === item.code && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountryForSenderId({ name: item.name, code: item.code });
                    setShowCountrySelectModal(false);
                    setSenderIdError('');
                  }}
                >
                  <Ionicons name="location-outline" size={20} color={selectedCountryForSenderId?.code === item.code ? COLORS.primary : COLORS.gray} />
                  <Text style={[
                    styles.countryItemText,
                    selectedCountryForSenderId?.code === item.code && styles.countryItemTextSelected
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryItemCode}>{item.code}</Text>
                  {selectedCountryForSenderId?.code === item.code && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Country Selection Modal */}
      <Modal visible={showCountryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={COUNTRIES.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.listItemText}>{item.name}</Text>
                  <Text style={styles.listItemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>

      {/* City Selection Modal */}
      <Modal visible={showCityModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getCitiesForCountry()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    setFormCity(item);
                    setShowCityModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleSelectCurrency(item)}
                >
                  <Text style={styles.currencySymbolList}>{item.symbol}</Text>
                  <Text style={styles.listItemText}>{item.code} - {item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>Settings Saved!</Text>
            <Text style={styles.successMessage}>Your changes have been saved successfully.</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scrollContent: {
    flex: 1,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scrollInner: {
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    width: 24,
  },
  phoneInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: -8,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  thresholdInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  thresholdLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
  },
  thresholdValue: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    minWidth: 80,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  infoCardLink: {
    marginTop: 8,
  },
  infoCardLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  subscriptionHeader: {
    marginBottom: 16,
  },
  subscriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subscriptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  subscriptionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionStat: {
    flex: 1,
    alignItems: 'center',
  },
  subscriptionStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subscriptionStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  subscriptionDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  plansList: {
    gap: 12,
  },
  planCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  planCardCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  planCardPopular: {
    borderColor: COLORS.success,
  },
  popularBanner: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  planPriceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 13,
    color: COLORS.dark,
  },
  planButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  planButtonCurrent: {
    backgroundColor: COLORS.lightGray,
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  planButtonTextCurrent: {
    color: COLORS.gray,
  },
  noPlansMessage: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPlansText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  searchInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  listItemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  currencySymbolList: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    width: 30,
  },
  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Sender ID Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  addSenderIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addSenderIdBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  creditsBalanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  creditsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creditsInfo: {
    flex: 1,
  },
  creditsLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  creditsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  senderIdCost: {
    alignItems: 'flex-end',
  },
  costLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptySenderIds: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  senderIdsList: {
    gap: 10,
  },
  senderIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
  },
  senderIdMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderIdIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  senderIdInfo: {
    flex: 1,
  },
  senderIdName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: 1,
  },
  senderIdMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  senderIdDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  senderIdStats: {
    alignItems: 'center',
    marginRight: 12,
  },
  senderIdUsage: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  senderIdUsageLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  deleteSenderIdBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderIdInfo2: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.blueLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  senderIdInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.blue,
    lineHeight: 18,
  },
  // Sender ID Modal Styles
  senderIdModalContent: {
    gap: 16,
  },
  costInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  costInfoText: {
    flex: 1,
  },
  costInfoTitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  costInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  costInfoBalance: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  senderIdInputContainer: {
    gap: 6,
  },
  senderIdInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  senderIdInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  senderIdInputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  senderIdInputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
  },
  senderIdErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  senderIdRules: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  registerSenderIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  registerSenderIdBtnDisabled: {
    opacity: 0.6,
  },
  registerSenderIdBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Continue Button - Centered
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'center',
    minWidth: 200,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Country Selection
  countrySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedCountryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.gray,
  },
  countryHint: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
    fontStyle: 'italic',
  },
  countryModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  countryItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  countryItemTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  countryItemCode: {
    fontSize: 13,
    color: COLORS.gray,
    marginRight: 8,
  },
  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '500',
  },
  // Confirmation Modal
  confirmModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
  },
  confirmModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalDetails: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  confirmDetailLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  confirmDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelModalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  confirmModalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Confirmation styles (inline - keeping for compatibility)
  confirmationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  confirmText: {
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 18,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
