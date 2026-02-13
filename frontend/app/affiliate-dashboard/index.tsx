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
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
              process.env.EXPO_PUBLIC_BACKEND_URL || 
              '/api';

interface AffiliateProfile {
  is_affiliate: boolean;
  id?: string;
  affiliate_code?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  status?: string;
  commission_rate?: number;
  total_earnings?: number;
  pending_earnings?: number;
  paid_earnings?: number;
  total_conversions?: number;
  payout_method?: string;
  created_at?: string;
  approved_at?: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  description?: string;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  current_uses: number;
  status: string;
  created_at: string;
}

interface Commission {
  id: string;
  order_id?: string;
  promo_code?: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface Payout {
  id: string;
  amount: number;
  payout_method: string;
  status: string;
  reference?: string;
  created_at: string;
  processed_at?: string;
  notes?: string;
}

export default function AffiliateDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { user, isLoading: authLoading, loadUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'codes' | 'earnings' | 'payouts'>('overview');
  
  // Profile & stats
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [earnings, setEarnings] = useState<{
    summary: any;
    transactions: Commission[];
  } | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  
  // Modals
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  
  // Application form (for non-affiliates)
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    description: '',
    expected_monthly_referrals: '',
    payout_method: 'bank_transfer',
  });
  const [submitting, setSubmitting] = useState(false);

  // Period filter for earnings
  const [earningsPeriod, setEarningsPeriod] = useState<'all' | 'today' | 'week' | 'month'>('month');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    
    fetchProfile();
  }, [user, authLoading]);

  useEffect(() => {
    if (profile?.is_affiliate && profile?.status === 'active') {
      fetchEarnings();
    }
  }, [earningsPeriod, profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const profileRes = await axios.get(`${API_URL}/api/affiliates/my-profile`, { headers });
      setProfile(profileRes.data);
      
      if (profileRes.data.is_affiliate && profileRes.data.status === 'active') {
        await Promise.all([
          fetchPromoCodes(),
          fetchEarnings(),
          fetchPayouts(),
        ]);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/affiliates/my-codes`, { headers });
      setPromoCodes(res.data?.promo_codes || []);
    } catch (error) {
      console.log('Error fetching promo codes:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/affiliates/my-earnings?period=${earningsPeriod}`, { headers });
      setEarnings(res.data);
    } catch (error) {
      console.log('Error fetching earnings:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/affiliates/my-payouts`, { headers });
      setPayouts(res.data?.payouts || []);
      setPendingBalance(res.data?.pending_balance || 0);
    } catch (error) {
      console.log('Error fetching payouts:', error);
    }
  };

  const handleApply = async () => {
    if (!applyForm.company_name || !applyForm.contact_name || !applyForm.contact_email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        ...applyForm,
        expected_monthly_referrals: applyForm.expected_monthly_referrals 
          ? parseInt(applyForm.expected_monthly_referrals) 
          : null,
      };
      
      await axios.post(`${API_URL}/api/affiliates/apply`, payload, { headers });
      
      if (Platform.OS === 'web') {
        alert('Application submitted! We will review and get back to you within 2-3 business days.');
      } else {
        Alert.alert('Success', 'Application submitted! We will review and get back to you within 2-3 business days.');
      }
      
      setShowApplyModal(false);
      fetchProfile();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to submit application';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = payoutAmount ? parseFloat(payoutAmount) : pendingBalance;
    
    if (amount < 50) {
      Alert.alert('Error', 'Minimum payout amount is $50');
      return;
    }
    
    if (amount > pendingBalance) {
      Alert.alert('Error', `Insufficient balance. Available: $${pendingBalance}`);
      return;
    }
    
    setRequestingPayout(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/api/affiliates/request-payout`, { amount }, { headers });
      
      if (Platform.OS === 'web') {
        alert(`Payout request of $${amount} submitted. Processing time: 3-5 business days.`);
      } else {
        Alert.alert('Success', `Payout request of $${amount} submitted. Processing time: 3-5 business days.`);
      }
      
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchPayouts();
      fetchProfile();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to request payout';
      if (Platform.OS === 'web') {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setRequestingPayout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } else {
      Alert.alert('Code Copied', text);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'completed': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'rejected': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading Affiliate Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not an affiliate - show apply section
  if (!profile?.is_affiliate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Affiliate Program</Text>
        </View>
        
        <ScrollView style={styles.content} contentContainerStyle={styles.applyContainer}>
          <View style={styles.applyHero}>
            <View style={styles.applyIcon}>
              <Ionicons name="people" size={48} color="#6366F1" />
            </View>
            <Text style={styles.applyTitle}>Become an Affiliate Partner</Text>
            <Text style={styles.applyDescription}>
              Earn commissions by referring customers to Software Galaxy. Share your unique promo codes and earn up to 20% commission on every sale.
            </Text>
          </View>
          
          <View style={styles.benefitsGrid}>
            {[
              { icon: 'cash-outline', title: 'High Commissions', desc: 'Earn up to 20% on every sale' },
              { icon: 'link-outline', title: 'Custom Promo Codes', desc: 'Get personalized codes for your audience' },
              { icon: 'analytics-outline', title: 'Real-time Tracking', desc: 'Monitor your conversions and earnings' },
              { icon: 'wallet-outline', title: 'Easy Payouts', desc: 'Monthly payouts via bank or mobile money' },
            ].map((benefit, idx) => (
              <View key={idx} style={styles.benefitCard}>
                <Ionicons name={benefit.icon as any} size={28} color="#6366F1" />
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowApplyModal(true)}
            data-testid="apply-affiliate-btn"
          >
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Apply to Become an Affiliate</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Apply Modal */}
        <Modal visible={showApplyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 500, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Affiliate Application</Text>
                <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.company_name}
                  onChangeText={(t) => setApplyForm({...applyForm, company_name: t})}
                  placeholder="Your company or brand name"
                />
                
                <Text style={styles.inputLabel}>Contact Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.contact_name}
                  onChangeText={(t) => setApplyForm({...applyForm, contact_name: t})}
                  placeholder="Your full name"
                />
                
                <Text style={styles.inputLabel}>Contact Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.contact_email}
                  onChangeText={(t) => setApplyForm({...applyForm, contact_email: t})}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                />
                
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.contact_phone}
                  onChangeText={(t) => setApplyForm({...applyForm, contact_phone: t})}
                  placeholder="+1234567890"
                  keyboardType="phone-pad"
                />
                
                <Text style={styles.inputLabel}>Website (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.website}
                  onChangeText={(t) => setApplyForm({...applyForm, website: t})}
                  placeholder="https://yourwebsite.com"
                />
                
                <Text style={styles.inputLabel}>About Your Business</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                  value={applyForm.description}
                  onChangeText={(t) => setApplyForm({...applyForm, description: t})}
                  placeholder="Tell us about your business and audience..."
                  multiline
                />
                
                <Text style={styles.inputLabel}>Expected Monthly Referrals</Text>
                <TextInput
                  style={styles.textInput}
                  value={applyForm.expected_monthly_referrals}
                  onChangeText={(t) => setApplyForm({...applyForm, expected_monthly_referrals: t})}
                  placeholder="Estimated number of referrals"
                  keyboardType="number-pad"
                />
                
                <Text style={styles.inputLabel}>Preferred Payout Method</Text>
                <View style={styles.payoutOptions}>
                  {['bank_transfer', 'mobile_money', 'paypal'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.payoutOption, applyForm.payout_method === method && styles.payoutOptionActive]}
                      onPress={() => setApplyForm({...applyForm, payout_method: method})}
                    >
                      <Text style={[styles.payoutOptionText, applyForm.payout_method === method && styles.payoutOptionTextActive]}>
                        {method.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowApplyModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleApply}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Submit Application</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Pending application state
  if (profile.status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Affiliate Program</Text>
        </View>
        
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIcon}>
            <Ionicons name="time" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.pendingTitle}>Application Under Review</Text>
          <Text style={styles.pendingDescription}>
            Thank you for applying to become an affiliate partner! Our team is reviewing your application and will get back to you within 2-3 business days.
          </Text>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingInfoLabel}>Company: {profile.company_name}</Text>
            <Text style={styles.pendingInfoLabel}>Applied: {profile.created_at ? formatDate(profile.created_at) : 'N/A'}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Rejected state
  if (profile.status === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Affiliate Program</Text>
        </View>
        
        <View style={styles.pendingContainer}>
          <View style={[styles.pendingIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={64} color="#DC2626" />
          </View>
          <Text style={styles.pendingTitle}>Application Not Approved</Text>
          <Text style={styles.pendingDescription}>
            Unfortunately, your affiliate application was not approved at this time. Please contact support if you believe this was an error or would like more information.
          </Text>
          <TouchableOpacity style={styles.contactSupportBtn} onPress={() => router.push('/help')}>
            <Ionicons name="chatbubble-outline" size={18} color="#6366F1" />
            <Text style={styles.contactSupportText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Active affiliate dashboard
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'codes', label: 'Promo Codes', icon: 'pricetag-outline' },
    { id: 'earnings', label: 'Earnings', icon: 'cash-outline' },
    { id: 'payouts', label: 'Payouts', icon: 'wallet-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Affiliate Dashboard</Text>
            <Text style={styles.headerSubtitle}>{profile.company_name}</Text>
          </View>
        </View>
        <View style={styles.affiliateBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.affiliateBadgeText}>Active Partner</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.id ? '#6366F1' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View style={styles.section}>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="cash" size={28} color="#6366F1" />
                <Text style={styles.statValue}>${profile.total_earnings?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Total Earnings</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={28} color="#F59E0B" />
                <Text style={styles.statValue}>${profile.pending_earnings?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                <Text style={styles.statValue}>${profile.paid_earnings?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Paid Out</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="trending-up" size={28} color="#EC4899" />
                <Text style={styles.statValue}>{profile.total_conversions || 0}</Text>
                <Text style={styles.statLabel}>Conversions</Text>
              </View>
            </View>

            {/* Affiliate Code Card */}
            <View style={styles.codeCard}>
              <View style={styles.codeCardHeader}>
                <Text style={styles.codeCardTitle}>Your Affiliate Code</Text>
                <Text style={styles.commissionRate}>{profile.commission_rate}% Commission</Text>
              </View>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{profile.affiliate_code}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(profile.affiliate_code || '')}
                >
                  <Ionicons name="copy-outline" size={18} color="#6366F1" />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeDescription}>
                Share this code or any of your promo codes with customers. You earn {profile.commission_rate}% commission on every successful purchase.
              </Text>
            </View>

            {/* Request Payout */}
            {pendingBalance >= 50 && (
              <TouchableOpacity
                style={styles.payoutBtn}
                onPress={() => setShowPayoutModal(true)}
                data-testid="request-payout-btn"
              >
                <Ionicons name="wallet" size={20} color="#FFFFFF" />
                <Text style={styles.payoutBtnText}>Request Payout (${pendingBalance.toFixed(2)} available)</Text>
              </TouchableOpacity>
            )}

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <Text style={styles.quickStatsTitle}>Quick Stats</Text>
              <View style={styles.quickStatsRow}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{promoCodes.filter(c => c.status === 'active').length}</Text>
                  <Text style={styles.quickStatLabel}>Active Codes</Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{promoCodes.reduce((sum, c) => sum + c.current_uses, 0)}</Text>
                  <Text style={styles.quickStatLabel}>Total Uses</Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{payouts.filter(p => p.status === 'pending').length}</Text>
                  <Text style={styles.quickStatLabel}>Pending Payouts</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'codes' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Promo Codes</Text>
            <Text style={styles.sectionSubtitle}>Share these codes with customers to earn commissions</Text>
            
            {promoCodes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No promo codes yet</Text>
                <Text style={styles.emptySubtext}>Contact support to request additional promo codes</Text>
              </View>
            ) : (
              <View style={styles.codesGrid}>
                {promoCodes.map((code) => (
                  <View key={code.id} style={styles.promoCard}>
                    <View style={styles.promoCardHeader}>
                      <Text style={styles.promoCode}>{code.code}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(code.status)}15` }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(code.status) }]}>
                          {code.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.promoDiscount}>
                      {code.discount_type === 'percentage' ? `${code.discount_value}% off` : `$${code.discount_value} off`}
                    </Text>
                    {code.description && (
                      <Text style={styles.promoDescription}>{code.description}</Text>
                    )}
                    <View style={styles.promoStats}>
                      <Text style={styles.promoStat}>
                        <Ionicons name="checkmark-circle" size={14} color="#6B7280" /> {code.current_uses} uses
                        {code.max_uses && ` / ${code.max_uses} max`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyCodeBtn}
                      onPress={() => copyToClipboard(code.code)}
                    >
                      <Ionicons name="copy-outline" size={16} color="#6366F1" />
                      <Text style={styles.copyCodeBtnText}>Copy Code</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'earnings' && (
          <View style={styles.section}>
            <View style={styles.earningsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Commission History</Text>
                <Text style={styles.sectionSubtitle}>Track your earnings from referrals</Text>
              </View>
              <View style={styles.periodFilter}>
                {['all', 'today', 'week', 'month'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodBtn, earningsPeriod === period && styles.periodBtnActive]}
                    onPress={() => setEarningsPeriod(period as any)}
                  >
                    <Text style={[styles.periodBtnText, earningsPeriod === period && styles.periodBtnTextActive]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Earnings Summary */}
            {earnings?.summary && (
              <View style={styles.earningsSummary}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Period Earnings</Text>
                  <Text style={styles.summaryValue}>${earnings.summary.period_earnings?.toFixed(2) || '0.00'}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Period Pending</Text>
                  <Text style={styles.summaryValue}>${earnings.summary.period_pending?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>
            )}

            {/* Transactions List */}
            {earnings?.transactions?.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No earnings yet</Text>
                <Text style={styles.emptySubtext}>Start sharing your promo codes to earn commissions</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {earnings?.transactions?.map((tx) => (
                  <View key={tx.id} style={styles.transactionCard}>
                    <View style={styles.txLeft}>
                      <View style={styles.txIconContainer}>
                        <Ionicons name="cart" size={18} color="#6366F1" />
                      </View>
                      <View>
                        <Text style={styles.txCustomer}>{tx.customer_name || 'Customer'}</Text>
                        <Text style={styles.txCode}>Code: {tx.promo_code}</Text>
                        <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>+${tx.commission_amount?.toFixed(2)}</Text>
                      <Text style={styles.txOrderAmount}>Order: ${tx.order_amount?.toFixed(2)}</Text>
                      <View style={[styles.txStatus, { backgroundColor: `${getStatusColor(tx.status)}15` }]}>
                        <Text style={[styles.txStatusText, { color: getStatusColor(tx.status) }]}>
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'payouts' && (
          <View style={styles.section}>
            <View style={styles.payoutsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Payout History</Text>
                <Text style={styles.sectionSubtitle}>Track your payout requests and payments</Text>
              </View>
              {pendingBalance >= 50 && (
                <TouchableOpacity
                  style={styles.requestPayoutBtn}
                  onPress={() => setShowPayoutModal(true)}
                >
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.requestPayoutBtnText}>Request Payout</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Available Balance */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available for Payout</Text>
              <Text style={styles.balanceValue}>${pendingBalance.toFixed(2)}</Text>
              {pendingBalance < 50 && (
                <Text style={styles.balanceNote}>Minimum payout: $50.00</Text>
              )}
            </View>

            {/* Payouts List */}
            {payouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No payouts yet</Text>
                <Text style={styles.emptySubtext}>Request a payout when your balance reaches $50</Text>
              </View>
            ) : (
              <View style={styles.payoutsList}>
                {payouts.map((payout) => (
                  <View key={payout.id} style={styles.payoutCard}>
                    <View style={styles.payoutLeft}>
                      <View style={[styles.payoutIcon, { backgroundColor: `${getStatusColor(payout.status)}15` }]}>
                        <Ionicons 
                          name={payout.status === 'completed' ? 'checkmark-circle' : 'time'} 
                          size={20} 
                          color={getStatusColor(payout.status)} 
                        />
                      </View>
                      <View>
                        <Text style={styles.payoutAmount}>${payout.amount?.toFixed(2)}</Text>
                        <Text style={styles.payoutMethod}>{payout.payout_method?.replace('_', ' ')}</Text>
                        <Text style={styles.payoutDate}>Requested: {formatDate(payout.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.payoutRight}>
                      <View style={[styles.payoutStatus, { backgroundColor: `${getStatusColor(payout.status)}15` }]}>
                        <Text style={[styles.payoutStatusText, { color: getStatusColor(payout.status) }]}>
                          {payout.status}
                        </Text>
                      </View>
                      {payout.reference && (
                        <Text style={styles.payoutRef}>Ref: {payout.reference}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Payout Request Modal */}
      <Modal visible={showPayoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalBalanceLabel}>Available Balance</Text>
              <Text style={styles.modalBalanceValue}>${pendingBalance.toFixed(2)}</Text>
              
              <Text style={styles.inputLabel}>Payout Amount (min $50)</Text>
              <TextInput
                style={styles.textInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                placeholder={`Leave empty for full amount ($${pendingBalance.toFixed(2)})`}
                keyboardType="numeric"
              />
              
              <Text style={styles.payoutNote}>
                Payouts are processed within 3-5 business days via your registered payout method ({profile.payout_method?.replace('_', ' ')}).
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPayoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, requestingPayout && styles.submitBtnDisabled]}
                onPress={handleRequestPayout}
                disabled={requestingPayout}
              >
                {requestingPayout ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Request Payout</Text>
                  </>
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
    backgroundColor: '#F9FAFB',
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
  // Header
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
  affiliateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  affiliateBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    gap: 20,
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
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Code Card
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  commissionRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  codeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  // Payout Button
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  payoutBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Quick Stats
  quickStats: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  // Promo Codes
  codesGrid: {
    gap: 16,
  },
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  promoDiscount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  promoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  promoStats: {
    marginBottom: 12,
  },
  promoStat: {
    fontSize: 13,
    color: '#6B7280',
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyCodeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  // Earnings
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  periodFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  periodBtnActive: {
    backgroundColor: '#6366F1',
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  earningsSummary: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  txCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  txOrderAmount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  txStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Payouts
  payoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  requestPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestPayoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6366F1',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4338CA',
  },
  balanceNote: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  payoutsList: {
    gap: 12,
  },
  payoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  payoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  payoutMethod: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  payoutDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payoutStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  payoutRef: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Apply Section (Non-Affiliates)
  applyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  applyHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  applyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  applyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  applyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 500,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
    maxWidth: 800,
  },
  benefitCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Pending State
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pendingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
    marginBottom: 24,
  },
  pendingInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  pendingInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  contactSupportText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
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
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalBalanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6366F1',
    textAlign: 'center',
    marginBottom: 24,
  },
  payoutNote: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 16,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#6366F1',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Input Styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
  payoutOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  payoutOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  payoutOptionActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  payoutOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  payoutOptionTextActive: {
    color: '#6366F1',
  },
});
