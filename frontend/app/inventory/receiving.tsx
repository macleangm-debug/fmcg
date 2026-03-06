import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Layout is handled by _layout.tsx - no need to import InventorySidebarLayout here
import WebModal from '../../src/components/WebModal';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import ViewToggle from '../../src/components/ViewToggle';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import api from '../../src/api/client';

const COLORS = {
  primary: '#059669',
  primaryLight: '#D1FAE5',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
};

interface PendingDelivery {
  id: string;
  po_number: string;
  supplier: string;
  expected_date: string;
  items: DeliveryItem[];
  total_items: number;
  received_items: number;
  status: 'pending' | 'partial' | 'complete';
}

interface DeliveryItem {
  product_id: string;
  product_name: string;
  sku: string;
  ordered_qty: number;
  received_qty: number;
  pending_qty: number;
}

interface ReceivedHistory {
  id: string;
  po_number: string;
  supplier: string;
  received_date: string;
  items_count: number;
  notes: string;
}

export default function ReceivingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const isMobile = width < 600;

  // View settings store for Card/Table toggle
  const { receivingView, setReceivingView } = useViewSettingsStore();

  // Data state
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [receivedHistory, setReceivedHistory] = useState<ReceivedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [receiveQuantities, setReceiveQuantities] = useState<{ [key: string]: string }>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/inventory/receiving/pending'),
        api.get('/inventory/receiving/history'),
      ]);
      
      setPendingDeliveries(pendingRes.data || []);
      setReceivedHistory(historyRes.data || []);
    } catch (error) {
      console.error('Failed to fetch receiving data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleOpenReceive = (delivery: PendingDelivery) => {
    setSelectedDelivery(delivery);
    const initialQtys: { [key: string]: string } = {};
    delivery.items.forEach(item => {
      initialQtys[item.product_id] = String(item.pending_qty);
    });
    setReceiveQuantities(initialQtys);
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  const handleReceiveGoods = async () => {
    if (!selectedDelivery) return;

    const totalReceiving = Object.values(receiveQuantities).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
    if (totalReceiving === 0) {
      Alert.alert('Error', 'Please enter quantities to receive');
      return;
    }

    // Validate quantities don't exceed pending
    for (const item of selectedDelivery.items) {
      const receiving = parseInt(receiveQuantities[item.product_id]) || 0;
      if (receiving > item.pending_qty) {
        Alert.alert('Error', `Cannot receive more than pending quantity for ${item.product_name}`);
        return;
      }
    }

    setSaving(true);
    try {
      // Build items array for API
      const itemsToReceive = selectedDelivery.items
        .filter(item => parseInt(receiveQuantities[item.product_id]) > 0)
        .map(item => ({
          item_id: item.product_id,
          quantity: parseInt(receiveQuantities[item.product_id]) || 0,
          notes: receiveNotes,
        }));

      await api.post(`/inventory/purchase-orders/${selectedDelivery.id}/receive`, {
        items: itemsToReceive,
        notes: receiveNotes,
      });

      await fetchData(); // Refresh the lists
      setShowReceiveModal(false);
      Alert.alert('Success', `Received ${totalReceiving} items from ${selectedDelivery.po_number}`);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to receive goods');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'partial': return { bg: COLORS.blueLight, text: COLORS.blue };
      case 'complete': return { bg: COLORS.successLight, text: COLORS.success };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const stats = {
    pending: pendingDeliveries.filter(d => d.status === 'pending').length,
    partial: pendingDeliveries.filter(d => d.status === 'partial').length,
    totalPending: pendingDeliveries.reduce((sum, d) => sum + (d.total_items - d.received_items), 0),
  };

  // Table Header Component for Pending Deliveries
  const PendingTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>PO NUMBER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SUPPLIER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>EXPECTED</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>PROGRESS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>ACTION</Text>
    </View>
  );

  // Table Row Component for Pending Deliveries
  const renderPendingTableRow = (delivery: PendingDelivery) => (
    <View key={delivery.id} style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>{delivery.po_number}</Text>
      <Text style={[styles.tableCell, { flex: 2 }]}>{delivery.supplier}</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(delivery.expected_date)}</Text>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(delivery.received_items / delivery.total_items) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{delivery.received_items}/{delivery.total_items}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status).bg, alignSelf: 'flex-start' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status).text }]}>
            {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={{ flex: 0.8 }}>
        <TouchableOpacity style={styles.receiveBtn} onPress={() => handleOpenReceive(delivery)}>
          <Ionicons name="download-outline" size={14} color={COLORS.white} />
          <Text style={styles.receiveBtnText}>Receive</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Table Header Component for History
  const HistoryTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>PO NUMBER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SUPPLIER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>RECEIVED</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>ITEMS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>RECEIVED BY</Text>
    </View>
  );

  // Table Row Component for History
  const renderHistoryTableRow = (record: any) => (
    <View key={record.id} style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>{record.po_number}</Text>
      <Text style={[styles.tableCell, { flex: 2 }]}>{record.supplier}</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(record.received_date)}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{record.items_received} items</Text>
      <Text style={[styles.tableCell, { flex: 2 }]}>{record.received_by}</Text>
    </View>
  );

  // Card View for Pending Delivery
  const renderPendingCard = (delivery: PendingDelivery) => (
    <View key={delivery.id} style={[styles.deliveryCard, isWeb && styles.cardGridItem]}>
      <View style={styles.deliveryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.deliveryPO}>{delivery.po_number}</Text>
          <Text style={styles.deliverySupplier}>{delivery.supplier}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status).text }]}>
            {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.deliveryMeta}>
        <View style={styles.deliveryMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
          <Text style={styles.deliveryMetaText}>Expected: {formatDate(delivery.expected_date)}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(delivery.received_items / delivery.total_items) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{delivery.received_items}/{delivery.total_items} items</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.receiveBtn} onPress={() => handleOpenReceive(delivery)}>
        <Ionicons name="download-outline" size={16} color={COLORS.white} />
        <Text style={styles.receiveBtnText}>Receive Goods</Text>
      </TouchableOpacity>
    </View>
  );

  // Card View for History
  const renderHistoryCard = (record: ReceivedHistory) => (
    <View key={record.id} style={[styles.historyCard, isWeb && styles.cardGridItem]}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyPO}>{record.po_number}</Text>
        <Text style={styles.historyDate}>{formatDate(record.received_date)}</Text>
      </View>
      <Text style={styles.historySupplier}>{record.supplier}</Text>
      <View style={styles.historyMeta}>
        <View style={styles.historyMetaItem}>
          <Ionicons name="cube-outline" size={14} color={COLORS.gray} />
          <Text style={styles.historyMetaText}>{record.items_count} items received</Text>
        </View>
        {record.notes && (
          <View style={styles.historyMetaItem}>
            <Ionicons name="document-text-outline" size={14} color={COLORS.gray} />
            <Text style={styles.historyMetaText} numberOfLines={1}>{record.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderContent = () => (
    <View style={styles.content}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Receiving</Text>
          <Text style={styles.pageSubtitle}>Receive goods from purchase orders</Text>
        </View>
        <View style={styles.headerActions}>
          {isWeb && (
            <ViewToggle
              currentView={receivingView}
              onToggle={setReceivingView}
            />
          )}
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/inventory/purchase-orders')}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
            <Text style={styles.linkButtonText}>View POs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="time" size={24} color={COLORS.warning} />
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{stats.pending}</Text>
          <Text style={styles.summaryLabel}>Awaiting</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.blueLight }]}>
          <Ionicons name="hourglass" size={24} color={COLORS.blue} />
          <Text style={[styles.summaryValue, { color: COLORS.blue }]}>{stats.partial}</Text>
          <Text style={styles.summaryLabel}>Partial</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="cube" size={24} color={COLORS.primary} />
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{stats.totalPending}</Text>
          <Text style={styles.summaryLabel}>Items Pending</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending Deliveries
          </Text>
          {pendingDeliveries.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingDeliveries.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Received History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Loading receiving data...</Text>
        </View>
      ) : activeTab === 'pending' ? (
        <View style={styles.listContainer}>
          {pendingDeliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>No pending deliveries to receive</Text>
            </View>
          ) : isWeb && receivingView === 'table' ? (
            // Table View for Pending
            <>
              <PendingTableHeader />
              {pendingDeliveries.map(delivery => renderPendingTableRow(delivery))}
            </>
          ) : (
            // Card View for Pending
            <View style={isWeb ? styles.cardsGrid : undefined}>
              {pendingDeliveries.map(delivery => renderPendingCard(delivery))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.listContainer}>
          {receivedHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyTitle}>No History</Text>
              <Text style={styles.emptySubtitle}>Received deliveries will appear here</Text>
            </View>
          ) : isWeb && receivingView === 'table' ? (
            // Table View for History
            <>
              <HistoryTableHeader />
              {receivedHistory.map(record => renderHistoryTableRow(record))}
            </>
          ) : (
            // Card View for History
            <View style={isWeb ? styles.cardsGrid : undefined}>
              {receivedHistory.map(record => renderHistoryCard(record))}
            </View>
          )}
        </View>
      )}

      {/* Receive Modal */}
      <WebModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Goods"
        subtitle={selectedDelivery ? `${selectedDelivery.po_number} • ${selectedDelivery.supplier}` : ''}
        icon="archive"
        iconColor={COLORS.primary}
        maxWidth={500}
      >
        {selectedDelivery && (
          <>
            <Text style={styles.sectionTitle}>Items to Receive</Text>
            
            {selectedDelivery.items.map((item, idx) => (
              <View key={idx} style={styles.receiveItemCard}>
                <View style={styles.receiveItemInfo}>
                  <Text style={styles.receiveItemName}>{item.product_name}</Text>
                  <Text style={styles.receiveItemSku}>{item.sku}</Text>
                  <Text style={styles.receiveItemPending}>Pending: {item.pending_qty} of {item.ordered_qty}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity 
                    style={styles.qtyBtn}
                    onPress={() => setReceiveQuantities({
                      ...receiveQuantities,
                      [item.product_id]: String(Math.max(0, (parseInt(receiveQuantities[item.product_id]) || 0) - 1))
                    })}
                  >
                    <Ionicons name="remove" size={18} color={COLORS.dark} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    value={receiveQuantities[item.product_id] || '0'}
                    onChangeText={(text) => setReceiveQuantities({
                      ...receiveQuantities,
                      [item.product_id]: text
                    })}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity 
                    style={styles.qtyBtn}
                    onPress={() => setReceiveQuantities({
                      ...receiveQuantities,
                      [item.product_id]: String(Math.min(item.pending_qty, (parseInt(receiveQuantities[item.product_id]) || 0) + 1))
                    })}
                  >
                    <Ionicons name="add" size={18} color={COLORS.dark} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.receiveAllLink}
                  onPress={() => setReceiveQuantities({
                    ...receiveQuantities,
                    [item.product_id]: String(item.pending_qty)
                  })}
                >
                  <Text style={styles.receiveAllText}>Receive All</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ marginTop: 20 }}>
              <Input
                label="Notes (Optional)"
                placeholder="Add notes about this delivery..."
                value={receiveNotes}
                onChangeText={setReceiveNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.receiveSummary}>
              <Text style={styles.receiveSummaryLabel}>Total items to receive:</Text>
              <Text style={styles.receiveSummaryValue}>
                {Object.values(receiveQuantities).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0)}
              </Text>
            </View>

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                onPress={() => setShowReceiveModal(false)}
                variant="outline"
                style={{ flex: 1 }}
                disabled={saving}
              />
              <Button
                title={saving ? "Receiving..." : "Confirm Receipt"}
                onPress={handleReceiveGoods}
                style={{ flex: 1 }}
                disabled={saving}
              />
            </View>
          </>
        )}
      </WebModal>
    </View>
  );

  // For web, the layout is already handled by _layout.tsx with InventorySidebarLayout
  // So we just render the content directly
  if (isWeb) {
    return (
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },

  // Page Header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primaryLight },
  linkButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Summary Cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryRowMobile: { flexDirection: 'column' },
  summaryCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: COLORS.gray },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  tabBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },

  // List
  listContainer: { gap: 12 },

  // Delivery Card
  deliveryCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  deliveryPO: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  deliverySupplier: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Progress
  progressSection: { marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: COLORS.lightGray, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.gray, marginTop: 6 },

  // Items Preview
  itemsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  itemChip: { backgroundColor: COLORS.lightGray, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  itemChipName: { fontSize: 12, fontWeight: '600', color: COLORS.dark },
  itemChipQty: { fontSize: 11, color: COLORS.gray },

  // Footer
  deliveryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: COLORS.gray },
  receiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  receiveBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },

  // History Card
  historyCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyPO: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  historySupplier: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  historyNotes: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic', marginTop: 4 },
  historyMeta: { alignItems: 'flex-end' },
  historyDate: { fontSize: 13, color: COLORS.gray },
  historyCount: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 2 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },

  // Section Title
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 12, textTransform: 'uppercase' },

  // Receive Item Card
  receiveItemCard: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 14, marginBottom: 12 },
  receiveItemInfo: { marginBottom: 12 },
  receiveItemName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  receiveItemSku: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  receiveItemPending: { fontSize: 13, color: COLORS.warning, fontWeight: '600', marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  qtyInput: { width: 70, height: 40, backgroundColor: COLORS.white, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.dark, borderWidth: 1, borderColor: '#E5E7EB' },
  receiveAllLink: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.primaryLight, borderRadius: 6 },
  receiveAllText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Summary
  receiveSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  receiveSummaryLabel: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  receiveSummaryValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },

  // Form Actions
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },

  // Header Actions
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Table View Styles
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.lightGray, borderRadius: 8, marginBottom: 8 },
  tableHeaderCell: { fontSize: 11, fontWeight: '600', color: COLORS.gray, letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  tableCell: { fontSize: 14, color: COLORS.dark },

  // Cards Grid for web - 3 equal columns
  cardsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16,
  },
  // Card grid style for 3 columns
  cardGridItem: {
    width: 'calc(33.333% - 11px)',
    minWidth: 280,
  },

  // Delivery Meta (for card view)
  deliveryMeta: { marginBottom: 12 },
  deliveryMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  deliveryMetaText: { fontSize: 13, color: COLORS.gray },
  progressContainer: { marginTop: 8 },

  // History Card (updated for card view)
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  historyMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  historyMetaText: { fontSize: 13, color: COLORS.gray },
});
