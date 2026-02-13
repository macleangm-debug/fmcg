import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { useBusinessStore } from '../../src/store/businessStore';

interface WebLayoutProps {
  children: React.ReactNode;
}

export default function WebLayout({ children }: WebLayoutProps) {
  const router = useRouter();
  const segments = useSegments();
  const { user, logout } = useAuthStore();
  const { businessSettings } = useBusinessStore();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const userRole = user?.role || 'sales_staff';
  const currentTab = segments[1] || 'dashboard';

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  // Define navigation items based on role
  const getNavItems = () => {
    const items = [];
    
    // Dashboard - for all except sales_staff
    if (!['sales_staff', 'front_desk'].includes(userRole)) {
      items.push({ name: 'dashboard', label: 'Dashboard', icon: 'grid-outline' });
    }
    
    // Add Sale - for all
    items.push({ name: 'cart', label: 'Add Sale', icon: 'cart-outline', badge: cartCount });
    
    // Orders - for admin, manager, finance
    if (['admin', 'manager', 'superadmin', 'finance'].includes(userRole)) {
      items.push({ name: 'orders', label: 'Orders', icon: 'receipt-outline' });
    }
    
    // Customers - for admin, manager
    if (['admin', 'manager', 'superadmin'].includes(userRole)) {
      items.push({ name: 'customers', label: 'Customers', icon: 'people-outline' });
    }
    
    return items;
  };

  const getAdminItems = () => {
    if (!['admin', 'manager', 'superadmin'].includes(userRole)) return [];
    
    const items = [
      { name: '/admin/products', label: 'Products', icon: 'cube-outline' },
      { name: '/admin/stock', label: 'Stock', icon: 'layers-outline' },
      { name: '/admin/categories', label: 'Categories', icon: 'folder-outline' },
      { name: '/admin/promotions', label: 'Promotions', icon: 'pricetag-outline' },
      { name: '/admin/expenses', label: 'Expenses', icon: 'wallet-outline' },
      { name: '/admin/reports', label: 'Reports', icon: 'bar-chart-outline' },
    ];
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      items.push({ name: '/admin/staff', label: 'Staff', icon: 'people-circle-outline' });
      items.push({ name: '/admin/settings', label: 'Settings', icon: 'settings-outline' });
    }
    
    return items;
  };

  const navItems = getNavItems();
  const adminItems = getAdminItems();

  const isActive = (name: string) => {
    if (name.startsWith('/')) {
      return segments.join('/').includes(name.slice(1));
    }
    return currentTab === name;
  };

  const handleNavPress = (name: string) => {
    if (name.startsWith('/')) {
      router.push(name as any);
    } else {
      router.push(`/(tabs)/${name}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        {/* Logo/Brand */}
        <View style={styles.brand}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName} numberOfLines={1}>
            {businessSettings?.name || 'RetailPro'}
          </Text>
        </View>

        {/* Main Navigation */}
        <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
          <Text style={styles.navSectionTitle}>MAIN MENU</Text>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
              onPress={() => handleNavPress(item.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={isActive(item.name) ? '#2563EB' : '#6B7280'}
              />
              <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                {item.label}
              </Text>
              {item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Admin Section */}
          {adminItems.length > 0 && (
            <>
              <Text style={[styles.navSectionTitle, { marginTop: 24 }]}>MANAGEMENT</Text>
              {adminItems.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, isActive(item.name) && styles.navItemActive]}
                  onPress={() => handleNavPress(item.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isActive(item.name) ? '#2563EB' : '#6B7280'}
                  />
                  <Text style={[styles.navLabel, isActive(item.name) && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>

        {/* User Section */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={styles.userRole}>{userRole.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  navLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
