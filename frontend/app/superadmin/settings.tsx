import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import Toast from '../../src/components/Toast';

const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Settings {
  platform: {
    platform_name: string;
    support_email: string;
    timezone: string;
    currency: string;
    date_format: string;
    maintenance_mode: boolean;
  };
  security: {
    session_timeout: number;
    max_login_attempts: number;
    password_expiry_days: number;
    require_2fa: boolean;
    ip_whitelist: string[];
  };
  notifications: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    notify_new_merchant: boolean;
    notify_large_transaction: boolean;
    large_transaction_threshold: number;
    notify_system_alerts: boolean;
  };
  api: {
    rate_limit_per_minute: number;
    rate_limit_per_hour: number;
    webhook_retry_count: number;
    api_key_expiry_days: number;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('platform');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category: string) => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await api.put(`/superadmin/settings/${category}`, settings[category as keyof Settings]);
      setUnsavedChanges(false);
      showToast(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`, 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof Settings, key: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
    setUnsavedChanges(true);
  };

  const tabs = [
    { id: 'platform', label: 'Platform', icon: 'settings-outline' },
    { id: 'security', label: 'Security', icon: 'shield-outline' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
    { id: 'api', label: 'API Settings', icon: 'code-slash-outline' },
  ];

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </View>
    );
  }

  const renderPlatformSettings = () => (
    <View style={styles.settingsSection}>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Platform Name</Text>
        <TextInput
          style={styles.textInput}
          value={settings.platform.platform_name}
          onChangeText={(text) => updateSetting('platform', 'platform_name', text)}
          placeholder="Enter platform name"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Support Email</Text>
        <TextInput
          style={styles.textInput}
          value={settings.platform.support_email}
          onChangeText={(text) => updateSetting('platform', 'support_email', text)}
          placeholder="support@example.com"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Timezone</Text>
        <TextInput
          style={styles.textInput}
          value={settings.platform.timezone}
          onChangeText={(text) => updateSetting('platform', 'timezone', text)}
          placeholder="Africa/Dar_es_Salaam"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Default Currency</Text>
        <TextInput
          style={styles.textInput}
          value={settings.platform.currency}
          onChangeText={(text) => updateSetting('platform', 'currency', text)}
          placeholder="TZS"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Date Format</Text>
        <TextInput
          style={styles.textInput}
          value={settings.platform.date_format}
          onChangeText={(text) => updateSetting('platform', 'date_format', text)}
          placeholder="DD/MM/YYYY"
        />
      </View>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>Maintenance Mode</Text>
          <Text style={styles.settingDescription}>
            Enable to show maintenance page to all users
          </Text>
        </View>
        <Switch
          value={settings.platform.maintenance_mode}
          onValueChange={(value) => updateSetting('platform', 'maintenance_mode', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => saveSettings('platform')}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Save Platform Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSecuritySettings = () => (
    <View style={styles.settingsSection}>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Session Timeout (minutes)</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.security.session_timeout)}
          onChangeText={(text) => updateSetting('security', 'session_timeout', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Max Login Attempts</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.security.max_login_attempts)}
          onChangeText={(text) => updateSetting('security', 'max_login_attempts', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Password Expiry (days)</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.security.password_expiry_days)}
          onChangeText={(text) => updateSetting('security', 'password_expiry_days', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>Require 2FA</Text>
          <Text style={styles.settingDescription}>
            Require two-factor authentication for all superadmins
          </Text>
        </View>
        <Switch
          value={settings.security.require_2fa}
          onValueChange={(value) => updateSetting('security', 'require_2fa', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          IP whitelist can be configured via API or by contacting system administrator
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => saveSettings('security')}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Save Security Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderNotificationSettings = () => (
    <View style={styles.settingsSection}>
      <Text style={styles.subSectionTitle}>Notification Channels</Text>
      
      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>Email Notifications</Text>
          <Text style={styles.settingDescription}>Receive alerts via email</Text>
        </View>
        <Switch
          value={settings.notifications.email_notifications}
          onValueChange={(value) => updateSetting('notifications', 'email_notifications', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>SMS Notifications</Text>
          <Text style={styles.settingDescription}>Receive alerts via SMS</Text>
        </View>
        <Switch
          value={settings.notifications.sms_notifications}
          onValueChange={(value) => updateSetting('notifications', 'sms_notifications', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Text style={styles.settingDescription}>Receive in-app push alerts</Text>
        </View>
        <Switch
          value={settings.notifications.push_notifications}
          onValueChange={(value) => updateSetting('notifications', 'push_notifications', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <Text style={[styles.subSectionTitle, { marginTop: 24 }]}>Alert Types</Text>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>New Merchant Applications</Text>
          <Text style={styles.settingDescription}>Alert when new merchants apply</Text>
        </View>
        <Switch
          value={settings.notifications.notify_new_merchant}
          onValueChange={(value) => updateSetting('notifications', 'notify_new_merchant', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>Large Transactions</Text>
          <Text style={styles.settingDescription}>Alert for high-value transactions</Text>
        </View>
        <Switch
          value={settings.notifications.notify_large_transaction}
          onValueChange={(value) => updateSetting('notifications', 'notify_large_transaction', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      {settings.notifications.notify_large_transaction && (
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Transaction Threshold ($)</Text>
          <TextInput
            style={styles.textInput}
            value={String(settings.notifications.large_transaction_threshold)}
            onChangeText={(text) => updateSetting('notifications', 'large_transaction_threshold', parseFloat(text) || 0)}
            keyboardType="numeric"
          />
        </View>
      )}

      <View style={styles.toggleItem}>
        <View style={styles.toggleInfo}>
          <Text style={styles.settingLabel}>System Alerts</Text>
          <Text style={styles.settingDescription}>Critical system notifications</Text>
        </View>
        <Switch
          value={settings.notifications.notify_system_alerts}
          onValueChange={(value) => updateSetting('notifications', 'notify_system_alerts', value)}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => saveSettings('notifications')}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Save Notification Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAPISettings = () => (
    <View style={styles.settingsSection}>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Rate Limit (per minute)</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.api.rate_limit_per_minute)}
          onChangeText={(text) => updateSetting('api', 'rate_limit_per_minute', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Rate Limit (per hour)</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.api.rate_limit_per_hour)}
          onChangeText={(text) => updateSetting('api', 'rate_limit_per_hour', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Webhook Retry Count</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.api.webhook_retry_count)}
          onChangeText={(text) => updateSetting('api', 'webhook_retry_count', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>API Key Expiry (days)</Text>
        <TextInput
          style={styles.textInput}
          value={String(settings.api.api_key_expiry_days)}
          onChangeText={(text) => updateSetting('api', 'api_key_expiry_days', parseInt(text) || 0)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="key" size={20} color={COLORS.purple} />
        <Text style={styles.infoText}>
          Manage API keys and developer access in the Developer Portal section
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => saveSettings('api')}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Save API Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.pageTitle}>Settings</Text>
              <Text style={styles.pageSubtitle}>Platform Configuration</Text>
            </View>
          </View>
          {unsavedChanges && (
            <View style={styles.unsavedBadge}>
              <Text style={styles.unsavedText}>Unsaved changes</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.id ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'platform' && renderPlatformSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'api' && renderAPISettings()}
        </View>
      </ScrollView>
      
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  unsavedBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unsavedText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.warning,
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  settingsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 14,
    marginVertical: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
