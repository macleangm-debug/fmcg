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
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#EF4444',
  primaryLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EBF4FF',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
};

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  invoice_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  items: any[];
}

interface Summary {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
}

export default function InvoicingDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const fetchData = async () => {
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const [summaryRes, invoicesRes] = await Promise.all([
        api.get('/invoices/summary'),
        api.get(`/invoices?status=${status}${searchQuery ? `&search=${searchQuery}` : ''}`)
      ]);
      setSummary(summaryRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.log('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [activeTab, searchQuery]);

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await api.delete(`/invoices/${invoiceToDelete.id}`);
      setShowConfirmDelete(false);
      setInvoiceToDelete(null);
      fetchData();
      Alert.alert('Success', 'Invoice deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'sent': return COLORS.blue;
      case 'draft': return COLORS.gray;
      case 'overdue': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.successLight;
      case 'sent': return COLORS.blueLight;
      case 'draft': return COLORS.lightGray;
      case 'overdue': return COLORS.primaryLight;
      default: return COLORS.lightGray;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.blueLight }]}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.blue} />
          </View>
          <Text style={styles.statValue}>{formatNumber(summary?.total_invoices || 0)}</Text>
          <Text style={styles.statLabel}>Invoices</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="cash-outline" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(summary?.total_amount || 0)}</Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons name="time-outline" size={28} color={COLORS.warning} />
          <Text style={styles.statValue}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
          <Text style={styles.statLabel}>Outstanding</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => setActiveTab('overdue')}
        >
          <Ionicons name="alert-circle-outline" size={28} color={COLORS.primary} />
          <Text style={styles.statValue}>{formatNumber(summary?.overdue_count || 0)}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'draft', label: 'Draft' },
        { key: 'sent', label: 'Sent' },
        { key: 'paid', label: 'Paid' },
        { key: 'overdue', label: 'Overdue' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderInvoiceRow = (invoice: Invoice) => (
    <TouchableOpacity
      key={invoice.id}
      style={styles.invoiceRow}
      onPress={() => router.push(`/invoicing/${invoice.id}`)}
      onLongPress={() => { setInvoiceToDelete(invoice); setShowConfirmDelete(true); }}
    >
      <View style={styles.invoiceInfo}>
        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
        <Text style={styles.customerName}>{invoice.customer_name}</Text>
        <Text style={styles.invoiceDate}>{formatDate(invoice.invoice_date)}</Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(invoice.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web Header with Product Switcher */}
      {isWeb && (
        <View style={styles.webHeader}>
          <View style={styles.webHeaderLeft}>
            <View style={styles.invoicingBadge}>
              <Ionicons name="document-text" size={24} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.webHeaderTitle}>Invoicing</Text>
              <Text style={styles.webHeaderSubtitle}>Create & Track Invoices</Text>
            </View>
          </View>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/invoicing/create')}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <ProductSwitcher currentProductId="invoicing" />
          </View>
        </View>
      )}
      
      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/galaxy/home')}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoices</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/invoicing/create')}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Stats */}
        {renderStats()}
        
        {/* Tabs */}
        {renderTabs()}
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoices..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
        </View>
        
        {/* Invoice List */}
        <View style={styles.listContainer}>
          {invoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No invoices found</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/invoicing/create')}>
                <Text style={styles.emptyBtnText}>Create First Invoice</Text>
              </TouchableOpacity>
            </View>
          ) : (
            invoices.map(renderInvoiceRow)
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Confirmation */}
      <Modal visible={showConfirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning" size={48} color={COLORS.primary} />
            <Text style={styles.confirmTitle}>Delete Invoice?</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete invoice "{invoiceToDelete?.invoice_number}"?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmDelete(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteInvoice}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Web Header
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  invoicingBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  webHeaderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Mobile Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  
  statsContainer: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  
  tabsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: '#FFF' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.dark },
  
  listContainer: { paddingHorizontal: 16 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  invoiceInfo: { flex: 1 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  customerName: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  invoiceDate: { fontSize: 13, color: COLORS.gray },
  invoiceRight: { alignItems: 'flex-end', marginRight: 8 },
  invoiceAmount: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.gray, marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  confirmMessage: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.lightGray, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
