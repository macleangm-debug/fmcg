import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const ROLES = [
  { id: 'admin', name: 'Administrator', description: 'Full access to all features', permissions: ['all'] },
  { id: 'manager', name: 'Manager', description: 'Manage transactions and payouts', permissions: ['transactions', 'payouts', 'reports'] },
  { id: 'accountant', name: 'Accountant', description: 'View reports and analytics', permissions: ['reports', 'analytics'] },
  { id: 'support', name: 'Support', description: 'Handle customer inquiries', permissions: ['transactions.view', 'customers'] },
];

const PERMISSIONS = [
  { id: 'transactions', label: 'Transactions', description: 'Create, view, and manage transactions' },
  { id: 'payouts', label: 'Payouts', description: 'Process and manage payouts' },
  { id: 'reports', label: 'Reports', description: 'Access financial reports' },
  { id: 'analytics', label: 'Analytics', description: 'View analytics dashboard' },
  { id: 'settings', label: 'Settings', description: 'Manage account settings' },
  { id: 'users', label: 'User Management', description: 'Manage team members' },
  { id: 'api', label: 'API Access', description: 'Access to API keys and webhooks' },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'disabled';
  lastActive: string;
}

export default function RolesPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('support');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setMembers([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', lastActive: '2 hours ago' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', status: 'active', lastActive: '1 day ago' },
        { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'accountant', status: 'pending', lastActive: 'Never' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setInviting(true);
    setTimeout(() => {
      setMembers([...members, {
        id: Date.now().toString(),
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        lastActive: 'Never',
      }]);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('support');
      setInviting(false);
      Alert.alert('Success', 'Invitation sent successfully');
    }, 1000);
  };

  const handleChangeRole = (memberId: string, newRole: string) => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const handleToggleStatus = (memberId: string) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        return { ...m, status: m.status === 'active' ? 'disabled' : 'active' };
      }
      return m;
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.danger;
      case 'manager': return COLORS.primary;
      case 'accountant': return COLORS.secondary;
      case 'support': return COLORS.purple;
      default: return COLORS.gray;
    }
  };

  const getRoleBg = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.dangerLight;
      case 'manager': return COLORS.primaryLight;
      case 'accountant': return COLORS.secondaryLight;
      case 'support': return COLORS.purpleLight;
      default: return COLORS.lightGray;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Team & Roles</Text>
            <Text style={styles.pageSubtitle}>Manage team members and permissions</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={20} color={COLORS.white} />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="shield" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{ROLES.length}</Text>
            <Text style={styles.statLabel}>Roles</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{members.filter(m => m.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'roles' && styles.tabActive]}
            onPress={() => setActiveTab('roles')}
          >
            <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>
              Roles & Permissions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <View style={styles.section}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                  <Switch
                    value={member.status === 'active'}
                    onValueChange={() => handleToggleStatus(member.id)}
                    trackColor={{ false: COLORS.lightGray, true: COLORS.primaryLight }}
                    thumbColor={member.status === 'active' ? COLORS.primary : COLORS.gray}
                  />
                </View>
                <View style={styles.memberDetails}>
                  <TouchableOpacity
                    style={[styles.roleBadge, { backgroundColor: getRoleBg(member.role) }]}
                    onPress={() => {
                      setSelectedMember(member);
                      setShowRoleModal(true);
                    }}
                  >
                    <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                      {ROLES.find(r => r.id === member.role)?.name || member.role}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={getRoleColor(member.role)} />
                  </TouchableOpacity>
                  <Text style={styles.memberLastActive}>
                    {member.status === 'pending' ? '📧 Invitation pending' : `Last active: ${member.lastActive}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <View style={styles.section}>
            {ROLES.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <View style={[styles.roleIcon, { backgroundColor: getRoleBg(role.id) }]}>
                    <Ionicons
                      name={role.id === 'admin' ? 'shield-checkmark' : role.id === 'manager' ? 'briefcase' : role.id === 'accountant' ? 'calculator' : 'headset'}
                      size={20}
                      color={getRoleColor(role.id)}
                    />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                  <Text style={styles.roleMemberCount}>
                    {members.filter(m => m.role === role.id).length} members
                  </Text>
                </View>
                <View style={styles.rolePermissions}>
                  <Text style={styles.permissionsLabel}>Permissions:</Text>
                  <View style={styles.permissionsList}>
                    {role.permissions[0] === 'all' ? (
                      <View style={styles.permissionBadge}>
                        <Text style={styles.permissionText}>Full Access</Text>
                      </View>
                    ) : (
                      role.permissions.map((perm) => (
                        <View key={perm} style={styles.permissionBadge}>
                          <Text style={styles.permissionText}>{perm}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </View>
            ))}

            {/* Permissions Info */}
            <View style={styles.permissionsCard}>
              <Text style={styles.permissionsCardTitle}>Available Permissions</Text>
              {PERMISSIONS.map((perm) => (
                <View key={perm.id} style={styles.permissionItem}>
                  <View style={styles.permissionItemLeft}>
                    <View style={styles.permissionDot} />
                    <View>
                      <Text style={styles.permissionItemLabel}>{perm.label}</Text>
                      <Text style={styles.permissionItemDesc}>{perm.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={inviteName}
                onChangeText={setInviteName}
                placeholder="John Doe"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="john@example.com"
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.rolePicker}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleOption, inviteRole === role.id && styles.roleOptionActive]}
                    onPress={() => setInviteRole(role.id)}
                  >
                    <Text style={[styles.roleOptionText, inviteRole === role.id && styles.roleOptionTextActive]}>
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, inviting && styles.submitButtonDisabled]}
                onPress={handleInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Send Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal visible={showRoleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => { setShowRoleModal(false); setSelectedMember(null); }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {selectedMember && (
                <View style={styles.selectedMemberInfo}>
                  <Text style={styles.selectedMemberName}>{selectedMember.name}</Text>
                  <Text style={styles.selectedMemberEmail}>{selectedMember.email}</Text>
                </View>
              )}
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.roleSelectOption, selectedMember?.role === role.id && styles.roleSelectOptionActive]}
                  onPress={() => selectedMember && handleChangeRole(selectedMember.id, role.id)}
                >
                  <View style={[styles.roleSelectIcon, { backgroundColor: getRoleBg(role.id) }]}>
                    <Ionicons
                      name={role.id === 'admin' ? 'shield-checkmark' : role.id === 'manager' ? 'briefcase' : role.id === 'accountant' ? 'calculator' : 'headset'}
                      size={20}
                      color={getRoleColor(role.id)}
                    />
                  </View>
                  <View style={styles.roleSelectInfo}>
                    <Text style={styles.roleSelectName}>{role.name}</Text>
                    <Text style={styles.roleSelectDesc}>{role.description}</Text>
                  </View>
                  {selectedMember?.role === role.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  inviteButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  section: {},
  memberCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  memberEmail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  memberDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  roleText: { fontSize: 13, fontWeight: '600' },
  memberLastActive: { fontSize: 12, color: COLORS.gray },
  roleCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1, marginLeft: 12 },
  roleName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  roleDescription: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  roleMemberCount: { fontSize: 12, color: COLORS.gray },
  rolePermissions: { paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  permissionsLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 8 },
  permissionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permissionBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  permissionText: { fontSize: 11, color: COLORS.gray },
  permissionsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginTop: 8 },
  permissionsCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  permissionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  permissionItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  permissionItemLabel: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  permissionItemDesc: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  roleOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border },
  roleOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleOptionText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  roleOptionTextActive: { color: COLORS.white },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  selectedMemberInfo: { backgroundColor: COLORS.lightGray, padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  selectedMemberName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  selectedMemberEmail: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  roleSelectOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.lightGray },
  roleSelectOptionActive: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary },
  roleSelectIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleSelectInfo: { flex: 1, marginLeft: 12 },
  roleSelectName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  roleSelectDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
});
