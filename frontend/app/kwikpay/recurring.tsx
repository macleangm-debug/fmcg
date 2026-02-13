import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface Plan {
  plan_id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  description: string;
  trial_days: number;
  subscriber_count: number;
  active: boolean;
}

interface Subscription {
  subscription_id: string;
  plan_id: string;
  customer_email: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  next_billing_date: string;
  created_at: string;
}

export default function RecurringPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  // Plan form
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planInterval, setPlanInterval] = useState('monthly');
  const [planDescription, setPlanDescription] = useState('');
  const [planTrialDays, setPlanTrialDays] = useState('0');

  // Subscribe form
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/subscription-plans');
      setPlans(response.data?.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/subscriptions');
      setSubscriptions(response.data?.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPlans(), fetchSubscriptions()]).finally(() => setLoading(false));
  }, [fetchPlans, fetchSubscriptions]);

  const handleCreatePlan = async () => {
    if (!planName || !planAmount) {
      Alert.alert('Error', 'Please enter plan name and amount');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/subscription-plans', {
        name: planName,
        amount: parseFloat(planAmount),
        currency: 'TZS',
        interval: planInterval,
        description: planDescription,
        trial_days: parseInt(planTrialDays) || 0,
      });
      Alert.alert('Success', 'Subscription plan created!');
      setShowPlanModal(false);
      resetPlanForm();
      fetchPlans();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !subEmail) {
      Alert.alert('Error', 'Please enter customer email');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/subscriptions', {
        plan_id: selectedPlan.plan_id,
        customer_email: subEmail,
        customer_phone: subPhone,
        payment_method: 'mobile_money',
      });
      Alert.alert('Success', 'Customer subscribed!');
      setShowSubscribeModal(false);
      setSubEmail('');
      setSubPhone('');
      setSelectedPlan(null);
      fetchSubscriptions();
      fetchPlans();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      await api.post(`/kwikpay/subscriptions/${subscriptionId}/cancel`);
      fetchSubscriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel subscription');
    }
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      await api.post(`/kwikpay/subscriptions/${subscriptionId}/pause`);
      fetchSubscriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      await api.post(`/kwikpay/subscriptions/${subscriptionId}/resume`);
      fetchSubscriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to resume subscription');
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanAmount('');
    setPlanInterval('monthly');
    setPlanDescription('');
    setPlanTrialDays('0');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'trial': return COLORS.secondary;
      case 'paused': return COLORS.warning;
      case 'cancelled': return COLORS.danger;
      case 'past_due': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primaryLight;
      case 'trial': return COLORS.secondaryLight;
      case 'paused': return COLORS.warningLight;
      case 'cancelled': return COLORS.dangerLight;
      case 'past_due': return COLORS.dangerLight;
      default: return COLORS.lightGray;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Recurring Billing</Text>
            <Text style={styles.pageSubtitle}>Manage subscriptions & recurring payments</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowPlanModal(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="layers" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{plans.length}</Text>
            <Text style={styles.statLabel}>Plans</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="people" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{subscriptions.filter(s => s.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Active Subscribers</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="repeat" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + s.amount, 0))}</Text>
            <Text style={styles.statLabel}>MRR</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
            onPress={() => setActiveTab('plans')}
          >
            <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>Plans ({plans.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]}
            onPress={() => setActiveTab('subscriptions')}
          >
            <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.tabTextActive]}>Subscriptions ({subscriptions.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <View style={styles.section}>
            {plans.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="layers-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Plans</Text>
                <Text style={styles.emptyText}>Create a subscription plan to get started</Text>
              </View>
            ) : (
              plans.map((plan) => (
                <View key={plan.plan_id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={[styles.badge, { backgroundColor: plan.active ? COLORS.primaryLight : COLORS.lightGray }]}>
                      <Text style={[styles.badgeText, { color: plan.active ? COLORS.primary : COLORS.gray }]}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>
                    TZS {formatNumber(plan.amount)}/{plan.interval}
                  </Text>
                  <Text style={styles.planDescription}>{plan.description || 'No description'}</Text>
                  <View style={styles.planStats}>
                    <View style={styles.planStat}>
                      <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.planStatText}>{plan.subscriber_count} subscribers</Text>
                    </View>
                    {plan.trial_days > 0 && (
                      <View style={styles.planStat}>
                        <Ionicons name="gift-outline" size={14} color={COLORS.gray} />
                        <Text style={styles.planStatText}>{plan.trial_days} day trial</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setShowSubscribeModal(true);
                    }}
                  >
                    <Ionicons name="person-add" size={16} color={COLORS.white} />
                    <Text style={styles.subscribeButtonText}>Add Subscriber</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <View style={styles.section}>
            {subscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Subscriptions</Text>
                <Text style={styles.emptyText}>Subscribers will appear here</Text>
              </View>
            ) : (
              subscriptions.map((sub) => (
                <View key={sub.subscription_id} style={styles.subCard}>
                  <View style={styles.subHeader}>
                    <Text style={styles.subEmail}>{sub.customer_email}</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusBg(sub.status) }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(sub.status) }]}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subAmount}>TZS {formatNumber(sub.amount)}/{sub.interval}</Text>
                  <Text style={styles.subDate}>Next billing: {new Date(sub.next_billing_date).toLocaleDateString()}</Text>
                  <View style={styles.subActions}>
                    {sub.status === 'active' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handlePauseSubscription(sub.subscription_id)}
                      >
                        <Ionicons name="pause" size={16} color={COLORS.warning} />
                        <Text style={[styles.actionText, { color: COLORS.warning }]}>Pause</Text>
                      </TouchableOpacity>
                    )}
                    {sub.status === 'paused' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleResumeSubscription(sub.subscription_id)}
                      >
                        <Ionicons name="play" size={16} color={COLORS.primary} />
                        <Text style={[styles.actionText, { color: COLORS.primary }]}>Resume</Text>
                      </TouchableOpacity>
                    )}
                    {(sub.status === 'active' || sub.status === 'paused') && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCancelSubscription(sub.subscription_id)}
                      >
                        <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                        <Text style={[styles.actionText, { color: COLORS.danger }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Plan Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Subscription Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Plan Name *</Text>
              <TextInput
                style={styles.input}
                value={planName}
                onChangeText={setPlanName}
                placeholder="Basic Plan"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Amount (TZS) *</Text>
              <TextInput
                style={styles.input}
                value={planAmount}
                onChangeText={setPlanAmount}
                placeholder="50,000"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Billing Interval</Text>
              <View style={styles.intervalPicker}>
                {INTERVALS.map((int) => (
                  <TouchableOpacity
                    key={int.value}
                    style={[styles.intervalOption, planInterval === int.value && styles.intervalOptionActive]}
                    onPress={() => setPlanInterval(int.value)}
                  >
                    <Text style={[styles.intervalText, planInterval === int.value && styles.intervalTextActive]}>
                      {int.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={planDescription}
                onChangeText={setPlanDescription}
                placeholder="Plan description..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Trial Days</Text>
              <TextInput
                style={styles.input}
                value={planTrialDays}
                onChangeText={setPlanTrialDays}
                placeholder="0"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreatePlan}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Create Plan</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subscribe Modal */}
      <Modal visible={showSubscribeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subscriber</Text>
              <TouchableOpacity onPress={() => setShowSubscribeModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {selectedPlan && (
                <View style={styles.selectedPlanInfo}>
                  <Text style={styles.selectedPlanName}>{selectedPlan.name}</Text>
                  <Text style={styles.selectedPlanPrice}>TZS {formatNumber(selectedPlan.amount)}/{selectedPlan.interval}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Customer Email *</Text>
              <TextInput
                style={styles.input}
                value={subEmail}
                onChangeText={setSubEmail}
                placeholder="customer@example.com"
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={subPhone}
                onChangeText={setSubPhone}
                placeholder="+255 712 345 678"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleSubscribe}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Subscribe</Text>
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
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  section: {},
  planCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  planPrice: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  planDescription: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  planStats: { flexDirection: 'row', gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  planStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planStatText: { fontSize: 12, color: COLORS.gray },
  subscribeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, gap: 6, marginTop: 12 },
  subscribeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  subCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subEmail: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  subAmount: { fontSize: 14, color: COLORS.primary, marginBottom: 4 },
  subDate: { fontSize: 12, color: COLORS.gray, marginBottom: 12 },
  subActions: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 80, textAlignVertical: 'top' },
  intervalPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  intervalOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border },
  intervalOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  intervalText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  intervalTextActive: { color: COLORS.white },
  selectedPlanInfo: { backgroundColor: COLORS.primaryLight, padding: 16, borderRadius: 12, marginBottom: 16 },
  selectedPlanName: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  selectedPlanPrice: { fontSize: 14, color: COLORS.primaryDark, marginTop: 4 },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
