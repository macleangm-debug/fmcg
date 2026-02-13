import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, addDays } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../src/api/client';
import WebModal from '../../src/components/WebModal';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import ViewToggle from '../../src/components/ViewToggle';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';

const COLORS = {
  primary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  items: QuoteItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until: string;
  notes?: string;
  terms?: string;
  created_at: string;
}

interface QuoteItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  variant?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: 'product' | 'service';
  tax_rate?: number;
  has_variants?: boolean;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' },
  sent: { label: 'Sent', color: '#3B82F6', bg: '#EFF6FF' },
  accepted: { label: 'Accepted', color: '#10B981', bg: '#D1FAE5' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
  expired: { label: 'Expired', color: '#F59E0B', bg: '#FEF3C7' },
  converted: { label: 'Converted', color: '#7C3AED', bg: '#EDE9FE' },
};

// Inline Product Selector Component
const InlineProductSelector = ({
  item,
  index,
  products,
  productSearchQuery,
  setProductSearchQuery,
  onSelectProduct,
  onCreateNew,
  showInlineForm,
  newProductName,
  setNewProductName,
  newProductPrice,
  setNewProductPrice,
  newProductType,
  setNewProductType,
  newProductTaxRate,
  setNewProductTaxRate,
  onCreateProduct,
  savingProduct,
  onCloseForm,
  updateItem,
}: any) => {
  const [localSearch, setLocalSearch] = useState(item.description || '');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const filteredProducts = products.filter((p: Product) => 
    !localSearch || p.name.toLowerCase().includes(localSearch.toLowerCase())
  );
  
  return (
    <View style={styles.inlineSearchContainer}>
      <View style={styles.inlineSearchInput}>
        <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.inlineSearchField}
          placeholder="Search or type product/service..."
          value={localSearch}
          onChangeText={(text) => {
            setLocalSearch(text);
            setShowDropdown(true);
            if (item.description && text !== item.description) {
              updateItem(item.id, 'description', '');
              updateItem(item.id, 'product_id', '');
            }
          }}
          onFocus={() => setShowDropdown(true)}
          placeholderTextColor={COLORS.gray}
        />
        {localSearch && (
          <TouchableOpacity onPress={() => { 
            setLocalSearch(''); 
            updateItem(item.id, 'description', '');
            updateItem(item.id, 'unit_price', 0);
            updateItem(item.id, 'product_id', '');
            setShowDropdown(false);
            onCloseForm();
          }}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Dropdown Results */}
      {showDropdown && localSearch && !item.product_id && !showInlineForm && (
        <View style={styles.inlineDropdown}>
          {filteredProducts.length > 0 ? (
            filteredProducts.slice(0, 5).map((product: Product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.inlineDropdownItem}
                onPress={() => {
                  onSelectProduct(product);
                  setLocalSearch(product.name);
                  setShowDropdown(false);
                }}
              >
                <Ionicons 
                  name={product.type === 'service' ? 'construct' : 'cube'} 
                  size={18} 
                  color={product.type === 'service' ? COLORS.primary : '#3B82F6'} 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inlineDropdownName}>{product.name}</Text>
                  <Text style={styles.inlineDropdownSub}>
                    ${product.price.toFixed(2)} • {product.type === 'service' ? 'Service' : 'Product'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : null}
          
          {/* Create New Option - ONLY show when NO exact match exists in ALL products */}
          {!products.some((p: Product) => p.name.toLowerCase() === localSearch.toLowerCase()) && (
            <TouchableOpacity
              style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
              onPress={() => {
                setNewProductName(localSearch);
                setProductSearchQuery(localSearch);
                onCreateNew();
                setShowDropdown(false);
              }}
            >
              <View style={styles.inlineCreateIcon}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.inlineCreateText}>
                Create "{localSearch}"
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Inline Product Creation Form */}
      {showInlineForm && (
        <View style={styles.inlineCategoryForm}>
          <View style={styles.inlineCategoryHeader}>
            <Text style={styles.inlineCategoryTitle}>Create New Product/Service</Text>
            <TouchableOpacity onPress={onCloseForm}>
              <Ionicons name="close" size={20} color="#166534" />
            </TouchableOpacity>
          </View>
          
          {/* Type Toggle */}
          <View style={styles.inlineTypeToggle}>
            <TouchableOpacity
              style={[styles.inlineTypeBtn, newProductType === 'product' && styles.inlineTypeBtnActive]}
              onPress={() => setNewProductType('product')}
            >
              <Ionicons name="cube" size={16} color={newProductType === 'product' ? '#FFF' : COLORS.gray} />
              <Text style={[styles.inlineTypeText, newProductType === 'product' && styles.inlineTypeTextActive]}>Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineTypeBtn, newProductType === 'service' && styles.inlineTypeBtnActive]}
              onPress={() => setNewProductType('service')}
            >
              <Ionicons name="construct" size={16} color={newProductType === 'service' ? '#FFF' : COLORS.gray} />
              <Text style={[styles.inlineTypeText, newProductType === 'service' && styles.inlineTypeTextActive]}>Service</Text>
            </TouchableOpacity>
          </View>
          
          <Input
            label="Name *"
            placeholder="Product/Service name"
            value={newProductName || localSearch}
            onChangeText={setNewProductName}
          />
          <Input
            label="Price *"
            placeholder="0.00"
            value={newProductPrice}
            onChangeText={setNewProductPrice}
            keyboardType="decimal-pad"
          />
          <View style={styles.inlineCategoryButtons}>
            <TouchableOpacity
              style={styles.inlineCategoryCancelBtn}
              onPress={onCloseForm}
            >
              <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineCategorySaveBtn, savingProduct && styles.inlineCategorySaveBtnDisabled]}
              onPress={() => onCreateProduct(newProductName || localSearch)}
              disabled={savingProduct}
            >
              {savingProduct ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.inlineCategorySaveText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default function QuotesPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWebDesktop = isWeb && width > 768;
  const { quotesView, setQuotesView } = useViewSettingsStore();
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<{ name: string; email?: string; phone?: string; address?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [showInlineProductForm, setShowInlineProductForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [pdfPreviewQuote, setPdfPreviewQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('This quote is valid for the period specified above.');
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }
  ]);
  
  // Inline product creation form
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState<'product' | 'service'>('service');
  const [newProductTaxRate, setNewProductTaxRate] = useState('0');
  const [savingProduct, setSavingProduct] = useState(false);
  
  // Inline client creation form
  const [showInlineClientForm, setShowInlineClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  
  // Search queries
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {}, type: 'success' as 'danger' | 'warning' | 'info' | 'success' });

  // Action menu dropdown
  const [actionMenuQuote, setActionMenuQuote] = useState<Quote | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await api.get('/invoices/quotes');
      setQuotes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      setQuotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/invoices/clients');
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/invoices/products');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  const fetchBusiness = async () => {
    try {
      const response = await api.get('/business');
      setBusiness(response.data || null);
    } catch (error) {
      console.error('Failed to fetch business:', error);
      setBusiness(null);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchClients();
    fetchProducts();
    fetchBusiness();
  }, []);

  const resetForm = () => {
    setSelectedClient(null);
    setClientSearchQuery('');
    setValidDays('30');
    setNotes('');
    setTerms('This quote is valid for the period specified above.');
    setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
    setEditingQuote(null);
    setShowInlineClientForm(false);
    setShowInlineProductForm(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientAddress('');
    setNewProductName('');
    setNewProductPrice('');
    setProductSearchQuery('');
    setSelectedItemIndex(null);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = updated.quantity * updated.unit_price * (1 + updated.tax_rate / 100);
        return updated;
      }
      return item;
    }));
  };

  const selectProductForItem = (product: Product, variant?: ProductVariant) => {
    if (selectedItemIndex !== null) {
      const itemId = items[selectedItemIndex].id;
      const price = variant ? variant.price : product.price;
      const description = variant ? `${product.name} - ${variant.name}` : product.name;
      
      setItems(items.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            product_id: product.id,
            description,
            unit_price: price,
            tax_rate: product.tax_rate || 0,
            variant: variant?.name,
          };
          updated.total = updated.quantity * updated.unit_price * (1 + updated.tax_rate / 100);
          return updated;
        }
        return item;
      }));
    }
    setShowProductPicker(false);
    setShowVariantPicker(false);
    setSelectedProductForVariant(null);
    setSelectedItemIndex(null);
    setProductSearchQuery('');
  };

  const handleCreateInlineProduct = async (fallbackName?: string) => {
    const productName = newProductName.trim() || fallbackName?.trim() || '';
    if (!productName || !newProductPrice.trim()) {
      Alert.alert('Error', 'Please enter product name and price');
      return;
    }
    
    setSavingProduct(true);
    try {
      const response = await api.post('/invoices/products', {
        name: productName,
        price: parseFloat(newProductPrice) || 0,
        type: newProductType,
        tax_rate: 0,
        is_taxable: false,
      });
      
      const newProduct: Product = {
        id: response.data.id,
        name: productName,
        price: parseFloat(newProductPrice) || 0,
        type: newProductType,
        tax_rate: 0,
      };
      
      setProducts([...products, newProduct]);
      selectProductForItem(newProduct);
      
      // Reset form
      setNewProductName('');
      setNewProductPrice('');
      setNewProductType('service');
      setNewProductTaxRate('0');
      setShowInlineProductForm(false);
      
      // Show confirmation modal
      setConfirmModal({
        visible: true,
        title: 'Product Created',
        message: `"${productName}" has been created and added to the quote.`,
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleCreateInlineClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    
    setSavingClient(true);
    try {
      const response = await api.post('/invoices/clients', {
        name: newClientName.trim(),
        email: newClientEmail.trim() || undefined,
        phone: newClientPhone.trim() || undefined,
        address: newClientAddress.trim() || undefined,
      });
      
      const newClient: Client = {
        id: response.data.id,
        name: newClientName.trim(),
        email: newClientEmail.trim(),
        phone: newClientPhone.trim(),
        address: newClientAddress.trim(),
      };
      
      setClients([...clients, newClient]);
      setSelectedClient(newClient);
      setClientSearchQuery(newClient.name);
      
      // Reset form
      const clientName = newClientName.trim();
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');
      setShowInlineClientForm(false);
      
      // Show confirmation modal
      setConfirmModal({
        visible: true,
        title: 'Client Created',
        message: `"${clientName}" has been created and selected.`,
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create client');
    } finally {
      setSavingClient(false);
    }
  };

  const openInlineClientForm = () => {
    // Pre-fill with search query if user typed a name
    setNewClientName(clientSearchQuery);
    setShowClientPicker(false);
    setShowInlineClientForm(true);
  };

  const openInlineProductForm = () => {
    // Pre-fill with search query if user typed a name
    setNewProductName(productSearchQuery);
    setShowProductPicker(false);
    setShowInlineProductForm(true);
  };

  const openProductPicker = (index: number) => {
    setSelectedItemIndex(index);
    setShowProductPicker(true);
  };

  const handleProductSelect = (product: Product) => {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
      setShowProductPicker(false);
      setShowVariantPicker(true);
    } else {
      selectProductForItem(product);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSaveQuote = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    
    // Check for items with no product selected
    const invalidItems = items.filter(item => !item.product_id || !item.description);
    if (invalidItems.length > 0) {
      Alert.alert('Error', 'Please select a product/service for all items');
      return;
    }
    
    // Check for duplicate items
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      Alert.alert('Error', 'Duplicate items detected. Please remove duplicate products/services.');
      return;
    }

    setSaving(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const quoteData = {
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        client_email: selectedClient.email,
        client_phone: selectedClient.phone,
        client_address: selectedClient.address,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          product_id: item.product_id,
          variant: item.variant,
        })),
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        total,
        valid_until: addDays(new Date(), parseInt(validDays) || 30).toISOString(),
        notes,
        terms,
      };

      if (editingQuote) {
        await api.put(`/invoices/quotes/${editingQuote.id}`, quoteData);
        setShowAddModal(false);
        resetForm();
        fetchQuotes();
        setConfirmModal({
          visible: true,
          title: 'Quote Updated',
          message: 'Your quote has been updated successfully.',
          type: 'success',
          onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
        });
      } else {
        const response = await api.post('/invoices/quotes', quoteData);
        setShowAddModal(false);
        resetForm();
        fetchQuotes();
        setConfirmModal({
          visible: true,
          title: 'Quote Created',
          message: `Quote ${response.data.quote_number || ''} has been created successfully. You can now send it to your client or convert it to an invoice.`,
          type: 'success',
          onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToInvoice = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Convert to Invoice',
      message: `Convert quote ${quote.quote_number} to an invoice? This will create a new invoice with the same details.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/quotes/${quote.id}/convert`);
          fetchQuotes();
          setConfirmModal({ 
            visible: true,
            title: 'Invoice Created',
            message: `Quote ${quote.quote_number} has been converted to an invoice successfully.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to convert quote');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleSendQuote = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Send Quote',
      message: `Send quote ${quote.quote_number} to ${quote.client_name}? This will mark the quote as "Sent".`,
      type: 'info',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/quotes/${quote.id}/send`);
          fetchQuotes();
          setConfirmModal({ 
            visible: true,
            title: 'Quote Sent',
            message: `Quote ${quote.quote_number} has been sent to ${quote.client_name}.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to send quote');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleAcceptQuote = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Accept Quote',
      message: `Mark quote ${quote.quote_number} as accepted? You can then convert it to an invoice.`,
      type: 'success',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/quotes/${quote.id}/accept`);
          fetchQuotes();
          setConfirmModal({ 
            visible: true,
            title: 'Quote Accepted',
            message: `Quote ${quote.quote_number} has been marked as accepted. You can now convert it to an invoice.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to accept quote');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleRejectQuote = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Reject Quote',
      message: `Mark quote ${quote.quote_number} as rejected? This action can be undone by editing the quote.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/quotes/${quote.id}/reject`);
          fetchQuotes();
          setConfirmModal({ 
            visible: true,
            title: 'Quote Rejected',
            message: `Quote ${quote.quote_number} has been marked as rejected.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to reject quote');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleEditQuote = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Edit Quote',
      message: `Open quote ${quote.quote_number} for editing?`,
      type: 'info',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, visible: false });
        // Find the client from the clients list
        const client = clients.find(c => c.id === quote.client_id) || {
          id: quote.client_id || '',
          name: quote.client_name,
          email: quote.client_email,
          phone: quote.client_phone,
          address: quote.client_address,
        };
        
        setSelectedClient(client);
        setClientSearchQuery(client.name);
        setItems(quote.items.map(item => ({
          id: item.id || Date.now().toString(),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.total,
          product_id: item.product_id,
          variant: item.variant,
        })));
        setNotes(quote.notes || '');
        setTerms(quote.terms || '');
        setEditingQuote(quote);
        setShowAddModal(true);
      }
    });
  };

  // Generate PDF HTML for quote - Industry Standard Layout
  const generateQuotePDFHtml = (quote: Quote): string => {
    const statusLabel = STATUS_CONFIG[quote.status]?.label || quote.status;
    const issueDate = quote.created_at ? format(new Date(quote.created_at), 'MMM dd, yyyy') : 'N/A';
    const expiryDate = quote.valid_until ? format(new Date(quote.valid_until), 'MMM dd, yyyy') : 'N/A';
    
    // Get business info with fallbacks
    const businessName = business?.name || 'Your Business';
    const businessEmail = business?.email || '';
    const businessPhone = business?.phone || '';
    const businessAddress = business?.address || '';
    
    const itemsHtml = quote.items.map((item, idx) => `
      <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
        <td class="td-desc">${item.description}</td>
        <td class="td-qty">${item.quantity}</td>
        <td class="td-rate">$${item.unit_price.toFixed(2)}</td>
        <td class="td-amount">$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quote_number}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            color: #111827; 
            line-height: 1.5;
            background: #fff;
          }
          .page { padding: 48px; min-height: 100vh; }
          
          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #7C3AED; }
          .brand { }
          .brand-name { font-size: 28px; font-weight: 700; color: #7C3AED; letter-spacing: -0.5px; }
          .brand-tagline { font-size: 12px; color: #6B7280; margin-top: 4px; }
          .quote-badge { text-align: right; }
          .quote-title { font-size: 36px; font-weight: 800; color: #111827; letter-spacing: -1px; }
          .quote-number { font-size: 14px; color: #6B7280; margin-top: 4px; }
          .quote-status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #F3E8FF; color: #7C3AED; }
          
          /* Info Section */
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .info-block { }
          .info-block.right { text-align: right; }
          .info-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .info-value { font-size: 14px; color: #374151; margin-bottom: 4px; }
          .info-value.primary { font-size: 16px; font-weight: 600; color: #111827; }
          
          /* Dates */
          .dates-row { display: flex; gap: 48px; margin-bottom: 40px; padding: 20px 24px; background: #F9FAFB; border-radius: 8px; }
          .date-block { }
          .date-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .date-value { font-size: 15px; font-weight: 600; color: #111827; }
          
          /* Items Table */
          .items-section { margin-bottom: 32px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table thead tr { background: #7C3AED; }
          .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .items-table th { 
            padding: 14px 16px; 
            text-align: left; 
            font-size: 11px; 
            font-weight: 600; 
            color: #FFFFFF; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          .items-table th.th-desc { width: 50%; text-align: left; }
          .items-table th.th-qty { width: 10%; text-align: center; }
          .items-table th.th-rate { width: 20%; text-align: right; padding-right: 20px; }
          .items-table th.th-amount { width: 20%; text-align: right; padding-right: 20px; }
          .items-table tbody tr.alt-row { background: #F9FAFB; }
          .items-table td { padding: 14px 16px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151; vertical-align: middle; }
          .items-table td.td-desc { text-align: left; word-wrap: break-word; }
          .items-table td.td-qty { text-align: center; }
          .items-table td.td-rate { text-align: right; padding-right: 20px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
          .items-table td.td-amount { text-align: right; padding-right: 20px; font-weight: 600; color: #111827; font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
          
          /* Totals */
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
          .totals-box { width: 320px; }
          .total-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #E5E7EB; }
          .total-row:last-child { border-bottom: none; }
          .total-label { font-size: 14px; color: #6B7280; }
          .total-value { font-size: 14px; font-weight: 500; color: #111827; font-family: 'SF Mono', Monaco, 'Courier New', monospace; min-width: 100px; text-align: right; }
          .total-row.grand { padding: 16px 20px; margin-top: 8px; background: #7C3AED; border-radius: 8px; }
          .total-row.grand .total-label { color: #E9D5FF; font-weight: 600; font-size: 15px; }
          .total-row.grand .total-value { color: #FFFFFF; font-weight: 700; font-size: 20px; }
          
          /* Notes */
          .notes-section { margin-bottom: 24px; padding: 20px 24px; background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; }
          .notes-title { font-size: 12px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .notes-text { font-size: 14px; color: #78350F; line-height: 1.6; }
          
          /* Terms */
          .terms-section { padding: 20px 24px; background: #F3F4F6; border-radius: 8px; margin-bottom: 40px; }
          .terms-title { font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .terms-text { font-size: 13px; color: #4B5563; line-height: 1.6; }
          
          /* Footer */
          .footer { text-align: center; padding-top: 32px; border-top: 1px solid #E5E7EB; }
          .footer-thanks { font-size: 18px; font-weight: 600; color: #7C3AED; margin-bottom: 8px; }
          .footer-info { font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="brand">
              <div class="brand-name">${businessName}</div>
              <div class="brand-tagline">Professional Services</div>
            </div>
            <div class="quote-badge">
              <div class="quote-title">QUOTE</div>
              <div class="quote-number"># ${quote.quote_number}</div>
              <div class="quote-status">${statusLabel}</div>
            </div>
          </div>
          
          <!-- From / To Section -->
          <div class="info-section">
            <div class="info-block">
              <div class="info-label">Bill To</div>
              <div class="info-value primary">${quote.client_name}</div>
              ${quote.client_email ? `<div class="info-value">${quote.client_email}</div>` : ''}
              ${quote.client_phone ? `<div class="info-value">${quote.client_phone}</div>` : ''}
              ${quote.client_address ? `<div class="info-value">${quote.client_address}</div>` : ''}
            </div>
            <div class="info-block right">
              <div class="info-label">From</div>
              <div class="info-value primary">${businessName}</div>
              ${businessEmail ? `<div class="info-value">${businessEmail}</div>` : ''}
              ${businessPhone ? `<div class="info-value">${businessPhone}</div>` : ''}
              ${businessAddress ? `<div class="info-value">${businessAddress}</div>` : ''}
            </div>
          </div>
          
          <!-- Dates -->
          <div class="dates-row">
            <div class="date-block">
              <div class="date-label">Issue Date</div>
              <div class="date-value">${issueDate}</div>
            </div>
            <div class="date-block">
              <div class="date-label">Expiry Date</div>
              <div class="date-value">${expiryDate}</div>
            </div>
            <div class="date-block">
              <div class="date-label">Quote Amount</div>
              <div class="date-value">$${(quote.total || 0).toFixed(2)}</div>
            </div>
          </div>
          
          <!-- Items Table -->
          <div class="items-section">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="th-desc">Description</th>
                  <th class="th-qty">Qty</th>
                  <th class="th-rate">Rate</th>
                  <th class="th-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Totals -->
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span class="total-label">Subtotal</span>
                <span class="total-value">$${(quote.subtotal || 0).toFixed(2)}</span>
              </div>
              ${quote.tax_amount > 0 ? `
              <div class="total-row">
                <span class="total-label">Tax</span>
                <span class="total-value">$${(quote.tax_amount || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="total-row grand">
                <span class="total-label">Total Due</span>
                <span class="total-value">$${(quote.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          ${quote.notes ? `
          <!-- Notes -->
          <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-text">${quote.notes}</div>
          </div>
          ` : ''}
          
          ${quote.terms ? `
          <!-- Terms -->
          <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-text">${quote.terms}</div>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-thanks">Thank you for your business!</div>
            <div class="footer-info">This quote is valid until ${expiryDate}. Please contact us if you have any questions.</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadQuote = async (quote: Quote) => {
    try {
      if (Platform.OS === 'web') {
        // For web, show preview modal
        setPdfPreviewQuote(quote);
        return;
      }
      
      // For mobile, generate PDF and share
      const html = generateQuotePDFHtml(quote);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Quote ${quote.quote_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generated', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleDeleteQuote = (quote: Quote) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Quote',
      message: `Are you sure you want to delete quote ${quote.quote_number}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/invoices/quotes/${quote.id}`);
          fetchQuotes();
          setConfirmModal({ 
            visible: true,
            title: 'Quote Deleted',
            message: `Quote ${quote.quote_number} has been deleted.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to delete quote');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleViewQuote = (quote: Quote) => {
    setViewingQuote(quote);
  };


  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchQuery || 
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p => 
    !productSearchQuery || 
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    !clientSearchQuery || 
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const { subtotal, taxAmount, total } = calculateTotals();

  const renderQuoteCard = (quote: Quote) => {
    const config = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
    return (
      <View
        key={quote.id}
        style={[styles.quoteCard, isWebDesktop && styles.quoteCardWeb]}
      >
        <View style={styles.quoteCardHeader}>
          <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        
        <Text style={styles.clientName}>{quote.client_name}</Text>
        <Text style={styles.clientEmail}>{quote.client_email}</Text>
        
        <View style={styles.quoteCardFooter}>
          <Text style={styles.quoteTotal}>${(quote.total || 0).toFixed(2)}</Text>
          <Text style={styles.quoteDate}>Valid: {quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : 'N/A'}</Text>
        </View>
        
        {/* Card Actions - Compact with More Menu */}
        <View style={styles.quoteCardActions}>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleViewQuote(quote)}>
            <Ionicons name="eye-outline" size={16} color={COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#EDE9FE' }]} onPress={() => handleEditQuote(quote)}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setActionMenuQuote(quote)}>
            <Ionicons name="ellipsis-vertical" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={isWeb ? [] : ['top']}>
      {/* Web Header */}
      {isWebDesktop && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Quotes & Estimates</Text>
            <Text style={styles.webPageSubtitle}>{quotes.length} quote(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle currentView={quotesView || 'table'} onToggle={setQuotesView} />
            <TouchableOpacity
              style={styles.webCreateBtn}
              onPress={() => { resetForm(); setShowAddModal(true); }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>New Quote</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header - NO ViewToggle */}
      {!isWebDesktop && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.title}>Quotes</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Status Filter Tabs */}
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[null, 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map((status) => (
            <TouchableOpacity
              key={status || 'all'}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
                {status ? STATUS_CONFIG[status]?.label || status : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isWebDesktop && styles.searchContainerWeb]}>
        <Ionicons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search quotes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      {/* Quotes List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[isWebDesktop && quotesView === 'grid' && styles.webGridList]}
        refreshControl={!isWeb ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuotes(); }} /> : undefined}
      >
        {filteredQuotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Quotes</Text>
            <Text style={styles.emptySubtitle}>Create your first quote to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => { resetForm(); setShowAddModal(true); }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Quote</Text>
            </TouchableOpacity>
          </View>
        ) : isWebDesktop && quotesView !== 'grid' ? (
          // Table View for Web (default)
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Quote #</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Client</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Valid Until</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Actions</Text>
            </View>
            {/* Table Rows */}
            {filteredQuotes.map((quote, index) => {
              const config = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
              return (
                <View key={quote.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>{quote.quote_number}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCell} numberOfLines={1}>{quote.client_name}</Text>
                    <Text style={styles.tableCellSub} numberOfLines={1}>{quote.client_email}</Text>
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <View style={[styles.statusBadge, { backgroundColor: config.bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600', color: COLORS.primary }]}>
                    ${(quote.total || 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>
                    {quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : 'N/A'}
                  </Text>
                  <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleViewQuote(quote)}>
                      <Ionicons name="eye-outline" size={15} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#EDE9FE' }]} onPress={() => handleEditQuote(quote)}>
                      <Ionicons name="pencil" size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setActionMenuQuote(quote)}>
                      <Ionicons name="ellipsis-vertical" size={15} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Card View
          filteredQuotes.map(renderQuoteCard)
        )}
      </ScrollView>

      {/* Action Menu Dropdown - Modern Design */}
      {actionMenuQuote && (
        <Modal visible={!!actionMenuQuote} transparent animationType="fade" onRequestClose={() => setActionMenuQuote(null)}>
          <Pressable style={styles.actionMenuOverlay} onPress={() => setActionMenuQuote(null)}>
            <View style={styles.actionMenuContainer}>
              {/* Header */}
              <View style={styles.actionMenuHeader}>
                <View style={styles.actionMenuHeaderLeft}>
                  <View style={styles.actionMenuIconBadge}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.actionMenuTitle}>{actionMenuQuote.quote_number}</Text>
                    <Text style={styles.actionMenuSubtitle}>{actionMenuQuote.client_name}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.actionMenuCloseBtn} onPress={() => setActionMenuQuote(null)}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {/* Actions List */}
              <View style={styles.actionMenuList}>
                {/* Send Quote - for draft or any quote that hasn't been sent yet */}
                {(!actionMenuQuote.status || actionMenuQuote.status === 'draft') && (
                  <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuQuote(null); handleSendQuote(actionMenuQuote); }}>
                    <View style={[styles.actionMenuItemIcon, { backgroundColor: '#DBEAFE' }]}>
                      <Ionicons name="send" size={16} color="#3B82F6" />
                    </View>
                    <View style={styles.actionMenuItemContent}>
                      <Text style={styles.actionMenuItemTitle}>Send Quote</Text>
                      <Text style={styles.actionMenuItemDesc}>Email to client</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                )}
                
                {actionMenuQuote.status === 'sent' && (
                  <>
                    <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuQuote(null); handleAcceptQuote(actionMenuQuote); }}>
                      <View style={[styles.actionMenuItemIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <Text style={styles.actionMenuItemTitle}>Accept Quote</Text>
                        <Text style={styles.actionMenuItemDesc}>Client accepted this quote</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuQuote(null); handleRejectQuote(actionMenuQuote); }}>
                      <View style={[styles.actionMenuItemIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <Text style={styles.actionMenuItemTitle}>Reject Quote</Text>
                        <Text style={styles.actionMenuItemDesc}>Client declined this quote</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  </>
                )}
                
                {actionMenuQuote.status === 'accepted' && (
                  <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuQuote(null); handleConvertToInvoice(actionMenuQuote); }}>
                    <View style={[styles.actionMenuItemIcon, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="document-text" size={16} color={COLORS.success} />
                    </View>
                    <View style={styles.actionMenuItemContent}>
                      <Text style={styles.actionMenuItemTitle}>Convert to Invoice</Text>
                      <Text style={styles.actionMenuItemDesc}>Create invoice from this quote</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuQuote(null); handleDownloadQuote(actionMenuQuote); }}>
                  <View style={[styles.actionMenuItemIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="download-outline" size={16} color="#6B7280" />
                  </View>
                  <View style={styles.actionMenuItemContent}>
                    <Text style={styles.actionMenuItemTitle}>Download PDF</Text>
                    <Text style={styles.actionMenuItemDesc}>Save or print quote</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              </View>
              
              {/* Delete Section */}
              <View style={styles.actionMenuFooter}>
                <TouchableOpacity style={styles.actionMenuDeleteBtn} onPress={() => { setActionMenuQuote(null); handleDeleteQuote(actionMenuQuote); }}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.actionMenuDeleteText}>Delete Quote</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Add/Edit Quote Modal */}
      <WebModal
        visible={showAddModal}
        onClose={() => { resetForm(); setShowAddModal(false); }}
        title={editingQuote ? 'Edit Quote' : 'New Quote'}
        subtitle="Create a quote for your client"
        icon="document-text-outline"
        iconColor={COLORS.primary}
        maxWidth={600}
      >
        {/* Client Selection - Inline Searchable */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Client *</Text>
          <View style={styles.inlineSearchContainer}>
            <View style={styles.inlineSearchInput}>
              <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineSearchField}
                placeholder="Search or type client name..."
                value={clientSearchQuery}
                onChangeText={(text) => {
                  setClientSearchQuery(text);
                  if (selectedClient && text !== selectedClient.name) {
                    setSelectedClient(null);
                  }
                }}
                placeholderTextColor={COLORS.gray}
              />
              {(clientSearchQuery || selectedClient) && (
                <TouchableOpacity onPress={() => { setClientSearchQuery(''); setSelectedClient(null); setShowInlineClientForm(false); }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Dropdown Results */}
            {clientSearchQuery && !selectedClient && !showInlineClientForm && (
              <View style={styles.inlineDropdown}>
                {filteredClients.length > 0 ? (
                  filteredClients.slice(0, 5).map(client => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.inlineDropdownItem}
                      onPress={() => {
                        setSelectedClient(client);
                        setClientSearchQuery(client.name);
                      }}
                    >
                      <Ionicons name="person" size={18} color={COLORS.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.inlineDropdownName}>{client.name}</Text>
                        <Text style={styles.inlineDropdownSub}>{client.email || 'No email'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : null}
                
                {/* Create New Option - ONLY show when NO exact match exists in ALL clients */}
                {!clients.some(c => c.name.toLowerCase() === clientSearchQuery.toLowerCase()) && (
                  <TouchableOpacity
                    style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
                    onPress={() => {
                      setNewClientName(clientSearchQuery);
                      setShowInlineClientForm(true);
                    }}
                  >
                    <View style={styles.inlineCreateIcon}>
                      <Ionicons name="add" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.inlineCreateText}>
                      Create "{clientSearchQuery}"
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Inline Client Creation Form */}
            {showInlineClientForm && (
              <View style={styles.inlineCategoryForm}>
                <View style={styles.inlineCategoryHeader}>
                  <Text style={styles.inlineCategoryTitle}>Create New Client</Text>
                  <TouchableOpacity onPress={() => setShowInlineClientForm(false)}>
                    <Ionicons name="close" size={20} color="#166534" />
                  </TouchableOpacity>
                </View>
                <Input
                  label="Name *"
                  placeholder="Client name"
                  value={newClientName}
                  onChangeText={setNewClientName}
                />
                <Input
                  label="Email"
                  placeholder="client@example.com"
                  value={newClientEmail}
                  onChangeText={setNewClientEmail}
                  keyboardType="email-address"
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Phone"
                      placeholder="Phone number"
                      value={newClientPhone}
                      onChangeText={setNewClientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Address"
                      placeholder="Address"
                      value={newClientAddress}
                      onChangeText={setNewClientAddress}
                    />
                  </View>
                </View>
                <View style={styles.inlineCategoryButtons}>
                  <TouchableOpacity
                    style={styles.inlineCategoryCancelBtn}
                    onPress={() => setShowInlineClientForm(false)}
                  >
                    <Text style={styles.inlineCategoryCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineCategorySaveBtn, savingClient && styles.inlineCategorySaveBtnDisabled]}
                    onPress={handleCreateInlineClient}
                    disabled={savingClient}
                  >
                    {savingClient ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.inlineCategorySaveText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Line Items with Product Selection - Only show when client is selected */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          {!selectedClient ? (
            <View style={styles.clientRequiredNotice}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.clientRequiredText}>Please select a client first before adding items</Text>
            </View>
          ) : (
            <>
              {items.map((item, index) => (
                <View key={item.id} style={[styles.itemRow, index % 2 === 1 && styles.itemRowAlt]}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemNumber}>Item {index + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Product Selector - Inline Searchable */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Product/Service</Text>
                    <InlineProductSelector
                      item={item}
                      index={index}
                      products={products}
                      productSearchQuery={selectedItemIndex === index ? productSearchQuery : ''}
                      setProductSearchQuery={(q) => { setSelectedItemIndex(index); setProductSearchQuery(q); }}
                      onSelectProduct={(product, variant) => {
                        // Check for duplicates before selecting
                        const variantKey = variant ? `${product.id}-${variant.name}` : product.id;
                        const isDuplicate = items.some((existingItem, idx) => {
                          if (idx === index) return false; // Skip current item
                          if (variant) {
                            return existingItem.product_id === product.id && existingItem.variant === variant.name;
                          }
                          return existingItem.product_id === product.id && !existingItem.variant;
                        });
                        
                        if (isDuplicate) {
                          Alert.alert('Duplicate Item', 'This product/service is already added to the quote. Please select a different item or adjust the quantity of the existing one.');
                          return;
                        }
                        // Set the index before calling selectProductForItem
                        setSelectedItemIndex(index);
                        // Use setTimeout to ensure state is updated before selecting
                        setTimeout(() => {
                          const itemId = items[index].id;
                          const price = variant ? variant.price : product.price;
                          const description = variant ? `${product.name} - ${variant.name}` : product.name;
                          
                          setItems(prevItems => prevItems.map(item => {
                            if (item.id === itemId) {
                              const updated = {
                                ...item,
                                product_id: product.id,
                                description,
                                unit_price: price,
                                tax_rate: product.tax_rate || 0,
                                variant: variant?.name,
                              };
                              updated.total = updated.quantity * updated.unit_price * (1 + updated.tax_rate / 100);
                              return updated;
                            }
                            return item;
                          }));
                          setSelectedItemIndex(null);
                          setProductSearchQuery('');
                        }, 0);
                      }}
                      onCreateNew={() => {
                    setSelectedItemIndex(index);
                    setNewProductName(productSearchQuery);
                    setShowInlineProductForm(true);
                  }}
                  showInlineForm={showInlineProductForm && selectedItemIndex === index}
                  newProductName={newProductName}
                  setNewProductName={setNewProductName}
                  newProductPrice={newProductPrice}
                  setNewProductPrice={setNewProductPrice}
                  newProductType={newProductType}
                  setNewProductType={setNewProductType}
                  newProductTaxRate={newProductTaxRate}
                  setNewProductTaxRate={setNewProductTaxRate}
                  onCreateProduct={handleCreateInlineProduct}
                  savingProduct={savingProduct}
                  onCloseForm={() => setShowInlineProductForm(false)}
                  updateItem={updateItem}
                />
              </View>
              
              <View style={styles.itemFields}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Qty"
                    placeholder="1"
                    value={item.quantity.toString()}
                    onChangeText={(v) => updateItem(item.id, 'quantity', parseFloat(v) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input
                    label="Price"
                    placeholder="0.00"
                    value={item.unit_price > 0 ? item.unit_price.toString() : ''}
                    onChangeText={(v) => updateItem(item.id, 'unit_price', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.priceLabel}>Total</Text>
                  <View style={styles.priceDisplay}>
                    <Text style={[styles.priceValue, { color: COLORS.primary }]}>
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.addItemBtnText}>Add Item</Text>
          </TouchableOpacity>
            </>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>${taxAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <Button
          title={editingQuote ? 'Update Quote' : 'Create Quote'}
          onPress={handleSaveQuote}
          loading={saving}
          style={styles.saveButton}
        />
      </WebModal>

      {/* Client Picker Modal */}
      <Modal visible={showClientPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowClientPicker(false); setClientSearchQuery(''); }}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => { setShowClientPicker(false); setClientSearchQuery(''); }}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            {/* Search */}
            <View style={styles.pickerSearch}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search clients..."
                value={clientSearchQuery}
                onChangeText={setClientSearchQuery}
                placeholderTextColor={COLORS.gray}
              />
            </View>
            
            <ScrollView style={styles.pickerList}>
              {/* Create New Option */}
              <TouchableOpacity
                style={styles.createNewOption}
                onPress={openInlineClientForm}
              >
                <View style={styles.createNewIcon}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.createNewText}>
                  {clientSearchQuery ? `Create "${clientSearchQuery}"` : 'Create New Client'}
                </Text>
              </TouchableOpacity>
              
              {filteredClients.length === 0 && clientSearchQuery ? (
                <View style={styles.emptyPickerState}>
                  <Text style={styles.emptyPickerText}>No clients found for "{clientSearchQuery}"</Text>
                  <Text style={styles.emptyPickerSubtext}>Create a new client above</Text>
                </View>
              ) : (
                filteredClients.map(client => (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.pickerOption, selectedClient?.id === client.id && styles.pickerOptionSelected]}
                    onPress={() => {
                      setSelectedClient(client);
                      setShowClientPicker(false);
                      setClientSearchQuery('');
                    }}
                  >
                    <View style={styles.pickerOptionIcon}>
                      <Ionicons name="person" size={20} color={selectedClient?.id === client.id ? COLORS.primary : COLORS.gray} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionName}>{client.name}</Text>
                      <Text style={styles.pickerOptionEmail}>{client.email || 'No email'}</Text>
                    </View>
                    {selectedClient?.id === client.id && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowProductPicker(false); setProductSearchQuery(''); }}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Product/Service</Text>
              <TouchableOpacity onPress={() => { setShowProductPicker(false); setProductSearchQuery(''); }}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            {/* Search */}
            <View style={styles.pickerSearch}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search products..."
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
                placeholderTextColor={COLORS.gray}
              />
            </View>
            
            <ScrollView style={styles.pickerList}>
              {/* Create New Option */}
              <TouchableOpacity
                style={styles.createNewOption}
                onPress={openInlineProductForm}
              >
                <View style={styles.createNewIcon}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.createNewText}>
                  {productSearchQuery ? `Create "${productSearchQuery}"` : 'Create New Product/Service'}
                </Text>
              </TouchableOpacity>
              
              {filteredProducts.length === 0 && productSearchQuery ? (
                <View style={styles.emptyPickerState}>
                  <Text style={styles.emptyPickerText}>No products found for "{productSearchQuery}"</Text>
                  <Text style={styles.emptyPickerSubtext}>Create a new one above</Text>
                </View>
              ) : (
                filteredProducts.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.pickerOption}
                    onPress={() => handleProductSelect(product)}
                  >
                    <View style={[styles.pickerOptionIcon, { backgroundColor: product.type === 'service' ? '#EDE9FE' : '#DBEAFE' }]}>
                      <Ionicons 
                        name={product.type === 'service' ? 'construct' : 'cube'} 
                        size={20} 
                        color={product.type === 'service' ? COLORS.primary : '#3B82F6'} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionName}>{product.name}</Text>
                      <Text style={styles.pickerOptionEmail}>
                        ${product.price.toFixed(2)} • {product.type === 'service' ? 'Service' : 'Product'}
                        {product.has_variants && ` • ${product.variants?.length} variants`}
                      </Text>
                    </View>
                    {product.has_variants && (
                      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Variant Picker Modal */}
      <Modal visible={showVariantPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowVariantPicker(false); setSelectedProductForVariant(null); }}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => { setShowVariantPicker(false); setShowProductPicker(true); setSelectedProductForVariant(null); }}>
                <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { flex: 1, marginLeft: 12 }]}>
                {selectedProductForVariant?.name} - Select Variant
              </Text>
              <TouchableOpacity onPress={() => { setShowVariantPicker(false); setSelectedProductForVariant(null); }}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.pickerList}>
              {selectedProductForVariant?.variants?.map(variant => (
                <TouchableOpacity
                  key={variant.id}
                  style={styles.pickerOption}
                  onPress={() => selectProductForItem(selectedProductForVariant, variant)}
                >
                  <View style={styles.pickerOptionIcon}>
                    <Ionicons name="pricetag" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerOptionName}>{variant.name}</Text>
                    <Text style={styles.pickerOptionEmail}>${variant.price.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* View Quote Modal */}
      <WebModal
        visible={!!viewingQuote}
        onClose={() => setViewingQuote(null)}
        title={viewingQuote?.quote_number || 'Quote Details'}
        subtitle={`Created for ${viewingQuote?.client_name || ''}`}
        icon="document-text"
        iconColor={COLORS.primary}
        maxWidth={650}
      >
        {viewingQuote && (
          <View>
            {/* Status Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[viewingQuote.status]?.bg || '#F3F4F6' }]}>
                <Text style={[styles.statusText, { color: STATUS_CONFIG[viewingQuote.status]?.color || '#6B7280' }]}>
                  {STATUS_CONFIG[viewingQuote.status]?.label || viewingQuote.status}
                </Text>
              </View>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Valid until: {viewingQuote.valid_until ? format(new Date(viewingQuote.valid_until), 'MMMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            
            {/* Client Details */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Client Details</Text>
              <View style={styles.viewCard}>
                <Text style={styles.viewCardTitle}>{viewingQuote.client_name}</Text>
                {viewingQuote.client_email && <Text style={styles.viewCardSubtitle}>{viewingQuote.client_email}</Text>}
                {viewingQuote.client_phone && <Text style={styles.viewCardSubtitle}>{viewingQuote.client_phone}</Text>}
                {viewingQuote.client_address && <Text style={styles.viewCardSubtitle}>{viewingQuote.client_address}</Text>}
              </View>
            </View>
            
            {/* Items */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Items</Text>
              <View style={styles.viewItemsTable}>
                <View style={styles.viewItemsHeader}>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 3 }]}>Description</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                </View>
                {viewingQuote.items.map((item, idx) => (
                  <View key={idx} style={[styles.viewItemsRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.viewItemsCell, { flex: 3 }]}>{item.description}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right' }]}>${item.unit_price.toFixed(2)}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>${item.total.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Totals */}
            <View style={styles.viewTotalsSection}>
              <View style={styles.viewTotalRow}>
                <Text style={styles.viewTotalLabel}>Subtotal</Text>
                <Text style={styles.viewTotalValue}>${(viewingQuote.subtotal || 0).toFixed(2)}</Text>
              </View>
              {viewingQuote.tax_amount > 0 && (
                <View style={styles.viewTotalRow}>
                  <Text style={styles.viewTotalLabel}>Tax</Text>
                  <Text style={styles.viewTotalValue}>${(viewingQuote.tax_amount || 0).toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.viewTotalRow, styles.viewGrandTotalRow]}>
                <Text style={styles.viewGrandTotalLabel}>Total</Text>
                <Text style={styles.viewGrandTotalValue}>${(viewingQuote.total || 0).toFixed(2)}</Text>
              </View>
            </View>
            
            {/* Notes & Terms */}
            {(viewingQuote.notes || viewingQuote.terms) && (
              <View style={styles.viewSection}>
                {viewingQuote.notes && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.viewSectionTitle}>Notes</Text>
                    <Text style={styles.viewNotesText}>{viewingQuote.notes}</Text>
                  </View>
                )}
                {viewingQuote.terms && (
                  <View>
                    <Text style={styles.viewSectionTitle}>Terms & Conditions</Text>
                    <Text style={styles.viewNotesText}>{viewingQuote.terms}</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Actions */}
            <View style={styles.viewActionsRow}>
              {viewingQuote.status === 'draft' && (
                <TouchableOpacity 
                  style={[styles.viewActionBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => { setViewingQuote(null); handleSendQuote(viewingQuote); }}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Send Quote</Text>
                </TouchableOpacity>
              )}
              {viewingQuote.status === 'accepted' && (
                <TouchableOpacity 
                  style={[styles.viewActionBtn, { backgroundColor: COLORS.success }]}
                  onPress={() => { setViewingQuote(null); handleConvertToInvoice(viewingQuote); }}
                >
                  <Ionicons name="document-text" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Convert to Invoice</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => { setViewingQuote(null); handleEditQuote(viewingQuote); }}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: '#059669' }]}
                onPress={() => { handleDownloadQuote(viewingQuote); }}
              >
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Print / PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>

      {/* PDF Preview Modal - Web Only */}
      {Platform.OS === 'web' && pdfPreviewQuote && (
        <Modal
          visible={!!pdfPreviewQuote}
          transparent
          animationType="fade"
          onRequestClose={() => setPdfPreviewQuote(null)}
        >
          <Pressable 
            style={styles.pdfPreviewOverlay}
            onPress={() => setPdfPreviewQuote(null)}
          >
            <Pressable style={styles.pdfPreviewContainer} onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View style={styles.pdfPreviewHeader}>
                <View>
                  <Text style={styles.pdfPreviewTitle}>Quote Preview</Text>
                  <Text style={styles.pdfPreviewSubtitle}>{pdfPreviewQuote.quote_number}</Text>
                </View>
                <View style={styles.pdfPreviewActions}>
                  <TouchableOpacity 
                    style={styles.pdfPrintBtn}
                    onPress={() => {
                      const html = generateQuotePDFHtml(pdfPreviewQuote);
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => {
                          printWindow.print();
                        }, 500);
                      }
                    }}
                  >
                    <Ionicons name="print" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfPrintBtnText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.pdfCloseBtn}
                    onPress={() => setPdfPreviewQuote(null)}
                  >
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* PDF Preview Card */}
              <View style={styles.pdfPreviewCard}>
                <iframe
                  srcDoc={generateQuotePDFHtml(pdfPreviewQuote)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 8,
                  }}
                  title="Quote Preview"
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="OK"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
        variant={confirmModal.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Headers
  webPageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#F9FAFB' },
  webPageTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  webCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  webCreateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#111827' },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  
  // Filter Tabs
  filterTabs: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterTabActive: { backgroundColor: '#7C3AED' },
  filterTabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  filterTabTextActive: { color: '#FFFFFF' },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchContainerWeb: { marginHorizontal: 24 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827', outlineStyle: 'none' },
  
  // List
  listContainer: { flex: 1, padding: 16 },
  webGridList: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  // Quote Card
  quoteCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  quoteCardWeb: { width: 'calc(33.333% - 12px)', minWidth: 320, maxWidth: 400 },
  quoteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quoteNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  clientEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  quoteCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  quoteTotal: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  quoteDate: { fontSize: 12, color: '#6B7280' },
  quoteCardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cardActionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  quoteActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  actionBtnSuccess: { backgroundColor: '#D1FAE5' },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  
  // View Quote Modal Styles
  viewSection: { marginBottom: 20 },
  viewSectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  viewCard: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  viewCardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  viewCardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  viewItemsTable: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  viewItemsHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16 },
  viewItemsHeaderCell: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  viewItemsRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  viewItemsCell: { fontSize: 14, color: '#374151' },
  viewTotalsSection: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 10, marginBottom: 20 },
  viewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  viewTotalLabel: { fontSize: 14, color: '#6B7280' },
  viewTotalValue: { fontSize: 14, fontWeight: '500', color: '#111827', minWidth: 80, textAlign: 'right' },
  viewGrandTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  viewGrandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  viewGrandTotalValue: { fontSize: 18, fontWeight: '700', color: '#7C3AED', minWidth: 80, textAlign: 'right' },
  viewNotesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  viewActionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  viewActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  viewActionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // PDF Preview Modal Styles
  pdfPreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  pdfPreviewContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 900, height: '90%', maxHeight: 800, overflow: 'hidden' },
  pdfPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pdfPreviewTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  pdfPreviewSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  pdfPreviewActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pdfPrintBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  pdfPrintBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  pdfCloseBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  pdfPreviewCard: { flex: 1, margin: 20, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  
  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  
  // Form
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  clientSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  productSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  selectedClientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  selectedClientEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  selectedProductName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  placeholderText: { fontSize: 15, color: '#9CA3AF' },
  
  // Items Section
  itemsSection: { marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  clientRequiredNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FCD34D' },
  clientRequiredText: { flex: 1, fontSize: 14, color: '#92400E' },
  itemRow: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  itemRowAlt: { backgroundColor: '#F3F4F6' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemNumber: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  itemFields: { flexDirection: 'row', gap: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED', borderStyle: 'dashed' },
  addItemBtnText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },
  priceLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  priceDisplay: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  priceValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  
  // Table View Styles
  tableContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center', gap: 12 },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableCell: { fontSize: 14, color: '#111827' },
  tableCellSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tableActionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  // Totals
  totalsSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  grandTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  
  saveButton: { marginTop: 16 },
  
  // Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModal: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', margin: 12, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 10 },
  pickerSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827' },
  pickerList: { padding: 8 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, marginBottom: 4 },
  pickerOptionSelected: { backgroundColor: '#F3E8FF' },
  pickerOptionIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  pickerOptionName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pickerOptionEmail: { fontSize: 13, color: '#6B7280' },
  
  // Empty picker state
  emptyPickerState: { alignItems: 'center', padding: 24 },
  emptyPickerText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  emptyPickerSubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  
  // Create new option
  createNewOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: '#F3E8FF', marginBottom: 8 },
  createNewIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  createNewText: { fontSize: 15, fontWeight: '600', color: '#7C3AED' },
  
  // Type Toggle
  typeToggleContainer: { flexDirection: 'row', padding: 12, gap: 8 },
  typeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6' },
  typeToggleBtnActive: { backgroundColor: '#7C3AED' },
  typeToggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeToggleTextActive: { color: '#FFFFFF' },
  
  // Inline Search & Create Styles
  inlineSearchContainer: { marginBottom: 8 },
  inlineSearchInput: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  inlineSearchField: { flex: 1, fontSize: 15, color: '#111827', outlineStyle: 'none' },
  inlineDropdown: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DDD6FE', marginTop: 8, overflow: 'hidden' },
  inlineDropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  inlineDropdownName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  inlineDropdownSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  inlineCreateItem: { backgroundColor: '#F3E8FF', borderBottomWidth: 0 },
  inlineCreateIcon: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  inlineCreateText: { fontSize: 14, fontWeight: '600', color: '#7C3AED', marginLeft: 10 },
  // Client inline form - Purple/Violet theme
  inlineCreateForm: { backgroundColor: '#FAF5FF', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 2, borderColor: '#C4B5FD' },
  inlineFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#DDD6FE' },
  inlineFormTitle: { fontSize: 15, fontWeight: '700', color: '#6D28D9' },
  inlineTypeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inlineTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  inlineTypeBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  inlineTypeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  inlineTypeTextActive: { color: '#FFFFFF' },
  inlineCreateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  inlineCreateBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  selectedItemBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#D1FAE5', borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#6EE7B7' },
  selectedItemText: { fontSize: 13, fontWeight: '600', color: '#065F46', marginLeft: 6 },
  selectedItemSub: { fontSize: 12, color: '#10B981' },
  
  // RetailPro-style inline category/client form (Green theme)
  inlineCategoryForm: {
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
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
    backgroundColor: '#7C3AED',
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
  
  // Action Menu Dropdown Styles - Modern Design
  actionMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  actionMenuContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, width: 340, maxWidth: '95%', overflow: 'hidden' },
  actionMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  actionMenuHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actionMenuIconBadge: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  actionMenuTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  actionMenuSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  actionMenuCloseBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  actionMenuList: { padding: 8 },
  actionMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 4 },
  actionMenuItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionMenuItemContent: { flex: 1 },
  actionMenuItemTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  actionMenuItemDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  actionMenuFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  actionMenuDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#FEF2F2' },
  actionMenuDeleteText: { fontSize: 14, fontWeight: '500', color: COLORS.danger },
});
