import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  business?: string;
  status: 'active' | 'inactive' | 'suspended';
  products: string[];
  created_at: string;
  last_login?: string;
  phone?: string;
}

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const usersPerPage = 10;

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/users');
      setUsers(response?.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.business?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleStatusChange = async (user: User, newStatus: string) => {
    Alert.alert(
      'Change User Status',
      `Change ${user.name}'s status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.put(`/superadmin/users/${user.id}/status?status=${newStatus}`);
              setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus as any } : u));
              Alert.alert('Success', 'User status updated');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/superadmin/users', formData);
      if (response.data?.success) {
        Alert.alert('Success', 'User created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const updateData: any = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.email) updateData.email = formData.email;
      if (formData.role) updateData.role = formData.role;
      if (formData.phone) updateData.phone = formData.phone;

      const response = await api.put(`/superadmin/users/${selectedUser.id}`, updateData);
      if (response.data?.success) {
        Alert.alert('Success', 'User updated successfully');
        setShowEditModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/superadmin/users/${user.id}`);
              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleExportUsers = async () => {
    try {
      const response = await api.get('/superadmin/users/export?format=csv');
      const users = response.data?.users || [];
      
      // Create CSV content
      const headers = ['Name', 'Email', 'Role', 'Business', 'Status', 'Phone', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...users.map((u: any) => [
          u.name, u.email, u.role, u.business || '', u.status, u.phone || '', u.created_at
        ].join(','))
      ].join('\n');

      // For web, trigger download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      Alert.alert('Success', `Exported ${users.length} users`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export users');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'admin', phone: '' });
    setSelectedUser(null);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'inactive': return COLORS.warning;
      case 'suspended': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with Actions */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>User Management</Text>
          <Text style={styles.pageSubtitle}>Manage all platform users</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportUsers} data-testid="export-users-btn">
            <Ionicons name="download-outline" size={18} color={COLORS.primary} />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)} data-testid="create-user-btn">
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{users.filter(u => u.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{users.filter(u => u.status === 'inactive').length}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{users.filter(u => u.status === 'suspended').length}</Text>
          <Text style={styles.statLabel}>Suspended</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput style={styles.searchInput} placeholder="Search users..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={COLORS.gray} />
        </View>
        <View style={styles.filterChips}>
          {['all', 'active', 'inactive', 'suspended'].map(status => (
            <TouchableOpacity key={status} style={[styles.filterChip, filterStatus === status && styles.filterChipActive]} onPress={() => setFilterStatus(status)}>
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>{status === 'all' ? 'All Status' : status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterChips}>
          {['all', 'admin', 'manager', 'cashier'].map(role => (
            <TouchableOpacity key={role} style={[styles.filterChip, filterRole === role && styles.filterChipActive]} onPress={() => setFilterRole(role)}>
              <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>{role === 'all' ? 'All Roles' : role}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Users Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>User</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Business</Text>
          <Text style={styles.tableHeaderCell}>Role</Text>
          <Text style={styles.tableHeaderCell}>Products</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={styles.tableHeaderCell}>Last Login</Text>
          <Text style={[styles.tableHeaderCell, { width: 140 }]}>Actions</Text>
        </View>

        {paginatedUsers.map((user) => (
          <View key={user.id} style={styles.tableRow} data-testid={`user-row-${user.id}`}>
            <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.split(' ').map(n => n[0]).join('')}</Text></View>
              <View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>{user.business || '-'}</Text>
            <View style={styles.tableCell}>
              <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{user.role}</Text></View>
            </View>
            <Text style={styles.tableCell}>{user.products?.length || 0} apps</Text>
            <View style={styles.tableCell}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>{user.status}</Text>
              </View>
            </View>
            <Text style={styles.tableCell}>{user.last_login || 'Never'}</Text>
            <View style={[styles.tableCell, { width: 140, flexDirection: 'row', gap: 6 }]}>
              <TouchableOpacity style={styles.actionButton} onPress={() => { setSelectedUser(user); setShowUserModal(true); }} data-testid={`view-user-${user.id}`}>
                <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(user)} data-testid={`edit-user-${user.id}`}>
                <Ionicons name="pencil-outline" size={16} color={COLORS.blue} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleStatusChange(user, user.status === 'active' ? 'suspended' : 'active')}>
                <Ionicons name={user.status === 'active' ? 'ban' : 'checkmark-circle'} size={16} color={user.status === 'active' ? COLORS.warning : COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.dangerLight }]} onPress={() => handleDeleteUser(user)} data-testid={`delete-user-${user.id}`}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {paginatedUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyStateText}>No users found</Text>
          </View>
        )}
      </View>

      {/* Pagination */}
      {totalPages > 0 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>Showing {(currentPage - 1) * usersPerPage + 1}-{Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}</Text>
          <View style={styles.paginationButtons}>
            <TouchableOpacity style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]} onPress={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.gray : COLORS.dark} />
            </TouchableOpacity>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map(page => (
              <TouchableOpacity key={page} style={[styles.pageButton, currentPage === page && styles.pageButtonActive]} onPress={() => setCurrentPage(page)}>
                <Text style={[styles.pageButtonText, currentPage === page && styles.pageButtonTextActive]}>{page}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]} onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
              <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.gray : COLORS.dark} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Create User Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}><Ionicons name="close" size={24} color={COLORS.gray} /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput style={styles.formInput} value={formData.name} onChangeText={(v) => setFormData({...formData, name: v})} placeholder="Enter full name" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput style={styles.formInput} value={formData.email} onChangeText={(v) => setFormData({...formData, email: v})} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Password *</Text>
                <TextInput style={styles.formInput} value={formData.password} onChangeText={(v) => setFormData({...formData, password: v})} placeholder="Enter password" secureTextEntry />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {['admin', 'manager', 'cashier'].map(role => (
                    <TouchableOpacity key={role} style={[styles.roleOption, formData.role === role && styles.roleOptionActive]} onPress={() => setFormData({...formData, role})}>
                      <Text style={[styles.roleOptionText, formData.role === role && styles.roleOptionTextActive]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput style={styles.formInput} value={formData.phone} onChangeText={(v) => setFormData({...formData, phone: v})} placeholder="Enter phone number" keyboardType="phone-pad" />
              </View>
              <TouchableOpacity style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={handleCreateUser} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitButtonText}>Create User</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}><Ionicons name="close" size={24} color={COLORS.gray} /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput style={styles.formInput} value={formData.name} onChangeText={(v) => setFormData({...formData, name: v})} placeholder="Enter full name" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput style={styles.formInput} value={formData.email} onChangeText={(v) => setFormData({...formData, email: v})} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {['admin', 'manager', 'cashier'].map(role => (
                    <TouchableOpacity key={role} style={[styles.roleOption, formData.role === role && styles.roleOptionActive]} onPress={() => setFormData({...formData, role})}>
                      <Text style={[styles.roleOptionText, formData.role === role && styles.roleOptionTextActive]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput style={styles.formInput} value={formData.phone} onChangeText={(v) => setFormData({...formData, phone: v})} placeholder="Enter phone number" keyboardType="phone-pad" />
              </View>
              <TouchableOpacity style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={handleEditUser} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}><Ionicons name="close" size={24} color={COLORS.gray} /></TouchableOpacity>
            </View>
            {selectedUser && (
              <ScrollView>
                <View style={styles.modalUserHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={styles.modalAvatarText}>{selectedUser.name.split(' ').map(n => n[0]).join('')}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                    <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                  </View>
                </View>
                <View style={styles.modalSection}>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Business</Text><Text style={styles.modalValue}>{selectedUser.business || '-'}</Text></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Role</Text><Text style={styles.modalValue}>{selectedUser.role}</Text></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Status</Text><View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedUser.status) + '20' }]}><Text style={[styles.statusText, { color: getStatusColor(selectedUser.status) }]}>{selectedUser.status}</Text></View></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Created</Text><Text style={styles.modalValue}>{selectedUser.created_at}</Text></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Last Login</Text><Text style={styles.modalValue}>{selectedUser.last_login || 'Never'}</Text></View>
                </View>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Products Access</Text>
                  <View style={styles.productsList}>
                    {selectedUser.products?.length > 0 ? selectedUser.products.map(p => (
                      <View key={p} style={styles.productBadge}><Text style={styles.productBadgeText}>{p}</Text></View>
                    )) : <Text style={styles.noProductsText}>No products assigned</Text>}
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionButton} onPress={() => { setShowUserModal(false); openEditModal(selectedUser); }}>
                    <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.modalActionText}>Edit User</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionButton, { borderColor: COLORS.danger }]} onPress={() => { setShowUserModal(false); handleDeleteUser(selectedUser); }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    <Text style={[styles.modalActionText, { color: COLORS.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  exportButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary },
  createButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  filtersRow: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.dark },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.gray, fontWeight: '500', textTransform: 'capitalize' },
  filterChipTextActive: { color: COLORS.primary },
  tableContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.lightGray, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { flex: 1, fontSize: 13, color: COLORS.dark },
  avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  userName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  userEmail: { fontSize: 11, color: COLORS.gray },
  roleBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '500', color: COLORS.dark, textTransform: 'capitalize' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 6, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  actionButton: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: COLORS.gray, marginTop: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paginationInfo: { fontSize: 13, color: COLORS.gray },
  paginationButtons: { flexDirection: 'row', gap: 4 },
  pageButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  pageButtonTextActive: { color: COLORS.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: 500, maxWidth: '90%', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  modalUserHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalAvatar: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalAvatarText: { fontSize: 20, fontWeight: '600', color: COLORS.primary },
  modalUserName: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  modalUserEmail: { fontSize: 14, color: COLORS.gray },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 12, textTransform: 'uppercase' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalLabel: { fontSize: 13, color: COLORS.gray },
  modalValue: { fontSize: 13, color: COLORS.dark, fontWeight: '500' },
  productsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  productBadgeText: { fontSize: 12, fontWeight: '500', color: COLORS.primary, textTransform: 'capitalize' },
  noProductsText: { fontSize: 13, color: COLORS.gray, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  modalActionText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '500', color: COLORS.dark, marginBottom: 8 },
  formInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.dark, backgroundColor: COLORS.lightGray },
  roleSelector: { flexDirection: 'row', gap: 8 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  roleOptionActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  roleOptionText: { fontSize: 13, fontWeight: '500', color: COLORS.gray, textTransform: 'capitalize' },
  roleOptionTextActive: { color: COLORS.primary },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
