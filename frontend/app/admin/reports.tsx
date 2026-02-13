import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { reportsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = 'today' | 'yesterday' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

interface ReportData {
  period: string;
  date_range: { start: string; end: string };
  total_revenue: number;
  total_orders: number;
  total_items_sold: number;
  avg_order_value: number;
  new_customers: number;
  top_selling_products: Array<{ name: string; quantity: number; revenue: number }>;
  sales_by_category: Array<{ name: string; revenue: number; quantity: number }>;
  sales_by_staff: Array<{ name: string; orders: number; revenue: number }>;
  hourly_sales: Array<{ hour: string; orders: number; revenue: number }>;
  payment_method_breakdown: { cash: number; card: number; mobile_money: number; credit: number };
}

export default function Reports() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { formatCurrency } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      router.back();
    }
  }, [currentUser]);

  const fetchReport = async () => {
    try {
      const response = await reportsApi.getSummary(period);
      setData(response.data);
    } catch (error) {
      console.log('Failed to fetch report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReport();
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport();
  }, [period]);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'cash-outline';
      case 'card': return 'card-outline';
      case 'mobile_money': return 'phone-portrait-outline';
      case 'credit': return 'time-outline';
      default: return 'wallet-outline';
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case 'cash': return '#10B981';
      case 'card': return '#2563EB';
      case 'mobile_money': return '#8B5CF6';
      case 'credit': return '#F59E0B';
      default: return '#6B7280';
    }
  };

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Ionicons name="cash-outline" size={32} color="#FFFFFF" />
          <Text style={styles.revenueValue}>{formatCurrency(data?.total_revenue || 0)}</Text>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="receipt-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.kpiValue}>{data?.total_orders || 0}</Text>
            <Text style={styles.kpiLabel}>Orders</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cube-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.kpiValue}>{data?.total_items_sold || 0}</Text>
            <Text style={styles.kpiLabel}>Items Sold</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(data?.avg_order_value || 0)}</Text>
            <Text style={styles.kpiLabel}>Avg Order</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="person-add-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.kpiValue}>{data?.new_customers || 0}</Text>
            <Text style={styles.kpiLabel}>New Customers</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.paymentGrid}>
            {Object.entries(data?.payment_method_breakdown || {}).map(([method, amount]) => (
              <View key={method} style={styles.paymentItem}>
                <View style={[styles.paymentIcon, { backgroundColor: `${getPaymentColor(method)}15` }]}>
                  <Ionicons name={getPaymentIcon(method) as any} size={18} color={getPaymentColor(method)} />
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(amount as number)}</Text>
                <Text style={styles.paymentMethod}>
                  {method.replace('_', ' ').charAt(0).toUpperCase() + method.replace('_', ' ').slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          {(data?.top_selling_products || []).slice(0, 5).map((product, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listRank}>
                <Text style={styles.listRankText}>{index + 1}</Text>
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.listSubtext}>{product.quantity} sold</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}
          {(!data?.top_selling_products || data.top_selling_products.length === 0) && (
            <Text style={styles.emptyText}>No sales data for this period</Text>
          )}
        </View>

        {/* Sales by Category */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sales by Category</Text>
          {(data?.sales_by_category || []).map((category, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.categoryDot, { backgroundColor: `hsl(${index * 60}, 70%, 50%)` }]} />
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{category.name}</Text>
                <Text style={styles.listSubtext}>{category.quantity} items</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(category.revenue)}</Text>
            </View>
          ))}
          {(!data?.sales_by_category || data.sales_by_category.length === 0) && (
            <Text style={styles.emptyText}>No category data for this period</Text>
          )}
        </View>

        {/* Staff Performance */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Staff Performance</Text>
          {(data?.sales_by_staff || []).map((staff, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.staffAvatar}>
                <Ionicons name="person" size={16} color="#6B7280" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{staff.name}</Text>
                <Text style={styles.listSubtext}>{staff.orders} orders</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(staff.revenue)}</Text>
            </View>
          ))}
          {(!data?.sales_by_staff || data.sales_by_staff.length === 0) && (
            <Text style={styles.emptyText}>No staff data for this period</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  revenueCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentItem: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  listSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
