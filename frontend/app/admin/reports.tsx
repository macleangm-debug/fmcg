import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { reportsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import DatePickerModal from '../../src/components/DatePickerModal';
import { ExportReportModal } from '../../src/components/reports';
import type { ExportReportConfig } from '../../src/components/reports';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Month names
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Colors matching RetailPro theme
const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
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

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

const PERIODS: { key: Period; label: string; icon?: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom', icon: 'calendar-outline' },
];

type ReportType = 'sales' | 'products' | 'customers' | 'staff' | 'payments' | 'discounts' | 'tax';

interface ReportData {
  period: string;
  date_range: { start: string; end: string };
  total_revenue: number;
  total_orders: number;
  total_items_sold: number;
  avg_order_value: number;
  new_customers: number;
  top_selling_products: Array<{ name: string; quantity: number; revenue: number }>;
  sales_by_category: Array<{ name: string; revenue: number; quantity: number }>;
  sales_by_staff: Array<{ name: string; orders: number; revenue: number }>;
  hourly_sales: Array<{ hour: string; orders: number; revenue: number }>;
  payment_method_breakdown: { cash: number; card: number; mobile_money: number; credit: number };
}

export default function Reports() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { formatCurrency, currentBusiness } = useBusinessStore();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<ReportData | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  
  // Custom date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [useCustomDates, setUseCustomDates] = useState(false);

  const businessName = currentBusiness?.name || 'RetailPro';
  const businessInitials = businessName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      router.back();
    }
  }, [currentUser]);

  const fetchReport = async () => {
    try {
      const response = await reportsApi.getSummary(period);
      setData(response.data);
    } catch (error) {
      console.log('Failed to fetch report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReport();
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport();
  }, [period]);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'cash-outline';
      case 'card': return 'card-outline';
      case 'mobile_money': return 'phone-portrait-outline';
      case 'credit': return 'time-outline';
      default: return 'wallet-outline';
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case 'cash': return '#10B981';
      case 'card': return '#2563EB';
      case 'mobile_money': return '#8B5CF6';
      case 'credit': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Generate export config for reusable ExportReportModal
  const getExportConfig = (): ExportReportConfig => {
    const dateRange = useCustomDates
      ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : getPeriodDateRange();

    const activeReportLabel = reportTabs.find(t => t.key === activeReport)?.label || 'Sales Overview';

    // Payment data for charts
    const paymentData = Object.entries(data?.payment_method_breakdown || {}).map(([method, amount]) => ({
      label: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: amount as number,
      color: getPaymentColor(method)
    }));

    // Category data for progress bars
    const categoryData = (data?.sales_by_category || []).slice(0, 4).map((cat, i) => {
      const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];
      return { label: cat.name, value: cat.revenue, color: colors[i % 4] };
    });

    // Build tables based on active report
    const tables = [];
    
    if (activeReport === 'products' || activeReport === 'sales') {
      tables.push({
        title: 'Top Selling Products',
        columns: [
          { key: 'rank', label: 'Rank', flex: 0.5 },
          { key: 'name', label: 'Product', flex: 2 },
          { key: 'quantity', label: 'Qty', align: 'right' as const, flex: 1 },
          { key: 'revenue', label: 'Revenue', align: 'right' as const, flex: 1.5, format: (v: number) => formatCurrency(v) },
        ],
        rows: (data?.top_selling_products || []).slice(0, 10).map((p, i) => ({
          rank: `#${i + 1}`,
          name: p.name,
          quantity: p.quantity,
          revenue: p.revenue,
        })),
      });
    }

    if (activeReport === 'staff' || activeReport === 'sales') {
      tables.push({
        title: 'Staff Performance',
        columns: [
          { key: 'name', label: 'Staff', flex: 2 },
          { key: 'orders', label: 'Orders', align: 'right' as const, flex: 1 },
          { key: 'revenue', label: 'Revenue', align: 'right' as const, flex: 1.5, format: (v: number) => formatCurrency(v) },
        ],
        rows: (data?.sales_by_staff || []).map(s => ({
          name: s.name,
          orders: s.orders,
          revenue: s.revenue,
        })),
      });
    }

    if (activeReport === 'payments') {
      const totalPayments = paymentData.reduce((sum, d) => sum + d.value, 0);
      tables.push({
        title: 'Payment Methods Breakdown',
        columns: [
          { key: 'method', label: 'Method', flex: 2 },
          { key: 'amount', label: 'Amount', align: 'right' as const, flex: 1.5, format: (v: number) => formatCurrency(v) },
          { key: 'percentage', label: '%', align: 'right' as const, flex: 1 },
        ],
        rows: paymentData.map(p => ({
          method: p.label,
          amount: p.value,
          percentage: totalPayments > 0 ? `${Math.round((p.value / totalPayments) * 100)}%` : '0%',
        })),
      });
    }

    return {
      businessName,
      businessInitials,
      businessAddress: currentBusiness?.address,
      businessPhone: currentBusiness?.phone,
      businessEmail: currentBusiness?.email,
      reportTitle: `${activeReportLabel} Report`,
      dateRange,
      metrics: [
        { label: 'Total Revenue', value: formatCurrency(data?.total_revenue || 0), icon: 'cash-outline' },
        { label: 'Orders', value: data?.total_orders || 0, color: 'success', icon: 'receipt-outline' },
        { label: 'Items Sold', value: data?.total_items_sold || 0, icon: 'cube-outline' },
        { label: 'Avg Order', value: formatCurrency(data?.avg_order_value || 0), color: 'warning', icon: 'trending-up-outline' },
      ],
      chartData: activeReport === 'payments' ? paymentData : categoryData,
      chartTitle: activeReport === 'payments' ? 'Payment Distribution' : 'Sales by Category',
      progressData: categoryData,
      progressTitle: 'Category Performance',
      tables,
      primaryColor: COLORS.primary,
      appName: 'RetailPro',
    };
  };

  // Export handler - delegate to modal component
  const handleExportModalClose = () => {
    setExportModalVisible(false);
  };

  // Export Modal Component
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Updated Report tabs with renamed and additional options
  const reportTabs: { key: ReportType; label: string; icon: string }[] = [
    { key: 'sales', label: 'Sales Overview', icon: 'trending-up-outline' },
    { key: 'products', label: 'Product Performance', icon: 'cube-outline' },
    { key: 'customers', label: 'Customers', icon: 'people-outline' },
    { key: 'staff', label: 'Staff Performance', icon: 'person-outline' },
    { key: 'payments', label: 'Payments', icon: 'card-outline' },
    { key: 'discounts', label: 'Discounts', icon: 'pricetag-outline' },
    { key: 'tax', label: 'Tax Summary', icon: 'document-text-outline' },
  ];

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get period date range string
  const getPeriodDateRange = () => {
    if (period === 'custom') {
      return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        return formatDate(now);
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    return `${formatDate(startDate)} - ${formatDate(now)}`;
  };

  // Handle date picker apply
  const handleDatePickerApply = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setUseCustomDates(true);
    setShowDatePicker(false);
    // Trigger refresh
    setTimeout(() => fetchReport(), 0);
  };

  // Handle date picker cancel
  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
  };

  // Page Header Component
  const PageHeader = () => (
    <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
      <View style={styles.pageHeaderLeft}>
        <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Reports</Text>
        <Text style={styles.pageSubtitle}>
          {data?.total_orders || 0} order(s) • {useCustomDates 
            ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : getPeriodDateRange()}
        </Text>
      </View>
      <View style={[styles.pageHeaderRight, isMobile && styles.pageHeaderRightMobile]}>
        <TouchableOpacity style={styles.exportButtonStandard} onPress={() => setExportModalVisible(true)}>
          <Ionicons name="download-outline" size={18} color={COLORS.white} />
          <Text style={styles.exportButtonTextStandard}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Period Selector (matching Invoicing exactly)
  const PeriodSelector = () => (
    <View style={styles.periodSectionStandard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollStandard}>
        {[
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'Week' },
          { key: 'month', label: 'Month' },
          { key: 'quarter', label: 'Quarter' },
          { key: 'year', label: 'Year' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodChipStandard, period === tab.key && !useCustomDates && styles.periodChipStandardActive]}
            onPress={() => {
              setPeriod(tab.key as Period);
              setUseCustomDates(false);
            }}
          >
            <Text style={[styles.periodChipTextStandard, period === tab.key && !useCustomDates && styles.periodChipTextStandardActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.periodChipStandard, useCustomDates && styles.periodChipStandardActive]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons 
            name="calendar-outline" 
            size={14} 
            color={useCustomDates ? COLORS.white : COLORS.gray} 
          />
          <Text style={[styles.periodChipTextStandard, useCustomDates && styles.periodChipTextStandardActive]}>
            {useCustomDates 
              ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Date Picker Modal - TODO: Implement reusable DatePickerModal component */}
      {/* DatePickerModal component would go here */}
    </View>
  );

  // Report Tabs Component (pill style)
  const ReportTabs = () => (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {reportTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterPill, activeReport === tab.key && styles.filterPillActive]}
            onPress={() => setActiveReport(tab.key)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeReport === tab.key ? COLORS.white : COLORS.gray} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.filterPillText, activeReport === tab.key && styles.filterPillTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Quick Insights Cards
  const QuickInsights = () => (
    <View style={[styles.insightsRow, isMobile && styles.insightsRowMobile]}>
      <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
          </View>
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{formatCurrency(data?.total_revenue || 0)}</Text>
        <Text style={styles.insightLabel}>Total Revenue</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.success }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.success} />
          </View>
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{data?.total_orders || 0}</Text>
        <Text style={styles.insightLabel}>Orders</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.warning }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="cube-outline" size={18} color={COLORS.warning} />
          </View>
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{data?.total_items_sold || 0}</Text>
        <Text style={styles.insightLabel}>Items Sold</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: '#8B5CF6' }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="person-add-outline" size={18} color="#8B5CF6" />
          </View>
        </View>
        <Text style={[styles.insightValue, { color: '#8B5CF6' }, isMobile && styles.insightValueMobile]}>{data?.new_customers || 0}</Text>
        <Text style={styles.insightLabel}>New Customers</Text>
      </View>
    </View>
  );

  // Sales Overview Report Content
  const renderSalesReport = () => (
    <>
      <QuickInsights />
      
      {/* Payment Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        <View style={[styles.paymentGrid, isMobile && styles.paymentGridMobile]}>
          {Object.entries(data?.payment_method_breakdown || {}).map(([method, amount]) => (
            <View key={method} style={[styles.paymentItem, isMobile && styles.paymentItemMobile]}>
              <View style={[styles.paymentIcon, { backgroundColor: `${getPaymentColor(method)}15` }]}>
                <Ionicons name={getPaymentIcon(method) as any} size={18} color={getPaymentColor(method)} />
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(amount as number)}</Text>
              <Text style={styles.paymentMethod}>
                {method.replace('_', ' ').charAt(0).toUpperCase() + method.replace('_', ' ').slice(1)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Average Order Value */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={[styles.metricsGrid, isMobile && styles.metricsGridMobile]}>
          <View style={styles.metricItem}>
            <Ionicons name="cart-outline" size={24} color={COLORS.primary} />
            <Text style={styles.metricValue}>{formatCurrency(data?.avg_order_value || 0)}</Text>
            <Text style={styles.metricLabel}>Avg. Order Value</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="trending-up-outline" size={24} color={COLORS.success} />
            <Text style={[styles.metricValue, { color: COLORS.success }]}>{formatCurrency(data?.total_revenue || 0)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="cube-outline" size={24} color={COLORS.warning} />
            <Text style={[styles.metricValue, { color: COLORS.warning }]}>{data?.total_items_sold || 0}</Text>
            <Text style={styles.metricLabel}>Items Sold</Text>
          </View>
        </View>
      </View>
    </>
  );

  // Product Performance Report Content
  const renderProductsReport = () => (
    <>
      {/* Top Products */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Top 10</Text>
          </View>
        </View>
        {(data?.top_selling_products || []).slice(0, 10).map((product, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.listRank, index < 3 && { backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#F3F4F6' : '#FED7AA' }]}>
              <Text style={[styles.listRankText, index < 3 && { color: index === 0 ? '#D97706' : index === 1 ? '#6B7280' : '#EA580C' }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.listSubtext}>{product.quantity} units sold</Text>
            </View>
            <View style={styles.listValueContainer}>
              <Text style={styles.listValue}>{formatCurrency(product.revenue)}</Text>
              <Text style={styles.listValueSubtext}>revenue</Text>
            </View>
          </View>
        ))}
        {(!data?.top_selling_products || data.top_selling_products.length === 0) && (
          <Text style={styles.emptyText}>No sales data for this period</Text>
        )}
      </View>

      {/* Sales by Category */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sales by Category</Text>
        {(data?.sales_by_category || []).map((category, index) => {
          const totalCatRevenue = (data?.sales_by_category || []).reduce((sum, c) => sum + c.revenue, 0);
          const percentage = totalCatRevenue > 0 ? Math.round((category.revenue / totalCatRevenue) * 100) : 0;
          return (
            <View key={index} style={styles.listItem}>
              <View style={[styles.categoryDot, { backgroundColor: `hsl(${index * 60}, 70%, 50%)` }]} />
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{category.name}</Text>
                <Text style={styles.listSubtext}>{category.quantity} items • {percentage}%</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(category.revenue)}</Text>
            </View>
          );
        })}
        {(!data?.sales_by_category || data.sales_by_category.length === 0) && (
          <Text style={styles.emptyText}>No category data for this period</Text>
        )}
      </View>
    </>
  );

  // Customers Report Content
  const renderCustomersReport = () => (
    <>
      {/* Customer Overview */}
      <View style={[styles.insightsRow, isMobile && styles.insightsRowMobile]}>
        <View style={[styles.insightCard, { borderLeftColor: COLORS.purple }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="person-add-outline" size={18} color={COLORS.purple} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.purple }, isMobile && styles.insightValueMobile]}>{data?.new_customers || 0}</Text>
          <Text style={styles.insightLabel}>New Customers</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.success }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="refresh-outline" size={18} color={COLORS.success} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.success }, isMobile && styles.insightValueMobile]}>{Math.max(0, (data?.total_orders || 0) - (data?.new_customers || 0))}</Text>
          <Text style={styles.insightLabel}>Repeat Purchases</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            </View>
          </View>
          <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{formatCurrency(data?.avg_order_value || 0)}</Text>
          <Text style={styles.insightLabel}>Avg. Spend</Text>
        </View>
      </View>

      {/* Customer Insights */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Customer Insights</Text>
        <View style={styles.customerInsightRow}>
          <View style={styles.customerInsightItem}>
            <View style={[styles.customerInsightIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="trending-up" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.customerInsightValue}>{Math.round(((data?.new_customers || 0) / Math.max(1, data?.total_orders || 1)) * 100)}%</Text>
              <Text style={styles.customerInsightLabel}>New Customer Rate</Text>
            </View>
          </View>
          <View style={styles.customerInsightItem}>
            <View style={[styles.customerInsightIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="repeat" size={20} color={COLORS.success} />
            </View>
            <View>
              <Text style={[styles.customerInsightValue, { color: COLORS.success }]}>{Math.round((1 - ((data?.new_customers || 0) / Math.max(1, data?.total_orders || 1))) * 100)}%</Text>
              <Text style={styles.customerInsightLabel}>Retention Rate</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer Activity */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Customer Activity</Text>
        <View style={styles.activityTimeline}>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: COLORS.success }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Total Transactions</Text>
              <Text style={styles.activityValue}>{data?.total_orders || 0} orders placed</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Revenue Generated</Text>
              <Text style={styles.activityValue}>{formatCurrency(data?.total_revenue || 0)} total</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: COLORS.warning }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Products Purchased</Text>
              <Text style={styles.activityValue}>{data?.total_items_sold || 0} items</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  // Staff Performance Report Content
  const renderStaffReport = () => (
    <>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Staff Performance</Text>
          <View style={[styles.sectionBadge, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.sectionBadgeText, { color: COLORS.success }]}>This Period</Text>
          </View>
        </View>
        {(data?.sales_by_staff || []).map((staff, index) => {
          const totalStaffRevenue = (data?.sales_by_staff || []).reduce((sum, s) => sum + s.revenue, 0);
          const percentage = totalStaffRevenue > 0 ? Math.round((staff.revenue / totalStaffRevenue) * 100) : 0;
          return (
            <View key={index} style={styles.staffListItem}>
              <View style={[styles.staffAvatar, { backgroundColor: `hsl(${index * 50}, 70%, 90%)` }]}>
                <Ionicons name="person" size={18} color={`hsl(${index * 50}, 70%, 40%)`} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{staff.name}</Text>
                <Text style={styles.listSubtext}>{staff.orders} orders • {percentage}% of sales</Text>
              </View>
              <View style={styles.staffRevenue}>
                <Text style={styles.staffRevenueValue}>{formatCurrency(staff.revenue)}</Text>
                <View style={styles.staffProgressBar}>
                  <View style={[styles.staffProgressFill, { width: `${percentage}%`, backgroundColor: `hsl(${index * 50}, 70%, 50%)` }]} />
                </View>
              </View>
            </View>
          );
        })}
        {(!data?.sales_by_staff || data.sales_by_staff.length === 0) && (
          <Text style={styles.emptyText}>No staff data for this period</Text>
        )}
      </View>
    </>
  );

  // Payments Report Content
  const renderPaymentsReport = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Payment Methods</Text>
      <View style={[styles.paymentGrid, isMobile && styles.paymentGridMobile]}>
        {Object.entries(data?.payment_method_breakdown || {}).map(([method, amount]) => {
          const total = Object.values(data?.payment_method_breakdown || {}).reduce((sum, val) => sum + (val as number), 0);
          const percentage = total > 0 ? Math.round(((amount as number) / total) * 100) : 0;
          return (
            <View key={method} style={[styles.paymentCardLarge, isMobile && styles.paymentCardLargeMobile]}>
              <View style={[styles.paymentIconLarge, { backgroundColor: `${getPaymentColor(method)}15` }]}>
                <Ionicons name={getPaymentIcon(method) as any} size={24} color={getPaymentColor(method)} />
              </View>
              <Text style={styles.paymentMethodLarge}>
                {method.replace('_', ' ').charAt(0).toUpperCase() + method.replace('_', ' ').slice(1)}
              </Text>
              <Text style={[styles.paymentAmountLarge, { color: getPaymentColor(method) }]}>{formatCurrency(amount as number)}</Text>
              <Text style={styles.paymentPercentage}>{percentage}% of sales</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // Discounts Report Content
  const renderDiscountsReport = () => (
    <>
      {/* Discount Summary */}
      <View style={[styles.insightsRow, isMobile && styles.insightsRowMobile]}>
        <View style={[styles.insightCard, { borderLeftColor: COLORS.danger }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="pricetag-outline" size={18} color={COLORS.danger} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.danger }, isMobile && styles.insightValueMobile]}>{formatCurrency(0)}</Text>
          <Text style={styles.insightLabel}>Total Discounts</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.warning }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="ticket-outline" size={18} color={COLORS.warning} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.warning }, isMobile && styles.insightValueMobile]}>0</Text>
          <Text style={styles.insightLabel}>Coupons Used</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.success }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="flash-outline" size={18} color={COLORS.success} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.success }, isMobile && styles.insightValueMobile]}>0</Text>
          <Text style={styles.insightLabel}>Promo Sales</Text>
        </View>
      </View>

      {/* Discount Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Discount Activity</Text>
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyStateIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="pricetag-outline" size={32} color={COLORS.warning} />
          </View>
          <Text style={styles.emptyStateTitle}>No Discount Data</Text>
          <Text style={styles.emptyStateText}>Discount tracking will be available when promotions are applied to sales.</Text>
        </View>
      </View>
    </>
  );

  // Tax Summary Report Content
  const renderTaxReport = () => (
    <>
      {/* Tax Overview */}
      <View style={[styles.insightsRow, isMobile && styles.insightsRowMobile]}>
        <View style={[styles.insightCard, { borderLeftColor: COLORS.dark }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.dark} />
            </View>
          </View>
          <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{formatCurrency(Math.round((data?.total_revenue || 0) * 0.1))}</Text>
          <Text style={styles.insightLabel}>Est. Tax Collected</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
            </View>
          </View>
          <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{formatCurrency(data?.total_revenue || 0)}</Text>
          <Text style={styles.insightLabel}>Gross Revenue</Text>
        </View>
        
        <View style={[styles.insightCard, { borderLeftColor: COLORS.success }, isMobile && styles.insightCardMobile]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
            </View>
          </View>
          <Text style={[styles.insightValue, { color: COLORS.success }, isMobile && styles.insightValueMobile]}>{formatCurrency(Math.round((data?.total_revenue || 0) * 0.9))}</Text>
          <Text style={styles.insightLabel}>Net Revenue</Text>
        </View>
      </View>

      {/* Tax Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tax Breakdown</Text>
        <View style={styles.taxBreakdownRow}>
          <View style={styles.taxBreakdownItem}>
            <Text style={styles.taxBreakdownLabel}>VAT (10%)</Text>
            <Text style={styles.taxBreakdownValue}>{formatCurrency(Math.round((data?.total_revenue || 0) * 0.1))}</Text>
          </View>
          <View style={styles.taxBreakdownDivider} />
          <View style={styles.taxBreakdownItem}>
            <Text style={styles.taxBreakdownLabel}>Service Tax</Text>
            <Text style={styles.taxBreakdownValue}>{formatCurrency(0)}</Text>
          </View>
          <View style={styles.taxBreakdownDivider} />
          <View style={styles.taxBreakdownItem}>
            <Text style={styles.taxBreakdownLabel}>Other Taxes</Text>
            <Text style={styles.taxBreakdownValue}>{formatCurrency(0)}</Text>
          </View>
        </View>
      </View>

      {/* Tax by Category */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tax by Category</Text>
        {(data?.sales_by_category || []).map((category, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.categoryDot, { backgroundColor: `hsl(${index * 60}, 70%, 50%)` }]} />
            <View style={styles.listInfo}>
              <Text style={styles.listName}>{category.name}</Text>
              <Text style={styles.listSubtext}>Tax Rate: 10%</Text>
            </View>
            <Text style={styles.listValue}>{formatCurrency(Math.round(category.revenue * 0.1))}</Text>
          </View>
        ))}
        {(!data?.sales_by_category || data.sales_by_category.length === 0) && (
          <Text style={styles.emptyText}>No category tax data for this period</Text>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <PageHeader />
        <PeriodSelector />
        <ReportTabs />
        
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {activeReport === 'sales' && renderSalesReport()}
          {activeReport === 'products' && renderProductsReport()}
          {activeReport === 'customers' && renderCustomersReport()}
          {activeReport === 'staff' && renderStaffReport()}
          {activeReport === 'payments' && renderPaymentsReport()}
          {activeReport === 'discounts' && renderDiscountsReport()}
          {activeReport === 'tax' && renderTaxReport()}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal - Using Reusable Component */}
      <ExportReportModal
        visible={exportModalVisible}
        onClose={handleExportModalClose}
        config={getExportConfig()}
        formatCurrency={formatCurrency}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Page Header (matching invoicing style)
  pageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  pageHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  pageHeaderLeft: { flex: 1 },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  pageTitleMobile: {
    fontSize: 24,
  },
  pageSubtitle: { 
    fontSize: 14, 
    color: COLORS.gray, 
    marginTop: 4,
  },
  pageHeaderRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  pageHeaderRightMobile: {
    width: '100%',
  },
  exportButtonStandard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 10,
    gap: 8,
  },
  exportButtonTextStandard: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.white,
  },

  // Period Section Standard (matching invoicing)
  periodSectionStandard: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  periodScrollStandard: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  periodChipStandard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  periodChipStandardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodChipTextStandard: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  periodChipTextStandardActive: {
    color: COLORS.white,
  },

  // Filter Pills (matching invoice status filters)
  filterSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  content: {
    padding: 20,
  },
  contentMobile: {
    padding: 16,
  },
  
  // Quick Insights
  insightsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  insightsRowMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insightCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  insightCardMobile: { minWidth: '47%', flexGrow: 1, flexBasis: '47%', padding: 12 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightBadge: { fontSize: 12, fontWeight: '700', color: COLORS.success, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  insightValue: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  insightValueMobile: { fontSize: 18 },
  insightLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  
  // Section Card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  
  // Payment Grid
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentGridMobile: {
    gap: 8,
  },
  paymentItem: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentItemMobile: {
    width: '48%',
    padding: 12,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  
  // Payment Card Large (for payments tab)
  paymentCardLarge: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  paymentCardLargeMobile: {
    width: '100%',
    padding: 16,
  },
  paymentIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paymentMethodLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  paymentAmountLarge: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  paymentPercentage: {
    fontSize: 12,
    color: COLORS.gray,
  },
  
  // List Items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  listSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  listValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Export Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  exportModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  exportModalSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  exportModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  exportSummaryItem: {
    alignItems: 'center',
  },
  exportSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  exportSummaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  formatSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  formatSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  formatOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  formatOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  formatOptionTextActive: {
    color: COLORS.white,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  exportBtnPdf: {
    backgroundColor: COLORS.primary,
  },
  exportBtnCsv: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  exportBtnExcel: {
    backgroundColor: COLORS.success,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // New Export Modal Styles
  previewToggleRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  previewToggleBtnBase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  previewToggleBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  previewToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  previewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  previewToggleTextActive: {
    color: '#FFFFFF',
  },
  reportInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reportInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reportInfoLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfoLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  reportInfoName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  reportInfoType: {
    fontSize: 12,
    color: COLORS.gray,
  },
  reportInfoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportInfoDate: {
    fontSize: 13,
    color: COLORS.gray,
  },
  exportSummaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    marginHorizontal: 4,
  },
  exportSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  performanceSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  performanceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  performanceSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reportStyleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 10,
  },

  // Date Picker Modal Styles
  datePickerModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  datePickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  datePickerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  datePickerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerContent: {
    padding: 20,
  },
  dateInputRow: {
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  datePresetsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  datePresetsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
  },
  datePresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  datePresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  webDatePickerContainer: {
    marginTop: 16,
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  datePickerApplyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  datePickerApplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // New Report Styles
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsGridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  listValueContainer: {
    alignItems: 'flex-end',
  },
  listValueSubtext: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  
  // Customer Report Styles
  customerInsightRow: {
    flexDirection: 'row',
    gap: 16,
  },
  customerInsightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  customerInsightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInsightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  customerInsightLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  activityTimeline: {
    paddingLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  activityValue: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },

  // Staff Report Styles
  staffListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  staffRevenue: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  staffRevenueValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  staffProgressBar: {
    width: 80,
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  staffProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Tax Report Styles
  taxBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  taxBreakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  taxBreakdownLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  taxBreakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  taxBreakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  
  // Legacy styles (kept for compatibility)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Success Toast
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  successToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  successToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  
  // PDF Preview Styles
  previewReportHeader: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  previewBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  previewLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBrandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBrandSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  previewPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  previewPeriodText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  previewMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  previewMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  previewMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  previewTableSection: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  previewTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  previewTableHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  previewTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  previewTableCell: {
    fontSize: 11,
    color: '#475569',
  },
  previewTableCellValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  
  // Excel Preview Styles
  csvPreviewContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
  },
  csvPreviewHeader: {
    backgroundColor: '#334155',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  csvPreviewLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  csvPreviewLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvPreviewLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  csvPreviewBusinessName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  csvPreviewReportType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  csvPreviewDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  csvPreviewDateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  csvTableSection: {
    marginBottom: 16,
  },
  csvTableTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  csvTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  csvTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  csvTableHeaderText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  csvTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  csvTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  csvTableCell: {
    fontSize: 10,
    color: '#475569',
  },
  csvTableCellValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E293B',
  },
  csvTableCellNote: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
