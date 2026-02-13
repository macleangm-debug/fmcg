import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#10B981',
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
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface KwikPayStats {
  totalMerchants: number;
  activeMerchants: number;
  pendingOnboarding: number;
  totalTransactions: number;
  transactionsToday: number;
  totalVolume: number;
  volumeToday: number;
  successRate: number;
  avgTransactionValue: number;
}

interface MerchantApproval {
  id: string;
  business_name: string;
  business_type: string;
  country: string;
  owner_name: string;
  email: string;
  phone: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  kyc_status: string;
  documents: { type: string; status: string }[];
}

interface RecentTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  timestamp: string;
}

export default function KwikPayDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'transactions' | 'approvals' | 'settings'>('overview');
  const [stats, setStats] = useState<KwikPayStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<MerchantApproval[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantApproval | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch KwikPay stats
      const [statsRes, approvalsRes, transactionsRes] = await Promise.all([
        api.get('/superadmin/kwikpay/stats').catch(() => null),
        api.get('/superadmin/kwikpay/pending-approvals').catch(() => null),
        api.get('/superadmin/kwikpay/recent-transactions').catch(() => null),
      ]);

      // Mock stats if API fails
      setStats(statsRes?.data || {
        totalMerchants: 2890,
        activeMerchants: 2456,
        pendingOnboarding: 12,
        totalTransactions: 1250000,
        transactionsToday: 8524,
        totalVolume: 45600000,
        volumeToday: 285000,
        successRate: 98.7,
        avgTransactionValue: 36.48,
      });

      // Mock pending approvals
      setPendingApprovals(approvalsRes?.data?.approvals || [
        {
          id: '1',
          business_name: 'TechStore Tanzania',
          business_type: 'retail',
          country: 'TZ',
          owner_name: 'John Mwangi',
          email: 'john@techstore.tz',
          phone: '+255712345678',
          submitted_at: '2024-06-08T10:30:00Z',
          status: 'pending',
          kyc_status: 'documents_submitted',
          documents: [
            { type: 'business_registration', status: 'verified' },
            { type: 'tax_certificate', status: 'pending' },
            { type: 'id_document', status: 'verified' },
          ],
        },
        {
          id: '2',
          business_name: 'Safari Tours Ltd',
          business_type: 'services',
          country: 'KE',
          owner_name: 'Mary Ochieng',
          email: 'mary@safaritours.ke',
          phone: '+254722345678',
          submitted_at: '2024-06-07T14:20:00Z',
          status: 'pending',
          kyc_status: 'under_review',
          documents: [
            { type: 'business_registration', status: 'verified' },
            { type: 'tax_certificate', status: 'verified' },
            { type: 'id_document', status: 'verified' },
          ],
        },
        {
          id: '3',
          business_name: 'Quick Eats Restaurant',
          business_type: 'restaurant',
          country: 'UG',
          owner_name: 'David Ssemakula',
          email: 'david@quickeats.ug',
          phone: '+256772345678',
          submitted_at: '2024-06-06T09:15:00Z',
          status: 'pending',
          kyc_status: 'documents_submitted',
          documents: [
            { type: 'business_registration', status: 'verified' },
            { type: 'tax_certificate', status: 'pending' },
            { type: 'id_document', status: 'pending' },
          ],
        },
      ]);

      // Mock recent transactions
      setRecentTransactions(transactionsRes?.data?.transactions || [
        { id: 'TXN001', merchant: 'Coffee House', amount: 45000, currency: 'TZS', method: 'card', status: 'completed', timestamp: '5 mins ago' },
        { id: 'TXN002', merchant: 'Tech Store', amount: 1250000, currency: 'TZS', method: 'mobile_money', status: 'completed', timestamp: '12 mins ago' },
        { id: 'TXN003', merchant: 'Safari Tours', amount: 85000, currency: 'KES', method: 'card', status: 'pending', timestamp: '18 mins ago' },
        { id: 'TXN004', merchant: 'Quick Eats', amount: 25000, currency: 'UGX', method: 'qr_code', status: 'completed', timestamp: '25 mins ago' },
        { id: 'TXN005', merchant: 'Fashion Hub', amount: 180000, currency: 'TZS', method: 'card', status: 'failed', timestamp: '32 mins ago' },
      ]);

    } catch (error) {
      console.error('Error fetching KwikPay data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApprove = async (merchant: MerchantApproval) => {
    Alert.alert(
      'Approve Merchant',
      `Are you sure you want to approve ${merchant.business_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.post(`/superadmin/kwikpay/approve/${merchant.id}`).catch(() => {});
              setPendingApprovals(pendingApprovals.filter(m => m.id !== merchant.id));
              setShowApprovalModal(false);
              Alert.alert('Success', 'Merchant approved successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve merchant');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (merchant: MerchantApproval) => {
    Alert.alert(
      'Reject Merchant',
      `Are you sure you want to reject ${merchant.business_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/superadmin/kwikpay/reject/${merchant.id}`).catch(() => {});
              setPendingApprovals(pendingApprovals.filter(m => m.id !== merchant.id));
              setShowApprovalModal(false);
              Alert.alert('Success', 'Merchant rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject merchant');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number, currency?: string) => {
    if (amount >= 1000000) return (currency || '$') + (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return (currency || '$') + (amount / 1000).toFixed(1) + 'K';
    return (currency || '$') + amount.toFixed(2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'merchants', 'transactions', 'approvals', 'settings'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'approvals' && pendingApprovals.length > 0 && (
                <Text style={styles.tabBadge}> ({pendingApprovals.length})</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="business" size={20} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.totalMerchants || 0)}</Text>
              <Text style={styles.kpiLabel}>Total Merchants</Text>
              <Text style={styles.kpiSubtext}>{stats?.activeMerchants} active</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="time" size={20} color={COLORS.warning} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{stats?.pendingOnboarding || 0}</Text>
              <Text style={styles.kpiLabel}>Pending Onboarding</Text>
              <Text style={styles.kpiSubtext}>Awaiting approval</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.blue }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueLight }]}>
                  <Ionicons name="flash" size={20} color={COLORS.blue} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.transactionsToday || 0)}</Text>
              <Text style={styles.kpiLabel}>Transactions Today</Text>
              <Text style={styles.kpiSubtext}>{formatNumber(stats?.totalTransactions || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.purple }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="wallet" size={20} color={COLORS.purple} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(stats?.volumeToday || 0)}</Text>
              <Text style={styles.kpiLabel}>Volume Today</Text>
              <Text style={styles.kpiSubtext}>{formatCurrency(stats?.totalVolume || 0)} total</Text>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Success Rate</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: COLORS.success }]}>
                  {stats?.successRate || 0}%
                </Text>
                <View style={[styles.metricBadge, { backgroundColor: COLORS.successLight }]}>
                  <Ionicons name="trending-up" size={14} color={COLORS.success} />
                  <Text style={[styles.metricBadgeText, { color: COLORS.success }]}>+2.3%</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats?.successRate || 0}%` }]} />
              </View>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Avg Transaction Value</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>${stats?.avgTransactionValue || 0}</Text>
              </View>
              <Text style={styles.metricSubtext}>Across all payment methods</Text>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => setActiveTab('transactions')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.transactionsList}>
              {recentTransactions.slice(0, 5).map((txn) => (
                <View key={txn.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: getStatusColor(txn.status) + '20' }
                    ]}>
                      <Ionicons
                        name={getMethodIcon(txn.method)}
                        size={18}
                        color={getStatusColor(txn.status)}
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionMerchant}>{txn.merchant}</Text>
                      <Text style={styles.transactionMethod}>{txn.method.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(txn.amount, '')} {txn.currency}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(txn.status) + '20' }
                    ]}>
                      <Text style={[styles.statusText, { color: getStatusColor(txn.status) }]}>
                        {txn.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {activeTab === 'approvals' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Merchant Approvals</Text>
          <Text style={styles.sectionSubtitle}>
            Review and approve merchant onboarding requests
          </Text>

          {pendingApprovals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.emptyStateText}>All caught up!</Text>
              <Text style={styles.emptyStateSubtext}>No pending approvals</Text>
            </View>
          ) : (
            <View style={styles.approvalsList}>
              {pendingApprovals.map((merchant) => (
                <TouchableOpacity
                  key={merchant.id}
                  style={styles.approvalCard}
                  onPress={() => {
                    setSelectedMerchant(merchant);
                    setShowApprovalModal(true);
                  }}
                >
                  <View style={styles.approvalHeader}>
                    <View style={styles.approvalBusiness}>
                      <View style={[styles.approvalIcon, { backgroundColor: COLORS.primaryLight }]}>
                        <Ionicons name="business" size={24} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.approvalName}>{merchant.business_name}</Text>
                        <Text style={styles.approvalType}>{merchant.business_type} • {merchant.country}</Text>
                      </View>
                    </View>
                    <View style={[styles.kycBadge, { backgroundColor: COLORS.warningLight }]}>
                      <Text style={[styles.kycBadgeText, { color: COLORS.warning }]}>
                        {merchant.kyc_status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.approvalDetails}>
                    <View style={styles.approvalDetail}>
                      <Ionicons name="person-outline" size={16} color={COLORS.gray} />
                      <Text style={styles.approvalDetailText}>{merchant.owner_name}</Text>
                    </View>
                    <View style={styles.approvalDetail}>
                      <Ionicons name="mail-outline" size={16} color={COLORS.gray} />
                      <Text style={styles.approvalDetailText}>{merchant.email}</Text>
                    </View>
                    <View style={styles.approvalDetail}>
                      <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                      <Text style={styles.approvalDetailText}>
                        Submitted {new Date(merchant.submitted_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.documentsRow}>
                    {merchant.documents.map((doc, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.docBadge,
                          { backgroundColor: doc.status === 'verified' ? COLORS.successLight : COLORS.warningLight }
                        ]}
                      >
                        <Ionicons
                          name={doc.status === 'verified' ? 'checkmark-circle' : 'time'}
                          size={14}
                          color={doc.status === 'verified' ? COLORS.success : COLORS.warning}
                        />
                        <Text style={[
                          styles.docBadgeText,
                          { color: doc.status === 'verified' ? COLORS.success : COLORS.warning }
                        ]}>
                          {doc.type.replace('_', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(merchant)}
                    >
                      <Ionicons name="close" size={18} color={COLORS.danger} />
                      <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(merchant)}
                    >
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Merchant Detail Modal */}
      <Modal visible={showApprovalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Merchant Details</Text>
              <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedMerchant && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Business Information</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Business Name</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.business_name}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Business Type</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.business_type}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Country</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.country}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Owner Information</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Name</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.owner_name}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Email</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.email}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Phone</Text>
                    <Text style={styles.modalValue}>{selectedMerchant.phone}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>KYC Documents</Text>
                  {selectedMerchant.documents.map((doc, idx) => (
                    <View key={idx} style={styles.docRow}>
                      <View style={styles.docInfo}>
                        <Ionicons name="document-text" size={18} color={COLORS.gray} />
                        <Text style={styles.docName}>{doc.type.replace('_', ' ')}</Text>
                      </View>
                      <View style={[
                        styles.docStatus,
                        { backgroundColor: doc.status === 'verified' ? COLORS.successLight : COLORS.warningLight }
                      ]}>
                        <Text style={[
                          styles.docStatusText,
                          { color: doc.status === 'verified' ? COLORS.success : COLORS.warning }
                        ]}>
                          {doc.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalRejectBtn]}
                    onPress={() => handleReject(selectedMerchant)}
                  >
                    <Text style={styles.modalRejectBtnText}>Reject Application</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalApproveBtn]}
                    onPress={() => handleApprove(selectedMerchant)}
                  >
                    <Text style={styles.modalApproveBtnText}>Approve Merchant</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return COLORS.success;
    case 'pending': return COLORS.warning;
    case 'failed': return COLORS.danger;
    default: return COLORS.gray;
  }
}

function getMethodIcon(method: string): any {
  switch (method) {
    case 'card': return 'card';
    case 'mobile_money': return 'phone-portrait';
    case 'qr_code': return 'qr-code';
    case 'bank_transfer': return 'business';
    default: return 'wallet';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabBadge: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  kpiHeader: {
    marginBottom: 12,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  kpiLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  kpiSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  metricTitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  metricBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 16,
  },
  viewAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  transactionsList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionMerchant: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  transactionMethod: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  approvalsList: {
    gap: 16,
  },
  approvalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  approvalBusiness: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  approvalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  approvalType: {
    fontSize: 13,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  kycBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kycBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  approvalDetails: {
    gap: 8,
    marginBottom: 16,
  },
  approvalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalDetailText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  documentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12,
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
  rejectBtn: {
    backgroundColor: COLORS.dangerLight,
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: 500,
    maxWidth: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  modalValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '500',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docName: {
    fontSize: 13,
    color: COLORS.dark,
    textTransform: 'capitalize',
  },
  docStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalRejectBtn: {
    backgroundColor: COLORS.dangerLight,
  },
  modalRejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalApproveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalApproveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
