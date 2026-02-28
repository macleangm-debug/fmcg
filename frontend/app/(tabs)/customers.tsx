import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { customersApi } from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  birthday?: string;
  customer_type?: string;
  company_name?: string;
  company_id?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_balance: number;
  total_purchases: number;
  total_orders: number;
}

export default function Customers() {
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const { settings, getLastNineDigits, formatCurrency, formatNumber } = useBusinessStore();
  const { customersView, setCustomersView } = useViewSettingsStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const PAGE_SIZE = 20;
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form error state
  const [formError, setFormError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBirthday, setFormBirthday] = useState('');
  // B2B fields
  const [formCustomerType, setFormCustomerType] = useState<'individual' | 'business'>('individual');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('');

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [formTouched, setFormTouched] = useState<{
    name?: boolean;
    phone?: boolean;
    email?: boolean;
  }>({});

  const validateName = (value: string) => {
    if (!value.trim()) return 'Customer name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) return 'Phone number is required';
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
    if (value.replace(/\D/g, '').length < 7) return 'Phone number is too short';
    return undefined;
  };

  const validateEmail = (value: string) => {
    if (!value) return undefined; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  };

  const handleFieldBlur = (field: 'name' | 'phone' | 'email') => {
    setFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateName(formName) }));
    } else if (field === 'phone') {
      setFormErrors(prev => ({ ...prev, phone: validatePhone(formPhone) }));
    } else if (field === 'email') {
      setFormErrors(prev => ({ ...prev, email: validateEmail(formEmail) }));
    }
  };

  const fetchCustomers = async (reset: boolean = true) => {
    try {
      const skip = reset ? 0 : customers.length;
      const response = await customersApi.getAll({ search: search || undefined, skip, limit: PAGE_SIZE });
      if (reset) {
        setCustomers(response.data);
      } else {
        setCustomers(prev => [...prev, ...response.data]);
      }
      setHasMore(response.data.length === PAGE_SIZE);
    } catch (error) {
      console.log('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      setHasMore(true);
      fetchCustomers(true);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchCustomers(true);
  }, [search]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchCustomers(false);
    }
  }, [loadingMore, hasMore, loading, customers.length, search]);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormBirthday('');
    setFormCustomerType('individual');
    setFormCompanyName('');
    setFormCompanyId('');
    setFormTaxId('');
    setFormPaymentTerms('');
    setEditingCustomer(null);
    setFormError('');
    setFormErrors({});
    setFormTouched({});
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormBirthday(customer.birthday || '');
    setFormCustomerType((customer.customer_type as 'individual' | 'business') || 'individual');
    setFormCompanyName(customer.company_name || '');
    setFormCompanyId(customer.company_id || '');
    setFormTaxId(customer.tax_id || '');
    setFormPaymentTerms(customer.payment_terms || '');
    setFormErrors({});
    setFormTouched({});
    setShowModal(true);
  };

  const handleSaveCustomer = async () => {
    setFormError('');
    
    // Validate all fields
    setFormTouched({ name: true, phone: true, email: true });
    const nameError = validateName(formName);
    const phoneError = validatePhone(formPhone);
    const emailError = validateEmail(formEmail);
    setFormErrors({ name: nameError, phone: phoneError, email: emailError });

    if (nameError || phoneError || emailError) {
      return;
    }

    setSaving(true);
    try {
      // Format phone number: use last 9 digits with country code
      const last9Digits = getLastNineDigits(formPhone);
      const formattedPhone = `${settings.countryCode}${last9Digits}`;

      const customerData = {
        name: formName.trim(),
        phone: formattedPhone,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        birthday: formBirthday || undefined,
        customer_type: formCustomerType,
        company_name: formCustomerType === 'business' ? formCompanyName.trim() || undefined : undefined,
        company_id: formCustomerType === 'business' ? formCompanyId.trim() || undefined : undefined,
        tax_id: formCustomerType === 'business' ? formTaxId.trim() || undefined : undefined,
        payment_terms: formCustomerType === 'business' ? formPaymentTerms.trim() || undefined : undefined,
      };

      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, customerData);
        setSuccessMessage('Customer updated successfully!');
      } else {
        await customersApi.create(customerData);
        setSuccessMessage('Customer added successfully!');
      }

      resetForm();
      setShowModal(false);
      fetchCustomers();
      setShowSuccessModal(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to save customer';
      // Check for duplicate phone error
      if (errorMessage.toLowerCase().includes('duplicate') || 
          errorMessage.toLowerCase().includes('exists') ||
          errorMessage.toLowerCase().includes('already')) {
        setFormError('A customer with this phone number already exists');
      } else {
        setFormError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const executeDeleteFromModal = async () => {
    if (!customerToDelete) return;
    
    setDeleting(true);
    try {
      await customersApi.delete(customerToDelete.id);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (error: any) {
      // Show error in an alert or handle differently
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  };

  // Month and Day options for birthday picker
  const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  const openBirthdayPicker = () => {
    if (formBirthday) {
      const parts = formBirthday.split('-');
      if (parts.length >= 2) {
        setSelectedMonth(parseInt(parts[0]));
        setSelectedDay(parseInt(parts[1]));
      }
    } else {
      const today = new Date();
      setSelectedMonth(today.getMonth() + 1);
      setSelectedDay(today.getDate());
    }
    setShowBirthdayPicker(true);
  };

  const saveBirthday = () => {
    const monthStr = selectedMonth.toString().padStart(2, '0');
    const dayStr = selectedDay.toString().padStart(2, '0');
    setFormBirthday(`${monthStr}-${dayStr}`);
    setShowBirthdayPicker(false);
  };

  const formatBirthdayDisplay = (birthday?: string) => {
    if (!birthday) return null;
    const parts = birthday.split('-');
    if (parts.length >= 2) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const monthName = MONTHS.find(m => m.value === month)?.label || '';
      return `${monthName} ${day}`;
    }
    return birthday;
  };

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return null;
    try {
      const date = new Date(birthday);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return birthday;
    }
  };

  // Grid view renderer (original card layout)
  const renderCustomerGrid = ({ item }: { item: Customer }) => {
    const handleDelete = () => {
      setCustomerToDelete(item);
      setShowDeleteModal(true);
    };

    const handleEdit = () => {
      handleEditCustomer(item);
    };

    return (
      <View style={styles.customerCard}>
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#2563EB" />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerPhone}>{item.phone}</Text>
            {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
          </View>
          <View style={styles.customerStats}>
            <Text style={styles.statValue}>{formatCurrency(item.total_purchases)}</Text>
            <Text style={styles.statLabel}>{formatNumber(item.total_orders)} orders</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            activeOpacity={0.6}
          >
            <Ionicons name="create-outline" size={18} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Table row view renderer
  const renderCustomerTable = ({ item }: { item: Customer }) => {
    const handleDelete = () => {
      setCustomerToDelete(item);
      setShowDeleteModal(true);
    };

    const handleEdit = () => {
      handleEditCustomer(item);
    };

    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 40 }]}>
          <View style={styles.tableAvatar}>
            <Ionicons name="person" size={16} color="#2563EB" />
          </View>
        </View>
        <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.tableCellPhone]}>{item.phone}</Text>
        <Text style={[styles.tableCell, styles.tableCellEmail]} numberOfLines={1}>{item.email || '-'}</Text>
        <Text style={[styles.tableCell, styles.tableCellOrders]}>{formatNumber(item.total_orders)}</Text>
        <Text style={[styles.tableCell, styles.tableCellPurchases]}>{formatCurrency(item.total_purchases)}</Text>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity style={styles.tableActionButton} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tableActionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Table header
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 40 }]}></Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellPhone]}>Phone</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellEmail]}>Email</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellOrders]}>Orders</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellPurchases]}>Purchases</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

  const renderCustomerItem = isWeb && customersView === 'table' ? renderCustomerTable : renderCustomerGrid;

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
            <Text style={styles.webPageTitle}>Customers</Text>
            <Text style={styles.webPageSubtitle}>{customers.length} customer(s) found</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={customersView}
              onToggle={setCustomersView}
            />
            <TouchableOpacity style={styles.webCreateBtn} onPress={handleOpenAddModal}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search Bar */}
            <View style={styles.webFilterContainer}>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search customers..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#6B7280"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Table/Grid Header for Table View */}
            {customersView === 'table' && <TableHeader />}

            {/* Customer List */}
            <FlatList
              data={customers}
              renderItem={renderCustomerItem}
              keyExtractor={(item) => item.id}
              key={`web-${customersView}`}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={customersView === 'table' ? styles.webTableList : styles.webGridList}
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
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.webEmptyTitle}>No business runs without customers!</Text>
                  <Text style={styles.webEmptyText}>Your customer list is feeling lonely. Add your first one!</Text>
                  <TouchableOpacity style={styles.webEmptyBtn} onPress={handleOpenAddModal}>
                    <Text style={styles.webEmptyBtnText}>Add First Customer</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileCardContainer}>
          {/* Search inside card */}
          <View style={styles.searchInsideCard}>
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
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
          
          {/* Customer List inside card */}
          <FlatList
            data={customers}
            renderItem={renderCustomerItem}
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
                icon="people-outline"
                title="No Clients Found"
                message={search ? 'Try a different search term' : 'Add your first customer'}
                actionLabel="Add Customer"
                onAction={handleOpenAddModal}
              />
            }
          />
        </View>
      )}

      <WebModal
        visible={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        subtitle={editingCustomer ? 'Update customer information' : 'Add a new customer to your database'}
        icon={editingCustomer ? 'person-outline' : 'person-add-outline'}
        iconColor="#2563EB"
      >
        {/* Error Display */}
        {formError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.inputWrapper}>
          <Input
            label="Full Name *"
            placeholder="Enter customer name"
            value={formName}
            onChangeText={(text) => {
              setFormName(text);
              setFormError('');
              if (formTouched.name) setFormErrors(prev => ({ ...prev, name: validateName(text) }));
            }}
            onBlur={() => handleFieldBlur('name')}
            leftIcon={<Ionicons name="person-outline" size={20} color={formTouched.name && formErrors.name ? '#DC2626' : '#6B7280'} />}
          />
          {formTouched.name && formErrors.name && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Phone Number *"
            placeholder="Enter phone number"
            value={formPhone}
            onChangeText={(text) => {
              setFormPhone(text);
              setFormError('');
              if (formTouched.phone) setFormErrors(prev => ({ ...prev, phone: validatePhone(text) }));
            }}
            onBlur={() => handleFieldBlur('phone')}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call-outline" size={20} color={formTouched.phone && formErrors.phone ? '#DC2626' : '#6B7280'} />}
          />
          {formTouched.phone && formErrors.phone && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.phone}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Email"
            placeholder="Enter email (optional)"
            value={formEmail}
            onChangeText={(text) => {
              setFormEmail(text);
              if (formTouched.email) setFormErrors(prev => ({ ...prev, email: validateEmail(text) }));
            }}
            onBlur={() => handleFieldBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={20} color={formTouched.email && formErrors.email ? '#DC2626' : '#6B7280'} />}
          />
          {formTouched.email && formErrors.email && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.email}</Text>
            </View>
          )}
        </View>

        <Input
          label="Address"
          placeholder="Enter address (optional)"
          value={formAddress}
          onChangeText={setFormAddress}
          leftIcon={<Ionicons name="location-outline" size={20} color="#6B7280" />}
        />

        {/* Customer Type Toggle */}
        <View style={styles.customerTypeContainer}>
          <Text style={styles.customerTypeLabel}>Customer Type</Text>
          <View style={styles.customerTypeButtons}>
            <TouchableOpacity
              style={[
                styles.customerTypeButton,
                formCustomerType === 'individual' && styles.customerTypeButtonActive,
              ]}
              onPress={() => setFormCustomerType('individual')}
            >
              <Ionicons 
                name="person-outline" 
                size={18} 
                color={formCustomerType === 'individual' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[
                styles.customerTypeButtonText,
                formCustomerType === 'individual' && styles.customerTypeButtonTextActive,
              ]}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.customerTypeButton,
                formCustomerType === 'business' && styles.customerTypeButtonActive,
              ]}
              onPress={() => setFormCustomerType('business')}
            >
              <Ionicons 
                name="business-outline" 
                size={18} 
                color={formCustomerType === 'business' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[
                styles.customerTypeButtonText,
                formCustomerType === 'business' && styles.customerTypeButtonTextActive,
              ]}>Business</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* B2B Fields - Only shown when business type is selected */}
        {formCustomerType === 'business' && (
          <View style={styles.b2bFieldsContainer}>
            <Text style={styles.b2bFieldsTitle}>Business Details</Text>
            <Input
              label="Company Name"
              placeholder="Enter company name"
              value={formCompanyName}
              onChangeText={setFormCompanyName}
              leftIcon={<Ionicons name="business-outline" size={20} color="#6B7280" />}
            />
            <Input
              label="Company Registration No."
              placeholder="Enter company ID (optional)"
              value={formCompanyId}
              onChangeText={setFormCompanyId}
              leftIcon={<Ionicons name="document-text-outline" size={20} color="#6B7280" />}
            />
            <Input
              label="Tax/VAT ID"
              placeholder="Enter tax ID (optional)"
              value={formTaxId}
              onChangeText={setFormTaxId}
              leftIcon={<Ionicons name="receipt-outline" size={20} color="#6B7280" />}
            />
            <Input
              label="Payment Terms"
              placeholder="e.g., Net 30, Due on Receipt"
              value={formPaymentTerms}
              onChangeText={setFormPaymentTerms}
              leftIcon={<Ionicons name="calendar-outline" size={20} color="#6B7280" />}
            />
          </View>
        )}

        <View style={styles.datePickerContainer}>
          <Text style={styles.datePickerLabel}>Birthday (Month & Day)</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={openBirthdayPicker}
          >
            <Ionicons name="gift-outline" size={20} color="#6B7280" />
            <Text style={[styles.datePickerText, !formBirthday && styles.datePickerPlaceholder]}>
              {formatBirthdayDisplay(formBirthday) || 'Select birthday (optional)'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Button
          title={editingCustomer ? 'Update Customer' : 'Add Customer'}
          onPress={handleSaveCustomer}
          loading={saving}
          style={styles.saveButton}
        />

        {editingCustomer && (
          <TouchableOpacity
            style={styles.modalDeleteBtn}
            onPress={() => {
              setShowModal(false);
              setTimeout(() => confirmDeleteCustomer(editingCustomer), 300);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={styles.modalDeleteText}>Delete Customer</Text>
          </TouchableOpacity>
        )}
      </WebModal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={48} color="#DC2626" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Customer</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{customerToDelete?.name}"?{'\n\n'}
              This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={cancelDelete}
                disabled={deleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={executeDeleteFromModal}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
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
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={[styles.deleteModalIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.deleteModalTitle}>Success!</Text>
            <Text style={styles.deleteModalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={[styles.deleteModalConfirmBtn, { backgroundColor: '#059669' }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.deleteModalConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Birthday Picker Modal */}
      <Modal
        visible={showBirthdayPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBirthdayPicker(false)}
      >
        <View style={styles.birthdayPickerOverlay}>
          <View style={styles.birthdayPickerContent}>
            <View style={styles.birthdayPickerHeader}>
              <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                <Text style={styles.birthdayPickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.birthdayPickerTitle}>Select Birthday</Text>
              <TouchableOpacity onPress={saveBirthday}>
                <Text style={styles.birthdayPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.birthdayPickerRow}>
              {/* Month Picker */}
              <View style={styles.birthdayPickerColumn}>
                <Text style={styles.birthdayPickerLabel}>Month</Text>
                <ScrollView style={styles.birthdayPickerScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.birthdayPickerItem,
                        selectedMonth === month.value && styles.birthdayPickerItemSelected
                      ]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text style={[
                        styles.birthdayPickerItemText,
                        selectedMonth === month.value && styles.birthdayPickerItemTextSelected
                      ]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Day Picker */}
              <View style={styles.birthdayPickerColumn}>
                <Text style={styles.birthdayPickerLabel}>Day</Text>
                <ScrollView style={styles.birthdayPickerScroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.birthdayPickerItem,
                        selectedDay === day && styles.birthdayPickerItemSelected
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.birthdayPickerItemText,
                        selectedDay === day && styles.birthdayPickerItemTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  tableList: {
    paddingHorizontal: 20,
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
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingHorizontal: 4,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tableCellPhone: {
    flex: 1.5,
    fontSize: 13,
    color: '#374151',
  },
  tableCellEmail: {
    flex: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellOrders: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  tableCellPurchases: {
    width: 100,
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'right',
  },
  tableCellActions: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerCard: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  // Error display styles
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    minHeight: 48,
    cursor: 'pointer',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FEF2F2',
    minHeight: 48,
    cursor: 'pointer',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  customerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  birthdayText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  saveButton: {
    marginTop: 16,
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    padding: 14,
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
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
  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Customer Type Styles
  customerTypeContainer: {
    marginBottom: 16,
  },
  customerTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  customerTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  customerTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  customerTypeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  customerTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  customerTypeButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  // B2B Fields Styles
  b2bFieldsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  b2bFieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  // Date Picker Styles
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  datePickerPlaceholder: {
    color: '#9CA3AF',
  },
  // Birthday Picker Modal Styles
  birthdayPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  birthdayPickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  birthdayPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  birthdayPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  birthdayPickerCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  birthdayPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  birthdayPickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  birthdayPickerColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  birthdayPickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  birthdayPickerScroll: {
    maxHeight: 250,
  },
  birthdayPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  birthdayPickerItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  birthdayPickerItemText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  birthdayPickerItemTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
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
  searchInsideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  webFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  webEmptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  webEmptyBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  webEmptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
