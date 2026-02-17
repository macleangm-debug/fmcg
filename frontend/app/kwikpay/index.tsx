import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { ProductDashboard } from '../../src/components/dashboard';
import { Advert } from '../../src/components/AdvertCarousel';
import api from '../../src/api/client';
import ProductSwitcher from '../../src/components/ProductSwitcher';

// KwikPay Green Theme
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface DashboardStats {
  total_volume: number;
  total_transactions: number;
  successful_rate: number;
  pending_payouts: number;
  today_volume: number;
  today_transactions: number;
  currency: string;
}

interface RecentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  customer_email: string;
  created_at: string;
}

export default function KwikPayDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const { formatNumber } = useBusinessStore();

  // Mobile view when width < 768px
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    total_volume: 0,
    total_transactions: 0,
    successful_rate: 0,
    pending_payouts: 0,
    today_volume: 0,
    today_transactions: 0,
    currency: 'TZS',
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [adverts, setAdverts] = useState<Advert[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/dashboard');
      setStats(response.data.stats);
      setRecentTransactions(response.data.recent_transactions || []);
    } catch (error) {
      // Mock data
      setStats({
        total_volume: 15847250,
        total_transactions: 1284,
        successful_rate: 100,
        pending_payouts: 0,
        today_volume: 25000,
        today_transactions: 1,
        currency: 'TZS',
      });
      setRecentTransactions([
        { id: '1', reference: 'KWP-0001', amount: 150000, currency: 'TZS', status: 'succeeded', method: 'M-Pesa', customer_email: 'john@example.com', created_at: '2025-01-28 14:30' },
        { id: '2', reference: 'KWP-0002', amount: 85000, currency: 'TZS', status: 'succeeded', method: 'Card', customer_email: 'mary@example.com', created_at: '2025-01-28 14:15' },
        { id: '3', reference: 'KWP-0003', amount: 250000, currency: 'TZS', status: 'pending', method: 'Tigo Pesa', customer_email: 'peter@example.com', created_at: '2025-01-28 14:00' },
        { id: '4', reference: 'KWP-0004', amount: 45000, currency: 'TZS', status: 'failed', method: 'Airtel Money', customer_email: 'grace@example.com', created_at: '2025-01-28 13:45' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatAmount = (amount: number, currency: string = 'TZS') => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'succeeded': return COLORS.successLight;
      case 'pending': return COLORS.warningLight;
      case 'failed': return COLORS.dangerLight;
      default: return COLORS.lightGray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <SafeAreaView style={styles.mobileContainer} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {/* Welcome Header */}
          <View style={styles.mobileHeader}>
            <View style={styles.mobileHeaderLeft}>
              <View style={[styles.mobileAppBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[styles.mobileAppBadgeText, { color: COLORS.primaryDark }]}>KP</Text>
              </View>
              <View>
                <Text style={styles.mobileGreeting}>Welcome back,</Text>
                <Text style={styles.mobileUserName}>{user?.name || 'User'}</Text>
              </View>
            </View>
            <ProductSwitcher currentProductId="kwikpay" />
          </View>

          {/* Stats Grid */}
          <View style={styles.mobileStatsGrid}>
            <TouchableOpacity style={styles.mobileStatCard}>
              <View style={[styles.mobileStatIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.mobileStatValue}>{formatAmount(stats.today_volume)}</Text>
              <Text style={styles.mobileStatLabel}>Today's Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mobileStatCard} onPress={() => router.push('/kwikpay/transactions')}>
              <View style={[styles.mobileStatIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="swap-horizontal-outline" size={24} color={COLORS.blue} />
              </View>
              <Text style={styles.mobileStatValue}>{formatNumber(stats.today_transactions)}</Text>
              <Text style={styles.mobileStatLabel}>Transactions Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mobileStatCard} onPress={() => router.push('/kwikpay/payouts')}>
              <View style={[styles.mobileStatIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="wallet-outline" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.mobileStatValue}>{formatAmount(stats.pending_payouts)}</Text>
              <Text style={styles.mobileStatLabel}>Pending Payouts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mobileStatCard}>
              <View style={[styles.mobileStatIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.mobileStatValue}>{stats.successful_rate}%</Text>
              <Text style={styles.mobileStatLabel}>Success Rate</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.mobileCard}>
            <Text style={styles.mobileCardTitle}>Quick Actions</Text>
            <View style={styles.mobileQuickActionsGrid}>
              <TouchableOpacity style={styles.mobileQuickActionItem} onPress={() => router.push('/kwikpay/collect')}>
                <View style={[styles.mobileQuickActionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.mobileQuickActionLabel}>Collect Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileQuickActionItem} onPress={() => router.push('/kwikpay/payment-links')}>
                <View style={[styles.mobileQuickActionIcon, { backgroundColor: COLORS.blueLight }]}>
                  <Ionicons name="link-outline" size={24} color={COLORS.blue} />
                </View>
                <Text style={styles.mobileQuickActionLabel}>Payment Link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileQuickActionItem} onPress={() => router.push('/kwikpay/qr-codes')}>
                <View style={[styles.mobileQuickActionIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="qr-code-outline" size={24} color={COLORS.warning} />
                </View>
                <Text style={styles.mobileQuickActionLabel}>QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileQuickActionItem} onPress={() => router.push('/kwikpay/payouts')}>
                <View style={[styles.mobileQuickActionIcon, { backgroundColor: '#FEF9C3' }]}>
                  <Ionicons name="send-outline" size={24} color="#CA8A04" />
                </View>
                <Text style={styles.mobileQuickActionLabel}>Payouts</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Tools */}
          {user?.role === 'admin' && (
            <View style={styles.mobileCard}>
              <Text style={styles.mobileCardTitle}>Admin Tools</Text>
              <View style={styles.mobileAdminToolsGrid}>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/gateway')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="git-branch-outline" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>Gateway</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/mobile-money')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.warningLight }]}>
                    <Ionicons name="phone-portrait-outline" size={24} color={COLORS.warning} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>Mobile Money</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/fraud')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.dangerLight }]}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.danger} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>Fraud</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/analytics')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.blueLight }]}>
                    <Ionicons name="bar-chart-outline" size={24} color={COLORS.blue} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/developers')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.purpleLight }]}>
                    <Ionicons name="code-slash-outline" size={24} color={COLORS.purple} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>API</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileAdminToolItem} onPress={() => router.push('/kwikpay/settings')}>
                  <View style={[styles.mobileAdminToolIcon, { backgroundColor: COLORS.lightGray }]}>
                    <Ionicons name="settings-outline" size={24} color={COLORS.gray} />
                  </View>
                  <Text style={styles.mobileAdminToolLabel}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }


  // ============ WEB/DESKTOP LAYOUT - Using ProductDashboard Component ============
  return (
    <ProductDashboard
      productId="kwikpay"
      subtitle="Overview of your payment activity"
      onNewAction={() => router.push('/kwikpay/collect')}
      newActionLabel="Collect Payment"
      statsRow={[
        { label: 'Total Transactions', value: formatNumber(stats.total_transactions), icon: 'swap-horizontal', iconBg: '#DBEAFE', iconColor: '#2563EB' },
        { label: 'Total Volume', value: formatAmount(stats.total_volume), icon: 'checkmark-circle', iconBg: '#D1FAE5', iconColor: '#10B981' },
        { label: 'Pending Payouts', value: formatAmount(stats.pending_payouts), icon: 'time', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
        { label: 'Failed Rate', value: `${((1 - stats.successful_rate / 100) * 100).toFixed(0)}%`, icon: 'alert-circle', iconBg: '#FEE2E2', iconColor: '#EF4444' },
      ]}
      netIncome={{ value: stats.total_volume || 0, trend: 15 }}
      totalReturn={{ value: stats.pending_payouts || 0, trend: -8 }}
      revenueTotal={stats.total_volume || 0}
      revenueTrend={stats.successful_rate || 0}
      adverts={adverts}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onTransactionViewMore={() => router.push('/kwikpay/transactions')}
      onSalesReportViewMore={() => router.push('/kwikpay/analytics')}
      onPromoPress={() => router.push('/kwikpay/collect')}
      promoTitle="Accept payments from anywhere."
      promoSubtitle="Collect payments via mobile money, cards, and bank transfers."
      promoButtonText="Collect Payment"
      formatCurrency={(amount) => formatAmount(amount)}
    />
  );
}
const styles = StyleSheet.create({
  // ============ WEB STYLES ============
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 6 },
  primaryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 20, borderRadius: 12, gap: 16 },
  statIconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: {},
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  chartsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  chartCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  donutContainer: { alignItems: 'center', marginBottom: 16 },
  donutChart: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.success, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  donutCenterValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  donutCenterLabel: { fontSize: 12, color: COLORS.gray },
  legendContainer: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.gray },
  lineChartContainer: { flexDirection: 'row', height: 150 },
  yAxis: { width: 40, justifyContent: 'space-between', paddingVertical: 5 },
  yAxisLabel: { fontSize: 10, color: COLORS.gray, textAlign: 'right' },
  chartArea: { flex: 1, paddingLeft: 10 },
  chartLine: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chartBarContainer: { flex: 1, height: '100%', position: 'relative' },
  chartDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, left: '50%', marginLeft: -4 },
  chartDotPurple: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purple, left: '30%', marginLeft: -4 },
  chartDotGreen: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, left: '70%', marginLeft: -4 },
  xAxis: { flexDirection: 'row', paddingTop: 8 },
  xAxisLabel: { flex: 1, fontSize: 10, color: COLORS.gray, textAlign: 'center' },
  trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
  bottomRow: { flexDirection: 'row', gap: 16 },
  transactionsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllLink: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.lightGray },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 13, color: COLORS.gray },
  filterTabTextActive: { color: COLORS.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderCell: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  tableCell: { fontSize: 14, color: COLORS.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '500' },
  quickActionsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  quickActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: 14, color: COLORS.dark, fontWeight: '500' },

  // ============ MOBILE STYLES ============
  mobileContainer: { flex: 1, backgroundColor: COLORS.lightGray },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: COLORS.white },
  mobileHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobileAppBadge: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mobileAppBadgeText: { fontSize: 18, fontWeight: '800' },
  mobileGreeting: { fontSize: 13, color: COLORS.gray },
  mobileUserName: { fontSize: 17, fontWeight: '700', color: COLORS.dark, marginTop: 2 },
  mobileStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  mobileStatCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'flex-start' },
  mobileStatIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mobileStatValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  mobileStatLabel: { fontSize: 13, color: COLORS.gray },
  mobileCard: { backgroundColor: COLORS.white, marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16 },
  mobileCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  mobileQuickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  mobileQuickActionItem: { alignItems: 'center', width: '23%' },
  mobileQuickActionIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  mobileQuickActionLabel: { fontSize: 11, color: COLORS.dark, textAlign: 'center' },
  mobileAdminToolsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 16 },
  mobileAdminToolItem: { alignItems: 'center', width: '28%' },
  mobileAdminToolIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  mobileAdminToolLabel: { fontSize: 12, color: COLORS.dark, textAlign: 'center' },
});
