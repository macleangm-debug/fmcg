import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#F59E0B',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  country: string;
  tags: string[];
  groups: string[];
  last_messaged?: string;
  created_at: string;
}

interface ContactGroup {
  id: string;
  name: string;
  contacts_count: number;
  color: string;
  is_default?: boolean;
}

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(isWeb ? 'table' : 'card');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Modals
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Import state
  const [importType, setImportType] = useState<'csv' | 'excel' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; errors: string[] } | null>(null);
  
  // New contact form
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    country: 'US',
    tags: '',
  });
  
  // New group form
  const [newGroup, setNewGroup] = useState({ name: '', color: '#6B7280', description: '' });
  
  // Import data
  const [importData, setImportData] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        try {
          const params: any = {};
          if (selectedGroup !== 'all') params.group_id = selectedGroup;
          if (searchQuery) params.search = searchQuery;
          
          const response = await api.get('/unitxt/contacts', {
            params,
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.contacts) {
            setContacts(response.data.contacts);
          }
        } catch (e) {
          useMockData();
        }
      } else {
        useMockData();
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      useMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, searchQuery]);

  const fetchGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await api.get('/unitxt/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.groups) {
          setGroups(response.data.groups);
        }
      }
    } catch (e) {
      setGroups([
        { id: 'all', name: 'All Contacts', contacts_count: 3542, color: COLORS.primary, is_default: true },
        { id: 'vip', name: 'VIP Customers', contacts_count: 156, color: COLORS.purple },
        { id: 'customers', name: 'Regular Customers', contacts_count: 2890, color: COLORS.blue },
        { id: 'leads', name: 'Leads', contacts_count: 496, color: COLORS.success },
      ]);
    }
  };

  const useMockData = () => {
    setContacts([
      { id: '1', name: 'John Doe', phone: '+1234567890', email: 'john@example.com', country: 'US', tags: ['customer', 'vip'], groups: ['vip'], created_at: '2025-01-20' },
      { id: '2', name: 'Jane Smith', phone: '+1987654321', email: 'jane@example.com', country: 'US', tags: ['customer'], groups: ['customers'], created_at: '2025-01-21' },
      { id: '3', name: 'Bob Wilson', phone: '+1555666777', email: 'bob@example.com', country: 'UK', tags: ['lead'], groups: ['leads'], created_at: '2025-01-22' },
      { id: '4', name: 'Alice Brown', phone: '+1888999000', email: 'alice@example.com', country: 'CA', tags: ['customer', 'premium'], groups: ['vip', 'customers'], created_at: '2025-01-23' },
      { id: '5', name: 'Charlie Davis', phone: '+1444333222', email: 'charlie@example.com', country: 'US', tags: ['customer'], groups: ['customers'], created_at: '2025-01-24' },
    ]);
  };

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, [fetchContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts();
    fetchGroups();
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }
    
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/contacts', {
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email || null,
        country: newContact.country,
        tags: newContact.tags.split(',').map(t => t.trim()).filter(Boolean),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Contact added successfully');
      setShowAddContactModal(false);
      setNewContact({ name: '', phone: '', email: '', country: 'US', tags: '' });
      fetchContacts();
      fetchGroups();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add contact');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportContacts = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    setActionLoading(true);
    setImportResult(null);
    
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await api.post('/unitxt/contacts/import-file', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setImportResult({
        imported: response.data.imported,
        duplicates: response.data.duplicates,
        errors: response.data.errors || []
      });
      
      if (response.data.imported > 0) {
        fetchContacts();
        fetchGroups();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to import contacts');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileSelect = (event: any) => {
    const file = event.target?.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        setImportType('csv');
        setSelectedFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setImportType('excel');
        setSelectedFile(file);
      } else {
        Alert.alert('Error', 'Please select a CSV or Excel file');
      }
    }
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportType(null);
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/groups', null, {
        params: {
          name: newGroup.name,
          color: newGroup.color,
          description: newGroup.description || null,
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Group created successfully');
      setShowGroupModal(false);
      setNewGroup({ name: '', color: '#6B7280', description: '' });
      fetchGroups();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await api.delete(`/unitxt/contacts/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchContacts();
              fetchGroups();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete contact');
            }
          }
        }
      ]
    );
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddToGroup = async (groupId: string) => {
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select contacts first');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post(`/unitxt/groups/${groupId}/add-contacts`, {
        contact_ids: selectedContacts
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', `Added ${selectedContacts.length} contacts to group`);
      setSelectedContacts([]);
      fetchContacts();
      fetchGroups();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add contacts to group');
    }
  };

  const filteredContacts = searchQuery
    ? contacts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCardView = () => (
    <View style={styles.contentContainer}>
      <ScrollView
        style={styles.contactsList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {filteredContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No contacts found</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddContactModal(true)}>
              <Text style={styles.emptyButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredContacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={[
                styles.contactCard,
                selectedContacts.includes(contact.id) && styles.contactCardSelected
              ]}
              onPress={() => toggleContactSelection(contact.id)}
              onLongPress={() => toggleContactSelection(contact.id)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {contact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
                {contact.email && (
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                )}
                {contact.tags.length > 0 && (
                  <View style={styles.tagsList}>
                    {contact.tags.slice(0, 3).map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                    {contact.tags.length > 3 && (
                      <Text style={styles.moreTags}>+{contact.tags.length - 3}</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.actionIconBtn}>
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.blue} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionIconBtn}
                  onPress={() => handleDeleteContact(contact.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  const renderTableView = () => (
    <View style={styles.tableContainer}>
      <ScrollView
        horizontal={!isWeb}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={!isWeb ? { minWidth: 800 } : undefined}
      >
        <View style={styles.tableWrapper}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, { width: 40 }]}>
              <TouchableOpacity onPress={() => {
                if (selectedContacts.length === filteredContacts.length) {
                  setSelectedContacts([]);
                } else {
                  setSelectedContacts(filteredContacts.map(c => c.id));
                }
              }}>
                <Ionicons 
                  name={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0 ? "checkbox" : "square-outline"} 
                  size={18} 
                  color={COLORS.gray} 
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.tableHeaderCellText, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableHeaderCellText, { flex: 1.5 }]}>Phone</Text>
            <Text style={[styles.tableHeaderCellText, { flex: 2 }]}>Email</Text>
            <Text style={[styles.tableHeaderCellText, { flex: 1 }]}>Country</Text>
            <Text style={[styles.tableHeaderCellText, { flex: 1.5 }]}>Tags</Text>
            <Text style={[styles.tableHeaderCellText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
          </View>

          {/* Table Body */}
          <ScrollView
            style={styles.tableBody}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          >
            {filteredContacts.map((contact) => (
              <View 
                key={contact.id} 
                style={[
                  styles.tableRow,
                  selectedContacts.includes(contact.id) && styles.tableRowSelected
                ]}
              >
                <View style={[styles.tableCell, { width: 40 }]}>
                  <TouchableOpacity onPress={() => toggleContactSelection(contact.id)}>
                    <Ionicons 
                      name={selectedContacts.includes(contact.id) ? "checkbox" : "square-outline"} 
                      size={18} 
                      color={selectedContacts.includes(contact.id) ? COLORS.primary : COLORS.gray} 
                    />
                  </TouchableOpacity>
                </View>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                  <View style={styles.tableAvatar}>
                    <Text style={styles.tableAvatarText}>{contact.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.tableCellText}>{contact.name}</Text>
                </View>
                <Text style={[styles.tableCellText, { flex: 1.5 }]}>{contact.phone}</Text>
                <Text style={[styles.tableCellText, { flex: 2, color: COLORS.gray }]} numberOfLines={1}>
                  {contact.email || '-'}
                </Text>
                <Text style={[styles.tableCellText, { flex: 1 }]}>{contact.country}</Text>
                <View style={[styles.tableCell, { flex: 1.5, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }]}>
                  {contact.tags.slice(0, 2).map((tag, i) => (
                    <View key={i} style={styles.tableTag}>
                      <Text style={styles.tableTagText}>{tag}</Text>
                    </View>
                  ))}
                  {contact.tags.length > 2 && (
                    <Text style={styles.moreTags}>+{contact.tags.length - 2}</Text>
                  )}
                </View>
                <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                  <TouchableOpacity style={styles.tableActionBtn}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tableActionBtn, { backgroundColor: COLORS.dangerLight }]}
                    onPress={() => handleDeleteContact(contact.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Contacts</Text>
        <View style={styles.headerRight}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'card' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('card')}
            >
              <Ionicons name="grid" size={18} color={viewMode === 'card' ? COLORS.white : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'table' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('table')}
            >
              <Ionicons name="list" size={18} color={viewMode === 'table' ? COLORS.white : COLORS.gray} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowImportModal(true)}>
            <Ionicons name="cloud-upload" size={18} color={COLORS.blue} />
            <Text style={[styles.actionBtnText, { color: COLORS.blue }]}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => setShowAddContactModal(true)}>
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.createGroupBtn} onPress={() => setShowGroupModal(true)}>
          <Ionicons name="folder-open" size={18} color={COLORS.purple} />
        </TouchableOpacity>
      </View>

      {/* Groups */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
        <View style={styles.groupsContainer}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupChip,
                selectedGroup === group.id && styles.groupChipActive,
                { borderColor: group.color }
              ]}
              onPress={() => setSelectedGroup(group.id)}
            >
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={[styles.groupChipText, selectedGroup === group.id && { color: group.color }]}>
                {group.name}
              </Text>
              <Text style={styles.groupCount}>{group.contacts_count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Selected Actions */}
      {selectedContacts.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedContacts.length} selected</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.selectionBtn}
              onPress={() => {
                Alert.alert(
                  'Add to Group',
                  'Select a group',
                  groups.filter(g => g.id !== 'all').map(g => ({
                    text: g.name,
                    onPress: () => handleAddToGroup(g.id)
                  })).concat([{ text: 'Cancel', style: 'cancel' }])
                );
              }}
            >
              <Ionicons name="folder" size={16} color={COLORS.blue} />
              <Text style={[styles.selectionBtnText, { color: COLORS.blue }]}>Add to Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn}>
              <Ionicons name="chatbubbles" size={16} color={COLORS.success} />
              <Text style={[styles.selectionBtnText, { color: COLORS.success }]}>Send Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn} onPress={() => setSelectedContacts([])}>
              <Ionicons name="close" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      {viewMode === 'card' ? renderCardView() : renderTableView()}

      {/* Add Contact Modal */}
      <Modal visible={showAddContactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContactModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={newContact.name}
                onChangeText={text => setNewContact(prev => ({ ...prev, name: text }))}
                placeholderTextColor={COLORS.gray}
              />
              
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1234567890"
                value={newContact.phone}
                onChangeText={text => setNewContact(prev => ({ ...prev, phone: text }))}
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
              />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={newContact.email}
                onChangeText={text => setNewContact(prev => ({ ...prev, email: text }))}
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
              />
              
              <Text style={styles.inputLabel}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="customer, vip"
                value={newContact.tags}
                onChangeText={text => setNewContact(prev => ({ ...prev, tags: text }))}
                placeholderTextColor={COLORS.gray}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddContactModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddContact} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Add Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={showImportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Contacts</Text>
              <TouchableOpacity onPress={resetImportModal}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {/* Import Type Selection */}
              {!importType && !importResult && (
                <View>
                  <Text style={styles.importSubtitle}>Choose import method</Text>
                  
                  {/* CSV Option */}
                  <View style={styles.importOptionContainer}>
                    <TouchableOpacity 
                      style={styles.importOption}
                      onPress={() => {
                        if (isWeb) {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.csv';
                          input.onchange = handleFileSelect;
                          input.click();
                        } else {
                          setImportType('csv');
                        }
                      }}
                    >
                      <View style={[styles.importOptionIcon, { backgroundColor: COLORS.successLight }]}>
                        <Ionicons name="document-text" size={28} color={COLORS.success} />
                      </View>
                      <View style={styles.importOptionInfo}>
                        <Text style={styles.importOptionTitle}>CSV File</Text>
                        <Text style={styles.importOptionDesc}>Import from .csv file</Text>
                      </View>
                      <Ionicons name="cloud-upload" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.downloadTemplateBtn}
                      onPress={() => {
                        if (isWeb) {
                          window.open('/api/unitxt/contacts/template/csv', '_blank');
                        }
                      }}
                    >
                      <Ionicons name="download" size={16} color={COLORS.success} />
                      <Text style={[styles.downloadTemplateText, { color: COLORS.success }]}>Download CSV Template</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Excel Option */}
                  <View style={styles.importOptionContainer}>
                    <TouchableOpacity 
                      style={styles.importOption}
                      onPress={() => {
                        if (isWeb) {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.xlsx,.xls';
                          input.onchange = handleFileSelect;
                          input.click();
                        } else {
                          setImportType('excel');
                        }
                      }}
                    >
                      <View style={[styles.importOptionIcon, { backgroundColor: COLORS.blueLight }]}>
                        <Ionicons name="grid" size={28} color={COLORS.blue} />
                      </View>
                      <View style={styles.importOptionInfo}>
                        <Text style={styles.importOptionTitle}>Excel File</Text>
                        <Text style={styles.importOptionDesc}>Import from .xlsx or .xls file</Text>
                      </View>
                      <Ionicons name="cloud-upload" size={20} color={COLORS.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.downloadTemplateBtn}
                      onPress={() => {
                        if (isWeb) {
                          window.open('/api/unitxt/contacts/template/excel', '_blank');
                        }
                      }}
                    >
                      <Ionicons name="download" size={16} color={COLORS.blue} />
                      <Text style={[styles.downloadTemplateText, { color: COLORS.blue }]}>Download Excel Template</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.importNote}>
                    <Ionicons name="information-circle" size={16} color={COLORS.gray} />
                    <Text style={styles.importNoteText}>
                      Required columns: name, phone{'\n'}
                      Optional columns: email, country, tags
                    </Text>
                  </View>
                </View>
              )}
              
              {/* File Selected State */}
              {selectedFile && !importResult && (
                <View>
                  <View style={styles.selectedFileCard}>
                    <View style={[styles.importOptionIcon, { 
                      backgroundColor: importType === 'excel' ? COLORS.blueLight : COLORS.successLight 
                    }]}>
                      <Ionicons 
                        name={importType === 'excel' ? 'grid' : 'document-text'} 
                        size={24} 
                        color={importType === 'excel' ? COLORS.blue : COLORS.success} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                      <Text style={styles.selectedFileSize}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedFile(null); setImportType(null); }}>
                      <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.importBtn}
                    onPress={handleImportContacts}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                        <Text style={styles.importBtnText}>Start Import</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Import Result */}
              {importResult && (
                <View>
                  <View style={styles.importResultIcon}>
                    <Ionicons 
                      name={importResult.imported > 0 ? 'checkmark-circle' : 'alert-circle'} 
                      size={64} 
                      color={importResult.imported > 0 ? COLORS.success : COLORS.warning} 
                    />
                  </View>
                  <Text style={styles.importResultTitle}>
                    {importResult.imported > 0 ? 'Import Successful!' : 'Import Complete'}
                  </Text>
                  
                  <View style={styles.importResultStats}>
                    <View style={styles.importResultStat}>
                      <Text style={[styles.importResultValue, { color: COLORS.success }]}>
                        {importResult.imported}
                      </Text>
                      <Text style={styles.importResultLabel}>Imported</Text>
                    </View>
                    <View style={styles.importResultStat}>
                      <Text style={[styles.importResultValue, { color: COLORS.warning }]}>
                        {importResult.duplicates}
                      </Text>
                      <Text style={styles.importResultLabel}>Duplicates</Text>
                    </View>
                    {importResult.errors.length > 0 && (
                      <View style={styles.importResultStat}>
                        <Text style={[styles.importResultValue, { color: COLORS.danger }]}>
                          {importResult.errors.length}
                        </Text>
                        <Text style={styles.importResultLabel}>Errors</Text>
                      </View>
                    )}
                  </View>
                  
                  {importResult.errors.length > 0 && (
                    <View style={styles.importErrors}>
                      <Text style={styles.importErrorsTitle}>Errors:</Text>
                      {importResult.errors.slice(0, 3).map((err, i) => (
                        <Text key={i} style={styles.importErrorText}>• {err}</Text>
                      ))}
                    </View>
                  )}
                  
                  <TouchableOpacity style={styles.importBtn} onPress={resetImportModal}>
                    <Text style={styles.importBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={showGroupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 350 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., VIP Customers"
                value={newGroup.name}
                onChangeText={text => setNewGroup(prev => ({ ...prev, name: text }))}
                placeholderTextColor={COLORS.gray}
              />
              
              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorPicker}>
                {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newGroup.color === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setNewGroup(prev => ({ ...prev, color }))}
                  />
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGroupModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateGroup} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Create</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  createGroupBtn: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 10,
  },
  groupsScroll: {
    maxHeight: 50,
    marginBottom: 12,
  },
  groupsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
  },
  groupChipActive: {
    backgroundColor: COLORS.lightGray,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  groupCount: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  selectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  selectionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  contactsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  contactCardSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  contactPhone: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  tag: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.blue,
    fontWeight: '600',
  },
  moreTags: {
    fontSize: 10,
    color: COLORS.gray,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  // Table View
  tableContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableWrapper: {
    flex: 1,
    minWidth: isWeb ? '100%' : 800,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableHeaderCell: {
    justifyContent: 'center',
  },
  tableHeaderCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableRowSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  tableTag: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tableTagText: {
    fontSize: 10,
    color: COLORS.blue,
    fontWeight: '600',
  },
  tableActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 12,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.dark,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Import Modal Styles
  importSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  importOptionContainer: {
    marginBottom: 16,
  },
  importOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  downloadTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  downloadTemplateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  importOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  importOptionInfo: {
    flex: 1,
  },
  importOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  importOptionDesc: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  importNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.blueLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  importNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.blue,
    lineHeight: 18,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedFileName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  selectedFileSize: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  importBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  importResultIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  importResultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 20,
  },
  importResultStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
  },
  importResultStat: {
    alignItems: 'center',
  },
  importResultValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  importResultLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  importErrors: {
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  importErrorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 8,
  },
  importErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginBottom: 4,
  },
});
