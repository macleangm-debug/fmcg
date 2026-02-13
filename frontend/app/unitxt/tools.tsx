import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#F59E0B',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Workflow {
  id: string;
  name: string;
  trigger: { type: string; conditions: any };
  actions: any[];
  is_active: boolean;
  executions_count: number;
  last_executed: string | null;
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
  rules: any[];
  match_type: string;
  contact_count: number;
  created_at: string;
}

interface ShortLink {
  id: string;
  original_url: string;
  short_url: string;
  short_code: string;
  clicks: number;
  unique_clicks: number;
  created_at: string;
}

interface OptOut {
  id: string;
  phone: string;
  reason: string;
  opted_out_at: string;
  channel: string;
}

type ActiveTab = 'personalization' | 'workflows' | 'segments' | 'links' | 'compliance';

export default function MessagingToolsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('personalization');
  
  // Personalization state
  const [personalizeInput, setPersonalizeInput] = useState('Hello {{name}}, thank you for your purchase on {{date}}!');
  const [personalizedResult, setPersonalizedResult] = useState<any>(null);
  const [personalizingLoading, setPersonalizingLoading] = useState(false);
  
  // Workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState('contact_added');
  
  // Segments state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [segmentField, setSegmentField] = useState('country');
  const [segmentOperator, setSegmentOperator] = useState('equals');
  const [segmentValue, setSegmentValue] = useState('');
  
  // Links state
  const [shortLinks, setShortLinks] = useState<ShortLink[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  // Compliance state
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [newOptOutPhone, setNewOptOutPhone] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch workflows
      const workflowsRes = await api.get('/unitxt/workflows', { headers });
      setWorkflows(workflowsRes.data?.workflows || []);

      // Fetch segments
      const segmentsRes = await api.get('/unitxt/segments', { headers });
      setSegments(segmentsRes.data?.segments || []);

      // Fetch links
      const linksRes = await api.get('/unitxt/links', { headers });
      setShortLinks(linksRes.data?.links || []);

      // Fetch opt-outs
      const optOutsRes = await api.get('/unitxt/compliance/opt-outs', { headers });
      setOptOuts(optOutsRes.data?.opt_outs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Personalization handlers
  const handlePersonalize = async () => {
    setPersonalizingLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/unitxt/personalize-message', {
        message: personalizeInput,
        variables: { name: 'John Doe', company: 'Acme Inc' }
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPersonalizedResult(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to personalize message');
    } finally {
      setPersonalizingLoading(false);
    }
  };

  // Workflow handlers
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      Alert.alert('Error', 'Please enter a workflow name');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/workflows', {
        name: newWorkflowName,
        trigger: { type: newWorkflowTrigger, conditions: {} },
        actions: [{ type: 'send_sms', config: { message: 'Welcome!' } }],
        is_active: true
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Workflow created successfully');
      setShowWorkflowModal(false);
      setNewWorkflowName('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create workflow');
    }
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post(`/unitxt/workflows/${workflowId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to toggle workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    Alert.alert('Delete Workflow', 'Are you sure you want to delete this workflow?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await api.delete(`/unitxt/workflows/${workflowId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete workflow');
          }
        }
      }
    ]);
  };

  // Segment handlers
  const handleCreateSegment = async () => {
    if (!newSegmentName.trim() || !segmentValue.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/segments', {
        name: newSegmentName,
        rules: [{ field: segmentField, operator: segmentOperator, value: segmentValue }],
        match_type: 'all'
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Segment created successfully');
      setShowSegmentModal(false);
      setNewSegmentName('');
      setSegmentValue('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create segment');
    }
  };

  // Link handlers
  const handleShortenLink = async () => {
    if (!newLinkUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/unitxt/shorten-link', {
        url: newLinkUrl
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', `Link shortened: ${response.data.short_url}`);
      setShowLinkModal(false);
      setNewLinkUrl('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to shorten link');
    }
  };

  // Opt-out handlers
  const handleAddOptOut = async () => {
    if (!newOptOutPhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/compliance/opt-out', {
        phone: newOptOutPhone,
        reason: 'Manual addition',
        channel: 'all'
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Phone number added to opt-out list');
      setShowOptOutModal(false);
      setNewOptOutPhone('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add opt-out');
    }
  };

  const tabs = [
    { key: 'personalization' as ActiveTab, icon: 'person-circle', label: 'Personalization' },
    { key: 'workflows' as ActiveTab, icon: 'git-branch', label: 'Workflows' },
    { key: 'segments' as ActiveTab, icon: 'filter', label: 'Segments' },
    { key: 'links' as ActiveTab, icon: 'link', label: 'Links' },
    { key: 'compliance' as ActiveTab, icon: 'shield-checkmark', label: 'Compliance' },
  ];

  const renderPersonalizationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.featureCard}>
        <View style={styles.featureHeader}>
          <View style={[styles.featureIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="person-circle" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.featureHeaderText}>
            <Text style={styles.featureTitle}>Message Personalization</Text>
            <Text style={styles.featureSubtitle}>Use dynamic variables in your messages</Text>
          </View>
        </View>

        <View style={styles.variablesGrid}>
          <Text style={styles.sectionLabel}>Available Variables:</Text>
          <View style={styles.variableChips}>
            {['{{name}}', '{{first_name}}', '{{date}}', '{{time}}', '{{business_name}}', '{{email}}'].map((v) => (
              <TouchableOpacity
                key={v}
                style={styles.variableChip}
                onPress={() => setPersonalizeInput(prev => prev + ' ' + v)}
              >
                <Text style={styles.variableChipText}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.inputLabel}>Your Message:</Text>
        <TextInput
          style={styles.textArea}
          value={personalizeInput}
          onChangeText={setPersonalizeInput}
          multiline
          numberOfLines={4}
          placeholder="Enter message with {{variables}}..."
          placeholderTextColor={COLORS.gray}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handlePersonalize}
          disabled={personalizingLoading}
        >
          {personalizingLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Preview Personalized</Text>
            </>
          )}
        </TouchableOpacity>

        {personalizedResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Preview Result:</Text>
            <Text style={styles.resultText}>{personalizedResult.personalized}</Text>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>
                {personalizedResult.character_count} characters
              </Text>
              <Text style={styles.resultMetaText}>
                Variables: {personalizedResult.variables_used?.join(', ')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderWorkflowsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Automated Workflows</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowWorkflowModal(true)}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>New Workflow</Text>
        </TouchableOpacity>
      </View>

      {workflows.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="git-branch-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No workflows yet</Text>
          <Text style={styles.emptyText}>Create automated message sequences</Text>
        </View>
      ) : (
        workflows.map((workflow) => (
          <View key={workflow.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemLeft}>
                <View style={[styles.statusDot, { backgroundColor: workflow.is_active ? COLORS.success : COLORS.gray }]} />
                <Text style={styles.itemTitle}>{workflow.name}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: workflow.is_active ? COLORS.dangerLight : COLORS.successLight }]}
                  onPress={() => handleToggleWorkflow(workflow.id)}
                >
                  <Ionicons
                    name={workflow.is_active ? 'pause' : 'play'}
                    size={16}
                    color={workflow.is_active ? COLORS.danger : COLORS.success}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: COLORS.dangerLight }]}
                  onPress={() => handleDeleteWorkflow(workflow.id)}
                >
                  <Ionicons name="trash" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.itemMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="flash" size={14} color={COLORS.gray} />
                <Text style={styles.metaText}>Trigger: {workflow.trigger?.type}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="analytics" size={14} color={COLORS.gray} />
                <Text style={styles.metaText}>{workflow.executions_count} executions</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSegmentsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Contact Segments</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowSegmentModal(true)}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>New Segment</Text>
        </TouchableOpacity>
      </View>

      {segments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="filter-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No segments yet</Text>
          <Text style={styles.emptyText}>Target specific contact groups</Text>
        </View>
      ) : (
        segments.map((segment) => (
          <View key={segment.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{segment.name}</Text>
              <View style={styles.contactCount}>
                <Ionicons name="people" size={14} color={COLORS.blue} />
                <Text style={styles.contactCountText}>{segment.contact_count} contacts</Text>
              </View>
            </View>
            <View style={styles.rulesPreview}>
              {segment.rules?.map((rule: any, idx: number) => (
                <View key={idx} style={styles.ruleChip}>
                  <Text style={styles.ruleChipText}>
                    {rule.field} {rule.operator} "{rule.value}"
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderLinksTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Shortened Links</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowLinkModal(true)}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Shorten Link</Text>
        </TouchableOpacity>
      </View>

      {shortLinks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="link-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No links yet</Text>
          <Text style={styles.emptyText}>Create trackable short links</Text>
        </View>
      ) : (
        shortLinks.map((link) => (
          <View key={link.id} style={styles.itemCard}>
            <Text style={styles.shortUrl}>{link.short_url}</Text>
            <Text style={styles.originalUrl} numberOfLines={1}>{link.original_url}</Text>
            <View style={styles.linkStats}>
              <View style={styles.linkStat}>
                <Ionicons name="eye" size={16} color={COLORS.blue} />
                <Text style={styles.linkStatText}>{link.clicks} clicks</Text>
              </View>
              <View style={styles.linkStat}>
                <Ionicons name="person" size={16} color={COLORS.purple} />
                <Text style={styles.linkStatText}>{link.unique_clicks} unique</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderComplianceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Opt-Out Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowOptOutModal(true)}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Opt-Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.complianceInfo}>
        <Ionicons name="information-circle" size={20} color={COLORS.blue} />
        <Text style={styles.complianceInfoText}>
          Contacts in this list will not receive any messages from your campaigns.
        </Text>
      </View>

      {optOuts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No opt-outs</Text>
          <Text style={styles.emptyText}>Manage unsubscribed contacts here</Text>
        </View>
      ) : (
        optOuts.map((optOut) => (
          <View key={optOut.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{optOut.phone}</Text>
              <View style={[styles.channelBadge, { backgroundColor: COLORS.dangerLight }]}>
                <Text style={[styles.channelBadgeText, { color: COLORS.danger }]}>
                  {optOut.channel}
                </Text>
              </View>
            </View>
            <Text style={styles.optOutReason}>Reason: {optOut.reason}</Text>
            <Text style={styles.optOutDate}>
              Opted out: {new Date(optOut.opted_out_at).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Messaging Tools</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? COLORS.white : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} colors={[COLORS.primary]} />}
      >
        {activeTab === 'personalization' && renderPersonalizationTab()}
        {activeTab === 'workflows' && renderWorkflowsTab()}
        {activeTab === 'segments' && renderSegmentsTab()}
        {activeTab === 'links' && renderLinksTab()}
        {activeTab === 'compliance' && renderComplianceTab()}
      </ScrollView>

      {/* Workflow Modal */}
      <Modal visible={showWorkflowModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Workflow</Text>
              <TouchableOpacity onPress={() => setShowWorkflowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Workflow Name</Text>
              <TextInput
                style={styles.input}
                value={newWorkflowName}
                onChangeText={setNewWorkflowName}
                placeholder="e.g., Welcome Series"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={styles.inputLabel}>Trigger Type</Text>
              <View style={styles.triggerOptions}>
                {['contact_added', 'tag_added', 'campaign_completed'].map((trigger) => (
                  <TouchableOpacity
                    key={trigger}
                    style={[styles.triggerOption, newWorkflowTrigger === trigger && styles.triggerOptionActive]}
                    onPress={() => setNewWorkflowTrigger(trigger)}
                  >
                    <Text style={[styles.triggerOptionText, newWorkflowTrigger === trigger && styles.triggerOptionTextActive]}>
                      {trigger.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowWorkflowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateWorkflow}>
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Segment Modal */}
      <Modal visible={showSegmentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Segment</Text>
              <TouchableOpacity onPress={() => setShowSegmentModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Segment Name</Text>
              <TextInput
                style={styles.input}
                value={newSegmentName}
                onChangeText={setNewSegmentName}
                placeholder="e.g., VIP Customers"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={styles.inputLabel}>Field</Text>
              <View style={styles.triggerOptions}>
                {['country', 'tag', 'email'].map((field) => (
                  <TouchableOpacity
                    key={field}
                    style={[styles.triggerOption, segmentField === field && styles.triggerOptionActive]}
                    onPress={() => setSegmentField(field)}
                  >
                    <Text style={[styles.triggerOptionText, segmentField === field && styles.triggerOptionTextActive]}>
                      {field}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={styles.input}
                value={segmentValue}
                onChangeText={setSegmentValue}
                placeholder="e.g., US"
                placeholderTextColor={COLORS.gray}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSegmentModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateSegment}>
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Link Modal */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shorten Link</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>URL to Shorten</Text>
              <TextInput
                style={styles.input}
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
                placeholder="https://example.com/long-url"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLinkModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleShortenLink}>
                <Text style={styles.submitButtonText}>Shorten</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Opt-Out Modal */}
      <Modal visible={showOptOutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Opt-Out</Text>
              <TouchableOpacity onPress={() => setShowOptOutModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={newOptOutPhone}
                onChangeText={setNewOptOutPhone}
                placeholder="+1234567890"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowOptOutModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAddOptOut}>
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  tabBar: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 60,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  tabContent: {},
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureHeaderText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  featureSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  variablesGrid: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 10,
  },
  variableChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variableChip: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  variableChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.dark,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 15,
    color: COLORS.dark,
    lineHeight: 22,
  },
  resultMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultMetaText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  contactCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contactCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue,
  },
  rulesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  ruleChip: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ruleChipText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  shortUrl: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.blue,
    marginBottom: 4,
  },
  originalUrl: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
  },
  linkStats: {
    flexDirection: 'row',
    gap: 20,
  },
  linkStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  complianceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueLight,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  complianceInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.blue,
  },
  channelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  optOutReason: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 8,
  },
  optOutDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  // Modal styles
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
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
    marginBottom: 16,
  },
  triggerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  triggerOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  triggerOptionActive: {
    backgroundColor: COLORS.primary,
  },
  triggerOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  triggerOptionTextActive: {
    color: COLORS.white,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
