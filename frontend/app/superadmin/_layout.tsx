import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments, Slot } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
  // Product colors
  retailpro: '#3B82F6',
  inventory: '#8B5CF6',
  invoicing: '#EC4899',
  kwikpay: '#10B981',
  unitxt: '#F59E0B',
};

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { name: '/superadmin', label: 'Dashboard', icon: 'grid-outline' },
      { name: '/superadmin/analytics', label: 'Analytics', icon: 'stats-chart-outline' },
    ]
  },
  {
    title: 'PRODUCTS',
    items: [
      { name: '/superadmin/retailpro', label: 'RetailPro', icon: 'storefront-outline', color: COLORS.retailpro },
      { name: '/superadmin/inventory', label: 'Inventory', icon: 'cube-outline', color: COLORS.inventory },
      { name: '/superadmin/invoicing', label: 'Invoicing', icon: 'document-text-outline', color: COLORS.invoicing },
      { name: '/superadmin/kwikpay', label: 'KwikPay', icon: 'card-outline', color: COLORS.kwikpay },
      { name: '/superadmin/unitxt', label: 'UniTxt', icon: 'chatbubbles-outline', color: COLORS.unitxt },
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { name: '/superadmin/users', label: 'User Management', icon: 'people-outline' },
      { name: '/superadmin/businesses', label: 'Businesses', icon: 'business-outline' },
      { name: '/superadmin/referrals', label: 'Referral Program', icon: 'share-social-outline', color: COLORS.success },
      { name: '/superadmin/team', label: 'Team Portal', icon: 'person-add-outline' },
      { name: '/superadmin/approvals', label: 'Approvals', icon: 'checkmark-circle-outline', badge: 5 },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { name: '/superadmin/api-logs', label: 'API Logs', icon: 'code-slash-outline' },
      { name: '/superadmin/settings', label: 'Settings', icon: 'settings-outline' },
    ]
  },
];

export default function SuperAdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<View>(null);

  const isWebDesktop = Platform.OS === 'web' && width > 1024;
  const currentPath = '/' + segments.join('/');

  // Fetch notifications and approvals
  useEffect(() => {
    if (isAuthenticated && user?.role === 'superadmin') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchNotifications = async () => {
    try {
      // Get recent activity and pending approvals as notifications
      const [activityRes, approvalsRes] = await Promise.all([
        api.get('/superadmin/activity/recent?limit=5').catch(() => ({ data: { activities: [] } })),
        api.get('/superadmin/approvals').catch(() => ({ data: { approvals: [] } })),
      ]);

      const activityNotifs = (activityRes.data?.activities || []).map((a: any, i: number) => ({
        id: `activity_${i}`,
        type: a.type || 'activity',
        title: getNotificationTitle(a.type),
        message: a.message,
        time: a.time,
        read: false,
        icon: getNotificationIcon(a.type),
        color: getNotificationColor(a.type),
      }));

      const approvalNotifs = (approvalsRes.data?.approvals || []).slice(0, 3).map((a: any) => ({
        id: a.id,
        type: 'approval',
        title: 'Pending Approval',
        message: a.title,
        time: formatTimeAgo(a.submitted_at),
        read: false,
        icon: 'checkmark-circle-outline',
        color: COLORS.warning,
        priority: a.priority,
      }));

      const allNotifs = [...approvalNotifs, ...activityNotifs].slice(0, 8);
      setNotifications(allNotifs);
      setUnreadCount(allNotifs.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const getNotificationTitle = (type: string) => {
    const titles: Record<string, string> = {
      signup: 'New User',
      payment: 'Transaction',
      order: 'New Order',
      approval: 'Pending Approval',
      activity: 'Activity',
    };
    return titles[type] || 'Notification';
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      signup: 'person-add-outline',
      payment: 'card-outline',
      order: 'cart-outline',
      approval: 'checkmark-circle-outline',
      activity: 'pulse-outline',
    };
    return icons[type] || 'notifications-outline';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      signup: COLORS.success,
      payment: COLORS.kwikpay,
      order: COLORS.retailpro,
      approval: COLORS.warning,
      activity: COLORS.primary,
    };
    return colors[type] || COLORS.gray;
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    
    if (user?.role !== 'superadmin') {
      router.replace('/landing');
    }
  }, [isAuthenticated, user]);

  const isActive = (name: string) => {
    if (name === '/superadmin' && currentPath === '/superadmin') return true;
    if (name !== '/superadmin' && currentPath.startsWith(name)) return true;
    return false;
  };

  if (!isWebDesktop) {
    return (
      <View style={styles.mobileContainer}>
        <Slot />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.white} />
          </View>
          {!sidebarCollapsed && (
            <View>
              <Text style={styles.logoText}>SuperAdmin</Text>
              <Text style={styles.logoSubtext}>Control Center</Text>
            </View>
          )}
        </View>

        {/* Navigation */}
        <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.navSection}>
              {!sidebarCollapsed && (
                <Text style={styles.navSectionTitle}>{section.title}</Text>
              )}
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.navItem,
                    isActive(item.name) && styles.navItemActive,
                    sidebarCollapsed && styles.navItemCollapsed,
                  ]}
                  onPress={() => router.push(item.name as any)}
                >
                  <View style={[
                    styles.navIconContainer,
                    isActive(item.name) && styles.navIconContainerActive,
                    item.color && { backgroundColor: item.color + '20' }
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isActive(item.name) ? COLORS.primary : (item.color || COLORS.gray)}
                    />
                  </View>
                  {!sidebarCollapsed && (
                    <>
                      <Text style={[
                        styles.navLabel,
                        isActive(item.name) && styles.navLabelActive,
                      ]}>
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Collapse Toggle */}
        <TouchableOpacity
          style={styles.collapseButton}
          onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Ionicons
            name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
            size={20}
            color={COLORS.gray}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.pageTitle}>
              {getPageTitle(currentPath)}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            {/* Notification Bell with Dropdown */}
            <View style={styles.notificationContainer} ref={notificationRef}>
              <TouchableOpacity 
                style={styles.topBarButton}
                onPress={() => setShowNotifications(!showNotifications)}
                data-testid="notification-bell"
              >
                <Ionicons name="notifications-outline" size={22} color={COLORS.gray} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Notification Dropdown */}
              {showNotifications && (
                <Pressable 
                  style={styles.dropdownOverlay}
                  onPress={() => setShowNotifications(false)}
                >
                  <Pressable 
                    style={styles.notificationDropdown}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationHeaderTitle}>Notifications</Text>
                      {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllAsRead}>
                          <Text style={styles.markAllRead}>Mark all read</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
                      {notifications.length === 0 ? (
                        <View style={styles.emptyNotifications}>
                          <Ionicons name="notifications-off-outline" size={40} color={COLORS.border} />
                          <Text style={styles.emptyNotificationsText}>No notifications</Text>
                        </View>
                      ) : (
                        notifications.map((notif) => (
                          <TouchableOpacity 
                            key={notif.id}
                            style={[
                              styles.notificationItem,
                              !notif.read && styles.notificationItemUnread
                            ]}
                            onPress={() => {
                              if (notif.type === 'approval') {
                                router.push('/superadmin/approvals');
                              }
                              setShowNotifications(false);
                            }}
                          >
                            <View style={[styles.notificationIcon, { backgroundColor: notif.color + '20' }]}>
                              <Ionicons name={notif.icon as any} size={18} color={notif.color} />
                            </View>
                            <View style={styles.notificationContent}>
                              <View style={styles.notificationTitleRow}>
                                <Text style={styles.notificationTitle}>{notif.title}</Text>
                                {notif.priority === 'high' && (
                                  <View style={styles.priorityBadge}>
                                    <Text style={styles.priorityBadgeText}>High</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.notificationMessage} numberOfLines={2}>
                                {notif.message}
                              </Text>
                              <Text style={styles.notificationTime}>{notif.time}</Text>
                            </View>
                            {!notif.read && <View style={styles.unreadDot} />}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>

                    <TouchableOpacity 
                      style={styles.viewAllButton}
                      onPress={() => {
                        router.push('/superadmin/approvals');
                        setShowNotifications(false);
                      }}
                    >
                      <Text style={styles.viewAllButtonText}>View All Notifications</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </Pressable>
                </Pressable>
              )}
            </View>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="search-outline" size={22} color={COLORS.gray} />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{user?.name || 'Super Admin'}</Text>
                <Text style={styles.userRole}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Page Content */}
        <View style={styles.pageContent}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

function getPageTitle(path: string): string {
  const titles: { [key: string]: string } = {
    '/superadmin': 'Dashboard Overview',
    '/superadmin/analytics': 'Platform Analytics',
    '/superadmin/retailpro': 'RetailPro Management',
    '/superadmin/inventory': 'Inventory Management',
    '/superadmin/invoicing': 'Invoicing Management',
    '/superadmin/kwikpay': 'KwikPay Management',
    '/superadmin/unitxt': 'UniTxt Management',
    '/superadmin/users': 'User Management',
    '/superadmin/businesses': 'Business Management',
    '/superadmin/referrals': 'Referral Program',
    '/superadmin/team': 'Team Portal',
    '/superadmin/approvals': 'Pending Approvals',
    '/superadmin/api-logs': 'API Logs & Monitoring',
    '/superadmin/settings': 'System Settings',
  };
  return titles[path] || 'SuperAdmin';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  sidebar: {
    width: 260,
    backgroundColor: COLORS.dark,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sidebarCollapsed: {
    width: 72,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
    marginBottom: 16,
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  logoSubtext: {
    fontSize: 11,
    color: COLORS.gray,
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navSection: {
    marginBottom: 24,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    paddingHorizontal: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryDark + '30',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkGray,
  },
  navIconContainerActive: {
    backgroundColor: COLORS.primary + '30',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  navLabelActive: {
    color: COLORS.white,
  },
  badge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  collapseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    marginTop: 12,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  userRole: {
    fontSize: 12,
    color: COLORS.gray,
  },
  pageContent: {
    flex: 1,
  },
  // Notification Dropdown Styles
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 50,
    right: -16,
    zIndex: 1000,
  },
  notificationDropdown: {
    width: 380,
    maxHeight: 480,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  notificationList: {
    maxHeight: 340,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: COLORS.primaryLight + '30',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  priorityBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.danger,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
