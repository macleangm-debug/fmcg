import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useViewSettingsStore, ViewMode } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import ImportExportModal from '../../src/components/ImportExportModal';
import ActionSheetModal, { ActionSheetItem, SuccessModal } from '../../src/components/common/ActionSheetModal';

interface VariantOption {
  name: string;
  values: string[];
}

interface ProductVariant {
  id?: string;
  options: Record<string, string>;
  sku: string;
  price?: number;
  cost_price?: number;
  stock_quantity: number;
  barcode?: string;
  is_active: boolean;
}

// Inventory Item interface (matches backend InventoryItem model)
interface Product {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  sku?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  cost_price: number;
  location?: string;
  supplier?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Compatibility fields for UI
  price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  tax_rate?: number;
  barcode?: string;
  image?: string;
  is_active?: boolean;
  track_stock?: boolean;
  has_variants?: boolean;
  variant_options?: VariantOption[];
  variants?: ProductVariant[];
  total_stock?: number;
}

interface Category {
  id: string;
  name: string;
}

// Helper to generate all variant combinations from multiple options
const generateVariantCombinations = (options: { name: string; values: string[] }[]): { options: Record<string, string>; label: string }[] => {
  if (options.length === 0) return [];
  
  const validOptions = options.filter(opt => opt.values.length > 0);
  if (validOptions.length === 0) return [];
  
  // Generate cartesian product of all values
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

export default function ProductManagement() {
  const router = useRouter();
  const { category: categoryFilter } = useLocalSearchParams<{ category?: string }>();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const { user: currentUser } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { formatCurrency, formatNumber, settings } = useBusinessStore();
  const { productsView, setProductsView } = useViewSettingsStore();
  
  // Category filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Change category modal state
  const [showChangeCategoryModal, setShowChangeCategoryModal] = useState(false);
  const [productToChangeCategory, setProductToChangeCategory] = useState<Product | null>(null);
  const [newCategoryId, setNewCategoryId] = useState('');
  
  // See all categories modal state
  const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Action menu for mobile
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const PAGE_SIZE = 20;

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [globalSkuAutoGenerate, setGlobalSkuAutoGenerate] = useState(true); // From global settings
  const [formBarcode, setFormBarcode] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('10');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [formTrackStock, setFormTrackStock] = useState(true);
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState('pcs');
  
  // Inline category creation state
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Units of measure options
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
  
  // Import/Export state
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  
  // Simplified Variant state - comma-separated input
  const [formHasVariants, setFormHasVariants] = useState(false);
  // Each entry: { name: 'Size', valuesText: 'S, M, L' }
  const [variantInputs, setVariantInputs] = useState<{ name: string; valuesText: string }[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Barcode settings state
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const [barcodeAutoGenerate, setBarcodeAutoGenerate] = useState(true);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  // Generate a new SKU from backend based on settings
  const generateSku = async () => {
    setGeneratingSku(true);
    try {
      const categoryName = categories.find(c => c.id === formCategoryId)?.name;
      const response = await api.get('/business/settings/generate-sku', {
        params: { category: categoryName }
      });
      setFormSku(response.data.sku);
      setGlobalSkuAutoGenerate(true);
    } catch (error) {
      console.log('Failed to generate SKU:', error);
      // Fallback to simple generation
      const timestamp = Date.now().toString().slice(-6);
      setFormSku(`PROD-${timestamp}`);
    } finally {
      setGeneratingSku(false);
    }
  };

  // Generate a new barcode from backend
  const generateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const response = await api.get('/business/settings/generate-barcode');
      setFormBarcode(response.data.barcode);
      setBarcodeAutoGenerate(true);
    } catch (error) {
      console.log('Failed to generate barcode:', error);
      Alert.alert('Error', 'Failed to generate barcode');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  // Add a new variant type (e.g., Size, Color)
  const addVariantType = () => {
    setVariantInputs([...variantInputs, { name: '', valuesText: '' }]);
  };

  // Update variant type name or values
  const updateVariantInput = (index: number, field: 'name' | 'valuesText', value: string) => {
    const updated = [...variantInputs];
    updated[index] = { ...updated[index], [field]: value };
    setVariantInputs(updated);
    
    // Regenerate variants when inputs change
    regenerateVariants(updated);
  };

  // Remove a variant type
  const removeVariantType = (index: number) => {
    const updated = variantInputs.filter((_, i) => i !== index);
    setVariantInputs(updated);
    regenerateVariants(updated);
  };

  // Regenerate variant combinations from inputs
  const regenerateVariants = (inputs: { name: string; valuesText: string }[]) => {
    // Parse inputs into structured options
    const options = inputs
      .filter(inp => inp.name.trim() && inp.valuesText.trim())
      .map(inp => ({
        name: inp.name.trim(),
        values: inp.valuesText.split(',').map(v => v.trim()).filter(v => v)
      }));

    // Generate all combinations
    const combinations = generateVariantCombinations(options);
    
    // Create variant objects, preserving existing stock quantities where possible
    const newVariants: ProductVariant[] = combinations.map(combo => {
      // Try to find existing variant with same options
      const existingVariant = variants.find(v => {
        const vLabel = Object.values(v.options).join(' / ');
        return vLabel === combo.label;
      });
      
      return {
        options: combo.options,
        sku: `${formSku || 'SKU'}-${combo.label.replace(/ \/ /g, '-').replace(/\s+/g, '')}`,
        stock_quantity: existingVariant?.stock_quantity || 0,
        is_active: true,
      };
    });
    
    setVariants(newVariants);
  };

  // Update variant stock
  const updateVariantStock = (variantIndex: number, stock: string) => {
    const newVariants = [...variants];
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      stock_quantity: parseInt(stock) || 0
    };
    setVariants(newVariants);
  };

  // No role restriction for Inventory app - all authenticated users can manage products

  const fetchData = async (reset: boolean = false) => {
    if (!reset && (loadingMore || !hasMore)) return;
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const skip = reset ? 0 : products.length;
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        api.get('/inventory/items', { params: { status: 'all', skip, limit: PAGE_SIZE } }),
        api.get('/inventory/categories'),
        api.get('/business/settings').catch(() => ({ data: {} })),
      ]);
      
      if (reset) {
        setProducts(productsRes.data);
      } else {
        setProducts(prev => [...prev, ...productsRes.data]);
      }
      setCategories(categoriesRes.data);
      setHasMore(productsRes.data.length === PAGE_SIZE);
      
      // Set barcode settings
      if (settingsRes.data) {
        setBarcodeEnabled(settingsRes.data.barcode_enabled || false);
      }
    } catch (error) {
      console.log('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);
  
  // Set category filter from URL params
  useEffect(() => {
    if (categoryFilter) {
      setSelectedCategoryFilter(categoryFilter);
    }
  }, [categoryFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchData(true);
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchData(false);
    }
  }, [loadingMore, hasMore, loading, products.length]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormCategoryId('');
    setFormPrice('');
    setFormCostPrice('');
    setFormSku('');
    setFormBarcode('');
    setFormStockQuantity('');
    setFormLowStockThreshold('');
    setFormTaxRate('0');
    setFormTrackStock(true);
    setFormUnitOfMeasure('pcs');
    setFormHasVariants(false);
    setVariantInputs([]);
    setVariants([]);
    setEditingProduct(null);
  };

  // Fetch global SKU settings and auto-generate if enabled
  const fetchGlobalSettingsAndGenerateSku = async () => {
    try {
      const settingsRes = await api.get('/business/settings');
      const settings = settingsRes.data;
      const autoGenEnabled = settings?.sku_auto_generate !== false; // Default true
      setGlobalSkuAutoGenerate(autoGenEnabled);
      
      // If auto-generation is enabled, generate SKU automatically
      if (autoGenEnabled) {
        generateSku();
      }
    } catch (error) {
      console.log('Failed to fetch global settings:', error);
      // Default to auto-generate enabled
      setGlobalSkuAutoGenerate(true);
      generateSku();
    }
  };

  // Open add form with global settings check
  const openAddForm = () => {
    resetForm();
    fetchGlobalSettingsAndGenerateSku();
    setShowAddModal(true);
  };

  // Inline category creation
  const handleSaveInlineCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    
    setSavingCategory(true);
    try {
      const response = await api.post('/inventory/categories', {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
      });
      
      // Add the new category to the list and select it
      const newCategory = response.data;
      setCategories(prev => [...prev, newCategory]);
      setFormCategoryId(newCategory.id);
      
      // Reset inline form
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowInlineCategoryForm(false);
      
      Alert.alert('Success', `Category "${newCategory.name}" created!`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  // Fetch categories separately (for refreshing when modal opens)
  const fetchCategories = async () => {
    try {
      const categoriesRes = await api.get('/inventory/categories');
      setCategories(categoriesRes.data);
    } catch (error) {
      console.log('Failed to fetch categories:', error);
    }
  };

  const handleEditProduct = async (product: Product) => {
    // Refresh categories when opening edit modal
    await fetchCategories();
    
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormCategoryId(product.category_id || '');
    setFormPrice((product.price || product.cost_price || 0).toString());
    setFormCostPrice((product.cost_price || 0).toString());
    setFormSku(product.sku || '');
    setFormBarcode(product.barcode || '');
    setFormStockQuantity((product.stock_quantity || product.quantity || 0).toString());
    setFormLowStockThreshold((product.low_stock_threshold || product.min_quantity || 0).toString());
    setFormTaxRate((product.tax_rate || 0).toString());
    setFormTrackStock(product.track_stock !== false);
    setFormUnitOfMeasure((product as any).unit_of_measure || product.unit || 'pcs');
    setFormHasVariants(product.has_variants || false);
    
    // Convert variant_options to simplified input format
    if (product.variant_options && product.variant_options.length > 0) {
      const inputs = product.variant_options.map(opt => ({
        name: opt.name,
        valuesText: opt.values.join(', ')
      }));
      setVariantInputs(inputs);
    } else {
      setVariantInputs([]);
    }
    
    setVariants(product.variants || []);
    setShowAddModal(true);
  };

  const handleSaveProduct = async () => {
    // Collect all missing required fields
    const missingFields: string[] = [];
    
    if (!formName.trim()) {
      missingFields.push('Item Name');
    }

    if (!formCategoryId) {
      missingFields.push('Category');
    }

    // Price can be 0 or any non-negative number
    if (formPrice === '' || formPrice === null || formPrice === undefined) {
      missingFields.push('Price');
    } else if (parseFloat(formPrice) < 0) {
      Alert.alert('Invalid Price', 'Price cannot be negative');
      return;
    }

    // SKU is required for inventory tracking
    if (!formSku.trim()) {
      missingFields.push('SKU');
    }

    // Show all missing fields at once
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please fill in the following:\n\n• ${missingFields.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate variants if enabled (but be lenient)
    if (formHasVariants && variantInputs.length > 0) {
      const invalidInput = variantInputs.find(inp => !inp.name.trim() || !inp.valuesText.trim());
      if (invalidInput) {
        Alert.alert('Incomplete Variant', 'Please fill in both the variant name and its values, or remove the empty variant');
        return;
      }
    }

    setSaving(true);
    try {
      // Build variant_options from inputs for backend
      const variantOptions = variantInputs
        .filter(inp => inp.name.trim() && inp.valuesText.trim())
        .map(inp => ({
          name: inp.name.trim(),
          values: inp.valuesText.split(',').map(v => v.trim()).filter(v => v)
        }));

      // Calculate total stock from variants if has_variants, allow 0
      const totalVariantStock = formHasVariants && variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : parseInt(formStockQuantity) || 0;

      const productData = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        category_id: formCategoryId,
        price: parseFloat(formPrice) || 0,
        cost_price: formCostPrice ? parseFloat(formCostPrice) : 0,
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        stock_quantity: totalVariantStock,
        low_stock_threshold: parseInt(formLowStockThreshold) || 0,
        tax_rate: parseFloat(formTaxRate) || 0,
        track_stock: formTrackStock,
        unit_of_measure: formUnitOfMeasure,
        has_variants: formHasVariants && variantOptions.length > 0,
        variant_options: formHasVariants && variantOptions.length > 0 ? variantOptions : undefined,
        variants: formHasVariants && variants.length > 0 ? variants : undefined,
      };

      console.log('Saving product:', productData);

      if (editingProduct) {
        await api.put(`/inventory/items/${editingProduct.id}`, productData);
        setSuccessMessage({
          title: 'Item Updated!',
          subtitle: `"${formName}" has been updated successfully`
        });
      } else {
        await api.post('/inventory/items', productData);
        setSuccessMessage({
          title: 'Item Added!',
          subtitle: `"${formName}" has been added to your inventory`
        });
      }

      resetForm();
      setShowAddModal(false);
      setShowSuccessModal(true);
      fetchData(true);  // Force refresh the product list
    } catch (error: any) {
      console.error('Product save error:', error.response?.data || error);
      const errorMessage = error.response?.data?.detail || 'Failed to save product. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/inventory/items/${productToDelete.id}`);
      setShowDeleteModal(false);
      setProductToDelete(null);
      setSuccessMessage({ title: 'Item Deleted', subtitle: `"${productToDelete.name}" has been removed.` });
      setShowSuccessModal(true);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // Handle opening action menu on mobile
  const handleOpenActionMenu = (product: Product) => {
    setSelectedProduct(product);
    setShowActionMenu(true);
  };

  // Handle change category
  const handleOpenChangeCategory = (product: Product) => {
    setProductToChangeCategory(product);
    setNewCategoryId(product.category_id || '');
    setShowActionMenu(false);
    setShowChangeCategoryModal(true);
  };

  const handleChangeCategory = async () => {
    if (!productToChangeCategory || !newCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/inventory/items/${productToChangeCategory.id}`, {
        ...productToChangeCategory,
        category_id: newCategoryId,
      });
      setShowChangeCategoryModal(false);
      setProductToChangeCategory(null);
      setNewCategoryId('');
      setSuccessMessage({ 
        title: 'Category Changed', 
        subtitle: `"${productToChangeCategory.name}" has been moved to a new category.` 
      });
      setShowSuccessModal(true);
      fetchData(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to change category');
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    router.push('/inventory');
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || p.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Web Card renderer for grid view
  const renderProductCardWeb = (item: Product) => {
    const isLowStock = item.quantity <= item.min_quantity;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.webProductCard}
        onPress={() => handleEditProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.webProductIcon}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.webProductImage} />
          ) : (
            <Ionicons name="cube-outline" size={24} color="#059669" />
          )}
        </View>
        <View style={styles.webProductInfo}>
          <Text style={styles.webProductName} numberOfLines={1}>{item.name}</Text>
          {item.sku && <Text style={styles.webProductSku}>SKU: {item.sku}</Text>}
          <View style={styles.webProductMeta}>
            <View style={[styles.webCategoryBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.webCategoryBadgeText, { color: '#059669' }]}>
                {item.category_name || item.unit}
              </Text>
            </View>
            <View style={[
              styles.webStockBadge,
              { backgroundColor: isLowStock ? '#FEF3C7' : '#D1FAE5' }
            ]}>
              <Text style={[
                styles.webStockBadgeText,
                { color: isLowStock ? '#D97706' : '#059669' }
              ]}>
                {item.quantity} in stock
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.webProductPrice}>
          <Text style={styles.webPriceValue}>{formatCurrency(item.cost_price || 0)}</Text>
          <Text style={styles.webPriceUnit}>/{item.unit}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Web Table row renderer
  const renderProductTableItem = (item: Product) => {
    const isLowStock = item.quantity <= item.min_quantity;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.webTableRow}
        onPress={() => handleEditProduct(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.webTableCell, { flex: 0.5 }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.webTableImage} />
          ) : (
            <View style={styles.webTableImagePlaceholder}>
              <Ionicons name="cube-outline" size={16} color="#059669" />
            </View>
          )}
        </View>
        <Text style={[styles.webTableCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.webTableCell, { flex: 1 }]}>{item.category_name || '-'}</Text>
        <Text style={[styles.webTableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.cost_price || 0)}</Text>
        <View style={[styles.webTableCell, { flex: 1, alignItems: 'flex-end' }]}>
          <View style={[
            styles.webStockBadge,
            { backgroundColor: isLowStock ? '#FEF3C7' : '#D1FAE5' }
          ]}>
            <Text style={[
              styles.webStockBadgeText,
              { color: isLowStock ? '#D97706' : '#059669' }
            ]}>
              {item.quantity}
            </Text>
          </View>
        </View>
        <View style={[styles.webTableCell, { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation?.();
              handleEditProduct(item);
            }}
            style={styles.tableActionButton}
          >
            <Ionicons name="pencil-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation?.();
              handleDeleteProduct(item);
            }}
            style={styles.tableActionButton}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Grid view renderer - shows action button on mobile
  const renderProductGrid = ({ item }: { item: Product }) => {
    const isLowStock = item.quantity <= item.min_quantity;
    
    return (
      <TouchableOpacity
        style={[styles.productCard, isWeb && styles.productCardWeb]}
        onPress={() => isWeb ? handleEditProduct(item) : handleOpenActionMenu(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category_name || item.unit}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>{formatCurrency(item.cost_price || 0)}</Text>
            <View style={[
              styles.stockBadge,
              isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk
            ]}>
              <Text style={[
                styles.stockText,
                isLowStock ? styles.stockTextLow : styles.stockTextOk
              ]}>
                {item.quantity} in stock
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteProduct(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Table row view renderer
  const renderProductTable = ({ item }: { item: Product }) => {
    const isLowStock = item.quantity <= item.min_quantity;
    
    return (
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => handleEditProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tableCell}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.tableImage} />
          ) : (
            <View style={styles.tableImagePlaceholder}>
              <Ionicons name="cube-outline" size={16} color="#9CA3AF" />
            </View>
          )}
        </View>
        <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.tableCellCategory]}>{item.category_name || '-'}</Text>
        <Text style={[styles.tableCell, styles.tableCellPrice]}>{formatCurrency(item.cost_price || 0)}</Text>
        <View style={[styles.tableCell, styles.tableCellStock]}>
          <View style={[
            styles.stockBadgeSmall,
            isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk
          ]}>
            <Text style={[
              styles.stockTextSmall,
              isLowStock ? styles.stockTextLow : styles.stockTextOk
            ]}>
              {item.quantity}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity
            style={styles.tableActionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditProduct(item);
            }}
          >
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tableActionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteProduct(item);
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Table header
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 50 }]}>Image</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellCategory]}>Category</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellPrice]}>Cost</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStock]}>Qty</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

  const renderProduct = productsView === 'table' && isWeb ? renderProductTable : renderProductGrid;

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Items</Text>
            {products.length > 0 && (
              <Text style={styles.webPageSubtitle}>{products.length} item(s) • {categories.length} categories</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {products.length > 0 && (
              <>
                <ViewToggle
                  currentView={productsView}
                  onToggle={setProductsView}
                />
                <TouchableOpacity 
                  style={styles.importExportButton}
                  onPress={() => setShowImportExportModal(true)}
                >
                  <Ionicons name="swap-vertical-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.webCreateBtn}
              onPress={async () => {
                await fetchCategories();
                openAddForm();
              }}
              data-testid="add-item-button"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Items</Text>
          {products.length > 0 && (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.importExportButton}
                onPress={() => setShowImportExportModal(true)}
              >
                <Ionicons name="swap-vertical-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.addButtonInner]}
                onPress={async () => {
                  await fetchCategories();
                  openAddForm();
                }}
                activeOpacity={0.7}
                data-testid="add-item-button-mobile"
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Category Filter Banner */}
      {selectedCategoryFilter && products.length > 0 && (
        <View style={styles.filterBanner}>
          <View style={styles.filterBannerContent}>
            <Ionicons name="filter" size={16} color="#F59E0B" />
            <Text style={styles.filterBannerText}>
              Filtered by: {categories.find(c => c.id === selectedCategoryFilter)?.name || 'Category'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.clearFilterBtn}
            onPress={() => {
              setSelectedCategoryFilter(null);
              router.setParams({ category: undefined });
            }}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Card Header with Count and Search */}
            {products.length > 0 && (
              <View style={styles.webCardHeader}>
                <Text style={styles.webCardTitle}>{filteredProducts.length} Items</Text>
                <View style={styles.webSearchBox}>
                  <Ionicons name="search" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.webSearchInput}
                    placeholder="Search items..."
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

            {/* Stats Row - Inside white card like reference */}
            {products.length > 0 && (
              <View style={styles.webStatsRow}>
                <View style={styles.webStatItem}>
                  <Text style={styles.webStatValue}>{formatNumber(products.length)}</Text>
                  <Text style={styles.webStatLabel}>Total Items</Text>
                </View>
                <View style={styles.webStatItem}>
                  <Text style={[styles.webStatValue, { color: '#F59E0B' }]}>
                    {formatNumber(products.filter(p => p.quantity <= p.min_quantity).length)}
                  </Text>
                  <Text style={styles.webStatLabel}>Low Stock</Text>
                </View>
                <View style={styles.webStatItem}>
                  <Text style={styles.webStatValue}>{formatNumber(categories.length)}</Text>
                  <Text style={styles.webStatLabel}>Categories</Text>
                </View>
              </View>
            )}

            {/* Category Filter Tabs */}
            {products.length > 0 && categories.length > 0 && (
              <View style={styles.webTabsRow}>
                <View style={styles.webTabs}>
                  <TouchableOpacity
                    style={[styles.webTab, !selectedCategoryFilter && styles.webTabActive]}
                    onPress={() => {
                      setSelectedCategoryFilter(null);
                      router.setParams({ category: undefined });
                    }}
                  >
                    <Text style={[styles.webTabText, !selectedCategoryFilter && styles.webTabTextActive]}>All</Text>
                  </TouchableOpacity>
                  {categories.slice(0, 5).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.webTab, selectedCategoryFilter === cat.id && styles.webTabActive]}
                      onPress={() => {
                        setSelectedCategoryFilter(cat.id);
                        router.setParams({ category: cat.id });
                      }}
                    >
                      <Text style={[styles.webTabText, selectedCategoryFilter === cat.id && styles.webTabTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Product List */}
            <ScrollView
              style={styles.webListContainer}
              contentContainerStyle={products.length === 0 ? styles.webEmptyListContainer : undefined}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
            >
              {filteredProducts.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.webEmptyTitle}>
                    {searchQuery ? 'No products match your search' : "Your inventory's looking a bit... empty"}
                  </Text>
                  <Text style={styles.webEmptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'Time to stock up! Add your first item to get started.'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.webEmptyBtn} onPress={openAddForm}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.webEmptyBtnText}>Add First Item</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : productsView === 'table' ? (
                <>
                  <TableHeader />
                  {filteredProducts.map((item) => renderProductTableItem(item))}
                </>
              ) : (
                <View style={styles.productsGridWeb}>
                  {filteredProducts.map((item) => renderProductCardWeb(item))}
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <>
          {products.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(products.length)}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {formatNumber(products.filter(p => p.stock_quantity <= p.low_stock_threshold).length)}
                </Text>
                <Text style={styles.statLabel}>Low Stock</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(categories.length)}</Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
            </View>
          )}
          <View style={styles.content}>
            <View style={styles.mobileCardContainer}>
              <FlatList
                data={selectedCategoryFilter 
                  ? products.filter(p => p.category_id === selectedCategoryFilter)
                  : products
                }
                renderItem={renderProductGrid}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={products.length === 0 ? styles.mobileEmptyContent : styles.mobileListContent}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMore}>
                      <ActivityIndicator size="small" color="#059669" />
                      <Text style={styles.loadingMoreText}>Loading more...</Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <EmptyState
                    icon="cube-outline"
                    title={selectedCategoryFilter ? "No Products in This Category" : "Your inventory's looking a bit... empty"}
                    message={selectedCategoryFilter 
                      ? "Move products to another category or delete them to remove this category"
                      : "Time to stock up! Add your first item to get started."
                    }
                    actionLabel={selectedCategoryFilter ? "Clear Filter" : "Add Item"}
                    onAction={() => {
                      if (selectedCategoryFilter) {
                        setSelectedCategoryFilter(null);
                        router.setParams({ category: undefined });
                      } else {
                        resetForm();
                        setShowAddModal(true);
                      }
                    }}
                  />
                }
              />
            </View>
          </View>
        </>
      )}

      <WebModal
        visible={showAddModal}
        onClose={() => { resetForm(); setShowAddModal(false); }}
        title={editingProduct ? 'Edit Item' : 'Add New Item'}
        subtitle={editingProduct ? 'Update item information' : 'Add a new item to your inventory'}
        icon={editingProduct ? 'create-outline' : 'bag-add-outline'}
        iconColor="#2563EB"
        maxWidth={550}
      >
        <Input
          label="Item Name *"
          placeholder="Enter the item name"
          value={formName}
          onChangeText={setFormName}
        />

        <Input
          label="Description"
          placeholder="Enter product description (optional)"
          value={formDescription}
          onChangeText={setFormDescription}
          multiline
        />

        <Text style={styles.inputLabel}>Category *</Text>
        {showInlineCategoryForm ? (
          <View style={styles.inlineCategoryForm}>
            <View style={styles.inlineCategoryHeader}>
              <Text style={styles.inlineCategoryTitle}>Create New Category</Text>
              <TouchableOpacity onPress={() => setShowInlineCategoryForm(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Input
              label="Category Name *"
              placeholder="e.g., Electronics, Clothing"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Input
              label="Description"
              placeholder="Brief description (optional)"
              value={newCategoryDescription}
              onChangeText={setNewCategoryDescription}
            />
            <View style={styles.inlineCategoryButtons}>
              <TouchableOpacity 
                style={styles.inlineCategoryCancelBtn} 
                onPress={() => {
                  setShowInlineCategoryForm(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
              >
                <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.inlineCategorySaveBtn, savingCategory && styles.inlineCategorySaveBtnDisabled]} 
                onPress={handleSaveInlineCategory}
                disabled={savingCategory}
              >
                {savingCategory ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.inlineCategorySaveText}>Create</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : categories.length === 0 ? (
          <TouchableOpacity
            style={styles.noCategoriesBox}
            onPress={() => setShowInlineCategoryForm(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
            <Text style={styles.noCategoriesText}>No categories found. Tap to create one.</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.categoryHeaderRow}>
              <View style={styles.categoryHeaderLeft}>
                <Ionicons name="folder-outline" size={16} color="#6B7280" />
                <Text style={styles.categoryCountText}>{categories.length} categories available</Text>
              </View>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => setShowAllCategoriesModal(true)}
              >
                <Ionicons name="grid-outline" size={14} color="#2563EB" />
                <Text style={styles.seeAllButtonText}>Browse All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.slice(0, 6).map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    formCategoryId === cat.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setFormCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formCategoryId === cat.id && styles.categoryOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
              {/* Show more button if more than 6 categories */}
              {categories.length > 6 && (
                <Pressable
                  style={styles.moreCategories}
                  onPress={() => setShowAllCategoriesModal(true)}
                >
                  <Text style={styles.moreCategoriesText}>+{categories.length - 6} more</Text>
                </Pressable>
              )}
              {/* Add new category button */}
              <Pressable
                style={styles.addCategoryOption}
                onPress={() => setShowInlineCategoryForm(true)}
              >
                <Ionicons name="add" size={16} color="#2563EB" />
                <Text style={styles.addCategoryOptionText}>New</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        <View style={isWeb ? styles.row : styles.mobileColumn}>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Input
              label="Selling Price *"
              placeholder="Enter selling price"
              value={formPrice}
              onChangeText={(text) => {
                // Allow only numbers and decimal point
                const cleaned = text.replace(/[^0-9.]/g, '');
                setFormPrice(cleaned);
              }}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHelper}>Price customers pay</Text>
          </View>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Input
              label="Cost Price"
              placeholder="Enter cost price"
              value={formCostPrice}
              onChangeText={(text) => {
                // Allow only numbers and decimal point
                const cleaned = text.replace(/[^0-9.]/g, '');
                setFormCostPrice(cleaned);
              }}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHelper}>Your purchase/acquisition cost</Text>
          </View>
        </View>
        
        {/* Profit Margin Indicator */}
        {formPrice && formCostPrice && parseFloat(formPrice) > 0 && parseFloat(formCostPrice) > 0 && (
          <View style={styles.profitMarginBox}>
            <View style={styles.profitMarginRow}>
              <Text style={styles.profitMarginLabel}>Profit per unit:</Text>
              <Text style={[
                styles.profitMarginValue,
                parseFloat(formPrice) - parseFloat(formCostPrice) >= 0 ? styles.profitPositive : styles.profitNegative
              ]}>
                {formatCurrency(parseFloat(formPrice) - parseFloat(formCostPrice))}
              </Text>
            </View>
            <View style={styles.profitMarginRow}>
              <Text style={styles.profitMarginLabel}>Margin:</Text>
              <Text style={[
                styles.profitMarginValue,
                parseFloat(formPrice) - parseFloat(formCostPrice) >= 0 ? styles.profitPositive : styles.profitNegative
              ]}>
                {((parseFloat(formPrice) - parseFloat(formCostPrice)) / parseFloat(formPrice) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        <View style={isWeb ? styles.row : styles.mobileColumn}>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Text style={styles.inputLabel}>SKU *</Text>
            {globalSkuAutoGenerate ? (
              <View style={styles.barcodeAutoContainer}>
                {generatingSku ? (
                  <View style={styles.barcodeGenerating}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.barcodeGeneratingText}>Generating from settings...</Text>
                  </View>
                ) : formSku ? (
                  <View style={styles.barcodeGenerated}>
                    <Text style={styles.barcodeGeneratedValue}>{formSku}</Text>
                    <TouchableOpacity onPress={generateSku}>
                      <Ionicons name="refresh-outline" size={20} color="#059669" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.generateBarcodeBtn} onPress={generateSku}>
                    <Ionicons name="flash-outline" size={18} color="#059669" />
                    <Text style={styles.generateBarcodeBtnText}>Generate SKU</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.fieldHelper}>SKU auto-generated from global settings</Text>
              </View>
            ) : (
              <Input
                placeholder="Enter SKU"
                value={formSku}
                onChangeText={setFormSku}
                autoCapitalize="characters"
              />
            )}
          </View>
          {barcodeEnabled && (
            <View style={isWeb ? styles.halfField : styles.fullField}>
              <Text style={styles.inputLabel}>Barcode</Text>
              <View style={styles.barcodeOptions}>
                <TouchableOpacity
                  style={[
                    styles.barcodeOption,
                    barcodeAutoGenerate && styles.barcodeOptionActive
                  ]}
                  onPress={() => {
                    setBarcodeAutoGenerate(true);
                    if (!formBarcode) generateBarcode();
                  }}
                >
                  <Ionicons 
                    name={barcodeAutoGenerate ? "radio-button-on" : "radio-button-off"} 
                    size={18} 
                    color={barcodeAutoGenerate ? "#F59E0B" : "#9CA3AF"} 
                  />
                  <Text style={[
                    styles.barcodeOptionText,
                    barcodeAutoGenerate && styles.barcodeOptionTextActive
                  ]}>Auto-generate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.barcodeOption,
                    !barcodeAutoGenerate && styles.barcodeOptionActive
                  ]}
                  onPress={() => {
                    setBarcodeAutoGenerate(false);
                    setFormBarcode('');
                  }}
                >
                  <Ionicons 
                    name={!barcodeAutoGenerate ? "radio-button-on" : "radio-button-off"} 
                    size={18} 
                    color={!barcodeAutoGenerate ? "#F59E0B" : "#9CA3AF"} 
                  />
                  <Text style={[
                    styles.barcodeOptionText,
                    !barcodeAutoGenerate && styles.barcodeOptionTextActive
                  ]}>Enter existing</Text>
                </TouchableOpacity>
              </View>
              {barcodeAutoGenerate ? (
                <View style={styles.barcodeAutoContainer}>
                  {generatingBarcode ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : formBarcode ? (
                    <View style={styles.barcodeGenerated}>
                      <Ionicons name="barcode-outline" size={20} color="#F59E0B" />
                      <Text style={styles.barcodeGeneratedText}>{formBarcode}</Text>
                      <TouchableOpacity onPress={generateBarcode}>
                        <Ionicons name="refresh" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.generateBarcodeBtn} onPress={generateBarcode}>
                      <Ionicons name="sparkles" size={18} color="#F59E0B" />
                      <Text style={styles.generateBarcodeBtnText}>Generate Barcode</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Input
                  placeholder="Enter existing barcode (EAN-13, UPC, etc.)"
                  value={formBarcode}
                  onChangeText={setFormBarcode}
                />
              )}
            </View>
          )}
        </View>

        {/* Unit of Measure */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Unit of Measure</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
            <View style={styles.unitPicker}>
              {UNITS_OF_MEASURE.map((unit) => (
                <TouchableOpacity
                  key={unit.code}
                  style={[
                    styles.unitChip,
                    formUnitOfMeasure === unit.code && styles.unitChipActive
                  ]}
                  onPress={() => setFormUnitOfMeasure(unit.code)}
                >
                  <Text style={[
                    styles.unitChipText,
                    formUnitOfMeasure === unit.code && styles.unitChipTextActive
                  ]}>
                    {unit.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Track Stock Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Track Stock</Text>
            <Text style={styles.toggleDescription}>
              Enable to track inventory levels. Disable for items sold "as-is" (e.g., services)
            </Text>
          </View>
          <Pressable
            style={[styles.toggleSwitch, formTrackStock && styles.toggleSwitchActive]}
            onPress={() => setFormTrackStock(!formTrackStock)}
          >
            <View style={[styles.toggleKnob, formTrackStock && styles.toggleKnobActive]} />
          </Pressable>
        </View>

        {/* Has Variants Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Has Variants</Text>
            <Text style={styles.toggleDescription}>
              Enable for products with multiple options like Size, Color, etc.
            </Text>
          </View>
          <Pressable
            style={[styles.toggleSwitch, formHasVariants && styles.toggleSwitchActive]}
            onPress={() => {
              setFormHasVariants(!formHasVariants);
              if (!formHasVariants) {
                setFormStockQuantity('0');
              }
            }}
          >
            <View style={[styles.toggleKnob, formHasVariants && styles.toggleKnobActive]} />
          </Pressable>
        </View>

        {/* Variants Section */}
        {formHasVariants && (
          <View style={styles.variantsSection}>
            <Text style={styles.variantsSectionTitle}>Product Variants</Text>
            <Text style={styles.variantsHelpText}>
              Add variant types like Size or Color, then enter values separated by commas.
            </Text>
            
            {/* Existing Variant Inputs */}
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
                  <Pressable 
                    style={styles.removeVariantBtn}
                    onPress={() => removeVariantType(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
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
            
            {/* Add New Variant Type Button */}
            <Pressable 
              style={styles.addVariantTypeBtn}
              onPress={addVariantType}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addVariantTypeBtnText}>
                {variantInputs.length === 0 ? 'Add Variant Type (e.g., Size, Color)' : 'Add Another Variant Type'}
              </Text>
            </Pressable>

            {/* Generated Variants Preview */}
            {variants.length > 0 && (
              <View style={styles.generatedVariantsSection}>
                <Text style={styles.generatedVariantsTitle}>
                  Stock by Variant ({variants.length} combinations)
                </Text>
                
                {variants.map((variant, varIndex) => (
                  <View key={varIndex} style={styles.variantStockRow}>
                    <View style={styles.variantStockInfo}>
                      <Text style={styles.variantStockLabel}>
                        {Object.entries(variant.options).map(([key, val]) => `${val}`).join(' / ')}
                      </Text>
                      <Text style={styles.variantSkuText}>SKU: {variant.sku}</Text>
                    </View>
                    <View style={styles.variantStockInput}>
                      <TextInput
                        style={styles.stockInputField}
                        placeholder="Qty"
                        value={variant.stock_quantity?.toString() || ''}
                        onChangeText={(text) => updateVariantStock(varIndex, text)}
                        keyboardType="number-pad"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                ))}
                
                <View style={styles.totalStockRow}>
                  <Text style={styles.totalStockLabel}>Total Stock:</Text>
                  <Text style={styles.totalStockValue}>
                    {variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Stock Quantity - only show if not using variants */}
        {!formHasVariants && (
          <View style={isWeb ? styles.row : styles.mobileColumn}>
            <View style={isWeb ? styles.halfField : styles.fullField}>
              <Input
                label="Stock Qty"
                placeholder="Enter stock quantity"
                value={formStockQuantity}
                onChangeText={setFormStockQuantity}
                keyboardType="number-pad"
              />
            </View>
            <View style={isWeb ? styles.halfField : styles.fullField}>
              <Input
                label="Low Stock Alert"
                placeholder="Enter threshold"
                value={formLowStockThreshold}
                onChangeText={setFormLowStockThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        <Button
          title={editingProduct ? 'Update Item' : 'Add Item'}
          onPress={handleSaveProduct}
          loading={saving}
          style={styles.saveButton}
        />
      </WebModal>

      {/* Success Confirmation Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        subtitle={successMessage.subtitle}
        onAddAnother={() => {
          resetForm();
          setShowAddModal(true);
        }}
        testId="inventory-success-modal"
      />

      {/* Mobile Action Menu Modal */}
      <ActionSheetModal
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        title={selectedProduct?.name}
        testId="inventory-action-menu"
      >
        <ActionSheetItem
          icon="pencil-outline"
          label="Edit Item"
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          onPress={() => {
            setShowActionMenu(false);
            if (selectedProduct) handleEditProduct(selectedProduct);
          }}
        />
        <ActionSheetItem
          icon="folder-outline"
          label="Change Category"
          iconColor="#D97706"
          iconBg="#FEF3C7"
          onPress={() => {
            if (selectedProduct) handleOpenChangeCategory(selectedProduct);
          }}
        />
        <ActionSheetItem
          icon="trash-outline"
          label="Delete Product"
          danger
          onPress={() => {
            setShowActionMenu(false);
            if (selectedProduct) handleDeleteProduct(selectedProduct);
          }}
        />
      </ActionSheetModal>

      {/* Change Category Modal */}
      <WebModal
        visible={showChangeCategoryModal}
        onClose={() => {
          setShowChangeCategoryModal(false);
          setProductToChangeCategory(null);
        }}
        title="Change Category"
        icon="folder-outline"
        iconColor="#D97706"
        maxWidth={400}
      >
        <Text style={styles.changeCategoryLabel}>
          Moving "{productToChangeCategory?.name}" to:
        </Text>
        
        <View style={styles.categoryOptions}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryOption,
                newCategoryId === cat.id && styles.categoryOptionSelected
              ]}
              onPress={() => setNewCategoryId(cat.id)}
            >
              <View style={[styles.categoryOptionIcon, { backgroundColor: `${cat.color || '#10B981'}20` }]}>
                <Ionicons name="folder" size={20} color={cat.color || '#10B981'} />
              </View>
              <Text style={[
                styles.categoryOptionText,
                newCategoryId === cat.id && styles.categoryOptionTextSelected
              ]}>
                {cat.name}
              </Text>
              {newCategoryId === cat.id && (
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.changeCategoryBtn, !newCategoryId && styles.changeCategoryBtnDisabled]}
          onPress={handleChangeCategory}
          disabled={!newCategoryId || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.changeCategoryBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </WebModal>

      {/* See All Categories Modal */}
      <Modal
        visible={showAllCategoriesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllCategoriesModal(false)}
      >
        <Pressable 
          style={styles.allCategoriesOverlay}
          onPress={() => setShowAllCategoriesModal(false)}
        >
          <Pressable 
            style={styles.allCategoriesModal}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.allCategoriesHeader}>
              <View style={styles.allCategoriesHeaderLeft}>
                <View style={styles.allCategoriesIconBadge}>
                  <Ionicons name="folder" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.allCategoriesTitle}>Select Category</Text>
                  <Text style={styles.allCategoriesSubtitle}>{categories.length} categories available</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.allCategoriesCloseBtn}
                onPress={() => setShowAllCategoriesModal(false)}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={styles.categorySearchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
              {categorySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Category List */}
            <ScrollView style={styles.allCategoriesList} showsVerticalScrollIndicator={false}>
              {categories
                .filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                .map((cat, index) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.allCategoryItem,
                    formCategoryId === cat.id && styles.allCategoryItemActive,
                    index === 0 && styles.allCategoryItemFirst
                  ]}
                  onPress={() => {
                    setFormCategoryId(cat.id);
                    setCategorySearchQuery('');
                    setShowAllCategoriesModal(false);
                  }}
                >
                  <View style={[
                    styles.categoryColorDot,
                    { backgroundColor: cat.color || '#6B7280' }
                  ]} />
                  <View style={styles.allCategoryInfo}>
                    <Text style={[
                      styles.allCategoryName,
                      formCategoryId === cat.id && styles.allCategoryNameActive
                    ]}>
                      {cat.name}
                    </Text>
                    {cat.item_count !== undefined && (
                      <Text style={styles.allCategoryCount}>{cat.item_count} items</Text>
                    )}
                  </View>
                  {formCategoryId === cat.id ? (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* No results */}
              {categorySearchQuery.length > 0 && 
               categories.filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 && (
                <View style={styles.noSearchResults}>
                  <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.noSearchResultsText}>No categories found</Text>
                  <Text style={styles.noSearchResultsSubtext}>Try a different search term</Text>
                </View>
              )}
            </ScrollView>
            
            {/* Footer - Create New */}
            <View style={styles.allCategoriesFooter}>
              <TouchableOpacity
                style={styles.createCategoryBtn}
                onPress={() => {
                  setCategorySearchQuery('');
                  setShowAllCategoriesModal(false);
                  setShowInlineCategoryForm(true);
                }}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createCategoryBtnText}>Create New Category</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Product"
        message={productToDelete ? `Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onCancel={cancelDelete}
        variant="danger"
        loading={deleting}
      />

      {/* Import/Export Modal - Uses reusable component */}
      <ImportExportModal
        visible={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onSuccess={() => fetchData(true)}
        title="Products Import / Export"
        exportEndpoint="/products/export"
        importEndpoint="/products/import"
        templateEndpoint="/products/import-template"
        entityName="products"
      />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filter banner styles
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  filterBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerWeb: {
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  importExportButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statsRowWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mobileListContent: {
    paddingBottom: 16,
  },
  list: {
    padding: 16,
    paddingTop: 0,
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
  tableCellCategory: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  tableCellStock: {
    width: 80,
    alignItems: 'center',
  },
  tableCellActions: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tableImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  tableImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  productCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productCardWeb: {
    marginHorizontal: 6,
    maxWidth: '48%',
  },
  productImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeOk: {
    backgroundColor: '#D1FAE5',
  },
  stockBadgeLow: {
    backgroundColor: '#FEE2E2',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockTextOk: {
    color: '#10B981',
  },
  stockTextLow: {
    color: '#DC2626',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeaderWeb: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  modalContentWeb: {
    alignItems: 'center',
  },
  formContainerWeb: {
    maxWidth: 600,
    width: '100%',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldHelper: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  profitMarginBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  profitMarginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  profitMarginLabel: {
    fontSize: 13,
    color: '#374151',
  },
  profitMarginValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitPositive: {
    color: '#059669',
  },
  profitNegative: {
    color: '#DC2626',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  noCategoriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#A5B4FC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  noCategoriesText: {
    flex: 1,
    fontSize: 14,
    color: '#3730A3',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryOptionTextActive: {
    color: '#2563EB',
  },
  // Add new category button in scroll
  addCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: '#EEF2FF',
    marginRight: 8,
    gap: 4,
  },
  addCategoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  // Inline category form styles
  inlineCategoryForm: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inlineCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inlineCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
  },
  inlineCategoryButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  inlineCategoryCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  inlineCategoryCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  inlineCategorySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    gap: 6,
  },
  inlineCategorySaveBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  inlineCategorySaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  mobileColumn: {
    flexDirection: 'column',
    gap: 0,
  },
  halfField: {
    flex: 1,
  },
  fullField: {
    width: '100%',
  },
  saveButton: {
    marginTop: 20,
  },
  // Toggle styles
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#10B981',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  // Variant styles - simplified
  variantsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  variantsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  variantsHelpText: {
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
  variantInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  variantNameInput: {
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
  variantValuesInput: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeVariantBtn: {
    width: 40,
    height: 40,
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 8,
  },
  addVariantTypeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  generatedVariantsSection: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  generatedVariantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  variantStockRow: {
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
  variantSkuText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  variantStockInput: {
    width: 80,
  },
  stockInputField: {
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
  totalStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalStockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalStockValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Success Modal styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successAddAnotherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  successAddAnotherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  successDoneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  successDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Unit of Measure styles
  unitPickerScroll: {
    marginTop: 4,
  },
  unitPicker: {
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  // Action Menu Modal styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  actionMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  // Change Category Modal styles
  changeCategoryLabel: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  categoryOptions: {
    gap: 10,
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  categoryOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  categoryOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  categoryOptionTextSelected: {
    color: '#047857',
    fontWeight: '600',
  },
  changeCategoryBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  changeCategoryBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  changeCategoryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Category header row with "See all" button
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryCountText: {
    fontSize: 13,
    color: '#6B7280',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  seeAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  moreCategories: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
  },
  moreCategoriesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  // All Categories Modal Styles
  allCategoriesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  allCategoriesModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  allCategoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  allCategoriesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allCategoriesIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allCategoriesTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  allCategoriesSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  allCategoriesCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categorySearchIcon: {
    marginRight: 10,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  allCategoriesList: {
    paddingHorizontal: 12,
    maxHeight: 320,
  },
  allCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  allCategoryItemFirst: {
    marginTop: 4,
  },
  allCategoryItemActive: {
    backgroundColor: '#EEF2FF',
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allCategoryInfo: {
    flex: 1,
  },
  allCategoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  allCategoryNameActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  allCategoryCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSearchResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSearchResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noSearchResultsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  allCategoriesFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  createCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createCategoryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  allCategoryAddNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  allCategoryAddNewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },

  // Web Page Header & Layout
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
  webPageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webCreateBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  webContentWrapper: {
    flex: 1,
    padding: 24,
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  webStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 32,
  },
  webStatItem: {
    alignItems: 'center',
  },
  webStatValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  webStatLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  webTableList: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  webGridList: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webEmptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  webEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    textAlign: 'center',
  },
  webEmptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  webEmptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  webEmptyBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  webEmptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  mobileEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Web Card Header with Tabs and Search
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 12,
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webTabsRow: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webTabs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  webTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  webTabActive: {
    backgroundColor: '#059669',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webTabTextActive: {
    color: '#FFFFFF',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  webListContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  
  // Web Product Grid (3 columns)
  productsGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    gap: 12,
  },
  webProductIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webProductImage: {
    width: 56,
    height: 56,
  },
  webProductInfo: {
    flex: 1,
  },
  webProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  webProductSku: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  webProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  webCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  webCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  webStockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  webStockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  webProductPrice: {
    alignItems: 'flex-end',
  },
  webPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  webPriceUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Web Table styles
  webTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webTableCell: {
    fontSize: 14,
    color: '#374151',
  },
  webTableImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  webTableImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Barcode styles
  barcodeOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  barcodeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeOptionActive: {
    opacity: 1,
  },
  barcodeOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  barcodeOptionTextActive: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  barcodeAutoContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  barcodeGenerated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeGeneratedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generateBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generateBarcodeBtnText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
});
