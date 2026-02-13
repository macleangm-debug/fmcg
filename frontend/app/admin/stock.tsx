import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBusinessStore } from '../../src/store/businessStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import api, { productsApi, categoriesApi } from '../../src/api/client';
import { formatNumber, formatNumberInput, parseFormattedNumber } from '../../src/utils/formatNumber';

interface StockProduct {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  stock_value: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  track_stock: boolean;
}

interface StockSummary {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  products: StockProduct[];
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  movement_type: 'in' | 'out' | 'adjustment' | 'return';
  reason?: string;
  reference?: string;
  previous_stock: number;
  new_stock: number;
  created_by_name: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  category_name?: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  has_variants?: boolean;
  variant_options?: { name: string; values: string[] }[];
  variants?: ProductVariant[];
}

interface ProductVariant {
  options: Record<string, string>;
  sku: string;
  stock_quantity: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function StockManagement() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, settings } = useBusinessStore();
  const { stockView, setStockView } = useViewSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'movements'>('summary');
  
  // Products list for selection
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Add Stock Modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Add New Product Modal - Full fields including variants
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('0');
  const [newProductCostPrice, setNewProductCostPrice] = useState('0');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductStockQty, setNewProductStockQty] = useState('0');
  const [newProductLowStockThreshold, setNewProductLowStockThreshold] = useState('10');
  const [newProductTaxRate, setNewProductTaxRate] = useState('0');
  const [newProductTrackStock, setNewProductTrackStock] = useState(true);
  const [newProductHasVariants, setNewProductHasVariants] = useState(false);
  const [newProductVariantInputs, setNewProductVariantInputs] = useState<{ name: string; valuesText: string }[]>([]);
  const [newProductVariants, setNewProductVariants] = useState<ProductVariant[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  
  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  
  // Search state for main list
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state for product list in modals
  const ITEMS_PER_PAGE = 10;
  const [modalProductPage, setModalProductPage] = useState(1);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  // Form validation state - Add Stock Modal
  const [stockFormErrors, setStockFormErrors] = useState<{
    quantity?: string;
    reason?: string;
  }>({});
  const [stockFormTouched, setStockFormTouched] = useState<{
    quantity?: boolean;
    reason?: boolean;
  }>({});

  // Form validation state - New Product Modal
  const [productFormErrors, setProductFormErrors] = useState<{
    name?: string;
    price?: string;
    category?: string;
  }>({});
  const [productFormTouched, setProductFormTouched] = useState<{
    name?: boolean;
    price?: boolean;
    category?: boolean;
  }>({});

  const validateQuantity = (value: string) => {
    if (!value) return 'Quantity is required';
    const num = parseInt(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num <= 0) return 'Quantity must be greater than zero';
    return undefined;
  };

  const validateReason = (value: string, type: string) => {
    if ((type === 'out' || type === 'adjustment') && !value.trim()) {
      return 'Reason is required for stock out/adjustment';
    }
    return undefined;
  };

  const validateProductName = (value: string) => {
    if (!value.trim()) return 'Product name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validateProductPrice = (value: string) => {
    if (!value) return 'Price is required';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid price';
    if (num < 0) return 'Price cannot be negative';
    return undefined;
  };

  const validateProductCategory = (value: string) => {
    if (!value) return 'Please select a category';
    return undefined;
  };

  const handleStockFieldBlur = (field: 'quantity' | 'reason') => {
    setStockFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'quantity') {
      setStockFormErrors(prev => ({ ...prev, quantity: validateQuantity(adjustmentQty) }));
    } else if (field === 'reason') {
      setStockFormErrors(prev => ({ ...prev, reason: validateReason(adjustmentReason, adjustmentType) }));
    }
  };

  const handleProductFieldBlur = (field: 'name' | 'price' | 'category') => {
    setProductFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'name') {
      setProductFormErrors(prev => ({ ...prev, name: validateProductName(newProductName) }));
    } else if (field === 'price') {
      setProductFormErrors(prev => ({ ...prev, price: validateProductPrice(newProductPrice) }));
    } else if (field === 'category') {
      setProductFormErrors(prev => ({ ...prev, category: validateProductCategory(newProductCategory) }));
    }
  };

  const loadData = async () => {
    try {
      const [summaryRes, movementsRes, productsRes, categoriesRes] = await Promise.all([
        api.get('/stock/summary'),
        api.get('/stock/movements'),
        productsApi.getAll({ limit: 100 }),
        categoriesApi.getAll(),
      ]);
      setSummary(summaryRes.data);
      setMovements(movementsRes.data);
      setAllProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.log('Failed to load stock data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const selectProduct = (product: Product) => {
    console.log('Selecting product:', product.name, 'has_variants:', product.has_variants, 'variants:', product.variants?.length);
    setSelectedProduct(product);
    setSelectedVariantIndex(null);
    setUnitCost(product.cost_price?.toString() || '');
  };

  const openNewProductModal = (preFillName?: string) => {
    setNewProductName(preFillName || '');
    setNewProductSku('');
    setNewProductDescription('');
    setNewProductCategory(categories[0]?.id || '');
    setNewProductPrice('');
    setNewProductCostPrice('');
    setNewProductBarcode('');
    setNewProductStockQty('');
    setNewProductLowStockThreshold('');
    setNewProductTaxRate('');
    setNewProductTrackStock(true);
    setNewProductHasVariants(false);
    setNewProductVariantInputs([]);
    setNewProductVariants([]);
    setShowNewProductModal(true);
  };

  // Helper to generate variant combinations
  const generateVariantCombinations = (options: { name: string; values: string[] }[]): { options: Record<string, string>; label: string }[] => {
    if (options.length === 0) return [];
    
    const validOptions = options.filter(opt => opt.values.length > 0);
    if (validOptions.length === 0) return [];
    
    const cartesian = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      return arrays.reduce<string[][]>((acc, curr) => {
        return acc.flatMap(a => curr.map(c => [...a, c]));
      }, [[]]);
    };
    
    const valueArrays = validOptions.map(opt => opt.values);
    const combinations = cartesian(valueArrays);
    
    return combinations.map(combo => {
      const opts: Record<string, string> = {};
      validOptions.forEach((opt, idx) => {
        opts[opt.name] = combo[idx];
      });
      const label = combo.join(' / ');
      return { options: opts, label };
    });
  };

  // Add a new variant type
  const addNewProductVariantType = () => {
    setNewProductVariantInputs([...newProductVariantInputs, { name: '', valuesText: '' }]);
  };

  // Update variant type name or values
  const updateNewProductVariantInput = (index: number, field: 'name' | 'valuesText', value: string) => {
    const updated = [...newProductVariantInputs];
    updated[index] = { ...updated[index], [field]: value };
    setNewProductVariantInputs(updated);
    regenerateNewProductVariants(updated);
  };

  // Remove a variant type
  const removeNewProductVariantType = (index: number) => {
    const updated = newProductVariantInputs.filter((_, i) => i !== index);
    setNewProductVariantInputs(updated);
    regenerateNewProductVariants(updated);
  };

  // Regenerate variant combinations
  const regenerateNewProductVariants = (inputs: { name: string; valuesText: string }[]) => {
    const options = inputs
      .filter(inp => inp.name.trim() && inp.valuesText.trim())
      .map(inp => ({
        name: inp.name.trim(),
        values: inp.valuesText.split(',').map(v => v.trim()).filter(v => v)
      }));

    const combinations = generateVariantCombinations(options);
    
    const variants: ProductVariant[] = combinations.map(combo => ({
      options: combo.options,
      sku: `${newProductSku || 'SKU'}-${combo.label.replace(/ \/ /g, '-').replace(/\s+/g, '')}`,
      stock_quantity: 0,
      is_active: true,
    }));
    
    setNewProductVariants(variants);
  };

  // Update variant stock
  const updateNewProductVariantStock = (variantIndex: number, stock: string) => {
    const updated = [...newProductVariants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      stock_quantity: parseInt(stock) || 0
    };
    setNewProductVariants(updated);
  };

  const handleSaveNewProduct = async () => {
    // Validate all fields
    setProductFormTouched({ name: true, price: true, category: true });
    const nameError = validateProductName(newProductName);
    const priceError = validateProductPrice(newProductPrice);
    const categoryError = validateProductCategory(newProductCategory);
    setProductFormErrors({ name: nameError, price: priceError, category: categoryError });

    if (nameError || priceError || categoryError) {
      return;
    }

    // Validate SKU
    if (!newProductSku.trim()) {
      Alert.alert('Error', 'SKU is required');
      return;
    }

    // Validate variants if enabled
    if (newProductHasVariants && newProductVariantInputs.length > 0) {
      const invalidInput = newProductVariantInputs.find(inp => !inp.name.trim() || !inp.valuesText.trim());
      if (invalidInput) {
        Alert.alert('Incomplete Variant', 'Please fill in both variant name and values');
        return;
      }
    }

    setSavingProduct(true);
    try {
      // Build variant_options
      const variantOptions = newProductVariantInputs
        .filter(inp => inp.name.trim() && inp.valuesText.trim())
        .map(inp => ({
          name: inp.name.trim(),
          values: inp.valuesText.split(',').map(v => v.trim()).filter(v => v)
        }));

      // Calculate total stock
      const totalStock = newProductHasVariants && newProductVariants.length > 0
        ? newProductVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : parseInt(newProductStockQty) || 0;

      const productData = {
        name: newProductName.trim(),
        description: newProductDescription.trim() || undefined,
        sku: newProductSku.trim(),
        barcode: newProductBarcode.trim() || undefined,
        category_id: newProductCategory,
        price: parseFloat(newProductPrice) || 0,
        cost_price: parseFloat(newProductCostPrice) || 0,
        stock_quantity: totalStock,
        low_stock_threshold: parseInt(newProductLowStockThreshold) || 0,
        tax_rate: parseFloat(newProductTaxRate) || 0,
        track_stock: newProductTrackStock,
        has_variants: newProductHasVariants && variantOptions.length > 0,
        variant_options: newProductHasVariants && variantOptions.length > 0 ? variantOptions : undefined,
        variants: newProductHasVariants && newProductVariants.length > 0 ? newProductVariants : undefined,
      };

      const response = await productsApi.create(productData);
      
      // Add the new product to the list and select it
      const newProduct = response.data;
      setAllProducts(prev => [newProduct, ...prev]);
      setSelectedProduct(newProduct);
      setUnitCost(newProduct.cost_price?.toString() || newProductCostPrice);
      setShowNewProductModal(false);
      
      Alert.alert('✓ Product Created', `"${newProductName}" has been added. You can now adjust its stock.`);
      loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSubmitPress = () => {
    if (!selectedProduct || !adjustmentQty) {
      Alert.alert('Error', 'Please select a product and enter quantity');
      return;
    }

    const qty = parseInt(adjustmentQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (adjustmentType === 'in' && !unitCost) {
      Alert.alert('Error', 'Please enter unit cost for stock purchase');
      return;
    }

    setShowConfirmModal(true);
  };

  // Load more products for infinite scroll (mobile)
  const loadMoreProducts = () => {
    if (loadingMoreProducts) return;
    
    // Check if there are more items to load
    const currentlyShowing = modalProductPage * ITEMS_PER_PAGE;
    if (currentlyShowing >= filteredProductsForSelection.length) return; // No more items
    
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
    const currentlyShowing = modalProductPage * ITEMS_PER_PAGE;
    
    if (isCloseToBottom && currentlyShowing < filteredProductsForSelection.length) {
      loadMoreProducts();
    }
  };

  // Reset pagination when modal opens
  const openAddStockModal = () => {
    setModalProductPage(1);
    setSelectedProduct(null);
    setProductSearchQuery('');
    setAdjustmentType('in');
    setAdjustmentQty('');
    setAdjustmentReason('');
    setUnitCost('');
    setSupplier('');
    setShowAddStockModal(true);
  };

  const submitAdjustment = async () => {
    if (!selectedProduct || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty, 10);
    
    setShowConfirmModal(false);
    setSubmitting(true);
    
    try {
      const costValue = parseFloat(unitCost) || selectedProduct.cost_price || 0;
      
      await api.post('/stock/movements', {
        product_id: selectedProduct.id,
        quantity: adjustmentType === 'out' ? -qty : qty,
        movement_type: adjustmentType,
        reason: adjustmentReason || `Stock ${adjustmentType === 'in' ? 'purchase' : adjustmentType === 'out' ? 'removed' : 'adjusted'}`,
        unit_cost: costValue,
        supplier: supplier || 'Supplier',
        create_expense: adjustmentType === 'in',
      });

      const totalCost = costValue * qty;
      const message = adjustmentType === 'in' 
        ? `Stock added! Expense of ${formatCurrency(totalCost)} recorded.`
        : 'Stock updated successfully';
      
      Alert.alert('Success', message);
      setShowAddStockModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return '#DC2626';
      case 'low_stock':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'low_stock':
        return 'Low Stock';
      default:
        return 'In Stock';
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return { name: 'arrow-down-circle', color: '#10B981' };
      case 'out':
        return { name: 'arrow-up-circle', color: '#DC2626' };
      case 'return':
        return { name: 'refresh-circle', color: '#2563EB' };
      default:
        return { name: 'swap-horizontal', color: '#F59E0B' };
    }
  };

  const filteredProducts = summary?.products.filter(p => {
    // Filter by status
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category_name.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  // Filter products for selection modal - sorted alphabetically
  const filteredProductsForSelection = allProducts
    .filter(p => 
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    router.back();
  };

  // Render product card (grid view)
  const renderProductGrid = (product: StockProduct) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => {
        const fullProduct = allProducts.find(p => p.id === product.id);
        if (fullProduct) {
          selectProduct(fullProduct);
          setShowAddStockModal(true);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productSku}>SKU: {product.sku}</Text>
        <Text style={styles.productCategory}>{product.category_name}</Text>
      </View>
      <View style={styles.productStock}>
        <Text style={[styles.stockQty, { color: getStatusColor(product.status) }]}>
          {product.stock_quantity}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(product.status) }]}>
            {getStatusLabel(product.status)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // Render product row (table view)
  const renderProductTable = (product: StockProduct) => (
    <Pressable
      key={product.id}
      style={styles.tableRow}
      onPress={() => {
        const fullProduct = allProducts.find(p => p.id === product.id);
        console.log('Clicked product:', product.name, 'fullProduct:', fullProduct?.name, 'has_variants:', fullProduct?.has_variants, 'variants:', fullProduct?.variants?.length);
        if (fullProduct) {
          selectProduct(fullProduct);
          setShowAddStockModal(true);
        } else {
          // Fallback to stock product data
          console.warn('Full product not found, using stock product');
          selectProduct(product as any);
          setShowAddStockModal(true);
        }
      }}
    >
      <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{product.name}</Text>
      <Text style={[styles.tableCell, styles.tableCellSku]}>{product.sku}</Text>
      <Text style={[styles.tableCell, styles.tableCellCategory]}>{product.category_name}</Text>
      <Text style={[styles.tableCell, styles.tableCellQty, { color: getStatusColor(product.status) }]}>
        {formatNumber(product.stock_quantity)}
      </Text>
      <Text style={[styles.tableCell, styles.tableCellValue]}>{formatCurrency(product.stock_value)}</Text>
      <View style={[styles.tableCell, styles.tableCellStatus]}>
        <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(product.status) + '20' }]}>
          <Text style={[styles.statusTextSmall, { color: getStatusColor(product.status) }]}>
            {getStatusLabel(product.status)}
          </Text>
        </View>
      </View>
      <View style={[styles.tableCell, styles.tableCellActions]}>
        <Pressable style={styles.tableActionButton}>
          <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
        </Pressable>
      </View>
    </Pressable>
  );

  // Table header
  const StockTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellSku]}>SKU</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellCategory]}>Category</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>Qty</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellValue]}>Value</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStatus]}>Status</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Action</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Stock Management</Text>
            <Text style={styles.webPageSubtitle}>{summary?.total_products || 0} products • {formatCurrency(summary?.total_stock_value || 0)} total value</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={stockView}
              onToggle={setStockView}
            />
            <Pressable 
              onPress={openAddStockModal} 
              style={styles.webCreateBtn}
              accessibilityRole="button"
              accessibilityLabel="Add Stock"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Stock</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Stock Management</Text>
          <View style={styles.headerActions}>
            <Pressable 
              onPress={openAddStockModal} 
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add Stock"
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Filter and Search Row */}
            <View style={styles.webCardHeader}>
              <View style={styles.webTabs}>
                <TouchableOpacity
                  style={[styles.webTab, activeTab === 'summary' && styles.webTabActive]}
                  onPress={() => setActiveTab('summary')}
                >
                  <Text style={[styles.webTabText, activeTab === 'summary' && styles.webTabTextActive]}>
                    Stock Levels
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.webTab, activeTab === 'movements' && styles.webTabActive]}
                  onPress={() => setActiveTab('movements')}
                >
                  <Text style={[styles.webTabText, activeTab === 'movements' && styles.webTabTextActive]}>
                    History
                  </Text>
                </TouchableOpacity>
              </View>
              
              {activeTab === 'summary' && (
                <View style={styles.webFilterGroup}>
                  <View style={styles.webStatusTabs}>
                    <TouchableOpacity
                      style={[styles.webStatusTab, filterStatus === 'all' && styles.webStatusTabActive]}
                      onPress={() => setFilterStatus('all')}
                    >
                      <Text style={[styles.webStatusTabText, filterStatus === 'all' && styles.webStatusTabTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.webStatusTab, filterStatus === 'low_stock' && styles.webStatusTabActive]}
                      onPress={() => setFilterStatus('low_stock')}
                    >
                      <Text style={[styles.webStatusTabText, filterStatus === 'low_stock' && styles.webStatusTabTextActive]}>Low Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.webStatusTab, filterStatus === 'out_of_stock' && styles.webStatusTabActive]}
                      onPress={() => setFilterStatus('out_of_stock')}
                    >
                      <Text style={[styles.webStatusTabText, filterStatus === 'out_of_stock' && styles.webStatusTabTextActive]}>Out</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.webSearchBox}>
                    <Ionicons name="search" size={18} color="#6B7280" />
                    <TextInput
                      style={styles.webSearchInput}
                      placeholder="Search products..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#6B7280"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Stats Summary Row */}
            <View style={styles.webStatsRow}>
              <View style={styles.webStatItem}>
                <Text style={styles.webStatValue}>{summary?.total_products || 0}</Text>
                <Text style={styles.webStatLabel}>Products</Text>
              </View>
              <View style={styles.webStatItem}>
                <Text style={[styles.webStatValue, { color: '#10B981' }]}>{formatCurrency(summary?.total_stock_value || 0)}</Text>
                <Text style={styles.webStatLabel}>Stock Value</Text>
              </View>
              <View style={styles.webStatItem}>
                <Text style={[styles.webStatValue, { color: '#F59E0B' }]}>{summary?.low_stock_count || 0}</Text>
                <Text style={styles.webStatLabel}>Low Stock</Text>
              </View>
              <View style={styles.webStatItem}>
                <Text style={[styles.webStatValue, { color: '#DC2626' }]}>{summary?.out_of_stock_count || 0}</Text>
                <Text style={styles.webStatLabel}>Out of Stock</Text>
              </View>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {activeTab === 'summary' ? (
                <>
                  {stockView === 'table' && <StockTableHeader />}
                  {filteredProducts.length === 0 ? (
                    <View style={styles.webEmptyState}>
                      <Ionicons name="cube-outline" size={64} color="#6B7280" />
                      <Text style={styles.webEmptyText}>No products found</Text>
                    </View>
                  ) : stockView === 'table' ? (
                    filteredProducts.map((item) => renderProductTable(item))
                  ) : (
                    <View style={styles.webGridList}>
                      {filteredProducts.map((item) => renderProductGrid(item))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {movements.length === 0 ? (
                    <View style={styles.webEmptyState}>
                      <Ionicons name="swap-horizontal-outline" size={64} color="#6B7280" />
                      <Text style={styles.webEmptyText}>No stock movements yet</Text>
                    </View>
                  ) : (
                    movements.map((movement) => {
                      const iconInfo = getMovementIcon(movement.movement_type);
                      return (
                        <View key={movement.id} style={styles.movementCard}>
                          <View style={[styles.movementIcon, { backgroundColor: iconInfo.color + '20' }]}>
                            <Ionicons name={iconInfo.name as any} size={24} color={iconInfo.color} />
                          </View>
                          <View style={styles.movementInfo}>
                            <Text style={styles.movementProduct}>{movement.product_name}</Text>
                            <Text style={styles.movementDetails}>
                              {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                              {Math.abs(movement.quantity)} units • {movement.reason || 'No reason'}
                            </Text>
                            <Text style={styles.movementMeta}>
                              {new Date(movement.created_at).toLocaleDateString()} • {movement.created_by_name}
                            </Text>
                          </View>
                          <View style={styles.movementStockChange}>
                            <Text style={styles.stockChangeLabel}>Stock</Text>
                            <Text style={styles.stockChangeValue}>
                              {movement.previous_stock} → {movement.new_stock}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <>
          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Ionicons name="cube-outline" size={24} color="#2563EB" />
              <Text style={styles.summaryValue}>{summary?.total_products || 0}</Text>
              <Text style={styles.summaryLabel}>Products</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={24} color="#10B981" />
              <Text style={styles.summaryValue}>{formatCurrency(summary?.total_stock_value || 0)}</Text>
              <Text style={styles.summaryLabel}>Stock Value</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning-outline" size={24} color="#F59E0B" />
              <Text style={styles.summaryValue}>{summary?.low_stock_count || 0}</Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
              <Text style={styles.summaryValue}>{summary?.out_of_stock_count || 0}</Text>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
              onPress={() => setActiveTab('summary')}
            >
              <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
                Stock Levels
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'movements' && styles.activeTab]}
              onPress={() => setActiveTab('movements')}
            >
              <Text style={[styles.tabText, activeTab === 'movements' && styles.activeTabText]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Content Card Container */}
          <View style={styles.mainContentCard}>
            {activeTab === 'summary' && (
              <>
                {/* Filter inside card */}
                <View style={styles.filterRowCard}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('all')}
                  >
                    <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'low_stock' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('low_stock')}
                  >
                    <Text style={[styles.filterChipText, filterStatus === 'low_stock' && styles.filterChipTextActive]}>
                      Low Stock
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'out_of_stock' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('out_of_stock')}
                  >
                    <Text style={[styles.filterChipText, filterStatus === 'out_of_stock' && styles.filterChipTextActive]}>
                      Out of Stock
                    </Text>
                  </TouchableOpacity>
                </View>

              {/* Product List inside card */}
              <ScrollView
                style={styles.cardListScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              >
                {filteredProducts.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>No Products</Text>
                    <Text style={styles.emptyStateText}>
                      Add products to track your stock levels
                    </Text>
                    <TouchableOpacity style={styles.emptyStateButton} onPress={openAddStockModal}>
                      <Text style={styles.emptyStateButtonText}>Add Stock</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.cardListContent}>
                    {filteredProducts.map((product) => renderProductGrid(product))}
                  </View>
                )}
              </ScrollView>
            </>
          )}

          {activeTab === 'movements' && (
            <ScrollView
              style={styles.cardListScroll}
              nestedScrollEnabled
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {movements.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="swap-horizontal-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateTitle}>No Stock Movements</Text>
                  <Text style={styles.emptyStateText}>
                    Stock movements will appear here when you add or adjust stock
                  </Text>
                </View>
              ) : (
                <View style={styles.cardListContent}>
                  {movements.map((movement) => {
                    const iconInfo = getMovementIcon(movement.movement_type);
                    return (
                      <View key={movement.id} style={styles.movementCard}>
                        <View style={[styles.movementIcon, { backgroundColor: iconInfo.color + '20' }]}>
                          <Ionicons name={iconInfo.name as any} size={24} color={iconInfo.color} />
                        </View>
                        <View style={styles.movementInfo}>
                          <Text style={styles.movementProduct}>{movement.product_name}</Text>
                          <Text style={styles.movementDetails}>
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                            {Math.abs(movement.quantity)} units • {movement.reason || 'No reason'}
                          </Text>
                          <Text style={styles.movementMeta}>
                            {new Date(movement.created_at).toLocaleDateString()} • {movement.created_by_name}
                          </Text>
                        </View>
                        <View style={styles.movementStockChange}>
                          <Text style={styles.stockChangeLabel}>Stock</Text>
                          <Text style={styles.stockChangeValue}>
                            {movement.previous_stock} → {movement.new_stock}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
        </>
      )}

      {/* Add Stock Modal */}
      <WebModal
        visible={showAddStockModal}
        onClose={() => setShowAddStockModal(false)}
        title="Add / Adjust Stock"
        subtitle="Update inventory quantities"
        icon="cube-outline"
        iconColor="#10B981"
        maxWidth={520}
      >
        {/* Product Selection */}
        {!selectedProduct ? (
          <>
            <Text style={styles.modalSectionTitle}>Select Product</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={productSearchQuery}
                onChangeText={(text) => { setProductSearchQuery(text); setModalProductPage(1); }}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Product List - Infinite scroll (mobile) or pagination (web) */}
            {(() => {
              const allSortedItems = filteredProductsForSelection;
              
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
                    style={styles.productSelectionList} 
                    nestedScrollEnabled
                    onScroll={!isWeb ? handleProductListScroll : undefined}
                    scrollEventThrottle={16}
                  >
                    {displayItems.length === 0 && productSearchQuery.length > 0 ? (
                      <View style={styles.noProductsFound}>
                        <Text style={styles.noProductsText}>No products found for "{productSearchQuery}"</Text>
                        <Pressable 
                          style={styles.createProductQuickBtn} 
                          onPress={() => openNewProductModal(productSearchQuery)}
                        >
                          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.createProductQuickBtnText}>Create "{productSearchQuery}"</Text>
                        </Pressable>
                      </View>
                    ) : displayItems.length === 0 ? (
                      <View style={styles.noProductsFound}>
                        <Text style={styles.noProductsText}>No products available</Text>
                      </View>
                    ) : (
                      <>
                        {displayItems.map((product) => (
                          <TouchableOpacity
                            key={product.id}
                            style={styles.productSelectionItem}
                            onPress={() => {
                              console.log('Product selection pressed:', product.name, 'has_variants:', product.has_variants);
                              selectProduct(product);
                            }}
                            activeOpacity={0.6}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <View style={styles.productSelectionInfo}>
                              <Text style={styles.productSelectionName}>{product.name}</Text>
                              <Text style={styles.productSelectionSku}>SKU: {product.sku}</Text>
                              {product.has_variants && (
                                <View style={styles.productVariantBadge}>
                                  <Ionicons name="layers-outline" size={10} color="#8B5CF6" />
                                  <Text style={styles.productVariantBadgeText}>Variants</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.productSelectionStock}>
                              <Text style={styles.productSelectionQty}>{formatNumber(product.stock_quantity)}</Text>
                              <Text style={styles.productSelectionQtyLabel}>in stock</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {/* Mobile: Loading indicator at bottom */}
                        {!isWeb && loadingMoreProducts && (
                          <View style={styles.loadingMoreContainer}>
                            <ActivityIndicator size="small" color="#2563EB" />
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
                        <Ionicons name="chevron-back" size={18} color={modalProductPage === 1 ? '#D1D5DB' : '#2563EB'} />
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
                        <Ionicons name="chevron-forward" size={18} color={modalProductPage >= totalPages ? '#D1D5DB' : '#2563EB'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}

            <Pressable style={styles.addNewProductButton} onPress={() => openNewProductModal(productSearchQuery)}>
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addNewProductText}>Add New Product</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Selected Product Info */}
            <View style={styles.selectedProductCard}>
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                <Text style={styles.selectedProductSku}>SKU: {selectedProduct.sku}</Text>
                {selectedProduct.has_variants && (
                  <View style={styles.variantBadge}>
                    <Ionicons name="layers-outline" size={12} color="#2563EB" />
                    <Text style={styles.variantBadgeText}>Has Variants</Text>
                  </View>
                )}
              </View>
              <View style={styles.selectedProductStock}>
                <Text style={styles.selectedProductQty}>
                  {selectedVariantIndex !== null && selectedProduct.variants 
                    ? selectedProduct.variants[selectedVariantIndex].stock_quantity 
                    : selectedProduct.stock_quantity}
                </Text>
                <Text style={styles.selectedProductQtyLabel}>in stock</Text>
              </View>
              <Pressable 
                style={styles.changeProductButton}
                onPress={() => {
                  setSelectedProduct(null);
                  setSelectedVariantIndex(null);
                }}
              >
                <Text style={styles.changeProductText}>Change</Text>
              </Pressable>
            </View>

            {/* Variant Selection - only show if product has variants */}
            {selectedProduct.has_variants && selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <View style={styles.variantSelectionSection}>
                <Text style={styles.modalSectionTitle}>Select Variant *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantChipsScroll}>
                  {selectedProduct.variants.map((variant, index) => {
                    const variantLabel = Object.values(variant.options).join(' / ');
                    const isSelected = selectedVariantIndex === index;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.variantChip,
                          isSelected && styles.variantChipSelected
                        ]}
                        onPress={() => {
                          console.log('Variant chip selected:', variantLabel, index);
                          setSelectedVariantIndex(index);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.variantChipText,
                          isSelected && styles.variantChipTextSelected
                        ]}>
                          {variantLabel}
                        </Text>
                        <Text style={[
                          styles.variantChipStock,
                          isSelected && styles.variantChipStockSelected
                        ]}>
                          {formatNumber(variant.stock_quantity)} in stock
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedProduct.has_variants && selectedVariantIndex === null && (
                  <Text style={styles.variantWarning}>
                    Please select a variant to continue
                  </Text>
                )}
              </View>
            )}

            {/* Movement Type */}
            <Text style={styles.modalSectionTitle}>Movement Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, adjustmentType === 'in' && styles.typeButtonActiveIn]}
                onPress={() => setAdjustmentType('in')}
              >
                <Ionicons name="arrow-down-circle" size={20} color={adjustmentType === 'in' ? '#FFFFFF' : '#10B981'} />
                <Text style={[styles.typeButtonText, adjustmentType === 'in' && styles.typeButtonTextActive]}>
                  Stock In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, adjustmentType === 'out' && styles.typeButtonActiveOut]}
                onPress={() => setAdjustmentType('out')}
              >
                <Ionicons name="arrow-up-circle" size={20} color={adjustmentType === 'out' ? '#FFFFFF' : '#DC2626'} />
                <Text style={[styles.typeButtonText, adjustmentType === 'out' && styles.typeButtonTextActive]}>
                  Stock Out
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, adjustmentType === 'adjustment' && styles.typeButtonActiveAdj]}
                onPress={() => setAdjustmentType('adjustment')}
              >
                <Ionicons name="swap-horizontal" size={20} color={adjustmentType === 'adjustment' ? '#FFFFFF' : '#F59E0B'} />
                <Text style={[styles.typeButtonText, adjustmentType === 'adjustment' && styles.typeButtonTextActive]}>
                  Adjust
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quantity */}
            <Input
              label="Quantity *"
              placeholder="Enter quantity"
              value={adjustmentQty}
              onChangeText={setAdjustmentQty}
              keyboardType="number-pad"
            />

            {/* Stock In specific fields */}
            {adjustmentType === 'in' && (
              <>
                <Input
                  label="Unit Cost *"
                  placeholder="Cost per unit"
                  value={unitCost}
                  onChangeText={setUnitCost}
                  keyboardType="decimal-pad"
                  leftIcon={<Text style={styles.currencyPrefix}>{settings?.currencySymbol || '$'}</Text>}
                />

                <Input
                  label="Supplier"
                  placeholder="Supplier name (optional)"
                  value={supplier}
                  onChangeText={setSupplier}
                />

                <View style={styles.expenseNote}>
                  <Ionicons name="information-circle" size={16} color="#2563EB" />
                  <Text style={styles.expenseNoteText}>
                    An expense will be automatically created for this stock purchase
                  </Text>
                </View>
              </>
            )}

            {/* Reason */}
            <Input
              label="Reason"
              placeholder="Enter reason (optional)"
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
              multiline
            />

            <Button
              title={adjustmentType === 'in' ? 'Add Stock & Record Expense' : 'Update Stock'}
              onPress={handleSubmitPress}
              loading={submitting}
              style={styles.submitButton}
            />
          </>
        )}
      </WebModal>

      {/* Add New Product Modal */}
      <WebModal
        visible={showNewProductModal}
        onClose={() => setShowNewProductModal(false)}
        title="Add New Product"
        subtitle="Create a new product for inventory"
        icon="add-circle-outline"
        iconColor="#2563EB"
        maxWidth={550}
      >
        <Input
          label="Product Name *"
          placeholder="Enter product name"
          value={newProductName}
          onChangeText={setNewProductName}
        />

        <Input
          label="Description"
          placeholder="Enter product description (optional)"
          value={newProductDescription}
          onChangeText={setNewProductDescription}
          multiline
        />

        <View style={styles.priceRow}>
          <View style={styles.priceInputContainer}>
            <Input
              label="SKU *"
              placeholder="PROD-001"
              value={newProductSku}
              onChangeText={setNewProductSku}
            />
          </View>
          <View style={styles.priceInputContainer}>
            <Input
              label="Barcode"
              placeholder="Barcode (optional)"
              value={newProductBarcode}
              onChangeText={setNewProductBarcode}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                newProductCategory === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => setNewProductCategory(cat.id)}
            >
              <Text style={[
                styles.categoryChipText,
                newProductCategory === cat.id && styles.categoryChipTextSelected,
              ]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.priceRow}>
          <View style={styles.priceInputContainer}>
            <Input
              label="Selling Price"
              placeholder="0.00"
              value={newProductPrice}
              onChangeText={setNewProductPrice}
              keyboardType="decimal-pad"
              leftIcon={<Text style={styles.currencyPrefix}>{settings?.currencySymbol || '$'}</Text>}
            />
          </View>
          <View style={styles.priceInputContainer}>
            <Input
              label="Cost Price"
              placeholder="0.00"
              value={newProductCostPrice}
              onChangeText={setNewProductCostPrice}
              keyboardType="decimal-pad"
              leftIcon={<Text style={styles.currencyPrefix}>{settings?.currencySymbol || '$'}</Text>}
            />
          </View>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceInputContainer}>
            <Input
              label="Tax Rate (%)"
              placeholder="0"
              value={newProductTaxRate}
              onChangeText={setNewProductTaxRate}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.priceInputContainer}>
            <Input
              label="Low Stock Alert"
              placeholder="10"
              value={newProductLowStockThreshold}
              onChangeText={setNewProductLowStockThreshold}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Track Stock Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Track Stock</Text>
            <Text style={styles.toggleHint}>Enable for inventory tracking</Text>
          </View>
          <Pressable
            style={[styles.toggle, newProductTrackStock && styles.toggleActive]}
            onPress={() => setNewProductTrackStock(!newProductTrackStock)}
          >
            <View style={[styles.toggleKnob, newProductTrackStock && styles.toggleKnobActive]} />
          </Pressable>
        </View>

        {/* Has Variants Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Has Variants</Text>
            <Text style={styles.toggleHint}>Enable for Size, Color options</Text>
          </View>
          <Pressable
            style={[styles.toggle, newProductHasVariants && styles.toggleActive]}
            onPress={() => setNewProductHasVariants(!newProductHasVariants)}
          >
            <View style={[styles.toggleKnob, newProductHasVariants && styles.toggleKnobActive]} />
          </Pressable>
        </View>

        {/* Variants Section */}
        {newProductHasVariants && (
          <View style={styles.newProductVariantsSection}>
            <Text style={styles.variantsSectionTitle}>Product Variants</Text>
            <Text style={styles.variantsSectionHint}>
              Add variant types like Size or Color with comma-separated values
            </Text>
            
            {newProductVariantInputs.map((input, index) => (
              <View key={index} style={styles.variantInputCard}>
                <View style={styles.variantInputRow}>
                  <TextInput
                    style={styles.variantNameField}
                    placeholder="Variant name (e.g., Size)"
                    value={input.name}
                    onChangeText={(text) => updateNewProductVariantInput(index, 'name', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable 
                    style={styles.variantRemoveBtn}
                    onPress={() => removeNewProductVariantType(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.variantValuesField}
                  placeholder="Values (e.g., S, M, L, XL)"
                  value={input.valuesText}
                  onChangeText={(text) => updateNewProductVariantInput(index, 'valuesText', text)}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            ))}
            
            <Pressable 
              style={styles.addVariantBtn}
              onPress={addNewProductVariantType}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addVariantBtnText}>
                {newProductVariantInputs.length === 0 ? 'Add Variant Type' : 'Add Another Variant'}
              </Text>
            </Pressable>

            {/* Variant Stock Grid */}
            {newProductVariants.length > 0 && (
              <View style={styles.variantStockGrid}>
                <Text style={styles.variantStockTitle}>
                  Stock by Variant ({newProductVariants.length} combinations)
                </Text>
                {newProductVariants.map((variant, idx) => (
                  <View key={idx} style={styles.variantStockItem}>
                    <View style={styles.variantStockInfo}>
                      <Text style={styles.variantStockLabel}>
                        {Object.values(variant.options).join(' / ')}
                      </Text>
                      <Text style={styles.variantStockSku}>SKU: {variant.sku}</Text>
                    </View>
                    <TextInput
                      style={styles.variantStockInput}
                      placeholder="0"
                      value={variant.stock_quantity?.toString() || ''}
                      onChangeText={(text) => updateNewProductVariantStock(idx, text)}
                      keyboardType="number-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Stock Quantity (only if no variants) */}
        {!newProductHasVariants && newProductTrackStock && (
          <Input
            label="Initial Stock Quantity"
            placeholder="0"
            value={newProductStockQty}
            onChangeText={setNewProductStockQty}
            keyboardType="number-pad"
          />
        )}

        <Button
          title="Create Product"
          onPress={handleSaveNewProduct}
          loading={savingProduct}
          style={styles.submitButton}
        />
      </WebModal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons 
              name={adjustmentType === 'in' ? 'add-circle' : adjustmentType === 'out' ? 'remove-circle' : 'swap-horizontal-outline'} 
              size={48} 
              color={adjustmentType === 'in' ? '#10B981' : adjustmentType === 'out' ? '#DC2626' : '#F59E0B'} 
            />
            <Text style={styles.confirmModalTitle}>
              Confirm {adjustmentType === 'in' ? 'Stock In' : adjustmentType === 'out' ? 'Stock Out' : 'Adjustment'}
            </Text>
            
            {selectedProduct && (
              <View style={styles.confirmDetails}>
                <Text style={styles.confirmProductName}>{selectedProduct.name}</Text>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Quantity:</Text>
                  <Text style={styles.confirmValue}>{adjustmentQty} units</Text>
                </View>
                {adjustmentType === 'in' && (
                  <>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Unit Cost:</Text>
                      <Text style={styles.confirmValue}>{formatCurrency(parseFloat(unitCost) || 0)}</Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Total Cost:</Text>
                      <Text style={[styles.confirmValue, { fontWeight: '700' }]}>
                        {formatCurrency((parseFloat(unitCost) || 0) * (parseInt(adjustmentQty) || 0))}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalConfirmBtn, { 
                  backgroundColor: adjustmentType === 'in' ? '#10B981' : adjustmentType === 'out' ? '#DC2626' : '#F59E0B' 
                }]}
                onPress={submitAdjustment}
              >
                <Text style={styles.confirmModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerWeb: {
    paddingHorizontal: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCardsWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  summaryCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  // Main Content Card (Mobile Only)
  mainContentCard: {
    backgroundColor: '#EEF2FF',  // Light blue tint for Retail Pro
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: 340,
  },
  filterRowCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  cardListScroll: {
    flex: 1,
    maxHeight: 220,
  },
  cardListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  tableList: {
    paddingHorizontal: 16,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableCellName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tableCellSku: {
    width: 100,
    fontSize: 12,
    color: '#6B7280',
  },
  tableCellCategory: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellQty: {
    width: 70,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableCellValue: {
    width: 100,
    fontSize: 13,
    color: '#374151',
    textAlign: 'right',
    paddingHorizontal: 8,
  },
  tableCellStatus: {
    width: 100,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tableCellActions: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
  },
  tableActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  productCard: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  productSku: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productStock: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  stockQty: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  movementsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  movementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  movementDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  movementMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  movementStockChange: {
    alignItems: 'flex-end',
  },
  stockChangeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  stockChangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal styles
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  inputWrapper: {
    marginBottom: 4,
  },
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#111827',
  },
  productSelectionList: {
    maxHeight: 400,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
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
    borderColor: '#2563EB',
    gap: 4,
  },
  paginationBtnDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  paginationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  paginationBtnTextDisabled: {
    color: '#D1D5DB',
  },
  paginationInfo: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#6B7280',
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
    color: '#2563EB',
    fontWeight: '500',
  },
  productSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productSelectionInfo: {
    flex: 1,
  },
  productSelectionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  productSelectionSku: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productSelectionStock: {
    alignItems: 'flex-end',
  },
  productSelectionQty: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  productSelectionQtyLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  noProductsFound: {
    padding: 24,
    alignItems: 'center',
  },
  noProductsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  createProductQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createProductQuickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productVariantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 3,
  },
  productVariantBadgeText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  addNewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    borderStyle: 'dashed',
    gap: 8,
  },
  addNewProductText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectedProductSku: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedProductStock: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  selectedProductQty: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  selectedProductQtyLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  changeProductButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  changeProductText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  typeButtonActiveIn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonActiveOut: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  typeButtonActiveAdj: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  expenseNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  expenseNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#2563EB',
  },
  submitButton: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  // Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 16,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  confirmProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  confirmValue: {
    fontSize: 14,
    color: '#111827',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Variant selection styles
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  variantBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  variantSelectionSection: {
    marginBottom: 16,
  },
  variantChipsScroll: {
    marginTop: 8,
  },
  variantChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    minWidth: 100,
  },
  variantChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#2563EB',
  },
  variantChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  variantChipTextSelected: {
    color: '#2563EB',
  },
  variantChipStock: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantChipStockSelected: {
    color: '#2563EB',
  },
  variantWarning: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Toggle styles for new product form
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  toggleHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  // New Product Variants Section styles
  newProductVariantsSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  variantsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  variantsSectionHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  variantInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  variantNameField: {
    flex: 1,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantValuesField: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantRemoveBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    gap: 8,
  },
  addVariantBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  variantStockGrid: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantStockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  variantStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  variantStockInfo: {
    flex: 1,
  },
  variantStockLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  variantStockSku: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  variantStockInput: {
    width: 70,
    height: 36,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Web Page Header styles
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webPageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  webPageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  webCreateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Web Content wrapper
  webContentWrapper: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexWrap: 'wrap',
    gap: 12,
  },
  webTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  webTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  webTabActive: {
    backgroundColor: '#2563EB',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webTabTextActive: {
    color: '#FFFFFF',
  },
  webFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  webStatusTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  webStatusTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  webStatusTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  webStatusTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  webStatusTabTextActive: {
    color: '#111827',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    gap: 8,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  webStatsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  webStatItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  webStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  webStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  webListContainer: {
    flex: 1,
    padding: 16,
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  webEmptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  webGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
