import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  ScrollView,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { adminUsersApi, locationsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';

const COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  danger: '#DC2626',
  white: '#FFFFFF',
  dark: '#1F2937',
  gray: '#6B7280',
};

const ROLES = [
  { value: 'admin', label: 'Admin', color: '#DC2626' },
  { value: 'manager', label: 'Manager', color: '#2563EB' },
  { value: 'sales_staff', label: 'Sales Staff', color: '#10B981' },
  { value: 'front_desk', label: 'Front Desk', color: '#8B5CF6' },
  { value: 'finance', label: 'Finance', color: '#F59E0B' },
];

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffManagement() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user: currentUser } = useAuthStore();
  const { staffView, setStaffView } = useViewSettingsStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.phone && user.phone.toLowerCase().includes(query))
    );
  });

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('sales_staff');
  const [formLocationId, setFormLocationId] = useState<string | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  
  // Locations state
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [formTouched, setFormTouched] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});

  const validateName = (value: string) => {
    if (!value.trim()) return 'Name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  };

  const validatePassword = (value: string, isEditing: boolean) => {
    if (!isEditing && !value) return 'Password is required';
    if (value && value.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  };

  const handleFieldBlur = (field: 'name' | 'email' | 'password') => {
    setFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateName(formName) }));
    } else if (field === 'email') {
      setFormErrors(prev => ({ ...prev, email: validateEmail(formEmail) }));
    } else if (field === 'password') {
      setFormErrors(prev => ({ ...prev, password: validatePassword(formPassword, !!editingUser) }));
    }
  };

  // Check admin/manager access
  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      Alert.alert('Access Denied', 'Only admins and managers can access this page');
      router.back();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await adminUsersApi.getAll();
      setUsers(response.data);
    } catch (error) {
      console.log('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data);
    } catch (error) {
      console.log('Failed to fetch locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
    fetchLocations();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('sales_staff');
    setFormLocationId(null);
    setEditingUser(null);
    setFormErrors({});
    setFormTouched({});
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      await adminUsersApi.delete(userToDelete.id);
      Alert.alert('Success', 'Staff member deleted successfully');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveUser = async () => {
    // Validate all required fields
    setFormTouched({ name: true, email: true, password: true });
    const nameError = validateName(formName);
    const emailError = validateEmail(formEmail);
    const passwordError = validatePassword(formPassword, !!editingUser);
    setFormErrors({ name: nameError, email: emailError, password: passwordError });

    if (nameError || emailError || passwordError) {
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await adminUsersApi.update(editingUser.id, {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim() || undefined,
          role: formRole,
          assigned_location_id: formLocationId || undefined,
        });
        setSuccessMessage({ title: 'Staff Updated!', subtitle: `${formName} has been updated successfully.` });
      } else {
        console.log('Creating new staff member:', { name: formName, email: formEmail, role: formRole });
        await adminUsersApi.create({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          phone: formPhone.trim() || undefined,
          role: formRole,
          assigned_location_id: formLocationId || undefined,
        });
        setSuccessMessage({ title: 'Staff Added!', subtitle: `${formName} has been added as ${ROLES.find(r => r.value === formRole)?.label || formRole}.` });
      }

      resetForm();
      setShowAddModal(false);
      setShowSuccessModal(true);
      fetchUsers();
    } catch (error: any) {
      console.error('Staff save error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Failed to save staff member. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormRole(user.role);
    setFormLocationId((user as any).assigned_location_id || null);
    setFormErrors({});
    setFormTouched({});
    setShowAddModal(true);
  };

  const handleDeactivateUser = (user: User) => {
    setUserToDeactivate(user);
    setShowDeleteModal(true);
  };

  const executeDeactivate = async () => {
    if (!userToDeactivate) return;
    
    setDeleting(true);
    try {
      await adminUsersApi.deactivate(userToDeactivate.id);
      setShowDeleteModal(false);
      setSuccessMessage({ title: 'User Deactivated', subtitle: `${userToDeactivate.name} has been deactivated.` });
      setUserToDeactivate(null);
      setShowSuccessModal(true);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to deactivate user');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || { label: role, color: '#6B7280' };
  };

  const cancelDeactivate = () => {
    setShowDeleteModal(false);
    setUserToDeactivate(null);
  };

  const renderUserGrid = ({ item }: { item: User }) => {
    const roleInfo = getRoleInfo(item.role);
    const assignedLocation = locations.find(l => l.id === (item as any).assigned_location_id);
    
    const handleEdit = () => {
      handleEditUser(item);
    };
    
    const handleDeactivate = () => {
      setUserToDeactivate(item);
      setShowDeleteModal(true);
    };
    
    const handleDelete = () => {
      setUserToDelete(item);
      setShowDeleteConfirm(true);
    };

    return (
      <View style={[styles.userCard, !item.is_active && styles.userCardInactive]}>
        <View style={styles.userContent}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={24} color={roleInfo.color} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.name}</Text>
              {!item.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
            {/* Location Badge */}
            {assignedLocation && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color="#0EA5E9" />
                <Text style={styles.locationBadgeText}>{assignedLocation.name}</Text>
              </View>
            )}
          </View>
          <View style={[styles.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
            <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
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
          {item.id !== currentUser?.id && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.6}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderUserTable = ({ item }: { item: User }) => {
    const roleInfo = getRoleInfo(item.role);
    
    const handleEdit = () => {
      handleEditUser(item);
    };
    
    const handleDeactivate = () => {
      setUserToDeactivate(item);
      setShowDeleteModal(true);
    };

    return (
      <View style={[styles.tableRow, !item.is_active && styles.tableRowInactive]}>
        <View style={[styles.tableCell, { width: 40 }]}>
          <View style={[styles.tableAvatar, { backgroundColor: `${roleInfo.color}15` }]}>
            <Ionicons name="person" size={16} color={roleInfo.color} />
          </View>
        </View>
        <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.tableCellEmail]} numberOfLines={1}>{item.email}</Text>
        <Text style={[styles.tableCell, styles.tableCellPhone]}>{item.phone || '-'}</Text>
        <View style={[styles.tableCell, styles.tableCellRole]}>
          <View style={[styles.roleBadgeSmall, { backgroundColor: `${roleInfo.color}15` }]}>
            <Text style={[styles.roleTextSmall, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellStatus]}>
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity style={styles.tableActionButton} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          {item.is_active && item.id !== currentUser?.id && (
            <TouchableOpacity style={styles.tableActionButton} onPress={handleDeactivate}>
              <Ionicons name="person-remove-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 40 }]}></Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellEmail]}>Email</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellPhone]}>Phone</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellRole]}>Role</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStatus]}>Status</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

  const renderUser = isWeb && staffView === 'table' ? renderUserTable : renderUserGrid;

  if (currentUser?.role !== 'admin') {
    return null;
  }

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
            <Text style={styles.webPageTitle}>Staff</Text>
            <Text style={styles.webPageSubtitle}>{users.length} team member(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={staffView}
              onToggle={setStaffView}
            />
            <TouchableOpacity
              style={styles.webCreateBtn}
              onPress={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Staff</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Staff</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search Row */}
            <View style={styles.webCardHeader}>
              <Text style={styles.webCardTitle}>{filteredUsers.length} Staff Members</Text>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#6B7280"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Table Header for table view */}
            {staffView === 'table' && filteredUsers.length > 0 && <TableHeader />}
            
            <FlatList
              data={filteredUsers}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              key={`web-${staffView}`}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={staffView === 'table' ? styles.webTableList : styles.webGridList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.webEmptyState}>
                  <Ionicons name="people-outline" size={64} color="#6B7280" />
                  <Text style={styles.webEmptyText}>
                    {searchQuery ? 'No staff match your search' : 'No Staff Members'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.webEmptyBtn} onPress={() => setShowAddModal(true)}>
                      <Text style={styles.webEmptyBtnText}>Add First Staff</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileCardContainer}>
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listInsideCard}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="No Staff Members"
                message="Add your first team member"
                actionLabel="Add Staff"
                onAction={() => setShowAddModal(true)}
              />
            }
          />
        </View>
      )}

      <WebModal
        visible={showAddModal}
        onClose={() => {
          resetForm();
          setShowAddModal(false);
        }}
        title={editingUser ? 'Edit Staff Member' : 'Add Staff Member'}
        subtitle={editingUser ? 'Update staff details and permissions' : 'Add a new team member to your business'}
        icon={editingUser ? 'person-outline' : 'person-add-outline'}
        iconColor="#2563EB"
        maxWidth={480}
      >
        <View style={styles.inputWrapper}>
          <Input
            label="Full Name *"
            placeholder="Enter full name"
            value={formName}
            onChangeText={(text) => {
              setFormName(text);
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
            label="Email *"
            placeholder="Enter email"
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

        {!editingUser && (
          <View style={styles.inputWrapper}>
            <Input
              label="Password *"
              placeholder="Create password"
              value={formPassword}
              onChangeText={(text) => {
                setFormPassword(text);
                if (formTouched.password) setFormErrors(prev => ({ ...prev, password: validatePassword(text, false) }));
              }}
              onBlur={() => handleFieldBlur('password')}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={formTouched.password && formErrors.password ? '#DC2626' : '#6B7280'} />}
            />
            {formTouched.password && formErrors.password && (
              <View style={styles.fieldError}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.fieldErrorText}>{formErrors.password}</Text>
              </View>
            )}
          </View>
        )}

        <Input
          label="Phone"
          placeholder="Enter phone (optional)"
          value={formPhone}
          onChangeText={setFormPhone}
          keyboardType="phone-pad"
          leftIcon={<Ionicons name="call-outline" size={20} color="#6B7280" />}
        />

        <Text style={styles.roleLabel}>Role *</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.roleOption,
                formRole === role.value && {
                  borderColor: role.color,
                  backgroundColor: `${role.color}10`,
                },
              ]}
              onPress={() => setFormRole(role.value)}
            >
              <View
                style={[
                  styles.roleOptionDot,
                  { backgroundColor: role.color },
                ]}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  formRole === role.value && { color: role.color },
                ]}
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Assignment */}
        {locations.length > 0 && (
          <View style={styles.locationSection}>
            <Text style={styles.roleLabel}>Assigned Location</Text>
            
            {/* Search box for locations if there are many */}
            {locations.length > 5 && (
              <View style={styles.locationSearchBox}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.locationSearchInput}
                  placeholder="Search locations..."
                  placeholderTextColor="#9CA3AF"
                  value={locationSearchQuery}
                  onChangeText={setLocationSearchQuery}
                />
                {locationSearchQuery ? (
                  <TouchableOpacity onPress={() => setLocationSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            
            <ScrollView style={styles.locationOptionsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
              <View style={styles.locationOptions}>
                {/* All Locations option */}
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    !formLocationId && styles.locationOptionSelected,
                  ]}
                  onPress={() => setFormLocationId(null)}
                >
                  <Ionicons name="globe-outline" size={18} color={!formLocationId ? "#2563EB" : "#6B7280"} />
                  <Text style={[styles.locationOptionText, !formLocationId && styles.locationOptionTextSelected]}>
                    All Locations
                  </Text>
                </TouchableOpacity>
                
                {/* Filtered locations */}
                {locations
                  .filter(loc => 
                    !locationSearchQuery || 
                    loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                    (loc.address && loc.address.toLowerCase().includes(locationSearchQuery.toLowerCase()))
                  )
                  .map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationOption,
                        formLocationId === loc.id && styles.locationOptionSelected,
                      ]}
                      onPress={() => setFormLocationId(loc.id)}
                    >
                      <Ionicons name="storefront-outline" size={20} color={formLocationId === loc.id ? "#2563EB" : "#6B7280"} />
                      <Text style={[styles.locationOptionText, formLocationId === loc.id && styles.locationOptionTextSelected]}>
                        {loc.name}
                      </Text>
                      <View style={[styles.locationOptionCheck, formLocationId === loc.id && styles.locationOptionCheckSelected]}>
                        {formLocationId === loc.id && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  ))
                }
              </View>
            </ScrollView>
            
            {/* Show count when filtered */}
            {locationSearchQuery && (
              <Text style={styles.locationFilterCount}>
                Showing {locations.filter(loc => loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase())).length} of {locations.length} locations
              </Text>
            )}
          </View>
        )}

        <Button
          title={editingUser ? 'Update Staff' : 'Add Staff'}
          onPress={handleSaveUser}
          loading={saving}
          style={styles.saveButton}
        />

        {editingUser && editingUser.id !== currentUser?.id && editingUser.is_active && (
          <TouchableOpacity
            style={styles.deleteButtonModal}
            onPress={() => {
              setShowAddModal(false);
              setTimeout(() => handleDeactivateUser(editingUser), 300);
            }}
          >
            <Ionicons name="person-remove-outline" size={20} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Deactivate Staff Member</Text>
          </TouchableOpacity>
        )}
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

      {/* Deactivate Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Deactivate Staff"
        message={userToDeactivate ? `Are you sure you want to deactivate "${userToDeactivate.name}"? They will no longer be able to log in.` : ''}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onConfirm={executeDeactivate}
        onCancel={cancelDeactivate}
        variant="danger"
        loading={deleting}
      />
      
      {/* Delete Permanently Modal */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete "${userToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteUser}
        onCancel={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
        variant="danger"
        loading={deleting}
        icon="trash-outline"
      />
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
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
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
  list: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    flexDirection: 'row',
    alignItems: 'center',
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
  userCardInactive: {
    opacity: 0.6,
  },
  userContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  userActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deactivateButton: {
    padding: 4,
  },
  deactivateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FEE2E2',
    minHeight: 48,
    cursor: 'pointer',
  },
  deactivateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    minHeight: 48,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '500',
  },
  locationSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  locationSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
  },
  locationOptionsScroll: {
    maxHeight: 200,
  },
  locationOptions: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  locationFilterCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  locationOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  locationOptionText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  locationOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  locationOptionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionCheckSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  roleOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 16,
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
  deleteButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    padding: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableList: {
    padding: 20,
    paddingTop: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowInactive: {
    opacity: 0.6,
  },
  tableCell: {
    fontSize: 14,
    color: '#111827',
  },
  tableCellName: {
    flex: 2,
    fontWeight: '500',
  },
  tableCellEmail: {
    flex: 2.5,
    color: '#6B7280',
  },
  tableCellPhone: {
    flex: 1.5,
    color: '#6B7280',
  },
  tableCellRole: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  tableCellStatus: {
    flex: 1,
    alignItems: 'flex-start',
  },
  tableCellActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  tableActionButton: {
    padding: 4,
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
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  successBtn: { marginTop: 24, backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  successBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

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
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    gap: 8,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  // Location search styles
  locationSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  locationOptionsScroll: {
    maxHeight: 200,
    marginBottom: 8,
  },
  locationFilterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
