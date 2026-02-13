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

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  created_at: string;
  items: { description: string; quantity: number; price: number }[];
}

export default function InvoicingPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices');
      // API returns a list directly or {invoices: [...]}
      const invoiceData = Array.isArray(response.data) ? response.data : (response.data?.invoices || []);
      setInvoices(invoiceData.map((inv: any) => ({
        id: inv._id || inv.id,
        invoice_number: inv.invoice_number || `INV-${String(inv.id).slice(-4)}`,
        customer_name: inv.client_name || inv.customer_name || 'Unknown',
        customer_email: inv.client_email || inv.customer_email || '',
        amount: inv.total || inv.amount || 0,
        currency: inv.currency || 'TZS',
        status: inv.status || 'draft',
        due_date: inv.due_date?.split('T')[0] || '',
        created_at: inv.created_at?.split('T')[0] || '',
        items: inv.items || [{ description: 'Item', quantity: 1, price: inv.total || 0 }],
      })));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreateInvoice = async () => {
    if (!customerName || !customerEmail || !itemDescription || !itemPrice) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      // Generate invoice number
      const invoiceNumResponse = await api.get('/business/settings/generate-invoice-number').catch(() => null);
      const invoiceNumber = invoiceNumResponse?.data?.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
      
      // Create client first if needed
      const clientResponse = await api.post('/invoices/clients', {
        name: customerName,
        email: customerEmail,
      }).catch(() => null);
      const clientId = clientResponse?.data?.id || null;

      // Create invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: clientId,
        client_name: customerName,
        client_email: customerEmail,
        items: [{
          description: itemDescription,
          quantity: parseInt(itemQuantity) || 1,
          unit_price: parseFloat(itemPrice) || 0,
          total: (parseFloat(itemPrice) || 0) * (parseInt(itemQuantity) || 1),
        }],
        subtotal: (parseFloat(itemPrice) || 0) * (parseInt(itemQuantity) || 1),
        total: (parseFloat(itemPrice) || 0) * (parseInt(itemQuantity) || 1),
        currency: 'TZS',
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
      };

      await api.post('/invoices', invoiceData);
      Alert.alert('Success', 'Invoice created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleSendInvoice = (invoiceId: string) => {
    setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'sent' } : inv));
    Alert.alert('Success', 'Invoice sent to customer');
  };

  const handleMarkPaid = (invoiceId: string) => {
    setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setItemDescription('');
    setItemQuantity('1');
    setItemPrice('');
    setDueDate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return COLORS.gray;
      case 'sent': return COLORS.secondary;
      case 'paid': return COLORS.primary;
      case 'overdue': return COLORS.danger;
      case 'cancelled': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'draft': return COLORS.lightGray;
      case 'sent': return COLORS.secondaryLight;
      case 'paid': return COLORS.primaryLight;
      case 'overdue': return COLORS.dangerLight;
      case 'cancelled': return COLORS.warningLight;
      default: return COLORS.lightGray;
    }
  };

  const totalOutstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((a, i) => a + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoices(); }} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Invoicing</Text>
            <Text style={styles.pageSubtitle}>Create and manage invoices</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="document-text" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="document-text" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{invoices.length}</Text>
            <Text style={styles.statLabel}>Total Invoices</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(totalOutstanding)}</Text>
            <Text style={styles.statLabel}>Outstanding</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>TZS {formatNumber(totalPaid)}</Text>
            <Text style={styles.statLabel}>Collected</Text>
          </View>
        </View>

        {/* Invoice List */}
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Invoices</Text>
            <Text style={styles.emptyText}>Create your first invoice to get started</Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.invoiceCard}
              onPress={() => setSelectedInvoice(invoice)}
            >
              <View style={styles.invoiceHeader}>
                <View>
                  <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                  <Text style={styles.invoiceCustomer}>{invoice.customer_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(invoice.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.invoiceDetails}>
                <View style={styles.invoiceDetail}>
                  <Text style={styles.invoiceLabel}>Amount</Text>
                  <Text style={styles.invoiceValue}>{invoice.currency} {formatNumber(invoice.amount)}</Text>
                </View>
                <View style={styles.invoiceDetail}>
                  <Text style={styles.invoiceLabel}>Due Date</Text>
                  <Text style={[styles.invoiceValue, invoice.status === 'overdue' && { color: COLORS.danger }]}>
                    {invoice.due_date}
                  </Text>
                </View>
              </View>
              <View style={styles.invoiceActions}>
                {invoice.status === 'draft' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSendInvoice(invoice.id)}
                  >
                    <Ionicons name="send" size={14} color={COLORS.secondary} />
                    <Text style={[styles.actionText, { color: COLORS.secondary }]}>Send</Text>
                  </TouchableOpacity>
                )}
                {['sent', 'overdue'].includes(invoice.status) && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkPaid(invoice.id)}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                    <Text style={[styles.actionText, { color: COLORS.primary }]}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="download" size={14} color={COLORS.gray} />
                  <Text style={[styles.actionText, { color: COLORS.gray }]}>Download</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Invoice Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Invoice</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Company/Client Name"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Customer Email *</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="billing@example.com"
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Item Description *</Text>
              <TextInput
                style={styles.input}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="Product or service description"
                placeholderTextColor={COLORS.gray}
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={itemQuantity}
                    onChangeText={setItemQuantity}
                    placeholder="1"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Unit Price (TZS) *</Text>
                  <TextInput
                    style={styles.input}
                    value={itemPrice}
                    onChangeText={setItemPrice}
                    placeholder="100,000"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD (default: 30 days)"
                placeholderTextColor={COLORS.gray}
              />

              {itemPrice && (
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    TZS {formatNumber((parseFloat(itemPrice) || 0) * (parseInt(itemQuantity) || 1))}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateInvoice}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="document-text" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Create Invoice</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal visible={!!selectedInvoice} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Details</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            {selectedInvoice && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Invoice Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice #</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.invoice_number}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedInvoice.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedInvoice.status) }]}>
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.created_at}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.due_date}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Customer</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.customer_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.customer_email}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Items</Text>
                  {selectedInvoice.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        <Text style={styles.itemQty}>{item.quantity} x TZS {formatNumber(item.price)}</Text>
                      </View>
                      <Text style={styles.itemTotal}>TZS {formatNumber(item.quantity * item.price)}</Text>
                    </View>
                  ))}
                  <View style={styles.grandTotal}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>{selectedInvoice.currency} {formatNumber(selectedInvoice.amount)}</Text>
                  </View>
                </View>
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
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  invoiceCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  invoiceCustomer: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  invoiceDetails: { flexDirection: 'row', gap: 24, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  invoiceDetail: {},
  invoiceLabel: { fontSize: 11, color: COLORS.gray },
  invoiceValue: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginTop: 4 },
  invoiceActions: { flexDirection: 'row', gap: 16, paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  totalBox: { backgroundColor: COLORS.primaryLight, padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primaryDark },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 12, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.gray },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemInfo: {},
  itemDesc: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  itemQty: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 8 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  grandTotalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
});
