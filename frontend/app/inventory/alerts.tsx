import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';

const COLORS = {
  primary: '#1E40AF',
  primaryLight: '#DBEAFE',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#D1D5DB',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

interface LowStockItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  min_quantity: number;
  category?: string;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/inventory/items');
      const items: LowStockItem[] = response.data || [];
      
      // Filter low stock (quantity > 0 but <= min_quantity)
      const lowStock = items.filter(item => 
        item.quantity > 0 && item.quantity <= (item.min_quantity || 10)
      );
      
      // Filter out of stock (quantity <= 0)
      const outOfStock = items.filter(item => item.quantity <= 0);
      
      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const renderAlertItem = (item: LowStockItem, isOutOfStock: boolean) => (
    <View key={item.id} style={[styles.card, isWeb && styles.cardGrid]}>
      <View style={styles.cardHeader}>
        <View style={[styles.alertIcon, { backgroundColor: isOutOfStock ? COLORS.dangerLight : COLORS.warningLight }]}>
          <Ionicons 
            name={isOutOfStock ? "close-circle" : "alert-circle"} 
            size={24} 
            color={isOutOfStock ? COLORS.danger : COLORS.warning} 
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.sku && <Text style={styles.sku}>SKU: {item.sku}</Text>}
        </View>
      </View>
      <View style={styles.stockInfo}>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Current Stock</Text>
          <Text style={[
            styles.stockValue, 
            { color: isOutOfStock ? COLORS.danger : COLORS.warning }
          ]}>
            {item.quantity}
          </Text>
        </View>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Min Level</Text>
          <Text style={styles.stockValue}>{item.min_quantity || 10}</Text>
        </View>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Reorder</Text>
          <Text style={styles.stockValue}>
            {Math.max(0, (item.min_quantity || 10) * 2 - item.quantity)}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.createPoButton}
        onPress={() => router.push('/inventory/purchase-orders')}
      >
        <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
        <Text style={styles.createPoText}>Create PO</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <View style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Low Stock Alerts</Text>
          <Text style={styles.pageSubtitle}>Items that need restocking</Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <TouchableOpacity 
          style={[styles.summaryCard, activeTab === 'low' && styles.summaryCardActive]}
          onPress={() => setActiveTab('low')}
        >
          <View style={[styles.summaryIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
          </View>
          <Text style={styles.summaryValue}>{lowStockItems.length}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.summaryCard, activeTab === 'out' && styles.summaryCardActive]}
          onPress={() => setActiveTab('out')}
        >
          <View style={[styles.summaryIcon, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="close-circle" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.summaryValue}>{outOfStockItems.length}</Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Checking stock levels...</Text>
        </View>
      ) : (activeTab === 'low' ? lowStockItems : outOfStockItems).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="checkmark-circle-outline" 
            size={64} 
            color={COLORS.success} 
          />
          <Text style={styles.emptyTitle}>All Good!</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'low' 
              ? 'No items are running low on stock' 
              : 'No items are out of stock'}
          </Text>
        </View>
      ) : (
        <View style={isWeb ? styles.grid : undefined}>
          {(activeTab === 'low' ? lowStockItems : outOfStockItems).map(item => 
            renderAlertItem(item, activeTab === 'out')
          )}
        </View>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderContent()}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  header: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  summaryCardActive: { borderColor: COLORS.primary },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 32, fontWeight: '800', color: COLORS.dark },
  summaryLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardGrid: { width: 'calc(50% - 8px)' as any },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  alertIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  sku: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  stockItem: { alignItems: 'center' },
  stockLabel: { fontSize: 11, color: COLORS.gray, textTransform: 'uppercase' },
  stockValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  createPoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 12, backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  createPoText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8, textAlign: 'center' },
});
