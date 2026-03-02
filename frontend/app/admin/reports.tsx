import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

  // Calculate display date range based on period
  const getDisplayDateRange = useCallback(() => {
    const now = new Date();
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const formatShortDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    
    switch (period) {
      case 'today':
        return formatDate(now);
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return `${formatShortDate(weekStart)} - ${formatDate(now)}`;
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return `${formatShortDate(monthStart)} - ${formatDate(now)}`;
      }
      case 'quarter': {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return `${formatShortDate(quarterStart)} - ${formatDate(now)}`;
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return `${formatShortDate(yearStart)} - ${formatDate(now)}`;
      }
      case 'custom':
        return `${formatShortDate(customDateRange.start)} - ${formatDate(customDateRange.end)}`;
      default:
        return 'All Time';
    }
  }, [period, customDateRange]);

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

  // Fetch reports when period or custom date range changes
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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

  // Tab-specific export config
  const getExportConfig = useCallback((): ExportReportConfig => {
    const baseConfig = {
      businessName: activeBusiness?.name || 'RetailPro',
      businessInitials: activeBusiness?.name?.charAt(0) || 'R',
      dateRange: getDisplayDateRange(),
      primaryColor: THEME.primary,
      appName: 'RetailPro',
    };

    switch (activeTab) {
      case 'products':
        return {
          ...baseConfig,
          reportTitle: 'Products Report',
          metrics: [
            { label: 'Total Items Sold', value: reportData?.total_items_sold || 0, icon: 'cube-outline' },
            { label: 'Product Categories', value: reportData?.sales_by_category?.length || 0, icon: 'grid-outline' },
            { label: 'Top Selling Revenue', value: formatCurrency(reportData?.top_selling_products?.[0]?.revenue || 0), icon: 'trending-up-outline' },
          ],
          chartData: reportData?.sales_by_category?.slice(0, 5).map((cat, i) => ({
            label: cat.name,
            value: cat.revenue,
            color: [THEME.primary, THEME.card, THEME.mobileMoney, THEME.customers, THEME.danger][i % 5],
          })) || [],
          chartTitle: 'Sales by Category',
          progressData: reportData?.top_selling_products?.slice(0, 5).map(p => ({
            label: p.name,
            value: p.revenue,
            color: THEME.primary,
          })),
          progressTitle: 'Top Selling Products',
        };
      
      case 'staff':
        return {
          ...baseConfig,
          reportTitle: 'Staff Performance Report',
          metrics: [
            { label: 'Total Staff', value: reportData?.sales_by_staff?.length || 0, icon: 'people-outline' },
            { label: 'Total Orders', value: reportData?.total_orders || 0, icon: 'receipt-outline' },
            { label: 'Total Revenue', value: formatCurrency(reportData?.total_revenue || 0), icon: 'cash-outline' },
          ],
          chartData: reportData?.sales_by_staff?.slice(0, 5).map((staff, i) => ({
            label: staff.name,
            value: staff.revenue,
            color: [THEME.primary, THEME.card, THEME.mobileMoney, THEME.customers, THEME.danger][i % 5],
          })) || [],
          chartTitle: 'Revenue by Staff',
          progressData: reportData?.sales_by_staff?.slice(0, 5).map(s => ({
            label: s.name,
            value: s.orders,
            color: THEME.primary,
          })),
          progressTitle: 'Orders by Staff',
        };
      
      case 'customers':
        return {
          ...baseConfig,
          reportTitle: 'Customers Report',
          metrics: [
            { label: 'New Customers', value: reportData?.new_customers || 0, icon: 'person-add-outline' },
            { label: 'Total Orders', value: reportData?.total_orders || 0, icon: 'receipt-outline' },
            { label: 'Avg Order Value', value: formatCurrency(reportData?.avg_order_value || 0), icon: 'calculator-outline' },
          ],
          chartData: [],
          chartTitle: 'Customer Metrics',
        };
      
      case 'payments':
        return {
          ...baseConfig,
          reportTitle: 'Payments Report',
          metrics: [
            { label: 'Total Payments', value: formatCurrency(totalPayments), icon: 'wallet-outline' },
            { label: 'Total Transactions', value: reportData?.total_orders || 0, icon: 'swap-horizontal-outline' },
            { label: 'Avg Transaction', value: formatCurrency(reportData?.avg_order_value || 0), icon: 'calculator-outline' },
          ],
          chartData: [
            { label: 'Cash', value: reportData?.payment_method_breakdown?.cash || 0, color: THEME.cash },
            { label: 'Card', value: reportData?.payment_method_breakdown?.card || 0, color: THEME.card },
            { label: 'Mobile', value: reportData?.payment_method_breakdown?.mobile_money || 0, color: THEME.mobileMoney },
            { label: 'Credit', value: reportData?.payment_method_breakdown?.credit || 0, color: THEME.credit },
          ],
          chartTitle: 'Payment Methods',
        };
      
      default: // overview
        return {
          ...baseConfig,
          reportTitle: 'Sales Overview Report',
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
        };
    }
  }, [activeTab, reportData, activeBusiness, formatCurrency, totalPayments, getDisplayDateRange]);

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
  const StaffRow = ({ name, orders, revenue, rank }: any) => (
    <View style={styles.staffRow}>
      {rank && <Text style={[styles.productRank, rank <= 3 && styles.productRankTop]}>#{rank}</Text>}
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

  // ========== TAB CONTENT RENDERERS ==========
  
  // Overview Tab Content
  const renderOverviewTab = () => (
    <>
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
            <TouchableOpacity onPress={() => setActiveTab('products')}>
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
    </>
  );

  // Products Tab Content
  const renderProductsTab = () => (
    <>
      {/* Products KPIs */}
      <View style={styles.section}>
        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          <KPICard 
            icon="cube-outline"
            iconBg={THEME.productsBg}
            value={reportData?.total_items_sold || 0}
            label="Items Sold"
          />
          <KPICard 
            icon="layers-outline"
            iconBg={THEME.ordersBg}
            value={reportData?.sales_by_category?.length || 0}
            label="Active Categories"
          />
          <KPICard 
            icon="star-outline"
            iconBg={THEME.revenueBg}
            value={reportData?.top_selling_products?.length || 0}
            label="Top Performers"
          />
          <KPICard 
            icon="cash-outline"
            iconBg={THEME.customersBg}
            value={formatCurrency(reportData?.total_revenue || 0)}
            label="Product Revenue"
          />
        </View>
      </View>

      {/* Top Selling Products - Full Width */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Top Selling Products</Text>
              <Text style={styles.cardSubtitle}>Ranked by revenue generated</Text>
            </View>
          </View>

          {reportData?.top_selling_products && reportData.top_selling_products.length > 0 ? (
            <View style={styles.productList}>
              {reportData.top_selling_products.map((product, idx) => (
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
              <Ionicons name="cube-outline" size={48} color={THEME.textTertiary} />
              <Text style={styles.emptyText}>No product sales data yet</Text>
              <Text style={styles.emptySubtext}>Sales will appear here once you start selling</Text>
            </View>
          )}
        </View>
      </View>

      {/* Category Performance */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Category Performance</Text>
              <Text style={styles.cardSubtitle}>Revenue by product category</Text>
            </View>
          </View>

          {reportData?.sales_by_category && reportData.sales_by_category.length > 0 ? (
            <View style={styles.categoryList}>
              {reportData.sales_by_category.map((cat, idx) => {
                const maxRevenue = Math.max(...reportData.sales_by_category.map(c => c.revenue));
                const percentage = maxRevenue > 0 ? (cat.revenue / maxRevenue) * 100 : 0;
                const colors = [THEME.primary, THEME.card, THEME.mobileMoney, THEME.customers, THEME.danger];
                
                return (
                  <View key={idx} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.categoryDot, { backgroundColor: colors[idx % 5] }]} />
                        <Text style={styles.categoryName}>{cat.name}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.categoryValue}>{formatCurrency(cat.revenue)}</Text>
                        <Text style={styles.categoryQty}>{cat.quantity} items</Text>
                      </View>
                    </View>
                    <View style={styles.categoryBarBg}>
                      <View style={[styles.categoryBar, { width: `${percentage}%`, backgroundColor: colors[idx % 5] }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={48} color={THEME.textTertiary} />
              <Text style={styles.emptyText}>No category data yet</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Staff Tab Content
  const renderStaffTab = () => (
    <>
      {/* Staff KPIs */}
      <View style={styles.section}>
        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          <KPICard 
            icon="people-outline"
            iconBg={THEME.customersBg}
            value={reportData?.sales_by_staff?.length || 0}
            label="Active Staff"
          />
          <KPICard 
            icon="receipt-outline"
            iconBg={THEME.ordersBg}
            value={reportData?.total_orders || 0}
            label="Total Orders"
          />
          <KPICard 
            icon="cash-outline"
            iconBg={THEME.revenueBg}
            value={formatCurrency(reportData?.total_revenue || 0)}
            label="Total Revenue"
          />
          <KPICard 
            icon="calculator-outline"
            iconBg={THEME.productsBg}
            value={formatCurrency(
              (reportData?.total_revenue || 0) / Math.max(reportData?.sales_by_staff?.length || 1, 1)
            )}
            label="Avg per Staff"
          />
        </View>
      </View>

      {/* Staff Leaderboard */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Staff Leaderboard</Text>
              <Text style={styles.cardSubtitle}>Performance ranked by revenue</Text>
            </View>
          </View>

          {reportData?.sales_by_staff && reportData.sales_by_staff.length > 0 ? (
            <View style={styles.staffList}>
              {reportData.sales_by_staff.map((staff, idx) => (
                <StaffRow 
                  key={idx}
                  rank={idx + 1}
                  name={staff.name}
                  orders={staff.orders}
                  revenue={staff.revenue}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={THEME.textTertiary} />
              <Text style={styles.emptyText}>No staff performance data yet</Text>
              <Text style={styles.emptySubtext}>Staff sales will appear here once orders are processed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Staff Performance Chart */}
      {reportData?.sales_by_staff && reportData.sales_by_staff.length > 0 && (
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenue by Staff</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={reportData.sales_by_staff.slice(0, 5).map((s, i) => ({
                  value: s.revenue,
                  label: s.name.split(' ')[0],
                  frontColor: [THEME.primary, THEME.card, THEME.mobileMoney, THEME.customers, THEME.danger][i % 5],
                }))}
                barWidth={40}
                spacing={24}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                noOfSections={4}
                maxValue={Math.max(...reportData.sales_by_staff.map(s => s.revenue)) * 1.2}
                yAxisLabelTexts={[]}
                xAxisLabelTextStyle={{ fontSize: 10, color: THEME.textSecondary }}
              />
            </View>
          </View>
        </View>
      )}
    </>
  );

  // Customers Tab Content
  const renderCustomersTab = () => (
    <>
      {/* Customer KPIs */}
      <View style={styles.section}>
        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          <KPICard 
            icon="person-add-outline"
            iconBg={THEME.customersBg}
            value={reportData?.new_customers || 0}
            label="New Customers"
          />
          <KPICard 
            icon="receipt-outline"
            iconBg={THEME.ordersBg}
            value={reportData?.total_orders || 0}
            label="Total Orders"
          />
          <KPICard 
            icon="calculator-outline"
            iconBg={THEME.productsBg}
            value={formatCurrency(reportData?.avg_order_value || 0)}
            label="Avg Order Value"
          />
          <KPICard 
            icon="repeat-outline"
            iconBg={THEME.revenueBg}
            value={
              reportData?.new_customers && reportData.total_orders 
                ? (reportData.total_orders / Math.max(reportData.new_customers, 1)).toFixed(1)
                : '0'
            }
            label="Orders/Customer"
          />
        </View>
      </View>

      {/* Customer Insights */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Customer Insights</Text>
              <Text style={styles.cardSubtitle}>Key metrics for customer engagement</Text>
            </View>
          </View>

          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Ionicons name="trending-up-outline" size={32} color={THEME.success} />
              <Text style={styles.insightValue}>{formatCurrency(reportData?.total_revenue || 0)}</Text>
              <Text style={styles.insightLabel}>Total Customer Spend</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="cart-outline" size={32} color={THEME.primary} />
              <Text style={styles.insightValue}>{reportData?.total_items_sold || 0}</Text>
              <Text style={styles.insightLabel}>Items Purchased</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="gift-outline" size={32} color={THEME.mobileMoney} />
              <Text style={styles.insightValue}>
                {(reportData?.total_revenue || 0) > 0 ? Math.round((reportData?.total_revenue || 0) * 0.02) : 0}
              </Text>
              <Text style={styles.insightLabel}>Loyalty Points Earned</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer Growth Placeholder */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Customer Growth</Text>
              <Text style={styles.cardSubtitle}>New customer acquisition over time</Text>
            </View>
          </View>
          <View style={styles.noChartData}>
            <Ionicons name="people-outline" size={48} color={THEME.textTertiary} />
            <Text style={styles.noChartText}>Customer growth chart coming soon</Text>
            <Text style={styles.emptySubtext}>Track your customer acquisition trends</Text>
          </View>
        </View>
      </View>
    </>
  );

  // Payments Tab Content
  const renderPaymentsTab = () => (
    <>
      {/* Payment KPIs */}
      <View style={styles.section}>
        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          <KPICard 
            icon="wallet-outline"
            iconBg={THEME.revenueBg}
            value={formatCurrency(totalPayments)}
            label="Total Payments"
          />
          <KPICard 
            icon="swap-horizontal-outline"
            iconBg={THEME.ordersBg}
            value={reportData?.total_orders || 0}
            label="Transactions"
          />
          <KPICard 
            icon="calculator-outline"
            iconBg={THEME.productsBg}
            value={formatCurrency(reportData?.avg_order_value || 0)}
            label="Avg Transaction"
          />
          <KPICard 
            icon="cash-outline"
            iconBg={THEME.customersBg}
            value={totalPayments ? Math.round(((reportData?.payment_method_breakdown?.cash || 0) / totalPayments) * 100) + '%' : '0%'}
            label="Cash Ratio"
          />
        </View>
      </View>

      {/* Payment Method Breakdown - Large */}
      <View style={[styles.section, isDesktop && styles.sectionRow]}>
        <View style={[styles.card, isDesktop && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Payment Distribution</Text>
              <Text style={styles.cardSubtitle}>Breakdown by payment method</Text>
            </View>
          </View>
          
          <View style={styles.paymentChart}>
            <PieChart
              data={[
                { value: reportData?.payment_method_breakdown?.cash || 1, color: THEME.cash },
                { value: reportData?.payment_method_breakdown?.card || 1, color: THEME.card },
                { value: reportData?.payment_method_breakdown?.mobile_money || 1, color: THEME.mobileMoney },
                { value: reportData?.payment_method_breakdown?.credit || 1, color: THEME.credit },
              ]}
              donut
              radius={90}
              innerRadius={60}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterValue}>{formatCurrency(totalPayments)}</Text>
                  <Text style={styles.pieCenterLabel}>Total</Text>
                </View>
              )}
            />
          </View>
        </View>

        {/* Payment Details */}
        <View style={[styles.card, isDesktop && styles.cardHalf]}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          
          <View style={styles.paymentDetailsList}>
            {[
              { label: 'Cash', icon: 'cash-outline', amount: reportData?.payment_method_breakdown?.cash || 0, color: THEME.cash },
              { label: 'Card', icon: 'card-outline', amount: reportData?.payment_method_breakdown?.card || 0, color: THEME.card },
              { label: 'Mobile Money', icon: 'phone-portrait-outline', amount: reportData?.payment_method_breakdown?.mobile_money || 0, color: THEME.mobileMoney },
              { label: 'Credit', icon: 'time-outline', amount: reportData?.payment_method_breakdown?.credit || 0, color: THEME.credit },
            ].map((item, idx) => (
              <View key={idx} style={styles.paymentDetailRow}>
                <View style={styles.paymentDetailLeft}>
                  <View style={[styles.paymentDetailIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View>
                    <Text style={styles.paymentDetailLabel}>{item.label}</Text>
                    <Text style={styles.paymentDetailPercent}>
                      {totalPayments ? Math.round((item.amount / totalPayments) * 100) : 0}% of total
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentDetailAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </>
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return renderProductsTab();
      case 'staff':
        return renderStaffTab();
      case 'customers':
        return renderCustomersTab();
      case 'payments':
        return renderPaymentsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with prominent date range */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Reports</Text>
            <View style={styles.dateRangeBadge}>
              <Ionicons name="calendar-outline" size={14} color={THEME.primary} />
              <Text style={styles.dateRangeText}>{getDisplayDateRange()}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={() => setShowExportModal(true)}
            data-testid="export-btn"
          >
            <Ionicons name="download-outline" size={18} color={THEME.surface} />
            <Text style={styles.exportBtnText}>Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</Text>
          </TouchableOpacity>
        </View>

        {/* Period Filter */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodPill, period === p.key && styles.periodPillActive]}
                onPress={() => handlePeriodChange(p.key)}
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
                data-testid={`tab-${tab.key}`}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.key ? THEME.surface : THEME.textTertiary} 
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Tab Content */}
        {renderTabContent()}

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

  // Header with date badge
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: THEME.primary + '30',
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
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
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  periodTextActive: {
    color: THEME.surface,
  },

  // Tabs
  tabsContainer: {
    marginBottom: 20,
  },
  tabsScroll: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.textTertiary,
  },
  tabTextActive: {
    color: THEME.surface,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiGridDesktop: {
    flexWrap: 'nowrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  kpiCardDesktop: {
    minWidth: 0,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: 8,
  },
  kpiChangePositive: {
    backgroundColor: '#ECFDF5',
  },
  kpiChangeNegative: {
    backgroundColor: '#FEF2F2',
  },
  kpiChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 10,
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
    justifyContent: 'center',
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
    paddingVertical: 16,
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  pieCenterLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  paymentList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 14,
    color: THEME.textPrimary,
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
    fontSize: 11,
    color: THEME.textSecondary,
  },
  paymentDetailsList: {
    gap: 16,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentDetailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  paymentDetailPercent: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  paymentDetailAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },

  // Product List
  productList: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  productRank: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textTertiary,
    width: 28,
  },
  productRankTop: {
    color: THEME.primary,
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
    color: THEME.textSecondary,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Staff
  staffList: {
    gap: 12,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 16,
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
    color: THEME.textSecondary,
    marginTop: 2,
  },
  staffRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },

  // Category
  categoryList: {
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textPrimary,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  categoryQty: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  categoryBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textTertiary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 4,
  },

  // Insights
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  insightCard: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.background,
    borderRadius: 12,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginTop: 8,
  },
  insightLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 16,
  },
  insightsGridDesktop: {
    flexWrap: 'nowrap',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    height: 60,
    backgroundColor: THEME.border,
  },
});
