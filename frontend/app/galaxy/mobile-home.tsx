import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useGalaxyStore } from '../../src/store/galaxyStore';
import { ExpandableCard, SimpleCard } from '../../src/components/ExpandableCard';
import api from '../../src/api/client';

// Calm blue theme (banking-style)
const COLORS = {
  // Gradient colors
  gradientStart: '#1E3A5F',
  gradientMid: '#2E5A8F',
  gradientEnd: '#3E7ABF',
  
  // Primary
  primary: '#1E5AA8',
  primaryLight: '#2E6AB8',
  
  // UI
  white: '#FFFFFF',
  dark: '#1A1A2E',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
  
  // App colors
  retailpro: '#3B82F6',
  kwikpay: '#10B981',
  inventory: '#F59E0B',
  invoicing: '#8B5CF6',
  unitxt: '#EC4899',
  expenses: '#EF4444',
  loyalty: '#06B6D4',
};

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: string;
}

export default function MobileHomePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { apps, fetchApps, isLoading } = useGalaxyStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await fetchApps();
      const subRes = await api.get('/subscription/current');
      setSubscription(subRes.data);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  // Quick actions for the main dashboard
  const quickActions: QuickAction[] = [
    { id: 'pos', label: 'Point of Sale', icon: 'cart', color: COLORS.retailpro, route: '/(tabs)/cart' },
    { id: 'payments', label: 'Payments', icon: 'flash', color: COLORS.kwikpay, route: '/kwikpay' },
    { id: 'inventory', label: 'Inventory', icon: 'cube', color: COLORS.inventory, route: '/inventory' },
    { id: 'invoices', label: 'Invoices', icon: 'document-text', color: COLORS.invoicing, route: '/invoicing' },
  ];

  // Soko Suite Apps
  const sokoApps = [
    { id: 'retailpro', label: 'Retail Pro', icon: 'storefront', color: COLORS.retailpro, route: '/(tabs)/cart' },
    { id: 'kwikpay', label: 'KwikPay', icon: 'flash', color: COLORS.kwikpay, route: '/kwikpay' },
    { id: 'inventory', label: 'Inventory', icon: 'cube', color: COLORS.inventory, route: '/inventory' },
    { id: 'invoicing', label: 'Invoicing', icon: 'document-text', color: COLORS.invoicing, route: '/invoicing' },
    { id: 'unitxt', label: 'Unitxt', icon: 'chatbubbles', color: COLORS.unitxt, route: '/unitxt' },
    { id: 'expenses', label: 'Expenses', icon: 'receipt', color: COLORS.expenses, route: '/expenses' },
    { id: 'loyalty', label: 'Loyalty', icon: 'heart', color: COLORS.loyalty, route: '/loyalty' },
    { id: 'reports', label: 'Reports', icon: 'bar-chart', color: COLORS.primary, route: '/(tabs)/reports' },
  ];

  // Management actions
  const manageActions = [
    { id: 'products', label: 'Products', icon: 'pricetags', color: COLORS.primary, route: '/products' },
    { id: 'customers', label: 'Customers', icon: 'people', color: COLORS.kwikpay, route: '/(tabs)/customers' },
    { id: 'staff', label: 'Staff', icon: 'person', color: COLORS.invoicing, route: '/admin/staff' },
    { id: 'settings', label: 'Settings', icon: 'settings', color: COLORS.gray, route: '/(tabs)/settings' },
  ];

  // Account actions
  const accountActions = [
    { id: 'profile', label: 'Profile', icon: 'person-circle', color: COLORS.primary, route: '/(tabs)/settings' },
    { id: 'subscription', label: 'Subscription', icon: 'card', color: COLORS.kwikpay, route: '/(tabs)/settings' },
    { id: 'help', label: 'Help', icon: 'help-circle', color: COLORS.inventory, route: '/help' },
    { id: 'logout', label: 'Logout', icon: 'log-out', color: COLORS.expenses, route: 'logout' },
  ];

  const handleItemPress = (item: any) => {
    if (item.route === 'logout') {
      logout();
      router.replace('/(auth)/login');
    } else {
      handleNavigate(item.route);
    }
  };

  const userName = user?.name?.split(' ')[0] || 'User';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Ionicons name="globe-outline" size={22} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.logoSubtext}>SOFTWARE</Text>
                <Text style={styles.logoText}>GALAXY</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          {/* Subscription Badge */}
          {subscription && (
            <View style={styles.subscriptionContainer}>
              <View style={styles.subscriptionBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.subscriptionText}>
                  {typeof subscription.plan === 'string' 
                    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) 
                    : 'Starter'} Plan
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Quick Actions Card */}
            <SimpleCard title="Quick Actions">
              <View style={styles.quickGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickItem}
                    onPress={() => handleNavigate(action.route)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickIcon, { backgroundColor: `${action.color}15` }]}>
                      <Ionicons name={action.icon as any} size={26} color={action.color} />
                    </View>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </SimpleCard>

            {/* Soko Suite Apps - Expandable */}
            <ExpandableCard
              title="Soko Suite"
              items={sokoApps}
              itemsPerRow={4}
              maxVisibleRows={1}
              onItemPress={handleItemPress}
              defaultExpanded={false}
            />

            {/* Manage - Expandable */}
            <ExpandableCard
              title="Manage"
              items={manageActions}
              itemsPerRow={4}
              maxVisibleRows={1}
              onItemPress={handleItemPress}
              defaultExpanded={false}
            />

            {/* Account - Expandable */}
            <ExpandableCard
              title="Account"
              items={accountActions}
              itemsPerRow={4}
              maxVisibleRows={1}
              onItemPress={handleItemPress}
              defaultExpanded={false}
            />

            {/* Bottom Padding */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigate('/galaxy/mobile-home')}>
          <Ionicons name="home" size={24} color={COLORS.primary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigate('/(tabs)/cart')}>
          <Ionicons name="cart-outline" size={24} color={COLORS.gray} />
          <Text style={styles.navLabel}>POS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigate('/(tabs)/orders')}>
          <Ionicons name="receipt-outline" size={24} color={COLORS.gray} />
          <Text style={styles.navLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigate('/(tabs)/settings')}>
          <Ionicons name="person-outline" size={24} color={COLORS.gray} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  
  // Header
  headerGradient: {
    paddingBottom: 24,
  },
  safeHeader: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: COLORS.gradientMid,
  },
  
  // Greeting
  greetingContainer: {
    marginTop: 24,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 4,
  },
  
  // Subscription
  subscriptionContainer: {
    marginTop: 16,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  subscriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Content
  content: {
    flex: 1,
    marginTop: -16,
  },
  contentContainer: {
    paddingTop: 8,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  
  // Quick Actions Grid
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  quickItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  
  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
