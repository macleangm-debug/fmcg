import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isLargeScreen = SCREEN_WIDTH > 1024;
const isMediumScreen = SCREEN_WIDTH > 768;

const COLORS = {
  // Brand
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#E0E7FF',
  
  // Accent
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  
  // Product Colors
  retailpro: '#3B82F6',
  kwikpay: '#10B981',
  invoicing: '#8B5CF6',
  inventory: '#F59E0B',
  unitxt: '#EC4899',
  expenses: '#EF4444',
  loyalty: '#06B6D4',
  
  // Neutrals
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  mediumGray: '#94A3B8',
  lightGray: '#F1F5F9',
  border: '#E2E8F0',
  white: '#FFFFFF',
  
  // Gradients
  gradientStart: '#6366F1',
  gradientEnd: '#8B5CF6',
};

interface PlatformOverview {
  business_metrics: {
    total: number;
    active: number;
    new_today: number;
    new_this_week: number;
    new_this_month: number;
    growth_rate: number;
  };
  user_metrics: {
    total: number;
    active: number;
    activation_rate: number;
  };
  revenue_metrics: {
    total_revenue: number;
    mrr: number;
    arr: number;
    currency: string;
  };
  payment_metrics: {
    total_volume: number;
    total_transactions: number;
    success_rate: number;
  };
  system_health: {
    status: string;
    errors_today: number;
    uptime: string;
  };
}

interface Product {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  metrics: Record<string, any>;
  active_businesses: number;
  status: string;
}

interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  is_custom: boolean;
}

type TabType = 'overview' | 'products' | 'financial' | 'users' | 'system' | 'roles' | 'integrations';

export default function SokoAdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [roles, setRoles] = useState<{ system_roles: AdminRole[]; custom_roles: AdminRole[] }>({ system_roles: [], custom_roles: [] });
  const [financialData, setFinancialData] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, productsRes, rolesRes] = await Promise.all([
        api.get('/superadmin/platform/overview'),
        api.get('/superadmin/products/performance'),
        api.get('/superadmin/roles'),
      ]);
      
      setOverview(overviewRes.data);
      setProducts(productsRes.data.products);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFinancialData = async () => {
    try {
      const res = await api.get('/superadmin/financial/insights?period=30d');
      setFinancialData(res.data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  };

  const fetchUserAnalytics = async () => {
    try {
      const res = await api.get('/superadmin/users/analytics');
      setUserAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await api.get('/superadmin/system/health');
      setSystemHealth(res.data);
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'financial' && !financialData) fetchFinancialData();
    if (activeTab === 'users' && !userAnalytics) fetchUserAnalytics();
    if (activeTab === 'system' && !systemHealth) fetchSystemHealth();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return COLORS.success;
      case 'degraded': return COLORS.warning;
      case 'critical': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const getProductColor = (id: string) => {
    return (COLORS as any)[id] || COLORS.primary;
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { id: 'products', label: 'Products', icon: 'apps-outline' },
    { id: 'financial', label: 'Financial', icon: 'wallet-outline' },
    { id: 'users', label: 'Users', icon: 'people-outline' },
    { id: 'system', label: 'System', icon: 'server-outline' },
    { id: 'roles', label: 'Roles & Access', icon: 'shield-outline' },
    { id: 'integrations', label: 'Integrations', icon: 'git-branch-outline' },
  ];

  // Stat Card Component
  const StatCard = ({ 
    icon, 
    iconColor, 
    label, 
    value, 
    subValue, 
    trend 
  }: { 
    icon: string; 
    iconColor: string; 
    label: string; 
    value: string | number; 
    subValue?: string;
    trend?: { value: number; positive: boolean };
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.positive ? COLORS.successLight : COLORS.dangerLight }]}>
            <Ionicons 
              name={trend.positive ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trend.positive ? COLORS.success : COLORS.danger} 
            />
            <Text style={[styles.trendText, { color: trend.positive ? COLORS.success : COLORS.danger }]}>
              {trend.value}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  );

  // Overview Tab
  const renderOverviewTab = () => {
    if (!overview) return null;
    
    return (
      <View style={styles.tabContent}>
        {/* Welcome Section */}
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome back, Admin</Text>
            <Text style={styles.welcomeSubtitle}>Here's what's happening with your platform today</Text>
          </View>
          <View style={styles.welcomeStats}>
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatValue}>{overview.business_metrics.new_today}</Text>
              <Text style={styles.welcomeStatLabel}>New Today</Text>
            </View>
            <View style={styles.welcomeStatDivider} />
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatValue}>{overview.system_health.uptime}</Text>
              <Text style={styles.welcomeStatLabel}>Uptime</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="business"
            iconColor={COLORS.primary}
            label="Total Businesses"
            value={overview.business_metrics.total}
            subValue={`${overview.business_metrics.active} active`}
            trend={{ value: overview.business_metrics.growth_rate, positive: true }}
          />
          <StatCard
            icon="cash"
            iconColor={COLORS.success}
            label="Total Revenue"
            value={formatCurrency(overview.revenue_metrics.total_revenue)}
          />
          <StatCard
            icon="flash"
            iconColor={COLORS.kwikpay}
            label="Payment Volume"
            value={formatCurrency(overview.payment_metrics.total_volume)}
            subValue={`${overview.payment_metrics.total_transactions} transactions`}
          />
          <StatCard
            icon="people"
            iconColor={COLORS.invoicing}
            label="Total Users"
            value={overview.user_metrics.total}
            subValue={`${overview.user_metrics.activation_rate}% active`}
          />
        </View>

        {/* System Health & Growth */}
        <View style={styles.twoColumnRow}>
          {/* System Health */}
          <View style={[styles.card, styles.flex1]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>System Health</Text>
              <View style={[styles.healthBadge, { backgroundColor: `${getStatusColor(overview.system_health.status)}15` }]}>
                <View style={[styles.healthDot, { backgroundColor: getStatusColor(overview.system_health.status) }]} />
                <Text style={[styles.healthText, { color: getStatusColor(overview.system_health.status) }]}>
                  {overview.system_health.status}
                </Text>
              </View>
            </View>
            <View style={styles.healthMetrics}>
              <View style={styles.healthMetric}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <View style={styles.healthMetricInfo}>
                  <Text style={styles.healthMetricValue}>{overview.system_health.uptime}</Text>
                  <Text style={styles.healthMetricLabel}>Uptime</Text>
                </View>
              </View>
              <View style={styles.healthMetric}>
                <Ionicons name="warning" size={24} color={overview.system_health.errors_today > 0 ? COLORS.warning : COLORS.success} />
                <View style={styles.healthMetricInfo}>
                  <Text style={styles.healthMetricValue}>{overview.system_health.errors_today}</Text>
                  <Text style={styles.healthMetricLabel}>Errors Today</Text>
                </View>
              </View>
              <View style={styles.healthMetric}>
                <Ionicons name="speedometer" size={24} color={COLORS.primary} />
                <View style={styles.healthMetricInfo}>
                  <Text style={styles.healthMetricValue}>{overview.payment_metrics.success_rate}%</Text>
                  <Text style={styles.healthMetricLabel}>Payment Success</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Business Growth */}
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardTitle}>Business Growth</Text>
            <View style={styles.growthList}>
              <View style={styles.growthItem}>
                <View style={styles.growthLabel}>
                  <View style={[styles.growthDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.growthLabelText}>Today</Text>
                </View>
                <Text style={styles.growthValue}>+{overview.business_metrics.new_today}</Text>
              </View>
              <View style={styles.growthItem}>
                <View style={styles.growthLabel}>
                  <View style={[styles.growthDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.growthLabelText}>This Week</Text>
                </View>
                <Text style={styles.growthValue}>+{overview.business_metrics.new_this_week}</Text>
              </View>
              <View style={styles.growthItem}>
                <View style={styles.growthLabel}>
                  <View style={[styles.growthDot, { backgroundColor: COLORS.invoicing }]} />
                  <Text style={styles.growthLabelText}>This Month</Text>
                </View>
                <Text style={styles.growthValue}>+{overview.business_metrics.new_this_month}</Text>
              </View>
              <View style={[styles.growthItem, { borderBottomWidth: 0 }]}>
                <View style={styles.growthLabel}>
                  <View style={[styles.growthDot, { backgroundColor: COLORS.kwikpay }]} />
                  <Text style={styles.growthLabelText}>Growth Rate</Text>
                </View>
                <Text style={[styles.growthValue, { color: COLORS.success }]}>+{overview.business_metrics.growth_rate}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('products')}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.retailpro}15` }]}>
              <Ionicons name="apps" size={20} color={COLORS.retailpro} />
            </View>
            <Text style={styles.quickActionText}>View Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('integrations')}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <Ionicons name="git-branch" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText}>Integrations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('roles')}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.invoicing}15` }]}>
              <Ionicons name="shield" size={20} color={COLORS.invoicing} />
            </View>
            <Text style={styles.quickActionText}>Manage Roles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('financial')}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.warning}15` }]}>
              <Ionicons name="trending-up" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.quickActionText}>Financial Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Products Tab
  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Products</Text>
          <Text style={styles.pageSubtitle}>Monitor performance across all Soko Suite products</Text>
        </View>
      </View>

      <View style={styles.productsGrid}>
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => router.push(`/${product.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.productCardHeader}>
              <View style={[styles.productIconLarge, { backgroundColor: `${getProductColor(product.id)}15` }]}>
                <Ionicons name={product.icon as any} size={28} color={getProductColor(product.id)} />
              </View>
              <View style={[styles.productStatus, { backgroundColor: COLORS.successLight }]}>
                <View style={[styles.productStatusDot, { backgroundColor: COLORS.success }]} />
                <Text style={[styles.productStatusText, { color: COLORS.success }]}>Active</Text>
              </View>
            </View>
            
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>
            
            <View style={styles.productDivider} />
            
            <View style={styles.productStats}>
              {Object.entries(product.metrics).slice(0, 2).map(([key, value], idx) => (
                <View key={key} style={[styles.productStat, idx === 0 && styles.productStatFirst]}>
                  <Text style={styles.productStatValue}>
                    {typeof value === 'number' ? formatNumber(value) : value}
                  </Text>
                  <Text style={styles.productStatLabel}>
                    {key.replace(/_/g, ' ').replace('this month', '').trim()}
                  </Text>
                </View>
              ))}
            </View>
            
            <View style={styles.productFooter}>
              <Ionicons name="business-outline" size={14} color={COLORS.gray} />
              <Text style={styles.productBusinessCount}>{product.active_businesses} businesses</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Roles Tab
  const renderRolesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Roles & Access</Text>
          <Text style={styles.pageSubtitle}>Manage admin roles and permissions</Text>
        </View>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => setRoleModalVisible(true)}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Create Role</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>System Roles</Text>
      <View style={styles.rolesGrid}>
        {roles.system_roles.map((role) => (
          <View key={role.id} style={styles.roleCard}>
            <View style={styles.roleCardHeader}>
              <View style={[styles.roleIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDesc}>{role.description}</Text>
              </View>
            </View>
            <View style={styles.permissionsContainer}>
              {role.permissions.slice(0, 3).map((perm, idx) => (
                <View key={idx} style={styles.permissionChip}>
                  <Text style={styles.permissionChipText}>{perm}</Text>
                </View>
              ))}
              {role.permissions.length > 3 && (
                <View style={[styles.permissionChip, styles.permissionChipMore]}>
                  <Text style={styles.permissionChipText}>+{role.permissions.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {roles.custom_roles.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Custom Roles</Text>
          <View style={styles.rolesGrid}>
            {roles.custom_roles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleCardHeader}>
                  <View style={[styles.roleIconContainer, { backgroundColor: `${COLORS.invoicing}15` }]}>
                    <Ionicons name="create" size={22} color={COLORS.invoicing} />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </View>
                  <TouchableOpacity style={styles.roleEditBtn}>
                    <Ionicons name="pencil-outline" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );

  // Financial Tab
  const renderFinancialTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Financial Insights</Text>
          <Text style={styles.pageSubtitle}>Revenue and payment analytics</Text>
        </View>
      </View>

      {financialData ? (
        <>
          <View style={styles.financeCards}>
            <LinearGradient
              colors={[COLORS.success, '#059669']}
              style={styles.financeCard}
            >
              <Ionicons name="trending-up" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.financeCardValue}>{formatCurrency(overview?.revenue_metrics.total_revenue || 0)}</Text>
              <Text style={styles.financeCardLabel}>Total Revenue</Text>
            </LinearGradient>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.financeCard}
            >
              <Ionicons name="refresh" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.financeCardValue}>{formatCurrency(overview?.revenue_metrics.mrr || 0)}</Text>
              <Text style={styles.financeCardLabel}>Monthly Recurring</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            {financialData.payment_methods?.length > 0 ? (
              financialData.payment_methods.map((method: any, idx: number) => (
                <View key={idx} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <Ionicons name="card-outline" size={18} color={COLORS.gray} />
                    <Text style={styles.listRowText}>{method._id || 'Unknown'}</Text>
                  </View>
                  <Text style={styles.listRowValue}>{formatCurrency(method.volume)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No payment data available</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );

  // Users Tab
  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>User Analytics</Text>
          <Text style={styles.pageSubtitle}>User distribution and engagement</Text>
        </View>
      </View>

      {userAnalytics ? (
        <View style={styles.twoColumnRow}>
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardTitle}>Role Distribution</Text>
            {userAnalytics.role_distribution?.map((role: any, idx: number) => (
              <View key={idx} style={styles.listRow}>
                <View style={styles.listRowLeft}>
                  <View style={[styles.roleDot, { backgroundColor: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger][idx % 4] }]} />
                  <Text style={styles.listRowText}>{role._id || 'Unknown'}</Text>
                </View>
                <Text style={styles.listRowValue}>{role.count}</Text>
              </View>
            ))}
          </View>
          
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardTitle}>Top Businesses</Text>
            {userAnalytics.top_businesses_by_users?.slice(0, 5).map((b: any, idx: number) => (
              <View key={idx} style={styles.listRow}>
                <View style={styles.listRowLeft}>
                  <Text style={styles.listRowRank}>#{idx + 1}</Text>
                  <Text style={styles.listRowText}>{b.business_name || 'Unknown'}</Text>
                </View>
                <Text style={styles.listRowValue}>{b.user_count} users</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );

  // System Tab
  const renderSystemTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>System Monitoring</Text>
          <Text style={styles.pageSubtitle}>Database stats and integration health</Text>
        </View>
      </View>

      {systemHealth ? (
        <View style={styles.twoColumnRow}>
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardTitle}>Database Collections</Text>
            {Object.entries(systemHealth.database_stats || {}).map(([col, count]) => (
              <View key={col} style={styles.listRow}>
                <View style={styles.listRowLeft}>
                  <Ionicons name="folder-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.listRowText}>{col}</Text>
                </View>
                <Text style={styles.listRowValue}>{formatNumber(count as number)}</Text>
              </View>
            ))}
          </View>
          
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardTitle}>Integrations</Text>
            {systemHealth.integration_status?.length > 0 ? (
              systemHealth.integration_status.map((i: any, idx: number) => (
                <View key={idx} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <Ionicons name="git-branch-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.listRowText}>{i.provider}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: i.status === 'active' ? COLORS.successLight : COLORS.warningLight }]}>
                    <Text style={[styles.statusPillText, { color: i.status === 'active' ? COLORS.success : COLORS.warning }]}>
                      {i.status}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No integrations configured</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );

  // Integrations Tab
  const renderIntegrationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.integrationsCta}>
        <View style={styles.integrationsIconWrapper}>
          <Ionicons name="git-branch" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.integrationsTitle}>Payment Integrations</Text>
        <Text style={styles.integrationsDesc}>
          Configure payment providers like Stripe, Ecobank, M-Pesa, and more
        </Text>
        <TouchableOpacity 
          style={styles.integrationsPrimaryBtn}
          onPress={() => router.push('/superadmin')}
        >
          <Text style={styles.integrationsPrimaryBtnText}>Manage Integrations</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Soko Admin...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sidebar + Content Layout for large screens */}
      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {isLargeScreen && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogo}>
                <Ionicons name="planet" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.sidebarTitle}>Soko Admin</Text>
            </View>
            
            <ScrollView style={styles.sidebarNav}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.sidebarItem, activeTab === tab.id && styles.sidebarItemActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons 
                    name={tab.icon as any} 
                    size={20} 
                    color={activeTab === tab.id ? COLORS.primary : COLORS.gray} 
                  />
                  <Text style={[styles.sidebarItemText, activeTab === tab.id && styles.sidebarItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.sidebarBackBtn} onPress={() => router.push('/')}>
                <Ionicons name="arrow-back" size={18} color={COLORS.gray} />
                <Text style={styles.sidebarBackText}>Back to Galaxy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Mobile Header */}
          {!isLargeScreen && (
            <LinearGradient
              colors={[COLORS.dark, COLORS.darkGray]}
              style={styles.mobileHeader}
            >
              <TouchableOpacity onPress={() => router.push('/')} style={styles.mobileBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.mobileHeaderContent}>
                <Text style={styles.mobileHeaderTitle}>Soko Admin</Text>
              </View>
              <TouchableOpacity onPress={logout} style={styles.mobileLogoutBtn}>
                <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* Mobile Tabs */}
          {!isLargeScreen && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.mobileTabs}
              contentContainerStyle={styles.mobileTabsContent}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.mobileTab, activeTab === tab.id && styles.mobileTabActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons 
                    name={tab.icon as any} 
                    size={18} 
                    color={activeTab === tab.id ? COLORS.primary : COLORS.gray} 
                  />
                  <Text style={[styles.mobileTabText, activeTab === tab.id && styles.mobileTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Content Area */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'products' && renderProductsTab()}
            {activeTab === 'financial' && renderFinancialTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'roles' && renderRolesTab()}
            {activeTab === 'integrations' && renderIntegrationsTab()}
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </View>

      {/* Create Role Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Custom Role</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Role Name"
              placeholderTextColor={COLORS.gray}
              value={newRole.name}
              onChangeText={(text) => setNewRole({ ...newRole, name: text })}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description"
              placeholderTextColor={COLORS.gray}
              multiline
              value={newRole.description}
              onChangeText={(text) => setNewRole({ ...newRole, description: text })}
            />
            <TouchableOpacity style={styles.modalPrimaryBtn}>
              <Text style={styles.modalPrimaryBtnText}>Create Role</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.gray, fontWeight: '500' },
  loadingSection: { padding: 40, alignItems: 'center' },
  
  // Main Layout
  mainLayout: { flex: 1, flexDirection: 'row' },
  mainContent: { flex: 1 },
  
  // Sidebar (Desktop)
  sidebar: { width: 260, backgroundColor: COLORS.white, borderRightWidth: 1, borderRightColor: COLORS.border },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  sidebarLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sidebarTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  sidebarNav: { flex: 1, paddingHorizontal: 12 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 4, gap: 12 },
  sidebarItemActive: { backgroundColor: `${COLORS.primary}10` },
  sidebarItemText: { fontSize: 14, fontWeight: '500', color: COLORS.gray },
  sidebarItemTextActive: { color: COLORS.primary, fontWeight: '600' },
  sidebarFooter: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  sidebarBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  sidebarBackText: { fontSize: 14, color: COLORS.gray },
  
  // Mobile Header
  mobileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  mobileBackBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  mobileHeaderContent: { flex: 1, marginLeft: 12 },
  mobileHeaderTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  mobileLogoutBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  
  // Mobile Tabs
  mobileTabs: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 52 },
  mobileTabsContent: { paddingHorizontal: 12 },
  mobileTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  mobileTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  mobileTabText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  mobileTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Content
  contentScroll: { flex: 1 },
  contentScrollInner: { padding: isLargeScreen ? 32 : 16 },
  tabContent: {},
  
  // Welcome Card
  welcomeCard: { borderRadius: 20, padding: 24, marginBottom: 24, flexDirection: isLargeScreen ? 'row' : 'column', alignItems: isLargeScreen ? 'center' : 'flex-start' },
  welcomeContent: { flex: 1 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  welcomeStats: { flexDirection: 'row', marginTop: isLargeScreen ? 0 : 20 },
  welcomeStat: { alignItems: 'center', paddingHorizontal: 20 },
  welcomeStatValue: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  welcomeStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  welcomeStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  
  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, minWidth: isLargeScreen ? 220 : isMediumScreen ? 180 : '45%', backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  statIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  trendText: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  statLabel: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  statSubValue: { fontSize: 12, color: COLORS.mediumGray, marginTop: 4 },
  
  // Card
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  
  // Two Column
  twoColumnRow: { flexDirection: isLargeScreen ? 'row' : 'column', gap: 16 },
  flex1: { flex: 1 },
  
  // Health
  healthBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  healthMetrics: { gap: 16 },
  healthMetric: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthMetricInfo: {},
  healthMetricValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  healthMetricLabel: { fontSize: 12, color: COLORS.gray },
  
  // Growth
  growthList: {},
  growthItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  growthLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  growthDot: { width: 8, height: 8, borderRadius: 4 },
  growthLabelText: { fontSize: 14, color: COLORS.dark },
  growthValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  
  // Quick Actions
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 10 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  
  // Products Grid
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  productCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: isLargeScreen ? 'calc(33.333% - 12px)' : isMediumScreen ? 'calc(50% - 8px)' : '100%', minWidth: 280 },
  productCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  productIconLarge: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  productStatusDot: { width: 6, height: 6, borderRadius: 3 },
  productStatusText: { fontSize: 11, fontWeight: '600' },
  productName: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  productDescription: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  productDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  productStats: { flexDirection: 'row' },
  productStat: { flex: 1, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  productStatFirst: { paddingLeft: 0, borderLeftWidth: 0 },
  productStatValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  productStatLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2, textTransform: 'capitalize' },
  productFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  productBusinessCount: { fontSize: 13, color: COLORS.gray },
  
  // Page Header
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  
  // Roles
  rolesGrid: { gap: 12 },
  roleCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  roleCardHeader: { flexDirection: 'row', alignItems: 'center' },
  roleIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1, marginLeft: 12 },
  roleName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  roleDesc: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  roleEditBtn: { padding: 8 },
  permissionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  permissionChip: { backgroundColor: COLORS.lightGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  permissionChipMore: { backgroundColor: COLORS.primaryLight },
  permissionChipText: { fontSize: 11, color: COLORS.gray, fontWeight: '500' },
  
  // Finance
  financeCards: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  financeCard: { flex: 1, borderRadius: 16, padding: 20 },
  financeCardValue: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginTop: 12 },
  financeCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  
  // List Row
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listRowText: { fontSize: 14, color: COLORS.dark, textTransform: 'capitalize' },
  listRowValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  listRowRank: { fontSize: 12, fontWeight: '600', color: COLORS.gray, width: 24 },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyText: { fontSize: 14, color: COLORS.gray, textAlign: 'center', paddingVertical: 20 },
  
  // Integrations CTA
  integrationsCta: { alignItems: 'center', paddingVertical: 60 },
  integrationsIconWrapper: { width: 80, height: 80, borderRadius: 20, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center' },
  integrationsTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginTop: 20 },
  integrationsDesc: { fontSize: 15, color: COLORS.gray, marginTop: 8, textAlign: 'center', maxWidth: 320 },
  integrationsPrimaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 24, gap: 8 },
  integrationsPrimaryBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  modalCloseBtn: { padding: 4 },
  modalInput: { backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.dark, marginBottom: 12 },
  modalTextArea: { height: 100, textAlignVertical: 'top' },
  modalPrimaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  modalPrimaryBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
