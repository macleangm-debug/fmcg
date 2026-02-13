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
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

export default function InventoryDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_skus: 2456,
    low_stock: 23,
    out_of_stock: 5,
    warehouses: 3,
    pending_orders: 45,
    stock_value: 125000,
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/inventory/stats');
      if (response?.data) {
        setStats({
          total_skus: response.data.total_skus || 0,
          low_stock: response.data.low_stock || 0,
          out_of_stock: response.data.out_of_stock || 0,
          warehouses: response.data.warehouses || 0,
          pending_orders: 0,
          stock_value: response.data.stock_value || 0,
        });
        setLowStockItems(response.data.low_stock_items || []);
      }
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  const StatCard = ({ title, value, icon, color, alert }: any) => (
    <View style={[styles.statCard, isWeb && styles.statCardWeb, alert && styles.statCardAlert]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {alert && <View style={[styles.alertBadge, { backgroundColor: COLORS.danger }]} />}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Inventory...</Text>
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
              <Text style={styles.pageTitle}>Inventory</Text>
              <Text style={styles.pageSubtitle}>Stock & Warehouse Management</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.alertButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.dark} />
            <View style={styles.alertDot} />
          </TouchableOpacity>
        </View>

        {/* Alerts Banner */}
        {stats.low_stock > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={20} color={COLORS.warning} />
            <Text style={styles.alertBannerText}>
              {stats.low_stock} items are running low on stock
            </Text>
            <TouchableOpacity>
              <Text style={styles.alertBannerLink}>View All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Grid */}
        <View style={[styles.statsGrid, isWeb && styles.statsGridWeb]}>
          <StatCard
            title="Total SKUs"
            value={stats.total_skus.toLocaleString()}
            icon="cube-outline"
            color={COLORS.blue}
          />
          <StatCard
            title="Low Stock"
            value={stats.low_stock}
            icon="alert-circle-outline"
            color={COLORS.warning}
            alert
          />
          <StatCard
            title="Out of Stock"
            value={stats.out_of_stock}
            icon="close-circle-outline"
            color={COLORS.danger}
            alert={stats.out_of_stock > 0}
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(stats.stock_value)}
            icon="cash-outline"
            color={COLORS.success}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="add" size={24} color={COLORS.blue} />
              </View>
              <Text style={styles.quickActionText}>Add Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.purpleLight }]}>
                <Ionicons name="swap-horizontal" size={24} color={COLORS.purple} />
              </View>
              <Text style={styles.quickActionText}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="scan" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.quickActionText}>Stock Take</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="document-text" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Warehouses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warehouses</Text>
          {[
            { name: 'Main Warehouse', location: 'Dar es Salaam', items: 1234, utilization: 78 },
            { name: 'Distribution Center', location: 'Arusha', items: 856, utilization: 65 },
            { name: 'Regional Store', location: 'Mwanza', items: 366, utilization: 45 },
          ].map((warehouse, index) => (
            <TouchableOpacity key={index} style={styles.warehouseCard}>
              <View style={styles.warehouseIcon}>
                <Ionicons name="business-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.warehouseInfo}>
                <Text style={styles.warehouseName}>{warehouse.name}</Text>
                <Text style={styles.warehouseLocation}>{warehouse.location}</Text>
              </View>
              <View style={styles.warehouseStats}>
                <Text style={styles.warehouseItems}>{warehouse.items} items</Text>
                <View style={styles.utilizationBar}>
                  <View style={[styles.utilizationFill, { 
                    width: `${warehouse.utilization}%`,
                    backgroundColor: warehouse.utilization > 80 ? COLORS.danger : warehouse.utilization > 60 ? COLORS.warning : COLORS.success
                  }]} />
                </View>
                <Text style={styles.utilizationText}>{warehouse.utilization}% full</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Low Stock Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Low Stock Items</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.lowStockList}>
            {[
              { name: 'Premium Coffee Beans', sku: 'SKU-001', current: 12, min: 50 },
              { name: 'Organic Tea Leaves', sku: 'SKU-045', current: 8, min: 30 },
              { name: 'Brown Sugar 1kg', sku: 'SKU-123', current: 5, min: 25 },
            ].map((item, index) => (
              <View key={index} style={styles.lowStockItem}>
                <View style={styles.lowStockInfo}>
                  <Text style={styles.lowStockName}>{item.name}</Text>
                  <Text style={styles.lowStockSku}>{item.sku}</Text>
                </View>
                <View style={styles.lowStockLevel}>
                  <Text style={styles.lowStockCurrent}>{item.current}</Text>
                  <Text style={styles.lowStockMin}>/ {item.min} min</Text>
                </View>
                <TouchableOpacity style={styles.reorderButton}>
                  <Text style={styles.reorderButtonText}>Reorder</Text>
                </TouchableOpacity>
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
  alertButton: {
    position: 'relative',
    padding: 8,
  },
  alertDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  alertBannerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  alertBannerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWeb: {
    minWidth: 'auto',
  },
  statCardAlert: {
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  alertBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
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
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  warehouseCard: {
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
  warehouseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  warehouseLocation: {
    fontSize: 13,
    color: COLORS.gray,
  },
  warehouseStats: {
    alignItems: 'flex-end',
  },
  warehouseItems: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 4,
  },
  utilizationBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 2,
  },
  utilizationText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  lowStockList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lowStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  lowStockSku: {
    fontSize: 12,
    color: COLORS.gray,
  },
  lowStockLevel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 12,
  },
  lowStockCurrent: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger,
  },
  lowStockMin: {
    fontSize: 12,
    color: COLORS.gray,
  },
  reorderButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reorderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
});
