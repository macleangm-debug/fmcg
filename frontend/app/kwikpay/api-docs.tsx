import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
  codeBg: '#1F2937',
  codeText: '#E5E7EB',
};

const API_ENDPOINTS = [
  {
    category: 'Payments',
    endpoints: [
      {
        name: 'Create Payment',
        method: 'POST',
        path: '/api/kwikpay/payments',
        description: 'Create a new payment request',
        requestBody: { amount: 50000, currency: 'TZS', method: 'mpesa', customer_phone: '+255712345678', description: 'Order #12345' },
        responseBody: { payment_id: 'pay_xxxxxxxxxxxxx', status: 'pending', amount: 50000, currency: 'TZS', checkout_url: 'https://pay.kwikpay.com/c/xxxxx' }
      },
      {
        name: 'Get Payment',
        method: 'GET',
        path: '/api/kwikpay/payments/{payment_id}',
        description: 'Retrieve payment details by ID',
        responseBody: { payment_id: 'pay_xxxxxxxxxxxxx', status: 'succeeded', amount: 50000, currency: 'TZS', method: 'mpesa' }
      },
      {
        name: 'List Payments',
        method: 'GET',
        path: '/api/kwikpay/transactions',
        description: 'List all payments with optional filters',
        queryParams: ['status', 'limit', 'offset', 'from_date', 'to_date'],
        responseBody: { transactions: [], total: 0, limit: 20, offset: 0 }
      }
    ]
  },
  {
    category: 'Payouts',
    endpoints: [
      {
        name: 'Create Payout',
        method: 'POST',
        path: '/api/kwikpay/payouts',
        description: 'Send money to a mobile wallet or bank account',
        requestBody: { amount: 100000, currency: 'TZS', recipient_phone: '+255712345678', recipient_name: 'John Doe', provider: 'mpesa' },
        responseBody: { payout_id: 'po_xxxxxxxxxxxxx', status: 'processing', amount: 100000 }
      },
      {
        name: 'Get Payout',
        method: 'GET',
        path: '/api/kwikpay/payouts/{payout_id}',
        description: 'Retrieve payout status and details',
        responseBody: { payout_id: 'po_xxxxxxxxxxxxx', status: 'completed', amount: 100000, recipient_phone: '+255712345678' }
      }
    ]
  },
  {
    category: 'Payment Links',
    endpoints: [
      {
        name: 'Create Payment Link',
        method: 'POST',
        path: '/api/kwikpay/payment-links',
        description: 'Generate a shareable payment link',
        requestBody: { amount: 25000, currency: 'TZS', description: 'Product purchase', customer_email: 'buyer@example.com', expires_in_hours: 24 },
        responseBody: { link_id: 'link_xxxxxxxxxxxxx', payment_url: 'https://pay.kwikpay.com/l/xxxxx', short_code: 'KWKP123' }
      }
    ]
  },
  {
    category: 'Subscriptions',
    endpoints: [
      {
        name: 'Create Plan',
        method: 'POST',
        path: '/api/kwikpay/subscription-plans',
        description: 'Create a recurring billing plan',
        requestBody: { name: 'Premium Plan', amount: 50000, currency: 'TZS', interval: 'monthly', trial_days: 7 },
        responseBody: { plan_id: 'plan_xxxxxxxxxxxxx', name: 'Premium Plan', active: true }
      },
      {
        name: 'Subscribe Customer',
        method: 'POST',
        path: '/api/kwikpay/subscriptions',
        description: 'Subscribe a customer to a plan',
        requestBody: { plan_id: 'plan_xxxxxxxxxxxxx', customer_email: 'subscriber@example.com', customer_phone: '+255712345678' },
        responseBody: { subscription_id: 'sub_xxxxxxxxxxxxx', status: 'active', next_billing_date: '2026-03-08' }
      }
    ]
  },
  {
    category: 'Refunds',
    endpoints: [
      {
        name: 'Create Refund',
        method: 'POST',
        path: '/api/kwikpay/refunds',
        description: 'Refund a payment fully or partially',
        requestBody: { transaction_id: 'pay_xxxxxxxxxxxxx', amount: 25000, reason: 'Customer request' },
        responseBody: { refund_id: 'ref_xxxxxxxxxxxxx', status: 'pending', amount: 25000 }
      }
    ]
  },
  {
    category: 'Balance',
    endpoints: [
      {
        name: 'Get Balance',
        method: 'GET',
        path: '/api/kwikpay/dashboard',
        description: 'Get current account balance and stats',
        responseBody: { stats: { total_volume: 1500000, pending_payouts: 250000, currency: 'TZS' } }
      }
    ]
  }
];

const CODE_EXAMPLES = {
  javascript: `// Using fetch API
const API_KEY = 'kwk_test_xxxxxxxx';
const BASE_URL = 'https://api.kwikpay.com';

// Create a payment
async function createPayment() {
  const response = await fetch(\`\${BASE_URL}/api/kwikpay/payments\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 50000,
      currency: 'TZS',
      method: 'mpesa',
      customer_phone: '+255712345678',
      description: 'Order #12345'
    })
  });
  return await response.json();
}`,
  python: `# Using requests library
import requests

API_KEY = 'kwk_test_xxxxxxxx'
BASE_URL = 'https://api.kwikpay.com'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Create a payment
def create_payment():
    response = requests.post(
        f'{BASE_URL}/api/kwikpay/payments',
        headers=headers,
        json={
            'amount': 50000,
            'currency': 'TZS',
            'method': 'mpesa',
            'customer_phone': '+255712345678',
            'description': 'Order #12345'
        }
    )
    return response.json()`,
  curl: `# Create a payment
curl -X POST https://api.kwikpay.com/api/kwikpay/payments \\
  -H "Authorization: Bearer kwk_test_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "TZS",
    "method": "mpesa",
    "customer_phone": "+255712345678",
    "description": "Order #12345"
  }'`
};

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState('docs');
  const [selectedCategory, setSelectedCategory] = useState('Payments');
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS[0].endpoints[0]);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [copiedText, setCopiedText] = useState('');

  // Sandbox state
  const [sandboxMethod, setSandboxMethod] = useState('POST');
  const [sandboxPath, setSandboxPath] = useState('/api/kwikpay/payments');
  const [sandboxBody, setSandboxBody] = useState(JSON.stringify({
    amount: 50000,
    currency: 'TZS',
    method: 'mpesa',
    customer_phone: '+255712345678',
    description: 'Test payment'
  }, null, 2));
  const [sandboxResponse, setSandboxResponse] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState(null);

  const copyToClipboard = async (text, key) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleSandboxRequest = async () => {
    setSandboxLoading(true);
    setSandboxResponse('');
    setSandboxStatus(null);

    try {
      let response;
      if (sandboxMethod === 'GET') {
        response = await api.get(sandboxPath);
      } else if (sandboxMethod === 'POST') {
        response = await api.post(sandboxPath, JSON.parse(sandboxBody));
      } else if (sandboxMethod === 'PUT') {
        response = await api.put(sandboxPath, JSON.parse(sandboxBody));
      } else if (sandboxMethod === 'DELETE') {
        response = await api.delete(sandboxPath);
      }
      setSandboxStatus(response?.status || 200);
      setSandboxResponse(JSON.stringify(response?.data, null, 2));
    } catch (error) {
      setSandboxStatus(error.response?.status || 500);
      setSandboxResponse(JSON.stringify(error.response?.data || { error: error.message }, null, 2));
    } finally {
      setSandboxLoading(false);
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return { bg: COLORS.secondaryLight, text: COLORS.secondary };
      case 'POST': return { bg: COLORS.primaryLight, text: COLORS.primary };
      case 'PUT': return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'DELETE': return { bg: COLORS.dangerLight, text: COLORS.danger };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const renderDocs = () => (
    <View style={styles.docsContainer}>
      <View style={styles.docsSidebar}>
        <Text style={styles.sidebarTitle}>API Reference</Text>
        {API_ENDPOINTS.map((cat) => (
          <View key={cat.category}>
            <TouchableOpacity
              style={[styles.categoryItem, selectedCategory === cat.category && styles.categoryItemActive]}
              onPress={() => { setSelectedCategory(cat.category); setSelectedEndpoint(cat.endpoints[0]); }}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.category && styles.categoryTextActive]}>
                {cat.category}
              </Text>
            </TouchableOpacity>
            {selectedCategory === cat.category && (
              <View style={styles.endpointsList}>
                {cat.endpoints.map((ep) => (
                  <TouchableOpacity
                    key={ep.name}
                    style={[styles.endpointItem, selectedEndpoint.name === ep.name && styles.endpointItemActive]}
                    onPress={() => setSelectedEndpoint(ep)}
                  >
                    <View style={[styles.methodBadgeSmall, { backgroundColor: getMethodColor(ep.method).bg }]}>
                      <Text style={[styles.methodTextSmall, { color: getMethodColor(ep.method).text }]}>{ep.method}</Text>
                    </View>
                    <Text style={styles.endpointName} numberOfLines={1}>{ep.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <ScrollView style={styles.docsContent}>
        <View style={styles.endpointHeader}>
          <View style={[styles.methodBadgeLarge, { backgroundColor: getMethodColor(selectedEndpoint.method).bg }]}>
            <Text style={[styles.methodTextLarge, { color: getMethodColor(selectedEndpoint.method).text }]}>
              {selectedEndpoint.method}
            </Text>
          </View>
          <Text style={styles.endpointPath}>{selectedEndpoint.path}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(selectedEndpoint.path, 'path')}>
            <Ionicons name={copiedText === 'path' ? 'checkmark' : 'copy-outline'} size={18} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <Text style={styles.endpointDescription}>{selectedEndpoint.description}</Text>

        {selectedEndpoint.requestBody && (
          <View style={styles.codeSection}>
            <View style={styles.codeSectionHeader}>
              <Text style={styles.codeSectionTitle}>Request Body</Text>
              <TouchableOpacity onPress={() => copyToClipboard(JSON.stringify(selectedEndpoint.requestBody, null, 2), 'request')}>
                <Ionicons name={copiedText === 'request' ? 'checkmark' : 'copy-outline'} size={16} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{JSON.stringify(selectedEndpoint.requestBody, null, 2)}</Text>
            </View>
          </View>
        )}

        {selectedEndpoint.queryParams && (
          <View style={styles.paramsSection}>
            <Text style={styles.codeSectionTitle}>Query Parameters</Text>
            <View style={styles.paramsTable}>
              {selectedEndpoint.queryParams.map((param) => (
                <View key={param} style={styles.paramRow}>
                  <Text style={styles.paramName}>{param}</Text>
                  <Text style={styles.paramType}>string</Text>
                  <Text style={styles.paramDesc}>Optional</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.codeSection}>
          <View style={styles.codeSectionHeader}>
            <Text style={styles.codeSectionTitle}>Response</Text>
            <View style={styles.statusBadge}><Text style={styles.statusText}>200 OK</Text></View>
          </View>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{JSON.stringify(selectedEndpoint.responseBody, null, 2)}</Text>
          </View>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.codeSectionTitle}>Code Examples</Text>
          <View style={styles.languageTabs}>
            {['javascript', 'python', 'curl'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.languageTab, codeLanguage === lang && styles.languageTabActive]}
                onPress={() => setCodeLanguage(lang)}
              >
                <Text style={[styles.languageTabText, codeLanguage === lang && styles.languageTabTextActive]}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{CODE_EXAMPLES[codeLanguage]}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderSandbox = () => (
    <View style={styles.sandboxContainer}>
      <View style={styles.sandboxPanel}>
        <Text style={styles.sandboxTitle}>API Sandbox</Text>
        <Text style={styles.sandboxSubtitle}>Test API endpoints in real-time</Text>

        <View style={styles.sandboxRow}>
          <View style={styles.methodSelector}>
            {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.methodOption, sandboxMethod === m && { backgroundColor: getMethodColor(m).bg }]}
                onPress={() => setSandboxMethod(m)}
              >
                <Text style={[styles.methodOptionText, sandboxMethod === m && { color: getMethodColor(m).text }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.inputLabel}>Endpoint Path</Text>
        <TextInput
          style={styles.pathInput}
          value={sandboxPath}
          onChangeText={setSandboxPath}
          placeholder="/api/kwikpay/payments"
          placeholderTextColor={COLORS.gray}
        />

        {['POST', 'PUT'].includes(sandboxMethod) && (
          <>
            <Text style={styles.inputLabel}>Request Body (JSON)</Text>
            <TextInput
              style={styles.bodyInput}
              value={sandboxBody}
              onChangeText={setSandboxBody}
              placeholder="{}"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={8}
            />
          </>
        )}

        <Text style={styles.inputLabel}>Quick Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesRow}>
          {[
            { label: 'Get Balance', method: 'GET', path: '/api/kwikpay/dashboard', body: {} },
            { label: 'List Transactions', method: 'GET', path: '/api/kwikpay/transactions', body: {} },
            { label: 'Create Payment', method: 'POST', path: '/api/kwikpay/payments', body: { amount: 50000, currency: 'TZS', method: 'mpesa', customer_phone: '+255712345678' } },
            { label: 'Create Payout', method: 'POST', path: '/api/kwikpay/payouts', body: { amount: 100000, currency: 'TZS', recipient_phone: '+255712345678', provider: 'mpesa' } },
          ].map((template) => (
            <TouchableOpacity
              key={template.label}
              style={styles.templateButton}
              onPress={() => { setSandboxMethod(template.method); setSandboxPath(template.path); setSandboxBody(JSON.stringify(template.body, null, 2)); }}
            >
              <Text style={styles.templateButtonText}>{template.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.sendButton, sandboxLoading && styles.sendButtonDisabled]}
          onPress={handleSandboxRequest}
          disabled={sandboxLoading}
        >
          {sandboxLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={COLORS.white} />
              <Text style={styles.sendButtonText}>Send Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.responsePanel}>
        <View style={styles.responseHeader}>
          <Text style={styles.responseTitle}>Response</Text>
          {sandboxStatus && (
            <View style={[styles.statusIndicator, { backgroundColor: sandboxStatus < 400 ? COLORS.primaryLight : COLORS.dangerLight }]}>
              <Text style={[styles.statusIndicatorText, { color: sandboxStatus < 400 ? COLORS.primary : COLORS.danger }]}>
                {sandboxStatus} {sandboxStatus < 400 ? 'OK' : 'Error'}
              </Text>
            </View>
          )}
        </View>
        <ScrollView style={styles.responseBody}>
          {sandboxResponse ? (
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{sandboxResponse}</Text>
            </View>
          ) : (
            <View style={styles.emptyResponse}>
              <Ionicons name="code-slash-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyResponseText}>Send a request to see the response</Text>
            </View>
          )}
        </ScrollView>
        {sandboxResponse && (
          <TouchableOpacity style={styles.copyResponseButton} onPress={() => copyToClipboard(sandboxResponse, 'response')}>
            <Ionicons name={copiedText === 'response' ? 'checkmark' : 'copy-outline'} size={16} color={COLORS.primary} />
            <Text style={styles.copyResponseText}>{copiedText === 'response' ? 'Copied!' : 'Copy Response'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>API Documentation</Text>
          <Text style={styles.pageSubtitle}>Integrate KwikPay into your application</Text>
        </View>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'docs' && styles.tabActive]}
            onPress={() => setActiveTab('docs')}
          >
            <Ionicons name="document-text" size={18} color={activeTab === 'docs' ? COLORS.white : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>Documentation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sandbox' && styles.tabActive]}
            onPress={() => setActiveTab('sandbox')}
          >
            <Ionicons name="flask" size={18} color={activeTab === 'sandbox' ? COLORS.white : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'sandbox' && styles.tabTextActive]}>Sandbox</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'docs' ? renderDocs() : renderSandbox()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  tabsContainer: { flexDirection: 'row', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightGray, gap: 6 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  docsContainer: { flex: 1, flexDirection: 'row' },
  docsSidebar: { width: 260, backgroundColor: COLORS.white, borderRightWidth: 1, borderRightColor: COLORS.border, padding: 16 },
  sidebarTitle: { fontSize: 12, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  categoryItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  categoryItemActive: { backgroundColor: COLORS.primaryLight },
  categoryText: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  categoryTextActive: { color: COLORS.primary },
  endpointsList: { paddingLeft: 8, marginBottom: 8 },
  endpointItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, gap: 8, marginBottom: 2 },
  endpointItemActive: { backgroundColor: COLORS.lightGray },
  methodBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  methodTextSmall: { fontSize: 9, fontWeight: '700' },
  endpointName: { fontSize: 13, color: COLORS.dark, flex: 1 },
  docsContent: { flex: 1, padding: 24 },
  endpointHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  methodBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  methodTextLarge: { fontSize: 14, fontWeight: '700' },
  endpointPath: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyButton: { padding: 8 },
  endpointDescription: { fontSize: 15, color: COLORS.gray, lineHeight: 22, marginBottom: 24 },
  codeSection: { marginBottom: 24 },
  codeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  statusBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  codeBlock: { backgroundColor: COLORS.codeBg, borderRadius: 12, padding: 16, overflow: 'hidden' },
  codeText: { fontSize: 13, color: COLORS.codeText, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20 },
  paramsSection: { marginBottom: 24 },
  paramsTable: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  paramRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paramName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  paramType: { width: 80, fontSize: 12, color: COLORS.secondary },
  paramDesc: { width: 80, fontSize: 12, color: COLORS.gray },
  languageTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  languageTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  languageTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  languageTabText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  languageTabTextActive: { color: COLORS.white },
  sandboxContainer: { flex: 1, flexDirection: 'row' },
  sandboxPanel: { flex: 1, backgroundColor: COLORS.white, padding: 24, borderRightWidth: 1, borderRightColor: COLORS.border },
  sandboxTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  sandboxSubtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 24 },
  sandboxRow: { marginBottom: 16 },
  methodSelector: { flexDirection: 'row', gap: 8 },
  methodOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightGray },
  methodOptionText: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 16 },
  pathInput: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10, fontSize: 14, color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderWidth: 1, borderColor: COLORS.border },
  bodyInput: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10, fontSize: 13, color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderWidth: 1, borderColor: COLORS.border, minHeight: 180, textAlignVertical: 'top' },
  templatesRow: { marginBottom: 16 },
  templateButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGray, marginRight: 8 },
  templateButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 24 },
  sendButtonDisabled: { opacity: 0.7 },
  sendButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  responsePanel: { flex: 1, backgroundColor: COLORS.lightGray, padding: 24 },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  responseTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statusIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusIndicatorText: { fontSize: 13, fontWeight: '600' },
  responseBody: { flex: 1 },
  emptyResponse: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyResponseText: { fontSize: 14, color: COLORS.gray, marginTop: 16 },
  copyResponseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 16 },
  copyResponseText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
});
