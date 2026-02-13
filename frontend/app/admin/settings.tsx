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
import api, { businessApi, businessSettingsApi, subscriptionApi, exchangeRatesApi, locationsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useOfflineStore } from '../../src/store/offlineStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import PaymentModal from '../../src/components/PaymentModal';
import LinkedAppsManager from '../../src/components/LinkedAppsManager';
import PrinterSettings from '../../src/components/PrinterSettings';
import OfflineIndicator from '../../src/components/OfflineIndicator';
import syncService from '../../src/services/syncService';

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
    example: 'STORE-PRD-0001',
  },
];

const SKU_SEPARATOR_OPTIONS = [
  { value: '-', label: 'Dash (-)' },
  { value: '_', label: 'Underscore (_)' },
  { value: '.', label: 'Dot (.)' },
  { value: '', label: 'None' },
];

// Service Code Format Options
const SERVICE_CODE_FORMATS = [
  {
    id: 'prefix_number',
    name: 'Prefix + Number',
    description: 'Simple prefix followed by sequential number',
    example: 'SVC-0001',
  },
  {
    id: 'category_prefix',
    name: 'Category + Prefix + Number',
    description: 'Include service category in code',
    example: 'MASS-SVC-0001',
  },
  {
    id: 'time_based',
    name: 'Pricing Type + Prefix + Number',
    description: 'Include pricing type (HR/DY/SS)',
    example: 'HR-SVC-0001',
  },
  {
    id: 'custom',
    name: 'Custom Format',
    description: 'Define your own service code format',
    example: 'SERV-MASS-001',
  },
];

const SERVICE_CODE_SEPARATOR_OPTIONS = [
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

export default function Settings() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === 'true';
  const { user: currentUser } = useAuthStore();
  const { loadSettings: reloadBusinessSettings } = useBusinessStore();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'app' | 'apps' | 'pos' | 'locations' | 'subscription' | 'referral'>('general');
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  // Handle tab from URL params
  useEffect(() => {
    if (params.tab) {
      const validTabs = ['general', 'app', 'apps', 'pos', 'locations', 'subscription', 'referral'];
      if (validTabs.includes(params.tab as string)) {
        setActiveTab(params.tab as any);
      }
    }
  }, [params.tab]);

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
  
  // Main Location fields (for business primary location)
  const [formLocationName, setFormLocationName] = useState('');
  const [formLocationAddress, setFormLocationAddress] = useState('');
  const [formLocationPhone, setFormLocationPhone] = useState('');
  const [formLocationEmail, setFormLocationEmail] = useState('');

  // App-specific settings state
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us!');
  const [enableLowStockAlerts, setEnableLowStockAlerts] = useState(true);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState('0');
  const [applyTax, setApplyTax] = useState(true);
  const [taxInclusive, setTaxInclusive] = useState(false);

  // SKU Format Settings
  const [skuFormat, setSkuFormat] = useState('prefix_number'); // prefix_number, category_number, custom
  const [skuPrefix, setSkuPrefix] = useState('SKU');
  const [skuStartNumber, setSkuStartNumber] = useState('1');
  const [skuDigits, setSkuDigits] = useState('4');
  const [skuSeparator, setSkuSeparator] = useState('-');
  const [skuIncludeCategory, setSkuIncludeCategory] = useState(false);

  // Service Code Format Settings
  const [autoGenerateServiceCode, setAutoGenerateServiceCode] = useState(true);
  const [serviceCodeFormat, setServiceCodeFormat] = useState('prefix_number');
  const [serviceCodePrefix, setServiceCodePrefix] = useState('SVC');
  const [serviceCodeStartNumber, setServiceCodeStartNumber] = useState('1');
  const [serviceCodeDigits, setServiceCodeDigits] = useState('4');
  const [serviceCodeSeparator, setServiceCodeSeparator] = useState('-');

  // Barcode Settings
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const [barcodePrefix, setBarcodePrefix] = useState('INT');
  const [barcodeDigits, setBarcodeDigits] = useState('6');
  const [barcodeSeparator, setBarcodeSeparator] = useState('-');

  // Locations State
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationPhone, setNewLocationPhone] = useState('');
  const [newLocationEmail, setNewLocationEmail] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<{id: string; name: string; price: number; locations: number} | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [showLocationSuccess, setShowLocationSuccess] = useState<{ visible: boolean; name: string; isEdit: boolean }>({ visible: false, name: '', isEdit: false });

  // Referral Program Settings
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [referrerReward, setReferrerReward] = useState('10');
  const [refereeReward, setRefereeReward] = useState('10');
  const [maxReferralsPerUser, setMaxReferralsPerUser] = useState('');
  const [referralExpiryDays, setReferralExpiryDays] = useState('');
  const [showPostPurchasePopup, setShowPostPurchasePopup] = useState(true);
  const [savingReferral, setSavingReferral] = useState(false);

  // Helper function to generate Barcode preview
  const getBarcodePreview = (): string => {
    const digits = parseInt(barcodeDigits) || 6;
    const paddedNumber = '1'.padStart(digits, '0');
    return `${barcodePrefix}${barcodeSeparator}${paddedNumber}`;
  };

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

  // Helper function to generate Service Code preview
  const getServiceCodePreview = (): string => {
    const startNum = parseInt(serviceCodeStartNumber) || 1;
    const digits = parseInt(serviceCodeDigits) || 4;
    const paddedNumber = startNum.toString().padStart(digits, '0');
    const sep = serviceCodeSeparator;

    switch (serviceCodeFormat) {
      case 'prefix_number':
        return `${serviceCodePrefix}${sep}${paddedNumber}`;
      case 'category_prefix':
        return `MASS${sep}${serviceCodePrefix}${sep}${paddedNumber}`;
      case 'time_based':
        return `HR${sep}${serviceCodePrefix}${sep}${paddedNumber}`;
      case 'custom':
        return `${serviceCodePrefix}${sep}${paddedNumber}`;
      default:
        return `${serviceCodePrefix}${sep}${paddedNumber}`;
    }
  };

  // Subscription plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [availableApps, setAvailableApps] = useState<any[]>([]);
  const [linkingApp, setLinkingApp] = useState(false);

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
      
      // Populate main location fields
      setFormLocationName(b.location_name || b.name || '');
      setFormLocationAddress(b.location_address || b.address || '');
      setFormLocationPhone(b.location_phone || b.phone || '');
      setFormLocationEmail(b.location_email || b.email || '');
      
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
      
      // Fetch business settings (SKU, Service Code, Invoice formats)
      try {
        const settingsRes = await businessSettingsApi.get();
        const s = settingsRes.data;
        // SKU Settings
        setSkuFormat(s.sku_format || 'prefix_number');
        setSkuPrefix(s.sku_prefix || 'SKU');
        setSkuStartNumber(String(s.sku_start_number || 1));
        setSkuDigits(String(s.sku_digits || 4));
        setSkuSeparator(s.sku_separator || '-');
        setSkuIncludeCategory(s.sku_include_category || false);
        setAutoGenerateSku(s.auto_generate_sku !== false);
        // Service Code Settings
        setServiceCodeFormat(s.service_code_format || 'prefix_number');
        setServiceCodePrefix(s.service_code_prefix || 'SVC');
        setServiceCodeStartNumber(String(s.service_code_start_number || 1));
        setServiceCodeDigits(String(s.service_code_digits || 4));
        setServiceCodeSeparator(s.service_code_separator || '-');
        setAutoGenerateServiceCode(s.auto_generate_service_code !== false);
        // Barcode Settings
        setBarcodeEnabled(s.barcode_enabled || false);
        setBarcodePrefix(s.barcode_prefix || 'INT');
        setBarcodeDigits(String(s.barcode_digits || 6));
        setBarcodeSeparator(s.barcode_separator || '-');
      } catch (e) {
        console.log('Failed to fetch business settings:', e);
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

  // Location functions
  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data);
    } catch (error) {
      console.log('Failed to load locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Location name is required');
      return;
    }
    
    setSavingLocation(true);
    try {
      setLocationError(null);
      const locationData = {
        name: newLocationName.trim(),
        address: newLocationAddress.trim() || '',
        phone: newLocationPhone.trim() || '',
        email: newLocationEmail.trim() || '',
      };

      if (editingLocation) {
        await locationsApi.update(editingLocation.id, locationData);
        setShowAddLocationModal(false);
        setShowLocationSuccess({ visible: true, name: newLocationName.trim(), isEdit: true });
        setEditingLocation(null);
        resetLocationForm();
        loadLocations();
      } else {
        await locationsApi.create(locationData);
        setShowAddLocationModal(false);
        setShowLocationSuccess({ visible: true, name: newLocationName.trim(), isEdit: false });
        setEditingLocation(null);
        resetLocationForm();
        loadLocations();
      }
    } catch (error: any) {
      console.log('Location save error:', error.response?.data);
      const errorMessage = error.response?.data?.detail || 'Failed to save location';
      
      // Check if it's a limit error
      if (error.response?.status === 403 && errorMessage.includes('limit')) {
        setLocationError(null);
        setShowAddLocationModal(false);
        setShowUpgradePrompt(true);
      } else {
        setLocationError(errorMessage);
      }
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (location: any) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"?${location.order_count > 0 ? ` This location has ${location.order_count} orders and will be deactivated instead.` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await locationsApi.delete(location.id);
              Alert.alert('Success', 'Location deleted');
              loadLocations();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete location');
            }
          },
        },
      ]
    );
  };

  const resetLocationForm = () => {
    setNewLocationName('');
    setNewLocationAddress('');
    setNewLocationPhone('');
    setNewLocationEmail('');
  };

  const openEditLocation = (location: any) => {
    setEditingLocation(location);
    setNewLocationName(location.name);
    setNewLocationAddress(location.address || '');
    setNewLocationPhone(location.phone || '');
    setNewLocationEmail(location.email || '');
    setShowAddLocationModal(true);
  };

  // Load locations when tab changes
  useEffect(() => {
    if (activeTab === 'locations') {
      loadLocations();
    }
  }, [activeTab]);

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
        // Main Location Fields
        location_name: formLocationName.trim() || undefined,
        location_address: formLocationAddress.trim() || undefined,
        location_phone: formLocationPhone.trim() || undefined,
        location_email: formLocationEmail.trim() || undefined,
      });
      
      // Reload global business settings so currency reflects throughout the app
      await reloadBusinessSettings();
      
      // Show success modal with tab info
      setShowSuccessModal({ visible: true, tab: 'business' });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Save App Settings (SKU, Service Code formats) to backend
  const handleSaveAppSettings = async () => {
    setSaving(true);
    try {
      await businessSettingsApi.update({
        // SKU Settings
        sku_format: skuFormat,
        sku_prefix: skuPrefix,
        sku_start_number: parseInt(skuStartNumber) || 1,
        sku_digits: parseInt(skuDigits) || 4,
        sku_separator: skuSeparator,
        sku_include_category: skuIncludeCategory,
        auto_generate_sku: autoGenerateSku,
        // Barcode Settings
        barcode_enabled: barcodeEnabled,
        barcode_prefix: barcodePrefix,
        barcode_digits: parseInt(barcodeDigits) || 6,
        barcode_separator: barcodeSeparator,
        // Service Code Settings
        service_code_format: serviceCodeFormat,
        service_code_prefix: serviceCodePrefix,
        service_code_start_number: parseInt(serviceCodeStartNumber) || 1,
        service_code_digits: parseInt(serviceCodeDigits) || 4,
        service_code_separator: serviceCodeSeparator,
        auto_generate_service_code: autoGenerateServiceCode,
        // Invoice Settings (defaults - can be extended later)
        invoice_format: 'prefix_number',
        invoice_prefix: 'INV',
        invoice_start_number: 1,
        invoice_digits: 5,
        invoice_separator: '-',
        invoice_include_year: true,
        invoice_include_month: false,
        invoice_reset_yearly: true,
      });
      
      // Show success modal with tab info
      setShowSuccessModal({ visible: true, tab: 'retailpro' });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save app settings');
    } finally {
      setSaving(false);
    }
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

  // Country to currency mapping
  const COUNTRY_CURRENCY_MAP: { [key: string]: { code: string; symbol: string } } = {
    'Kenya': { code: 'KES', symbol: 'KSh' },
    'Uganda': { code: 'UGX', symbol: 'USh' },
    'Tanzania': { code: 'TZS', symbol: 'TSh' },
    'Nigeria': { code: 'NGN', symbol: '₦' },
    'Ghana': { code: 'GHS', symbol: 'GH₵' },
    'South Africa': { code: 'ZAR', symbol: 'R' },
    'United States': { code: 'USD', symbol: '$' },
    'United Kingdom': { code: 'GBP', symbol: '£' },
    'India': { code: 'INR', symbol: '₹' },
    'China': { code: 'CNY', symbol: '¥' },
    'Japan': { code: 'JPY', symbol: '¥' },
    'Germany': { code: 'EUR', symbol: '€' },
    'France': { code: 'EUR', symbol: '€' },
    'Italy': { code: 'EUR', symbol: '€' },
    'Spain': { code: 'EUR', symbol: '€' },
    'Australia': { code: 'AUD', symbol: 'A$' },
    'Canada': { code: 'CAD', symbol: 'C$' },
    'Brazil': { code: 'BRL', symbol: 'R$' },
    'Mexico': { code: 'MXN', symbol: 'MX$' },
    'UAE': { code: 'AED', symbol: 'د.إ' },
    'Saudi Arabia': { code: 'SAR', symbol: '﷼' },
    'Egypt': { code: 'EGP', symbol: 'E£' },
    'Rwanda': { code: 'RWF', symbol: 'FRw' },
    'Ethiopia': { code: 'ETB', symbol: 'Br' },
  };

  const handleSelectCountry = (country: typeof COUNTRIES[0]) => {
    setFormCountry(country.name);
    setFormCountryCode(country.code);
    setFormCity(''); // Reset city when country changes
    
    // Auto-set currency based on country
    const currencyInfo = COUNTRY_CURRENCY_MAP[country.name];
    if (currencyInfo) {
      setFormCurrency(currencyInfo.code);
      setFormCurrencySymbol(currencyInfo.symbol);
    }
    
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
            <Text style={styles.onboardingTitle}>Welcome to RetailPro! 🎉</Text>
            <Text style={styles.onboardingSubtitle}>
              Complete your business setup below to get started. Set your currency, country, and other details.
            </Text>
          </View>
        </View>
      )}

      {/* Tab Selector - Scrollable on mobile */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabContainer, isWeb && styles.tabContainerWeb]}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'general' && styles.tabActive]}
            onPress={() => setActiveTab('general')}
          >
            <Ionicons
              name="settings-outline"
              size={18}
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
              name="storefront-outline"
              size={18}
              color={activeTab === 'app' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'app' && styles.tabTextActive]}>
              RetailPro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'apps' && styles.tabActive]}
            onPress={() => setActiveTab('apps')}
          >
            <Ionicons
              name="apps-outline"
              size={18}
              color={activeTab === 'apps' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'apps' && styles.tabTextActive]}>
              Apps
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pos' && styles.tabActive]}
            onPress={() => setActiveTab('pos')}
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color={activeTab === 'pos' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'pos' && styles.tabTextActive]}>
              POS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'locations' && styles.tabActive]}
            onPress={() => setActiveTab('locations')}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={activeTab === 'locations' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
              Locations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
            onPress={() => setActiveTab('subscription')}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={activeTab === 'subscription' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>
              Plan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'referral' && styles.tabActive]}
            onPress={() => setActiveTab('referral')}
            data-testid="settings-referral-tab"
          >
            <Ionicons
              name="gift-outline"
              size={18}
              color={activeTab === 'referral' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'referral' && styles.tabTextActive]}>
              Referral
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
                    <View style={styles.currencySymbolBox}>
                      <Text style={styles.currencySymbol}>{formCurrencySymbol}</Text>
                    </View>
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
                <Text style={styles.sectionTitle}>Tax Settings</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Apply Tax</Text>
                    <Text style={styles.settingDescription}>Enable tax on sales</Text>
                  </View>
                  <Switch
                    value={applyTax}
                    onValueChange={setApplyTax}
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={applyTax ? '#2563EB' : '#9CA3AF'}
                  />
                </View>

                {applyTax && (
                  <>
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Prices Tax Inclusive</Text>
                        <Text style={styles.settingDescription}>
                          {taxInclusive 
                            ? 'Prices already include tax' 
                            : 'Tax will be added to prices'}
                        </Text>
                      </View>
                      <Switch
                        value={taxInclusive}
                        onValueChange={setTaxInclusive}
                        trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                        thumbColor={taxInclusive ? '#2563EB' : '#9CA3AF'}
                      />
                    </View>

                    <Input
                      label="Default Tax Rate (%)"
                      placeholder="Enter tax rate"
                      value={defaultTaxRate}
                      onChangeText={setDefaultTaxRate}
                      keyboardType="decimal-pad"
                      leftIcon={<Ionicons name="calculator-outline" size={20} color="#6B7280" />}
                    />

                    <View style={styles.taxInfoBox}>
                      <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                      <Text style={styles.taxInfoText}>
                        {taxInclusive 
                          ? `Prices shown include ${defaultTaxRate || '0'}% tax. Example: $100 price = $${(100 / (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)} + $${(100 - 100 / (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)} tax`
                          : `Tax will be calculated on top of prices. Example: $100 + ${defaultTaxRate || '0'}% = $${(100 * (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)}`
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>

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

              {/* Service Code Settings */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Service Code Settings</Text>
                <Text style={styles.sectionSubtitle}>Configure how service codes are generated for services</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Auto-generate Service Code</Text>
                    <Text style={styles.settingDescription}>Automatically create codes for new services</Text>
                  </View>
                  <Switch
                    value={autoGenerateServiceCode}
                    onValueChange={setAutoGenerateServiceCode}
                    trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                    thumbColor={autoGenerateServiceCode ? '#10B981' : '#9CA3AF'}
                  />
                </View>

                {autoGenerateServiceCode && (
                  <>
                    <Text style={styles.formatSectionLabel}>Service Code Format</Text>
                    <View style={styles.formatOptionsContainer}>
                      {SERVICE_CODE_FORMATS.map((format) => (
                        <TouchableOpacity
                          key={format.id}
                          style={[
                            styles.formatOption,
                            serviceCodeFormat === format.id && styles.serviceCodeFormatOptionActive,
                          ]}
                          onPress={() => setServiceCodeFormat(format.id)}
                        >
                          <View style={styles.formatOptionHeader}>
                            <View style={[
                              styles.formatRadio,
                              serviceCodeFormat === format.id && styles.serviceCodeFormatRadioActive,
                            ]}>
                              {serviceCodeFormat === format.id && <View style={styles.formatRadioInner} />}
                            </View>
                            <Text style={[
                              styles.formatOptionTitle,
                              serviceCodeFormat === format.id && styles.serviceCodeFormatOptionTitleActive,
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
                      label="Service Code Prefix"
                      placeholder="SVC"
                      value={serviceCodePrefix}
                      onChangeText={setServiceCodePrefix}
                      leftIcon={<Ionicons name="construct-outline" size={20} color="#6B7280" />}
                    />

                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <Input
                          label="Starting Number"
                          placeholder="1"
                          value={serviceCodeStartNumber}
                          onChangeText={setServiceCodeStartNumber}
                          keyboardType="number-pad"
                          leftIcon={<Ionicons name="arrow-forward-outline" size={20} color="#6B7280" />}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <Input
                          label="Number of Digits"
                          placeholder="4"
                          value={serviceCodeDigits}
                          onChangeText={setServiceCodeDigits}
                          keyboardType="number-pad"
                          leftIcon={<Ionicons name="keypad-outline" size={20} color="#6B7280" />}
                        />
                      </View>
                    </View>

                    <Text style={styles.formatSectionLabel}>Separator</Text>
                    <View style={styles.separatorOptions}>
                      {SERVICE_CODE_SEPARATOR_OPTIONS.map((sep) => (
                        <TouchableOpacity
                          key={sep.value}
                          style={[
                            styles.separatorOption,
                            serviceCodeSeparator === sep.value && styles.serviceCodeSeparatorOptionActive,
                          ]}
                          onPress={() => setServiceCodeSeparator(sep.value)}
                        >
                          <Text style={[
                            styles.separatorOptionText,
                            serviceCodeSeparator === sep.value && styles.serviceCodeSeparatorOptionTextActive,
                          ]}>
                            {sep.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.serviceCodePreview}>
                      <Text style={styles.serviceCodePreviewLabel}>Next Service Code Preview</Text>
                      <Text style={styles.serviceCodePreviewValue}>{getServiceCodePreview()}</Text>
                    </View>
                  </>
                )}

                {!autoGenerateServiceCode && (
                  <View style={styles.manualSkuInfo}>
                    <Ionicons name="create-outline" size={20} color="#6B7280" />
                    <Text style={styles.manualSkuText}>
                      You'll enter service codes manually when creating services
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Receipt Settings</Text>
                
                <Input
                  label="Receipt Footer Message"
                  placeholder="Thank you for shopping with us!"
                  value={receiptFooter}
                  onChangeText={setReceiptFooter}
                  multiline
                  numberOfLines={2}
                  leftIcon={<Ionicons name="receipt-outline" size={20} color="#6B7280" />}
                />
              </View>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>Want Inventory Management?</Text>
                  <Text style={styles.infoCardText}>
                    Link the Inventory app to track stock levels and get low stock alerts.
                  </Text>
                  <TouchableOpacity 
                    style={styles.infoCardLink}
                    onPress={() => setActiveTab('apps')}
                  >
                    <Text style={styles.infoCardLinkText}>Go to Apps →</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Save"
                onPress={handleSaveAppSettings}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          )}

          {activeTab === 'apps' && (
            <View>
              <LinkedAppsManager 
                productId="retailpro"
                currentPlan={currentPlan}
                onRefresh={fetchData}
              />
            </View>
          )}

          {activeTab === 'pos' && (
            <View>
              {/* Offline Mode Section */}
              <Text style={styles.formSectionTitle}>Offline Mode</Text>
              
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Enable Offline Mode</Text>
                  <Text style={styles.formHint}>Continue selling even without internet connection</Text>
                </View>
                <Switch
                  value={useOfflineStore.getState().offlineModeEnabled}
                  onValueChange={(value) => useOfflineStore.getState().setOfflineModeEnabled(value)}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {/* Sync Status */}
              <Text style={styles.formLabel}>Sync Status</Text>
              <View style={styles.formInputContainer}>
                <Ionicons name="cloud-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <Text style={styles.formInputText}>
                  {useOfflineStore.getState().isOnline ? 'Online' : 'Offline'} • {useOfflineStore.getState().pendingTransactions.length} pending orders
                </Text>
              </View>
              
              {/* Sync Actions - only show sync if there are pending orders */}
              <View style={styles.formButtonRow}>
                <TouchableOpacity
                  style={styles.formOutlineButton}
                  onPress={() => syncService.refreshProductCache()}
                >
                  <Text style={styles.formOutlineButtonText}>Refresh Product Cache</Text>
                </TouchableOpacity>
                
                {useOfflineStore.getState().pendingTransactions.length > 0 && (
                  <TouchableOpacity
                    style={styles.formOutlineButton}
                    onPress={() => syncService.manualSync()}
                  >
                    <Text style={styles.formOutlineButtonText}>Sync Pending Orders</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Printer Settings */}
              <PrinterSettings />
            </View>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <View>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Store Locations</Text>
                  <Text style={styles.locationLimitText}>
                    {locations.length} / {currentPlan?.plan?.max_locations === -1 ? '∞' : (currentPlan?.plan?.max_locations || 1)} locations
                    {currentPlan?.plan?.name && ` (${currentPlan.plan.name} Plan)`}
                  </Text>
                </View>
                <TouchableOpacity
                  testID="add-location-btn"
                  accessibilityLabel="Add Location"
                  style={styles.addLocationBtn}
                  onPress={() => {
                    const maxLoc = currentPlan?.plan?.max_locations || 1;
                    console.log('Add location pressed - maxLoc:', maxLoc, 'current:', locations.length);
                    if (maxLoc !== -1 && locations.length >= maxLoc) {
                      // Show upgrade prompt modal instead of form
                      console.log('Showing upgrade prompt');
                      setShowUpgradePrompt(true);
                      return;
                    }
                    setEditingLocation(null);
                    resetLocationForm();
                    setShowAddLocationModal(true);
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#2563EB" />
                </TouchableOpacity>
              </View>
              
              {/* Upgrade prompt if at limit */}
              {currentPlan?.plan?.max_locations !== -1 && 
               locations.length >= (currentPlan?.plan?.max_locations || 1) && (
                <View style={styles.locationUpgradeCard}>
                  <Ionicons name="arrow-up-circle" size={24} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationUpgradeTitle}>Need more locations?</Text>
                    <Text style={styles.locationUpgradeText}>
                      Upgrade to Professional (3 locations) or Enterprise (unlimited)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.locationUpgradeBtn}
                    onPress={() => setShowUpgradePrompt(true)}
                  >
                    <Text style={styles.locationUpgradeBtnText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {loadingLocations ? (
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
              ) : locations.length === 0 ? (
                <View style={styles.emptyLocations}>
                  <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyLocationsTitle}>No Locations Yet</Text>
                  <Text style={styles.emptyLocationsText}>Add your first store location to track sales by branch</Text>
                  <TouchableOpacity
                    style={styles.addFirstLocationBtn}
                    onPress={() => {
                      setEditingLocation(null);
                      resetLocationForm();
                      setShowAddLocationModal(true);
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addFirstLocationBtnText}>Add Location</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.locationsList}>
                  {locations.map((location) => (
                    <View key={location.id} style={[styles.locationCard, !location.is_active && styles.locationCardInactive]}>
                      <View style={styles.locationCardMain}>
                        <View style={styles.locationIcon}>
                          <Ionicons name="storefront" size={24} color={location.is_active ? "#2563EB" : "#9CA3AF"} />
                        </View>
                        <View style={styles.locationInfo}>
                          <Text style={styles.locationName}>{location.name}</Text>
                          {location.address && <Text style={styles.locationAddress}>{location.address}</Text>}
                          {location.phone && (
                            <View style={styles.locationDetail}>
                              <Ionicons name="call-outline" size={14} color="#6B7280" />
                              <Text style={styles.locationDetailText}>{location.phone}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.locationStats}>
                          <Text style={styles.locationOrderCount}>{location.order_count}</Text>
                          <Text style={styles.locationOrderLabel}>orders</Text>
                        </View>
                      </View>
                      <View style={styles.locationActions}>
                        <TouchableOpacity
                          style={styles.locationActionBtn}
                          onPress={() => openEditLocation(location)}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.locationActionBtn}
                          onPress={() => handleDeleteLocation(location)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
                          {currentPlan?.primary_app?.name || 'RetailPro'} {currentPlan?.plan?.name || 'Starter'}
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
                        {currentPlan?.primary_app?.name || 'RetailPro'} ({currentPlan?.plan?.name || 'Starter'})
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

          {activeTab === 'referral' && (
            <View>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: '#E0E7FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Ionicons name="gift" size={24} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Referral Program</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      Configure rewards and settings for your referral program
                    </Text>
                  </View>
                </View>

                {/* Program Status Toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Enable Referral Program</Text>
                    <Text style={styles.toggleDescription}>
                      Allow users to refer friends and earn rewards
                    </Text>
                  </View>
                  <Switch
                    value={referralEnabled}
                    onValueChange={setReferralEnabled}
                    trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
                    thumbColor={referralEnabled ? '#FFFFFF' : '#F3F4F6'}
                  />
                </View>

                <View style={styles.divider} />

                {/* Reward Amounts */}
                <Text style={styles.subsectionTitle}>Reward Configuration</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Referrer Reward ($)</Text>
                    <TextInput
                      style={styles.textInputField}
                      value={referrerReward}
                      onChangeText={setReferrerReward}
                      keyboardType="numeric"
                      placeholder="10"
                      data-testid="referrer-reward-input"
                    />
                    <Text style={styles.inputHint}>Amount earned by the person who refers</Text>
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Referee Reward ($)</Text>
                    <TextInput
                      style={styles.textInputField}
                      value={refereeReward}
                      onChangeText={setRefereeReward}
                      keyboardType="numeric"
                      placeholder="10"
                      data-testid="referee-reward-input"
                    />
                    <Text style={styles.inputHint}>Amount given to the new user who signs up</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Limits */}
                <Text style={styles.subsectionTitle}>Limits & Restrictions</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Max Referrals Per User</Text>
                    <TextInput
                      style={styles.textInputField}
                      value={maxReferralsPerUser}
                      onChangeText={setMaxReferralsPerUser}
                      keyboardType="numeric"
                      placeholder="Unlimited"
                      data-testid="max-referrals-input"
                    />
                    <Text style={styles.inputHint}>Leave empty for unlimited</Text>
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Referral Link Expiry (Days)</Text>
                    <TextInput
                      style={styles.textInputField}
                      value={referralExpiryDays}
                      onChangeText={setReferralExpiryDays}
                      keyboardType="numeric"
                      placeholder="Never expires"
                      data-testid="referral-expiry-input"
                    />
                    <Text style={styles.inputHint}>Leave empty for no expiry</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Visibility Settings */}
                <Text style={styles.subsectionTitle}>Visibility</Text>
                
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Post-Purchase Popup</Text>
                    <Text style={styles.toggleDescription}>
                      Show referral popup after successful purchases
                    </Text>
                  </View>
                  <Switch
                    value={showPostPurchasePopup}
                    onValueChange={setShowPostPurchasePopup}
                    trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
                    thumbColor={showPostPurchasePopup ? '#FFFFFF' : '#F3F4F6'}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, savingReferral && styles.saveButtonDisabled]}
                  onPress={async () => {
                    try {
                      setSavingReferral(true);
                      await api.put('/superadmin/referrals', {
                        is_active: referralEnabled,
                        referrer_reward: parseFloat(referrerReward) || 10,
                        referee_reward: parseFloat(refereeReward) || 10,
                        max_referrals_per_user: maxReferralsPerUser ? parseInt(maxReferralsPerUser) : null,
                        expiry_days: referralExpiryDays ? parseInt(referralExpiryDays) : null,
                        show_post_purchase_popup: showPostPurchasePopup,
                      });
                      setShowSaveSuccess({ visible: true, message: 'Referral settings saved successfully!' });
                      setTimeout(() => setShowSaveSuccess({ visible: false, message: '' }), 3000);
                    } catch (error: any) {
                      Alert.alert('Error', error.response?.data?.detail || 'Failed to save referral settings');
                    } finally {
                      setSavingReferral(false);
                    }
                  }}
                  disabled={savingReferral}
                  data-testid="save-referral-settings"
                >
                  {savingReferral ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save Referral Settings</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Stats Card */}
              <View style={[styles.sectionCard, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    padding: 16,
                    borderRadius: 12,
                    marginTop: 12,
                  }}
                  onPress={() => router.push('/superadmin/referrals')}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#E0E7FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="stats-chart" size={20} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                      View Referral Analytics
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      See detailed stats and manage referrals
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'sso' && (
            <View>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: '#DBEAFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Single Sign-On</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      Manage connected apps and integrations
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                  onPress={() => router.push('/sso')}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#DBEAFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="apps" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Connected Apps</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      View and manage third-party app connections
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => router.push('/sso/developer')}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#EDE9FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="code-slash" size={20} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Developer Portal</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      Register and manage your OAuth applications
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>OAuth 2.0 / OpenID Connect</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                  Integrate with Software Galaxy using industry-standard protocols
                </Text>
                
                <View style={{
                  backgroundColor: '#F3F4F6',
                  padding: 14,
                  borderRadius: 10,
                  marginBottom: 12,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>
                    Discovery Endpoint
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#2563EB' }}>
                    /api/sso/.well-known/openid-configuration
                  </Text>
                </View>

                <View style={{
                  backgroundColor: '#D1FAE5',
                  padding: 14,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={{ flex: 1, fontSize: 13, color: '#065F46' }}>
                    SSO is enabled for your account
                  </Text>
                </View>
              </View>
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
                          <View style={styles.currencySymbolBox}>
                            <Text style={styles.currencySymbol}>{formCurrencySymbol}</Text>
                          </View>
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
                  <Text style={styles.sectionTitle}>Tax Settings</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Apply Tax</Text>
                      <Text style={styles.settingDescription}>Enable tax on sales</Text>
                    </View>
                    <Switch
                      value={applyTax}
                      onValueChange={setApplyTax}
                      trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                      thumbColor={applyTax ? '#2563EB' : '#9CA3AF'}
                    />
                  </View>

                  {applyTax && (
                    <>
                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Text style={styles.settingLabel}>Prices Tax Inclusive</Text>
                          <Text style={styles.settingDescription}>
                            {taxInclusive 
                              ? 'Prices already include tax' 
                              : 'Tax will be added to prices'}
                          </Text>
                        </View>
                        <Switch
                          value={taxInclusive}
                          onValueChange={setTaxInclusive}
                          trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                          thumbColor={taxInclusive ? '#2563EB' : '#9CA3AF'}
                        />
                      </View>

                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Default Tax Rate (%)"
                            placeholder="Enter tax rate"
                            value={defaultTaxRate}
                            onChangeText={setDefaultTaxRate}
                            keyboardType="decimal-pad"
                            leftIcon={<Ionicons name="calculator-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                      </View>

                      <View style={styles.taxInfoBox}>
                        <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                        <Text style={styles.taxInfoText}>
                          {taxInclusive 
                            ? `Prices shown include ${defaultTaxRate || '0'}% tax. Example: $100 price = $${(100 / (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)} + $${(100 - 100 / (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)} tax`
                            : `Tax will be calculated on top of prices. Example: $100 + ${defaultTaxRate || '0'}% = $${(100 * (1 + (parseFloat(defaultTaxRate) || 0) / 100)).toFixed(2)}`
                          }
                        </Text>
                      </View>
                    </>
                  )}
                </View>

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

                {/* Service Code Settings - Web View */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Service Code Settings</Text>
                  <Text style={styles.sectionSubtitle}>Configure how service codes are generated for services</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Auto-generate Service Code</Text>
                      <Text style={styles.settingDescription}>Automatically create codes for new services</Text>
                    </View>
                    <Switch
                      value={autoGenerateServiceCode}
                      onValueChange={setAutoGenerateServiceCode}
                      trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                      thumbColor={autoGenerateServiceCode ? '#10B981' : '#9CA3AF'}
                    />
                  </View>

                  {autoGenerateServiceCode && (
                    <>
                      <Text style={styles.formatSectionLabel}>Service Code Format</Text>
                      <View style={[styles.formatOptionsContainer, { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }]}>
                        {SERVICE_CODE_FORMATS.map((format) => (
                          <TouchableOpacity
                            key={format.id}
                            style={[
                              styles.formatOption,
                              { flex: 1, minWidth: 220 },
                              serviceCodeFormat === format.id && styles.serviceCodeFormatOptionActive,
                            ]}
                            onPress={() => setServiceCodeFormat(format.id)}
                          >
                            <View style={styles.formatOptionHeader}>
                              <View style={[
                                styles.formatRadio,
                                serviceCodeFormat === format.id && styles.serviceCodeFormatRadioActive,
                              ]}>
                                {serviceCodeFormat === format.id && <View style={styles.formatRadioInner} />}
                              </View>
                              <Text style={[
                                styles.formatOptionTitle,
                                serviceCodeFormat === format.id && styles.serviceCodeFormatOptionTitleActive,
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
                            label="Service Code Prefix"
                            placeholder="SVC"
                            value={serviceCodePrefix}
                            onChangeText={setServiceCodePrefix}
                            leftIcon={<Ionicons name="construct-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                        <View style={styles.inputHalf}>
                          <Text style={styles.formatSectionLabel}>Separator</Text>
                          <View style={styles.separatorOptions}>
                            {SERVICE_CODE_SEPARATOR_OPTIONS.map((sep) => (
                              <TouchableOpacity
                                key={sep.value}
                                style={[
                                  styles.separatorOption,
                                  serviceCodeSeparator === sep.value && styles.serviceCodeSeparatorOptionActive,
                                ]}
                                onPress={() => setServiceCodeSeparator(sep.value)}
                              >
                                <Text style={[
                                  styles.separatorOptionText,
                                  serviceCodeSeparator === sep.value && styles.serviceCodeSeparatorOptionTextActive,
                                ]}>
                                  {sep.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Starting Number"
                            placeholder="1"
                            value={serviceCodeStartNumber}
                            onChangeText={setServiceCodeStartNumber}
                            keyboardType="number-pad"
                            leftIcon={<Ionicons name="arrow-forward-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Number of Digits"
                            placeholder="4"
                            value={serviceCodeDigits}
                            onChangeText={setServiceCodeDigits}
                            keyboardType="number-pad"
                            leftIcon={<Ionicons name="keypad-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                      </View>

                      <View style={styles.serviceCodePreview}>
                        <Text style={styles.serviceCodePreviewLabel}>Next Service Code Preview</Text>
                        <Text style={styles.serviceCodePreviewValue}>{getServiceCodePreview()}</Text>
                      </View>
                    </>
                  )}

                  {!autoGenerateServiceCode && (
                    <View style={styles.manualSkuInfo}>
                      <Ionicons name="create-outline" size={20} color="#6B7280" />
                      <Text style={styles.manualSkuText}>
                        You'll enter service codes manually when creating services
                      </Text>
                    </View>
                  )}
                </View>

                {/* Barcode Settings Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Barcode Settings</Text>
                  <Text style={styles.sectionSubtitle}>Enable barcodes for product tracking</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Enable Product Barcodes</Text>
                      <Text style={styles.settingDescription}>Show barcode field in product forms</Text>
                    </View>
                    <Switch
                      value={barcodeEnabled}
                      onValueChange={setBarcodeEnabled}
                      trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                      thumbColor={barcodeEnabled ? '#F59E0B' : '#9CA3AF'}
                    />
                  </View>

                  {barcodeEnabled && (
                    <>
                      <View style={styles.barcodeInfoBox}>
                        <Ionicons name="barcode-outline" size={20} color="#F59E0B" />
                        <Text style={styles.barcodeInfoText}>
                          When adding products, you can either auto-generate internal barcodes or enter existing ones (EAN-13, UPC, etc.)
                        </Text>
                      </View>

                      <Text style={styles.formatSectionLabel}>Auto-Generated Barcode Format</Text>
                      
                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Barcode Prefix"
                            placeholder="INT"
                            value={barcodePrefix}
                            onChangeText={setBarcodePrefix}
                            leftIcon={<Ionicons name="barcode-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                        <View style={styles.inputHalf}>
                          <Text style={styles.formatSectionLabel}>Separator</Text>
                          <View style={styles.separatorOptions}>
                            {[
                              { value: '-', label: 'Dash (-)' },
                              { value: '', label: 'None' },
                            ].map((sep) => (
                              <TouchableOpacity
                                key={sep.value}
                                style={[
                                  styles.separatorOption,
                                  barcodeSeparator === sep.value && styles.barcodeSeparatorOptionActive,
                                ]}
                                onPress={() => setBarcodeSeparator(sep.value)}
                              >
                                <Text style={[
                                  styles.separatorOptionText,
                                  barcodeSeparator === sep.value && styles.barcodeSeparatorOptionTextActive,
                                ]}>
                                  {sep.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Input
                            label="Number of Digits"
                            placeholder="6"
                            value={barcodeDigits}
                            onChangeText={setBarcodeDigits}
                            keyboardType="number-pad"
                            leftIcon={<Ionicons name="keypad-outline" size={20} color="#6B7280" />}
                          />
                        </View>
                        <View style={styles.inputHalf}>
                          <View style={styles.barcodePreview}>
                            <Text style={styles.previewLabel}>Preview</Text>
                            <Text style={styles.barcodePreviewText}>{getBarcodePreview()}</Text>
                          </View>
                        </View>
                      </View>
                    </>
                  )}

                  {!barcodeEnabled && (
                    <View style={styles.manualSkuContainer}>
                      <Ionicons name="barcode-outline" size={24} color="#9CA3AF" />
                      <Text style={styles.manualSkuText}>
                        Barcode field will be hidden in product forms
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Receipt Settings</Text>
                  
                  <Input
                    label="Receipt Footer Message"
                    placeholder="Thank you for shopping with us!"
                    value={receiptFooter}
                    onChangeText={setReceiptFooter}
                    multiline
                    numberOfLines={2}
                    leftIcon={<Ionicons name="receipt-outline" size={20} color="#6B7280" />}
                  />
                </View>

                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardTitle}>Want Inventory Management?</Text>
                    <Text style={styles.infoCardText}>
                      Link the Inventory app to track stock levels and get low stock alerts.
                    </Text>
                    <TouchableOpacity 
                      style={styles.infoCardLink}
                      onPress={() => setActiveTab('apps')}
                    >
                      <Text style={styles.infoCardLinkText}>Go to Apps →</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Button
                  title="Save"
                  onPress={handleSaveAppSettings}
                  loading={saving}
                  style={styles.saveButton}
                />
              </View>
            )}

            {activeTab === 'apps' && (
              <View>
                <LinkedAppsManager 
                  productId="retailpro"
                  currentPlan={currentPlan}
                  onRefresh={fetchData}
                />
              </View>
            )}

            {activeTab === 'pos' && (
              <View>
                {/* Offline Mode Section */}
                <Text style={styles.formSectionTitle}>Offline Mode</Text>
                
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Enable Offline Mode</Text>
                    <Text style={styles.formHint}>Continue selling even without internet connection</Text>
                  </View>
                  <Switch
                    value={useOfflineStore.getState().offlineModeEnabled}
                    onValueChange={(value) => useOfflineStore.getState().setOfflineModeEnabled(value)}
                    trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                
                {/* Sync Status */}
                <Text style={styles.formLabel}>Sync Status</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="cloud-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                  <Text style={styles.formInputText}>
                    {useOfflineStore.getState().isOnline ? 'Online' : 'Offline'} • {useOfflineStore.getState().pendingTransactions.length} pending orders
                  </Text>
                </View>
                
                {/* Sync Actions - only show sync if there are pending orders */}
                <View style={styles.formButtonRow}>
                  <TouchableOpacity
                    style={styles.formOutlineButton}
                    onPress={() => syncService.refreshProductCache()}
                  >
                    <Text style={styles.formOutlineButtonText}>Refresh Product Cache</Text>
                  </TouchableOpacity>
                  
                  {useOfflineStore.getState().pendingTransactions.length > 0 && (
                    <TouchableOpacity
                      style={styles.formOutlineButton}
                      onPress={() => syncService.manualSync()}
                    >
                      <Text style={styles.formOutlineButtonText}>Sync Pending Orders</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Printer Settings */}
                <PrinterSettings />
              </View>
            )}

            {/* Locations Tab - Web Version */}
            {activeTab === 'locations' && (
              <View>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Store Locations</Text>
                    <Text style={styles.locationLimitText}>
                      {locations.length} / {currentPlan?.plan?.max_locations === -1 ? '∞' : (currentPlan?.plan?.max_locations || 1)} locations
                      {currentPlan?.plan?.name && ` (${currentPlan.plan.name} Plan)`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID="add-location-btn-web"
                    accessibilityLabel="Add Location"
                    style={styles.addLocationBtn}
                    onPress={() => {
                      const maxLoc = currentPlan?.plan?.max_locations || 1;
                      console.log('Web Add location pressed - maxLoc:', maxLoc, 'current:', locations.length);
                      if (maxLoc !== -1 && locations.length >= maxLoc) {
                        // Show upgrade prompt modal instead of form
                        console.log('Showing upgrade prompt');
                        setShowUpgradePrompt(true);
                        return;
                      }
                      setEditingLocation(null);
                      resetLocationForm();
                      setShowAddLocationModal(true);
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                
                {/* Upgrade prompt if at limit */}
                {currentPlan?.plan?.max_locations !== -1 && 
                 locations.length >= (currentPlan?.plan?.max_locations || 1) && (
                  <View style={styles.locationUpgradeCard}>
                    <Ionicons name="arrow-up-circle" size={24} color="#7C3AED" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationUpgradeTitle}>Need more locations?</Text>
                      <Text style={styles.locationUpgradeText}>
                        Upgrade to Professional (3 locations) or Enterprise (unlimited)
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.locationUpgradeBtn}
                      onPress={() => setShowUpgradePrompt(true)}
                    >
                      <Text style={styles.locationUpgradeBtnText}>Upgrade</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {loadingLocations ? (
                  <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
                ) : locations.length === 0 ? (
                  <View style={styles.emptyLocations}>
                    <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyLocationsTitle}>No Locations Yet</Text>
                    <Text style={styles.emptyLocationsText}>Add your first store location to track sales by branch</Text>
                    <TouchableOpacity
                      style={styles.addFirstLocationBtn}
                      onPress={() => {
                        setEditingLocation(null);
                        resetLocationForm();
                        setShowAddLocationModal(true);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.addFirstLocationBtnText}>Add Location</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.locationsList}>
                    {locations.map((location) => (
                      <View key={location.id} style={[styles.locationCard, !location.is_active && styles.locationCardInactive]}>
                        <View style={styles.locationCardMain}>
                          <View style={styles.locationIcon}>
                            <Ionicons name="storefront" size={24} color={location.is_active ? "#2563EB" : "#9CA3AF"} />
                          </View>
                          <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>{location.name}</Text>
                            {location.address && <Text style={styles.locationAddress}>{location.address}</Text>}
                            {location.phone && (
                              <View style={styles.locationDetail}>
                                <Ionicons name="call-outline" size={14} color="#6B7280" />
                                <Text style={styles.locationDetailText}>{location.phone}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.locationStats}>
                            <Text style={styles.locationOrderCount}>{location.order_count}</Text>
                            <Text style={styles.locationOrderLabel}>orders</Text>
                          </View>
                        </View>
                        <View style={styles.locationActions}>
                          <TouchableOpacity
                            style={styles.locationActionBtn}
                            onPress={() => openEditLocation(location)}
                          >
                            <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.locationActionBtn}
                            onPress={() => handleDeleteLocation(location)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
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
                          {currentPlan?.primary_app?.name || 'RetailPro'} {currentPlan?.plan?.name || 'Starter'}
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
                        {currentPlan?.primary_app?.name || 'RetailPro'} ({currentPlan?.plan?.name || 'Starter'})
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

            {activeTab === 'sso' && (
              <View>
                <View style={styles.sectionCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <View style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: '#DBEAFE',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}>
                      <Ionicons name="shield-checkmark" size={28} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>Single Sign-On (SSO)</Text>
                      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                        Manage connected applications and third-party integrations
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        minWidth: 280,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        padding: 20,
                        borderRadius: 14,
                      }}
                      onPress={() => router.push('/sso')}
                    >
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Ionicons name="apps" size={24} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Connected Apps</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                          View and manage third-party app connections
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        minWidth: 280,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        padding: 20,
                        borderRadius: 14,
                      }}
                      onPress={() => router.push('/sso/developer')}
                    >
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: '#EDE9FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Ionicons name="code-slash" size={24} color="#8B5CF6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Developer Portal</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                          Register and manage your OAuth applications
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>OAuth 2.0 / OpenID Connect</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 }}>
                    Integrate with Software Galaxy using industry-standard OAuth 2.0 and OpenID Connect protocols. 
                    This allows third-party applications to securely access user data with their consent.
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <View style={{
                      flex: 1,
                      minWidth: 280,
                      backgroundColor: '#F3F4F6',
                      padding: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                        Discovery Endpoint
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#2563EB' }}>
                        /api/sso/.well-known/openid-configuration
                      </Text>
                    </View>

                    <View style={{
                      flex: 1,
                      minWidth: 280,
                      backgroundColor: '#F3F4F6',
                      padding: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                        Token Endpoint
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#2563EB' }}>
                        /api/sso/oauth/token
                      </Text>
                    </View>
                  </View>

                  <View style={{
                    backgroundColor: '#D1FAE5',
                    padding: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#065F46' }}>
                        SSO is enabled for your account
                      </Text>
                      <Text style={{ fontSize: 12, color: '#065F46', marginTop: 4 }}>
                        Third-party apps can request access to your account with your consent
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Supported Authentication Methods</Text>
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 8,
                    }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={{ fontSize: 13, color: '#111827' }}>OAuth 2.0</Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 8,
                    }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={{ fontSize: 13, color: '#111827' }}>OpenID Connect</Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 8,
                    }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={{ fontSize: 13, color: '#111827' }}>PKCE</Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 8,
                    }}>
                      <Ionicons name="time" size={18} color="#F59E0B" />
                      <Text style={{ fontSize: 13, color: '#92400E' }}>SAML 2.0 (Coming Soon)</Text>
                    </View>
                  </View>
                </View>
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

      {/* Success Modal */}
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
            <Text style={styles.successModalTitle}>
              {isOnboarding ? 'Setup Complete!' : 'Saved!'}
            </Text>
            <Text style={styles.successModalMessage}>
              {isOnboarding 
                ? 'Your business is ready to go. Start adding products and making sales!'
                : showSuccessModal.tab === 'business'
                  ? 'Business settings saved successfully'
                  : showSuccessModal.tab === 'retailpro'
                    ? 'RetailPro settings saved successfully'
                    : showSuccessModal.tab === 'pos'
                      ? 'POS settings saved successfully'
                      : 'Settings saved successfully'
              }
            </Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => {
                setShowSuccessModal({ visible: false, tab: '' });
                if (isOnboarding) {
                  router.replace('/(tabs)/dashboard');
                }
              }}
            >
              <Text style={styles.successModalBtnText}>
                {isOnboarding ? 'Go to Dashboard' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Success Modal */}
      <Modal
        visible={showLocationSuccess.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationSuccess({ visible: false, name: '', isEdit: false })}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIcon}>
              <Ionicons name="location" size={48} color="#7C3AED" />
            </View>
            <Text style={styles.successModalTitle}>
              {showLocationSuccess.isEdit ? 'Location Updated!' : 'Location Added!'}
            </Text>
            <Text style={styles.successModalMessage}>
              "{showLocationSuccess.name}" has been {showLocationSuccess.isEdit ? 'updated' : 'created'} successfully.
            </Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => setShowLocationSuccess({ visible: false, name: '', isEdit: false })}
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

      {/* Add/Edit Location Modal */}
      <Modal
        visible={showAddLocationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowAddLocationModal(false);
          setEditingLocation(null);
          resetLocationForm();
        }}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>
                {editingLocation ? 'Edit Location' : 'Add Location'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationFormField}>
              <Text style={styles.locationFormLabel}>Location Name *</Text>
              <TextInput
                style={styles.locationFormInput}
                placeholder="e.g., Main Store, Downtown Branch"
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.locationFormField}>
              <Text style={styles.locationFormLabel}>Address</Text>
              <TextInput
                style={styles.locationFormInput}
                placeholder="Street address"
                value={newLocationAddress}
                onChangeText={setNewLocationAddress}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.locationFormField}>
              <Text style={styles.locationFormLabel}>Phone</Text>
              <TextInput
                style={styles.locationFormInput}
                placeholder="Contact number"
                value={newLocationPhone}
                onChangeText={setNewLocationPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.locationFormField}>
              <Text style={styles.locationFormLabel}>Email</Text>
              <TextInput
                style={styles.locationFormInput}
                placeholder="Location email (optional)"
                value={newLocationEmail}
                onChangeText={setNewLocationEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Error Display */}
            {locationError && (
              <View style={styles.locationErrorBox}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </View>
            )}

            <View style={styles.locationModalActions}>
              <TouchableOpacity
                style={styles.locationCancelBtn}
                onPress={() => {
                  setShowAddLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                  setLocationError(null);
                }}
              >
                <Text style={styles.locationCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationSaveBtn, !newLocationName && styles.locationSaveBtnDisabled]}
                onPress={handleSaveLocation}
                disabled={!newLocationName || savingLocation}
              >
                {savingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.locationSaveBtnText}>
                    {editingLocation ? 'Update' : 'Add Location'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upgrade Prompt Modal */}
      <Modal
        visible={showUpgradePrompt}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowUpgradePrompt(false);
          setSelectedUpgradePlan(null);
        }}
      >
        <View style={styles.upgradeModalOverlay}>
          <View style={styles.upgradeModalContent}>
            <TouchableOpacity 
              style={styles.upgradeModalClose}
              onPress={() => {
                setShowUpgradePrompt(false);
                setSelectedUpgradePlan(null);
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            
            {/* Plan Selection View */}
            {!selectedUpgradePlan ? (
              <>
                <View style={styles.upgradeModalIcon}>
                  <Ionicons name="location" size={40} color="#7C3AED" />
                </View>
                <Text style={styles.upgradeModalTitle}>Add More Locations</Text>
                <Text style={styles.upgradeModalText}>
                  You've reached your location limit. Upgrade your plan to add more store locations.
                </Text>
                
                <View style={styles.upgradeModalPlans}>
                  <TouchableOpacity 
                    style={styles.upgradeModalPlanCard}
                    onPress={() => setSelectedUpgradePlan({ id: 'professional', name: 'Professional', price: 49, locations: 3 })}
                  >
                    <View style={styles.upgradeModalPlanBadge}>
                      <Text style={styles.upgradeModalPlanBadgeText}>RECOMMENDED</Text>
                    </View>
                    <Text style={styles.upgradeModalPlanName}>Professional</Text>
                    <Text style={styles.upgradeModalPlanLocations}>Up to 3 locations</Text>
                    <Text style={styles.upgradeModalPlanPrice}>$49<Text style={styles.upgradeModalPlanPriceUnit}>/mo</Text></Text>
                    <View style={styles.upgradeModalPlanFeatures}>
                      <Text style={styles.upgradeModalPlanFeature}>✓ 3 Store Branches</Text>
                      <Text style={styles.upgradeModalPlanFeature}>✓ 5 Staff Members</Text>
                      <Text style={styles.upgradeModalPlanFeature}>✓ Full Reports</Text>
                    </View>
                    <View style={styles.upgradeModalSelectBtn}>
                      <Text style={styles.upgradeModalSelectBtnText}>Select Plan</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.upgradeModalPlanCard, styles.upgradeModalPlanCardHighlight]}
                    onPress={() => setSelectedUpgradePlan({ id: 'enterprise', name: 'Enterprise', price: 99, locations: -1 })}
                  >
                    <Text style={styles.upgradeModalPlanName}>Enterprise</Text>
                    <Text style={styles.upgradeModalPlanLocations}>Unlimited locations</Text>
                    <Text style={styles.upgradeModalPlanPrice}>$99<Text style={styles.upgradeModalPlanPriceUnit}>/mo</Text></Text>
                    <View style={styles.upgradeModalPlanFeatures}>
                      <Text style={styles.upgradeModalPlanFeature}>✓ Unlimited Branches</Text>
                      <Text style={styles.upgradeModalPlanFeature}>✓ Unlimited Staff</Text>
                      <Text style={styles.upgradeModalPlanFeature}>✓ API Access</Text>
                    </View>
                    <View style={[styles.upgradeModalSelectBtn, styles.upgradeModalSelectBtnEnterprise]}>
                      <Text style={styles.upgradeModalSelectBtnText}>Select Plan</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.upgradeModalLaterBtn}
                  onPress={() => setShowUpgradePrompt(false)}
                >
                  <Text style={styles.upgradeModalLaterText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Upgrade Confirmation View */
              <>
                <View style={styles.upgradeConfirmIcon}>
                  <Ionicons name="arrow-up-circle" size={48} color="#7C3AED" />
                </View>
                <Text style={styles.upgradeConfirmTitle}>Confirm Your Upgrade</Text>
                
                {/* Plan Comparison */}
                <View style={styles.upgradeCompareBox}>
                  <View style={styles.upgradeComparePlan}>
                    <Text style={styles.upgradeCompareLabel}>Current Plan</Text>
                    <Text style={styles.upgradeComparePlanName}>{currentPlan?.plan?.name || 'Starter'}</Text>
                    <Text style={styles.upgradeComparePrice}>${currentPlan?.plan?.price || 19}/mo</Text>
                  </View>
                  <View style={styles.upgradeCompareArrow}>
                    <Ionicons name="arrow-forward" size={24} color="#7C3AED" />
                  </View>
                  <View style={styles.upgradeComparePlan}>
                    <Text style={styles.upgradeCompareLabel}>New Plan</Text>
                    <Text style={[styles.upgradeComparePlanName, { color: '#7C3AED' }]}>{selectedUpgradePlan.name}</Text>
                    <Text style={styles.upgradeComparePrice}>${selectedUpgradePlan.price}/mo</Text>
                  </View>
                </View>
                
                {/* Pricing Breakdown */}
                <View style={styles.upgradePricingBox}>
                  <View style={styles.upgradePricingRow}>
                    <Text style={styles.upgradePricingLabel}>Days remaining in cycle</Text>
                    <Text style={styles.upgradePricingValue}>{subscription?.days_remaining || 30} days</Text>
                  </View>
                  <View style={styles.upgradePricingRow}>
                    <Text style={styles.upgradePricingLabel}>Prorated credit ({currentPlan?.plan?.name || 'Starter'})</Text>
                    <Text style={[styles.upgradePricingValue, { color: '#10B981' }]}>
                      -${(((currentPlan?.plan?.price || 19) / 30) * (subscription?.days_remaining || 30)).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.upgradePricingRow}>
                    <Text style={styles.upgradePricingLabel}>New plan cost (prorated)</Text>
                    <Text style={styles.upgradePricingValue}>
                      ${((selectedUpgradePlan.price / 30) * (subscription?.days_remaining || 30)).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.upgradePricingRow, styles.upgradePricingTotal]}>
                    <Text style={styles.upgradePricingTotalLabel}>Amount due today</Text>
                    <Text style={styles.upgradePricingTotalValue}>
                      ${Math.max(0, ((selectedUpgradePlan.price - (currentPlan?.plan?.price || 19)) / 30) * (subscription?.days_remaining || 30)).toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.upgradeConfirmNote}>
                  Your subscription will be upgraded immediately. The prorated difference will be charged to your payment method on file.
                </Text>
                
                {/* Action Buttons */}
                <View style={styles.upgradeConfirmActions}>
                  <TouchableOpacity
                    style={styles.upgradeConfirmCancelBtn}
                    onPress={() => setSelectedUpgradePlan(null)}
                  >
                    <Text style={styles.upgradeConfirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.upgradeConfirmBtn}
                    onPress={async () => {
                      try {
                        await subscriptionApi.upgrade(selectedUpgradePlan.id, 'monthly');
                        setShowUpgradePrompt(false);
                        setSelectedUpgradePlan(null);
                        Alert.alert('Success', `You've been upgraded to ${selectedUpgradePlan.name}! You can now add more locations.`);
                        // Refresh subscription data
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
                      } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.detail || 'Failed to upgrade. Please try again.');
                      }
                    }}
                  >
                    <Ionicons name="rocket" size={18} color="#FFFFFF" />
                    <Text style={styles.upgradeConfirmBtnText}>Upgrade Now</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  tabScrollWrapper: {
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 40,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
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
  currencySymbolBox: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
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
  // Info Card Styles
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
    marginBottom: 8,
  },
  infoCardLink: {
    alignSelf: 'flex-start',
  },
  infoCardLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  // Tax Info Box Styles
  taxInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  taxInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
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
  // Service Code Settings Styles
  serviceCodeFormatOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  serviceCodeFormatRadioActive: {
    borderColor: '#10B981',
  },
  serviceCodeFormatOptionTitleActive: {
    color: '#047857',
  },
  serviceCodeSeparatorOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  serviceCodeSeparatorOptionTextActive: {
    color: '#FFFFFF',
  },
  serviceCodePreview: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
  },
  serviceCodePreviewLabel: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 4,
    fontWeight: '500',
  },
  serviceCodePreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#047857',
    fontFamily: 'monospace',
  },
  // Barcode Settings Styles
  barcodeInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  barcodeInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  barcodeSeparatorOptionActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  barcodeSeparatorOptionTextActive: {
    color: '#FFFFFF',
  },
  barcodePreview: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8,
  },
  barcodePreviewText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: 'monospace',
  },
  // POS Settings Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  settingHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  syncActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  syncButton: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Simple Form Styles for POS
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  formInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  formInputText: {
    fontSize: 15,
    color: '#374151',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  formOutlineButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formOutlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Locations Tab Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationLimitText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  locationUpgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  locationUpgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 2,
  },
  locationUpgradeText: {
    fontSize: 13,
    color: '#7C3AED',
  },
  locationUpgradeBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationUpgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addLocationBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLocations: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyLocationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLocationsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addFirstLocationBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  locationsList: {
    gap: 12,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationCardInactive: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  locationCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  locationStats: {
    alignItems: 'center',
  },
  locationOrderCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  locationOrderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  // Location Modal
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  locationFormField: {
    marginBottom: 16,
  },
  locationFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  locationFormInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  locationModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  locationCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  locationCancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  locationSaveBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationSaveBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  locationSaveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  locationErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  // Upgrade Modal
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upgradeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    position: 'relative',
  },
  upgradeModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  upgradeModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  upgradeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  upgradeModalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeModalPlans: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  upgradeModalPlanCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  upgradeModalPlanCardHighlight: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  upgradeModalPlanBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  upgradeModalPlanBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  upgradeModalPlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    marginTop: 8,
  },
  upgradeModalPlanLocations: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  upgradeModalPlanPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7C3AED',
  },
  upgradeModalPlanPriceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  upgradeModalPlanFeatures: {
    width: '100%',
    marginTop: 12,
    marginBottom: 12,
  },
  upgradeModalPlanFeature: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  upgradeModalSelectBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  upgradeModalSelectBtnEnterprise: {
    backgroundColor: '#7C3AED',
  },
  upgradeModalSelectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upgradeModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  upgradeModalLaterBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeModalLaterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  upgradeModalUpgradeBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  upgradeModalUpgradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Upgrade Confirmation View Styles
  upgradeConfirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  upgradeConfirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeCompareBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  upgradeComparePlan: {
    flex: 1,
    alignItems: 'center',
  },
  upgradeCompareLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  upgradeComparePlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  upgradeComparePrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  upgradeCompareArrow: {
    paddingHorizontal: 16,
  },
  upgradePricingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  upgradePricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  upgradePricingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  upgradePricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  upgradePricingTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 14,
  },
  upgradePricingTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  upgradePricingTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
  },
  upgradeConfirmNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  upgradeConfirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  upgradeConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeConfirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  upgradeConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  upgradeConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Referral Settings Styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
