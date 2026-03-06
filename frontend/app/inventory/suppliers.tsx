import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';

// Color palette consistent with RetailPro
const COLORS = {
  primary: '#059669',
  primaryLight: '#ECFDF5',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
  danger: '#DC2626',
  warning: '#F59E0B',
};

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  contact_person: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  payment_terms: string;
  tax_id: string;
  status: string;
  items_count: number;
  created_at: string;
  updated_at: string;
}

interface SupplierFormData {
  name: string;
  phone: string;
  email: string;
  contact_person: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  payment_terms: string;
  tax_id: string;
}

const initialFormData: SupplierFormData = {
  name: '',
  phone: '',
  email: '',
  contact_person: '',
  address: '',
  city: '',
  country: '',
  notes: '',
  payment_terms: '',
  tax_id: '',
};

export default function SuppliersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 768;
  
  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/inventory/suppliers', { params });
      setSuppliers(response.data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);
  
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };
  
  // Form handlers
  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };
  
  const resetForm = () => {
    setFormData(initialFormData);
    setError('');
  };
  
  // CRUD operations
  const handleAddSupplier = async () => {
    if (!formData.name.trim()) {
      setError('Supplier name is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/inventory/suppliers', formData);
      setShowAddModal(false);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add supplier');
    } finally {
      setSaving(false);
    }
  };
  
  const handleEditSupplier = async () => {
    if (!selectedSupplier) return;
    if (!formData.name.trim()) {
      setError('Supplier name is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/inventory/suppliers/${selectedSupplier.id}`, formData);
      setShowEditModal(false);
      setSelectedSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    
    setSaving(true);
    try {
      await api.delete(`/inventory/suppliers/${selectedSupplier.id}`);
      setShowDeleteModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete supplier');
    } finally {
      setSaving(false);
    }
  };
  
  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      contact_person: supplier.contact_person,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      notes: supplier.notes,
      payment_terms: supplier.payment_terms,
      tax_id: supplier.tax_id,
    });
    setShowEditModal(true);
  };
  
  const openDetailModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };
  
  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.contact_person?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.phone?.includes(query)
      );
    }
    return true;
  });
  
  // Stats
  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const totalItems = suppliers.reduce((sum, s) => sum + (s.items_count || 0), 0);
  
  // Supplier Form Modal Content
  const renderFormModal = (isEdit: boolean) => (
    <WebModal
      visible={isEdit ? showEditModal : showAddModal}
      onClose={() => {
        isEdit ? setShowEditModal(false) : setShowAddModal(false);
        resetForm();
      }}
      title={isEdit ? 'Edit Supplier' : 'Add Supplier'}
      subtitle={isEdit ? 'Update supplier information' : 'Enter supplier details'}
      icon="business-outline"
      iconColor={COLORS.primary}
      maxWidth={520}
    >
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        <View style={styles.formField}>
          <Text style={styles.label}>Supplier Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., ABC Distributors"
            value={formData.name}
            onChangeText={(v) => handleInputChange('name', v)}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+255 712 345 678"
              value={formData.phone}
              onChangeText={(v) => handleInputChange('phone', v)}
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={[styles.formField, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="supplier@email.com"
              value={formData.email}
              onChangeText={(v) => handleInputChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            value={formData.contact_person}
            onChangeText={(v) => handleInputChange('contact_person', v)}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            placeholder="Street address"
            value={formData.address}
            onChangeText={(v) => handleInputChange('address', v)}
            multiline
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Dar es Salaam"
              value={formData.city}
              onChangeText={(v) => handleInputChange('city', v)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={[styles.formField, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="Tanzania"
              value={formData.country}
              onChangeText={(v) => handleInputChange('country', v)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.label}>Payment Terms</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Net 30, COD"
              value={formData.payment_terms}
              onChangeText={(v) => handleInputChange('payment_terms', v)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={[styles.formField, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Tax ID / TIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Tax ID"
              value={formData.tax_id}
              onChangeText={(v) => handleInputChange('tax_id', v)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Additional notes about this supplier..."
            value={formData.notes}
            onChangeText={(v) => handleInputChange('notes', v)}
            multiline
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              isEdit ? setShowEditModal(false) : setShowAddModal(false);
              resetForm();
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={isEdit ? handleEditSupplier : handleAddSupplier}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Add Supplier'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </WebModal>
  );
  
  // Supplier Card Component
  const SupplierCard = ({ supplier }: { supplier: Supplier }) => (
    <TouchableOpacity
      style={styles.supplierCard}
      onPress={() => openDetailModal(supplier)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="business" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{supplier.name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {supplier.contact_person || 'No contact person'}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          supplier.status === 'active' ? styles.statusActive : styles.statusInactive
        ]}>
          <Text style={[
            styles.statusText,
            supplier.status === 'active' ? styles.statusTextActive : styles.statusTextInactive
          ]}>
            {supplier.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        {supplier.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{supplier.phone}</Text>
          </View>
        )}
        {supplier.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color={COLORS.gray} />
            <Text style={styles.detailText}>{supplier.email}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={14} color={COLORS.gray} />
          <Text style={styles.detailText}>{supplier.items_count || 0} items</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={(e) => {
            e.stopPropagation();
            openEditModal(supplier);
          }}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardActionBtn, { marginLeft: 8 }]}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedSupplier(supplier);
            setShowDeleteModal(true);
          }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading suppliers...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Suppliers</Text>
            <Text style={styles.headerSubtitle}>
              {activeCount} active · {totalItems} linked items
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Supplier</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suppliers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {/* Suppliers List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try a different search term'
                : 'Add your first supplier to start managing your supply chain'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Add Supplier</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={isLargeScreen ? styles.gridContainer : undefined}>
            {filteredSuppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Modals */}
      {renderFormModal(false)}
      {renderFormModal(true)}
      
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${selectedSupplier?.name}"? ${
          selectedSupplier?.items_count 
            ? `This will unlink ${selectedSupplier.items_count} items.`
            : ''
        }`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteSupplier}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedSupplier(null);
        }}
        variant="danger"
        icon="trash-outline"
      />
      
      {/* Detail Modal */}
      <WebModal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSupplier(null);
        }}
        title={selectedSupplier?.name || 'Supplier Details'}
        subtitle={selectedSupplier?.contact_person || 'View supplier information'}
        icon="business"
        iconColor={COLORS.primary}
        maxWidth={480}
      >
        {selectedSupplier && (
          <View style={styles.detailContainer}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Contact Information</Text>
              
              {selectedSupplier.phone && (
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>{selectedSupplier.phone}</Text>
                </View>
              )}
              
              {selectedSupplier.email && (
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>{selectedSupplier.email}</Text>
                </View>
              )}
              
              {selectedSupplier.contact_person && (
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>{selectedSupplier.contact_person}</Text>
                </View>
              )}
            </View>
            
            {(selectedSupplier.address || selectedSupplier.city) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Address</Text>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>
                    {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Business Info</Text>
              
              <View style={styles.detailItem}>
                <Ionicons name="cube-outline" size={18} color={COLORS.gray} />
                <Text style={styles.detailItemText}>
                  {selectedSupplier.items_count || 0} linked items
                </Text>
              </View>
              
              {selectedSupplier.payment_terms && (
                <View style={styles.detailItem}>
                  <Ionicons name="card-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>
                    Payment: {selectedSupplier.payment_terms}
                  </Text>
                </View>
              )}
              
              {selectedSupplier.tax_id && (
                <View style={styles.detailItem}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailItemText}>
                    Tax ID: {selectedSupplier.tax_id}
                  </Text>
                </View>
              )}
            </View>
            
            {selectedSupplier.notes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{selectedSupplier.notes}</Text>
              </View>
            )}
            
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailActionBtn}
                onPress={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedSupplier);
                }}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.detailActionBtnText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.detailActionBtn, styles.detailActionBtnDanger]}
                onPress={() => {
                  setShowDetailModal(false);
                  setShowDeleteModal(true);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                <Text style={[styles.detailActionBtnText, { color: COLORS.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  supplierCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...(Platform.OS === 'web' ? { width: 'calc(50% - 8px)' } : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  cardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  cardActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 24,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Form styles
  formContainer: {
    flex: 1,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  errorBanner: {
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
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  // Detail modal styles
  detailContainer: {
    flex: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  detailItemText: {
    fontSize: 15,
    color: COLORS.dark,
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    gap: 8,
  },
  detailActionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },
  detailActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
