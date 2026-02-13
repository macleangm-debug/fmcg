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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import WebModal from '../../src/components/WebModal';
import ImportExportModal from '../../src/components/ImportExportModal';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#EBF4FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
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

interface Summary {
  total_items: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  in_stock_count: number;
}

interface Movement {
  id: string;
  item_name: string;
  adjustment_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_by_name: string;
  created_at: string;
}

export default function InventoryManagement() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states for new item
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQuantity, setNewQuantity] = useState('0');
  const [newMinQty, setNewMinQty] = useState('10');
  const [newCostPrice, setNewCostPrice] = useState('0');
  const [newLocation, setNewLocation] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  
  // Units of Measure options
  const UNITS_OF_MEASURE = [
    { code: 'pcs', name: 'Pieces' },
    { code: 'units', name: 'Units' },
    { code: 'kg', name: 'Kilograms' },
    { code: 'g', name: 'Grams' },
    { code: 'liters', name: 'Liters' },
    { code: 'ml', name: 'Milliliters' },
    { code: 'meters', name: 'Meters' },
    { code: 'cm', name: 'Centimeters' },
    { code: 'boxes', name: 'Boxes' },
    { code: 'dozen', name: 'Dozen' },
    { code: 'pairs', name: 'Pairs' },
    { code: 'bundles', name: 'Bundles' },
    { code: 'cartons', name: 'Cartons' },
    { code: 'packs', name: 'Packs' },
    { code: 'gallons', name: 'Gallons' },
    { code: 'feet', name: 'Feet' },
    { code: 'lbs', name: 'Pounds' },
  ];
  
  // Import/Export states
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  
  // Adjustment form
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  
  // Delete confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchData = async () => {
    try {
      const [summaryRes, itemsRes, catsRes, movementsRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get(`/inventory/items?status=${filterStatus}${searchQuery ? `&search=${searchQuery}` : ''}`),
        api.get('/inventory/categories'),
        api.get('/inventory/movements?limit=50')
      ]);
      setSummary(summaryRes.data);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      console.log('Failed to fetch data:', error);
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
      case 'in_stock': return COLORS.success;
      case 'low_stock': return COLORS.warning;
      case 'out_of_stock': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'in_stock': return COLORS.successLight;
      case 'low_stock': return COLORS.warningLight;
      case 'out_of_stock': return COLORS.dangerLight;
      default: return COLORS.lightGray;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Stats Cards - exactly like the Retail Pro Stock module
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.statValue}>{formatNumber(summary?.total_items || 0)}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="cash-outline" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(summary?.total_value || 0)}</Text>
          <Text style={styles.statLabel}>Stock Value</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}
          onPress={() => setFilterStatus('low_stock')}
        >
          <Ionicons name="warning-outline" size={28} color={COLORS.warning} />
          <Text style={styles.statValue}>{formatNumber(summary?.low_stock_count || 0)}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: COLORS.dangerLight }]}
          onPress={() => setFilterStatus('out_of_stock')}
        >
          <Ionicons name="close-circle-outline" size={28} color={COLORS.danger} />
          <Text style={styles.statValue}>{formatNumber(summary?.out_of_stock_count || 0)}</Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tab Navigation
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'items' && styles.tabActive]}
        onPress={() => setActiveTab('items')}
      >
        <Text style={[styles.tabText, activeTab === 'items' && styles.tabTextActive]}>Stock Levels</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'history' && styles.tabActive]}
        onPress={() => setActiveTab('history')}
      >
        <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
      </TouchableOpacity>
    </View>
  );

  // Filter Pills
  const renderFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'low_stock', label: 'Low Stock' },
        { key: 'out_of_stock', label: 'Out of Stock' }
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[styles.filterPill, filterStatus === filter.key && styles.filterPillActive]}
          onPress={() => setFilterStatus(filter.key)}
        >
          <Text style={[styles.filterPillText, filterStatus === filter.key && styles.filterPillTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Item Row - exactly like Retail Pro
  const renderItemRow = (item: InventoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemRow}
      onPress={() => openAdjustModal(item)}
      onLongPress={() => { setItemToDelete(item); setShowConfirmDelete(true); }}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
        <Text style={styles.itemCategory}>{item.category_name || 'Uncategorized'}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemQty, { color: getStatusColor(item.status) }]}>
          {formatNumber(item.quantity)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'in_stock' ? 'In Stock' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  // Movement Row
  const renderMovementRow = (movement: Movement) => (
    <View key={movement.id} style={styles.movementRow}>
      <View style={[styles.movementIcon, { 
        backgroundColor: movement.adjustment_type === 'in' ? COLORS.successLight : 
                        movement.adjustment_type === 'out' ? COLORS.dangerLight : COLORS.warningLight 
      }]}>
        <Ionicons 
          name={movement.adjustment_type === 'in' ? 'add-circle' : movement.adjustment_type === 'out' ? 'remove-circle' : 'build'} 
          size={20} 
          color={movement.adjustment_type === 'in' ? COLORS.success : movement.adjustment_type === 'out' ? COLORS.danger : COLORS.warning} 
        />
      </View>
      <View style={styles.movementInfo}>
        <Text style={styles.movementItemName}>{movement.item_name}</Text>
        <Text style={styles.movementDetail}>
          {movement.adjustment_type === 'in' ? 'Stock In' : movement.adjustment_type === 'out' ? 'Stock Out' : 'Adjustment'}
          {' • '}{movement.previous_quantity} → {movement.new_quantity}
        </Text>
        {movement.reason && <Text style={styles.movementReason}>{movement.reason}</Text>}
      </View>
      <View style={styles.movementMeta}>
        <Text style={styles.movementDate}>{formatDate(movement.created_at)}</Text>
        <Text style={styles.movementBy}>{movement.created_by_name}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web Header with Product Switcher */}
      {isWeb && (
        <View style={styles.webHeader}>
          <View style={styles.webHeaderLeft}>
            <View style={styles.inventoryBadge}>
              <Ionicons name="cube" size={24} color="#059669" />
            </View>
            <View>
              <Text style={styles.webHeaderTitle}>Inventory</Text>
              <Text style={styles.webHeaderSubtitle}>Stock Management</Text>
            </View>
          </View>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity style={styles.importExportBtn} onPress={() => setShowImportExportModal(true)}>
              <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <ProductSwitcher currentProductId="inventory" />
          </View>
        </View>
      )}
      
      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/galaxy/home')}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stock Management</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.importExportBtn} onPress={() => setShowImportExportModal(true)}>
              <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Stats */}
        {renderStats()}
        
        {/* Tabs */}
        {renderTabs()}
        
        {/* Content based on active tab */}
        {activeTab === 'items' ? (
          <>
            {/* Filter Pills */}
            {renderFilters()}
            
            {/* Items List */}
            <View style={styles.listContainer}>
              {items.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={64} color={COLORS.gray} />
                  <Text style={styles.emptyText}>No items found</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                    <Text style={styles.emptyBtnText}>Add First Item</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                items.map(renderItemRow)
              )}
            </View>
          </>
        ) : (
          <View style={styles.listContainer}>
            {movements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="swap-horizontal-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>No movements yet</Text>
              </View>
            ) : (
              movements.map(renderMovementRow)
            )}
          </View>
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
                style={[styles.categoryChip, newCategory === cat.id && { backgroundColor: COLORS.primary }]}
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
          
          {/* Unit of Measure */}
          <Text style={styles.inputLabel}>Unit of Measure</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
            <View style={styles.unitPicker}>
              {UNITS_OF_MEASURE.map((unit) => (
                <TouchableOpacity
                  key={unit.code}
                  style={[styles.unitChip, newUnit === unit.code && styles.unitChipActive]}
                  onPress={() => setNewUnit(unit.code)}
                >
                  <Text style={[styles.unitChipText, newUnit === unit.code && styles.unitChipTextActive]}>
                    {unit.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Text style={styles.inputLabel}>Cost Price</Text>
          <TextInput style={styles.input} value={newCostPrice} onChangeText={setNewCostPrice} keyboardType="numeric" />
          
          <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Add Item</Text>}
          </TouchableOpacity>
        </ScrollView>
      </WebModal>

      {/* Adjust Stock Modal */}
      <WebModal visible={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust: ${selectedItem?.name || ''}`}>
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
                color={adjustType === type ? '#FFF' : COLORS.gray} 
              />
              <Text style={[styles.adjustTypeText, adjustType === type && styles.adjustTypeTextActive]}>
                {type === 'in' ? 'Stock In' : type === 'out' ? 'Stock Out' : 'Set Qty'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.currentStock}>Current: {selectedItem?.quantity || 0} {selectedItem?.unit}</Text>
        
        <Text style={styles.inputLabel}>Quantity *</Text>
        <TextInput style={styles.input} value={adjustQty} onChangeText={setAdjustQty} keyboardType="numeric" placeholder="Enter quantity" />
        
        <Text style={styles.inputLabel}>Reason</Text>
        <TextInput style={[styles.input, styles.textArea]} value={adjustReason} onChangeText={setAdjustReason} placeholder="Enter reason" multiline numberOfLines={3} />
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleAdjustStock} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Confirm</Text>}
        </TouchableOpacity>
      </WebModal>

      {/* Import/Export Modal - Uses reusable component */}
      <ImportExportModal
        visible={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onSuccess={fetchData}
        title="Inventory Import / Export"
        exportEndpoint="/inventory/export"
        importEndpoint="/inventory/import"
        entityName="inventory items"
      />

      {/* Delete Confirmation */}
      <Modal visible={showConfirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning" size={48} color={COLORS.danger} />
            <Text style={styles.confirmTitle}>Delete Item?</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete "{itemToDelete?.name}"?</Text>
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
  
  // Web Header
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  inventoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  webHeaderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Mobile Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  
  // Stats
  statsContainer: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  statLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  
  // Tabs
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: '#FFF' },
  
  // Filters
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  filterPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  filterPillTextActive: { color: '#FFF' },
  
  // List
  listContainer: { paddingHorizontal: 16 },
  
  // Item Row
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  itemSku: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  itemCategory: { fontSize: 13, color: COLORS.gray },
  itemRight: { alignItems: 'flex-end', marginRight: 8 },
  itemQty: { fontSize: 24, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  // Movement Row
  movementRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 10 },
  movementIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  movementInfo: { flex: 1, marginLeft: 12 },
  movementItemName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  movementDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  movementReason: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic', marginTop: 2 },
  movementMeta: { alignItems: 'flex-end' },
  movementDate: { fontSize: 12, color: COLORS.gray },
  movementBy: { fontSize: 11, color: COLORS.gray },
  
  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.gray, marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  
  // Form
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.dark },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  categoryPicker: { marginTop: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB', marginRight: 8 },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  
  // Adjust Modal
  adjustTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  adjustTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.lightGray, gap: 6 },
  adjustTypeBtnActive: { backgroundColor: COLORS.primary },
  adjustTypeText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  adjustTypeTextActive: { color: '#FFF' },
  currentStock: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 8 },
  
  // Confirm Modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  confirmMessage: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.lightGray, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.danger, alignItems: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  
  // Header actions
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  importExportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  
  // Import/Export Modal
  importExportModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '90%' },
  importExportTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, textAlign: 'center', marginBottom: 20 },
  importExportSectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginTop: 16, marginBottom: 10 },
  importExportRow: { flexDirection: 'row', gap: 12 },
  exportBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 12, backgroundColor: COLORS.lightGray, gap: 8 },
  exportBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  importExportHint: { fontSize: 12, color: COLORS.gray, marginBottom: 12, lineHeight: 18 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, gap: 10 },
  importBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  closeImportExportBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  closeImportExportText: { fontSize: 16, fontWeight: '500', color: COLORS.gray },
  
  // Unit of Measure picker
  unitPickerScroll: { marginTop: 8 },
  unitPicker: { flexDirection: 'row', gap: 8 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#E5E7EB' },
  unitChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitChipText: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  unitChipTextActive: { color: '#FFF' },
});
