import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#F59E0B',
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
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface UniTxtStats {
  totalUsers: number;
  activeUsers: number;
  messagesSent: number;
  messagesThisMonth: number;
  deliveryRate: number;
  openRate: number;
  activeCampaigns: number;
  totalCredits: number;
}

export default function UniTxtDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'messages' | 'contacts' | 'settings'>('overview');
  const [stats, setStats] = useState<UniTxtStats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [topSenders, setTopSenders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/unitxt/stats').catch(() => null);
      
      setStats(response?.data || {
        totalUsers: 1850,
        activeUsers: 1420,
        messagesSent: 45000000,
        messagesThisMonth: 3500000,
        deliveryRate: 98.2,
        openRate: 32.5,
        activeCampaigns: 245,
        totalCredits: 125000000,
      });

      setRecentCampaigns([
        { id: 'CMP-001', name: 'Holiday Sale Promo', type: 'sms', sent: 125000, delivered: 122500, opened: 42000, status: 'completed' },
        { id: 'CMP-002', name: 'New Product Launch', type: 'whatsapp', sent: 85000, delivered: 84150, opened: 31200, status: 'active' },
        { id: 'CMP-003', name: 'Customer Feedback', type: 'sms', sent: 45000, delivered: 44100, opened: 12500, status: 'completed' },
        { id: 'CMP-004', name: 'Flash Sale Alert', type: 'sms', sent: 200000, delivered: 196000, opened: 78000, status: 'scheduled' },
      ]);

      setTopSenders([
        { business: 'E-Commerce Giant', messages: 850000, credits: 4250000 },
        { business: 'Retail Chain TZ', messages: 620000, credits: 3100000 },
        { business: 'Banking Corp', messages: 540000, credits: 2700000 },
        { business: 'Telecom Provider', messages: 480000, credits: 2400000 },
        { business: 'Food Delivery App', messages: 350000, credits: 1750000 },
      ]);
    } catch (error) {
      console.error('Error fetching UniTxt data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
      
      <View style={styles.tabs}>
        {['overview', 'campaigns', 'messages', 'contacts', 'settings'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.totalUsers || 0)}</Text>
              <Text style={styles.kpiLabel}>Total Users</Text>
              <Text style={styles.kpiSubtext}>{stats?.activeUsers} active</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.blue }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.blue} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.messagesThisMonth || 0)}</Text>
              <Text style={styles.kpiLabel}>Messages This Month</Text>
              <Text style={styles.kpiSubtext}>{formatNumber(stats?.messagesSent || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.kpiValue}>{stats?.deliveryRate}%</Text>
              <Text style={styles.kpiLabel}>Delivery Rate</Text>
              <Text style={styles.kpiSubtext}>{stats?.openRate}% open rate</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.purple }]}>
              <View style={[styles.kpiIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="megaphone" size={20} color={COLORS.purple} />
              </View>
              <Text style={styles.kpiValue}>{stats?.activeCampaigns}</Text>
              <Text style={styles.kpiLabel}>Active Campaigns</Text>
              <Text style={styles.kpiSubtext}>{formatNumber(stats?.totalCredits || 0)} credits</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.gridCard, { flex: 2 }]}>
              <Text style={styles.cardTitle}>Recent Campaigns</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Campaign</Text>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={styles.tableHeaderCell}>Sent</Text>
                <Text style={styles.tableHeaderCell}>Delivered</Text>
                <Text style={styles.tableHeaderCell}>Opened</Text>
                <Text style={styles.tableHeaderCell}>Status</Text>
              </View>
              {recentCampaigns.map((campaign) => (
                <View key={campaign.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.campaignName}>{campaign.name}</Text>
                    <Text style={styles.campaignId}>{campaign.id}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <View style={[styles.typeBadge, { backgroundColor: campaign.type === 'sms' ? COLORS.blueLight : COLORS.successLight }]}>
                      <Ionicons name={campaign.type === 'sms' ? 'chatbubble' : 'logo-whatsapp'} size={12} color={campaign.type === 'sms' ? COLORS.blue : COLORS.success} />
                      <Text style={[styles.typeText, { color: campaign.type === 'sms' ? COLORS.blue : COLORS.success }]}>{campaign.type.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.tableCell}>{formatNumber(campaign.sent)}</Text>
                  <Text style={styles.tableCell}>{formatNumber(campaign.delivered)}</Text>
                  <Text style={styles.tableCell}>{formatNumber(campaign.opened)}</Text>
                  <View style={styles.tableCell}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>{campaign.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Top Senders</Text>
              {topSenders.map((sender, idx) => (
                <View key={idx} style={styles.senderRow}>
                  <View style={styles.senderRank}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.senderInfo}>
                    <Text style={styles.senderName}>{sender.business}</Text>
                    <Text style={styles.senderMeta}>{formatNumber(sender.messages)} messages</Text>
                  </View>
                  <Text style={styles.senderCredits}>{formatNumber(sender.credits)} cr</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return COLORS.success;
    case 'active': return COLORS.blue;
    case 'scheduled': return COLORS.warning;
    case 'paused': return COLORS.gray;
    default: return COLORS.gray;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  kpiGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiValue: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  kpiLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  kpiSubtext: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { flex: 1, fontSize: 13, color: COLORS.dark },
  campaignName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  campaignId: { fontSize: 10, color: COLORS.gray },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4, alignSelf: 'flex-start' },
  typeText: { fontSize: 10, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
  senderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  senderRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  senderMeta: { fontSize: 11, color: COLORS.gray },
  senderCredits: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
