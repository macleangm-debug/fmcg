import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { exchangeRatesApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
              process.env.EXPO_PUBLIC_BACKEND_URL || 
              '/api';

export default function PlatformAdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { user, isLoading: authLoading, loadUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'exchange' | 'pricing' | 'businesses' | 'settings' | 'products' | 'affiliates'>('exchange');
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [lastApiUpdate, setLastApiUpdate] = useState<string | null>(null);
  
  // Margin state
  const [marginPercent, setMarginPercent] = useState<number>(5.0);
  const [editingMargin, setEditingMargin] = useState(false);
  const [newMarginValue, setNewMarginValue] = useState('');
  const [savingMargin, setSavingMargin] = useState(false);
  
  // Margin earnings tracking state
  const [marginEarnings, setMarginEarnings] = useState<any>(null);
  const [marginEarningsPeriod, setMarginEarningsPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loadingMarginEarnings, setLoadingMarginEarnings] = useState(false);

  // Affiliates state
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [affiliateCounts, setAffiliateCounts] = useState({ total: 0, pending: 0, active: 0 });
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState({ discount_value: 10, discount_type: 'percentage' });

  // Products / Sender ID state
  const [senderIds, setSenderIds] = useState<any[]>([]);
  const [senderIdFilter, setSenderIdFilter] = useState<string>('all');
  const [productDetails, setProductDetails] = useState<any>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSenderId, setSelectedSenderId] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Load user from storage on mount
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Check if user is logged in and is superadmin
    if (!user) {
      // Not logged in, redirect to login
      router.replace('/login');
      return;
    }
    
    if (user?.role !== 'superadmin') {
      // Not superadmin - show message and don't fetch data
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [user, authLoading]);

  // Show access denied for non-superadmins
  if (!loading && user && user.role !== 'superadmin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <View style={styles.accessDeniedIcon}>
            <Ionicons name="shield-outline" size={64} color="#EF4444" />
          </View>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            This area is restricted to platform administrators only.
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            Current role: {user.role || 'unknown'}
          </Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Text style={styles.goBackButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      // Make all API calls in parallel for faster loading
      const [ratesRes, marginRes, affiliatesRes, payoutsRes, senderIdsRes, productRes] = await Promise.all([
        exchangeRatesApi.getAll(),
        axios.get(`${API_URL}/api/exchange-rates/margin-settings`, { headers }).catch(e => ({ data: null })),
        axios.get(`${API_URL}/api/affiliates/admin/list`, { headers }).catch(e => ({ data: null })),
        axios.get(`${API_URL}/api/affiliates/admin/payouts/pending`, { headers }).catch(e => ({ data: null })),
        axios.get(`${API_URL}/api/superadmin/sender-ids/all`, { headers }).catch(e => ({ data: null })),
        axios.get(`${API_URL}/api/superadmin/products/unitxt/details`, { headers }).catch(e => ({ data: null })),
      ]);
      
      setExchangeRates(ratesRes.data?.rates || []);
      setLastApiUpdate(ratesRes.data?.last_api_update);
      setMarginPercent(marginRes.data?.margin_percent || 5.0);
      setAffiliates(affiliatesRes.data?.affiliates || []);
      setAffiliateCounts(affiliatesRes.data?.counts || { total: 0, pending: 0, active: 0 });
      setPendingPayouts(payoutsRes.data?.payouts || []);
      setSenderIds(senderIdsRes.data?.sender_ids || []);
      setProductDetails(productRes.data);
      
      // Fetch margin earnings (separate call as it depends on other state being set)
      await fetchMarginEarnings('month');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMarginEarnings = async (period: string) => {
    try {
      setLoadingMarginEarnings(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/exchange-rates/margin-earnings?period=${period}`, { headers });
      setMarginEarnings(res.data);
    } catch (e) {
      console.log('Failed to fetch margin earnings:', e);
    } finally {
      setLoadingMarginEarnings(false);
    }
  };

  const handleRefreshRates = async () => {
    try {
      setRefreshingRates(true);
      await exchangeRatesApi.refresh();
      const ratesRes = await exchangeRatesApi.getAll();
      setExchangeRates(ratesRes.data?.rates || []);
      setLastApiUpdate(ratesRes.data?.last_api_update);
      Alert.alert('Success', 'Exchange rates updated from API');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh rates');
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleSaveRate = async (currency: string) => {
    const newRate = parseFloat(editRateValue);
    if (isNaN(newRate) || newRate <= 0) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }
    try {
      await exchangeRatesApi.setOverride(currency, newRate);
      const ratesRes = await exchangeRatesApi.getAll();
      setExchangeRates(ratesRes.data?.rates || []);
      setEditingRate(null);
      Alert.alert('Success', `Rate for ${currency} updated`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update rate');
    }
  };

  const handleResetRate = async (currency: string) => {
    try {
      await exchangeRatesApi.removeOverride(currency);
      const ratesRes = await exchangeRatesApi.getAll();
      setExchangeRates(ratesRes.data?.rates || []);
      Alert.alert('Success', `Rate for ${currency} reset to API value`);
    } catch (error) {
      Alert.alert('Error', 'Failed to reset rate');
    }
  };

  const handleSaveMargin = async () => {
    const newMargin = parseFloat(newMarginValue);
    if (isNaN(newMargin) || newMargin < 0 || newMargin > 50) {
      Alert.alert('Error', 'Please enter a valid margin between 0% and 50%');
      return;
    }
    try {
      setSavingMargin(true);
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/exchange-rates/margin-settings`, { margin_percent: newMargin }, { headers });
      setMarginPercent(newMargin);
      setEditingMargin(false);
      Alert.alert('Success', `Exchange rate margin updated to ${newMargin}%`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update margin');
    } finally {
      setSavingMargin(false);
    }
  };

  // Sender ID Actions
  const handleApproveSenderId = async (senderId: string) => {
    setProcessingAction(senderId);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/superadmin/sender-ids/${senderId}/approve`, {}, { headers });
      
      if (Platform.OS === 'web') {
        alert('Sender ID approved successfully!');
      } else {
        Alert.alert('Success', 'Sender ID approved successfully!');
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to approve sender ID';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setProcessingAction(null);
    }
  };
  
  const handleRejectSenderId = async () => {
    if (!selectedSenderId) return;
    
    setProcessingAction(selectedSenderId.id);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/superadmin/sender-ids/${selectedSenderId.id}/reject`,
        null,
        { headers, params: { reason: rejectReason || 'Does not meet guidelines' } }
      );
      
      if (Platform.OS === 'web') {
        alert('Sender ID rejected. Credits have been refunded to the user.');
      } else {
        Alert.alert('Success', 'Sender ID rejected. Credits have been refunded to the user.');
      }
      setShowRejectModal(false);
      setSelectedSenderId(null);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to reject sender ID';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setProcessingAction(null);
    }
  };
  
  const openRejectModal = (senderId: any) => {
    setSelectedSenderId(senderId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Affiliate Actions
  const handleApproveAffiliate = async (affiliateId: string, commissionRate: number = 10) => {
    setProcessingAction(affiliateId);
    try {
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/affiliates/admin/${affiliateId}/approve?commission_rate=${commissionRate}`, {}, { headers });
      
      if (Platform.OS === 'web') {
        alert('Affiliate approved successfully! A default promo code has been created.');
      } else {
        Alert.alert('Success', 'Affiliate approved successfully! A default promo code has been created.');
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to approve affiliate';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectAffiliate = async (affiliateId: string, reason: string) => {
    setProcessingAction(affiliateId);
    try {
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/affiliates/admin/${affiliateId}/reject?reason=${encodeURIComponent(reason)}`, {}, { headers });
      
      if (Platform.OS === 'web') {
        alert('Affiliate application rejected.');
      } else {
        Alert.alert('Success', 'Affiliate application rejected.');
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to reject affiliate';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCreatePromoCode = async (affiliateId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/affiliates/admin/${affiliateId}/promo-codes`, newPromoCode, { headers });
      
      if (Platform.OS === 'web') {
        alert(`Promo code created: ${response.data.code}`);
      } else {
        Alert.alert('Success', `Promo code created: ${response.data.code}`);
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to create promo code';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleProcessPayout = async (payoutId: string, reference: string) => {
    try {
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/affiliates/admin/payouts/${payoutId}/process?reference=${encodeURIComponent(reference)}`, {}, { headers });
      
      if (Platform.OS === 'web') {
        alert('Payout processed successfully!');
      } else {
        Alert.alert('Success', 'Payout processed successfully!');
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to process payout';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const filteredSenderIds = senderIdFilter === 'all' 
    ? senderIds 
    : senderIds.filter(s => s.status === senderIdFilter);

  const tabs = [
    { id: 'exchange', label: 'Exchange Rates', icon: 'swap-horizontal' },
    { id: 'pricing', label: 'Pricing Plans', icon: 'pricetag' },
    { id: 'businesses', label: 'Businesses', icon: 'business' },
    { id: 'affiliates', label: 'Affiliates', icon: 'people', badge: affiliateCounts.pending > 0 ? affiliateCounts.pending : null },
    { id: 'products', label: 'Products', icon: 'apps' },
    { id: 'settings', label: 'Platform Settings', icon: 'settings' },
  ];

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading Platform Admin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Platform Admin</Text>
            <Text style={styles.headerSubtitle}>Manage platform-wide settings</Text>
          </View>
        </View>
        <View style={styles.superadminBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#7C3AED" />
          <Text style={styles.superadminText}>Superadmin</Text>
        </View>
      </View>

      {isWeb && width > 768 ? (
        // Web Layout
        <View style={styles.webContainer}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.sidebarItem, activeTab === tab.id && styles.sidebarItemActive]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={20} 
                  color={activeTab === tab.id ? '#7C3AED' : '#6B7280'} 
                />
                <Text style={[styles.sidebarText, activeTab === tab.id && styles.sidebarTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'exchange' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Exchange Rates</Text>
                    <Text style={styles.sectionSubtitle}>
                      Base currency: USD. Rates auto-update every 24 hours.
                    </Text>
                    {lastApiUpdate && (
                      <Text style={styles.lastUpdate}>
                        Last API update: {new Date(lastApiUpdate).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={handleRefreshRates}
                    disabled={refreshingRates}
                  >
                    {refreshingRates ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.refreshButtonText}>
                      {refreshingRates ? 'Updating...' : 'Update from API'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Profit Margin Card */}
                <View style={styles.marginCard}>
                  <View style={styles.marginHeader}>
                    <View style={styles.marginTitleRow}>
                      <Ionicons name="trending-up" size={24} color="#10B981" />
                      <Text style={styles.marginTitle}>Profit Margin on Exchange Rates</Text>
                    </View>
                    <Text style={styles.marginDescription}>
                      Add a percentage markup to exchange rates. Customers pay in local currency with this margin, generating profit on every transaction.
                    </Text>
                  </View>
                  
                  <View style={styles.marginContent}>
                    {editingMargin ? (
                      <View style={styles.marginEditRow}>
                        <TextInput
                          style={styles.marginInput}
                          value={newMarginValue}
                          onChangeText={setNewMarginValue}
                          keyboardType="numeric"
                          placeholder="Enter margin %"
                          autoFocus
                        />
                        <Text style={styles.marginInputSuffix}>%</Text>
                        <TouchableOpacity
                          style={[styles.saveButton, savingMargin && styles.saveButtonDisabled]}
                          onPress={handleSaveMargin}
                          disabled={savingMargin}
                        >
                          {savingMargin ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingMargin(false)}
                        >
                          <Ionicons name="close" size={18} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.marginDisplayRow}>
                        <View style={styles.marginValueBox}>
                          <Text style={styles.marginValueLabel}>Current Margin</Text>
                          <Text style={styles.marginValueText}>{marginPercent}%</Text>
                        </View>
                        <View style={styles.marginExampleBox}>
                          <Text style={styles.marginExampleLabel}>Example: $100 USD sale</Text>
                          <Text style={styles.marginExampleProfit}>Your profit: ${(100 * marginPercent / 100).toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.marginEditButton}
                          onPress={() => {
                            setNewMarginValue(marginPercent.toString());
                            setEditingMargin(true);
                          }}
                        >
                          <Ionicons name="pencil" size={16} color="#FFFFFF" />
                          <Text style={styles.marginEditButtonText}>Edit Margin</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Margin Earnings Tracking Card */}
                <View style={styles.marginCard}>
                  <View style={styles.marginHeader}>
                    <View style={styles.marginTitleRow}>
                      <Ionicons name="analytics" size={24} color="#6366F1" />
                      <Text style={styles.marginTitle}>Margin Earnings Tracking</Text>
                    </View>
                    <Text style={styles.marginDescription}>
                      Track profit earned from exchange rate margins on customer purchases.
                    </Text>
                  </View>
                  
                  {/* Period Filter */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {(['today', 'week', 'month', 'all'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: marginEarningsPeriod === period ? '#6366F1' : '#F3F4F6',
                        }}
                        onPress={() => {
                          setMarginEarningsPeriod(period);
                          fetchMarginEarnings(period);
                        }}
                      >
                        <Text style={{ 
                          fontSize: 13, 
                          color: marginEarningsPeriod === period ? '#FFFFFF' : '#4B5563',
                          fontWeight: '500',
                        }}>
                          {period === 'today' ? 'Today' : period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : 'All Time'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {loadingMarginEarnings ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : marginEarnings ? (
                    <View>
                      {/* Summary Cards */}
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                        <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16 }}>
                          <Text style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>Total Margin Earned</Text>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: '#15803D' }}>
                            ${marginEarnings.summary?.total_margin_earned?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 140, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16 }}>
                          <Text style={{ fontSize: 12, color: '#1E40AF', marginBottom: 4 }}>Total Order Value</Text>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1D4ED8' }}>
                            ${marginEarnings.summary?.total_order_value_usd?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 140, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16 }}>
                          <Text style={{ fontSize: 12, color: '#92400E', marginBottom: 4 }}>Transactions</Text>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: '#B45309' }}>
                            {marginEarnings.summary?.total_transactions || 0}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F3E8FF', borderRadius: 12, padding: 16 }}>
                          <Text style={{ fontSize: 12, color: '#6B21A8', marginBottom: 4 }}>Avg. Margin/Order</Text>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: '#7C3AED' }}>
                            ${marginEarnings.summary?.average_margin_per_order?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                      </View>

                      {/* Earnings by Currency */}
                      {marginEarnings.earnings_by_currency?.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                            Earnings by Currency
                          </Text>
                          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, overflow: 'hidden' }}>
                            {marginEarnings.earnings_by_currency.map((item: any, index: number) => (
                              <View 
                                key={item.currency} 
                                style={{ 
                                  flexDirection: 'row', 
                                  justifyContent: 'space-between', 
                                  padding: 12,
                                  borderBottomWidth: index < marginEarnings.earnings_by_currency.length - 1 ? 1 : 0,
                                  borderBottomColor: '#E5E7EB',
                                }}
                              >
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>{item.currency}</Text>
                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                  <Text style={{ fontSize: 14, color: '#6B7280' }}>{item.transaction_count} txns</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>
                                    +${item.total_margin_earned?.toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Recent Transactions */}
                      {marginEarnings.recent_transactions?.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                            Recent Transactions
                          </Text>
                          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, overflow: 'hidden' }}>
                            {marginEarnings.recent_transactions.map((tx: any, index: number) => (
                              <View 
                                key={tx.id || index} 
                                style={{ 
                                  padding: 12,
                                  borderBottomWidth: index < marginEarnings.recent_transactions.length - 1 ? 1 : 0,
                                  borderBottomColor: '#E5E7EB',
                                }}
                              >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text style={{ fontSize: 13, color: '#6B7280' }}>
                                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A'}
                                  </Text>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>
                                    +${tx.margin_amount?.toFixed(2)} margin
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 14, color: '#374151' }}>
                                    ${tx.order_amount_usd?.toFixed(2)} USD → {tx.order_amount_local?.toLocaleString()} {tx.currency}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                                    {tx.margin_percent}% margin
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* No data message */}
                      {marginEarnings.summary?.total_transactions === 0 && (
                        <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#F9FAFB', borderRadius: 8 }}>
                          <Ionicons name="trending-up-outline" size={40} color="#9CA3AF" />
                          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
                            No margin earnings yet for this period.{'\n'}
                            Earnings will appear here when customers pay in local currencies.
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>

                <View style={styles.ratesGrid}>
                  {exchangeRates.map((rate) => (
                    <View key={rate.currency} style={styles.rateCard}>
                      <View style={styles.rateHeader}>
                        <Text style={styles.rateCurrency}>{rate.currency}</Text>
                        {rate.is_override ? (
                          <View style={styles.overrideBadge}>
                            <Ionicons name="pencil" size={10} color="#D97706" />
                            <Text style={styles.overrideBadgeText}>Manual</Text>
                          </View>
                        ) : (
                          <View style={styles.apiBadge}>
                            <Ionicons name="cloud" size={10} color="#059669" />
                            <Text style={styles.apiBadgeText}>API</Text>
                          </View>
                        )}
                      </View>

                      {editingRate === rate.currency ? (
                        <View style={styles.editRow}>
                          <Text style={styles.editLabel}>1 USD =</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editRateValue}
                            onChangeText={setEditRateValue}
                            keyboardType="numeric"
                            placeholder="Enter rate"
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => handleSaveRate(rate.currency)}
                          >
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setEditingRate(null)}
                          >
                            <Ionicons name="close" size={18} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.rateValue}>
                            1 USD = <Text style={styles.rateNumber}>{rate.rate?.toLocaleString()}</Text>
                          </Text>
                          <View style={styles.rateActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => {
                                setEditingRate(rate.currency);
                                setEditRateValue(rate.rate?.toString() || '');
                              }}
                            >
                              <Ionicons name="pencil" size={14} color="#6B7280" />
                              <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                            {rate.is_override && (
                              <TouchableOpacity
                                style={styles.resetButton}
                                onPress={() => handleResetRate(rate.currency)}
                              >
                                <Ionicons name="refresh" size={14} color="#F59E0B" />
                                <Text style={styles.resetButtonText}>Reset</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'pricing' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscription Pricing</Text>
                <Text style={styles.sectionSubtitle}>Manage subscription plans and pricing</Text>
                <View style={styles.comingSoon}>
                  <Ionicons name="construct" size={48} color="#9CA3AF" />
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                  <Text style={styles.comingSoonDesc}>Plan pricing management will be available here</Text>
                </View>
              </View>
            )}

            {activeTab === 'businesses' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Management</Text>
                <Text style={styles.sectionSubtitle}>View and manage all registered businesses</Text>
                <View style={styles.comingSoon}>
                  <Ionicons name="business" size={48} color="#9CA3AF" />
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                  <Text style={styles.comingSoonDesc}>Business management will be available here</Text>
                </View>
              </View>
            )}

            {activeTab === 'affiliates' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Affiliate Partners</Text>
                    <Text style={styles.sectionSubtitle}>Manage business affiliates, promo codes, and commissions</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.affiliateStatsRow}>
                  <View style={[styles.affiliateStatCard, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="people" size={24} color="#6366F1" />
                    <Text style={styles.affiliateStatValue}>{affiliateCounts.total}</Text>
                    <Text style={styles.affiliateStatLabel}>Total Partners</Text>
                  </View>
                  <View style={[styles.affiliateStatCard, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time" size={24} color="#F59E0B" />
                    <Text style={styles.affiliateStatValue}>{affiliateCounts.pending}</Text>
                    <Text style={styles.affiliateStatLabel}>Pending Review</Text>
                  </View>
                  <View style={[styles.affiliateStatCard, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.affiliateStatValue}>{affiliateCounts.active}</Text>
                    <Text style={styles.affiliateStatLabel}>Active Partners</Text>
                  </View>
                  <View style={[styles.affiliateStatCard, { backgroundColor: '#FCE7F3' }]}>
                    <Ionicons name="wallet" size={24} color="#EC4899" />
                    <Text style={styles.affiliateStatValue}>{pendingPayouts.length}</Text>
                    <Text style={styles.affiliateStatLabel}>Pending Payouts</Text>
                  </View>
                </View>

                {/* Pending Applications */}
                {affiliates.filter(a => a.status === 'pending').length > 0 && (
                  <View style={styles.affiliatePendingSection}>
                    <Text style={styles.affiliateSectionTitle}>Pending Applications</Text>
                    {affiliates.filter(a => a.status === 'pending').map((affiliate) => (
                      <View key={affiliate.id} style={styles.affiliatePendingCard}>
                        <View style={styles.affiliatePendingInfo}>
                          <Text style={styles.affiliateCompanyName}>{affiliate.company_name}</Text>
                          <Text style={styles.affiliateContactInfo}>{affiliate.contact_name} • {affiliate.contact_email}</Text>
                          <Text style={styles.affiliateDate}>Applied: {new Date(affiliate.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.affiliateActions}>
                          <TouchableOpacity
                            style={[styles.affiliateActionBtn, styles.affiliateApproveBtn]}
                            onPress={() => handleApproveAffiliate(affiliate.id)}
                            disabled={processingAction === affiliate.id}
                          >
                            {processingAction === affiliate.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={styles.affiliateActionBtnText}>Approve</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.affiliateActionBtn, styles.affiliateRejectBtn]}
                            onPress={() => handleRejectAffiliate(affiliate.id, 'Does not meet requirements')}
                            disabled={processingAction === affiliate.id}
                          >
                            <Ionicons name="close" size={16} color="#fff" />
                            <Text style={styles.affiliateActionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Active Affiliates */}
                <View style={styles.affiliateActiveSection}>
                  <Text style={styles.affiliateSectionTitle}>Active Partners</Text>
                  {affiliates.filter(a => a.status === 'active').length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.emptyStateText}>No active affiliates yet</Text>
                      <Text style={styles.emptyStateSubtext}>Approved partners will appear here</Text>
                    </View>
                  ) : (
                    <View style={styles.affiliateGrid}>
                      {affiliates.filter(a => a.status === 'active').map((affiliate) => (
                        <View key={affiliate.id} style={styles.affiliateCard}>
                          <View style={styles.affiliateCardHeader}>
                            <Text style={styles.affiliateCompanyName}>{affiliate.company_name}</Text>
                            <View style={styles.affiliateBadge}>
                              <Text style={styles.affiliateBadgeText}>{affiliate.commission_rate}% comm.</Text>
                            </View>
                          </View>
                          <Text style={styles.affiliateCode}>Code: {affiliate.affiliate_code}</Text>
                          <View style={styles.affiliateMetrics}>
                            <View style={styles.affiliateMetric}>
                              <Text style={styles.affiliateMetricValue}>${affiliate.total_earnings?.toFixed(2) || '0.00'}</Text>
                              <Text style={styles.affiliateMetricLabel}>Total Earned</Text>
                            </View>
                            <View style={styles.affiliateMetric}>
                              <Text style={styles.affiliateMetricValue}>{affiliate.total_conversions || 0}</Text>
                              <Text style={styles.affiliateMetricLabel}>Conversions</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.createPromoBtn}
                            onPress={() => handleCreatePromoCode(affiliate.id)}
                          >
                            <Ionicons name="add-circle" size={16} color="#6366F1" />
                            <Text style={styles.createPromoBtnText}>Create Promo Code</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Pending Payouts */}
                {pendingPayouts.length > 0 && (
                  <View style={styles.payoutsSection}>
                    <Text style={styles.affiliateSectionTitle}>Pending Payouts</Text>
                    {pendingPayouts.map((payout) => (
                      <View key={payout.id} style={styles.payoutCard}>
                        <View style={styles.payoutInfo}>
                          <Text style={styles.payoutCompany}>{payout.company_name}</Text>
                          <Text style={styles.payoutAmount}>${payout.amount?.toFixed(2)}</Text>
                          <Text style={styles.payoutMethod}>via {payout.payout_method}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.processPayoutBtn}
                          onPress={() => {
                            const ref = prompt('Enter payment reference number:');
                            if (ref) handleProcessPayout(payout.id, ref);
                          }}
                        >
                          <Ionicons name="cash" size={16} color="#fff" />
                          <Text style={styles.processPayoutBtnText}>Process</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'settings' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform Settings</Text>
                <Text style={styles.sectionSubtitle}>Configure global platform settings</Text>
                <View style={styles.comingSoon}>
                  <Ionicons name="settings" size={48} color="#9CA3AF" />
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                  <Text style={styles.comingSoonDesc}>Global settings will be available here</Text>
                </View>
              </View>
            )}

            {activeTab === 'products' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Unitxt - Sender ID Requests</Text>
                <Text style={styles.sectionSubtitle}>Manage sender ID registration requests</Text>
                
                {/* Stats */}
                {productDetails && (
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={styles.statValue}>{productDetails.stats.active_sender_ids}</Text>
                      <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                      <Text style={styles.statValue}>{productDetails.stats.pending_sender_ids}</Text>
                      <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#DC2626' }]}>
                      <Text style={styles.statValue}>{productDetails.stats.rejected_sender_ids}</Text>
                      <Text style={styles.statLabel}>Rejected</Text>
                    </View>
                  </View>
                )}
                
                {/* Filter */}
                <View style={styles.filterRow}>
                  {['all', 'pending', 'active', 'rejected'].map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterChip, senderIdFilter === f && styles.filterChipActive]}
                      onPress={() => setSenderIdFilter(f)}
                    >
                      <Text style={[styles.filterChipText, senderIdFilter === f && styles.filterChipTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Sender ID List */}
                {filteredSenderIds.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No sender IDs found</Text>
                  </View>
                ) : (
                  filteredSenderIds.map(sid => (
                    <View key={sid.id} style={styles.senderIdCard}>
                      <View style={styles.senderIdHeader}>
                        <View style={styles.senderIdIcon}>
                          <Ionicons name="pricetag" size={20} color="#8B5CF6" />
                        </View>
                        <View style={styles.senderIdInfo}>
                          <Text style={styles.senderIdName}>{sid.name}</Text>
                          <Text style={styles.senderIdMeta}>{sid.country} • {sid.business_name}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sid.status)}15` }]}>
                          <Text style={[styles.statusBadgeText, { color: getStatusColor(sid.status) }]}>
                            {sid.status}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.senderIdDetails}>
                        <Text style={styles.senderIdDetailText}>
                          <Ionicons name="person-outline" size={14} color="#6B7280" /> {sid.user_name} ({sid.user_email})
                        </Text>
                        <Text style={styles.senderIdDetailText}>
                          <Ionicons name="calendar-outline" size={14} color="#6B7280" /> {sid.created_at}
                        </Text>
                        {sid.rejection_reason && (
                          <Text style={[styles.senderIdDetailText, { color: '#DC2626' }]}>
                            Reason: {sid.rejection_reason}
                          </Text>
                        )}
                      </View>
                      
                      {sid.status === 'pending' && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApproveSenderId(sid.id)}
                            disabled={processingAction === sid.id}
                          >
                            {processingAction === sid.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                <Text style={styles.actionBtnText}>Approve</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => openRejectModal(sid)}
                            disabled={processingAction === sid.id}
                          >
                            <Ionicons name="close" size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        // Mobile Layout
        <ScrollView style={styles.mobileContainer}>
          {/* Tab Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabPills}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, activeTab === tab.id && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.id ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={[styles.tabPillText, activeTab === tab.id && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Mobile Content - Similar to web but single column */}
          {activeTab === 'exchange' && (
            <View style={styles.mobileSection}>
              <TouchableOpacity 
                style={styles.mobileRefreshButton}
                onPress={handleRefreshRates}
                disabled={refreshingRates}
              >
                {refreshingRates ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.refreshButtonText}>Update from API</Text>
              </TouchableOpacity>

              {exchangeRates.map((rate) => (
                <View key={rate.currency} style={styles.mobileRateCard}>
                  <View style={styles.mobileRateHeader}>
                    <Text style={styles.rateCurrency}>{rate.currency}</Text>
                    {rate.is_override ? (
                      <View style={styles.overrideBadge}>
                        <Text style={styles.overrideBadgeText}>Manual</Text>
                      </View>
                    ) : (
                      <View style={styles.apiBadge}>
                        <Text style={styles.apiBadgeText}>API</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rateValue}>
                    1 USD = <Text style={styles.rateNumber}>{rate.rate?.toLocaleString()}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
      
      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowRejectModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.rejectIcon}>
                <Ionicons name="alert-circle" size={36} color="#DC2626" />
              </View>
              <Text style={styles.modalTitle}>Reject Sender ID</Text>
              {selectedSenderId && (
                <Text style={styles.modalSubtitle}>
                  Rejecting "{selectedSenderId.name}" for {selectedSenderId.business_name}
                </Text>
              )}
            </View>

            <Text style={styles.inputLabel}>Rejection Reason</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason for rejection (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <Text style={styles.modalNote}>
              The user will be refunded 100 credits automatically.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmRejectBtn]}
                onPress={handleRejectSenderId}
                disabled={processingAction !== null}
              >
                {processingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmRejectBtnText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  superadminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  superadminText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    padding: 16,
    gap: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  sidebarItemActive: {
    backgroundColor: '#F3E8FF',
  },
  sidebarText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sidebarTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  // Margin Card Styles
  marginCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  marginHeader: {
    marginBottom: 16,
  },
  marginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  marginTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  marginDescription: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  marginContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  marginEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marginInput: {
    flex: 1,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  marginInputSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  marginDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  marginValueBox: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  marginValueLabel: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 4,
  },
  marginValueText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#15803D',
  },
  marginExampleBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  marginExampleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  marginExampleProfit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  marginEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  marginEditButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  rateCard: {
    width: '23%',
    minWidth: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  overrideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overrideBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  apiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  apiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  rateValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  rateNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  rateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetButtonText: {
    fontSize: 13,
    color: '#F59E0B',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  editInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
  },
  comingSoon: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  comingSoonDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  mobileContainer: {
    flex: 1,
    padding: 16,
  },
  tabPills: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabPillText: {
    fontSize: 13,
    color: '#6B7280',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mobileSection: {
    gap: 12,
  },
  mobileRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  mobileRateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mobileRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Affiliate Tab Styles
  affiliateStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  affiliateStatCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  affiliateStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  affiliateStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  affiliateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  affiliatePendingSection: {
    marginBottom: 32,
  },
  affiliatePendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affiliatePendingInfo: {
    flex: 1,
  },
  affiliateCompanyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  affiliateContactInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  affiliateDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  affiliateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  affiliateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  affiliateApproveBtn: {
    backgroundColor: '#10B981',
  },
  affiliateRejectBtn: {
    backgroundColor: '#EF4444',
  },
  affiliateActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  affiliateActiveSection: {
    marginBottom: 32,
  },
  affiliateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  affiliateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 280,
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  affiliateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  affiliateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  affiliateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  affiliateCode: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  affiliateMetrics: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  affiliateMetric: {},
  affiliateMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  affiliateMetricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  createPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  createPromoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  payoutsSection: {
    marginBottom: 32,
  },
  payoutCard: {
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  payoutInfo: {},
  payoutCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EC4899',
  },
  payoutMethod: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  processPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EC4899',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  processPayoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Products Tab Styles
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  senderIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderIdIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#8B5CF615',
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderIdInfo: {
    flex: 1,
  },
  senderIdName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  senderIdMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  senderIdDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  senderIdDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#DC2626',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rejectIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmRejectBtn: {
    backgroundColor: '#DC2626',
  },
  confirmRejectBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
