import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionApi } from '../api/client';
import Input from './Input';

const isWeb = Platform.OS === 'web';

// Define which apps can be linked to which products
const APP_RELATIONSHIPS: Record<string, string[]> = {
  invoicing: ['inventory', 'unitxt', 'kwikpay', 'crm', 'expenses'],
  inventory: ['invoicing', 'unitxt', 'kwikpay', 'expenses'],
  retailpro: ['inventory', 'invoicing', 'unitxt', 'kwikpay', 'crm', 'expenses'],
};

// App metadata for display
const APP_METADATA: Record<string, {
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  price: number;
  discountedPrice: number;
}> = {
  inventory: {
    name: 'Inventory',
    description: 'Smart stock management with real-time tracking',
    icon: 'cube-outline',
    color: '#10B981',
    features: [
      'Real-time stock tracking',
      'Low stock alerts & notifications',
      'Automatic stock deduction on invoices',
      'Product catalog sync',
      'Barcode scanning support',
    ],
    price: 15,
    discountedPrice: 12,
  },
  unitxt: {
    name: 'Unitxt',
    description: 'Unified messaging for SMS, Email & WhatsApp',
    icon: 'chatbubbles-outline',
    color: '#8B5CF6',
    features: [
      'SMS notifications & reminders',
      'Email invoices & receipts',
      'WhatsApp business messaging',
      'Automated payment reminders',
      'Bulk messaging campaigns',
    ],
    price: 19,
    discountedPrice: 15,
  },
  kwikpay: {
    name: 'KwikPay',
    description: 'Unified payment processing solution',
    icon: 'card-outline',
    color: '#10B981',
    features: [
      'Accept card payments',
      'Mobile money integration',
      'Payouts & disbursements',
      'Developer API & webhooks',
      'Automated reconciliation',
    ],
    price: 29,
    discountedPrice: 23,
  },
  crm: {
    name: 'CRM',
    description: 'Customer relationship management',
    icon: 'people-outline',
    color: '#3B82F6',
    features: [
      'Contact & lead management',
      'Sales pipeline tracking',
      'Customer interaction history',
      'Task & follow-up reminders',
      'Customer segmentation',
    ],
    price: 19,
    discountedPrice: 15,
  },
  expenses: {
    name: 'Expenses',
    description: 'Track and manage business expenses',
    icon: 'wallet-outline',
    color: '#F59E0B',
    features: [
      'Receipt scanning & storage',
      'Expense categorization',
      'Mileage tracking',
      'Approval workflows',
      'Expense reports & analytics',
    ],
    price: 15,
    discountedPrice: 12,
  },
  invoicing: {
    name: 'Invoicing',
    description: 'Professional invoicing & billing',
    icon: 'document-text-outline',
    color: '#7C3AED',
    features: [
      'Custom invoice templates',
      'Automated payment reminders',
      'Multi-currency support',
      'Client portal access',
      'Financial reports',
    ],
    price: 12,
    discountedPrice: 10,
  },
};

// Settings configurations for each app
const APP_SETTINGS_CONFIG: Record<string, {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'input';
  defaultValue?: boolean | string;
}[]> = {
  inventory: [
    { id: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Get notified when stock is low', type: 'toggle', defaultValue: true },
    { id: 'lowStockThreshold', label: 'Low Stock Threshold', description: 'Minimum stock level before alert', type: 'input', defaultValue: '10' },
  ],
  unitxt: [
    { id: 'smsNotifications', label: 'SMS Notifications', description: 'Send SMS for payment reminders', type: 'toggle', defaultValue: true },
    { id: 'emailInvoices', label: 'Email Invoices', description: 'Auto-send invoices via email', type: 'toggle', defaultValue: true },
    { id: 'whatsappMessages', label: 'WhatsApp Messages', description: 'Send updates via WhatsApp', type: 'toggle', defaultValue: false },
  ],
  kwikpay: [
    { id: 'autoCapture', label: 'Auto-capture Payments', description: 'Automatically capture authorized payments', type: 'toggle', defaultValue: true },
    { id: 'paymentNotifications', label: 'Payment Notifications', description: 'Get notified for successful payments', type: 'toggle', defaultValue: true },
    { id: 'mobileMoney', label: 'Mobile Money', description: 'Accept M-Pesa, Airtel Money, etc.', type: 'toggle', defaultValue: true },
  ],
  crm: [
    { id: 'autoCreateContacts', label: 'Auto-create Contacts', description: 'Create CRM contacts from invoice clients', type: 'toggle', defaultValue: true },
    { id: 'trackInteractions', label: 'Track Interactions', description: 'Log invoice activities in CRM', type: 'toggle', defaultValue: true },
    { id: 'followUpReminders', label: 'Follow-up Reminders', description: 'Auto-create tasks for overdue invoices', type: 'toggle', defaultValue: false },
  ],
  expenses: [
    { id: 'linkToInvoices', label: 'Link to Invoices', description: 'Associate expenses with invoices', type: 'toggle', defaultValue: true },
    { id: 'autoCategorize', label: 'Auto-categorize', description: 'Automatically categorize expenses', type: 'toggle', defaultValue: true },
    { id: 'receiptScanning', label: 'Receipt Scanning', description: 'Scan and attach receipts to expenses', type: 'toggle', defaultValue: true },
  ],
  invoicing: [
    { id: 'autoReminders', label: 'Auto Reminders', description: 'Send automatic payment reminders', type: 'toggle', defaultValue: true },
    { id: 'multiCurrency', label: 'Multi-currency', description: 'Support multiple currencies', type: 'toggle', defaultValue: false },
    { id: 'clientPortal', label: 'Client Portal', description: 'Allow clients to view invoices online', type: 'toggle', defaultValue: false },
  ],
};

interface LinkedApp {
  app_id: string;
  app_name: string;
  status: string;
  is_trial?: boolean;
  trial_days_remaining?: number;
}

interface CurrentPlan {
  linked_apps?: LinkedApp[];
}

interface LinkedAppsManagerProps {
  productId: string;
  currentPlan?: CurrentPlan | null;
  onRefresh?: () => void;
}

export default function LinkedAppsManager({ 
  productId, 
  currentPlan,
  onRefresh 
}: LinkedAppsManagerProps) {
  const [linkingApp, setLinkingApp] = useState(false);
  const [appSettings, setAppSettings] = useState<Record<string, Record<string, boolean | string>>>({});
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingSyncStatus, setLoadingSyncStatus] = useState(false);
  
  // Fetch sync status on mount
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setLoadingSyncStatus(true);
      const response = await subscriptionApi.getSyncStatus();
      setSyncStatus(response.data);
    } catch (error) {
      console.log('Error fetching sync status:', error);
    } finally {
      setLoadingSyncStatus(false);
    }
  };

  const handleSyncNow = async (syncType: 'customers' | 'products' | 'all') => {
    try {
      setSyncing(true);
      let message = '';
      
      if (syncType === 'customers' || syncType === 'all') {
        const custResponse = await subscriptionApi.syncCustomersToClients();
        message += custResponse.data.message + '\n';
      }
      
      if (syncType === 'products' || syncType === 'all') {
        const prodResponse = await subscriptionApi.syncInventoryToProducts();
        message += prodResponse.data.message;
      }
      
      Alert.alert('Sync Complete', message.trim());
      fetchSyncStatus();
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Sync Error', error.response?.data?.detail || 'Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };
  
  // Get linkable apps for this product
  const linkableAppIds = APP_RELATIONSHIPS[productId] || [];
  
  // Check if an app is linked
  const isAppLinked = (appId: string): boolean => {
    if (!currentPlan?.linked_apps || !Array.isArray(currentPlan.linked_apps)) {
      return false;
    }
    return currentPlan.linked_apps.some((app: LinkedApp) => {
      const isTargetApp = app.app_id === appId || app.app_name?.toLowerCase() === appId;
      const isValidStatus = app.status === 'active' || app.status === 'trial' || app.status === 'grace_period';
      return isTargetApp && isValidStatus;
    });
  };

  // Get linked app info
  const getLinkedAppInfo = (appId: string): LinkedApp | undefined => {
    if (!currentPlan?.linked_apps) return undefined;
    return currentPlan.linked_apps.find((app: LinkedApp) => 
      app.app_id === appId || app.app_name?.toLowerCase() === appId
    );
  };

  // Handle linking an app (start trial)
  const handleLinkApp = async (appId: string, appName: string) => {
    try {
      setLinkingApp(true);
      await subscriptionApi.linkApp(appId, 'starter', true);
      Alert.alert('Trial Started!', `Your 7-day free trial of ${appName} has started!`);
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start trial. Please try again.');
    } finally {
      setLinkingApp(false);
    }
  };

  // Update setting value
  const updateSetting = (appId: string, settingId: string, value: boolean | string) => {
    setAppSettings(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        [settingId]: value,
      },
    }));
  };

  // Get setting value
  const getSettingValue = (appId: string, settingId: string, defaultValue: boolean | string): boolean | string => {
    return appSettings[appId]?.[settingId] ?? defaultValue;
  };

  // Render settings for a linked app
  const renderAppSettings = (appId: string) => {
    const settings = APP_SETTINGS_CONFIG[appId] || [];
    if (settings.length === 0) return null;

    return (
      <View style={styles.appSettingsContainer}>
        {settings.map((setting) => (
          <View key={setting.id}>
            {setting.type === 'toggle' ? (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  <Text style={styles.settingDescription}>{setting.description}</Text>
                </View>
                <Switch
                  value={getSettingValue(appId, setting.id, setting.defaultValue || false) as boolean}
                  onValueChange={(value) => updateSetting(appId, setting.id, value)}
                  trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                  thumbColor={getSettingValue(appId, setting.id, setting.defaultValue || false) ? '#2563EB' : '#9CA3AF'}
                />
              </View>
            ) : (
              <Input
                label={setting.label}
                placeholder={setting.description}
                value={getSettingValue(appId, setting.id, setting.defaultValue || '') as string}
                onChangeText={(value) => updateSetting(appId, setting.id, value)}
                keyboardType="number-pad"
                leftIcon={<Ionicons name="options-outline" size={20} color="#6B7280" />}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Connected Apps</Text>
        <Text style={styles.headerSubtitle}>
          Extend your capabilities with powerful add-ons
        </Text>
      </View>

      {/* Sync Status Section - Only show for RetailPro */}
      {productId === 'retailpro' && (
        <View style={styles.syncStatusSection}>
          <View style={styles.syncStatusHeader}>
            <View style={styles.syncStatusTitleRow}>
              <Ionicons name="sync-outline" size={24} color="#2563EB" />
              <Text style={styles.syncStatusTitle}>Data Sync Status</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncNowButton, syncing && styles.syncNowButtonDisabled]}
              onPress={() => handleSyncNow('all')}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.syncNowButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {loadingSyncStatus ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : syncStatus ? (
            <View style={styles.syncStatusGrid}>
              <View style={styles.syncStatusCard}>
                <View style={styles.syncStatusCardHeader}>
                  <Ionicons name="people-outline" size={20} color="#10B981" />
                  <Text style={styles.syncStatusCardTitle}>Customers → Clients</Text>
                </View>
                <View style={styles.syncStatusCardContent}>
                  <View style={styles.syncStatusRow}>
                    <Text style={styles.syncStatusLabel}>Business Customers</Text>
                    <Text style={styles.syncStatusValue}>{syncStatus.customers?.business_customers || 0}</Text>
                  </View>
                  <View style={styles.syncStatusRow}>
                    <Text style={styles.syncStatusLabel}>Synced to Invoicing</Text>
                    <Text style={styles.syncStatusValue}>{syncStatus.customers?.synced_to_clients || 0}</Text>
                  </View>
                  {(syncStatus.customers?.pending_sync || 0) > 0 && (
                    <View style={styles.syncPendingBadge}>
                      <Text style={styles.syncPendingText}>{syncStatus.customers?.pending_sync} pending</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.syncStatusCard}>
                <View style={styles.syncStatusCardHeader}>
                  <Ionicons name="cube-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.syncStatusCardTitle}>Inventory → Products</Text>
                </View>
                <View style={styles.syncStatusCardContent}>
                  <View style={styles.syncStatusRow}>
                    <Text style={styles.syncStatusLabel}>Inventory Items</Text>
                    <Text style={styles.syncStatusValue}>{syncStatus.products?.inventory_items || 0}</Text>
                  </View>
                  <View style={styles.syncStatusRow}>
                    <Text style={styles.syncStatusLabel}>Synced to Invoicing</Text>
                    <Text style={styles.syncStatusValue}>{syncStatus.products?.synced_to_invoicing || 0}</Text>
                  </View>
                  {(syncStatus.products?.pending_sync || 0) > 0 && (
                    <View style={styles.syncPendingBadge}>
                      <Text style={styles.syncPendingText}>{syncStatus.products?.pending_sync} pending</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.syncStatusEmpty}>Link apps to see sync status</Text>
          )}
        </View>
      )}

      <View style={styles.appsGrid}>
        {linkableAppIds.map((appId) => {
          const appMeta = APP_METADATA[appId];
          if (!appMeta) return null;
          
          const linked = isAppLinked(appId);
          const linkedInfo = getLinkedAppInfo(appId);
          
          return (
            <View key={appId} style={styles.appCard}>
              <View style={styles.appCardHeader}>
                <View style={[styles.appIconContainer, { backgroundColor: appMeta.color + '20' }]}>
                  <Ionicons name={appMeta.icon as any} size={28} color={appMeta.color} />
                </View>
                <View style={styles.appCardInfo}>
                  <View style={styles.appCardTitleRow}>
                    <Text style={styles.appCardTitle}>{appMeta.name}</Text>
                    {linked ? (
                      <View style={[styles.appStatusBadge, styles.appStatusLinked]}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.appStatusLinkedText}>
                          {linkedInfo?.status === 'trial' ? 'Trial' : 'Active'}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.appStatusBadge, styles.appStatusUnlinked]}>
                        <Ionicons name="add-circle-outline" size={14} color="#6B7280" />
                        <Text style={styles.appStatusUnlinkedText}>Not Linked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.appCardDescription}>{appMeta.description}</Text>
                </View>
              </View>

              {linked ? (
                <View>
                  {linkedInfo?.status === 'trial' && linkedInfo.trial_days_remaining !== undefined && (
                    <View style={styles.trialInfoBanner}>
                      <Ionicons name="time-outline" size={16} color="#F59E0B" />
                      <Text style={styles.trialInfoText}>
                        Trial: {linkedInfo.trial_days_remaining} days remaining
                      </Text>
                    </View>
                  )}
                  {renderAppSettings(appId)}
                </View>
              ) : (
                <View style={styles.appPromotionContainer}>
                  <View style={styles.appFeaturesList}>
                    {appMeta.features.map((feature, idx) => (
                      <View key={idx} style={styles.appFeatureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.appFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.appPricingRow}>
                    <View>
                      <Text style={styles.appPricingLabel}>Start with 7-day free trial</Text>
                      <View style={styles.appPricingValues}>
                        <Text style={styles.appOriginalPriceText}>${appMeta.price}/mo</Text>
                        <Text style={styles.appDiscountedPriceText}>${appMeta.discountedPrice}/mo</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.startTrialButton, { backgroundColor: appMeta.color }]}
                      onPress={() => handleLinkApp(appId, appMeta.name)}
                      disabled={linkingApp}
                    >
                      {linkingApp ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={18} color="#FFFFFF" />
                          <Text style={styles.startTrialButtonText}>Start Trial</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  // Sync Status Styles
  syncStatusSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: isWeb ? 24 : 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syncStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  syncStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  syncNowButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  syncNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  syncStatusGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
  },
  syncStatusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  syncStatusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  syncStatusCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  syncStatusCardContent: {
    gap: 8,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatusLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  syncStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  syncPendingBadge: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  syncPendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  syncStatusEmpty: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  appsGrid: {
    gap: 20,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 24 : 20,
    marginBottom: isWeb ? 20 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appCardHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  appIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appCardInfo: {
    flex: 1,
  },
  appCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  appCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  appCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  appStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appStatusLinked: {
    backgroundColor: '#ECFDF5',
  },
  appStatusLinkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  appStatusUnlinked: {
    backgroundColor: '#F3F4F6',
  },
  appStatusUnlinkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  appSettingsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  trialInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  trialInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  appPromotionContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  appFeaturesList: {
    gap: 10,
    marginBottom: 20,
  },
  appFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appFeatureText: {
    fontSize: 14,
    color: '#374151',
  },
  appPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  appPricingLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  appPricingValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  appOriginalPriceText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  appDiscountedPriceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  startTrialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startTrialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
