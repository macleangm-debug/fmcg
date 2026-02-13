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
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ordersApi } from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import EmptyState from '../../src/components/EmptyState';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Payment {
  method: string;
  amount: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  items: OrderItem[];
  payments: Payment[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  created_by_name: string;
  created_at: string;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export default function Orders() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, formatNumber } = useBusinessStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const getDateRange = (filter: DateFilter) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return {
          from: format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss"),
          to: format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          from: format(startOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss"),
          to: format(endOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      case 'week':
        return {
          from: format(startOfDay(subDays(now, 7)), "yyyy-MM-dd'T'HH:mm:ss"),
          to: format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      case 'month':
        return {
          from: format(startOfDay(subDays(now, 30)), "yyyy-MM-dd'T'HH:mm:ss"),
          to: format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss"),
        };
      default:
        return { from: undefined, to: undefined };
    }
  };

  const fetchOrders = async () => {
    try {
      const dateRange = getDateRange(dateFilter);
      const response = await ordersApi.getAll({
        limit: 100,
        date_from: dateRange.from,
        date_to: dateRange.to,
      });
      setOrders(response.data);
    } catch (error) {
      console.log('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [dateFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [dateFilter]);

  // Calculate summary stats
  const getSummaryStats = () => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;
    
    return { totalSales, totalOrders, avgOrderValue };
  };

  const stats = getSummaryStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'mobile_money':
        return 'phone-portrait-outline';
      case 'credit':
        return 'time-outline';
      default:
        return 'wallet-outline';
    }
  };

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
        </View>
        <Text style={styles.summaryValue}>{formatCurrency(stats.totalSales)}</Text>
        <Text style={styles.summaryLabel}>Total Sales</Text>
      </View>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: '#EEF2FF' }]}>
          <Ionicons name="receipt-outline" size={18} color="#2563EB" />
        </View>
        <Text style={styles.summaryValue}>{formatNumber(stats.totalOrders)}</Text>
        <Text style={styles.summaryLabel}>Orders</Text>
      </View>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="trending-up-outline" size={18} color="#F59E0B" />
        </View>
        <Text style={styles.summaryValue}>{formatCurrency(stats.avgOrderValue)}</Text>
        <Text style={styles.summaryLabel}>Avg Order</Text>
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => setSelectedOrder(item)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderNumber}>{item.order_number}</Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.created_at), 'MMM d, h:mm a')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderBody}>
        <View style={styles.orderInfo}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.customer_name || 'Walk-in'}
          </Text>
        </View>
        <View style={styles.orderInfo}>
          <Ionicons name="cube-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>
            {item.items.length} item{item.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.orderInfo}>
          <Ionicons
            name={getPaymentIcon(item.payments[0]?.method || 'cash') as any}
            size={14}
            color="#6B7280"
          />
          <Text style={styles.infoText}>
            {item.payments[0]?.method?.replace('_', ' ') || 'Cash'}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.staffName}>by {item.created_by_name}</Text>
        <Text style={styles.orderTotal}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {/* Date Filter Pills */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {DATE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                dateFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setDateFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dateFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={orders.length > 0 ? renderSummary : null}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Orders Found"
            message={`No orders for ${DATE_FILTERS.find(f => f.key === dateFilter)?.label.toLowerCase() || 'this period'}`}
          />
        }
      />

      {/* Order Details Modal - Web uses popup, Mobile uses full-screen */}
      <Modal
        visible={selectedOrder !== null}
        animationType={isWeb ? 'fade' : 'slide'}
        presentationStyle={isWeb ? 'overFullScreen' : 'pageSheet'}
        transparent={isWeb}
        onRequestClose={() => setSelectedOrder(null)}
      >
        {isWeb ? (
          // Web popup overlay
          <Pressable 
            style={styles.webModalOverlay}
            onPress={() => setSelectedOrder(null)}
          >
            <Pressable 
              style={styles.webModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.webModalHeader}>
                <Text style={styles.webModalTitle}>Order Details</Text>
                <Pressable 
                  style={styles.webModalCloseBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>
              
              {selectedOrder && (
                <ScrollView style={styles.webModalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptOrderNumber}>
                      {selectedOrder.order_number}
                    </Text>
                    <Text style={styles.receiptDate}>
                      {format(new Date(selectedOrder.created_at), 'MMMM d, yyyy h:mm a')}
                    </Text>
                    <View style={[
                      styles.receiptStatusBadge,
                      { backgroundColor: `${getStatusColor(selectedOrder.status)}15` }
                    ]}>
                      <Text style={[styles.receiptStatusText, { color: getStatusColor(selectedOrder.status) }]}>
                        {selectedOrder.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptSectionTitle}>Customer</Text>
                    <Text style={styles.receiptText}>
                      {selectedOrder.customer_name || 'Walk-in Customer'}
                    </Text>
                  </View>

                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptSectionTitle}>Items</Text>
                    {selectedOrder.items.map((item, index) => (
                      <View key={index} style={styles.receiptItem}>
                        <View style={styles.receiptItemInfo}>
                          <Text style={styles.receiptItemName}>{item.product_name}</Text>
                          <Text style={styles.receiptItemQty}>
                            {item.quantity} x {formatCurrency(item.unit_price)}
                          </Text>
                        </View>
                        <Text style={styles.receiptItemTotal}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.receiptSummary}>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSummaryLabel}>Subtotal</Text>
                      <Text style={styles.receiptSummaryValue}>
                        {formatCurrency(selectedOrder.subtotal)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSummaryLabel}>Tax</Text>
                      <Text style={styles.receiptSummaryValue}>
                        {formatCurrency(selectedOrder.tax_total)}
                      </Text>
                    </View>
                    {selectedOrder.discount_total > 0 && (
                      <View style={styles.receiptSummaryRow}>
                        <Text style={styles.receiptSummaryLabel}>Discount</Text>
                        <Text style={[styles.receiptSummaryValue, { color: '#10B981' }]}>
                          -{formatCurrency(selectedOrder.discount_total)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.receiptDivider} />
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptTotalLabel}>Total</Text>
                      <Text style={styles.receiptTotalValue}>
                        {formatCurrency(selectedOrder.total)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptSectionTitle}>Payment</Text>
                    {selectedOrder.payments.map((payment, index) => (
                      <View key={index} style={styles.paymentRow}>
                        <View style={styles.paymentMethod}>
                          <Ionicons
                            name={getPaymentIcon(payment.method) as any}
                            size={18}
                            color="#2563EB"
                          />
                          <Text style={styles.paymentMethodText}>
                            {payment.method.replace('_', ' ').charAt(0).toUpperCase() + 
                             payment.method.replace('_', ' ').slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.paymentAmount}>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </View>
                    ))}
                    {selectedOrder.amount_due > 0 && (
                      <View style={styles.amountDue}>
                        <Text style={styles.amountDueLabel}>Amount Due</Text>
                        <Text style={styles.amountDueValue}>
                          {formatCurrency(selectedOrder.amount_due)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.receiptFooter}>
                    <Text style={styles.receiptFooterText}>
                      Served by: {selectedOrder.created_by_name}
                    </Text>
                  </View>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        ) : (
          // Mobile full-screen modal
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Order Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptOrderNumber}>
                    {selectedOrder.order_number}
                  </Text>
                  <Text style={styles.receiptDate}>
                    {format(new Date(selectedOrder.created_at), 'MMMM d, yyyy h:mm a')}
                  </Text>
                  <View style={[
                    styles.receiptStatusBadge,
                    { backgroundColor: `${getStatusColor(selectedOrder.status)}15` }
                  ]}>
                    <Text style={[styles.receiptStatusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status.toUpperCase()}
                    </Text>
                  </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Customer</Text>
                <Text style={styles.receiptText}>
                  {selectedOrder.customer_name || 'Walk-in Customer'}
                </Text>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.receiptItem}>
                    <View style={styles.receiptItemInfo}>
                      <Text style={styles.receiptItemName}>{item.product_name}</Text>
                      <Text style={styles.receiptItemQty}>
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </Text>
                    </View>
                    <Text style={styles.receiptItemTotal}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.receiptSummary}>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Subtotal</Text>
                  <Text style={styles.receiptSummaryValue}>
                    {formatCurrency(selectedOrder.subtotal)}
                  </Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Tax</Text>
                  <Text style={styles.receiptSummaryValue}>
                    {formatCurrency(selectedOrder.tax_total)}
                  </Text>
                </View>
                {selectedOrder.discount_total > 0 && (
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Discount</Text>
                    <Text style={[styles.receiptSummaryValue, { color: '#10B981' }]}>
                      -{formatCurrency(selectedOrder.discount_total)}
                    </Text>
                  </View>
                )}
                <View style={styles.receiptDivider} />
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalValue}>
                    {formatCurrency(selectedOrder.total)}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Payment</Text>
                {selectedOrder.payments.map((payment, index) => (
                  <View key={index} style={styles.paymentRow}>
                    <View style={styles.paymentMethod}>
                      <Ionicons
                        name={getPaymentIcon(payment.method) as any}
                        size={20}
                        color="#2563EB"
                      />
                      <Text style={styles.paymentMethodText}>
                        {payment.method.replace('_', ' ').charAt(0).toUpperCase() + 
                         payment.method.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                ))}
                {selectedOrder.amount_due > 0 && (
                  <View style={styles.amountDue}>
                    <Text style={styles.amountDueLabel}>Amount Due</Text>
                    <Text style={styles.amountDueValue}>
                      {formatCurrency(selectedOrder.amount_due)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>
                  Served by: {selectedOrder.created_by_name}
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
        )}
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  filterWrapper: {
    marginBottom: 12,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  staffName: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Web modal styles
  webModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  webModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  webModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webModalBody: {
    padding: 16,
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
  },
  receiptHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptOrderNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  receiptStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  receiptSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  receiptText: {
    fontSize: 16,
    color: '#111827',
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  receiptItemQty: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptItemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  receiptSummary: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  receiptSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  receiptTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 15,
    color: '#111827',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  amountDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  amountDueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  amountDueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  receiptFooter: {
    padding: 24,
    alignItems: 'center',
  },
  receiptFooterText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
