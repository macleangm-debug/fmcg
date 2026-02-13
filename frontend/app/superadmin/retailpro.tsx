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
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface RetailProStats {
  totalStores: number;
  activeStores: number;
  totalSales: number;
  salesToday: number;
  totalOrders: number;
  ordersToday: number;
  avgOrderValue: number;
  topSellingProducts: { name: string; quantity: number; revenue: number }[];
}

export default function RetailProDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'products' | 'orders' | 'settings'>('overview');
  const [stats, setStats] = useState<RetailProStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/retailpro/stats').catch(() => null);
      
      setStats(response?.data || {
        totalStores: 5420,
        activeStores: 4890,
        totalSales: 125000000,
        salesToday: 2850000,
        totalOrders: 458000,
        ordersToday: 3420,
        avgOrderValue: 273,
        topSellingProducts: [
          { name: 'iPhone 15 Pro', quantity: 1250, revenue: 1875000 },
          { name: 'Samsung Galaxy S24', quantity: 980, revenue: 882000 },
          { name: 'MacBook Air M3', quantity: 560, revenue: 1008000 },
          { name: 'AirPods Pro', quantity: 2100, revenue: 525000 },
          { name: 'iPad Pro 12.9"', quantity: 420, revenue: 546000 },
        ],
      });

      setRecentOrders([
        { id: 'ORD-001', store: 'TechHub Dar', items: 3, amount: 450000, status: 'completed', time: '5 mins ago' },
        { id: 'ORD-002', store: 'Electronics Plus', items: 1, amount: 1250000, status: 'processing', time: '12 mins ago' },
        { id: 'ORD-003', store: 'Gadget World', items: 5, amount: 185000, status: 'completed', time: '18 mins ago' },
        { id: 'ORD-004', store: 'Phone House', items: 2, amount: 320000, status: 'completed', time: '25 mins ago' },
        { id: 'ORD-005', store: 'Digital Store', items: 1, amount: 85000, status: 'refunded', time: '32 mins ago' },
      ]);
    } catch (error) {
      console.error('Error fetching RetailPro data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
    return '$' + amount.toString();
  };

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
      
      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'stores', 'products', 'orders', 'settings'].map((tab) => (
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
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="storefront" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.totalStores || 0)}</Text>
              <Text style={styles.kpiLabel}>Total Stores</Text>
              <Text style={styles.kpiSubtext}>{stats?.activeStores} active</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="cash" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(stats?.salesToday || 0)}</Text>
              <Text style={styles.kpiLabel}>Sales Today</Text>
              <Text style={styles.kpiSubtext}>{formatCurrency(stats?.totalSales || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="cart" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.ordersToday || 0)}</Text>
              <Text style={styles.kpiLabel}>Orders Today</Text>
              <Text style={styles.kpiSubtext}>{formatNumber(stats?.totalOrders || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.purple }]}>
              <View style={[styles.kpiIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="stats-chart" size={20} color={COLORS.purple} />
              </View>
              <Text style={styles.kpiValue}>${stats?.avgOrderValue || 0}</Text>
              <Text style={styles.kpiLabel}>Avg Order Value</Text>
              <Text style={styles.kpiSubtext}>Per transaction</Text>
            </View>
          </View>

          {/* Top Products & Recent Orders */}
          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Top Selling Products</Text>
              {stats?.topSellingProducts.map((product, idx) => (
                <View key={idx} style={styles.productRow}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>{product.quantity} sold</Text>
                  </View>
                  <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Recent Orders</Text>
              {recentOrders.map((order) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    <Text style={styles.orderStore}>{order.store}</Text>
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderAmount}>{formatCurrency(order.amount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                    </View>
                  </View>
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
    case 'processing': return COLORS.warning;
    case 'refunded': return COLORS.danger;
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
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  productMeta: { fontSize: 11, color: COLORS.gray },
  productRevenue: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderInfo: {},
  orderId: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  orderStore: { fontSize: 11, color: COLORS.gray },
  orderDetails: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
});
