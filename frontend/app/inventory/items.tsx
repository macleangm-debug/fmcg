import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import WebModal from '../../src/components/WebModal';
import api from '../../src/api/client';

const INVENTORY_THEME = {
  primary: '#10B981',
  primaryDark: '#059669',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  danger: '#EF4444',
  warning: '#F59E0B',
};

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  category_id: string;
  category_name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number | null;
  cost_price: number;
  stock_value: number;
  location: string;
  supplier: string;
  notes: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function InventoryItems() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(params.status as string || 'all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states for new item
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQuantity, setNewQuantity] = useState('0');
  const [newMinQty, setNewMinQty] = useState('10');
  const [newCostPrice, setNewCostPrice] = useState('0');
  const [newLocation, setNewLocation] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  
  // Form states for adjustment
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  
  // Confirmation modal
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        api.get(`/inventory/items?status=${filterStatus}${searchQuery ? `&search=${searchQuery}` : ''}`),
        api.get('/inventory/categories')
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      console.log('Failed to fetch items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const resetAddForm = () => {
    setNewName('');
    setNewSku('');
    setNewDescription('');
    setNewCategory('');
    setNewUnit('pcs');
    setNewQuantity('0');
    setNewMinQty('10');
    setNewCostPrice('0');
    setNewLocation('');
    setNewSupplier('');
  };

  const handleAddItem = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/inventory/items', {
        name: newName,
        sku: newSku || undefined,
        description: newDescription,
        category_id: newCategory || undefined,
        unit: newUnit,
        quantity: parseInt(newQuantity) || 0,
        min_quantity: parseInt(newMinQty) || 10,
        cost_price: parseFloat(newCostPrice) || 0,
        location: newLocation,
        supplier: newSupplier,
      });
      setShowAddModal(false);
      resetAddForm();
      fetchData();
      Alert.alert('Success', 'Item added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustQty) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }
    
    if ((adjustType === 'out' || adjustType === 'adjustment') && !adjustReason.trim()) {
      Alert.alert('Error', 'Please enter a reason');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        item_id: selectedItem.id,
        adjustment_type: adjustType,
        quantity: parseInt(adjustQty),
        reason: adjustReason,
      });
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustQty('');
      setAdjustReason('');
      fetchData();
      Alert.alert('Success', 'Stock adjusted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      await api.delete(`/inventory/items/${itemToDelete.id}`);
      setShowConfirmDelete(false);
      setItemToDelete(null);
      fetchData();
      Alert.alert('Success', 'Item deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustType('in');
    setAdjustQty('');
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return INVENTORY_THEME.primary;
      case 'low_stock': return INVENTORY_THEME.warning;
      case 'out_of_stock': return INVENTORY_THEME.danger;
      default: return INVENTORY_THEME.gray;
    }
  };

  const renderItem = (item: InventoryItem) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSku}>{item.sku}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <Text style={styles.detailValue}>{formatNumber(item.quantity)} {item.unit}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Min Stock</Text>
          <Text style={styles.detailValue}>{formatNumber(item.min_quantity)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Value</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.stock_value)}</Text>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openAdjustModal(item)}>
          <Ionicons name="swap-horizontal" size={18} color={INVENTORY_THEME.primary} />
          <Text style={[styles.actionBtnText, { color: INVENTORY_THEME.primary }]}>Adjust</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => { setItemToDelete(item); setShowConfirmDelete(true); }}
        >
          <Ionicons name="trash-outline" size={18} color={INVENTORY_THEME.danger} />
          <Text style={[styles.actionBtnText, { color: INVENTORY_THEME.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Inventory Items</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={INVENTORY_THEME.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={INVENTORY_THEME.gray}
        />
      </View>
      
      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'low_stock', 'out_of_stock'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterBtnText, filterStatus === status && styles.filterBtnTextActive]}>
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Items List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INVENTORY_THEME.primary} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={INVENTORY_THEME.gray} />
            <Text style={styles.emptyText}>No items found</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyBtnText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map(renderItem)
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Add Item Modal */}
      <WebModal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Item">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Item Name *</Text>
          <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Enter item name" />
          
          <Text style={styles.inputLabel}>SKU</Text>
          <TextInput style={styles.input} value={newSku} onChangeText={setNewSku} placeholder="Auto-generated if empty" />
          
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, newCategory === cat.id && { backgroundColor: INVENTORY_THEME.primary }]}
                onPress={() => setNewCategory(cat.id)}
              >
                <Text style={[styles.categoryChipText, newCategory === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Initial Qty</Text>
              <TextInput style={styles.input} value={newQuantity} onChangeText={setNewQuantity} keyboardType="numeric" />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Min Stock</Text>
              <TextInput style={styles.input} value={newMinQty} onChangeText={setNewMinQty} keyboardType="numeric" />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Unit</Text>
              <TextInput style={styles.input} value={newUnit} onChangeText={setNewUnit} placeholder="pcs, kg, etc" />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Cost Price</Text>
              <TextInput style={styles.input} value={newCostPrice} onChangeText={setNewCostPrice} keyboardType="numeric" />
            </View>
          </View>
          
          <Text style={styles.inputLabel}>Location</Text>
          <TextInput style={styles.input} value={newLocation} onChangeText={setNewLocation} placeholder="Warehouse location" />
          
          <Text style={styles.inputLabel}>Supplier</Text>
          <TextInput style={styles.input} value={newSupplier} onChangeText={setNewSupplier} placeholder="Supplier name" />
          
          <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Add Item</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </WebModal>
      
      {/* Adjust Stock Modal */}
      <WebModal visible={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust Stock: ${selectedItem?.name || ''}`}>
        <View style={styles.adjustTypeRow}>
          {(['in', 'out', 'adjustment'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.adjustTypeBtn, adjustType === type && styles.adjustTypeBtnActive]}
              onPress={() => setAdjustType(type)}
            >
              <Ionicons 
                name={type === 'in' ? 'add-circle' : type === 'out' ? 'remove-circle' : 'build'} 
                size={20} 
                color={adjustType === type ? '#FFF' : INVENTORY_THEME.gray} 
              />
              <Text style={[styles.adjustTypeText, adjustType === type && styles.adjustTypeTextActive]}>
                {type === 'in' ? 'Stock In' : type === 'out' ? 'Stock Out' : 'Set Qty'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.currentStock}>Current Stock: {selectedItem?.quantity || 0} {selectedItem?.unit}</Text>
        
        <Text style={styles.inputLabel}>Quantity *</Text>
        <TextInput 
          style={styles.input} 
          value={adjustQty} 
          onChangeText={setAdjustQty} 
          keyboardType="numeric" 
          placeholder={adjustType === 'adjustment' ? 'New quantity' : 'Quantity to add/remove'}
        />
        
        <Text style={styles.inputLabel}>Reason {adjustType !== 'in' ? '*' : ''}</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={adjustReason} 
          onChangeText={setAdjustReason} 
          placeholder="Enter reason for adjustment"
          multiline
          numberOfLines={3}
        />
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleAdjustStock} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Confirm Adjustment</Text>
          )}
        </TouchableOpacity>
      </WebModal>
      
      {/* Delete Confirmation Modal */}
      <Modal visible={showConfirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning" size={48} color={INVENTORY_THEME.danger} />
            <Text style={styles.confirmTitle}>Delete Item?</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmDelete(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteItem}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INVENTORY_THEME.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: INVENTORY_THEME.primary, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: INVENTORY_THEME.dark },
  filterContainer: { paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB', marginRight: 8 },
  filterBtnActive: { backgroundColor: INVENTORY_THEME.primary },
  filterBtnText: { fontSize: 14, fontWeight: '500', color: INVENTORY_THEME.gray, textTransform: 'capitalize' },
  filterBtnTextActive: { color: '#FFF' },
  list: { flex: 1, paddingHorizontal: 16 },
  itemCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: INVENTORY_THEME.dark },
  itemSku: { fontSize: 13, color: INVENTORY_THEME.gray, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  itemDetails: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 14, color: INVENTORY_THEME.gray },
  detailValue: { fontSize: 14, fontWeight: '600', color: INVENTORY_THEME.dark },
  itemActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', gap: 6 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: INVENTORY_THEME.gray, marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: INVENTORY_THEME.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: INVENTORY_THEME.dark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: INVENTORY_THEME.dark },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  categoryPicker: { marginTop: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB', marginRight: 8 },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: INVENTORY_THEME.dark },
  submitBtn: { backgroundColor: INVENTORY_THEME.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  adjustTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  adjustTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', gap: 6 },
  adjustTypeBtnActive: { backgroundColor: INVENTORY_THEME.primary },
  adjustTypeText: { fontSize: 13, fontWeight: '600', color: INVENTORY_THEME.gray },
  adjustTypeTextActive: { color: '#FFF' },
  currentStock: { fontSize: 15, color: INVENTORY_THEME.gray, textAlign: 'center', marginBottom: 8 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: INVENTORY_THEME.dark, marginTop: 16 },
  confirmMessage: { fontSize: 15, color: INVENTORY_THEME.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: INVENTORY_THEME.dark },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: INVENTORY_THEME.danger, alignItems: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
