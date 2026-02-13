import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface ConnectedApp {
  client_id: string;
  app_name: string;
  description?: string;
  icon_url?: string;
  scopes: string[];
  connected_at: string;
  app_type: string;
}

export default function SSODashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [activeTab, setActiveTab] = useState<'connected' | 'available'>('connected');
  const [availableApps, setAvailableApps] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch connected apps
      const connectedRes = await api.get('/sso/apps/connected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectedApps(connectedRes.data.apps || []);

      // Fetch available apps
      const availableRes = await api.get('/sso/apps/available');
      setAvailableApps(availableRes.data.apps || []);
    } catch (error) {
      console.error('Error fetching SSO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (clientId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await api.delete(`/sso/apps/connected/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectedApps(prev => prev.filter(app => app.client_id !== clientId));
    } catch (error) {
      console.error('Error disconnecting app:', error);
    }
  };

  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      openid: 'Basic Identity',
      profile: 'Profile Information',
      email: 'Email Address',
      apps: 'App Access',
      offline_access: 'Offline Access',
    };
    return labels[scope] || scope;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading SSO Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>SSO & Connected Apps</Text>
            <Text style={styles.pageSubtitle}>Manage your app connections and permissions</Text>
          </View>
          <TouchableOpacity
            style={styles.developerBtn}
            onPress={() => router.push('/sso/developer')}
          >
            <Ionicons name="code-slash" size={18} color={COLORS.white} />
            <Text style={styles.developerBtnText}>Developer Portal</Text>
          </TouchableOpacity>
        </View>

        {/* SSO Info Card */}
        <View style={styles.ssoInfoCard}>
          <View style={styles.ssoInfoIcon}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.ssoInfoContent}>
            <Text style={styles.ssoInfoTitle}>Single Sign-On Enabled</Text>
            <Text style={styles.ssoInfoText}>
              You're signed in across all Software Galaxy apps. Third-party apps can request access to your account.
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'connected' && styles.tabActive]}
            onPress={() => setActiveTab('connected')}
          >
            <Ionicons
              name="link"
              size={18}
              color={activeTab === 'connected' ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === 'connected' && styles.tabTextActive]}>
              Connected ({connectedApps.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => setActiveTab('available')}
          >
            <Ionicons
              name="apps"
              size={18}
              color={activeTab === 'available' ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
              Available Apps
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'connected' ? (
          <View style={styles.section}>
            {connectedApps.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="apps-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Connected Apps</Text>
                <Text style={styles.emptyText}>
                  You haven't connected any third-party apps yet.
                </Text>
              </View>
            ) : (
              connectedApps.map((app) => (
                <View key={app.client_id} style={styles.appCard}>
                  <View style={styles.appCardHeader}>
                    <View style={styles.appIcon}>
                      {app.icon_url ? (
                        <Ionicons name="cube" size={24} color={COLORS.primary} />
                      ) : (
                        <Text style={styles.appIconText}>
                          {app.app_name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName}>{app.app_name}</Text>
                      <Text style={styles.appDate}>
                        Connected {new Date(app.connected_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.appTypeBadge,
                      { backgroundColor: app.app_type === 'first_party' ? COLORS.primaryLight : COLORS.purpleLight }
                    ]}>
                      <Text style={[
                        styles.appTypeBadgeText,
                        { color: app.app_type === 'first_party' ? COLORS.primary : COLORS.purple }
                      ]}>
                        {app.app_type === 'first_party' ? 'Official' : 'Third-Party'}
                      </Text>
                    </View>
                  </View>

                  {app.description && (
                    <Text style={styles.appDescription}>{app.description}</Text>
                  )}

                  <View style={styles.permissionsSection}>
                    <Text style={styles.permissionsTitle}>Permissions Granted:</Text>
                    <View style={styles.permissionsList}>
                      {app.scopes.map((scope, idx) => (
                        <View key={idx} style={styles.permissionTag}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                          <Text style={styles.permissionText}>{getScopeLabel(scope)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={() => handleDisconnect(app.client_id)}
                  >
                    <Ionicons name="unlink" size={16} color={COLORS.danger} />
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {availableApps.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Apps Available</Text>
                <Text style={styles.emptyText}>
                  Check back later for new integrations.
                </Text>
              </View>
            ) : (
              <View style={styles.appsGrid}>
                {availableApps.map((app) => (
                  <TouchableOpacity key={app.client_id} style={styles.availableAppCard}>
                    <View style={styles.availableAppIcon}>
                      <Ionicons name="cube" size={28} color={COLORS.primary} />
                    </View>
                    <Text style={styles.availableAppName}>{app.name}</Text>
                    <Text style={styles.availableAppDesc} numberOfLines={2}>
                      {app.description || 'No description'}
                    </Text>
                    <View style={styles.availableAppMeta}>
                      <Text style={styles.availableAppDeveloper}>By {app.developer_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  developerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  developerBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  ssoInfoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ssoInfoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ssoInfoContent: {
    flex: 1,
  },
  ssoInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  ssoInfoText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  section: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  appCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  appIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  appDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  appTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 12,
    lineHeight: 18,
  },
  permissionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 10,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  permissionText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    backgroundColor: COLORS.dangerLight,
    gap: 8,
  },
  disconnectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  availableAppCard: {
    width: isWeb ? 'calc(33.33% - 11px)' : '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  availableAppIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  availableAppName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  availableAppDesc: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  availableAppMeta: {
    marginTop: 12,
  },
  availableAppDeveloper: {
    fontSize: 11,
    color: COLORS.gray,
  },
});
