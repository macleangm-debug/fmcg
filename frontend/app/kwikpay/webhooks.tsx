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
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
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

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  last_triggered: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
}

interface AvailableEvent {
  id: string;
  name: string;
  description: string;
}

export default function WebhooksPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/webhooks');
      setWebhooks(response.data?.webhooks || []);
      setAvailableEvents(response.data?.available_events || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setWebhooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreateWebhook = async () => {
    if (!webhookUrl) {
      Alert.alert('Error', 'Please enter a webhook URL');
      return;
    }

    if (selectedEvents.length === 0) {
      Alert.alert('Error', 'Please select at least one event');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/webhooks', {
        url: webhookUrl,
        events: selectedEvents,
        is_active: isActive,
      });
      Alert.alert('Success', 'Webhook created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;

    setCreating(true);
    try {
      await api.put(`/kwikpay/webhooks/${selectedWebhook.id}`, {
        url: webhookUrl,
        events: selectedEvents,
        is_active: isActive,
      });
      Alert.alert('Success', 'Webhook updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    Alert.alert(
      'Delete Webhook',
      'Are you sure you want to delete this webhook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/kwikpay/webhooks/${webhookId}`);
              fetchWebhooks();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete webhook');
            }
          },
        },
      ]
    );
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTesting(webhookId);
    try {
      const response = await api.post(`/kwikpay/webhooks/${webhookId}/test`);
      Alert.alert('Test Sent', response.data.message || 'Test webhook sent successfully');
      fetchWebhooks();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send test webhook');
    } finally {
      setTesting(null);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await api.put(`/kwikpay/webhooks/${webhook.id}`, {
        is_active: !webhook.is_active,
      });
      fetchWebhooks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update webhook');
    }
  };

  const openEditModal = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setWebhookUrl(webhook.url);
    setSelectedEvents(webhook.events);
    setIsActive(webhook.is_active);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setWebhookUrl('');
    setSelectedEvents([]);
    setIsActive(true);
    setSelectedWebhook(null);
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading webhooks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWebhooks();
            }}
          />
        }
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Webhooks</Text>
            <Text style={styles.pageSubtitle}>Receive real-time event notifications</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            data-testid="add-webhook-btn"
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Add Webhook</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Webhooks</Text>
            <Text style={styles.infoText}>
              Webhooks allow you to receive real-time notifications when events happen in your KwikPay account.
              Configure an endpoint URL to receive POST requests with event data.
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="link" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{webhooks.length}</Text>
            <Text style={styles.statLabel}>Configured</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{webhooks.filter((w) => w.is_active).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="flash" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>
              {webhooks.reduce((a, w) => a + w.success_count, 0)}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
        </View>

        {/* Webhooks List */}
        <Text style={styles.sectionTitle}>Your Webhooks</Text>
        {webhooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-network-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Webhooks</Text>
            <Text style={styles.emptyText}>
              Add a webhook endpoint to receive event notifications
            </Text>
          </View>
        ) : (
          webhooks.map((webhook) => (
            <View key={webhook.id} style={styles.webhookCard} data-testid={`webhook-card-${webhook.id}`}>
              <View style={styles.webhookHeader}>
                <View style={styles.webhookInfo}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: webhook.is_active ? COLORS.primary : COLORS.gray },
                    ]}
                  />
                  <Text style={styles.webhookUrl} numberOfLines={1}>
                    {webhook.url}
                  </Text>
                </View>
                <Switch
                  value={webhook.is_active}
                  onValueChange={() => handleToggleActive(webhook)}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={webhook.is_active ? COLORS.primary : COLORS.gray}
                />
              </View>

              {/* Events */}
              <View style={styles.eventsContainer}>
                <Text style={styles.eventsLabel}>Events:</Text>
                <View style={styles.eventTags}>
                  {webhook.events.slice(0, 3).map((event) => (
                    <View key={event} style={styles.eventTag}>
                      <Text style={styles.eventTagText}>{event}</Text>
                    </View>
                  ))}
                  {webhook.events.length > 3 && (
                    <View style={[styles.eventTag, { backgroundColor: COLORS.gray }]}>
                      <Text style={styles.eventTagText}>+{webhook.events.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View style={styles.webhookStats}>
                <View style={styles.webhookStat}>
                  <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                  <Text style={styles.webhookStatText}>{webhook.success_count} delivered</Text>
                </View>
                <View style={styles.webhookStat}>
                  <Ionicons name="close" size={14} color={COLORS.danger} />
                  <Text style={styles.webhookStatText}>{webhook.failure_count} failed</Text>
                </View>
                {webhook.last_triggered && (
                  <View style={styles.webhookStat}>
                    <Ionicons name="time" size={14} color={COLORS.gray} />
                    <Text style={styles.webhookStatText}>
                      {new Date(webhook.last_triggered).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.webhookActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleTestWebhook(webhook.id)}
                  disabled={testing === webhook.id}
                  data-testid={`test-webhook-${webhook.id}`}
                >
                  {testing === webhook.id ? (
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color={COLORS.secondary} />
                      <Text style={[styles.actionBtnText, { color: COLORS.secondary }]}>Test</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openEditModal(webhook)}
                  data-testid={`edit-webhook-${webhook.id}`}
                >
                  <Ionicons name="create" size={16} color={COLORS.gray} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDeleteWebhook(webhook.id)}
                  data-testid={`delete-webhook-${webhook.id}`}
                >
                  <Ionicons name="trash" size={16} color={COLORS.danger} />
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Available Events Reference */}
        <Text style={styles.sectionTitle}>Available Events</Text>
        <View style={styles.eventsCard}>
          {availableEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.eventRowInfo}>
                <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                <View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDesc}>{event.description}</Text>
                </View>
              </View>
              <Text style={styles.eventCode}>{event.id}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal || showEditModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showEditModal ? 'Edit Webhook' : 'Add Webhook'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Endpoint URL *</Text>
              <TextInput
                style={styles.input}
                value={webhookUrl}
                onChangeText={setWebhookUrl}
                placeholder="https://your-server.com/webhooks/kwikpay"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="none"
                keyboardType="url"
                data-testid="webhook-url-input"
              />

              <Text style={styles.inputLabel}>Events to Subscribe *</Text>
              <View style={styles.eventsSelector}>
                {availableEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventOption,
                      selectedEvents.includes(event.id) && styles.eventOptionSelected,
                    ]}
                    onPress={() => toggleEvent(event.id)}
                    data-testid={`event-${event.id}`}
                  >
                    <View style={styles.eventOptionContent}>
                      <Ionicons
                        name={
                          selectedEvents.includes(event.id)
                            ? 'checkbox'
                            : 'square-outline'
                        }
                        size={20}
                        color={
                          selectedEvents.includes(event.id) ? COLORS.primary : COLORS.gray
                        }
                      />
                      <View style={styles.eventOptionText}>
                        <Text
                          style={[
                            styles.eventOptionName,
                            selectedEvents.includes(event.id) && styles.eventOptionNameSelected,
                          ]}
                        >
                          {event.name}
                        </Text>
                        <Text style={styles.eventOptionId}>{event.id}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Text style={styles.toggleDesc}>Receive webhook notifications</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={isActive ? COLORS.primary : COLORS.gray}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={showEditModal ? handleUpdateWebhook : handleCreateWebhook}
                disabled={creating}
                data-testid="submit-webhook-btn"
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {showEditModal ? 'Update Webhook' : 'Create Webhook'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.secondary, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  webhookCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  webhookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  webhookInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  webhookUrl: { fontSize: 14, fontWeight: '500', color: COLORS.dark, flex: 1 },
  eventsContainer: { marginBottom: 12 },
  eventsLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  eventTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eventTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTagText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  webhookStats: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  webhookStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  webhookStatText: { fontSize: 12, color: COLORS.gray },
  webhookActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.gray },
  eventsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventRowInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  eventName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  eventDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  eventCode: { fontSize: 11, fontFamily: 'monospace', color: COLORS.primary },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    color: COLORS.dark,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventsSelector: { marginBottom: 16 },
  eventOption: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  eventOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventOptionText: { flex: 1 },
  eventOptionName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  eventOptionNameSelected: { color: COLORS.primaryDark },
  eventOptionId: { fontSize: 11, color: COLORS.gray, marginTop: 2, fontFamily: 'monospace' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  toggleDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
