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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../src/store/cartStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useAuthStore } from '../../src/store/authStore';
import { useOfflineStore } from '../../src/store/offlineStore';
import { ordersApi, customersApi, promotionsApi, productsApi, categoriesApi } from '../../src/api/client';
import CartItem from '../../src/components/CartItem';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import EmptyState from '../../src/components/EmptyState';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import OfflineIndicator from '../../src/components/OfflineIndicator';
import PostPurchaseReferralPopup from '../../src/components/PostPurchaseReferralPopup';
import CustomerSelectionModal from '../../src/components/CustomerSelectionModal';
import { useModal } from '../../src/context/ModalContext';
import { printerService, ReceiptData } from '../../src/services/printerService';
import syncService from '../../src/services/syncService';

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

// Split payment interface
interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

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
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768; // Show side-by-side layout on tablets and desktop
  
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
  const { isOnline, offlineModeEnabled, addPendingTransaction, cachedProducts, cacheProducts } = useOfflineStore();
  const isSalesRole = user?.role === 'sales_staff' || user?.role === 'front_desk';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [splitPaymentMode, setSplitPaymentMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [splitPaymentAmount, setSplitPaymentAmount] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Confirmation modal for completing sale
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Post-purchase referral popup
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  
  // Product browsing modal for sales staff
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  // Inline customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  
  // Phone search and add customer state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Customer | null>(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  
  // New customer form fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
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

  // Barcode scanner state - using global modal context
  const { openBarcodeScanner } = useModal();
  
  // Handle barcode scan - called from global modal
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    
    // First try to find in already loaded products
    let foundProduct = products.find(
      (p: any) => p.barcode === barcode || p.sku === barcode
    );
    
    // Also check variants
    if (!foundProduct) {
      foundProduct = products.find((p: any) => 
        p.variants?.some((v: any) => v.barcode === barcode || v.sku === barcode)
      );
    }
    
    // Check offline cache if not found and offline
    if (!foundProduct && !isOnline && cachedProducts.length > 0) {
      const offlineStore = useOfflineStore.getState();
      foundProduct = offlineStore.getProductByBarcode(barcode) || 
                     offlineStore.getProductBySku(barcode);
    }
    
    if (!foundProduct && isOnline) {
      // If not in loaded products, search via API
      try {
        const response = await productsApi.getAll({ search: barcode });
        foundProduct = response.data.find(
          (p: any) => p.barcode === barcode || p.sku === barcode ||
          p.variants?.some((v: any) => v.barcode === barcode || v.sku === barcode)
        );
      } catch (error) {
        console.log('Error searching for product:', error);
      }
    }
    
    if (foundProduct) {
      handleProductPress(foundProduct);
    } else {
      Alert.alert(
        'Product Not Found',
        `No product found with barcode: ${barcode}`,
        [
          { text: 'Scan Again', onPress: () => openBarcodeScanner(handleBarcodeScan) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  }, [products, openBarcodeScanner, isOnline, cachedProducts]);

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
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setFormError('');
  };

  // Inline customer search function
  const searchCustomers = async (query: string) => {
    if (query.length < 3) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const response = await customersApi.getAll({ search: query });
      setCustomerSearchResults(response.data.slice(0, 5));
    } catch (error) {
      console.log('Customer search error:', error);
      setCustomerSearchResults([]);
    }
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

  // Create and select customer from popup form
  const createAndSelectCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }
    
    try {
      const last9Digits = getLastNineDigits(newCustomerPhone);
      const fullPhone = `${settings.countryCode}${last9Digits}`;
      
      const customerData = {
        name: newCustomerName.trim(),
        phone: fullPhone,
        email: newCustomerEmail.trim() || undefined,
      };
      
      const response = await customersApi.create(customerData);
      
      // Set the new customer as selected
      setCustomer(response.data.id, response.data.name);
      setShowCustomerModal(false);
      setShowAddCustomerForm(false);
      resetNewCustomerForm();
      
      Alert.alert('Success', `Customer "${response.data.name}" created and selected!`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create customer';
      Alert.alert('Error', errorMessage);
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
    
    // Validate split payments cover the total
    if (splitPaymentMode) {
      const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(splitTotal - total) > 0.01) { // Allow small rounding difference
        Alert.alert('Payment Error', `Split payments total (${formatCurrency(splitTotal)}) must equal order total (${formatCurrency(total)})`);
        return;
      }
    }
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const processCheckout = async () => {
    setShowConfirmModal(false);
    setProcessing(true);

    // Build payments array - either split payments or single payment
    const payments = splitPaymentMode && splitPayments.length > 0
      ? splitPayments.map(sp => ({
          method: sp.method,
          amount: sp.amount,
        }))
      : [{
          method: paymentMethod,
          amount: total,
        }];

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
      payments,
      discount_total: promoDiscount,
      tax_total: tax,
      subtotal: subtotal,
      total: total,
      notes: promotionResult?.applied_promotions?.length 
        ? `Promotions applied: ${promotionResult.applied_promotions.map(p => p.name).join(', ')}`
        : undefined,
    };

    try {
      let orderNumber: string;
      let isOfflineOrder = false;
      
      // Check if online or offline
      if (isOnline) {
        // Online - process normally
        const response = await ordersApi.create(orderData);
        orderNumber = response.data.order_number;
      } else if (offlineModeEnabled) {
        // Offline mode - queue for later sync
        isOfflineOrder = true;
        orderNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
        
        // Add to pending transactions
        addPendingTransaction({
          type: 'sale',
          data: {
            ...orderData,
            offline_order_number: orderNumber,
            created_at: new Date().toISOString(),
          },
        });
      } else {
        throw new Error('You are offline. Please check your internet connection.');
      }
      
      // Print receipt if printer is configured
      try {
        const printerConfig = printerService.getConfig();
        if (printerConfig?.enabled) {
          const now = new Date();
          const receiptData: ReceiptData = {
            businessName: settings.businessName || 'Retail Pro',
            businessAddress: settings.address,
            businessPhone: settings.phone,
            taxId: settings.taxId,
            receiptNumber: orderNumber,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            cashier: user?.name || 'Staff',
            items: items.map(item => ({
              name: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.subtotal,
              discount: item.discount,
            })),
            subtotal: subtotal,
            taxTotal: tax,
            discount: promoDiscount,
            grandTotal: total,
            paymentMethod: paymentMethod,
            amountPaid: total,
            change: 0,
            customerName: customer_name || undefined,
          };
          
          await printerService.printReceipt(receiptData, settings.currency || 'KES');
        }
      } catch (printError) {
        console.log('Receipt printing failed:', printError);
        // Don't fail the order if printing fails
      }
      
      clearCart();
      setPromotionResult(null);
      
      // Store the order total for the referral popup
      setLastOrderTotal(total);
      
      const savedAmount = promoDiscount > 0 ? `\nYou saved ${formatCurrency(promoDiscount)}!` : '';
      const offlineNote = isOfflineOrder ? '\n\n(Saved offline - will sync when connected)' : '';
      
      Alert.alert(
        'Order Complete',
        `Order ${orderNumber} has been created successfully!${savedAmount}${offlineNote}`,
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/(tabs)/orders'),
          },
          {
            text: 'Share & Earn',
            onPress: () => setShowReferralPopup(true),
            style: 'default',
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || error.response?.data?.detail || 'Failed to create order');
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
        
        {/* Customer Selection Required - Empty Cart View */}
        <View style={styles.customerFirstContainer}>
          <View style={styles.customerFirstIcon}>
            <View style={styles.customerFirstIconInner}>
              <Ionicons name="person" size={40} color="#2563EB" />
              <View style={styles.customerFirstIconBadge}>
                <Ionicons name="add" size={12} color="#2563EB" />
              </View>
            </View>
          </View>
          <Text style={styles.customerFirstTitle}>Select a Customer First</Text>
          <Text style={styles.customerFirstSubtitle}>
            Choose or add a customer to start the sale
          </Text>
          
          {/* Customer Selection Button - Clean Style */}
          <TouchableOpacity
            style={styles.customerFirstButton}
            onPress={() => {
              setShowCustomerModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.customerFirstBtnIcon}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
              <View style={styles.customerFirstBtnBadge}>
                <Ionicons name="add" size={8} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.customerFirstButtonText}>Select Customer</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Selection Modal - Reusable Component */}
        <CustomerSelectionModal
          visible={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          countryCode={settings.countryCode}
          onSelectCustomer={(customer) => {
            setCustomer(customer.id, customer.name);
            // Auto-navigate to products list after customer selection
            loadProducts();
            setShowProductsModal(true);
          }}
          searchCustomer={async (phone) => {
            try {
              const response = await customersApi.search(phone);
              if (response.data && response.data.length > 0) {
                const c = response.data[0];
                return {
                  id: c.id,
                  name: c.name,
                  phone: c.phone,
                  email: c.email,
                  total_orders: c.total_orders,
                  total_purchases: c.total_purchases,
                };
              }
              return null;
            } catch (error) {
              console.error('Customer search error:', error);
              return null;
            }
          }}
          onCreateCustomer={async (customerData) => {
            const response = await customersApi.create({
              name: customerData.name,
              phone: customerData.phone,
            });
            return {
              id: response.data.id,
              name: response.data.name,
              phone: response.data.phone,
            };
          }}
        />

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          visible={showLogoutModal}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmLabel="Logout"
          cancelLabel="Cancel"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
          variant="danger"
          icon="log-out-outline"
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
        {/* Top Proceed Bar - Shows when items in cart (Mobile Only) */}
        {items.length > 0 && !isWideScreen && (
          <Pressable 
            style={({ pressed }) => [
              styles.topProceedBar,
              pressed && styles.topProceedBarPressed,
              isWeb && { cursor: 'pointer' } as any
            ]}
            onPress={() => {
              console.log('Checkout pressed - navigating to checkout');
              setShowProductsModal(false); // Close products modal when going to checkout
              setShowCheckout(true);
            }}
          >
            <View style={styles.topProceedLeft}>
              <View style={styles.topProceedBadge}>
                <Text style={styles.topProceedBadgeText}>{items.reduce((sum, i) => sum + i.quantity, 0)}</Text>
              </View>
              <Text style={styles.topProceedItemText} numberOfLines={1}>
                {items.length <= 2 
                  ? items.map(i => `${i.product_name} x${i.quantity}`).join(', ')
                  : `${items[0].product_name} x${items[0].quantity} +${items.length - 1} more`
                }
              </Text>
            </View>
            <Text style={styles.topProceedTotal}>{formatCurrency(subtotal)}</Text>
            <View style={styles.topProceedButton}>
              <Text style={styles.topProceedButtonText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        )}

        {/* Header with Logout */}
        <View style={styles.header}>
          <Text style={styles.title}>New Sale</Text>
          {isSalesRole && (
            <WebPressable 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            </WebPressable>
          )}
        </View>

        {/* Customer Selection Card - Below New Sale */}
        <TouchableOpacity 
          style={[
            styles.customerCard,
            customer_name && styles.customerCardSelected,
          ]}
          onPress={() => {
            console.log('Customer card pressed - opening modal');
            setShowCustomerModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.customerCardIcon, customer_name && styles.customerCardIconSelected]}>
            <Ionicons name="person" size={20} color={customer_name ? "#FFFFFF" : "#6B7280"} />
          </View>
          <View style={styles.customerCardInfo}>
            <Text style={styles.customerCardLabel}>Customer</Text>
            <Text style={[styles.customerCardValue, customer_name && styles.customerCardValueSelected]}>
              {customer_name || 'Tap to select customer'}
            </Text>
          </View>
          {customer_name ? (
            <TouchableOpacity 
              onPress={(e) => { 
                e.stopPropagation(); 
                setCustomer(null, null); 
              }}
              style={styles.customerCardClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={22} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>

        {/* Search Bar with Barcode Scanner */}
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
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => openBarcodeScanner(handleBarcodeScan)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="barcode-outline" size={22} color="#F59E0B" />
          </TouchableOpacity>
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

        {/* Main Content Area - Responsive Layout */}
        <View style={[styles.mainContentArea, isWideScreen && styles.mainContentAreaWide]}>
          {/* Products Grid */}
          {loadingProducts ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40, flex: 1 }} />
          ) : (
            <ScrollView 
              style={[styles.productsGridContainer, isWideScreen && styles.productsGridContainerWide]}
              contentContainerStyle={[
                styles.productsGrid,
                !isWideScreen && items.length > 0 && { paddingBottom: 20 }
              ]}
            >
              {filteredProducts.map(renderProductCard)}
              {filteredProducts.length === 0 && (
                <Text style={styles.noProductsText}>No products found</Text>
              )}
            </ScrollView>
          )}

          {/* Desktop/Tablet: Side Cart Panel */}
          {isWideScreen && items.length > 0 && (
            <View style={styles.sideCartPanel}>
              <View style={styles.sideCartHeader}>
                <Text style={styles.sideCartTitle}>Cart ({items.reduce((sum, i) => sum + i.quantity, 0)} items)</Text>
                <TouchableOpacity onPress={handleClearCartPress}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.sideCartItems} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.product_id} style={styles.sideCartItem}>
                    <View style={styles.sideCartItemInfo}>
                      <Text style={styles.sideCartItemName} numberOfLines={2}>{item.product_name}</Text>
                      <Text style={styles.sideCartItemPrice}>{formatCurrency(item.unit_price)}</Text>
                    </View>
                    <View style={styles.sideCartItemQty}>
                      <TouchableOpacity 
                        style={styles.sideCartQtyBtn}
                        onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color="#374151" />
                      </TouchableOpacity>
                      <Text style={styles.sideCartQtyText}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.sideCartQtyBtn}
                        onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color="#374151" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sideCartItemTotal}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                ))}
              </ScrollView>
              
              {/* Promotions in side cart */}
              {promotionResult && promotionResult.applied_promotions.length > 0 && (
                <View style={styles.sideCartPromos}>
                  {promotionResult.applied_promotions.map((promo, idx) => (
                    <View key={idx} style={styles.sideCartPromoItem}>
                      <Ionicons name="pricetag" size={12} color="#10B981" />
                      <Text style={styles.sideCartPromoText}>{promo.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.sideCartSummary}>
                <View style={styles.sideCartRow}>
                  <Text style={styles.sideCartLabel}>Subtotal</Text>
                  <Text style={styles.sideCartValue}>{formatCurrency(subtotal)}</Text>
                </View>
                {tax > 0 && (
                  <View style={styles.sideCartRow}>
                    <Text style={styles.sideCartLabel}>Tax</Text>
                    <Text style={styles.sideCartValue}>{formatCurrency(tax)}</Text>
                  </View>
                )}
                {promoDiscount > 0 && (
                  <View style={styles.sideCartRow}>
                    <Text style={[styles.sideCartLabel, { color: '#10B981' }]}>Discount</Text>
                    <Text style={[styles.sideCartValue, { color: '#10B981' }]}>-{formatCurrency(promoDiscount)}</Text>
                  </View>
                )}
                <View style={styles.sideCartDivider} />
                <View style={styles.sideCartRow}>
                  <Text style={styles.sideCartTotalLabel}>Total</Text>
                  <Text style={styles.sideCartTotalValue}>{formatCurrency(total)}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.sideCartCheckoutBtn}
                onPress={() => {
                  setShowProductsModal(false);
                  setShowCheckout(true);
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                <Text style={styles.sideCartCheckoutText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          visible={showLogoutModal}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmLabel="Logout"
          cancelLabel="Cancel"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
          variant="danger"
          icon="log-out-outline"
        />

        {/* Customer Selection Modal - Popup Style (Also in product grid view) */}
        {showCustomerModal && (
          <View style={styles.modalOverlayAbsolute}>
            <TouchableOpacity style={styles.popupBackdrop} onPress={() => setShowCustomerModal(false)} activeOpacity={1} />
            <View style={styles.popupContent}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>
                  {showAddCustomerForm ? 'Add Customer' : 'Select Customer'}
                </Text>
                <TouchableOpacity onPress={() => { setShowCustomerModal(false); setShowAddCustomerForm(false); resetNewCustomerForm(); }}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {!showAddCustomerForm ? (
                <>
                  {/* Phone Search */}
                  <View style={styles.popupSearchRow}>
                    <View style={styles.popupCountryCode}>
                      <Text style={styles.popupCountryCodeText}>{settings.countryCode}</Text>
                    </View>
                    <TextInput
                      style={styles.popupSearchInput}
                      placeholder="Enter phone number"
                      value={phoneSearch}
                      onChangeText={searchByPhone}
                      keyboardType="phone-pad"
                      autoFocus
                      placeholderTextColor="#9CA3AF"
                    />
                    {searching && <ActivityIndicator size="small" color="#3B82F6" />}
                  </View>
                  
                  {/* Search Result */}
                  {searchResult && (
                    <TouchableOpacity
                      style={styles.popupResultItem}
                      onPress={() => {
                        setCustomer(searchResult.id, searchResult.name);
                        setShowCustomerModal(false);
                        setPhoneSearch('');
                        setSearchResult(null);
                      }}
                    >
                      <View style={styles.popupResultIcon}>
                        <Ionicons name="person" size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.popupResultInfo}>
                        <Text style={styles.popupResultName}>{searchResult.name}</Text>
                        <Text style={styles.popupResultPhone}>{searchResult.phone}</Text>
                      </View>
                      <View style={styles.popupSelectBtn}>
                        <Text style={styles.popupSelectBtnText}>Select</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* No Result - Add New */}
                  {phoneSearch.length >= 3 && !searchResult && !searching && (
                    <View style={styles.popupNoResult}>
                      <Text style={styles.popupNoResultText}>No customer found</Text>
                      <TouchableOpacity
                        style={styles.popupAddBtn}
                        onPress={() => setShowAddCustomerForm(true)}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.popupAddBtnText}>Add New Customer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                /* Add Customer Form */
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.popupFormField}>
                      <Text style={styles.popupFormLabel}>Name *</Text>
                      <TextInput
                        style={styles.popupFormInput}
                        placeholder="Customer name"
                        value={newCustomerName}
                        onChangeText={setNewCustomerName}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.popupFormField}>
                      <Text style={styles.popupFormLabel}>Phone *</Text>
                      <View style={styles.popupSearchRow}>
                        <View style={styles.popupCountryCode}>
                          <Text style={styles.popupCountryCodeText}>{settings.countryCode}</Text>
                        </View>
                        <TextInput
                          style={[styles.popupFormInput, { flex: 1 }]}
                          placeholder="Phone number"
                          value={newCustomerPhone}
                          onChangeText={setNewCustomerPhone}
                          keyboardType="phone-pad"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                    <View style={styles.popupFormField}>
                      <Text style={styles.popupFormLabel}>Email</Text>
                      <TextInput
                        style={styles.popupFormInput}
                        placeholder="Email (optional)"
                        value={newCustomerEmail}
                        onChangeText={setNewCustomerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.popupFormActions}>
                      <TouchableOpacity
                        style={styles.popupCancelBtn}
                        onPress={() => { setShowAddCustomerForm(false); resetNewCustomerForm(); }}
                      >
                        <Text style={styles.popupCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.popupSaveBtn, (!newCustomerName || !newCustomerPhone) && styles.popupSaveBtnDisabled]}
                        onPress={createAndSelectCustomer}
                        disabled={!newCustomerName || !newCustomerPhone}
                      >
                        <Text style={styles.popupSaveBtnText}>Save & Select</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </KeyboardAvoidingView>
              )}
            </View>
          </View>
        )}

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
          <View style={styles.paymentHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity 
              style={styles.splitToggle}
              onPress={() => {
                setSplitPaymentMode(!splitPaymentMode);
                if (!splitPaymentMode) {
                  setSplitPayments([]);
                  setSplitPaymentAmount('');
                }
              }}
            >
              <Ionicons 
                name={splitPaymentMode ? "checkbox" : "square-outline"} 
                size={20} 
                color={splitPaymentMode ? "#2563EB" : "#6B7280"} 
              />
              <Text style={[styles.splitToggleText, splitPaymentMode && styles.splitToggleTextActive]}>
                Split Payment
              </Text>
            </TouchableOpacity>
          </View>
          
          {!splitPaymentMode ? (
            <View style={styles.paymentGrid}>
              <PaymentMethodButton method="cash" icon="cash-outline" label="Cash" />
              <PaymentMethodButton method="card" icon="card-outline" label="Card" />
              <PaymentMethodButton method="mobile_money" icon="phone-portrait-outline" label="Mobile" />
              <PaymentMethodButton method="credit" icon="time-outline" label="Credit" />
            </View>
          ) : (
            <View style={styles.splitPaymentContainer}>
              {/* Show remaining amount prominently */}
              <View style={styles.splitRemainingBanner}>
                <Text style={styles.splitRemainingLabel}>Remaining to pay:</Text>
                <Text style={styles.splitRemainingAmount}>
                  {formatCurrency(Math.max(0, total - splitPayments.reduce((sum, p) => sum + p.amount, 0)))}
                </Text>
              </View>
              
              {/* Added Payments */}
              {splitPayments.length > 0 && (
                <View style={styles.splitPaymentsList}>
                  {splitPayments.map((payment, index) => (
                    <View key={index} style={styles.splitPaymentItem}>
                      <Ionicons 
                        name={payment.method === 'cash' ? 'cash-outline' : 
                              payment.method === 'card' ? 'card-outline' :
                              payment.method === 'mobile_money' ? 'phone-portrait-outline' : 'time-outline'} 
                        size={16} 
                        color="#374151" 
                      />
                      <Text style={styles.splitPaymentMethod}>
                        {payment.method === 'mobile_money' ? 'Mobile' : payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                      </Text>
                      <Text style={styles.splitPaymentAmount}>{formatCurrency(payment.amount)}</Text>
                      <TouchableOpacity onPress={() => setSplitPayments(splitPayments.filter((_, i) => i !== index))}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Quick Add Buttons - One tap to add full remaining amount */}
              <View style={styles.splitQuickActions}>
                {(['cash', 'card', 'mobile_money'] as PaymentMethod[]).map((method) => {
                  const remaining = total - splitPayments.reduce((sum, p) => sum + p.amount, 0);
                  if (remaining <= 0) return null;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={styles.splitQuickBtn}
                      onPress={() => {
                        setSplitPayments([...splitPayments, { method, amount: remaining }]);
                      }}
                    >
                      <Ionicons 
                        name={method === 'cash' ? 'cash-outline' : method === 'card' ? 'card-outline' : 'phone-portrait-outline'} 
                        size={18} 
                        color="#3B82F6" 
                      />
                      <Text style={styles.splitQuickBtnText}>
                        {method === 'mobile_money' ? 'Mobile' : method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Custom Amount Input */}
              <View style={styles.splitCustomRow}>
                <TextInput
                  style={styles.splitCustomInput}
                  value={splitPaymentAmount}
                  onChangeText={setSplitPaymentAmount}
                  placeholder="Custom amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.splitCustomBtn, { backgroundColor: paymentMethod === 'cash' ? '#10B981' : paymentMethod === 'card' ? '#3B82F6' : '#F59E0B' }]}
                  onPress={() => {
                    const amount = parseFloat(splitPaymentAmount);
                    const remaining = total - splitPayments.reduce((sum, p) => sum + p.amount, 0);
                    if (amount > 0 && amount <= remaining) {
                      setSplitPayments([...splitPayments, { method: paymentMethod, amount }]);
                      setSplitPaymentAmount('');
                    }
                  }}
                >
                  <Text style={styles.splitCustomBtnText}>Add {paymentMethod === 'mobile_money' ? 'Mobile' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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

      {/* Customer Selection Modal - Popup Style */}
      <Modal
        visible={showCustomerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={styles.popupBackdrop} onPress={() => setShowCustomerModal(false)} activeOpacity={1} />
          <View style={styles.popupContent}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>
                {showAddCustomerForm ? 'Add Customer' : 'Select Customer'}
              </Text>
              <TouchableOpacity onPress={() => { setShowCustomerModal(false); setShowAddCustomerForm(false); resetNewCustomerForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {!showAddCustomerForm ? (
              <>
                {/* Phone Search */}
                <View style={styles.popupSearchRow}>
                  <View style={styles.popupCountryCode}>
                    <Text style={styles.popupCountryCodeText}>{settings.countryCode}</Text>
                  </View>
                  <TextInput
                    style={styles.popupSearchInput}
                    placeholder="Enter phone number"
                    value={phoneSearch}
                    onChangeText={searchByPhone}
                    keyboardType="phone-pad"
                    autoFocus
                    placeholderTextColor="#9CA3AF"
                  />
                  {searching && <ActivityIndicator size="small" color="#3B82F6" />}
                </View>
                
                {/* Search Result */}
                {searchResult && (
                  <TouchableOpacity
                    style={styles.popupResultItem}
                    onPress={() => {
                      setCustomer(searchResult.id, searchResult.name);
                      setShowCustomerModal(false);
                      setPhoneSearch('');
                      setSearchResult(null);
                    }}
                  >
                    <View style={styles.popupResultIcon}>
                      <Ionicons name="person" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.popupResultInfo}>
                      <Text style={styles.popupResultName}>{searchResult.name}</Text>
                      <Text style={styles.popupResultPhone}>{searchResult.phone}</Text>
                    </View>
                    <View style={styles.popupSelectBtn}>
                      <Text style={styles.popupSelectBtnText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {/* No Result - Add New */}
                {phoneSearch.length >= 3 && !searchResult && !searching && (
                  <View style={styles.popupNoResult}>
                    <Text style={styles.popupNoResultText}>No customer found</Text>
                    <TouchableOpacity
                      style={styles.popupAddBtn}
                      onPress={() => setShowAddCustomerForm(true)}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text style={styles.popupAddBtnText}>Add "{settings.countryCode} {phoneSearch}"</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              /* Add Customer Form */
              <View style={styles.popupForm}>
                <View style={styles.popupFormPhone}>
                  <Ionicons name="call" size={16} color="#3B82F6" />
                  <Text style={styles.popupFormPhoneText}>{settings.countryCode} {phoneSearch}</Text>
                </View>
                
                {formError && (
                  <Text style={styles.popupFormError}>{formError}</Text>
                )}
                
                <TextInput
                  style={styles.popupFormInput}
                  placeholder="Customer name *"
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholderTextColor="#9CA3AF"
                />
                
                <TextInput
                  style={styles.popupFormInput}
                  placeholder="Email (optional)"
                  value={newCustomerEmail}
                  onChangeText={setNewCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
                
                <View style={styles.popupFormActions}>
                  <TouchableOpacity
                    style={styles.popupCancelBtn}
                    onPress={() => { setShowAddCustomerForm(false); resetNewCustomerForm(); }}
                  >
                    <Text style={styles.popupCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.popupSaveBtn}
                    onPress={handleSaveNewCustomer}
                    disabled={savingCustomer}
                  >
                    {savingCustomer ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.popupSaveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
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
      <ConfirmationModal
        visible={showClearModal}
        title="Clear Cart"
        message="Are you sure you want to clear all items from the cart?"
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onConfirm={confirmClearCart}
        onCancel={() => setShowClearModal(false)}
        variant="danger"
        icon="trash-outline"
      />

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
      
      {/* Post-Purchase Referral Popup */}
      <PostPurchaseReferralPopup
        visible={showReferralPopup}
        onClose={() => setShowReferralPopup(false)}
        orderTotal={lastOrderTotal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Top Proceed Bar - Clickable bar
  topProceedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  topProceedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  topProceedBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  topProceedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  topProceedItemText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  topProceedTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topProceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  topProceedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topProceedBarPressed: {
    opacity: 0.9,
  },
  // Customer Card - Below New Sale heading
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  customerCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  customerCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  customerCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerCardIconSelected: {
    backgroundColor: '#10B981',
  },
  customerCardInfo: {
    flex: 1,
  },
  customerCardLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  customerCardValue: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  customerCardValueSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  customerCardClear: {
    padding: 4,
  },
  // Customer First Flow Styles
  customerFirstContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  customerFirstIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  customerFirstTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  customerFirstSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  customerFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    minWidth: 220,
    justifyContent: 'center',
  },
  customerFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerFirstBrowseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    gap: 10,
    marginBottom: 12,
    minWidth: 220,
    justifyContent: 'center',
  },
  customerFirstBrowseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  customerFirstScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  customerFirstScanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  // Customer Select Button (Old - kept for backwards compat)
  customerSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    maxWidth: 180,
  },
  customerSelectText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  customerSelectTextActive: {
    color: '#10B981',
    fontWeight: '500',
  },
  // Customer Popup Modal Styles
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  popupBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  popupContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  popupSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
  },
  popupCountryCode: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  popupCountryCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  popupSearchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  popupResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  popupResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupResultInfo: {
    flex: 1,
  },
  popupResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  popupResultPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  popupSelectBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  popupSelectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  popupNoResult: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  popupNoResultText: {
    fontSize: 14,
    color: '#6B7280',
  },
  popupAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  popupAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  popupForm: {
    gap: 12,
  },
  popupFormPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  popupFormPhoneText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  popupFormError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 4,
  },
  popupFormInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  popupFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  popupCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  popupCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  popupSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  popupSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  scanButton: {
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    marginLeft: 4,
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
  productsGridContainerWide: {
    flex: 0.65, // 65% width for products on wide screens
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 20,
  },
  // Main content area for responsive layout
  mainContentArea: {
    flex: 1,
  },
  mainContentAreaWide: {
    flexDirection: 'row',
  },
  // Side Cart Panel (Desktop/Tablet)
  sideCartPanel: {
    width: '35%',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    padding: 16,
  },
  sideCartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sideCartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sideCartItems: {
    flex: 1,
    marginBottom: 12,
  },
  sideCartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    gap: 10,
  },
  sideCartItemInfo: {
    flex: 1,
  },
  sideCartItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  sideCartItemPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  sideCartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  sideCartQtyBtn: {
    padding: 6,
  },
  sideCartQtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    minWidth: 20,
    textAlign: 'center',
  },
  sideCartItemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    minWidth: 70,
    textAlign: 'right',
  },
  sideCartPromos: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  sideCartPromoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sideCartPromoText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  sideCartSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sideCartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sideCartLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  sideCartValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  sideCartDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  sideCartTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sideCartTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#059669',
  },
  sideCartCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  sideCartCheckoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productCard: {
    width: '23%',  // 4 products per row on web
    minWidth: 140,
    maxWidth: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  productImageContainer: {
    height: 80,
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
  // Split Payment Styles - Simplified
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  splitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitToggleText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  splitToggleTextActive: {
    color: '#2563EB',
  },
  splitPaymentContainer: {
    gap: 12,
  },
  splitRemainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  splitRemainingLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  splitRemainingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  splitPaymentsList: {
    gap: 6,
  },
  splitPaymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  splitPaymentMethod: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  splitPaymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  splitQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  splitQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  splitQuickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  splitCustomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCustomInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  splitCustomBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCustomBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
