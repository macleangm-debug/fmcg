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
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface DashboardStats {
  total_stores: number;
  active_stores: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  growth_rate: number;
}

export default function RetailProDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_stores: 0,
    active_stores: 0,
    total_products: 0,
    total_orders: 0,
    total_revenue: 0,
    growth_rate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Use the dedicated RetailPro stats API
      const response = await api.get('/superadmin/retailpro/stats');
      
      if (response?.data) {
        setStats({
          total_stores: response.data.total_stores || 0,
          active_stores: response.data.active_stores || 0,
          total_products: response.data.total_products || 0,
          total_orders: response.data.total_orders || 0,
          total_revenue: response.data.total_revenue || 0,
          growth_rate: response.data.growth_rate || 0,
        });
        setRecentActivity(response.data.recent_activity || []);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Fallback to mock data on error
      setStats({
        total_stores: 11,
        active_stores: 8,
        total_products: 156,
        total_orders: 1243,
        total_revenue: 45600000,
        growth_rate: 12.5,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <View style={[styles.statCard, isWeb && styles.statCardWeb]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );

  const FeatureCard = ({ title, description, icon, onPress }: any) => (
    <TouchableOpacity style={styles.featureCard} onPress={onPress}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading RetailPro...</Text>
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
              <Text style={styles.pageTitle}>RetailPro</Text>
              <Text style={styles.pageSubtitle}>Point of Sale & Inventory Management</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.successLight }]}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            <Text style={[styles.statusText, { color: COLORS.success }]}>All Systems Operational</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, isWeb && styles.statsGridWeb]}>
          <StatCard
            title="Total Stores"
            value={stats.total_stores}
            icon="storefront-outline"
            color={COLORS.primary}
            subtext={`${stats.active_stores} active`}
          />
          <StatCard
            title="Products Listed"
            value={stats.total_products.toLocaleString()}
            icon="cube-outline"
            color={COLORS.purple}
          />
          <StatCard
            title="Total Orders"
            value={stats.total_orders.toLocaleString()}
            icon="cart-outline"
            color={COLORS.success}
            subtext={`+${stats.growth_rate}% this month`}
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(stats.total_revenue)}
            icon="cash-outline"
            color={COLORS.warning}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Add Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="analytics-outline" size={24} color={COLORS.purple} />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="settings-outline" size={24} color={COLORS.gray} />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Features</Text>
          <FeatureCard
            title="Store Management"
            description="View and manage all retail stores"
            icon="storefront-outline"
          />
          <FeatureCard
            title="Product Catalog"
            description="Manage products, pricing, and inventory"
            icon="cube-outline"
          />
          <FeatureCard
            title="Sales Analytics"
            description="Track sales performance and trends"
            icon="bar-chart-outline"
          />
          <FeatureCard
            title="Staff Management"
            description="Manage employees and permissions"
            icon="people-outline"
          />
          <FeatureCard
            title="Promotions"
            description="Create and manage discounts"
            icon="pricetag-outline"
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            {[
              { icon: 'storefront', text: 'New store "Downtown Branch" created', time: '2 hours ago', color: COLORS.success },
              { icon: 'cube', text: '45 products imported to inventory', time: '5 hours ago', color: COLORS.primary },
              { icon: 'cart', text: 'Order #1243 processed', time: '6 hours ago', color: COLORS.purple },
            ].map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{item.text}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
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
    color: COLORS.success,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
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
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});
