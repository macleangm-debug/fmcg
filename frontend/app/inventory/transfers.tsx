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
import {
  PageHeader,
  PageStatsRow,
  PageSearchBar,
  PageFiltersRow,
  PageTableCard,
} from '../../src/components/ecosystem/layout';
import ActionSheetModal from '../../src/components/common/ActionSheetModal';
import Input from '../../src/components/Input';
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

interface Transfer {
  id: string;
  from_location_id?: string;
  from_location_name?: string;
  to_location_id?: string;
  to_location_name?: string;
  item_id?: string;
  item_name?: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

interface Location {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
}

export default function TransfersScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    from_location_id: '',
    to_location_id: '',
    item_id: '',
    quantity: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [transfersRes, locationsRes, itemsRes] = await Promise.all([
        api.get('/inventory/transfers'),
        api.get('/inventory/locations'),
        api.get('/inventory/items'),
      ]);
      setTransfers(transfersRes.data || []);
      setLocations(locationsRes.data || []);
      setItems(itemsRes.data || []);
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

  const handleCreateTransfer = async () => {
    if (!formData.from_location_id || !formData.to_location_id || !formData.item_id || !formData.quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.from_location_id === formData.to_location_id) {
      Alert.alert('Error', 'Source and destination locations must be different');
      return;
    }

    setSaving(true);
    try {
      await api.post('/inventory/transfers', {
        from_location_id: formData.from_location_id,
        to_location_id: formData.to_location_id,
        item_id: formData.item_id,
        quantity: parseInt(formData.quantity),
        notes: formData.notes,
      });
      await fetchData();
      setShowAddModal(false);
      setFormData({ from_location_id: '', to_location_id: '', item_id: '', quantity: '', notes: '' });
      Alert.alert('Success', 'Transfer created successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    if (locations.length < 2) {
      Alert.alert('Cannot Create Transfer', 'You need at least 2 locations to create a transfer. Please add more locations first.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Cannot Create Transfer', 'You need at least 1 item to transfer. Please add items first.');
      return;
    }
    setFormData({ from_location_id: '', to_location_id: '', item_id: '', quantity: '', notes: '' });
    setShowAddModal(true);
  };

  // Filter transfers
  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.from_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.to_location_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = [
    { label: 'Total Transfers', value: transfers.length, color: COLORS.primary, bgColor: COLORS.primaryLight },
    { label: 'Pending', value: transfers.filter(t => t.status === 'pending').length, color: COLORS.warning, bgColor: COLORS.warningLight },
    { label: 'Completed', value: transfers.filter(t => t.status === 'completed').length, color: COLORS.success, bgColor: COLORS.successLight },
  ];

  // Filters
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  // Get status badge style
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; color: string }> = {
      pending: { bg: COLORS.warningLight, color: COLORS.warning },
      in_transit: { bg: COLORS.primaryLight, color: COLORS.primary },
      completed: { bg: COLORS.successLight, color: COLORS.success },
      cancelled: { bg: COLORS.dangerLight, color: COLORS.danger },
    };
    return statusStyles[status] || statusStyles.pending;
  };

  // Table columns
  const columns = [
    {
      key: 'item_name',
      label: 'Item',
      flex: 1.2,
      render: (item: Transfer) => (
        <View style={styles.itemCell}>
          <View style={styles.itemIcon}>
            <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.itemName}>{item.item_name || 'Unknown Item'}</Text>
        </View>
      ),
    },
    {
      key: 'from',
      label: 'From',
      flex: 1,
      render: (item: Transfer) => (
        <Text style={styles.locationText}>{item.from_location_name || '-'}</Text>
      ),
    },
    {
      key: 'to',
      label: 'To',
      flex: 1,
      render: (item: Transfer) => (
        <Text style={styles.locationText}>{item.to_location_name || '-'}</Text>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty',
      flex: 0.5,
      align: 'center' as const,
      render: (item: Transfer) => (
        <Text style={styles.quantityText}>{item.quantity}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      flex: 0.8,
      render: (item: Transfer) => {
        const badge = getStatusBadge(item.status);
        return (
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        );
      },
    },
  ];

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
          title="Transfers"
          subtitle={`${transfers.length} transfer${transfers.length !== 1 ? 's' : ''}`}
          primaryAction={{
            label: 'New Transfer',
            icon: 'swap-horizontal',
            onPress: openAddModal,
          }}
        />

        {/* Stats Row */}
        <PageStatsRow stats={stats} />

        {/* Search */}
        {transfers.length > 0 && (
          <>
            <PageSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search transfers..."
            />
            <PageFiltersRow
              filters={filters}
              selectedFilter={statusFilter}
              onFilterSelect={setStatusFilter}
            />
          </>
        )}

        {/* Table */}
        <PageTableCard
          columns={columns}
          data={filteredTransfers}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyIcon="swap-horizontal-outline"
          emptyTitle="No Transfers"
          emptySubtitle={locations.length < 2 
            ? "Add at least 2 locations to start transferring stock"
            : "Create your first stock transfer between locations"
          }
        />
      </ScrollView>

      {/* Add Transfer Modal */}
      <ActionSheetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Transfer"
        subtitle="Move stock between locations"
      >
        <View style={styles.form}>
          {/* From Location */}
          <Text style={styles.inputLabel}>From Location *</Text>
          <View style={styles.selectContainer}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.selectOption,
                  formData.from_location_id === loc.id && styles.selectOptionActive,
                  formData.to_location_id === loc.id && styles.selectOptionDisabled,
                ]}
                onPress={() => setFormData({ ...formData, from_location_id: loc.id })}
                disabled={formData.to_location_id === loc.id}
              >
                <Text style={[
                  styles.selectOptionText,
                  formData.from_location_id === loc.id && styles.selectOptionTextActive,
                ]}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* To Location */}
          <Text style={styles.inputLabel}>To Location *</Text>
          <View style={styles.selectContainer}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.selectOption,
                  formData.to_location_id === loc.id && styles.selectOptionActive,
                  formData.from_location_id === loc.id && styles.selectOptionDisabled,
                ]}
                onPress={() => setFormData({ ...formData, to_location_id: loc.id })}
                disabled={formData.from_location_id === loc.id}
              >
                <Text style={[
                  styles.selectOptionText,
                  formData.to_location_id === loc.id && styles.selectOptionTextActive,
                ]}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Item */}
          <Text style={styles.inputLabel}>Item *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.selectContainer}>
              {items.slice(0, 10).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.selectOption,
                    formData.item_id === item.id && styles.selectOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, item_id: item.id })}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.item_id === item.id && styles.selectOptionTextActive,
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Quantity */}
          <Input
            label="Quantity *"
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text.replace(/[^0-9]/g, '') })}
            placeholder="Enter quantity"
            keyboardType="numeric"
          />

          {/* Notes */}
          <Input
            label="Notes (Optional)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Add any notes"
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleCreateTransfer}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Create Transfer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ActionSheetModal>
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
    gap: 10,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    textTransform: 'capitalize',
  },
  form: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  selectOptionDisabled: {
    opacity: 0.4,
  },
  selectOptionText: {
    fontSize: 13,
    color: '#374151',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
