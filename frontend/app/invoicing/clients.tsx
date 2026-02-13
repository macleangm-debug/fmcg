import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import WebModal, { ModalSection, ModalActions } from '../../src/components/WebModal';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import ViewToggle from '../../src/components/ViewToggle';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  danger: '#EF4444',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Client {
  id: string;
  name: string;  // Business/Company Name (primary)
  email: string;  // Contact person email
  phone: string;  // Contact person phone
  address: string;  // Business address
  company: string;  // Legacy field (kept for compatibility)
  tax_id: string;
  notes: string;
  contact_person: string;  // Contact person name
  contact_position: string;  // Contact person position
  payment_terms: number;  // Days until payment is due
  total_invoices: number;
  total_amount: number;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { clientsView, setClientsView } = useViewSettingsStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCompletingDetails, setIsCompletingDetails] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');  // Business/Company Name
  const [formContactPerson, setFormContactPerson] = useState('');  // Contact person name
  const [formContactPosition, setFormContactPosition] = useState('');  // Contact person position
  const [formEmail, setFormEmail] = useState('');  // Contact person email
  const [formPhone, setFormPhone] = useState('');  // Contact person phone
  const [formAddress, setFormAddress] = useState('');  // Business address
  const [formCompany, setFormCompany] = useState('');  // Legacy field (unused)
  const [formTaxId, setFormTaxId] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');  // Company registration ID
  const [formPaymentTerms, setFormPaymentTerms] = useState('30');  // Default 30 days

  // Payment terms options
  const PAYMENT_TERMS_OPTIONS = [
    { value: '0', label: 'Due on Receipt' },
    { value: '7', label: 'Net 7 (7 days)' },
    { value: '14', label: 'Net 14 (14 days)' },
    { value: '30', label: 'Net 30 (30 days)' },
    { value: '45', label: 'Net 45 (45 days)' },
    { value: '60', label: 'Net 60 (60 days)' },
    { value: '90', label: 'Net 90 (90 days)' },
  ];

  const fetchClients = useCallback(async () => {
    try {
      const response = await api.get(`/invoices/clients${searchQuery ? `?search=${searchQuery}` : ''}`);
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  // Check if a client has incomplete/missing fields
  const isClientIncomplete = (client: Client) => {
    return !client.contact_person || !client.email || !client.phone || !client.address;
  };

  const getMissingFields = (client: Client) => {
    const missing = [];
    if (!client.contact_person) missing.push('contact person');
    if (!client.email) missing.push('email');
    if (!client.phone) missing.push('phone');
    if (!client.address) missing.push('address');
    return missing;
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClients();
  }, [fetchClients]);

  const resetForm = () => {
    setFormName('');
    setFormContactPerson('');
    setFormContactPosition('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCompany('');
    setFormTaxId('');
    setFormCompanyId('');
    setFormPaymentTerms('30');
    setEditingClient(null);
    setIsCompletingDetails(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setIsCompletingDetails(false);
    setFormName(client.name);
    setFormContactPerson(client.contact_person || '');
    setFormContactPosition(client.contact_position || '');
    setFormEmail(client.email || '');
    setFormPhone(client.phone || '');
    setFormAddress(client.address || '');
    setFormCompany(client.company || '');
    setFormTaxId(client.tax_id || '');
    setFormCompanyId((client as any).company_id || '');
    setFormPaymentTerms(String(client.payment_terms || 30));
    setShowAddModal(true);
  };

  const openCompleteModal = (client: Client) => {
    setEditingClient(client);
    setIsCompletingDetails(true);
    setFormName(client.name);
    setFormContactPerson(client.contact_person || '');
    setFormContactPosition(client.contact_position || '');
    setFormEmail(client.email || '');
    setFormPhone(client.phone || '');
    setFormAddress(client.address || '');
    setFormCompany(client.company || '');
    setFormTaxId(client.tax_id || '');
    setFormCompanyId((client as any).company_id || '');
    setFormPaymentTerms(String(client.payment_terms || 30));
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Business/Company name is required');
      return;
    }

    setSubmitting(true);
    try {
      const clientData = {
        name: formName.trim(),  // Business/Company name
        contact_person: formContactPerson.trim() || undefined,
        contact_position: formContactPosition.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim() || undefined,
        company: formCompany.trim() || undefined,  // Legacy field
        tax_id: formTaxId.trim() || undefined,
        company_id: formCompanyId.trim() || undefined,  // Company registration ID
        payment_terms: parseInt(formPaymentTerms) || 30,
      };

      if (editingClient) {
        await api.put(`/invoices/clients/${editingClient.id}`, clientData);
        setSuccessMessage({ title: 'Client Updated!', subtitle: `"${formName}" has been updated successfully.` });
      } else {
        await api.post('/invoices/clients', clientData);
        setSuccessMessage({ title: 'Client Created!', subtitle: `"${formName}" has been added to your clients.` });
      }

      setShowAddModal(false);
      resetForm();
      setShowSuccessModal(true);
      fetchClients();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const navigateToStatement = (client: Client) => {
    // Navigate to reports page with statement tab and client pre-selected
    // Use query string for web compatibility
    if (Platform.OS === 'web') {
      const params = new URLSearchParams({
        tab: 'statement',
        clientId: client.id,
        clientName: client.name
      });
      router.push(`/invoicing/reports?${params.toString()}`);
    } else {
      router.push({
        pathname: '/invoicing/reports',
        params: { 
          tab: 'statement',
          clientId: client.id,
          clientName: client.name 
        }
      });
    }
  };

  const executeDelete = async () => {
    if (!clientToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/invoices/clients/${clientToDelete.id}`);
      setShowDeleteModal(false);
      setSuccessMessage({ title: 'Client Deleted', subtitle: `"${clientToDelete.name}" has been removed.` });
      setClientToDelete(null);
      setShowSuccessModal(true);
      fetchClients();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  const renderClientCard = (client: Client) => {
    const incomplete = isClientIncomplete(client);
    
    return (
      <TouchableOpacity
        key={client.id}
        style={styles.clientCard}
        onPress={() => openEditModal(client)}
        onLongPress={() => handleDelete(client)}
      >
        {/* Top Section: Avatar + Client Info */}
        <View style={styles.clientCardTop}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientInitials}>
              {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={styles.clientInfoSection}>
            <Text style={styles.clientName} numberOfLines={1}>{client.name}</Text>
            {client.contact_person && (
              <View style={styles.contactPersonRow}>
                <Ionicons name="person-outline" size={12} color={COLORS.gray} />
                <Text style={styles.clientCompany} numberOfLines={1}>
                  {client.contact_person}{client.contact_position ? ` • ${client.contact_position}` : ''}
                </Text>
              </View>
            )}
            <Text style={styles.clientContact} numberOfLines={1}>{client.email || client.phone || <Text style={styles.missingText}>No contact info</Text>}</Text>
            {incomplete && (
              <View style={styles.incompleteBadge}>
                <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                <Text style={styles.incompleteBadgeText}>Incomplete details</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </View>
        
        {/* Bottom Section: Stats + Statement Button */}
        <View style={styles.clientCardBottom}>
          <View style={styles.clientStatItem}>
            <Ionicons name="document-text-outline" size={14} color={COLORS.gray} />
            <Text style={styles.clientStatLabel}>Invoices</Text>
            <Text style={styles.clientStatValue}>{client.total_invoices || 0}</Text>
          </View>
          <View style={styles.clientStatDivider} />
          <View style={styles.clientStatItem}>
            <Ionicons name="cash-outline" size={14} color={COLORS.gray} />
            <Text style={styles.clientStatLabel}>Total</Text>
            <Text style={styles.clientStatValue}>${(client.total_amount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.clientStatDivider} />
          <TouchableOpacity 
            style={styles.statementBtn}
            onPress={(e) => { e.stopPropagation(); navigateToStatement(client); }}
          >
            <Ionicons name="document-text" size={14} color={COLORS.primary} />
            <Text style={styles.statementBtnText}>Statement</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>CLIENT</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>CONTACT PERSON</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>EMAIL</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>PHONE</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: 'center' }]}>INVOICES</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>ACTIONS</Text>
    </View>
  );

  const renderTableRow = (client: Client) => {
    const incomplete = isClientIncomplete(client);
    
    return (
      <TouchableOpacity 
        key={client.id} 
        style={[styles.tableRow, incomplete && styles.tableRowIncomplete]}
        onPress={() => openEditModal(client)}
      >
        <View style={[styles.tableCellName, { flex: 2 }]}>
          <View style={[styles.clientAvatarSmall, incomplete && styles.avatarIncomplete]}>
            <Text style={styles.clientInitialsSmall}>
              {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View>
            <Text style={styles.tableCell}>{client.name}</Text>
            {incomplete && (
              <View style={styles.incompleteBadge}>
                <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                <Text style={styles.incompleteBadgeText}>Incomplete details</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ flex: 1.5, justifyContent: 'center' }}>
          {client.contact_person ? (
            <>
              <Text style={[styles.tableCell, { color: COLORS.dark }]}>{client.contact_person}</Text>
              {client.contact_position && (
                <Text style={styles.contactPositionText}>{client.contact_position}</Text>
              )}
            </>
          ) : (
            <Text style={[styles.tableCell, styles.missingText]}>-</Text>
          )}
        </View>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{client.email || <Text style={styles.missingText}>Not set</Text>}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{client.phone || <Text style={styles.missingText}>Not set</Text>}</Text>
        <Text style={[styles.tableCell, { flex: 0.7, textAlign: 'center', fontWeight: '600' }]}>{client.total_invoices || 0}</Text>
        <View style={{ flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {incomplete && (
            <TouchableOpacity 
              style={styles.completeBtn}
              onPress={(e) => { e.stopPropagation(); openCompleteModal(client); }}
            >
              <Ionicons name="create" size={14} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.statementActionBtn}
            onPress={(e) => { e.stopPropagation(); navigateToStatement(client); }}
          >
            <Ionicons name="document-text" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={(e) => { e.stopPropagation(); openEditModal(client); }}
          >
            <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={(e) => { e.stopPropagation(); handleDelete(client); }}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Clients</Text>
            <Text style={styles.webPageSubtitle}>Manage your client database</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={clientsView}
              onToggle={setClientsView}
            />
            <TouchableOpacity style={styles.addClientBtn} onPress={openAddModal}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addClientBtnText}>Add Client</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Clients</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search inside card */}
            <View style={styles.webCardHeader}>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color={COLORS.gray} />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.gray}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.webResultCount}>{clients.length} client(s)</Text>
            </View>

            {/* Client List */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
              {clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={COLORS.gray} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No clients found for "${searchQuery}"` : 'No clients found'}
                  </Text>
                  {searchQuery ? (
                    <TouchableOpacity 
                      style={[styles.emptyBtn, { backgroundColor: '#10B981' }]} 
                      onPress={() => {
                        setFormName(searchQuery);
                        setSearchQuery('');
                        openAddModal();
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.emptyBtnText}>Create "{searchQuery}"</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
                      <Text style={styles.emptyBtnText}>Add First Client</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : clientsView === 'table' ? (
                <>
                  {renderTableHeader()}
                  {clients.map(renderTableRow)}
                </>
              ) : (
                <View style={styles.clientsListWeb}>
                  {clients.map(renderClientCard)}
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>
                  {searchQuery ? `No clients found for "${searchQuery}"` : 'No clients found'}
                </Text>
                {searchQuery ? (
                  <TouchableOpacity 
                    style={[styles.emptyBtn, { backgroundColor: '#10B981' }]} 
                    onPress={() => {
                      setFormName(searchQuery);
                      setSearchQuery('');
                      openAddModal();
                    }}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.emptyBtnText}>Create "{searchQuery}"</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
                    <Text style={styles.emptyBtnText}>Add First Client</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.clientsList}>
                {clients.map(renderClientCard)}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* Add/Edit Modal using WebModal */}
      <WebModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={isCompletingDetails ? 'Complete Client Details' : (editingClient ? 'Edit Client' : 'New Client')}
        subtitle={isCompletingDetails ? `Add missing information for ${editingClient?.name}` : (editingClient ? 'Update client information' : 'Add a new client to your database')}
        icon={isCompletingDetails ? 'checkmark-circle-outline' : 'business-outline'}
        iconColor={isCompletingDetails ? COLORS.warning : COLORS.primary}
        maxWidth={500}
      >
        {isCompletingDetails && editingClient ? (
          /* Complete Details Mode - Show only missing fields */
          <>
            <View style={styles.completeClientHeader}>
              <Text style={styles.completeClientName}>{editingClient.name}</Text>
              {editingClient.contact_person && <Text style={styles.completeClientCompany}>Contact: {editingClient.contact_person}</Text>}
            </View>
            
            <ModalSection title="Missing Contact Person Details">
              {!editingClient.contact_person && (
                <Input
                  label="Contact Person *"
                  value={formContactPerson}
                  onChangeText={setFormContactPerson}
                  placeholder="Full name of contact"
                />
              )}
              {!editingClient.contact_position && (
                <Input
                  label="Position *"
                  value={formContactPosition}
                  onChangeText={setFormContactPosition}
                  placeholder="e.g., CEO, Manager, Accountant"
                />
              )}
              {!editingClient.email && (
                <Input
                  label="Email *"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  placeholder="contact@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
              {!editingClient.phone && (
                <Input
                  label="Phone *"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="+1 234 567 8900"
                  keyboardType="phone-pad"
                />
              )}
            </ModalSection>
            
            {!editingClient.address && (
              <ModalSection title="Missing Business Details">
                <Input
                  label="Business Address *"
                  value={formAddress}
                  onChangeText={setFormAddress}
                  placeholder="Full business address"
                  multiline
                />
              </ModalSection>
            )}
          </>
        ) : (
          /* Full Edit/Add Mode - Business Client Layout */
          <>
            <ModalSection title="Business Information">
              <Input
                label="Business/Company Name *"
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter company or business name"
                required
                leftIcon={<Ionicons name="business-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Company Registration No."
                value={formCompanyId}
                onChangeText={setFormCompanyId}
                placeholder="Enter company ID (optional)"
                leftIcon={<Ionicons name="document-text-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Tax/VAT ID"
                value={formTaxId}
                onChangeText={setFormTaxId}
                placeholder="Enter tax ID (optional)"
                leftIcon={<Ionicons name="receipt-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Business Address"
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Full business address"
                multiline
                leftIcon={<Ionicons name="location-outline" size={20} color="#6B7280" />}
              />
            </ModalSection>

            <ModalSection title="Contact Person">
              <Input
                label="Contact Person Name"
                value={formContactPerson}
                onChangeText={setFormContactPerson}
                placeholder="Full name of primary contact"
                leftIcon={<Ionicons name="person-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Position/Role"
                value={formContactPosition}
                onChangeText={setFormContactPosition}
                placeholder="e.g., CEO, Manager, Accountant"
                leftIcon={<Ionicons name="briefcase-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Email"
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="contact@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
              />
              <Input
                label="Phone"
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                leftIcon={<Ionicons name="call-outline" size={20} color="#6B7280" />}
              />
            </ModalSection>

            <ModalSection title="Payment Terms">
              <Text style={styles.paymentTermsTitle}>Invoice Payment Due</Text>
              <Text style={styles.paymentTermsDescription}>
                Set default payment terms for this client. This will be displayed on invoices and used to track overdue payments.
              </Text>
              <View style={styles.paymentTermsGrid}>
                {PAYMENT_TERMS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.paymentTermsChip,
                      formPaymentTerms === option.value && styles.paymentTermsChipActive
                    ]}
                    onPress={() => setFormPaymentTerms(option.value)}
                  >
                    <Text style={[
                      styles.paymentTermsChipText,
                      formPaymentTerms === option.value && styles.paymentTermsChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.paymentTermsInfo}>
                <Ionicons name="information-circle-outline" size={18} color="#0369A1" />
                <Text style={styles.paymentTermsInfoText}>
                  {formPaymentTerms === '0' 
                    ? 'Payment is due immediately upon receipt of invoice.'
                    : `Invoice will be due ${formPaymentTerms} days after the invoice date.`
                  }
                </Text>
              </View>
            </ModalSection>
          </>
        )}

        <ModalActions>
          <Button
            title="Cancel"
            onPress={() => { setShowAddModal(false); resetForm(); }}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title={isCompletingDetails ? 'Save Details' : (editingClient ? 'Update' : 'Create')}
            onPress={handleSave}
            loading={submitting}
            style={{ flex: 1 }}
          />
        </ModalActions>
      </WebModal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.successOverlay} onPress={() => setShowSuccessModal(false)}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>{successMessage.title}</Text>
            <Text style={styles.successSubtitle}>{successMessage.subtitle}</Text>
            <TouchableOpacity style={styles.successBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Client"
        message={clientToDelete ? `Are you sure you want to delete "${clientToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onCancel={() => { setShowDeleteModal(false); setClientToDelete(null); }}
        variant="danger"
        loading={deleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Web Page Header
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  webPageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  webPageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  addClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addClientBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Web White Card Container
  webContentWrapper: {
    flex: 1,
    padding: 24,
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    minWidth: 300,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    outlineStyle: 'none',
  },
  webResultCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  webListContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Mobile Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchContainerWeb: { marginHorizontal: 24 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.dark, outlineStyle: 'none' },

  content: { flex: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: COLORS.gray, marginTop: 16 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: COLORS.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },

  clientsList: { paddingHorizontal: 16 },
  clientsListWeb: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  clientCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    minWidth: 280,
    maxWidth: 380,
    flex: 1,
  },
  clientCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  clientAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#EDE9FE', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  clientAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  clientInitials: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  clientInitialsSmall: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  clientInfoSection: { 
    flex: 1, 
    marginLeft: 12,
    marginRight: 8,
  },
  clientInfo: { flex: 1, marginLeft: 12 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  clientCompany: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  clientContact: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  clientCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  clientStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clientStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 'auto',
  },
  clientStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  clientStats: { alignItems: 'center', marginRight: 12, minWidth: 50 },
  statsValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  statsLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase' },

  // Table Styles
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 14,
    color: COLORS.dark,
  },
  tableCellName: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Incomplete Indicator Styles
  tableRowIncomplete: {
    // No background color - just normal row styling
  },
  clientCardIncomplete: {
    // No border change for cards
  },
  avatarIncomplete: {
    // Keep avatar normal
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
  },
  incompleteBadgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  incompleteCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  incompleteCardBannerText: {
    fontSize: 11,
    color: COLORS.primary,
    flex: 1,
  },
  missingText: {
    color: '#D1D5DB',
    fontStyle: 'italic',
  },
  contactPositionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  contactPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  completeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Complete Details Modal Styles
  completeClientHeader: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completeClientName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  completeClientCompany: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statementBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successModal: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  successBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  successBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },

  // Payment Terms Styles
  paymentTermsTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.dark, 
    marginBottom: 8,
  },
  paymentTermsDescription: { 
    fontSize: 14, 
    color: COLORS.gray, 
    marginBottom: 16, 
    lineHeight: 20,
  },
  paymentTermsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 16,
  },
  paymentTermsChip: { 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: '#E5E7EB',
    minWidth: 100,
    alignItems: 'center',
  },
  paymentTermsChipActive: { 
    backgroundColor: '#EDE9FE', 
    borderColor: COLORS.primary,
  },
  paymentTermsChipText: { 
    fontSize: 14, 
    color: COLORS.dark, 
    fontWeight: '500',
  },
  paymentTermsChipTextActive: { 
    color: COLORS.primary, 
    fontWeight: '600',
  },
  paymentTermsInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: '#F0F9FF', 
    padding: 14, 
    borderRadius: 10,
  },
  paymentTermsInfoText: { 
    flex: 1, 
    fontSize: 14, 
    color: '#0369A1', 
    lineHeight: 20,
  },
});
