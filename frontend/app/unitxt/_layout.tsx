import React, { useEffect } from 'react';
import { Tabs, Slot, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import WebSidebarLayout from '../../src/components/WebSidebarLayout';
import FloatingHelpButton from '../../src/components/FloatingHelpButton';

// Unitxt theme colors - Orange/Amber for messaging
const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  inactive: '#9CA3AF',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

// Custom Tab Bar with centered New Message button
function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  
  const visibleTabs = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  return (
    <View style={tabBarStyles.container}>
      {/* Left tabs */}
      <View style={tabBarStyles.leftTabs}>
        {visibleTabs.slice(0, 2).map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabBarStyles.tabItem}
            >
              {options.tabBarIcon?.({ 
                color: isFocused ? COLORS.primary : COLORS.inactive, 
                size: 24 
              })}
              <Text style={[
                tabBarStyles.tabLabel,
                { color: isFocused ? COLORS.primary : COLORS.inactive }
              ]}>
                {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center: New Message Button */}
      <TouchableOpacity 
        style={tabBarStyles.addButton}
        onPress={() => router.push('/unitxt/compose')}
      >
        <View style={tabBarStyles.addButtonInner}>
          <Ionicons name="paper-plane" size={24} color="#FFFFFF" />
        </View>
        <Text style={tabBarStyles.addButtonLabel}>New Message</Text>
      </TouchableOpacity>

      {/* Right tabs */}
      <View style={tabBarStyles.rightTabs}>
        {visibleTabs.slice(2, 4).map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabBarStyles.tabItem}
            >
              {options.tabBarIcon?.({ 
                color: isFocused ? COLORS.primary : COLORS.inactive, 
                size: 24 
              })}
              <Text style={[
                tabBarStyles.tabLabel,
                { color: isFocused ? COLORS.primary : COLORS.inactive }
              ]}>
                {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 88 : 70,
    alignItems: 'flex-end',
  },
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    marginTop: -30,
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
});

export default function UnitxtLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();
  
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  if (isWebDesktop) {
    return (
      <View style={styles.webContainer}>
        <WebSidebarLayout>
          <Slot />
        </WebSidebarLayout>
      </View>
    );
  }

  return (
    <View style={styles.mobileContainer}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="campaigns"
          options={{
            title: 'Campaigns',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="contacts"
          options={{
            title: 'Contacts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="compose" options={{ href: null }} />
        <Tabs.Screen name="templates" options={{ href: null }} />
        <Tabs.Screen name="credits" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="tools" options={{ href: null }} />
        <Tabs.Screen name="inbox" options={{ href: null }} />
      </Tabs>
      <FloatingHelpButton />
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
});
