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
import { useRouter } from 'expo-router';
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

interface PaymentLink {
  link_id: string;
  short_code: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  payment_url: string;
  view_count: number;
  payment_count: number;
  total_collected: number;
  created_at: string;
  expires_at: string;
}

export default function PaymentLinksPage() {
  const router = useRouter();
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [oneTime, setOneTime] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/payment-links');
      setLinks(response.data?.links || []);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateLink = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/kwikpay/payment-links', {
        amount: parseFloat(amount),
        currency: 'TZS',
        description: description || 'Payment',
        customer_email: customerEmail || null,
        expires_in_hours: parseInt(expiresInHours) || 24,
        one_time: oneTime,
      });

      Alert.alert('Success', `Payment link created!\n\n${response.data.payment_url}`);
      setShowCreateModal(false);
      resetForm();
      fetchLinks();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivateLink = async (linkId: string) => {
    try {
      await api.delete(`/kwikpay/payment-links/${linkId}`);
      fetchLinks();
    } catch (error) {
      Alert.alert('Error', 'Failed to deactivate link');
    }
  };

  const copyToClipboard = (url: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(url);
      Alert.alert('Copied', 'Payment link copied to clipboard');
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCustomerEmail('');
    setExpiresInHours('24');
    setOneTime(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'completed': return COLORS.secondary;
      case 'expired': return COLORS.warning;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primaryLight;
      case 'completed': return COLORS.secondaryLight;
      case 'expired': return COLORS.warningLight;
      case 'cancelled': return COLORS.dangerLight;
      default: return COLORS.lightGray;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading payment links...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLinks} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Payment Links</Text>
            <Text style={styles.pageSubtitle}>Create shareable payment links</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Create Link</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="link" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{links.length}</Text>
            <Text style={styles.statLabel}>Total Links</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="eye" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{links.reduce((a, l) => a + l.view_count, 0)}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="cash" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(links.reduce((a, l) => a + l.total_collected, 0))}</Text>
            <Text style={styles.statLabel}>Collected</Text>
          </View>
        </View>

        {/* Links List */}
        <Text style={styles.sectionTitle}>Your Payment Links</Text>
        {links.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Payment Links</Text>
            <Text style={styles.emptyText}>Create your first payment link to start collecting payments</Text>
          </View>
        ) : (
          links.map((link) => (
            <View key={link.link_id} style={styles.linkCard}>
              <View style={styles.linkHeader}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkAmount}>TZS {formatNumber(link.amount)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(link.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(link.status) }]}>
                      {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(link.payment_url)}
                >
                  <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.linkDescription} numberOfLines={1}>{link.description || 'No description'}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{link.payment_url}</Text>
              <View style={styles.linkStats}>
                <View style={styles.linkStat}>
                  <Ionicons name="eye-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.linkStatText}>{link.view_count} views</Text>
                </View>
                <View style={styles.linkStat}>
                  <Ionicons name="card-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.linkStatText}>{link.payment_count} payments</Text>
                </View>
                <View style={styles.linkStat}>
                  <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.linkStatText}>Expires: {new Date(link.expires_at).toLocaleDateString()}</Text>
                </View>
              </View>
              {link.status === 'active' && (
                <TouchableOpacity
                  style={styles.deactivateButton}
                  onPress={() => handleDeactivateLink(link.link_id)}
                >
                  <Text style={styles.deactivateButtonText}>Deactivate</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Payment Link</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (TZS) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="50,000"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Payment for..."
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Customer Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="customer@example.com"
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Expires In (Hours)</Text>
              <TextInput
                style={styles.input}
                value={expiresInHours}
                onChangeText={setExpiresInHours}
                placeholder="24"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setOneTime(!oneTime)}
              >
                <View style={[styles.checkbox, oneTime && styles.checkboxChecked]}>
                  {oneTime && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>One-time use (deactivate after payment)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateLink}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Create Payment Link</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  linkCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkDescription: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 12,
  },
  linkStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  linkStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkStatText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  deactivateButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  deactivateButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    color: COLORS.dark,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
