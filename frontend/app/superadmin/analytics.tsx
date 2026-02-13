import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  cyan: '#06B6D4',
  cyanLight: '#CFFAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface AnalyticsData {
  app_name: string;
  client_id: string;
  period: string;
  summary: {
    total_api_calls: number;
    avg_daily_calls: number;
    total_revenue: number;
    avg_error_rate: number;
    total_users: number;
    growth_rate: number;
  };
  charts: {
    api_usage: Array<{ date: string; calls: number; successful: number; failed: number }>;
    user_growth: Array<{ date: string; total_users: number; new_users: number; active_users: number }>;
    revenue: Array<{ date: string; revenue: number; transactions: number }>;
    error_rates: Array<{ date: string; rate: number; errors: number }>;
  };
  top_endpoints: Array<{ endpoint: string; calls: number; avg_latency: number }>;
}

export default function AppAnalytics() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeChart, setActiveChart] = useState<'api' | 'users' | 'revenue' | 'errors'>('api');

  const clientId = params.clientId as string;

  useEffect(() => {
    fetchAnalytics();
  }, [clientId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get(`/superadmin/analytics/${clientId}`, {
        params: { period },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {data.slice(-14).map((item, index) => {
            const height = maxValue > 0 ? (item[dataKey] / maxValue) * 100 : 0;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.bar, { height: `${height}%`, backgroundColor: color }]} />
                <Text style={styles.barLabel}>{item.date.slice(5)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{analytics.app_name} Analytics</Text>
            <Text style={styles.headerSubtitle}>Performance insights and metrics</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="flash" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_api_calls)}</Text>
            <Text style={styles.statLabel}>Total API Calls</Text>
            <Text style={styles.statSubLabel}>{formatNumber(analytics.summary.avg_daily_calls)}/day avg</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="people" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_users)}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
            <View style={styles.growthBadge}>
              <Ionicons name="trending-up" size={12} color={COLORS.success} />
              <Text style={[styles.growthText, { color: COLORS.success }]}>
                +{analytics.summary.growth_rate}%
              </Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: COLORS.cyan }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.cyanLight }]}>
              <Ionicons name="cash" size={20} color={COLORS.cyan} />
            </View>
            <Text style={styles.statValue}>{formatCurrency(analytics.summary.total_revenue)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statSubLabel}>This period</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: analytics.summary.avg_error_rate > 1 ? COLORS.danger : COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: analytics.summary.avg_error_rate > 1 ? COLORS.dangerLight : COLORS.successLight }]}>
              <Ionicons name="bug" size={20} color={analytics.summary.avg_error_rate > 1 ? COLORS.danger : COLORS.success} />
            </View>
            <Text style={styles.statValue}>{analytics.summary.avg_error_rate.toFixed(2)}%</Text>
            <Text style={styles.statLabel}>Error Rate</Text>
            <Text style={styles.statSubLabel}>Average</Text>
          </View>
        </View>

        {/* Chart Tabs */}
        <View style={styles.chartTabs}>
          <TouchableOpacity
            style={[styles.chartTab, activeChart === 'api' && styles.chartTabActive]}
            onPress={() => setActiveChart('api')}
          >
            <Text style={[styles.chartTabText, activeChart === 'api' && styles.chartTabTextActive]}>
              API Usage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chartTab, activeChart === 'users' && styles.chartTabActive]}
            onPress={() => setActiveChart('users')}
          >
            <Text style={[styles.chartTabText, activeChart === 'users' && styles.chartTabTextActive]}>
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chartTab, activeChart === 'revenue' && styles.chartTabActive]}
            onPress={() => setActiveChart('revenue')}
          >
            <Text style={[styles.chartTabText, activeChart === 'revenue' && styles.chartTabTextActive]}>
              Revenue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chartTab, activeChart === 'errors' && styles.chartTabActive]}
            onPress={() => setActiveChart('errors')}
          >
            <Text style={[styles.chartTabText, activeChart === 'errors' && styles.chartTabTextActive]}>
              Errors
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart Area */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {activeChart === 'api' ? 'API Calls Over Time' :
             activeChart === 'users' ? 'User Growth' :
             activeChart === 'revenue' ? 'Revenue Trend' : 'Error Rate'}
          </Text>
          
          {activeChart === 'api' && (
            <SimpleBarChart 
              data={analytics.charts.api_usage} 
              dataKey="calls" 
              color={COLORS.primary} 
            />
          )}
          {activeChart === 'users' && (
            <SimpleBarChart 
              data={analytics.charts.user_growth} 
              dataKey="total_users" 
              color={COLORS.success} 
            />
          )}
          {activeChart === 'revenue' && (
            <SimpleBarChart 
              data={analytics.charts.revenue} 
              dataKey="revenue" 
              color={COLORS.cyan} 
            />
          )}
          {activeChart === 'errors' && (
            <SimpleBarChart 
              data={analytics.charts.error_rates} 
              dataKey="rate" 
              color={COLORS.danger} 
            />
          )}
        </View>

        {/* Top Endpoints */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Endpoints</Text>
          {analytics.top_endpoints.map((endpoint, index) => (
            <View key={index} style={styles.endpointRow}>
              <View style={styles.endpointRank}>
                <Text style={styles.endpointRankText}>{index + 1}</Text>
              </View>
              <View style={styles.endpointInfo}>
                <Text style={styles.endpointName}>{endpoint.endpoint}</Text>
                <View style={styles.endpointStats}>
                  <Text style={styles.endpointStat}>{formatNumber(endpoint.calls)} calls</Text>
                  <Text style={styles.endpointDot}>•</Text>
                  <Text style={styles.endpointStat}>{endpoint.avg_latency}ms avg</Text>
                </View>
              </View>
              <View style={styles.endpointBar}>
                <View 
                  style={[
                    styles.endpointBarFill, 
                    { width: `${(endpoint.calls / analytics.top_endpoints[0].calls) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.dark,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 8,
  },
  chartTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  chartTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  chartTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  chartTabTextActive: {
    color: COLORS.primary,
  },
  chartCard: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  chartContainer: {
    height: 180,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: COLORS.gray,
    marginTop: 4,
    transform: [{ rotate: '-45deg' }],
  },
  section: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  endpointRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  endpointRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  endpointInfo: {
    flex: 1,
  },
  endpointName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  endpointStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  endpointStat: {
    fontSize: 11,
    color: COLORS.gray,
  },
  endpointDot: {
    color: COLORS.gray,
  },
  endpointBar: {
    width: 80,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginLeft: 12,
  },
  endpointBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});
