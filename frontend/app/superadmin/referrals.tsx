import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface ReferralConfig {
  name: string;
  reward_type: string;
  referrer_reward: number;
  referee_reward: number;
  min_purchase_amount?: number;
  max_referrals_per_user?: number;
  expiry_days?: number;
  is_active: boolean;
}

interface Referral {
  id: string;
  referrer: { id: string; name: string; email: string };
  referee: { id: string; name: string; email: string };
  status: string;
  referral_code: string;
  referrer_reward: number;
  referee_reward: number;
  created_at: string;
  completed_at?: string;
}

interface TopReferrer {
  user_id: string;
  name: string;
  email: string;
  referral_count: number;
  total_earned: number;
}

export default function ReferralManagement() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_referrals: 0,
    successful_referrals: 0,
    pending_referrals: 0,
    conversion_rate: 0,
    total_rewards_given: 0,
  });
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [config, setConfig] = useState<ReferralConfig>({
    name: 'Software Galaxy Referral Program',
    reward_type: 'credit',
    referrer_reward: 10,
    referee_reward: 10,
    min_purchase_amount: 0,
    max_referrals_per_user: 50,
    expiry_days: 30,
    is_active: true,
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'settings'>('overview');
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const referralsPerPage = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, configRes] = await Promise.all([
        api.get('/superadmin/referrals/stats').catch(() => ({ data: null })),
        api.get('/superadmin/referrals/config').catch(() => ({ data: null })),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data.stats || {});
        setTopReferrers(statsRes.data.top_referrers || []);
        setRecentReferrals(statsRes.data.recent_referrals || []);
      }

      if (configRes.data?.config) {
        setConfig(configRes.data.config);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllReferrals = useCallback(async () => {
    try {
      const response = await api.get(`/superadmin/referrals?status=${filterStatus}&page=${currentPage}&limit=${referralsPerPage}`);
      setAllReferrals(response.data?.referrals || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  }, [filterStatus, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeTab === 'referrals') fetchAllReferrals(); }, [activeTab, fetchAllReferrals]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/superadmin/referrals/config', config);
      Alert.alert('Success', 'Referral program settings saved');
      setShowConfigModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'expired': return COLORS.gray;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Referral Program</Text>
          <Text style={styles.pageSubtitle}>Manage referrals and grow your user base</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowConfigModal(true)} data-testid="referral-settings-btn">
          <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
          <Text style={styles.settingsButtonText}>Configure</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['overview', 'referrals', 'settings'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Ionicons
              name={tab === 'overview' ? 'stats-chart-outline' : tab === 'referrals' ? 'people-outline' : 'cog-outline'}
              size={18}
              color={activeTab === tab ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="share-social" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.statValue}>{stats.total_referrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.successful_referrals}</Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time" size={24} color={COLORS.warning} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.pending_referrals}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DDD6FE' }]}>
                <Ionicons name="trending-up" size={24} color={COLORS.purple} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.purple }]}>{stats.conversion_rate}%</Text>
              <Text style={styles.statLabel}>Conversion Rate</Text>
            </View>
          </View>

          {/* Total Rewards */}
          <View style={styles.rewardsCard}>
            <View style={styles.rewardsHeader}>
              <View>
                <Text style={styles.rewardsTitle}>Total Rewards Distributed</Text>
                <Text style={styles.rewardsValue}>${stats.total_rewards_given.toLocaleString()}</Text>
              </View>
              <View style={styles.rewardsIcon}>
                <Ionicons name="gift" size={32} color={COLORS.primary} />
              </View>
            </View>
            <View style={styles.rewardsDetails}>
              <View style={styles.rewardsDetail}>
                <Text style={styles.rewardsDetailLabel}>Referrer Rewards</Text>
                <Text style={styles.rewardsDetailValue}>${config.referrer_reward} per referral</Text>
              </View>
              <View style={styles.rewardsDetail}>
                <Text style={styles.rewardsDetailLabel}>Referee Rewards</Text>
                <Text style={styles.rewardsDetailValue}>${config.referee_reward} per signup</Text>
              </View>
            </View>
          </View>

          {/* Top Referrers */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Referrers</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {topReferrers.length > 0 ? (
              topReferrers.map((referrer, index) => (
                <View key={referrer.user_id} style={styles.referrerRow}>
                  <View style={styles.referrerRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.referrerInfo}>
                    <Text style={styles.referrerName}>{referrer.name}</Text>
                    <Text style={styles.referrerEmail}>{referrer.email}</Text>
                  </View>
                  <View style={styles.referrerStats}>
                    <Text style={styles.referrerCount}>{referrer.referral_count} referrals</Text>
                    <Text style={styles.referrerEarned}>${referrer.total_earned} earned</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={40} color={COLORS.border} />
                <Text style={styles.emptyStateText}>No referrers yet</Text>
              </View>
            )}
          </View>

          {/* Recent Referrals */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Referrals</Text>
              <TouchableOpacity onPress={() => setActiveTab('referrals')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentReferrals.length > 0 ? (
              recentReferrals.slice(0, 5).map((referral) => (
                <View key={referral.id} style={styles.referralRow}>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{referral.referrer_name || 'Unknown'}</Text>
                    <Text style={styles.referralArrow}>→</Text>
                    <Text style={styles.referralName}>{referral.referee_name || referral.referee_email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(referral.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(referral.status) }]}>{referral.status}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={COLORS.border} />
                <Text style={styles.emptyStateText}>No referrals yet</Text>
              </View>
            )}
          </View>
        </>
      )}

      {activeTab === 'referrals' && (
        <>
          {/* Filters */}
          <View style={styles.filtersRow}>
            <View style={styles.filterChips}>
              {['all', 'pending', 'completed', 'expired'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => { setFilterStatus(status); setCurrentPage(1); }}
                >
                  <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Referrals Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Referrer</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Referee</Text>
              <Text style={styles.tableHeaderCell}>Status</Text>
              <Text style={styles.tableHeaderCell}>Reward</Text>
              <Text style={styles.tableHeaderCell}>Date</Text>
            </View>

            {allReferrals.map((referral) => (
              <View key={referral.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.cellName}>{referral.referrer.name}</Text>
                  <Text style={styles.cellEmail}>{referral.referrer.email}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.cellName}>{referral.referee.name || 'Pending'}</Text>
                  <Text style={styles.cellEmail}>{referral.referee.email}</Text>
                </View>
                <View style={styles.tableCell}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(referral.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(referral.status) }]}>{referral.status}</Text>
                  </View>
                </View>
                <Text style={styles.tableCell}>${referral.referrer_reward + referral.referee_reward}</Text>
                <Text style={styles.tableCell}>{new Date(referral.created_at).toLocaleDateString()}</Text>
              </View>
            ))}

            {allReferrals.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyStateText}>No referrals found</Text>
              </View>
            )}
          </View>
        </>
      )}

      {activeTab === 'settings' && (
        <View style={styles.settingsContainer}>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsCardTitle}>Program Configuration</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Program Name</Text>
              <TextInput
                style={styles.settingInput}
                value={config.name}
                onChangeText={(v) => setConfig({...config, name: v})}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Reward Type</Text>
              <View style={styles.rewardTypeSelector}>
                {['credit', 'discount', 'cash'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.rewardTypeOption, config.reward_type === type && styles.rewardTypeOptionActive]}
                    onPress={() => setConfig({...config, reward_type: type})}
                  >
                    <Text style={[styles.rewardTypeText, config.reward_type === type && styles.rewardTypeTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRowDouble}>
              <View style={styles.settingHalf}>
                <Text style={styles.settingLabel}>Referrer Reward ($)</Text>
                <TextInput
                  style={styles.settingInput}
                  value={String(config.referrer_reward)}
                  onChangeText={(v) => setConfig({...config, referrer_reward: parseFloat(v) || 0})}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.settingHalf}>
                <Text style={styles.settingLabel}>Referee Reward ($)</Text>
                <TextInput
                  style={styles.settingInput}
                  value={String(config.referee_reward)}
                  onChangeText={(v) => setConfig({...config, referee_reward: parseFloat(v) || 0})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.settingRowDouble}>
              <View style={styles.settingHalf}>
                <Text style={styles.settingLabel}>Max Referrals per User</Text>
                <TextInput
                  style={styles.settingInput}
                  value={String(config.max_referrals_per_user || '')}
                  onChangeText={(v) => setConfig({...config, max_referrals_per_user: parseInt(v) || undefined})}
                  keyboardType="numeric"
                  placeholder="Unlimited"
                />
              </View>
              <View style={styles.settingHalf}>
                <Text style={styles.settingLabel}>Expiry Days</Text>
                <TextInput
                  style={styles.settingInput}
                  value={String(config.expiry_days || '')}
                  onChangeText={(v) => setConfig({...config, expiry_days: parseInt(v) || undefined})}
                  keyboardType="numeric"
                  placeholder="Never"
                />
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.toggleRow}>
                <Text style={styles.settingLabel}>Program Active</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.is_active && styles.toggleActive]}
                  onPress={() => setConfig({...config, is_active: !config.is_active})}
                >
                  <View style={[styles.toggleThumb, config.is_active && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Growth Strategies */}
          <View style={styles.strategiesCard}>
            <Text style={styles.strategiesTitle}>Growth Strategies</Text>
            <Text style={styles.strategiesSubtitle}>Maximize your reach with these approaches</Text>
            
            <View style={styles.strategyItem}>
              <View style={[styles.strategyIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="share-social" size={20} color={COLORS.blue} />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyName}>Social Media Sharing</Text>
                <Text style={styles.strategyDesc}>Enable one-click sharing to WhatsApp, Twitter, LinkedIn, and Facebook</Text>
              </View>
            </View>

            <View style={styles.strategyItem}>
              <View style={[styles.strategyIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="gift" size={20} color={COLORS.success} />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyName}>Tiered Rewards</Text>
                <Text style={styles.strategyDesc}>Increase rewards for top referrers (e.g., 5+ referrals = 2x bonus)</Text>
              </View>
            </View>

            <View style={styles.strategyItem}>
              <View style={[styles.strategyIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="flash" size={20} color={COLORS.warning} />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyName}>Limited-Time Campaigns</Text>
                <Text style={styles.strategyDesc}>Run special referral events with boosted rewards</Text>
              </View>
            </View>

            <View style={styles.strategyItem}>
              <View style={[styles.strategyIcon, { backgroundColor: '#DDD6FE' }]}>
                <Ionicons name="mail" size={20} color={COLORS.purple} />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyName}>Email Campaigns</Text>
                <Text style={styles.strategyDesc}>Send automated referral reminders to engaged users</Text>
              </View>
            </View>

            <View style={styles.strategyItem}>
              <View style={[styles.strategyIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="ribbon" size={20} color={COLORS.danger} />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyName}>Leaderboard & Badges</Text>
                <Text style={styles.strategyDesc}>Gamify referrals with public leaderboards and achievement badges</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Config Modal */}
      <Modal visible={showConfigModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Referral Program Settings</Text>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Referrer Reward Amount ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(config.referrer_reward)}
                  onChangeText={(v) => setConfig({...config, referrer_reward: parseFloat(v) || 0})}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Referee Reward Amount ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(config.referee_reward)}
                  onChangeText={(v) => setConfig({...config, referee_reward: parseFloat(v) || 0})}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveConfig} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  settingsButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: COLORS.white, borderRadius: 16, padding: 20, alignItems: 'center' },
  statCardPrimary: { backgroundColor: COLORS.primary },
  statIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  rewardsCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, marginBottom: 24 },
  rewardsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rewardsTitle: { fontSize: 14, color: COLORS.gray },
  rewardsValue: { fontSize: 36, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  rewardsIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rewardsDetails: { flexDirection: 'row', gap: 24 },
  rewardsDetail: { flex: 1 },
  rewardsDetailLabel: { fontSize: 12, color: COLORS.gray },
  rewardsDetailValue: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginTop: 4 },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  viewAllText: { fontSize: 13, fontWeight: '500', color: COLORS.primary },
  referrerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  referrerRank: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  referrerInfo: { flex: 1 },
  referrerName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  referrerEmail: { fontSize: 12, color: COLORS.gray },
  referrerStats: { alignItems: 'flex-end' },
  referrerCount: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  referrerEarned: { fontSize: 12, color: COLORS.success },
  referralRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  referralInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  referralName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  referralArrow: { fontSize: 14, color: COLORS.gray },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: COLORS.gray, marginTop: 12 },
  filtersRow: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 24 },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGray },
  filterChipActive: { backgroundColor: COLORS.primaryLight },
  filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  filterChipTextActive: { color: COLORS.primary },
  tableContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.lightGray, paddingVertical: 12, paddingHorizontal: 16 },
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { flex: 1, fontSize: 13, color: COLORS.dark },
  cellName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  cellEmail: { fontSize: 11, color: COLORS.gray },
  settingsContainer: { gap: 24 },
  settingsCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24 },
  settingsCardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginBottom: 24 },
  settingRow: { marginBottom: 20 },
  settingRowDouble: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  settingHalf: { flex: 1 },
  settingLabel: { fontSize: 13, fontWeight: '500', color: COLORS.dark, marginBottom: 8 },
  settingInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.dark, backgroundColor: COLORS.lightGray },
  rewardTypeSelector: { flexDirection: 'row', gap: 8 },
  rewardTypeOption: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  rewardTypeOptionActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  rewardTypeText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  rewardTypeTextActive: { color: COLORS.primary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.border, padding: 2 },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  toggleThumbActive: { transform: [{ translateX: 22 }] },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, marginTop: 8 },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  strategiesCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24 },
  strategiesTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  strategiesSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 20 },
  strategyItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  strategyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strategyContent: { flex: 1 },
  strategyName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  strategyDesc: { fontSize: 12, color: COLORS.gray, marginTop: 4, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: 420, maxWidth: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '500', color: COLORS.dark, marginBottom: 8 },
  formInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.dark, backgroundColor: COLORS.lightGray },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
