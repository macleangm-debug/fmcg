import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ViewToggle from '../../src/components/ViewToggle';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import api from '../../src/api/client';

const INVENTORY_THEME = {
  primary: '#10B981',
  dark: '#111827',
  gray: '#6B7280',
  danger: '#EF4444',
  warning: '#F59E0B',
};

interface Movement {
  id: string;
  item_id: string;
  item_name: string;
  adjustment_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  reference: string;
  created_by_name: string;
  created_at: string;
}

export default function InventoryMovements() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { movementsView, setMovementsView } = useViewSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);

  const fetchMovements = async () => {
    try {
      const res = await api.get('/inventory/movements');
      setMovements(res.data);
    } catch (error) {
      console.log('Failed to fetch movements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMovements();
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return INVENTORY_THEME.primary;
      case 'out': return INVENTORY_THEME.danger;
      case 'adjustment': return INVENTORY_THEME.warning;
      default: return INVENTORY_THEME.gray;
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'in': return 'add-circle';
      case 'out': return 'remove-circle';
      case 'adjustment': return 'build';
      case 'transfer': return 'swap-horizontal';
      default: return 'ellipse';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={INVENTORY_THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Stock Movements</Text>
            <Text style={styles.webPageSubtitle}>{movements.length} movement(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={movementsView}
              onToggle={setMovementsView}
            />
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Stock Movements</Text>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Filter Tabs */}
            <View style={styles.webCardHeader}>
              <View style={styles.webTabs}>
                <TouchableOpacity style={[styles.webTab, styles.webTabActive]}>
                  <Text style={[styles.webTabText, styles.webTabTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.webTab}>
                  <Text style={styles.webTabText}>Stock In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.webTab}>
                  <Text style={styles.webTabText}>Stock Out</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.webTab}>
                  <Text style={styles.webTabText}>Adjustments</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Movements List */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INVENTORY_THEME.primary} />}
            >
              {movements.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="swap-horizontal-outline" size={64} color={INVENTORY_THEME.gray} />
                  <Text style={styles.webEmptyText}>No movements yet</Text>
                  <Text style={styles.webEmptySubtext}>Stock adjustments will appear here</Text>
                </View>
              ) : movementsView === 'table' ? (
                <>
                  {/* Table Header */}
                  <View style={styles.webTableHeader}>
                    <Text style={[styles.webTableHeaderCell, { flex: 2 }]}>ITEM</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>TYPE</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>QTY</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>BEFORE → AFTER</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1.5 }]}>REASON</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>DATE</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>BY</Text>
                  </View>
                  {/* Table Rows */}
                  {movements.map((movement) => (
                    <View key={movement.id} style={styles.webTableRow}>
                      <Text style={[styles.webTableCell, { flex: 2, fontWeight: '600' }]}>{movement.item_name}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(movement.adjustment_type)}15` }]}>
                          <Text style={[styles.typeBadgeText, { color: getTypeColor(movement.adjustment_type) }]}>
                            {movement.adjustment_type === 'in' ? 'Stock In' : movement.adjustment_type === 'out' ? 'Stock Out' : 'Adjust'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.webTableCell, { flex: 1, color: getTypeColor(movement.adjustment_type), fontWeight: '700' }]}>
                        {movement.adjustment_type === 'in' ? '+' : movement.adjustment_type === 'out' ? '-' : ''}{movement.quantity}
                      </Text>
                      <Text style={[styles.webTableCell, { flex: 1 }]}>{movement.previous_quantity} → {movement.new_quantity}</Text>
                      <Text style={[styles.webTableCell, { flex: 1.5 }]} numberOfLines={1}>{movement.reason || '-'}</Text>
                      <Text style={[styles.webTableCell, { flex: 1 }]}>{formatDate(movement.created_at)}</Text>
                      <Text style={[styles.webTableCell, { flex: 1 }]}>{movement.created_by_name}</Text>
                    </View>
                  ))}
                </>
              ) : (
                /* Grid View - 3 columns */
                <View style={styles.webMovementsGrid}>
                  {movements.map((movement) => (
                    <View key={movement.id} style={styles.webMovementCard}>
                      <View style={[styles.webMovementIcon, { backgroundColor: `${getTypeColor(movement.adjustment_type)}15` }]}>
                        <Ionicons name={getTypeIcon(movement.adjustment_type)} size={24} color={getTypeColor(movement.adjustment_type)} />
                      </View>
                      <View style={styles.webMovementInfo}>
                        <Text style={styles.webMovementItem} numberOfLines={1}>{movement.item_name}</Text>
                        <View style={styles.webMovementMeta}>
                          <View style={[styles.typeBadgeSmall, { backgroundColor: `${getTypeColor(movement.adjustment_type)}15` }]}>
                            <Text style={[styles.typeBadgeTextSmall, { color: getTypeColor(movement.adjustment_type) }]}>
                              {movement.adjustment_type === 'in' ? '+' : '-'}{movement.quantity}
                            </Text>
                          </View>
                          <Text style={styles.webMovementChange}>{movement.previous_quantity} → {movement.new_quantity}</Text>
                        </View>
                        {movement.reason && <Text style={styles.webMovementReason} numberOfLines={1}>{movement.reason}</Text>}
                      </View>
                      <View style={styles.webMovementDate}>
                        <Text style={styles.webMovementDateText}>{formatDate(movement.created_at)}</Text>
                        <Text style={styles.webMovementBy}>{movement.created_by_name}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileContent}>
          <View style={styles.mobileCardContainer}>
            <ScrollView
              style={styles.mobileList}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INVENTORY_THEME.primary} />}
            >
              {movements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="swap-horizontal-outline" size={64} color={INVENTORY_THEME.gray} />
                  <Text style={styles.emptyText}>No movements yet</Text>
                  <Text style={styles.emptySubtext}>Stock adjustments will appear here</Text>
                </View>
              ) : (
                movements.map((movement) => (
                  <View key={movement.id} style={styles.movementCard}>
                    <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(movement.adjustment_type)}15` }]}>
                      <Ionicons name={getTypeIcon(movement.adjustment_type)} size={24} color={getTypeColor(movement.adjustment_type)} />
                    </View>
                    <View style={styles.movementInfo}>
                      <Text style={styles.itemName}>{movement.item_name}</Text>
                      <Text style={styles.movementType}>
                        {movement.adjustment_type === 'in' ? 'Stock In' : movement.adjustment_type === 'out' ? 'Stock Out' : 'Adjustment'}
                        {' • '}
                        <Text style={{ color: getTypeColor(movement.adjustment_type), fontWeight: '700' }}>
                          {movement.adjustment_type === 'in' ? '+' : movement.adjustment_type === 'out' ? '-' : ''}{movement.quantity}
                        </Text>
                      </Text>
                      <Text style={styles.movementDetail}>
                        {movement.previous_quantity} → {movement.new_quantity}
                      </Text>
                      {movement.reason && <Text style={styles.movementReason}>{movement.reason}</Text>}
                    </View>
                    <View style={styles.movementMeta}>
                      <Text style={styles.movementDate}>{formatDate(movement.created_at)}</Text>
                      <Text style={styles.movementBy}>{movement.created_by_name}</Text>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: INVENTORY_THEME.dark },
  list: { flex: 1, padding: 16 },
  mobileContent: { flex: 1, padding: 16 },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mobileList: { flex: 1 },
  // Table styles
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  tableHeaderCell: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 1, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableCell: { fontSize: 14, color: '#374151' },
  tableCellType: { alignItems: 'flex-start' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  // Card styles
  movementCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10 },
  typeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  movementInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: '700', color: INVENTORY_THEME.dark },
  movementType: { fontSize: 14, color: INVENTORY_THEME.gray, marginTop: 2 },
  movementDetail: { fontSize: 13, color: INVENTORY_THEME.gray, marginTop: 2 },
  movementReason: { fontSize: 13, color: INVENTORY_THEME.gray, fontStyle: 'italic', marginTop: 4 },
  movementMeta: { alignItems: 'flex-end' },
  movementDate: { fontSize: 12, color: INVENTORY_THEME.gray },
  movementBy: { fontSize: 12, color: INVENTORY_THEME.gray, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: INVENTORY_THEME.gray, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: INVENTORY_THEME.gray, marginTop: 4 },

  // Web Page Header & Layout
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webPageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  webContentWrapper: {
    flex: 1,
    padding: 24,
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  webTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  webTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  webTabActive: {
    backgroundColor: INVENTORY_THEME.primary,
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webTabTextActive: {
    color: '#FFFFFF',
  },
  webListContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  webEmptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  webEmptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  // Web Table Styles
  webTableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  webTableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  webTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webTableCell: {
    fontSize: 14,
    color: '#374151',
  },
  
  // Web Grid/Card Styles
  webMovementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webMovementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    gap: 12,
  },
  webMovementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMovementInfo: {
    flex: 1,
  },
  webMovementItem: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  webMovementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  typeBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  webMovementChange: {
    fontSize: 13,
    color: '#6B7280',
  },
  webMovementReason: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  webMovementDate: {
    alignItems: 'flex-end',
  },
  webMovementDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  webMovementBy: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
