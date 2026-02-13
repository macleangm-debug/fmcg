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

interface BlockedEntity {
  type: 'email' | 'phone' | 'ip';
  value: string;
}

export default function FraudPage() {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<{ emails: string[], phones: string[], ips: string[] }>({ emails: [], phones: [], ips: [] });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Block form
  const [blockType, setBlockType] = useState<'email' | 'phone' | 'ip'>('email');
  const [blockValue, setBlockValue] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Test form
  const [testAmount, setTestAmount] = useState('100000');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const fetchBlocked = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/fraud/blocked');
      setBlocked(response.data || { emails: [], phones: [], ips: [] });
    } catch (error) {
      console.error('Error fetching blocked:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleBlock = async () => {
    if (!blockValue) {
      Alert.alert('Error', 'Please enter a value to block');
      return;
    }

    setBlocking(true);
    try {
      await api.post('/kwikpay/fraud/block', {
        entity_type: blockType,
        value: blockValue,
        reason: blockReason || 'Suspicious activity',
      });
      Alert.alert('Success', `${blockType} blocked successfully`);
      setShowBlockModal(false);
      setBlockValue('');
      setBlockReason('');
      fetchBlocked();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to block');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (type: string, value: string) => {
    try {
      await api.delete(`/kwikpay/fraud/block/${type}/${encodeURIComponent(value)}`);
      fetchBlocked();
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock');
    }
  };

  const handleTestTransaction = async () => {
    if (!testEmail) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/kwikpay/fraud/ml-score', {
        amount: parseFloat(testAmount),
        currency: 'TZS',
        customer_email: testEmail,
        customer_phone: testPhone || null,
        country: 'TZ',
        payment_method: 'mobile_money',
      });
      setTestResult(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to analyze');
    } finally {
      setTesting(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return COLORS.primary;
      case 'medium': return COLORS.warning;
      case 'high': return COLORS.danger;
      case 'critical': return '#7F1D1D';
      default: return COLORS.gray;
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'low': return COLORS.primaryLight;
      case 'medium': return COLORS.warningLight;
      case 'high': return COLORS.dangerLight;
      case 'critical': return '#FCA5A5';
      default: return COLORS.lightGray;
    }
  };

  const totalBlocked = blocked.emails.length + blocked.phones.length + blocked.ips.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Fraud Detection</Text>
            <Text style={styles.pageSubtitle}>Monitor and prevent fraudulent transactions</Text>
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => setShowTestModal(true)}
          >
            <Ionicons name="flask" size={20} color={COLORS.white} />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="shield" size={20} color={COLORS.danger} />
            </View>
            <Text style={styles.statValue}>{totalBlocked}</Text>
            <Text style={styles.statLabel}>Blocked Entities</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="mail" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{blocked.emails.length}</Text>
            <Text style={styles.statLabel}>Blocked Emails</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="call" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{blocked.phones.length}</Text>
            <Text style={styles.statLabel}>Blocked Phones</Text>
          </View>
        </View>

        {/* Risk Rules Info */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.rulesTitle}>Active Risk Rules</Text>
          </View>
          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <Ionicons name="cash" size={16} color={COLORS.gray} />
              <Text style={styles.ruleText}>High amount threshold: TZS 1,000,000+</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="person-add" size={16} color={COLORS.gray} />
              <Text style={styles.ruleText}>New customer: First transaction flagged</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="time" size={16} color={COLORS.gray} />
              <Text style={styles.ruleText}>Unusual hours: 12AM - 6AM</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="speedometer" size={16} color={COLORS.gray} />
              <Text style={styles.ruleText}>Velocity check: Max 5 transactions/hour</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="close-circle" size={16} color={COLORS.gray} />
              <Text style={styles.ruleText}>Failed attempts: 3+ in 24h triggers review</Text>
            </View>
          </View>
        </View>

        {/* Blocked Entities */}
        <View style={styles.blockedSection}>
          <View style={styles.blockedHeader}>
            <Text style={styles.sectionTitle}>Blocked Entities</Text>
            <TouchableOpacity
              style={styles.addBlockButton}
              onPress={() => setShowBlockModal(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.addBlockText}>Block</Text>
            </TouchableOpacity>
          </View>

          {totalBlocked === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyTitle}>No Blocked Entities</Text>
              <Text style={styles.emptyText}>Block suspicious emails, phones, or IPs</Text>
            </View>
          ) : (
            <>
              {blocked.emails.length > 0 && (
                <View style={styles.blockedGroup}>
                  <Text style={styles.blockedGroupTitle}>Emails</Text>
                  {blocked.emails.map((email) => (
                    <View key={email} style={styles.blockedItem}>
                      <View style={styles.blockedInfo}>
                        <Ionicons name="mail" size={16} color={COLORS.danger} />
                        <Text style={styles.blockedValue}>{email}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnblock('email', email)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {blocked.phones.length > 0 && (
                <View style={styles.blockedGroup}>
                  <Text style={styles.blockedGroupTitle}>Phones</Text>
                  {blocked.phones.map((phone) => (
                    <View key={phone} style={styles.blockedItem}>
                      <View style={styles.blockedInfo}>
                        <Ionicons name="call" size={16} color={COLORS.danger} />
                        <Text style={styles.blockedValue}>{phone}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnblock('phone', phone)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {blocked.ips.length > 0 && (
                <View style={styles.blockedGroup}>
                  <Text style={styles.blockedGroupTitle}>IP Addresses</Text>
                  {blocked.ips.map((ip) => (
                    <View key={ip} style={styles.blockedItem}>
                      <View style={styles.blockedInfo}>
                        <Ionicons name="globe" size={16} color={COLORS.danger} />
                        <Text style={styles.blockedValue}>{ip}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnblock('ip', ip)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Block Modal */}
      <Modal visible={showBlockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Entity</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typePicker}>
                {(['email', 'phone', 'ip'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, blockType === type && styles.typeOptionActive]}
                    onPress={() => setBlockType(type)}
                  >
                    <Ionicons
                      name={type === 'email' ? 'mail' : type === 'phone' ? 'call' : 'globe'}
                      size={16}
                      color={blockType === type ? COLORS.white : COLORS.gray}
                    />
                    <Text style={[styles.typeText, blockType === type && styles.typeTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Value *</Text>
              <TextInput
                style={styles.input}
                value={blockValue}
                onChangeText={setBlockValue}
                placeholder={blockType === 'email' ? 'example@email.com' : blockType === 'phone' ? '+255712345678' : '192.168.1.1'}
                placeholderTextColor={COLORS.gray}
                keyboardType={blockType === 'phone' ? 'phone-pad' : 'default'}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="Reason for blocking..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                style={[styles.submitButton, blocking && styles.submitButtonDisabled]}
                onPress={handleBlock}
                disabled={blocking}
              >
                {blocking ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="shield" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Block Entity</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Test Modal */}
      <Modal visible={showTestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Test Risk Analysis</Text>
              <TouchableOpacity onPress={() => { setShowTestModal(false); setTestResult(null); }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {testResult ? (
                <View style={styles.resultContainer}>
                  <View style={[styles.riskBadge, { backgroundColor: getRiskBg(testResult.risk_level) }]}>
                    <Ionicons
                      name={testResult.risk_level === 'low' ? 'checkmark-circle' : testResult.risk_level === 'critical' ? 'alert-circle' : 'warning'}
                      size={32}
                      color={getRiskColor(testResult.risk_level)}
                    />
                    <Text style={[styles.riskLevel, { color: getRiskColor(testResult.risk_level) }]}>
                      {testResult.risk_level.toUpperCase()} RISK
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>Risk Score</Text>
                    <Text style={[styles.scoreValue, { color: getRiskColor(testResult.risk_level) }]}>
                      {testResult.risk_score}/100
                    </Text>
                  </View>

                  <View style={styles.recommendationContainer}>
                    <Text style={styles.recommendationLabel}>Recommendation</Text>
                    <View style={[styles.recommendationBadge, {
                      backgroundColor: testResult.recommendation === 'allow' ? COLORS.primaryLight :
                        testResult.recommendation === 'monitor' ? COLORS.warningLight :
                          testResult.recommendation === 'review' ? COLORS.secondaryLight : COLORS.dangerLight
                    }]}>
                      <Text style={[styles.recommendationText, {
                        color: testResult.recommendation === 'allow' ? COLORS.primary :
                          testResult.recommendation === 'monitor' ? COLORS.warning :
                            testResult.recommendation === 'review' ? COLORS.secondary : COLORS.danger
                      }]}>
                        {testResult.recommendation.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {testResult.risk_factors.length > 0 && (
                    <View style={styles.factorsContainer}>
                      <Text style={styles.factorsTitle}>Risk Factors</Text>
                      {testResult.risk_factors.map((factor: string, idx: number) => (
                        <View key={idx} style={styles.factorItem}>
                          <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                          <Text style={styles.factorText}>{factor}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.newTestButton}
                    onPress={() => setTestResult(null)}
                  >
                    <Text style={styles.newTestButtonText}>Run Another Test</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Amount (TZS)</Text>
                  <TextInput
                    style={styles.input}
                    value={testAmount}
                    onChangeText={setTestAmount}
                    placeholder="100,000"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Customer Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={testEmail}
                    onChangeText={setTestEmail}
                    placeholder="customer@example.com"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={testPhone}
                    onChangeText={setTestPhone}
                    placeholder="+255712345678"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="phone-pad"
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, testing && styles.submitButtonDisabled]}
                    onPress={handleTestTransaction}
                    disabled={testing}
                  >
                    {testing ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="flask" size={20} color={COLORS.white} />
                        <Text style={styles.submitButtonText}>Analyze Risk</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  testButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  testButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  rulesCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 24 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rulesTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  rulesList: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 13, color: COLORS.gray },
  blockedSection: { marginBottom: 24 },
  blockedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  addBlockButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBlockText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  blockedGroup: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  blockedGroupTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 12 },
  blockedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  blockedInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockedValue: { fontSize: 13, color: COLORS.dark },
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
  textArea: { height: 60, textAlignVertical: 'top' },
  typePicker: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.lightGray, gap: 6 },
  typeOptionActive: { backgroundColor: COLORS.danger },
  typeText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  typeTextActive: { color: COLORS.white },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  resultContainer: { alignItems: 'center' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, marginBottom: 20 },
  riskLevel: { fontSize: 18, fontWeight: '700' },
  scoreContainer: { alignItems: 'center', marginBottom: 20 },
  scoreLabel: { fontSize: 13, color: COLORS.gray },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  recommendationContainer: { alignItems: 'center', marginBottom: 20 },
  recommendationLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  recommendationBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  recommendationText: { fontSize: 14, fontWeight: '700' },
  factorsContainer: { width: '100%', backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, marginBottom: 20 },
  factorsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 12 },
  factorItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  factorText: { fontSize: 13, color: COLORS.gray },
  newTestButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  newTestButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
