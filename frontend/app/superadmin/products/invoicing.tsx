import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../src/api/client';

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

export default function InvoicingDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_invoices: 856,
    paid: 724,
    pending: 98,
    overdue: 34,
    total_value: 2450000,
    collected: 2100000,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/invoicing/stats');
      if (response?.data) {
        setStats({
          total_invoices: response.data.total_invoices || 0,
          paid: response.data.paid || 0,
          pending: response.data.pending || 0,
          overdue: response.data.overdue || 0,
          total_value: response.data.total_value || 0,
          collected: response.data.collected || 0,
        });
        setRecentInvoices(response.data.recent_invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoicing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  const StatCard = ({ title, value, icon, color, percent }: any) => (
    <View style={[styles.statCard, isWeb && styles.statCardWeb]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {percent !== undefined && (
        <Text style={[styles.statPercent, { color }]}>{percent}%</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Invoicing...</Text>
      </View>
    );
  }

  const paidPercent = Math.round((stats.paid / stats.total_invoices) * 100);
  const collectedPercent = Math.round((stats.collected / stats.total_value) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.pageTitle}>Invoicing</Text>
              <Text style={styles.pageSubtitle}>Invoice & Billing Management</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Collection Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Collection Progress</Text>
            <Text style={styles.progressPercent}>{collectedPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${collectedPercent}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStatItem}>
              <Text style={styles.progressStatValue}>{formatCurrency(stats.collected)}</Text>
              <Text style={styles.progressStatLabel}>Collected</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={styles.progressStatValue}>{formatCurrency(stats.total_value - stats.collected)}</Text>
              <Text style={styles.progressStatLabel}>Outstanding</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={styles.progressStatValue}>{formatCurrency(stats.total_value)}</Text>
              <Text style={styles.progressStatLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, isWeb && styles.statsGridWeb]}>
          <StatCard
            title="Total Invoices"
            value={stats.total_invoices}
            icon="document-text-outline"
            color={COLORS.blue}
          />
          <StatCard
            title="Paid"
            value={stats.paid}
            icon="checkmark-circle-outline"
            color={COLORS.success}
            percent={paidPercent}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon="time-outline"
            color={COLORS.warning}
          />
          <StatCard
            title="Overdue"
            value={stats.overdue}
            icon="alert-circle-outline"
            color={COLORS.danger}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>New Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="repeat" size={24} color={COLORS.blue} />
              </View>
              <Text style={styles.actionText}>Recurring</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="download" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.actionText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Invoices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {[
            { id: 'INV-001', client: 'Acme Corp', amount: 15000, status: 'paid', date: '2026-02-08' },
            { id: 'INV-002', client: 'Tech Solutions', amount: 8500, status: 'pending', date: '2026-02-07' },
            { id: 'INV-003', client: 'Global Trade', amount: 22000, status: 'overdue', date: '2026-01-25' },
            { id: 'INV-004', client: 'Metro Retail', amount: 4200, status: 'paid', date: '2026-02-06' },
          ].map((invoice) => (
            <TouchableOpacity key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceLeft}>
                <Text style={styles.invoiceId}>{invoice.id}</Text>
                <Text style={styles.invoiceClient}>{invoice.client}</Text>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>${invoice.amount.toLocaleString()}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: invoice.status === 'paid' ? COLORS.successLight : invoice.status === 'pending' ? COLORS.warningLight : COLORS.dangerLight }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: invoice.status === 'paid' ? COLORS.success : invoice.status === 'pending' ? COLORS.warning : COLORS.danger }
                  ]}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <View style={styles.overdueAlert}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <View style={styles.overdueContent}>
              <Text style={styles.overdueTitle}>{stats.overdue} Overdue Invoices</Text>
              <Text style={styles.overdueText}>Follow up with clients to collect payments</Text>
            </View>
            <TouchableOpacity style={styles.overdueButton}>
              <Text style={styles.overdueButtonText}>Send Reminders</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatItem: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  progressStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsGridWeb: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWeb: {
    minWidth: 'auto',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statPercent: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.dark,
  },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  invoiceClient: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark,
    marginTop: 2,
  },
  invoiceDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  overdueContent: {
    flex: 1,
  },
  overdueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  overdueText: {
    fontSize: 12,
    color: COLORS.dark,
    marginTop: 2,
  },
  overdueButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  overdueButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
});
