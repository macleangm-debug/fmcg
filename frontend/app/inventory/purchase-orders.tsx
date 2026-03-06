import React, { useState, useEffect, memo, useCallback } from 'react';
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
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Layout is handled by _layout.tsx - no need to import InventorySidebarLayout here
import WebModal from '../../src/components/WebModal';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
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

// Date Picker Modal Component
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Units of measure for products
const UNITS_OF_MEASURE = [
  { code: 'pcs', name: 'Pieces' },
  { code: 'kg', name: 'Kilograms' },
  { code: 'g', name: 'Grams' },
  { code: 'l', name: 'Liters' },
  { code: 'ml', name: 'Milliliters' },
  { code: 'm', name: 'Meters' },
  { code: 'box', name: 'Box' },
  { code: 'pack', name: 'Pack' },
];

interface DatePickerModalProps {
  visible: boolean;
  initialDate: Date;
  onApply: (date: Date) => void;
  onCancel: () => void;
  title?: string;
}

const DatePickerModal = memo(({ visible, initialDate, onApply, onCancel, title = 'Select Date' }: DatePickerModalProps) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate);
      setViewDate(initialDate);
    }
  }, [visible, initialDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatDisplayDate = (date: Date) => {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={datePickerStyles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isSelected = selectedDate.toDateString() === cellDate.toDateString();
      const isToday = new Date().toDateString() === cellDate.toDateString();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            datePickerStyles.dayCell,
            isSelected && datePickerStyles.dayCellSelected,
            isToday && !isSelected && datePickerStyles.dayCellToday,
          ]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[
            datePickerStyles.dayText,
            isSelected && datePickerStyles.dayTextSelected,
            isToday && !isSelected && datePickerStyles.dayTextToday,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={datePickerStyles.overlay}>
        <View style={datePickerStyles.modal}>
          <View style={datePickerStyles.header}>
            <Text style={datePickerStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <View style={datePickerStyles.selectedDisplay}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={datePickerStyles.selectedText}>{formatDisplayDate(selectedDate)}</Text>
          </View>

          <View style={datePickerStyles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={datePickerStyles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={COLORS.dark} />
            </TouchableOpacity>
            <Text style={datePickerStyles.monthText}>
              {FULL_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth(1)} style={datePickerStyles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <View style={datePickerStyles.weekHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={datePickerStyles.weekDay}>{day}</Text>
            ))}
          </View>

          <View style={datePickerStyles.calendar}>
            {renderCalendar()}
          </View>

          <View style={datePickerStyles.actions}>
            <TouchableOpacity style={datePickerStyles.cancelBtn} onPress={onCancel}>
              <Text style={datePickerStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={datePickerStyles.applyBtn} onPress={() => onApply(selectedDate)}>
              <Text style={datePickerStyles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const datePickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: 340, maxWidth: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  selectedDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 10, marginBottom: 16 },
  selectedText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDay: { width: 40, textAlign: 'center', fontSize: 12, fontWeight: '600', color: COLORS.gray },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 20 },
  dayCellToday: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 20 },
  dayText: { fontSize: 14, color: COLORS.dark },
  dayTextSelected: { color: COLORS.white, fontWeight: '600' },
  dayTextToday: { color: COLORS.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  applyBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 10 },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  supplier_id: string;
  status: 'draft' | 'submitted' | 'sent' | 'partial' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  total: number;
  total_items?: number;
  received_items?: number;
  created_at: string;
  expected_date: string;
  notes: string;
}

interface PurchaseOrderItem {
  item_id?: string;
  product_id?: string;
  item_name?: string;
  product_name?: string;
  sku?: string;
  ordered_qty?: number;
  quantity?: number;
  unit_cost: number;
  received_qty: number;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  current_stock: number;
  reorder_level: number;
}

export default function PurchaseOrdersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const isMobile = width < 600;
  
  // View settings store for Card/Table toggle
  const { purchaseOrdersView, setPurchaseOrdersView } = useViewSettingsStore();

  // Data state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    try {
      const [posRes, suppliersRes, itemsRes] = await Promise.all([
        api.get('/inventory/purchase-orders'),
        api.get('/inventory/suppliers'),
        api.get('/inventory/items'),
      ]);
      
      setPurchaseOrders(posRes.data || []);
      setSuppliers(suppliersRes.data || []);
      
      // Map inventory items to Product format
      const items = (itemsRes.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        cost_price: item.cost_price || 0,
        current_stock: item.quantity || 0,
        reorder_level: item.min_quantity || 10,
      }));
      setInventoryItems(items);
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

  // New PO form state
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: string; unit_cost: string }[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ product_id: '', quantity: '10', unit_cost: '' });
  
  // Search states for modal
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [showInlineSupplierForm, setShowInlineSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showInlineProductForm, setShowInlineProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expectedDate, setExpectedDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now

  // New product form state (complete form)
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductSellingPrice, setNewProductSellingPrice] = useState('');
  const [newProductTaxRate, setNewProductTaxRate] = useState('0');
  const [newProductReorderLevel, setNewProductReorderLevel] = useState('10');
  const [newProductUnit, setNewProductUnit] = useState('pcs');

  // Filtered suppliers based on search
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes((supplierSearch || '').toLowerCase()) ||
    (s.email || '').toLowerCase().includes((supplierSearch || '').toLowerCase())
  );

  // Filtered products based on search
  const filteredProducts = inventoryItems.filter(p =>
    p.name.toLowerCase().includes((productSearch || '').toLowerCase()) ||
    p.sku.toLowerCase().includes((productSearch || '').toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { bg: COLORS.lightGray, text: COLORS.gray };
      case 'submitted': return { bg: COLORS.blueLight, text: COLORS.blue };
      case 'sent': return { bg: COLORS.blueLight, text: COLORS.blue }; // Legacy support
      case 'partial': return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'received': return { bg: COLORS.successLight, text: COLORS.success };
      case 'cancelled': return { bg: COLORS.dangerLight, text: COLORS.danger };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const filteredOrders = purchaseOrders.filter(po => {
    const matchesStatus = filterStatus === 'all' || po.status === filterStatus;
    const matchesSearch = po.po_number.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         po.supplier.toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleAddItem = () => {
    if (!newItem.product_id) {
      Alert.alert('Error', 'Please select a product');
      return;
    }
    const product = inventoryItems.find(p => p.id === newItem.product_id);
    if (product) {
      setOrderItems([...orderItems, {
        product_id: newItem.product_id,
        quantity: newItem.quantity || '10',
        unit_cost: newItem.unit_cost || String(product.cost_price),
      }]);
      setNewItem({ product_id: '', quantity: '10', unit_cost: '' });
      setShowAddItem(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async () => {
    if (!formData.supplier_id) {
      Alert.alert('Error', 'Please select a supplier');
      return;
    }
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const poData = {
        supplier_id: formData.supplier_id,
        expected_date: formData.expected_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: formData.notes,
        items: orderItems.map(item => {
          const product = inventoryItems.find(p => p.id === item.product_id);
          return {
            item_id: item.product_id,
            item_name: product?.name || '',
            sku: product?.sku || '',
            ordered_qty: parseInt(item.quantity),
            unit_cost: parseFloat(item.unit_cost),
            received_qty: 0,
          };
        }),
      };

      await api.post('/inventory/purchase-orders', poData);
      await fetchData(); // Refresh the list
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Purchase Order created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to create Purchase Order');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ supplier_id: '', expected_date: '', notes: '' });
    setOrderItems([]);
    setNewItem({ product_id: '', quantity: '10', unit_cost: '' });
    setShowAddItem(false);
    setSupplierSearch('');
    setProductSearch('');
    setShowAllSuppliers(false);
    setShowInlineSupplierForm(false);
    setNewSupplierName('');
    setNewSupplierEmail('');
    setShowSupplierDropdown(false);
    setShowProductDropdown(false);
    setShowInlineProductForm(false);
    setNewProductName('');
    setNewProductPrice('');
    setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setShowDatePicker(false);
    // Reset new product form fields
    setNewProductDescription('');
    setNewProductSku('');
    setNewProductBarcode('');
    setNewProductSellingPrice('');
    setNewProductTaxRate('0');
    setNewProductReorderLevel('10');
    setNewProductUnit('pcs');
  };

  const resetNewProductForm = () => {
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDescription('');
    setNewProductSku('');
    setNewProductBarcode('');
    setNewProductSellingPrice('');
    setNewProductTaxRate('0');
    setNewProductReorderLevel('10');
    setNewProductUnit('pcs');
    setShowInlineProductForm(false);
  };

  const handleSendPO = async (po: PurchaseOrder) => {
    try {
      await api.post(`/inventory/purchase-orders/${po.id}/submit`);
      await fetchData();
      Alert.alert('Success', `${po.po_number} has been submitted`);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to submit Purchase Order');
    }
  };

  const handleCancelPO = async (po: PurchaseOrder) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel ${po.po_number}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/inventory/purchase-orders/${po.id}`, { status: 'cancelled' });
              await fetchData();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.detail || 'Failed to cancel Purchase Order');
            }
          }
        },
      ]
    );
  };

  const handleDeletePO = async (po: PurchaseOrder) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete ${po.po_number}? This cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventory/purchase-orders/${po.id}`);
              await fetchData();
              Alert.alert('Success', 'Purchase Order deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.detail || 'Failed to delete Purchase Order');
            }
          }
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(p => p.status === 'submitted' || p.status === 'sent' || p.status === 'partial').length,
    totalValue: purchaseOrders.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.total || 0), 0),
  };

  // Table Header Component
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>PO NUMBER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SUPPLIER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ITEMS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>DATE</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>ACTIONS</Text>
    </View>
  );

  // Table Row Component
  const renderTableRow = (po: PurchaseOrder) => (
    <TouchableOpacity 
      key={po.id} 
      style={styles.tableRow}
      onPress={() => { setSelectedPO(po); setShowViewModal(true); }}
    >
      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>{po.po_number}</Text>
      <Text style={[styles.tableCell, { flex: 2 }]}>{po.supplier}</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>{po.items.length} items</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(po.expected_date)}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(po.total)}</Text>
      <View style={{ flex: 1 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(po.status).bg, alignSelf: 'flex-start' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(po.status).text }]}>
            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={{ flex: 0.5, flexDirection: 'row', gap: 8 }}>
        {po.status === 'draft' && (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleSendPO(po); }}>
            <Ionicons name="send-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {(po.status === 'draft' || po.status === 'sent') && (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleCancelPO(po); }}>
            <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // Card View Component
  const renderCard = (po: PurchaseOrder) => (
    <TouchableOpacity 
      key={po.id} 
      style={[styles.orderCard, isWeb && styles.orderCardGrid]}
      onPress={() => { setSelectedPO(po); setShowViewModal(true); }}
    >
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNumber}>{po.po_number}</Text>
          <Text style={styles.orderSupplier}>{po.supplier}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(po.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusColor(po.status).text }]}>
            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.orderMeta}>
        <View style={styles.orderMetaItem}>
          <Ionicons name="cube-outline" size={14} color={COLORS.gray} />
          <Text style={styles.orderMetaText}>{po.items.length} items</Text>
        </View>
        <View style={styles.orderMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
          <Text style={styles.orderMetaText}>{formatDate(po.expected_date)}</Text>
        </View>
        <Text style={styles.orderTotal}>{formatCurrency(po.total)}</Text>
      </View>
      {po.status === 'draft' && (
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={(e) => { e.stopPropagation(); handleSendPO(po); }}
          >
            <Ionicons name="send" size={14} color={COLORS.primary} />
            <Text style={styles.actionBtnPrimaryText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={(e) => { e.stopPropagation(); handleCancelPO(po); }}
          >
            <Ionicons name="close" size={14} color={COLORS.danger} />
            <Text style={styles.actionBtnDangerText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderContent = () => (
    <View style={styles.content}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Purchase Orders</Text>
          <Text style={styles.pageSubtitle}>{stats.total} orders • {stats.pending} pending</Text>
        </View>
        <View style={styles.headerActions}>
          {isWeb && (
            <ViewToggle
              currentView={purchaseOrdersView}
              onToggle={setPurchaseOrdersView}
            />
          )}
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Order</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.blueLight }]}>
          <Ionicons name="document-text" size={24} color={COLORS.blue} />
          <Text style={[styles.summaryValue, { color: COLORS.blue }]}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="time" size={24} color={COLORS.warning} />
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{stats.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="cash" size={24} color={COLORS.success} />
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(stats.totalValue)}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filterPills}>
          {['all', 'draft', 'sent', 'partial', 'received', 'cancelled'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterPill, filterStatus === status && styles.filterPillActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterPillText, filterStatus === status && styles.filterPillTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Orders List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Loading purchase orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>No Purchase Orders</Text>
            <Text style={styles.emptySubtitle}>Create your first purchase order to get started</Text>
          </View>
        ) : isWeb && purchaseOrdersView === 'table' ? (
          // Table View
          <>
            <TableHeader />
            {filteredOrders.map(po => renderTableRow(po))}
          </>
        ) : (
          // Card/Grid View
          <View style={isWeb ? styles.cardsGrid : undefined}>
            {filteredOrders.map(po => renderCard(po))}
          </View>
        )}
      </ScrollView>

      {/* Create PO Modal */}
      <WebModal
        visible={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create Purchase Order"
        subtitle="Order products from suppliers"
        icon="document-text"
        iconColor={COLORS.primary}
        maxWidth={600}
      >
        {/* Supplier Selection with Search & Inline Create */}
        <Text style={styles.inputLabel}>Supplier *</Text>
        
        {/* Search Input with Dropdown */}
        <View style={styles.inlineSearchContainer}>
          <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inlineSearchInput}
            placeholder="Search suppliers..."
            value={supplierSearch}
            onChangeText={(text) => {
              setSupplierSearch(text);
              setShowSupplierDropdown(true);
            }}
            onFocus={() => setShowSupplierDropdown(true)}
            placeholderTextColor={COLORS.gray}
          />
          {supplierSearch.length > 0 && (
            <TouchableOpacity onPress={() => { setSupplierSearch(''); setFormData({ ...formData, supplier_id: '' }); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Supplier Dropdown */}
        {showSupplierDropdown && supplierSearch.length > 0 && !showInlineSupplierForm && (
          <View style={styles.inlineDropdown}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {filteredSuppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  style={styles.inlineDropdownItem}
                  onPress={() => {
                    setFormData({ ...formData, supplier_id: supplier.id });
                    setSupplierSearch(supplier.name);
                    setShowSupplierDropdown(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inlineDropdownItemText}>{supplier.name}</Text>
                    <Text style={styles.inlineDropdownItemSub}>{supplier.email}</Text>
                  </View>
                  {formData.supplier_id === supplier.id ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {/* Create New Supplier Option */}
              {supplierSearch && supplierSearch.length > 0 && !filteredSuppliers.some(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
                <TouchableOpacity
                  style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
                  onPress={() => {
                    setNewSupplierName(supplierSearch);
                    setShowSupplierDropdown(false);
                    setShowInlineSupplierForm(true);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color={COLORS.success} />
                  <Text style={styles.inlineCreateText}>Create "{supplierSearch}"</Text>
                </TouchableOpacity>
              )}
              {filteredSuppliers.length === 0 && (
                <Text style={styles.noResultsText}>No suppliers found</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Inline Supplier Creation Form */}
        {showInlineSupplierForm && (
          <View style={styles.inlineCategoryForm}>
            <View style={styles.inlineCategoryHeader}>
              <Text style={styles.inlineCategoryTitle}>Create New Supplier</Text>
              <TouchableOpacity onPress={() => { setShowInlineSupplierForm(false); setNewSupplierName(''); setNewSupplierEmail(''); }}>
                <Ionicons name="close" size={20} color="#166534" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inlineCategoryField}>
              <Text style={styles.inlineCategoryLabel}>Name *</Text>
              <TextInput
                style={styles.inlineCategoryInput}
                placeholder="Supplier name"
                value={newSupplierName}
                onChangeText={setNewSupplierName}
                autoFocus
              />
            </View>
            <View style={styles.inlineCategoryField}>
              <Text style={styles.inlineCategoryLabel}>Email</Text>
              <TextInput
                style={styles.inlineCategoryInput}
                placeholder="supplier@email.com"
                value={newSupplierEmail}
                onChangeText={setNewSupplierEmail}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inlineCategoryButtons}>
              <TouchableOpacity
                style={styles.inlineCategoryCancelBtn}
                onPress={() => { setShowInlineSupplierForm(false); setNewSupplierName(''); setNewSupplierEmail(''); }}
              >
                <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inlineCategorySaveBtn, !newSupplierName.trim() && styles.inlineCategorySaveBtnDisabled]}
                onPress={() => {
                  if (newSupplierName.trim()) {
                    // Mock: Add supplier and select it
                    const newId = `supplier_${Date.now()}`;
                    setFormData({ ...formData, supplier_id: newId });
                    setSupplierSearch(newSupplierName);
                    Alert.alert('Success', `Supplier "${newSupplierName}" created and selected`);
                    setShowInlineSupplierForm(false);
                    setNewSupplierName('');
                    setNewSupplierEmail('');
                  }
                }}
                disabled={!newSupplierName.trim()}
              >
                <Text style={styles.inlineCategorySaveText}>Create & Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selected Supplier Display */}
        {formData.supplier_id && !showInlineSupplierForm && (
          <View style={styles.selectedItemBadge}>
            <Ionicons name="business" size={16} color={COLORS.success} />
            <Text style={styles.selectedItemText}>
              {mockSuppliers.find(s => s.id === formData.supplier_id)?.name || supplierSearch}
            </Text>
            <TouchableOpacity onPress={() => { setFormData({ ...formData, supplier_id: '' }); setSupplierSearch(''); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        )}

        {/* Two Column Layout for Date and Reference */}
        <View style={isWeb ? styles.row : styles.column}>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Text style={styles.inputLabel}>Expected Delivery Date</Text>
            <TouchableOpacity 
              style={styles.datePickerTrigger}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.datePickerText}>
                {MONTHS[expectedDate.getMonth()]} {expectedDate.getDate()}, {expectedDate.getFullYear()}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Input
              label="Reference Number"
              placeholder="Optional"
              value=""
              onChangeText={() => {}}
            />
          </View>
        </View>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          initialDate={expectedDate}
          onApply={(date) => {
            setExpectedDate(date);
            setFormData({ ...formData, expected_date: date.toISOString().split('T')[0] });
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          title="Expected Delivery Date"
        />

        {/* Order Items Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.inputLabel}>Order Items *</Text>
          {!showAddItem && (
            <TouchableOpacity 
              style={styles.addItemBtn}
              onPress={() => setShowAddItem(true)}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addItemBtnText}>Add Item</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items List */}
        {orderItems.length > 0 && (
          <View style={styles.itemsList}>
            {orderItems.map((item, index) => {
              const product = mockProducts.find(p => p.id === item.product_id);
              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{product?.name}</Text>
                    <Text style={styles.itemSku}>{product?.sku}</Text>
                  </View>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemCost}>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unit_cost))}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {orderItems.length === 0 && !showAddItem && (
          <TouchableOpacity style={styles.noItems} onPress={() => setShowAddItem(true)}>
            <Ionicons name="cube-outline" size={32} color={COLORS.lightGray} />
            <Text style={styles.noItemsText}>No items added yet. Tap to add products.</Text>
          </TouchableOpacity>
        )}

        {/* Inline Add Item Form */}
        {showAddItem && (
          <View style={styles.addItemForm}>
            <View style={styles.inlineCategoryHeader}>
              <Text style={styles.inlineCategoryTitle}>Add Product to Order</Text>
              <TouchableOpacity onPress={() => { setShowAddItem(false); setNewItem({ product_id: '', quantity: '10', unit_cost: '' }); setProductSearch(''); setShowProductDropdown(false); setShowInlineProductForm(false); }}>
                <Ionicons name="close" size={20} color="#166534" />
              </TouchableOpacity>
            </View>
            
            {/* Product Search with Dropdown */}
            {!showInlineProductForm && (
              <>
                <View style={styles.inlineSearchContainer}>
                  <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inlineSearchInput}
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChangeText={(text) => {
                      setProductSearch(text);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholderTextColor={COLORS.gray}
                  />
                  {productSearch.length > 0 && (
                    <TouchableOpacity onPress={() => { setProductSearch(''); setNewItem({ ...newItem, product_id: '', unit_cost: '' }); }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Product Dropdown */}
                {showProductDropdown && productSearch.length > 0 && (
                  <View style={styles.inlineDropdown}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {filteredProducts.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.inlineDropdownItem}
                          onPress={() => {
                            setNewItem({ 
                              ...newItem, 
                              product_id: product.id, 
                              unit_cost: String(product.cost_price) 
                            });
                            setProductSearch(product.name);
                            setShowProductDropdown(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.inlineDropdownItemText}>{product.name}</Text>
                            <Text style={styles.inlineDropdownItemSub}>{product.sku} • Stock: {product.current_stock} • {formatCurrency(product.cost_price)}</Text>
                          </View>
                          {product.current_stock < product.reorder_level ? (
                            <View style={styles.lowStockTag}>
                              <Text style={styles.lowStockTagText}>Low</Text>
                            </View>
                          ) : (
                            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                      {/* Create New Product Option */}
                      {productSearch && productSearch.length > 0 && !filteredProducts.some(p => p.name.toLowerCase() === productSearch.toLowerCase()) && (
                        <TouchableOpacity
                          style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
                          onPress={() => {
                            setNewProductName(productSearch);
                            setShowProductDropdown(false);
                            setShowInlineProductForm(true);
                          }}
                        >
                          <Ionicons name="add-circle" size={20} color={COLORS.success} />
                          <Text style={styles.inlineCreateText}>Create "{productSearch}"</Text>
                        </TouchableOpacity>
                      )}
                      {filteredProducts.length === 0 && (
                        <Text style={styles.noResultsText}>No products found</Text>
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Selected Product Display */}
                {newItem.product_id && (
                  <View style={styles.selectedItemBadge}>
                    <Ionicons name="cube" size={16} color={COLORS.success} />
                    <Text style={styles.selectedItemText}>
                      {mockProducts.find(p => p.id === newItem.product_id)?.name || productSearch}
                    </Text>
                    <TouchableOpacity onPress={() => { setNewItem({ ...newItem, product_id: '', unit_cost: '' }); setProductSearch(''); }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Inline Product Creation Form - Complete Form */}
            {showInlineProductForm && (
              <View style={styles.inlineProductForm}>
                <View style={styles.inlineProductHeader}>
                  <View>
                    <Text style={styles.inlineProductTitle}>Create New Product</Text>
                    <Text style={styles.inlineProductSubtitle}>Add product to your inventory catalog</Text>
                  </View>
                  <TouchableOpacity onPress={resetNewProductForm}>
                    <Ionicons name="close" size={24} color="#166534" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {/* Product Name */}
                  <View style={styles.inlineProductField}>
                    <Text style={styles.inlineProductLabel}>Product Name *</Text>
                    <TextInput
                      style={styles.inlineProductInput}
                      placeholder="Enter product name"
                      value={newProductName}
                      onChangeText={setNewProductName}
                      autoFocus
                    />
                  </View>

                  {/* Description */}
                  <View style={styles.inlineProductField}>
                    <Text style={styles.inlineProductLabel}>Description</Text>
                    <TextInput
                      style={[styles.inlineProductInput, { minHeight: 60 }]}
                      placeholder="Enter product description (optional)"
                      value={newProductDescription}
                      onChangeText={setNewProductDescription}
                      multiline
                    />
                  </View>

                  {/* Price & Cost Price Row */}
                  <View style={styles.inlineProductRow}>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>Selling Price *</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="0.00"
                        value={newProductSellingPrice}
                        onChangeText={setNewProductSellingPrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>Cost Price *</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="0.00"
                        value={newProductPrice}
                        onChangeText={setNewProductPrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* SKU & Barcode Row */}
                  <View style={styles.inlineProductRow}>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>SKU *</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="PROD-001"
                        value={newProductSku}
                        onChangeText={setNewProductSku}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>Barcode</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="Optional"
                        value={newProductBarcode}
                        onChangeText={setNewProductBarcode}
                      />
                    </View>
                  </View>

                  {/* Tax Rate & Reorder Level Row */}
                  <View style={styles.inlineProductRow}>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>Tax Rate (%)</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="0"
                        value={newProductTaxRate}
                        onChangeText={setNewProductTaxRate}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.inlineProductHalf}>
                      <Text style={styles.inlineProductLabel}>Reorder Level</Text>
                      <TextInput
                        style={styles.inlineProductInput}
                        placeholder="10"
                        value={newProductReorderLevel}
                        onChangeText={setNewProductReorderLevel}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Unit of Measure */}
                  <View style={styles.inlineProductField}>
                    <Text style={styles.inlineProductLabel}>Unit of Measure</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.unitPicker}>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <TouchableOpacity
                            key={unit.code}
                            style={[
                              styles.unitChip,
                              newProductUnit === unit.code && styles.unitChipActive
                            ]}
                            onPress={() => setNewProductUnit(unit.code)}
                          >
                            <Text style={[
                              styles.unitChipText,
                              newProductUnit === unit.code && styles.unitChipTextActive
                            ]}>
                              {unit.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.inlineProductButtons}>
                  <TouchableOpacity
                    style={styles.inlineProductCancelBtn}
                    onPress={resetNewProductForm}
                  >
                    <Text style={styles.inlineProductCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.inlineProductSaveBtn, 
                      (!newProductName.trim() || !newProductPrice.trim() || !newProductSku.trim() || !newProductSellingPrice.trim()) && styles.inlineProductSaveBtnDisabled
                    ]}
                    onPress={() => {
                      if (newProductName.trim() && newProductPrice.trim() && newProductSku.trim() && newProductSellingPrice.trim()) {
                        // Mock: Create product and select it
                        const newId = `product_${Date.now()}`;
                        setNewItem({ 
                          ...newItem, 
                          product_id: newId, 
                          unit_cost: newProductPrice 
                        });
                        setProductSearch(newProductName);
                        Alert.alert('Success', `Product "${newProductName}" created and selected`);
                        resetNewProductForm();
                      }
                    }}
                    disabled={!newProductName.trim() || !newProductPrice.trim() || !newProductSku.trim() || !newProductSellingPrice.trim()}
                  >
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    <Text style={styles.inlineProductSaveText}>Create & Select</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Quantity and Cost Inputs */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Quantity"
                  placeholder="10"
                  value={newItem.quantity}
                  onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Unit Cost"
                  placeholder="0.00"
                  value={newItem.unit_cost}
                  onChangeText={(text) => setNewItem({ ...newItem, unit_cost: text })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            
            <View style={styles.inlineFormButtons}>
              <TouchableOpacity 
                style={styles.inlineFormCancelBtn}
                onPress={() => { setShowAddItem(false); setNewItem({ product_id: '', quantity: '10', unit_cost: '' }); setProductSearch(''); }}
              >
                <Text style={styles.inlineFormCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inlineFormSaveBtn} onPress={handleAddItem}>
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.inlineFormSaveText}>Add to Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Total */}
        {orderItems.length > 0 && (
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(orderItems.reduce((sum, i) => sum + (parseFloat(i.quantity) * parseFloat(i.unit_cost)), 0))}
            </Text>
          </View>
        )}

        <Input
          label="Notes (Optional)"
          placeholder="Add notes about this order..."
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.formActions}>
          <Button
            title="Cancel"
            onPress={() => { setShowCreateModal(false); resetForm(); }}
            variant="outline"
            style={{ flex: 1 }}
            disabled={saving}
          />
          <Button
            title={saving ? "Creating..." : "Create Order"}
            onPress={handleCreatePO}
            style={{ flex: 1 }}
            disabled={saving}
          />
        </View>
      </WebModal>

      {/* View PO Modal */}
      <WebModal
        visible={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={selectedPO?.po_number || ''}
        subtitle={selectedPO?.supplier}
        icon="document-text"
        iconColor={COLORS.blue}
        maxWidth={500}
      >
        {selectedPO && (
          <>
            <View style={styles.viewSection}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPO.status).bg, alignSelf: 'flex-start' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(selectedPO.status).text }]}>
                  {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.viewRow}>
              <View style={styles.viewItem}>
                <Text style={styles.viewLabel}>Created</Text>
                <Text style={styles.viewValue}>{formatDate(selectedPO.created_at)}</Text>
              </View>
              <View style={styles.viewItem}>
                <Text style={styles.viewLabel}>Expected</Text>
                <Text style={styles.viewValue}>{formatDate(selectedPO.expected_date)}</Text>
              </View>
            </View>

            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Items</Text>
              {selectedPO.items.map((item, idx) => (
                <View key={idx} style={styles.viewItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewItemName}>{item.product_name}</Text>
                    <Text style={styles.viewItemQty}>{item.received_qty}/{item.quantity} received</Text>
                  </View>
                  <Text style={styles.viewItemTotal}>{formatCurrency(item.quantity * item.unit_cost)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(selectedPO.total)}</Text>
            </View>

            {selectedPO.notes && (
              <View style={styles.viewSection}>
                <Text style={styles.viewLabel}>Notes</Text>
                <Text style={styles.viewNotes}>{selectedPO.notes}</Text>
              </View>
            )}

            <View style={styles.formActions}>
              {selectedPO.status === 'draft' && (
                <>
                  <Button
                    title="Cancel Order"
                    onPress={() => { handleCancelPO(selectedPO); setShowViewModal(false); }}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Send to Supplier"
                    onPress={() => { handleSendPO(selectedPO); setShowViewModal(false); }}
                    style={{ flex: 1 }}
                  />
                </>
              )}
              {(selectedPO.status === 'sent' || selectedPO.status === 'partial') && (
                <Button
                  title="Receive Goods"
                  onPress={() => { setShowViewModal(false); router.push('/inventory/receiving'); }}
                  style={{ flex: 1 }}
                />
              )}
              {(selectedPO.status === 'received' || selectedPO.status === 'cancelled') && (
                <Button
                  title="Close"
                  onPress={() => setShowViewModal(false)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
              )}
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
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {renderContent()}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },

  // Summary Cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryRowMobile: { flexDirection: 'column' },
  summaryCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: COLORS.gray },

  // Search & Filters
  searchRow: { marginBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.dark },
  filtersScroll: { marginBottom: 16 },
  filterPills: { flexDirection: 'row', gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  filterPillTextActive: { color: COLORS.white },

  // Orders List
  listContainer: { gap: 12 },
  orderCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  orderSupplier: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  orderMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderMetaText: { fontSize: 13, color: COLORS.gray },
  orderTotal: { marginLeft: 'auto', fontSize: 16, fontWeight: '700', color: COLORS.dark },
  orderActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnPrimary: { backgroundColor: COLORS.primaryLight },
  actionBtnPrimaryText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  actionBtnDanger: { backgroundColor: COLORS.dangerLight },
  actionBtnDangerText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },

  // Form
  formSection: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  // Supplier Options
  supplierOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  supplierOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  supplierOptionActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  supplierOptionText: { fontSize: 14, color: COLORS.dark },
  supplierOptionTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Items
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  addItemBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  noItems: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  noItemsText: { fontSize: 13, color: COLORS.gray, marginTop: 8 },
  itemsList: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  itemSku: { fontSize: 12, color: COLORS.gray },
  itemQty: { fontSize: 14, color: COLORS.gray },
  itemCost: { fontSize: 14, fontWeight: '600', color: COLORS.dark, minWidth: 70, textAlign: 'right' },
  removeBtn: { padding: 4 },

  // Add Item Form
  addItemForm: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  addItemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 12 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  productOption: { width: '48%', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  productOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  productOptionName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  productOptionNameActive: { color: COLORS.primary },
  productOptionSku: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  productOptionPrice: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  lowStockTag: { backgroundColor: COLORS.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  lowStockTagText: { fontSize: 10, color: COLORS.danger, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', gap: 12 },
  addItemActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelItemBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8 },
  cancelItemBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  confirmItemBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 8, gap: 6 },
  confirmItemBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Total
  totalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 16, borderTopWidth: 2, borderTopColor: '#E5E7EB', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  totalValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },

  // Form Actions
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },

  // View Modal
  viewSection: { marginBottom: 16 },
  viewRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  viewItem: { flex: 1 },
  viewLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 4 },
  viewValue: { fontSize: 15, color: COLORS.dark },
  viewSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  viewItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  viewItemName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  viewItemQty: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  viewItemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  viewNotes: { fontSize: 14, color: COLORS.gray, lineHeight: 20 },

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
  // Override orderCard width for grid
  orderCardGrid: {
    width: 'calc(33.333% - 11px)',
    minWidth: 280,
  },

  // New Modal Styles - Standard Form Pattern
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  
  // Inline Form (for adding new supplier/product)
  inlineForm: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary },
  inlineFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inlineFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  inlineFormButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  inlineFormCancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8 },
  inlineFormCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  inlineFormSaveBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 8, gap: 6 },
  inlineFormSaveText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Empty Select Box
  emptySelectBox: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', marginBottom: 16 },
  emptySelectText: { fontSize: 13, color: COLORS.gray, marginTop: 8, textAlign: 'center' },

  // Search Select Container
  searchSelectContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  searchSelectInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.dark },

  // Select Header Row
  selectHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  selectHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectCountText: { fontSize: 12, color: COLORS.gray },
  browseAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: COLORS.primaryLight },
  browseAllButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Select Options
  selectScroll: { marginBottom: 16 },
  selectGridScroll: { maxHeight: 200, marginBottom: 16 },
  selectRow: { flexDirection: 'row', gap: 8 },
  selectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  selectOptionActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  selectOptionGrid: { width: 'calc(50% - 4px)' },
  selectOptionText: { fontSize: 14, color: COLORS.dark },
  selectOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
  addNewOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', gap: 4 },
  addNewOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Two Column Layout
  row: { flexDirection: 'row', gap: 16 },
  column: { flexDirection: 'column' },
  halfField: { flex: 1 },
  fullField: { width: '100%' },

  // Product List in Add Item Form
  selectHint: { fontSize: 12, color: COLORS.gray, marginBottom: 8 },
  productListScroll: { maxHeight: 200, marginBottom: 16 },
  productList: { gap: 8 },
  productListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  productListItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  productListItemInfo: { flex: 1 },
  productListItemName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  productListItemNameActive: { color: COLORS.primary },
  productListItemSku: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  productListItemRight: { alignItems: 'flex-end' },
  productListItemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Inline Search & Dropdown (matching invoice list pattern)
  inlineSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  inlineSearchInput: { flex: 1, fontSize: 14, color: COLORS.dark, outlineStyle: 'none' },
  inlineDropdown: { backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, overflow: 'hidden' },
  inlineDropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  inlineDropdownItemText: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  inlineDropdownItemSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  inlineCreateItem: { backgroundColor: '#F0FDF4' },
  inlineCreateText: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  noResultsText: { padding: 16, textAlign: 'center', color: COLORS.gray, fontSize: 14 },

  // Inline Category Form (for creating new items)
  inlineCategoryForm: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.success },
  inlineCategoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inlineCategoryTitle: { fontSize: 15, fontWeight: '600', color: '#166534' },
  inlineCategoryField: { marginBottom: 12 },
  inlineCategoryLabel: { fontSize: 13, fontWeight: '600', color: '#166534', marginBottom: 6 },
  inlineCategoryInput: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark, outlineStyle: 'none' },
  inlineCategoryButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  inlineCategoryCancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8 },
  inlineCategoryCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  inlineCategorySaveBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.success, borderRadius: 8 },
  inlineCategorySaveBtnDisabled: { backgroundColor: '#D1D5DB' },
  inlineCategorySaveText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Selected Item Badge
  selectedItemBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0FDF4', borderRadius: 8, marginBottom: 16 },
  selectedItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.success },

  // Date Picker Trigger
  datePickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  datePickerText: { flex: 1, fontSize: 15, color: COLORS.dark, fontWeight: '500' },

  // Inline Product Form (Complete Form)
  inlineProductForm: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: COLORS.success },
  inlineProductHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#BBF7D0' },
  inlineProductTitle: { fontSize: 18, fontWeight: '700', color: '#166534' },
  inlineProductSubtitle: { fontSize: 13, color: '#15803D', marginTop: 4 },
  inlineProductField: { marginBottom: 14 },
  inlineProductLabel: { fontSize: 13, fontWeight: '600', color: '#166534', marginBottom: 6 },
  inlineProductInput: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark },
  inlineProductRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  inlineProductHalf: { flex: 1 },
  inlineProductButtons: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#BBF7D0' },
  inlineProductCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 10 },
  inlineProductCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  inlineProductSaveBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 10, gap: 6 },
  inlineProductSaveBtnDisabled: { backgroundColor: '#9CA3AF' },
  inlineProductSaveText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Unit Picker
  unitPicker: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E5E7EB' },
  unitChipActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  unitChipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  unitChipTextActive: { color: COLORS.white },
});
