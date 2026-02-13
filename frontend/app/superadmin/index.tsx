import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                '/api';

interface SystemStats {
  total_businesses: number;
  active_businesses: number;
  total_users: number;
  total_orders: number;
  total_revenue: number;
  new_businesses_today: number;
  new_businesses_week: number;
  new_businesses_month: number;
}

interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city?: string;
  industry: string;
  status: string;
  created_at: string;
  last_active?: string;
  total_users: number;
  total_orders: number;
  total_revenue: number;
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'analytics'>('overview');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      const [statsRes, businessesRes] = await Promise.all([
        axios.get(`${API_URL}/superadmin/stats`, { headers }),
        axios.get(`${API_URL}/superadmin/businesses`, { headers }),
      ]);
      
      setStats(statsRes.data);
      setBusinesses(businessesRes.data);
    } catch (error) {
      console.log('Failed to fetch superadmin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      router.replace('/(tabs)/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'trial': return '#F59E0B';
      case 'suspended': return '#DC2626';
      case 'inactive': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const handleUpdateBusinessStatus = async (businessId: string, newStatus: string) => {
    try {
      const headers = await getAuthHeaders();
      await axios.put(
        `${API_URL}/superadmin/businesses/${businessId}`,
        { status: newStatus },
        { headers }
      );
      fetchData();
      setShowBusinessModal(false);
    } catch (error) {
      console.log('Failed to update business status:', error);
    }
  };

  const StatCard = ({ icon, label, value, subValue, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  );

  const renderOverview = () => (
    <View style={styles.content}>
      <View style={styles.statsGrid}>
        <StatCard
          icon="business-outline"
          label="Total Businesses"
          value={stats?.total_businesses || 0}
          subValue={`${stats?.active_businesses || 0} active`}
          color="#2563EB"
        />
        <StatCard
          icon="people-outline"
          label="Total Users"
          value={formatNumber(stats?.total_users || 0)}
          color="#8B5CF6"
        />
        <StatCard
          icon="receipt-outline"
          label="Total Orders"
          value={formatNumber(stats?.total_orders || 0)}
          color="#10B981"
        />
        <StatCard
          icon="cash-outline"
          label="Total Revenue"
          value={formatCurrency(stats?.total_revenue || 0)}
          color="#F59E0B"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New Registrations</Text>
        <View style={styles.registrationStats}>
          <View style={styles.registrationItem}>
            <Text style={styles.registrationValue}>{stats?.new_businesses_today || 0}</Text>
            <Text style={styles.registrationLabel}>Today</Text>
          </View>
          <View style={styles.registrationItem}>
            <Text style={styles.registrationValue}>{stats?.new_businesses_week || 0}</Text>
            <Text style={styles.registrationLabel}>This Week</Text>
          </View>
          <View style={styles.registrationItem}>
            <Text style={styles.registrationValue}>{stats?.new_businesses_month || 0}</Text>
            <Text style={styles.registrationLabel}>This Month</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Businesses</Text>
          <TouchableOpacity onPress={() => setActiveTab('businesses')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {businesses.slice(0, 5).map((business) => (
          <TouchableOpacity
            key={business.id}
            style={styles.businessItem}
            onPress={() => {
              setSelectedBusiness(business);
              setShowBusinessModal(true);
            }}
          >
            <View style={styles.businessAvatar}>
              <Text style={styles.businessInitials}>
                {business.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.businessMeta}>
                {business.country} • {business.industry}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(business.status)}15` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(business.status) }]}>
                {business.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBusinesses = () => (
    <View style={styles.content}>
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
          <Text style={styles.filterChipTextActive}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Trial</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Suspended</Text>
        </TouchableOpacity>
      </View>

      {businesses.map((business) => (
        <TouchableOpacity
          key={business.id}
          style={styles.businessCard}
          onPress={() => {
            setSelectedBusiness(business);
            setShowBusinessModal(true);
          }}
        >
          <View style={styles.businessCardHeader}>
            <View style={styles.businessAvatar}>
              <Text style={styles.businessInitials}>
                {business.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.businessCardInfo}>
              <Text style={styles.businessCardName}>{business.name}</Text>
              <Text style={styles.businessCardEmail}>{business.email}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(business.status)}15` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(business.status) }]}>
                {business.status}
              </Text>
            </View>
          </View>
          <View style={styles.businessCardStats}>
            <View style={styles.businessCardStat}>
              <Text style={styles.businessCardStatValue}>{business.total_users}</Text>
              <Text style={styles.businessCardStatLabel}>Users</Text>
            </View>
            <View style={styles.businessCardStat}>
              <Text style={styles.businessCardStatValue}>{business.total_orders}</Text>
              <Text style={styles.businessCardStatLabel}>Orders</Text>
            </View>
            <View style={styles.businessCardStat}>
              <Text style={styles.businessCardStatValue}>{formatCurrency(business.total_revenue)}</Text>
              <Text style={styles.businessCardStatLabel}>Revenue</Text>
            </View>
          </View>
          <View style={styles.businessCardFooter}>
            <Text style={styles.businessCardLocation}>
              <Ionicons name="location-outline" size={14} color="#6B7280" /> {business.country}
              {business.city ? `, ${business.city}` : ''}
            </Text>
            <Text style={styles.businessCardIndustry}>{business.industry}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAnalytics = () => (
    <View style={styles.content}>
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Revenue Overview</Text>
        <View style={styles.analyticsChart}>
          <Text style={styles.chartPlaceholder}>📊 Revenue chart coming soon</Text>
        </View>
      </View>

      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>User Growth</Text>
        <View style={styles.analyticsChart}>
          <Text style={styles.chartPlaceholder}>📈 User growth chart coming soon</Text>
        </View>
      </View>

      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Top Performing Businesses</Text>
        {businesses.slice(0, 5).sort((a, b) => b.total_revenue - a.total_revenue).map((business, index) => (
          <View key={business.id} style={styles.topBusinessItem}>
            <Text style={styles.topBusinessRank}>#{index + 1}</Text>
            <Text style={styles.topBusinessName}>{business.name}</Text>
            <Text style={styles.topBusinessRevenue}>{formatCurrency(business.total_revenue)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Superadmin</Text>
          <Text style={styles.headerSubtitle}>System Overview</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="grid-outline" 
            size={20} 
            color={activeTab === 'overview' ? '#2563EB' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'businesses' && styles.tabActive]}
          onPress={() => setActiveTab('businesses')}
        >
          <Ionicons 
            name="business-outline" 
            size={20} 
            color={activeTab === 'businesses' ? '#2563EB' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'businesses' && styles.tabTextActive]}>
            Businesses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
          onPress={() => setActiveTab('analytics')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={20} 
            color={activeTab === 'analytics' ? '#2563EB' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'businesses' && renderBusinesses()}
        {activeTab === 'analytics' && renderAnalytics()}
      </ScrollView>

      {/* Business Detail Modal */}
      <Modal
        visible={showBusinessModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBusinessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowBusinessModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            {selectedBusiness && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedBusiness.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.modalBusinessName}>{selectedBusiness.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedBusiness.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedBusiness.status) }]}>
                      {selectedBusiness.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Contact</Text>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="mail-outline" size={18} color="#6B7280" />
                    <Text style={styles.modalInfoText}>{selectedBusiness.email}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="call-outline" size={18} color="#6B7280" />
                    <Text style={styles.modalInfoText}>{selectedBusiness.phone}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="location-outline" size={18} color="#6B7280" />
                    <Text style={styles.modalInfoText}>
                      {selectedBusiness.country}{selectedBusiness.city ? `, ${selectedBusiness.city}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Statistics</Text>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatValue}>{selectedBusiness.total_users}</Text>
                      <Text style={styles.modalStatLabel}>Users</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatValue}>{selectedBusiness.total_orders}</Text>
                      <Text style={styles.modalStatLabel}>Orders</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatValue}>{formatCurrency(selectedBusiness.total_revenue)}</Text>
                      <Text style={styles.modalStatLabel}>Revenue</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={styles.modalActions}>
                    {selectedBusiness.status !== 'active' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                        onPress={() => handleUpdateBusinessStatus(selectedBusiness.id, 'active')}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Activate</Text>
                      </TouchableOpacity>
                    )}
                    {selectedBusiness.status !== 'suspended' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
                        onPress={() => handleUpdateBusinessStatus(selectedBusiness.id, 'suspended')}
                      >
                        <Ionicons name="ban" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Suspend</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
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
    color: '#111827',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  registrationStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  registrationItem: {
    flex: 1,
    alignItems: 'center',
  },
  registrationValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  registrationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  businessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  businessMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  businessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  businessCardEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  businessCardStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  businessCardStat: {
    flex: 1,
    alignItems: 'center',
  },
  businessCardStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  businessCardStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  businessCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  businessCardLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  businessCardIndustry: {
    fontSize: 12,
    color: '#2563EB',
    textTransform: 'capitalize',
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  analyticsChart: {
    height: 150,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
  },
  topBusinessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topBusinessRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    width: 30,
  },
  topBusinessName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  topBusinessRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBusinessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#374151',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
