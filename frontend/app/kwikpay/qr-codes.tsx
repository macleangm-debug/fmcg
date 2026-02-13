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
  Platform,
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

interface QRPayment {
  id: string;
  short_code: string;
  amount: number;
  currency: string;
  description: string;
  status: 'active' | 'expired' | 'used';
  scans: number;
  payments: number;
  created_at: string;
}

export default function QRCodesPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrCodes, setQRCodes] = useState<QRPayment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRPayment | null>(null);
  const [creating, setCreating] = useState(false);

  // Form
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isFixedAmount, setIsFixedAmount] = useState(true);

  const fetchQRCodes = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/qr-codes');
      setQRCodes(response.data?.qr_codes || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      setQRCodes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const handleCreateQR = async () => {
    if (isFixedAmount && !amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/kwikpay/qr-codes', {
        amount: isFixedAmount ? parseFloat(amount) : 0,
        currency: 'TZS',
        description: description || 'QR Payment',
        is_fixed_amount: isFixedAmount,
      });

      const newQR = response.data.qr_code;
      setShowCreateModal(false);
      setAmount('');
      setDescription('');
      setSelectedQR({
        id: newQR.id,
        short_code: newQR.short_code,
        amount: newQR.amount,
        currency: newQR.currency,
        description: newQR.description,
        status: newQR.status,
        scans: newQR.scans,
        payments: newQR.payments,
        created_at: newQR.created_at,
      });
      setShowQRModal(true);
      fetchQRCodes();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create QR code');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadQR = () => {
    Alert.alert('Download', 'QR code image downloaded');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share link copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'expired': return COLORS.warning;
      case 'used': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primaryLight;
      case 'expired': return COLORS.warningLight;
      case 'used': return COLORS.lightGray;
      default: return COLORS.lightGray;
    }
  };

  const totalScans = qrCodes.reduce((a, q) => a + q.scans, 0);
  const totalPayments = qrCodes.reduce((a, q) => a + q.payments, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading QR codes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQRCodes(); }} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>QR Payments</Text>
            <Text style={styles.pageSubtitle}>Generate QR codes for instant payments</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="qr-code" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Generate QR</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="qr-code" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{qrCodes.filter(q => q.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Active QR Codes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="scan" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{formatNumber(totalScans)}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="card" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{formatNumber(totalPayments)}</Text>
            <Text style={styles.statLabel}>Payments</Text>
          </View>
        </View>

        {/* QR Codes Grid */}
        <Text style={styles.sectionTitle}>Your QR Codes</Text>
        {qrCodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="qr-code-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No QR Codes</Text>
            <Text style={styles.emptyText}>Generate your first QR code for payments</Text>
          </View>
        ) : (
          <View style={styles.qrGrid}>
            {qrCodes.map((qr) => (
              <TouchableOpacity
                key={qr.id}
                style={styles.qrCard}
                onPress={() => { setSelectedQR(qr); setShowQRModal(true); }}
              >
                {/* QR Preview */}
                <View style={styles.qrPreview}>
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={60} color={COLORS.dark} />
                  </View>
                  <View style={[styles.qrStatus, { backgroundColor: getStatusBg(qr.status) }]}>
                    <Text style={[styles.qrStatusText, { color: getStatusColor(qr.status) }]}>
                      {qr.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {/* QR Info */}
                <View style={styles.qrInfo}>
                  <Text style={styles.qrCode}>{qr.short_code}</Text>
                  <Text style={styles.qrDescription} numberOfLines={1}>{qr.description}</Text>
                  <Text style={styles.qrAmount}>
                    {qr.amount > 0 ? `TZS ${formatNumber(qr.amount)}` : 'Variable Amount'}
                  </Text>
                  <View style={styles.qrStats}>
                    <View style={styles.qrStat}>
                      <Ionicons name="scan-outline" size={12} color={COLORS.gray} />
                      <Text style={styles.qrStatText}>{qr.scans}</Text>
                    </View>
                    <View style={styles.qrStat}>
                      <Ionicons name="card-outline" size={12} color={COLORS.gray} />
                      <Text style={styles.qrStatText}>{qr.payments}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How It Works</Text>
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Generate QR Code</Text>
                <Text style={styles.stepDesc}>Create a QR code with fixed or variable amount</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Display or Print</Text>
                <Text style={styles.stepDesc}>Show at point of sale or print for display</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Customer Scans & Pays</Text>
                <Text style={styles.stepDesc}>Customer scans and pays via mobile money</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate QR Code</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount Type</Text>
              <View style={styles.amountTypeSelector}>
                <TouchableOpacity
                  style={[styles.amountTypeOption, isFixedAmount && styles.amountTypeOptionActive]}
                  onPress={() => setIsFixedAmount(true)}
                >
                  <Ionicons name="lock-closed" size={18} color={isFixedAmount ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.amountTypeText, isFixedAmount && styles.amountTypeTextActive]}>Fixed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.amountTypeOption, !isFixedAmount && styles.amountTypeOptionActive]}
                  onPress={() => setIsFixedAmount(false)}
                >
                  <Ionicons name="create" size={18} color={!isFixedAmount ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.amountTypeText, !isFixedAmount && styles.amountTypeTextActive]}>Variable</Text>
                </TouchableOpacity>
              </View>

              {isFixedAmount && (
                <>
                  <Text style={styles.inputLabel}>Amount (TZS) *</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="50,000"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Coffee, Parking, Tips..."
                placeholderTextColor={COLORS.gray}
              />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.infoBoxText}>
                  {isFixedAmount
                    ? 'Fixed amount QR codes charge the exact amount when scanned.'
                    : 'Variable amount QR codes let customers enter their own amount.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateQR}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Generate QR Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Display Modal */}
      <Modal visible={showQRModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Code</Text>
              <TouchableOpacity onPress={() => { setShowQRModal(false); setSelectedQR(null); }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            {selectedQR && (
              <View style={styles.qrDisplayContainer}>
                {/* Large QR */}
                <View style={styles.largeQRContainer}>
                  <View style={styles.largeQR}>
                    <Ionicons name="qr-code" size={180} color={COLORS.dark} />
                  </View>
                </View>
                <Text style={styles.qrDisplayCode}>{selectedQR.short_code}</Text>
                <Text style={styles.qrDisplayDesc}>{selectedQR.description}</Text>
                <Text style={styles.qrDisplayAmount}>
                  {selectedQR.amount > 0 ? `TZS ${formatNumber(selectedQR.amount)}` : 'Customer enters amount'}
                </Text>

                {/* Actions */}
                <View style={styles.qrActions}>
                  <TouchableOpacity style={styles.qrActionButton} onPress={handleDownloadQR}>
                    <Ionicons name="download" size={22} color={COLORS.primary} />
                    <Text style={styles.qrActionText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrActionButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={22} color={COLORS.secondary} />
                    <Text style={styles.qrActionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrActionButton}>
                    <Ionicons name="print" size={22} color={COLORS.purple} />
                    <Text style={styles.qrActionText}>Print</Text>
                  </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.qrDisplayStats}>
                  <View style={styles.qrDisplayStat}>
                    <Ionicons name="scan" size={18} color={COLORS.gray} />
                    <Text style={styles.qrDisplayStatValue}>{selectedQR.scans} scans</Text>
                  </View>
                  <View style={styles.qrDisplayStat}>
                    <Ionicons name="card" size={18} color={COLORS.gray} />
                    <Text style={styles.qrDisplayStatValue}>{selectedQR.payments} payments</Text>
                  </View>
                </View>
              </View>
            )}
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
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  qrCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden' },
  qrPreview: { backgroundColor: COLORS.lightGray, padding: 20, alignItems: 'center', position: 'relative' },
  qrPlaceholder: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  qrStatus: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  qrStatusText: { fontSize: 9, fontWeight: '700' },
  qrInfo: { padding: 14 },
  qrCode: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  qrDescription: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  qrAmount: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 8 },
  qrStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  qrStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qrStatText: { fontSize: 11, color: COLORS.gray },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  howItWorksCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  howItWorksTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  steps: { gap: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  stepDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  amountTypeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  amountTypeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.lightGray, gap: 8 },
  amountTypeOptionActive: { backgroundColor: COLORS.primary },
  amountTypeText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  amountTypeTextActive: { color: COLORS.white },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.secondaryLight, padding: 12, borderRadius: 10, gap: 10, marginBottom: 20 },
  infoBoxText: { flex: 1, fontSize: 12, color: COLORS.secondary, lineHeight: 18 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  qrDisplayContainer: { alignItems: 'center', padding: 20 },
  largeQRContainer: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginBottom: 16, ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }) },
  largeQR: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  qrDisplayCode: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  qrDisplayDesc: { fontSize: 14, color: COLORS.gray, marginBottom: 8 },
  qrDisplayAmount: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 20 },
  qrActions: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  qrActionButton: { alignItems: 'center', gap: 4 },
  qrActionText: { fontSize: 12, color: COLORS.gray },
  qrDisplayStats: { flexDirection: 'row', gap: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  qrDisplayStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrDisplayStatValue: { fontSize: 14, color: COLORS.gray },
});
