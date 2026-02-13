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
import { useRouter } from 'expo-router';
import api from '../../../src/api/client';

const COLORS = {
  primary: '#06B6D4',
  primaryDark: '#0891B2',
  primaryLight: '#CFFAFE',
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

export default function UniTxtDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_messages: 145678,
    delivered: 143245,
    failed: 1234,
    pending: 1199,
    active_campaigns: 8,
    total_cost: 2340,
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/unitxt/stats');
      if (response?.data) {
        setStats({
          total_messages: response.data.total_messages || 0,
          delivered: response.data.delivered || 0,
          failed: response.data.failed || 0,
          pending: response.data.pending || 0,
          active_campaigns: response.data.active_campaigns || 0,
          total_cost: response.data.total_cost || 0,
        });
        setCampaigns(response.data.campaigns || []);
        setProviders(response.data.providers || []);
      }
    } catch (error) {
      console.error('Failed to fetch UniTxt stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const deliveryRate = Math.round((stats.delivered / stats.total_messages) * 100);

  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <View style={[styles.statCard, isWeb && styles.statCardWeb]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtext && <Text style={[styles.statSubtext, { color }]}>{subtext}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading UniTxt...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.pageTitle}>UniTxt</Text>
              <Text style={styles.pageSubtitle}>SMS & Messaging Platform</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="paper-plane" size={18} color={COLORS.white} />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Stats Card */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeader}>
            <Text style={styles.deliveryTitle}>Delivery Rate</Text>
            <View style={styles.deliveryRateBadge}>
              <Text style={styles.deliveryRateText}>{deliveryRate}%</Text>
            </View>
          </View>
          <View style={styles.deliveryStats}>
            <View style={styles.deliveryStatItem}>
              <View style={[styles.deliveryDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.deliveryStatLabel}>Delivered</Text>
              <Text style={styles.deliveryStatValue}>{stats.delivered.toLocaleString()}</Text>
            </View>
            <View style={styles.deliveryStatItem}>
              <View style={[styles.deliveryDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.deliveryStatLabel}>Pending</Text>
              <Text style={styles.deliveryStatValue}>{stats.pending.toLocaleString()}</Text>
            </View>
            <View style={styles.deliveryStatItem}>
              <View style={[styles.deliveryDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.deliveryStatLabel}>Failed</Text>
              <Text style={styles.deliveryStatValue}>{stats.failed.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.deliveryBar}>
            <View style={[styles.deliveryBarSegment, { flex: stats.delivered, backgroundColor: COLORS.success }]} />
            <View style={[styles.deliveryBarSegment, { flex: stats.pending, backgroundColor: COLORS.warning }]} />
            <View style={[styles.deliveryBarSegment, { flex: stats.failed, backgroundColor: COLORS.danger }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, isWeb && styles.statsGridWeb]}>
          <StatCard
            title="Total Messages"
            value={stats.total_messages}
            icon="chatbubbles-outline"
            color={COLORS.blue}
          />
          <StatCard
            title="Active Campaigns"
            value={stats.active_campaigns}
            icon="megaphone-outline"
            color={COLORS.purple}
          />
          <StatCard
            title="This Month Cost"
            value={`$${stats.total_cost.toLocaleString()}`}
            icon="cash-outline"
            color={COLORS.primary}
          />
          <StatCard
            title="Delivery Rate"
            value={`${deliveryRate}%`}
            icon="checkmark-done-outline"
            color={COLORS.success}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="paper-plane" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>Quick Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.purpleLight }]}>
                <Ionicons name="megaphone" size={24} color={COLORS.purple} />
              </View>
              <Text style={styles.actionText}>Campaigns</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="people" size={24} color={COLORS.blue} />
              </View>
              <Text style={styles.actionText}>Contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="document-text" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.actionText}>Templates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Campaigns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Campaigns</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {[
            { name: 'Valentine Promo', type: 'Promotional', sent: 12500, delivered: 12234, status: 'active' },
            { name: 'Order Confirmations', type: 'Transactional', sent: 8900, delivered: 8856, status: 'active' },
            { name: 'Welcome Messages', type: 'Automated', sent: 3450, delivered: 3420, status: 'active' },
          ].map((campaign, index) => (
            <TouchableOpacity key={index} style={styles.campaignCard}>
              <View style={styles.campaignLeft}>
                <View style={[styles.campaignIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="megaphone" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignType}>{campaign.type}</Text>
                </View>
              </View>
              <View style={styles.campaignRight}>
                <Text style={styles.campaignStats}>
                  {campaign.delivered.toLocaleString()} / {campaign.sent.toLocaleString()}
                </Text>
                <View style={[styles.campaignStatusBadge, { backgroundColor: COLORS.successLight }]}>
                  <View style={styles.campaignStatusDot} />
                  <Text style={styles.campaignStatusText}>Active</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* SMS Providers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Providers</Text>
          <View style={styles.providersRow}>
            {[
              { name: 'Twilio', status: 'active', balance: '$450' },
              { name: 'Infobip', status: 'active', balance: '$320' },
              { name: 'Africa\'s Talking', status: 'active', balance: '$180' },
            ].map((provider, index) => (
              <View key={index} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <View style={[styles.providerStatus, { backgroundColor: COLORS.success }]} />
                </View>
                <Text style={styles.providerBalance}>{provider.balance}</Text>
                <Text style={styles.providerBalanceLabel}>Balance</Text>
              </View>
            ))}
          </View>
        </View>
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
    fontSize: 16,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  deliveryRateBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryRateText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  deliveryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deliveryStatLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  deliveryStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  deliveryBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deliveryBarSegment: {
    height: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsGridWeb: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWeb: {
    minWidth: 'auto',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.dark,
  },
  campaignCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  campaignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  campaignIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignInfo: {},
  campaignName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  campaignType: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  campaignRight: {
    alignItems: 'flex-end',
  },
  campaignStats: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  campaignStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  campaignStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  campaignStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.success,
  },
  providersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  providerCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  providerStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerBalance: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  providerBalanceLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
});
