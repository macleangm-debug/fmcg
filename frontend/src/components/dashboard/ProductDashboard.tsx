import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../Icon';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import TotalViewPerformance from './TotalViewPerformance';
import TransactionList, { Transaction } from './TransactionList';
import RevenueChart from './RevenueChart';
import SalesReport from './SalesReport';
import PromotionalCard from './PromotionalCard';
import AdvertCarousel, { Advert } from '../AdvertCarousel';

// Product-specific theme configurations
export interface ProductTheme {
  primary: string;       // Main brand color
  primaryDark: string;   // Darker shade
  primaryLight: string;  // Light background
  accent: string;        // Accent color
  name: string;          // Product name
  icon: string;          // Product icon
  tagline: string;       // Product tagline
}

export const PRODUCT_THEMES: Record<string, ProductTheme> = {
  retailpro: {
    primary: '#1B4332',
    primaryDark: '#0D2818',
    primaryLight: '#D8F3DC',
    accent: '#E9A319',
    name: 'RetailPro',
    icon: 'storefront',
    tagline: 'Retail & Sales Management',
  },
  inventory: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
    accent: '#F59E0B',
    name: 'Inventory',
    icon: 'cube',
    tagline: 'Stock Management',
  },
  invoicing: {
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#EDE9FE',
    accent: '#F59E0B',
    name: 'Invoicing',
    icon: 'document-text',
    tagline: 'Bills & Quotes',
  },
  kwikpay: {
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#D1FAE5',
    accent: '#F59E0B',
    name: 'KwikPay',
    icon: 'card',
    tagline: 'Payment Processing',
  },
  unitxt: {
    primary: '#F59E0B',
    primaryDark: '#D97706',
    primaryLight: '#FEF3C7',
    accent: '#10B981',
    name: 'UniTxt',
    icon: 'chatbubbles',
    tagline: 'SMS Marketing',
  },
  expenses: {
    primary: '#EF4444',
    primaryDark: '#DC2626',
    primaryLight: '#FEE2E2',
    accent: '#10B981',
    name: 'Expenses',
    icon: 'wallet',
    tagline: 'Cost Tracking',
  },
  loyalty: {
    primary: '#EC4899',
    primaryDark: '#DB2777',
    primaryLight: '#FCE7F3',
    accent: '#F59E0B',
    name: 'Loyalty',
    icon: 'heart',
    tagline: 'Customer Rewards',
  },
};

// Product-specific metric cards
export interface MetricCard {
  label: string;
  value: string | number;
  icon: string;
  iconBg: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// Update card content
export interface UpdateCardContent {
  badge: string;
  title: string;
  percentage: string;
  period: string;
  ctaText: string;
  onCtaPress?: () => void;
}

// Props for the reusable dashboard
export interface ProductDashboardProps {
  productId: string;
  // Header
  title?: string;
  subtitle?: string;
  dateRange?: string;
  onNewAction?: () => void;
  newActionLabel?: string;
  // Stats
  statsRow?: MetricCard[];
  // Update card
  updateCard?: UpdateCardContent;
  // Main metrics
  netIncome?: { value: number; trend: number };
  totalReturn?: { value: number; trend: number };
  // Transaction list
  transactions?: Transaction[];
  onTransactionViewMore?: () => void;
  // Revenue chart
  revenueTotal?: number;
  revenueTrend?: number;
  // Sales report
  salesReportData?: Array<{ label: string; value: number; color: string }>;
  onSalesReportViewMore?: () => void;
  // Total view performance
  performanceData?: { total: number; viewCount: number; percentage: number; sales: number };
  // Promotional card
  promoTitle?: string;
  promoSubtitle?: string;
  promoButtonText?: string;
  onPromoPress?: () => void;
  // Adverts
  adverts?: Advert[];
  // Actions
  refreshing?: boolean;
  onRefresh?: () => void;
  formatCurrency?: (amount: number) => string;
}

const ProductDashboard: React.FC<ProductDashboardProps> = ({
  productId,
  title,
  subtitle,
  dateRange = 'January 2024 - May 2024',
  onNewAction,
  newActionLabel = 'New Action',
  statsRow = [],
  updateCard,
  netIncome,
  totalReturn,
  transactions,
  onTransactionViewMore,
  revenueTotal = 193000,
  revenueTrend = 35,
  salesReportData,
  onSalesReportViewMore,
  performanceData,
  promoTitle,
  promoSubtitle,
  promoButtonText = 'Upgrade Now',
  onPromoPress,
  adverts = [],
  refreshing = false,
  onRefresh,
  formatCurrency = (amount) => `$${amount.toLocaleString()}`,
}) => {
  const router = useRouter();
  const theme = PRODUCT_THEMES[productId] || PRODUCT_THEMES.retailpro;

  // Default update card content based on product
  const defaultUpdateCard: UpdateCardContent = {
    badge: 'Update',
    title: `${theme.name} revenue increased`,
    percentage: '40%',
    period: 'in 1 week',
    ctaText: 'See Statistics',
  };

  const finalUpdateCard = updateCard || defaultUpdateCard;

  // Default promotional content
  const defaultPromoTitle = `Level up your ${theme.name.toLowerCase()} management to the next level.`;
  const defaultPromoSubtitle = `An easy way to manage ${theme.tagline.toLowerCase()} with care and precision.`;

  // Default sales report data based on product type
  const getDefaultSalesReport = () => {
    switch (productId) {
      case 'inventory':
        return [
          { label: 'Items in Stock', value: 233, color: theme.primaryLight },
          { label: 'Low Stock Items', value: 23, color: '#FEF3C7' },
          { label: 'Items Received', value: 482, color: '#DBEAFE' },
        ];
      case 'invoicing':
        return [
          { label: 'Invoices Sent', value: 233, color: theme.primaryLight },
          { label: 'Pending Payment', value: 23, color: '#FEF3C7' },
          { label: 'Invoices Paid', value: 482, color: '#D1FAE5' },
        ];
      case 'kwikpay':
        return [
          { label: 'Transactions', value: 233, color: theme.primaryLight },
          { label: 'Pending Payouts', value: 23, color: '#FEF3C7' },
          { label: 'Completed', value: 482, color: '#D1FAE5' },
        ];
      case 'unitxt':
        return [
          { label: 'Messages Sent', value: 2330, color: theme.primaryLight },
          { label: 'Messages Pending', value: 23, color: '#FEE2E2' },
          { label: 'Delivered', value: 4820, color: '#D1FAE5' },
        ];
      case 'expenses':
        return [
          { label: 'Total Expenses', value: 233, color: theme.primaryLight },
          { label: 'Pending Approval', value: 23, color: '#FEF3C7' },
          { label: 'Approved', value: 482, color: '#D1FAE5' },
        ];
      case 'loyalty':
        return [
          { label: 'Points Issued', value: 23300, color: theme.primaryLight },
          { label: 'Points Redeemed', value: 2300, color: '#FEF3C7' },
          { label: 'Active Members', value: 482, color: '#D1FAE5' },
        ];
      default:
        return [
          { label: 'Product Launched', value: 233, color: '#95D5B2' },
          { label: 'Ongoing Product', value: 23, color: '#B7E4C7' },
          { label: 'Product Sold', value: 482, color: '#D8F3DC' },
        ];
    }
  };

  // Default transactions based on product type
  const getDefaultTransactions = (): Transaction[] => {
    switch (productId) {
      case 'inventory':
        return [
          { id: '1', name: 'Stock Received - Electronics', date: 'Jul 12th 2024', orderId: 'STK001234', status: 'Completed', icon: 'cube', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'Stock Out - Warehouse A', date: 'Jul 12th 2024', orderId: 'STK001235', status: 'Completed', icon: 'arrow-forward', iconColor: '#EF4444', iconBg: '#FEE2E2' },
          { id: '3', name: 'Low Stock Alert', date: 'Jul 12th 2024', orderId: 'ALT001236', status: 'Pending', icon: 'alert-circle', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '4', name: 'Stock Adjustment', date: 'Jul 12th 2024', orderId: 'ADJ001237', status: 'Completed', icon: 'refresh', iconColor: '#2563EB', iconBg: '#DBEAFE' },
          { id: '5', name: 'New Product Added', date: 'Jul 12th 2024', orderId: 'PRD001238', status: 'Completed', icon: 'add-circle', iconColor: theme.primary, iconBg: theme.primaryLight },
        ];
      case 'invoicing':
        return [
          { id: '1', name: 'Invoice #INV-2024-001', date: 'Jul 12th 2024', orderId: 'INV001234', status: 'Completed', icon: 'document-text', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'Payment Received', date: 'Jul 12th 2024', orderId: 'PAY001235', status: 'Completed', icon: 'checkmark-circle', iconColor: '#10B981', iconBg: '#D1FAE5' },
          { id: '3', name: 'Invoice Overdue', date: 'Jul 12th 2024', orderId: 'INV001236', status: 'Pending', icon: 'alert-circle', iconColor: '#EF4444', iconBg: '#FEE2E2' },
          { id: '4', name: 'Quote Sent', date: 'Jul 12th 2024', orderId: 'QUO001237', status: 'Pending', icon: 'clipboard', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '5', name: 'Recurring Invoice', date: 'Jul 12th 2024', orderId: 'REC001238', status: 'Completed', icon: 'repeat', iconColor: '#2563EB', iconBg: '#DBEAFE' },
        ];
      case 'kwikpay':
        return [
          { id: '1', name: 'Payment Collected', date: 'Jul 12th 2024', orderId: 'TXN001234', status: 'Completed', icon: 'card', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'Payout Processed', date: 'Jul 12th 2024', orderId: 'PAY001235', status: 'Completed', icon: 'wallet', iconColor: '#2563EB', iconBg: '#DBEAFE' },
          { id: '3', name: 'Transaction Failed', date: 'Jul 12th 2024', orderId: 'TXN001236', status: 'Pending', icon: 'close-circle', iconColor: '#EF4444', iconBg: '#FEE2E2' },
          { id: '4', name: 'Refund Issued', date: 'Jul 12th 2024', orderId: 'REF001237', status: 'Completed', icon: 'refresh', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '5', name: 'Mobile Money', date: 'Jul 12th 2024', orderId: 'MOB001238', status: 'Completed', icon: 'phone-portrait', iconColor: theme.primary, iconBg: theme.primaryLight },
        ];
      case 'unitxt':
        return [
          { id: '1', name: 'Campaign Sent', date: 'Jul 12th 2024', orderId: 'CMP001234', status: 'Completed', icon: 'megaphone', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'SMS Delivered', date: 'Jul 12th 2024', orderId: 'SMS001235', status: 'Completed', icon: 'checkmark-circle', iconColor: '#10B981', iconBg: '#D1FAE5' },
          { id: '3', name: 'Message Failed', date: 'Jul 12th 2024', orderId: 'SMS001236', status: 'Pending', icon: 'alert-circle', iconColor: '#EF4444', iconBg: '#FEE2E2' },
          { id: '4', name: 'Credits Purchased', date: 'Jul 12th 2024', orderId: 'CRD001237', status: 'Completed', icon: 'wallet', iconColor: '#2563EB', iconBg: '#DBEAFE' },
          { id: '5', name: 'New Template', date: 'Jul 12th 2024', orderId: 'TPL001238', status: 'Completed', icon: 'document-text', iconColor: theme.primary, iconBg: theme.primaryLight },
        ];
      case 'expenses':
        return [
          { id: '1', name: 'Office Supplies', date: 'Jul 12th 2024', orderId: 'EXP001234', status: 'Completed', icon: 'briefcase', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'Travel Expense', date: 'Jul 12th 2024', orderId: 'EXP001235', status: 'Pending', icon: 'car', iconColor: '#2563EB', iconBg: '#DBEAFE' },
          { id: '3', name: 'Utility Bills', date: 'Jul 12th 2024', orderId: 'EXP001236', status: 'Completed', icon: 'flash', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '4', name: 'Marketing', date: 'Jul 12th 2024', orderId: 'EXP001237', status: 'Completed', icon: 'megaphone', iconColor: '#EC4899', iconBg: '#FCE7F3' },
          { id: '5', name: 'Equipment', date: 'Jul 12th 2024', orderId: 'EXP001238', status: 'Pending', icon: 'hardware-chip', iconColor: theme.primary, iconBg: theme.primaryLight },
        ];
      case 'loyalty':
        return [
          { id: '1', name: 'Points Earned - John D.', date: 'Jul 12th 2024', orderId: 'PTS001234', status: 'Completed', icon: 'star', iconColor: theme.primary, iconBg: theme.primaryLight },
          { id: '2', name: 'Reward Redeemed', date: 'Jul 12th 2024', orderId: 'RWD001235', status: 'Completed', icon: 'gift', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '3', name: 'New Member Signup', date: 'Jul 12th 2024', orderId: 'MEM001236', status: 'Completed', icon: 'person-add', iconColor: '#10B981', iconBg: '#D1FAE5' },
          { id: '4', name: 'Tier Upgrade - Gold', date: 'Jul 12th 2024', orderId: 'TIR001237', status: 'Completed', icon: 'trophy', iconColor: '#F59E0B', iconBg: '#FEF3C7' },
          { id: '5', name: 'Birthday Bonus', date: 'Jul 12th 2024', orderId: 'BNS001238', status: 'Completed', icon: 'gift', iconColor: theme.primary, iconBg: theme.primaryLight },
        ];
      default:
        return [];
    }
  };

  const finalTransactions = transactions || getDefaultTransactions();
  const finalSalesReport = salesReportData || getDefaultSalesReport();

  // Dynamic styles based on theme
  const dynamicStyles = {
    updateCard: {
      backgroundColor: theme.primary,
    },
    updateBadge: {
      backgroundColor: theme.primaryDark,
    },
    newBtn: {
      backgroundColor: theme.primary,
    },
    statsBtnText: {
      color: theme.primaryLight,
    },
  };

  // Use light background with themed accents (NOT full-bleed colored backgrounds)
  const headerBgColor = '#FFFFFF';
  const contentBgColor = '#F5F5F0';
  const textColor = '#111827';
  const subtextColor = '#6B7280';
  const cardBgColor = '#FFFFFF';
  const cardBorderColor = '#E5E7EB';

  return (
    <View style={[styles.container, { backgroundColor: contentBgColor }]}>
      {/* Page Header */}
      <View style={[styles.pageHeader, { backgroundColor: headerBgColor, borderBottomWidth: 1, borderBottomColor: cardBorderColor }]}>
        <View>
          <Text style={[styles.pageTitle, { color: textColor }]}>{title || 'Dashboard'}</Text>
          <Text style={[styles.pageSubtitle, { color: subtextColor }]}>{subtitle || `An easy way to manage ${theme.tagline.toLowerCase()} with care and precision`}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.dateRangePicker, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
            <Icon name="calendar-outline" size={18} color={textColor} />
            <Text style={[styles.dateRangeText, { color: textColor }]}>{dateRange}</Text>
            <Icon name="chevron-down-outline" size={16} color={subtextColor} />
          </TouchableOpacity>
          {onNewAction && (
            <TouchableOpacity style={[styles.newBtn, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]} onPress={onNewAction}>
              <Icon name="add" size={20} color={textColor} />
              <Text style={[styles.newBtnText, { color: textColor }]}>{newActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColor} /> : undefined}
        contentContainerStyle={styles.dashboardContent}
      >
        {/* Top Row: Update Card + Net Income + Total Return */}
        <View style={styles.topCardsRow}>
          {/* Update Card */}
          <View style={[styles.updateCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: cardBorderColor }]}>
            <View style={styles.updateCardContent}>
              <View style={[styles.updateBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Text style={[styles.updateBadgeText, { color: textColor }]}>{finalUpdateCard.badge}</Text>
              </View>
              <Text style={[styles.updateTitle, { color: textColor }]}>{finalUpdateCard.title}</Text>
              <Text style={[styles.updatePercentage, { color: subtextColor }]}>
                <Text style={[styles.updatePercentageNum, { color: textColor }]}>{finalUpdateCard.percentage}</Text> {finalUpdateCard.period}
              </Text>
              <TouchableOpacity style={styles.seeStatsBtn} onPress={finalUpdateCard.onCtaPress}>
                <Text style={[styles.seeStatsBtnText, { color: textColor }]}>{finalUpdateCard.ctaText}</Text>
                <Icon name="arrow-forward" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.updateCardGraph}>
              <View style={styles.miniBarChart}>
                {[40, 25, 55, 35, 60].map((height, i) => (
                  <View key={i} style={[styles.miniBar, { height, backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />
                ))}
              </View>
            </View>
          </View>

          {/* Net Income Card */}
          <View style={[styles.metricCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: cardBorderColor }]}>
            <Text style={[styles.metricLabel, { color: subtextColor }]}>Net Income</Text>
            <Text style={[styles.metricValue, { color: textColor }]}>
              {formatCurrency(netIncome?.value || 0)}
            </Text>
            <View style={styles.metricTrend}>
              <View style={[styles.trendBadge, { backgroundColor: (netIncome?.trend || 0) >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
                <Icon 
                  name={(netIncome?.trend || 0) >= 0 ? 'trending-up' : 'trending-down'} 
                  size={14} 
                  color={textColor} 
                />
                <Text style={[styles.trendText, { color: textColor }]}>
                  {(netIncome?.trend || 0) >= 0 ? '+' : ''}{netIncome?.trend || 35}%
                </Text>
              </View>
              <Text style={[styles.trendPeriod, { color: subtextColor }]}>from last month</Text>
            </View>
          </View>

          {/* Total Return Card */}
          <View style={[styles.metricCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: cardBorderColor }]}>
            <Text style={[styles.metricLabel, { color: subtextColor }]}>Total Return</Text>
            <Text style={[styles.metricValue, { color: textColor }]}>
              {formatCurrency(totalReturn?.value || 32000)}
            </Text>
            <View style={styles.metricTrend}>
              <View style={[styles.trendBadge, { backgroundColor: (totalReturn?.trend || -24) >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
                <Icon 
                  name={(totalReturn?.trend || -24) >= 0 ? 'trending-up' : 'trending-down'} 
                  size={14} 
                  color={textColor} 
                />
                <Text style={[styles.trendText, { color: textColor }]}>
                  {(totalReturn?.trend || -24) >= 0 ? '+' : ''}{totalReturn?.trend || -24}%
                </Text>
              </View>
              <Text style={[styles.trendPeriod, { color: subtextColor }]}>from last month</Text>
            </View>
          </View>
        </View>

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
        {statsRow.length > 0 && (
          <View style={styles.statsRow}>
            {statsRow.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: cardBgColor, borderWidth: 1, borderColor: cardBorderColor }]}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <Icon name={stat.icon} size={24} color={textColor} />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statValue, { color: textColor }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: subtextColor }]}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Main Dashboard Grid */}
        <View style={styles.dashboardGrid}>
          {/* Left Column: Transaction List */}
          <View style={styles.leftColumn}>
            <TransactionList 
              transactions={finalTransactions}
              onViewMore={onTransactionViewMore}
              themeColor={theme.primary}
            />
          </View>
          
          {/* Middle Column: Revenue Chart + Sales Report */}
          <View style={styles.middleColumn}>
            <RevenueChart 
              totalRevenue={revenueTotal}
              percentageChange={revenueTrend}
              formatCurrency={formatCurrency}
              themeColor={theme.primary}
            />
            
            <SalesReport 
              data={finalSalesReport}
              onViewMore={onSalesReportViewMore}
              themeColor={theme.primary}
            />
          </View>
          
          {/* Right Column: Total View Performance + Promotional Card */}
          <View style={styles.rightColumn}>
            <TotalViewPerformance 
              totalCount={performanceData?.total || 565000}
              viewCount={performanceData?.viewCount || 68}
              percentage={performanceData?.percentage || 16}
              sales={performanceData?.sales || 23}
              themeColor={theme.primary}
            />
            
            <PromotionalCard 
              title={promoTitle || defaultPromoTitle}
              subtitle={promoSubtitle || defaultPromoSubtitle}
              buttonText={promoButtonText}
              onPress={onPromoPress}
              themeColor={theme.primary}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    maxWidth: 380,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateRangePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dashboardContent: {
    padding: 24,
  },
  topCardsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  updateCard: {
    flex: 2,
    flexDirection: 'row',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  updateCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  updateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  updateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  updatePercentage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  updatePercentageNum: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeStatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeStatsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  updateCardGraph: {
    width: 140,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  miniBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 80,
  },
  miniBar: {
    width: 20,
    borderRadius: 4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendPeriod: {
    fontSize: 12,
    color: '#9CA3AF',
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
  dashboardGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    flex: 1,
    gap: 20,
  },
  middleColumn: {
    flex: 1,
    gap: 20,
  },
  rightColumn: {
    flex: 1,
    gap: 20,
  },
});

export default ProductDashboard;
