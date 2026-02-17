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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import { ProductDashboard } from '../../src/components/dashboard';
import { Advert } from '../../src/components/AdvertCarousel';
import api from '../../src/api/client';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import WebModal from '../../src/components/WebModal';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';

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
  danger: '#DC2626',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' },
  sent: { label: 'Sent', color: '#2563EB', bg: '#DBEAFE' },
  paid: { label: 'Paid', color: '#059669', bg: '#D1FAE5' },
  partial: { label: 'Partial', color: '#D97706', bg: '#FEF3C7' },
  overdue: { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
};

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_date: string;
  due_date: string;
  total: number;
  subtotal?: number;
  tax_total?: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  items: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
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
  const [chartData, setChartData] = useState<{
    monthly_revenue: Array<{ month: string; invoiced: number; paid: number }>;
  } | null>(null);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Invoice view modal state
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });

  const fetchData = async () => {
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const [summaryRes, invoicesRes, chartRes] = await Promise.all([
        api.get('/invoices/summary'),
        api.get(`/invoices?status=${status}${searchQuery ? `&search=${searchQuery}` : ''}`),
        api.get('/invoices/chart-data')
      ]);
      setSummary(summaryRes.data);
      setInvoices(invoicesRes.data);
      setChartData(chartRes.data);
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
    setDeleting(true);
    try {
      await api.delete(`/invoices/${invoiceToDelete.id}`);
      setShowConfirmDelete(false);
      setSuccessMessage({ title: 'Invoice Deleted', subtitle: `Invoice "${invoiceToDelete.invoice_number}" has been deleted.` });
      setInvoiceToDelete(null);
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
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

  const renderInvoiceCard = (invoice: Invoice) => (
    <TouchableOpacity
      key={invoice.id}
      style={styles.invoiceCard}
      onPress={() => router.push(`/invoicing/${invoice.id}`)}
      onLongPress={() => { setInvoiceToDelete(invoice); setShowConfirmDelete(true); }}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(invoice.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Text>
        </View>
      </View>
      
      {/* Invoice Details */}
      <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
      <Text style={styles.customerName}>{invoice.customer_name}</Text>
      
      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>Amount</Text>
          <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total)}</Text>
        </View>
        <View style={styles.cardDates}>
          <Text style={styles.cardLabel}>Due Date</Text>
          <Text style={styles.invoiceDate}>{formatDate(invoice.due_date)}</Text>
        </View>
      </View>
      
      {/* Balance Due */}
      {invoice.balance_due > 0 && (
        <View style={styles.balanceDueContainer}>
          <Text style={styles.balanceDueLabel}>Balance Due:</Text>
          <Text style={styles.balanceDueAmount}>{formatCurrency(invoice.balance_due)}</Text>
        </View>
      )}
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
      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invoices</Text>
        </View>
      )}

      {/* WEB DASHBOARD - Using ProductDashboard Component */}
      {isWeb ? (
        <ProductDashboard
          productId="invoicing"
          subtitle="Overview of your invoicing activity"
          onNewAction={() => router.push('/invoicing/list?action=create')}
          newActionLabel="New Invoice"
          statsRow={[
            { label: 'Total Invoices', value: summary?.total_invoices || 0, icon: 'document-text', iconBg: '#EDE9FE', iconColor: '#7C3AED' },
            { label: 'Total Paid', value: formatCurrency(summary?.total_paid || 0), icon: 'checkmark-circle', iconBg: '#D1FAE5', iconColor: '#10B981' },
            { label: 'Outstanding', value: formatCurrency(summary?.total_outstanding || 0), icon: 'time', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
            { label: 'Overdue', value: summary?.overdue_count || 0, icon: 'alert-circle', iconBg: '#FEE2E2', iconColor: '#EF4444' },
          ]}
          netIncome={{ value: summary?.total_paid || 0, trend: 15 }}
          totalReturn={{ value: summary?.overdue_count || 0, trend: -8 }}
          revenueTotal={summary?.total_amount || 0}
          revenueTrend={12}
          adverts={adverts}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onTransactionViewMore={() => router.push('/invoicing/list')}
          onSalesReportViewMore={() => router.push('/invoicing/reports')}
          onPromoPress={() => router.push('/invoicing/list?action=create')}
          promoTitle="Streamline your invoicing process."
          promoSubtitle="Create professional invoices, track payments, and get paid faster."
          promoButtonText="Create Invoice"
          formatCurrency={formatCurrency}
        />
      ) : (
        /* MOBILE LAYOUT */
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          
          {/* Stats - Only show summary cards on mobile */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time-outline" size={24} color={COLORS.warning} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Outstanding</Text>
                <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="alert-circle-outline" size={24} color={COLORS.primary} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Overdue</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
              </View>
            </View>
          </View>
          
          {/* Main Card Container - Contains Tabs, Search, and Invoice List */}
          <View style={styles.mainCard}>
            {/* Tabs inside the card */}
            <View style={styles.tabsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
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
            </View>
            
            {/* Search inside the card */}
            <View style={styles.searchInsideCard}>
              <Ionicons name="search" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search invoices..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.gray}
              />
            </View>
            
            {/* Invoice List inside the card - this scrolls internally */}
            <ScrollView 
              style={styles.invoiceListScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {invoices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color={COLORS.gray} />
                  <Text style={styles.emptyText}>No invoices found</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/invoicing/list?action=create')}>
                    <Text style={styles.emptyBtnText}>Create First Invoice</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.invoiceListContent}>
                  {invoices.map(renderInvoiceCard)}
                </View>
              )}
            </ScrollView>
          </View>
          
          {/* Quick Actions Card */}
          <View style={[styles.adminCard, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.adminCardTitle}>Quick Actions</Text>
            <View style={styles.adminToolsGrid}>
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/list?action=create')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#DDD6FE' }]}>
                  <Ionicons name="add-circle" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.adminToolLabel}>New Invoice</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/payments')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="card" size={24} color="#059669" />
                </View>
                <Text style={styles.adminToolLabel}>Payments</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/quotes')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="clipboard" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.adminToolLabel}>Quotes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/clients/create')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="person-add" size={24} color="#0EA5E9" />
                </View>
                <Text style={styles.adminToolLabel}>New Client</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Tools Card */}
          <View style={[styles.adminCard, { backgroundColor: '#F8FAFC' }]}>
            <Text style={styles.adminCardTitle}>Admin Tools</Text>
            <View style={styles.adminToolsGrid}>
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/clients')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="people" size={24} color="#0EA5E9" />
                </View>
                <Text style={styles.adminToolLabel}>Clients</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/products')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="cube" size={24} color="#22C55E" />
                </View>
                <Text style={styles.adminToolLabel}>Products</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/reports')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="bar-chart" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.adminToolLabel}>Reports</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/settings')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#E2E8F0' }]}>
                  <Ionicons name="settings" size={24} color="#475569" />
                </View>
                <Text style={styles.adminToolLabel}>Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/staff')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="person" size={24} color="#EC4899" />
                </View>
                <Text style={styles.adminToolLabel}>Staff</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/categories')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#FEF9C3' }]}>
                  <Ionicons name="folder" size={24} color="#CA8A04" />
                </View>
                <Text style={styles.adminToolLabel}>Categories</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/invoicing/recurring')}>
                <View style={[styles.adminToolIcon, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="repeat" size={24} color="#6366F1" />
                </View>
                <Text style={styles.adminToolLabel}>Recurring</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.confirmOverlay} onPress={() => setShowSuccessModal(false)}>
          <View style={styles.confirmModal}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.confirmTitle}>{successMessage.title}</Text>
            <Text style={styles.confirmMessage}>{successMessage.subtitle}</Text>
            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: COLORS.blue }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.deleteBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* View Invoice Modal */}
      <WebModal
        visible={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title={viewingInvoice?.invoice_number || 'Invoice Details'}
        subtitle={`Billed to ${viewingInvoice?.customer_name || ''}`}
        icon="document-text"
        iconColor={COLORS.primary}
        maxWidth={650}
      >
        {viewingInvoice && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.viewStatusBadge, { backgroundColor: STATUS_CONFIG[viewingInvoice.status]?.bg || '#F3F4F6' }]}>
                <Text style={[styles.viewStatusText, { color: STATUS_CONFIG[viewingInvoice.status]?.color || '#6B7280' }]}>
                  {STATUS_CONFIG[viewingInvoice.status]?.label || viewingInvoice.status}
                </Text>
              </View>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Due: {viewingInvoice.due_date ? format(new Date(viewingInvoice.due_date), 'MMMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Client Details</Text>
              <View style={styles.viewCard}>
                <Text style={styles.viewCardTitle}>{viewingInvoice.customer_name}</Text>
                {viewingInvoice.customer_email && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_email}</Text>}
                {viewingInvoice.customer_phone && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_phone}</Text>}
                {viewingInvoice.customer_address && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_address}</Text>}
              </View>
            </View>
            
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Items</Text>
              <View style={styles.viewItemsTable}>
                <View style={styles.viewItemsHeader}>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 3 }]}>Description</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                </View>
                {viewingInvoice.items.map((item, idx) => (
                  <View key={idx} style={[styles.viewItemsRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.viewItemsCell, { flex: 3 }]}>{item.description || 'N/A'}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'center' }]}>{item.quantity || 0}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right' }]}>${(item.unit_price || 0).toFixed(2)}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>${(item.total || (item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.viewTotalsSection}>
              <View style={styles.viewTotalRow}>
                <Text style={styles.viewTotalLabel}>Subtotal</Text>
                <Text style={styles.viewTotalValue}>${(viewingInvoice.subtotal || viewingInvoice.total || 0).toFixed(2)}</Text>
              </View>
              {viewingInvoice.tax_total && viewingInvoice.tax_total > 0 && (
                <View style={styles.viewTotalRow}>
                  <Text style={styles.viewTotalLabel}>Tax</Text>
                  <Text style={styles.viewTotalValue}>${(viewingInvoice.tax_total || 0).toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.viewTotalRow, styles.viewGrandTotalRow]}>
                <Text style={styles.viewGrandTotalLabel}>Total</Text>
                <Text style={styles.viewGrandTotalValue}>${(viewingInvoice.total || 0).toFixed(2)}</Text>
              </View>
              {viewingInvoice.amount_paid > 0 && (
                <View style={styles.viewPaymentRow}>
                  <Text style={styles.viewPaymentLabel}>Amount Paid</Text>
                  <Text style={styles.viewPaymentValue}>-${(viewingInvoice.amount_paid || 0).toFixed(2)}</Text>
                </View>
              )}
              {viewingInvoice.balance_due > 0 && (
                <View style={styles.viewBalanceRow}>
                  <Text style={styles.viewBalanceLabel}>Balance Due</Text>
                  <Text style={styles.viewBalanceValue}>${(viewingInvoice.balance_due || 0).toFixed(2)}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.viewActionsRow}>
              {viewingInvoice.status === 'draft' && (
                <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => { setViewingInvoice(null); router.push(`/invoicing/${viewingInvoice.id}`); }}>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Send Invoice</Text>
                </TouchableOpacity>
              )}
              {(viewingInvoice.status === 'sent' || viewingInvoice.status === 'partial' || viewingInvoice.status === 'overdue') && (
                <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: COLORS.success }]} onPress={() => { setViewingInvoice(null); router.push(`/invoicing/${viewingInvoice.id}`); }}>
                  <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Record Payment</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: COLORS.primary }]} onPress={() => { setViewingInvoice(null); router.push(`/invoicing/${viewingInvoice.id}`); }}>
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: '#059669' }]} onPress={() => { /* TODO: implement print/PDF */ }}>
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Print / PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        visible={showConfirmDelete}
        title="Delete Invoice?"
        message={invoiceToDelete ? `Are you sure you want to delete invoice "${invoiceToDelete.invoice_number}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteInvoice}
        onCancel={() => { setShowConfirmDelete(false); setInvoiceToDelete(null); }}
        variant="danger"
        loading={deleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Web Page Header
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webPageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  webPageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  createInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createInvoiceBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Mobile Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  
  // Quick Actions
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 10, flex: 1 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  
  statsContainer: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  
  // Summary Row (2 cards at top)
  summaryRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12 
  },
  summaryCard: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16, 
    padding: 16, 
    gap: 12,
  },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 13, color: COLORS.dark, fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  
  // Main Card Container (Invoice List)
  mainCard: {
    backgroundColor: '#FEF7ED',  // Light orange/cream color
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: 320,  // Smaller height
  },
  
  // Admin Tools Card
  adminCard: {
    backgroundColor: '#F3E8FF',  // Light purple to match Invoicing theme
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  adminToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  adminToolItem: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  adminToolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  adminToolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  
  // Tabs wrapper and content
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tabsInsideCard: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: COLORS.lightGray, marginRight: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: '#FFF' },
  
  // Search inside card
  searchInsideCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 16, 
    marginVertical: 12, 
    backgroundColor: COLORS.lightGray, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    gap: 12 
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.dark },
  
  // Invoice list scroll area
  invoiceListScroll: {
    flex: 1,
    maxHeight: 200,
  },
  invoiceListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  
  listContainer: { paddingHorizontal: 16 },
  
  // Invoice Card Styles (inside the main card)
  invoiceCard: { 
    backgroundColor: COLORS.lightGray, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  customerName: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cardLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceAmount: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  cardDates: { alignItems: 'flex-end' },
  invoiceDate: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  balanceDueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: -16,
    marginBottom: -16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  balanceDueLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  balanceDueAmount: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
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

  // ========== WEB DASHBOARD STYLES ==========
  webDashboardContent: {
    padding: 24,
  },
  webStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  webStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  webStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webStatInfo: {
    flex: 1,
  },
  webStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  webStatLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  webMainContent: {
    flexDirection: 'row',
    gap: 24,
  },
  webTableCard: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  webTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  webTableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  webViewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  webFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  webTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  webTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  webTabActive: {
    backgroundColor: '#7C3AED',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webTabTextActive: {
    color: '#FFFFFF',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  webTableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  webTableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  webTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webTableCell: {
    fontSize: 14,
    color: '#374151',
  },
  webStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  webStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  webEmptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  webEmptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
  },
  webEmptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webSidebar: {
    flex: 1,
    gap: 20,
  },
  webQuickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  webQuickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  webQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 8,
  },
  webQuickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  webLinksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  webLinksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  webLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },

  // Charts Row
  webChartsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
  },
  webChartCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 20,
  },
  webChartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  webChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 160,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  webChartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  webLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  webLegendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // View Invoice Modal Styles
  viewStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewSection: {
    marginBottom: 20,
  },
  viewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  viewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  viewCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  viewItemsTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewItemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewItemsHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  viewItemsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewItemsCell: {
    fontSize: 14,
    color: '#111827',
  },
  viewTotalsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  viewTotalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewTotalValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  viewGrandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewGrandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewGrandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 8,
  },
  viewPaymentLabel: {
    fontSize: 14,
    color: '#059669',
  },
  viewPaymentValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  viewBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginTop: 8,
  },
  viewBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  viewBalanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  viewActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  viewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
