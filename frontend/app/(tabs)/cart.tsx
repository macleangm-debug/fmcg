import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../src/store/cartStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useAuthStore } from '../../src/store/authStore';
import { ordersApi, customersApi, promotionsApi, productsApi, categoriesApi } from '../../src/api/client';
import CartItem from '../../src/components/CartItem';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import EmptyState from '../../src/components/EmptyState';

const isWeb = Platform.OS === 'web';

// Web-compatible pressable wrapper with cursor pointer for web
const WebPressable = ({ onPress, style, children, disabled, ...props }: any) => {
  const handlePress = React.useCallback(() => {
    console.log('WebPressable handlePress called');
    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  const containerStyle = typeof style === 'function' ? style({ pressed: false }) : style;
  
  // Add cursor pointer for web to ensure clickability
  const webStyle = isWeb ? { cursor: disabled ? 'default' : 'pointer' } : {};
  
  return (
    <Pressable
      onPress={handlePress}
      style={[containerStyle, webStyle]}
      disabled={disabled}
      accessibilityRole="button"
      {...props}
    >
      {children}
    </Pressable>
  );
};

type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'credit';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface AppliedPromotion {
  id: string;
  name: string;
  type: string;
  discount?: number;
  free_product?: string;
  free_quantity?: number;
}

interface PromotionResult {
  applied_promotions: AppliedPromotion[];
  total_discount: number;
  free_items: any[];
}

export default function Cart() {
  const router = useRouter();
  const {
    items,
    customer_id,
    customer_name,
    updateQuantity,
    removeItem,
    setCustomer,
    clearCart,
    getSubtotal,
    getTaxTotal,
    addItem,
  } = useCartStore();

  const { formatCurrency, settings, getLastNineDigits } = useBusinessStore();
  const { user, logout } = useAuthStore();
  const isSalesRole = user?.role === 'sales_staff' || user?.role === 'front_desk';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Confirmation modal for completing sale
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Product browsing modal for sales staff
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  // Phone search and add customer state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Customer | null>(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  
  // New customer form fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Clear cart confirmation modal
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Promotions state
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  
  // Variant selection state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);

  const subtotal = getSubtotal();
  const tax = getTaxTotal();
  const promoDiscount = promotionResult?.total_discount || 0;
  const total = subtotal + tax - promoDiscount;

  // Format currency without abbreviation for payments
  const formatFullCurrency = (amount: number) => formatCurrency(amount, false);

  // Load products for sales staff
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      console.log('=== CART: Loaded products ===');
      console.log('Total products:', productsRes.data.length);
      // Log all products with their variant status
      productsRes.data.forEach((p: any) => {
        if (p.has_variants || (p.variants && p.variants.length > 0)) {
          console.log(`Product with variants: ${p.name}, has_variants=${p.has_variants}, variants_count=${p.variants?.length || 0}`);
        }
      });
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.log('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle adding product - check for variants first
  const handleProductPress = (product: any) => {
    console.log('=== handleProductPress called ===');
    console.log('Product:', product.name);
    console.log('has_variants:', product.has_variants);
    console.log('variants:', product.variants);
    console.log('variants length:', product.variants?.length);
    
    const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
    console.log('hasVariants computed:', hasVariants);
    
    if (hasVariants) {
      console.log('Opening variant modal...');
      setSelectedProductForVariant(product);
      setShowVariantModal(true);
    } else {
      console.log('Adding directly to cart...');
      handleAddProductToCart(product);
    }
  };

  // Add product with specific variant
  const handleAddVariantToCart = (product: any, variant: any, variantIndex: number) => {
    const variantLabel = Object.values(variant.options).join(' / ');
    console.log('Adding variant to cart:', product.name, variantLabel);
    addItem({
      id: `${product.id}_v${variantIndex}`,
      name: `${product.name} (${variantLabel})`,
      price: product.price,
      tax_rate: product.tax_rate || 0,
    }, 1);
    setShowVariantModal(false);
    setSelectedProductForVariant(null);
    Alert.alert('Added', `${product.name} (${variantLabel}) added to cart`);
  };

  const handleAddProductToCart = (product: any) => {
    console.log('Adding product to cart:', product.name);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      tax_rate: product.tax_rate || 0,
    }, 1);
    console.log('Current items count after add:', items.length + 1);
    Alert.alert('Added', `${product.name} added to cart`);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/(auth)/login');
  };

  const confirmClearCart = () => {
    setShowClearModal(false);
    clearCart();
    setPromotionResult(null);
    if (isSalesRole) setShowCheckout(false);
  };

  const handleProceedToCheckout = () => {
    console.log('Proceed button pressed - setting showCheckout to true');
    setShowCheckout(true);
    setShowProductsModal(false);
  };

  const handleClearCartPress = () => {
    setShowClearModal(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !productSearch || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate promotions whenever cart items change
  const calculatePromotions = useCallback(async () => {
    if (items.length === 0) {
      setPromotionResult(null);
      return;
    }

    setLoadingPromotions(true);
    try {
      const cartItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_amount: item.tax_amount,
        subtotal: item.subtotal,
      }));

      const response = await promotionsApi.calculate(cartItems);
      setPromotionResult(response.data);
    } catch (error) {
      console.log('Failed to calculate promotions:', error);
      setPromotionResult(null);
    } finally {
      setLoadingPromotions(false);
    }
  }, [items]);

  useEffect(() => {
    calculatePromotions();
  }, [items, calculatePromotions]);

  // Load products for sales staff when component mounts
  useEffect(() => {
    if (isSalesRole) {
      loadProducts();
    }
  }, [isSalesRole]);

  const openCustomerModal = () => {
    setPhoneSearch('');
    setSearchResult(null);
    setShowAddCustomerForm(false);
    setFormError('');
    resetNewCustomerForm();
    setShowCustomerModal(true);
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
      // Normalize phone to last 9 digits for comparison
      const normalizedInput = getLastNineDigits(phone.replace(/\D/g, ''));
      
      // Pass search as object parameter
      const response = await customersApi.getAll({ search: phone });
      
      // Find match based on last 9 digits
      const exactMatch = response.data.find((c: Customer) => {
        const customerDigits = getLastNineDigits(c.phone?.replace(/\D/g, '') || '');
        return customerDigits === normalizedInput;
      });
      
      if (exactMatch) {
        setSearchResult(exactMatch);
      } else if (response.data.length > 0) {
        // Check if any partial match exists
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

  const handlePhoneSubmit = () => {
    if (!phoneSearch.trim()) {
      setFormError('Please enter a phone number');
      return;
    }
    
    if (!searchResult) {
      // Customer not found, show add form
      setShowAddCustomerForm(true);
    } else {
      // Select the found customer
      setCustomer(searchResult.id, searchResult.name);
      setShowCustomerModal(false);
      setSuccessMessage(`Customer "${searchResult.name}" selected`);
      setShowSuccessModal(true);
    }
  };

  const handleSaveNewCustomer = async () => {
    setFormError('');
    
    // Validation
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
      
      // Set the new customer as selected
      setCustomer(response.data.id, response.data.name);
      setShowCustomerModal(false);
      setSuccessMessage(`New customer "${response.data.name}" added successfully!`);
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

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data);
      openCustomerModal();
    } catch (error) {
      console.log('Failed to load customers:', error);
    }
  };

  const handleSelectCustomer = (customer: Customer | null) => {
    if (customer) {
      setCustomer(customer.id, customer.name);
    } else {
      setCustomer(null, null);
    }
    setShowCustomerModal(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }
    
    // Customer is required for promotions
    if (!customer_id || !customer_name) {
      Alert.alert('Customer Required', 'Please select a customer to continue. This is required for applying promotions.');
      return;
    }
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const processCheckout = async () => {
    setShowConfirmModal(false);
    setProcessing(true);

    try {
      const orderData = {
        customer_id: customer_id,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          tax_amount: item.tax_amount,
          subtotal: item.subtotal,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: total,
          },
        ],
        discount_total: promoDiscount,
        tax_total: tax,
        subtotal: subtotal,
        total: total,
        notes: promotionResult?.applied_promotions?.length 
          ? `Promotions applied: ${promotionResult.applied_promotions.map(p => p.name).join(', ')}`
          : undefined,
      };

      const response = await ordersApi.create(orderData);
      
      clearCart();
      setPromotionResult(null);
      
      const savedAmount = promoDiscount > 0 ? `\nYou saved ${formatCurrency(promoDiscount)}!` : '';
      Alert.alert(
        'Order Complete',
        `Order ${response.data.order_number} has been created successfully!${savedAmount}`,
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/(tabs)/orders'),
          },
          {
            text: 'New Sale',
            onPress: () => router.push('/(tabs)/products'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  const PaymentMethodButton = ({ method, icon, label }: { method: PaymentMethod; icon: string; label: string }) => (
    <TouchableOpacity
      style={[
        styles.paymentButton,
        paymentMethod === method && styles.paymentButtonActive,
      ]}
      onPress={() => setPaymentMethod(method)}
    >
      <Ionicons
        name={icon as any}
        size={24}
        color={paymentMethod === method ? '#2563EB' : '#6B7280'}
      />
      <Text
        style={[
          styles.paymentButtonText,
          paymentMethod === method && styles.paymentButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (items.length === 0 && !showProductsModal) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header with staff name and logout for sales roles */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Add Sale</Text>
            {isSalesRole && user?.name && (
              <Text style={styles.staffName}>👤 {user.name}</Text>
            )}
          </View>
          {isSalesRole && (
            <WebPressable 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            </WebPressable>
          )}
        </View>
        <EmptyState
          icon="cart-outline"
          title="Your Cart is Empty"
          message="Add products to start a new sale"
          actionLabel="Browse Products"
          onAction={() => {
            loadProducts();
            setShowProductsModal(true);
          }}
        />
      </SafeAreaView>
    );
  }

  // Product Grid for Sales Staff - shows when browsing products (not in checkout)
  if ((isSalesRole && !showCheckout) || showProductsModal) {
    // Generate items list for display (up to 4 items)
    const displayItems = items.slice(0, 4);
    const remainingCount = items.length - 4;
    
    const renderProductCard = (product: any) => {
      const isOutOfStock = product.stock_quantity <= 0;
      const cartItem = items.find(i => i.product_id === product.id || i.product_id?.startsWith(`${product.id}_v`));
      const quantityInCart = cartItem?.quantity || 0;
      const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
      
      const handleCardPress = () => {
        console.log('=== CARD PRESSED ===');
        console.log('Product:', product.name, 'hasVariants:', hasVariants, 'isOutOfStock:', isOutOfStock);
        if (!isOutOfStock) {
          handleProductPress(product);
        }
      };
      
      // Use Pressable for both web and mobile with consistent behavior
      return (
        <Pressable
          key={product.id}
          style={({ pressed }) => [
            styles.productCard, 
            isOutOfStock && styles.productCardDisabled,
            pressed && !isOutOfStock && styles.productCardPressed,
            isWeb && { cursor: isOutOfStock ? 'not-allowed' : 'pointer' } as any,
          ]}
          onPress={handleCardPress}
          disabled={isOutOfStock}
          accessibilityRole="button"
          accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}${hasVariants ? ', has variants' : ''}`}
        >
          <View style={styles.productImageContainer} pointerEvents="none">
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
            </View>
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
            {hasVariants && !isOutOfStock && (
              <View style={styles.variantIndicatorBadge}>
                <Ionicons name="layers" size={12} color="#FFFFFF" />
              </View>
            )}
            {quantityInCart > 0 && (
              <View style={styles.cartQuantityBadge}>
                <Text style={styles.cartQuantityText}>{quantityInCart}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productCardInfo} pointerEvents="none">
            <Text style={styles.productCardName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productCardPrice}>{formatCurrency(product.price)}</Text>
            {hasVariants && (
              <Text style={styles.productVariantHint}>Tap to select variant</Text>
            )}
          </View>
          
          {!isOutOfStock && (
            <View style={styles.addToCartBadge} pointerEvents="none">
              <Ionicons name={hasVariants ? "options" : "add"} size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Add Sale</Text>
            {isSalesRole && user?.name && (
              <Text style={styles.staffName}>👤 {user.name}</Text>
            )}
          </View>
          {isSalesRole && (
            <WebPressable 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            </WebPressable>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={productSearch}
            onChangeText={setProductSearch}
            placeholderTextColor="#9CA3AF"
          />
          {productSearch.length > 0 && (
            <TouchableOpacity onPress={() => setProductSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        {loadingProducts ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView 
            style={styles.productsGridContainer}
            contentContainerStyle={[
              styles.productsGrid,
              items.length > 0 && { paddingBottom: 120 }
            ]}
          >
            {filteredProducts.map(renderProductCard)}
            {filteredProducts.length === 0 && (
              <Text style={styles.noProductsText}>No products found</Text>
            )}
          </ScrollView>
        )}

        {/* Floating Cart Summary Bar */}
        {items.length > 0 && (
          <View style={styles.floatingCartBar}>
            <View style={styles.cartBarLeft}>
              <View style={styles.cartItemsPreview}>
                {displayItems.map((item, index) => (
                  <Text key={item.product_id || index} style={styles.cartItemLine}>
                    {item.product_name} <Text style={styles.cartItemQty}>x{item.quantity}</Text>
                  </Text>
                ))}
                {remainingCount > 0 && (
                  <Text style={styles.cartItemMore}>+{remainingCount} more item(s)</Text>
                )}
              </View>
              <Text style={styles.cartBarTotal}>{formatFullCurrency(subtotal)}</Text>
            </View>
            <WebPressable
              style={styles.proceedButton}
              onPress={handleProceedToCheckout}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </WebPressable>
          </View>
        )}

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.logoutModalOverlay}>
            <View style={styles.logoutModalContent}>
              <Ionicons name="log-out-outline" size={48} color="#DC2626" />
              <Text style={styles.logoutModalTitle}>Logout</Text>
              <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>
              <View style={styles.logoutModalButtons}>
                <WebPressable
                  style={[styles.logoutModalButton, styles.logoutCancelButton]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.logoutCancelButtonText}>Cancel</Text>
                </WebPressable>
                <WebPressable
                  style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.logoutConfirmButtonText}>Logout</Text>
                </WebPressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Variant Selection Modal - for product grid view */}
        <Modal
          visible={showVariantModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowVariantModal(false);
            setSelectedProductForVariant(null);
          }}
        >
          <View style={styles.variantModalOverlay}>
            <View style={styles.variantModalContent}>
              <View style={styles.variantModalHeader}>
                <Text style={styles.variantModalTitle}>Select Variant</Text>
                <Pressable 
                  onPress={() => {
                    setShowVariantModal(false);
                    setSelectedProductForVariant(null);
                  }}
                  accessibilityRole="button"
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </Pressable>
              </View>
              
              {selectedProductForVariant && (
                <>
                  <View style={styles.variantProductInfo}>
                    <Text style={styles.variantProductName}>{selectedProductForVariant.name}</Text>
                    <Text style={styles.variantProductPrice}>{formatCurrency(selectedProductForVariant.price)}</Text>
                  </View>
                  
                  <ScrollView style={styles.variantList}>
                    {selectedProductForVariant.variants?.map((variant: any, index: number) => {
                      const variantLabel = Object.values(variant.options).join(' / ');
                      const isAvailable = variant.stock_quantity > 0;
                      return (
                        <Pressable
                          key={index}
                          style={[
                            styles.variantOption,
                            !isAvailable && styles.variantOptionDisabled
                          ]}
                          onPress={() => {
                            console.log('Variant selected:', variantLabel);
                            if (isAvailable) {
                              handleAddVariantToCart(selectedProductForVariant, variant, index);
                            }
                          }}
                          disabled={!isAvailable}
                          accessibilityRole="button"
                        >
                          <View style={styles.variantOptionInfo} pointerEvents="none">
                            <Text style={[
                              styles.variantOptionLabel,
                              !isAvailable && styles.variantOptionLabelDisabled
                            ]}>
                              {variantLabel}
                            </Text>
                            <Text style={[
                              styles.variantOptionStock,
                              !isAvailable && styles.variantOptionStockDisabled
                            ]}>
                              {isAvailable ? `${variant.stock_quantity} in stock` : 'Out of stock'}
                            </Text>
                          </View>
                          {isAvailable && (
                            <View style={styles.variantAddBtn} pointerEvents="none">
                              <Ionicons name="add" size={20} color="#FFFFFF" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Back button for sales staff to return to products */}
        {isSalesRole && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowCheckout(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, isSalesRole && { flex: 1 }]}>Checkout</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCartPress}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.customerSection, !customer_name && styles.customerSectionRequired]}
          onPress={loadCustomers}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color={customer_name ? "#6B7280" : "#DC2626"} />
          <Text style={[styles.customerText, !customer_name && styles.customerTextRequired]}>
            {customer_name || 'Select Customer (Required)'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={customer_name ? "#6B7280" : "#DC2626"} />
        </TouchableOpacity>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          {items.map((item) => (
            <CartItem
              key={item.product_id}
              item={item}
              onUpdateQuantity={(qty) => updateQuantity(item.product_id, qty)}
              onRemove={() => removeItem(item.product_id)}
            />
          ))}
        </View>

        {/* Active Promotions Applied */}
        {promotionResult && promotionResult.applied_promotions.length > 0 && (
          <View style={styles.promotionsSection}>
            <View style={styles.promotionsHeader}>
              <Ionicons name="pricetag" size={18} color="#10B981" />
              <Text style={styles.promotionsTitle}>Promotions Applied</Text>
            </View>
            {promotionResult.applied_promotions.map((promo, index) => (
              <View key={index} style={styles.promotionItem}>
                <View style={styles.promotionInfo}>
                  <Text style={styles.promotionName}>{promo.name}</Text>
                  {promo.discount && promo.discount > 0 && (
                    <Text style={styles.promotionDiscount}>-{formatCurrency(promo.discount)}</Text>
                  )}
                  {promo.free_quantity && promo.free_quantity > 0 && (
                    <Text style={styles.promotionFree}>{promo.free_quantity} FREE</Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            ))}
          </View>
        )}

        {/* Loading promotions indicator */}
        {loadingPromotions && (
          <View style={styles.loadingPromos}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingPromosText}>Checking promotions...</Text>
          </View>
        )}

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            <PaymentMethodButton method="cash" icon="cash-outline" label="Cash" />
            <PaymentMethodButton method="card" icon="card-outline" label="Card" />
            <PaymentMethodButton method="mobile_money" icon="phone-portrait-outline" label="Mobile" />
            <PaymentMethodButton method="credit" icon="time-outline" label="Credit" />
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatFullCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatFullCurrency(tax)}</Text>
            </View>
            
            {/* Promotion Discount */}
            {promoDiscount > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.discountLabelRow}>
                  <Ionicons name="pricetag" size={14} color="#10B981" />
                  <Text style={styles.discountLabel}>Promotion Discount</Text>
                </View>
                <Text style={styles.discountValue}>-{formatFullCurrency(promoDiscount)}</Text>
              </View>
            )}
            
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatFullCurrency(total)}</Text>
            </View>
            
            {/* Savings highlight */}
            {promoDiscount > 0 && (
              <View style={styles.savingsRow}>
                <Ionicons name="sparkles" size={16} color="#10B981" />
                <Text style={styles.savingsText}>You're saving {formatFullCurrency(promoDiscount)}!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Complete Sale - ${formatFullCurrency(total)}`}
          onPress={handleCheckout}
          loading={processing}
          size="large"
        />
      </View>

      {/* Customer Selection Modal with Phone Search */}
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
                          <Text style={styles.saveFormButtonText}>Save Customer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
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

      {/* Confirm Sale Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="cart" size={40} color="#2563EB" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Sale</Text>
            
            <View style={styles.confirmModalDetails}>
              <View style={styles.confirmModalRow}>
                <Text style={styles.confirmModalLabel}>Customer:</Text>
                <Text style={styles.confirmModalValue}>{customer_name}</Text>
              </View>
              <View style={styles.confirmModalRow}>
                <Text style={styles.confirmModalLabel}>Items:</Text>
                <Text style={styles.confirmModalValue}>{items.length} item(s)</Text>
              </View>
              <View style={styles.confirmModalRow}>
                <Text style={styles.confirmModalLabel}>Payment:</Text>
                <Text style={styles.confirmModalValue}>{paymentMethod.replace('_', ' ').toUpperCase()}</Text>
              </View>
              <View style={[styles.confirmModalRow, styles.confirmModalTotalRow]}>
                <Text style={styles.confirmModalTotalLabel}>Total:</Text>
                <Text style={styles.confirmModalTotalValue}>{formatFullCurrency(total)}</Text>
              </View>
            </View>

            <View style={styles.confirmModalButtons}>
              <Pressable
                style={styles.confirmModalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                accessibilityRole="button"
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmModalConfirmBtn}
                onPress={processCheckout}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.confirmModalConfirmText}>Confirm Sale</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Cart Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Ionicons name="trash-outline" size={48} color="#DC2626" />
            <Text style={styles.logoutModalTitle}>Clear Cart</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to clear all items from the cart?</Text>
            <View style={styles.logoutModalButtons}>
              <WebPressable
                style={[styles.logoutModalButton, styles.logoutCancelButton]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.logoutCancelButtonText}>Cancel</Text>
              </WebPressable>
              <WebPressable
                style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                onPress={confirmClearCart}
              >
                <Text style={styles.logoutConfirmButtonText}>Clear</Text>
              </WebPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal
        visible={showVariantModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowVariantModal(false);
          setSelectedProductForVariant(null);
        }}
      >
        <View style={styles.variantModalOverlay}>
          <View style={styles.variantModalContent}>
            <View style={styles.variantModalHeader}>
              <Text style={styles.variantModalTitle}>Select Variant</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowVariantModal(false);
                  setSelectedProductForVariant(null);
                }}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            {selectedProductForVariant && (
              <>
                <View style={styles.variantProductInfo}>
                  <Text style={styles.variantProductName}>{selectedProductForVariant.name}</Text>
                  <Text style={styles.variantProductPrice}>{formatCurrency(selectedProductForVariant.price)}</Text>
                </View>
                
                <ScrollView style={styles.variantList}>
                  {selectedProductForVariant.variants?.map((variant: any, index: number) => {
                    const variantLabel = Object.values(variant.options).join(' / ');
                    const isAvailable = variant.stock_quantity > 0;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.variantOption,
                          !isAvailable && styles.variantOptionDisabled
                        ]}
                        onPress={() => {
                          console.log('Variant selected:', variantLabel);
                          if (isAvailable) {
                            handleAddVariantToCart(selectedProductForVariant, variant, index);
                          }
                        }}
                        disabled={!isAvailable}
                        activeOpacity={0.7}
                      >
                        <View style={styles.variantOptionInfo} pointerEvents="none">
                          <Text style={[
                            styles.variantOptionLabel,
                            !isAvailable && styles.variantOptionLabelDisabled
                          ]}>
                            {variantLabel}
                          </Text>
                          <Text style={[
                            styles.variantOptionStock,
                            !isAvailable && styles.variantOptionStockDisabled
                          ]}>
                            {isAvailable ? `${variant.stock_quantity} in stock` : 'Out of stock'}
                          </Text>
                        </View>
                        {isAvailable && (
                          <View style={styles.variantAddBtn} pointerEvents="none">
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  staffName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Product modal styles for sales staff
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    marginBottom: 12,
    maxHeight: 44,
  },
  categoryFilterContent: {
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  // Product Grid Styles
  productsGridContainer: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 20,
  },
  productCard: {
    width: '48%',
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
    opacity: 0.5,
  },
  productCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  productImageContainer: {
    height: 100,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cartQuantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563EB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartQuantityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productCardInfo: {
    padding: 12,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  addToCartBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 6,
  },
  noProductsText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 40,
    width: '100%',
  },
  // Floating Cart Bar
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 999,
  },
  cartBarLeft: {
    flex: 1,
    marginRight: 12,
  },
  cartItemsPreview: {
    marginBottom: 4,
  },
  cartItemLine: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  cartItemQty: {
    fontWeight: '600',
    color: '#2563EB',
  },
  cartItemMore: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  cartBarTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  proceedButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  logoutCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  logoutConfirmButton: {
    backgroundColor: '#DC2626',
  },
  logoutConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  productRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 6,
  },
  noProducts: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 40,
  },
  cartSummaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartSummaryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewCartButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewCartButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  customerSectionRequired: {
    borderWidth: 2,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  customerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  customerTextRequired: {
    color: '#DC2626',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemsSection: {
    marginBottom: 20,
  },
  promotionsSection: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  promotionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  promotionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  promotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  promotionInfo: {
    flex: 1,
  },
  promotionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#065F46',
  },
  promotionDiscount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  promotionFree: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loadingPromos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  loadingPromosText: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paymentButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  paymentButtonTextActive: {
    color: '#2563EB',
  },
  summarySection: {
    marginBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  discountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountLabel: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
  // Confirm Sale Modal Styles
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
    maxWidth: 360,
    alignItems: 'center',
  },
  confirmModalIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  confirmModalDetails: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  confirmModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  confirmModalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  confirmModalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  confirmModalTotalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  confirmModalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  confirmModalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmModalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Variant indicator on product card
  variantIndicatorBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 4,
  },
  productVariantHint: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Variant Selection Modal
  variantModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  variantModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '70%',
  },
  variantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  variantModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  variantProductInfo: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  variantProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  variantProductPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  variantList: {
    padding: 16,
    maxHeight: 300,
  },
  variantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantOptionDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  variantOptionInfo: {
    flex: 1,
  },
  variantOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  variantOptionLabelDisabled: {
    color: '#9CA3AF',
  },
  variantOptionStock: {
    fontSize: 13,
    color: '#6B7280',
  },
  variantOptionStockDisabled: {
    color: '#DC2626',
  },
  variantAddBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 10,
  },
});
