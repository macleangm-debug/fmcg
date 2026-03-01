import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PieChart, LineChart, BarChart } from 'react-native-gifted-charts';
import { reportsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import DatePickerModal from '../../src/components/DatePickerModal';
import { ExportReportModal } from '../../src/components/reports';
import type { ExportReportConfig } from '../../src/components/reports';

// RetailPro Theme Colors
const THEME = {
  primary: '#1B4332',
  primaryDark: '#081C15',
  primaryLight: '#2D6A4F',
  primarySoft: '#D8F3DC',
  primaryGradient: ['#1B4332', '#2D6A4F'],
  
  // Chart colors
  revenue: '#10B981',
  revenueBg: '#ECFDF5',
  orders: '#2563EB',
  ordersBg: '#EFF6FF',
  customers: '#8B5CF6',
  customersBg: '#F3E8FF',
  products: '#F59E0B',
  productsBg: '#FEF3C7',
  
  // Payment colors
  cash: '#1B4332',
  card: '#2563EB',
  mobileMoney: '#F59E0B',
  credit: '#8B5CF6',
  
  // Neutral
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ReportTab = 'overview' | 'products' | 'staff' | 'customers' | 'payments';

interface ReportData {
  period: string;
  date_range: { start: string; end: string };
  total_revenue: number;
  total_orders: number;
  total_items_sold: number;
  avg_order_value: number;
  new_customers: number;
  revenue_change?: number;
  orders_change?: number;
  top_selling_products: Array<{ name: string; quantity: number; revenue: number }>;
  sales_by_category: Array<{ name: string; revenue: number; quantity: number }>;
  sales_by_staff: Array<{ name: string; orders: number; revenue: number }>;
  hourly_sales: Array<{ hour: string; orders: number; revenue: number }>;
  daily_sales?: Array<{ day: string; revenue: number; orders: number }>;
  payment_method_breakdown: { cash: number; card: number; mobile_money: number; credit: number };
}

export default function ReportsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 1024;
  const isTablet = Platform.OS === 'web' && width > 768;
  
  const { user: currentUser } = useAuthStore();
  const { formatCurrency, activeBusiness } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: new Date(), end: new Date() });

  // Handle period change
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    if (newPeriod === 'custom') {
      setShowDatePicker(true);
    } else {
      setLoading(true);
      setPeriod(newPeriod);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      let start: string, end: string;
      const now = new Date();
      
      switch (period) {
        case 'today':
          start = end = now.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          start = weekStart.toISOString().split('T')[0];
          end = now.toISOString().split('T')[0];
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          end = now.toISOString().split('T')[0];
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          start = quarterStart.toISOString().split('T')[0];
          end = now.toISOString().split('T')[0];
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          end = now.toISOString().split('T')[0];
          break;
        case 'custom':
          start = customDateRange.start.toISOString().split('T')[0];
          end = customDateRange.end.toISOString().split('T')[0];
          break;
        default:
          start = end = now.toISOString().split('T')[0];
      }

      const response = await reportsApi.getSummary(start, end);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customDateRange]);

  useEffect(() => {
    fetchReports();
  }, [period, customDateRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  // Calculate totals for payment breakdown
  const totalPayments = reportData ? 
    (reportData.payment_method_breakdown?.cash || 0) + 
    (reportData.payment_method_breakdown?.card || 0) + 
    (reportData.payment_method_breakdown?.mobile_money || 0) + 
    (reportData.payment_method_breakdown?.credit || 0) : 0;

  // Export config
  const getExportConfig = (): ExportReportConfig => ({
    businessName: activeBusiness?.name || 'RetailPro',
    businessInitials: activeBusiness?.name?.charAt(0) || 'R',
    reportTitle: 'Sales Overview Report',
    dateRange: reportData?.date_range 
      ? `${new Date(reportData.date_range.start).toLocaleDateString()} - ${new Date(reportData.date_range.end).toLocaleDateString()}`
      : 'All Time',
    metrics: [
      { label: 'Total Revenue', value: formatCurrency(reportData?.total_revenue || 0), icon: 'cash-outline' },
      { label: 'Orders', value: reportData?.total_orders || 0, icon: 'receipt-outline' },
      { label: 'Items Sold', value: reportData?.total_items_sold || 0, icon: 'cube-outline' },
    ],
    chartData: [
      { label: 'Cash', value: reportData?.payment_method_breakdown?.cash || 0, color: THEME.cash },
      { label: 'Card', value: reportData?.payment_method_breakdown?.card || 0, color: THEME.card },
      { label: 'Mobile', value: reportData?.payment_method_breakdown?.mobile_money || 0, color: THEME.mobileMoney },
      { label: 'Credit', value: reportData?.payment_method_breakdown?.credit || 0, color: THEME.credit },
    ],
    chartTitle: 'Payment Methods',
    progressData: reportData?.sales_by_category?.slice(0, 5).map(cat => ({
      label: cat.name,
      value: cat.revenue,
      color: THEME.primary,
    })),
    progressTitle: 'Category Performance',
    primaryColor: THEME.primary,
    appName: 'RetailPro',
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Period pills
  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
    { key: 'custom', label: 'Custom' },
  ];

  // Report tabs
  const tabs: { key: ReportTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { key: 'products', label: 'Products', icon: 'cube-outline' },
    { key: 'staff', label: 'Staff', icon: 'people-outline' },
    { key: 'customers', label: 'Customers', icon: 'person-outline' },
    { key: 'payments', label: 'Payments', icon: 'card-outline' },
  ];

  // KPI Card Component
  const KPICard = ({ icon, iconBg, value, label, change, changePositive }: any) => (
    <View style={[styles.kpiCard, isDesktop && styles.kpiCardDesktop]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={THEME.primary} />
        </View>
        {change !== undefined && (
          <View style={[styles.kpiChange, changePositive ? styles.kpiChangePositive : styles.kpiChangeNegative]}>
            <Ionicons 
              name={changePositive ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={changePositive ? THEME.success : THEME.danger} 
            />
            <Text style={[styles.kpiChangeText, { color: changePositive ? THEME.success : THEME.danger }]}>
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );

  // Payment Item Component  
  const PaymentItem = ({ icon, label, amount, percentage, color }: any) => (
    <View style={styles.paymentItem}>
      <View style={[styles.paymentDot, { backgroundColor: color }]} />
      <Text style={styles.paymentLabel}>{label}</Text>
      <View style={styles.paymentValues}>
        <Text style={styles.paymentAmount}>{formatCurrency(amount)}</Text>
        <Text style={styles.paymentPercent}>{percentage}%</Text>
      </View>
    </View>
  );

  // Product Row Component
  const ProductRow = ({ rank, name, quantity, revenue }: any) => (
    <View style={styles.productRow}>
      <Text style={[styles.productRank, rank <= 3 && styles.productRankTop]}>#{rank}</Text>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{name}</Text>
        <Text style={styles.productQty}>{quantity} sold</Text>
      </View>
      <Text style={styles.productRevenue}>{formatCurrency(revenue)}</Text>
    </View>
  );

  // Staff Row Component
  const StaffRow = ({ name, orders, revenue }: any) => (
    <View style={styles.staffRow}>
      <View style={styles.staffAvatar}>
        <Text style={styles.staffAvatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{name}</Text>
        <Text style={styles.staffOrders}>{orders} orders</Text>
      </View>
      <Text style={styles.staffRevenue}>{formatCurrency(revenue)}</Text>
    </View>
  );

  // Daily sales for chart
  const dailySalesData = reportData?.daily_sales?.map(d => ({
    value: d.revenue || 0,
    label: d.day,
  })) || [];

  // Generate mock daily data if not available
  const chartData = dailySalesData.length > 0 ? dailySalesData : [
    { value: reportData?.total_revenue || 0, label: 'Today' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>
              {reportData?.date_range 
                ? `${new Date(reportData.date_range.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(reportData.date_range.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'All Time'
              }
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={() => setShowExportModal(true)}
            data-testid="export-btn"
          >
            <Ionicons name="download-outline" size={18} color={THEME.surface} />
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Period Filter */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodPill, period === p.key && styles.periodPillActive]}
                onPress={() => p.key === 'custom' ? setShowDatePicker(true) : setPeriod(p.key)}
                data-testid={`period-${p.key}`}
              >
                {p.key === 'custom' && <Ionicons name="calendar-outline" size={14} color={period === p.key ? THEME.surface : THEME.textSecondary} style={{ marginRight: 4 }} />}
                <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Report Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.key ? THEME.primary : THEME.textTertiary} 
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section 1: KPI Cards */}
        <View style={styles.section}>
          <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
            <KPICard 
              icon="cash-outline"
              iconBg={THEME.revenueBg}
              value={formatCurrency(reportData?.total_revenue || 0)}
              label="Total Revenue"
              change={reportData?.revenue_change}
              changePositive={(reportData?.revenue_change || 0) >= 0}
            />
            <KPICard 
              icon="receipt-outline"
              iconBg={THEME.ordersBg}
              value={reportData?.total_orders || 0}
              label="Orders"
              change={reportData?.orders_change}
              changePositive={(reportData?.orders_change || 0) >= 0}
            />
            <KPICard 
              icon="calculator-outline"
              iconBg={THEME.productsBg}
              value={formatCurrency(reportData?.avg_order_value || 0)}
              label="Avg Order Value"
            />
            <KPICard 
              icon="person-add-outline"
              iconBg={THEME.customersBg}
              value={reportData?.new_customers || 0}
              label="New Customers"
            />
          </View>
        </View>

        {/* Section 2: Revenue Trend Chart */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Revenue Trend</Text>
                <Text style={styles.cardSubtitle}>Daily sales performance</Text>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: THEME.revenue }]} />
                  <Text style={styles.legendText}>Revenue</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              {chartData.length > 1 ? (
                <LineChart
                  data={chartData}
                  height={200}
                  width={isDesktop ? width - 340 : width - 80}
                  spacing={isDesktop ? 60 : 40}
                  color={THEME.revenue}
                  thickness={3}
                  startFillColor={THEME.revenue}
                  endFillColor={THEME.surface}
                  startOpacity={0.2}
                  endOpacity={0}
                  curved
                  hideRules
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={THEME.border}
                  hideDataPoints={false}
                  dataPointsColor={THEME.revenue}
                  dataPointsRadius={4}
                  xAxisLabelTextStyle={{ fontSize: 10, color: THEME.textTertiary }}
                  isAnimated
                  areaChart
                />
              ) : (
                <View style={styles.noChartData}>
                  <Ionicons name="analytics-outline" size={48} color={THEME.textTertiary} />
                  <Text style={styles.noChartText}>Add more sales data to see trends</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Section 3: Payment Breakdown + Top Products */}
        <View style={[styles.section, isDesktop && styles.sectionRow]}>
          {/* Payment Breakdown */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            
            <View style={styles.paymentChart}>
              <PieChart
                data={[
                  { value: reportData?.payment_method_breakdown?.cash || 1, color: THEME.cash },
                  { value: reportData?.payment_method_breakdown?.card || 1, color: THEME.card },
                  { value: reportData?.payment_method_breakdown?.mobile_money || 1, color: THEME.mobileMoney },
                  { value: reportData?.payment_method_breakdown?.credit || 1, color: THEME.credit },
                ]}
                donut
                radius={80}
                innerRadius={55}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterValue}>{formatCurrency(totalPayments)}</Text>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                  </View>
                )}
              />
            </View>

            <View style={styles.paymentList}>
              <PaymentItem 
                label="Cash" 
                amount={reportData?.payment_method_breakdown?.cash || 0}
                percentage={totalPayments ? Math.round(((reportData?.payment_method_breakdown?.cash || 0) / totalPayments) * 100) : 0}
                color={THEME.cash}
              />
              <PaymentItem 
                label="Card" 
                amount={reportData?.payment_method_breakdown?.card || 0}
                percentage={totalPayments ? Math.round(((reportData?.payment_method_breakdown?.card || 0) / totalPayments) * 100) : 0}
                color={THEME.card}
              />
              <PaymentItem 
                label="Mobile Money" 
                amount={reportData?.payment_method_breakdown?.mobile_money || 0}
                percentage={totalPayments ? Math.round(((reportData?.payment_method_breakdown?.mobile_money || 0) / totalPayments) * 100) : 0}
                color={THEME.mobileMoney}
              />
              <PaymentItem 
                label="Credit" 
                amount={reportData?.payment_method_breakdown?.credit || 0}
                percentage={totalPayments ? Math.round(((reportData?.payment_method_breakdown?.credit || 0) / totalPayments) * 100) : 0}
                color={THEME.credit}
              />
            </View>
          </View>

          {/* Top Products */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Products</Text>
              <TouchableOpacity onPress={() => router.push('/admin/products')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>

            {reportData?.top_selling_products && reportData.top_selling_products.length > 0 ? (
              <View style={styles.productList}>
                {reportData.top_selling_products.slice(0, 5).map((product, idx) => (
                  <ProductRow 
                    key={idx}
                    rank={idx + 1}
                    name={product.name}
                    quantity={product.quantity}
                    revenue={product.revenue}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color={THEME.textTertiary} />
                <Text style={styles.emptyText}>No product data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 4: Staff Performance + Category Breakdown */}
        <View style={[styles.section, isDesktop && styles.sectionRow]}>
          {/* Staff Performance */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Staff Performance</Text>
              <TouchableOpacity onPress={() => router.push('/admin/staff')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>

            {reportData?.sales_by_staff && reportData.sales_by_staff.length > 0 ? (
              <View style={styles.staffList}>
                {reportData.sales_by_staff.slice(0, 5).map((staff, idx) => (
                  <StaffRow 
                    key={idx}
                    name={staff.name}
                    orders={staff.orders}
                    revenue={staff.revenue}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={THEME.textTertiary} />
                <Text style={styles.emptyText}>No staff data yet</Text>
              </View>
            )}
          </View>

          {/* Category Breakdown */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <Text style={styles.cardTitle}>Category Performance</Text>

            {reportData?.sales_by_category && reportData.sales_by_category.length > 0 ? (
              <View style={styles.categoryList}>
                {reportData.sales_by_category.slice(0, 5).map((cat, idx) => {
                  const maxRevenue = Math.max(...reportData.sales_by_category.map(c => c.revenue));
                  const percentage = maxRevenue > 0 ? (cat.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <View key={idx} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryValue}>{formatCurrency(cat.revenue)}</Text>
                      </View>
                      <View style={styles.categoryBarBg}>
                        <View style={[styles.categoryBar, { width: `${percentage}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="grid-outline" size={40} color={THEME.textTertiary} />
                <Text style={styles.emptyText}>No category data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 5: Business Insights */}
        <View style={styles.section}>
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>Business Insights</Text>
            <View style={[styles.insightsGrid, isDesktop && styles.insightsGridDesktop]}>
              <View style={styles.insightItem}>
                <Ionicons name="cart-outline" size={24} color={THEME.primary} />
                <Text style={styles.insightValue}>{reportData?.total_items_sold || 0}</Text>
                <Text style={styles.insightLabel}>Items Sold</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Ionicons name="refresh-outline" size={24} color={THEME.warning} />
                <Text style={styles.insightValue}>
                  {reportData?.new_customers && reportData.total_orders 
                    ? Math.round((reportData.total_orders / Math.max(reportData.new_customers, 1)) * 10) / 10
                    : 0
                  }
                </Text>
                <Text style={styles.insightLabel}>Orders/Customer</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Ionicons name="trending-up-outline" size={24} color={THEME.success} />
                <Text style={[styles.insightValue, { color: THEME.success }]}>
                  {reportData?.total_revenue && reportData.total_orders 
                    ? Math.round((reportData.total_revenue / reportData.total_orders) * 100) / 100
                    : 0
                  }%
                </Text>
                <Text style={styles.insightLabel}>Avg Margin</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onCancel={() => setShowDatePicker(false)}
        onApply={(start, end) => {
          setCustomDateRange({ start, end });
          setPeriod('custom');
          setShowDatePicker(false);
        }}
        initialStartDate={customDateRange.start}
        initialEndDate={customDateRange.end}
        primaryColor="#1B4332"
        primaryLightColor="#D8F3DC"
      />

      {/* Export Modal */}
      <ExportReportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={getExportConfig()}
        formatCurrency={formatCurrency}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  scrollContent: {
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.surface,
  },

  // Filter Bar
  filterBar: {
    marginBottom: 16,
  },
  periodScroll: {
    gap: 8,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  periodPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  periodTextActive: {
    color: THEME.surface,
  },

  // Tabs
  tabsContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabsScroll: {
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: THEME.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textTertiary,
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 20,
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiGridDesktop: {
    flexWrap: 'nowrap',
  },
  kpiCard: {
    width: '48%',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  kpiCardDesktop: {
    flex: 1,
    width: 'auto',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kpiChangePositive: {
    backgroundColor: THEME.revenueBg,
  },
  kpiChangeNegative: {
    backgroundColor: '#FEF2F2',
  },
  kpiChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  kpiLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
  },

  // Cards
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHalf: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 2,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  noChartData: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noChartText: {
    fontSize: 14,
    color: THEME.textTertiary,
    marginTop: 12,
  },

  // Payment
  paymentChart: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  pieCenterLabel: {
    fontSize: 11,
    color: THEME.textTertiary,
  },
  paymentList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  paymentValues: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  paymentPercent: {
    fontSize: 12,
    color: THEME.textTertiary,
  },

  // Products
  productList: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRank: {
    width: 32,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textTertiary,
  },
  productRankTop: {
    color: THEME.warning,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  productQty: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.success,
  },

  // Staff
  staffList: {
    gap: 12,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  staffOrders: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 2,
  },
  staffRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },

  // Category
  categoryList: {
    gap: 16,
    marginTop: 8,
  },
  categoryItem: {},
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  categoryBarBg: {
    height: 6,
    backgroundColor: THEME.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textTertiary,
    marginTop: 12,
  },

  // Insights
  insightsCard: {
    backgroundColor: THEME.primarySoft,
    borderRadius: 16,
    padding: 20,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightsGridDesktop: {},
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    height: 50,
    backgroundColor: THEME.primary,
    opacity: 0.2,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: 8,
  },
  insightLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
});
