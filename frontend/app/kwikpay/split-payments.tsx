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

interface SplitConfig {
  split_id: string;
  name: string;
  description: string;
  recipients: { account_id: string; type: string; value: number }[];
  transaction_count: number;
  total_distributed: number;
  active: boolean;
  created_at: string;
}

export default function SplitPaymentsPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configs, setConfigs] = useState<SplitConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [recipients, setRecipients] = useState<{ account_id: string; type: string; value: string }[]>([
    { account_id: '', type: 'percentage', value: '' },
  ]);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/split-configs');
      setConfigs(response.data?.configs || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
      // Mock data
      setConfigs([
        {
          split_id: 'split_1',
          name: 'Marketplace Split',
          description: 'Split payments between seller and platform',
          recipients: [
            { account_id: 'seller_001', type: 'percentage', value: 85 },
            { account_id: 'platform', type: 'percentage', value: 15 },
          ],
          transaction_count: 234,
          total_distributed: 15000000,
          active: true,
          created_at: '2025-01-15',
        },
        {
          split_id: 'split_2',
          name: 'Delivery Split',
          description: 'Split between restaurant and delivery',
          recipients: [
            { account_id: 'restaurant', type: 'percentage', value: 70 },
            { account_id: 'driver', type: 'percentage', value: 20 },
            { account_id: 'platform', type: 'percentage', value: 10 },
          ],
          transaction_count: 89,
          total_distributed: 4500000,
          active: true,
          created_at: '2025-01-20',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCreateConfig = async () => {
    if (!configName || recipients.some(r => !r.account_id || !r.value)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const totalPercentage = recipients.filter(r => r.type === 'percentage').reduce((a, r) => a + parseFloat(r.value), 0);
    if (totalPercentage > 100) {
      Alert.alert('Error', 'Total percentage cannot exceed 100%');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/split-configs', {
        name: configName,
        description: configDescription,
        recipients: recipients.map(r => ({
          account_id: r.account_id,
          type: r.type,
          value: parseFloat(r.value),
        })),
      });
      Alert.alert('Success', 'Split configuration created!');
      setShowCreateModal(false);
      resetForm();
      fetchConfigs();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create config');
    } finally {
      setCreating(false);
    }
  };

  const addRecipient = () => {
    setRecipients([...recipients, { account_id: '', type: 'percentage', value: '' }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index: number, field: string, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const resetForm = () => {
    setConfigName('');
    setConfigDescription('');
    setRecipients([{ account_id: '', type: 'percentage', value: '' }]);
  };

  const getRecipientColor = (index: number) => {
    const colors = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.warning, COLORS.danger];
    return colors[index % colors.length];
  };

  const totalDistributed = configs.reduce((a, c) => a + c.total_distributed, 0);
  const totalTransactions = configs.reduce((a, c) => a + c.transaction_count, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading split configs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchConfigs} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Split Payments</Text>
            <Text style={styles.pageSubtitle}>Distribute payments to multiple recipients</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="git-branch" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Split</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="git-branch" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{configs.length}</Text>
            <Text style={styles.statLabel}>Split Configs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{formatNumber(totalTransactions)}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="cash" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(totalDistributed)}</Text>
            <Text style={styles.statLabel}>Distributed</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Split Payments Work</Text>
            <Text style={styles.infoText}>
              Configure how incoming payments are automatically distributed to multiple recipients. 
              Perfect for marketplaces, platforms with commissions, or shared revenue models.
            </Text>
          </View>
        </View>

        {/* Configs List */}
        <Text style={styles.sectionTitle}>Split Configurations</Text>
        {configs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-branch-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Split Configurations</Text>
            <Text style={styles.emptyText}>Create a split to automatically distribute payments</Text>
          </View>
        ) : (
          configs.map((config) => (
            <View key={config.split_id} style={styles.configCard}>
              <View style={styles.configHeader}>
                <View>
                  <Text style={styles.configName}>{config.name}</Text>
                  <Text style={styles.configDescription}>{config.description || 'No description'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: config.active ? COLORS.primaryLight : COLORS.lightGray }]}>
                  <Text style={[styles.statusText, { color: config.active ? COLORS.primary : COLORS.gray }]}>
                    {config.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Recipients visualization */}
              <View style={styles.recipientsSection}>
                <Text style={styles.recipientsTitle}>Distribution</Text>
                <View style={styles.splitBar}>
                  {config.recipients.map((recipient, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.splitBarSegment,
                        {
                          width: `${recipient.value}%`,
                          backgroundColor: getRecipientColor(idx),
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.recipientsList}>
                  {config.recipients.map((recipient, idx) => (
                    <View key={idx} style={styles.recipientItem}>
                      <View style={[styles.recipientDot, { backgroundColor: getRecipientColor(idx) }]} />
                      <Text style={styles.recipientId}>{recipient.account_id}</Text>
                      <Text style={styles.recipientValue}>
                        {recipient.type === 'percentage' ? `${recipient.value}%` : `TZS ${formatNumber(recipient.value)}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Stats */}
              <View style={styles.configStats}>
                <View style={styles.configStat}>
                  <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.configStatText}>{config.transaction_count} transactions</Text>
                </View>
                <View style={styles.configStat}>
                  <Ionicons name="cash-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.configStatText}>TZS {formatNumber(config.total_distributed)} distributed</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Split Configuration</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Configuration Name *</Text>
              <TextInput
                style={styles.input}
                value={configName}
                onChangeText={setConfigName}
                placeholder="e.g., Marketplace Split"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={configDescription}
                onChangeText={setConfigDescription}
                placeholder="Describe this split configuration..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={2}
              />

              <View style={styles.recipientsHeader}>
                <Text style={styles.inputLabel}>Recipients *</Text>
                <TouchableOpacity style={styles.addRecipientButton} onPress={addRecipient}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text style={styles.addRecipientText}>Add</Text>
                </TouchableOpacity>
              </View>

              {recipients.map((recipient, index) => (
                <View key={index} style={styles.recipientForm}>
                  <View style={styles.recipientFormHeader}>
                    <View style={[styles.recipientBadge, { backgroundColor: getRecipientColor(index) + '20' }]}>
                      <Text style={[styles.recipientBadgeText, { color: getRecipientColor(index) }]}>
                        Recipient {index + 1}
                      </Text>
                    </View>
                    {recipients.length > 1 && (
                      <TouchableOpacity onPress={() => removeRecipient(index)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.recipientInput}
                    value={recipient.account_id}
                    onChangeText={(v) => updateRecipient(index, 'account_id', v)}
                    placeholder="Account ID or name"
                    placeholderTextColor={COLORS.gray}
                  />
                  <View style={styles.recipientValueRow}>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[styles.typeOption, recipient.type === 'percentage' && styles.typeOptionActive]}
                        onPress={() => updateRecipient(index, 'type', 'percentage')}
                      >
                        <Text style={[styles.typeOptionText, recipient.type === 'percentage' && styles.typeOptionTextActive]}>%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeOption, recipient.type === 'fixed' && styles.typeOptionActive]}
                        onPress={() => updateRecipient(index, 'type', 'fixed')}
                      >
                        <Text style={[styles.typeOptionText, recipient.type === 'fixed' && styles.typeOptionTextActive]}>TZS</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.valueInput}
                      value={recipient.value}
                      onChangeText={(v) => updateRecipient(index, 'value', v)}
                      placeholder={recipient.type === 'percentage' ? '50' : '10000'}
                      placeholderTextColor={COLORS.gray}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}

              {/* Preview */}
              {recipients.some(r => r.value) && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Preview</Text>
                  <View style={styles.previewBar}>
                    {recipients.map((r, idx) => r.type === 'percentage' && r.value && (
                      <View
                        key={idx}
                        style={[
                          styles.previewBarSegment,
                          {
                            width: `${parseFloat(r.value) || 0}%`,
                            backgroundColor: getRecipientColor(idx),
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateConfig}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="git-branch" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Create Split</Text>
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
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.secondaryLight, borderRadius: 12, padding: 16, gap: 12, marginBottom: 24 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 4 },
  infoText: { fontSize: 12, color: COLORS.secondary, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  configCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  configName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  configDescription: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  recipientsSection: { marginBottom: 12 },
  recipientsTitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 8 },
  splitBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  splitBarSegment: { height: '100%' },
  recipientsList: { gap: 6 },
  recipientItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recipientDot: { width: 8, height: 8, borderRadius: 4 },
  recipientId: { flex: 1, fontSize: 13, color: COLORS.dark },
  recipientValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  configStats: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  configStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  configStatText: { fontSize: 12, color: COLORS.gray },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 60, textAlignVertical: 'top' },
  recipientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addRecipientButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addRecipientText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  recipientForm: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 12, marginBottom: 12 },
  recipientFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recipientBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  recipientBadgeText: { fontSize: 12, fontWeight: '600' },
  recipientInput: { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: COLORS.dark, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  recipientValueRow: { flexDirection: 'row', gap: 8 },
  typeSelector: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 10, padding: 2, borderWidth: 1, borderColor: COLORS.border },
  typeOption: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  typeOptionActive: { backgroundColor: COLORS.primary },
  typeOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  typeOptionTextActive: { color: COLORS.white },
  valueInput: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  previewBox: { backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 12, marginBottom: 16 },
  previewTitle: { fontSize: 12, fontWeight: '600', color: COLORS.primaryDark, marginBottom: 8 },
  previewBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.white },
  previewBarSegment: { height: '100%' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
