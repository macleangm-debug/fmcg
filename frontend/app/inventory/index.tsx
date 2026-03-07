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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import WebModal from '../../src/components/WebModal';
import ImportExportModal from '../../src/components/ImportExportModal';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { ProductDashboard } from '../../src/components/dashboard';
import { Advert } from '../../src/components/AdvertCarousel';
import InventoryQuickStartWizard from '../../src/components/setup/InventoryQuickStartWizard';
import InventoryQuickStartPanel from '../../src/components/setup/InventoryQuickStartPanel';
import api from '../../src/api/client';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';

const COLORS = {
  primary: '#059669', // Green for Inventory
  primaryLight: '#D1FAE5',
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
  cyan: '#06B6D4',
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
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user, logout } = useAuthStore();
  const { formatCurrency, formatNumber, settings } = useBusinessStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Quick Start Wizard state
  const [showQuickStartWizard, setShowQuickStartWizard] = useState(false);
  const [hasSeenQuickStart, setHasSeenQuickStart] = useState(true); // Default true to avoid flash
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  
  // Chart data state
  const [chartData, setChartData] = useState<{
    category_stock: Array<{ name: string; count: number; value: number }>;
    movement_trend: Array<{ month: string; stock_in: number; stock_out: number }>;
  } | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
  
  // Product search for stock operations (both add & adjust)
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Add Modal mode: 'search' or 'create'
  const [addModalMode, setAddModalMode] = useState<'search' | 'create'>('search');
  
  // Inline product creation
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [prefillProductName, setPrefillProductName] = useState('');
  
  // Form states for new product
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQuantity, setNewQuantity] = useState('0');
  const [newMinQty, setNewMinQty] = useState('10');
  const [newCostPrice, setNewCostPrice] = useState('0');
  const [newLocation, setNewLocation] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  
  // Additional form states for full product form
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formBarcode, setFormBarcode] = useState('');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [hasVariants, setHasVariants] = useState(false);
  
  // Variant inputs state
  interface VariantInput {
    name: string;
    valuesText: string;
  }
  const [variantInputs, setVariantInputs] = useState<VariantInput[]>([]);
  
  // Add variant type
  const addVariantType = () => {
    setVariantInputs([...variantInputs, { name: '', valuesText: '' }]);
  };
  
  // Remove variant type
  const removeVariantType = (index: number) => {
    setVariantInputs(variantInputs.filter((_, i) => i !== index));
  };
  
  // Update variant input
  const updateVariantInput = (index: number, field: 'name' | 'valuesText', value: string) => {
    const updated = [...variantInputs];
    updated[index][field] = value;
    setVariantInputs(updated);
  };
  
  // Inline category creation
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineCategoryDescription, setInlineCategoryDescription] = useState('');
  
  // Inline UOM creation
  const [showInlineUomForm, setShowInlineUomForm] = useState(false);
  const [inlineUomName, setInlineUomName] = useState('');
  const [inlineUomCode, setInlineUomCode] = useState('');
  const [customUnits, setCustomUnits] = useState<{code: string; name: string}[]>([]);
  
  // Default Units of Measure options
  const DEFAULT_UNITS_OF_MEASURE = [
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
  
  // Combined units (default + custom)
  const UNITS_OF_MEASURE = [...DEFAULT_UNITS_OF_MEASURE, ...customUnits];
  
  // Handle adding new custom UOM
  const handleAddCustomUom = () => {
    if (!inlineUomName.trim()) {
      Alert.alert('Error', 'Please enter a unit name');
      return;
    }
    
    // Generate code from name if not provided
    const code = inlineUomCode.trim() || inlineUomName.toLowerCase().replace(/\s+/g, '_').substring(0, 10);
    
    // Check if code already exists
    if (UNITS_OF_MEASURE.some(u => u.code === code)) {
      Alert.alert('Error', 'A unit with this code already exists');
      return;
    }
    
    const newUnit = { code, name: inlineUomName.trim() };
    setCustomUnits([...customUnits, newUnit]);
    setNewUnit(code); // Auto-select the new unit
    setInlineUomName('');
    setInlineUomCode('');
    setShowInlineUomForm(false);
  };
  
  // Import/Export states
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  
  // Adjustment form
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustCostPrice, setAdjustCostPrice] = useState('');
  const [adjustSupplier, setAdjustSupplier] = useState('');
  
  // Confirm adjustment modal
  const [showConfirmAdjust, setShowConfirmAdjust] = useState(false);
  
  // Delete confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [productToDelete, setProductToDelete] = useState<InventoryItem | null>(null);

  // Pagination state for product list in modals
  const ITEMS_PER_PAGE = 10;
  const [modalProductPage, setModalProductPage] = useState(1);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  const fetchData = async () => {
    try {
      const [summaryRes, itemsRes, catsRes, movementsRes, chartRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get(`/inventory/items?status=${filterStatus}${searchQuery ? `&search=${searchQuery}` : ''}`),
        api.get('/inventory/categories'),
        api.get('/inventory/movements?limit=50'),
        api.get('/inventory/chart-data')
      ]);
      setSummary(summaryRes.data);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setMovements(movementsRes.data);
      setChartData(chartRes.data);
      
      // Fetch suppliers and locations count for Quick Start Panel
      try {
        const [suppliersRes, locationsRes] = await Promise.all([
          api.get('/inventory/suppliers'),
          api.get('/inventory/locations')
        ]);
        setSuppliersCount(suppliersRes.data?.length || 0);
        setLocationsCount(locationsRes.data?.length || 0);
      } catch (e) {
        // Ignore errors - these are optional for Quick Start
        console.log('Optional Quick Start data fetch failed:', e);
      }
    } catch (error) {
      console.log('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if user has seen Quick Start Wizard
  useEffect(() => {
    const checkQuickStart = async () => {
      try {
        const seen = await AsyncStorage.getItem('inventory_quickstart_seen');
        if (!seen) {
          setHasSeenQuickStart(false);
        }
      } catch (e) {
        console.log('Failed to check quick start status');
      }
    };
    checkQuickStart();
  }, []);

  // Show Quick Start Wizard for first-time users with empty inventory
  useEffect(() => {
    if (!loading && !hasSeenQuickStart && items.length === 0) {
      setShowQuickStartWizard(true);
    }
  }, [loading, hasSeenQuickStart, items.length]);

  const handleQuickStartComplete = async () => {
    try {
      await AsyncStorage.setItem('inventory_quickstart_seen', 'true');
      setHasSeenQuickStart(true);
      fetchData(); // Refresh data after quick start
    } catch (e) {
      console.log('Failed to save quick start status');
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

  // Handle openAdd parameter from URL (triggered by Add Stock button in tab bar)
  useEffect(() => {
    if (params.openAdd === 'true' && !loading) {
      openAddStockModal();
      // Clear the param after opening
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd, loading]);

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
    setProductSearchQuery('');
    setSearchResults([]);
    setShowProductSearch(false);
    setSelectedProduct(null);
    setAddModalMode('search');
    setModalProductPage(1); // Reset pagination
    // Reset additional form fields
    setFormDescription('');
    setFormPrice('0');
    setFormBarcode('');
    setFormTaxRate('0');
    setHasVariants(false);
    setVariantInputs([]); // Reset variant inputs
    setShowInlineCategoryForm(false);
    setInlineCategoryName('');
    setInlineCategoryDescription('');
  };

  // Open Add Stock modal - search first approach
  const openAddStockModal = () => {
    resetAddForm();
    setAdjustType('in');
    setAdjustQty('');
    setAdjustReason('');
    setModalProductPage(1); // Reset pagination
    setShowAddModal(true);
  };

  // Load more products for infinite scroll (mobile)
  const loadMoreProducts = () => {
    if (loadingMoreProducts) return;
    
    // Check if there are more items to load
    const allItems = productSearchQuery.length > 0 ? searchResults : items;
    const currentlyShowing = modalProductPage * ITEMS_PER_PAGE;
    if (currentlyShowing >= allItems.length) return; // No more items
    
    setLoadingMoreProducts(true);
    setTimeout(() => {
      setModalProductPage(prev => prev + 1);
      setLoadingMoreProducts(false);
    }, 300);
  };

  // Handle scroll end for infinite scroll - with debounce
  const handleProductListScroll = (event: any) => {
    if (isWeb || loadingMoreProducts) return; // Only for mobile, and not while loading
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
    
    // Check if there are more items before triggering load
    const allItems = productSearchQuery.length > 0 ? searchResults : items;
    const currentlyShowing = modalProductPage * ITEMS_PER_PAGE;
    
    if (isCloseToBottom && currentlyShowing < allItems.length) {
      loadMoreProducts();
    }
  };

  // Switch to create mode with pre-filled name
  const switchToCreateMode = (prefillName: string) => {
    setNewName(prefillName);
    setNewCategory(categories[0]?.id || '');
    setAddModalMode('create');
    setShowProductSearch(false);
  };

  // Handle inline category creation
  const handleCreateInlineCategory = async () => {
    if (!inlineCategoryName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }
    
    try {
      const response = await api.post('/inventory/categories', {
        name: inlineCategoryName,
        description: inlineCategoryDescription,
      });
      
      // Add new category to list and select it
      const newCat = response.data;
      setCategories(prev => [...prev, newCat]);
      setNewCategory(newCat.id);
      
      // Reset and close inline form
      setInlineCategoryName('');
      setInlineCategoryDescription('');
      setShowInlineCategoryForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleAddItem = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/inventory/items', {
        name: newName,
        description: formDescription || undefined,
        sku: newSku || undefined,
        category_id: newCategory || undefined,
        unit: newUnit,
        quantity: parseInt(newQuantity) || 0,
        min_quantity: parseInt(newMinQty) || 10,
        price: parseFloat(formPrice) || 0,
        cost_price: parseFloat(newCostPrice) || 0,
        barcode: formBarcode || undefined,
        tax_rate: parseFloat(formTaxRate) || 0,
        location: newLocation,
        supplier: newSupplier,
      });
      setShowAddModal(false);
      const savedName = newName;
      resetAddForm();
      fetchData();
      setSuccessMessage({ title: 'Product Created!', subtitle: `"${savedName}" has been added successfully.` });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  // Search products for stock adjustment
  const handleProductSearch = (query: string) => {
    setProductSearchQuery(query);
    if (query.length > 0) {
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(filtered);
      setShowProductSearch(true);
    } else {
      setSearchResults([]);
      setShowProductSearch(false);
    }
  };

  // Select product for adjustment - set default cost price from product
  const selectProductForAdjustment = (product: InventoryItem) => {
    setSelectedProduct(product);
    setProductSearchQuery(product.name);
    setShowProductSearch(false);
    // Set default cost price from product
    setAdjustCostPrice(product.cost_price?.toString() || '0');
    setAdjustSupplier(product.supplier || '');
  };

  // Open create product modal with pre-filled name
  const openCreateProductModal = (prefillName: string) => {
    setPrefillProductName(prefillName);
    setNewName(prefillName);
    setNewSku('');
    setNewCategory(categories[0]?.id || '');
    setNewUnit('pcs');
    setNewQuantity('0');
    setNewMinQty('10');
    setNewCostPrice('0');
    setNewLocation('');
    setNewSupplier('');
    setShowProductSearch(false);
    setShowAdjustModal(false);
    setShowCreateProductModal(true);
  };

  // Show confirmation before adjusting stock
  const handleConfirmAdjustPress = () => {
    if (!selectedProduct || !adjustQty) {
      Alert.alert('Error', 'Please select a product and enter quantity');
      return;
    }
    setShowConfirmAdjust(true);
  };

  // Handle create product from stock adjustment modal
  const handleCreateProductFromSearch = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await api.post('/inventory/items', {
        name: newName,
        description: formDescription || undefined,
        sku: newSku || undefined,
        category_id: newCategory || undefined,
        unit: newUnit,
        quantity: parseInt(newQuantity) || 0,
        min_quantity: parseInt(newMinQty) || 10,
        price: parseFloat(formPrice) || 0,
        cost_price: parseFloat(newCostPrice) || 0,
        barcode: formBarcode || undefined,
        tax_rate: parseFloat(formTaxRate) || 0,
        location: newLocation,
        supplier: newSupplier,
      });
      
      // Get the created product
      const createdProduct = response.data;
      
      setShowCreateProductModal(false);
      const savedName = newName;
      resetAddForm();
      fetchData();
      
      // Show success modal
      setSuccessMessage({ title: 'Product Created!', subtitle: `"${savedName}" has been added. You can now adjust its stock.` });
      setShowSuccessModal(true);
      
      // Pre-select the newly created product for adjustment
      setSelectedProduct(createdProduct);
      setProductSearchQuery(savedName);
      
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjustQty) {
      Alert.alert('Error', 'Please select a product and enter quantity');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        item_id: selectedProduct.id,
        adjustment_type: adjustType,
        quantity: parseInt(adjustQty),
        reason: adjustReason,
      });
      setShowAdjustModal(false);
      const productName = selectedProduct.name;
      setSelectedProduct(null);
      setProductSearchQuery('');
      setAdjustQty('');
      setAdjustReason('');
      fetchData();
      setSuccessMessage({ title: 'Stock Adjusted!', subtitle: `"${productName}" stock has been updated.` });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const deletedName = productToDelete.name;
      await api.delete(`/inventory/items/${productToDelete.id}`);
      setShowConfirmDelete(false);
      setProductToDelete(null);
      fetchData();
      setSuccessMessage({ title: 'Product Deleted', subtitle: `"${deletedName}" has been removed.` });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const openAdjustModal = (product: InventoryItem) => {
    setSelectedProduct(product);
    setProductSearchQuery(product.name);
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
      onLongPress={() => { setProductToDelete(item); setShowConfirmDelete(true); }}
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

  // Logout handling
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/(auth)/login');
  };

  // Show success modal
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  // Web Dashboard Rendering
  const renderWebDashboard = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      contentContainerStyle={webStyles.dashboardContent}
    >
      {/* Stats Row */}
      <View style={webStyles.statsRow}>
        <View style={webStyles.statCard}>
          <View style={[webStyles.statIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="cube" size={24} color="#059669" />
          </View>
          <View style={webStyles.statInfo}>
            <Text style={webStyles.statValue}>{summary?.total_items || 0}</Text>
            <Text style={webStyles.statLabel}>Total Items</Text>
          </View>
        </View>
        
        <View style={webStyles.statCard}>
          <View style={[webStyles.statIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="layers" size={24} color="#2563EB" />
          </View>
          <View style={webStyles.statInfo}>
            <Text style={webStyles.statValue}>{formatNumber(summary?.total_quantity || 0)}</Text>
            <Text style={webStyles.statLabel}>Total Quantity</Text>
          </View>
        </View>
        
        <View style={webStyles.statCard}>
          <View style={[webStyles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
          </View>
          <View style={webStyles.statInfo}>
            <Text style={webStyles.statValue}>{summary?.low_stock_count || 0}</Text>
            <Text style={webStyles.statLabel}>Low Stock</Text>
          </View>
        </View>
        
        <View style={webStyles.statCard}>
          <View style={[webStyles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </View>
          <View style={webStyles.statInfo}>
            <Text style={webStyles.statValue}>{summary?.out_of_stock_count || 0}</Text>
            <Text style={webStyles.statLabel}>Out of Stock</Text>
          </View>
        </View>
      </View>

      {/* Charts Row - Analytics Section */}
      <View style={webStyles.chartsRow}>
        {/* Stock Status Distribution - Pie Chart */}
        <View style={webStyles.chartCard}>
          <Text style={webStyles.chartTitle}>Stock Status</Text>
          <View style={webStyles.chartContainer}>
            <PieChart
              data={[
                { value: summary?.in_stock_count || 1, color: '#10B981', text: 'In Stock' },
                { value: summary?.low_stock_count || 1, color: '#F59E0B', text: 'Low Stock' },
                { value: summary?.out_of_stock_count || 1, color: '#EF4444', text: 'Out' },
              ]}
              donut
              radius={70}
              innerRadius={45}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{summary?.total_items || 0}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>Items</Text>
                </View>
              )}
            />
          </View>
          <View style={webStyles.chartLegend}>
            <View style={webStyles.legendItem}>
              <View style={[webStyles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={webStyles.legendText}>In Stock ({summary?.in_stock_count || 0})</Text>
            </View>
            <View style={webStyles.legendItem}>
              <View style={[webStyles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={webStyles.legendText}>Low Stock ({summary?.low_stock_count || 0})</Text>
            </View>
            <View style={webStyles.legendItem}>
              <View style={[webStyles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={webStyles.legendText}>Out ({summary?.out_of_stock_count || 0})</Text>
            </View>
          </View>
        </View>

        {/* Stock Value by Category - Bar Chart */}
        <View style={webStyles.chartCard}>
          <Text style={webStyles.chartTitle}>Stock by Category</Text>
          <View style={webStyles.chartContainer}>
            {chartData?.category_stock && chartData.category_stock.length > 0 ? (
              <BarChart
                data={chartData.category_stock.slice(0, 6).map((cat, idx) => ({
                  value: cat.count || 0,
                  label: cat.name.substring(0, 4),
                  frontColor: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'][idx] || '#059669',
                }))}
                barWidth={28}
                barBorderRadius={6}
                height={120}
                width={220}
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#E5E7EB"
                xAxisLabelTextStyle={{ fontSize: 10, color: '#6B7280' }}
                hideRules
                isAnimated
              />
            ) : (
              <View style={webStyles.chartPlaceholder}>
                <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
                <Text style={webStyles.chartPlaceholderText}>No data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stock Movement Trend - Line Chart */}
        <View style={webStyles.chartCard}>
          <Text style={webStyles.chartTitle}>Movement Trend</Text>
          <View style={webStyles.chartContainer}>
            {chartData?.movement_trend && chartData.movement_trend.length > 0 ? (
              <LineChart
                data={chartData.movement_trend.map(m => ({ value: m.stock_in || 0 }))}
                data2={chartData.movement_trend.map(m => ({ value: m.stock_out || 0 }))}
                height={120}
                width={220}
                spacing={40}
                color1="#059669"
                color2="#EF4444"
                thickness={3}
                hideDataPoints={false}
                dataPointsColor1="#059669"
                dataPointsColor2="#EF4444"
                dataPointsRadius={5}
                curved
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#E5E7EB"
                hideRules
                xAxisLabelTexts={chartData.movement_trend.map(m => m.month)}
                xAxisLabelTextStyle={{ fontSize: 10, color: '#6B7280' }}
                isAnimated
              />
            ) : (
              <View style={webStyles.chartPlaceholder}>
                <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
                <Text style={webStyles.chartPlaceholderText}>No data yet</Text>
              </View>
            )}
          </View>
          <View style={webStyles.chartLegend}>
            <View style={webStyles.legendItem}>
              <View style={[webStyles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={webStyles.legendText}>Stock In</Text>
            </View>
            <View style={webStyles.legendItem}>
              <View style={[webStyles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={webStyles.legendText}>Stock Out</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={webStyles.mainContent}>
        {/* Recent Items Table */}
        <View style={webStyles.tableCard}>
          <View style={webStyles.tableHeader}>
            <Text style={webStyles.tableTitle}>Stock Levels</Text>
            <TouchableOpacity onPress={() => router.push('/inventory/products')}>
              <Text style={webStyles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {/* Filter Tabs */}
          <View style={webStyles.filterRow}>
            <View style={webStyles.tabs}>
              {[
                { key: 'all', label: 'All' },
                { key: 'low_stock', label: 'Low Stock' },
                { key: 'out_of_stock', label: 'Out of Stock' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[webStyles.tab, filterStatus === tab.key && webStyles.tabActive]}
                  onPress={() => setFilterStatus(tab.key)}
                >
                  <Text style={[webStyles.tabText, filterStatus === tab.key && webStyles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={webStyles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={webStyles.searchInput}
                placeholder="Search items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          {/* Table Header */}
          <View style={webStyles.tableHeaderRow}>
            <Text style={[webStyles.tableHeaderCell, { flex: 2 }]}>ITEM</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 1 }]}>SKU</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 1 }]}>CATEGORY</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>QTY</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>MIN</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
            <Text style={[webStyles.tableHeaderCell, { flex: 0.5 }]}>ACTIONS</Text>
          </View>

          {/* Table Body */}
          {items.length === 0 ? (
            <View style={webStyles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.gray} />
              <Text style={webStyles.emptyText}>No items found</Text>
              <TouchableOpacity style={webStyles.emptyBtn} onPress={openAddStockModal}>
                <Text style={webStyles.emptyBtnText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.slice(0, 10).map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={webStyles.tableRow}
                onPress={() => setViewingItem(item)}
              >
                <Text style={[webStyles.tableCell, { flex: 2, fontWeight: '600' }]}>{item.name}</Text>
                <Text style={[webStyles.tableCell, { flex: 1 }]}>{item.sku}</Text>
                <Text style={[webStyles.tableCell, { flex: 1 }]}>{item.category_name || '-'}</Text>
                <Text style={[webStyles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{item.quantity}</Text>
                <Text style={[webStyles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.min_quantity}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[webStyles.statusBadge, { 
                    backgroundColor: item.status === 'in_stock' ? '#D1FAE5' : item.status === 'low_stock' ? '#FEF3C7' : '#FEE2E2' 
                  }]}>
                    <Text style={[webStyles.statusText, { 
                      color: item.status === 'in_stock' ? '#059669' : item.status === 'low_stock' ? '#D97706' : '#DC2626' 
                    }]}>
                      {item.status === 'in_stock' ? 'In Stock' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 0.5, flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => { setProductToDelete(item); setShowConfirmDelete(true); }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions Sidebar */}
        <View style={webStyles.sidebar}>
          <View style={webStyles.quickActionsCard}>
            <Text style={webStyles.quickActionsTitle}>Quick Actions</Text>
            <TouchableOpacity style={webStyles.quickActionBtn} onPress={openAddStockModal}>
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={webStyles.quickActionText}>Add Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={webStyles.quickActionBtn} onPress={() => router.push('/inventory/products')}>
              <Ionicons name="cube" size={20} color={COLORS.primary} />
              <Text style={webStyles.quickActionText}>Manage Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={webStyles.quickActionBtn} onPress={() => router.push('/inventory/categories')}>
              <Ionicons name="folder" size={20} color={COLORS.primary} />
              <Text style={webStyles.quickActionText}>Categories</Text>
            </TouchableOpacity>
          </View>

          <View style={webStyles.linksCard}>
            <Text style={webStyles.linksTitle}>Navigation</Text>
            <TouchableOpacity style={webStyles.linkItem} onPress={() => router.push('/inventory/movements')}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#6B7280" />
              <Text style={webStyles.linkText}>Stock Movements</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={webStyles.linkItem} onPress={() => router.push('/inventory/suppliers')}>
              <Ionicons name="business-outline" size={20} color="#6B7280" />
              <Text style={webStyles.linkText}>Suppliers</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={webStyles.linkItem} onPress={() => router.push('/inventory/reports')}>
              <Ionicons name="bar-chart-outline" size={20} color="#6B7280" />
              <Text style={webStyles.linkText}>Reports</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={webStyles.linkItem} onPress={() => router.push('/inventory/purchase-orders')}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
              <Text style={webStyles.linkText}>Purchase Orders</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* WEB DASHBOARD - Using ProductDashboard Component */}
      {isWeb ? (
        <View style={{ flex: 1 }}>
          {/* Quick Start Panel - Show when inventory is empty */}
          {(items.length === 0 || suppliersCount === 0 || locationsCount === 0) && (
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              <InventoryQuickStartPanel
                itemsCount={items.length}
                suppliersCount={suppliersCount}
                locationsCount={locationsCount}
                onAddFirstItem={openAddStockModal}
                onAddSupplier={() => router.push('/inventory/suppliers')}
                onCreateLocation={() => router.push('/inventory/locations')}
                onShowWizard={() => setShowQuickStartWizard(true)}
              />
            </View>
          )}
          <ProductDashboard
            productId="inventory"
            subtitle="Inventory management overview"
            onNewAction={openAddStockModal}
            newActionLabel="Add Stock"
            statsRow={[
              { label: 'Total Items', value: formatNumber(summary?.total_items || 0), icon: 'cube', iconBg: '#D1FAE5', iconColor: '#059669' },
              { label: 'Total Quantity', value: formatNumber(summary?.total_quantity || 0), icon: 'layers', iconBg: '#DBEAFE', iconColor: '#2563EB' },
              { label: 'Low Stock', value: summary?.low_stock_count || 0, icon: 'alert-circle', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
              { label: 'Out of Stock', value: summary?.out_of_stock_count || 0, icon: 'close-circle', iconBg: '#FEE2E2', iconColor: '#EF4444' },
            ]}
            netIncome={{ value: summary?.total_items || 0, trend: 15 }}
            totalReturn={{ value: summary?.out_of_stock_count || 0, trend: -8 }}
            revenueTotal={summary?.total_value || 0}
            revenueTrend={12}
            adverts={adverts}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onTransactionViewMore={() => router.push('/inventory/products')}
            onSalesReportViewMore={() => router.push('/inventory/reports')}
            onPromoPress={() => router.push('/inventory/products')}
            promoTitle="Manage your inventory efficiently."
            promoSubtitle="Track stock levels, manage products, and get low stock alerts."
            promoButtonText="Manage Products"
            formatCurrency={formatCurrency}
          />
        </View>
      ) : (
        /* MOBILE LAYOUT */
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Mobile: Welcome Header like Retail Pro */}
          <View style={styles.mobileHeader}>
            <View style={styles.mobileHeaderLeft}>
              <View style={styles.inventoryBadgeMobile}>
                <Text style={styles.inventoryBadgeText}>IN</Text>
              </View>
              <View>
                <Text style={styles.mobileGreeting}>Welcome back,</Text>
                <Text style={styles.mobileUserName}>{settings?.name || user?.name || 'User'}</Text>
              </View>
            </View>
            {/* 3x3 Grid Icon for Apps */}
            <ProductSwitcher currentProductId="inventory" />
          </View>

          {/* Quick Start Panel - Show when inventory is empty */}
          {(items.length === 0 || suppliersCount === 0 || locationsCount === 0) && (
            <InventoryQuickStartPanel
              itemsCount={items.length}
              suppliersCount={suppliersCount}
              locationsCount={locationsCount}
              onAddFirstItem={openAddStockModal}
              onAddSupplier={() => router.push('/inventory/suppliers')}
              onCreateLocation={() => router.push('/inventory/locations')}
              onShowWizard={() => setShowQuickStartWizard(true)}
            />
          )}

          {/* Stats */}
          {renderStats()}
        
        {/* Main Card Container */}
        <View style={styles.mainCard}>
          {/* Tabs inside card */}
          <View style={styles.tabContainerCard}>
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
          
          {/* Content based on active tab */}
          {activeTab === 'items' ? (
            <>
              {/* Filter Pills inside card */}
              <View style={styles.filterContainerCard}>
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
              </View>
              
              {/* Products List - scrollable inside card */}
              <ScrollView style={styles.listScrollCard} nestedScrollEnabled showsVerticalScrollIndicator>
                {items.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="cube-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No products found</Text>
                    <TouchableOpacity style={styles.emptyBtn} onPress={openAddStockModal}>
                      <Text style={styles.emptyBtnText}>Add First Product</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.listContentCard}>
                    {items.map(renderItemRow)}
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView style={styles.listScrollCard} nestedScrollEnabled showsVerticalScrollIndicator>
              {movements.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="swap-horizontal-outline" size={48} color={COLORS.gray} />
                  <Text style={styles.emptyText}>No movements yet</Text>
                </View>
              ) : (
                <View style={styles.listContentCard}>
                  {movements.map(renderMovementRow)}
                </View>
              )}
            </ScrollView>
          )}
        </View>
        
        {/* Quick Actions Card - Mobile Only */}
        <View style={styles.adminToolsCard}>
          <Text style={styles.adminToolsTitle}>Quick Actions</Text>
          <View style={styles.adminToolsGrid}>
            <TouchableOpacity style={styles.adminToolItem} onPress={() => setShowAddModal(true)}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="add-circle" size={24} color="#2563EB" />
              </View>
              <Text style={styles.adminToolLabel}>Add Stock</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/products')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cube" size={24} color="#059669" />
              </View>
              <Text style={styles.adminToolLabel}>Products</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/low-stock')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={24} color="#DC2626" />
              </View>
              <Text style={styles.adminToolLabel}>Low Stock</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/reports')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="bar-chart" size={24} color="#A855F7" />
              </View>
              <Text style={styles.adminToolLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Tools Card - Mobile Only */}
        <View style={[styles.adminToolsCard, { backgroundColor: '#F8FAFC' }]}>
          <Text style={styles.adminToolsTitle}>Admin Tools</Text>
          <View style={styles.adminToolsGrid}>
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/categories')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="folder" size={24} color="#0EA5E9" />
              </View>
              <Text style={styles.adminToolLabel}>Categories</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/suppliers')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="people" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.adminToolLabel}>Suppliers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/locations')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="location" size={24} color="#10B981" />
              </View>
              <Text style={styles.adminToolLabel}>Locations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/settings')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="settings" size={24} color="#475569" />
              </View>
              <Text style={styles.adminToolLabel}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/alerts')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="notifications" size={24} color="#DC2626" />
              </View>
              <Text style={styles.adminToolLabel}>Alerts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => router.push('/inventory/movements')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="swap-horizontal" size={24} color="#6366F1" />
              </View>
              <Text style={styles.adminToolLabel}>Movements</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={() => Alert.alert('Help & Support', 'Contact us at support@inventory.com or call +1-800-INVENTORY')}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="help-circle" size={24} color="#16A34A" />
              </View>
              <Text style={styles.adminToolLabel}>Help</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.adminToolItem} onPress={handleLogout}>
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out" size={24} color="#DC2626" />
              </View>
              <Text style={styles.adminToolLabel}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {/* Add Stock / Create Product Modal - Search First Approach */}
      <WebModal 
        visible={showAddModal} 
        onClose={() => { setShowAddModal(false); resetAddForm(); }} 
        title="Add Stock / New Product"
        subtitle="Search existing product or create new"
      >
        {addModalMode === 'search' ? (
          <>
            {/* Search Input */}
            <View style={styles.productSearchContainer}>
              <Ionicons name="search-outline" size={20} color={COLORS.gray} style={styles.searchIcon} />
              <TextInput 
                style={[styles.input, styles.searchInputWithIcon]} 
                value={productSearchQuery} 
                onChangeText={handleProductSearch} 
                placeholder="Type product name to search..."
                placeholderTextColor="#9CA3AF"
              />
              {productSearchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchBtn}
                  onPress={() => { setProductSearchQuery(''); setSearchResults([]); setShowProductSearch(false); }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Product List - Infinite scroll (mobile) or pagination (web) */}
            {(() => {
              const allSortedItems = productSearchQuery.length > 0 
                ? searchResults.sort((a, b) => a.name.localeCompare(b.name))
                : [...items].sort((a, b) => a.name.localeCompare(b.name));
              
              // For mobile: show items up to current page
              // For web: show items for current page only
              const displayItems = isWeb 
                ? allSortedItems.slice((modalProductPage - 1) * ITEMS_PER_PAGE, modalProductPage * ITEMS_PER_PAGE)
                : allSortedItems.slice(0, modalProductPage * ITEMS_PER_PAGE);
              
              const totalPages = Math.ceil(allSortedItems.length / ITEMS_PER_PAGE);
              const hasMoreItems = modalProductPage * ITEMS_PER_PAGE < allSortedItems.length;
              
              return (
                <>
                  <ScrollView 
                    style={styles.productScrollList} 
                    nestedScrollEnabled 
                    showsVerticalScrollIndicator={true}
                    onScroll={!isWeb ? handleProductListScroll : undefined}
                    scrollEventThrottle={16}
                  >
                    {displayItems.length > 0 ? (
                      <>
                        {displayItems.map((product) => (
                          <TouchableOpacity 
                            key={product.id} 
                            style={styles.searchResultItem}
                            onPress={() => {
                              setSelectedProduct(product);
                              setProductSearchQuery(product.name);
                              setShowAddModal(false);
                              setAdjustType('in');
                              setAdjustQty('');
                              setAdjustReason('');
                              setAdjustCostPrice(product.cost_price?.toString() || '');
                              setAdjustSupplier(product.supplier || '');
                              setShowAdjustModal(true);
                            }}
                          >
                            <View style={styles.searchResultInfo}>
                              <Text style={styles.searchResultName}>{product.name}</Text>
                              <Text style={styles.searchResultSku}>SKU: {product.sku || 'N/A'}</Text>
                            </View>
                            <View style={styles.stockBadgeSmall}>
                              <Text style={styles.stockBadgeText}>{product.quantity}</Text>
                              <Text style={styles.stockBadgeLabel}>in stock</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {/* Mobile: Loading indicator at bottom */}
                        {!isWeb && loadingMoreProducts && (
                          <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.loadingMoreText}>Loading more...</Text>
                          </View>
                        )}
                        
                        {/* Mobile: "Load More" hint */}
                        {!isWeb && hasMoreItems && !loadingMoreProducts && (
                          <TouchableOpacity style={styles.loadMoreHint} onPress={loadMoreProducts}>
                            <Text style={styles.loadMoreHintText}>Scroll down or tap to load more ({allSortedItems.length - displayItems.length} more)</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : productSearchQuery.length > 0 ? (
                      <View style={styles.noProductFound}>
                        <Ionicons name="search-outline" size={32} color={COLORS.gray} />
                        <Text style={styles.noProductText}>No product found for "{productSearchQuery}"</Text>
                        <TouchableOpacity 
                          style={styles.createProductBtnLarge}
                          onPress={() => switchToCreateMode(productSearchQuery)}
                        >
                          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                          <Text style={styles.createProductBtnLargeText}>Create "{productSearchQuery}"</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noProductFound}>
                        <Text style={styles.noProductText}>No products yet</Text>
                      </View>
                    )}
                  </ScrollView>
                  
                  {/* Web: Pagination Controls */}
                  {isWeb && allSortedItems.length > ITEMS_PER_PAGE && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity 
                        style={[styles.paginationBtn, modalProductPage === 1 && styles.paginationBtnDisabled]}
                        onPress={() => setModalProductPage(p => Math.max(1, p - 1))}
                        disabled={modalProductPage === 1}
                      >
                        <Ionicons name="chevron-back" size={18} color={modalProductPage === 1 ? '#D1D5DB' : COLORS.primary} />
                        <Text style={[styles.paginationBtnText, modalProductPage === 1 && styles.paginationBtnTextDisabled]}>Prev</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.paginationInfo}>
                        Page {modalProductPage} of {totalPages} ({allSortedItems.length} items)
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.paginationBtn, modalProductPage >= totalPages && styles.paginationBtnDisabled]}
                        onPress={() => setModalProductPage(p => Math.min(totalPages, p + 1))}
                        disabled={modalProductPage >= totalPages}
                      >
                        <Text style={[styles.paginationBtnText, modalProductPage >= totalPages && styles.paginationBtnTextDisabled]}>Next</Text>
                        <Ionicons name="chevron-forward" size={18} color={modalProductPage >= totalPages ? '#D1D5DB' : COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
            
            {/* Quick Create Option */}
            <View style={styles.quickCreateSection}>
              <Text style={styles.quickCreateText}>Or create a new product directly:</Text>
              <TouchableOpacity 
                style={styles.quickCreateBtn}
                onPress={() => setAddModalMode('create')}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.quickCreateBtnText}>Create New Product</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Create Product Form - Exact match to Retail Pro design */
          <View style={styles.createProductForm}>
            <TouchableOpacity 
              style={styles.backToSearchBtn}
              onPress={() => { setAddModalMode('search'); setNewName(''); }}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
              <Text style={styles.backToSearchText}>Back to search</Text>
            </TouchableOpacity>
            
            {/* Product Name */}
            <Text style={styles.formLabel}>Product Name *</Text>
            <TextInput 
              style={styles.formInput} 
              value={newName} 
              onChangeText={setNewName} 
              placeholder="Enter product name" 
              placeholderTextColor="#9CA3AF"
            />
            
            {/* SKU and Barcode Row */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>SKU *</Text>
                <TextInput 
                  style={styles.formInput} 
                  value={newSku} 
                  onChangeText={setNewSku} 
                  placeholder="PROD-001"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Barcode</Text>
                <TextInput 
                  style={styles.formInput} 
                  value={formBarcode} 
                  onChangeText={setFormBarcode} 
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            
            {/* Category Selection */}
            <Text style={styles.formLabel}>Category *</Text>
            {showInlineCategoryForm ? (
              <View style={styles.inlineCategoryForm}>
                <View style={styles.inlineCategoryHeader}>
                  <Text style={styles.inlineCategoryTitle}>Create New Category</Text>
                  <TouchableOpacity 
                    style={styles.inlineCategoryCloseBtn}
                    onPress={() => setShowInlineCategoryForm(false)}
                  >
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.inlineCategoryLabel}>Category Name *</Text>
                <TextInput
                  style={styles.inlineCategoryInput}
                  placeholder="e.g., Electronics, Clothing"
                  placeholderTextColor="#9CA3AF"
                  value={inlineCategoryName}
                  onChangeText={setInlineCategoryName}
                />
                
                <Text style={styles.inlineCategoryLabel}>Description</Text>
                <TextInput
                  style={[styles.inlineCategoryInput, styles.inlineCategoryDescInput]}
                  placeholder="Brief description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={inlineCategoryDescription}
                  onChangeText={setInlineCategoryDescription}
                  multiline
                  numberOfLines={2}
                />
                
                <View style={styles.inlineCategoryButtons}>
                  <TouchableOpacity 
                    style={styles.inlineCategoryCancelBtn} 
                    onPress={() => {
                      setShowInlineCategoryForm(false);
                      setInlineCategoryName('');
                      setInlineCategoryDescription('');
                    }}
                  >
                    <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.inlineCategorySaveBtn} 
                    onPress={handleCreateInlineCategory}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.inlineCategorySaveText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, newCategory === cat.id && styles.chipActive]}
                    onPress={() => setNewCategory(cat.id)}
                  >
                    <Text style={[styles.chipText, newCategory === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.chipAdd}
                  onPress={() => setShowInlineCategoryForm(true)}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text style={styles.chipAddText}>New</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            
            {/* Selling Price and Cost Price Row */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Selling Price *</Text>
                <View style={styles.currencyInputWrapper}>
                  <Text style={styles.currencyPrefix}>{settings?.currency || 'TSh'}</Text>
                  <TextInput 
                    style={styles.currencyInput} 
                    value={formPrice} 
                    onChangeText={setFormPrice} 
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Cost Price</Text>
                <View style={styles.currencyInputWrapper}>
                  <Text style={styles.currencyPrefix}>{settings?.currency || 'TSh'}</Text>
                  <TextInput 
                    style={styles.currencyInput} 
                    value={newCostPrice} 
                    onChangeText={setNewCostPrice} 
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
            
            {/* Low Stock Alert */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Low Stock Alert</Text>
                <TextInput 
                  style={styles.formInput} 
                  value={newMinQty} 
                  onChangeText={setNewMinQty} 
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            
            {/* Unit of Measure */}
            <View style={styles.uomContainer}>
              <Text style={styles.formLabel}>Unit of Measure</Text>
              {showInlineUomForm ? (
                <View style={styles.inlineUomForm}>
                  <View style={styles.inlineUomHeader}>
                    <Text style={styles.inlineUomTitle}>Add New Unit</Text>
                    <TouchableOpacity 
                      style={styles.inlineUomCloseBtn}
                      onPress={() => {
                        setShowInlineUomForm(false);
                        setInlineUomName('');
                        setInlineUomCode('');
                      }}
                    >
                      <Ionicons name="close" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.inlineUomLabel}>Unit Name *</Text>
                  <TextInput
                    style={styles.inlineUomInput}
                    placeholder="e.g., Bottles, Cans, Rolls"
                    placeholderTextColor="#9CA3AF"
                    value={inlineUomName}
                    onChangeText={setInlineUomName}
                  />
                  
                  <Text style={styles.inlineUomLabel}>Short Code (Optional)</Text>
                  <TextInput
                    style={styles.inlineUomInput}
                    placeholder="e.g., btl, can, roll"
                    placeholderTextColor="#9CA3AF"
                    value={inlineUomCode}
                    onChangeText={setInlineUomCode}
                    maxLength={10}
                  />
                  
                  <View style={styles.inlineUomButtons}>
                    <TouchableOpacity 
                      style={styles.inlineUomCancelBtn} 
                      onPress={() => {
                        setShowInlineUomForm(false);
                        setInlineUomName('');
                        setInlineUomCode('');
                      }}
                    >
                      <Text style={styles.inlineUomCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.inlineUomSaveBtn} 
                      onPress={handleAddCustomUom}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.inlineUomSaveText}>Add Unit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
                  <View style={styles.unitPicker}>
                    {UNITS_OF_MEASURE.map((unit) => (
                      <TouchableOpacity
                        key={unit.code}
                        style={[
                          styles.unitChip,
                          newUnit === unit.code && styles.unitChipActive
                        ]}
                        onPress={() => setNewUnit(unit.code)}
                      >
                        <Text style={[
                          styles.unitChipText,
                          newUnit === unit.code && styles.unitChipTextActive
                        ]}>
                          {unit.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Add New UOM Button */}
                    <TouchableOpacity
                      style={styles.addUomChip}
                      onPress={() => setShowInlineUomForm(true)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.addUomChipText}>New</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
            
            {/* Has Variants Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Has Variants</Text>
                <Text style={styles.toggleSubtitle}>Enable for products with multiple options like Size, Color, etc.</Text>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, hasVariants && styles.switchTrackActive]}
                onPress={() => setHasVariants(!hasVariants)}
                activeOpacity={0.8}
              >
                <View style={[styles.switchKnob, hasVariants && styles.switchKnobActive]} />
              </TouchableOpacity>
            </View>
            
            {/* Variants Section - Only show when Has Variants is enabled */}
            {hasVariants && (
              <View style={styles.variantsSection}>
                <Text style={styles.variantsSectionTitle}>Product Variants</Text>
                <Text style={styles.variantsHelpText}>
                  Add variant types like Size or Color, then enter values separated by commas.
                </Text>
                
                {/* Variant Inputs */}
                {variantInputs.map((input, index) => (
                  <View key={index} style={styles.variantInputCard}>
                    <View style={styles.variantInputHeader}>
                      <TextInput
                        style={styles.variantNameInput}
                        placeholder="Variant name (e.g., Size)"
                        value={input.name}
                        onChangeText={(text) => updateVariantInput(index, 'name', text)}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.removeVariantBtn}
                        onPress={() => removeVariantType(index)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.variantValuesInput}
                      placeholder="Values separated by commas (e.g., S, M, L, XL)"
                      value={input.valuesText}
                      onChangeText={(text) => updateVariantInput(index, 'valuesText', text)}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                ))}
                
                {/* Add Variant Type Button */}
                <TouchableOpacity 
                  style={styles.addVariantTypeBtn}
                  onPress={addVariantType}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#16A34A" />
                  <Text style={styles.addVariantTypeBtnText}>
                    {variantInputs.length === 0 ? 'Add Variant Type (e.g., Size, Color)' : 'Add Another Variant Type'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Initial Stock Quantity - Only show when not using variants */}
            {!hasVariants && (
              <>
                <Text style={styles.formLabel}>Initial Stock Quantity</Text>
                <TextInput 
                  style={styles.formInput} 
                  value={newQuantity} 
                  onChangeText={setNewQuantity} 
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}
            
            {/* Create Product Button */}
            <TouchableOpacity 
              style={[styles.createProductButton, submitting && styles.createProductButtonDisabled]} 
              onPress={handleAddItem} 
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.createProductButtonText}>Create Product</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </WebModal>

      {/* Adjust Stock Modal - Like Retail Pro */}
      <WebModal visible={showAdjustModal} onClose={() => { setShowAdjustModal(false); setSelectedProduct(null); setProductSearchQuery(''); setShowProductSearch(false); setAdjustCostPrice(''); setAdjustSupplier(''); }} title="Add / Adjust Stock" subtitle="Update inventory quantities">
        {!selectedProduct ? (
          <>
            {/* Product Search */}
            <Text style={styles.selectProductTitle}>Select Product</Text>
            <View style={styles.productSearchContainer}>
              <Ionicons name="search-outline" size={20} color={COLORS.gray} style={styles.searchIcon} />
              <TextInput 
                style={[styles.input, styles.searchInputWithIcon]} 
                value={productSearchQuery} 
                onChangeText={handleProductSearch} 
                placeholder="Search products..."
                placeholderTextColor="#9CA3AF"
              />
              {productSearchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchBtn}
                  onPress={() => { setProductSearchQuery(''); setSearchResults([]); setShowProductSearch(false); }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Product List - Infinite scroll (mobile) or pagination (web) */}
            {(() => {
              const allSortedItems = productSearchQuery.length > 0 
                ? searchResults.sort((a, b) => a.name.localeCompare(b.name))
                : [...items].sort((a, b) => a.name.localeCompare(b.name));
              
              // For mobile: show items up to current page
              // For web: show items for current page only
              const displayItems = isWeb 
                ? allSortedItems.slice((modalProductPage - 1) * ITEMS_PER_PAGE, modalProductPage * ITEMS_PER_PAGE)
                : allSortedItems.slice(0, modalProductPage * ITEMS_PER_PAGE);
              
              const totalPages = Math.ceil(allSortedItems.length / ITEMS_PER_PAGE);
              const hasMoreItems = modalProductPage * ITEMS_PER_PAGE < allSortedItems.length;
              
              return (
                <>
                  <ScrollView 
                    style={styles.productScrollList} 
                    nestedScrollEnabled 
                    showsVerticalScrollIndicator={true}
                    onScroll={!isWeb ? handleProductListScroll : undefined}
                    scrollEventThrottle={16}
                  >
                    {displayItems.length > 0 ? (
                      <>
                        {displayItems.map((product) => (
                          <TouchableOpacity 
                            key={product.id} 
                            style={styles.searchResultItem}
                            onPress={() => selectProductForAdjustment(product)}
                          >
                            <View style={styles.searchResultInfo}>
                              <Text style={styles.searchResultName}>{product.name}</Text>
                              <Text style={styles.searchResultSku}>SKU: {product.sku || 'N/A'}</Text>
                            </View>
                            <View style={styles.stockBadgeSmall}>
                              <Text style={styles.stockBadgeText}>{product.quantity}</Text>
                              <Text style={styles.stockBadgeLabel}>in stock</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {/* Mobile: Loading indicator at bottom */}
                        {!isWeb && loadingMoreProducts && (
                          <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.loadingMoreText}>Loading more...</Text>
                          </View>
                        )}
                        
                        {/* Mobile: "Load More" hint */}
                        {!isWeb && hasMoreItems && !loadingMoreProducts && (
                          <TouchableOpacity style={styles.loadMoreHint} onPress={loadMoreProducts}>
                            <Text style={styles.loadMoreHintText}>Scroll down or tap to load more ({allSortedItems.length - displayItems.length} more)</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : productSearchQuery.length > 0 ? (
                      <View style={styles.noProductFound}>
                        <Text style={styles.noProductText}>No product found for "{productSearchQuery}"</Text>
                        <TouchableOpacity 
                          style={styles.createProductBtnLarge}
                          onPress={() => openCreateProductModal(productSearchQuery)}
                        >
                          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.createProductBtnLargeText}>Create "{productSearchQuery}"</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noProductFound}>
                        <Text style={styles.noProductText}>No products available</Text>
                      </View>
                    )}
                  </ScrollView>
                  
                  {/* Web: Pagination Controls */}
                  {isWeb && allSortedItems.length > ITEMS_PER_PAGE && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity 
                        style={[styles.paginationBtn, modalProductPage === 1 && styles.paginationBtnDisabled]}
                        onPress={() => setModalProductPage(p => Math.max(1, p - 1))}
                        disabled={modalProductPage === 1}
                      >
                        <Ionicons name="chevron-back" size={18} color={modalProductPage === 1 ? '#D1D5DB' : COLORS.primary} />
                        <Text style={[styles.paginationBtnText, modalProductPage === 1 && styles.paginationBtnTextDisabled]}>Prev</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.paginationInfo}>
                        Page {modalProductPage} of {totalPages} ({allSortedItems.length} items)
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.paginationBtn, modalProductPage >= totalPages && styles.paginationBtnDisabled]}
                        onPress={() => setModalProductPage(p => Math.min(totalPages, p + 1))}
                        disabled={modalProductPage >= totalPages}
                      >
                        <Text style={[styles.paginationBtnText, modalProductPage >= totalPages && styles.paginationBtnTextDisabled]}>Next</Text>
                        <Ionicons name="chevron-forward" size={18} color={modalProductPage >= totalPages ? '#D1D5DB' : COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
            
            {/* Add New Product Link */}
            <TouchableOpacity 
              style={styles.addNewProductLink}
              onPress={() => openCreateProductModal(productSearchQuery)}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.addNewProductLinkText}>Add New Product</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Selected Product Info Card */}
            <View style={styles.selectedProductCardEnhanced}>
              <View style={styles.selectedProductMainInfo}>
                <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                <Text style={styles.selectedProductSku}>SKU: {selectedProduct.sku || 'N/A'}</Text>
              </View>
              <View style={styles.selectedProductStockInfo}>
                <Text style={styles.selectedProductQty}>{selectedProduct.quantity}</Text>
                <Text style={styles.selectedProductQtyLabel}>in stock</Text>
              </View>
              <TouchableOpacity 
                style={styles.changeProductBtn}
                onPress={() => { setSelectedProduct(null); setProductSearchQuery(''); setAdjustCostPrice(''); }}
              >
                <Text style={styles.changeProductBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Movement Type */}
            <Text style={styles.sectionTitle}>Movement Type</Text>
            <View style={styles.movementTypeRow}>
              <TouchableOpacity
                style={[styles.movementTypeBtn, adjustType === 'in' && styles.movementTypeBtnIn]}
                onPress={() => setAdjustType('in')}
              >
                <Ionicons name="arrow-down-circle" size={22} color={adjustType === 'in' ? '#FFFFFF' : '#10B981'} />
                <Text style={[styles.movementTypeBtnText, adjustType === 'in' && styles.movementTypeBtnTextActive]}>
                  Stock In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.movementTypeBtn, adjustType === 'out' && styles.movementTypeBtnOut]}
                onPress={() => setAdjustType('out')}
              >
                <Ionicons name="arrow-up-circle" size={22} color={adjustType === 'out' ? '#FFFFFF' : '#DC2626'} />
                <Text style={[styles.movementTypeBtnText, adjustType === 'out' && styles.movementTypeBtnTextActive]}>
                  Stock Out
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.movementTypeBtn, adjustType === 'adjustment' && styles.movementTypeBtnAdj]}
                onPress={() => setAdjustType('adjustment')}
              >
                <Ionicons name="swap-horizontal" size={22} color={adjustType === 'adjustment' ? '#FFFFFF' : '#F59E0B'} />
                <Text style={[styles.movementTypeBtnText, adjustType === 'adjustment' && styles.movementTypeBtnTextActive]}>
                  Adjust
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Quantity */}
            <Text style={styles.inputLabel}>Quantity *</Text>
            <TextInput 
              style={styles.input} 
              value={adjustQty} 
              onChangeText={setAdjustQty} 
              keyboardType="numeric" 
              placeholder="Enter quantity" 
            />
            
            {/* Stock In specific fields */}
            {adjustType === 'in' && (
              <>
                <Text style={styles.inputLabel}>Unit Cost</Text>
                <TextInput 
                  style={styles.input} 
                  value={adjustCostPrice} 
                  onChangeText={setAdjustCostPrice} 
                  keyboardType="decimal-pad" 
                  placeholder={selectedProduct.cost_price ? formatCurrency(selectedProduct.cost_price) : "0"} 
                />
                
                <Text style={styles.inputLabel}>Supplier</Text>
                <TextInput 
                  style={styles.input} 
                  value={adjustSupplier} 
                  onChangeText={setAdjustSupplier} 
                  placeholder={selectedProduct.supplier || "Supplier name (optional)"} 
                />
              </>
            )}
            
            {/* Reason */}
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={adjustReason} 
              onChangeText={setAdjustReason} 
              placeholder="Enter reason (optional)" 
              multiline 
              numberOfLines={3} 
            />
            
            <TouchableOpacity 
              style={[styles.submitBtn, (!selectedProduct || !adjustQty) && styles.submitBtnDisabled]} 
              onPress={handleConfirmAdjustPress} 
              disabled={!selectedProduct || !adjustQty}
            >
              <Text style={styles.submitBtnText}>
                {adjustType === 'in' ? 'Add Stock' : adjustType === 'out' ? 'Remove Stock' : 'Update Stock'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </WebModal>

      {/* Confirm Adjustment Modal */}
      <Modal visible={showConfirmAdjust} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIconContainer, { backgroundColor: adjustType === 'in' ? '#D1FAE5' : adjustType === 'out' ? '#FEE2E2' : '#FEF3C7' }]}>
              <Ionicons 
                name={adjustType === 'in' ? 'arrow-down-circle' : adjustType === 'out' ? 'arrow-up-circle' : 'swap-horizontal'} 
                size={40} 
                color={adjustType === 'in' ? '#059669' : adjustType === 'out' ? '#DC2626' : '#F59E0B'} 
              />
            </View>
            <Text style={styles.confirmTitle}>Confirm Stock {adjustType === 'in' ? 'In' : adjustType === 'out' ? 'Out' : 'Adjustment'}</Text>
            <View style={styles.confirmDetails}>
              <Text style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Product: </Text>
                <Text style={styles.confirmDetailValue}>{selectedProduct?.name}</Text>
              </Text>
              <Text style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Quantity: </Text>
                <Text style={styles.confirmDetailValue}>{adjustType === 'in' ? '+' : adjustType === 'out' ? '-' : ''}{adjustQty} {selectedProduct?.unit}</Text>
              </Text>
              {adjustType === 'in' && adjustCostPrice && (
                <Text style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Unit Cost: </Text>
                  <Text style={styles.confirmDetailValue}>{formatCurrency(parseFloat(adjustCostPrice))}</Text>
                </Text>
              )}
              <Text style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>New Stock: </Text>
                <Text style={styles.confirmDetailValue}>
                  {adjustType === 'adjustment' 
                    ? adjustQty 
                    : adjustType === 'in' 
                      ? (selectedProduct?.quantity || 0) + parseInt(adjustQty || '0')
                      : (selectedProduct?.quantity || 0) - parseInt(adjustQty || '0')
                  } {selectedProduct?.unit}
                </Text>
              </Text>
            </View>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmAdjust(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteBtn, { backgroundColor: adjustType === 'in' ? '#059669' : adjustType === 'out' ? '#DC2626' : '#F59E0B' }]} 
                onPress={() => { setShowConfirmAdjust(false); handleAdjustStock(); }}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Product Modal - Exact match to Retail Pro design */}
      <WebModal visible={showCreateProductModal} onClose={() => setShowCreateProductModal(false)} title="Add New Product">
        <View style={styles.createProductForm}>
          {/* Product Name */}
          <Text style={styles.formLabel}>Product Name *</Text>
          <TextInput 
            style={styles.formInput} 
            value={newName} 
            onChangeText={setNewName} 
            placeholder="Enter product name" 
            placeholderTextColor="#9CA3AF"
          />
          
          {/* SKU and Barcode Row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>SKU *</Text>
              <TextInput 
                style={styles.formInput} 
                value={newSku} 
                onChangeText={setNewSku} 
                placeholder="PROD-001"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Barcode</Text>
              <TextInput 
                style={styles.formInput} 
                value={formBarcode} 
                onChangeText={setFormBarcode} 
                placeholder="Optional"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          
          {/* Category Selection */}
          <Text style={styles.formLabel}>Category *</Text>
          {showInlineCategoryForm ? (
            <View style={styles.inlineCategoryForm}>
              <View style={styles.inlineCategoryHeader}>
                <Text style={styles.inlineCategoryTitle}>Create New Category</Text>
                <TouchableOpacity 
                  style={styles.inlineCategoryCloseBtn}
                  onPress={() => setShowInlineCategoryForm(false)}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inlineCategoryLabel}>Category Name *</Text>
              <TextInput
                style={styles.inlineCategoryInput}
                placeholder="e.g., Electronics, Clothing"
                placeholderTextColor="#9CA3AF"
                value={inlineCategoryName}
                onChangeText={setInlineCategoryName}
              />
              
              <Text style={styles.inlineCategoryLabel}>Description</Text>
              <TextInput
                style={[styles.inlineCategoryInput, styles.inlineCategoryDescInput]}
                placeholder="Brief description (optional)"
                placeholderTextColor="#9CA3AF"
                value={inlineCategoryDescription}
                onChangeText={setInlineCategoryDescription}
                multiline
                numberOfLines={2}
              />
              
              <View style={styles.inlineCategoryButtons}>
                <TouchableOpacity 
                  style={styles.inlineCategoryCancelBtn} 
                  onPress={() => {
                    setShowInlineCategoryForm(false);
                    setInlineCategoryName('');
                    setInlineCategoryDescription('');
                  }}
                >
                  <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.inlineCategorySaveBtn} 
                  onPress={handleCreateInlineCategory}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.inlineCategorySaveText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, newCategory === cat.id && styles.chipActive]}
                  onPress={() => setNewCategory(cat.id)}
                >
                  <Text style={[styles.chipText, newCategory === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.chipAdd}
                onPress={() => setShowInlineCategoryForm(true)}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.chipAddText}>New</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          
          {/* Selling Price and Cost Price Row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Selling Price *</Text>
              <View style={styles.currencyInputWrapper}>
                <Text style={styles.currencyPrefix}>{settings?.currency || 'TSh'}</Text>
                <TextInput 
                  style={styles.currencyInput} 
                  value={formPrice} 
                  onChangeText={setFormPrice} 
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Cost Price</Text>
              <View style={styles.currencyInputWrapper}>
                <Text style={styles.currencyPrefix}>{settings?.currency || 'TSh'}</Text>
                <TextInput 
                  style={styles.currencyInput} 
                  value={newCostPrice} 
                  onChangeText={setNewCostPrice} 
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>
          
          {/* Low Stock Alert */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Low Stock Alert</Text>
              <TextInput 
                style={styles.formInput} 
                value={newMinQty} 
                onChangeText={setNewMinQty} 
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          
          {/* Unit of Measure */}
          <View style={styles.uomContainer}>
            <Text style={styles.formLabel}>Unit of Measure</Text>
            {showInlineUomForm ? (
              <View style={styles.inlineUomForm}>
                <View style={styles.inlineUomHeader}>
                  <Text style={styles.inlineUomTitle}>Add New Unit</Text>
                  <TouchableOpacity 
                    style={styles.inlineUomCloseBtn}
                    onPress={() => {
                      setShowInlineUomForm(false);
                      setInlineUomName('');
                      setInlineUomCode('');
                    }}
                  >
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.inlineUomLabel}>Unit Name *</Text>
                <TextInput
                  style={styles.inlineUomInput}
                  placeholder="e.g., Bottles, Cans, Rolls"
                  placeholderTextColor="#9CA3AF"
                  value={inlineUomName}
                  onChangeText={setInlineUomName}
                />
                
                <Text style={styles.inlineUomLabel}>Short Code (Optional)</Text>
                <TextInput
                  style={styles.inlineUomInput}
                  placeholder="e.g., btl, can, roll"
                  placeholderTextColor="#9CA3AF"
                  value={inlineUomCode}
                  onChangeText={setInlineUomCode}
                  maxLength={10}
                />
                
                <View style={styles.inlineUomButtons}>
                  <TouchableOpacity 
                    style={styles.inlineUomCancelBtn} 
                    onPress={() => {
                      setShowInlineUomForm(false);
                      setInlineUomName('');
                      setInlineUomCode('');
                    }}
                  >
                    <Text style={styles.inlineUomCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.inlineUomSaveBtn} 
                    onPress={handleAddCustomUom}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.inlineUomSaveText}>Add Unit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
                <View style={styles.unitPicker}>
                  {UNITS_OF_MEASURE.map((unit) => (
                    <TouchableOpacity
                      key={unit.code}
                      style={[
                        styles.unitChip,
                        newUnit === unit.code && styles.unitChipActive
                      ]}
                      onPress={() => setNewUnit(unit.code)}
                    >
                      <Text style={[
                        styles.unitChipText,
                        newUnit === unit.code && styles.unitChipTextActive
                      ]}>
                        {unit.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Add New UOM Button */}
                  <TouchableOpacity
                    style={styles.addUomChip}
                    onPress={() => setShowInlineUomForm(true)}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addUomChipText}>New</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
          
          {/* Has Variants Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Has Variants</Text>
              <Text style={styles.toggleSubtitle}>Enable for products with multiple options like Size, Color, etc.</Text>
            </View>
            <TouchableOpacity
              style={[styles.switchTrack, hasVariants && styles.switchTrackActive]}
              onPress={() => setHasVariants(!hasVariants)}
              activeOpacity={0.8}
            >
              <View style={[styles.switchKnob, hasVariants && styles.switchKnobActive]} />
            </TouchableOpacity>
          </View>
          
          {/* Variants Section - Only show when Has Variants is enabled */}
          {hasVariants && (
            <View style={styles.variantsSection}>
              <Text style={styles.variantsSectionTitle}>Product Variants</Text>
              <Text style={styles.variantsHelpText}>
                Add variant types like Size or Color, then enter values separated by commas.
              </Text>
              
              {/* Variant Inputs */}
              {variantInputs.map((input, index) => (
                <View key={index} style={styles.variantInputCard}>
                  <View style={styles.variantInputHeader}>
                    <TextInput
                      style={styles.variantNameInput}
                      placeholder="Variant name (e.g., Size)"
                      value={input.name}
                      onChangeText={(text) => updateVariantInput(index, 'name', text)}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity 
                      style={styles.removeVariantBtn}
                      onPress={() => removeVariantType(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.variantValuesInput}
                    placeholder="Values separated by commas (e.g., S, M, L, XL)"
                    value={input.valuesText}
                    onChangeText={(text) => updateVariantInput(index, 'valuesText', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}
              
              {/* Add Variant Type Button */}
              <TouchableOpacity 
                style={styles.addVariantTypeBtn}
                onPress={addVariantType}
              >
                <Ionicons name="add-circle-outline" size={20} color="#16A34A" />
                <Text style={styles.addVariantTypeBtnText}>
                  {variantInputs.length === 0 ? 'Add Variant Type (e.g., Size, Color)' : 'Add Another Variant Type'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Initial Stock Quantity - Only show when not using variants */}
          {!hasVariants && (
            <>
              <Text style={styles.formLabel}>Initial Stock Quantity</Text>
              <TextInput 
                style={styles.formInput} 
                value={newQuantity} 
                onChangeText={setNewQuantity} 
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}
          
          {/* Create Product Button */}
          <TouchableOpacity 
            style={[styles.createProductButton, submitting && styles.createProductButtonDisabled]} 
            onPress={handleCreateProductFromSearch} 
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.createProductButtonText}>Create Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </WebModal>

      {/* Import/Export Modal - Uses reusable component */}
      <ImportExportModal
        visible={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onSuccess={fetchData}
        title="Inventory Import / Export"
        exportEndpoint="/inventory/export"
        importEndpoint="/inventory/import"
        entityName="inventory products"
      />

      {/* View Item Details Modal */}
      <WebModal
        visible={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={viewingItem?.name || 'Item Details'}
        subtitle={`SKU: ${viewingItem?.sku || 'N/A'}`}
        icon="cube"
        iconColor={COLORS.primary}
        maxWidth={650}
      >
        {viewingItem && (
          <View>
            {/* Status Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={[webStyles.statusBadge, { 
                backgroundColor: viewingItem.status === 'in_stock' ? '#D1FAE5' : viewingItem.status === 'low_stock' ? '#FEF3C7' : '#FEE2E2' 
              }]}>
                <Text style={[webStyles.statusText, { 
                  color: viewingItem.status === 'in_stock' ? '#059669' : viewingItem.status === 'low_stock' ? '#D97706' : '#DC2626' 
                }]}>
                  {viewingItem.status === 'in_stock' ? 'In Stock' : viewingItem.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                </Text>
              </View>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Category: {viewingItem.category_name || 'Uncategorized'}
              </Text>
            </View>
            
            {/* Description */}
            {viewingItem.description && (
              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Description</Text>
                <View style={styles.viewCard}>
                  <Text style={{ fontSize: 14, color: '#374151' }}>{viewingItem.description}</Text>
                </View>
              </View>
            )}
            
            {/* Stock Information */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Stock Information</Text>
              <View style={styles.viewItemsTable}>
                <View style={styles.viewItemsRow}>
                  <Text style={[styles.viewItemsCell, { flex: 1, color: '#6B7280' }]}>Current Quantity</Text>
                  <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'right', fontWeight: '700', fontSize: 18, color: COLORS.primary }]}>{viewingItem.quantity} {viewingItem.unit}</Text>
                </View>
                <View style={styles.viewItemsRow}>
                  <Text style={[styles.viewItemsCell, { flex: 1, color: '#6B7280' }]}>Min Quantity</Text>
                  <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{viewingItem.min_quantity}</Text>
                </View>
                {viewingItem.max_quantity && (
                  <View style={styles.viewItemsRow}>
                    <Text style={[styles.viewItemsCell, { flex: 1, color: '#6B7280' }]}>Max Quantity</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{viewingItem.max_quantity}</Text>
                  </View>
                )}
                <View style={styles.viewItemsRow}>
                  <Text style={[styles.viewItemsCell, { flex: 1, color: '#6B7280' }]}>Unit Cost</Text>
                  <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(viewingItem.cost_price || 0)}</Text>
                </View>
                <View style={[styles.viewItemsRow, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.viewItemsCell, { flex: 1, color: '#059669', fontWeight: '600' }]}>Total Stock Value</Text>
                  <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: '#059669' }]}>{formatCurrency(viewingItem.stock_value || (viewingItem.quantity * (viewingItem.cost_price || 0)))}</Text>
                </View>
              </View>
            </View>
            
            {/* Additional Details */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Additional Details</Text>
              <View style={styles.viewCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>Location</Text>
                  <Text style={{ color: '#111827', fontSize: 14, fontWeight: '500' }}>{viewingItem.location || '-'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>Supplier</Text>
                  <Text style={{ color: '#111827', fontSize: 14, fontWeight: '500' }}>{viewingItem.supplier || '-'}</Text>
                </View>
                {viewingItem.notes && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 4 }}>Notes</Text>
                    <Text style={{ color: '#111827', fontSize: 14 }}>{viewingItem.notes}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Actions */}
            <View style={styles.viewActionsRow}>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: COLORS.primary }]} 
                onPress={() => { setViewingItem(null); setSelectedProduct(viewingItem); setShowAdjustModal(true); }}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Adjust Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: '#3B82F6' }]} 
                onPress={() => { setViewingItem(null); router.push('/inventory/products'); }}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Edit Product</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: '#DC2626' }]} 
                onPress={() => { setViewingItem(null); setProductToDelete(viewingItem); setShowConfirmDelete(true); }}
              >
                <Ionicons name="trash" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>

      {/* Delete Confirmation */}
      {/* Delete Confirmation */}
      <ConfirmationModal
        visible={showConfirmDelete}
        title="Delete Product?"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        onConfirm={handleDeleteProduct}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        icon="log-out-outline"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Success Confirmation Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
            </View>
            <Text style={styles.confirmTitle}>{successMessage.title}</Text>
            <Text style={styles.confirmMessage}>{successMessage.subtitle}</Text>
            <TouchableOpacity 
              style={[styles.submitBtn, { marginTop: 16 }]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.submitBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Inventory Quick Start Wizard */}
      <InventoryQuickStartWizard
        visible={showQuickStartWizard}
        onClose={() => {
          setShowQuickStartWizard(false);
          handleQuickStartComplete();
        }}
        onComplete={handleQuickStartComplete}
        onOpenAddItem={() => {
          setShowQuickStartWizard(false);
          handleQuickStartComplete();
          setTimeout(() => openAddStockModal(), 300);
        }}
      />
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
  userInfoWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  userAvatarWeb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarTextWeb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  userNameWeb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userRoleWeb: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Mobile: Back to Galaxy Button (Cyan banner like Retail Pro)
  backToGalaxyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06B6D4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
  backToGalaxyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backToGalaxyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Mobile: Header with Welcome message like Retail Pro
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  mobileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inventoryBadgeMobile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileGreeting: {
    fontSize: 13,
    color: '#6B7280',
  },
  mobileUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileLogoutButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confirmation modals
  logoutIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  
  // Old Mobile Header (keeping for backwards compat)
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  tabContainerCard: { flexDirection: 'row', backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: '#FFF' },
  
  // Main Card Container
  mainCard: {
    backgroundColor: '#E8F5E9',  // Light green tint for Inventory
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: 420,  // Increased to hold 3 cards
  },
  
  // Filter inside card
  filterContainerCard: { 
    flexDirection: 'row',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    gap: 8,
  },
  
  // List scroll inside card
  listScrollCard: { flex: 1, maxHeight: 300 },  // Increased height
  listContentCard: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyStateCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  
  // Admin Tools Card
  adminToolsCard: {
    backgroundColor: '#D1FAE5',  // Light green to match Inventory theme
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  adminToolsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  adminToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  adminToolItem: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  adminToolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  adminToolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  
  // Filters
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
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
  
  // Unit of Measure picker (same as Retail Pro)
  uomContainer: {
    marginBottom: 16,
  },
  unitPickerScroll: { 
    marginTop: 8,
  },
  unitPicker: { 
    flexDirection: 'row', 
    gap: 8,
    paddingRight: 16,
  },
  unitChip: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
  },
  unitChipActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
  },
  unitChipText: { 
    fontSize: 13, 
    fontWeight: '500', 
    color: '#374151',
  },
  unitChipTextActive: { 
    color: '#FFFFFF',
  },
  
  // Product Search Styles
  productSearchContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  searchResultsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 250,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  searchResultSku: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  noProductFound: {
    padding: 20,
    alignItems: 'center',
  },
  noProductText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  createProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createProductBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  selectedProductMeta: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  
  // Search-first Add Stock Modal styles
  searchSectionTitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
    textAlign: 'center',
  },
  searchResultsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addStockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProductBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  createProductBtnLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickCreateSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickCreateText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  quickCreateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  backToSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backToSearchText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  
  // Enhanced Adjust Stock Modal Styles
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  stockBadgeSmall: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  stockBadgeLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  addNewProductLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addNewProductLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectProductTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -10,
    zIndex: 1,
  },
  searchInputWithIcon: {
    paddingLeft: 40,
  },
  productScrollList: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 8,
  },
  // Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  paginationBtnDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  paginationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paginationBtnTextDisabled: {
    color: '#D1D5DB',
  },
  paginationInfo: {
    fontSize: 13,
    color: COLORS.gray,
  },
  // Loading more styles (mobile)
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  loadMoreHint: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 8,
  },
  loadMoreHintText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  selectedProductCardEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedProductMainInfo: {
    flex: 1,
  },
  selectedProductSku: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  selectedProductStockInfo: {
    alignItems: 'center',
    marginRight: 12,
  },
  selectedProductQty: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectedProductQtyLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  changeProductBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changeProductBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  movementTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  movementTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  movementTypeBtnIn: {
    backgroundColor: '#10B981',
  },
  movementTypeBtnOut: {
    backgroundColor: '#DC2626',
  },
  movementTypeBtnAdj: {
    backgroundColor: '#F59E0B',
  },
  movementTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  movementTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  confirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  confirmDetailRow: {
    fontSize: 15,
    marginBottom: 8,
  },
  confirmDetailLabel: {
    color: COLORS.gray,
  },
  confirmDetailValue: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  // Full Product Form Styles
  createProductForm: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  mobileRow: {
    marginBottom: 0,
  },
  fullInput: {
    marginBottom: 12,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addCategoryChipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noCategoriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 10,
    marginBottom: 12,
  },
  noCategoriesText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  inlineCategoryForm: {
    backgroundColor: '#DCFCE7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  inlineCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  inlineCategoryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCategoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  inlineCategoryInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    fontSize: 14,
    color: COLORS.dark,
  },
  inlineCategoryDescInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inlineCategoryButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  inlineCategoryCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inlineCategoryCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  inlineCategorySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    gap: 6,
  },
  inlineCategorySaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Inline UOM Form Styles
  inlineUomForm: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inlineUomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineUomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  inlineUomCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineUomLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  inlineUomInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    fontSize: 14,
    color: COLORS.dark,
  },
  inlineUomButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  inlineUomCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inlineUomCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  inlineUomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    gap: 6,
  },
  inlineUomSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addUomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    gap: 4,
  },
  addUomChipText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  // Toggle Switch Styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Add Product Button
  addProductBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  addProductBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // New Form Styles for Retail Pro Design
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.dark,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  formHalf: {
    flex: 1,
  },
  chipScroller: {
    marginTop: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  chipAddText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  currencyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    padding: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  switchTrack: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: COLORS.primary,
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchKnobActive: {
    alignSelf: 'flex-end',
  },
  // Variants Section Styles - Green theme
  variantsSection: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  variantsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  variantsHelpText: {
    fontSize: 13,
    color: '#15803D',
    marginBottom: 16,
    lineHeight: 18,
  },
  variantInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  variantInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  variantNameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantValuesInput: {
    fontSize: 14,
    color: COLORS.dark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeVariantBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVariantTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderStyle: 'dashed',
    gap: 8,
  },
  addVariantTypeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#16A34A',
  },
  createProductButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  createProductButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // View Item Modal Styles
  viewSection: {
    marginBottom: 20,
  },
  viewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  viewItemsTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewItemsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewItemsCell: {
    fontSize: 14,
    color: '#111827',
  },
  viewActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  viewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Web Dashboard Styles
const webStyles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dashboardContent: {
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  mainContent: {
    flexDirection: 'row',
    gap: 24,
  },
  tableCard: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebar: {
    flex: 1,
    gap: 20,
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  linksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 160,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
