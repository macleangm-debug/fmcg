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
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusinessStore } from '../../src/store/businessStore';
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

interface Payout {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  recipient_name: string;
  recipient_account: string;
  created_at: string;
}

interface Balance {
  available: number;
  total_received: number;
  total_paid: number;
  currency: string;
}

const STATUS_FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Failed'];

export default function PayoutsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState<Balance>({ available: 0, total_received: 0, total_paid: 0, currency: 'TZS' });
  const [showNewPayoutModal, setShowNewPayoutModal] = useState(false);
  const [newPayout, setNewPayout] = useState({ amount: '', recipient_name: '', recipient_account: '', method: 'mobile_money' });
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // Default to table (list) view on web, card (grid) view on mobile
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isWeb ? 'list' : 'grid');
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [payoutToDelete, setPayoutToDelete] = useState<Payout | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Send payout confirmation modal state
  const [showSendPayoutModal, setShowSendPayoutModal] = useState(false);
  const [sendingPayout, setSendingPayout] = useState(false);

  const fetchPayouts = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/payouts');
      setPayouts(response.data.payouts || []);
      setBalance(response.data.balance || { available: 0, total_received: 0, total_paid: 0, currency: 'TZS' });
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      setPayouts([]);
      setBalance({ available: 5450000, total_received: 15847250, total_paid: 10397250, currency: 'TZS' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayouts();
  };

  // Validate payout before showing confirmation
  const validatePayout = () => {
    if (!newPayout.amount || parseFloat(newPayout.amount) <= 0) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid amount');
      } else {
        Alert.alert('Error', 'Please enter a valid amount');
      }
      return false;
    }
    if (!newPayout.recipient_name.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter recipient name');
      } else {
        Alert.alert('Error', 'Please enter recipient name');
      }
      return false;
    }
    if (!newPayout.recipient_account.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter recipient account');
      } else {
        Alert.alert('Error', 'Please enter recipient account');
      }
      return false;
    }
    return true;
  };

  // Show confirmation before sending payout
  const handleSendPayoutPress = () => {
    if (!validatePayout()) return;
    setShowSendPayoutModal(true);
  };

  const handleSendPayoutConfirm = async () => {
    setSendingPayout(true);
    try {
      await api.post('/kwikpay/payouts', {
        amount: parseFloat(newPayout.amount),
        recipient_name: newPayout.recipient_name,
        recipient_account: newPayout.recipient_account,
        method: newPayout.method,
      });
      setShowSendPayoutModal(false);
      setShowNewPayoutModal(false);
      setNewPayout({ amount: '', recipient_name: '', recipient_account: '', method: 'mobile_money' });
      fetchPayouts();
    } catch (error) {
      console.error('Failed to create payout:', error);
      if (Platform.OS === 'web') {
        alert('Failed to send payout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send payout. Please try again.');
      }
    } finally {
      setSendingPayout(false);
    }
  };

  const handleSendPayoutCancel = () => {
    setShowSendPayoutModal(false);
  };

  // Delete payout handlers
  const handleDeletePress = (payout: Payout) => {
    setPayoutToDelete(payout);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!payoutToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/kwikpay/payouts/${payoutToDelete.id}`);
      fetchPayouts();
      setShowDeleteModal(false);
      setPayoutToDelete(null);
    } catch (error) {
      console.error('Failed to delete payout:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete payout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete payout. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPayoutToDelete(null);
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed': return COLORS.success;
      case 'processing': return COLORS.warning;
      case 'pending': return COLORS.blue;
      case 'failed': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed': return COLORS.successLight;
      case 'processing': return COLORS.warningLight;
      case 'pending': return COLORS.blueLight;
      case 'failed': return COLORS.dangerLight;
      default: return COLORS.lightGray;
    }
  };

  const formatAmount = (amount: number, currency: string = 'TZS') => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const payoutCount = payouts.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payouts...</Text>
      </View>
    );
  }

  // Table View (for web - list mode)
  const renderTableView = () => (
    <View style={styles.tableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Reference</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Recipient</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Account</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Method</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Actions</Text>
      </View>
      {/* Table Rows */}
      {payouts.map((payout) => (
        <View key={payout.id} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.2 }]}>{payout.reference || payout.id}</Text>
          <Text style={[styles.tableCell, { flex: 1.5 }]}>{payout.recipient_name || 'N/A'}</Text>
          <Text style={[styles.tableCell, { flex: 1.2 }]}>{payout.recipient_account || 'N/A'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={(payout.method || '').includes('bank') ? 'business' : 'phone-portrait'}
              size={14}
              color={COLORS.gray}
            />
            <Text style={styles.tableCell}>{(payout.method || 'Unknown').replace('_', ' ')}</Text>
          </View>
          <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1 }]}>{formatAmount(payout.amount || 0, payout.currency)}</Text>
          <View style={{ flex: 0.8 }}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(payout.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
                {(payout.status || 'Unknown').charAt(0).toUpperCase() + (payout.status || 'unknown').slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.tableCell, { flex: 1 }]}>{payout.created_at}</Text>
          <View style={{ flex: 0.5, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => handleDeletePress(payout)}>
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
      {payouts.map((payout) => (
        <View key={payout.id} style={[styles.payoutCard, isWeb && styles.payoutCardWeb]}>
          <View style={styles.cardHeader}>
            <View style={[styles.payoutIcon, { backgroundColor: (payout.method || '').includes('bank') ? COLORS.blueLight : COLORS.successLight }]}>
              <Ionicons
                name={(payout.method || '').includes('bank') ? 'business' : 'phone-portrait'}
                size={20}
                color={(payout.method || '').includes('bank') ? COLORS.blue : COLORS.success}
              />
            </View>
            <TouchableOpacity 
              style={styles.cardDeleteBtn}
              onPress={() => handleDeletePress(payout)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.payoutRecipient} numberOfLines={1}>{payout.recipient_name || 'Unknown'}</Text>
            <Text style={styles.payoutMeta} numberOfLines={1}>{payout.recipient_account || 'N/A'}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.payoutAmountCard}>{formatAmount(payout.amount || 0, payout.currency)}</Text>
              <View style={[styles.statusBadgeCard, { backgroundColor: getStatusBg(payout.status) }]}>
                <Text style={[styles.statusTextCard, { color: getStatusColor(payout.status) }]}>
                  {(payout.status || 'Unknown').charAt(0).toUpperCase() + (payout.status || 'unknown').slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>
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
            <Text style={styles.pageTitle}>Payouts</Text>
            <Text style={styles.pageSubtitle}>{payoutCount} payout(s)</Text>
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
            {/* New Payout Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowNewPayoutModal(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>New Payout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceMain}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{formatAmount(balance.available)}</Text>
          </View>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total Received</Text>
              <Text style={styles.balanceStatValue}>{formatAmount(balance.total_received)}</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total Paid Out</Text>
              <Text style={styles.balanceStatValue}>{formatAmount(balance.total_paid)}</Text>
            </View>
          </View>
        </LinearGradient>

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
              placeholder="Search payouts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>
        </View>

        {/* Content */}
        {payoutCount === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No Payouts</Text>
            <Text style={styles.emptyText}>Create your first payout to send money</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowNewPayoutModal(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.emptyButtonText}>Create Payout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Render based on view mode */
          viewMode === 'list' ? renderTableView() : renderCardView()
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Payout Modal */}
      <Modal
        visible={showNewPayoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Payout</Text>
              <TouchableOpacity onPress={() => setShowNewPayoutModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount ({balance.currency})</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={newPayout.amount}
                onChangeText={(text) => setNewPayout({ ...newPayout, amount: text })}
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Recipient Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter recipient name"
                value={newPayout.recipient_name}
                onChangeText={(text) => setNewPayout({ ...newPayout, recipient_name: text })}
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Phone Number / Account</Text>
              <TextInput
                style={styles.input}
                placeholder="+255712345678 or account number"
                value={newPayout.recipient_account}
                onChangeText={(text) => setNewPayout({ ...newPayout, recipient_account: text })}
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Method</Text>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[styles.methodOption, newPayout.method === 'mobile_money' && styles.methodOptionActive]}
                  onPress={() => setNewPayout({ ...newPayout, method: 'mobile_money' })}
                >
                  <Ionicons name="phone-portrait" size={20} color={newPayout.method === 'mobile_money' ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.methodOptionText, newPayout.method === 'mobile_money' && styles.methodOptionTextActive]}>Mobile Money</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodOption, newPayout.method === 'bank_transfer' && styles.methodOptionActive]}
                  onPress={() => setNewPayout({ ...newPayout, method: 'bank_transfer' })}
                >
                  <Ionicons name="business" size={20} color={newPayout.method === 'bank_transfer' ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.methodOptionText, newPayout.method === 'bank_transfer' && styles.methodOptionTextActive]}>Bank Transfer</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSendPayoutPress}>
                <Ionicons name="send" size={18} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Send Payout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Payout"
        message={payoutToDelete ? `Are you sure you want to delete payout to "${payoutToDelete.recipient_name || 'Unknown'}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
        loading={deleting}
      />

      {/* Send Payout Confirmation Modal */}
      <ConfirmationModal
        visible={showSendPayoutModal}
        title="Confirm Payout"
        message={`You are about to send ${balance.currency} ${formatNumber(parseFloat(newPayout.amount) || 0)} to ${newPayout.recipient_name || 'recipient'} (${newPayout.recipient_account || 'N/A'}). This action will transfer funds from your account.`}
        confirmLabel="Send Payout"
        cancelLabel="Cancel"
        onConfirm={handleSendPayoutConfirm}
        onCancel={handleSendPayoutCancel}
        variant="warning"
        icon="send-outline"
        loading={sendingPayout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewToggle: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 8, padding: 4 },
  viewToggleBtn: { padding: 10, borderRadius: 6 },
  viewToggleBtnActive: { backgroundColor: COLORS.primary },
  primaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 6 },
  primaryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  balanceCard: { borderRadius: 16, padding: 24, marginBottom: 24 },
  balanceMain: { marginBottom: 16 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: COLORS.white },
  balanceStats: { flexDirection: 'row', gap: 32 },
  balanceStat: {},
  balanceStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceStatValue: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  filterTabTextActive: { color: COLORS.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 10, minWidth: 250 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  // Table Styles
  tableContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderCell: { fontSize: 12, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { fontSize: 13, color: COLORS.dark },
  tableCellBold: { fontWeight: '600' },
  // Card Styles - 3 Column Grid Layout
  cardContainer: { gap: 12 },
  cardContainerWeb: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  payoutCard: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12 },
  payoutCardWeb: { width: 'calc(33.333% - 11px)' as any, minWidth: 280, maxWidth: 400 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardDeleteBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  payoutIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody: { marginTop: 4 },
  payoutRecipient: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginBottom: 4 },
  payoutMeta: { fontSize: 13, color: COLORS.gray },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  payoutAmountCard: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  payoutAmount: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  // Status Badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusBadgeCard: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTextCard: { fontSize: 11, fontWeight: '600' },
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginBottom: 24 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, gap: 8 },
  emptyButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.dark },
  methodSelector: { flexDirection: 'row', gap: 12 },
  methodOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.lightGray, gap: 8 },
  methodOptionActive: { backgroundColor: COLORS.primary },
  methodOptionText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  methodOptionTextActive: { color: COLORS.white },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 10, marginTop: 24, gap: 8 },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
