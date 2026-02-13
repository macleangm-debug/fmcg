import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={INVENTORY_THEME.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Movements</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        style={styles.list}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INVENTORY_THEME.dark },
  list: { flex: 1, padding: 16 },
  movementCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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
});
