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
  primary: '#8B5CF6',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface InventoryStats {
  totalWarehouses: number;
  activeWarehouses: number;
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  movementsToday: number;
  pendingTransfers: number;
}

export default function InventoryDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'stock' | 'movements' | 'settings'>('overview');
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/inventory/stats').catch(() => null);
      
      setStats(response?.data || {
        totalWarehouses: 342,
        activeWarehouses: 318,
        totalProducts: 125000,
        lowStockItems: 1250,
        outOfStockItems: 89,
        totalValue: 45000000,
        movementsToday: 8420,
        pendingTransfers: 45,
      });

      setLowStockAlerts([
        { sku: 'SKU-001', name: 'iPhone 15 Pro Max', current: 5, minimum: 20, warehouse: 'Main Warehouse' },
        { sku: 'SKU-002', name: 'Samsung Galaxy S24 Ultra', current: 3, minimum: 15, warehouse: 'Warehouse B' },
        { sku: 'SKU-003', name: 'MacBook Pro 16"', current: 2, minimum: 10, warehouse: 'Main Warehouse' },
        { sku: 'SKU-004', name: 'AirPods Max', current: 8, minimum: 25, warehouse: 'Warehouse C' },
        { sku: 'SKU-005', name: 'iPad Pro 12.9"', current: 4, minimum: 12, warehouse: 'Main Warehouse' },
      ]);

      setRecentMovements([
        { id: 'MOV-001', type: 'transfer', from: 'Warehouse A', to: 'Warehouse B', items: 150, status: 'completed' },
        { id: 'MOV-002', type: 'receipt', from: 'Supplier XYZ', to: 'Main Warehouse', items: 500, status: 'completed' },
        { id: 'MOV-003', type: 'transfer', from: 'Main Warehouse', to: 'Store #45', items: 25, status: 'in_transit' },
        { id: 'MOV-004', type: 'adjustment', from: 'Warehouse B', to: '-', items: -12, status: 'completed' },
        { id: 'MOV-005', type: 'return', from: 'Store #12', to: 'Warehouse C', items: 8, status: 'pending' },
      ]);
    } catch (error) {
      console.error('Error fetching Inventory data:', error);
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

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toString();
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
      
      <View style={styles.tabs}>
        {['overview', 'warehouses', 'stock', 'movements', 'settings'].map((tab) => (
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
                <Ionicons name="business" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiValue}>{stats?.totalWarehouses}</Text>
              <Text style={styles.kpiLabel}>Warehouses</Text>
              <Text style={styles.kpiSubtext}>{stats?.activeWarehouses} active</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.blue }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="cube" size={20} color={COLORS.blue} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.totalProducts || 0)}</Text>
              <Text style={styles.kpiLabel}>Total Products</Text>
              <Text style={styles.kpiSubtext}>{formatCurrency(stats?.totalValue || 0)} value</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="warning" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.lowStockItems || 0)}</Text>
              <Text style={styles.kpiLabel}>Low Stock Items</Text>
              <Text style={[styles.kpiSubtext, { color: COLORS.danger }]}>{stats?.outOfStockItems} out of stock</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="swap-horizontal" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.movementsToday || 0)}</Text>
              <Text style={styles.kpiLabel}>Movements Today</Text>
              <Text style={styles.kpiSubtext}>{stats?.pendingTransfers} pending</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Low Stock Alerts</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{lowStockAlerts.length} items</Text>
                </View>
              </View>
              {lowStockAlerts.map((item, idx) => (
                <View key={idx} style={styles.alertRow}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertName}>{item.name}</Text>
                    <Text style={styles.alertMeta}>{item.sku} • {item.warehouse}</Text>
                  </View>
                  <View style={styles.stockInfo}>
                    <Text style={[styles.stockCurrent, item.current <= 5 && { color: COLORS.danger }]}>
                      {item.current}
                    </Text>
                    <Text style={styles.stockMin}>/ {item.minimum}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Recent Movements</Text>
              {recentMovements.map((mov) => (
                <View key={mov.id} style={styles.movementRow}>
                  <View style={[styles.movementIcon, { backgroundColor: getMovementColor(mov.type) + '20' }]}>
                    <Ionicons name={getMovementIcon(mov.type)} size={16} color={getMovementColor(mov.type)} />
                  </View>
                  <View style={styles.movementInfo}>
                    <Text style={styles.movementType}>{mov.type}</Text>
                    <Text style={styles.movementDetails}>{mov.from} → {mov.to}</Text>
                  </View>
                  <View style={styles.movementRight}>
                    <Text style={styles.movementItems}>{mov.items > 0 ? '+' : ''}{mov.items}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mov.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(mov.status) }]}>{mov.status.replace('_', ' ')}</Text>
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

function getMovementIcon(type: string): any {
  switch (type) {
    case 'transfer': return 'swap-horizontal';
    case 'receipt': return 'arrow-down';
    case 'adjustment': return 'create';
    case 'return': return 'return-up-back';
    default: return 'ellipse';
  }
}

function getMovementColor(type: string): string {
  switch (type) {
    case 'transfer': return COLORS.primary;
    case 'receipt': return COLORS.success;
    case 'adjustment': return COLORS.warning;
    case 'return': return COLORS.blue;
    default: return COLORS.gray;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return COLORS.success;
    case 'in_transit': return COLORS.warning;
    case 'pending': return COLORS.blue;
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 16 },
  alertBadge: { backgroundColor: COLORS.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  alertBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.danger },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  alertMeta: { fontSize: 11, color: COLORS.gray },
  stockInfo: { flexDirection: 'row', alignItems: 'baseline' },
  stockCurrent: { fontSize: 16, fontWeight: '700', color: COLORS.warning },
  stockMin: { fontSize: 12, color: COLORS.gray, marginLeft: 2 },
  movementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  movementIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  movementInfo: { flex: 1 },
  movementType: { fontSize: 13, fontWeight: '500', color: COLORS.dark, textTransform: 'capitalize' },
  movementDetails: { fontSize: 11, color: COLORS.gray },
  movementRight: { alignItems: 'flex-end' },
  movementItems: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
});
