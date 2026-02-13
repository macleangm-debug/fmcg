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
  const [formBarcode, setFormBarcode] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('10');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [formTrackStock, setFormTrackStock] = useState(true);
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState('pcs');
  
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
    setFormPrice('0');
    setFormCostPrice('0');
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
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <View style={styles.headerActions}>
          {isWeb && (
            <ViewToggle
              currentView={productsView}
              onToggle={setProductsView}
            />
          )}
          {/* Import/Export Button */}
          <TouchableOpacity 
            style={styles.importExportButton}
            onPress={() => setShowImportExportModal(true)}
          >
            <Ionicons name="swap-vertical-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
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
      </View>

      <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
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

      <View style={[styles.content, isWeb && styles.contentWeb]}>
        {isWeb && productsView === 'table' && <TableHeader />}
        <FlatList
          data={products}
          renderItem={isWeb && productsView === 'table' ? renderProductTable : renderProductGrid}
          keyExtractor={(item) => item.id}
          key={`${isWeb}-${productsView}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={isWeb && productsView === 'table' ? styles.tableList : styles.list}
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

      <WebModal
        visible={showAddModal}
        onClose={() => { resetForm(); setShowAddModal(false); }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={editingProduct ? 'Update product information' : 'Add a new product to your catalog'}
        icon={editingProduct ? 'create-outline' : 'bag-add-outline'}
        iconColor="#2563EB"
        maxWidth={550}
      >
        <Input
          label="Product Name *"
          placeholder="Enter product name"
          value={formName}
          onChangeText={setFormName}
        />

        <Input
          label="Description"
          placeholder="Enter description (optional)"
          value={formDescription}
          onChangeText={setFormDescription}
          multiline
        />

        <Text style={styles.inputLabel}>Category *</Text>
        {categories.length === 0 ? (
          <TouchableOpacity
            style={styles.noCategoriesBox}
            onPress={() => {
              Alert.alert(
                'No Categories',
                'You need to create a category first before adding products.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Create Category', 
                    onPress: () => {
                      setShowAddModal(false);
                      router.push('/admin/categories');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="folder-open-outline" size={24} color="#9CA3AF" />
            <Text style={styles.noCategoriesText}>No categories found. Tap to create one.</Text>
          </TouchableOpacity>
        ) : (
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
          </ScrollView>
        )}

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Input
              label="Price *"
              placeholder="0.00"
              value={formPrice}
              onChangeText={setFormPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Input
              label="Cost Price"
              placeholder="0.00"
              value={formCostPrice}
              onChangeText={setFormCostPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Input
              label="SKU *"
              placeholder="PROD-001"
              value={formSku}
              onChangeText={setFormSku}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.halfField}>
            <Input
              label="Barcode"
              placeholder="Optional"
              value={formBarcode}
              onChangeText={setFormBarcode}
            />
          </View>
        </View>

        <Input
          label="Tax Rate (%)"
          placeholder="0"
          value={formTaxRate}
          onChangeText={setFormTaxRate}
          keyboardType="decimal-pad"
        />

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
                        placeholder="0"
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
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Stock Qty"
                placeholder="0"
                value={formStockQuantity}
                onChangeText={setFormStockQuantity}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Low Stock Alert"
                placeholder="10"
                value={formLowStockThreshold}
                onChangeText={setFormLowStockThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        <Button
          title={editingProduct ? 'Update Product' : 'Add Product'}
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
  categoryScroll: {
    marginBottom: 16,
  },
  noCategoriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  noCategoriesText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
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
});
