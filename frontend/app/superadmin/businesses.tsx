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
  purple: '#8B5CF6',
  pink: '#EC4899',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface Business {
  id: string;
  name: string;
  type: string;
  country: string;
  owner: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  products: string[];
  users: number;
  revenue: number;
  created_at: string;
}

export default function BusinessManagement() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchBusinesses = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/businesses').catch(() => null);
      
      setBusinesses(response?.data?.businesses || [
        { id: '1', name: 'TechStore Tanzania', type: 'Retail', country: 'TZ', owner: 'John Mwangi', email: 'john@techstore.tz', status: 'active', products: ['retailpro', 'kwikpay', 'inventory'], users: 12, revenue: 125000, created_at: '2024-01-15' },
        { id: '2', name: 'Safari Tours Ltd', type: 'Services', country: 'KE', owner: 'Mary Ochieng', email: 'mary@safaritours.ke', status: 'active', products: ['invoicing', 'kwikpay'], users: 8, revenue: 85000, created_at: '2024-02-20' },
        { id: '3', name: 'Coffee House', type: 'Restaurant', country: 'TZ', owner: 'David Kimani', email: 'david@coffeehouse.tz', status: 'active', products: ['retailpro', 'inventory'], users: 15, revenue: 92000, created_at: '2024-03-01' },
        { id: '4', name: 'TechCorp Solutions', type: 'Technology', country: 'NG', owner: 'James Wilson', email: 'james@techcorp.com', status: 'suspended', products: ['retailpro'], users: 5, revenue: 45000, created_at: '2024-01-10' },
        { id: '5', name: 'Fashion Hub', type: 'Retail', country: 'TZ', owner: 'Lisa Thompson', email: 'lisa@fashionhub.tz', status: 'active', products: ['retailpro', 'kwikpay'], users: 6, revenue: 68000, created_at: '2024-04-01' },
        { id: '6', name: 'Quick Eats', type: 'Restaurant', country: 'UG', owner: 'Peter Ndegwa', email: 'peter@quickeats.ug', status: 'pending', products: ['retailpro', 'invoicing'], users: 4, revenue: 32000, created_at: '2024-05-15' },
        { id: '7', name: 'Global Trading', type: 'Wholesale', country: 'GH', owner: 'Sarah Johnson', email: 'sarah@globaltrading.gh', status: 'active', products: ['inventory', 'invoicing'], users: 20, revenue: 245000, created_at: '2024-01-25' },
        { id: '8', name: 'Premier Services', type: 'Services', country: 'NG', owner: 'Michael Chen', email: 'michael@premier.ng', status: 'active', products: ['invoicing', 'unitxt'], users: 10, revenue: 156000, created_at: '2024-03-10' },
      ]);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const filteredBusinesses = businesses.filter(biz => {
    const matchesSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || biz.status === filterStatus;
    const matchesProduct = filterProduct === 'all' || biz.products.includes(filterProduct);
    return matchesSearch && matchesStatus && matchesProduct;
  });

  const paginatedBusinesses = filteredBusinesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const totalRevenue = businesses.reduce((sum, b) => sum + b.revenue, 0);
  const totalUsers = businesses.reduce((sum, b) => sum + b.users, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'suspended': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
    return '$' + amount;
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}><Ionicons name="business" size={20} color={COLORS.primary} /></View>
          <Text style={styles.statValue}>{businesses.length}</Text>
          <Text style={styles.statLabel}>Total Businesses</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}><Ionicons name="checkmark-circle" size={20} color={COLORS.success} /></View>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{businesses.filter(b => b.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.blue }]}>
          <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}><Ionicons name="people" size={20} color={COLORS.blue} /></View>
          <Text style={styles.statValue}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.purple }]}>
          <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}><Ionicons name="cash" size={20} color={COLORS.purple} /></View>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput style={styles.searchInput} placeholder="Search businesses..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={COLORS.gray} />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterChips}>
            {['all', 'active', 'pending', 'suspended'].map(status => (
              <TouchableOpacity key={status} style={[styles.filterChip, filterStatus === status && styles.filterChipActive]} onPress={() => setFilterStatus(status)}>
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>{status === 'all' ? 'All' : status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Product:</Text>
          <View style={styles.filterChips}>
            {['all', 'retailpro', 'inventory', 'invoicing', 'kwikpay', 'unitxt'].map(product => (
              <TouchableOpacity key={product} style={[styles.filterChip, filterProduct === product && styles.filterChipActive]} onPress={() => setFilterProduct(product)}>
                <Text style={[styles.filterChipText, filterProduct === product && styles.filterChipTextActive]}>{product === 'all' ? 'All Products' : product}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Businesses Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Business</Text>
          <Text style={styles.tableHeaderCell}>Type</Text>
          <Text style={styles.tableHeaderCell}>Country</Text>
          <Text style={styles.tableHeaderCell}>Products</Text>
          <Text style={styles.tableHeaderCell}>Users</Text>
          <Text style={styles.tableHeaderCell}>Revenue</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: 80 }]}>Actions</Text>
        </View>

        {paginatedBusinesses.map((biz) => (
          <TouchableOpacity key={biz.id} style={styles.tableRow} onPress={() => { setSelectedBusiness(biz); setShowBusinessModal(true); }}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text style={styles.bizName}>{biz.name}</Text>
              <Text style={styles.bizOwner}>{biz.owner}</Text>
            </View>
            <Text style={styles.tableCell}>{biz.type}</Text>
            <Text style={styles.tableCell}>{biz.country}</Text>
            <View style={styles.tableCell}>
              <View style={styles.productIcons}>
                {biz.products.slice(0, 3).map((p, i) => (
                  <View key={i} style={[styles.productDot, { backgroundColor: getProductColor(p) }]} />
                ))}
                {biz.products.length > 3 && <Text style={styles.moreProducts}>+{biz.products.length - 3}</Text>}
              </View>
            </View>
            <Text style={styles.tableCell}>{biz.users}</Text>
            <Text style={[styles.tableCell, { fontWeight: '600' }]}>{formatCurrency(biz.revenue)}</Text>
            <View style={styles.tableCell}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(biz.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(biz.status) }]}>{biz.status}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, { width: 80 }]}>
              <TouchableOpacity style={styles.actionButton}><Ionicons name="ellipsis-horizontal" size={18} color={COLORS.gray} /></TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pagination */}
      <View style={styles.pagination}>
        <Text style={styles.paginationInfo}>Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredBusinesses.length)} of {filteredBusinesses.length}</Text>
        <View style={styles.paginationButtons}>
          <TouchableOpacity style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]} onPress={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.gray : COLORS.dark} />
          </TouchableOpacity>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
            return page <= totalPages ? (
              <TouchableOpacity key={page} style={[styles.pageButton, currentPage === page && styles.pageButtonActive]} onPress={() => setCurrentPage(page)}>
                <Text style={[styles.pageButtonText, currentPage === page && styles.pageButtonTextActive]}>{page}</Text>
              </TouchableOpacity>
            ) : null;
          })}
          <TouchableOpacity style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]} onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
            <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.gray : COLORS.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Business Detail Modal */}
      <Modal visible={showBusinessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Business Details</Text>
              <TouchableOpacity onPress={() => setShowBusinessModal(false)}><Ionicons name="close" size={24} color={COLORS.gray} /></TouchableOpacity>
            </View>
            {selectedBusiness && (
              <ScrollView>
                <View style={styles.modalBizHeader}>
                  <View style={[styles.modalBizIcon, { backgroundColor: COLORS.primaryLight }]}><Ionicons name="business" size={32} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalBizName}>{selectedBusiness.name}</Text>
                    <Text style={styles.modalBizType}>{selectedBusiness.type} • {selectedBusiness.country}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBusiness.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedBusiness.status) }]}>{selectedBusiness.status}</Text>
                  </View>
                </View>

                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatBox}><Text style={styles.modalStatValue}>{selectedBusiness.users}</Text><Text style={styles.modalStatLabel}>Users</Text></View>
                  <View style={styles.modalStatBox}><Text style={styles.modalStatValue}>{formatCurrency(selectedBusiness.revenue)}</Text><Text style={styles.modalStatLabel}>Revenue</Text></View>
                  <View style={styles.modalStatBox}><Text style={styles.modalStatValue}>{selectedBusiness.products.length}</Text><Text style={styles.modalStatLabel}>Products</Text></View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Owner Information</Text>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Name</Text><Text style={styles.modalValue}>{selectedBusiness.owner}</Text></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Email</Text><Text style={styles.modalValue}>{selectedBusiness.email}</Text></View>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Created</Text><Text style={styles.modalValue}>{selectedBusiness.created_at}</Text></View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Active Products</Text>
                  <View style={styles.productsList}>
                    {selectedBusiness.products.map(p => (
                      <View key={p} style={[styles.productBadge, { backgroundColor: getProductColor(p) + '20' }]}>
                        <View style={[styles.productDotLg, { backgroundColor: getProductColor(p) }]} />
                        <Text style={[styles.productBadgeText, { color: getProductColor(p) }]}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getProductColor(product: string): string {
  const colors: Record<string, string> = {
    retailpro: '#3B82F6',
    inventory: '#8B5CF6',
    invoicing: '#EC4899',
    kwikpay: '#10B981',
    unitxt: '#F59E0B',
  };
  return colors[product] || COLORS.gray;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  filtersRow: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 24, gap: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.dark },
  filterGroup: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
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
  bizName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  bizOwner: { fontSize: 11, color: COLORS.gray },
  productIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productDot: { width: 8, height: 8, borderRadius: 4 },
  moreProducts: { fontSize: 10, color: COLORS.gray, marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  actionButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paginationInfo: { fontSize: 13, color: COLORS.gray },
  paginationButtons: { flexDirection: 'row', gap: 4 },
  pageButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  pageButtonTextActive: { color: COLORS.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: 520, maxWidth: '90%', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  modalBizHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalBizIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalBizName: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  modalBizType: { fontSize: 14, color: COLORS.gray },
  modalStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  modalStatBox: { flex: 1, backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalStatValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  modalStatLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 12, textTransform: 'uppercase' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalLabel: { fontSize: 13, color: COLORS.gray },
  modalValue: { fontSize: 13, color: COLORS.dark, fontWeight: '500' },
  productsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 8 },
  productDotLg: { width: 10, height: 10, borderRadius: 5 },
  productBadgeText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
});
