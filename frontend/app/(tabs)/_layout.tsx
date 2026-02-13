import React, { useEffect, useState } from 'react';
import { Tabs, useRouter, useSegments, Slot } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions, Text, TouchableOpacity, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { subscriptionApi, businessesApi } from '../../src/api/client';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';
import ContextSwitcher from '../../src/components/ContextSwitcher';

// Role-based tab access configuration
// admin: Full access to everything + all admin tools
// manager: Full access to everything + some admin tools (Staff, Products, Promotions, Expenses, Categories)
// sales_staff: ONLY Add Sale functionality
// front_desk: ONLY Add Sale functionality (same as sales_staff)
// finance: Dashboard, Reports, Expenses (financial section)

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { user } = useAuthStore();
  const userRole = user?.role || 'sales_staff';
  
  // Location store
  const { 
    locations, 
    selectedLocationId, 
    isLoading: locationsLoading, 
    fetchLocations,
    setSelectedLocation,
  } = useLocationStore();
  
  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Only show web sidebar on web platform with width > 768px
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  
  // Fetch subscription and locations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subResponse] = await Promise.all([
          subscriptionApi.getStatus(),
        ]);
        setSubscription(subResponse.data);
        fetchLocations();
      } catch (error) {
        console.log('Failed to fetch subscription:', error);
      }
    };
    fetchData();
  }, []);

  // Redirect sales_staff and front_desk to cart tab
  useEffect(() => {
    if ((userRole === 'sales_staff' || userRole === 'front_desk') && segments[1] !== 'cart') {
      router.replace('/(tabs)/cart');
    }
  }, [userRole, segments]);

  // Get subscription badge info
  const getSubscriptionBadge = () => {
    const planName = subscription?.plan_name || 'starter';
    const colors: Record<string, { bg: string; text: string }> = {
      starter: { bg: '#DBEAFE', text: '#2563EB' },
      professional: { bg: '#FEF3C7', text: '#D97706' },
      enterprise: { bg: '#D1FAE5', text: '#10B981' },
    };
    return {
      name: planName.charAt(0).toUpperCase() + planName.slice(1),
      ...colors[planName] || colors.starter,
    };
  };
  
  const badge = getSubscriptionBadge();
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const isSingleLocation = locations.length === 1;
  const locationName = isSingleLocation 
    ? locations[0]?.name 
    : (selectedLocation?.name || 'All Locations');
  const showLocationSelector = ['admin', 'manager', 'superadmin'].includes(userRole) && locations.length >= 1;

  // Define which tabs each role can see
  const canAccessTab = (tabName: string): boolean => {
    // Admin, Manager, Superadmin can access all tabs
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'superadmin') {
      return true;
    }
    
    // Sales Staff and Front Desk: ONLY Add Sale (cart) tab
    if (userRole === 'sales_staff' || userRole === 'front_desk') {
      return tabName === 'cart';
    }
    
    // Finance: Dashboard and Orders (for financial tracking)
    if (userRole === 'finance') {
      return ['dashboard', 'orders'].includes(tabName);
    }
    
    return true; // Default allow
  };

  // For web desktop, use the sidebar layout with floating help button
  if (isWebDesktop) {
    return (
      <View style={styles.webContainer}>
        <WebSidebarLayout>
          <Slot />
        </WebSidebarLayout>
        <FloatingHelpButton />
      </View>
    );
  }

  // For mobile and small screens, use the bottom tabs with floating help button
  return (
    <View style={styles.mobileContainer}>
      {/* Mobile Header with Unified Context Switcher */}
      <SafeAreaView edges={['top']} style={styles.mobileHeader}>
        <View style={styles.mobileHeaderContent}>
          {/* Unified Context Switcher - For admin users */}
          {['admin', 'manager', 'superadmin'].includes(userRole) ? (
            <ContextSwitcher 
              allowAddBusiness={true} 
              allowAddLocation={true}
              onBusinessSwitch={() => router.replace('/(tabs)/dashboard')}
              onLocationSwitch={() => {}}
            />
          ) : (
            <View style={styles.logoContainer}>
              <Ionicons name="storefront" size={20} color="#2563EB" />
              <Text style={styles.logoText}>RetailPro</Text>
            </View>
          )}
          
          {/* Subscription Badge */}
          <View style={[styles.subscriptionBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.subscriptionBadgeText, { color: badge.text }]}>
              {badge.name}
            </Text>
          </View>
        </View>
      </SafeAreaView>
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 88 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
            href: canAccessTab('dashboard') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
            href: canAccessTab('products') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Add Sale',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.addSaleButton}>
                <View style={[styles.addSaleIconContainer, focused && styles.addSaleIconContainerFocused]}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
                {cartCount > 0 && (
                  <View style={styles.addSaleBadge}>
                    <Text style={styles.addSaleBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </View>
            ),
            tabBarLabel: () => null,
            href: canAccessTab('cart') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Customers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
            href: canAccessTab('customers') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
            href: canAccessTab('orders') ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="WebLayout"
          options={{
            href: null, // Hide from tabs
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            href: null, // Hide from tabs
          }}
        />
      </Tabs>
      <FloatingHelpButton />
      
      {/* Location Selector Modal for Mobile */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={styles.locationModalContainer}>
          <View style={styles.locationModalHeader}>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.locationModalTitle}>Select Location</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.locationModalContent}>
            {/* All Locations Option */}
            <TouchableOpacity
              style={[
                styles.locationOption,
                selectedLocationId === null && styles.locationOptionSelected,
              ]}
              onPress={() => {
                setSelectedLocation(null);
                setShowLocationModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.locationOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="globe-outline" size={20} color="#2563EB" />
              </View>
              <View style={styles.locationOptionInfo}>
                <Text style={[
                  styles.locationOptionName,
                  selectedLocationId === null && styles.locationOptionNameSelected,
                ]}>
                  All Locations
                </Text>
                <Text style={styles.locationOptionDesc}>View combined data</Text>
              </View>
              {selectedLocationId === null && (
                <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
              )}
            </TouchableOpacity>
            
            {/* Individual Locations */}
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationOption,
                  selectedLocationId === location.id && styles.locationOptionSelected,
                ]}
                onPress={() => {
                  setSelectedLocation(location.id);
                  setShowLocationModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.locationOptionIcon,
                  location.is_primary && { backgroundColor: '#D1FAE5' },
                ]}>
                  <Ionicons 
                    name={location.is_primary ? "star" : "storefront-outline"} 
                    size={20} 
                    color={location.is_primary ? "#10B981" : "#6B7280"} 
                  />
                </View>
                <View style={styles.locationOptionInfo}>
                  <View style={styles.locationOptionNameRow}>
                    <Text style={[
                      styles.locationOptionName,
                      selectedLocationId === location.id && styles.locationOptionNameSelected,
                    ]} numberOfLines={1}>
                      {location.name}
                    </Text>
                    {location.is_primary && (
                      <View style={styles.primaryTag}>
                        <Text style={styles.primaryTagText}>Main</Text>
                      </View>
                    )}
                  </View>
                  {location.address && (
                    <Text style={styles.locationOptionDesc} numberOfLines={1}>
                      {location.address}
                    </Text>
                  )}
                </View>
                {selectedLocationId === location.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.locationModalFooter}>
            <Text style={styles.locationModalFooterText}>
              {locations.length} location{locations.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
  // Add Sale Button - Prominent FAB style
  addSaleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addSaleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addSaleIconContainerFocused: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 1.05 }],
  },
  addSaleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addSaleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Mobile Header
  mobileHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mobileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: 180,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    flex: 1,
  },
  singleLocationPill: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  singleLocationPillText: {
    color: '#10B981',
  },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Location Modal
  locationModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  locationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  locationModalContent: {
    flex: 1,
    paddingTop: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  locationOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  locationOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionInfo: {
    flex: 1,
  },
  locationOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  locationOptionNameSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  locationOptionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  primaryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  primaryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  locationModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  locationModalFooterText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
