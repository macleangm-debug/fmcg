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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import api, { businessApi, subscriptionApi, exchangeRatesApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import PaymentModal from '../../src/components/PaymentModal';
import LinkedAppsManager from '../../src/components/LinkedAppsManager';

// Country data with codes and cities
const COUNTRIES = [
  { name: 'Kenya', code: '+254', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
  { name: 'Tanzania', code: '+255', cities: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Zanzibar'] },
  { name: 'Uganda', code: '+256', cities: ['Kampala', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'] },
  { name: 'Rwanda', code: '+250', cities: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi'] },
  { name: 'Ethiopia', code: '+251', cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Bahir Dar'] },
  { name: 'Nigeria', code: '+234', cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'] },
  { name: 'South Africa', code: '+27', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'] },
  { name: 'Ghana', code: '+233', cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema'] },
  { name: 'United States', code: '+1', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'] },
  { name: 'United Kingdom', code: '+44', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'] },
  { name: 'India', code: '+91', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'] },
  { name: 'United Arab Emirates', code: '+971', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'] },
];

const CURRENCIES = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

// SKU Format Options
const SKU_FORMATS = [
  {
    id: 'prefix_number',
    name: 'Prefix + Number',
    description: 'Simple prefix followed by sequential number',
    example: 'SKU-0001',
  },
  {
    id: 'category_prefix',
    name: 'Category + Prefix + Number',
    description: 'Include product category in SKU',
    example: 'ELEC-SKU-0001',
  },
  {
    id: 'date_based',
    name: 'Year + Prefix + Number',
    description: 'Include year in SKU for tracking',
    example: 'SKU-2025-0001',
  },
  {
    id: 'custom',
    name: 'Custom Format',
    description: 'Define your own SKU format',
    example: 'WH-PRD-0001',
  },
];

const SKU_SEPARATOR_OPTIONS = [
  { value: '-', label: 'Dash (-)' },
  { value: '_', label: 'Underscore (_)' },
  { value: '.', label: 'Dot (.)' },
  { value: '', label: 'None' },
];

interface BusinessInfo {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  registration_number?: string;
  currency: string;
  currency_symbol: string;
}

interface SubscriptionInfo {
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  is_active: boolean;
}

export default function InventorySettings() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === 'true';
  const { user: currentUser } = useAuthStore();
  const { loadSettings: reloadBusinessSettings } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'app' | 'apps' | 'subscription'>('general');
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  // Business form state
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('+254');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formRegNumber, setFormRegNumber] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formCurrencySymbol, setFormCurrencySymbol] = useState('$');
  const [formContactPerson, setFormContactPerson] = useState('');

  // App-specific settings state
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us!');
  const [enableLowStockAlerts, setEnableLowStockAlerts] = useState(true);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState('0');

  // SKU Format Settings
  const [skuFormat, setSkuFormat] = useState('prefix_number');
  const [skuPrefix, setSkuPrefix] = useState('SKU');
  const [skuStartNumber, setSkuStartNumber] = useState('1');
  const [skuDigits, setSkuDigits] = useState('4');
  const [skuSeparator, setSkuSeparator] = useState('-');

  // Helper function to generate SKU preview
  const getSkuPreview = (): string => {
    const startNum = parseInt(skuStartNumber) || 1;
    const digits = parseInt(skuDigits) || 4;
    const paddedNumber = startNum.toString().padStart(digits, '0');
    const year = new Date().getFullYear();
    const sep = skuSeparator;

    switch (skuFormat) {
      case 'prefix_number':
        return `${skuPrefix}${sep}${paddedNumber}`;
      case 'category_prefix':
        return `ELEC${sep}${skuPrefix}${sep}${paddedNumber}`;
      case 'date_based':
        return `${skuPrefix}${sep}${year}${sep}${paddedNumber}`;
      case 'custom':
        return `${skuPrefix}${sep}${paddedNumber}`;
      default:
        return `${skuPrefix}${sep}${paddedNumber}`;
    }
  };

  // Subscription plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [availableApps, setAvailableApps] = useState<any[]>([]);
  const [linkingApp, setLinkingApp] = useState(false);

  // Check if this app is linked to RetailPro (inherits settings from RetailPro)
  const isLinkedToRetailPro = (): boolean => {
    // Check if RetailPro is in the linked apps
    if (!currentPlan?.linked_apps || !Array.isArray(currentPlan.linked_apps)) {
      return false;
    }
    return currentPlan.linked_apps.some((app: any) => {
      const isRetailPro = app.app_id === 'retailpro' || app.app_id === 'retail_pro' || app.app_name?.toLowerCase().includes('retailpro');
      const isActiveStatus = app.status === 'active' || app.status === 'trial' || app.status === 'grace_period';
      return isRetailPro && isActiveStatus;
    });
  };

  // Upgrade/Downgrade preview modal state
  const [upgradePreview, setUpgradePreview] = useState<{
    visible: boolean;
    loading: boolean;
    plan: any;
    isDowngrade: boolean;
    pricing: {
      current_plan: string;
      new_plan: string;
      billing_cycle: string;
      original_price: number;
      prorated_credit: number;
      days_remaining: number;
      final_price: number;
    } | null;
  }>({
    visible: false,
    loading: false,
    plan: null,
    isDowngrade: false,
    pricing: null,
  });

  // Payment modal state for upgrades
  const [upgradePayment, setUpgradePayment] = useState<{
    visible: boolean;
    plan: any;
    amount: number;
    originalAmount: number;
  }>({
    visible: false,
    plan: null,
    amount: 0,
    originalAmount: 0,
  });

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState('');

  // Dropdown modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState<{ visible: boolean; tab: string }>({ visible: false, tab: '' });

  // Downgrade success modal
  const [downgradeSuccessModal, setDowngradeSuccessModal] = useState<{
    visible: boolean;
    planName: string;
    effectiveDate: string;
  }>({
    visible: false,
    planName: '',
    effectiveDate: '',
  });

  // Confirmation modal state using reusable ConfirmationModal component
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
    loading: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'info',
    onConfirm: () => {},
    loading: false,
  });

  const showConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' | 'success' = 'info'
  ) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      confirmLabel,
      variant,
      onConfirm,
      loading: false,
    });
  };

  const hideConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, visible: false }));
  };
  
  const setConfirmLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, loading }));
  };

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    visible: boolean;
    appId: string;
    appName: string;
    amount: number;
    originalAmount?: number;
  }>({
    visible: false,
    appId: '',
    appName: '',
    amount: 0,
  });

  const openPaymentModal = (appId: string, appName: string, amount: number, originalAmount?: number) => {
    setPaymentModal({
      visible: true,
      appId,
      appName,
      amount,
      originalAmount,
    });
  };

  const closePaymentModal = () => {
    setPaymentModal(prev => ({ ...prev, visible: false }));
  };

  // Get cities for selected country
  const getCitiesForCountry = () => {
    const country = COUNTRIES.find(c => c.name === formCountry);
    return country?.cities || [];
  };

  useEffect(() => {
    // Skip role check during onboarding since we just registered
    if (isOnboarding) {
      return;
    }
    // Allow both admin and superadmin roles
    const allowedRoles = ['admin', 'superadmin'];
    if (currentUser && !allowedRoles.includes(currentUser?.role)) {
      Alert.alert('Access Denied', 'Only admins can access settings');
      router.back();
    }
  }, [currentUser, isOnboarding]);

  const fetchData = async () => {
    try {
      // Fetch business details - this is the primary data we need
      const businessRes = await businessApi.get();
      setBusiness(businessRes.data);
      
      // Populate form with business data
      const b = businessRes.data;
      setFormName(b.name || '');
      setFormAddress(b.address || '');
      setFormCity(b.city || '');
      setFormCountry(b.country || '');
      setFormCountryCode(b.country_code || '+254');
      setFormPhone(b.phone || '');
      setFormEmail(b.email || '');
      setFormWebsite(b.website || '');
      setFormTaxId(b.tax_id || '');
      setFormRegNumber(b.registration_number || '');
      setFormCurrency(b.currency || 'USD');
      setFormCurrencySymbol(b.currency_symbol || '$');
      setFormContactPerson(b.contact_person || '');
      
      // Try to fetch subscription (optional, may not exist for new businesses)
      try {
        const subscriptionRes = await subscriptionApi.getStatus();
        setCurrentPlan(subscriptionRes.data);
        setSubscription({
          plan_name: subscriptionRes.data?.plan?.name || 'Starter',
          status: subscriptionRes.data?.status || 'active',
          start_date: subscriptionRes.data?.started_at,
          end_date: subscriptionRes.data?.expires_at,
          days_remaining: subscriptionRes.data?.days_remaining || 30,
          is_trial: subscriptionRes.data?.is_trial || false,
        });
      } catch {
        // Subscription endpoint may not exist, set default trial status
        setSubscription({
          plan_name: 'Starter',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          days_remaining: 30,
          is_trial: true,
        });
      }

      // Fetch available plans
      try {
        const plansRes = await subscriptionApi.getPlans();
        setPlans(plansRes.data?.plans || []);
      } catch {
        // Set default plans if API fails
        setPlans([]);
      }

      // Fetch available apps to link
      try {
        const availableRes = await subscriptionApi.getAvailableApps();
        setAvailableApps(availableRes.data?.available_apps || []);
      } catch {
        setAvailableApps([]);
      }

      // Fetch exchange rates
      try {
        const ratesRes = await exchangeRatesApi.getAll();
        setExchangeRates(ratesRes.data?.rates || []);
      } catch {
        setExchangeRates([]);
      }
    } catch (error) {
      console.log('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
        website: formWebsite.trim() || undefined,
        tax_id: formTaxId.trim() || undefined,
        registration_number: formRegNumber.trim() || undefined,
        currency: formCurrency,
        currency_symbol: formCurrencySymbol,
        contact_person: formContactPerson.trim() || undefined,
      });
      
      // Reload global business settings so currency reflects throughout the app
      await reloadBusinessSettings();
      
      setShowSuccessModal({ visible: true, tab: 'business' });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Save Inventory Settings (SKU, Barcode, etc.)
  const handleSaveInventory = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSuccessModal({ visible: true, tab: 'inventory' });
    }, 300);
  };

  // Save Apps Settings
  const handleSaveApps = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSuccessModal({ visible: true, tab: 'apps' });
    }, 300);
  };

  // Fetch upgrade/downgrade preview with prorated credit
  const handleUpgradePreview = async (plan: any) => {
    // Detect if this is a downgrade
    const planOrder = ['starter', 'professional', 'enterprise'];
    // currentPlan.plan is an object with {id, name}, so we need plan.id
    const currentPlanId = (currentPlan?.plan?.id || currentPlan?.plan || 'starter').toLowerCase();
    const currentIndex = planOrder.indexOf(currentPlanId);
    const newIndex = planOrder.indexOf(plan.id.toLowerCase());
    const isDowngrade = newIndex < currentIndex;
    
    console.log('Plan detection:', { currentPlanId, newPlanId: plan.id, currentIndex, newIndex, isDowngrade });
    
    setUpgradePreview(prev => ({ ...prev, visible: true, loading: true, plan, isDowngrade }));
    
    try {
      const response = await subscriptionApi.upgradePreview(plan.id, selectedBillingCycle);
      setUpgradePreview(prev => ({
        ...prev,
        loading: false,
        pricing: response.data,
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch pricing');
      setUpgradePreview(prev => ({ ...prev, visible: false, loading: false }));
    }
  };

  // Proceed to payment for upgrade (only for upgrades, not downgrades)
  const handleConfirmUpgrade = () => {
    if (!upgradePreview.plan || !upgradePreview.pricing) return;
    
    // Close the preview modal and open payment modal
    setUpgradePreview({ visible: false, loading: false, plan: null, pricing: null, isDowngrade: false });
    
    setUpgradePayment({
      visible: true,
      plan: upgradePreview.plan,
      amount: upgradePreview.pricing.final_price,
      originalAmount: upgradePreview.pricing.original_price,
    });
  };

  // Handle scheduled downgrade (no payment needed)
  const handleConfirmDowngrade = async () => {
    if (!upgradePreview.plan) return;
    
    setUpgradePreview(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await api.post(`/subscription/schedule-downgrade?plan_id=${upgradePreview.plan.id}`);
      
      const planName = upgradePreview.plan.name;
      const effectiveDate = response.data?.effective_at 
        ? new Date(response.data.effective_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'end of billing period';
      
      setUpgradePreview({ visible: false, loading: false, plan: null, pricing: null, isDowngrade: false });
      
      // Show success modal
      setDowngradeSuccessModal({
        visible: true,
        planName: planName,
        effectiveDate: effectiveDate,
      });
      
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to schedule downgrade');
      setUpgradePreview(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle successful upgrade payment
  const handleUpgradePaymentSuccess = async () => {
    try {
      // Execute the actual upgrade after payment
      await subscriptionApi.upgrade(upgradePayment.plan.id, selectedBillingCycle);
      setUpgradePayment({ visible: false, plan: null, amount: 0, originalAmount: 0 });
      Alert.alert('Success', `You've upgraded to ${upgradePayment.plan.name}!`);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Payment successful but upgrade failed. Please contact support.');
    }
  };

  const handleSelectCountry = (country: typeof COUNTRIES[0]) => {
    setFormCountry(country.name);
    setFormCountryCode(country.code);
    setFormCity(''); // Reset city when country changes
    setShowCountryModal(false);
  };

  const handleSelectCurrency = (currency: typeof CURRENCIES[0]) => {
    setFormCurrency(currency.code);
    setFormCurrencySymbol(currency.symbol);
    setShowCurrencyModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'grace_period': return '#F59E0B';
      case 'expired': return '#DC2626';
      default: return '#6B7280';
    }
  };

  // Skip role check during onboarding
  // Allow both admin and superadmin roles to access settings
  const allowedRoles = ['admin', 'superadmin'];
  if (!isOnboarding && currentUser && !allowedRoles.includes(currentUser?.role)) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isOnboarding ? 'Complete Setup' : 'Settings'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onboarding Welcome Banner */}
      {isOnboarding && (
        <View style={styles.onboardingBanner}>
          <View style={styles.onboardingIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          </View>
          <View style={styles.onboardingTextContainer}>
            <Text style={styles.onboardingTitle}>Welcome to Inventory! 🎉</Text>
            <Text style={styles.onboardingSubtitle}>
              Complete your business setup below to get started. Set your currency, country, and other details.
            </Text>
          </View>
        </View>
      )}

      {/* Tab Selector */}
      <View style={[styles.tabContainer, isWeb && styles.tabContainerWeb]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.tabActive]}
          onPress={() => setActiveTab('general')}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={activeTab === 'general' ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'app' && styles.tabActive]}
          onPress={() => setActiveTab('app')}
        >
          <Ionicons
            name="cube-outline"
            size={20}
            color={activeTab === 'app' ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'app' && styles.tabTextActive]}>
            Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'apps' && styles.tabActive]}
          onPress={() => setActiveTab('apps')}
        >
          <Ionicons
            name="apps-outline"
            size={20}
            color={activeTab === 'apps' ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'apps' && styles.tabTextActive]}>
            Apps
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
          onPress={() => setActiveTab('subscription')}
        >
          <Ionicons
            name="card-outline"
            size={20}
            color={activeTab === 'subscription' ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>
            Plan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mobile Card Container */}
      {!isWeb ? (
        <View style={styles.mobileCardContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listInsideCard}
            >
              {activeTab === 'general' && (
                <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                <Input
                  label="Business Name *"
                  placeholder="Enter your business name"
                  value={formName}
                  onChangeText={setFormName}
                  leftIcon={<Ionicons name="business-outline" size={20} color="#6B7280" />}
                />
                
                <Input
                  label="Address"
                  placeholder="Enter your street address"
                  value={formAddress}
                  onChangeText={setFormAddress}
                  leftIcon={<Ionicons name="location-outline" size={20} color="#6B7280" />}
                />
                
                {/* Country Dropdown */}
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>Country</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Ionicons name="globe-outline" size={20} color="#6B7280" />
                    <Text style={[styles.dropdownText, !formCountry && styles.dropdownPlaceholder]}>
                      {formCountry || 'Select country'}
                    </Text>
                    <Text style={styles.countryCode}>{formCountryCode}</Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
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
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text style={[styles.dropdownText, !formCity && styles.dropdownPlaceholder]}>
                      {formCity || 'Select city'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
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
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                
                <Input
                  label="Contact Person"
                  placeholder="Enter your full name"
                  value={formContactPerson}
                  onChangeText={setFormContactPerson}
                  leftIcon={<Ionicons name="person-outline" size={20} color="#6B7280" />}
                />
                
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Ionicons name="call-outline" size={20} color="#6B7280" />
                      <Text style={styles.countryCodeText}>{formCountryCode || '+1'}</Text>
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
                  <Text style={styles.phoneHint}>Country code auto-selected from your country</Text>
                </View>
                
                <Input
                  label="Email"
                  placeholder="Enter your email address"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
                />
                
                <Input
                  label="Website"
                  placeholder="www.yourcompany.com"
                  value={formWebsite}
                  onChangeText={setFormWebsite}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="globe-outline" size={20} color="#6B7280" />}
                />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Tax & Registration</Text>
                
                <Input
                  label="Tax ID / VAT Number"
                  placeholder="Enter your tax ID"
                  value={formTaxId}
                  onChangeText={setFormTaxId}
                />
                
                <Input
                  label="Registration Number"
                  placeholder="Enter your registration number"
                  value={formRegNumber}
                  onChangeText={setFormRegNumber}
                />
              </View>

              <Button
                title="Save"
                onPress={handleSaveBusiness}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          )}

          {activeTab === 'app' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Stock Alert Settings</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Low Stock Alerts</Text>
                    <Text style={styles.settingDescription}>Get notified when stock is low</Text>
                  </View>
                  <Switch
                    value={enableLowStockAlerts}
                    onValueChange={setEnableLowStockAlerts}
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={enableLowStockAlerts ? '#2563EB' : '#9CA3AF'}
                  />
                </View>

                {enableLowStockAlerts && (
                  <Input
                    label="Low Stock Threshold"
                    placeholder="Enter threshold"
                    value={lowStockThreshold}
                    onChangeText={setLowStockThreshold}
                    keyboardType="number-pad"
                    leftIcon={<Ionicons name="alert-circle-outline" size={20} color="#6B7280" />}
                  />
                )}
              </View>

              {/* SKU Settings - Inherited from RetailPro when linked */}
              {isLinkedToRetailPro() ? (
                <View style={styles.sectionCard}>
                  <View style={styles.inheritedSettingsHeader}>
                    <Ionicons name="link-outline" size={20} color="#2563EB" />
                    <Text style={styles.inheritedSettingsTitle}>SKU Settings</Text>
                    <View style={styles.inheritedBadge}>
                      <Text style={styles.inheritedBadgeText}>From RetailPro</Text>
                    </View>
                  </View>
                  <Text style={styles.inheritedDescription}>
                    SKU settings are managed by your primary RetailPro app. Changes made in RetailPro will automatically apply to inventory items.
                  </Text>
                  
                  <View style={styles.inheritedSettingsBox}>
                    <View style={styles.inheritedSettingRow}>
                      <Text style={styles.inheritedSettingLabel}>Auto-generate SKU</Text>
                      <Text style={styles.inheritedSettingValue}>{autoGenerateSku ? 'Yes' : 'No'}</Text>
                    </View>
                    {autoGenerateSku && (
                      <>
                        <View style={styles.inheritedSettingRow}>
                          <Text style={styles.inheritedSettingLabel}>SKU Format</Text>
                          <Text style={styles.inheritedSettingValue}>
                            {SKU_FORMATS.find(f => f.id === skuFormat)?.name || 'Prefix + Number'}
                          </Text>
                        </View>
                        <View style={styles.inheritedSettingRow}>
                          <Text style={styles.inheritedSettingLabel}>SKU Prefix</Text>
                          <Text style={styles.inheritedSettingValue}>{skuPrefix || 'SKU'}</Text>
                        </View>
                        <View style={styles.inheritedSettingRow}>
                          <Text style={styles.inheritedSettingLabel}>Next SKU Preview</Text>
                          <Text style={[styles.inheritedSettingValue, { color: '#2563EB' }]}>{getSkuPreview()}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.goToRetailProButton}
                    onPress={() => router.push('/admin/settings')}
                  >
                    <Text style={styles.goToRetailProText}>Edit in RetailPro Settings →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>SKU Settings</Text>
                  <Text style={styles.sectionSubtitle}>Configure how product codes are generated</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Auto-generate SKU</Text>
                      <Text style={styles.settingDescription}>Automatically create SKU codes for new products</Text>
                    </View>
                    <Switch
                      value={autoGenerateSku}
                      onValueChange={setAutoGenerateSku}
                      trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                      thumbColor={autoGenerateSku ? '#2563EB' : '#9CA3AF'}
                    />
                  </View>

                  {autoGenerateSku && (
                    <>
                      <Text style={styles.formatSectionLabel}>SKU Format</Text>
                      <View style={styles.formatOptionsContainer}>
                        {SKU_FORMATS.map((format) => (
                          <TouchableOpacity
                            key={format.id}
                            style={[
                              styles.formatOption,
                              skuFormat === format.id && styles.formatOptionActive,
                            ]}
                            onPress={() => setSkuFormat(format.id)}
                          >
                            <View style={styles.formatOptionHeader}>
                              <View style={[
                                styles.formatRadio,
                                skuFormat === format.id && styles.formatRadioActive,
                              ]}>
                                {skuFormat === format.id && <View style={styles.formatRadioInner} />}
                              </View>
                              <Text style={[
                                styles.formatOptionTitle,
                                skuFormat === format.id && styles.formatOptionTitleActive,
                              ]}>
                                {format.name}
                              </Text>
                            </View>
                            <Text style={styles.formatOptionDesc}>{format.description}</Text>
                            <Text style={styles.formatOptionExample}>Example: {format.example}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Input
                        label="SKU Prefix"
                        placeholder="SKU"
                        value={skuPrefix}
                        onChangeText={setSkuPrefix}
                        leftIcon={<Ionicons name="pricetag-outline" size={20} color="#6B7280" />}
                      />

                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Starting Number"
                            placeholder="1"
                            value={skuStartNumber}
                            onChangeText={setSkuStartNumber}
                            keyboardType="number-pad"
                            leftIcon={<Ionicons name="arrow-forward-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Number of Digits"
                            placeholder="4"
                            value={skuDigits}
                            onChangeText={setSkuDigits}
                            keyboardType="number-pad"
                            leftIcon={<Ionicons name="keypad-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                      </View>

                      <Text style={styles.formatSectionLabel}>Separator</Text>
                      <View style={styles.separatorOptions}>
                        {SKU_SEPARATOR_OPTIONS.map((sep) => (
                          <TouchableOpacity
                            key={sep.value}
                            style={[
                              styles.separatorOption,
                              skuSeparator === sep.value && styles.separatorOptionActive,
                            ]}
                            onPress={() => setSkuSeparator(sep.value)}
                          >
                            <Text style={[
                              styles.separatorOptionText,
                              skuSeparator === sep.value && styles.separatorOptionTextActive,
                            ]}>
                              {sep.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.skuPreview}>
                        <Text style={styles.skuPreviewLabel}>Next SKU Preview</Text>
                        <Text style={styles.skuPreviewValue}>{getSkuPreview()}</Text>
                      </View>
                    </>
                  )}

                  {!autoGenerateSku && (
                    <View style={styles.manualSkuInfo}>
                      <Ionicons name="create-outline" size={20} color="#6B7280" />
                      <Text style={styles.manualSkuText}>
                        You'll enter SKU codes manually when creating products
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' }]}
                onPress={() => {
                  setSaving(true);
                  setTimeout(() => {
                    setSaving(false);
                    setShowSuccessModal({ visible: true, tab: 'inventory' });
                  }, 300);
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'apps' && (
            <View>
              <LinkedAppsManager 
                productId="inventory"
                currentPlan={currentPlan}
                onRefresh={fetchData}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' }]}
                onPress={() => {
                  setSaving(true);
                  setTimeout(() => {
                    setSaving(false);
                    setShowSuccessModal({ visible: true, tab: 'apps' });
                  }, 300);
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'subscription' && (
              <View>
                {/* Current Subscription Summary */}
                <View style={styles.currentPlanCard}>
                  <View style={styles.currentPlanHeader}>
                    <View>
                      <Text style={styles.currentPlanLabel}>YOUR SUBSCRIPTION</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Text style={styles.currentPlanName}>
                          {currentPlan?.primary_app?.name || 'Inventory'} {currentPlan?.plan?.name || 'Starter'}
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
                  
                  {/* Pricing Breakdown */}
                  <View style={styles.pricingBreakdown}>
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>
                        {currentPlan?.primary_app?.name || 'Inventory'} ({currentPlan?.plan?.name || 'Starter'})
                      </Text>
                      <Text style={styles.pricingValue}>${currentPlan?.plan?.price || 19}/mo</Text>
                    </View>
                    
                    {currentPlan?.linked_apps?.map((linked: any) => (
                      <View key={linked.app_id} style={styles.pricingRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                          <Text style={styles.pricingLabel}>{linked.app_name} ({linked.plan_name})</Text>
                          {linked.is_trial ? (
                            <View style={styles.trialTag}>
                              <Ionicons name="time-outline" size={12} color="#F59E0B" />
                              <Text style={styles.trialTagText}>
                                {linked.trial_days_remaining > 0 
                                  ? `Trial: ${linked.trial_days_remaining}d left` 
                                  : linked.status === 'grace_period' 
                                    ? 'Grace Period' 
                                    : 'Trial Ended'}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.discountTag}>
                              <Text style={styles.discountTagText}>{linked.discount_percent}% off</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {linked.is_trial ? (
                            <Text style={styles.pricingFree}>FREE</Text>
                          ) : (
                            <>
                              <Text style={styles.pricingOriginal}>${linked.original_price}</Text>
                              <Text style={styles.pricingValue}>${linked.discounted_price}/mo</Text>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                    
                    {/* Trial Action Buttons */}
                    {currentPlan?.linked_apps?.filter((la: any) => la.is_trial && (la.trial_days_remaining <= 3 || la.status === 'grace_period')).map((linked: any) => (
                      <View key={`action-${linked.app_id}`} style={styles.trialActionBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trialActionTitle}>
                            {linked.status === 'grace_period' 
                              ? `${linked.app_name} trial has ended`
                              : `${linked.app_name} trial ending soon!`}
                          </Text>
                          <Text style={styles.trialActionSubtitle}>
                            Keep using {linked.app_name} for ${linked.discounted_price}/mo
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={styles.trialKeepButton}
                            onPress={() => {
                              openPaymentModal(
                                linked.app_id,
                                linked.app_name,
                                linked.discounted_price,
                                linked.original_price
                              );
                            }}
                          >
                            <Ionicons name="card" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.trialKeepButtonText}>Pay Now</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.trialCancelButton}
                            onPress={() => {
                              showConfirmation(
                                'Remove App',
                                `Are you sure you want to remove ${linked.app_name} from your subscription?\n\nYou'll lose access to all ${linked.app_name} features.`,
                                'Remove',
                                async () => {
                                  try {
                                    await subscriptionApi.unlinkApp(linked.app_id);
                                    fetchData();
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to remove app.');
                                  }
                                },
                                'danger'
                              );
                            }}
                          >
                            <Text style={styles.trialCancelButtonText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    
                    <View style={[styles.pricingRow, styles.pricingTotal]}>
                      <Text style={styles.pricingTotalLabel}>Total Monthly</Text>
                      <Text style={styles.pricingTotalValue}>
                        ${currentPlan?.pricing?.total_price || currentPlan?.plan?.price || 19}/mo
                      </Text>
                    </View>
                  </View>

                  <View style={styles.currentPlanInfo}>
                    <View style={styles.currentPlanStat}>
                      <Text style={styles.currentPlanStatValue}>{subscription?.days_remaining || 30}</Text>
                      <Text style={styles.currentPlanStatLabel}>Days Left</Text>
                    </View>
                    <View style={styles.currentPlanDivider} />
                    <View style={styles.currentPlanStat}>
                      <Text style={[styles.currentPlanStatValue, { color: '#10B981' }]}>
                        {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                      <Text style={styles.currentPlanStatLabel}>Status</Text>
                    </View>
                  </View>
                </View>

                {/* Link Additional Apps Section */}
                {availableApps.length > 0 && (
                  <View style={styles.linkAppsSection}>
                    <Text style={styles.linkAppsTitle}>Add More Apps</Text>
                    <Text style={styles.linkAppsSubtitle}>
                      Start with a 7-day free trial, then save {availableApps[0]?.discount_percent || 20}% on each linked app!
                    </Text>
                    
                    <View style={[styles.availableAppsGrid, { flexDirection: 'column' }]}>
                      {availableApps.map((app) => (
                        <View key={app.id} style={[styles.availableAppCard, { width: '100%', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', padding: 16 }]}>
                          <View style={[styles.appIconBg, { backgroundColor: app.color + '20', marginBottom: 0, marginRight: 12 }]}>
                            <Ionicons name={app.icon as any} size={22} color={app.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.availableAppName, { textAlign: 'left' }]}>{app.name}</Text>
                            <View style={styles.freeTrialBadge}>
                              <Ionicons name="gift-outline" size={12} color="#10B981" />
                              <Text style={styles.freeTrialText}>7-Day Trial</Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={styles.appPricing}>
                              <Text style={styles.appOriginalPrice}>${app.plans[0]?.original_price}</Text>
                              <Text style={styles.appDiscountedPrice}>${app.plans[0]?.discounted_price}/mo</Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.linkAppButton, { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 }]}
                              onPress={() => {
                                showConfirmation(
                                  'Start Free Trial',
                                  `Try ${app.name} free for 7 days!\n\nAfter trial: $${app.plans[0]?.discounted_price}/mo (${app.discount_percent}% off)`,
                                  'Start Trial',
                                  async () => {
                                    try {
                                      setLinkingApp(true);
                                      await subscriptionApi.linkApp(app.id, 'starter', true);
                                      Alert.alert('Trial Started!', `Your 7-day free trial of ${app.name} has started!`);
                                      fetchData();
                                    } catch (error) {
                                      Alert.alert('Error', 'Failed to start trial. Please try again.');
                                    } finally {
                                      setLinkingApp(false);
                                    }
                                  },
                                  'success'
                                );
                              }}
                              disabled={linkingApp}
                            >
                              {linkingApp ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Text style={styles.linkAppButtonText}>Try Free</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Upgrade Plan Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Upgrade Your Plan</Text>
                  
                  {/* Billing Cycle Toggle */}
                  <View style={styles.billingToggle}>
                    <TouchableOpacity
                      style={[styles.billingOption, selectedBillingCycle === 'monthly' && styles.billingOptionActive]}
                      onPress={() => setSelectedBillingCycle('monthly')}
                    >
                      <Text style={[styles.billingOptionText, selectedBillingCycle === 'monthly' && styles.billingOptionTextActive]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.billingOption, selectedBillingCycle === 'yearly' && styles.billingOptionActive]}
                      onPress={() => setSelectedBillingCycle('yearly')}
                    >
                      <Text style={[styles.billingOptionText, selectedBillingCycle === 'yearly' && styles.billingOptionTextActive]}>
                        Yearly
                      </Text>
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>Save 17%</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Plan Cards - Mobile optimized single column layout */}
                  <View style={[styles.plansGrid, { flexDirection: 'column' }]}>
                    {plans.map((plan) => {
                      const isCurrentPlan = currentPlan?.plan?.id === plan.id;
                      const price = selectedBillingCycle === 'yearly' ? plan.price_yearly : plan.price;
                      const priceLabel = selectedBillingCycle === 'yearly' ? '/year' : '/month';
                      
                      return (
                        <View 
                          key={plan.id} 
                          style={[
                            styles.planCard,
                            { minWidth: '100%' },
                            plan.id === 'professional' && styles.planCardPopular,
                            isCurrentPlan && styles.planCardCurrent
                          ]}
                        >
                          {plan.id === 'professional' && (
                            <View style={styles.popularBanner}>
                              <Text style={styles.popularBannerText}>Best Value</Text>
                            </View>
                          )}
                          
                          <Text style={styles.planCardName}>{plan.name}</Text>
                          <Text style={styles.planCardDescription}>{plan.description}</Text>
                          
                          <View style={styles.planCardPricing}>
                            <Text style={styles.planCardPrice}>${price}</Text>
                            <Text style={styles.planCardPriceLabel}>{priceLabel}</Text>
                          </View>

                          <View style={styles.planCardFeatures}>
                            {plan.features.slice(0, 5).map((feature: any) => (
                              <View key={feature.id} style={styles.planFeatureRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.planFeatureText}>{feature.name}</Text>
                              </View>
                            ))}
                            {plan.features.length > 5 && (
                              <Text style={styles.planMoreFeatures}>+{plan.features.length - 5} more</Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.planCardButton,
                              isCurrentPlan && styles.planCardButtonCurrent,
                              plan.id === 'professional' && !isCurrentPlan && styles.planCardButtonPopular
                            ]}
                            onPress={() => {
                              if (!isCurrentPlan) {
                                handleUpgradePreview(plan);
                              }
                            }}
                            disabled={isCurrentPlan}
                          >
                            <Text style={[
                              styles.planCardButtonText,
                              isCurrentPlan && styles.planCardButtonTextCurrent,
                              plan.id === 'professional' && !isCurrentPlan && styles.planCardButtonTextPopular
                            ]}>
                              {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {plans.length === 0 && (
                  <View style={styles.noPlansMessage}>
                    <Ionicons name="information-circle-outline" size={48} color="#6B7280" />
                    <Text style={styles.noPlansText}>No plans available at the moment.</Text>
                  </View>
                )}
              </View>
            )}

          <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      ) : (
        /* Web Layout */
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            <ScrollView
              style={styles.webScrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.webScrollInner}
            >
            {activeTab === 'general' && (
              <View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Business Information</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Input
                        label="Business Name *"
                        placeholder="Enter your business name"
                        value={formName}
                        onChangeText={setFormName}
                        leftIcon={<Ionicons name="business-outline" size={20} color="#6B7280" />}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Input
                        label="Address"
                        placeholder="Enter business address"
                        value={formAddress}
                        onChangeText={setFormAddress}
                        leftIcon={<Ionicons name="location-outline" size={20} color="#6B7280" />}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Location & Currency</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownLabel}>Country</Text>
                        <TouchableOpacity 
                          style={styles.dropdownButton}
                          onPress={() => setShowCountryModal(true)}
                        >
                          <Ionicons name="globe-outline" size={20} color="#6B7280" />
                          <Text style={[styles.dropdownText, !formCountry && styles.dropdownPlaceholder]}>
                            {formCountry || 'Select country'}
                          </Text>
                          <Text style={styles.countryCode}>{formCountryCode}</Text>
                          <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.inputHalf}>
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
                          <Ionicons name="location-outline" size={20} color="#6B7280" />
                          <Text style={[styles.dropdownText, !formCity && styles.dropdownPlaceholder]}>
                            {formCity || 'Select city'}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
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
                          <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <Input
                    label="Contact Person"
                    placeholder="Enter your full name"
                    value={formContactPerson}
                    onChangeText={setFormContactPerson}
                    leftIcon={<Ionicons name="person-outline" size={20} color="#6B7280" />}
                  />
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <View style={styles.phoneInputContainer}>
                        <Text style={styles.inputLabel}>Phone</Text>
                        <View style={styles.phoneInputRow}>
                          <View style={styles.countryCodeBox}>
                            <Ionicons name="call-outline" size={20} color="#6B7280" />
                            <Text style={styles.countryCodeText}>{formCountryCode || '+1'}</Text>
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
                        <Text style={styles.phoneHint}>Auto-selected from country</Text>
                      </View>
                    </View>
                    <View style={styles.inputHalf}>
                      <Input
                        label="Email"
                        placeholder="Enter your email address"
                        value={formEmail}
                        onChangeText={setFormEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
                      />
                    </View>
                  </View>
                  <Input
                    label="Website"
                    placeholder="www.yourcompany.com"
                    value={formWebsite}
                    onChangeText={setFormWebsite}
                    autoCapitalize="none"
                    leftIcon={<Ionicons name="globe-outline" size={20} color="#6B7280" />}
                  />
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Tax & Registration</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Input
                        label="Tax ID / VAT Number"
                        placeholder="Enter your tax ID"
                        value={formTaxId}
                        onChangeText={setFormTaxId}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Input
                        label="Registration Number"
                        placeholder="Enter your registration number"
                        value={formRegNumber}
                        onChangeText={setFormRegNumber}
                      />
                    </View>
                  </View>
                </View>

                <Button
                  title="Save"
                  onPress={handleSaveBusiness}
                  loading={saving}
                  style={styles.saveButton}
                />
              </View>
            )}

            {activeTab === 'app' && (
              <View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Stock Alert Settings</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Low Stock Alerts</Text>
                      <Text style={styles.settingDescription}>Get notified when product stock is running low</Text>
                    </View>
                    <Switch
                      value={enableLowStockAlerts}
                      onValueChange={setEnableLowStockAlerts}
                      trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                      thumbColor={enableLowStockAlerts ? '#2563EB' : '#9CA3AF'}
                    />
                  </View>

                  {enableLowStockAlerts && (
                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <Input
                          label="Low Stock Threshold"
                          placeholder="Enter threshold"
                          value={lowStockThreshold}
                          onChangeText={setLowStockThreshold}
                          keyboardType="number-pad"
                          leftIcon={<Ionicons name="alert-circle-outline" size={20} color="#6B7280" />}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* SKU Settings - Web View - Inherited from RetailPro when linked */}
                {isLinkedToRetailPro() ? (
                  <View style={styles.sectionCard}>
                    <View style={styles.inheritedSettingsHeader}>
                      <Ionicons name="link-outline" size={20} color="#2563EB" />
                      <Text style={styles.inheritedSettingsTitle}>SKU Settings</Text>
                      <View style={styles.inheritedBadge}>
                        <Text style={styles.inheritedBadgeText}>From RetailPro</Text>
                      </View>
                    </View>
                    <Text style={styles.inheritedDescription}>
                      SKU settings are managed by your primary RetailPro app. Changes made in RetailPro will automatically apply to inventory items.
                    </Text>
                    
                    <View style={styles.inheritedSettingsBox}>
                      <View style={styles.inheritedSettingRow}>
                        <Text style={styles.inheritedSettingLabel}>Auto-generate SKU</Text>
                        <Text style={styles.inheritedSettingValue}>{autoGenerateSku ? 'Yes' : 'No'}</Text>
                      </View>
                      {autoGenerateSku && (
                        <>
                          <View style={styles.inheritedSettingRow}>
                            <Text style={styles.inheritedSettingLabel}>SKU Format</Text>
                            <Text style={styles.inheritedSettingValue}>
                              {SKU_FORMATS.find(f => f.id === skuFormat)?.name || 'Prefix + Number'}
                            </Text>
                          </View>
                          <View style={styles.inheritedSettingRow}>
                            <Text style={styles.inheritedSettingLabel}>SKU Prefix</Text>
                            <Text style={styles.inheritedSettingValue}>{skuPrefix || 'SKU'}</Text>
                          </View>
                          <View style={styles.inheritedSettingRow}>
                            <Text style={styles.inheritedSettingLabel}>Next SKU Preview</Text>
                            <Text style={[styles.inheritedSettingValue, { color: '#2563EB', fontFamily: 'monospace' }]}>{getSkuPreview()}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.goToRetailProButton}
                      onPress={() => router.push('/admin/settings')}
                    >
                      <Text style={styles.goToRetailProText}>Edit in RetailPro Settings →</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>SKU Settings</Text>
                    <Text style={styles.sectionSubtitle}>Configure how product codes are generated</Text>
                    
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Auto-generate SKU</Text>
                        <Text style={styles.settingDescription}>Automatically create SKU codes for new products</Text>
                      </View>
                      <Switch
                        value={autoGenerateSku}
                        onValueChange={setAutoGenerateSku}
                        trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                        thumbColor={autoGenerateSku ? '#2563EB' : '#9CA3AF'}
                      />
                    </View>

                    {autoGenerateSku && (
                      <>
                        <Text style={styles.formatSectionLabel}>SKU Format</Text>
                        <View style={styles.formatOptionsGridWeb}>
                          {SKU_FORMATS.map((format) => (
                            <TouchableOpacity
                              key={format.id}
                              style={[
                                styles.formatOption,
                                skuFormat === format.id && styles.formatOptionActive,
                              ]}
                              onPress={() => setSkuFormat(format.id)}
                            >
                              <View style={styles.formatOptionHeader}>
                                <View style={[
                                  styles.formatRadio,
                                  skuFormat === format.id && styles.formatRadioActive,
                                ]}>
                                  {skuFormat === format.id && <View style={styles.formatRadioInner} />}
                                </View>
                                <Text style={[
                                  styles.formatOptionTitle,
                                  skuFormat === format.id && styles.formatOptionTitleActive,
                                ]}>
                                  {format.name}
                                </Text>
                              </View>
                              <Text style={styles.formatOptionDesc}>{format.description}</Text>
                              <Text style={styles.formatOptionExample}>Example: {format.example}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View style={styles.inputRow}>
                          <View style={styles.inputHalf}>
                            <Input
                              label="SKU Prefix"
                              placeholder="SKU"
                              value={skuPrefix}
                              onChangeText={setSkuPrefix}
                              leftIcon={<Ionicons name="pricetag-outline" size={20} color="#6B7280" />}
                            />
                          </View>
                          <View style={styles.inputHalf}>
                            <Input
                              label="Starting Number"
                              placeholder="1"
                              value={skuStartNumber}
                              onChangeText={setSkuStartNumber}
                              keyboardType="number-pad"
                              leftIcon={<Ionicons name="arrow-forward-outline" size={20} color="#6B7280" />}
                            />
                          </View>
                        </View>

                        <View style={styles.inputRow}>
                          <View style={styles.inputHalf}>
                            <Input
                              label="Number of Digits"
                              placeholder="4"
                              value={skuDigits}
                              onChangeText={setSkuDigits}
                              keyboardType="number-pad"
                              leftIcon={<Ionicons name="keypad-outline" size={20} color="#6B7280" />}
                            />
                          </View>
                          <View style={styles.inputHalf}>
                            <View>
                              <Text style={styles.separatorLabel}>Separator</Text>
                              <View style={styles.separatorOptionsRow}>
                                {SKU_SEPARATOR_OPTIONS.map((sep) => (
                                  <TouchableOpacity
                                    key={sep.value}
                                    style={[
                                      styles.separatorOption,
                                      skuSeparator === sep.value && styles.separatorOptionActive,
                                    ]}
                                    onPress={() => setSkuSeparator(sep.value)}
                                  >
                                    <Text style={[
                                      styles.separatorOptionText,
                                      skuSeparator === sep.value && styles.separatorOptionTextActive,
                                    ]}>
                                      {sep.label}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        </View>

                        <View style={styles.skuPreview}>
                          <Text style={styles.skuPreviewLabel}>Next SKU Preview</Text>
                          <Text style={styles.skuPreviewValue}>{getSkuPreview()}</Text>
                        </View>
                      </>
                    )}

                    {!autoGenerateSku && (
                      <View style={styles.manualSkuInfo}>
                        <Ionicons name="create-outline" size={20} color="#6B7280" />
                        <Text style={styles.manualSkuText}>
                          You'll enter SKU codes manually when creating products
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <Button
                  title="Save"
                  onPress={() => {
                    Alert.alert('Settings Saved', 'Your Inventory settings have been saved successfully.');
                  }}
                  loading={saving}
                  style={styles.saveButton}
                />
              </View>
            )}

            {activeTab === 'apps' && (
              <View>
                <LinkedAppsManager 
                  productId="inventory"
                  currentPlan={currentPlan}
                  onRefresh={fetchData}
                />
                <Button
                  title="Save"
                  onPress={() => {
                    Alert.alert('Settings Saved', 'Your app settings have been saved successfully.');
                  }}
                  loading={saving}
                  style={styles.saveButton}
                />
              </View>
            )}

            {activeTab === 'subscription' && (
              <View>
                {/* Current Subscription Summary */}
                <View style={styles.currentPlanCard}>
                  <View style={styles.currentPlanHeader}>
                    <View>
                      <Text style={styles.currentPlanLabel}>YOUR SUBSCRIPTION</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.currentPlanName}>
                          {currentPlan?.primary_app?.name || 'Inventory'} {currentPlan?.plan?.name || 'Starter'}
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
                  
                  {/* Pricing Breakdown */}
                  <View style={styles.pricingBreakdown}>
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>
                        {currentPlan?.primary_app?.name || 'Inventory'} ({currentPlan?.plan?.name || 'Starter'})
                      </Text>
                      <Text style={styles.pricingValue}>${currentPlan?.plan?.price || 19}/mo</Text>
                    </View>
                    
                    {currentPlan?.linked_apps?.map((linked: any) => (
                      <View key={linked.app_id} style={styles.pricingRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={styles.pricingLabel}>{linked.app_name} ({linked.plan_name})</Text>
                          {linked.is_trial ? (
                            <View style={styles.trialTag}>
                              <Ionicons name="time-outline" size={12} color="#F59E0B" />
                              <Text style={styles.trialTagText}>
                                {linked.trial_days_remaining > 0 
                                  ? `Trial: ${linked.trial_days_remaining}d left` 
                                  : linked.status === 'grace_period' 
                                    ? 'Grace Period' 
                                    : 'Trial Ended'}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.discountTag}>
                              <Text style={styles.discountTagText}>{linked.discount_percent}% off</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {linked.is_trial ? (
                            <Text style={styles.pricingFree}>FREE</Text>
                          ) : (
                            <>
                              <Text style={styles.pricingOriginal}>${linked.original_price}</Text>
                              <Text style={styles.pricingValue}>${linked.discounted_price}/mo</Text>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                    
                    {/* Trial Action Buttons */}
                    {currentPlan?.linked_apps?.filter((la: any) => la.is_trial && (la.trial_days_remaining <= 3 || la.status === 'grace_period')).map((linked: any) => (
                      <View key={`action-${linked.app_id}`} style={styles.trialActionBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trialActionTitle}>
                            {linked.status === 'grace_period' 
                              ? `${linked.app_name} trial has ended`
                              : `${linked.app_name} trial ending soon!`}
                          </Text>
                          <Text style={styles.trialActionSubtitle}>
                            Keep using {linked.app_name} for ${linked.discounted_price}/mo
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={styles.trialKeepButton}
                            onPress={() => {
                              // Open payment modal for conversion
                              openPaymentModal(
                                linked.app_id,
                                linked.app_name,
                                linked.discounted_price,
                                linked.original_price
                              );
                            }}
                          >
                            <Ionicons name="card" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.trialKeepButtonText}>Pay Now</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.trialCancelButton}
                            onPress={() => {
                              showConfirmation(
                                'Remove App',
                                `Are you sure you want to remove ${linked.app_name} from your subscription?\n\nYou'll lose access to all ${linked.app_name} features.`,
                                'Remove',
                                async () => {
                                  try {
                                    await subscriptionApi.unlinkApp(linked.app_id);
                                    fetchData();
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to remove app.');
                                  }
                                },
                                'danger' // Red for destructive action
                              );
                            }}
                          >
                            <Text style={styles.trialCancelButtonText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    
                    <View style={[styles.pricingRow, styles.pricingTotal]}>
                      <Text style={styles.pricingTotalLabel}>Total Monthly</Text>
                      <Text style={styles.pricingTotalValue}>
                        ${currentPlan?.pricing?.total_price || currentPlan?.plan?.price || 19}/mo
                      </Text>
                    </View>
                  </View>

                  <View style={styles.currentPlanInfo}>
                    <View style={styles.currentPlanStat}>
                      <Text style={styles.currentPlanStatValue}>{subscription?.days_remaining || 30}</Text>
                      <Text style={styles.currentPlanStatLabel}>Days Left</Text>
                    </View>
                    <View style={styles.currentPlanDivider} />
                    <View style={styles.currentPlanStat}>
                      <Text style={[styles.currentPlanStatValue, { color: '#10B981' }]}>
                        {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                      <Text style={styles.currentPlanStatLabel}>Status</Text>
                    </View>
                  </View>
                </View>

                {/* Link Additional Apps Section */}
                {availableApps.length > 0 && (
                  <View style={styles.linkAppsSection}>
                    <Text style={styles.linkAppsTitle}>Add More Apps</Text>
                    <Text style={styles.linkAppsSubtitle}>
                      Start with a 7-day free trial, then save {availableApps[0]?.discount_percent || 20}% on each linked app!
                    </Text>
                    
                    <View style={styles.availableAppsGrid}>
                      {availableApps.map((app) => (
                        <View key={app.id} style={styles.availableAppCard}>
                          <View style={[styles.appIconBg, { backgroundColor: app.color + '20' }]}>
                            <Ionicons name={app.icon as any} size={22} color={app.color} />
                          </View>
                          <Text style={styles.availableAppName}>{app.name}</Text>
                          <Text style={styles.availableAppDesc} numberOfLines={1}>{app.description}</Text>
                          
                          {/* Trial Badge */}
                          <View style={styles.freeTrialBadge}>
                            <Ionicons name="gift-outline" size={12} color="#10B981" />
                            <Text style={styles.freeTrialText}>7-Day Trial</Text>
                          </View>
                          
                          <View style={styles.appPricing}>
                            <Text style={styles.appOriginalPrice}>${app.plans[0]?.original_price}</Text>
                            <Text style={styles.appDiscountedPrice}>${app.plans[0]?.discounted_price}/mo</Text>
                          </View>
                          
                          <TouchableOpacity
                            style={styles.linkAppButton}
                            onPress={() => {
                              showConfirmation(
                                'Start Free Trial',
                                `Try ${app.name} free for 7 days!\n\nAfter trial: $${app.plans[0]?.discounted_price}/mo (${app.discount_percent}% off)`,
                                'Start Trial',
                                async () => {
                                  try {
                                    setLinkingApp(true);
                                    await subscriptionApi.linkApp(app.id, 'starter', true);
                                    Alert.alert('Trial Started!', `Your 7-day free trial of ${app.name} has started!`);
                                    fetchData();
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to start trial. Please try again.');
                                  } finally {
                                    setLinkingApp(false);
                                  }
                                },
                                'success' // Green for positive action
                              );
                            }}
                            disabled={linkingApp}
                          >
                            {linkingApp ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="flash" size={18} color="#FFFFFF" />
                            )}
                            <Text style={styles.linkAppButtonText}>{linkingApp ? 'Starting...' : 'Start Free Trial'}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Upgrade Plan Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Upgrade Your Plan</Text>
                  
                  {/* Billing Cycle Toggle */}
                  <View style={styles.billingToggle}>
                    <TouchableOpacity
                      style={[styles.billingOption, selectedBillingCycle === 'monthly' && styles.billingOptionActive]}
                      onPress={() => setSelectedBillingCycle('monthly')}
                    >
                      <Text style={[styles.billingOptionText, selectedBillingCycle === 'monthly' && styles.billingOptionTextActive]}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.billingOption, selectedBillingCycle === 'yearly' && styles.billingOptionActive]}
                      onPress={() => setSelectedBillingCycle('yearly')}
                    >
                      <Text style={[styles.billingOptionText, selectedBillingCycle === 'yearly' && styles.billingOptionTextActive]}>
                        Yearly
                      </Text>
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>Save 17%</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Plan Cards */}
                  <View style={styles.plansGrid}>
                    {plans.map((plan) => {
                      const isCurrentPlan = currentPlan?.plan?.id === plan.id;
                      const price = selectedBillingCycle === 'yearly' ? plan.price_yearly : plan.price;
                      const priceLabel = selectedBillingCycle === 'yearly' ? '/year' : '/month';
                      
                      return (
                        <View 
                          key={plan.id} 
                          style={[
                            styles.planCard,
                            plan.id === 'professional' && styles.planCardPopular,
                            isCurrentPlan && styles.planCardCurrent
                          ]}
                        >
                          {plan.id === 'professional' && (
                            <View style={styles.popularBanner}>
                              <Text style={styles.popularBannerText}>Best Value</Text>
                            </View>
                          )}
                          
                          <Text style={styles.planCardName}>{plan.name}</Text>
                          <Text style={styles.planCardDescription}>{plan.description}</Text>
                          
                          <View style={styles.planCardPricing}>
                            <Text style={styles.planCardPrice}>${price}</Text>
                            <Text style={styles.planCardPriceLabel}>{priceLabel}</Text>
                          </View>

                          <View style={styles.planCardFeatures}>
                            {plan.features.slice(0, 5).map((feature: any) => (
                              <View key={feature.id} style={styles.planFeatureRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.planFeatureText}>{feature.name}</Text>
                              </View>
                            ))}
                            {plan.features.length > 5 && (
                              <Text style={styles.planMoreFeatures}>+{plan.features.length - 5} more</Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.planCardButton,
                              isCurrentPlan && styles.planCardButtonCurrent,
                              plan.id === 'professional' && !isCurrentPlan && styles.planCardButtonPopular
                            ]}
                            onPress={() => {
                              if (!isCurrentPlan) {
                                handleUpgradePreview(plan);
                              }
                            }}
                            disabled={isCurrentPlan}
                          >
                            <Text style={[
                              styles.planCardButtonText,
                              isCurrentPlan && styles.planCardButtonTextCurrent,
                              plan.id === 'professional' && !isCurrentPlan && styles.planCardButtonTextPopular
                            ]}>
                              {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {plans.length === 0 && (
                  <View style={styles.noPlansMessage}>
                    <Ionicons name="information-circle-outline" size={48} color="#6B7280" />
                    <Text style={styles.noPlansText}>Loading subscription plans...</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.name}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formCountry === item.name && styles.modalItemSelected
                  ]}
                  onPress={() => handleSelectCountry(item)}
                >
                  <View style={styles.modalItemLeft}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSubtext}>{item.code}</Text>
                  </View>
                  {formCountry === item.name && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getCitiesForCountry()}
              keyExtractor={(item) => item}
              style={styles.modalList}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No cities available for selected country</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formCity === item && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setFormCity(item);
                    setShowCityModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {formCity === item && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formCurrency === item.code && styles.modalItemSelected
                  ]}
                  onPress={() => handleSelectCurrency(item)}
                >
                  <View style={styles.modalItemLeft}>
                    <Text style={styles.currencyItemSymbol}>{item.symbol}</Text>
                    <View>
                      <Text style={styles.modalItemText}>{item.code}</Text>
                      <Text style={styles.modalItemSubtext}>{item.name}</Text>
                    </View>
                  </View>
                  {formCurrency === item.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Upgrade/Downgrade Preview Modal */}
      <Modal
        visible={upgradePreview.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUpgradePreview(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.upgradeModalContainer, isWeb && styles.upgradeModalContainerWeb]}>
            {upgradePreview.loading ? (
              <View style={styles.upgradeModalLoading}>
                <ActivityIndicator size="large" color={upgradePreview.isDowngrade ? "#F59E0B" : "#2563EB"} />
                <Text style={styles.upgradeModalLoadingText}>
                  {upgradePreview.isDowngrade ? 'Preparing downgrade...' : 'Calculating your upgrade...'}
                </Text>
              </View>
            ) : upgradePreview.pricing && (
              <>
                <View style={[styles.upgradeModalHeader, upgradePreview.isDowngrade && styles.downgradeModalHeader]}>
                  <View style={[styles.upgradeModalIcon, upgradePreview.isDowngrade && styles.downgradeModalIcon]}>
                    <Ionicons 
                      name={upgradePreview.isDowngrade ? "trending-down" : "trending-up"} 
                      size={32} 
                      color={upgradePreview.isDowngrade ? "#F59E0B" : "#2563EB"} 
                    />
                  </View>
                  <Text style={styles.upgradeModalTitle}>
                    {upgradePreview.isDowngrade ? 'Downgrade to' : 'Upgrade to'} {upgradePreview.pricing.new_plan}
                  </Text>
                  <TouchableOpacity 
                    style={styles.upgradeModalClose}
                    onPress={() => setUpgradePreview(prev => ({ ...prev, visible: false }))}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.upgradeModalBody}>
                  {/* Current Plan */}
                  <View style={styles.upgradePlanRow}>
                    <Text style={styles.upgradePlanLabel}>Current Plan</Text>
                    <Text style={styles.upgradePlanValue}>{upgradePreview.pricing.current_plan}</Text>
                  </View>

                  {/* New Plan */}
                  <View style={styles.upgradePlanRow}>
                    <Text style={styles.upgradePlanLabel}>New Plan</Text>
                    <Text style={[styles.upgradePlanValue, { color: upgradePreview.isDowngrade ? '#F59E0B' : '#2563EB', fontWeight: '700' }]}>
                      {upgradePreview.pricing.new_plan}
                    </Text>
                  </View>

                  <View style={styles.upgradeDivider} />

                  {/* Show different content for upgrade vs downgrade */}
                  {upgradePreview.isDowngrade ? (
                    /* Downgrade Info - No Payment */
                    <View style={styles.downgradeInfoBox}>
                      <Ionicons name="information-circle" size={24} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.downgradeInfoTitle}>Downgrade at End of Billing Period</Text>
                        <Text style={styles.downgradeInfoText}>
                          Your plan will change to {upgradePreview.pricing.new_plan} when your current billing period ends ({subscription?.days_remaining || 0} days remaining).
                        </Text>
                        <Text style={[styles.downgradeInfoText, { marginTop: 8 }]}>
                          You'll continue to have access to all {upgradePreview.pricing.current_plan} features until then. No refund or payment required.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    /* Upgrade Price Breakdown */
                    <>
                      <View style={styles.upgradePriceSection}>
                        <View style={styles.upgradePriceRow}>
                          <Text style={styles.upgradePriceLabel}>
                            {upgradePreview.pricing.new_plan} ({upgradePreview.pricing.billing_cycle})
                          </Text>
                          <Text style={styles.upgradePriceValue}>
                            ${upgradePreview.pricing.original_price.toFixed(2)}
                          </Text>
                        </View>

                        {upgradePreview.pricing.prorated_credit > 0 && (
                          <View style={styles.upgradePriceRow}>
                            <View style={styles.upgradeCreditRow}>
                              <Ionicons name="gift-outline" size={16} color="#10B981" />
                              <Text style={styles.upgradeCreditLabel}>
                                Prorated credit ({upgradePreview.pricing.days_remaining} days remaining)
                              </Text>
                            </View>
                            <Text style={styles.upgradeCreditValue}>
                              -${upgradePreview.pricing.prorated_credit.toFixed(2)}
                            </Text>
                          </View>
                        )}

                        <View style={styles.upgradeTotalRow}>
                          <Text style={styles.upgradeTotalLabel}>Amount Due Today</Text>
                          <Text style={styles.upgradeTotalValue}>
                            ${upgradePreview.pricing.final_price.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {upgradePreview.pricing.prorated_credit > 0 && (
                        <View style={styles.upgradeSavingsBox}>
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                          <Text style={styles.upgradeSavingsText}>
                            You're saving ${upgradePreview.pricing.prorated_credit.toFixed(2)} with prorated credit!
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.upgradeModalFooter}>
                  <TouchableOpacity
                    style={styles.upgradeCancelButton}
                    onPress={() => setUpgradePreview(prev => ({ ...prev, visible: false }))}
                  >
                    <Text style={styles.upgradeCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.upgradeConfirmButton, upgradePreview.isDowngrade && styles.downgradeConfirmButton]}
                    onPress={upgradePreview.isDowngrade ? handleConfirmDowngrade : handleConfirmUpgrade}
                    disabled={upgradePreview.loading}
                  >
                    {upgradePreview.loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons 
                          name={upgradePreview.isDowngrade ? "calendar-outline" : "flash"} 
                          size={20} 
                          color="#FFFFFF" 
                        />
                        <Text style={styles.upgradeConfirmButtonText}>
                          {upgradePreview.isDowngrade 
                            ? 'Schedule Downgrade' 
                            : `Upgrade Now - $${upgradePreview.pricing.final_price.toFixed(2)}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal - Reusable Component */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel="Cancel"
        onConfirm={() => {
          confirmModal.onConfirm();
          hideConfirmation();
        }}
        onCancel={hideConfirmation}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />

      {/* Success Modal - Using React Native Modal for proper rendering */}
      <Modal
        visible={showSuccessModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal({ visible: false, tab: '' })}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successModalTitle}>Saved!</Text>
            <Text style={styles.successModalMessage}>
              {showSuccessModal.tab === 'business'
                ? 'Business settings saved successfully'
                : showSuccessModal.tab === 'inventory'
                  ? 'Inventory settings saved successfully'
                  : showSuccessModal.tab === 'apps'
                    ? 'App connections saved successfully'
                    : 'Settings saved successfully'
              }
            </Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => setShowSuccessModal({ visible: false, tab: '' })}
            >
              <Text style={styles.successModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Downgrade Success Modal */}
      <Modal
        visible={downgradeSuccessModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDowngradeSuccessModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.downgradeSuccessModalContent}>
            <View style={styles.downgradeSuccessIcon}>
              <Ionicons name="calendar-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.downgradeSuccessTitle}>Downgrade Scheduled</Text>
            <Text style={styles.downgradeSuccessMessage}>
              Your plan will change to <Text style={{ fontWeight: '700' }}>{downgradeSuccessModal.planName}</Text> on{'\n'}
              <Text style={{ fontWeight: '700' }}>{downgradeSuccessModal.effectiveDate}</Text>
            </Text>
            <View style={styles.downgradeSuccessInfo}>
              <Ionicons name="information-circle" size={20} color="#059669" />
              <Text style={styles.downgradeSuccessInfoText}>
                You'll continue to enjoy all current features until then.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.downgradeSuccessBtn}
              onPress={() => setDowngradeSuccessModal(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.downgradeSuccessBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal for Linked Apps */}
      <PaymentModal
        visible={paymentModal.visible}
        onClose={closePaymentModal}
        onSuccess={() => {
          fetchData();
          Alert.alert('Success', 'Payment completed successfully!');
        }}
        paymentType="linked_app"
        appId={paymentModal.appId}
        appName={paymentModal.appName}
        amount={paymentModal.amount}
        originalAmount={paymentModal.originalAmount}
      />

      {/* Payment Modal for Plan Upgrades */}
      <PaymentModal
        visible={upgradePayment.visible}
        onClose={() => setUpgradePayment({ visible: false, plan: null, amount: 0, originalAmount: 0 })}
        onSuccess={handleUpgradePaymentSuccess}
        paymentType="upgrade"
        planId={upgradePayment.plan?.id}
        appName={upgradePayment.plan?.name}
        amount={upgradePayment.amount}
        originalAmount={upgradePayment.originalAmount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  // Onboarding Banner Styles
  onboardingBanner: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'flex-start',
    gap: 12,
  },
  onboardingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTextContainer: {
    flex: 1,
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  onboardingSubtitle: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  refreshRatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EBF5FF',
  },
  refreshRatesBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  exchangeRatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exchangeRateCard: {
    width: '23%',
    minWidth: 150,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  exchangeRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exchangeRateCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  overrideBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overrideBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  rateValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exchangeRateValue: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  rateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editRateBtn: {
    padding: 4,
  },
  resetRateBtn: {
    padding: 4,
  },
  editRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRateInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
  },
  editRateSaveBtn: {
    padding: 4,
  },
  editRateCancelBtn: {
    padding: 4,
  },
  rateSource: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginBottom: 20,
    maxWidth: 150,
    alignSelf: 'flex-start',
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDetails: {
    gap: 12,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  subscriptionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  renewDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  planOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planOptionPopular: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  planOptionPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  renewButton: {
    marginTop: 8,
  },
  // Upgrade Preview Modal Styles
  upgradeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  upgradeModalContainerWeb: {
    maxWidth: 480,
  },
  upgradeModalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  upgradeModalLoadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  upgradeModalHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  downgradeModalHeader: {
    backgroundColor: '#FFFBEB',
  },
  upgradeModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  downgradeModalIcon: {
    backgroundColor: '#FEF3C7',
  },
  upgradeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  upgradeModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  upgradeModalBody: {
    padding: 24,
  },
  upgradePlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradePlanLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  upgradePlanValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  upgradeDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  upgradePriceSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  upgradePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradePriceLabel: {
    fontSize: 14,
    color: '#374151',
  },
  upgradePriceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  upgradeCreditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upgradeCreditLabel: {
    fontSize: 13,
    color: '#10B981',
  },
  upgradeCreditValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  upgradeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  upgradeTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  upgradeTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  upgradeSavingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
  },
  upgradeSavingsText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
  },
  upgradeModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  upgradeCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  upgradeCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  upgradeConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  downgradeConfirmButton: {
    backgroundColor: '#F59E0B',
  },
  upgradeConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Downgrade Info Box Styles
  downgradeInfoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  downgradeInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  downgradeInfoText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  // Phone Input Styles
  phoneInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputRow: {
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    minWidth: 90,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  phoneHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Dropdown Styles
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    width: 30,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalContainerWeb: {
    maxWidth: 480,
    maxHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 8,
  },
  modalList: {
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  modalItemSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  currencyItemSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
    width: 40,
    textAlign: 'center',
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  successModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Downgrade Success Modal Styles
  downgradeSuccessModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  downgradeSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  downgradeSuccessTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  downgradeSuccessMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  downgradeSuccessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  downgradeSuccessInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
  },
  downgradeSuccessBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  downgradeSuccessBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Mobile Card Container
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  // Settings row with switch
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Web tab container style
  tabContainerWeb: {
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    gap: 8,
  },
  // Web layout styles
  webContentWrapper: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  webScrollContent: {
    flex: 1,
  },
  webScrollInner: {
    paddingBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  inputHalf: {
    flex: 1,
  },
  // Current Plan Card
  currentPlanCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  currentPlanLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0369A1',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  currentPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  currentPlanStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  currentPlanStatLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentPlanDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  billingOptionTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  // Plans Grid
  plansGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  planCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardPopular: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  planCardCurrent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  popularBanner: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planCardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  planCardPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  planCardPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  planCardPriceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  planCardFeatures: {
    marginBottom: 20,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#374151',
  },
  planMoreFeatures: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  planCardButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  planCardButtonPopular: {
    backgroundColor: '#2563EB',
  },
  planCardButtonCurrent: {
    backgroundColor: '#D1FAE5',
  },
  planCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  planCardButtonTextPopular: {
    color: '#FFFFFF',
  },
  planCardButtonTextCurrent: {
    color: '#059669',
  },
  noPlansMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPlansText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  // Pricing Breakdown Styles
  pricingBreakdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pricingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  pricingOriginal: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  pricingTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pricingTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  discountTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  discountTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  // Trial-related styles
  trialTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  trialTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  pricingFree: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  trialActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 12,
  },
  trialActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  trialActionSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  trialKeepButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trialKeepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trialCancelButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trialCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  freeTrialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    marginBottom: 6,
  },
  freeTrialText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  afterTrialText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: -4,
    marginBottom: 6,
  },
  // Link Apps Section Styles
  linkAppsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  linkAppsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  linkAppsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  availableAppsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  availableAppCard: {
    width: '31%',
    minWidth: 180,
    maxWidth: 240,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  appIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  availableAppName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  availableAppDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
  },
  appPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  appOriginalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  appDiscountedPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  linkAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    width: '100%',
  },
  linkAppButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // SKU Settings Styles
  formatSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  formatOptionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  formatOptionsGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  formatOption: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  formatOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  formatOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  formatRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatRadioActive: {
    borderColor: '#2563EB',
  },
  formatRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  formatOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  formatOptionTitleActive: {
    color: '#1E40AF',
  },
  formatOptionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  formatOptionExample: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  separatorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  separatorOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  separatorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  separatorOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  separatorOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  separatorOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  separatorOptionTextActive: {
    color: '#2563EB',
  },
  skuPreview: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  skuPreviewLabel: {
    fontSize: 12,
    color: '#15803D',
    marginBottom: 4,
  },
  skuPreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#166534',
    fontFamily: 'monospace',
  },
  manualSkuInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  manualSkuText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  // Inherited Settings Styles
  inheritedSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inheritedSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  inheritedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inheritedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  inheritedDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  inheritedSettingsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inheritedSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inheritedSettingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  inheritedSettingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  goToRetailProButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  goToRetailProText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});
