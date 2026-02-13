import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import ViewToggle from '../../src/components/ViewToggle';
import DatePicker from '../../src/components/DatePicker';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  dark: '#111827',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const INTERVAL_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-Weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Every year' },
];

interface RecurringInvoice {
  id: string;
  template_name: string;
  customer_name: string;
  customer_email: string;
  interval: string;
  next_date: string;
  end_date?: string;
  total: number;
  items: any[];
  status: 'active' | 'paused' | 'completed';
  invoices_generated: number;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  type: string;
}

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  const { recurringView, setRecurringView } = useViewSettingsStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringInvoice | null>(null);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {}, type: 'success' as 'danger' | 'warning' | 'info' | 'success' });

  // Dropdown states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Inline form states
  const [showInlineClientForm, setShowInlineClientForm] = useState(false);
  const [showInlineProductForm, setShowInlineProductForm] = useState(false);
  const [savingInlineClient, setSavingInlineClient] = useState(false);
  const [savingInlineProduct, setSavingInlineProduct] = useState(false);
  
  // Inline client form fields
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  
  // Inline product form fields
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState<'product' | 'service'>('service');

  // Form state
  const [formData, setFormData] = useState({
    template_name: '',
    client_id: '',
    client_name: '',
    interval: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    items: [] as { product_id: string; description: string; quantity: number; unit_price: number }[],
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [recurringRes, clientsRes, productsRes] = await Promise.all([
        api.get('/invoices/recurring'),
        api.get('/invoices/clients'),
        api.get('/invoices/products'),
      ]);
      setRecurringInvoices(recurringRes.data || []);
      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch recurring invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      template_name: '',
      client_id: '',
      client_name: '',
      interval: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      items: [],
      notes: '',
    });
    setEditingRecurring(null);
    setClientSearch('');
    setProductSearch('');
    setShowClientDropdown(false);
    setShowProductDropdown(false);
    // Reset inline form states
    setShowInlineClientForm(false);
    setShowInlineProductForm(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCompany('');
    setNewProductName('');
    setNewProductPrice('');
    setNewProductType('service');
  };

  // Handle saving inline client
  const handleSaveInlineClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Client/Business name is required');
      return;
    }
    
    setSavingInlineClient(true);
    try {
      const res = await api.post('/invoices/clients', {
        name: newClientName.trim(),
        company: newClientCompany.trim() || undefined,
        address: newClientAddress.trim() || undefined,
        email: newClientEmail.trim() || undefined,
        phone: newClientPhone.trim() || undefined,
      });
      
      // Refresh clients list
      const clientsRes = await api.get('/invoices/clients');
      setClients(clientsRes.data || []);
      
      // Select the new client
      const newClient = clientsRes.data?.find((c: Client) => c.name === newClientName.trim()) || { id: res.data?.id, name: newClientName.trim() };
      setFormData({ ...formData, client_id: newClient.id, client_name: newClient.name });
      
      // Reset inline form
      setShowInlineClientForm(false);
      setShowClientDropdown(false);
      setNewClientName('');
      setNewClientCompany('');
      setNewClientAddress('');
      setNewClientEmail('');
      setNewClientPhone('');
      setClientSearch('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create client');
    } finally {
      setSavingInlineClient(false);
    }
  };

  // Handle saving inline product
  const handleSaveInlineProduct = async () => {
    if (!newProductName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    
    const price = parseFloat(newProductPrice) || 0;
    
    setSavingInlineProduct(true);
    try {
      const res = await api.post('/invoices/products', {
        name: newProductName.trim(),
        price: price,
        type: newProductType,
        description: '',
        stock_quantity: 999,
        low_stock_threshold: 10,
      });
      
      // Refresh products list
      const productsRes = await api.get('/invoices/products');
      setProducts(productsRes.data || []);
      
      // Add the new product to items
      setFormData({
        ...formData,
        items: [...formData.items, {
          product_id: res.data?.id || `new-${Date.now()}`,
          description: newProductName.trim(),
          quantity: 1,
          unit_price: price,
        }],
      });
      
      // Reset inline form
      setShowInlineProductForm(false);
      setShowProductDropdown(false);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductType('service');
      setProductSearch('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create product');
    } finally {
      setSavingInlineProduct(false);
    }
  };

  const handleCreateRecurring = async () => {
    if (!formData.template_name || !formData.client_id || formData.items.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields and add at least one item');
      return;
    }

    try {
      const client = clients.find(c => c.id === formData.client_id);
      const payload = {
        ...formData,
        customer_name: client?.name || formData.client_name,
        customer_email: client?.email,
      };

      if (editingRecurring) {
        await api.put(`/invoices/recurring/${editingRecurring.id}`, payload);
      } else {
        await api.post('/invoices/recurring', payload);
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
      setConfirmModal({
        visible: true,
        title: editingRecurring ? 'Updated' : 'Created',
        message: `Recurring invoice "${formData.template_name}" has been ${editingRecurring ? 'updated' : 'created'}.`,
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false }),
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save recurring invoice');
    }
  };

  const handlePauseResume = (recurring: RecurringInvoice) => {
    const action = recurring.status === 'active' ? 'pause' : 'resume';
    setConfirmModal({
      visible: true,
      title: `${action === 'pause' ? 'Pause' : 'Resume'} Recurring`,
      message: `${action === 'pause' ? 'Pause' : 'Resume'} "${recurring.template_name}"?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/recurring/${recurring.id}/${action}`);
          fetchData();
          setConfirmModal({ ...confirmModal, visible: false });
        } catch (error) {
          Alert.alert('Error', `Failed to ${action}`);
          setConfirmModal({ ...confirmModal, visible: false });
        }
      },
    });
  };

  const handleDelete = (recurring: RecurringInvoice) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Recurring Invoice',
      message: `Delete "${recurring.template_name}"? This cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/invoices/recurring/${recurring.id}`);
          fetchData();
          setConfirmModal({ ...confirmModal, visible: false });
        } catch (error) {
          Alert.alert('Error', 'Failed to delete');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      },
    });
  };

  const handleGenerateNow = (recurring: RecurringInvoice) => {
    setConfirmModal({
      visible: true,
      title: 'Generate Invoice',
      message: `Generate an invoice now from "${recurring.template_name}"?`,
      type: 'info',
      onConfirm: async () => {
        try {
          const res = await api.post(`/invoices/recurring/${recurring.id}/generate`);
          fetchData();
          setConfirmModal({
            visible: true,
            title: 'Invoice Created',
            message: `Invoice ${res.data?.invoice_number || ''} has been generated.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false }),
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to generate invoice');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      },
    });
  };

  const selectClient = (client: Client) => {
    setFormData({ ...formData, client_id: client.id, client_name: client.name });
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const addProduct = (product: Product) => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: product.price,
      }],
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index].quantity = Math.max(1, quantity);
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Active', color: COLORS.success, bg: COLORS.successLight, icon: 'checkmark-circle' };
      case 'paused': return { label: 'Paused', color: COLORS.warning, bg: COLORS.warningLight, icon: 'pause-circle' };
      default: return { label: status, color: COLORS.gray, bg: COLORS.lightGray, icon: 'ellipse' };
    }
  };

  const getIntervalLabel = (interval: string) => INTERVAL_OPTIONS.find(o => o.value === interval)?.label || interval;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateTotal = () => formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const filteredRecurring = recurringInvoices.filter(r => {
    const matchesSearch = r.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderTableView = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Template</Text>
        <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Client</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Interval</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Next Date</Text>
        <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Amount</Text>
        <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: 'center' }]}>Status</Text>
        <View style={{ width: 100 }} />
      </View>
      {filteredRecurring.map((recurring) => {
        const statusConfig = getStatusConfig(recurring.status);
        return (
          <View key={recurring.id} style={styles.tableRow}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text style={styles.templateName}>{recurring.template_name}</Text>
              <Text style={styles.generatedCount}>{recurring.invoices_generated || 0} generated</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1.5 }]}>
              <Text style={styles.clientNameText} numberOfLines={1}>{recurring.customer_name}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <Text style={styles.intervalText}>{getIntervalLabel(recurring.interval)}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <Text style={styles.dateText}>{formatDate(recurring.next_date)}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 0.8, alignItems: 'flex-end' }]}>
              <Text style={styles.amountText}>${(recurring.total || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 0.7, alignItems: 'center' }]}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, { width: 100, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }]}>
              {recurring.status === 'active' && (
                <TouchableOpacity style={styles.tableActionBtn} onPress={() => handleGenerateNow(recurring)}>
                  <Ionicons name="flash" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.tableActionBtn} onPress={() => handlePauseResume(recurring)}>
                <Ionicons name={recurring.status === 'active' ? 'pause' : 'play'} size={14} color={recurring.status === 'active' ? COLORS.warning : COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.tableActionBtn} onPress={() => handleDelete(recurring)}>
                <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderCardView = () => (
    <View style={styles.cardsGrid}>
      {filteredRecurring.map((recurring) => {
        const statusConfig = getStatusConfig(recurring.status);
        return (
          <View key={recurring.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="repeat" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{recurring.template_name}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>{recurring.customer_name}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
            </View>

            <View style={styles.cardStats}>
              <View style={styles.cardStatItem}>
                <Text style={styles.cardStatLabel}>Interval</Text>
                <Text style={styles.cardStatValue}>{getIntervalLabel(recurring.interval)}</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStatItem}>
                <Text style={styles.cardStatLabel}>Next</Text>
                <Text style={styles.cardStatValue}>{formatDate(recurring.next_date)}</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStatItem}>
                <Text style={styles.cardStatLabel}>Generated</Text>
                <Text style={styles.cardStatValue}>{recurring.invoices_generated || 0}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardAmount}>${(recurring.total || 0).toFixed(2)}</Text>
              <View style={styles.cardActions}>
                {recurring.status === 'active' && (
                  <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: COLORS.primaryLight }]} onPress={() => handleGenerateNow(recurring)}>
                    <Ionicons name="flash" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.cardActionBtn, { backgroundColor: recurring.status === 'active' ? COLORS.warningLight : COLORS.successLight }]} 
                  onPress={() => handlePauseResume(recurring)}
                >
                  <Ionicons name={recurring.status === 'active' ? 'pause' : 'play'} size={14} color={recurring.status === 'active' ? COLORS.warning : COLORS.success} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: COLORS.dangerLight }]} onPress={() => handleDelete(recurring)}>
                  <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      {isWebDesktop && (
        <View style={styles.webHeader}>
          <View>
            <Text style={styles.webTitle}>Recurring Invoices</Text>
            <Text style={styles.webSubtitle}>{filteredRecurring.length} template(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle currentView={recurringView || 'table'} onToggle={setRecurringView} />
            <TouchableOpacity style={styles.createBtn} onPress={() => { resetForm(); setShowAddModal(true); }}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.createBtnText}>New Template</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterTabs}>
          {[null, 'active', 'paused'].map((status) => (
            <TouchableOpacity
              key={status || 'all'}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {filteredRecurring.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="repeat" size={40} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No Recurring Invoices</Text>
            <Text style={styles.emptySubtitle}>Automate billing by creating recurring templates</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setShowAddModal(true); }}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.emptyBtnText}>Create Template</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recurringView === 'table' ? renderTableView() : renderCardView()
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <WebModal
        visible={showAddModal}
        onClose={() => { resetForm(); setShowAddModal(false); }}
        title={editingRecurring ? 'Edit Recurring Invoice' : 'New Recurring Invoice'}
        subtitle="Set up automatic invoice generation"
        icon="repeat"
        iconColor={COLORS.primary}
        maxWidth={700}
      >
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          {/* Template Name */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Template Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., Monthly Retainer - Acme Corp"
              value={formData.template_name}
              onChangeText={(text) => setFormData({ ...formData, template_name: text })}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Client Selection - Searchable Dropdown with Inline Form */}
          <View style={[styles.formGroup, { zIndex: 300 }]}>
            <Text style={styles.formLabel}>Client <Text style={styles.required}>*</Text></Text>
            
            {showInlineClientForm ? (
              /* Inline Client Creation Form */
              <View style={styles.inlineForm}>
                <View style={styles.inlineFormHeader}>
                  <Ionicons name="person-add" size={18} color={COLORS.primary} />
                  <Text style={styles.inlineFormTitle}>Create New Client</Text>
                  <TouchableOpacity onPress={() => { setShowInlineClientForm(false); setNewClientName(clientSearch); }}>
                    <Ionicons name="close" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
                <Input
                  label="Business/Client Name *"
                  placeholder="Enter business or client name"
                  value={newClientName}
                  onChangeText={setNewClientName}
                />
                <Input
                  label="Business Address"
                  placeholder="Full business address"
                  value={newClientAddress}
                  onChangeText={setNewClientAddress}
                  multiline
                />
                <View style={styles.inlineFormRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Email"
                      placeholder="client@email.com"
                      value={newClientEmail}
                      onChangeText={setNewClientEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Input
                      label="Phone"
                      placeholder="+1 234 567 8900"
                      value={newClientPhone}
                      onChangeText={setNewClientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                <View style={styles.inlineFormActions}>
                  <TouchableOpacity 
                    style={styles.inlineFormCancelBtn}
                    onPress={() => {
                      setShowInlineClientForm(false);
                      setNewClientName('');
                      setNewClientCompany('');
                      setNewClientAddress('');
                      setNewClientEmail('');
                      setNewClientPhone('');
                    }}
                  >
                    <Text style={styles.inlineFormCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.inlineFormSaveBtn, savingInlineClient && { opacity: 0.6 }]}
                    onPress={handleSaveInlineClient}
                    disabled={savingInlineClient}
                  >
                    {savingInlineClient ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        <Text style={styles.inlineFormSaveText}>Create Client</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Client Dropdown */
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={[styles.dropdownTrigger, formData.client_id && styles.dropdownTriggerSelected]}
                  onPress={() => { setShowClientDropdown(!showClientDropdown); setShowProductDropdown(false); }}
                >
                  <Ionicons name="person-outline" size={18} color={formData.client_id ? COLORS.primary : COLORS.gray} />
                  {formData.client_id ? (
                    <View style={styles.selectedClientDisplay}>
                      <Text style={styles.selectedClientName}>{formData.client_name}</Text>
                      <TouchableOpacity 
                        style={styles.clearClientBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, client_id: '', client_name: '' });
                          setClientSearch('');
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TextInput
                      style={styles.dropdownInput}
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChangeText={(text) => { setClientSearch(text); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholderTextColor={COLORS.gray}
                    />
                  )}
                  {!formData.client_id && (
                    <Ionicons name={showClientDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
                  )}
                </TouchableOpacity>
                
                {showClientDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredClients.length === 0 && clientSearch.length > 0 ? (
                        <>
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.dropdownEmptyText}>No clients matching "{clientSearch}"</Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.createNewItem}
                            onPress={() => {
                              setNewClientName(clientSearch);
                              setShowInlineClientForm(true);
                              setShowClientDropdown(false);
                            }}
                          >
                            <View style={styles.createNewIcon}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.createNewText}>Create "{clientSearch}"</Text>
                              <Text style={styles.createNewHint}>Add as a new client</Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      ) : filteredClients.length === 0 ? (
                        <View style={styles.dropdownEmpty}>
                          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
                          <Text style={styles.dropdownEmptyText}>Type to search clients</Text>
                        </View>
                      ) : (
                        <>
                          {filteredClients.slice(0, 8).map((client) => (
                            <TouchableOpacity
                              key={client.id}
                              style={[styles.dropdownItem, formData.client_id === client.id && styles.dropdownItemActive]}
                              onPress={() => selectClient(client)}
                            >
                              <View style={styles.dropdownItemAvatar}>
                                <Text style={styles.dropdownItemInitial}>{client.name.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.dropdownItemName}>{client.name}</Text>
                                {client.email && <Text style={styles.dropdownItemSub}>{client.email}</Text>}
                              </View>
                              {formData.client_id === client.id && (
                                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                          {filteredClients.length > 8 && (
                            <View style={styles.dropdownMore}>
                              <Text style={styles.dropdownMoreText}>+{filteredClients.length - 8} more • Type to filter</Text>
                            </View>
                          )}
                          <TouchableOpacity 
                            style={styles.createNewItem}
                            onPress={() => {
                              setNewClientName(clientSearch);
                              setShowInlineClientForm(true);
                              setShowClientDropdown(false);
                            }}
                          >
                            <View style={styles.createNewIcon}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                            </View>
                            <Text style={styles.createNewText}>+ Create New Client</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Billing Interval */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Billing Interval <Text style={styles.required}>*</Text></Text>
            <View style={styles.intervalGrid}>
              {INTERVAL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.intervalChip, formData.interval === option.value && styles.intervalChipActive]}
                  onPress={() => setFormData({ ...formData, interval: option.value })}
                >
                  <Text style={[styles.intervalChipText, formData.interval === option.value && styles.intervalChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dates */}
          <View style={[styles.formRow, { zIndex: 1 }]}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Start Date <Text style={styles.required}>*</Text></Text>
              <DatePicker
                value={formData.start_date}
                onChange={(date) => setFormData({ ...formData, start_date: date })}
                placeholder="Select start date"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.formLabel}>End Date <Text style={styles.optional}>(Optional)</Text></Text>
              <DatePicker
                value={formData.end_date}
                onChange={(date) => setFormData({ ...formData, end_date: date })}
                placeholder="Select end date"
                minDate={formData.start_date}
              />
            </View>
          </View>

          {/* Line Items */}
          <View style={[styles.formGroup, { zIndex: 50 }]}>
            <Text style={styles.formLabel}>Line Items <Text style={styles.required}>*</Text></Text>
            
            {/* Added Items */}
            {formData.items.length > 0 && (
              <View style={styles.itemsTable}>
                <View style={styles.itemsTableHeader}>
                  <Text style={[styles.itemsHeaderText, { flex: 3 }]}>Item</Text>
                  <Text style={[styles.itemsHeaderText, { width: 70, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.itemsHeaderText, { width: 80, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.itemsHeaderText, { width: 80, textAlign: 'right' }]}>Total</Text>
                  <View style={{ width: 32 }} />
                </View>
                {formData.items.map((item, index) => (
                  <View key={index} style={styles.itemsTableRow}>
                    <Text style={[styles.itemText, { flex: 3 }]} numberOfLines={1}>{item.description}</Text>
                    <View style={[styles.qtyControl, { width: 70 }]}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(index, item.quantity - 1)}>
                        <Ionicons name="remove" size={12} color={COLORS.gray} />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(index, item.quantity + 1)}>
                        <Ionicons name="add" size={12} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemText, { width: 80, textAlign: 'right' }]}>${item.unit_price.toFixed(2)}</Text>
                    <Text style={[styles.itemTotal, { width: 80, textAlign: 'right' }]}>${(item.quantity * item.unit_price).toFixed(2)}</Text>
                    <TouchableOpacity style={{ width: 32, alignItems: 'center' }} onPress={() => removeItem(index)}>
                      <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.itemsTotalRow}>
                  <Text style={styles.itemsTotalLabel}>Total per Invoice</Text>
                  <Text style={styles.itemsTotalValue}>${calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Add Product - Dropdown or Inline Form */}
            {showInlineProductForm ? (
              /* Inline Product Creation Form */
              <View style={[styles.inlineForm, { marginTop: formData.items.length > 0 ? 12 : 0 }]}>
                <View style={styles.inlineFormHeader}>
                  <Ionicons name="cube" size={18} color={COLORS.primary} />
                  <Text style={styles.inlineFormTitle}>Create New Product</Text>
                  <TouchableOpacity onPress={() => { setShowInlineProductForm(false); setNewProductName(productSearch); }}>
                    <Ionicons name="close" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
                
                {/* Type Toggle */}
                <View style={styles.productTypeToggle}>
                  <TouchableOpacity
                    style={[styles.productTypeBtn, newProductType === 'product' && styles.productTypeBtnActive]}
                    onPress={() => setNewProductType('product')}
                  >
                    <Ionicons name="cube" size={16} color={newProductType === 'product' ? COLORS.white : COLORS.gray} />
                    <Text style={[styles.productTypeText, newProductType === 'product' && styles.productTypeTextActive]}>Product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.productTypeBtn, newProductType === 'service' && styles.productTypeBtnActive]}
                    onPress={() => setNewProductType('service')}
                  >
                    <Ionicons name="construct" size={16} color={newProductType === 'service' ? COLORS.white : COLORS.gray} />
                    <Text style={[styles.productTypeText, newProductType === 'service' && styles.productTypeTextActive]}>Service</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inlineFormRow}>
                  <View style={{ flex: 2 }}>
                    <Input
                      label="Name *"
                      placeholder={newProductType === 'service' ? 'Service name' : 'Product name'}
                      value={newProductName}
                      onChangeText={setNewProductName}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Input
                      label="Price *"
                      placeholder="0.00"
                      value={newProductPrice}
                      onChangeText={setNewProductPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                
                <View style={styles.inlineFormActions}>
                  <TouchableOpacity 
                    style={styles.inlineFormCancelBtn}
                    onPress={() => {
                      setShowInlineProductForm(false);
                      setNewProductName('');
                      setNewProductPrice('');
                      setNewProductType('service');
                    }}
                  >
                    <Text style={styles.inlineFormCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.inlineFormSaveBtn, savingInlineProduct && { opacity: 0.6 }]}
                    onPress={handleSaveInlineProduct}
                    disabled={savingInlineProduct}
                  >
                    {savingInlineProduct ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        <Text style={styles.inlineFormSaveText}>Create & Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Product Dropdown */
              <View style={[styles.dropdownContainer, { marginTop: formData.items.length > 0 ? 12 : 0, zIndex: 200 }]}>
                <TouchableOpacity 
                  style={styles.dropdownTrigger}
                  onPress={() => { setShowProductDropdown(!showProductDropdown); setShowClientDropdown(false); }}
                >
                  <Ionicons name="cube-outline" size={18} color={COLORS.gray} />
                  <TextInput
                    style={styles.dropdownInput}
                    placeholder="Search products..."
                    value={productSearch}
                    onChangeText={(text) => { 
                      setProductSearch(text); 
                      setShowProductDropdown(true);
                      setShowClientDropdown(false);
                    }}
                    onFocus={() => {
                      setShowProductDropdown(true);
                      setShowClientDropdown(false);
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {productSearch.length > 0 ? (
                    <TouchableOpacity onPress={() => { setProductSearch(''); }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name={showProductDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
                  )}
                </TouchableOpacity>
                
                {showProductDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredProducts.length === 0 && productSearch.length > 0 ? (
                        <>
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.dropdownEmptyText}>No products matching "{productSearch}"</Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.createNewItem}
                            onPress={() => {
                              setNewProductName(productSearch);
                              setShowInlineProductForm(true);
                              setShowProductDropdown(false);
                            }}
                          >
                            <View style={styles.createNewIcon}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.createNewText}>Create "{productSearch}"</Text>
                              <Text style={styles.createNewHint}>Add as a new product/service</Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      ) : filteredProducts.length === 0 ? (
                        <View style={styles.dropdownEmpty}>
                          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
                          <Text style={styles.dropdownEmptyText}>Type to search products</Text>
                        </View>
                      ) : (
                        <>
                          {filteredProducts.slice(0, 8).map((product) => (
                            <TouchableOpacity
                              key={product.id}
                              style={styles.dropdownItem}
                              onPress={() => addProduct(product)}
                            >
                              <View style={[styles.dropdownItemAvatar, { backgroundColor: COLORS.primaryLight }]}>
                                <Ionicons name={product.type === 'service' ? 'construct' : 'cube'} size={14} color={COLORS.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.dropdownItemName}>{product.name}</Text>
                                <Text style={styles.dropdownItemSub}>{product.type}</Text>
                              </View>
                              <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                            </TouchableOpacity>
                          ))}
                          {filteredProducts.length > 8 && (
                            <View style={styles.dropdownMore}>
                              <Text style={styles.dropdownMoreText}>+{filteredProducts.length - 8} more • Type to filter</Text>
                            </View>
                          )}
                          <TouchableOpacity 
                            style={styles.createNewItem}
                            onPress={() => {
                              setNewProductName(productSearch);
                              setShowInlineProductForm(true);
                              setShowProductDropdown(false);
                            }}
                          >
                            <View style={styles.createNewIcon}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                            </View>
                            <Text style={styles.createNewText}>+ Create New Product</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Notes - Hidden when dropdown is open to avoid overlap */}
          {!showProductDropdown && (
            <View style={[styles.formGroup, { zIndex: 1 }]}>
              <Text style={styles.formLabel}>Notes <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Add notes for this recurring invoice..."
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholderTextColor={COLORS.gray}
                multiline
              />
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setShowAddModal(false); }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleCreateRecurring}>
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
            <Text style={styles.saveBtnText}>{editingRecurring ? 'Update' : 'Create'} Template</Text>
          </TouchableOpacity>
        </View>
      </WebModal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },

  // Header
  webHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  webTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  webSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  createBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },

  // Filters
  filterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterTabs: { flexDirection: 'row', gap: 6 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.lightGray },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 12, fontWeight: '500', color: COLORS.gray },
  filterTabTextActive: { color: COLORS.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 200 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.dark, marginLeft: 6, outlineStyle: 'none' },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: 20 },

  // Table View
  tableContainer: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, paddingVertical: 10, paddingHorizontal: 16 },
  tableHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  tableCell: { justifyContent: 'center' },
  templateName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  generatedCount: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  clientNameText: { fontSize: 13, color: COLORS.dark },
  intervalText: { fontSize: 12, color: COLORS.gray },
  dateText: { fontSize: 12, color: COLORS.gray },
  amountText: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  tableActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },

  // Card View
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, minWidth: 300, maxWidth: 380, flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  cardIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  cardSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, padding: 10, marginBottom: 12 },
  cardStatItem: { flex: 1, alignItems: 'center' },
  cardStatLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase' },
  cardStatValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginTop: 2 },
  cardStatDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  emptySubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  emptyBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },

  // Form
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6 },
  required: { color: COLORS.danger },
  optional: { color: COLORS.gray, fontWeight: '400', fontSize: 11 },
  formInput: { backgroundColor: COLORS.lightGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.dark, outlineStyle: 'none' },
  formRow: { flexDirection: 'row' },

  // Dropdown
  dropdownContainer: { position: 'relative', zIndex: 100 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownTriggerSelected: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary },
  dropdownInput: { flex: 1, fontSize: 14, color: COLORS.dark, marginHorizontal: 8, outlineStyle: 'none' },
  dropdownList: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, zIndex: 1000, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }) },
  dropdownSearchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownSearchInput: { flex: 1, fontSize: 13, color: COLORS.dark, marginLeft: 8, outlineStyle: 'none' },
  selectedClientDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  selectedClientName: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.primary },
  clearClientBtn: { padding: 2 },
  dropdownEmpty: { padding: 20, alignItems: 'center', gap: 8 },
  dropdownEmptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center' },
  dropdownHintText: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  dropdownTip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: COLORS.primaryLight, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownTipText: { fontSize: 11, color: COLORS.primary, flex: 1 },
  dropdownMore: { padding: 10, alignItems: 'center', backgroundColor: COLORS.lightGray },
  dropdownMoreText: { fontSize: 12, color: COLORS.gray },
  createNewItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.successLight, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  createNewIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  createNewText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  createNewHint: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  
  // Inline Form Styles
  inlineForm: { backgroundColor: '#F0F9FF', borderRadius: 10, padding: 16, borderWidth: 2, borderColor: COLORS.primary },
  inlineFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inlineFormTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  inlineFormRow: { flexDirection: 'row' },
  inlineFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  inlineFormCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  inlineFormCancelText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  inlineFormSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: COLORS.primary },
  inlineFormSaveText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  
  // Product Type Toggle
  productTypeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  productTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightGray },
  productTypeBtnActive: { backgroundColor: COLORS.primary },
  productTypeText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  productTypeTextActive: { color: COLORS.white },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownItemActive: { backgroundColor: COLORS.primaryLight },
  dropdownItemAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dropdownItemInitial: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  dropdownItemName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  dropdownItemSub: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  productPrice: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Date Input
  dateInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dateInput: { flex: 1, fontSize: 14, color: COLORS.dark, marginLeft: 8, outlineStyle: 'none' },

  // Interval
  intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intervalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.lightGray, borderWidth: 2, borderColor: 'transparent' },
  intervalChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  intervalChipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  intervalChipTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Items Table
  itemsTable: { backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  itemsTableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, paddingVertical: 8, paddingHorizontal: 12 },
  itemsHeaderText: { fontSize: 10, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  itemsTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemText: { fontSize: 13, color: COLORS.dark },
  itemTotal: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  qtyBtn: { width: 20, height: 20, borderRadius: 4, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 13, fontWeight: '500', color: COLORS.dark, marginHorizontal: 6 },
  itemsTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingVertical: 10, paddingHorizontal: 12 },
  itemsTotalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  itemsTotalValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  // Add Item
  addItemTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  addItemInput: { flex: 1, fontSize: 14, color: COLORS.dark, marginLeft: 8, outlineStyle: 'none' },

  // Form Actions
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightGray },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});
