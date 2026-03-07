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
  PageTableCard,
  EmptyStateCard,
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
  lightGray: '#D1D5DB',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

interface Location {
  id: string;
  name: string;
  address?: string;
  type: string;
  status: string;
  item_count?: number;
  is_default?: boolean;
  created_at?: string;
}

export default function LocationsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', type: 'store' });

  const fetchLocations = useCallback(async () => {
    try {
      const response = await api.get('/inventory/locations');
      setLocations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLocations();
  }, [fetchLocations]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Location name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingLocation) {
        await api.put(`/inventory/locations/${editingLocation.id}`, formData);
      } else {
        await api.post('/inventory/locations', formData);
      }
      await fetchLocations();
      setShowAddModal(false);
      setEditingLocation(null);
      setFormData({ name: '', address: '', type: 'store' });
      Alert.alert('Success', editingLocation ? 'Location updated' : 'Location created');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({ 
      name: location.name, 
      address: location.address || '', 
      type: location.type || 'store' 
    });
    setShowAddModal(true);
  };

  const handleDelete = (location: Location) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventory/locations/${location.id}`);
              await fetchLocations();
              Alert.alert('Success', 'Location deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.detail || 'Failed to delete location');
            }
          }
        }
      ]
    );
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setFormData({ name: '', address: '', type: 'store' });
    setShowAddModal(true);
  };

  // Filter locations by search
  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats
  const stats = [
    { label: 'Total Locations', value: locations.length, color: COLORS.primary, bgColor: COLORS.primaryLight },
    { label: 'Active', value: locations.filter(l => l.status === 'active' || !l.status).length, color: COLORS.success, bgColor: COLORS.successLight },
    { label: 'With Stock', value: locations.filter(l => (l.item_count || 0) > 0).length, color: COLORS.warning, bgColor: COLORS.warningLight },
  ];

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Name',
      flex: 1.5,
      render: (item: Location) => (
        <View style={styles.nameCell}>
          <View style={styles.locationIcon}>
            <Ionicons name="business-outline" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.locationName}>{item.name}</Text>
            {item.address && <Text style={styles.locationAddress}>{item.address}</Text>}
          </View>
        </View>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      flex: 0.8,
      render: (item: Location) => (
        <View style={[styles.typeBadge, item.type === 'store' ? styles.storeBadge : styles.warehouseBadge]}>
          <Text style={[styles.typeBadgeText, item.type === 'store' ? styles.storeText : styles.warehouseText]}>
            {item.type || 'store'}
          </Text>
        </View>
      ),
    },
    {
      key: 'item_count',
      label: 'Items',
      flex: 0.6,
      align: 'center' as const,
      render: (item: Location) => (
        <Text style={styles.itemCount}>{item.item_count || 0}</Text>
      ),
    },
    {
      key: 'is_default',
      label: 'Default',
      flex: 0.6,
      align: 'center' as const,
      render: (item: Location) => (
        item.is_default ? (
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        ) : (
          <Text style={styles.notDefault}>-</Text>
        )
      ),
    },
  ];

  const renderActions = (item: Location) => (
    <>
      <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
        <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
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
          title="Locations"
          subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
          primaryAction={{
            label: 'Add Location',
            icon: 'add',
            onPress: openAddModal,
          }}
        />

        {/* Stats Row */}
        <PageStatsRow stats={stats} />

        {/* Search */}
        {locations.length > 0 && (
          <PageSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search locations..."
          />
        )}

        {/* Table */}
        <PageTableCard
          columns={columns}
          data={filteredLocations}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyIcon="business-outline"
          emptyTitle="No Locations"
          emptySubtitle="Create your first storage location to start tracking inventory"
          renderActions={renderActions}
        />
      </ScrollView>

      {/* Add/Edit Modal */}
      <ActionSheetModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
        subtitle="Configure storage location details"
      >
        <View style={styles.form}>
          <Input
            label="Location Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Main Store"
          />
          <Input
            label="Address (Optional)"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="e.g., 123 Business Street"
          />
          
          <Text style={styles.inputLabel}>Location Type</Text>
          <View style={styles.typeOptions}>
            {['store', 'warehouse', 'office'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  formData.type === type && styles.typeOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, type })}
              >
                <Ionicons
                  name={type === 'store' ? 'storefront-outline' : type === 'warehouse' ? 'cube-outline' : 'business-outline'}
                  size={20}
                  color={formData.type === type ? COLORS.white : COLORS.gray}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    formData.type === type && styles.typeOptionTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {editingLocation ? 'Update Location' : 'Create Location'}
              </Text>
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
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  locationAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  storeBadge: {
    backgroundColor: '#D1FAE5',
  },
  warehouseBadge: {
    backgroundColor: '#DBEAFE',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  storeText: {
    color: '#059669',
  },
  warehouseText: {
    color: '#2563EB',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  notDefault: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionBtn: {
    padding: 8,
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
  typeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
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
