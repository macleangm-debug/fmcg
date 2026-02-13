import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#EC4899',
  primaryLight: '#FCE7F3',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface InvoicingStats {
  totalInvoices: number;
  invoicesThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  pendingPayments: number;
  overduePayments: number;
  avgInvoiceValue: number;
  collectionRate: number;
}

export default function InvoicingDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'clients' | 'settings'>('overview');
  const [stats, setStats] = useState<InvoicingStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/invoicing/stats').catch(() => null);
      
      setStats(response?.data || {
        totalInvoices: 156000,
        invoicesThisMonth: 12450,
        totalRevenue: 78000000,
        revenueThisMonth: 6500000,
        pendingPayments: 2340,
        overduePayments: 156,
        avgInvoiceValue: 500,
        collectionRate: 94.5,
      });

      setRecentInvoices([
        { id: 'INV-2024-001', client: 'ABC Corporation', amount: 45000, status: 'paid', date: 'Today' },
        { id: 'INV-2024-002', client: 'XYZ Industries', amount: 125000, status: 'sent', date: 'Today' },
        { id: 'INV-2024-003', client: 'Tech Solutions Ltd', amount: 78000, status: 'draft', date: 'Yesterday' },
        { id: 'INV-2024-004', client: 'Global Trading Co', amount: 92000, status: 'paid', date: 'Yesterday' },
        { id: 'INV-2024-005', client: 'Premier Services', amount: 156000, status: 'overdue', date: '3 days ago' },
      ]);

      setOverdueInvoices([
        { id: 'INV-2024-089', client: 'Delayed Payments Inc', amount: 85000, daysOverdue: 15, lastReminder: '3 days ago' },
        { id: 'INV-2024-076', client: 'Slow Pay Corp', amount: 42000, daysOverdue: 22, lastReminder: '1 week ago' },
        { id: 'INV-2024-054', client: 'Late Again LLC', amount: 128000, daysOverdue: 30, lastReminder: '2 weeks ago' },
      ]);
    } catch (error) {
      console.error('Error fetching Invoicing data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
    return '$' + amount.toString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
      
      <View style={styles.tabs}>
        {['overview', 'invoices', 'payments', 'clients', 'settings'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="document-text" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.invoicesThisMonth || 0)}</Text>
              <Text style={styles.kpiLabel}>Invoices This Month</Text>
              <Text style={styles.kpiSubtext}>{formatNumber(stats?.totalInvoices || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="cash" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(stats?.revenueThisMonth || 0)}</Text>
              <Text style={styles.kpiLabel}>Revenue This Month</Text>
              <Text style={styles.kpiSubtext}>{formatCurrency(stats?.totalRevenue || 0)} total</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.kpiValue}>{formatNumber(stats?.pendingPayments || 0)}</Text>
              <Text style={styles.kpiLabel}>Pending Payments</Text>
              <Text style={[styles.kpiSubtext, { color: COLORS.danger }]}>{stats?.overduePayments} overdue</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: COLORS.blue }]}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="trending-up" size={20} color={COLORS.blue} />
              </View>
              <Text style={styles.kpiValue}>{stats?.collectionRate}%</Text>
              <Text style={styles.kpiLabel}>Collection Rate</Text>
              <Text style={styles.kpiSubtext}>${stats?.avgInvoiceValue} avg value</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <Text style={styles.cardTitle}>Recent Invoices</Text>
              {recentInvoices.map((inv) => (
                <View key={inv.id} style={styles.invoiceRow}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceId}>{inv.id}</Text>
                    <Text style={styles.invoiceClient}>{inv.client}</Text>
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount}>{formatCurrency(inv.amount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inv.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(inv.status) }]}>{inv.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.gridCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Overdue Invoices</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{overdueInvoices.length} overdue</Text>
                </View>
              </View>
              {overdueInvoices.map((inv) => (
                <View key={inv.id} style={styles.overdueRow}>
                  <View style={styles.overdueInfo}>
                    <Text style={styles.overdueId}>{inv.id}</Text>
                    <Text style={styles.overdueClient}>{inv.client}</Text>
                  </View>
                  <View style={styles.overdueRight}>
                    <Text style={styles.overdueAmount}>{formatCurrency(inv.amount)}</Text>
                    <Text style={styles.overdueDays}>{inv.daysOverdue} days overdue</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.sendRemindersBtn}>
                <Ionicons name="mail" size={16} color={COLORS.primary} />
                <Text style={styles.sendRemindersBtnText}>Send All Reminders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return COLORS.success;
    case 'sent': return COLORS.blue;
    case 'draft': return COLORS.gray;
    case 'overdue': return COLORS.danger;
    default: return COLORS.gray;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.white },
  kpiGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiValue: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  kpiLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  kpiSubtext: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 16 },
  alertBadge: { backgroundColor: COLORS.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  alertBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.danger },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  invoiceInfo: {},
  invoiceId: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  invoiceClient: { fontSize: 11, color: COLORS.gray },
  invoiceRight: { alignItems: 'flex-end' },
  invoiceAmount: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
  overdueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  overdueInfo: {},
  overdueId: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  overdueClient: { fontSize: 11, color: COLORS.gray },
  overdueRight: { alignItems: 'flex-end' },
  overdueAmount: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  overdueDays: { fontSize: 10, color: COLORS.danger },
  sendRemindersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryLight, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  sendRemindersBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
