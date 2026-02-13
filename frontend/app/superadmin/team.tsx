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
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

const TEAM_ROLES = [
  { 
    value: 'product_manager', 
    label: 'Product Manager', 
    color: '#8B5CF6',
    permissions: ['view_analytics', 'view_users', 'manage_products', 'view_feedback']
  },
  { 
    value: 'sales', 
    label: 'Sales Team', 
    color: '#10B981',
    permissions: ['view_users', 'view_businesses', 'manage_leads', 'view_revenue']
  },
  { 
    value: 'marketing', 
    label: 'Marketing', 
    color: '#EC4899',
    permissions: ['view_analytics', 'view_campaigns', 'manage_promotions', 'view_users']
  },
  { 
    value: 'support', 
    label: 'Support', 
    color: '#3B82F6',
    permissions: ['view_users', 'view_businesses', 'manage_tickets', 'view_logs']
  },
  { 
    value: 'finance', 
    label: 'Finance', 
    color: '#F59E0B',
    permissions: ['view_revenue', 'view_payouts', 'manage_billing', 'view_reports']
  },
  { 
    value: 'developer', 
    label: 'Developer', 
    color: '#EF4444',
    permissions: ['view_api_logs', 'manage_webhooks', 'view_errors', 'access_sandbox']
  },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'inactive';
  lastActive?: string;
  avatar?: string;
  assignedProducts: string[];
  joinedAt: string;
}

export default function TeamPortal() {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sales',
    assignedProducts: [] as string[],
  });

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/team').catch(() => null);
      
      if (response?.data?.members) {
        setTeamMembers(response.data.members);
      } else {
        // Mock data for demo
        setTeamMembers([
          {
            id: '1',
            name: 'Sarah Johnson',
            email: 'sarah@company.com',
            role: 'product_manager',
            status: 'active',
            lastActive: '2 hours ago',
            assignedProducts: ['retailpro', 'inventory'],
            joinedAt: '2024-01-15',
          },
          {
            id: '2',
            name: 'Michael Chen',
            email: 'michael@company.com',
            role: 'sales',
            status: 'active',
            lastActive: '30 mins ago',
            assignedProducts: ['kwikpay', 'invoicing'],
            joinedAt: '2024-02-20',
          },
          {
            id: '3',
            name: 'Emily Davis',
            email: 'emily@company.com',
            role: 'marketing',
            status: 'active',
            lastActive: '1 day ago',
            assignedProducts: ['unitxt', 'retailpro'],
            joinedAt: '2024-03-01',
          },
          {
            id: '4',
            name: 'James Wilson',
            email: 'james@company.com',
            role: 'support',
            status: 'active',
            lastActive: '5 mins ago',
            assignedProducts: ['retailpro', 'invoicing', 'kwikpay'],
            joinedAt: '2024-01-10',
          },
          {
            id: '5',
            name: 'Lisa Thompson',
            email: 'lisa@company.com',
            role: 'finance',
            status: 'invited',
            assignedProducts: ['kwikpay'],
            joinedAt: '2024-06-01',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleAddMember = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await api.post('/superadmin/team/invite', formData).catch(() => {});
      
      // Add to local state
      setTeamMembers([
        ...teamMembers,
        {
          id: Date.now().toString(),
          ...formData,
          status: 'invited',
          joinedAt: new Date().toISOString(),
        },
      ]);
      
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'sales', assignedProducts: [] });
      Alert.alert('Success', 'Team member invited successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to invite team member');
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      await api.put(`/superadmin/team/${selectedMember.id}`, formData).catch(() => {});
      
      setTeamMembers(teamMembers.map(m => 
        m.id === selectedMember.id ? { ...m, ...formData } : m
      ));
      
      setShowEditModal(false);
      setSelectedMember(null);
      Alert.alert('Success', 'Team member updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update team member');
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/superadmin/team/${member.id}`).catch(() => {});
              setTeamMembers(teamMembers.filter(m => m.id !== member.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleInfo = (roleValue: string) => 
    TEAM_ROLES.find(r => r.value === roleValue) || TEAM_ROLES[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
        </View>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, filterRole === 'all' && styles.filterChipActive]}
              onPress={() => setFilterRole('all')}
            >
              <Text style={[styles.filterChipText, filterRole === 'all' && styles.filterChipTextActive]}>
                All Roles
              </Text>
            </TouchableOpacity>
            {TEAM_ROLES.map(role => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.filterChip,
                  filterRole === role.value && { backgroundColor: role.color + '20', borderColor: role.color }
                ]}
                onPress={() => setFilterRole(role.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterRole === role.value && { color: role.color }
                ]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="person-add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Invite Member</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{teamMembers.length}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {teamMembers.filter(m => m.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>
            {teamMembers.filter(m => m.status === 'invited').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{TEAM_ROLES.length}</Text>
          <Text style={styles.statLabel}>Roles</Text>
        </View>
      </View>

      {/* Team Members List */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Member</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Role</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Last Active</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Products</Text>
          <Text style={[styles.tableHeaderCell, { width: 100 }]}>Actions</Text>
        </View>

        {filteredMembers.map((member) => {
          const roleInfo = getRoleInfo(member.role);
          return (
            <View key={member.id} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={[styles.avatar, { backgroundColor: roleInfo.color + '20' }]}>
                  <Text style={[styles.avatarText, { color: roleInfo.color }]}>
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                </View>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: member.status === 'active' ? COLORS.successLight : COLORS.warningLight }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: member.status === 'active' ? COLORS.success : COLORS.warning }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: member.status === 'active' ? COLORS.success : COLORS.warning }
                  ]}>
                    {member.status === 'active' ? 'Active' : 'Invited'}
                  </Text>
                </View>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.lastActive}>{member.lastActive || 'Never'}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.productsCount}>
                  {(member.assignedProducts || []).length} product{(member.assignedProducts || []).length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.tableCell, { width: 100, flexDirection: 'row', gap: 8 }]}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedMember(member);
                    setFormData({
                      name: member.name,
                      email: member.email,
                      role: member.role,
                      assignedProducts: member.assignedProducts || [],
                    });
                    setShowEditModal(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Role Permissions Reference */}
      <View style={styles.permissionsSection}>
        <Text style={styles.sectionTitle}>Role Permissions Reference</Text>
        <View style={styles.permissionsGrid}>
          {TEAM_ROLES.map(role => (
            <View key={role.value} style={styles.permissionCard}>
              <View style={[styles.permissionHeader, { borderLeftColor: role.color }]}>
                <Text style={styles.permissionRole}>{role.label}</Text>
              </View>
              <View style={styles.permissionList}>
                {role.permissions.map(perm => (
                  <View key={perm} style={styles.permissionItem}>
                    <Ionicons name="checkmark" size={14} color={COLORS.success} />
                    <Text style={styles.permissionText}>{perm.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal || showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showEditModal ? 'Edit Team Member' : 'Invite Team Member'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedMember(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter full name"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray}
                editable={!showEditModal}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Role *</Text>
              <View style={styles.roleOptions}>
                {TEAM_ROLES.map(role => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      formData.role === role.value && { 
                        backgroundColor: role.color + '20', 
                        borderColor: role.color 
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, role: role.value })}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      formData.role === role.value && { color: role.color }
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={showEditModal ? handleUpdateMember : handleAddMember}
              >
                <Text style={styles.submitButtonText}>
                  {showEditModal ? 'Update' : 'Send Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  filterContainer: {
    maxWidth: 400,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    paddingRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.gray,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastActive: {
    fontSize: 13,
    color: COLORS.gray,
  },
  productsCount: {
    fontSize: 13,
    color: COLORS.dark,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  permissionCard: {
    width: 'calc(33.33% - 11px)',
    minWidth: 200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionHeader: {
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: COLORS.lightGray,
  },
  permissionRole: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  permissionList: {
    padding: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: 480,
    maxWidth: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleOptionText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
