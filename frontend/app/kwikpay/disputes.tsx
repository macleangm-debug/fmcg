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

interface Refund {
  refund_id: string;
  transaction_id: string;
  original_amount: number;
  refund_amount: number;
  currency: string;
  reason: string;
  status: string;
  customer_email: string;
  created_at: string;
}

const STATUS_FILTERS = ['All', 'Pending', 'Processing', 'Completed', 'Failed'];

export default function DisputesPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  // Refund form
  const [transactionId, setTransactionId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const fetchRefunds = useCallback(async () => {
    try {
      const status = selectedStatus === 'All' ? '' : selectedStatus.toLowerCase();
      const response = await api.get(`/kwikpay/refunds${status ? `?status=${status}` : ''}`);
      setRefunds(response.data?.refunds || []);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      setRefunds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleInitiateRefund = async () => {
    if (!transactionId) {
      Alert.alert('Error', 'Please enter transaction ID');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/refunds', {
        transaction_id: transactionId,
        amount: refundAmount ? parseFloat(refundAmount) : null,
        reason: refundReason || 'Customer request',
      });
      Alert.alert('Success', 'Refund initiated successfully');
      setShowRefundModal(false);
      resetForm();
      fetchRefunds();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to initiate refund');
    } finally {
      setCreating(false);
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    try {
      await api.post(`/kwikpay/refunds/${refundId}/process`);
      Alert.alert('Success', 'Refund processed successfully');
      fetchRefunds();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process refund');
    }
  };

  const resetForm = () => {
    setTransactionId('');
    setRefundAmount('');
    setRefundReason('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'processing': return COLORS.secondary;
      case 'completed': return COLORS.primary;
      case 'failed': return COLORS.danger;
      case 'cancelled': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warningLight;
      case 'processing': return COLORS.secondaryLight;
      case 'completed': return COLORS.primaryLight;
      case 'failed': return COLORS.dangerLight;
      case 'cancelled': return COLORS.lightGray;
      default: return COLORS.lightGray;
    }
  };

  const totalRefunded = refunds.filter(r => r.status === 'completed').reduce((a, r) => a + r.refund_amount, 0);
  const pendingRefunds = refunds.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRefunds} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Disputes & Refunds</Text>
            <Text style={styles.pageSubtitle}>Manage payment disputes and refunds</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowRefundModal(true)}
          >
            <Ionicons name="return-down-back" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Refund</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            </View>
            <Text style={styles.statValue}>{pendingRefunds}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{refunds.filter(r => r.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="cash" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(totalRefunded)}</Text>
            <Text style={styles.statLabel}>Total Refunded</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STATUS_FILTERS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterTab, selectedStatus === status && styles.filterTabActive]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.filterTabText, selectedStatus === status && styles.filterTabTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Refunds List */}
        <Text style={styles.sectionTitle}>Refund Requests</Text>
        {refunds.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Disputes</Text>
            <Text style={styles.emptyText}>All payments are in good standing</Text>
          </View>
        ) : (
          refunds.map((refund) => (
            <TouchableOpacity
              key={refund.refund_id}
              style={styles.refundCard}
              onPress={() => setSelectedRefund(refund)}
            >
              <View style={styles.refundHeader}>
                <View>
                  <Text style={styles.refundId}>#{refund.refund_id.slice(0, 12)}</Text>
                  <Text style={styles.refundEmail}>{refund.customer_email || 'Unknown'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(refund.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(refund.status) }]}>
                    {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.refundDetails}>
                <View style={styles.refundDetail}>
                  <Text style={styles.refundLabel}>Original</Text>
                  <Text style={styles.refundValue}>TZS {formatNumber(refund.original_amount)}</Text>
                </View>
                <View style={styles.refundDetail}>
                  <Text style={styles.refundLabel}>Refund</Text>
                  <Text style={[styles.refundValue, { color: COLORS.danger }]}>TZS {formatNumber(refund.refund_amount)}</Text>
                </View>
              </View>
              <Text style={styles.refundReason}>{refund.reason || 'No reason provided'}</Text>
              <View style={styles.refundFooter}>
                <Text style={styles.refundDate}>{new Date(refund.created_at).toLocaleDateString()}</Text>
                {refund.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.processButton}
                    onPress={() => handleProcessRefund(refund.refund_id)}
                  >
                    <Ionicons name="play" size={14} color={COLORS.white} />
                    <Text style={styles.processButtonText}>Process</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Refund Modal */}
      <Modal visible={showRefundModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Refund</Text>
              <TouchableOpacity onPress={() => setShowRefundModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Transaction ID *</Text>
              <TextInput
                style={styles.input}
                value={transactionId}
                onChangeText={setTransactionId}
                placeholder="Enter transaction ID"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Refund Amount (Optional - leave blank for full refund)</Text>
              <TextInput
                style={styles.input}
                value={refundAmount}
                onChangeText={setRefundAmount}
                placeholder="50,000"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="Reason for refund..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleInitiateRefund}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="return-down-back" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Initiate Refund</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Refund Detail Modal */}
      <Modal visible={!!selectedRefund} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refund Details</Text>
              <TouchableOpacity onPress={() => setSelectedRefund(null)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            {selectedRefund && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Refund ID</Text>
                  <Text style={styles.detailValue}>{selectedRefund.refund_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <Text style={styles.detailValue}>{selectedRefund.transaction_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedRefund.customer_email || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Original Amount</Text>
                  <Text style={styles.detailValue}>TZS {formatNumber(selectedRefund.original_amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Refund Amount</Text>
                  <Text style={[styles.detailValue, { color: COLORS.danger }]}>TZS {formatNumber(selectedRefund.refund_amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedRefund.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedRefund.status) }]}>
                      {selectedRefund.status.charAt(0).toUpperCase() + selectedRefund.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason</Text>
                  <Text style={styles.detailValue}>{selectedRefund.reason || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{new Date(selectedRefund.created_at).toLocaleString()}</Text>
                </View>

                {selectedRefund.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      handleProcessRefund(selectedRefund.refund_id);
                      setSelectedRefund(null);
                    }}
                  >
                    <Ionicons name="play" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Process Refund</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
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
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  filtersRow: { marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, marginRight: 8 },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  filterTabTextActive: { color: COLORS.white },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  refundCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  refundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  refundId: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  refundEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  refundDetails: { flexDirection: 'row', gap: 24, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  refundDetail: {},
  refundLabel: { fontSize: 11, color: COLORS.gray },
  refundValue: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginTop: 2 },
  refundReason: { fontSize: 13, color: COLORS.gray, fontStyle: 'italic', marginBottom: 12 },
  refundFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundDate: { fontSize: 12, color: COLORS.gray },
  processButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  processButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
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
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.gray },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.dark, maxWidth: '60%', textAlign: 'right' },
});
