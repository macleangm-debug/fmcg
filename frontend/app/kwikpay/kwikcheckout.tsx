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
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api from '../../src/api/client';

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

interface CheckoutConfig {
  has_checkout: boolean;
  checkout?: {
    code: string;
    name: string;
    checkout_url: string;
    country: { code: string; name: string; currency: string };
    accepted_methods: string[];
    settlement_type: string;
    theme_color: string;
    is_active: boolean;
    total_transactions: number;
    total_volume: number;
  };
  available_methods?: {
    mobile_money: number;
    banks: number;
    card: boolean;
    qr: boolean;
  };
}

const PAYMENT_METHODS = [
  { id: 'mobile_money', name: 'Mobile Money', icon: 'phone-portrait', description: 'M-Pesa, Tigo Pesa, Airtel Money, etc.' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business', description: 'All major banks in your country' },
  { id: 'card', name: 'Card Payment', icon: 'card', description: 'Visa, Mastercard via secure gateway' },
  { id: 'qr', name: 'QR Code', icon: 'qr-code', description: 'Scan with any banking app' },
];

const COUNTRIES = [
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
];

export default function KwikCheckoutSetupPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Setup form state
  const [checkoutName, setCheckoutName] = useState('');
  const [countryCode, setCountryCode] = useState('TZ');
  const [acceptedMethods, setAcceptedMethods] = useState(['mobile_money', 'bank_transfer', 'card', 'qr']);
  const [settlementType, setSettlementType] = useState('mobile_money');
  const [settlementPhone, setSettlementPhone] = useState('');
  const [settlementBank, setSettlementBank] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [themeColor, setThemeColor] = useState('#10B981');

  const fetchConfig = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/merchant/checkout');
      setConfig(response.data);
      
      if (response.data.has_checkout && response.data.checkout) {
        setCheckoutName(response.data.checkout.name);
        setCountryCode(response.data.checkout.country.code);
        setAcceptedMethods(response.data.checkout.accepted_methods);
        setSettlementType(response.data.checkout.settlement_type);
        setThemeColor(response.data.checkout.theme_color);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveSetup = async () => {
    if (!checkoutName) {
      Alert.alert('Error', 'Please enter a checkout name');
      return;
    }

    setSaving(true);
    try {
      await api.post('/kwikpay/merchant/checkout/setup', {
        checkout_name: checkoutName,
        country_code: countryCode,
        accepted_methods: acceptedMethods,
        settlement_type: settlementType,
        settlement_phone: settlementPhone || undefined,
        settlement_bank: settlementBank || undefined,
        settlement_account: settlementAccount || undefined,
        theme_color: themeColor,
      });
      Alert.alert('Success', 'KwikCheckout setup saved!');
      setShowSetup(false);
      fetchConfig();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save setup');
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = (methodId: string) => {
    setAcceptedMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((m) => m !== methodId)
        : [...prev, methodId]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading KwikCheckout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConfig(); }} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>KwikCheckout</Text>
            <Text style={styles.pageSubtitle}>Accept payments from your customers</Text>
          </View>
          {config?.has_checkout && (
            <TouchableOpacity style={styles.editButton} onPress={() => setShowSetup(true)}>
              <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="flash" size={24} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Smart Universal Checkout</Text>
            <Text style={styles.infoText}>
              One checkout page with ALL payment options. Your customers can pay with Mobile Money, Bank Transfer, Card, or QR Code.
            </Text>
          </View>
        </View>

        {!config?.has_checkout ? (
          /* Setup CTA */
          <View style={styles.setupCard}>
            <View style={styles.setupIcon}>
              <Ionicons name="rocket" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.setupTitle}>Get Started with KwikCheckout</Text>
            <Text style={styles.setupDesc}>
              Set up your checkout in 2 minutes and start accepting payments immediately.
            </Text>
            <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetup(true)}>
              <Text style={styles.setupButtonText}>Setup KwikCheckout</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          /* Checkout Dashboard */
          <>
            {/* Checkout Link Card */}
            <View style={styles.linkCard}>
              <View style={styles.linkHeader}>
                <Ionicons name="link" size={20} color={COLORS.primary} />
                <Text style={styles.linkTitle}>Your Checkout Link</Text>
                <View style={[styles.statusBadge, config.checkout?.is_active ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{config.checkout?.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <View style={styles.linkBox}>
                <Text style={styles.linkUrl} numberOfLines={1}>
                  pay.kwikpay.co.tz/{config.checkout?.code}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(`https://pay.kwikpay.co.tz/${config.checkout?.code}`, 'Checkout URL')}
                >
                  <Ionicons name="copy" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.linkActions}>
                <TouchableOpacity style={styles.linkAction}>
                  <Ionicons name="qr-code" size={16} color={COLORS.secondary} />
                  <Text style={styles.linkActionText}>Get QR Code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkAction}>
                  <Ionicons name="share-social" size={16} color={COLORS.secondary} />
                  <Text style={styles.linkActionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkAction}>
                  <Ionicons name="code-slash" size={16} color={COLORS.secondary} />
                  <Text style={styles.linkActionText}>Embed</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{config.checkout?.total_transactions || 0}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(config.checkout?.total_volume || 0)}</Text>
                <Text style={styles.statLabel}>Total Volume</Text>
              </View>
            </View>

            {/* Accepted Methods */}
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHODS.map((method) => {
                const isEnabled = config.checkout?.accepted_methods.includes(method.id);
                return (
                  <View key={method.id} style={[styles.methodCard, !isEnabled && styles.methodCardDisabled]}>
                    <Ionicons
                      name={method.icon as any}
                      size={24}
                      color={isEnabled ? COLORS.primary : COLORS.gray}
                    />
                    <Text style={[styles.methodName, !isEnabled && styles.methodNameDisabled]}>
                      {method.name}
                    </Text>
                    {isEnabled && (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Country & Currency */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Country</Text>
                <Text style={styles.detailValue}>{config.checkout?.country.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>{config.checkout?.country.currency}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Available Banks</Text>
                <Text style={styles.detailValue}>{config.available_methods?.banks || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Available MNOs</Text>
                <Text style={styles.detailValue}>{config.available_methods?.mobile_money || 0}</Text>
              </View>
            </View>
          </>
        )}

        {/* Powered by */}
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.poweredByBrand}>KwikPay</Text>
        </View>
      </ScrollView>

      {/* Setup Modal */}
      {showSetup && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{config?.has_checkout ? 'Edit Setup' : 'Setup KwikCheckout'}</Text>
              <TouchableOpacity onPress={() => setShowSetup(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Checkout Name</Text>
              <TextInput
                style={styles.input}
                value={checkoutName}
                onChangeText={setCheckoutName}
                placeholder="My Store Checkout"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Country</Text>
              <View style={styles.countryRow}>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[styles.countryOption, countryCode === country.code && styles.countrySelected]}
                    onPress={() => setCountryCode(country.code)}
                  >
                    <Text style={[styles.countryText, countryCode === country.code && styles.countryTextSelected]}>
                      {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Payment Methods</Text>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={styles.methodToggle}
                  onPress={() => toggleMethod(method.id)}
                >
                  <Ionicons name={method.icon as any} size={20} color={COLORS.dark} />
                  <View style={styles.methodToggleInfo}>
                    <Text style={styles.methodToggleName}>{method.name}</Text>
                    <Text style={styles.methodToggleDesc}>{method.description}</Text>
                  </View>
                  <Switch
                    value={acceptedMethods.includes(method.id)}
                    onValueChange={() => toggleMethod(method.id)}
                    trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    thumbColor={acceptedMethods.includes(method.id) ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              ))}

              <Text style={styles.inputLabel}>Settlement</Text>
              <View style={styles.settlementRow}>
                <TouchableOpacity
                  style={[styles.settlementOption, settlementType === 'mobile_money' && styles.settlementSelected]}
                  onPress={() => setSettlementType('mobile_money')}
                >
                  <Ionicons name="phone-portrait" size={18} color={settlementType === 'mobile_money' ? COLORS.primary : COLORS.gray} />
                  <Text style={[styles.settlementText, settlementType === 'mobile_money' && styles.settlementTextSelected]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settlementOption, settlementType === 'bank' && styles.settlementSelected]}
                  onPress={() => setSettlementType('bank')}
                >
                  <Ionicons name="business" size={18} color={settlementType === 'bank' ? COLORS.primary : COLORS.gray} />
                  <Text style={[styles.settlementText, settlementType === 'bank' && styles.settlementTextSelected]}>
                    Bank Account
                  </Text>
                </TouchableOpacity>
              </View>

              {settlementType === 'mobile_money' && (
                <>
                  <Text style={styles.inputLabel}>Settlement Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={settlementPhone}
                    onChangeText={setSettlementPhone}
                    placeholder="0754 123 456"
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.gray}
                  />
                </>
              )}

              {settlementType === 'bank' && (
                <>
                  <Text style={styles.inputLabel}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    value={settlementBank}
                    onChangeText={setSettlementBank}
                    placeholder="e.g., CRDB"
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={settlementAccount}
                    onChangeText={setSettlementAccount}
                    placeholder="Account number"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.gray}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveSetup}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Setup</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.primaryLight, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primaryDark, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.primaryDark, lineHeight: 18 },
  setupCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center' },
  setupIcon: { marginBottom: 20 },
  setupTitle: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  setupDesc: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  setupButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, gap: 8 },
  setupButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  linkCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  linkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  linkTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusActive: { backgroundColor: COLORS.primaryLight },
  statusInactive: { backgroundColor: COLORS.dangerLight },
  statusText: { fontSize: 11, fontWeight: '600', color: COLORS.primaryDark },
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12 },
  linkUrl: { flex: 1, fontSize: 14, fontFamily: 'monospace', color: COLORS.dark },
  copyBtn: { padding: 4 },
  linkActions: { flexDirection: 'row', gap: 16 },
  linkAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkActionText: { fontSize: 13, color: COLORS.secondary },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  methodCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  methodCardDisabled: { opacity: 0.5 },
  methodName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  methodNameDisabled: { color: COLORS.gray },
  detailsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.gray },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  poweredBy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 4 },
  poweredByText: { fontSize: 12, color: COLORS.gray },
  poweredByBrand: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  countryOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  countrySelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  countryText: { fontSize: 13, color: COLORS.gray },
  countryTextSelected: { color: COLORS.primary, fontWeight: '600' },
  methodToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.lightGray, borderRadius: 10, marginBottom: 8, gap: 12 },
  methodToggleInfo: { flex: 1 },
  methodToggleName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  methodToggleDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  settlementRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  settlementOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  settlementSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  settlementText: { fontSize: 14, color: COLORS.gray },
  settlementTextSelected: { color: COLORS.primary, fontWeight: '600' },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
