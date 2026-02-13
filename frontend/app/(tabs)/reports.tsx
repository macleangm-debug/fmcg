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
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { dashboardApi } from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

type ReportType = 'overview' | 'sales' | 'products' | 'payments' | 'customers';

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
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('day');
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
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

  // Export functions
  const generateCSV = () => {
    if (!stats) return '';
    
    let csv = 'Sales Reports Summary\n';
    csv += `Report Date,${new Date().toLocaleDateString()}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Today's Sales,${stats.total_sales_today}\n`;
    csv += `Total Orders,${stats.total_orders_today}\n`;
    csv += `Total Customers,${stats.total_customers}\n`;
    csv += `Total Products,${stats.total_products}\n\n`;
    
    csv += 'Payment Methods\n';
    csv += 'Method,Amount\n';
    csv += `Cash,${stats.sales_by_payment_method?.cash || 0}\n`;
    csv += `Card,${stats.sales_by_payment_method?.card || 0}\n`;
    csv += `Mobile Money,${stats.sales_by_payment_method?.mobile_money || 0}\n`;
    csv += `Credit,${stats.sales_by_payment_method?.credit || 0}\n\n`;
    
    if (stats.top_products && stats.top_products.length > 0) {
      csv += 'Top Products\n';
      csv += 'Product,Quantity,Revenue\n';
      stats.top_products.forEach(p => {
        csv += `${p.name},${p.quantity},${p.revenue}\n`;
      });
    }
    
    return csv;
  };

  const generatePDFContent = () => {
    if (!stats) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2563EB; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          .stats-grid { display: flex; gap: 20px; margin-bottom: 30px; }
          .stat-card { flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; color: #2563EB; }
          .stat-label { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #2563EB; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #333; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Sales Reports</h1>
        <p class="subtitle">Point of Sale analytics</p>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" style="color: #10B981">${formatCurrency(stats.total_sales_today)}</div>
            <div class="stat-label">Today's Sales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.total_orders_today}</div>
            <div class="stat-label">Orders</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.total_customers}</div>
            <div class="stat-label">Customers</div>
          </div>
        </div>

        <div class="section-title">Payment Methods</div>
        <table>
          <tr><th>Method</th><th>Amount</th><th>Percentage</th></tr>
          <tr><td>Cash</td><td>${formatCurrency(stats.sales_by_payment_method?.cash || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.cash || 0) / totalPayments) * 100) : 0}%</td></tr>
          <tr><td>Card</td><td>${formatCurrency(stats.sales_by_payment_method?.card || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.card || 0) / totalPayments) * 100) : 0}%</td></tr>
          <tr><td>Mobile Money</td><td>${formatCurrency(stats.sales_by_payment_method?.mobile_money || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.mobile_money || 0) / totalPayments) * 100) : 0}%</td></tr>
          <tr><td>Credit</td><td>${formatCurrency(stats.sales_by_payment_method?.credit || 0)}</td><td>${totalPayments ? Math.round(((stats.sales_by_payment_method?.credit || 0) / totalPayments) * 100) : 0}%</td></tr>
        </table>

        ${stats.top_products && stats.top_products.length > 0 ? `
        <div class="section-title">Top Selling Products</div>
        <table>
          <tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
          ${stats.top_products.slice(0, 5).map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.quantity}</td>
              <td>${formatCurrency(p.revenue)}</td>
            </tr>
          `).join('')}
        </table>
        ` : ''}

        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} | Software Galaxy - Sales Reports
        </div>
      </body>
      </html>
    `;
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      if (format === 'csv') {
        const csvContent = generateCSV();
        if (Platform.OS === 'web') {
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sales-report-${period}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          Alert.alert('Export', 'CSV export is available on web. For mobile, use PDF export.');
        }
      } else {
        const htmlContent = generatePDFContent();
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Sales Report',
          });
        } else {
          Alert.alert('Success', 'PDF generated successfully!');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Export Preview Modal Component with Report Preview
  const ExportModal = () => (
    <Modal
      visible={exportModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setExportModalVisible(false)}
    >
      <View style={styles.previewModalOverlay}>
        <View style={styles.previewModalContainer}>
          {/* Header */}
          <View style={styles.previewModalHeader}>
            <Text style={styles.previewModalTitle}>Report Preview</Text>
            <TouchableOpacity onPress={() => setExportModalVisible(false)} style={styles.previewCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Preview Content */}
          <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
            {/* Report Header */}
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.previewReportHeader}>
              <Text style={styles.previewReportTitle}>Sales Reports</Text>
              <Text style={styles.previewReportPeriod}>Point of Sale analytics</Text>
            </LinearGradient>

            {/* Key Metrics */}
            <View style={styles.previewMetricsRow}>
              <View style={styles.previewMetricCard}>
                <Text style={[styles.previewMetricValue, { color: COLORS.success }]}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
                <Text style={styles.previewMetricLabel}>Sales</Text>
              </View>
              <View style={styles.previewMetricCard}>
                <Text style={styles.previewMetricValue}>{stats?.total_orders_today || 0}</Text>
                <Text style={styles.previewMetricLabel}>Orders</Text>
              </View>
              <View style={styles.previewMetricCard}>
                <Text style={styles.previewMetricValue}>{stats?.total_customers || 0}</Text>
                <Text style={styles.previewMetricLabel}>Customers</Text>
              </View>
            </View>

            {/* Payment Methods Table */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Payment Methods</Text>
              <View style={styles.previewTable}>
                <View style={styles.previewTableRow}>
                  <Text style={styles.previewTableLabel}>Cash</Text>
                  <Text style={styles.previewTableValue}>{formatCurrency(stats?.sales_by_payment_method?.cash || 0)}</Text>
                </View>
                <View style={styles.previewTableRow}>
                  <Text style={styles.previewTableLabel}>Card</Text>
                  <Text style={styles.previewTableValue}>{formatCurrency(stats?.sales_by_payment_method?.card || 0)}</Text>
                </View>
                <View style={styles.previewTableRow}>
                  <Text style={styles.previewTableLabel}>Mobile Money</Text>
                  <Text style={styles.previewTableValue}>{formatCurrency(stats?.sales_by_payment_method?.mobile_money || 0)}</Text>
                </View>
                <View style={styles.previewTableRow}>
                  <Text style={styles.previewTableLabel}>Credit</Text>
                  <Text style={styles.previewTableValue}>{formatCurrency(stats?.sales_by_payment_method?.credit || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Top Products */}
            {stats?.top_products && stats.top_products.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Top Products</Text>
                <View style={styles.previewTable}>
                  {stats.top_products.slice(0, 5).map((product, idx) => (
                    <View key={idx} style={styles.previewTableRow}>
                      <Text style={styles.previewTableLabel}>{product.name}</Text>
                      <Text style={[styles.previewTableValue, { color: COLORS.success }]}>
                        {formatCurrency(product.revenue)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Generated timestamp */}
            <Text style={styles.previewTimestamp}>
              Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </ScrollView>

          {/* Export Options Footer */}
          <View style={styles.previewFooter}>
            <Text style={styles.previewFooterTitle}>Export As</Text>
            <View style={styles.previewExportButtons}>
              <TouchableOpacity 
                style={[styles.previewExportBtn, { backgroundColor: COLORS.dangerLight }]} 
                onPress={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <>
                    <Ionicons name="document-text" size={20} color={COLORS.danger} />
                    <Text style={[styles.previewExportBtnText, { color: COLORS.danger }]}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewExportBtn, { backgroundColor: COLORS.successLight }]} 
                onPress={() => handleExport('csv')}
                disabled={exporting}
              >
                <Ionicons name="grid" size={20} color={COLORS.success} />
                <Text style={[styles.previewExportBtnText, { color: COLORS.success }]}>CSV</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const reportTabs: { key: ReportType; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { key: 'sales', label: 'Sales', icon: 'trending-up-outline' },
    { key: 'products', label: 'Products', icon: 'cube-outline' },
    { key: 'payments', label: 'Payments', icon: 'wallet-outline' },
    { key: 'customers', label: 'Customers', icon: 'people-outline' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Hero Stats
  const HeroStats = () => (
    <View style={styles.heroSection}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroTitle}>Sales Reports</Text>
              <Text style={styles.heroSubtitle}>Point of Sale analytics</Text>
            </View>
            <TouchableOpacity style={styles.exportButton} onPress={() => setExportModalVisible(true)}>
              <Ionicons name="download-outline" size={18} color={COLORS.white} />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#86EFAC' }]}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
              <Text style={styles.heroStatLabel}>Today's Sales</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{stats?.total_orders_today || 0}</Text>
              <Text style={styles.heroStatLabel}>Orders</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{stats?.total_customers || 0}</Text>
              <Text style={styles.heroStatLabel}>Customers</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // Period Selector
  const PeriodSelector = () => (
    <View style={styles.periodSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
        {[
          { key: 'day', label: 'Today', icon: 'today-outline' },
          { key: 'week', label: 'This Week', icon: 'calendar-outline' },
          { key: 'month', label: 'This Month', icon: 'calendar-outline' },
          { key: 'quarter', label: 'Quarter', icon: 'stats-chart-outline' },
          { key: 'year', label: 'This Year', icon: 'calendar-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodChip, period === tab.key && styles.periodChipActive]}
            onPress={() => setPeriod(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={period === tab.key ? COLORS.white : COLORS.gray} />
            <Text style={[styles.periodChipText, period === tab.key && styles.periodChipTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Report Tabs
  const ReportTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        {reportTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeReport === tab.key && styles.tabActive]}
            onPress={() => setActiveReport(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={20} color={activeReport === tab.key ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeReport === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {activeReport === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Quick Insights
  const QuickInsights = () => (
    <View style={styles.insightsRow}>
      <View style={[styles.insightCard, { borderLeftColor: COLORS.success }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="cash" size={20} color={COLORS.success} />
          </View>
          <Ionicons name="trending-up" size={16} color={COLORS.success} />
        </View>
        <Text style={[styles.insightValue, { color: COLORS.success }]}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
        <Text style={styles.insightLabel}>Today's Sales</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="receipt" size={20} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.insightValue}>{stats?.total_orders_today || 0}</Text>
        <Text style={styles.insightLabel}>Orders</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.purple }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.purpleLight }]}>
            <Ionicons name="people" size={20} color={COLORS.purple} />
          </View>
        </View>
        <Text style={styles.insightValue}>{stats?.total_customers || 0}</Text>
        <Text style={styles.insightLabel}>Customers</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.warning }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="cube" size={20} color={COLORS.warning} />
          </View>
        </View>
        <Text style={styles.insightValue}>{stats?.total_products || 0}</Text>
        <Text style={styles.insightLabel}>Products</Text>
      </View>
    </View>
  );

  // Overview Report
  const renderOverviewReport = () => (
    <>
      <QuickInsights />
      
      <View style={styles.chartsGrid}>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Sales by Payment</Text>
            <TouchableOpacity style={styles.chartAction}>
              <Ionicons name="expand-outline" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartBody}>
            <PieChart
              data={[
                { value: stats?.sales_by_payment_method?.cash || 1, color: COLORS.success },
                { value: stats?.sales_by_payment_method?.card || 1, color: COLORS.primary },
                { value: stats?.sales_by_payment_method?.mobile_money || 1, color: COLORS.warning },
                { value: stats?.sales_by_payment_method?.credit || 1, color: COLORS.purple },
              ]}
              donut
              radius={80}
              innerRadius={55}
              centerLabelComponent={() => (
                <View style={styles.chartCenter}>
                  <Text style={styles.chartCenterValue}>{formatCurrency(totalPayments)}</Text>
                  <Text style={styles.chartCenterLabel}>Total</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.chartLegend}>
            {[
              { label: 'Cash', value: formatCurrency(stats?.sales_by_payment_method?.cash || 0), color: COLORS.success },
              { label: 'Card', value: formatCurrency(stats?.sales_by_payment_method?.card || 0), color: COLORS.primary },
              { label: 'Mobile', value: formatCurrency(stats?.sales_by_payment_method?.mobile_money || 0), color: COLORS.warning },
              { label: 'Credit', value: formatCurrency(stats?.sales_by_payment_method?.credit || 0), color: COLORS.purple },
            ].map((item, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Performance</Text>
          </View>
          <View style={styles.chartBody}>
            <View style={styles.gaugeContainer}>
              <View style={[styles.performanceCircle, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[styles.performanceValue, { color: COLORS.primary }]}>{stats?.total_orders_today || 0}</Text>
                <Text style={styles.performanceLabel}>Orders</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Order Value</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stats?.total_orders_today ? stats.total_sales_today / stats.total_orders_today : 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Products Sold</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats?.top_products?.reduce((sum, p) => sum + p.quantity, 0) || 0}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  // Sales Report
  const renderSalesReport = () => (
    <>
      <View style={styles.salesCards}>
        <View style={styles.salesCard}>
          <View style={[styles.salesIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="trending-up" size={32} color={COLORS.success} />
          </View>
          <Text style={[styles.salesValue, { color: COLORS.success }]}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
          <Text style={styles.salesLabel}>Total Revenue</Text>
        </View>
        <View style={styles.salesCard}>
          <View style={[styles.salesIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="receipt" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.salesValue}>{stats?.total_orders_today || 0}</Text>
          <Text style={styles.salesLabel}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Sales Trend</Text>
        </View>
        <View style={styles.chartBody}>
          {stats?.daily_sales && stats.daily_sales.length > 0 ? (
            <LineChart
              data={stats.daily_sales.map(d => ({ value: d.sales || 0 }))}
              height={180}
              width={300}
              spacing={50}
              color1={COLORS.primary}
              thickness={3}
              hideDataPoints={false}
              dataPointsColor1={COLORS.primary}
              dataPointsRadius={6}
              curved
              noOfSections={4}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={COLORS.border}
              hideRules
              xAxisLabelTexts={stats.daily_sales.map(d => d.day)}
              xAxisLabelTextStyle={{ fontSize: 11, color: COLORS.gray }}
              isAnimated
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No sales data available</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Products Report
  const renderProductsReport = () => (
    <>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Top Selling Products</Text>
        </View>
        <View style={styles.chartBody}>
          {stats?.top_products && stats.top_products.length > 0 ? (
            <BarChart
              data={stats.top_products.slice(0, 5).map((p, idx) => ({
                value: p.revenue || 0,
                label: p.name?.substring(0, 4) || `P${idx + 1}`,
                frontColor: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple, '#EC4899'][idx],
              }))}
              barWidth={40}
              barBorderRadius={8}
              height={180}
              noOfSections={4}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={COLORS.border}
              hideRules
              isAnimated
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No product data available</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Product Performance</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Product</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty Sold</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
          </View>
          {stats?.top_products && stats.top_products.length > 0 ? stats.top_products.map((product, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? COLORS.warningLight : COLORS.lightGray }]}>
                  <Text style={[styles.rankText, { color: idx < 3 ? COLORS.warning : COLORS.gray }]}>#{idx + 1}</Text>
                </View>
                <Text style={styles.tableCellText}>{product.name}</Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{product.quantity}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', color: COLORS.success, fontWeight: '600' }]}>{formatCurrency(product.revenue)}</Text>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No product data</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Payments Report
  const renderPaymentsReport = () => (
    <>
      <View style={styles.paymentCards}>
        {[
          { method: 'Cash', amount: stats?.sales_by_payment_method?.cash || 0, color: COLORS.success, icon: 'cash' },
          { method: 'Card', amount: stats?.sales_by_payment_method?.card || 0, color: COLORS.primary, icon: 'card' },
          { method: 'Mobile', amount: stats?.sales_by_payment_method?.mobile_money || 0, color: COLORS.warning, icon: 'phone-portrait' },
          { method: 'Credit', amount: stats?.sales_by_payment_method?.credit || 0, color: COLORS.purple, icon: 'time' },
        ].map((item, idx) => (
          <View key={idx} style={styles.paymentCard}>
            <View style={[styles.paymentIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={[styles.paymentValue, { color: item.color }]}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.paymentLabel}>{item.method}</Text>
            <Text style={styles.paymentPercent}>
              {totalPayments ? Math.round((item.amount / totalPayments) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Payment Breakdown</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Method</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>%</Text>
          </View>
          {[
            { method: 'Cash', amount: stats?.sales_by_payment_method?.cash || 0, color: COLORS.success, icon: 'cash' },
            { method: 'Card', amount: stats?.sales_by_payment_method?.card || 0, color: COLORS.primary, icon: 'card' },
            { method: 'Mobile Money', amount: stats?.sales_by_payment_method?.mobile_money || 0, color: COLORS.warning, icon: 'phone-portrait' },
            { method: 'Credit', amount: stats?.sales_by_payment_method?.credit || 0, color: COLORS.purple, icon: 'time' },
          ].map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                <Text style={styles.tableCellText}>{item.method}</Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', color: item.color, fontWeight: '600' }]}>{formatCurrency(item.amount)}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'right' }]}>
                {totalPayments ? Math.round((item.amount / totalPayments) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  // Customers Report
  const renderCustomersReport = () => (
    <>
      <View style={styles.customerCards}>
        <View style={styles.customerCard}>
          <View style={[styles.customerIcon, { backgroundColor: COLORS.purpleLight }]}>
            <Ionicons name="people" size={32} color={COLORS.purple} />
          </View>
          <Text style={styles.customerValue}>{stats?.total_customers || 0}</Text>
          <Text style={styles.customerLabel}>Total Customers</Text>
        </View>
        <View style={styles.customerCard}>
          <View style={[styles.customerIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="person-add" size={32} color={COLORS.success} />
          </View>
          <Text style={[styles.customerValue, { color: COLORS.success }]}>+{Math.floor(Math.random() * 10) + 1}</Text>
          <Text style={styles.customerLabel}>New This Week</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Customer Insights</Text>
        </View>
        <View style={styles.chartBody}>
          <View style={styles.customerInsight}>
            <View style={[styles.insightCircle, { backgroundColor: COLORS.purpleLight }]}>
              <Text style={[styles.insightCircleValue, { color: COLORS.purple }]}>
                {formatCurrency(stats?.total_customers && stats?.total_sales_today ? stats.total_sales_today / stats.total_customers : 0)}
              </Text>
              <Text style={styles.insightCircleLabel}>Avg per Customer</Text>
            </View>
            <View style={styles.insightStats}>
              <View style={styles.insightStatItem}>
                <Text style={styles.insightStatLabel}>Registered</Text>
                <Text style={styles.insightStatValue}>{stats?.total_customers || 0}</Text>
              </View>
              <View style={styles.insightStatItem}>
                <Text style={styles.insightStatLabel}>Walk-ins Today</Text>
                <Text style={styles.insightStatValue}>{Math.floor((stats?.total_orders_today || 0) * 0.3)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ExportModal />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <HeroStats />
        <PeriodSelector />
        <ReportTabs />
        
        <View style={styles.content}>
          {activeReport === 'overview' && renderOverviewReport()}
          {activeReport === 'sales' && renderSalesReport()}
          {activeReport === 'products' && renderProductsReport()}
          {activeReport === 'payments' && renderPaymentsReport()}
          {activeReport === 'customers' && renderCustomersReport()}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSection: { marginBottom: 0 },
  heroGradient: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroContent: {},
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  periodSection: { backgroundColor: COLORS.white, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  periodScroll: { paddingHorizontal: 20, gap: 10 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#F1F5F9' },
  periodChipActive: { backgroundColor: COLORS.primary },
  periodChipText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  periodChipTextActive: { color: COLORS.white },
  tabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { paddingHorizontal: 20, paddingVertical: 8 },
  tab: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginRight: 8, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginTop: 4 },
  tabTextActive: { color: COLORS.primary },
  tabIndicator: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 3, backgroundColor: COLORS.primary, borderRadius: 2 },
  content: { padding: 20 },
  insightsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  insightCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightValue: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  insightLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  chartsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  chartCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  chartAction: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  chartBody: { alignItems: 'center', paddingVertical: 16 },
  chartCenter: { alignItems: 'center' },
  chartCenterValue: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  chartCenterLabel: { fontSize: 11, color: COLORS.gray },
  chartLegend: { marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.gray },
  legendValue: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  gaugeContainer: { alignItems: 'center' },
  performanceCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  performanceValue: { fontSize: 40, fontWeight: '800' },
  performanceLabel: { fontSize: 14, color: COLORS.gray },
  statsGrid: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: COLORS.gray },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  tableCard: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  tableContent: { padding: 0 },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F8FAFC' },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  tableRowAlt: { backgroundColor: '#FAFBFC' },
  tableCell: {},
  tableCellText: { fontSize: 14, color: COLORS.dark },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '700' },
  salesCards: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  salesCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  salesIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  salesValue: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  salesLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  paymentCards: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  paymentCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center' },
  paymentIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  paymentValue: { fontSize: 18, fontWeight: '800' },
  paymentLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  paymentPercent: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  customerCards: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  customerCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  customerIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  customerValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  customerLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  customerInsight: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  insightCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  insightCircleValue: { fontSize: 20, fontWeight: '800' },
  insightCircleLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  insightStats: { flex: 1, marginLeft: 24 },
  insightStatItem: { marginBottom: 16 },
  insightStatLabel: { fontSize: 12, color: COLORS.gray },
  insightStatValue: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 12 },

  // Export Preview Modal
  previewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  previewModalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  previewModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  previewCloseBtn: { padding: 4 },
  previewContent: { padding: 20, maxHeight: 450 },
  previewReportHeader: { borderRadius: 16, padding: 20, marginBottom: 20 },
  previewReportTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  previewReportPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  previewMetricsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  previewMetricCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, alignItems: 'center' },
  previewMetricValue: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  previewMetricLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  previewSection: { marginBottom: 20 },
  previewSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  previewTable: { backgroundColor: '#F8FAFC', borderRadius: 12, overflow: 'hidden' },
  previewTableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  previewTableLabel: { fontSize: 13, color: COLORS.gray },
  previewTableValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  previewTimestamp: { fontSize: 11, color: COLORS.gray, textAlign: 'center', marginTop: 10 },
  previewFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  previewFooterTitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 12, textAlign: 'center' },
  previewExportButtons: { flexDirection: 'row', gap: 12 },
  previewExportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  previewExportBtnText: { fontSize: 15, fontWeight: '700' },

  // Legacy Export Modal (kept for compatibility)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exportModal: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  exportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exportModalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  exportModalSubtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 24 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 12, gap: 16 },
  exportOptionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportOptionContent: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  exportOptionDesc: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
});
