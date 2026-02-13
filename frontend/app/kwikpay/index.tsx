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

  // ============ WEB/DESKTOP LAYOUT - Original Dashboard ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSubtitle}>Overview of your payment activity</Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/kwikpay/collect')}>
            <Ionicons name="cash" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Collect Payment</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.blueLight }]}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.blue} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{formatNumber(stats.total_transactions)}</Text>
              <Text style={styles.statLabel}>Total Transactions</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{formatAmount(stats.total_volume)}</Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{formatAmount(stats.pending_payouts)}</Text>
              <Text style={styles.statLabel}>Pending Payouts</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{Math.round(100 - stats.successful_rate)}%</Text>
              <Text style={styles.statLabel}>Failed Rate</Text>
            </View>
          </View>
        </View>

        {/* Charts Row */}
        <View style={styles.chartsRow}>
          <View style={[styles.chartCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Transaction Status</Text>
            <View style={styles.donutContainer}>
              <View style={styles.donutChart}>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutCenterValue}>{formatNumber(stats.total_transactions)}</Text>
                  <Text style={styles.donutCenterLabel}>Total</Text>
                </View>
              </View>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>Succeeded ({stats.successful_rate}%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.blue }]} />
                <Text style={styles.legendText}>Pending (3%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.gray }]} />
                <Text style={styles.legendText}>Refunded (1%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.legendText}>Failed ({Math.round(100 - stats.successful_rate)}%)</Text>
              </View>
            </View>
          </View>

          <View style={[styles.chartCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Monthly Volume</Text>
            <View style={styles.lineChartContainer}>
              <View style={styles.yAxis}>
                {['10M', '7.5M', '5M', '2.5M', '0'].map((label, idx) => (
                  <Text key={idx} style={styles.yAxisLabel}>{label}</Text>
                ))}
              </View>
              <View style={styles.chartArea}>
                <View style={styles.chartLine}>
                  {[30, 45, 40, 55, 50, 65].map((height, idx) => (
                    <View key={idx} style={styles.chartBarContainer}>
                      <View style={[styles.chartDot, { bottom: `${height}%` }]} />
                    </View>
                  ))}
                </View>
                <View style={styles.xAxis}>
                  {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((label, idx) => (
                    <Text key={idx} style={styles.xAxisLabel}>{label}</Text>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.chartCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Payment Trend</Text>
            <View style={styles.lineChartContainer}>
              <View style={styles.yAxis}>
                {['10.0', '7.5', '5.0', '2.5', '0.0'].map((label, idx) => (
                  <Text key={idx} style={styles.yAxisLabel}>{label}</Text>
                ))}
              </View>
              <View style={styles.chartArea}>
                <View style={styles.chartLine}>
                  {[20, 35, 30, 45, 50, 60].map((height, idx) => (
                    <View key={idx} style={styles.chartBarContainer}>
                      <View style={[styles.chartDotPurple, { bottom: `${height}%` }]} />
                      <View style={[styles.chartDotGreen, { bottom: `${height - 5}%` }]} />
                    </View>
                  ))}
                </View>
                <View style={styles.xAxis}>
                  {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((label, idx) => (
                    <Text key={idx} style={styles.xAxisLabel}>{label}</Text>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.trendLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.purple }]} />
                <Text style={styles.legendText}>Received</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>Paid Out</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions + Quick Actions */}
        <View style={styles.bottomRow}>
          <View style={[styles.transactionsCard, { flex: 2 }]}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.chartTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/kwikpay/transactions')}>
                <Text style={styles.viewAllLink}>View All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterTabs}>
                {['All', 'Succeeded', 'Pending', 'Failed'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterTab, statusFilter === tab && styles.filterTabActive]}
                    onPress={() => setStatusFilter(tab)}
                  >
                    <Text style={[styles.filterTabText, statusFilter === tab && styles.filterTabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color={COLORS.gray} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Reference</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Customer</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Method</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
            </View>
            {recentTransactions.slice(0, 5).map((txn) => (
              <View key={txn.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '500' }]}>{txn.reference}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{txn.customer_email}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{txn.method}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatAmount(txn.amount, txn.currency)}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(txn.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(txn.status) }]}>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.quickActionsCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/kwikpay/collect')}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="cash" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionText}>Collect Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/kwikpay/checkout')}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="link" size={20} color={COLORS.blue} />
              </View>
              <Text style={styles.quickActionText}>Create Checkout Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/kwikpay/payouts')}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.purpleLight }]}>
                <Ionicons name="wallet" size={20} color={COLORS.purple} />
              </View>
              <Text style={styles.quickActionText}>Send Payout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/kwikpay/developers')}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="code-slash" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.quickActionText}>View API Keys</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
