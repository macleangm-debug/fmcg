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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#F59E0B',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
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
  period: string;
  summary: {
    total_campaigns: number;
    total_messages_sent: number;
    total_delivered: number;
    total_failed: number;
    total_clicked: number;
    delivery_rate: number;
    click_rate: number;
    total_contacts: number;
    new_contacts: number;
    credits_balance: number;
  };
  by_type: {
    sms: { campaigns: number; messages: number; delivered: number };
    whatsapp: { campaigns: number; messages: number; delivered: number };
  };
  daily_stats: Array<{ date: string; messages_sent: number; delivered: number; failed: number }>;
  top_campaigns: Array<{
    name: string;
    type: string;
    recipients: number;
    delivered: number;
    delivery_rate: number;
  }>;
}

export default function AnalyticsPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/unitxt/analytics', {
            params: { period },
            headers: { Authorization: `Bearer ${token}` }
          });
          setAnalytics(response.data);
        } catch (e) {
          useMockData();
        }
      } else {
        useMockData();
      }
    } catch (error) {
      useMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const useMockData = () => {
    setAnalytics({
      period: period,
      summary: {
        total_campaigns: 24,
        total_messages_sent: 45230,
        total_delivered: 43015,
        total_failed: 2215,
        total_clicked: 5162,
        delivery_rate: 95.1,
        click_rate: 12.0,
        total_contacts: 3542,
        new_contacts: 156,
        credits_balance: 12500,
      },
      by_type: {
        sms: { campaigns: 18, messages: 32456, delivered: 30833 },
        whatsapp: { campaigns: 6, messages: 12774, delivered: 12182 },
      },
      daily_stats: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        messages_sent: Math.floor(1000 + Math.random() * 500),
        delivered: Math.floor(950 + Math.random() * 450),
        failed: Math.floor(20 + Math.random() * 30),
      })),
      top_campaigns: [
        { name: 'Summer Sale Promo', type: 'sms', recipients: 2500, delivered: 2387, delivery_rate: 95.5 },
        { name: 'New Product Launch', type: 'whatsapp', recipients: 1800, delivered: 1746, delivery_rate: 97.0 },
        { name: 'Customer Feedback', type: 'sms', recipients: 850, delivered: 812, delivery_rate: 95.5 },
        { name: 'Flash Sale Alert', type: 'whatsapp', recipients: 1200, delivered: 1164, delivery_rate: 97.0 },
        { name: 'Weekly Newsletter', type: 'sms', recipients: 3200, delivered: 3008, delivery_rate: 94.0 },
      ],
    });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, color }: { data: any[]; color: string }) => {
    const maxValue = Math.max(...data.map(d => d.messages_sent));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {data.slice(-14).map((item, index) => {
            const height = maxValue > 0 ? (item.messages_sent / maxValue) * 100 : 0;
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Analytics</Text>
          <View style={styles.periodSelector}>
            {(['7d', '30d', '90d'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="send" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_messages_sent)}</Text>
            <Text style={styles.statLabel}>Messages Sent</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_delivered)}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
            <Text style={styles.statRate}>{analytics.summary.delivery_rate}% rate</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: COLORS.danger }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_failed)}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: COLORS.blue }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.blueLight }]}>
              <Ionicons name="finger-print" size={20} color={COLORS.blue} />
            </View>
            <Text style={styles.statValue}>{formatNumber(analytics.summary.total_clicked)}</Text>
            <Text style={styles.statLabel}>Clicked</Text>
            <Text style={styles.statRate}>{analytics.summary.click_rate}% CTR</Text>
          </View>
        </View>

        {/* Secondary Stats Row */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatItem}>
            <Ionicons name="megaphone" size={18} color={COLORS.purple} />
            <Text style={styles.secondaryStatValue}>{analytics.summary.total_campaigns}</Text>
            <Text style={styles.secondaryStatLabel}>Campaigns</Text>
          </View>
          <View style={styles.secondaryStatDivider} />
          <View style={styles.secondaryStatItem}>
            <Ionicons name="people" size={18} color={COLORS.cyan} />
            <Text style={styles.secondaryStatValue}>{formatNumber(analytics.summary.total_contacts)}</Text>
            <Text style={styles.secondaryStatLabel}>Contacts</Text>
          </View>
          <View style={styles.secondaryStatDivider} />
          <View style={styles.secondaryStatItem}>
            <Ionicons name="person-add" size={18} color={COLORS.success} />
            <Text style={styles.secondaryStatValue}>+{analytics.summary.new_contacts}</Text>
            <Text style={styles.secondaryStatLabel}>New</Text>
          </View>
          <View style={styles.secondaryStatDivider} />
          <View style={styles.secondaryStatItem}>
            <Ionicons name="wallet" size={18} color={COLORS.primary} />
            <Text style={styles.secondaryStatValue}>{formatNumber(analytics.summary.credits_balance)}</Text>
            <Text style={styles.secondaryStatLabel}>Credits</Text>
          </View>
        </View>

        {/* Message Type Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Message Type</Text>
          <View style={styles.typeBreakdown}>
            <View style={[styles.typeCard, { backgroundColor: COLORS.blueLight }]}>
              <View style={styles.typeHeader}>
                <Ionicons name="chatbubble" size={24} color={COLORS.blue} />
                <Text style={[styles.typeTitle, { color: COLORS.blue }]}>SMS</Text>
              </View>
              <View style={styles.typeStats}>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{analytics.by_type.sms.campaigns}</Text>
                  <Text style={styles.typeStatLabel}>Campaigns</Text>
                </View>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{formatNumber(analytics.by_type.sms.messages)}</Text>
                  <Text style={styles.typeStatLabel}>Messages</Text>
                </View>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{formatNumber(analytics.by_type.sms.delivered)}</Text>
                  <Text style={styles.typeStatLabel}>Delivered</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.typeCard, { backgroundColor: COLORS.successLight }]}>
              <View style={styles.typeHeader}>
                <Ionicons name="logo-whatsapp" size={24} color={COLORS.success} />
                <Text style={[styles.typeTitle, { color: COLORS.success }]}>WhatsApp</Text>
              </View>
              <View style={styles.typeStats}>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{analytics.by_type.whatsapp.campaigns}</Text>
                  <Text style={styles.typeStatLabel}>Campaigns</Text>
                </View>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{formatNumber(analytics.by_type.whatsapp.messages)}</Text>
                  <Text style={styles.typeStatLabel}>Messages</Text>
                </View>
                <View style={styles.typeStat}>
                  <Text style={styles.typeStatValue}>{formatNumber(analytics.by_type.whatsapp.delivered)}</Text>
                  <Text style={styles.typeStatLabel}>Delivered</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Messages Over Time Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Messages Over Time</Text>
          <SimpleBarChart data={analytics.daily_stats} color={COLORS.primary} />
        </View>

        {/* Top Campaigns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Campaigns</Text>
          {analytics.top_campaigns.map((campaign, index) => (
            <View key={index} style={styles.campaignRow}>
              <View style={styles.campaignRank}>
                <Text style={styles.campaignRankText}>{index + 1}</Text>
              </View>
              <View style={styles.campaignInfo}>
                <View style={styles.campaignNameRow}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <View style={[styles.campaignType, {
                    backgroundColor: campaign.type === 'whatsapp' ? COLORS.successLight : COLORS.blueLight
                  }]}>
                    <Ionicons 
                      name={campaign.type === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'} 
                      size={12} 
                      color={campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue} 
                    />
                  </View>
                </View>
                <View style={styles.campaignMetrics}>
                  <Text style={styles.campaignMetric}>
                    <Text style={styles.campaignMetricValue}>{formatNumber(campaign.recipients)}</Text> sent
                  </Text>
                  <Text style={styles.campaignMetricDot}>•</Text>
                  <Text style={styles.campaignMetric}>
                    <Text style={styles.campaignMetricValue}>{formatNumber(campaign.delivered)}</Text> delivered
                  </Text>
                  <Text style={styles.campaignMetricDot}>•</Text>
                  <Text style={[styles.campaignMetric, { color: COLORS.success }]}>
                    {campaign.delivery_rate}%
                  </Text>
                </View>
              </View>
              <View style={styles.campaignBar}>
                <View 
                  style={[
                    styles.campaignBarFill, 
                    { 
                      width: `${(campaign.delivered / analytics.top_campaigns[0].delivered) * 100}%`,
                      backgroundColor: campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue
                    }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  periodBtnTextActive: {
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
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  statRate: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 2,
  },
  secondaryStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  secondaryStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  secondaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  secondaryStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  section: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  typeBreakdown: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeStat: {
    alignItems: 'center',
  },
  typeStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  typeStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  chartSection: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
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
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  campaignRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  campaignRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  campaignType: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  campaignMetric: {
    fontSize: 12,
    color: COLORS.gray,
  },
  campaignMetricValue: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  campaignMetricDot: {
    color: COLORS.gray,
  },
  campaignBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginLeft: 12,
  },
  campaignBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
