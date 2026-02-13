import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import ConfirmationModal from '../../src/components/ConfirmationModal';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  dark: '#111827',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface ReminderSettings {
  auto_send_reminders: boolean;
  reminder_days_before: number;
  reminder_days_after: number[];
  reminder_email_subject: string;
  reminder_email_template: string;
}

interface UpcomingReminder {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  due_date: string;
  days_until_due: number;
  balance_due: number;
  reminder_type: 'before_due' | 'overdue';
}

interface SentReminder {
  id: string;
  invoice_number: string;
  customer_name: string;
  sent_at: string;
  reminder_type: string;
  status: 'sent' | 'failed';
}

export default function RemindersPage() {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'sent' | 'settings'>('upcoming');
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);

  const [settings, setSettings] = useState<ReminderSettings>({
    auto_send_reminders: false,
    reminder_days_before: 3,
    reminder_days_after: [1, 7, 14],
    reminder_email_subject: 'Reminder: Invoice {invoice_number} is due',
    reminder_email_template: 'Dear {customer_name},\n\nThis is a friendly reminder that invoice {invoice_number} for ${amount} is due on {due_date}.\n\nPlease let us know if you have any questions.\n\nBest regards,\n{business_name}',
  });

  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([]);
  const [sentReminders, setSentReminders] = useState<SentReminder[]>([]);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {}, type: 'success' as 'danger' | 'warning' | 'info' | 'success' });

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, upcomingRes, sentRes] = await Promise.all([
        api.get('/invoices/reminder-settings'),
        api.get('/invoices/reminders/upcoming'),
        api.get('/invoices/reminders/sent'),
      ]);
      if (settingsRes.data) setSettings(settingsRes.data);
      setUpcomingReminders(upcomingRes.data || []);
      setSentReminders(sentRes.data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const saveSettings = async () => {
    try {
      await api.put('/invoices/reminder-settings', settings);
      setConfirmModal({
        visible: true,
        title: 'Settings Saved',
        message: 'Your reminder settings have been updated.',
        type: 'success',
        onConfirm: () => setConfirmModal({ ...confirmModal, visible: false }),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const sendReminderNow = (reminder: UpcomingReminder) => {
    setConfirmModal({
      visible: true,
      title: 'Send Reminder',
      message: `Send a payment reminder to ${reminder.customer_name} for invoice ${reminder.invoice_number}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await api.post(`/invoices/${reminder.invoice_id}/send-reminder`);
          fetchData();
          setConfirmModal({
            visible: true,
            title: 'Reminder Sent',
            message: `Payment reminder has been sent to ${reminder.customer_email}`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false }),
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to send reminder');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      },
    });
  };

  const sendBulkReminders = () => {
    if (selectedReminders.length === 0) return;
    setConfirmModal({
      visible: true,
      title: 'Send Bulk Reminders',
      message: `Send reminders for ${selectedReminders.length} selected invoice(s)?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await Promise.all(selectedReminders.map(id => api.post(`/invoices/${id}/send-reminder`)));
          setSelectedReminders([]);
          fetchData();
          setConfirmModal({
            visible: true,
            title: 'Reminders Sent',
            message: `${selectedReminders.length} reminders have been sent successfully.`,
            type: 'success',
            onConfirm: () => setConfirmModal({ ...confirmModal, visible: false }),
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to send some reminders');
          setConfirmModal({ ...confirmModal, visible: false });
        }
      },
    });
  };

  const toggleSelectReminder = (id: string) => {
    setSelectedReminders(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const selectAllReminders = () => {
    if (selectedReminders.length === upcomingReminders.length) {
      setSelectedReminders([]);
    } else {
      setSelectedReminders(upcomingReminders.map(r => r.invoice_id));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    return `In ${days}d`;
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return { bg: COLORS.dangerLight, text: COLORS.danger };
    if (days <= 3) return { bg: COLORS.warningLight, text: COLORS.warning };
    return { bg: COLORS.primaryLight, text: COLORS.primary };
  };

  const renderUpcomingTab = () => (
    <View style={styles.tabContent}>
      {upcomingReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>No invoices need reminders right now</Text>
        </View>
      ) : (
        <>
          {/* Bulk Actions Bar */}
          <View style={styles.bulkActionsBar}>
            <TouchableOpacity style={styles.selectAllBtn} onPress={selectAllReminders}>
              <View style={[styles.checkbox, selectedReminders.length === upcomingReminders.length && styles.checkboxChecked]}>
                {selectedReminders.length === upcomingReminders.length && (
                  <Ionicons name="checkmark" size={12} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.selectAllText}>
                {selectedReminders.length === upcomingReminders.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            {selectedReminders.length > 0 && (
              <TouchableOpacity style={styles.bulkSendBtn} onPress={sendBulkReminders}>
                <Ionicons name="send" size={14} color={COLORS.white} />
                <Text style={styles.bulkSendText}>Send ({selectedReminders.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableCell, { width: 36 }]} />
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Invoice</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Client</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Due Date</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>Status</Text>
            <View style={[styles.tableCell, { width: 70 }]} />
          </View>

          {/* Table Rows */}
          {upcomingReminders.map((reminder) => {
            const statusColor = getStatusColor(reminder.days_until_due);
            const isSelected = selectedReminders.includes(reminder.invoice_id);
            
            return (
              <View key={reminder.invoice_id} style={[styles.tableRow, isSelected && styles.tableRowSelected]}>
                <TouchableOpacity 
                  style={[styles.tableCell, { width: 36 }]} 
                  onPress={() => toggleSelectReminder(reminder.invoice_id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                </TouchableOpacity>
                
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <Text style={styles.invoiceNumber}>{reminder.invoice_number}</Text>
                </View>
                
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.clientName} numberOfLines={1}>{reminder.customer_name}</Text>
                  <Text style={styles.clientEmail} numberOfLines={1}>{reminder.customer_email}</Text>
                </View>
                
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={styles.dateText}>{formatDate(reminder.due_date)}</Text>
                </View>
                
                <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                  <Text style={styles.amountText}>${reminder.balance_due.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                      {getDaysLabel(reminder.days_until_due)}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.tableCell, { width: 70, alignItems: 'flex-end' }]}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => sendReminderNow(reminder)}
                  >
                    <Ionicons name="send" size={14} color={COLORS.primary} />
                    <Text style={styles.actionBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );

  const renderSentTab = () => (
    <View style={styles.tabContent}>
      {sentReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: COLORS.lightGray }]}>
            <Ionicons name="mail-outline" size={48} color={COLORS.gray} />
          </View>
          <Text style={styles.emptyTitle}>No Reminders Sent</Text>
          <Text style={styles.emptySubtitle}>Sent reminders will appear here</Text>
        </View>
      ) : (
        <>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Invoice</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Client</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Sent At</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Status</Text>
          </View>

          {/* Table Rows */}
          {sentReminders.map((reminder, index) => (
            <View key={reminder.id || index} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text style={styles.invoiceNumber}>{reminder.invoice_number}</Text>
              </View>
              
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text style={styles.clientName} numberOfLines={1}>{reminder.customer_name}</Text>
              </View>
              
              <View style={[styles.tableCell, { flex: 1.2 }]}>
                <Text style={styles.dateText}>{formatDate(reminder.sent_at)}</Text>
              </View>
              
              <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: reminder.status === 'sent' ? COLORS.successLight : COLORS.dangerLight }
                ]}>
                  <Ionicons 
                    name={reminder.status === 'sent' ? 'checkmark-circle' : 'close-circle'} 
                    size={12} 
                    color={reminder.status === 'sent' ? COLORS.success : COLORS.danger} 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[
                    styles.statusText, 
                    { color: reminder.status === 'sent' ? COLORS.success : COLORS.danger }
                  ]}>
                    {reminder.status === 'sent' ? 'Delivered' : 'Failed'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.settingsGrid}>
        {/* Left Column - Schedule Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.settingsCardTitle}>Schedule Settings</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto Send Reminders</Text>
                <Text style={styles.settingHint}>Automatically send based on schedule</Text>
              </View>
              <Switch
                value={settings.auto_send_reminders}
                onValueChange={(value) => setSettings({ ...settings, auto_send_reminders: value })}
                trackColor={{ false: COLORS.lightGray, true: COLORS.primaryLight }}
                thumbColor={settings.auto_send_reminders ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Days Before Due</Text>
            <Text style={styles.settingHint}>Remind clients before invoice is due</Text>
            <View style={styles.numberInputRow}>
              <TouchableOpacity
                style={styles.numberBtn}
                onPress={() => setSettings({ ...settings, reminder_days_before: Math.max(1, settings.reminder_days_before - 1) })}
              >
                <Ionicons name="remove" size={16} color={COLORS.dark} />
              </TouchableOpacity>
              <Text style={styles.numberValue}>{settings.reminder_days_before}</Text>
              <TouchableOpacity
                style={styles.numberBtn}
                onPress={() => setSettings({ ...settings, reminder_days_before: settings.reminder_days_before + 1 })}
              >
                <Ionicons name="add" size={16} color={COLORS.dark} />
              </TouchableOpacity>
              <Text style={styles.numberSuffix}>days</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Overdue Follow-ups</Text>
            <Text style={styles.settingHint}>Days after due date to send reminders</Text>
            <View style={styles.chipContainer}>
              {[1, 3, 7, 14, 30].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.chip, settings.reminder_days_after.includes(day) && styles.chipActive]}
                  onPress={() => {
                    const newDays = settings.reminder_days_after.includes(day)
                      ? settings.reminder_days_after.filter(d => d !== day)
                      : [...settings.reminder_days_after, day].sort((a, b) => a - b);
                    setSettings({ ...settings, reminder_days_after: newDays });
                  }}
                >
                  <Text style={[styles.chipText, settings.reminder_days_after.includes(day) && styles.chipTextActive]}>
                    +{day}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Right Column - Email Template */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <Text style={styles.settingsCardTitle}>Email Template</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Subject Line</Text>
            <TextInput
              style={styles.formInput}
              value={settings.reminder_email_subject}
              onChangeText={(text) => setSettings({ ...settings, reminder_email_subject: text })}
              placeholder="Email subject"
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email Body</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={settings.reminder_email_template}
              onChangeText={(text) => setSettings({ ...settings, reminder_email_template: text })}
              placeholder="Email body"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.variablesBox}>
            <Text style={styles.variablesTitle}>Available Variables:</Text>
            <View style={styles.variablesList}>
              {['{invoice_number}', '{customer_name}', '{amount}', '{due_date}', '{business_name}'].map((v, i) => (
                <View key={i} style={styles.variableChip}>
                  <Text style={styles.variableText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
        <Ionicons name="checkmark" size={18} color={COLORS.white} />
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      {isWebDesktop && (
        <View style={styles.webHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.webTitle}>Payment Reminders</Text>
            <Text style={styles.webSubtitle}>Automate follow-ups for unpaid invoices</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time" size={18} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.statValue}>{upcomingReminders.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              </View>
              <View>
                <Text style={styles.statValue}>{upcomingReminders.filter(r => r.days_until_due < 0).length}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.statValue}>{sentReminders.length}</Text>
                <Text style={styles.statLabel}>Sent</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsInner}>
          {[
            { key: 'upcoming', label: 'Upcoming', icon: 'time-outline', count: upcomingReminders.length },
            { key: 'sent', label: 'History', icon: 'mail-outline', count: sentReminders.length },
            { key: 'settings', label: 'Settings', icon: 'settings-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? COLORS.primary : COLORS.gray} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {activeTab === 'upcoming' && renderUpcomingTab()}
        {activeTab === 'sent' && renderSentTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },

  // Header
  webHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: COLORS.white, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  headerLeft: {},
  webTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  webSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  headerStats: { flexDirection: 'row', gap: 12 },
  statCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: COLORS.lightGray, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray },

  // Tabs
  tabsContainer: { 
    backgroundColor: COLORS.white, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  tabsInner: { flexDirection: 'row', gap: 4 },
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingVertical: 12, 
    paddingHorizontal: 14, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  tabBadge: { 
    backgroundColor: COLORS.lightGray, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 10, 
    minWidth: 20, 
    alignItems: 'center' 
  },
  tabBadgeActive: { backgroundColor: COLORS.primaryLight },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
  tabBadgeTextActive: { color: COLORS.primary },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  tabContent: { flex: 1 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: COLORS.successLight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  emptySubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  // Bulk Actions
  bulkActionsBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  checkbox: { 
    width: 18, 
    height: 18, 
    borderRadius: 4, 
    borderWidth: 2, 
    borderColor: COLORS.border, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bulkSendBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  bulkSendText: { fontSize: 12, fontWeight: '600', color: COLORS.white },

  // Table
  tableHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.lightGray, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginBottom: 4 
  },
  tableHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableRowSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  tableCell: { justifyContent: 'center' },
  invoiceNumber: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  clientName: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  clientEmail: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  dateText: { fontSize: 12, color: COLORS.gray },
  amountText: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: COLORS.primary 
  },
  actionBtnText: { fontSize: 12, fontWeight: '500', color: COLORS.primary },

  // Settings
  settingsGrid: { 
    flexDirection: 'row', 
    gap: 16, 
    alignItems: 'stretch',
  },
  settingsCard: { 
    flex: 1, 
    backgroundColor: COLORS.white, 
    borderRadius: 10, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  settingsCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 16, 
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  settingsCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  settingItem: { marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1, marginRight: 16 },
  settingLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  settingHint: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  numberInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  numberBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    backgroundColor: COLORS.lightGray, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  numberValue: { fontSize: 16, fontWeight: '600', color: COLORS.dark, minWidth: 40, textAlign: 'center' },
  numberSuffix: { fontSize: 13, color: COLORS.gray, marginLeft: 4 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: COLORS.lightGray 
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: COLORS.gray },
  chipTextActive: { color: COLORS.white },

  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: '600', color: COLORS.dark, marginBottom: 6 },
  formInput: { 
    backgroundColor: COLORS.lightGray, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    fontSize: 13, 
    color: COLORS.dark,
    outlineStyle: 'none',
  },
  formTextarea: { height: 120, textAlignVertical: 'top', paddingTop: 10 },
  variablesBox: { 
    backgroundColor: COLORS.primaryLight, 
    borderRadius: 8, 
    padding: 12 
  },
  variablesTitle: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginBottom: 8 },
  variablesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  variableChip: { 
    backgroundColor: COLORS.white, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4 
  },
  variableText: { fontSize: 11, fontWeight: '500', color: COLORS.primary, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },

  saveBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    backgroundColor: COLORS.primary, 
    paddingVertical: 10, 
    paddingHorizontal: 20,
    borderRadius: 8, 
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
});
