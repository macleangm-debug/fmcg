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
import { useRouter } from 'expo-router';
import { productsApi, categoriesApi } from '../../src/api/client';
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
import BulkProductImportModal from '../../src/components/products/BulkProductImportModal';

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

interface Product {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  category_name?: string;
  price: number;
  cost_price?: number;
  sku: string;
  barcode?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  tax_rate: number;
  image?: string;
  is_active: boolean;
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
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { formatCurrency, formatNumber, settings } = useBusinessStore();
  const { productsView, setProductsView } = useViewSettingsStore();
  
  const PAGE_SIZE = 20;

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [globalSkuAutoGenerate, setGlobalSkuAutoGenerate] = useState(true); // From global settings
  const [globalServiceCodeAutoGenerate, setGlobalServiceCodeAutoGenerate] = useState(true); // From global settings
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingServiceCode, setGeneratingServiceCode] = useState(false);
  const [formBarcode, setFormBarcode] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('10');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [formTrackStock, setFormTrackStock] = useState(true);
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState('pcs');
  
  // Product/Service type
  const [formType, setFormType] = useState<'product' | 'service'>('product');
  
  // Time-based service fields
  const [formPricingType, setFormPricingType] = useState<'fixed' | 'hourly' | 'daily' | 'per_session'>('fixed');
  const [formDuration, setFormDuration] = useState(''); // Duration in minutes for per_session
  const [formMinDuration, setFormMinDuration] = useState(''); // Minimum booking duration
  const [formMaxDuration, setFormMaxDuration] = useState(''); // Maximum booking duration
  
  // Inline category creation state
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Units of measure options
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
  
  // Custom units state
  const [customUnits, setCustomUnits] = useState<{code: string; name: string}[]>([]);
  
  // Combined units (default + custom)
  const UNITS_OF_MEASURE = [...DEFAULT_UNITS_OF_MEASURE, ...customUnits];
  
  // Inline UOM creation state
  const [showInlineUomForm, setShowInlineUomForm] = useState(false);
  const [inlineUomName, setInlineUomName] = useState('');
  const [inlineUomCode, setInlineUomCode] = useState('');
  
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
    setFormUnitOfMeasure(code); // Auto-select the new unit
    setInlineUomName('');
    setInlineUomCode('');
    setShowInlineUomForm(false);
  };
  
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.category_name && product.category_name.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query)) ||
      (product.barcode && product.barcode.toLowerCase().includes(query))
    );
  });

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

  // Generate a new SKU from backend based on settings
  const generateSku = async () => {
    setGeneratingSku(true);
    try {
      const categoryName = categories.find(c => c.id === formCategoryId)?.name;
      const response = await api.get('/business/settings/generate-sku', {
        params: { category: categoryName }
      });
      setFormSku(response.data.sku);
      setSkuAutoGenerate(true);
    } catch (error) {
      console.log('Failed to generate SKU:', error);
      // Fallback to simple generation
      const timestamp = Date.now().toString().slice(-6);
      setFormSku(`PROD-${timestamp}`);
    } finally {
      setGeneratingSku(false);
    }
  };

  // Generate a new Service Code from backend based on settings
  const generateServiceCode = async () => {
    setGeneratingServiceCode(true);
    try {
      const categoryName = categories.find(c => c.id === formCategoryId)?.name;
      const response = await api.get('/business/settings/generate-service-code', {
        params: { category: categoryName }
      });
      setFormSku(response.data.service_code);
      setServiceCodeAutoGenerate(true);
    } catch (error) {
      console.log('Failed to generate Service Code:', error);
      // Fallback to simple generation
      const timestamp = Date.now().toString().slice(-6);
      setFormSku(`SVC-${timestamp}`);
    } finally {
      setGeneratingServiceCode(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      Alert.alert('Access Denied', 'Only admins and managers can manage products');
      router.back();
    }
  }, [currentUser]);

  const fetchData = async (reset: boolean = true) => {
    try {
      const skip = reset ? 0 : products.length;
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll({ skip, limit: PAGE_SIZE }),
        categoriesApi.getAll(),
      ]);
      
      if (reset) {
        setProducts(productsRes.data);
      } else {
        setProducts(prev => [...prev, ...productsRes.data]);
      }
      setCategories(categoriesRes.data);
      setHasMore(productsRes.data.length === PAGE_SIZE);
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
    setFormStockQuantity('0');
    setFormLowStockThreshold('0');
    setFormTaxRate('0');
    setFormTrackStock(true);
    setFormUnitOfMeasure('pcs');
    setFormHasVariants(false);
    setVariantInputs([]);
    setVariants([]);
    setEditingProduct(null);
    // Reset service fields
    setFormType('product');
    setFormPricingType('fixed');
    setFormDuration('');
    setFormMinDuration('');
    setFormMaxDuration('');
  };

  // Fetch global SKU/Service Code settings and auto-generate if enabled
  const fetchGlobalSettingsAndGenerate = async (type: 'product' | 'service' = 'product') => {
    try {
      const settingsRes = await api.get('/business/settings');
      const settings = settingsRes.data;
      const skuAutoEnabled = settings?.sku_auto_generate !== false; // Default true
      const serviceCodeAutoEnabled = settings?.service_code_auto_generate !== false; // Default true
      setGlobalSkuAutoGenerate(skuAutoEnabled);
      setGlobalServiceCodeAutoGenerate(serviceCodeAutoEnabled);
      
      // If auto-generation is enabled, generate automatically
      if (type === 'product' && skuAutoEnabled) {
        generateSku();
      } else if (type === 'service' && serviceCodeAutoEnabled) {
        generateServiceCode();
      }
    } catch (error) {
      console.log('Failed to fetch global settings:', error);
      // Default to auto-generate enabled
      setGlobalSkuAutoGenerate(true);
      setGlobalServiceCodeAutoGenerate(true);
      if (type === 'product') {
        generateSku();
      } else {
        generateServiceCode();
      }
    }
  };

  // Open add form with global settings check
  const openAddForm = () => {
    resetForm();
    fetchGlobalSettingsAndGenerate('product');
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
      const response = await categoriesApi.create({
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

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormCategoryId(product.category_id);
    setFormPrice(product.price.toString());
    setFormCostPrice(product.cost_price?.toString() || '');
    setFormSku(product.sku);
    setFormBarcode(product.barcode || '');
    setFormStockQuantity(product.stock_quantity.toString());
    setFormLowStockThreshold(product.low_stock_threshold.toString());
    setFormTaxRate(product.tax_rate.toString());
    setFormTrackStock(product.track_stock !== false);
    setFormUnitOfMeasure((product as any).unit_of_measure || 'pcs');
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

  // Bulk Import handler
  const handleBulkImport = async (productsToImport: any[]): Promise<{ success: number; failed: number }> => {
    try {
      const response = await productsApi.bulkImport(productsToImport);
      // Refresh the product list after import
      await fetchData();
      return {
        success: response.data.success,
        failed: response.data.failed,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to import products');
    }
  };

  const handleSaveProduct = async () => {
    // Collect all missing required fields
    const missingFields: string[] = [];
    
    if (!formName.trim()) {
      missingFields.push('Product Name');
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
        await productsApi.update(editingProduct.id, productData);
        setSuccessMessage({
          title: 'Product Updated!',
          subtitle: `"${formName}" has been updated successfully`
        });
      } else {
        await productsApi.create(productData);
        setSuccessMessage({
          title: 'Product Added!',
          subtitle: `"${formName}" has been added to your inventory`
        });
      }

      resetForm();
      setShowAddModal(false);
      setShowSuccessModal(true);
      fetchData();
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
      await productsApi.delete(productToDelete.id);
      setShowDeleteModal(false);
      setProductToDelete(null);
      setSuccessMessage({ title: 'Product Deleted', subtitle: `"${productToDelete.name}" has been removed.` });
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

  const handleGoBack = () => {
    router.push('/(tabs)/dashboard');
  };

  // Grid view renderer (original)
  const renderProductGrid = ({ item }: { item: Product }) => {
    const isLowStock = item.stock_quantity <= item.low_stock_threshold;
    
    return (
      <TouchableOpacity
        style={[styles.productCard, isWeb && styles.productCardWeb]}
        onPress={() => handleEditProduct(item)}
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
          <Text style={styles.productCategory}>{item.category_name}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <View style={[
              styles.stockBadge,
              isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk
            ]}>
              <Text style={[
                styles.stockText,
                isLowStock ? styles.stockTextLow : styles.stockTextOk
              ]}>
                {item.stock_quantity} in stock
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
    const isLowStock = item.stock_quantity <= item.low_stock_threshold;
    
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
        <Text style={[styles.tableCell, styles.tableCellPrice]}>{formatCurrency(item.price)}</Text>
        <View style={[styles.tableCell, styles.tableCellStock]}>
          <View style={[
            styles.stockBadgeSmall,
            isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk
          ]}>
            <Text style={[
              styles.stockTextSmall,
              isLowStock ? styles.stockTextLow : styles.stockTextOk
            ]}>
              {item.stock_quantity}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity
            style={styles.tableActionButton}
            onPress={() => handleEditProduct(item)}
          >
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tableActionButton}
            onPress={() => handleDeleteProduct(item)}
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
      <Text style={[styles.tableHeaderCell, styles.tableCellPrice]}>Price</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStock]}>Stock</Text>
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
            <Text style={styles.webPageTitle}>Products</Text>
            {products.length > 0 && (
              <Text style={styles.webPageSubtitle}>{products.length} product(s) • {categories.length} categories</Text>
            )}
          </View>
          {products.length > 0 && (
            <View style={styles.headerActions}>
              <ViewToggle
                currentView={productsView}
                onToggle={setProductsView}
              />
              <Pressable
                style={styles.bulkImportBtn}
                onPress={() => setShowBulkImportModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Bulk Import"
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#10B981" />
                <Text style={styles.bulkImportBtnText}>Bulk Import</Text>
              </Pressable>
              <Pressable
                style={styles.webCreateBtn}
                onPress={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add Product"
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.webCreateBtnText}>Add Product</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Products</Text>
            {products.length > 0 && (
              <View style={styles.headerActions}>
                <Pressable
                  style={styles.addButton}
                  onPress={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add Product"
                >
                  {({ pressed }) => (
                    <View style={[styles.addButtonInner, pressed && styles.addButtonPressed]}>
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </View>
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
        </>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search Row - Only show when there are products */}
            {products.length > 0 && (
              <View style={styles.webCardHeader}>
                <Text style={styles.webCardTitle}>{filteredProducts.length} Products</Text>
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

            {/* Stats Row - Only show when there are products */}
            {products.length > 0 && (
              <View style={styles.webStatsRow}>
                <View style={styles.webStatItem}>
                  <Text style={styles.webStatValue}>{formatNumber(products.length)}</Text>
                  <Text style={styles.webStatLabel}>Total Products</Text>
                </View>
                <View style={styles.webStatItem}>
                  <Text style={[styles.webStatValue, { color: '#F59E0B' }]}>
                    {formatNumber(products.filter(p => p.stock_quantity <= p.low_stock_threshold).length)}
                  </Text>
                  <Text style={styles.webStatLabel}>Low Stock</Text>
                </View>
                <View style={styles.webStatItem}>
                  <Text style={styles.webStatValue}>{formatNumber(categories.length)}</Text>
                  <Text style={styles.webStatLabel}>Categories</Text>
                </View>
              </View>
            )}

            {/* Table Header for table view */}
            {productsView === 'table' && filteredProducts.length > 0 && <TableHeader />}

            <FlatList
              data={filteredProducts}
              renderItem={productsView === 'table' ? renderProductTable : renderProductGrid}
              keyExtractor={(item) => item.id}
              key={`web-${productsView}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={products.length === 0 ? styles.webEmptyList : (productsView === 'table' ? styles.webTableList : styles.webGridList)}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.webEmptyState}>
                  <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.webEmptyTitle}>
                    {searchQuery ? 'No products match your search' : "Your inventory's looking a bit... empty"}
                  </Text>
                  <Text style={styles.webEmptyText}>
                    {searchQuery ? 'Try a different search term' : 'Time to stock up! Add your first product to get started.'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.webEmptyBtn} onPress={() => { resetForm(); setShowAddModal(true); }}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.webEmptyBtnText}>Add First Product</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </View>
        </View>
      ) : (
        /* Mobile Card Container */
        <View style={styles.mobileCardContainer}>
          <FlatList
            data={products}
            renderItem={renderProductGrid}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listInsideCard}
            showsVerticalScrollIndicator={true}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="cube-outline"
                title="No Products"
                message="Add your first product to get started"
                actionLabel="Add Product"
                onAction={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              />
            }
          />
        </View>
      )}

      <WebModal
        visible={showAddModal}
        onClose={() => { resetForm(); setShowAddModal(false); }}
        title={editingProduct ? (formType === 'service' ? 'Edit Service' : 'Edit Product') : (formType === 'service' ? 'Add New Service' : 'Add New Product')}
        subtitle={editingProduct ? (formType === 'service' ? 'Update service information' : 'Update product information') : (formType === 'service' ? 'Add a new service to your catalog' : 'Add a new product to your catalog')}
        icon={formType === 'service' ? 'construct-outline' : (editingProduct ? 'create-outline' : 'bag-add-outline')}
        iconColor="#2563EB"
        maxWidth={550}
      >
        {/* Product/Service Type Toggle */}
        <View style={styles.typeToggleContainer}>
          <TouchableOpacity
            style={[styles.typeToggleBtn, formType === 'product' && styles.typeToggleBtnActive]}
            onPress={() => {
              setFormType('product');
              setFormPricingType('fixed');
            }}
          >
            <Ionicons 
              name="cube-outline" 
              size={18} 
              color={formType === 'product' ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[styles.typeToggleText, formType === 'product' && styles.typeToggleTextActive]}>
              Product
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeToggleBtn, formType === 'service' && styles.typeToggleBtnActive]}
            onPress={() => {
              setFormType('service');
              setFormTrackStock(false);
            }}
          >
            <Ionicons 
              name="construct-outline" 
              size={18} 
              color={formType === 'service' ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[styles.typeToggleText, formType === 'service' && styles.typeToggleTextActive]}>
              Service
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label={formType === 'service' ? 'Service Name *' : 'Product Name *'}
          placeholder={formType === 'service' ? 'Enter the service name' : 'Enter the product name'}
          value={formName}
          onChangeText={setFormName}
        />

        <Input
          label="Description"
          placeholder={formType === 'service' ? 'Describe the service (optional)' : 'Enter product description (optional)'}
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.map((cat) => (
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
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
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

        {/* Service Pricing Type - Only show for services */}
        {formType === 'service' && (
          <View style={styles.pricingTypeContainer}>
            <Text style={styles.inputLabel}>Pricing Type</Text>
            <View style={styles.pricingTypeGrid}>
              <TouchableOpacity
                style={[styles.pricingTypeOption, formPricingType === 'fixed' && styles.pricingTypeOptionActive]}
                onPress={() => setFormPricingType('fixed')}
              >
                <Ionicons name="pricetag-outline" size={20} color={formPricingType === 'fixed' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.pricingTypeText, formPricingType === 'fixed' && styles.pricingTypeTextActive]}>Fixed Price</Text>
                <Text style={styles.pricingTypeDesc}>One-time fee</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingTypeOption, formPricingType === 'hourly' && styles.pricingTypeOptionActive]}
                onPress={() => setFormPricingType('hourly')}
              >
                <Ionicons name="time-outline" size={20} color={formPricingType === 'hourly' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.pricingTypeText, formPricingType === 'hourly' && styles.pricingTypeTextActive]}>Per Hour</Text>
                <Text style={styles.pricingTypeDesc}>e.g., Consulting</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingTypeOption, formPricingType === 'daily' && styles.pricingTypeOptionActive]}
                onPress={() => setFormPricingType('daily')}
              >
                <Ionicons name="calendar-outline" size={20} color={formPricingType === 'daily' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.pricingTypeText, formPricingType === 'daily' && styles.pricingTypeTextActive]}>Per Day</Text>
                <Text style={styles.pricingTypeDesc}>e.g., Car Rental</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingTypeOption, formPricingType === 'per_session' && styles.pricingTypeOptionActive]}
                onPress={() => setFormPricingType('per_session')}
              >
                <Ionicons name="timer-outline" size={20} color={formPricingType === 'per_session' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.pricingTypeText, formPricingType === 'per_session' && styles.pricingTypeTextActive]}>Per Session</Text>
                <Text style={styles.pricingTypeDesc}>e.g., Massage</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={isWeb ? styles.row : styles.mobileColumn}>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Input
              label={formType === 'service' 
                ? (formPricingType === 'hourly' ? 'Rate per Hour *' 
                   : formPricingType === 'daily' ? 'Rate per Day *'
                   : formPricingType === 'per_session' ? 'Rate per Session *'
                   : 'Selling Price *')
                : 'Selling Price *'}
              placeholder="Enter selling price"
              value={formPrice}
              onChangeText={setFormPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHelper}>Price customers pay</Text>
          </View>
          <View style={isWeb ? styles.halfField : styles.fullField}>
            <Input
              label="Cost Price"
              placeholder="Enter cost price"
              value={formCostPrice}
              onChangeText={setFormCostPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHelper}>Your purchase/acquisition cost</Text>
          </View>
        </View>

        {/* Duration fields for per_session services */}
        {formType === 'service' && formPricingType === 'per_session' && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Session Duration (minutes)</Text>
            <View style={isWeb ? styles.row : styles.mobileColumn}>
              <View style={isWeb ? styles.halfField : styles.fullField}>
                <Input
                  label="Duration *"
                  placeholder="e.g., 60"
                  value={formDuration}
                  onChangeText={setFormDuration}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* Min/Max duration for hourly/daily services */}
        {formType === 'service' && (formPricingType === 'hourly' || formPricingType === 'daily') && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>
              {formPricingType === 'hourly' ? 'Booking Duration (hours)' : 'Booking Duration (days)'}
            </Text>
            <View style={isWeb ? styles.row : styles.mobileColumn}>
              <View style={isWeb ? styles.halfField : styles.fullField}>
                <Input
                  label="Minimum"
                  placeholder={formPricingType === 'hourly' ? 'e.g., 1' : 'e.g., 1'}
                  value={formMinDuration}
                  onChangeText={setFormMinDuration}
                  keyboardType="number-pad"
                />
              </View>
              <View style={isWeb ? styles.halfField : styles.fullField}>
                <Input
                  label="Maximum"
                  placeholder={formPricingType === 'hourly' ? 'e.g., 8' : 'e.g., 30'}
                  value={formMaxDuration}
                  onChangeText={setFormMaxDuration}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* Only show SKU/Barcode for products */}
        {formType === 'product' && (
          <View style={isWeb ? styles.row : styles.mobileColumn}>
            <View style={isWeb ? styles.halfField : styles.fullField}>
              <Text style={styles.inputLabel}>SKU *</Text>
              {globalSkuAutoGenerate ? (
                <View style={styles.skuAutoContainer}>
                  {generatingSku ? (
                    <View style={styles.skuGenerating}>
                      <ActivityIndicator size="small" color="#059669" />
                      <Text style={styles.skuGeneratingText}>Generating from settings...</Text>
                    </View>
                  ) : formSku ? (
                    <View style={styles.skuGenerated}>
                      <Text style={styles.skuGeneratedValue}>{formSku}</Text>
                      <TouchableOpacity onPress={generateSku}>
                        <Ionicons name="refresh-outline" size={20} color="#059669" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.generateSkuBtn} onPress={generateSku}>
                      <Ionicons name="flash-outline" size={18} color="#059669" />
                      <Text style={styles.generateSkuBtnText}>Generate SKU</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.skuHelper}>SKU auto-generated from global settings</Text>
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
            <View style={isWeb ? styles.halfField : styles.fullField}>
              <Input
                label="Barcode"
                placeholder="Optional"
                value={formBarcode}
                onChangeText={setFormBarcode}
              />
            </View>
          </View>
        )}

        {/* Service code for services */}
        {formType === 'service' && (
          <View>
            <Text style={styles.inputLabel}>Service Code</Text>
            {globalServiceCodeAutoGenerate ? (
              <View style={[styles.skuAutoContainer, { borderColor: '#93C5FD' }]}>
                {generatingServiceCode ? (
                  <View style={styles.skuGenerating}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={[styles.skuGeneratingText, { color: '#1E40AF' }]}>Generating from settings...</Text>
                  </View>
                ) : formSku ? (
                  <View style={styles.skuGenerated}>
                    <Text style={[styles.skuGeneratedValue, { color: '#2563EB' }]}>{formSku}</Text>
                    <TouchableOpacity onPress={generateServiceCode}>
                      <Ionicons name="refresh-outline" size={20} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.generateSkuBtn, { borderColor: '#2563EB' }]} onPress={generateServiceCode}>
                    <Ionicons name="flash-outline" size={18} color="#2563EB" />
                    <Text style={[styles.generateSkuBtnText, { color: '#2563EB' }]}>Generate Service Code</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.skuHelper, { color: '#1E40AF' }]}>Service code auto-generated from global settings</Text>
              </View>
            ) : (
              <Input
                placeholder="Enter service code (e.g., SVC-001)"
                value={formSku}
                onChangeText={setFormSku}
                autoCapitalize="characters"
              />
            )}
          </View>
        )}

        {/* Unit of Measure - Only for products */}
        {formType === 'product' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Unit of Measure</Text>
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
                {/* Add New UOM Button */}
                <TouchableOpacity
                  style={styles.addUomChip}
                  onPress={() => setShowInlineUomForm(true)}
                >
                  <Ionicons name="add" size={16} color="#F59E0B" />
                  <Text style={styles.addUomChipText}>New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
        )}

        {/* Track Stock Toggle - Only for products */}
        {formType === 'product' && (
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Track Stock</Text>
              <Text style={styles.toggleDescription}>
                Enable to track inventory levels. Disable for items sold "as-is"
              </Text>
            </View>
            <Pressable
              style={[styles.toggleSwitch, formTrackStock && styles.toggleSwitchActive]}
              onPress={() => setFormTrackStock(!formTrackStock)}
            >
              <View style={[styles.toggleKnob, formTrackStock && styles.toggleKnobActive]} />
            </Pressable>
          </View>
        )}

        {/* Has Variants Toggle - Only for products */}
        {formType === 'product' && (
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
        )}

        {/* Variants Section */}
        {formType === 'product' && formHasVariants && (
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
              <Ionicons name="add-circle-outline" size={20} color="#16A34A" />
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

        {/* Stock Quantity - only show for products without variants */}
        {formType === 'product' && !formHasVariants && (
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
          title={editingProduct 
            ? (formType === 'service' ? 'Update Service' : 'Update Product') 
            : (formType === 'service' ? 'Add Service' : 'Add Product')}
          onPress={handleSaveProduct}
          loading={saving}
          style={styles.saveButton}
        />
      </WebModal>

      {/* Success Confirmation Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <Pressable 
          style={styles.successModalOverlay}
          onPress={() => setShowSuccessModal(false)}
        >
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>{successMessage.title}</Text>
            <Text style={styles.successSubtitle}>{successMessage.subtitle}</Text>
            <View style={styles.successActions}>
              <Pressable
                style={styles.successAddAnotherBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                <Text style={styles.successAddAnotherText}>Add Another</Text>
              </Pressable>
              <Pressable
                style={styles.successDoneBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.successDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
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
  // Product/Service Type Toggle
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  typeToggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
  },
  // Pricing Type Styles
  pricingTypeContainer: {
    marginBottom: 20,
  },
  pricingTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pricingTypeOption: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  pricingTypeOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  pricingTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
  },
  pricingTypeTextActive: {
    color: '#2563EB',
  },
  pricingTypeDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Duration Container
  durationContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
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
  },
  contentWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productCardWeb: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
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
    backgroundColor: '#2563EB',
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
  // Variant styles - Green theme when active
  variantsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
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
    borderColor: '#22C55E',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
    gap: 8,
    marginBottom: 8,
  },
  addVariantTypeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#16A34A',
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
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
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
    color: '#111827',
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
  // Mobile Card Container
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    backgroundColor: '#2563EB',
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
    justifyContent: 'flex-start',
  },
  webEmptyList: {
    flexGrow: 1,
    justifyContent: 'center',
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
  webEmptyText: { 
    fontSize: 14, 
    color: '#9CA3AF', 
    marginTop: 8,
    textAlign: 'center',
  },
  webEmptyBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  webEmptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 250,
    gap: 8,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  // SKU Auto-generation Styles
  fieldHelper: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  skuOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  skuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuOptionActive: {},
  skuOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  skuAutoContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
  },
  skuGenerating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skuGeneratingText: {
    fontSize: 14,
    color: '#92400E',
  },
  skuGenerated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  skuGeneratedValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  generateSkuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  generateSkuBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  skuHelper: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    marginTop: 8,
  },
});
