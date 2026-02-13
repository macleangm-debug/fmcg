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
import { useRouter } from 'expo-router';
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
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
  retailpro: '#3B82F6',
  inventory: '#8B5CF6',
  invoicing: '#EC4899',
  kwikpay: '#10B981',
  unitxt: '#F59E0B',
};

const PRODUCTS = [
  { 
    id: 'retailpro', 
    name: 'RetailPro', 
    icon: 'storefront-outline', 
    color: COLORS.retailpro,
    description: 'Point of Sale & Retail Management',
    route: '/superadmin/retailpro',
  },
  { 
    id: 'inventory', 
    name: 'Inventory', 
    icon: 'cube-outline', 
    color: COLORS.inventory,
    description: 'Stock & Warehouse Management',
    route: '/superadmin/inventory',
  },
  { 
    id: 'invoicing', 
    name: 'Invoicing', 
    icon: 'document-text-outline', 
    color: COLORS.invoicing,
    description: 'Professional Billing & Invoices',
    route: '/superadmin/invoicing',
  },
  { 
    id: 'kwikpay', 
    name: 'KwikPay', 
    icon: 'card-outline', 
    color: COLORS.kwikpay,
    description: 'Payment Processing & Checkout',
    route: '/superadmin/kwikpay',
  },
  { 
    id: 'unitxt', 
    name: 'UniTxt', 
    icon: 'chatbubbles-outline', 
    color: COLORS.unitxt,
    description: 'SMS & WhatsApp Marketing',
    route: '/superadmin/unitxt',
  },
];

interface ConsolidatedStats {
  totalUsers: number;
  activeUsersToday: number;
  newUsersWeek: number;
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueGrowth: number;
  totalTransactions: number;
  transactionsToday: number;
  apiCallsToday: number;
  apiCallsMonth: number;
  errorRate: number;
  pendingApprovals: number;
}

interface ProductMetrics {
  id: string;
  users: number;
  activeToday: number;
  revenue: number;
  transactions: number;
  growth: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ConsolidatedStats | null>(null);
  const [productMetrics, setProductMetrics] = useState<ProductMetrics[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch consolidated stats
      const [summaryRes, activityRes] = await Promise.all([
        api.get('/superadmin/dashboard/summary').catch(() => null),
        api.get('/superadmin/activity/recent').catch(() => null),
      ]);

      if (summaryRes?.data) {
        setStats({
          totalUsers: summaryRes.data.users?.total || 15420,
          activeUsersToday: summaryRes.data.users?.active_today || 1245,
          newUsersWeek: summaryRes.data.users?.new_week || 342,
          totalBusinesses: summaryRes.data.businesses?.total || 4230,
          activeBusinesses: summaryRes.data.businesses?.active || 3890,
          totalRevenue: summaryRes.data.finances?.revenue_total || 2450000,
          revenueThisMonth: summaryRes.data.finances?.revenue_month || 285000,
          revenueGrowth: 12.5,
          totalTransactions: summaryRes.data.finances?.orders_total || 125000,
          transactionsToday: 892,
          apiCallsToday: summaryRes.data.api?.calls_today || 245000,
          apiCallsMonth: summaryRes.data.api?.calls_month || 6500000,
          errorRate: 0.23,
          pendingApprovals: 5,
        });
      } else {
        // Mock data for demo
        setStats({
          totalUsers: 15420,
          activeUsersToday: 1245,
          newUsersWeek: 342,
          totalBusinesses: 4230,
          activeBusinesses: 3890,
          totalRevenue: 2450000,
          revenueThisMonth: 285000,
          revenueGrowth: 12.5,
          totalTransactions: 125000,
          transactionsToday: 892,
          apiCallsToday: 245000,
          apiCallsMonth: 6500000,
          errorRate: 0.23,
          pendingApprovals: 5,
        });
      }

      // Product-specific metrics
      setProductMetrics([
        { id: 'retailpro', users: 5420, activeToday: 312, revenue: 95000, transactions: 12500, growth: 8.5 },
        { id: 'inventory', users: 3210, activeToday: 189, revenue: 62000, transactions: 8200, growth: 12.3 },
        { id: 'invoicing', users: 4150, activeToday: 267, revenue: 78000, transactions: 15600, growth: 15.2 },
        { id: 'kwikpay', users: 2890, activeToday: 156, revenue: 45000, transactions: 85000, growth: 22.8 },
        { id: 'unitxt', users: 1850, activeToday: 98, revenue: 28000, transactions: 450000, growth: 18.4 },
      ]);

      // Recent activity
      setRecentActivity(activityRes?.data?.activities || [
        { type: 'signup', product: 'RetailPro', message: 'New business registered: Coffee House Ltd', time: '5 mins ago' },
        { type: 'approval', product: 'KwikPay', message: 'Merchant onboarding pending: TechStore TZ', time: '12 mins ago' },
        { type: 'payment', product: 'KwikPay', message: 'Large transaction: $5,200 processed', time: '25 mins ago' },
        { type: 'alert', product: 'System', message: 'API rate limit reached for client xyz', time: '1 hour ago' },
        { type: 'signup', product: 'Invoicing', message: 'New user: john@example.com', time: '2 hours ago' },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.kpiGrowth}>+{stats?.newUsersWeek || 0} this week</Text>
          </View>
          <Text style={styles.kpiValue}>{formatNumber(stats?.totalUsers || 0)}</Text>
          <Text style={styles.kpiLabel}>Total Users</Text>
          <Text style={styles.kpiSubtext}>{formatNumber(stats?.activeUsersToday || 0)} active today</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="business" size={20} color={COLORS.success} />
            </View>
            <Text style={[styles.kpiGrowth, { color: COLORS.success }]}>
              {Math.round(((stats?.activeBusinesses || 0) / (stats?.totalBusinesses || 1)) * 100)}% active
            </Text>
          </View>
          <Text style={styles.kpiValue}>{formatNumber(stats?.totalBusinesses || 0)}</Text>
          <Text style={styles.kpiLabel}>Total Businesses</Text>
          <Text style={styles.kpiSubtext}>{formatNumber(stats?.activeBusinesses || 0)} active</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="trending-up" size={20} color={COLORS.warning} />
            </View>
            <Text style={[styles.kpiGrowth, { color: COLORS.success }]}>
              +{stats?.revenueGrowth}%
            </Text>
          </View>
          <Text style={styles.kpiValue}>{formatCurrency(stats?.revenueThisMonth || 0)}</Text>
          <Text style={styles.kpiLabel}>Revenue This Month</Text>
          <Text style={styles.kpiSubtext}>{formatCurrency(stats?.totalRevenue || 0)} total</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: COLORS.danger }]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="flash" size={20} color={COLORS.danger} />
            </View>
            <Text style={styles.kpiGrowth}>{formatNumber(stats?.transactionsToday || 0)} today</Text>
          </View>
          <Text style={styles.kpiValue}>{formatNumber(stats?.totalTransactions || 0)}</Text>
          <Text style={styles.kpiLabel}>Total Transactions</Text>
          <Text style={styles.kpiSubtext}>{formatNumber(stats?.apiCallsToday || 0)} API calls today</Text>
        </View>
      </View>

      {/* Pending Approvals Alert */}
      {(stats?.pendingApprovals || 0) > 0 && (
        <TouchableOpacity 
          style={styles.alertBanner}
          onPress={() => router.push('/superadmin/approvals')}
        >
          <View style={styles.alertContent}>
            <Ionicons name="warning" size={24} color={COLORS.warning} />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>{stats?.pendingApprovals} Pending Approvals</Text>
              <Text style={styles.alertSubtext}>Merchant onboarding requests need your review</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      )}

      {/* Product Cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Products Overview</Text>
        <Text style={styles.sectionSubtitle}>Click to view detailed management</Text>
      </View>

      <View style={styles.productGrid}>
        {PRODUCTS.map((product) => {
          const metrics = productMetrics.find(m => m.id === product.id);
          return (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => router.push(product.route as any)}
            >
              <View style={styles.productHeader}>
                <View style={[styles.productIcon, { backgroundColor: product.color + '20' }]}>
                  <Ionicons name={product.icon as any} size={24} color={product.color} />
                </View>
                <View style={[styles.productStatus, { backgroundColor: COLORS.successLight }]}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={[styles.statusText, { color: COLORS.success }]}>Active</Text>
                </View>
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
              
              <View style={styles.productMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{formatNumber(metrics?.users || 0)}</Text>
                  <Text style={styles.metricLabel}>Users</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{formatCurrency(metrics?.revenue || 0)}</Text>
                  <Text style={styles.metricLabel}>Revenue</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: COLORS.success }]}>
                    +{metrics?.growth || 0}%
                  </Text>
                  <Text style={styles.metricLabel}>Growth</Text>
                </View>
              </View>

              <View style={styles.productFooter}>
                <Text style={styles.viewDetails}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent Activity & Quick Actions */}
      <View style={styles.bottomRow}>
        {/* Recent Activity */}
        <View style={styles.activityCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[
                styles.activityIcon,
                { backgroundColor: getActivityColor(activity.type) + '20' }
              ]}>
                <Ionicons
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={getActivityColor(activity.type)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage} numberOfLines={1}>{activity.message}</Text>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityProduct}>{activity.product}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => router.push('/superadmin/approvals')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.quickActionLabel}>Review Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => router.push('/superadmin/users')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Add User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => router.push('/superadmin/team')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="people-outline" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.quickActionLabel}>Manage Team</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => router.push('/superadmin/api-logs')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="code-slash-outline" size={24} color={COLORS.danger} />
              </View>
              <Text style={styles.quickActionLabel}>View API Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function getActivityIcon(type: string): any {
  switch (type) {
    case 'signup': return 'person-add';
    case 'approval': return 'checkmark-circle';
    case 'payment': return 'card';
    case 'alert': return 'warning';
    default: return 'ellipse';
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'signup': return COLORS.success;
    case 'approval': return COLORS.warning;
    case 'payment': return COLORS.primary;
    case 'alert': return COLORS.danger;
    default: return COLORS.gray;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrowth: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  kpiLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  kpiSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.warningLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  alertSubtext: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  productCard: {
    width: 'calc(20% - 13px)',
    minWidth: 200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 16,
  },
  productMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  activityCard: {
    flex: 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  viewAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 13,
    color: COLORS.dark,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  activityProduct: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.gray,
  },
  quickActionsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActions: {
    marginTop: 16,
    gap: 12,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
});
