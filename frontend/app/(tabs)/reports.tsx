import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PieChart, LineChart, BarChart } from 'react-native-gifted-charts';
import { dashboardApi } from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Design System Colors (RetailPro Green Theme)
const THEME = {
  // Primary
  primary: '#1B4332',
  primaryDark: '#081C15',
  primaryLight: '#2D6A4F',
  primarySoft: '#D8F3DC',
  primaryUltrasoft: '#F0FDF4',
  
  // Neutral
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Semantic
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  info: '#2563EB',
  infoBg: '#EFF6FF',
};

interface DashboardStats {
  total_sales_today: number;
  total_orders_today: number;
  total_customers: number;
  total_products: number;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  sales_by_payment_method: { cash: number; card: number; mobile_money: number; credit: number };
  daily_sales?: Array<{ day: string; sales: number }>;
}

export default function RetailProReportsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const { formatCurrency } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const totalPayments = stats ? 
    (stats.sales_by_payment_method?.cash || 0) + 
    (stats.sales_by_payment_method?.card || 0) + 
    (stats.sales_by_payment_method?.mobile_money || 0) + 
    (stats.sales_by_payment_method?.credit || 0) : 0;

  const avgOrderValue = stats?.total_orders_today 
    ? stats.total_sales_today / stats.total_orders_today 
    : 0;

  // Period options
  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  // Export functions
  const generatePDFContent = () => {
    if (!stats) return '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #111827; background: #fff; }
          h1 { color: #1B4332; font-size: 28px; margin-bottom: 8px; }
          .subtitle { color: #6B7280; margin-bottom: 32px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
          .metric { background: #F9FAFB; padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB; }
          .metric-value { font-size: 24px; font-weight: 700; color: #111827; }
          .metric-label { font-size: 13px; color: #6B7280; margin-top: 4px; }
          .section { margin-bottom: 32px; }
          .section-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #F9FAFB; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; }
          td { padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <div class="metrics">
          <div class="metric">
            <div class="metric-value" style="color: #059669">${formatCurrency(stats.total_sales_today)}</div>
            <div class="metric-label">Total Sales</div>
          </div>
          <div class="metric">
            <div class="metric-value">${stats.total_orders_today}</div>
            <div class="metric-label">Orders</div>
          </div>
          <div class="metric">
            <div class="metric-value">${stats.total_customers}</div>
            <div class="metric-label">Customers</div>
          </div>
          <div class="metric">
            <div class="metric-value">${formatCurrency(avgOrderValue)}</div>
            <div class="metric-label">Avg Order Value</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Payment Methods</div>
          <table>
            <tr><th>Method</th><th>Amount</th><th>Share</th></tr>
            <tr><td>Cash</td><td>${formatCurrency(stats.sales_by_payment_method?.cash || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.cash || 0) / totalPayments) * 100) : 0}%</td></tr>
            <tr><td>Card</td><td>${formatCurrency(stats.sales_by_payment_method?.card || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.card || 0) / totalPayments) * 100) : 0}%</td></tr>
            <tr><td>Mobile Money</td><td>${formatCurrency(stats.sales_by_payment_method?.mobile_money || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.mobile_money || 0) / totalPayments) * 100) : 0}%</td></tr>
            <tr><td>Credit</td><td>${formatCurrency(stats.sales_by_payment_method?.credit || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.credit || 0) / totalPayments) * 100) : 0}%</td></tr>
          </table>
        </div>

        ${stats.top_products && stats.top_products.length > 0 ? `
        <div class="section">
          <div class="section-title">Top Products</div>
          <table>
            <tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
            ${stats.top_products.slice(0, 5).map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.quantity}</td>
                <td>${formatCurrency(p.revenue)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        <div class="footer">RetailPro by Soko</div>
      </body>
      </html>
    `;
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(true);
    try {
      if (format === 'csv') {
        let csv = 'Sales Report\n';
        csv += `Date,${new Date().toLocaleDateString()}\n\n`;
        csv += 'Metric,Value\n';
        csv += `Total Sales,${stats?.total_sales_today || 0}\n`;
        csv += `Orders,${stats?.total_orders_today || 0}\n`;
        csv += `Customers,${stats?.total_customers || 0}\n`;
        csv += `Avg Order Value,${avgOrderValue}\n\n`;
        csv += 'Payment Methods\n';
        csv += 'Method,Amount\n';
        csv += `Cash,${stats?.sales_by_payment_method?.cash || 0}\n`;
        csv += `Card,${stats?.sales_by_payment_method?.card || 0}\n`;
        csv += `Mobile Money,${stats?.sales_by_payment_method?.mobile_money || 0}\n`;
        csv += `Credit,${stats?.sales_by_payment_method?.credit || 0}\n`;
        
        if (Platform.OS === 'web') {
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const html = generatePDFContent();
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Report' });
        }
      }
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

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

  // Metric Card Component
  const MetricCard = ({ icon, iconBg, value, label, valueColor }: any) => (
    <View style={[styles.metricCard, isDesktop && styles.metricCardDesktop]}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={THEME.primary} />
      </View>
      <Text style={[styles.metricValue, valueColor && { color: valueColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  // Payment Method Item
  const PaymentItem = ({ icon, label, amount, percentage, color }: any) => (
    <View style={styles.paymentItem}>
      <View style={[styles.paymentDot, { backgroundColor: color }]} />
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentLabel}>{label}</Text>
        <Text style={styles.paymentAmount}>{formatCurrency(amount)}</Text>
      </View>
      <Text style={styles.paymentPercent}>{percentage}%</Text>
    </View>
  );

  // Product Row
  const ProductRow = ({ rank, name, quantity, revenue }: any) => (
    <View style={styles.productRow}>
      <View style={[styles.productRank, rank <= 3 && styles.productRankTop]}>
        <Text style={[styles.productRankText, rank <= 3 && styles.productRankTextTop]}>{rank}</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{name}</Text>
        <Text style={styles.productQty}>{quantity} sold</Text>
      </View>
      <Text style={styles.productRevenue}>{formatCurrency(revenue)}</Text>
    </View>
  );

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
            <Text style={styles.headerSubtitle}>Sales analytics overview</Text>
          </View>
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={() => setShowExportModal(true)}
            data-testid="export-report-btn"
          >
            <Ionicons name="download-outline" size={18} color={THEME.primary} />
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Period Filter */}
        <View style={styles.periodContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodPill, period === p.key && styles.periodPillActive]}
                onPress={() => setPeriod(p.key)}
                data-testid={`period-${p.key}`}
              >
                <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Key Metrics Grid */}
        <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
          <MetricCard 
            icon="cash-outline" 
            iconBg={THEME.successBg}
            value={formatCurrency(stats?.total_sales_today || 0)}
            label="Total Sales"
            valueColor={THEME.success}
          />
          <MetricCard 
            icon="receipt-outline" 
            iconBg={THEME.primarySoft}
            value={stats?.total_orders_today || 0}
            label="Orders"
          />
          <MetricCard 
            icon="people-outline" 
            iconBg={THEME.infoBg}
            value={stats?.total_customers || 0}
            label="Customers"
          />
          <MetricCard 
            icon="trending-up-outline" 
            iconBg={THEME.warningBg}
            value={formatCurrency(avgOrderValue)}
            label="Avg Order"
          />
        </View>

        {/* Main Content Grid */}
        <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
          {/* Payment Breakdown */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            
            <View style={styles.pieContainer}>
              <PieChart
                data={[
                  { value: stats?.sales_by_payment_method?.cash || 1, color: THEME.primary },
                  { value: stats?.sales_by_payment_method?.card || 1, color: THEME.primaryLight },
                  { value: stats?.sales_by_payment_method?.mobile_money || 1, color: '#40916C' },
                  { value: stats?.sales_by_payment_method?.credit || 1, color: '#52B788' },
                ]}
                donut
                radius={70}
                innerRadius={50}
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
                amount={stats?.sales_by_payment_method?.cash || 0}
                percentage={totalPayments ? Math.round(((stats?.sales_by_payment_method?.cash || 0) / totalPayments) * 100) : 0}
                color={THEME.primary}
              />
              <PaymentItem 
                label="Card" 
                amount={stats?.sales_by_payment_method?.card || 0}
                percentage={totalPayments ? Math.round(((stats?.sales_by_payment_method?.card || 0) / totalPayments) * 100) : 0}
                color={THEME.primaryLight}
              />
              <PaymentItem 
                label="Mobile Money" 
                amount={stats?.sales_by_payment_method?.mobile_money || 0}
                percentage={totalPayments ? Math.round(((stats?.sales_by_payment_method?.mobile_money || 0) / totalPayments) * 100) : 0}
                color="#40916C"
              />
              <PaymentItem 
                label="Credit" 
                amount={stats?.sales_by_payment_method?.credit || 0}
                percentage={totalPayments ? Math.round(((stats?.sales_by_payment_method?.credit || 0) / totalPayments) * 100) : 0}
                color="#52B788"
              />
            </View>
          </View>

          {/* Top Products */}
          <View style={[styles.card, isDesktop && styles.cardHalf]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Products</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/products')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {stats?.top_products && stats.top_products.length > 0 ? (
              <View style={styles.productList}>
                {stats.top_products.slice(0, 5).map((product, idx) => (
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
                <Text style={styles.emptySubtext}>Start making sales to see top products</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sales Trend Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales Trend</Text>
          
          {stats?.daily_sales && stats.daily_sales.length > 0 ? (
            <View style={styles.chartContainer}>
              <LineChart
                data={stats.daily_sales.map(d => ({ value: d.sales || 0 }))}
                height={180}
                width={isDesktop ? 600 : width - 80}
                spacing={isDesktop ? 80 : 50}
                color={THEME.primary}
                thickness={3}
                startFillColor={THEME.primary}
                endFillColor={THEME.background}
                startOpacity={0.15}
                endOpacity={0}
                curved
                hideRules
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={THEME.border}
                hideDataPoints={false}
                dataPointsColor={THEME.primary}
                dataPointsRadius={5}
                xAxisLabelTexts={stats.daily_sales.map(d => d.day)}
                xAxisLabelTextStyle={{ fontSize: 11, color: THEME.textTertiary }}
                isAnimated
                areaChart
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={40} color={THEME.textTertiary} />
              <Text style={styles.emptyText}>No trend data available</Text>
              <Text style={styles.emptySubtext}>Sales trends will appear as you make more sales</Text>
            </View>
          )}
        </View>

        {/* Quick Stats Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Products Sold</Text>
              <Text style={styles.summaryValue}>
                {stats?.top_products?.reduce((sum, p) => sum + p.quantity, 0) || 0}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active Products</Text>
              <Text style={styles.summaryValue}>{stats?.total_products || 0}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Conversion Rate</Text>
              <Text style={[styles.summaryValue, { color: THEME.success }]}>
                {stats?.total_customers && stats.total_orders_today 
                  ? Math.round((stats.total_orders_today / stats.total_customers) * 100) 
                  : 0}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Report</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Choose export format</Text>

            <TouchableOpacity 
              style={styles.exportOption}
              onPress={() => handleExport('pdf')}
              disabled={exporting}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: THEME.dangerBg }]}>
                <Ionicons name="document-text" size={24} color={THEME.danger} />
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionTitle}>PDF Document</Text>
                <Text style={styles.exportOptionDesc}>Best for printing and sharing</Text>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color={THEME.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={THEME.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exportOption}
              onPress={() => handleExport('csv')}
              disabled={exporting}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: THEME.successBg }]}>
                <Ionicons name="grid" size={24} color={THEME.success} />
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionTitle}>CSV Spreadsheet</Text>
                <Text style={styles.exportOptionDesc}>Best for Excel and data analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.surface,
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
    fontSize: 24,
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
    backgroundColor: THEME.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Period Filter
  periodContainer: {
    marginBottom: 20,
  },
  periodScroll: {
    gap: 8,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  periodPillActive: {
    backgroundColor: THEME.primarySoft,
    borderColor: THEME.primarySoft,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  periodTextActive: {
    color: THEME.primary,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricsGridDesktop: {
    flexWrap: 'nowrap',
  },
  metricCard: {
    width: '48%',
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  metricCardDesktop: {
    flex: 1,
    width: 'auto',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  metricLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
  },

  // Content Grid
  contentGrid: {
    gap: 16,
    marginBottom: 16,
  },
  contentGridDesktop: {
    flexDirection: 'row',
  },

  // Cards
  card: {
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  cardHalf: {
    flex: 1,
    marginBottom: 0,
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
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Pie Chart
  pieContainer: {
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

  // Payment List
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
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginTop: 2,
  },
  paymentPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  // Product List
  productList: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productRankTop: {
    backgroundColor: THEME.warningBg,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textTertiary,
  },
  productRankTextTop: {
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

  // Chart
  chartContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: THEME.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: THEME.primaryUltrasoft,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.primarySoft,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.primarySoft,
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    marginBottom: 12,
  },
  exportOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exportOptionInfo: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  exportOptionDesc: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
});
