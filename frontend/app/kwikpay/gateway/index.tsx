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
import api from '../../../src/api/client';

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

interface Institution {
  id: string;
  name: string;
  short_code: string;
  prefix: string;
  institution_type: string;
  supported_channels: string[];
  merchants_count: number;
  total_volume: number;
  checkout_url: string;
}

interface Merchant {
  id: string;
  merchant_prefix: string;
  business_name: string;
  merchant_category: string;
  settlement_type: string;
  total_transactions: number;
  total_volume: number;
  checkout_url: string;
}

export default function GatewayPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [banks, setBanks] = useState<any>({});
  const [mnos, setMnos] = useState<any>({});
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [showCreateInstitutionModal, setShowCreateInstitutionModal] = useState(false);
  const [showCreateMerchantModal, setShowCreateMerchantModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Institution form
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instType, setInstType] = useState('bank');
  const [instColor, setInstColor] = useState('#003366');

  // Merchant form
  const [merchantName, setMerchantName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantCategory, setMerchantCategory] = useState('retail');
  const [settlementType, setSettlementType] = useState('bank');
  const [settlementBank, setSettlementBank] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [instRes, banksRes, mnosRes] = await Promise.all([
        api.get('/gateway/institutions'),
        api.get('/gateway/config/banks'),
        api.get('/gateway/config/mnos'),
      ]);
      setInstitutions(instRes.data?.institutions || []);
      setBanks(instRes.data?.banks || banksRes.data?.banks || {});
      setMnos(mnosRes.data?.mnos || {});
    } catch (error) {
      console.error('Error fetching gateway data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMerchants = useCallback(async (shortCode: string) => {
    try {
      const response = await api.get(`/gateway/institutions/${shortCode}/merchants`);
      setMerchants(response.data?.merchants || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      setMerchants([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedInstitution) {
      fetchMerchants(selectedInstitution.short_code);
    }
  }, [selectedInstitution, fetchMerchants]);

  const handleCreateInstitution = async () => {
    if (!instName || !instCode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/gateway/institutions', {
        name: instName,
        short_code: instCode.toUpperCase(),
        institution_type: instType,
        primary_color: instColor,
        supported_channels: ['mobile_money', 'bank', 'card'],
      });

      Alert.alert(
        'Institution Created',
        `API Key: ${response.data.institution.api_key}\n\nAPI Secret: ${response.data.institution.api_secret}\n\n⚠️ Save the API secret - it won't be shown again!`,
        [{ text: 'OK' }]
      );
      setShowCreateInstitutionModal(false);
      resetInstitutionForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create institution');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMerchant = async () => {
    if (!selectedInstitution || !merchantName || !merchantEmail) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post(`/gateway/institutions/${selectedInstitution.short_code}/merchants`, {
        business_name: merchantName,
        business_email: merchantEmail,
        business_phone: merchantPhone,
        merchant_category: merchantCategory,
        settlement_type: settlementType,
        settlement_bank: settlementBank,
        settlement_account: settlementAccount,
      });

      Alert.alert(
        'Merchant Onboarded',
        `Merchant Prefix: ${response.data.merchant.merchant_prefix}\n\nAPI Key: ${response.data.merchant.api_key}\n\nCheckout URL: ${response.data.merchant.checkout_url}`,
        [{ text: 'OK' }]
      );
      setShowCreateMerchantModal(false);
      resetMerchantForm();
      fetchMerchants(selectedInstitution.short_code);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to onboard merchant');
    } finally {
      setCreating(false);
    }
  };

  const resetInstitutionForm = () => {
    setInstName('');
    setInstCode('');
    setInstType('bank');
    setInstColor('#003366');
  };

  const resetMerchantForm = () => {
    setMerchantName('');
    setMerchantEmail('');
    setMerchantPhone('');
    setMerchantCategory('retail');
    setSettlementType('bank');
    setSettlementBank('');
    setSettlementAccount('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Gateway...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>KwikPay Gateway</Text>
            <Text style={styles.pageSubtitle}>White-label payment solution for institutions</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => { resetInstitutionForm(); setShowCreateInstitutionModal(true); }}
            data-testid="add-institution-btn"
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Add Institution</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="business" size={24} color={COLORS.secondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Enterprise Payment Gateway</Text>
            <Text style={styles.infoText}>
              Banks and MNOs can use this as their branded payment solution. Each institution gets their own prefix (e.g., KWK-CRDB) and can onboard merchants with unique payment links.
            </Text>
          </View>
        </View>

        {/* Supported Channels */}
        <Text style={styles.sectionTitle}>Supported Payment Channels</Text>
        <View style={styles.channelsRow}>
          <View style={styles.channelCard}>
            <View style={[styles.channelIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.channelName}>Mobile Money</Text>
            <Text style={styles.channelDesc}>{Object.keys(mnos).length} MNOs</Text>
          </View>
          <View style={styles.channelCard}>
            <View style={[styles.channelIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="business" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.channelName}>Bank Transfer</Text>
            <Text style={styles.channelDesc}>{Object.keys(banks).length} Banks</Text>
          </View>
          <View style={styles.channelCard}>
            <View style={[styles.channelIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="card" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.channelName}>Card Payment</Text>
            <Text style={styles.channelDesc}>Visa, MC</Text>
          </View>
        </View>

        {/* Institutions */}
        <Text style={styles.sectionTitle}>Partner Institutions ({institutions.length})</Text>
        {institutions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Institutions</Text>
            <Text style={styles.emptyText}>Add a bank or MNO to get started</Text>
          </View>
        ) : (
          institutions.map((inst) => (
            <TouchableOpacity
              key={inst.id}
              style={[styles.institutionCard, selectedInstitution?.id === inst.id && styles.institutionCardSelected]}
              onPress={() => setSelectedInstitution(inst)}
              data-testid={`institution-${inst.short_code}`}
            >
              <View style={styles.institutionHeader}>
                <View style={[styles.institutionLogo, { backgroundColor: inst.institution_type === 'bank' ? COLORS.secondaryLight : COLORS.dangerLight }]}>
                  <Ionicons
                    name={inst.institution_type === 'bank' ? 'business' : 'phone-portrait'}
                    size={24}
                    color={inst.institution_type === 'bank' ? COLORS.secondary : COLORS.danger}
                  />
                </View>
                <View style={styles.institutionInfo}>
                  <Text style={styles.institutionName}>{inst.name}</Text>
                  <Text style={styles.institutionPrefix}>{inst.prefix}</Text>
                </View>
                <View style={styles.institutionBadge}>
                  <Text style={styles.institutionType}>{inst.institution_type}</Text>
                </View>
              </View>
              <View style={styles.institutionStats}>
                <View style={styles.institutionStat}>
                  <Text style={styles.statValue}>{inst.merchants_count}</Text>
                  <Text style={styles.statLabel}>Merchants</Text>
                </View>
                <View style={styles.institutionStat}>
                  <Text style={styles.statValue}>{formatCurrency(inst.total_volume)}</Text>
                  <Text style={styles.statLabel}>Volume</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Merchants Section */}
        {selectedInstitution && (
          <>
            <View style={styles.merchantsHeader}>
              <Text style={styles.sectionTitle}>{selectedInstitution.name} Merchants</Text>
              <TouchableOpacity
                style={styles.addMerchantBtn}
                onPress={() => { resetMerchantForm(); setShowCreateMerchantModal(true); }}
              >
                <Ionicons name="add" size={18} color={COLORS.primary} />
                <Text style={styles.addMerchantText}>Add Merchant</Text>
              </TouchableOpacity>
            </View>
            {merchants.length === 0 ? (
              <View style={styles.emptyMerchants}>
                <Text style={styles.emptyMerchantsText}>No merchants onboarded yet</Text>
              </View>
            ) : (
              merchants.map((merchant) => (
                <View key={merchant.id} style={styles.merchantCard} data-testid={`merchant-${merchant.merchant_prefix}`}>
                  <View style={styles.merchantHeader}>
                    <View>
                      <Text style={styles.merchantName}>{merchant.business_name}</Text>
                      <Text style={styles.merchantPrefix}>{merchant.merchant_prefix}</Text>
                    </View>
                    <View style={styles.merchantCategory}>
                      <Text style={styles.merchantCategoryText}>{merchant.merchant_category}</Text>
                    </View>
                  </View>
                  <View style={styles.merchantStats}>
                    <Text style={styles.merchantStat}>{merchant.total_transactions} transactions</Text>
                    <Text style={styles.merchantStat}>{formatCurrency(merchant.total_volume)}</Text>
                  </View>
                  <View style={styles.merchantActions}>
                    <TouchableOpacity style={styles.merchantAction}>
                      <Ionicons name="link" size={14} color={COLORS.secondary} />
                      <Text style={styles.merchantActionText}>Checkout Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.merchantAction}>
                      <Ionicons name="qr-code" size={14} color={COLORS.primary} />
                      <Text style={styles.merchantActionText}>QR Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Banks List */}
        <Text style={styles.sectionTitle}>Supported Banks</Text>
        <View style={styles.banksList}>
          {Object.entries(banks).map(([code, bank]: [string, any]) => (
            <View key={code} style={styles.bankItem}>
              <Text style={styles.bankCode}>{code}</Text>
              <Text style={styles.bankName}>{bank.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Institution Modal */}
      <Modal visible={showCreateInstitutionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Institution</Text>
              <TouchableOpacity onPress={() => setShowCreateInstitutionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Institution Name *</Text>
              <TextInput style={styles.input} value={instName} onChangeText={setInstName} placeholder="e.g., CRDB Bank" />
              
              <Text style={styles.inputLabel}>Short Code *</Text>
              <TextInput style={styles.input} value={instCode} onChangeText={setInstCode} placeholder="e.g., CRDB" autoCapitalize="characters" />
              
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeRow}>
                {['bank', 'mno', 'fintech'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, instType === t && styles.typeSelected]}
                    onPress={() => setInstType(t)}
                  >
                    <Text style={[styles.typeText, instType === t && styles.typeTextSelected]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Brand Color</Text>
              <View style={styles.colorRow}>
                <View style={[styles.colorPreview, { backgroundColor: instColor }]} />
                <TextInput style={[styles.input, { flex: 1 }]} value={instColor} onChangeText={setInstColor} />
              </View>
              
              <TouchableOpacity style={[styles.submitBtn, creating && styles.submitBtnDisabled]} onPress={handleCreateInstitution} disabled={creating}>
                {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Create Institution</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Merchant Modal */}
      <Modal visible={showCreateMerchantModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboard Merchant</Text>
              <TouchableOpacity onPress={() => setShowCreateMerchantModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Business Name *</Text>
              <TextInput style={styles.input} value={merchantName} onChangeText={setMerchantName} placeholder="e.g., Shoprite Tanzania" />
              
              <Text style={styles.inputLabel}>Business Email *</Text>
              <TextInput style={styles.input} value={merchantEmail} onChangeText={setMerchantEmail} placeholder="payments@business.co.tz" keyboardType="email-address" />
              
              <Text style={styles.inputLabel}>Business Phone</Text>
              <TextInput style={styles.input} value={merchantPhone} onChangeText={setMerchantPhone} placeholder="0222123456" keyboardType="phone-pad" />
              
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['retail', 'restaurant', 'services', 'ecommerce'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryOption, merchantCategory === c && styles.categorySelected]}
                    onPress={() => setMerchantCategory(c)}
                  >
                    <Text style={[styles.categoryText, merchantCategory === c && styles.categoryTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Settlement Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeOption, settlementType === 'bank' && styles.typeSelected]}
                  onPress={() => setSettlementType('bank')}
                >
                  <Text style={[styles.typeText, settlementType === 'bank' && styles.typeTextSelected]}>Bank Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, settlementType === 'mobile_money' && styles.typeSelected]}
                  onPress={() => setSettlementType('mobile_money')}
                >
                  <Text style={[styles.typeText, settlementType === 'mobile_money' && styles.typeTextSelected]}>Mobile Money</Text>
                </TouchableOpacity>
              </View>
              
              {settlementType === 'bank' && (
                <>
                  <Text style={styles.inputLabel}>Settlement Bank</Text>
                  <TextInput style={styles.input} value={settlementBank} onChangeText={setSettlementBank} placeholder="e.g., CRDB" />
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput style={styles.input} value={settlementAccount} onChangeText={setSettlementAccount} placeholder="Account number" keyboardType="numeric" />
                </>
              )}
              
              <TouchableOpacity style={[styles.submitBtn, creating && styles.submitBtnDisabled]} onPress={handleCreateMerchant} disabled={creating}>
                {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Onboard Merchant</Text>}
              </TouchableOpacity>
            </ScrollView>
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.secondaryLight, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.secondary, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16, marginTop: 8 },
  channelsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  channelCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  channelIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  channelName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  channelDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  institutionCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  institutionCardSelected: { borderColor: COLORS.primary },
  institutionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  institutionLogo: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  institutionInfo: { flex: 1, marginLeft: 12 },
  institutionName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  institutionPrefix: { fontSize: 12, color: COLORS.primary, fontFamily: 'monospace', marginTop: 2 },
  institutionBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  institutionType: { fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  institutionStats: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  institutionStat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  merchantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  addMerchantBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMerchantText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  merchantCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  merchantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  merchantName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  merchantPrefix: { fontSize: 11, color: COLORS.primary, fontFamily: 'monospace', marginTop: 2 },
  merchantCategory: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  merchantCategoryText: { fontSize: 10, fontWeight: '600', color: COLORS.primaryDark, textTransform: 'uppercase' },
  merchantStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  merchantStat: { fontSize: 12, color: COLORS.gray },
  merchantActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  merchantAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  merchantActionText: { fontSize: 12, color: COLORS.secondary },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  emptyMerchants: { backgroundColor: COLORS.white, padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyMerchantsText: { fontSize: 14, color: COLORS.gray },
  banksList: { backgroundColor: COLORS.white, borderRadius: 12, padding: 12 },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bankCode: { width: 60, fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  bankName: { flex: 1, fontSize: 14, color: COLORS.dark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  typeSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeText: { fontSize: 13, color: COLORS.gray },
  typeTextSelected: { color: COLORS.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  colorPreview: { width: 44, height: 44, borderRadius: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  categorySelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  categoryText: { fontSize: 12, color: COLORS.gray },
  categoryTextSelected: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
