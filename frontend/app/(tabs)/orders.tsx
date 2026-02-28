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
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ordersApi } from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import { useLocationStore } from '../../src/store/locationStore';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';

interface OrderItem {
  product_id: string;
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
  location_id?: string;
  location_name?: string;
}

interface RefundItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  maxQuantity: number;
  selected: boolean;
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
  const { ordersView, setOrdersView } = useViewSettingsStore();
  const { selectedLocationId } = useLocationStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  
  // Order modal view states: 'details' | 'refund' | 'exchange' | 'email' | 'reprint'
  const [modalView, setModalView] = useState<'details' | 'refund' | 'exchange' | 'email' | 'reprint'>('details');
  
  // Refund states
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<string>('cash');
  const [refundNotes, setRefundNotes] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [processingRefund, setProcessingRefund] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '', refundNumber: '' });
  
  // Email state
  const [customerEmail, setCustomerEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Exchange state
  const [exchangeStep, setExchangeStep] = useState<'select' | 'confirm'>('select');
  const [exchangeItems, setExchangeItems] = useState<RefundItem[]>([]);

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
        location_id: selectedLocationId || undefined,
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
  }, [dateFilter, selectedLocationId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [dateFilter, selectedLocationId]);

  // Refund handling functions
  const initializeRefund = (order: Order) => {
    const items: RefundItem[] = order.items.map(item => ({
      product_id: item.product_id || '',
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      maxQuantity: item.quantity,
      selected: true,
    }));
    setRefundItems(items);
    setRefundMethod('cash');
    setRefundNotes('');
    setRestockItems(true);
    setModalView('refund');
  };
  
  // Close modal and reset state
  const closeOrderModal = () => {
    setSelectedOrder(null);
    setModalView('details');
    setRefundItems([]);
    setRefundNotes('');
    setCustomerEmail('');
    setExchangeItems([]);
  };
  
  // Go back to details view
  const goBackToDetails = () => {
    setModalView('details');
  };

  const toggleRefundItem = (index: number) => {
    setRefundItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateRefundQuantity = (index: number, quantity: number) => {
    setRefundItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } : item
    ));
  };

  const calculateRefundTotal = () => {
    return refundItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  };

  const handleProcessRefund = async () => {
    if (!selectedOrder) return;
    
    const selectedItems = refundItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to refund');
      return;
    }

    setProcessingRefund(true);
    try {
      const response = await ordersApi.processRefund({
        order_id: selectedOrder.id,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        refund_method: refundMethod,
        notes: refundNotes,
        restock_items: restockItems,
      });
      
      // Show success modal with refund details
      const refundTotal = calculateRefundTotal();
      setSuccessMessage({
        title: 'Refund Processed Successfully',
        message: `${formatCurrency(refundTotal)} has been refunded via ${refundMethod.replace('_', ' ')}. ${restockItems ? 'Items have been returned to inventory.' : ''}`,
        refundNumber: response.data.refund_number || ''
      });
      setShowSuccessModal(true);
      setModalView('details');
      fetchOrders();
    } catch (error: any) {
      console.log('Failed to process refund:', error);
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };
  
  // Handle reprint receipt - Inline view
  const handleReprintReceipt = () => {
    setModalView('reprint');
  };
  
  // Actually trigger the print
  const triggerPrint = () => {
    // In web, we can trigger window.print() for the receipt
    if (Platform.OS === 'web') {
      Alert.alert('Print', 'Receipt sent to printer');
    } else {
      Alert.alert('Print', 'Receipt sent to connected thermal printer');
    }
    setModalView('details');
  };
  
  // Handle email receipt - Inline view
  const handleEmailReceipt = () => {
    // Pre-fill email if customer has one
    setCustomerEmail(selectedOrder?.customer_name?.includes('@') ? selectedOrder.customer_name : '');
    setModalView('email');
  };
  
  // Send email
  const sendEmailReceipt = async () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setSendingEmail(true);
    // Simulate email sending (in production, this would call backend)
    setTimeout(() => {
      setSendingEmail(false);
      setSuccessMessage({
        title: 'Receipt Sent',
        message: `Receipt has been emailed to ${customerEmail}`,
        refundNumber: ''
      });
      setShowSuccessModal(true);
      setModalView('details');
    }, 1500);
  };
  
  // Handle exchange - Initialize exchange view
  const handleExchange = () => {
    if (!selectedOrder) return;
    const items: RefundItem[] = selectedOrder.items.map(item => ({
      product_id: item.product_id || '',
      product_name: item.product_name,
      quantity: 1,
      unit_price: item.unit_price,
      maxQuantity: item.quantity,
      selected: false,
    }));
    setExchangeItems(items);
    setExchangeStep('select');
    setModalView('exchange');
  };
  
  // Toggle exchange item selection
  const toggleExchangeItem = (index: number) => {
    setExchangeItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };
  
  // Update exchange item quantity
  const updateExchangeQuantity = (index: number, quantity: number) => {
    setExchangeItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } : item
    ));
  };
  
  // Calculate exchange credit
  const calculateExchangeCredit = () => {
    return exchangeItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  };
  
  // Proceed to POS with exchange credit
  const proceedWithExchange = () => {
    const credit = calculateExchangeCredit();
    const selectedItems = exchangeItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to exchange');
      return;
    }
    
    // For now, show a confirmation. In a full implementation, 
    // this would navigate to POS with credit applied
    Alert.alert(
      'Exchange Started',
      `Customer has ${formatCurrency(credit)} store credit.\n\nNavigate to New Sale to select replacement items. The credit will be applied automatically.`,
      [
        { 
          text: 'Go to New Sale', 
          onPress: () => {
            closeOrderModal();
            // In production, would navigate with credit context
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

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
      case 'refunded':
        return '#8B5CF6';
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

  // Grid/Card view render (default mobile style)
  const renderOrderGrid = ({ item }: { item: Order }) => (
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

  // Table view render for web
  const renderOrderTable = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.tableRow}
      onPress={() => setSelectedOrder(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.order_number}</Text>
      <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
        {item.customer_name || 'Walk-in'}
      </Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>
        {item.items.length} item{item.items.length !== 1 ? 's' : ''}
      </Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>
        {item.payments[0]?.method?.replace('_', ' ') || 'Cash'}
      </Text>
      <Text style={[styles.tableCell, { flex: 1.2 }]}>
        {format(new Date(item.created_at), 'MMM d, h:mm a')}
      </Text>
      <View style={[styles.tableCellStatus, { flex: 0.8 }]}>
        <View style={[styles.statusBadgeSmall, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.statusTextSmall, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={[styles.tableCell, styles.tableCellTotal, { flex: 1 }]}>
        {formatCurrency(item.total)}
      </Text>
    </TouchableOpacity>
  );

  // Table header for web
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>ORDER #</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>CUSTOMER</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ITEMS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>PAYMENT</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>DATE</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>STATUS</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
    </View>
  );

  const renderOrder = isWeb && ordersView === 'table' ? renderOrderTable : renderOrderGrid;

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
      {/* Web Page Header - Only show count when there are orders */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Orders</Text>
            {orders.length > 0 && (
              <Text style={styles.webPageSubtitle}>{orders.length} order(s) found</Text>
            )}
          </View>
          {orders.length > 0 && (
            <View style={styles.headerActions}>
              <ViewToggle
                currentView={ordersView}
                onToggle={setOrdersView}
              />
            </View>
          )}
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Filter Tabs */}
            <View style={styles.webFilterContainer}>
              <View style={styles.webTabs}>
                {DATE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.webTab, dateFilter === filter.key && styles.webTabActive]}
                    onPress={() => setDateFilter(filter.key)}
                  >
                    <Text style={[styles.webTabText, dateFilter === filter.key && styles.webTabTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Table Header for table view */}
            {ordersView === 'table' && orders.length > 0 && <TableHeader />}

            {/* Orders List */}
            <FlatList
              data={orders}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
              key={`orders-web-${ordersView}`}
              numColumns={ordersView === 'grid' ? 3 : 1}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={ordersView === 'table' ? styles.webTableList : styles.webGridList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={orders.length > 0 && ordersView !== 'table' ? renderSummary : null}
              ListEmptyComponent={
                <View style={styles.webEmptyState}>
                  <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.webEmptyTitle}>Ka-ching! Oh wait... no sales yet</Text>
                  <Text style={styles.webEmptyText}>Your cash register is ready and waiting. Make that first sale!</Text>
                </View>
              }
            />
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileCardContainer}>
          {/* Date Filter Pills inside card */}
          <View style={styles.filterInsideCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContentCard}
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

          {/* Orders List inside card */}
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listInsideCard}
            showsVerticalScrollIndicator={true}
            ListHeaderComponent={orders.length > 0 ? renderSummary : null}
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title="Ka-ching! Oh wait... no sales yet"
                message={`Your cash register is ready and waiting for ${DATE_FILTERS.find(f => f.key === dateFilter)?.label.toLowerCase() || 'this period'}!`}
              />
            }
          />
        </View>
      )}

      {/* Order Details Modal - Web uses popup, Mobile uses full-screen */}
      <Modal
        visible={selectedOrder !== null}
        animationType={isWeb ? 'fade' : 'slide'}
        presentationStyle={isWeb ? 'overFullScreen' : 'pageSheet'}
        transparent={isWeb}
        onRequestClose={closeOrderModal}
      >
        {isWeb ? (
          // Web popup overlay
          <Pressable 
            style={styles.webModalOverlay}
            onPress={closeOrderModal}
          >
            <Pressable 
              style={[styles.webModalContent, modalView !== 'details' && { maxWidth: 550 }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Changes based on view */}
              <View style={styles.webModalHeader}>
                {modalView !== 'details' ? (
                  <TouchableOpacity 
                    style={styles.modalBackBtn}
                    onPress={goBackToDetails}
                  >
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.webModalTitle}>
                  {modalView === 'details' && 'Order Details'}
                  {modalView === 'refund' && 'Process Return/Refund'}
                  {modalView === 'exchange' && 'Exchange Items'}
                  {modalView === 'email' && 'Email Receipt'}
                  {modalView === 'reprint' && 'Reprint Receipt'}
                </Text>
                <Pressable 
                  style={styles.webModalCloseBtn}
                  onPress={closeOrderModal}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>
              
              {selectedOrder && modalView === 'details' && (
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
                  
                  {/* Order Actions - Only for completed orders */}
                  {selectedOrder.status === 'completed' && (
                    <View style={styles.orderActionsContainer}>
                      <Text style={styles.orderActionsTitle}>Actions</Text>
                      <View style={styles.orderActionsGrid}>
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={() => initializeRefund(selectedOrder)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.orderActionIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="return-down-back-outline" size={20} color="#DC2626" />
                          </View>
                          <Text style={styles.orderActionLabel}>Return/Refund</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={handleExchange}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.orderActionIcon, { backgroundColor: '#E0E7FF' }]}>
                            <Ionicons name="swap-horizontal-outline" size={20} color="#4F46E5" />
                          </View>
                          <Text style={styles.orderActionLabel}>Exchange</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={handleReprintReceipt}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.orderActionIcon, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="print-outline" size={20} color="#2563EB" />
                          </View>
                          <Text style={styles.orderActionLabel}>Reprint</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={handleEmailReceipt}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.orderActionIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="mail-outline" size={20} color="#10B981" />
                          </View>
                          <Text style={styles.orderActionLabel}>Email</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {/* Already Refunded Notice */}
                  {selectedOrder.status === 'refunded' && (
                    <View style={styles.refundedNotice}>
                      <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
                      <Text style={styles.refundedNoticeText}>This order has been refunded</Text>
                    </View>
                  )}
                </ScrollView>
              )}
              
              {/* INLINE REFUND VIEW */}
              {selectedOrder && modalView === 'refund' && (
                <>
                  <ScrollView style={styles.webModalBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.refundOrderInfo}>
                      <Text style={styles.refundOrderNumber}>{selectedOrder.order_number}</Text>
                      <Text style={styles.refundOrderDate}>
                        {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                      </Text>
                    </View>
                    
                    <Text style={styles.refundSectionTitle}>Select Items to Return</Text>
                    {refundItems.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.refundItemCard, item.selected && styles.refundItemCardSelected]}
                        onPress={() => toggleRefundItem(index)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.refundItemCheckbox}>
                          <Ionicons 
                            name={item.selected ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={item.selected ? "#2563EB" : "#9CA3AF"} 
                          />
                        </View>
                        <View style={styles.refundItemInfo}>
                          <Text style={styles.refundItemName}>{item.product_name}</Text>
                          <Text style={styles.refundItemPrice}>{formatCurrency(item.unit_price)} each</Text>
                        </View>
                        <View style={styles.refundQuantityControl}>
                          <TouchableOpacity
                            style={styles.refundQtyBtn}
                            onPress={() => updateRefundQuantity(index, item.quantity - 1)}
                            disabled={!item.selected}
                          >
                            <Ionicons name="remove" size={16} color={item.selected ? "#111827" : "#D1D5DB"} />
                          </TouchableOpacity>
                          <Text style={styles.refundQtyText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.refundQtyBtn}
                            onPress={() => updateRefundQuantity(index, item.quantity + 1)}
                            disabled={!item.selected || item.quantity >= item.maxQuantity}
                          >
                            <Ionicons name="add" size={16} color={item.selected && item.quantity < item.maxQuantity ? "#111827" : "#D1D5DB"} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                    
                    <Text style={[styles.refundSectionTitle, { marginTop: 20 }]}>Refund Method</Text>
                    <View style={styles.refundMethodRow}>
                      {['cash', 'card', 'mobile_money'].map((method) => (
                        <TouchableOpacity
                          key={method}
                          style={[styles.refundMethodOption, refundMethod === method && styles.refundMethodOptionActive]}
                          onPress={() => setRefundMethod(method)}
                        >
                          <Ionicons 
                            name={getPaymentIcon(method) as any} 
                            size={20} 
                            color={refundMethod === method ? '#2563EB' : '#6B7280'} 
                          />
                          <Text style={[styles.refundMethodText, refundMethod === method && styles.refundMethodTextActive]}>
                            {method === 'mobile_money' ? 'Mobile' : method.charAt(0).toUpperCase() + method.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    <View style={styles.restockToggle}>
                      <TouchableOpacity
                        style={styles.restockCheckbox}
                        onPress={() => setRestockItems(!restockItems)}
                      >
                        <Ionicons 
                          name={restockItems ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={restockItems ? "#10B981" : "#9CA3AF"} 
                        />
                        <Text style={styles.restockLabel}>Return items to inventory</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TextInput
                      style={styles.refundNotesInput}
                      placeholder="Add notes (optional) - e.g., reason for return"
                      value={refundNotes}
                      onChangeText={setRefundNotes}
                      multiline
                      numberOfLines={2}
                      placeholderTextColor="#9CA3AF"
                    />
                    
                    <View style={styles.refundSummary}>
                      <Text style={styles.refundSummaryLabel}>Refund Amount</Text>
                      <Text style={styles.refundSummaryValue}>{formatCurrency(calculateRefundTotal())}</Text>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.refundModalFooter}>
                    <TouchableOpacity
                      style={styles.refundCancelBtn}
                      onPress={goBackToDetails}
                    >
                      <Text style={styles.refundCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.refundConfirmBtn, processingRefund && styles.refundConfirmBtnDisabled]}
                      onPress={handleProcessRefund}
                      disabled={processingRefund}
                    >
                      {processingRefund ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          <Text style={styles.refundConfirmBtnText}>Process Refund</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {/* INLINE EXCHANGE VIEW */}
              {selectedOrder && modalView === 'exchange' && (
                <>
                  <ScrollView style={styles.webModalBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.refundOrderInfo}>
                      <View style={[styles.orderActionIcon, { backgroundColor: '#E0E7FF', marginBottom: 12 }]}>
                        <Ionicons name="swap-horizontal-outline" size={24} color="#4F46E5" />
                      </View>
                      <Text style={styles.refundOrderNumber}>{selectedOrder.order_number}</Text>
                      <Text style={styles.refundOrderDate}>Exchange Items</Text>
                    </View>
                    
                    <Text style={styles.refundSectionTitle}>Select Items to Exchange</Text>
                    <Text style={styles.exchangeHelpText}>
                      Select items the customer wants to exchange. They'll receive store credit for the selected items.
                    </Text>
                    
                    {exchangeItems.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.refundItemCard, item.selected && styles.exchangeItemCardSelected]}
                        onPress={() => toggleExchangeItem(index)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.refundItemCheckbox}>
                          <Ionicons 
                            name={item.selected ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={item.selected ? "#4F46E5" : "#9CA3AF"} 
                          />
                        </View>
                        <View style={styles.refundItemInfo}>
                          <Text style={styles.refundItemName}>{item.product_name}</Text>
                          <Text style={styles.refundItemPrice}>{formatCurrency(item.unit_price)} each</Text>
                        </View>
                        <View style={styles.refundQuantityControl}>
                          <TouchableOpacity
                            style={styles.refundQtyBtn}
                            onPress={() => updateExchangeQuantity(index, item.quantity - 1)}
                            disabled={!item.selected}
                          >
                            <Ionicons name="remove" size={16} color={item.selected ? "#111827" : "#D1D5DB"} />
                          </TouchableOpacity>
                          <Text style={styles.refundQtyText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.refundQtyBtn}
                            onPress={() => updateExchangeQuantity(index, item.quantity + 1)}
                            disabled={!item.selected || item.quantity >= item.maxQuantity}
                          >
                            <Ionicons name="add" size={16} color={item.selected && item.quantity < item.maxQuantity ? "#111827" : "#D1D5DB"} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                    
                    <View style={styles.exchangeCreditSummary}>
                      <Text style={styles.exchangeCreditLabel}>Store Credit</Text>
                      <Text style={styles.exchangeCreditValue}>{formatCurrency(calculateExchangeCredit())}</Text>
                    </View>
                    
                    <View style={styles.exchangeNote}>
                      <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                      <Text style={styles.exchangeNoteText}>
                        After confirming, you'll be directed to select replacement items. The credit will be applied to the new purchase.
                      </Text>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.refundModalFooter}>
                    <TouchableOpacity
                      style={styles.refundCancelBtn}
                      onPress={goBackToDetails}
                    >
                      <Text style={styles.refundCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.exchangeConfirmBtn, calculateExchangeCredit() === 0 && styles.refundConfirmBtnDisabled]}
                      onPress={proceedWithExchange}
                      disabled={calculateExchangeCredit() === 0}
                    >
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      <Text style={styles.refundConfirmBtnText}>Continue to New Sale</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {/* INLINE EMAIL VIEW */}
              {selectedOrder && modalView === 'email' && (
                <>
                  <ScrollView style={styles.webModalBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.refundOrderInfo}>
                      <View style={[styles.orderActionIcon, { backgroundColor: '#D1FAE5', marginBottom: 12 }]}>
                        <Ionicons name="mail-outline" size={24} color="#10B981" />
                      </View>
                      <Text style={styles.refundOrderNumber}>Email Receipt</Text>
                      <Text style={styles.refundOrderDate}>{selectedOrder.order_number}</Text>
                    </View>
                    
                    <Text style={styles.refundSectionTitle}>Recipient Email</Text>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="customer@email.com"
                      value={customerEmail}
                      onChangeText={setCustomerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                    />
                    
                    <View style={styles.emailPreview}>
                      <Text style={styles.emailPreviewTitle}>Receipt Preview</Text>
                      <View style={styles.emailPreviewCard}>
                        <Text style={styles.emailPreviewOrderNum}>{selectedOrder.order_number}</Text>
                        <Text style={styles.emailPreviewDate}>
                          {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                        </Text>
                        <View style={styles.emailPreviewDivider} />
                        <Text style={styles.emailPreviewItems}>
                          {selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.emailPreviewTotal}>{formatCurrency(selectedOrder.total)}</Text>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.refundModalFooter}>
                    <TouchableOpacity
                      style={styles.refundCancelBtn}
                      onPress={goBackToDetails}
                    >
                      <Text style={styles.refundCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.emailSendBtn, sendingEmail && styles.refundConfirmBtnDisabled]}
                      onPress={sendEmailReceipt}
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={18} color="#FFFFFF" />
                          <Text style={styles.refundConfirmBtnText}>Send Email</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {/* INLINE REPRINT VIEW */}
              {selectedOrder && modalView === 'reprint' && (
                <>
                  <ScrollView style={styles.webModalBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.refundOrderInfo}>
                      <View style={[styles.orderActionIcon, { backgroundColor: '#DBEAFE', marginBottom: 12 }]}>
                        <Ionicons name="print-outline" size={24} color="#2563EB" />
                      </View>
                      <Text style={styles.refundOrderNumber}>Reprint Receipt</Text>
                      <Text style={styles.refundOrderDate}>{selectedOrder.order_number}</Text>
                    </View>
                    
                    <Text style={styles.refundSectionTitle}>Print Options</Text>
                    
                    <TouchableOpacity style={styles.printOption} activeOpacity={0.7}>
                      <View style={styles.printOptionIcon}>
                        <Ionicons name="receipt-outline" size={22} color="#2563EB" />
                      </View>
                      <View style={styles.printOptionInfo}>
                        <Text style={styles.printOptionTitle}>Thermal Receipt</Text>
                        <Text style={styles.printOptionDesc}>Print to connected receipt printer</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.printOption} activeOpacity={0.7}>
                      <View style={styles.printOptionIcon}>
                        <Ionicons name="document-outline" size={22} color="#2563EB" />
                      </View>
                      <View style={styles.printOptionInfo}>
                        <Text style={styles.printOptionTitle}>Full Page Receipt</Text>
                        <Text style={styles.printOptionDesc}>Print A4/Letter size receipt</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    
                    <View style={styles.printPreview}>
                      <Text style={styles.printPreviewTitle}>Receipt Summary</Text>
                      <View style={styles.printPreviewRow}>
                        <Text style={styles.printPreviewLabel}>Order</Text>
                        <Text style={styles.printPreviewValue}>{selectedOrder.order_number}</Text>
                      </View>
                      <View style={styles.printPreviewRow}>
                        <Text style={styles.printPreviewLabel}>Items</Text>
                        <Text style={styles.printPreviewValue}>{selectedOrder.items.length}</Text>
                      </View>
                      <View style={styles.printPreviewRow}>
                        <Text style={styles.printPreviewLabel}>Total</Text>
                        <Text style={styles.printPreviewValue}>{formatCurrency(selectedOrder.total)}</Text>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.refundModalFooter}>
                    <TouchableOpacity
                      style={styles.refundCancelBtn}
                      onPress={goBackToDetails}
                    >
                      <Text style={styles.refundCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.printConfirmBtn}
                      onPress={triggerPrint}
                    >
                      <Ionicons name="print" size={18} color="#FFFFFF" />
                      <Text style={styles.refundConfirmBtnText}>Print Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </>
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
              
              {/* Refund Button for Mobile - Only show for completed orders */}
              {selectedOrder.status === 'completed' && (
                <View style={styles.orderActionsContainer}>
                  <Text style={styles.orderActionsTitle}>Actions</Text>
                  <View style={styles.orderActionsGrid}>
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={() => initializeRefund(selectedOrder)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.orderActionIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="return-down-back-outline" size={20} color="#DC2626" />
                      </View>
                      <Text style={styles.orderActionLabel}>Return/Refund</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={handleExchange}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.orderActionIcon, { backgroundColor: '#E0E7FF' }]}>
                        <Ionicons name="swap-horizontal-outline" size={20} color="#4F46E5" />
                      </View>
                      <Text style={styles.orderActionLabel}>Exchange</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={handleReprintReceipt}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.orderActionIcon, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="print-outline" size={20} color="#2563EB" />
                      </View>
                      <Text style={styles.orderActionLabel}>Reprint</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.orderActionBtn}
                      onPress={handleEmailReceipt}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.orderActionIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="mail-outline" size={20} color="#10B981" />
                      </View>
                      <Text style={styles.orderActionLabel}>Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Already Refunded Notice */}
              {selectedOrder.status === 'refunded' && (
                <View style={styles.refundedNotice}>
                  <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
                  <Text style={styles.refundedNoticeText}>This order has been refunded</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
        )}
      </Modal>
      
      {/* Success Confirmation Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowSuccessModal(false);
          closeOrderModal();
        }}
      >
        <Pressable 
          style={styles.successModalOverlay}
          onPress={() => {
            setShowSuccessModal(false);
            closeOrderModal();
          }}
        >
          <Pressable 
            style={styles.successModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>{successMessage.title}</Text>
            <Text style={styles.successMessage}>{successMessage.message}</Text>
            {successMessage.refundNumber && (
              <View style={styles.successRefundBadge}>
                <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                <Text style={styles.successRefundNumber}>{successMessage.refundNumber}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.successDoneBtn}
              onPress={() => {
                setShowSuccessModal(false);
                closeOrderModal();
              }}
            >
              <Text style={styles.successDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 0,
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
  // Table view styles
  tableList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 1,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
  },
  tableCellStatus: {
    alignItems: 'center',
  },
  tableCellTotal: {
    fontWeight: '600',
    textAlign: 'right',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
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
  filterInsideCard: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterContentCard: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

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
  webFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 12,
  },
  webTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  webTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  webTabActive: {
    backgroundColor: '#2563EB',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webTabTextActive: {
    color: '#FFFFFF',
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
    paddingVertical: 60,
  },
  webEmptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 },
  webEmptyText: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center', maxWidth: 300 },
  webEmptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  // Modal Back Button
  modalBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  
  // Order Actions Grid
  orderActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  orderActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orderActionBtn: {
    width: '22%',
    minWidth: 70,
    alignItems: 'center',
    gap: 6,
  },
  orderActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  
  // Refund Styles
  refundButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  refundButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refundedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 10,
  },
  refundedNoticeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  refundModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refundIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundOrderInfo: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  refundOrderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  refundOrderDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  refundSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  refundItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refundItemCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  refundItemCheckbox: {
    marginRight: 12,
  },
  refundItemInfo: {
    flex: 1,
  },
  refundItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  refundItemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  refundQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refundQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundQtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  refundMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  refundMethodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refundMethodOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  refundMethodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  refundMethodTextActive: {
    color: '#2563EB',
  },
  restockToggle: {
    marginBottom: 16,
  },
  restockCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restockLabel: {
    fontSize: 14,
    color: '#374151',
  },
  refundNotesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  refundSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  refundSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  refundSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
  },
  refundModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refundCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  refundConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  refundConfirmBtnDisabled: {
    opacity: 0.6,
  },
  refundConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refundModalFooterMobile: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  refundConfirmBtnMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  
  // Exchange Styles
  exchangeItemCardSelected: {
    backgroundColor: '#E0E7FF',
    borderColor: '#A5B4FC',
  },
  exchangeHelpText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  exchangeCreditSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  exchangeCreditLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  exchangeCreditValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  exchangeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
  },
  exchangeNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  exchangeConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
  },
  
  // Email Styles
  emailInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  emailPreview: {
    marginTop: 8,
  },
  emailPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emailPreviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emailPreviewOrderNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emailPreviewDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  emailPreviewDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginVertical: 12,
  },
  emailPreviewItems: {
    fontSize: 13,
    color: '#6B7280',
  },
  emailPreviewTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  emailSendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  
  // Print Styles
  printOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  printOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  printOptionInfo: {
    flex: 1,
  },
  printOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  printOptionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  printPreview: {
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  printPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  printPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  printPreviewLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  printPreviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  printConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  successRefundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  successRefundNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  successDoneBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  successDoneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
