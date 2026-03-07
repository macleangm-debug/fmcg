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

interface Location {
  id: string;
  name: string;
  address?: string;
  type: string;
  status: string;
  item_count?: number;
  created_at?: string;
}

export default function LocationsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', type: 'warehouse' });

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
      setFormData({ name: '', address: '', type: 'warehouse' });
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
      type: location.type || 'warehouse' 
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

  const renderLocation = (location: Location) => (
    <View key={location.id} style={[styles.card, isWeb && styles.cardGrid]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{location.name}</Text>
          {location.address && (
            <Text style={styles.cardSubtitle}>{location.address}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleEdit(location)}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(location)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{location.type || 'warehouse'}</Text>
        </View>
        <Text style={styles.itemCount}>{location.item_count || 0} items</Text>
      </View>
    </View>
  );

  const renderContent = () => (
    <View style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Locations</Text>
          <Text style={styles.pageSubtitle}>Manage your storage locations</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingLocation(null);
            setFormData({ name: '', address: '', type: 'warehouse' });
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Location</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{locations.length}</Text>
          <Text style={styles.statLabel}>Total Locations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {locations.filter(l => l.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Locations List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Loading locations...</Text>
        </View>
      ) : locations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No Locations</Text>
          <Text style={styles.emptyText}>Create your first storage location</Text>
        </View>
      ) : (
        <View style={isWeb ? styles.grid : undefined}>
          {locations.map(renderLocation)}
        </View>
      )}

      {/* Add/Edit Modal */}
      <WebModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
        subtitle="Enter location details"
        icon="business-outline"
        iconColor={COLORS.primary}
        maxWidth={450}
      >
        <View style={styles.form}>
          <Input
            label="Location Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Main Warehouse"
          />
          <Input
            label="Address (Optional)"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="e.g., 123 Business Street"
          />
          <View style={styles.typeSelector}>
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeOptions}>
              {['warehouse', 'store', 'office'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    formData.type === type && styles.typeOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text style={[
                    styles.typeOptionText,
                    formData.type === type && styles.typeOptionTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formActions}>
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={{ flex: 1 }}
              disabled={saving}
            />
            <Button
              title={saving ? 'Saving...' : (editingLocation ? 'Update' : 'Create')}
              onPress={handleSave}
              style={{ flex: 1 }}
              disabled={saving}
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
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardGrid: { width: 'calc(50% - 8px)' as any },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  cardSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: COLORS.dangerLight },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  badge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary, textTransform: 'capitalize' },
  itemCount: { fontSize: 13, color: COLORS.gray },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  form: { gap: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  typeSelector: { marginTop: 8 },
  typeOptions: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  typeOptionActive: { backgroundColor: COLORS.primary },
  typeOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  typeOptionTextActive: { color: COLORS.white },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
