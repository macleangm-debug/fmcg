import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  orange: '#F97316',
  orangeLight: '#FFEDD5',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const TIME_PERIODS = ['7D', '30D', '90D', '1Y'];

interface AnalyticsData {
  total_volume: number;
  total_transactions: number;
  successful_rate: number;
  pending_payouts: number;
  today_volume: number;
  today_transactions: number;
  volume_trend: { date: string; amount: number }[];
  payment_methods: { method: string; count: number; amount: number }[];
}

export default function AnalyticsPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30D');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/dashboard');
      const dashData = response.data;
      
      // Transform dashboard data to analytics format
      setData({
        total_volume: dashData.stats?.total_volume || 0,
        total_transactions: dashData.stats?.total_transactions || 0,
        successful_rate: dashData.stats?.successful_rate || 0,
        pending_payouts: dashData.stats?.pending_payouts || 0,
        today_volume: dashData.stats?.today_volume || 0,
        today_transactions: dashData.stats?.today_transactions || 0,
        volume_trend: (dashData.chart_data || []).map((d: any) => ({
          date: d.label,
          amount: d.value
        })),
        payment_methods: dashData.payment_methods || [
          { method: 'M-Pesa', count: 0, amount: 0 },
          { method: 'Tigo Pesa', count: 0, amount: 0 },
          { method: 'Card', count: 0, amount: 0 },
          { method: 'Airtel Money', count: 0, amount: 0 },
        ],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Keep existing data if fetch fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 100;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxVolume = data?.volume_trend ? Math.max(...data.volume_trend.map(d => d.amount)) : 0;
  const totalMethodAmount = data?.payment_methods?.reduce((a, m) => a + m.amount, 0) || 1; // Avoid division by zero

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAnalytics} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Analytics</Text>
            <Text style={styles.pageSubtitle}>Payment insights and reports</Text>
          </View>
          <View style={styles.periodSelector}>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, selectedPeriod === period && styles.periodOptionActive]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Overview Stats */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="trending-up" size={24} color={COLORS.white} />
            <Text style={styles.overviewLabel}>Total Volume</Text>
            <Text style={styles.overviewValue}>TZS {formatNumber(data?.total_volume || 0)}</Text>
            <Text style={styles.overviewChange}>+12.5% from last period</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
            <Text style={styles.overviewLabel}>Transactions</Text>
            <Text style={styles.overviewValue}>{formatNumber(data?.total_transactions || 0)}</Text>
            <Text style={styles.overviewChange}>+8.3% from last period</Text>
          </View>
        </View>

        {/* Secondary Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{data?.successful_rate?.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>TZS {formatNumber(data?.pending_payouts || 0)}</Text>
              <Text style={styles.statLabel}>Pending Payouts</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="today" size={20} color={COLORS.purple} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>TZS {formatNumber(data?.today_volume || 0)}</Text>
              <Text style={styles.statLabel}>Today's Volume</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.orangeLight }]}>
              <Ionicons name="flash" size={20} color={COLORS.orange} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{data?.today_transactions || 0}</Text>
              <Text style={styles.statLabel}>Today's TXNs</Text>
            </View>
          </View>
        </View>

        {/* Volume Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Volume Trend</Text>
          <View style={styles.barChart}>
            {data?.volume_trend?.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(item.amount / maxVolume) * 100}%`,
                        backgroundColor: index === data.volume_trend.length - 1 ? COLORS.primary : COLORS.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment Methods</Text>
          {data?.payment_methods?.map((method, index) => {
            const percentage = (method.amount / totalMethodAmount) * 100;
            const colors = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.warning];
            return (
              <View key={method.method} style={styles.methodRow}>
                <View style={styles.methodInfo}>
                  <View style={[styles.methodDot, { backgroundColor: colors[index % colors.length] }]} />
                  <View>
                    <Text style={styles.methodName}>{method.method}</Text>
                    <Text style={styles.methodCount}>{formatNumber(method.count)} transactions</Text>
                  </View>
                </View>
                <View style={styles.methodStats}>
                  <Text style={styles.methodAmount}>TZS {formatNumber(method.amount)}</Text>
                  <Text style={styles.methodPercentage}>{percentage.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
          <View style={styles.methodsBar}>
            {data?.payment_methods?.map((method, index) => {
              const percentage = (method.amount / totalMethodAmount) * 100;
              const colors = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.warning];
              return (
                <View
                  key={method.method}
                  style={[
                    styles.methodBarSegment,
                    {
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Quick Insights */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.insightsTitle}>Quick Insights</Text>
          </View>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="arrow-up-circle" size={18} color={COLORS.primary} />
              <Text style={styles.insightText}>M-Pesa accounts for 55% of total volume</Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="time" size={18} color={COLORS.warning} />
              <Text style={styles.insightText}>Peak transaction time: 2PM - 6PM</Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={18} color={COLORS.secondary} />
              <Text style={styles.insightText}>Average transaction value: TZS {formatNumber(Math.round((data?.total_volume || 0) / (data?.total_transactions || 1)))}</Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.insightText}>{(100 - (data?.successful_rate || 0)).toFixed(1)}% transactions failed - Review fraud rules</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  periodSelector: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 10, padding: 4 },
  periodOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  periodOptionActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  periodTextActive: { color: COLORS.white },
  overviewRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  overviewCard: { flex: 1, padding: 20, borderRadius: 16 },
  overviewLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
  overviewValue: { fontSize: 24, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  overviewChange: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', flexDirection: 'row', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: {},
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  chartCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  barChart: { flexDirection: 'row', height: 150, gap: 8, alignItems: 'flex-end' },
  barContainer: { flex: 1, alignItems: 'center' },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, minHeight: 8 },
  barLabel: { fontSize: 10, color: COLORS.gray, marginTop: 8 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  methodInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodDot: { width: 10, height: 10, borderRadius: 5 },
  methodName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  methodCount: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  methodStats: { alignItems: 'flex-end' },
  methodAmount: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  methodPercentage: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  methodsBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  methodBarSegment: { height: '100%' },
  insightsCard: { backgroundColor: COLORS.warningLight, borderRadius: 16, padding: 20 },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  insightsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  insightsList: { gap: 12 },
  insightItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightText: { fontSize: 13, color: COLORS.dark, flex: 1 },
});
