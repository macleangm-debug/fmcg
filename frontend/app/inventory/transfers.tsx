import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebModal from '../../src/components/WebModal';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
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

interface Transfer {
  id: string;
  from_location: string;
  to_location: string;
  status: string;
  items_count: number;
  created_at: string;
  notes?: string;
}

interface Location {
  id: string;
  name: string;
}

export default function TransfersScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const fetchData = useCallback(async () => {
    try {
      const [transfersRes, locationsRes] = await Promise.all([
        api.get('/inventory/transfers'),
        api.get('/inventory/locations'),
      ]);
      setTransfers(transfersRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'in_transit': return { bg: COLORS.primaryLight, text: COLORS.primary };
      case 'completed': return { bg: COLORS.successLight, text: COLORS.success };
      case 'cancelled': return { bg: COLORS.dangerLight, text: COLORS.danger };
      default: return { bg: COLORS.primaryLight, text: COLORS.primary };
    }
  };

  const pendingTransfers = transfers.filter(t => t.status === 'pending' || t.status === 'in_transit');
  const completedTransfers = transfers.filter(t => t.status === 'completed');

  const renderTransfer = (transfer: Transfer) => {
    const statusColor = getStatusColor(transfer.status);
    return (
      <View key={transfer.id} style={[styles.card, isWeb && styles.cardGrid]}>
        <View style={styles.cardHeader}>
          <View style={styles.transferRoute}>
            <View style={styles.locationBadge}>
              <Ionicons name="arrow-up-outline" size={14} color={COLORS.danger} />
              <Text style={styles.locationText}>{transfer.from_location}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={COLORS.gray} />
            <View style={styles.locationBadge}>
              <Ionicons name="arrow-down-outline" size={14} color={COLORS.success} />
              <Text style={styles.locationText}>{transfer.to_location}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {transfer.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={14} color={COLORS.gray} />
            <Text style={styles.metaText}>{transfer.items_count} items</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
            <Text style={styles.metaText}>
              {new Date(transfer.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {transfer.notes && (
          <Text style={styles.notes} numberOfLines={2}>{transfer.notes}</Text>
        )}
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Transfers</Text>
          <Text style={styles.pageSubtitle}>Move stock between locations</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>New Transfer</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendingTransfers.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{completedTransfers.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{locations.length}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingTransfers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed ({completedTransfers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transfer List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Loading transfers...</Text>
        </View>
      ) : (activeTab === 'pending' ? pendingTransfers : completedTransfers).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No {activeTab} Transfers</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'pending' 
              ? 'Create a transfer to move stock between locations' 
              : 'Completed transfers will appear here'}
          </Text>
        </View>
      ) : (
        <View style={isWeb ? styles.grid : undefined}>
          {(activeTab === 'pending' ? pendingTransfers : completedTransfers).map(renderTransfer)}
        </View>
      )}

      {/* Create Transfer Modal */}
      <WebModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Transfer"
        subtitle="Move stock between locations"
        icon="swap-horizontal"
        iconColor={COLORS.primary}
        maxWidth={500}
      >
        <View style={styles.modalContent}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Select source and destination locations, then choose items to transfer.
            </Text>
          </View>
          
          {locations.length < 2 ? (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                You need at least 2 locations to create a transfer. Please add more locations first.
              </Text>
            </View>
          ) : (
            <Text style={styles.comingSoon}>Transfer creation flow coming soon...</Text>
          )}
          
          <View style={styles.formActions}>
            <Button
              title="Close"
              onPress={() => setShowCreateModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </WebModal>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardGrid: { width: 'calc(50% - 8px)' as any },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  transferRoute: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  locationText: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: COLORS.gray },
  notes: { fontSize: 13, color: COLORS.gray, marginTop: 8, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8, textAlign: 'center' },
  modalContent: { gap: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 8 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.primary },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.warningLight, padding: 12, borderRadius: 8 },
  warningText: { flex: 1, fontSize: 14, color: COLORS.warning },
  comingSoon: { fontSize: 14, color: COLORS.gray, textAlign: 'center', paddingVertical: 20 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
