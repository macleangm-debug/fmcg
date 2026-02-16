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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { ProductDashboard } from '../../src/components/dashboard';
import { Advert } from '../../src/components/AdvertCarousel';
import api from '../../src/api/client';

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
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
  total_messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  delivery_rate: number;
  sms_sent: number;
  whatsapp_sent: number;
  credits_remaining: number;
  total_contacts: number;
  active_campaigns: number;
  scheduled_messages: number;
}

interface RecentCampaign {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp';
  status: 'sent' | 'scheduled' | 'draft';
  recipients: number;
  delivered: number;
  created_at: string;
}

export default function UnitxtDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    total_messages_sent: 0,
    messages_delivered: 0,
    messages_failed: 0,
    delivery_rate: 0,
    sms_sent: 0,
    whatsapp_sent: 0,
    credits_remaining: 0,
    total_contacts: 0,
    active_campaigns: 0,
    scheduled_messages: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);

  // Fetch adverts
  const fetchAdverts = async () => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/adverts/public?product=unitxt&language=en`);
      if (response.ok) {
        const data = await response.json();
        setAdverts(data);
      }
    } catch (error) {
      console.log('Failed to fetch adverts:', error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // For now, use mock data until backend is ready
      // const response = await api.get('/unitxt/dashboard');
      // setStats(response.data.stats);
      // setRecentCampaigns(response.data.recent_campaigns);
      
      // Mock data for UI development
      setStats({
        total_messages_sent: 12450,
        messages_delivered: 11823,
        messages_failed: 627,
        delivery_rate: 95.0,
        sms_sent: 8234,
        whatsapp_sent: 4216,
        credits_remaining: 5000,
        total_contacts: 3542,
        active_campaigns: 3,
        scheduled_messages: 12,
      });
      
      setRecentCampaigns([
        { id: '1', name: 'Summer Sale Promo', type: 'sms', status: 'sent', recipients: 2500, delivered: 2387, created_at: '2025-01-25' },
        { id: '2', name: 'New Product Launch', type: 'whatsapp', status: 'scheduled', recipients: 1500, delivered: 0, created_at: '2025-01-27' },
        { id: '3', name: 'Customer Feedback', type: 'sms', status: 'sent', recipients: 850, delivered: 812, created_at: '2025-01-24' },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchAdverts();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return COLORS.success;
      case 'scheduled': return COLORS.blue;
      case 'draft': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'sent': return COLORS.successLight;
      case 'scheduled': return COLORS.blueLight;
      case 'draft': return COLORS.lightGray;
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

  // Web Layout - Using ProductDashboard
  if (isWeb) {
    return (
      <ProductDashboard
        productId="unitxt"
        subtitle="Send bulk SMS and manage marketing campaigns with ease"
        onNewAction={() => router.push('/unitxt/compose')}
        newActionLabel="New Message"
        statsRow={[
          { label: 'Messages Sent', value: formatNumber(stats.total_messages_sent), icon: 'paper-plane', iconBg: COLORS.primaryLight, iconColor: COLORS.primary },
          { label: 'Delivery Rate', value: `${stats.delivery_rate}%`, icon: 'checkmark-done', iconBg: COLORS.blueLight, iconColor: COLORS.blue },
          { label: 'Contacts', value: formatNumber(stats.total_contacts), icon: 'people', iconBg: COLORS.purpleLight, iconColor: COLORS.purple },
          { label: 'Credits Left', value: formatNumber(stats.credits_remaining), icon: 'wallet', iconBg: COLORS.warningLight, iconColor: COLORS.warning },
        ]}
        netIncome={{ value: stats.messages_delivered, trend: 15 }}
        totalReturn={{ value: stats.messages_failed, trend: -8 }}
        revenueTotal={stats.total_messages_sent * 0.5}
        revenueTrend={12}
        adverts={adverts}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onTransactionViewMore={() => router.push('/unitxt/campaigns')}
        onSalesReportViewMore={() => router.push('/unitxt/analytics')}
        onPromoPress={() => router.push('/unitxt/credits')}
        promoTitle="Reach more customers with SMS marketing."
        promoSubtitle="Send personalized messages at scale with high delivery rates."
        promoButtonText="Buy More Credits"
        formatCurrency={(amount) => formatNumber(Math.round(amount))}
      />
    );
  }

  // Mobile Layout
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
        {/* Header with Business Info */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.businessBadge}>
              <View style={styles.businessIcon}>
                <Ionicons name="paper-plane" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.businessName}>{user?.business_name || 'UniTxt'}</Text>
                <Text style={styles.planBadgeText}>Messaging Platform</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.newMessageBtn}
            onPress={() => router.push('/unitxt/compose')}
          >
            <Ionicons name="paper-plane" size={18} color={COLORS.white} />
            <Text style={styles.newMessageText}>New Message</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.welcomeSubtext}>Manage your messaging campaigns</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* Key Insights Cards */}
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={20} color={COLORS.dark} />
          <Text style={styles.sectionTitle}>Key Insights</Text>
        </View>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/unitxt/analytics')}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.blueLight }]}>
              <Ionicons name="paper-plane" size={20} color={COLORS.blue} />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats.total_messages_sent)}</Text>
            <Text style={styles.statLabel}>Total Sent</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/unitxt/analytics')}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{stats.delivery_rate}%</Text>
            <Text style={styles.statLabel}>Delivery Rate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/unitxt/contacts')}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="people" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats.total_contacts)}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/unitxt/campaigns')}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="megaphone" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.active_campaigns}</Text>
            <Text style={styles.statLabel}>Active Campaigns</Text>
          </TouchableOpacity>
        </View>

        {/* Credits Card */}
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.dark} />
          <Text style={styles.sectionTitle}>Credits Balance</Text>
        </View>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creditsCard}
        >
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsLabel}>Available Credits</Text>
            <Text style={styles.creditsValue}>{formatNumber(stats.credits_remaining)}</Text>
            <Text style={styles.creditsSubtext}>messages remaining</Text>
          </View>
          <TouchableOpacity
            style={styles.buyCreditsBtn}
            onPress={() => router.push('/unitxt/credits')}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.buyCreditsText}>Buy Credits</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Message Breakdown Card */}
        <View style={styles.sectionHeader}>
          <Ionicons name="pie-chart-outline" size={20} color={COLORS.dark} />
          <Text style={styles.sectionTitle}>Message Breakdown</Text>
        </View>
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="chatbubble" size={18} color={COLORS.blue} />
              </View>
              <View>
                <Text style={styles.breakdownValue}>{formatNumber(stats.sms_sent)}</Text>
                <Text style={styles.breakdownLabel}>SMS Sent</Text>
              </View>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.breakdownValue}>{formatNumber(stats.whatsapp_sent)}</Text>
                <Text style={styles.breakdownLabel}>WhatsApp Sent</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash-outline" size={20} color={COLORS.dark} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/unitxt/compose')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="create" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Compose</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/unitxt/inbox')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="mail" size={22} color={COLORS.danger} />
              </View>
              <Text style={styles.quickActionLabel}>Inbox</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/unitxt/tools')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.purpleLight }]}>
                <Ionicons name="construct" size={22} color={COLORS.purple} />
              </View>
              <Text style={styles.quickActionLabel}>Tools</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/unitxt/analytics')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="analytics" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.quickActionLabel}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Campaigns Card */}
        <View style={styles.sectionHeaderWithAction}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.dark} />
            <Text style={styles.sectionTitle}>Recent Campaigns</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/unitxt/campaigns')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recentCampaignsCard}>

          {recentCampaigns.map((campaign) => (
            <TouchableOpacity
              key={campaign.id}
              style={styles.campaignCard}
              onPress={() => router.push(`/unitxt/campaigns?id=${campaign.id}`)}
            >
              <View style={styles.campaignLeft}>
                <View style={[styles.campaignTypeIcon, {
                  backgroundColor: campaign.type === 'whatsapp' ? COLORS.successLight : COLORS.blueLight
                }]}>
                  <Ionicons
                    name={campaign.type === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'}
                    size={18}
                    color={campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue}
                  />
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignMeta}>
                    {campaign.recipients} recipients • {campaign.created_at}
                  </Text>
                </View>
              </View>
              <View style={[styles.campaignStatus, { backgroundColor: getStatusBg(campaign.status) }]}>
                <Text style={[styles.campaignStatusText, { color: getStatusColor(campaign.status) }]}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  businessIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  planBadgeText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeIcon: {
    opacity: 0.3,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: COLORS.gray,
  },
  newMessageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  newMessageText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 0,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 14,
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  creditsCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  creditsInfo: {},
  creditsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
  },
  creditsSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  buyCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  buyCreditsText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  breakdownLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  quickActionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
  },
  recentCampaignsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  campaignCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    marginBottom: 10,
  },
  campaignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  campaignTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  campaignMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  campaignStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  campaignStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Web Styles
  webScrollContent: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  webSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  webPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  webPrimaryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  webStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  webStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 14,
    gap: 16,
  },
  webStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  webStatLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  webChartsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  webChartCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 14,
  },
  webChartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  webDonutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  webDonutChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  webDonutSegment: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  webDonutCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDonutValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  webDonutLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  webChartLegend: {
    marginTop: 16,
    gap: 8,
  },
  webLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  webLegendText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  webEmptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  webEmptyText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 12,
  },
  webTrendChart: {
    flexDirection: 'row',
    height: 150,
  },
  webTrendYAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  webTrendLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  webTrendArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  webTrendLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginBottom: 20,
  },
  webTrendXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webBottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  webTableCard: {
    flex: 2,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 14,
  },
  webTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  webTableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  webViewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  webTable: {
    flex: 1,
  },
  webTableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  webTableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  webTableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    alignItems: 'center',
  },
  webTableCell: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  webChannelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  webChannelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  webStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  webStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  webEmptyTable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  webEmptyTableText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
  },
  webCreateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  webCreateBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  webSidebar: {
    flex: 1,
    gap: 16,
  },
  webSidebarCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 14,
  },
  webSidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  webQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 10,
  },
  webQuickActionText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  webNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  webNavItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webNavItemText: {
    fontSize: 14,
    color: COLORS.dark,
  },
});
