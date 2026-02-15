import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  TextInput,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useLocationStore } from '../../src/store/locationStore';
import { dashboardApi, retailproApi } from '../../src/api/client';
import ProductSwitcher from '../../src/components/ProductSwitcher';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import AdvertCarousel, { Advert } from '../../src/components/AdvertCarousel';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Order {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  notes?: string;
}

interface DashboardStats {
  total_sales_today: number;
  total_orders_today: number;
  total_customers: number;
  total_products: number;
  low_stock_products: number;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  recent_orders: Array<Order>;
  sales_by_payment_method: { cash: number; card: number; mobile_money: number; credit: number };
}

type TabType = 'overview' | 'sales' | 'inventory' | 'customers';

// Define all available apps in the Software Galaxy suite
interface GalaxyApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  gradientColors: [string, string];
  route: string;
  benefits: string[];
}

const ALL_GALAXY_APPS: GalaxyApp[] = [
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock Management',
    description: 'Track stock levels in real-time, get low stock alerts, and manage your suppliers efficiently.',
    icon: 'layers-outline',
    iconColor: '#06B6D4',
    bgColor: '#CFFAFE',
    gradientColors: ['#0891B2', '#06B6D4'],
    route: '/inventory',
    benefits: ['Real-time stock tracking', 'Low stock alerts', 'Sync with POS', 'Barcode scanning'],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Cost Tracking',
    description: 'Track all your business expenses, scan receipts, and generate detailed expense reports.',
    icon: 'wallet-outline',
    iconColor: '#EF4444',
    bgColor: '#FEE2E2',
    gradientColors: ['#DC2626', '#EF4444'],
    route: '/expenses',
    benefits: ['Track business expenses', 'Receipt scanning', 'Expense reports', 'Tax categories'],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Rewards',
    description: 'Build customer loyalty with points, tiers, and rewards. Increase retention and repeat business.',
    icon: 'heart-outline',
    iconColor: '#EC4899',
    bgColor: '#FCE7F3',
    gradientColors: ['#DB2777', '#EC4899'],
    route: '/loyalty',
    benefits: ['Customer rewards program', 'Points & tiers', 'Retention tracking', 'VIP management'],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Bills & Quotes',
    description: 'Create professional invoices, track payments, and manage your B2B clients seamlessly.',
    icon: 'document-text-outline',
    iconColor: '#2563EB',
    bgColor: '#DBEAFE',
    gradientColors: ['#1D4ED8', '#2563EB'],
    route: '/invoicing',
    benefits: ['Professional invoices', 'Quote generation', 'Payment tracking', 'Multi-currency'],
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Payment Processing',
    description: 'Accept payments via multiple gateways, track transactions, and manage payouts effortlessly.',
    icon: 'card-outline',
    iconColor: '#10B981',
    bgColor: '#D1FAE5',
    gradientColors: ['#059669', '#10B981'],
    route: '/kwikpay',
    benefits: ['Accept payments', 'Multiple gateways', 'Transaction history', 'Payout management'],
  },
];

// Default linked apps for RetailPro
const DEFAULT_LINKED_APPS = ['inventory', 'invoicing', 'kwikpay'];

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user, logout } = useAuthStore();
  const { formatCurrency, formatNumber } = useBusinessStore();
  const { selectedLocationId } = useLocationStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  // Linked Apps State - Initialize empty, fetch from API
  const [linkedAppIds, setLinkedAppIds] = useState<string[]>([]);
  const [appsWithStatus, setAppsWithStatus] = useState<any[]>([]);
  const [linkedAppsLoading, setLinkedAppsLoading] = useState(true); // Start with loading true
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [linkedApp, setLinkedApp] = useState<GalaxyApp | null>(null);
  const [selectedApp, setSelectedApp] = useState<GalaxyApp | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('starter');
  const [upgrading, setUpgrading] = useState(false);
  
  // iOS-style edit mode for mobile (triggered by long press)
  const [editMode, setEditMode] = useState(false);
  const [confirmingUnlinkId, setConfirmingUnlinkId] = useState<string | null>(null);
  
  // Multi-state modal phase: 'details' -> 'syncing' -> 'success'
  const [linkModalPhase, setLinkModalPhase] = useState<'details' | 'syncing' | 'success'>('details');
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Confetti ref for animated celebration
  const confettiRef = useRef<any>(null);
  
  // Share & Earn Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{
    referralCode: string | null;
    promoCode: string | null;
    isAffiliate: boolean;
    creditBalance: number;
    referralReward: number;
  }>({
    referralCode: null,
    promoCode: null,
    isAffiliate: false,
    creditBalance: 0,
    referralReward: 10,
  });
  const [loadingShareData, setLoadingShareData] = useState(false);

  // Adverts Carousel State
  const [adverts, setAdverts] = useState<Advert[]>([]);

  // Get linked and available apps with trial status
  const linkedApps = ALL_GALAXY_APPS.filter(app => linkedAppIds.includes(app.id));
  const availableApps = ALL_GALAXY_APPS.filter(app => !linkedAppIds.includes(app.id));

  // Get trial status for a specific app
  const getAppStatus = (appId: string) => {
    return appsWithStatus.find(a => a.app_id === appId) || { status: 'included', days_remaining: 0 };
  };

  // Check if any app has expiring trial (for warning banner)
  const expiringApps = appsWithStatus.filter(a => a.status === 'expiring_soon' || a.status === 'expired');

  // Fetch adverts from backend
  const fetchAdverts = async () => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/adverts/public?product=retailpro&language=en`);
      if (response.ok) {
        const data = await response.json();
        setAdverts(data);
      }
    } catch (error) {
      console.log('Failed to fetch adverts:', error);
    }
  };

  // Fetch linked apps from backend
  const fetchLinkedApps = async () => {
    try {
      setLinkedAppsLoading(true);
      const response = await retailproApi.getLinkedApps();
      if (response.data?.linked_apps) {
        setLinkedAppIds(response.data.linked_apps);
      } else {
        // Only use defaults if API returns no data
        setLinkedAppIds(DEFAULT_LINKED_APPS);
      }
      if (response.data?.apps_with_status) {
        setAppsWithStatus(response.data.apps_with_status);
      }
    } catch (error) {
      console.log('Failed to fetch linked apps:', error);
      // Only use defaults on API error
      setLinkedAppIds(DEFAULT_LINKED_APPS);
    } finally {
      setLinkedAppsLoading(false);
    }
  };

  // Handle linking an app
  const handleLinkApp = (app: GalaxyApp) => {
    setSelectedApp(app);
    setLinkModalPhase('details'); // Reset to initial phase
    setSyncProgress(0);
    setShowLinkModal(true);
  };

  // Handle unlinking an app (long press)
  const handleUnlinkApp = (app: GalaxyApp) => {
    setSelectedApp(app);
    setShowUnlinkModal(true);
    // Exit edit mode when showing unlink modal
    setEditMode(false);
  };

  // Handle upgrade (when trial expires or user wants to upgrade)
  const handleUpgrade = (app: GalaxyApp) => {
    setSelectedApp(app);
    setSelectedPlan('starter');
    setShowUpgradeModal(true);
  };

  // Confirm link - calls backend API with phase transitions
  const confirmLinkApp = async () => {
    if (selectedApp) {
      // Transition to syncing phase
      setLinkModalPhase('syncing');
      setSyncProgress(0);
      
      // Slower animate progress - takes about 3 seconds total
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            return prev;
          }
          // Slower increments: ~5-8% every 400ms
          return prev + Math.random() * 3 + 5;
        });
      }, 400);
      
      try {
        const response = await retailproApi.updateLinkedApp(selectedApp.id, 'link');
        
        // Complete the progress smoothly
        clearInterval(progressInterval);
        
        // Animate to 100% over 500ms
        setSyncProgress(95);
        await new Promise(resolve => setTimeout(resolve, 300));
        setSyncProgress(100);
        
        if (response.data?.linked_apps) {
          setLinkedAppIds(response.data.linked_apps);
        }
        // Update apps with status
        if (response.data?.app_status) {
          setAppsWithStatus(prev => {
            const existing = prev.filter(a => a.app_id !== selectedApp.id);
            return [...existing, response.data.app_status];
          });
        }
        
        // Delay before transitioning to success and firing confetti
        setTimeout(() => {
          setLinkModalPhase('success');
          // Fire confetti after modal shows success
          setTimeout(() => {
            confettiRef.current?.start();
          }, 100);
        }, 600);
        
      } catch (error) {
        console.log('Failed to link app:', error);
        clearInterval(progressInterval);
        setSyncProgress(100);
        // Optimistic update fallback
        setLinkedAppIds(prev => [...prev, selectedApp.id]);
        // Still show success even on error (optimistic)
        setTimeout(() => {
          setLinkModalPhase('success');
          setTimeout(() => {
            confettiRef.current?.start();
          }, 100);
        }, 600);
      }
    }
  };

  // Handle opening the app from unified modal
  const handleOpenAppFromModal = () => {
    if (selectedApp) {
      const route = selectedApp.route;
      // Fire another burst of confetti before transitioning
      confettiRef.current?.start();
      
      // Delay to let user enjoy the celebration before navigating
      setTimeout(() => {
        setShowLinkModal(false);
        setLinkModalPhase('details');
        setSyncProgress(0);
        router.push(route as any);
        setSelectedApp(null);
      }, 1500); // 1.5 second delay to enjoy confetti
    }
  };

  // Handle staying on dashboard from unified modal
  const handleStayOnDashboard = () => {
    // Fire one more confetti burst
    confettiRef.current?.start();
    
    // Delay before closing
    setTimeout(() => {
      setShowLinkModal(false);
      setLinkModalPhase('details');
      setSyncProgress(0);
      setSelectedApp(null);
    }, 1200); // 1.2 second delay
  };

  // Handle closing the modal (only allowed during details phase)
  const handleCloseLinkModal = () => {
    if (linkModalPhase === 'details') {
      setShowLinkModal(false);
      setSelectedApp(null);
      setLinkModalPhase('details');
      setSyncProgress(0);
    }
  };

  // Confirm unlink - calls backend API
  const confirmUnlinkApp = async () => {
    if (selectedApp) {
      setLinkedAppsLoading(true);
      try {
        const response = await retailproApi.updateLinkedApp(selectedApp.id, 'unlink');
        if (response.data?.linked_apps) {
          setLinkedAppIds(response.data.linked_apps);
        }
      } catch (error) {
        console.log('Failed to unlink app:', error);
        // Optimistic update fallback
        setLinkedAppIds(prev => prev.filter(id => id !== selectedApp.id));
      } finally {
        setLinkedAppsLoading(false);
      }
    }
    setShowUnlinkModal(false);
    setSelectedApp(null);
  };

  // Confirm upgrade - mock payment
  const confirmUpgrade = async () => {
    if (selectedApp) {
      setUpgrading(true);
      try {
        const response = await retailproApi.upgradeApp(selectedApp.id, selectedPlan);
        if (response.data?.success) {
          // Update the status
          setAppsWithStatus(prev => 
            prev.map(a => 
              a.app_id === selectedApp.id 
                ? { ...a, status: 'paid', plan: selectedPlan }
                : a
            )
          );
        }
      } catch (error) {
        console.log('Failed to upgrade:', error);
      } finally {
        setUpgrading(false);
      }
    }
    setShowUpgradeModal(false);
    setSelectedApp(null);
  };
  
  // Fetch referral/affiliate share data
  const fetchShareData = async () => {
    try {
      setLoadingShareData(true);
      const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('token');
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch referral info
      const referralRes = await fetch(`${API_URL}/api/referrals/my-referral`, { headers });
      const referralData = await referralRes.json();
      
      // Fetch affiliate profile
      const affiliateRes = await fetch(`${API_URL}/api/affiliates/my-profile`, { headers });
      const affiliateData = await affiliateRes.json();
      
      // Fetch referral config for reward amount
      const configRes = await fetch(`${API_URL}/api/referrals/config`, { headers });
      const configData = await configRes.json();
      
      setShareData({
        referralCode: referralData?.referral_code || null,
        promoCode: affiliateData?.is_affiliate && affiliateData?.profile?.promo_code ? affiliateData.profile.promo_code : null,
        isAffiliate: affiliateData?.is_affiliate && affiliateData?.profile?.status === 'active',
        creditBalance: referralData?.credit_balance || 0,
        referralReward: configData?.referee_reward || 10,
      });
    } catch (error) {
      console.log('Failed to fetch share data:', error);
    } finally {
      setLoadingShareData(false);
    }
  };
  
  // Handle opening share modal
  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    await fetchShareData();
  };
  
  // Copy code to clipboard
  const copyToClipboard = async (code: string) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(code);
      } else {
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(code);
      }
      // Show a brief notification (could enhance with toast)
      alert('Code copied to clipboard!');
    } catch (error) {
      console.log('Failed to copy:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getStats(selectedLocationId);
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
    fetchLinkedApps(); // Fetch linked apps on mount
    fetchAdverts(); // Fetch adverts for carousel
  }, [selectedLocationId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
    fetchLinkedApps(); // Also refresh linked apps
    fetchAdverts(); // Refresh adverts
  }, [selectedLocationId]);

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
          onPress={() => router.push('/inventory')}
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
          onPress={() => router.push('/inventory')}
        >
          <Ionicons name="layers-outline" size={24} color="#10B981" />
          <Text style={styles.inventoryActionText}>Inventory</Text>
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
      {/* Web Page Header */}
      <View style={webDashStyles.pageHeader}>
        <View>
          <Text style={webDashStyles.pageTitle}>Dashboard</Text>
          <Text style={webDashStyles.pageSubtitle}>Retail Pro - Point of Sale Overview</Text>
        </View>
        <TouchableOpacity style={webDashStyles.newSaleBtn} onPress={() => router.push('/(tabs)/cart')}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={webDashStyles.newSaleBtnText}>New Sale</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={webDashStyles.dashboardContent}
      >
        {/* Advertisement Carousel */}
        {adverts.length > 0 && (
          <AdvertCarousel
            adverts={adverts}
            autoPlayInterval={5000}
            showDots={true}
            showArrows={true}
            height={100}
            variant="card"
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Stats Row */}
        <View style={webDashStyles.statsRow}>
          <View style={webDashStyles.statCard}>
            <View style={[webDashStyles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cash" size={24} color="#10B981" />
            </View>
            <View style={webDashStyles.statInfo}>
              <Text style={webDashStyles.statValue}>{formatCurrency(stats?.total_sales_today || 0)}</Text>
              <Text style={webDashStyles.statLabel}>Today's Sales</Text>
            </View>
          </View>
          
          <View style={webDashStyles.statCard}>
            <View style={[webDashStyles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="receipt" size={24} color="#2563EB" />
            </View>
            <View style={webDashStyles.statInfo}>
              <Text style={webDashStyles.statValue}>{stats?.total_orders_today || 0}</Text>
              <Text style={webDashStyles.statLabel}>Orders Today</Text>
            </View>
          </View>
          
          <View style={webDashStyles.statCard}>
            <View style={[webDashStyles.statIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="people" size={24} color="#8B5CF6" />
            </View>
            <View style={webDashStyles.statInfo}>
              <Text style={webDashStyles.statValue}>{stats?.total_customers || 0}</Text>
              <Text style={webDashStyles.statLabel}>Customers</Text>
            </View>
          </View>
          
          <View style={webDashStyles.statCard}>
            <View style={[webDashStyles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cube" size={24} color="#F59E0B" />
            </View>
            <View style={webDashStyles.statInfo}>
              <Text style={webDashStyles.statValue}>{stats?.total_products || 0}</Text>
              <Text style={webDashStyles.statLabel}>Products</Text>
            </View>
          </View>
        </View>

        {/* Charts Row - Analytics Section */}
        <View style={webDashStyles.chartsRow}>
          {/* Sales by Payment - Pie Chart */}
          <View style={webDashStyles.chartCard}>
            <Text style={webDashStyles.chartTitle}>Sales by Payment</Text>
            <View style={webDashStyles.chartContainer}>
              <PieChart
                data={[
                  { value: stats?.sales_by_payment_method?.cash || 1, color: '#10B981', text: 'Cash' },
                  { value: stats?.sales_by_payment_method?.card || 1, color: '#2563EB', text: 'Card' },
                  { value: stats?.sales_by_payment_method?.mobile_money || 1, color: '#F59E0B', text: 'Mobile' },
                  { value: stats?.sales_by_payment_method?.credit || 1, color: '#8B5CF6', text: 'Credit' },
                ]}
                donut
                radius={70}
                innerRadius={45}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{formatCurrency(totalPayments)}</Text>
                    <Text style={{ fontSize: 10, color: '#6B7280' }}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={webDashStyles.chartLegend}>
              <View style={webDashStyles.legendItem}>
                <View style={[webDashStyles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={webDashStyles.legendText}>Cash ({formatCurrency(stats?.sales_by_payment_method?.cash || 0)})</Text>
              </View>
              <View style={webDashStyles.legendItem}>
                <View style={[webDashStyles.legendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={webDashStyles.legendText}>Card ({formatCurrency(stats?.sales_by_payment_method?.card || 0)})</Text>
              </View>
              <View style={webDashStyles.legendItem}>
                <View style={[webDashStyles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={webDashStyles.legendText}>Mobile ({formatCurrency(stats?.sales_by_payment_method?.mobile_money || 0)})</Text>
              </View>
              <View style={webDashStyles.legendItem}>
                <View style={[webDashStyles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={webDashStyles.legendText}>Credit ({formatCurrency(stats?.sales_by_payment_method?.credit || 0)})</Text>
              </View>
            </View>
          </View>

          {/* Top Products - Bar Chart */}
          <View style={webDashStyles.chartCard}>
            <Text style={webDashStyles.chartTitle}>Top Products</Text>
            <View style={webDashStyles.chartContainer}>
              {stats?.top_products && stats.top_products.length > 0 ? (
                <BarChart
                  data={stats.top_products.slice(0, 5).map((p: any, idx: number) => ({
                    value: p.revenue || 0,
                    label: p.name?.substring(0, 4) || `P${idx + 1}`,
                    frontColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][idx] || '#2563EB',
                  }))}
                  barWidth={28}
                  barBorderRadius={6}
                  height={120}
                  width={220}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#E5E7EB"
                  xAxisLabelTextStyle={{ fontSize: 10, color: '#6B7280' }}
                  hideRules
                  isAnimated
                />
              ) : (
                <View style={webDashStyles.chartPlaceholder}>
                  <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
                  <Text style={webDashStyles.chartPlaceholderText}>No data yet</Text>
                </View>
              )}
            </View>
          </View>

          {/* Daily Sales Trend - Line Chart */}
          <View style={webDashStyles.chartCard}>
            <Text style={webDashStyles.chartTitle}>Sales Trend</Text>
            <View style={webDashStyles.chartContainer}>
              {stats?.daily_sales && stats.daily_sales.length > 0 ? (
                <LineChart
                  data={stats.daily_sales.map((d: any) => ({ value: d.sales || 0 }))}
                  height={120}
                  width={220}
                  spacing={40}
                  color1="#2563EB"
                  thickness={3}
                  hideDataPoints={false}
                  dataPointsColor1="#2563EB"
                  dataPointsRadius={5}
                  curved
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#E5E7EB"
                  hideRules
                  xAxisLabelTexts={stats.daily_sales.map((d: any) => d.day || '')}
                  xAxisLabelTextStyle={{ fontSize: 10, color: '#6B7280' }}
                  isAnimated
                />
              ) : (
                <View style={webDashStyles.chartPlaceholder}>
                  <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
                  <Text style={webDashStyles.chartPlaceholderText}>No data yet</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={webDashStyles.mainContent}>
          {/* Recent Orders Table */}
          <View style={webDashStyles.tableCard}>
            <View style={webDashStyles.tableHeader}>
              <Text style={webDashStyles.tableTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={webDashStyles.viewAllLink}>View All →</Text>
              </TouchableOpacity>
            </View>
            
            {/* Table Header */}
            <View style={webDashStyles.tableHeaderRow}>
              <Text style={[webDashStyles.tableHeaderCell, { flex: 1.5 }]}>ORDER ID</Text>
              <Text style={[webDashStyles.tableHeaderCell, { flex: 2 }]}>CUSTOMER</Text>
              <Text style={[webDashStyles.tableHeaderCell, { flex: 1 }]}>ITEMS</Text>
              <Text style={[webDashStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>AMOUNT</Text>
              <Text style={[webDashStyles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
            </View>

            {/* Table Body */}
            {!stats?.recent_orders || stats.recent_orders.length === 0 ? (
              <View style={webDashStyles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#6B7280" />
                <Text style={webDashStyles.emptyText}>No recent orders</Text>
                <TouchableOpacity style={webDashStyles.emptyBtn} onPress={() => router.push('/(tabs)/cart')}>
                  <Text style={webDashStyles.emptyBtnText}>Create First Order</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stats.recent_orders.slice(0, 10).map((order: Order) => (
                <TouchableOpacity 
                  key={order.id} 
                  style={webDashStyles.tableRow}
                  onPress={() => setViewingOrder(order)}
                >
                  <Text style={[webDashStyles.tableCell, { flex: 1.5, fontWeight: '600' }]}>#{order.order_number || order.id?.substring(0, 8)}</Text>
                  <Text style={[webDashStyles.tableCell, { flex: 2 }]}>{order.customer_name || 'Walk-in'}</Text>
                  <Text style={[webDashStyles.tableCell, { flex: 1 }]}>{order.items?.length || 0} items</Text>
                  <Text style={[webDashStyles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(order.total || 0)}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[webDashStyles.statusBadge, { 
                      backgroundColor: order.status === 'completed' ? '#D1FAE5' : '#FEF3C7' 
                    }]}>
                      <Text style={[webDashStyles.statusText, { 
                        color: order.status === 'completed' ? '#059669' : '#D97706' 
                      }]}>
                        {order.status === 'completed' ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Actions Sidebar */}
          <View style={webDashStyles.sidebar}>
            <View style={webDashStyles.quickActionsCard}>
              <Text style={webDashStyles.quickActionsTitle}>Quick Actions</Text>
              <TouchableOpacity style={webDashStyles.quickActionBtn} onPress={() => router.push('/(tabs)/cart')}>
                <Ionicons name="cart" size={20} color="#2563EB" />
                <Text style={webDashStyles.quickActionText}>New Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity style={webDashStyles.quickActionBtn} onPress={() => router.push('/(tabs)/customers')}>
                <Ionicons name="person-add" size={20} color="#2563EB" />
                <Text style={webDashStyles.quickActionText}>Add Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={webDashStyles.quickActionBtn} onPress={() => router.push('/(tabs)/products')}>
                <Ionicons name="cube" size={20} color="#2563EB" />
                <Text style={webDashStyles.quickActionText}>Manage Products</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[webDashStyles.quickActionBtn, { backgroundColor: '#FEF3C7' }]} 
                onPress={handleOpenShareModal}
                data-testid="share-earn-button"
              >
                <Ionicons name="gift" size={20} color="#D97706" />
                <Text style={[webDashStyles.quickActionText, { color: '#D97706' }]}>Share & Earn</Text>
              </TouchableOpacity>
            </View>

            <View style={webDashStyles.linksCard}>
              <Text style={webDashStyles.linksTitle}>Navigation</Text>
              <TouchableOpacity style={webDashStyles.linkItem} onPress={() => router.push('/(tabs)/orders')}>
                <Ionicons name="receipt-outline" size={20} color="#6B7280" />
                <Text style={webDashStyles.linkText}>Orders</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={webDashStyles.linkItem} onPress={() => router.push('/(tabs)/customers')}>
                <Ionicons name="people-outline" size={20} color="#6B7280" />
                <Text style={webDashStyles.linkText}>Customers</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={webDashStyles.linkItem} onPress={() => router.push('/inventory')}>
                <Ionicons name="layers-outline" size={20} color="#6B7280" />
                <Text style={webDashStyles.linkText}>Inventory</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={webDashStyles.linkItem} onPress={() => router.push('/admin/staff')}>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <Text style={webDashStyles.linkText}>Staff</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // ============== MOBILE DASHBOARD (ORIGINAL) ==============
  const MobileDashboard = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
        {/* Apps Grid Icon with Dropdown */}
        <ProductSwitcher currentProductId="retailpro" />
      </View>

      {/* Advertisement Carousel for Mobile */}
      {adverts.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <AdvertCarousel
            adverts={adverts}
            autoPlayInterval={5000}
            showDots={true}
            showArrows={false}
            height={90}
            variant="card"
          />
        </View>
      )}

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

      {/* Sales by Payment Card Container */}
      <View style={styles.salesPaymentCard}>
        <Text style={styles.cardSectionTitle}>Sales by Payment</Text>
        <View style={styles.paymentStatsGrid}>
          <View style={styles.paymentStatItem}>
            <View style={[styles.paymentIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cash-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.paymentStatLabel}>Cash</Text>
            <Text style={styles.paymentStatValue}>
              {formatCurrency(stats?.sales_by_payment_method?.cash || 0)}
            </Text>
          </View>
          <View style={styles.paymentStatItem}>
            <View style={[styles.paymentIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="card-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.paymentStatLabel}>Card</Text>
            <Text style={styles.paymentStatValue}>
              {formatCurrency(stats?.sales_by_payment_method?.card || 0)}
            </Text>
          </View>
          <View style={styles.paymentStatItem}>
            <View style={[styles.paymentIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.paymentStatLabel}>Mobile</Text>
            <Text style={styles.paymentStatValue}>
              {formatCurrency(stats?.sales_by_payment_method?.mobile_money || 0)}
            </Text>
          </View>
          <View style={styles.paymentStatItem}>
            <View style={[styles.paymentIconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="time-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.paymentStatLabel}>Credit</Text>
            <Text style={styles.paymentStatValue}>
              {formatCurrency(stats?.sales_by_payment_method?.credit || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions Card Container - Always show content (only 4 items) */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.cardSectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/(tabs)/products')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.quickActionLabel}>New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="receipt-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionLabel}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/(tabs)/customers')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="person-add-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionLabel}>New Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/admin/cash-register')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="cash-outline" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.quickActionLabel}>Cash Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(stats?.top_products?.length || 0) > 0 && (
        <View style={styles.topProductsCard}>
          <Text style={styles.cardSectionTitle}>Top Products Today</Text>
          <View style={styles.topProductsList}>
            {stats?.top_products.slice(0, 3).map((product, index) => (
              <View key={index} style={styles.topProductItemCard}>
                <View style={styles.topProductRankBadge}>
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
        </View>
      )}

      {user?.role === 'admin' && (
        <View style={styles.adminToolsCard}>
          <Text style={styles.cardSectionTitle}>Admin Tools</Text>
          <View style={styles.adminToolsGrid}>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/products')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cube-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.adminToolLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/categories')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="folder-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.adminToolLabel}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/promotions')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="pricetag-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.adminToolLabel}>Discounts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/reports')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="bar-chart-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.adminToolLabel}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/staff')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="people-outline" size={24} color="#DC2626" />
              </View>
              <Text style={styles.adminToolLabel}>Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/settings?tab=locations')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="location-outline" size={24} color="#0EA5E9" />
              </View>
              <Text style={styles.adminToolLabel}>Locations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminToolItem}
              onPress={() => router.push('/admin/settings')}
            >
              <View style={[styles.adminToolIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="settings-outline" size={24} color="#6B7280" />
              </View>
              <Text style={styles.adminToolLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Trial Expiration Warning Banner */}
      {['admin', 'manager', 'superadmin'].includes(user?.role || '') && expiringApps.length > 0 && (
        <View style={styles.trialWarningBanner}>
          <View style={styles.trialWarningIcon}>
            <Ionicons name="warning" size={20} color="#D97706" />
          </View>
          <View style={styles.trialWarningContent}>
            <Text style={styles.trialWarningTitle}>
              {expiringApps.some(a => a.status === 'expired') 
                ? 'Trial Expired' 
                : 'Trial Ending Soon'}
            </Text>
            <Text style={styles.trialWarningText}>
              {expiringApps.map(a => {
                const app = ALL_GALAXY_APPS.find(g => g.id === a.app_id);
                return a.status === 'expired' 
                  ? `${app?.name} trial has expired`
                  : `${app?.name}: ${a.days_remaining} days left`;
              }).join(' • ')}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.trialWarningButton}
            onPress={() => {
              const expApp = ALL_GALAXY_APPS.find(a => a.id === expiringApps[0]?.app_id);
              if (expApp) handleUpgrade(expApp);
            }}
          >
            <Text style={styles.trialWarningButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Linked Apps Card */}
      {['admin', 'manager', 'superadmin'].includes(user?.role || '') && (
        <View style={styles.linkedAppsCard}>
          <Text style={styles.cardSectionTitle}>Linked Apps</Text>
          <Text style={styles.linkedAppsDesc}>
            Apps connected to your RetailPro {!editMode && '• Long press to edit'}
          </Text>
          
          {linkedAppsLoading && linkedApps.length === 0 ? (
            <View style={styles.linkedAppsLoadingContainer}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.linkedAppsLoadingText}>Loading apps...</Text>
            </View>
          ) : linkedApps.length === 0 ? (
            <View style={styles.noLinkedAppsContainer}>
              <Ionicons name="apps-outline" size={32} color="#9CA3AF" />
              <Text style={styles.noLinkedAppsText}>No apps linked yet</Text>
              <Text style={styles.noLinkedAppsSubtext}>Link apps from below to get started</Text>
            </View>
          ) : (
            <View style={styles.linkedAppsGrid}>
              {linkedApps.slice(0, 4).map((app, index) => {
              const status = getAppStatus(app.id);
              const isExpired = status.status === 'expired';
              const isExpiringSoon = status.status === 'expiring_soon';
              const isPaid = status.status === 'paid';
              const isIncluded = status.status === 'included';
              const isConfirming = confirmingUnlinkId === app.id;
              
              return (
                <View key={app.id} style={styles.linkedAppItemWrapper}>
                  {isConfirming ? (
                    /* Inline Confirmation Card */
                    <View style={styles.mobileInlineConfirm}>
                      <Text style={styles.mobileConfirmText}>Unlink?</Text>
                      <View style={styles.mobileConfirmButtons}>
                        <TouchableOpacity
                          style={styles.mobileConfirmYes}
                          onPress={async () => {
                            setLinkedAppsLoading(true);
                            try {
                              const response = await retailproApi.updateLinkedApp(app.id, 'unlink');
                              if (response.data?.linked_apps) {
                                setLinkedAppIds(response.data.linked_apps);
                              }
                            } catch (error) {
                              setLinkedAppIds(prev => prev.filter(id => id !== app.id));
                            } finally {
                              setLinkedAppsLoading(false);
                              setConfirmingUnlinkId(null);
                              setEditMode(false);
                            }
                          }}
                        >
                          <Text style={styles.mobileConfirmYesText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.mobileConfirmNo}
                          onPress={() => setConfirmingUnlinkId(null)}
                        >
                          <Text style={styles.mobileConfirmNoText}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.linkedAppItem, 
                        isExpired && styles.expiredAppItem,
                        editMode && styles.linkedAppItemEditMode
                      ]}
                      onPress={() => {
                        if (editMode) {
                          // In edit mode, tapping the card goes to the app
                          router.push(app.route as any);
                        } else if (isExpired) {
                          handleUpgrade(app);
                        } else {
                          router.push(app.route as any);
                        }
                      }}
                      onLongPress={() => setEditMode(true)}
                      delayLongPress={500}
                    >
                      {/* Unlink X Button - Only visible in edit mode (iOS style) */}
                      {editMode && (
                        <TouchableOpacity
                          style={styles.mobileUnlinkBtn}
                          onPress={() => setConfirmingUnlinkId(app.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                      
                      {/* Status Badge */}
                      <View style={styles.linkedBadge}>
                        {isExpired ? (
                          <Ionicons name="alert-circle" size={14} color="#DC2626" />
                        ) : isExpiringSoon ? (
                          <View style={styles.daysLeftBadge}>
                            <Text style={styles.daysLeftText}>{status.days_remaining}d</Text>
                          </View>
                        ) : isPaid ? (
                          <Ionicons name="star" size={14} color="#F59E0B" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        )}
                      </View>
                      
                      <View style={[styles.linkedAppIcon, { backgroundColor: app.bgColor, opacity: isExpired ? 0.5 : 1 }]}>
                        <Ionicons name={app.icon} size={28} color={app.iconColor} />
                      </View>
                      <Text style={[styles.linkedAppName, isExpired && { color: '#9CA3AF' }]}>{app.name}</Text>
                      
                      {/* Status Text */}
                      {isExpired ? (
                        <Text style={styles.expiredText}>Expired</Text>
                      ) : isExpiringSoon ? (
                        <Text style={styles.expiringSoonText}>{status.days_remaining} days left</Text>
                      ) : isPaid ? (
                        <Text style={styles.paidText}>{status.plan || 'Pro'}</Text>
                      ) : isIncluded ? (
                        <Text style={styles.includedText}>Included</Text>
                      ) : (
                        <Text style={styles.linkedAppStatus}>Active</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            </View>
          )}
        </View>
      )}

      {/* Available Apps Card */}
      {['admin', 'manager', 'superadmin'].includes(user?.role || '') && availableApps.length > 0 && (
        <View style={styles.availableAppsCard}>
          <Text style={styles.cardSectionTitle}>Available Apps</Text>
          <Text style={styles.linkedAppsDesc}>
            Connect more apps to extend RetailPro functionality
          </Text>
          <View style={styles.linkedAppsGrid}>
            {availableApps.map((app) => (
              <View key={app.id} style={styles.linkedAppItemWrapper}>
                <TouchableOpacity
                  style={[styles.linkedAppItem, styles.availableAppItem]}
                  onPress={() => handleLinkApp(app)}
                >
                  <View style={[styles.linkedAppIcon, { backgroundColor: app.bgColor, opacity: 0.8 }]}>
                    <Ionicons name={app.icon} size={28} color={app.iconColor} />
                  </View>
                  <Text style={styles.linkedAppName}>{app.name}</Text>
                  <View style={styles.linkButton}>
                    <Ionicons name="add" size={12} color="#FFFFFF" />
                    <Text style={styles.linkButtonText}>Link</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* All Apps Linked Message */}
      {['admin', 'manager', 'superadmin'].includes(user?.role || '') && availableApps.length === 0 && (
        <View style={styles.allLinkedCard}>
          <Ionicons name="checkmark-circle" size={32} color="#059669" />
          <Text style={styles.allLinkedTitle}>All Apps Linked!</Text>
          <Text style={styles.allLinkedDesc}>You've connected all available Software Galaxy apps</Text>
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
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        variant="danger"
        icon="log-out-outline"
      />

      {/* Unified Link App Modal - Multi-State (Details → Syncing → Success) */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLinkModal}
      >
        <TouchableOpacity 
          style={styles.linkModalOverlay} 
          activeOpacity={1} 
          onPress={handleCloseLinkModal}
        >
          <View 
            style={styles.linkCardModal}
            onStartShouldSetResponder={() => true}
          >
            {selectedApp && (
              <>
                {/* Gradient Header - Changes based on phase */}
                <LinearGradient
                  colors={selectedApp.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.linkCardHeader,
                    linkModalPhase === 'success' && styles.successHeaderExpanded
                  ]}
                >
                  {/* Close Button - Only visible in details phase */}
                  {linkModalPhase === 'details' && (
                    <TouchableOpacity 
                      style={styles.linkCardCloseBtn}
                      onPress={handleCloseLinkModal}
                    >
                      <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                  )}

                  {/* App Icon with different states */}
                  {linkModalPhase === 'details' && (
                    <View style={styles.linkCardIconContainer}>
                      <Ionicons name={selectedApp.icon} size={40} color="#FFFFFF" />
                    </View>
                  )}
                  
                  {linkModalPhase === 'syncing' && (
                    <View style={styles.syncingIconContainer}>
                      <View style={styles.syncingIconInner}>
                        <Ionicons name={selectedApp.icon} size={32} color={selectedApp.iconColor} />
                      </View>
                      <ActivityIndicator 
                        size="large" 
                        color="#FFFFFF" 
                        style={styles.syncingSpinner}
                      />
                    </View>
                  )}
                  
                  {linkModalPhase === 'success' && (
                    <View style={styles.successIconWrapper}>
                      <View style={styles.successIconCircle}>
                        <Ionicons name={selectedApp.icon} size={32} color={selectedApp.iconColor} />
                      </View>
                      <View style={styles.successCheckBadge}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                      </View>
                    </View>
                  )}

                  {/* Header Text - Changes based on phase */}
                  {linkModalPhase === 'details' && (
                    <>
                      <Text style={styles.linkCardAppName}>{selectedApp.name}</Text>
                      <Text style={styles.linkCardTagline}>{selectedApp.tagline}</Text>
                    </>
                  )}
                  
                  {linkModalPhase === 'syncing' && (
                    <>
                      <Text style={styles.linkCardAppName}>Syncing {selectedApp.name}</Text>
                      <Text style={styles.linkCardTagline}>Please wait...</Text>
                    </>
                  )}
                  
                  {linkModalPhase === 'success' && (
                    <Text style={styles.successTitle}>Successfully Linked!</Text>
                  )}
                </LinearGradient>

                {/* Content - Changes based on phase */}
                <View style={styles.linkCardContent}>
                  
                  {/* DETAILS PHASE */}
                  {linkModalPhase === 'details' && (
                    <>
                      <Text style={styles.linkCardDescription}>
                        {selectedApp.description}
                      </Text>

                      <Text style={styles.linkCardBenefitsTitle}>What you'll get:</Text>
                      <View style={styles.linkCardBenefitsList}>
                        {selectedApp.benefits.map((benefit, index) => (
                          <View key={index} style={styles.linkCardBenefitItem}>
                            <View style={[styles.linkCardCheckCircle, { backgroundColor: selectedApp.bgColor }]}>
                              <Ionicons name="checkmark" size={12} color={selectedApp.iconColor} />
                            </View>
                            <Text style={styles.linkCardBenefitText}>{benefit}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.linkCardActions}>
                        <TouchableOpacity 
                          style={styles.linkCardCancelBtn}
                          onPress={handleCloseLinkModal}
                        >
                          <Text style={styles.linkCardCancelText}>Maybe Later</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.linkCardConfirmBtn, { backgroundColor: selectedApp.iconColor }]}
                          onPress={confirmLinkApp}
                        >
                          <Ionicons name="flash" size={16} color="#FFFFFF" />
                          <Text style={styles.linkCardConfirmText}>Start Free Trial</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  
                  {/* SYNCING PHASE */}
                  {linkModalPhase === 'syncing' && (
                    <View style={styles.syncingContent}>
                      <Text style={styles.syncingTitle}>Setting up {selectedApp.name}</Text>
                      <Text style={styles.syncingSubtitle}>
                        Connecting to your RetailPro account...
                      </Text>
                      
                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${Math.min(syncProgress, 100)}%`,
                              backgroundColor: selectedApp.iconColor 
                            }
                          ]} 
                        />
                      </View>
                      
                      <View style={styles.syncingSteps}>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress > 30 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress > 30 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress > 30 && styles.syncingStepComplete
                          ]}>
                            Verifying account
                          </Text>
                        </View>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress > 60 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress > 60 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress > 60 && styles.syncingStepComplete
                          ]}>
                            Syncing data
                          </Text>
                        </View>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress >= 100 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress >= 100 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress >= 100 && styles.syncingStepComplete
                          ]}>
                            Activating trial
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {/* SUCCESS PHASE */}
                  {linkModalPhase === 'success' && (
                    <View style={styles.successContentInner}>
                      <Text style={styles.successAppName}>{selectedApp.name}</Text>
                      <Text style={styles.successMessage}>
                        is now connected to your RetailPro
                      </Text>

                      {/* Trial Info Card */}
                      <View style={styles.trialInfoCard}>
                        <View style={styles.trialInfoIcon}>
                          <Ionicons name="gift" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.trialInfoText}>
                          <Text style={styles.trialInfoTitle}>7-Day Free Trial Started</Text>
                          <Text style={styles.trialInfoDesc}>
                            Enjoy all features free for 7 days!
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.successActionsUnified}>
                        <TouchableOpacity 
                          style={[styles.successPrimaryBtn, { backgroundColor: selectedApp.iconColor }]}
                          onPress={handleOpenAppFromModal}
                        >
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                          <Text style={styles.successPrimaryText}>Open {selectedApp.name}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.successSecondaryBtn}
                          onPress={handleStayOnDashboard}
                        >
                          <Text style={styles.successSecondaryText}>Stay on Dashboard</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
          
          {/* Animated Confetti - fires on success */}
          {linkModalPhase === 'success' && (
            <ConfettiCannon
              ref={confettiRef}
              count={150}
              origin={{ x: 195, y: 0 }}
              autoStart={false}
              fadeOut={true}
              fallSpeed={2500}
              explosionSpeed={350}
              colors={selectedApp ? [selectedApp.iconColor, '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'] : ['#FFD700', '#FF6B6B', '#4ECDC4']}
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Unlink App Confirmation Modal */}
      <ConfirmationModal
        visible={showUnlinkModal}
        title={`Unlink ${selectedApp?.name}?`}
        message={`This will disconnect ${selectedApp?.name} from RetailPro.\n• You can re-link it anytime\n• Your data will be preserved`}
        confirmLabel="Unlink"
        cancelLabel="Keep Linked"
        onConfirm={confirmUnlinkApp}
        onCancel={() => { setShowUnlinkModal(false); setSelectedApp(null); }}
        variant="unlink"
        icon="unlink-outline"
        loading={linkedAppsLoading}
        appName={selectedApp?.name}
        appIcon={selectedApp?.icon}
        appColor={selectedApp?.iconColor}
      />

      {/* Upgrade Modal - Pricing Plans */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowUpgradeModal(false); setSelectedApp(null); }}
      >
        <TouchableOpacity 
          style={styles.linkModalOverlay} 
          activeOpacity={1} 
          onPress={() => { setShowUpgradeModal(false); setSelectedApp(null); }}
        >
          <View 
            style={[styles.linkCardModal, { maxWidth: 400 }]}
            onStartShouldSetResponder={() => true}
          >
            {selectedApp && (
              <>
                {/* Header */}
                <LinearGradient
                  colors={selectedApp.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.linkCardHeader, { paddingBottom: 20 }]}
                >
                  <TouchableOpacity 
                    style={styles.linkCardCloseBtn}
                    onPress={() => { setShowUpgradeModal(false); setSelectedApp(null); }}
                  >
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>

                  <View style={[styles.linkCardIconContainer, { width: 56, height: 56 }]}>
                    <Ionicons name={selectedApp.icon} size={28} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.linkCardAppName, { fontSize: 22 }]}>
                    Upgrade {selectedApp.name}
                  </Text>
                  <Text style={styles.linkCardTagline}>Choose a plan to continue</Text>
                </LinearGradient>

                {/* Pricing Plans */}
                <View style={styles.upgradePlansContainer}>
                  {/* Starter Plan */}
                  <TouchableOpacity
                    style={[
                      styles.upgradePlanCard,
                      selectedPlan === 'starter' && styles.upgradePlanSelected
                    ]}
                    onPress={() => setSelectedPlan('starter')}
                  >
                    <View style={styles.upgradePlanHeader}>
                      <Text style={styles.upgradePlanName}>Starter</Text>
                      {selectedPlan === 'starter' && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.upgradePlanPrice}>
                      <Text style={styles.upgradePlanCurrency}>$</Text>
                      <Text style={styles.upgradePlanAmount}>9</Text>
                      <Text style={styles.upgradePlanPeriod}>/mo</Text>
                    </View>
                    <Text style={styles.upgradePlanFeature}>• Basic features</Text>
                    <Text style={styles.upgradePlanFeature}>• 1,000 transactions/mo</Text>
                  </TouchableOpacity>

                  {/* Professional Plan */}
                  <TouchableOpacity
                    style={[
                      styles.upgradePlanCard,
                      selectedPlan === 'professional' && styles.upgradePlanSelected,
                      styles.upgradePlanPopular
                    ]}
                    onPress={() => setSelectedPlan('professional')}
                  >
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Popular</Text>
                    </View>
                    <View style={styles.upgradePlanHeader}>
                      <Text style={styles.upgradePlanName}>Professional</Text>
                      {selectedPlan === 'professional' && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.upgradePlanPrice}>
                      <Text style={styles.upgradePlanCurrency}>$</Text>
                      <Text style={styles.upgradePlanAmount}>29</Text>
                      <Text style={styles.upgradePlanPeriod}>/mo</Text>
                    </View>
                    <Text style={styles.upgradePlanFeature}>• All Starter features</Text>
                    <Text style={styles.upgradePlanFeature}>• Unlimited transactions</Text>
                    <Text style={styles.upgradePlanFeature}>• Priority support</Text>
                  </TouchableOpacity>

                  {/* Enterprise Plan */}
                  <TouchableOpacity
                    style={[
                      styles.upgradePlanCard,
                      selectedPlan === 'enterprise' && styles.upgradePlanSelected
                    ]}
                    onPress={() => setSelectedPlan('enterprise')}
                  >
                    <View style={styles.upgradePlanHeader}>
                      <Text style={styles.upgradePlanName}>Enterprise</Text>
                      {selectedPlan === 'enterprise' && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.upgradePlanPrice}>
                      <Text style={styles.upgradePlanCurrency}>$</Text>
                      <Text style={styles.upgradePlanAmount}>99</Text>
                      <Text style={styles.upgradePlanPeriod}>/mo</Text>
                    </View>
                    <Text style={styles.upgradePlanFeature}>• All Pro features</Text>
                    <Text style={styles.upgradePlanFeature}>• Custom integrations</Text>
                    <Text style={styles.upgradePlanFeature}>• Dedicated support</Text>
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.upgradeActions}>
                  <TouchableOpacity 
                    style={[styles.upgradeConfirmBtn, { backgroundColor: selectedApp.iconColor }]}
                    onPress={confirmUpgrade}
                    disabled={upgrading}
                  >
                    {upgrading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="card" size={18} color="#FFFFFF" />
                        <Text style={styles.upgradeConfirmText}>
                          Pay ${selectedPlan === 'starter' ? '9' : selectedPlan === 'professional' ? '29' : '99'}/mo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.upgradeNote}>Cancel anytime • Secure payment</Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Order Details Modal */}
      <WebModal
        visible={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Order #${viewingOrder?.order_number || viewingOrder?.id?.substring(0, 8) || ''}`}
        subtitle={`${viewingOrder?.customer_name || 'Walk-in Customer'}`}
        icon="receipt"
        iconColor="#2563EB"
        maxWidth={650}
      >
        {viewingOrder && (
          <View>
            {/* Status & Time */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.viewStatusBadge, { 
                backgroundColor: viewingOrder.status === 'completed' ? '#D1FAE5' : '#FEF3C7' 
              }]}>
                <Text style={[styles.viewStatusText, { 
                  color: viewingOrder.status === 'completed' ? '#059669' : '#D97706' 
                }]}>
                  {viewingOrder.status === 'completed' ? 'Completed' : 'Pending'}
                </Text>
              </View>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                {viewingOrder.created_at ? format(new Date(viewingOrder.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
              </Text>
            </View>
            
            {/* Customer Details */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Customer Details</Text>
              <View style={styles.viewCard}>
                <Text style={styles.viewCardTitle}>{viewingOrder.customer_name || 'Walk-in Customer'}</Text>
                {viewingOrder.customer_phone && <Text style={styles.viewCardSubtitle}>{viewingOrder.customer_phone}</Text>}
              </View>
            </View>
            
            {/* Order Items */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Order Items</Text>
              <View style={styles.viewItemsTable}>
                <View style={styles.viewItemsHeader}>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 3 }]}>Item</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.viewItemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                </View>
                {viewingOrder.items && viewingOrder.items.map((item, idx) => (
                  <View key={idx} style={[styles.viewItemsRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.viewItemsCell, { flex: 3 }]}>{item.name || 'Item'}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1, textAlign: 'center' }]}>{item.quantity || 0}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.price || 0)}</Text>
                    <Text style={[styles.viewItemsCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(item.total || (item.quantity * item.price) || 0)}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Totals */}
            <View style={styles.viewTotalsSection}>
              <View style={styles.viewTotalRow}>
                <Text style={styles.viewTotalLabel}>Subtotal</Text>
                <Text style={styles.viewTotalValue}>{formatCurrency(viewingOrder.subtotal || viewingOrder.total || 0)}</Text>
              </View>
              {viewingOrder.tax > 0 && (
                <View style={styles.viewTotalRow}>
                  <Text style={styles.viewTotalLabel}>Tax</Text>
                  <Text style={styles.viewTotalValue}>{formatCurrency(viewingOrder.tax || 0)}</Text>
                </View>
              )}
              <View style={[styles.viewTotalRow, styles.viewGrandTotalRow]}>
                <Text style={styles.viewGrandTotalLabel}>Total</Text>
                <Text style={styles.viewGrandTotalValue}>{formatCurrency(viewingOrder.total || 0)}</Text>
              </View>
            </View>
            
            {/* Payment Method */}
            <View style={styles.viewSection}>
              <Text style={styles.viewSectionTitle}>Payment</Text>
              <View style={styles.viewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons 
                    name={viewingOrder.payment_method === 'cash' ? 'cash-outline' : viewingOrder.payment_method === 'card' ? 'card-outline' : 'phone-portrait-outline'} 
                    size={20} 
                    color="#2563EB" 
                  />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>
                    {viewingOrder.payment_method || 'Cash'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Notes */}
            {viewingOrder.notes && (
              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Notes</Text>
                <View style={styles.viewCard}>
                  <Text style={{ fontSize: 14, color: '#374151' }}>{viewingOrder.notes}</Text>
                </View>
              </View>
            )}
            
            {/* Actions */}
            <View style={styles.viewActionsRow}>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: '#2563EB' }]} 
                onPress={() => { setViewingOrder(null); router.push('/(tabs)/orders'); }}
              >
                <Ionicons name="list" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>View All Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewActionBtn, { backgroundColor: '#059669' }]} 
                onPress={() => { /* TODO: Print receipt */ }}
              >
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewActionBtnText}>Print Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </WebModal>
      
      {/* Share & Earn Modal */}
      <WebModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share & Earn"
        maxWidth={480}
      >
        <View style={{ padding: 20 }}>
          {loadingShareData ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading your share codes...</Text>
            </View>
          ) : (
            <View>
              {/* Credit Balance Card */}
              <View style={{ 
                backgroundColor: '#F0FDF4', 
                borderRadius: 12, 
                padding: 16, 
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View>
                  <Text style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>Your Credit Balance</Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#15803D' }}>
                    ${shareData.creditBalance.toFixed(2)}
                  </Text>
                </View>
                <Ionicons name="wallet" size={40} color="#22C55E" />
              </View>
              
              {/* Referral Code Section */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="gift-outline" size={20} color="#7C3AED" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginLeft: 8 }}>
                    Your Referral Code
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                  Share this code with friends. They get ${shareData.referralReward} credit when they sign up, and you earn rewards too!
                </Text>
                {shareData.referralCode ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F3F4F6',
                      borderRadius: 8,
                      padding: 14,
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      borderStyle: 'dashed',
                    }}
                    onPress={() => copyToClipboard(shareData.referralCode!)}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', letterSpacing: 2 }}>
                      {shareData.referralCode}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="copy-outline" size={18} color="#6B7280" />
                      <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 4 }}>Copy</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 14 }}>
                    <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                      Generating your referral code...
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Affiliate Promo Code Section (only for active affiliates) */}
              {shareData.isAffiliate && shareData.promoCode && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="flash-outline" size={20} color="#D97706" />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginLeft: 8 }}>
                      Your Affiliate Promo Code
                    </Text>
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      borderRadius: 4, 
                      marginLeft: 8 
                    }}>
                      <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}>AFFILIATE</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                    Share this promo code to earn commissions on every purchase made with it!
                  </Text>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFFBEB',
                      borderRadius: 8,
                      padding: 14,
                      borderWidth: 2,
                      borderColor: '#FDE68A',
                    }}
                    onPress={() => copyToClipboard(shareData.promoCode!)}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#92400E', letterSpacing: 2 }}>
                      {shareData.promoCode}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="copy-outline" size={18} color="#D97706" />
                      <Text style={{ fontSize: 13, color: '#D97706', marginLeft: 4 }}>Copy</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Become an Affiliate CTA (for non-affiliates) */}
              {!shareData.isAffiliate && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setShowShareModal(false);
                    router.push('/affiliate-dashboard');
                  }}
                >
                  <Ionicons name="rocket-outline" size={24} color="#D97706" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>
                      Become an Affiliate Partner
                    </Text>
                    <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                      Earn commissions by promoting our products
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D97706" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </WebModal>
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
  userInfoWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  userAvatarWeb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarWebText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  userNameWeb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userRoleWeb: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gridIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
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
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutCancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutConfirmButton: {
    backgroundColor: '#DC2626',
  },
  logoutCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  logoutConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // View Order Modal Styles
  viewStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewSection: {
    marginBottom: 20,
  },
  viewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  viewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  viewCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  viewItemsTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewItemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewItemsHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  viewItemsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewItemsCell: {
    fontSize: 14,
    color: '#111827',
  },
  viewTotalsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  viewTotalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewTotalValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  viewGrandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewGrandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewGrandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  viewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // ============== NEW CARD CONTAINER STYLES ==============
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  
  // Sales by Payment Card
  salesPaymentCard: {
    backgroundColor: '#DBEAFE',  // Light blue - Retail Pro branding
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  paymentStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentStatItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  
  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: '#EEF2FF',  // Light indigo - Retail Pro accent
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  
  // Top Products Card
  topProductsCard: {
    backgroundColor: '#F0FDF4',  // Light green
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  topProductsList: {
    gap: 10,
  },
  topProductItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  topProductRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  // Admin Tools Card
  adminToolsCard: {
    backgroundColor: '#DBEAFE',  // Light blue - Retail Pro branding
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
  },
  adminToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  adminToolItem: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  adminToolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  adminToolLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  // Linked Apps Card
  linkedAppsCard: {
    backgroundColor: '#F0FDF4',  // Light green
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
  },
  linkedAppsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  linkedAppsHeaderLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  linkedAppsHeaderRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedAppsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  // Expandable Card Header Styles
  expandableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 8,
  },
  expandableCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandableCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  moreCountBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  moreCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  expandableCardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
    marginLeft: 42,
  },
  availableAppsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  linkedAppsDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    marginLeft: 26,
  },
  linkedAppsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  linkedAppsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noLinkedAppsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noLinkedAppsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  noLinkedAppsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  linkedAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkedAppItemWrapper: {
    width: '31%',
    position: 'relative',
  },
  linkedAppItem: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  linkedAppItemEditMode: {
    borderWidth: 2,
    borderColor: '#FCA5A5',
    borderStyle: 'dashed',
  },
  mobileUnlinkBtn: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mobileInlineConfirm: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  mobileConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
  },
  mobileConfirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileConfirmYes: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mobileConfirmYesText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  mobileConfirmNo: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mobileConfirmNoText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  doneButton: {
    marginLeft: 'auto',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  linkedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  linkedAppIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  linkedAppName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  linkedAppStatus: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  // Available Apps Card
  availableAppsCard: {
    backgroundColor: '#EFF6FF',  // Light blue
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
  },
  availableCountBadge: {
    backgroundColor: '#2563EB',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  availableCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  availableAppItem: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // All Apps Linked Card
  allLinkedCard: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  allLinkedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginTop: 8,
  },
  allLinkedDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  // Link Card Modal Styles
  linkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  linkCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  linkCardHeader: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  linkCardCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  linkCardAppName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  linkCardTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  linkCardContent: {
    padding: 24,
  },
  linkCardDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  linkCardBenefitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  linkCardBenefitsList: {
    marginBottom: 24,
  },
  linkCardBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkCardCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkCardBenefitText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  linkCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkCardCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  linkCardConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  linkCardConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Trial Status Styles
  daysLeftBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  daysLeftText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expiredAppItem: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  expiredText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  expiringSoonText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  paidText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  includedText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  // Trial Warning Banner
  trialWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trialWarningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trialWarningContent: {
    flex: 1,
  },
  trialWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  trialWarningText: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  trialWarningButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trialWarningButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Upgrade Modal Styles
  upgradePlansContainer: {
    padding: 20,
    gap: 12,
  },
  upgradePlanCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  upgradePlanSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  upgradePlanPopular: {
    borderColor: '#2563EB',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upgradePlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradePlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  upgradePlanPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  upgradePlanCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  upgradePlanAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  upgradePlanPeriod: {
    fontSize: 14,
    color: '#6B7280',
  },
  upgradePlanFeature: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  upgradeActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  upgradeConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upgradeNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
  // Success Modal Styles
  successModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  successHeader: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confettiEmoji: {
    position: 'absolute',
    fontSize: 24,
    top: 15,
    left: 30,
  },
  successIconWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 2,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  successContent: {
    padding: 24,
    alignItems: 'center',
  },
  successAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
  },
  trialInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trialInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trialInfoText: {
    flex: 1,
  },
  trialInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  trialInfoDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  successPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  successPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successSecondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  successSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Unified Modal - Syncing Phase Styles
  successHeaderExpanded: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  syncingIconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  syncingIconInner: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  syncingContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  syncingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  syncingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  syncingSteps: {
    width: '100%',
    gap: 12,
  },
  syncingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncingStepText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  syncingStepComplete: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Unified Modal - Success Phase Styles
  successContentInner: {
    alignItems: 'center',
  },
  successActionsUnified: {
    width: '100%',
    gap: 12,
  },
});

// Web Dashboard Styles
const webDashStyles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  newSaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newSaleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dashboardContent: {
    padding: 24,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  referralBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  referralIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralBannerText: {
    flex: 1,
  },
  referralBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  referralBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  referralBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  referralBannerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  mainContent: {
    flexDirection: 'row',
    gap: 24,
  },
  tableCard: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebar: {
    flex: 1,
    gap: 20,
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  linksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 160,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
