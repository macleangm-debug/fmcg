import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import api from '../../src/api/client';

// KwikPay Green Theme
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

export default function SettingsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    business_name: '',
    country: 'TZ',
    currency: 'TZS',
    is_live: false,
    stripe_connected: false,
    flutterwave_connected: false,
    payment_methods: ['card', 'mpesa', 'tigo_pesa', 'airtel_money'],
  });
  // Live mode toggle confirmation
  const [showLiveModeModal, setShowLiveModeModal] = useState(false);
  const [pendingLiveMode, setPendingLiveMode] = useState<boolean | null>(null);
  const [togglingLive, setTogglingLive] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings({
        business_name: user?.name || 'Business',
        country: 'TZ',
        currency: 'TZS',
        is_live: false,
        stripe_connected: false,
        flutterwave_connected: false,
        payment_methods: ['card', 'mpesa', 'tigo_pesa', 'airtel_money'],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSettings();
  };

  // Show confirmation before toggling live mode
  const handleLiveModePress = (value: boolean) => {
    setPendingLiveMode(value);
    setShowLiveModeModal(true);
  };

  const handleLiveModeConfirm = async () => {
    if (pendingLiveMode === null) return;
    
    setTogglingLive(true);
    try {
      await api.put('/kwikpay/settings', { is_live: pendingLiveMode });
      setSettings({ ...settings, is_live: pendingLiveMode });
      setShowLiveModeModal(false);
      setPendingLiveMode(null);
    } catch (error) {
      console.error('Failed to toggle live mode:', error);
      if (Platform.OS === 'web') {
        alert('Failed to change mode. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to change mode. Please try again.');
      }
    } finally {
      setTogglingLive(false);
    }
  };

  const handleLiveModeCancel = () => {
    setShowLiveModeModal(false);
    setPendingLiveMode(null);
  };

  const handleToggleLive = async (value: boolean) => {
    // Show confirmation modal instead of toggling directly
    handleLiveModePress(value);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Settings</Text>
            <Text style={styles.pageSubtitle}>Manage your account</Text>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValue}>{settings.business_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country</Text>
              <Text style={styles.infoValue}>{settings.country === 'TZ' ? 'Tanzania' : settings.country}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{settings.currency}</Text>
            </View>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Live Mode</Text>
                <Text style={styles.toggleDesc}>Process real payments</Text>
              </View>
              <Switch
                value={settings.is_live}
                onValueChange={handleToggleLive}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={settings.is_live ? COLORS.primary : COLORS.gray}
              />
            </View>
            <View style={[styles.modeBadge, { backgroundColor: settings.is_live ? COLORS.successLight : COLORS.warningLight }]}>
              <Ionicons name={settings.is_live ? 'checkmark-circle' : 'flask'} size={16} color={settings.is_live ? COLORS.success : COLORS.warning} />
              <Text style={[styles.modeBadgeText, { color: settings.is_live ? COLORS.success : COLORS.warning }]}>
                {settings.is_live ? 'Live Mode Active' : 'Test Mode Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Providers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Providers</Text>
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <View style={styles.providerInfo}>
                <View style={[styles.providerIcon, { backgroundColor: COLORS.blueLight }]}>
                  <Ionicons name="card" size={20} color={COLORS.blue} />
                </View>
                <View>
                  <Text style={styles.providerName}>Stripe</Text>
                  <Text style={styles.providerDesc}>Card payments</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: settings.stripe_connected ? COLORS.successLight : COLORS.dangerLight }]}>
                <Text style={[styles.statusText, { color: settings.stripe_connected ? COLORS.success : COLORS.danger }]}>
                  {settings.stripe_connected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
            </View>

            <View style={styles.providerRow}>
              <View style={styles.providerInfo}>
                <View style={[styles.providerIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="phone-portrait" size={20} color={COLORS.warning} />
                </View>
                <View>
                  <Text style={styles.providerName}>Flutterwave</Text>
                  <Text style={styles.providerDesc}>Mobile money</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: settings.flutterwave_connected ? COLORS.successLight : COLORS.dangerLight }]}>
                <Text style={[styles.statusText, { color: settings.flutterwave_connected ? COLORS.success : COLORS.danger }]}>
                  {settings.flutterwave_connected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enabled Payment Methods</Text>
          <View style={styles.card}>
            {[
              { id: 'card', name: 'Visa/Mastercard', icon: 'card' },
              { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait' },
              { id: 'tigo_pesa', name: 'Tigo Pesa', icon: 'phone-portrait' },
              { id: 'airtel_money', name: 'Airtel Money', icon: 'phone-portrait' },
              { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business' },
            ].map((method) => (
              <View key={method.id} style={styles.methodRow}>
                <View style={styles.methodInfo}>
                  <Ionicons name={method.icon as any} size={18} color={COLORS.gray} />
                  <Text style={styles.methodName}>{method.name}</Text>
                </View>
                <Ionicons
                  name={settings.payment_methods?.includes(method.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={settings.payment_methods?.includes(method.id) ? COLORS.success : COLORS.gray}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Live Mode Toggle Confirmation Modal */}
      <ConfirmationModal
        visible={showLiveModeModal}
        title={pendingLiveMode ? "Enable Live Mode" : "Disable Live Mode"}
        message={pendingLiveMode 
          ? "Are you sure you want to enable LIVE mode? All transactions will process real payments and charge actual money."
          : "Are you sure you want to disable Live mode? Your account will switch to Test mode and only process test transactions."}
        confirmLabel={pendingLiveMode ? "Enable Live" : "Switch to Test"}
        cancelLabel="Cancel"
        onConfirm={handleLiveModeConfirm}
        onCancel={handleLiveModeCancel}
        variant={pendingLiveMode ? "danger" : "warning"}
        icon={pendingLiveMode ? "checkmark-circle-outline" : "flask-outline"}
        loading={togglingLive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 14, color: COLORS.gray },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  toggleDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  modeBadgeText: { fontSize: 13, fontWeight: '600' },
  providerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  providerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  providerName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  providerDesc: { fontSize: 12, color: COLORS.gray },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  methodInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodName: { fontSize: 14, color: COLORS.dark },
});
