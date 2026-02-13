import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { dashboardApi } from '../../src/api/client';
import ProductSwitcher from '../../src/components/ProductSwitcher';

interface DashboardStats {
  total_sales_today: number;
  total_orders_today: number;
  total_customers: number;
  total_products: number;
  low_stock_products: number;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  recent_orders: Array<any>;
  sales_by_payment_method: { cash: number; card: number; mobile_money: number; credit: number };
}

type TabType = 'overview' | 'sales' | 'inventory' | 'customers';

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user, logout } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.log('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/(auth)/login');
  };

  // Calculate totals for visual charts (web only)
  const totalPayments = (stats?.sales_by_payment_method?.cash || 0) +
    (stats?.sales_by_payment_method?.card || 0) +
    (stats?.sales_by_payment_method?.mobile_money || 0) +
    (stats?.sales_by_payment_method?.credit || 0);

  const getPaymentPercentage = (amount: number) => {
    if (totalPayments === 0) return 0;
    return (amount / totalPayments) * 100;
  };

  // Mobile Stat Card
  const MobileStatCard = ({ icon, label, value, color, onPress }: any) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Web Stat Card with trends
  const WebStatCard = ({ icon, label, value, color, trend, onPress }: any) => (
    <TouchableOpacity
      style={[styles.statCard, styles.statCardWeb]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.statCardHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trend > 0 ? '#10B981' : '#DC2626'} 
            />
            <Text style={[styles.trendText, { color: trend > 0 ? '#10B981' : '#DC2626' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // ============== WEB DASHBOARD CONTENT ==============
  const WebOverviewTab = () => (
    <>
      <View style={[styles.statsGrid, styles.statsGridWeb]}>
        <WebStatCard
          icon="cash-outline"
          label="Today's Sales"
          value={formatCurrency(stats?.total_sales_today || 0)}
          color="#10B981"
          trend={12}
        />
        <WebStatCard
          icon="receipt-outline"
          label="Orders Today"
          value={formatNumber(stats?.total_orders_today || 0)}
          color="#2563EB"
          trend={8}
          onPress={() => router.push('/(tabs)/orders')}
        />
        <WebStatCard
          icon="people-outline"
          label="Total Customers"
          value={formatNumber(stats?.total_customers || 0)}
          color="#8B5CF6"
          onPress={() => router.push('/(tabs)/customers')}
        />
        <WebStatCard
          icon="cube-outline"
          label="Total Products"
          value={formatNumber(stats?.total_products || 0)}
          color="#F59E0B"
        />
      </View>

      {(stats?.low_stock_products || 0) > 0 && (
        <TouchableOpacity 
          style={styles.alertCard}
          onPress={() => router.push('/admin/stock')}
        >
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
            <Text style={styles.alertText}>
              {formatNumber(stats?.low_stock_products || 0)} products are running low
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#DC2626" />
        </TouchableOpacity>
      )}

      {/* Charts Row */}
      <View style={styles.chartsRow}>
        {/* Donut-style Chart - Sales by Payment Method */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Sales by Payment Method</Text>
          <View style={styles.chartCard}>
            <View style={styles.pieChartContainer}>
              {/* Simple visual representation using progress rings */}
              <View style={styles.donutContainer}>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutTotal}>{formatCurrency(totalPayments)}</Text>
                  <Text style={styles.donutLabel}>Total Sales</Text>
                </View>
              </View>
              <View style={styles.pieLegend}>
                {[
                  { label: 'Cash', amount: stats?.sales_by_payment_method?.cash || 0, color: '#10B981' },
                  { label: 'Card', amount: stats?.sales_by_payment_method?.card || 0, color: '#2563EB' },
                  { label: 'Mobile', amount: stats?.sales_by_payment_method?.mobile_money || 0, color: '#F59E0B' },
                  { label: 'Credit', amount: stats?.sales_by_payment_method?.credit || 0, color: '#8B5CF6' },
                ].map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendValue}>{getPaymentPercentage(item.amount).toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Bar Chart - Top Products */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Top Products Revenue</Text>
          <View style={styles.chartCard}>
            {stats?.top_products?.slice(0, 5).map((product, index) => {
              const maxRevenue = Math.max(...(stats?.top_products?.map(p => p.revenue) || [1]));
              const barWidth = ((product.revenue / maxRevenue) * 100);
              const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
              return (
                <View key={index} style={styles.horizontalBarItem}>
                  <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                    {product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name}
                  </Text>
                  <View style={styles.horizontalBarTrack}>
                    <View 
                      style={[
                        styles.horizontalBarFill, 
                        { width: `${barWidth}%`, backgroundColor: colors[index % colors.length] }
                      ]} 
                    />
                  </View>
                  <Text style={styles.horizontalBarValue}>{product.quantity}</Text>
                </View>
              );
            })}
            {(!stats?.top_products || stats.top_products.length === 0) && (
              <Text style={styles.noDataText}>No sales data yet</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Breakdown</Text>
        <View style={styles.chartCard}>
          <View style={styles.barChartContainer}>
            {[
              { label: 'Cash', amount: stats?.sales_by_payment_method?.cash || 0, color: '#10B981' },
              { label: 'Card', amount: stats?.sales_by_payment_method?.card || 0, color: '#2563EB' },
              { label: 'Mobile', amount: stats?.sales_by_payment_method?.mobile_money || 0, color: '#F59E0B' },
              { label: 'Credit', amount: stats?.sales_by_payment_method?.credit || 0, color: '#8B5CF6' },
            ].map((item, index) => (
              <View key={index} style={styles.barChartItem}>
                <View style={styles.barChartLabelRow}>
                  <View style={[styles.paymentDot, { backgroundColor: item.color }]} />
                  <Text style={styles.barChartLabel}>{item.label}</Text>
                  <Text style={styles.barChartValue}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={styles.barChartBarBg}>
                  <View 
                    style={[
                      styles.barChartBar, 
                      { 
                        width: `${getPaymentPercentage(item.amount)}%`,
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {(stats?.top_products?.length || 0) > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Selling Products</Text>
            <TouchableOpacity onPress={() => router.push('/admin/reports')}>
              <Text style={styles.viewAllLink}>View Report →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topProductsCard}>
            {stats?.top_products.slice(0, 5).map((product, index) => (
              <View key={index} style={styles.topProductItem}>
                <View style={[styles.topProductRank, { backgroundColor: index === 0 ? '#FEF3C7' : '#EEF2FF' }]}>
                  <Text style={[styles.topProductRankText, { color: index === 0 ? '#D97706' : '#2563EB' }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.topProductQty}>{product.quantity} units sold</Text>
                </View>
                <Text style={styles.topProductRevenue}>
                  {formatCurrency(product.revenue)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );

  const WebSalesTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Performance</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <Text style={styles.performanceLabel}>Today</Text>
            <Text style={styles.performanceValue}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
            <Text style={styles.performanceOrders}>{stats?.total_orders_today || 0} orders</Text>
          </View>
          <View style={styles.performanceCard}>
            <Text style={styles.performanceLabel}>Average Order</Text>
            <Text style={styles.performanceValue}>
              {formatCurrency(stats?.total_orders_today ? (stats.total_sales_today / stats.total_orders_today) : 0)}
            </Text>
            <Text style={styles.performanceOrders}>per transaction</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        <View style={styles.paymentBreakdownCard}>
          {[
            { label: 'Cash Payments', amount: stats?.sales_by_payment_method?.cash || 0, icon: 'cash-outline', color: '#10B981' },
            { label: 'Card Payments', amount: stats?.sales_by_payment_method?.card || 0, icon: 'card-outline', color: '#2563EB' },
            { label: 'Mobile Money', amount: stats?.sales_by_payment_method?.mobile_money || 0, icon: 'phone-portrait-outline', color: '#F59E0B' },
            { label: 'Credit Sales', amount: stats?.sales_by_payment_method?.credit || 0, icon: 'time-outline', color: '#8B5CF6' },
          ].map((item, index) => (
            <View key={index} style={styles.paymentBreakdownItem}>
              <View style={[styles.paymentBreakdownIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.paymentBreakdownInfo}>
                <Text style={styles.paymentBreakdownLabel}>{item.label}</Text>
                <Text style={styles.paymentBreakdownPercent}>
                  {getPaymentPercentage(item.amount).toFixed(1)}% of total
                </Text>
              </View>
              <Text style={styles.paymentBreakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.viewReportButton}
        onPress={() => router.push('/admin/reports')}
      >
        <Ionicons name="bar-chart-outline" size={20} color="#FFFFFF" />
        <Text style={styles.viewReportButtonText}>View Full Sales Report</Text>
      </TouchableOpacity>
    </>
  );

  const WebInventoryTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory Overview</Text>
        <View style={styles.inventoryGrid}>
          <View style={[styles.inventoryCard, { borderLeftColor: '#2563EB' }]}>
            <Text style={styles.inventoryCardValue}>{formatNumber(stats?.total_products || 0)}</Text>
            <Text style={styles.inventoryCardLabel}>Total Products</Text>
          </View>
          <View style={[styles.inventoryCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.inventoryCardValue}>
              {formatNumber((stats?.total_products || 0) - (stats?.low_stock_products || 0))}
            </Text>
            <Text style={styles.inventoryCardLabel}>In Stock</Text>
          </View>
          <View style={[styles.inventoryCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.inventoryCardValue}>{formatNumber(stats?.low_stock_products || 0)}</Text>
            <Text style={styles.inventoryCardLabel}>Low Stock</Text>
          </View>
        </View>
      </View>

      {(stats?.low_stock_products || 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Items Needing Attention</Text>
          <View style={styles.lowStockList}>
            <Text style={styles.lowStockNote}>
              {formatNumber(stats?.low_stock_products || 0)} products are below their minimum stock threshold
            </Text>
            <TouchableOpacity 
              style={styles.restockButton}
              onPress={() => router.push('/admin/stock')}
            >
              <Ionicons name="cube-outline" size={18} color="#FFFFFF" />
              <Text style={styles.restockButtonText}>Manage Stock</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inventoryActions}>
        <TouchableOpacity 
          style={styles.inventoryActionBtn}
          onPress={() => router.push('/admin/products')}
        >
          <Ionicons name="cube-outline" size={24} color="#2563EB" />
          <Text style={styles.inventoryActionText}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.inventoryActionBtn}
          onPress={() => router.push('/admin/stock')}
        >
          <Ionicons name="layers-outline" size={24} color="#10B981" />
          <Text style={styles.inventoryActionText}>Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.inventoryActionBtn}
          onPress={() => router.push('/admin/categories')}
        >
          <Ionicons name="folder-outline" size={24} color="#F59E0B" />
          <Text style={styles.inventoryActionText}>Categories</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const WebCustomersTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Insights</Text>
        <View style={styles.customerStatsGrid}>
          <View style={styles.customerStatCard}>
            <Ionicons name="people" size={32} color="#8B5CF6" />
            <Text style={styles.customerStatValue}>{formatNumber(stats?.total_customers || 0)}</Text>
            <Text style={styles.customerStatLabel}>Total Customers</Text>
          </View>
          <View style={styles.customerStatCard}>
            <Ionicons name="cart" size={32} color="#10B981" />
            <Text style={styles.customerStatValue}>{formatNumber(stats?.total_orders_today || 0)}</Text>
            <Text style={styles.customerStatLabel}>Orders Today</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.customerActions}>
          <TouchableOpacity 
            style={styles.customerActionBtn}
            onPress={() => router.push('/(tabs)/customers')}
          >
            <View style={[styles.customerActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="people-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.customerActionTitle}>View All Customers</Text>
            <Text style={styles.customerActionDesc}>Manage customer list</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.customerActionBtn}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <View style={[styles.customerActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="receipt-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.customerActionTitle}>Customer Orders</Text>
            <Text style={styles.customerActionDesc}>View order history</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // ============== WEB DASHBOARD ==============
  const WebDashboard = () => (
    <View style={{ flex: 1 }}>
      {/* Web Header with Product Switcher */}
      <View style={styles.webHeader}>
        <View style={styles.webHeaderLeft}>
          <View style={styles.retailProBadgeLarge}>
            <Ionicons name="storefront" size={24} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.webHeaderTitle}>Retail Pro</Text>
            <Text style={styles.webHeaderSubtitle}>Welcome, {user?.name || 'User'}</Text>
          </View>
        </View>
        <View style={styles.webHeaderRight}>
          <ProductSwitcher currentProductId="retail-pro" />
          <TouchableOpacity style={styles.webLogoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {[
              { id: 'overview' as TabType, label: 'Overview', icon: 'grid-outline' },
              { id: 'sales' as TabType, label: 'Sales', icon: 'trending-up-outline' },
              { id: 'inventory' as TabType, label: 'Inventory', icon: 'cube-outline' },
              { id: 'customers' as TabType, label: 'Customers', icon: 'people-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={18} 
                  color={activeTab === tab.id ? '#2563EB' : '#6B7280'} 
                />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && <WebOverviewTab />}
          {activeTab === 'sales' && <WebSalesTab />}
          {activeTab === 'inventory' && <WebInventoryTab />}
          {activeTab === 'customers' && <WebCustomersTab />}
        </View>
      </ScrollView>
    </View>
  );

  // ============== MOBILE DASHBOARD (ORIGINAL) ==============
  const MobileDashboard = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Back to Galaxy Home */}
      <TouchableOpacity 
        style={styles.backToGalaxyButton} 
        onPress={() => router.replace('/galaxy/home')}
      >
        <View style={styles.backToGalaxyIcon}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.backToGalaxyText}>Back to Software Galaxy</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.retailProBadge}>
            <Text style={styles.retailProBadgeText}>RP</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <MobileStatCard
          icon="cash-outline"
          label="Today's Sales"
          value={formatCurrency(stats?.total_sales_today || 0)}
          color="#10B981"
        />
        <MobileStatCard
          icon="receipt-outline"
          label="Orders Today"
          value={formatNumber(stats?.total_orders_today || 0)}
          color="#2563EB"
          onPress={() => router.push('/(tabs)/orders')}
        />
        <MobileStatCard
          icon="people-outline"
          label="Customers"
          value={formatNumber(stats?.total_customers || 0)}
          color="#8B5CF6"
          onPress={() => router.push('/(tabs)/customers')}
        />
        <MobileStatCard
          icon="cube-outline"
          label="Products"
          value={formatNumber(stats?.total_products || 0)}
          color="#F59E0B"
          onPress={() => router.push('/(tabs)/products')}
        />
      </View>

      {(stats?.low_stock_products || 0) > 0 && (
        <TouchableOpacity style={styles.alertCard}>
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
            <Text style={styles.alertText}>
              {formatNumber(stats?.low_stock_products || 0)} products are running low
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#DC2626" />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales by Payment</Text>
        <View style={styles.paymentStats}>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.paymentLabel}>Cash</Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(stats?.sales_by_payment_method?.cash || 0)}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.paymentLabel}>Card</Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(stats?.sales_by_payment_method?.card || 0)}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.paymentLabel}>Mobile</Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(stats?.sales_by_payment_method?.mobile_money || 0)}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.paymentLabel}>Credit</Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(stats?.sales_by_payment_method?.credit || 0)}
            </Text>
          </View>
        </View>
      </View>

      {(stats?.top_products?.length || 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products Today</Text>
          {stats?.top_products.map((product, index) => (
            <View key={index} style={styles.topProductItemMobile}>
              <View style={styles.topProductRank}>
                <Text style={styles.topProductRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{product.name}</Text>
                <Text style={styles.topProductQty}>{product.quantity} sold</Text>
              </View>
              <Text style={styles.topProductRevenue}>
                {formatCurrency(product.revenue)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/products')}
          >
            <Ionicons name="add-circle-outline" size={28} color="#2563EB" />
            <Text style={styles.actionText}>New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/customers')}
          >
            <Ionicons name="person-add-outline" size={28} color="#10B981" />
            <Text style={styles.actionText}>Add Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Ionicons name="list-outline" size={28} color="#F59E0B" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {user?.role === 'admin' && (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Admin Tools</Text>
          <View style={styles.adminGrid}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/reports')}
            >
              <Ionicons name="bar-chart-outline" size={28} color="#2563EB" />
              <Text style={styles.adminButtonText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/staff')}
            >
              <Ionicons name="people-outline" size={28} color="#DC2626" />
              <Text style={styles.adminButtonText}>Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/products')}
            >
              <Ionicons name="cube-outline" size={28} color="#10B981" />
              <Text style={styles.adminButtonText}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/stock')}
            >
              <Ionicons name="layers-outline" size={28} color="#06B6D4" />
              <Text style={styles.adminButtonText}>Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/categories')}
            >
              <Ionicons name="folder-outline" size={28} color="#F59E0B" />
              <Text style={styles.adminButtonText}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/promotions')}
            >
              <Ionicons name="pricetag-outline" size={28} color="#8B5CF6" />
              <Text style={styles.adminButtonText}>Promotions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/expenses')}
            >
              <Ionicons name="wallet-outline" size={28} color="#EF4444" />
              <Text style={styles.adminButtonText}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/settings')}
            >
              <Ionicons name="settings-outline" size={28} color="#6B7280" />
              <Text style={styles.adminButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user?.role === 'manager' && (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Manager Tools</Text>
          <View style={styles.adminGrid}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/staff')}
            >
              <Ionicons name="people-outline" size={28} color="#DC2626" />
              <Text style={styles.adminButtonText}>Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/products')}
            >
              <Ionicons name="cube-outline" size={28} color="#10B981" />
              <Text style={styles.adminButtonText}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/stock')}
            >
              <Ionicons name="layers-outline" size={28} color="#06B6D4" />
              <Text style={styles.adminButtonText}>Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/categories')}
            >
              <Ionicons name="folder-outline" size={28} color="#F59E0B" />
              <Text style={styles.adminButtonText}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/promotions')}
            >
              <Ionicons name="pricetag-outline" size={28} color="#8B5CF6" />
              <Text style={styles.adminButtonText}>Promotions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/expenses')}
            >
              <Ionicons name="wallet-outline" size={28} color="#EF4444" />
              <Text style={styles.adminButtonText}>Expenses</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user?.role === 'finance' && (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Finance Tools</Text>
          <View style={styles.adminGrid}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/reports')}
            >
              <Ionicons name="bar-chart-outline" size={28} color="#2563EB" />
              <Text style={styles.adminButtonText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/expenses')}
            >
              <Ionicons name="wallet-outline" size={28} color="#EF4444" />
              <Text style={styles.adminButtonText}>Expenses</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
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
    <SafeAreaView style={styles.container} edges={isWeb ? ['bottom'] : ['top', 'bottom']}>
      {/* Render different dashboards based on platform */}
      {isWeb ? <WebDashboard /> : <MobileDashboard />}

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Ionicons name="log-out-outline" size={48} color="#DC2626" />
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutCancelButton]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
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
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Web Header with Product Switcher
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  retailProBadgeLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  webHeaderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webLogoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Back to Galaxy button
  backToGalaxyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#00B4D8',
    borderRadius: 12,
    gap: 10,
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backToGalaxyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToGalaxyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retailProBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retailProBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  // Tab Navigation (Web only)
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsGridWeb: {
    maxWidth: 1200,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWeb: {
    minWidth: '22%',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  alertText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  // Mobile Payment Stats
  paymentStats: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  // Chart Card (Web)
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  // Donut chart styles
  donutContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  donutLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  // Horizontal bar chart
  horizontalBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  horizontalBarLabel: {
    width: 80,
    fontSize: 12,
    color: '#374151',
  },
  horizontalBarTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  horizontalBarValue: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 20,
  },
  pieLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 13,
    color: '#374151',
    width: 50,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  barChartContainer: {
    gap: 16,
  },
  barChartItem: {
    gap: 8,
  },
  barChartLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barChartLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  barChartValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  barChartBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barChartBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Top Products
  topProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topProductItemMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topProductRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  topProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  topProductQty: {
    fontSize: 12,
    color: '#6B7280',
  },
  topProductRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  // Quick Actions (Mobile)
  quickActions: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '30%',
    minWidth: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  // Admin Section (Mobile)
  adminSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  adminGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminButton: {
    width: '30%',
    minWidth: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  // Web Sales Tab
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  performanceOrders: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  paymentBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentBreakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBreakdownInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentBreakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  paymentBreakdownPercent: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentBreakdownAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewReportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Web Inventory Tab
  inventoryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inventoryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  inventoryCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  lowStockList: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  lowStockNote: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 12,
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  restockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inventoryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 16,
  },
  inventoryActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  // Web Customers Tab
  customerStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  customerStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  customerStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  customerStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  customerActions: {
    gap: 12,
  },
  customerActionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  customerActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  customerActionDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Logout Modal
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  logoutConfirmButton: {
    backgroundColor: '#DC2626',
  },
  logoutCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  logoutConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
