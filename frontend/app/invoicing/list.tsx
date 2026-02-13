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
import { useRouter, useLocalSearchParams } from 'expo-router';
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

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  invoice_date: string;
  due_date: string;
  notes?: string;
  terms?: string;
  created_at: string;
}

interface InvoiceItem {
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
  sent: { label: 'Sent', color: '#3B82F6', bg: '#DBEAFE' },
  paid: { label: 'Paid', color: '#10B981', bg: '#D1FAE5' },
  partial: { label: 'Partial', color: '#8B5CF6', bg: '#EDE9FE' },
  overdue: { label: 'Overdue', color: '#EF4444', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#E5E7EB' },
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
  onCloseForm,
  onCreateProduct,
  newProductName,
  setNewProductName,
  newProductPrice,
  setNewProductPrice,
  newProductType,
  setNewProductType,
  savingProduct,
}: {
  item: InvoiceItem;
  index: number;
  products: Product[];
  productSearchQuery: string;
  setProductSearchQuery: (q: string) => void;
  onSelectProduct: (product: Product, variant?: ProductVariant) => void;
  onCreateNew: () => void;
  showInlineForm: boolean;
  onCloseForm: () => void;
  onCreateProduct: (fallbackName?: string) => void;
  newProductName: string;
  setNewProductName: (n: string) => void;
  newProductPrice: string;
  setNewProductPrice: (p: string) => void;
  newProductType: 'product' | 'service';
  setNewProductType: (t: 'product' | 'service') => void;
  savingProduct: boolean;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [localSearch, setLocalSearch] = useState(item.description || '');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  const exactMatch = products.some(
    p => p.name.toLowerCase() === localSearch.toLowerCase()
  );

  return (
    <View>
      <View style={styles.inlineSearchContainer}>
        <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.inlineSearchInput}
          placeholder="Search products/services..."
          value={localSearch}
          onChangeText={(text) => {
            setLocalSearch(text);
            setProductSearchQuery(text);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {localSearch.length > 0 && (
          <TouchableOpacity onPress={() => { setLocalSearch(''); setProductSearchQuery(''); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && localSearch.length > 0 && !showInlineForm && (
        <View style={styles.inlineDropdown}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.inlineDropdownItem}
                onPress={() => {
                  if (product.has_variants && product.variants && product.variants.length > 0) {
                    Alert.alert('Select Variant', 'Choose a variant', product.variants.map(v => ({
                      text: `${v.name} - $${v.price.toFixed(2)}`,
                      onPress: () => { onSelectProduct(product, v); setShowDropdown(false); setLocalSearch(product.name + ' - ' + v.name); }
                    })));
                  } else {
                    onSelectProduct(product);
                    setShowDropdown(false);
                    setLocalSearch(product.name);
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.inlineDropdownItemText}>{product.name}</Text>
                  <Text style={styles.inlineDropdownItemSub}>{product.type} • ${product.price.toFixed(2)}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
            {!exactMatch && localSearch.length > 0 && (
              <TouchableOpacity
                style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
                onPress={() => {
                  setShowDropdown(false);
                  setNewProductName(localSearch);
                  setProductSearchQuery(localSearch);
                  onCreateNew();
                }}
              >
                <Ionicons name="add-circle" size={20} color="#10B981" />
                <Text style={styles.inlineCreateText}>Create "{localSearch}"</Text>
              </TouchableOpacity>
            )}
            {filteredProducts.length === 0 && exactMatch && (
              <Text style={styles.noResultsText}>No products found</Text>
            )}
          </ScrollView>
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
              style={[styles.inlineTypeBtn, newProductType === 'service' && styles.inlineTypeBtnActive]}
              onPress={() => setNewProductType('service')}
            >
              <Ionicons name="construct" size={16} color={newProductType === 'service' ? '#FFF' : COLORS.gray} />
              <Text style={[styles.inlineTypeText, newProductType === 'service' && styles.inlineTypeTextActive]}>Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineTypeBtn, newProductType === 'product' && styles.inlineTypeBtnActive]}
              onPress={() => setNewProductType('product')}
            >
              <Ionicons name="cube" size={16} color={newProductType === 'product' ? '#FFF' : COLORS.gray} />
              <Text style={[styles.inlineTypeText, newProductType === 'product' && styles.inlineTypeTextActive]}>Product</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inlineCategoryField}>
            <Text style={styles.inlineCategoryLabel}>Name *</Text>
            <TextInput
              style={styles.inlineCategoryInput}
              placeholder="Product/Service name"
              value={newProductName || localSearch}
              onChangeText={setNewProductName}
              autoFocus
            />
          </View>
          <View style={styles.inlineCategoryField}>
            <Text style={styles.inlineCategoryLabel}>Price *</Text>
            <TextInput
              style={styles.inlineCategoryInput}
              placeholder="0.00"
              value={newProductPrice}
              onChangeText={setNewProductPrice}
              keyboardType="decimal-pad"
            />
          </View>
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

export default function InvoiceListPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWebDesktop = isWeb && width > 768;
  const { invoiceViewMode, setInvoiceViewMode } = useViewSettingsStore();

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
  const [showInlineProductForm, setShowInlineProductForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Handle action=create query param from dashboard
  const params = useLocalSearchParams();
  
  useEffect(() => {
    if (params.action === 'create' && !showAddModal && !loading) {
      // Reset form for new invoice
      setEditingInvoice(null);
      setSelectedClient(null);
      setDueDays('30');
      setNotes('');
      setTerms('Payment is due within the specified period.');
      setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
      setShowAddModal(true);
      // Clear the param after opening modal
      router.replace('/invoicing/list');
    }
  }, [params.action, loading]);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dueDays, setDueDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment is due within the specified period.');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }
  ]);
  
  // Inline product creation form
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState<'product' | 'service'>('service');
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

  // Record payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Action menu dropdown
  const [actionMenuInvoice, setActionMenuInvoice] = useState<Invoice | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });

  // Fetch functions
  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
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
    fetchInvoices();
    fetchClients();
    fetchProducts();
    fetchBusiness();
  }, []);

  const resetForm = () => {
    setSelectedClient(null);
    setClientSearchQuery('');
    setDueDays('30');
    setNotes('');
    setTerms('Payment is due within the specified period.');
    setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 }]);
    setEditingInvoice(null);
    setShowInlineClientForm(false);
    setShowInlineProductForm(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientAddress('');
    setNewProductName('');
    setNewProductPrice('');
    setNewProductType('service');
    setProductSearchQuery('');
    setSelectedItemIndex(null);
  };

  // Item management
  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      total: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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
    if (selectedItemIndex === null) return;
    
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
    setSelectedItemIndex(null);
    setProductSearchQuery('');
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
  const total = subtotal + taxAmount;

  // Create inline product
  const handleCreateInlineProduct = async (fallbackName?: string) => {
    const productName = newProductName.trim() || fallbackName?.trim() || '';
    const productPrice = parseFloat(newProductPrice) || 0;
    
    if (!productName) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    setSavingProduct(true);
    try {
      const response = await api.post('/invoices/products', {
        name: productName,
        price: productPrice,
        type: newProductType,
        tax_rate: 0,
        is_taxable: false,
      });
      
      const newProduct = response.data;
      setProducts([...products, newProduct]);
      
      if (selectedItemIndex !== null) {
        selectProductForItem(newProduct);
      }
      
      setShowInlineProductForm(false);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductType('service');
      
      setConfirmModal({
        visible: true,
        title: 'Product Created',
        message: `"${productName}" has been created and added to the invoice.`,
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      Alert.alert('Error', 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  // Create inline client
  const handleCreateInlineClient = async () => {
    const clientName = newClientName.trim();
    
    if (!clientName) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    setSavingClient(true);
    try {
      const response = await api.post('/invoices/clients', {
        name: clientName,
        email: newClientEmail.trim(),
        phone: newClientPhone.trim(),
        address: newClientAddress.trim(),
      });
      
      const newClient = response.data;
      setClients([...clients, newClient]);
      setSelectedClient(newClient);
      setClientSearchQuery(newClient.name);
      setShowInlineClientForm(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');
      
      setConfirmModal({
        visible: true,
        title: 'Client Created',
        message: `"${clientName}" has been created and selected.`,
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
      });
    } catch (error) {
      console.error('Failed to create client:', error);
      Alert.alert('Error', 'Failed to create client');
    } finally {
      setSavingClient(false);
    }
  };

  // Save invoice
  const handleSaveInvoice = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (items.length === 0 || items.every(i => !i.description)) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        customer_id: selectedClient.id,
        customer_name: selectedClient.name,
        customer_email: selectedClient.email,
        customer_phone: selectedClient.phone,
        customer_address: selectedClient.address,
        due_date: format(addDays(new Date(), parseInt(dueDays) || 30), 'yyyy-MM-dd'),
        items: items.filter(i => i.description).map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.total,
          variant: item.variant,
        })),
        subtotal,
        tax_total: taxAmount,
        total,
        notes,
        terms,
      };

      if (editingInvoice) {
        await api.put(`/invoices/${editingInvoice.id}`, invoiceData);
        setShowAddModal(false);
        resetForm();
        fetchInvoices();
        setConfirmModal({
          visible: true,
          title: 'Invoice Updated',
          message: 'Your invoice has been updated successfully.',
          type: 'success',
          onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
        });
      } else {
        const response = await api.post('/invoices', invoiceData);
        setShowAddModal(false);
        resetForm();
        fetchInvoices();
        setConfirmModal({
          visible: true,
          title: 'Invoice Created',
          message: `Invoice ${response.data.invoice_number || ''} has been created successfully. You can now send it to your client.`,
          type: 'success',
          onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
        });
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
      Alert.alert('Error', 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF HTML
  const generateInvoicePDFHtml = (invoice: Invoice): string => {
    const statusLabel = STATUS_CONFIG[invoice.status]?.label || invoice.status;
    const invoiceDate = invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : 'N/A';
    const dueDate = invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A';
    
    const businessName = business?.name || 'Your Business';
    const businessEmail = business?.email || '';
    const businessPhone = business?.phone || '';
    const businessAddress = business?.address || '';
    
    const itemsHtml = invoice.items.map((item, idx) => `
      <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
        <td class="td-desc">${item.description || 'N/A'}</td>
        <td class="td-qty">${item.quantity || 0}</td>
        <td class="td-rate">$${(item.unit_price || 0).toFixed(2)}</td>
        <td class="td-amount">$${(item.total || (item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.5; background: #fff; }
          .page { padding: 48px; min-height: 100vh; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #7C3AED; }
          .brand { }
          .brand-name { font-size: 28px; font-weight: 700; color: #7C3AED; letter-spacing: -0.5px; }
          .brand-tagline { font-size: 12px; color: #6B7280; margin-top: 4px; }
          .invoice-badge { text-align: right; }
          .invoice-title { font-size: 36px; font-weight: 800; color: #111827; letter-spacing: -1px; }
          .invoice-number { font-size: 14px; color: #6B7280; margin-top: 4px; }
          .invoice-status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #F3E8FF; color: #7C3AED; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .info-block { }
          .info-block.right { text-align: right; }
          .info-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .info-value { font-size: 14px; color: #374151; margin-bottom: 4px; }
          .info-value.primary { font-size: 16px; font-weight: 600; color: #111827; }
          .dates-row { display: flex; gap: 48px; margin-bottom: 40px; padding: 20px 24px; background: #F9FAFB; border-radius: 8px; }
          .date-block { }
          .date-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .date-value { font-size: 15px; font-weight: 600; color: #111827; }
          .items-section { margin-bottom: 32px; }
          .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .items-table thead tr { background: #7C3AED; }
          .items-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; }
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
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
          .totals-box { width: 320px; }
          .total-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #E5E7EB; }
          .total-row:last-child { border-bottom: none; }
          .total-label { font-size: 14px; color: #6B7280; font-weight: 500; }
          .total-value { font-size: 14px; font-weight: 600; color: #111827; font-family: 'SF Mono', Monaco, 'Courier New', monospace; min-width: 100px; text-align: right; }
          .total-row.grand { background: #7C3AED; border-radius: 8px; margin-top: 8px; border-bottom: none; }
          .total-row.grand .total-label { color: #E9D5FF; font-weight: 600; font-size: 15px; }
          .total-row.grand .total-value { color: #FFFFFF; font-weight: 700; font-size: 18px; }
          .payment-row { background: #D1FAE5; border-radius: 8px; margin-top: 8px; border-bottom: none; }
          .payment-row .total-label { color: #065F46; font-weight: 500; }
          .payment-row .total-value { color: #065F46; font-weight: 600; }
          .balance-row { background: #FEE2E2; border-radius: 8px; margin-top: 8px; border-bottom: none; }
          .balance-row .total-label { color: #991B1B; font-weight: 600; }
          .balance-row .total-value { color: #991B1B; font-weight: 700; font-size: 16px; }
          .notes-section { margin-bottom: 24px; padding: 20px 24px; background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; }
          .notes-title { font-size: 12px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .notes-text { font-size: 14px; color: #78350F; line-height: 1.6; }
          .terms-section { padding: 20px 24px; background: #F3F4F6; border-radius: 8px; margin-bottom: 40px; }
          .terms-title { font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .terms-text { font-size: 13px; color: #4B5563; line-height: 1.6; }
          .footer { text-align: center; padding-top: 32px; border-top: 1px solid #E5E7EB; }
          .footer-thanks { font-size: 18px; font-weight: 600; color: #7C3AED; margin-bottom: 8px; }
          .footer-info { font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="brand-name">${businessName}</div>
              <div class="brand-tagline">Professional Services</div>
            </div>
            <div class="invoice-badge">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number"># ${invoice.invoice_number}</div>
              <div class="invoice-status">${statusLabel}</div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-block">
              <div class="info-label">Bill To</div>
              <div class="info-value primary">${invoice.customer_name}</div>
              ${invoice.customer_email ? `<div class="info-value">${invoice.customer_email}</div>` : ''}
              ${invoice.customer_phone ? `<div class="info-value">${invoice.customer_phone}</div>` : ''}
              ${invoice.customer_address ? `<div class="info-value">${invoice.customer_address}</div>` : ''}
            </div>
            <div class="info-block right">
              <div class="info-label">From</div>
              <div class="info-value primary">${businessName}</div>
              ${businessEmail ? `<div class="info-value">${businessEmail}</div>` : ''}
              ${businessPhone ? `<div class="info-value">${businessPhone}</div>` : ''}
              ${businessAddress ? `<div class="info-value">${businessAddress}</div>` : ''}
            </div>
          </div>
          
          <div class="dates-row">
            <div class="date-block">
              <div class="date-label">Invoice Date</div>
              <div class="date-value">${invoiceDate}</div>
            </div>
            <div class="date-block">
              <div class="date-label">Due Date</div>
              <div class="date-value">${dueDate}</div>
            </div>
            <div class="date-block">
              <div class="date-label">Amount Due</div>
              <div class="date-value">$${(invoice.balance_due || invoice.total || 0).toFixed(2)}</div>
            </div>
          </div>
          
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
          
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span class="total-label">Subtotal</span>
                <span class="total-value">$${(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              ${invoice.tax_total > 0 ? `
              <div class="total-row">
                <span class="total-label">Tax</span>
                <span class="total-value">$${(invoice.tax_total || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="total-row grand">
                <span class="total-label">Total</span>
                <span class="total-value">$${(invoice.total || 0).toFixed(2)}</span>
              </div>
              ${invoice.amount_paid > 0 ? `
              <div class="total-row payment-row">
                <span class="total-label">Amount Paid</span>
                <span class="total-value">-$${(invoice.amount_paid || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              ${(invoice.balance_due || 0) > 0 ? `
              <div class="total-row balance-row">
                <span class="total-label">Balance Due</span>
                <span class="total-value">$${(invoice.balance_due || 0).toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${invoice.notes ? `
          <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-text">${invoice.notes}</div>
          </div>
          ` : ''}
          
          ${invoice.terms ? `
          <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-text">${invoice.terms}</div>
          </div>
          ` : ''}
          
          <div class="footer">
            <div class="footer-thanks">Thank you for your business!</div>
            <div class="footer-info">Payment is due by ${dueDate}. Please contact us if you have any questions.</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Handle actions
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      if (Platform.OS === 'web') {
        setPdfPreviewInvoice(invoice);
        return;
      }
      
      const html = generateInvoicePDFHtml(invoice);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Invoice ${invoice.invoice_number}`,
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

  const handleSendInvoice = (invoice: Invoice) => {
    setConfirmModal({
      visible: true,
      title: 'Send Invoice',
      message: `Send invoice ${invoice.invoice_number} to ${invoice.customer_name}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/${invoice.id}/send`);
          fetchInvoices();
          setConfirmModal({ 
            visible: true,
            title: 'Invoice Sent',
            message: `Invoice ${invoice.invoice_number} has been sent to ${invoice.customer_name}.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to send invoice');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setConfirmModal({
      visible: true,
      title: 'Edit Invoice',
      message: `Open invoice ${invoice.invoice_number} for editing?`,
      type: 'info',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, visible: false });
        const client = clients.find(c => c.id === invoice.customer_id) || {
          id: invoice.customer_id || '',
          name: invoice.customer_name,
          email: invoice.customer_email,
          phone: invoice.customer_phone,
          address: invoice.customer_address,
        };
        
        setSelectedClient(client);
        setClientSearchQuery(client.name);
        setItems(invoice.items.map(item => ({
          id: item.id || Date.now().toString(),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.total,
          product_id: item.product_id,
          variant: item.variant,
        })));
        setNotes(invoice.notes || '');
        setTerms(invoice.terms || '');
        setEditingInvoice(invoice);
        setShowAddModal(true);
      }
    });
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Invoice',
      message: `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/invoices/${invoice.id}`);
          fetchInvoices();
          setConfirmModal({ 
            visible: true,
            title: 'Invoice Deleted',
            message: `Invoice ${invoice.invoice_number} has been deleted.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to delete invoice');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setViewingInvoice(invoice);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount('');
    setShowPaymentModal(true);
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    setConfirmModal({
      visible: true,
      title: 'Duplicate Invoice',
      message: `Create a copy of invoice ${invoice.invoice_number}?`,
      type: 'info',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, visible: false });
        // Find the client
        const client = clients.find(c => c.id === invoice.customer_id) || {
          id: invoice.customer_id || '',
          name: invoice.customer_name,
          email: invoice.customer_email,
          phone: invoice.customer_phone,
          address: invoice.customer_address,
        };
        
        setSelectedClient(client);
        setClientSearchQuery(client.name);
        setItems(invoice.items.map(item => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.total,
          product_id: item.product_id,
          variant: item.variant,
        })));
        setNotes(invoice.notes || '');
        setTerms(invoice.terms || '');
        setEditingInvoice(null); // Creating new, not editing
        setShowAddModal(true);
      }
    });
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    setConfirmModal({
      visible: true,
      title: 'Mark as Paid',
      message: `Mark invoice ${invoice.invoice_number} as fully paid? This will record a payment of $${invoice.balance_due?.toFixed(2)}.`,
      type: 'info',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/${invoice.id}/payment?amount=${invoice.balance_due}`);
          fetchInvoices();
          setConfirmModal({ 
            visible: true,
            title: 'Invoice Paid',
            message: `Invoice ${invoice.invoice_number} has been marked as paid.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to mark invoice as paid');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  const submitPayment = async () => {
    if (!paymentInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    // Close the payment modal first
    setShowPaymentModal(false);
    
    // Show confirmation
    setConfirmModal({
      visible: true,
      title: 'Confirm Payment',
      message: `Record a payment of $${amount.toFixed(2)} for invoice ${paymentInvoice.invoice_number}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/${paymentInvoice.id}/payment?amount=${amount}`);
          fetchInvoices();
          setConfirmModal({
            visible: true,
            title: 'Payment Recorded',
            message: `Payment of $${amount.toFixed(2)} has been recorded for invoice ${paymentInvoice.invoice_number}.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false })
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to record payment');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      }
    });
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchQuery || 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const exactClientMatch = clients.some(
    c => c.name.toLowerCase() === clientSearchQuery.toLowerCase()
  );

  const openInlineProductForm = () => {
    setNewProductName(productSearchQuery);
    setNewProductPrice('');
    setShowInlineProductForm(true);
  };

  // Render invoice card
  const renderInvoiceCard = (invoice: Invoice) => {
    const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
    return (
      <View key={invoice.id} style={[styles.invoiceCard, isWebDesktop && styles.invoiceCardWeb]}>
        <View style={styles.invoiceCardHeader}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        
        <Text style={styles.clientName}>{invoice.customer_name}</Text>
        <Text style={styles.clientEmail}>{invoice.customer_email}</Text>
        
        <View style={styles.invoiceCardFooter}>
          <Text style={styles.invoiceTotal}>${(invoice.total || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceDate}>Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}</Text>
        </View>

        {invoice.balance_due > 0 && invoice.balance_due < invoice.total && (
          <View style={styles.balanceDueRow}>
            <Text style={styles.balanceDueLabel}>Balance Due:</Text>
            <Text style={styles.balanceDueValue}>${invoice.balance_due.toFixed(2)}</Text>
          </View>
        )}
        
        <View style={styles.invoiceCardActions}>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleViewInvoice(invoice)}>
            <Ionicons name="eye-outline" size={16} color={COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#EDE9FE' }]} onPress={() => handleEditInvoice(invoice)}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setActionMenuInvoice(invoice)}>
            <Ionicons name="ellipsis-vertical" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Web Header */}
      {isWebDesktop && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Invoices</Text>
            <Text style={styles.webPageSubtitle}>{invoices.length} invoice(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle currentView={invoiceViewMode || 'table'} onToggle={setInvoiceViewMode} />
            <TouchableOpacity
              style={styles.webCreateBtn}
              onPress={() => { resetForm(); setShowAddModal(true); }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>New Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWebDesktop && (
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileTitle}>Invoices</Text>
          <TouchableOpacity
            style={styles.mobileAddBtn}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Status Filter Tabs with Search */}
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {[null, 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map((status) => (
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
        {/* Search Bar - Right of Tabs */}
        <View style={styles.filterSearchContainer}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.filterSearchInput}
            placeholder="Search invoices..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>

      {/* Invoice List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[isWebDesktop && invoiceViewMode === 'grid' && styles.webGridList]}
        refreshControl={!isWeb ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoices(); }} /> : undefined}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Invoices</Text>
            <Text style={styles.emptySubtitle}>Create your first invoice to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        ) : isWebDesktop && invoiceViewMode !== 'grid' ? (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Invoice #</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Client</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Balance</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Due Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Actions</Text>
            </View>
            {filteredInvoices.map((invoice, index) => {
              const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
              return (
                <View key={invoice.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>{invoice.invoice_number}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCell} numberOfLines={1}>{invoice.customer_name}</Text>
                    <Text style={styles.tableCellSub} numberOfLines={1}>{invoice.customer_email}</Text>
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <View style={[styles.statusBadge, { backgroundColor: config.bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600', color: COLORS.primary }]}>
                    ${(invoice.total || 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600', color: invoice.balance_due > 0 ? COLORS.danger : COLORS.success }]}>
                    ${(invoice.balance_due || 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                  </Text>
                  <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleViewInvoice(invoice)}>
                      <Ionicons name="eye-outline" size={15} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#EDE9FE' }]} onPress={() => handleEditInvoice(invoice)}>
                      <Ionicons name="pencil" size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tableActionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setActionMenuInvoice(invoice)}>
                      <Ionicons name="ellipsis-vertical" size={15} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          filteredInvoices.map(invoice => renderInvoiceCard(invoice))
        )}
      </ScrollView>

      {/* Action Menu Dropdown - Modern Design */}
      {actionMenuInvoice && (
        <Modal visible={!!actionMenuInvoice} transparent animationType="fade" onRequestClose={() => setActionMenuInvoice(null)}>
          <Pressable style={styles.actionMenuOverlay} onPress={() => setActionMenuInvoice(null)}>
            <View style={styles.actionMenuContainer}>
              {/* Header */}
              <View style={styles.actionMenuHeader}>
                <View style={styles.actionMenuHeaderLeft}>
                  <View style={styles.actionMenuIconBadge}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.actionMenuTitle}>{actionMenuInvoice.invoice_number}</Text>
                    <Text style={styles.actionMenuSubtitle}>{actionMenuInvoice.customer_name}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.actionMenuCloseBtn} onPress={() => setActionMenuInvoice(null)}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {/* Actions List */}
              <View style={styles.actionMenuList}>
                {actionMenuInvoice.status === 'draft' && (
                  <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuInvoice(null); handleSendInvoice(actionMenuInvoice); }}>
                    <View style={[styles.actionMenuItemIcon, { backgroundColor: '#DBEAFE' }]}>
                      <Ionicons name="send" size={16} color="#3B82F6" />
                    </View>
                    <View style={styles.actionMenuItemContent}>
                      <Text style={styles.actionMenuItemTitle}>Send Invoice</Text>
                      <Text style={styles.actionMenuItemDesc}>Email to customer</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                )}
                
                {(actionMenuInvoice.status === 'sent' || actionMenuInvoice.status === 'partial' || actionMenuInvoice.status === 'overdue') && actionMenuInvoice.balance_due > 0 && (
                  <>
                    <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuInvoice(null); handleRecordPayment(actionMenuInvoice); }}>
                      <View style={[styles.actionMenuItemIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <Text style={styles.actionMenuItemTitle}>Record Payment</Text>
                        <Text style={styles.actionMenuItemDesc}>Add partial or full payment</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuInvoice(null); handleMarkAsPaid(actionMenuInvoice); }}>
                      <View style={[styles.actionMenuItemIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <Text style={styles.actionMenuItemTitle}>Mark as Paid</Text>
                        <Text style={styles.actionMenuItemDesc}>Record full payment of ${actionMenuInvoice.balance_due?.toFixed(2)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  </>
                )}
                
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuInvoice(null); handleDuplicateInvoice(actionMenuInvoice); }}>
                  <View style={[styles.actionMenuItemIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="copy-outline" size={16} color="#D97706" />
                  </View>
                  <View style={styles.actionMenuItemContent}>
                    <Text style={styles.actionMenuItemTitle}>Duplicate</Text>
                    <Text style={styles.actionMenuItemDesc}>Create a copy of this invoice</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => { setActionMenuInvoice(null); handleDownloadInvoice(actionMenuInvoice); }}>
                  <View style={[styles.actionMenuItemIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="download-outline" size={16} color="#6B7280" />
                  </View>
                  <View style={styles.actionMenuItemContent}>
                    <Text style={styles.actionMenuItemTitle}>Download PDF</Text>
                    <Text style={styles.actionMenuItemDesc}>Save or print invoice</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              </View>
              
              {/* Delete Section */}
              <View style={styles.actionMenuFooter}>
                <TouchableOpacity style={styles.actionMenuDeleteBtn} onPress={() => { setActionMenuInvoice(null); handleDeleteInvoice(actionMenuInvoice); }}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.actionMenuDeleteText}>Delete Invoice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Add/Edit Invoice Modal */}
      <WebModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={editingInvoice ? 'Edit Invoice' : 'New Invoice'}
        subtitle={editingInvoice ? `Editing ${editingInvoice.invoice_number}` : 'Create a new invoice'}
        icon="document-text"
        iconColor={COLORS.primary}
        maxWidth={700}
      >
        <ScrollView style={{ maxHeight: 500 }}>
          {/* Client Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Client *</Text>
            <View style={styles.inlineSearchContainer}>
              <Ionicons name="person" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineSearchInput}
                placeholder="Search or create client..."
                value={clientSearchQuery}
                onChangeText={(text) => {
                  setClientSearchQuery(text);
                  if (!text) setSelectedClient(null);
                }}
              />
            </View>
            
            {clientSearchQuery.length > 0 && !selectedClient && !showInlineClientForm && (
              <View style={styles.inlineDropdown}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {filteredClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.inlineDropdownItem}
                      onPress={() => {
                        setSelectedClient(client);
                        setClientSearchQuery(client.name);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inlineDropdownItemText}>{client.name}</Text>
                        <Text style={styles.inlineDropdownItemSub}>{client.email}</Text>
                      </View>
                      <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                  {!exactClientMatch && clientSearchQuery.length > 0 && (
                    <TouchableOpacity
                      style={[styles.inlineDropdownItem, styles.inlineCreateItem]}
                      onPress={() => {
                        setNewClientName(clientSearchQuery);
                        setShowInlineClientForm(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color="#10B981" />
                      <Text style={styles.inlineCreateText}>Create "{clientSearchQuery}"</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Inline Client Creation Form */}
            {showInlineClientForm && (
              <View style={styles.inlineCategoryForm}>
                <View style={styles.inlineCategoryHeader}>
                  <Ionicons name="person-add-outline" size={20} color="#10B981" />
                  <Text style={styles.inlineCategoryTitle}>New Client</Text>
                </View>
                <View style={styles.inlineCategoryField}>
                  <Text style={styles.inlineCategoryLabel}>Name *</Text>
                  <TextInput
                    style={styles.inlineCategoryInput}
                    placeholder="Client name"
                    value={newClientName}
                    onChangeText={setNewClientName}
                    autoFocus
                  />
                </View>
                <View style={styles.inlineCategoryField}>
                  <Text style={styles.inlineCategoryLabel}>Email</Text>
                  <TextInput
                    style={styles.inlineCategoryInput}
                    placeholder="client@email.com"
                    value={newClientEmail}
                    onChangeText={setNewClientEmail}
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inlineCategoryField}>
                  <Text style={styles.inlineCategoryLabel}>Phone</Text>
                  <TextInput
                    style={styles.inlineCategoryInput}
                    placeholder="+1 234 567 8900"
                    value={newClientPhone}
                    onChangeText={setNewClientPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inlineCategoryField}>
                  <Text style={styles.inlineCategoryLabel}>Address</Text>
                  <TextInput
                    style={styles.inlineCategoryInput}
                    placeholder="Full address"
                    value={newClientAddress}
                    onChangeText={setNewClientAddress}
                    multiline
                  />
                </View>
                <View style={styles.inlineCategoryButtons}>
                  <TouchableOpacity style={styles.inlineCategoryCancelBtn} onPress={() => setShowInlineClientForm(false)}>
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
                      <Text style={styles.inlineCategorySaveText}>Create & Select</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Line Items - Only show when client is selected */}
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
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Product/Service</Text>
                      <InlineProductSelector
                        item={item}
                        index={index}
                        products={products}
                        productSearchQuery={selectedItemIndex === index ? productSearchQuery : ''}
                        setProductSearchQuery={(q) => { setSelectedItemIndex(index); setProductSearchQuery(q); }}
                        onSelectProduct={(product, variant) => {
                          const isDuplicate = items.some((existingItem, idx) => {
                            if (idx === index) return false;
                            if (variant) {
                              return existingItem.product_id === product.id && existingItem.variant === variant.name;
                            }
                            return existingItem.product_id === product.id && !existingItem.variant;
                          });
                          
                          if (isDuplicate) {
                            Alert.alert('Duplicate Item', 'This product/service is already added to the invoice.');
                            return;
                          }
                          setSelectedItemIndex(index);
                          setTimeout(() => {
                            const itemId = items[index].id;
                            const price = variant ? variant.price : product.price;
                            const description = variant ? `${product.name} - ${variant.name}` : product.name;
                            
                            setItems(prevItems => prevItems.map(itm => {
                              if (itm.id === itemId) {
                                const updated = { ...itm, product_id: product.id, description, unit_price: price, tax_rate: product.tax_rate || 0, variant: variant?.name };
                                updated.total = updated.quantity * updated.unit_price * (1 + updated.tax_rate / 100);
                                return updated;
                              }
                              return itm;
                            }));
                            setSelectedItemIndex(null);
                            setProductSearchQuery('');
                          }, 0);
                        }}
                        onCreateNew={() => {
                          setSelectedItemIndex(index);
                          openInlineProductForm();
                        }}
                        showInlineForm={showInlineProductForm && selectedItemIndex === index}
                        onCloseForm={() => setShowInlineProductForm(false)}
                        onCreateProduct={handleCreateInlineProduct}
                        newProductName={newProductName}
                        setNewProductName={setNewProductName}
                        newProductPrice={newProductPrice}
                        setNewProductPrice={setNewProductPrice}
                        savingProduct={savingProduct}
                      />
                    </View>

                    <View style={styles.itemFields}>
                      <View style={{ flex: 1 }}>
                        <Input label="Qty" placeholder="1" value={item.quantity.toString()} onChangeText={(v) => updateItem(item.id, 'quantity', parseFloat(v) || 0)} keyboardType="number-pad" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Input label="Price" placeholder="0.00" value={item.unit_price > 0 ? item.unit_price.toString() : ''} onChangeText={(v) => updateItem(item.id, 'unit_price', parseFloat(v) || 0)} keyboardType="decimal-pad" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.priceLabel}>Total</Text>
                        <View style={styles.priceDisplay}>
                          <Text style={[styles.priceValue, { color: COLORS.primary }]}>${(item.quantity * item.unit_price).toFixed(2)}</Text>
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

          {/* Save Button */}
          <Button
            title={saving ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            onPress={handleSaveInvoice}
            disabled={saving || !selectedClient}
            style={styles.saveButton}
          />
        </ScrollView>
      </WebModal>

      {/* View Invoice Modal */}
      <WebModal
        visible={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title={viewingInvoice?.invoice_number || 'Invoice Details'}
        subtitle={`Billed to ${viewingInvoice?.customer_name || ''}`}
        icon="document-text"
        iconColor={COLORS.primary}
        maxWidth={650}
      >
        {viewingInvoice && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[viewingInvoice.status]?.bg || '#F3F4F6' }]}>
                <Text style={[styles.statusText, { color: STATUS_CONFIG[viewingInvoice.status]?.color || '#6B7280' }]}>
                  {STATUS_CONFIG[viewingInvoice.status]?.label || viewingInvoice.status}
                </Text>
              </View>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Due: {viewingInvoice.due_date ? format(new Date(viewingInvoice.due_date), 'MMMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Client Details</Text>
              <View style={styles.viewCard}>
                <Text style={styles.viewCardTitle}>{viewingInvoice.customer_name}</Text>
                {viewingInvoice.customer_email && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_email}</Text>}
                {viewingInvoice.customer_phone && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_phone}</Text>}
                {viewingInvoice.customer_address && <Text style={styles.viewCardSubtitle}>{viewingInvoice.customer_address}</Text>}
              </View>
            </View>
            
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Items</Text>
              <View style={styles.viewItemsTable}>
                <View style={styles.viewItemsHeader}>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 3 }]}>Description</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                </View>
                {viewingInvoice.items.map((item, idx) => (
                  <View key={idx} style={[styles.viewItemsRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.viewItemsCell, { flex: 3 }]}>{item.description || 'N/A'}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'center' }]}>{item.quantity || 0}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right' }]}>${(item.unit_price || 0).toFixed(2)}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>${(item.total || (item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.viewTotalsSection}>
              <View style={styles.viewTotalRow}>
                <Text style={styles.viewTotalLabel}>Subtotal</Text>
                <Text style={styles.viewTotalValue}>${(viewingInvoice.subtotal || 0).toFixed(2)}</Text>
              </View>
              {viewingInvoice.tax_total > 0 && (
                <View style={styles.viewTotalRow}>
                  <Text style={styles.viewTotalLabel}>Tax</Text>
                  <Text style={styles.viewTotalValue}>${(viewingInvoice.tax_total || 0).toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.viewTotalRow, styles.viewGrandTotalRow]}>
                <Text style={styles.viewGrandTotalLabel}>Total</Text>
                <Text style={styles.viewGrandTotalValue}>${(viewingInvoice.total || 0).toFixed(2)}</Text>
              </View>
              {viewingInvoice.amount_paid > 0 && (
                <View style={styles.viewPaymentRow}>
                  <Text style={styles.viewPaymentLabel}>Amount Paid</Text>
                  <Text style={styles.viewPaymentValue}>-${(viewingInvoice.amount_paid || 0).toFixed(2)}</Text>
                </View>
              )}
              {viewingInvoice.balance_due > 0 && (
                <View style={styles.viewBalanceRow}>
                  <Text style={styles.viewBalanceLabel}>Balance Due</Text>
                  <Text style={styles.viewBalanceValue}>${(viewingInvoice.balance_due || 0).toFixed(2)}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.viewActionsRow}>
              {viewingInvoice.status === 'draft' && (
                <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => { setViewingInvoice(null); handleSendInvoice(viewingInvoice); }}>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Send Invoice</Text>
                </TouchableOpacity>
              )}
              {(viewingInvoice.status === 'sent' || viewingInvoice.status === 'partial' || viewingInvoice.status === 'overdue') && (
                <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: COLORS.success }]} onPress={() => { setViewingInvoice(null); handleRecordPayment(viewingInvoice); }}>
                  <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewActionBtnText}>Record Payment</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: COLORS.primary }]} onPress={() => { setViewingInvoice(null); handleEditInvoice(viewingInvoice); }}>
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewActionBtn, { backgroundColor: '#059669' }]} onPress={() => handleDownloadInvoice(viewingInvoice)}>
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Print / PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>

      {/* PDF Preview Modal */}
      {Platform.OS === 'web' && pdfPreviewInvoice && (
        <Modal visible={!!pdfPreviewInvoice} transparent animationType="fade" onRequestClose={() => setPdfPreviewInvoice(null)}>
          <Pressable style={styles.pdfPreviewOverlay} onPress={() => setPdfPreviewInvoice(null)}>
            <Pressable style={styles.pdfPreviewContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pdfPreviewHeader}>
                <View>
                  <Text style={styles.pdfPreviewTitle}>Invoice Preview</Text>
                  <Text style={styles.pdfPreviewSubtitle}>{pdfPreviewInvoice.invoice_number}</Text>
                </View>
                <View style={styles.pdfPreviewActions}>
                  <TouchableOpacity style={styles.pdfPrintBtn} onPress={() => {
                    const html = generateInvoicePDFHtml(pdfPreviewInvoice);
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => { printWindow.print(); }, 500);
                    }
                  }}>
                    <Ionicons name="print" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfPrintBtnText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pdfCloseBtn} onPress={() => setPdfPreviewInvoice(null)}>
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.pdfPreviewCard}>
                <iframe srcDoc={generateInvoicePDFHtml(pdfPreviewInvoice)} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} title="Invoice Preview" />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Record Payment Modal */}
      <WebModal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" subtitle={paymentInvoice?.invoice_number || ''} icon="cash-outline" iconColor={COLORS.success} maxWidth={400}>
        {paymentInvoice && (
          <View>
            <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 8 }}>Balance Due: <Text style={{ fontWeight: '700', color: COLORS.danger }}>${paymentInvoice.balance_due?.toFixed(2)}</Text></Text>
            <Input label="Payment Amount" placeholder="0.00" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button title="Cancel" variant="outline" onPress={() => setShowPaymentModal(false)} style={{ flex: 1 }} />
              <Button title="Record Payment" onPress={submitPayment} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </WebModal>

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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  
  // Web Header
  webPageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  webPageTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  webCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  webCreateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  
  // Mobile Header
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  mobileTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  mobileAddBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  
  // Filter Tabs with Search
  filterTabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, height: 36, justifyContent: 'center' },
  filterTabActive: { backgroundColor: '#7C3AED' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterTabTextActive: { color: '#FFFFFF' },
  filterSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 12, minWidth: 200 },
  filterSearchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8, outlineStyle: 'none' },
  
  // List Container
  listContainer: { flex: 1, padding: 16 },
  webGridList: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  // Invoice Card
  invoiceCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  invoiceCardWeb: { width: 'calc(33.333% - 12px)', minWidth: 320, maxWidth: 400 },
  invoiceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  clientEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  invoiceCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  invoiceTotal: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  invoiceDate: { fontSize: 12, color: '#6B7280' },
  balanceDueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  balanceDueLabel: { fontSize: 12, color: '#991B1B' },
  balanceDueValue: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  invoiceCardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cardActionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  // Table Styles
  tableContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center', gap: 12 },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableCell: { fontSize: 14, color: '#111827' },
  tableCellSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tableActionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  // Form Styles
  formSection: { marginBottom: 20 },
  formSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inlineSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  inlineSearchInput: { flex: 1, fontSize: 14, color: '#111827', outlineStyle: 'none' },
  inlineDropdown: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, maxHeight: 200 },
  inlineDropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  inlineDropdownItemText: { fontSize: 14, fontWeight: '500', color: '#111827' },
  inlineDropdownItemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  inlineCreateItem: { backgroundColor: '#F0FDF4' },
  inlineCreateText: { fontSize: 14, fontWeight: '500', color: '#10B981', marginLeft: 8 },
  noResultsText: { padding: 12, textAlign: 'center', color: '#6B7280' },
  
  // Inline Form Styles
  inlineCategoryForm: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#86EFAC' },
  inlineCategoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inlineCategoryTitle: { fontSize: 14, fontWeight: '600', color: '#166534' },
  inlineCategoryField: { marginBottom: 12 },
  inlineCategoryLabel: { fontSize: 12, fontWeight: '500', color: '#166534', marginBottom: 4 },
  inlineCategoryInput: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#86EFAC' },
  inlineCategoryButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  inlineCategoryCancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  inlineCategoryCancelText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  inlineCategorySaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' },
  inlineCategorySaveBtnDisabled: { opacity: 0.6 },
  inlineCategorySaveText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Items Section
  itemsSection: { marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  clientRequiredNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FCD34D' },
  clientRequiredText: { flex: 1, fontSize: 14, color: '#92400E' },
  itemRow: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  itemRowAlt: { backgroundColor: '#FAFAFA' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemNumber: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  inputContainer: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 4 },
  itemFields: { flexDirection: 'row' },
  priceLabel: { fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 4 },
  priceDisplay: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  priceValue: { fontSize: 14, fontWeight: '600' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED', borderStyle: 'dashed' },
  addItemBtnText: { fontSize: 14, fontWeight: '500', color: '#7C3AED' },
  
  // Totals Section
  totalsSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  grandTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  
  saveButton: { marginTop: 16 },
  
  // View Modal Styles
  viewSection: { marginBottom: 20 },
  viewSectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  viewCard: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  viewCardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  viewCardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  viewItemsTable: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  viewItemsHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16 },
  viewItemsHeaderCell: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  viewItemsRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  viewItemsCell: { fontSize: 14, color: '#374151' },
  viewTotalsSection: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 10, marginBottom: 20 },
  viewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  viewTotalLabel: { fontSize: 14, color: '#6B7280' },
  viewTotalValue: { fontSize: 14, fontWeight: '500', color: '#111827', minWidth: 80, textAlign: 'right' },
  viewGrandTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  viewGrandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  viewGrandTotalValue: { fontSize: 18, fontWeight: '700', color: '#7C3AED', minWidth: 80, textAlign: 'right' },
  viewPaymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D1FAE5', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12 },
  viewPaymentLabel: { fontSize: 14, fontWeight: '500', color: '#065F46' },
  viewPaymentValue: { fontSize: 14, fontWeight: '600', color: '#065F46', minWidth: 80, textAlign: 'right' },
  viewBalanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginTop: 8 },
  viewBalanceLabel: { fontSize: 14, fontWeight: '600', color: '#991B1B' },
  viewBalanceValue: { fontSize: 16, fontWeight: '700', color: '#991B1B', minWidth: 80, textAlign: 'right' },
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
  actionMenuText: { fontSize: 15, color: '#374151' },
  actionMenuDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  
  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
