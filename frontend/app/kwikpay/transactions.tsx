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
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBusinessStore } from '../../src/store/businessStore';
import { useAuthStore } from '../../src/store/authStore';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import WebModal from '../../src/components/WebModal';
import api from '../../src/api/client';
import { useKwikPayWebSocket } from '../../src/hooks/useKwikPayWebSocket';

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

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  provider: string;
  customer_email: string;
  customer_phone?: string;
  description?: string;
  created_at: string;
}

const STATUS_FILTERS = ['All', 'Succeeded', 'Pending', 'Failed', 'Refunded'];

export default function TransactionsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Default to table (list) view on web, card (grid) view on mobile
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isWeb ? 'list' : 'grid');
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Refund confirmation modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState<Transaction | null>(null);
  const [refunding, setRefunding] = useState(false);

  // Get auth store for WebSocket connection
  const { token, business } = useAuthStore();
  const businessId = business?.id || '';

  // WebSocket for real-time updates
  const { isConnected: wsConnected } = useKwikPayWebSocket({
    businessId,
    token: token || '',
    onTransaction: (data) => {
      // Add new transaction to the top of the list
      setTransactions((prev) => {
        const exists = prev.find((t) => t.id === data.id);
        if (exists) {
          // Update existing transaction
          return prev.map((t) => (t.id === data.id ? { ...t, ...data } : t));
        }
        // Add new transaction
        return [
          {
            id: data.id,
            reference: data.reference || data.id,
            amount: data.amount || 0,
            currency: data.currency || 'TZS',
            status: data.status || 'pending',
            method: data.method || '',
            provider: data.provider || '',
            customer_email: data.customer || '',
            created_at: data.created_at || new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
    onPaymentStatus: (data) => {
      // Update transaction status
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === data.payment_id ? { ...t, status: data.status } : t
        )
      );
    },
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const status = selectedStatus === 'All' ? '' : selectedStatus.toLowerCase();
      const response = await api.get(`/kwikpay/transactions?status=${status}`);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Refund handlers with confirmation
  const handleRefundPress = (transaction: Transaction) => {
    setTransactionToRefund(transaction);
    setShowRefundModal(true);
  };

  const handleRefundConfirm = async () => {
    if (!transactionToRefund) return;
    
    setRefunding(true);
    try {
      await api.post(`/kwikpay/transactions/${transactionToRefund.id}/refund`);
      fetchTransactions();
      setShowRefundModal(false);
      setShowDetailModal(false);
      setTransactionToRefund(null);
    } catch (error) {
      console.error('Failed to refund:', error);
      if (Platform.OS === 'web') {
        alert('Failed to process refund. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to process refund. Please try again.');
      }
    } finally {
      setRefunding(false);
    }
  };

  const handleRefundCancel = () => {
    setShowRefundModal(false);
    setTransactionToRefund(null);
  };

  // Delete transaction handlers
  const handleDeletePress = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/kwikpay/transactions/${transactionToDelete.id}`);
      fetchTransactions();
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete transaction. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete transaction. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'succeeded': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.danger;
      case 'refunded': return COLORS.blue;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'succeeded': return COLORS.successLight;
      case 'pending': return COLORS.warningLight;
      case 'failed': return COLORS.dangerLight;
      case 'refunded': return COLORS.blueLight;
      default: return COLORS.lightGray;
    }
  };

  const formatAmount = (amount: number, currency: string = 'TZS') => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const transactionCount = transactions.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  // Table View (for web - list mode)
  const renderTableView = () => (
    <View style={styles.tableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Reference</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Customer</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Method</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Actions</Text>
      </View>
      {/* Table Rows */}
      {transactions.map((txn) => (
        <View key={txn.id} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.2 }]}>{txn.reference || txn.id}</Text>
          <Text style={[styles.tableCell, { flex: 1.5 }]}>{txn.customer_email || 'N/A'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={(txn.method || '').toLowerCase().includes('card') ? 'card' : 'phone-portrait'}
              size={14}
              color={COLORS.gray}
            />
            <Text style={styles.tableCell}>{txn.method || 'Unknown'}</Text>
          </View>
          <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1 }]}>{formatAmount(txn.amount || 0, txn.currency)}</Text>
          <View style={{ flex: 0.8 }}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(txn.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(txn.status) }]}>
                {(txn.status || 'Unknown').charAt(0).toUpperCase() + (txn.status || 'unknown').slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.tableCell, { flex: 1 }]}>{txn.created_at}</Text>
          <View style={{ flex: 0.5, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedTransaction(txn);
                setShowDetailModal(true);
              }}
            >
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            {(txn.status || '').toLowerCase() === 'succeeded' && (
              <TouchableOpacity onPress={() => handleRefundPress(txn)}>
                <Ionicons name="return-down-back-outline" size={18} color={COLORS.warning} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDeletePress(txn)}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  // Card/Grid View (for mobile or when selected) - 3 equal columns on web
  const renderCardView = () => (
    <View style={[styles.cardContainer, isWeb && styles.cardContainerWeb]}>
      {transactions.map((txn) => (
        <TouchableOpacity
          key={txn.id}
          style={[styles.transactionCard, isWeb && styles.transactionCardWeb]}
          onPress={() => {
            setSelectedTransaction(txn);
            setShowDetailModal(true);
          }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.transactionIcon, {
              backgroundColor: (txn.method || '').toLowerCase().includes('card') ? COLORS.blueLight : COLORS.successLight
            }]}>
              <Ionicons
                name={(txn.method || '').toLowerCase().includes('card') ? 'card' : 'phone-portrait'}
                size={20}
                color={(txn.method || '').toLowerCase().includes('card') ? COLORS.blue : COLORS.success}
              />
            </View>
            <TouchableOpacity 
              style={styles.cardDeleteBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePress(txn);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.transactionRef} numberOfLines={1}>{txn.reference || txn.id}</Text>
            <Text style={styles.transactionMeta} numberOfLines={1}>{txn.method || 'Unknown'}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.transactionAmountCard}>{formatAmount(txn.amount || 0, txn.currency)}</Text>
              <View style={[styles.statusBadgeCard, { backgroundColor: getStatusBg(txn.status) }]}>
                <Text style={[styles.statusTextCard, { color: getStatusColor(txn.status) }]}>
                  {(txn.status || 'Unknown').charAt(0).toUpperCase() + (txn.status || 'unknown').slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

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
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Transactions</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.pageSubtitle}>{transactionCount} transaction(s)</Text>
              {wsConnected && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* View Toggle */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('grid')}
              >
                <Ionicons name="grid-outline" size={18} color={viewMode === 'grid' ? COLORS.white : COLORS.gray} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? COLORS.white : COLORS.gray} />
              </TouchableOpacity>
            </View>
            {/* New Transaction Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/kwikpay/checkout')}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>New Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <View style={styles.filterTabs}>
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
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>
        </View>

        {/* Content */}
        {transactionCount === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="swap-horizontal-outline" size={48} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyText}>Create your first transaction to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/kwikpay/checkout')}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.emptyButtonText}>Create Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Render based on view mode */
          viewMode === 'list' ? renderTableView() : renderCardView()
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Transaction Detail Modal */}
      <WebModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Transaction Details"
        icon="receipt-outline"
        iconColor={COLORS.primary}
        maxWidth={480}
      >
        {selectedTransaction && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue}>{selectedTransaction.reference || selectedTransaction.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValueLarge}>
                {formatAmount(selectedTransaction.amount || 0, selectedTransaction.currency)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedTransaction.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(selectedTransaction.status) }]}>
                  {(selectedTransaction.status || 'Unknown').charAt(0).toUpperCase() + (selectedTransaction.status || 'unknown').slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Method</Text>
              <Text style={styles.detailValue}>{selectedTransaction.method || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Provider</Text>
              <Text style={styles.detailValue}>{selectedTransaction.provider || 'KwikPay'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer Email</Text>
              <Text style={styles.detailValue}>{selectedTransaction.customer_email || 'N/A'}</Text>
            </View>
            {selectedTransaction.customer_phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer Phone</Text>
                <Text style={styles.detailValue}>{selectedTransaction.customer_phone}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{selectedTransaction.created_at}</Text>
            </View>

            {(selectedTransaction.status || '').toLowerCase() === 'succeeded' && (
              <TouchableOpacity
                style={styles.refundButton}
                onPress={() => handleRefundPress(selectedTransaction)}
              >
                <Ionicons name="return-down-back" size={18} color={COLORS.white} />
                <Text style={styles.refundButtonText}>Process Refund</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </WebModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Transaction"
        message={transactionToDelete ? `Are you sure you want to delete transaction "${transactionToDelete.reference || transactionToDelete.id}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
        loading={deleting}
      />

      {/* Refund Confirmation Modal */}
      <ConfirmationModal
        visible={showRefundModal}
        title="Process Refund"
        message={transactionToRefund ? `Are you sure you want to refund ${formatAmount(transactionToRefund.amount || 0, transactionToRefund.currency)} to ${transactionToRefund.customer_email || 'the customer'}? This will reverse the payment.` : ''}
        confirmLabel="Refund"
        cancelLabel="Cancel"
        onConfirm={handleRefundConfirm}
        onCancel={handleRefundCancel}
        variant="warning"
        icon="return-down-back-outline"
        loading={refunding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
  },
  viewToggleBtn: {
    padding: 10,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    minWidth: 250,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  // Table Styles
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    fontSize: 13,
    color: COLORS.dark,
  },
  tableCellBold: {
    fontWeight: '600',
  },
  // Card Styles - 3 Column Grid Layout
  cardContainer: {
    gap: 12,
  },
  cardContainerWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  transactionCardWeb: {
    width: 'calc(33.333% - 11px)' as any,
    minWidth: 280,
    maxWidth: 400,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    marginTop: 4,
  },
  transactionRef: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 13,
    color: COLORS.gray,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  transactionAmountCard: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statusBadgeCard: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextCard: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  detailValueLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  refundButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
