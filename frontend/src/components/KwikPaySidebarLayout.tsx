import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import ProductSwitcher from './ProductSwitcher';
import LinkedAppsSidebar from './LinkedAppsSidebar';
import ContextSwitcher from './ContextSwitcher';

// KwikPay theme - Green for payments/finance
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#DC2626',
};

const NAV_ITEMS = [
  { name: '/kwikpay', label: 'Dashboard', icon: 'grid-outline' },
  { name: '/kwikpay/collect', label: 'Collect Payment', icon: 'cash-outline' },
  { name: '/kwikpay/kwikcheckout', label: 'KwikCheckout', icon: 'flash-outline' },
  { name: '/kwikpay/transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
  { name: '/kwikpay/payouts', label: 'Payouts', icon: 'wallet-outline' },
  { name: '/kwikpay/checkout', label: 'Checkout Links', icon: 'link-outline' },
];

const ADVANCED_NAV_ITEMS = [
  { name: '/kwikpay/payment-links', label: 'Payment Links', icon: 'link-outline' },
  { name: '/kwikpay/qr-codes', label: 'QR Payments', icon: 'qr-code-outline' },
  { name: '/kwikpay/recurring', label: 'Recurring Billing', icon: 'repeat-outline' },
  { name: '/kwikpay/mobile-money', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { name: '/kwikpay/invoicing', label: 'Invoicing', icon: 'document-text-outline' },
  { name: '/kwikpay/split-payments', label: 'Split Payments', icon: 'git-branch-outline' },
  { name: '/kwikpay/gateway', label: 'Gateway (B2B)', icon: 'business-outline' },
];

const TOOLS_NAV_ITEMS = [
  { name: '/kwikpay/analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { name: '/kwikpay/disputes', label: 'Disputes & Refunds', icon: 'alert-circle-outline' },
  { name: '/kwikpay/fraud', label: 'Fraud Detection', icon: 'shield-outline' },
  { name: '/kwikpay/multi-currency', label: 'Multi-Currency', icon: 'globe-outline' },
  { name: '/kwikpay/virtual-accounts', label: 'Virtual Cards', icon: 'card-outline' },
];

const ACCOUNT_NAV_ITEMS = [
  { name: '/kwikpay/compliance', label: 'Compliance & KYC', icon: 'shield-checkmark-outline' },
  { name: '/kwikpay/roles', label: 'Team & Roles', icon: 'people-outline' },
  { name: '/kwikpay/developers', label: 'API Keys', icon: 'key-outline' },
  { name: '/kwikpay/api-docs', label: 'API Docs & Sandbox', icon: 'code-slash-outline' },
  { name: '/kwikpay/webhooks', label: 'Webhooks', icon: 'git-network-outline' },
  { name: '/kwikpay/checkout-themes', label: 'Checkout Themes', icon: 'color-palette-outline' },
  { name: '/kwikpay/settings', label: 'Settings', icon: 'settings-outline' },
];

interface KwikPaySidebarLayoutProps {
  children: React.ReactNode;
}

export default function KwikPaySidebarLayout({ children }: KwikPaySidebarLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { businessSettings } = useBusinessStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentPath = '/' + segments.join('/');
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  const isActive = (name: string) => {
    if (name === '/kwikpay' && currentPath === '/kwikpay') return true;
    if (name !== '/kwikpay' && currentPath.startsWith(name)) return true;
    return false;
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  if (!isWebDesktop) return <>{children}</>;

  return (
    <View style={styles.container}>
      {/* Top Header - Themed Color */}
      <View style={[styles.topHeader, { backgroundColor: COLORS.primary, borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Ionicons name="card" size={22} color={COLORS.white} />
          </View>
          <Text style={[styles.brandName, { color: COLORS.white }]}>KwikPay</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Context Switcher - Business & Location (no add buttons - linked app) */}
          <ContextSwitcher 
            allowAddBusiness={false} 
            allowAddLocation={false}
            onBusinessSwitch={() => router.replace('/kwikpay')}
            onLocationSwitch={() => {}}
          />
          <ProductSwitcher currentProductId="kwikpay" />
          <View style={[styles.userInfo, { borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: COLORS.white }]} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={[styles.userRole, { color: 'rgba(255, 255, 255, 0.7)' }]}>{user?.role?.replace('_', ' ').toUpperCase() || 'USER'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Body with Sidebar */}
      <View style={styles.bodyContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
            <Text style={styles.navSectionTitle}>PAYMENTS</Text>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => router.push(item.name as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.name) ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>ADVANCED</Text>
            {ADVANCED_NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => router.push(item.name as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.name) ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>TOOLS</Text>
            {TOOLS_NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => router.push(item.name as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.name) ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>ACCOUNT</Text>
            {ACCOUNT_NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                onPress={() => router.push(item.name as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.name) ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Linked Apps */}
            <LinkedAppsSidebar
              currentProductId="kwikpay"
              themeColor={COLORS.primary}
              themeBgColor={COLORS.primaryLight}
            />

            {/* Back to Galaxy */}
            <View style={styles.backSection}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/landing')}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
                <Text style={styles.backButtonText}>Back to Galaxy</Text>
              </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => setShowLogoutConfirm(true)}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  userDetails: {
    maxWidth: 120,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  userRole: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 1,
  },
  bodyContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  backSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.danger,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
