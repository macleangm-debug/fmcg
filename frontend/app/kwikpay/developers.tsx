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
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
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

const TABS = ['API Keys', 'Webhooks', 'Documentation'];

export default function DevelopersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('API Keys');
  const [apiKeys, setApiKeys] = useState({ api_key_live: '', api_key_test: '', is_live: false, webhook_url: '' });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  // Regenerate key confirmation modal state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [keyToRegenerate, setKeyToRegenerate] = useState<'test' | 'live' | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/api-keys');
      setApiKeys(response.data);
      setWebhookUrl(response.data.webhook_url || '');
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      setApiKeys({ api_key_live: 'kwk_live_xxxxxxxxxxxxxxxx', api_key_test: 'kwk_test_xxxxxxxxxxxxxxxx', is_live: false, webhook_url: '' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApiKeys();
  };

  const copyToClipboard = async (text: string, keyType: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(keyType);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Show confirmation before regenerating API key
  const handleRegenerateKeyPress = (keyType: 'test' | 'live') => {
    setKeyToRegenerate(keyType);
    setShowRegenerateModal(true);
  };

  const handleRegenerateConfirm = async () => {
    if (!keyToRegenerate) return;
    
    setRegenerating(true);
    try {
      await api.post(`/kwikpay/api-keys/regenerate?key_type=${keyToRegenerate}`);
      fetchApiKeys();
      setShowRegenerateModal(false);
      setKeyToRegenerate(null);
    } catch (error) {
      console.error('Failed to regenerate key:', error);
      if (Platform.OS === 'web') {
        alert('Failed to regenerate API key. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to regenerate API key. Please try again.');
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateCancel = () => {
    setShowRegenerateModal(false);
    setKeyToRegenerate(null);
  };

  const handleSaveWebhook = async () => {
    try {
      await api.put('/kwikpay/settings', { webhook_url: webhookUrl });
    } catch (error) {
      console.error('Failed to save webhook:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderApiKeys = () => (
    <View style={styles.section}>
      {/* Test Key */}
      <View style={styles.keyCard}>
        <View style={styles.keyHeader}>
          <View style={[styles.keyBadge, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="flask" size={16} color={COLORS.warning} />
            <Text style={[styles.keyBadgeText, { color: COLORS.warning }]}>Test Mode</Text>
          </View>
        </View>
        <Text style={styles.keyLabel}>Test API Key</Text>
        <View style={styles.keyValueRow}>
          <Text style={styles.keyValue}>{apiKeys.api_key_test}</Text>
          <TouchableOpacity onPress={() => copyToClipboard(apiKeys.api_key_test, 'test')}>
            <Ionicons name={copiedKey === 'test' ? 'checkmark' : 'copy-outline'} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.regenerateBtn} onPress={() => handleRegenerateKeyPress('test')}>
          <Ionicons name="refresh" size={16} color={COLORS.gray} />
          <Text style={styles.regenerateBtnText}>Regenerate</Text>
        </TouchableOpacity>
      </View>

      {/* Live Key */}
      <View style={styles.keyCard}>
        <View style={styles.keyHeader}>
          <View style={[styles.keyBadge, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={[styles.keyBadgeText, { color: COLORS.success }]}>Live Mode</Text>
          </View>
        </View>
        <Text style={styles.keyLabel}>Live API Key</Text>
        <View style={styles.keyValueRow}>
          <Text style={styles.keyValue}>{apiKeys.api_key_live}</Text>
          <TouchableOpacity onPress={() => copyToClipboard(apiKeys.api_key_live, 'live')}>
            <Ionicons name={copiedKey === 'live' ? 'checkmark' : 'copy-outline'} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.regenerateBtn} onPress={() => handleRegenerateKeyPress('live')}>
          <Ionicons name="refresh" size={16} color={COLORS.gray} />
          <Text style={styles.regenerateBtnText}>Regenerate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWebhooks = () => (
    <View style={styles.section}>
      <View style={styles.webhookCard}>
        <Text style={styles.sectionTitle}>Webhook Endpoint</Text>
        <Text style={styles.webhookDesc}>We'll send POST requests to this URL when payment events occur.</Text>
        <TextInput
          style={styles.webhookInput}
          placeholder="https://your-domain.com/webhooks/kwikpay"
          value={webhookUrl}
          onChangeText={setWebhookUrl}
          placeholderTextColor={COLORS.gray}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveWebhook}>
          <Ionicons name="save" size={18} color={COLORS.white} />
          <Text style={styles.saveButtonText}>Save Webhook</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.eventsCard}>
        <Text style={styles.sectionTitle}>Webhook Events</Text>
        {['payment.succeeded', 'payment.failed', 'payout.completed', 'payout.failed'].map((event) => (
          <View key={event} style={styles.eventRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.eventName}>{event}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderDocumentation = () => (
    <View style={styles.section}>
      <View style={styles.docCard}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{`// Create a payment\nconst response = await fetch('https://api.kwikpay.com/v1/payments', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer kwk_test_xxx',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    amount: 50000,\n    currency: 'TZS',\n    method: 'mpesa',\n    customer_phone: '+255712345678'\n  })\n});`}</Text>
        </View>
      </View>

      <View style={styles.docCard}>
        <Text style={styles.sectionTitle}>API Reference</Text>
        {[
          { name: 'Create Payment', method: 'POST', endpoint: '/v1/payments' },
          { name: 'Get Payment', method: 'GET', endpoint: '/v1/payments/:id' },
          { name: 'Create Payout', method: 'POST', endpoint: '/v1/payouts' },
          { name: 'Get Balance', method: 'GET', endpoint: '/v1/balance' },
        ].map((api, idx) => (
          <View key={idx} style={styles.apiRow}>
            <View style={[styles.methodBadge, { backgroundColor: api.method === 'POST' ? COLORS.successLight : COLORS.blueLight }]}>
              <Text style={[styles.methodText, { color: api.method === 'POST' ? COLORS.success : COLORS.blue }]}>{api.method}</Text>
            </View>
            <Text style={styles.endpointText}>{api.endpoint}</Text>
          </View>
        ))}
      </View>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Developers</Text>
            <Text style={styles.pageSubtitle}>API keys and integration</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'API Keys' && renderApiKeys()}
        {activeTab === 'Webhooks' && renderWebhooks()}
        {activeTab === 'Documentation' && renderDocumentation()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Regenerate API Key Confirmation Modal */}
      <ConfirmationModal
        visible={showRegenerateModal}
        title="Regenerate API Key"
        message={keyToRegenerate === 'live' 
          ? "Are you sure you want to regenerate your LIVE API key? This will immediately invalidate the current key. All applications using this key will stop working until updated."
          : "Are you sure you want to regenerate your TEST API key? This will immediately invalidate the current test key."}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={handleRegenerateConfirm}
        onCancel={handleRegenerateCancel}
        variant={keyToRegenerate === 'live' ? 'danger' : 'warning'}
        icon="refresh-outline"
        loading={regenerating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  keyCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  keyHeader: { marginBottom: 12 },
  keyBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4 },
  keyBadgeText: { fontSize: 12, fontWeight: '600' },
  keyLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  keyValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.lightGray, padding: 12, borderRadius: 8 },
  keyValue: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.dark },
  regenerateBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  regenerateBtnText: { fontSize: 13, color: COLORS.gray },
  webhookCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  webhookDesc: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  webhookInput: { backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.dark, marginBottom: 12 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, gap: 6 },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  eventsCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  eventName: { fontSize: 14, color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  docCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  codeBlock: { backgroundColor: COLORS.dark, borderRadius: 10, padding: 14 },
  codeText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.successLight },
  apiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  methodText: { fontSize: 11, fontWeight: '700' },
  endpointText: { fontSize: 14, color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
