import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { productsApi, categoriesApi, customersApi } from '../../src/api/client';
import { useCartStore } from '../../src/store/cartStore';
import { useBusinessStore } from '../../src/store/businessStore';
import EmptyState from '../../src/components/EmptyState';
import Input from '../../src/components/Input';
import BulkProductImportModal from '../../src/components/products/BulkProductImportModal';
import QuickAddProductModal, { ProductData } from '../../src/components/products/QuickAddProductModal';
import WebModal from '../../src/components/WebModal';
import { 
  JustInTimePrompt, 
  useJustInTimePrompt,
  hasPromptBeenShown 
} from '../../src/components/common/JustInTimePrompts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image?: string;
  category_id: string;
  category_name?: string;
  tax_rate: number;
  cost_price?: number;
  sku?: string;
  min_stock?: number;
  unit?: string;
  item_type?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { addItem, items, customer_id, customer_name, setCustomer, getSubtotal } = useCartStore();
  const { settings, formatCurrency, formatPhone, getLastNineDigits } = useBusinessStore();

  // Customer selection states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Customer | null>(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  
  // New customer form
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Quick Add Product modal - using reusable component
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Product Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Import modal
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  
  // Just-in-time prompts
  const { activePrompt, isVisible: showJitPrompt, showPrompt, hidePrompt } = useJustInTimePrompt();

  // Load products helper
  const loadProducts = useCallback(() => {
    fetchData();
  }, [selectedCategory, search]);

  // Handle product save (add or edit)
  const handleSaveProduct = async (productData: ProductData) => {
    if (isEditMode && editingProduct) {
      // Update existing product
      await productsApi.update(editingProduct.id, {
        name: productData.name,
        price: productData.price,
        cost_price: productData.cost_price,
        stock_quantity: productData.stock_quantity,
        category_id: productData.category_id,
        tax_rate: 0,
        sku: productData.sku,
        min_stock: productData.min_stock,
        unit: productData.unit,
        item_type: productData.item_type,
      });
      setSuccessMessage('Product updated successfully!');
    } else {
      // Create new product
      await productsApi.create({
        name: productData.name,
        price: productData.price,
        cost_price: productData.cost_price,
        stock_quantity: productData.stock_quantity,
        category_id: productData.category_id,
        tax_rate: 0,
        sku: productData.sku,
        min_stock: productData.min_stock,
        unit: productData.unit,
        item_type: productData.item_type,
      });
      setSuccessMessage('Product added successfully!');
      
      // Show SKU format prompt after first product add
      const alreadyShown = await hasPromptBeenShown('first_product_add');
      if (!alreadyShown && products.length === 0) {
        setTimeout(() => {
          showPrompt('first_product_add', {
            onSetup: () => router.push('/admin/settings?tab=app'),
          });
        }, 1500);
      }
    }
    
    setShowSuccessModal(true);
    loadProducts();
  };

  // Open modal for adding new product
  const openAddModal = () => {
    setEditingProduct(null);
    setIsEditMode(false);
    setShowAddProductModal(true);
  };

  // Open modal for editing existing product
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setShowAddProductModal(true);
  };

  // Close add/edit modal
  const closeProductModal = () => {
    setShowAddProductModal(false);
    setEditingProduct(null);
    setIsEditMode(false);
  };

  // Open product detail modal
  const openDetailModal = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  // Handle delete confirmation
  const confirmDelete = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  // Execute product deletion
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    setDeleting(true);
    try {
      await productsApi.delete(deletingProduct.id);
      setShowDeleteModal(false);
      setDeletingProduct(null);
      loadProducts();
      setSuccessMessage('Product deleted successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  // Customer search functions
  const openCustomerModal = () => {
    setPhoneSearch('');
    setSearchResult(null);
    setShowAddCustomerForm(false);
    setFormError('');
    resetNewCustomerForm();
    setShowCustomerModal(true);
  };

  // Bulk Import handler
  const handleBulkImport = async (products: any[]): Promise<{ success: number; failed: number }> => {
    try {
      const response = await productsApi.bulkImport(products);
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

  const resetNewCustomerForm = () => {
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setFormError('');
  };

  const searchByPhone = async (phone: string) => {
    setPhoneSearch(phone);
    setSearchResult(null);
    setShowAddCustomerForm(false);
    setFormError('');
    
    if (phone.length < 3) return;
    
    setSearching(true);
    try {
      const response = await customersApi.getAll(phone);
      
      const exactMatch = response.data.find((c: Customer) => 
        c.phone === phone || 
        c.phone === `${settings.countryCode}${phone}` ||
        c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
      );
      
      if (exactMatch) {
        setSearchResult(exactMatch);
      } else if (response.data.length > 0) {
        setSearchResult(response.data[0]);
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.log('Search failed:', error);
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation helper  
  const isValidPhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 9;
  };

  const handleSaveNewCustomer = async () => {
    setFormError('');
    
    if (!newCustomerName.trim()) {
      setFormError('Customer name is required');
      return;
    }
    
    if (!phoneSearch.trim()) {
      setFormError('Phone number is required');
      return;
    }

    if (!isValidPhone(phoneSearch)) {
      setFormError('Please enter a valid phone number (at least 9 digits)');
      return;
    }

    if (newCustomerEmail.trim() && !isValidEmail(newCustomerEmail.trim())) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    setSavingCustomer(true);
    try {
      // Use last 9 digits only (removes leading 0 and any country code)
      const last9Digits = getLastNineDigits(phoneSearch);
      const fullPhone = `${settings.countryCode}${last9Digits}`;
      
      const customerData = {
        name: newCustomerName.trim(),
        phone: fullPhone,
        email: newCustomerEmail.trim() || undefined,
        address: newCustomerAddress.trim() || undefined,
      };
      
      const response = await customersApi.create(customerData);
      
      setCustomer(response.data.id, response.data.name);
      setShowCustomerModal(false);
      setSuccessMessage(`Customer "${response.data.name}" added!`);
      setShowSuccessModal(true);
      resetNewCustomerForm();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create customer';
      if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('exists')) {
        setFormError('A customer with this phone number already exists');
      } else {
        setFormError(errorMessage);
      }
    } finally {
      setSavingCustomer(false);
    }
  };

  const clearCustomer = () => {
    setCustomer(null, null);
  };

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll({
          category_id: selectedCategory || undefined,
          search: search || undefined,
        }),
        categoriesApi.getAll(),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.log('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedCategory, search]);

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    addItem(product);
    Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isOutOfStock = item.stock_quantity <= 0;
    const isLowStock = item.stock_quantity > 0 && item.stock_quantity <= (item.min_stock || 5);
    
    return (
      <View style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}>
        {/* Product Image / Tap to view details */}
        <TouchableOpacity
          style={styles.productImageContainer}
          onPress={() => openDetailModal(item)}
          activeOpacity={0.8}
        >
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          </View>
          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>{item.stock_quantity} left</Text>
            </View>
          )}
          {/* Action buttons overlay */}
          <View style={styles.productActionsOverlay}>
            <TouchableOpacity
              style={styles.productActionIcon}
              onPress={() => openEditModal(item)}
              data-testid={`edit-product-${item.id}`}
            >
              <Ionicons name="create-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.productActionIcon, styles.productActionIconDelete]}
              onPress={() => confirmDelete(item)}
              data-testid={`delete-product-${item.id}`}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        <View style={styles.productInfo}>
          <TouchableOpacity onPress={() => openDetailModal(item)}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          </TouchableOpacity>
          {item.category_name && (
            <Text style={styles.productCategory}>{item.category_name}</Text>
          )}
          {item.sku && (
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          )}
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <TouchableOpacity
              style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
              onPress={() => handleAddToCart(item)}
              disabled={isOutOfStock}
              data-testid={`add-to-cart-${item.id}`}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCategory = ({ item }: { item: Category | { id: null; name: string } }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.categoryChipTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

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
      {/* Customer Selection Bar */}
      <TouchableOpacity style={styles.customerBar} onPress={openCustomerModal}>
        <View style={styles.customerBarLeft}>
          <Ionicons 
            name={customer_id ? "person-circle" : "person-circle-outline"} 
            size={28} 
            color={customer_id ? "#2563EB" : "#6B7280"} 
          />
          <View style={styles.customerBarInfo}>
            <Text style={styles.customerBarLabel}>Customer</Text>
            <Text style={[styles.customerBarName, customer_id && styles.customerBarNameActive]}>
              {customer_name || 'Tap to select customer'}
            </Text>
          </View>
        </View>
        {customer_id ? (
          <TouchableOpacity style={styles.clearCustomerBtn} onPress={clearCustomer}>
            <Ionicons name="close-circle" size={24} color="#DC2626" />
          </TouchableOpacity>
        ) : (
          <View style={styles.selectCustomerBadge}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Add Sale</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Product Action Buttons */}
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={styles.productActionBtn}
          onPress={openAddModal}
          data-testid="add-product-btn"
        >
          <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.productActionBtnText}>Add Product</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.productActionBtn, styles.productActionBtnAlt]}
          onPress={() => setShowBulkImportModal(true)}
          data-testid="bulk-import-btn"
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#10B981" />
          <Text style={[styles.productActionBtnText, styles.productActionBtnTextAlt]}>Bulk Import</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={[{ id: null, name: 'All' }, ...categories]}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        />
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[
          styles.productsList,
          items.length > 0 && { paddingBottom: 220 + (Math.min(items.length, 4) * 24) }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Your shelves are empty!"
            message={search ? 'Try a different search term' : "Time to stock up! Add products to start selling."}
            actionLabel={!search ? "Add Product" : undefined}
            onAction={!search ? openAddModal : undefined}
          />
        }
      />

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showAddCustomerForm ? 'Add New Customer' : 'Find Customer'}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Phone Number Search */}
              <View style={styles.phoneSearchSection}>
                <Text style={styles.phoneSearchLabel}>Enter Customer Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>{settings.countryCode}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Phone number"
                    value={phoneSearch}
                    onChangeText={searchByPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  {searching && (
                    <ActivityIndicator size="small" color="#2563EB" style={styles.searchIndicator} />
                  )}
                </View>
              </View>

              {/* Search Result */}
              {searchResult && !showAddCustomerForm && (
                <View style={styles.searchResultSection}>
                  <Text style={styles.searchResultLabel}>Customer Found</Text>
                  <TouchableOpacity
                    style={styles.foundCustomerCard}
                    onPress={() => {
                      setCustomer(searchResult.id, searchResult.name);
                      setShowCustomerModal(false);
                      setSuccessMessage(`Customer "${searchResult.name}" selected`);
                      setShowSuccessModal(true);
                    }}
                  >
                    <Ionicons name="person-circle" size={40} color="#2563EB" />
                    <View style={styles.foundCustomerInfo}>
                      <Text style={styles.foundCustomerName}>{searchResult.name}</Text>
                      <Text style={styles.foundCustomerPhone}>{searchResult.phone}</Text>
                    </View>
                    <View style={styles.selectBadge}>
                      <Text style={styles.selectBadgeText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* No Result - Prompt to add */}
              {phoneSearch.length >= 3 && !searchResult && !searching && !showAddCustomerForm && (
                <View style={styles.noResultSection}>
                  <Ionicons name="person-add-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.noResultText}>No customer found with this number</Text>
                  <TouchableOpacity
                    style={styles.addNewButton}
                    onPress={() => setShowAddCustomerForm(true)}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addNewButtonText}>Add New Customer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Add Customer Form */}
              {showAddCustomerForm && (
                <View style={styles.addCustomerForm}>
                  <View style={styles.formPhoneDisplay}>
                    <Ionicons name="call" size={20} color="#2563EB" />
                    <Text style={styles.formPhoneText}>{settings.countryCode} {phoneSearch}</Text>
                  </View>

                  {formError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <Text style={styles.errorText}>{formError}</Text>
                    </View>
                  ) : null}

                  <Input
                    label="Customer Name *"
                    placeholder="Enter full name"
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                    leftIcon={<Ionicons name="person-outline" size={20} color="#6B7280" />}
                  />

                  <Input
                    label="Email (Optional)"
                    placeholder="Enter email address"
                    value={newCustomerEmail}
                    onChangeText={setNewCustomerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
                  />

                  <Input
                    label="Address (Optional)"
                    placeholder="Enter address"
                    value={newCustomerAddress}
                    onChangeText={setNewCustomerAddress}
                    leftIcon={<Ionicons name="location-outline" size={20} color="#6B7280" />}
                  />

                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={styles.cancelFormButton}
                      onPress={() => {
                        setShowAddCustomerForm(false);
                        resetNewCustomerForm();
                      }}
                    >
                      <Text style={styles.cancelFormButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveFormButton}
                      onPress={handleSaveNewCustomer}
                      disabled={savingCustomer}
                    >
                      {savingCustomer ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                          <Text style={styles.saveFormButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Walk-in Customer Option */}
              {!showAddCustomerForm && (
                <TouchableOpacity
                  style={styles.walkInOption}
                  onPress={() => {
                    setCustomer(null, null);
                    setShowCustomerModal(false);
                  }}
                >
                  <Ionicons name="walk-outline" size={24} color="#6B7280" />
                  <Text style={styles.walkInText}>Continue as Walk-in Customer</Text>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successModalTitle}>Success!</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Add/Edit Product Modal - Using Reusable Component */}
      <QuickAddProductModal
        visible={showAddProductModal}
        onClose={closeProductModal}
        onSave={handleSaveProduct}
        categories={categories}
        currencySymbol={settings?.currency_symbol}
        showCostPrice={true}
        showMinStock={true}
        showSku={true}
        showUnit={true}
        showItemType={true}
        isEditMode={isEditMode}
        initialData={editingProduct ? {
          name: editingProduct.name,
          price: editingProduct.price,
          cost_price: editingProduct.cost_price,
          stock_quantity: editingProduct.stock_quantity,
          min_stock: editingProduct.min_stock,
          category_id: editingProduct.category_id,
          unit: editingProduct.unit,
          sku: editingProduct.sku,
          item_type: editingProduct.item_type,
        } : undefined}
        appType="retailpro"
      />

      {/* Product Detail Modal */}
      <WebModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedProduct?.name || 'Product Details'}
        subtitle="View product information"
        icon="cube-outline"
        iconColor="#2563EB"
        maxWidth={420}
      >
        {selectedProduct && (
          <View style={styles.detailModalContent}>
            {/* Product Image Placeholder */}
            <View style={styles.detailImageContainer}>
              <View style={styles.detailImagePlaceholder}>
                <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              </View>
            </View>

            {/* Product Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailProductName}>{selectedProduct.name}</Text>
              {selectedProduct.sku && (
                <Text style={styles.detailSku}>SKU: {selectedProduct.sku}</Text>
              )}
            </View>

            {/* Price Info */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Selling Price</Text>
                <Text style={styles.detailPrice}>{formatCurrency(selectedProduct.price)}</Text>
              </View>
              {selectedProduct.cost_price !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cost Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedProduct.cost_price)}</Text>
                </View>
              )}
            </View>

            {/* Stock Info */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock Quantity</Text>
                <Text style={[
                  styles.detailValue,
                  selectedProduct.stock_quantity <= 0 && styles.detailValueDanger,
                  selectedProduct.stock_quantity > 0 && selectedProduct.stock_quantity <= (selectedProduct.min_stock || 5) && styles.detailValueWarning
                ]}>
                  {selectedProduct.stock_quantity} {selectedProduct.unit || 'pcs'}
                </Text>
              </View>
              {selectedProduct.min_stock !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Min Stock Level</Text>
                  <Text style={styles.detailValue}>{selectedProduct.min_stock}</Text>
                </View>
              )}
            </View>

            {/* Category & Type */}
            <View style={styles.detailRow}>
              {selectedProduct.category_name && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>{selectedProduct.category_name}</Text>
                  </View>
                </View>
              )}
              {selectedProduct.item_type && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <View style={[styles.detailBadge, styles.detailBadgeBlue]}>
                    <Text style={[styles.detailBadgeText, styles.detailBadgeTextBlue]}>
                      {selectedProduct.item_type === 'service' ? 'Service' : 'Product'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailEditBtn}
                onPress={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedProduct);
                }}
                data-testid="detail-edit-btn"
              >
                <Ionicons name="create-outline" size={18} color="#2563EB" />
                <Text style={styles.detailEditBtnText}>Edit Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailDeleteBtn}
                onPress={() => {
                  setShowDetailModal(false);
                  confirmDelete(selectedProduct);
                }}
                data-testid="detail-delete-btn"
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>

      {/* Delete Confirmation Modal */}
      <WebModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Product"
        subtitle="This action cannot be undone"
        icon="warning-outline"
        iconColor="#DC2626"
        maxWidth={400}
      >
        <View style={styles.deleteModalContent}>
          <View style={styles.deleteWarningIcon}>
            <Ionicons name="alert-circle" size={48} color="#DC2626" />
          </View>
          <Text style={styles.deleteWarningText}>
            Are you sure you want to delete "{deletingProduct?.name}"?
          </Text>
          <Text style={styles.deleteWarningSubtext}>
            This will permanently remove this product from your inventory.
          </Text>
          <View style={styles.deleteActions}>
            <TouchableOpacity
              style={styles.deleteCancelBtn}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.deleteCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteConfirmBtn}
              onPress={handleDeleteProduct}
              disabled={deleting}
              data-testid="confirm-delete-btn"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </WebModal>

      {/* Floating Cart Summary Bar */}
      {items.length > 0 && (
        <View style={styles.cartSummaryBar}>
          {/* Items List */}
          <View style={styles.cartItemsList}>
            {items.slice(0, 4).map((item, index) => (
              <View key={item.product_id} style={styles.cartItemRow}>
                <Text style={styles.cartItemName} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.cartItemQty}>x{item.quantity}</Text>
              </View>
            ))}
            {items.length > 4 && (
              <Text style={styles.moreItemsText}>+{items.length - 4} more items</Text>
            )}
          </View>
          
          {/* Footer with total and proceed */}
          <View style={styles.cartSummaryFooter}>
            <View style={styles.cartTotalSection}>
              <Text style={styles.cartTotalLabel}>Total ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</Text>
              <Text style={styles.cartSummaryTotal}>{formatCurrency(getSubtotal())}</Text>
            </View>
            <TouchableOpacity 
              style={styles.proceedButton}
              onPress={() => router.push('/(tabs)/cart')}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bulk Product Import Modal */}
      <BulkProductImportModal
        visible={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        categories={categories}
        onImport={handleBulkImport}
        formatCurrency={formatCurrency}
      />
      
      {/* Just-in-Time Prompts */}
      {activePrompt && (
        <JustInTimePrompt
          visible={showJitPrompt}
          config={activePrompt}
          onDismiss={hidePrompt}
        />
      )}
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
    padding: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  productActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  productActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  productActionBtnAlt: {
    backgroundColor: '#D1FAE5',
  },
  productActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  productActionBtnTextAlt: {
    color: '#059669',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100, // Extra padding for cart summary bar
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  // Product Card Action Overlay
  productActionsOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  productActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productActionIconDelete: {
    backgroundColor: 'rgba(254,226,226,0.95)',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  // Customer Bar Styles
  customerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerBarInfo: {
    flexDirection: 'column',
  },
  customerBarLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerBarName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  customerBarNameActive: {
    color: '#111827',
    fontWeight: '600',
  },
  clearCustomerBtn: {
    padding: 4,
  },
  selectCustomerBadge: {
    backgroundColor: '#2563EB',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
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
  },
  // Phone Search Styles
  phoneSearchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  phoneSearchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  searchIndicator: {
    marginLeft: 8,
  },
  // Search Result Styles
  searchResultSection: {
    padding: 16,
  },
  searchResultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginBottom: 12,
  },
  foundCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 12,
  },
  foundCustomerInfo: {
    flex: 1,
  },
  foundCustomerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  foundCustomerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  selectBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // No Result Styles
  noResultSection: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  noResultText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  addNewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // Add Customer Form Styles
  addCustomerForm: {
    padding: 16,
  },
  formPhoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 10,
    gap: 12,
    marginBottom: 16,
  },
  formPhoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelFormButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelFormButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveFormButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveFormButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Walk-in Option
  walkInOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  walkInText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  successModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Cart Summary Bar Styles
  cartSummaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cartItemsList: {
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartItemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  cartItemQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    minWidth: 30,
    textAlign: 'right',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cartSummaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartTotalSection: {
    flexDirection: 'column',
  },
  cartTotalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  cartSummaryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Quick Add Product Modal Styles
  productModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 420,
  },
  productModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  productModalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  productModalBannerText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  productModalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  productModalErrorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  productModalField: {
    marginBottom: 16,
  },
  productModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  productModalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  productModalRow: {
    flexDirection: 'row',
  },
  productModalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  productModalChipActive: {
    backgroundColor: '#2563EB',
  },
  productModalChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  productModalChipTextActive: {
    color: '#FFFFFF',
  },
  productModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  productModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  productModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  productModalSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  productModalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productModalSaveBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  // Product Detail Modal Styles
  detailModalContent: {
    paddingBottom: 20,
  },
  detailImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailProductName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailSku: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailValueWarning: {
    color: '#F59E0B',
  },
  detailValueDanger: {
    color: '#DC2626',
  },
  detailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  detailBadgeTextBlue: {
    color: '#2563EB',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  detailEditBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  detailDeleteBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  // Delete Modal Styles
  deleteModalContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  deleteWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteWarningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteWarningSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
