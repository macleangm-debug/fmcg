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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { businessApi, subscriptionApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'business' | 'subscription'>('business');

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

  // Dropdown modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    if (currentUser && currentUser?.role !== 'admin') {
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
      
      // Try to fetch subscription (optional, may not exist for new businesses)
      try {
        const subscriptionRes = await subscriptionApi.getStatus();
        setSubscription(subscriptionRes.data);
      } catch {
        // Subscription endpoint may not exist, set default trial status
        setSubscription({
          plan_name: 'Trial',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          days_remaining: 14,
          is_active: true,
        });
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
      });
      
      // Reload global business settings so currency reflects throughout the app
      await reloadBusinessSettings();
      
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
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
  if (!isOnboarding && currentUser?.role !== 'admin') {
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
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

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'business' && styles.tabActive]}
          onPress={() => setActiveTab('business')}
        >
          <Ionicons
            name="business-outline"
            size={20}
            color={activeTab === 'business' ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            Business
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
            Subscription
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'business' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                <Input
                  label="Business Name *"
                  placeholder="Your business name"
                  value={formName}
                  onChangeText={setFormName}
                  leftIcon={<Ionicons name="business-outline" size={20} color="#6B7280" />}
                />
                
                <Input
                  label="Address"
                  placeholder="Street address"
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
                  label="Phone"
                  placeholder="Business phone"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={20} color="#6B7280" />}
                />
                
                <Input
                  label="Email"
                  placeholder="Business email"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
                />
                
                <Input
                  label="Website"
                  placeholder="www.example.com"
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
                  placeholder="Tax identification number"
                  value={formTaxId}
                  onChangeText={setFormTaxId}
                />
                
                <Input
                  label="Registration Number"
                  placeholder="Business registration number"
                  value={formRegNumber}
                  onChangeText={setFormRegNumber}
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

          {activeTab === 'subscription' && subscription && (
            <View>
              <View style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.planBadge}>
                    <Text style={styles.planName}>{subscription.plan_name}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(subscription.status)}15` }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                      {subscription.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.subscriptionDetails}>
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Days Remaining</Text>
                    <Text style={[
                      styles.subscriptionValue,
                      subscription.days_remaining <= 7 && { color: '#DC2626' }
                    ]}>
                      {subscription.days_remaining} days
                    </Text>
                  </View>
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Valid Until</Text>
                    <Text style={styles.subscriptionValue}>
                      {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>

                {subscription.days_remaining <= 7 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={20} color="#DC2626" />
                    <Text style={styles.warningText}>
                      {subscription.days_remaining <= 0
                        ? 'Your subscription has expired. Please renew to continue operations.'
                        : `Your subscription expires in ${subscription.days_remaining} days. Please renew soon.`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Renew Subscription</Text>
                <Text style={styles.renewDescription}>
                  Contact your software provider to renew your subscription and continue using all features.
                </Text>
                
                <View style={styles.planOptions}>
                  <TouchableOpacity style={styles.planOption}>
                    <Text style={styles.planOptionName}>Monthly</Text>
                    <Text style={styles.planOptionPrice}>$49/mo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.planOption, styles.planOptionPopular]}>
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                    <Text style={styles.planOptionName}>Quarterly</Text>
                    <Text style={styles.planOptionPrice}>$129/3mo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.planOption}>
                    <Text style={styles.planOptionName}>Annual</Text>
                    <Text style={styles.planOptionPrice}>$449/yr</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Contact Support to Renew"
                  onPress={() => Alert.alert('Contact Support', 'Please contact support@retailpro.com or call +1-800-RETAIL to renew your subscription.')}
                  style={styles.renewButton}
                />
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.name}
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
        </SafeAreaView>
      </Modal>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select City</Text>
            <TouchableOpacity onPress={() => setShowCityModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={getCitiesForCountry()}
            keyExtractor={(item) => item}
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
        </SafeAreaView>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CURRENCIES}
            keyExtractor={(item) => item.code}
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
        </SafeAreaView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
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
                : 'Business details saved successfully'
              }
            </Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => {
                setShowSuccessModal(false);
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginBottom: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
});
