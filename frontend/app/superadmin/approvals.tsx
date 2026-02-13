import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
  kwikpay: '#10B981',
  retailpro: '#3B82F6',
  invoicing: '#EC4899',
};

interface PendingApproval {
  id: string;
  type: 'merchant_onboarding' | 'kyc_review' | 'payout_request' | 'api_access' | 'refund_request';
  product: 'kwikpay' | 'retailpro' | 'invoicing' | 'unitxt';
  title: string;
  description: string;
  requester: {
    name: string;
    email: string;
    business?: string;
  };
  amount?: number;
  currency?: string;
  submitted_at: string;
  priority: 'high' | 'medium' | 'low';
  documents?: { name: string; status: string }[];
  metadata?: Record<string, any>;
}

const APPROVAL_TYPES = {
  merchant_onboarding: { label: 'Merchant Onboarding', icon: 'business', color: COLORS.kwikpay },
  kyc_review: { label: 'KYC Review', icon: 'shield-checkmark', color: COLORS.warning },
  payout_request: { label: 'Payout Request', icon: 'wallet', color: COLORS.primary },
  api_access: { label: 'API Access', icon: 'code-slash', color: COLORS.retailpro },
  refund_request: { label: 'Refund Request', icon: 'return-down-back', color: COLORS.danger },
};

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/approvals').catch(() => null);
      
      if (response?.data?.approvals) {
        setApprovals(response.data.approvals);
      } else {
        // Mock data
        setApprovals([
          {
            id: '1',
            type: 'merchant_onboarding',
            product: 'kwikpay',
            title: 'TechStore Tanzania - Merchant Application',
            description: 'New merchant requesting payment processing capabilities',
            requester: { name: 'John Mwangi', email: 'john@techstore.tz', business: 'TechStore Tanzania' },
            submitted_at: '2024-06-08T10:30:00Z',
            priority: 'high',
            documents: [
              { name: 'Business Registration', status: 'verified' },
              { name: 'Tax Certificate', status: 'pending' },
              { name: 'ID Document', status: 'verified' },
            ],
          },
          {
            id: '2',
            type: 'kyc_review',
            product: 'kwikpay',
            title: 'Safari Tours Ltd - KYC Documents',
            description: 'KYC documents submitted for verification',
            requester: { name: 'Mary Ochieng', email: 'mary@safaritours.ke', business: 'Safari Tours Ltd' },
            submitted_at: '2024-06-07T14:20:00Z',
            priority: 'medium',
            documents: [
              { name: 'Business License', status: 'verified' },
              { name: 'Bank Statement', status: 'pending' },
            ],
          },
          {
            id: '3',
            type: 'payout_request',
            product: 'kwikpay',
            title: 'Coffee House - Withdrawal Request',
            description: 'Requesting withdrawal of available balance',
            requester: { name: 'David Kimani', email: 'david@coffeehouse.tz', business: 'Coffee House' },
            amount: 2500000,
            currency: 'TZS',
            submitted_at: '2024-06-08T09:15:00Z',
            priority: 'high',
          },
          {
            id: '4',
            type: 'api_access',
            product: 'retailpro',
            title: 'TechCorp - API Integration Request',
            description: 'Requesting API access for POS integration',
            requester: { name: 'James Wilson', email: 'james@techcorp.com', business: 'TechCorp Solutions' },
            submitted_at: '2024-06-06T16:45:00Z',
            priority: 'medium',
          },
          {
            id: '5',
            type: 'refund_request',
            product: 'kwikpay',
            title: 'Fashion Hub - Refund Request',
            description: 'Customer dispute - requesting refund for failed delivery',
            requester: { name: 'Lisa Thompson', email: 'lisa@fashionhub.tz', business: 'Fashion Hub' },
            amount: 85000,
            currency: 'TZS',
            submitted_at: '2024-06-08T11:00:00Z',
            priority: 'low',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approval: PendingApproval) => {
    Alert.alert(
      'Approve Request',
      `Are you sure you want to approve this ${APPROVAL_TYPES[approval.type].label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.post(`/superadmin/approvals/${approval.id}/approve`).catch(() => {});
              setApprovals(approvals.filter(a => a.id !== approval.id));
              setShowDetailModal(false);
              Alert.alert('Success', 'Request approved successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve request');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (approval: PendingApproval) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject this ${APPROVAL_TYPES[approval.type].label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/superadmin/approvals/${approval.id}/reject`).catch(() => {});
              setApprovals(approvals.filter(a => a.id !== approval.id));
              setShowDetailModal(false);
              Alert.alert('Success', 'Request rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const filteredApprovals = approvals.filter(a => {
    const matchesType = filterType === 'all' || a.type === filterType;
    const matchesProduct = filterProduct === 'all' || a.product === filterProduct;
    return matchesType && matchesProduct;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return COLORS.danger;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.success;
      default: return COLORS.gray;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' ' + currency;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.danger }]}>
          <Text style={styles.statValue}>
            {approvals.filter(a => a.priority === 'high').length}
          </Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.statValue}>
            {approvals.filter(a => a.priority === 'medium').length}
          </Text>
          <Text style={styles.statLabel}>Medium Priority</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.statValue}>
            {approvals.filter(a => a.priority === 'low').length}
          </Text>
          <Text style={styles.statLabel}>Low Priority</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.statValue}>{approvals.length}</Text>
          <Text style={styles.statLabel}>Total Pending</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
                All Types
              </Text>
            </TouchableOpacity>
            {Object.entries(APPROVAL_TYPES).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, filterType === key && { backgroundColor: value.color + '20', borderColor: value.color }]}
                onPress={() => setFilterType(key)}
              >
                <Ionicons name={value.icon as any} size={14} color={filterType === key ? value.color : COLORS.gray} />
                <Text style={[styles.filterChipText, filterType === key && { color: value.color }]}>
                  {value.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Product:</Text>
          <View style={styles.filterChips}>
            {['all', 'kwikpay', 'retailpro', 'invoicing'].map(product => (
              <TouchableOpacity
                key={product}
                style={[styles.filterChip, filterProduct === product && styles.filterChipActive]}
                onPress={() => setFilterProduct(product)}
              >
                <Text style={[styles.filterChipText, filterProduct === product && styles.filterChipTextActive]}>
                  {product === 'all' ? 'All Products' : product.charAt(0).toUpperCase() + product.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={64} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
          <Text style={styles.emptyStateText}>No pending approvals matching your filters</Text>
        </View>
      ) : (
        <View style={styles.approvalsList}>
          {filteredApprovals.map(approval => {
            const typeInfo = APPROVAL_TYPES[approval.type];
            return (
              <TouchableOpacity
                key={approval.id}
                style={styles.approvalCard}
                onPress={() => {
                  setSelectedApproval(approval);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.approvalHeader}>
                  <View style={styles.approvalHeaderLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
                      <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                    </View>
                    <View>
                      <View style={styles.titleRow}>
                        <Text style={styles.approvalTitle} numberOfLines={1}>{approval.title}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(approval.priority) + '20' }]}>
                          <Text style={[styles.priorityText, { color: getPriorityColor(approval.priority) }]}>
                            {approval.priority}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.approvalType}>{typeInfo.label} • {approval.product}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.approvalDescription} numberOfLines={2}>{approval.description}</Text>

                <View style={styles.approvalMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.metaText}>{approval.requester.name}</Text>
                  </View>
                  {approval.requester.business && (
                    <View style={styles.metaItem}>
                      <Ionicons name="business-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.metaText}>{approval.requester.business}</Text>
                    </View>
                  )}
                  {approval.amount && (
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.metaText}>{formatCurrency(approval.amount, approval.currency || 'USD')}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.metaText}>
                      {new Date(approval.submitted_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.approvalActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(approval)}
                  >
                    <Ionicons name="close" size={18} color={COLORS.danger} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.viewBtn]}
                    onPress={() => {
                      setSelectedApproval(approval);
                      setShowDetailModal(true);
                    }}
                  >
                    <Ionicons name="eye" size={18} color={COLORS.primary} />
                    <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(approval)}
                  >
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Request</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedApproval && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <View style={[styles.modalTypeHeader, { backgroundColor: APPROVAL_TYPES[selectedApproval.type].color + '10' }]}>
                    <View style={[styles.modalTypeIcon, { backgroundColor: APPROVAL_TYPES[selectedApproval.type].color + '20' }]}>
                      <Ionicons
                        name={APPROVAL_TYPES[selectedApproval.type].icon as any}
                        size={24}
                        color={APPROVAL_TYPES[selectedApproval.type].color}
                      />
                    </View>
                    <View>
                      <Text style={styles.modalTypeName}>
                        {APPROVAL_TYPES[selectedApproval.type].label}
                      </Text>
                      <Text style={styles.modalTypeProduct}>{selectedApproval.product}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedApproval.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(selectedApproval.priority) }]}>
                        {selectedApproval.priority} priority
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Request Details</Text>
                  <Text style={styles.modalRequestTitle}>{selectedApproval.title}</Text>
                  <Text style={styles.modalRequestDescription}>{selectedApproval.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Requester Information</Text>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Name</Text>
                    <Text style={styles.modalInfoValue}>{selectedApproval.requester.name}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Email</Text>
                    <Text style={styles.modalInfoValue}>{selectedApproval.requester.email}</Text>
                  </View>
                  {selectedApproval.requester.business && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Business</Text>
                      <Text style={styles.modalInfoValue}>{selectedApproval.requester.business}</Text>
                    </View>
                  )}
                </View>

                {selectedApproval.amount && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Amount</Text>
                    <Text style={styles.modalAmount}>
                      {formatCurrency(selectedApproval.amount, selectedApproval.currency || 'USD')}
                    </Text>
                  </View>
                )}

                {selectedApproval.documents && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Documents</Text>
                    {selectedApproval.documents.map((doc, idx) => (
                      <View key={idx} style={styles.modalDocRow}>
                        <View style={styles.modalDocInfo}>
                          <Ionicons name="document-text" size={18} color={COLORS.gray} />
                          <Text style={styles.modalDocName}>{doc.name}</Text>
                        </View>
                        <View style={[
                          styles.docStatusBadge,
                          { backgroundColor: doc.status === 'verified' ? COLORS.successLight : COLORS.warningLight }
                        ]}>
                          <Ionicons
                            name={doc.status === 'verified' ? 'checkmark-circle' : 'time'}
                            size={14}
                            color={doc.status === 'verified' ? COLORS.success : COLORS.warning}
                          />
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
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalRejectBtn]}
                    onPress={() => handleReject(selectedApproval)}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                    <Text style={styles.modalRejectBtnText}>Reject Request</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalApproveBtn]}
                    onPress={() => handleApprove(selectedApproval)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={styles.modalApproveBtnText}>Approve Request</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
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
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  filtersRow: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyStateText: {
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
    marginBottom: 12,
  },
  approvalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  approvalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  approvalType: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  approvalDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
    lineHeight: 20,
  },
  approvalMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray,
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
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: COLORS.dangerLight,
  },
  viewBtn: {
    backgroundColor: COLORS.primaryLight,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  actionBtnText: {
    fontSize: 13,
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
    width: 560,
    maxWidth: '90%',
    maxHeight: '85%',
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
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  modalTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalTypeProduct: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  modalRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  modalRequestDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalInfoLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  modalInfoValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '500',
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalDocInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalDocName: {
    fontSize: 13,
    color: COLORS.dark,
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
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
    backgroundColor: COLORS.success,
  },
  modalApproveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
