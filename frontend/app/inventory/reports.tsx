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
import { PieChart, BarChart } from 'react-native-gifted-charts';
import api from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DatePickerModal from '../../src/components/DatePickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';

// Month names
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

type ReportType = 'overview' | 'valuation' | 'movement' | 'lowstock' | 'categories';

interface Summary {
  total_items: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  in_stock_count: number;
}

interface CategoryData {
  name: string;
  count: number;
  value: number;
}

export default function InventoryReportsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'graphical' | 'tabular' | 'both'>('both');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<'pdf' | 'excel'>('pdf');
  
  // Custom date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [exportPreviewMode, setExportPreviewMode] = useState<'pdf' | 'excel'>('pdf');

  const fetchReports = useCallback(async () => {
    try {
      const [summaryRes, chartRes, itemsRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/chart-data'),
        api.get('/inventory/items?status=low_stock'),
      ]);
      setSummary(summaryRes.data);
      setCategories(chartRes.data?.category_stock || []);
      setLowStockItems(itemsRes.data?.items || []);
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

  const healthRate = summary?.total_items ? Math.round((summary.in_stock_count / summary.total_items) * 100) : 0;

  // Export functions
  const generateCSV = () => {
    if (!summary) return '';
    
    let csv = 'Inventory Reports Summary\n';
    csv += `Report Date,${new Date().toLocaleDateString()}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Total Products,${summary.total_items}\n`;
    csv += `Total Quantity,${summary.total_quantity}\n`;
    csv += `Total Value,${summary.total_value}\n`;
    csv += `In Stock,${summary.in_stock_count}\n`;
    csv += `Low Stock,${summary.low_stock_count}\n`;
    csv += `Out of Stock,${summary.out_of_stock_count}\n`;
    csv += `Stock Health,${healthRate}%\n\n`;
    
    if (categories.length > 0) {
      csv += 'Categories\n';
      csv += 'Category,Items,Value\n';
      categories.forEach(cat => {
        csv += `${cat.name},${cat.count},${cat.value}\n`;
      });
    }
    
    if (lowStockItems.length > 0) {
      csv += '\nLow Stock Items\n';
      csv += 'Product,Current Qty,Min Qty\n';
      lowStockItems.forEach(item => {
        csv += `${item.name},${item.quantity},${item.min_quantity}\n`;
      });
    }
    
    return csv;
  };

  const generatePDFContent = (format: 'graphical' | 'tabular' | 'both' = 'both') => {
    if (!summary) return '';
    
    const showGraphical = format === 'graphical' || format === 'both';
    const showTabular = format === 'tabular' || format === 'both';
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    
    const stockData = [
      { label: 'In Stock', value: summary.in_stock_count || 0, color: '#10B981' },
      { label: 'Low Stock', value: summary.low_stock_count || 0, color: '#F59E0B' },
      { label: 'Out of Stock', value: summary.out_of_stock_count || 0, color: '#EF4444' },
    ].filter(d => d.value > 0);
    
    const totalItems = stockData.reduce((sum, d) => sum + d.value, 0);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Inventory Analytics Report</title>
        <style>
          @page { size: A4; margin: 15mm 15mm 25mm 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #FFFFFF; line-height: 1.5; font-size: 12px; }
          
          /* Header - matching Invoicing */
          .header { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); padding: 24px 28px; color: white; border-radius: 8px; margin-bottom: 16px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; border: 2px solid rgba(255,255,255,0.2); }
          .brand-name { font-size: 18px; font-weight: 700; color: white; }
          .brand-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.4; }
          .badge { background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: white; letter-spacing: 0.5px; }
          .date-info { font-size: 12px; color: rgba(255,255,255,0.8); }
          
          .content { padding: 0; }
          
          /* Metrics */
          .metrics { display: flex; gap: 14px; margin-bottom: 20px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.success { color: #166534; }
          .metric-value.warning { color: #92400E; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          
          /* Charts */
          .charts-row { display: flex; gap: 16px; margin-bottom: 20px; }
          .chart-box { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
          .chart-title { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 14px; }
          .chart-content { display: flex; align-items: center; gap: 16px; }
          .donut { width: 70px; height: 70px; border-radius: 50%; position: relative; }
          .donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #1E293B; }
          .legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
          .legend-dot { width: 9px; height: 9px; border-radius: 3px; }
          .legend-label { color: #64748B; }
          .legend-value { margin-left: auto; font-weight: 600; color: #1E293B; }
          
          .progress-item { margin-bottom: 10px; }
          .progress-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .progress-label { font-size: 11px; color: #64748B; }
          .progress-value { font-size: 11px; font-weight: 600; color: #1E293B; }
          .progress-bar { height: 7px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; border-radius: 4px; }
          
          /* Tables */
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 600; color: #1E293B; padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 12px 18px; text-align: left; font-size: 10px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
          .table th.right { text-align: right; }
          .table td { padding: 12px 18px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          .table .right { text-align: right; }
          .table .bold { font-weight: 600; }
          .table .total { background: #F1F5F9 !important; font-weight: 600; }
          .table .success { color: #166534; }
          .table .warning { color: #92400E; }
          .table .danger { color: #DC2626; }
          
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .section { page-break-inside: avoid; }
          
          /* Footer */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8FAFC; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 10px; }
          .footer-brand { display: flex; align-items: center; gap: 12px; }
          .footer-logo { width: 32px; height: 32px; background: #334155; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 700; }
          .footer-name { font-size: 13px; font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 10px; color: #64748B; }
          .footer-date { font-size: 11px; color: #64748B; text-align: right; }
          .footer-page { font-size: 10px; color: #94A3B8; margin-top: 2px; }
          
          /* Ensure content doesn't overlap footer */
          .content { padding-bottom: 80px; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .footer { position: fixed; bottom: 0; left: 15mm; right: 15mm; } 
            .content { padding-bottom: 100px; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">Inventory Analytics Report</div>
                ${businessAddress || businessPhone || businessEmail ? `
                  <div class="brand-address">
                    ${businessAddress ? businessAddress + '<br>' : ''}
                    ${businessPhone ? businessPhone : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? businessEmail : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="badge">Analytics Report</div>
          </div>
          <div class="date-info">📦 Generated: ${reportDate}</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="metrics">
            <div class="metric"><div class="metric-value">${summary.total_items}</div><div class="metric-label">Total Products</div></div>
            <div class="metric"><div class="metric-value success">${summary.total_quantity}</div><div class="metric-label">Total Quantity</div></div>
            <div class="metric"><div class="metric-value warning">${formatCurrency(summary.total_value)}</div><div class="metric-label">Stock Value</div></div>
          </div>
          
          ${showGraphical ? `
          <div class="charts-row">
            <div class="chart-box">
              <div class="chart-title">Stock Distribution</div>
              <div class="chart-content">
                <div class="donut" style="background: conic-gradient(${stockData.map((d, i) => {
                  const startAngle = stockData.slice(0, i).reduce((sum, x) => sum + (totalItems > 0 ? (x.value / totalItems) * 360 : 0), 0);
                  const endAngle = startAngle + (totalItems > 0 ? (d.value / totalItems) * 360 : 0);
                  return `${d.color} ${startAngle}deg ${endAngle}deg`;
                }).join(', ') || '#E5E7EB 0deg 360deg'});">
                  <div class="donut-center">${totalItems}</div>
                </div>
                <div class="legend">
                  ${stockData.map(d => `<div class="legend-item"><div class="legend-dot" style="background: ${d.color};"></div><span class="legend-label">${d.label}</span><span class="legend-value">${d.value}</span></div>`).join('')}
                </div>
              </div>
            </div>
            <div class="chart-box">
              <div class="chart-title">Stock Health</div>
              <div class="progress-item">
                <div class="progress-header"><span class="progress-label">In Stock</span><span class="progress-value">${healthRate}%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${healthRate}%; background: #10B981;"></div></div>
              </div>
              <div class="progress-item">
                <div class="progress-header"><span class="progress-label">Low Stock</span><span class="progress-value">${summary.total_items ? Math.round((summary.low_stock_count / summary.total_items) * 100) : 0}%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${summary.total_items ? Math.round((summary.low_stock_count / summary.total_items) * 100) : 0}%; background: #F59E0B;"></div></div>
              </div>
              <div class="progress-item">
                <div class="progress-header"><span class="progress-label">Out of Stock</span><span class="progress-value">${summary.total_items ? Math.round((summary.out_of_stock_count / summary.total_items) * 100) : 0}%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${summary.total_items ? Math.round((summary.out_of_stock_count / summary.total_items) * 100) : 0}%; background: #EF4444;"></div></div>
              </div>
            </div>
          </div>
          ` : ''}
          
          ${showTabular ? `
          <div class="section">
            <div class="section-title">Stock Status Summary</div>
            <table class="table">
              <thead><tr><th>Status</th><th class="right">Count</th><th class="right">Percentage</th></tr></thead>
              <tbody>
                <tr><td><span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: #10B981; margin-right: 8px;"></span>In Stock</td><td class="right success bold">${summary.in_stock_count}</td><td class="right">${healthRate}%</td></tr>
                <tr><td><span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: #F59E0B; margin-right: 8px;"></span>Low Stock</td><td class="right warning bold">${summary.low_stock_count}</td><td class="right">${summary.total_items ? Math.round((summary.low_stock_count / summary.total_items) * 100) : 0}%</td></tr>
                <tr><td><span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: #EF4444; margin-right: 8px;"></span>Out of Stock</td><td class="right danger bold">${summary.out_of_stock_count}</td><td class="right">${summary.total_items ? Math.round((summary.out_of_stock_count / summary.total_items) * 100) : 0}%</td></tr>
                <tr class="total"><td class="bold">Total Stock Value</td><td class="right bold" colspan="2">${formatCurrency(summary.total_value)}</td></tr>
              </tbody>
            </table>
          </div>
          
          ${lowStockItems.length > 0 ? `
          <div class="section">
            <div class="section-title">Items Needing Attention</div>
            <table class="table">
              <thead><tr><th>Product</th><th class="right">Current Qty</th><th class="right">Min Qty</th><th class="right">Status</th></tr></thead>
              <tbody>
                ${lowStockItems.slice(0, 10).map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td class="right ${item.quantity === 0 ? 'danger' : 'warning'} bold">${item.quantity}</td>
                    <td class="right">${item.min_quantity}</td>
                    <td class="right ${item.quantity === 0 ? 'danger' : 'warning'} bold">${item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">Inventory Summary</div>
            <table class="table">
              <thead><tr><th>Metric</th><th class="right">Value</th></tr></thead>
              <tbody>
                <tr><td>Total Products</td><td class="right bold">${summary.total_items}</td></tr>
                <tr><td>Total Quantity</td><td class="right bold">${summary.total_quantity}</td></tr>
                <tr><td>Total Stock Value</td><td class="right bold" style="color: #166534;">${formatCurrency(summary.total_value)}</td></tr>
                <tr><td>In Stock Items</td><td class="right bold success">${summary.in_stock_count}</td></tr>
                <tr><td>Low Stock Items</td><td class="right bold warning">${summary.low_stock_count}</td></tr>
                <tr><td>Out of Stock Items</td><td class="right bold danger">${summary.out_of_stock_count}</td></tr>
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-brand">
            <div class="footer-logo">SG</div>
            <div><div class="footer-name">Software Galaxy Inventory</div><div class="footer-tagline">Business Management Suite</div></div>
          </div>
          <div><div class="footer-date">${reportDate}</div><div class="footer-page">Auto-generated report</div></div>
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
          a.download = `inventory-report-${period}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          
          // Show success toast
          setExportedFormat('excel');
          setShowExportSuccess(true);
          setTimeout(() => setShowExportSuccess(false), 3000);
        } else {
          Alert.alert('Export', 'CSV export is available on web. For mobile, use PDF export.');
        }
        setExportModalVisible(false);
      } else {
        const htmlContent = generatePDFContent(pdfFormat);
        
        if (Platform.OS === 'web') {
          // Web: Use print dialog with new window (same as Invoicing)
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Auto-trigger print
            printWindow.onload = () => {
              printWindow.print();
            };
            
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.print();
              }
            }, 800);
          }
        } else {
          // Mobile: Generate PDF file using expo-print
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Export Inventory Report',
            });
          } else {
            Alert.alert('Success', 'PDF generated successfully!');
          }
        }
        
        setExportModalVisible(false);
        
        // Show success toast
        setExportedFormat('pdf');
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Compact Export Modal (like Invoice View Modal)
  const reportTabs: { key: ReportType; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { key: 'valuation', label: 'Valuation', icon: 'wallet-outline' },
    { key: 'movement', label: 'Movement', icon: 'swap-horizontal-outline' },
    { key: 'lowstock', label: 'Low Stock', icon: 'alert-circle-outline' },
    { key: 'categories', label: 'Categories', icon: 'grid-outline' },
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

  const isMobile = width < 600;

  // Page Header Component (matching invoicing style)
  const PageHeader = () => (
    <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
      <View style={styles.pageHeaderLeft}>
        <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Reports</Text>
        <Text style={styles.pageSubtitle}>
          {summary?.total_items || 0} item(s) • {formatCurrency(summary?.total_value || 0)} total value
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

  // Handle date picker apply
  const handleDatePickerApply = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setUseCustomDates(true);
    setShowDatePicker(false);
    // Trigger refresh
    setTimeout(() => fetchReports(), 0);
  };

  // Handle date picker cancel
  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
  };

  // Period Selector Component (matching invoicing style with Custom date picker)
  const PeriodSelector = () => (
    <View style={styles.periodSectionStandard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollStandard}>
        {[
          { key: 'day', label: 'Today' },
          { key: 'week', label: 'Week' },
          { key: 'month', label: 'Month' },
          { key: 'quarter', label: 'Quarter' },
          { key: 'year', label: 'Year' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodChipStandard, period === tab.key && !useCustomDates && styles.periodChipStandardActive]}
            onPress={() => {
              setPeriod(tab.key);
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
      
      {/* Date Picker Modal - using reusable component */}
      <DatePickerModal
        visible={showDatePicker}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
        onApply={handleDatePickerApply}
        onCancel={handleDatePickerCancel}
        primaryColor={COLORS.primary}
        primaryLightColor={COLORS.primaryLight}
      />
    </View>
  );

  // Report Tabs Component (pill style like invoicing)
  const ReportTabs = () => (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {reportTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterPill, activeReport === tab.key && styles.filterPillActive]}
            onPress={() => setActiveReport(tab.key)}
          >
            <Text style={[styles.filterPillText, activeReport === tab.key && styles.filterPillTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Quick Insights
  const QuickInsights = () => (
    <View style={styles.insightsRow}>
      <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cube" size={20} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.insightValue}>{summary?.total_items || 0}</Text>
        <Text style={styles.insightLabel}>Total Products</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.success }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          </View>
          <Text style={styles.insightBadge}>{healthRate}%</Text>
        </View>
        <Text style={styles.insightValue}>{summary?.in_stock_count || 0}</Text>
        <Text style={styles.insightLabel}>In Stock</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.warning }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="warning" size={20} color={COLORS.warning} />
          </View>
        </View>
        <Text style={[styles.insightValue, { color: COLORS.warning }]}>{summary?.low_stock_count || 0}</Text>
        <Text style={styles.insightLabel}>Low Stock</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.danger }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
          </View>
        </View>
        <Text style={[styles.insightValue, { color: COLORS.danger }]}>{summary?.out_of_stock_count || 0}</Text>
        <Text style={styles.insightLabel}>Out of Stock</Text>
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
            <Text style={styles.chartTitle}>Stock Status</Text>
            <TouchableOpacity style={styles.chartAction}>
              <Ionicons name="expand-outline" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartBody}>
            <PieChart
              data={[
                { value: summary?.in_stock_count || 1, color: COLORS.success },
                { value: summary?.low_stock_count || 1, color: COLORS.warning },
                { value: summary?.out_of_stock_count || 1, color: COLORS.danger },
              ]}
              donut
              radius={80}
              innerRadius={55}
              centerLabelComponent={() => (
                <View style={styles.chartCenter}>
                  <Text style={styles.chartCenterValue}>{summary?.total_items || 0}</Text>
                  <Text style={styles.chartCenterLabel}>Items</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.chartLegend}>
            {[
              { label: 'In Stock', value: summary?.in_stock_count || 0, color: COLORS.success },
              { label: 'Low Stock', value: summary?.low_stock_count || 0, color: COLORS.warning },
              { label: 'Out of Stock', value: summary?.out_of_stock_count || 0, color: COLORS.danger },
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
            <Text style={styles.chartTitle}>Stock Health</Text>
          </View>
          <View style={styles.chartBody}>
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeBg}>
                <View style={[styles.gaugeFill, { width: `${healthRate}%` }]} />
              </View>
              <View style={styles.gaugeCenter}>
                <Text style={styles.gaugeValue}>{healthRate}%</Text>
                <Text style={styles.gaugeLabel}>Healthy</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Value</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{formatCurrency(summary?.total_value || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg per Item</Text>
              <Text style={styles.statValue}>{formatCurrency(summary?.total_items ? summary.total_value / summary.total_items : 0)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Status Breakdown</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Count</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>%</Text>
          </View>
          {[
            { status: 'In Stock', count: summary?.in_stock_count || 0, color: COLORS.success },
            { status: 'Low Stock', count: summary?.low_stock_count || 0, color: COLORS.warning },
            { status: 'Out of Stock', count: summary?.out_of_stock_count || 0, color: COLORS.danger },
          ].map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <View style={[styles.statusIndicator, { backgroundColor: row.color }]} />
                <Text style={styles.tableCellText}>{row.status}</Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{row.count}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'right', color: row.color }]}>
                {summary?.total_items ? Math.round((row.count / summary.total_items) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  // Valuation Report
  const renderValuationReport = () => (
    <>
      <View style={styles.valuationCards}>
        <View style={styles.valuationCard}>
          <View style={[styles.valuationIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="wallet" size={32} color={COLORS.success} />
          </View>
          <Text style={[styles.valuationValue, { color: COLORS.success }]}>{formatCurrency(summary?.total_value || 0)}</Text>
          <Text style={styles.valuationLabel}>Total Stock Value</Text>
        </View>
        <View style={styles.valuationCard}>
          <View style={[styles.valuationIcon, { backgroundColor: COLORS.blueLight }]}>
            <Ionicons name="calculator" size={32} color={COLORS.blue} />
          </View>
          <Text style={styles.valuationValue}>{formatCurrency(summary?.total_items ? summary.total_value / summary.total_items : 0)}</Text>
          <Text style={styles.valuationLabel}>Avg Item Value</Text>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Value by Category</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Items</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Value</Text>
          </View>
          {categories.length > 0 ? categories.map((cat, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>{cat.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{cat.count}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', color: COLORS.success }]}>{formatCurrency(cat.value || 0)}</Text>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No category data available</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Low Stock Report
  const renderLowStockReport = () => (
    <>
      <View style={styles.alertCard}>
        <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.alertGradient}>
          <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
            <Text style={styles.alertSubtitle}>{(summary?.low_stock_count || 0) + (summary?.out_of_stock_count || 0)} items need attention</Text>
          </View>
          <TouchableOpacity style={styles.alertAction}>
            <Text style={styles.alertActionText}>Reorder</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Items Needing Reorder</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Product</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Current</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Min</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
          </View>
          {lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map((item, idx) => (
            <View key={idx} style={[styles.tableRow, item.quantity === 0 && styles.tableRowDanger]}>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: '600', color: item.quantity === 0 ? COLORS.danger : COLORS.warning }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{item.min_quantity}</Text>
              <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                <View style={[styles.statusBadge, { backgroundColor: item.quantity === 0 ? COLORS.dangerLight : COLORS.warningLight }]}>
                  <Text style={[styles.statusBadgeText, { color: item.quantity === 0 ? COLORS.danger : COLORS.warning }]}>
                    {item.quantity === 0 ? 'Out' : 'Low'}
                  </Text>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={[styles.emptyText, { color: COLORS.success }]}>All items well stocked!</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Categories Report
  const renderCategoriesReport = () => (
    <>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Stock by Category</Text>
        </View>
        <View style={styles.chartBody}>
          {categories.length > 0 ? (
            <BarChart
              data={categories.slice(0, 6).map((cat, idx) => ({
                value: cat.count,
                label: cat.name.substring(0, 4),
                frontColor: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'][idx],
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
              <Ionicons name="grid-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No category data</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Categories Summary</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Products</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Value</Text>
          </View>
          {categories.map((cat, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>{cat.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{cat.count}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(cat.value || 0)}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  // Movement Report (placeholder)
  const renderMovementReport = () => (
    <View style={styles.emptyState}>
      <Ionicons name="swap-horizontal-outline" size={64} color={COLORS.lightGray} />
      <Text style={styles.emptyText}>Movement data coming soon</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Export Modal - Inline to prevent re-mounting on state changes */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalBox}>
            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderLeft}>
                <View style={[styles.exportModalIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="analytics" size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.exportModalTitle}>Inventory Analytics Report</Text>
                  <Text style={styles.exportModalSubtitle}>Export your report data</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setExportModalVisible(false)} style={styles.exportModalClose}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {/* Preview Toggle */}
            <View style={styles.previewToggleRow}>
              <TouchableOpacity 
                style={[styles.previewToggleBtnBase, exportPreviewMode === 'pdf' && styles.previewToggleBtnActive]}
                onPress={() => setExportPreviewMode('pdf')}
              >
                <Ionicons name="document-outline" size={16} color={exportPreviewMode === 'pdf' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.previewToggleText, exportPreviewMode === 'pdf' && styles.previewToggleTextActive]}>PDF Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.previewToggleBtnBase, exportPreviewMode === 'excel' && styles.previewToggleBtnActive]}
                onPress={() => setExportPreviewMode('excel')}
              >
                <Ionicons name="grid-outline" size={16} color={exportPreviewMode === 'excel' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.previewToggleText, exportPreviewMode === 'excel' && styles.previewToggleTextActive]}>Excel Preview</Text>
              </TouchableOpacity>
            </View>

            {/* Report Info */}
            <View style={styles.reportInfoSection}>
              <View style={styles.reportInfoHeader}>
                <View style={styles.reportInfoLogo}>
                  <Ionicons name="cube" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.reportInfoName}>Inventory</Text>
                  <Text style={styles.reportInfoType}>Stock Analytics Report</Text>
                </View>
              </View>
              <View style={styles.reportInfoDateRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                <Text style={styles.reportInfoDate}>
                  {useCustomDates 
                    ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `Stock as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </Text>
              </View>
            </View>

            {/* Quick Summary Cards */}
            <View style={styles.exportSummaryRow}>
              <View style={[styles.exportSummaryCard, { borderTopColor: COLORS.primary }]}>
                <View style={[styles.exportSummaryIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={[styles.exportSummaryValue, { color: COLORS.primary }]}>{summary?.total_items || 0}</Text>
                <Text style={styles.exportSummaryLabel}>Products</Text>
              </View>
              <View style={[styles.exportSummaryCard, { borderTopColor: COLORS.success }]}>
                <View style={[styles.exportSummaryIcon, { backgroundColor: COLORS.successLight }]}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.success} />
                </View>
                <Text style={[styles.exportSummaryValue, { color: COLORS.success }]}>{formatCurrency(summary?.total_value || 0)}</Text>
                <Text style={styles.exportSummaryLabel}>Stock Value</Text>
              </View>
              <View style={[styles.exportSummaryCard, { borderTopColor: COLORS.warning }]}>
                <View style={[styles.exportSummaryIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="pulse-outline" size={18} color={COLORS.warning} />
                </View>
                <Text style={[styles.exportSummaryValue, { color: COLORS.warning }]}>{healthRate}%</Text>
                <Text style={styles.exportSummaryLabel}>Health</Text>
              </View>
            </View>

            {/* Performance Overview */}
            <View style={styles.performanceSection}>
              <View style={styles.performanceSectionHeader}>
                <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
                <Text style={styles.performanceSectionTitle}>Stock Overview</Text>
              </View>
              <Text style={styles.reportStyleLabel}>Report Style</Text>
              <View style={styles.formatOptions}>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'graphical' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('graphical')}
                >
                  <Ionicons name="pie-chart" size={18} color={pdfFormat === 'graphical' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'graphical' && styles.formatOptionTextActive]}>Graphical</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'tabular' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('tabular')}
                >
                  <Ionicons name="list" size={18} color={pdfFormat === 'tabular' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'tabular' && styles.formatOptionTextActive]}>Tabular</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'both' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('both')}
                >
                  <Ionicons name="grid" size={18} color={pdfFormat === 'both' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'both' && styles.formatOptionTextActive]}>Both</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Export Buttons */}
            <View style={styles.exportButtonsRow}>
              <TouchableOpacity 
                style={[styles.exportBtn, styles.exportBtnPdf]} 
                onPress={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="document" size={18} color={COLORS.white} />
                    <Text style={styles.exportBtnText}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.exportBtn, styles.exportBtnExcel]} 
                onPress={() => handleExport('csv')}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Export Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <PageHeader />
        <PeriodSelector />
        <ReportTabs />
        
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {activeReport === 'overview' && renderOverviewReport()}
          {activeReport === 'valuation' && renderValuationReport()}
          {activeReport === 'movement' && renderMovementReport()}
          {activeReport === 'lowstock' && renderLowStockReport()}
          {activeReport === 'categories' && renderCategoriesReport()}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Export Success Toast */}
      {showExportSuccess && (
        <View style={styles.successToast}>
          <View style={styles.successToastContent}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.successToastText}>
              {exportedFormat === 'pdf' ? 'PDF' : 'Excel'} exported successfully!
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
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

  content: { padding: 20 },
  contentMobile: { padding: 16 },
  
  // Legacy styles (kept for compatibility)
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
  insightsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  insightCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightBadge: { fontSize: 12, fontWeight: '700', color: COLORS.success, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  insightValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  insightLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  chartsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  chartCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  chartAction: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  chartBody: { alignItems: 'center', paddingVertical: 16 },
  chartCenter: { alignItems: 'center' },
  chartCenterValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  chartCenterLabel: { fontSize: 12, color: COLORS.gray },
  chartLegend: { marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.gray },
  legendValue: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  gaugeContainer: { width: '100%', alignItems: 'center' },
  gaugeBg: { width: '100%', height: 16, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 8 },
  gaugeCenter: { alignItems: 'center', marginTop: 20 },
  gaugeValue: { fontSize: 40, fontWeight: '800', color: COLORS.success },
  gaugeLabel: { fontSize: 14, color: COLORS.gray },
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
  tableRowDanger: { backgroundColor: COLORS.dangerLight },
  tableCell: {},
  tableCellText: { fontSize: 14, color: COLORS.dark },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  alertCard: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  alertGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  alertSubtitle: { fontSize: 13, color: '#B45309', marginTop: 2 },
  alertAction: { backgroundColor: '#FBBF24', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  alertActionText: { fontSize: 13, fontWeight: '700', color: '#78350F' },
  valuationCards: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  valuationCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  valuationIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  valuationValue: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  valuationLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
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

  // Compact Export Modal (like Invoice View Modal)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exportModalBox: { backgroundColor: COLORS.white, borderRadius: 20, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  exportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  exportModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportModalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exportModalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  exportModalSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  exportModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  exportSummaryRow: { flexDirection: 'row', padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  exportSummaryItem: { flex: 1, alignItems: 'center' },
  exportSummaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  exportSummaryLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  formatSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  formatSectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 12 },
  formatOptions: { flexDirection: 'row', gap: 10 },
  formatOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: 'transparent' },
  formatOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  formatOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  formatOptionTextActive: { color: COLORS.white },
  exportButtonsRow: { flexDirection: 'row', padding: 20, gap: 12 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  exportBtnPdf: { backgroundColor: COLORS.primary },
  exportBtnCsv: { backgroundColor: COLORS.successLight, borderWidth: 1, borderColor: COLORS.success },
  exportBtnExcel: { backgroundColor: COLORS.success },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

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

  // Legacy styles
  exportModal: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 12, gap: 16 },
  exportOptionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportOptionContent: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  exportOptionDesc: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  
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
});
