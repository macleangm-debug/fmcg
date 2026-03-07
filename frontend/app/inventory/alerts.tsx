import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  PageHeader,
  PageStatsRow,
  PageSearchBar,
  PageFiltersRow,
  PageTableCard,
} from '../../src/components/ecosystem/layout';
import api from '../../src/api/client';

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  dark: '#111827',
  gray: '#6B7280',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

interface Item {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  min_quantity: number;
  category_name?: string;
}

type AlertType = 'all' | 'low_stock' | 'out_of_stock';

export default function AlertsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;
  const router = useRouter();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get('/inventory/items');
      setItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [fetchItems]);

  // Filter items by alert type
  const lowStockItems = items.filter(item => item.quantity > 0 && item.quantity <= item.min_quantity);
  const outOfStockItems = items.filter(item => item.quantity === 0);
  const allAlertItems = [...outOfStockItems, ...lowStockItems];

  // Apply filters and search
  const getFilteredItems = () => {
    let filtered = allAlertItems;
    
    if (alertFilter === 'low_stock') {
      filtered = lowStockItems;
    } else if (alertFilter === 'out_of_stock') {
      filtered = outOfStockItems;
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredItems = getFilteredItems();

  // Stats
  const stats = [
    { label: 'Total Alerts', value: allAlertItems.length, color: COLORS.danger, bgColor: COLORS.dangerLight, icon: 'alert-circle' },
    { label: 'Out of Stock', value: outOfStockItems.length, color: COLORS.danger, bgColor: COLORS.dangerLight, icon: 'close-circle' },
    { label: 'Low Stock', value: lowStockItems.length, color: COLORS.warning, bgColor: COLORS.warningLight, icon: 'warning' },
  ];

  // Filters
  const filters = [
    { key: 'all', label: `All (${allAlertItems.length})` },
    { key: 'out_of_stock', label: `Out of Stock (${outOfStockItems.length})` },
    { key: 'low_stock', label: `Low Stock (${lowStockItems.length})` },
  ];

  // Get alert badge
  const getAlertBadge = (item: Item) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', bg: COLORS.dangerLight, color: COLORS.danger };
    }
    return { label: 'Low Stock', bg: COLORS.warningLight, color: COLORS.warning };
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Item',
      flex: 1.5,
      render: (item: Item) => (
        <View style={styles.itemCell}>
          <View style={[styles.itemIcon, item.quantity === 0 ? styles.itemIconDanger : styles.itemIconWarning]}>
            <Ionicons 
              name={item.quantity === 0 ? 'close-circle' : 'alert-circle'} 
              size={18} 
              color={item.quantity === 0 ? COLORS.danger : COLORS.warning} 
            />
          </View>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.sku && <Text style={styles.itemSku}>{item.sku}</Text>}
          </View>
        </View>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      flex: 0.8,
      render: (item: Item) => (
        <Text style={styles.categoryText}>{item.category_name || 'Uncategorized'}</Text>
      ),
    },
    {
      key: 'quantity',
      label: 'Current Stock',
      flex: 0.6,
      align: 'center' as const,
      render: (item: Item) => (
        <Text style={[styles.quantityText, item.quantity === 0 && styles.quantityDanger]}>
          {item.quantity}
        </Text>
      ),
    },
    {
      key: 'min_quantity',
      label: 'Min Stock',
      flex: 0.6,
      align: 'center' as const,
      render: (item: Item) => (
        <Text style={styles.minQuantityText}>{item.min_quantity}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      flex: 0.8,
      render: (item: Item) => {
        const badge = getAlertBadge(item);
        return (
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        );
      },
    },
  ];

  const renderActions = (item: Item) => (
    <>
      <TouchableOpacity 
        onPress={() => router.push('/inventory/products')} 
        style={styles.actionBtn}
      >
        <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => router.push('/inventory/purchase-orders')} 
        style={styles.restockBtn}
      >
        <Ionicons name="cart-outline" size={18} color={COLORS.success} />
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Page Header */}
        <PageHeader
          title="Low Stock Alerts"
          subtitle={`${allAlertItems.length} item${allAlertItems.length !== 1 ? 's' : ''} need attention`}
          primaryAction={{
            label: 'Create PO',
            icon: 'add',
            onPress: () => router.push('/inventory/purchase-orders'),
          }}
        />

        {/* Stats Row */}
        <PageStatsRow stats={stats} />

        {/* Search & Filters */}
        {allAlertItems.length > 0 && (
          <>
            <PageSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search items..."
            />
            <PageFiltersRow
              filters={filters}
              selectedFilter={alertFilter}
              onFilterSelect={setAlertFilter}
            />
          </>
        )}

        {/* Table */}
        <PageTableCard
          columns={columns}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyIcon="checkmark-circle-outline"
          emptyTitle="All Stocked Up!"
          emptySubtitle="No items are currently low on stock or out of stock"
          renderActions={renderActions}
        />

        {/* Info Card */}
        {allAlertItems.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Need to restock?</Text>
              <Text style={styles.infoText}>
                Create a Purchase Order to request more stock from your suppliers.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.infoAction}
              onPress={() => router.push('/inventory/purchase-orders')}
            >
              <Text style={styles.infoActionText}>Create PO</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  itemCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconDanger: {
    backgroundColor: COLORS.dangerLight,
  },
  itemIconWarning: {
    backgroundColor: COLORS.warningLight,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemSku: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryText: {
    fontSize: 14,
    color: '#374151',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  quantityDanger: {
    color: COLORS.danger,
  },
  minQuantityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionBtn: {
    padding: 8,
  },
  restockBtn: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  infoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
