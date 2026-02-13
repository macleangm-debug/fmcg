import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  TextInput,
  Alert,
  Modal,
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
  cyan: '#06B6D4',
  cyanLight: '#CFFAFE',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface DeveloperApp {
  client_id: string;
  name: string;
  description?: string;
  status: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  category?: string;
  created_at?: string;
  is_verified: boolean;
}

interface Webhook {
  webhook_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at?: string;
}

interface ApiKey {
  key_id: string;
  name: string;
  key_preview: string;
  is_active: boolean;
  created_at?: string;
  last_used_at?: string;
}

interface Scope {
  name: string;
  description: string;
  category: string;
}

export default function DeveloperPortal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'docs' | 'webhooks' | 'keys'>('apps');
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<DeveloperApp | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    redirect_uris: '',
    category: 'general',
    website: '',
  });
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] });
  const [newApiKeyName, setNewApiKeyName] = useState('');
  
  // Credential display
  const [showCredentials, setShowCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      setIsAuthenticated(true);
      
      // Fetch developer's apps
      try {
        const appsRes = await api.get('/developer/apps', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApps(appsRes.data.apps || []);
        
        if (appsRes.data.apps?.length > 0 && !selectedApp) {
          setSelectedApp(appsRes.data.apps[0]);
        }
      } catch (e) {
        console.log('Error fetching apps:', e);
      }
      
      // Fetch available scopes
      try {
        const scopesRes = await api.get('/developer/scopes');
        setScopes(scopesRes.data.scopes || []);
      } catch (e) {
        console.log('Error fetching scopes:', e);
      }
      
      // Fetch webhook events
      try {
        const eventsRes = await api.get('/developer/webhook-events');
        setWebhookEvents(eventsRes.data.events || []);
      } catch (e) {
        console.log('Error fetching events:', e);
      }
      
    } catch (error) {
      console.error('Error fetching developer data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedApp]);

  const fetchAppDetails = async (clientId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch webhooks
      try {
        const webhooksRes = await api.get(`/developer/apps/${clientId}/webhooks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWebhooks(webhooksRes.data.webhooks || []);
      } catch (e) {
        setWebhooks([]);
      }
      
      // Fetch API keys
      try {
        const keysRes = await api.get(`/developer/apps/${clientId}/api-keys`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApiKeys(keysRes.data.api_keys || []);
      } catch (e) {
        setApiKeys([]);
      }
    } catch (e) {
      console.log('Error fetching app details:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedApp) {
      fetchAppDetails(selectedApp.client_id);
    }
  }, [selectedApp]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRegisterApp = async () => {
    if (!newApp.name || !newApp.description || !newApp.redirect_uris) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/developer/apps/register', {
        name: newApp.name,
        description: newApp.description,
        redirect_uris: newApp.redirect_uris.split(',').map(u => u.trim()),
        category: newApp.category,
        website: newApp.website || null,
        requested_scopes: ['openid', 'profile', 'email'],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowRegisterModal(false);
      setShowCredentials({
        clientId: response.data.client_id,
        clientSecret: response.data.client_secret
      });
      setNewApp({ name: '', description: '', redirect_uris: '', category: 'general', website: '' });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register app');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!selectedApp || !newWebhook.url || newWebhook.events.length === 0) {
      Alert.alert('Error', 'Please provide URL and select at least one event');
      return;
    }
    
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post(`/developer/apps/${selectedApp.client_id}/webhooks`, newWebhook, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowWebhookModal(false);
      setNewWebhook({ url: '', events: [] });
      fetchAppDetails(selectedApp.client_id);
      Alert.alert('Success', 'Webhook created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create webhook');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!selectedApp) return;
    
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post(`/developer/apps/${selectedApp.client_id}/api-keys`, null, {
        params: { name: newApiKeyName || 'API Key' },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowApiKeyModal(false);
      setNewApiKeyName('');
      fetchAppDetails(selectedApp.client_id);
      
      // Show the key to the user
      if (isWeb) {
        window.alert(`API Key created!\n\n${response.data.api_key}\n\nSave this key - it won't be shown again!`);
      } else {
        Alert.alert('API Key Created', `${response.data.api_key}\n\nSave this key - it won't be shown again!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!selectedApp) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      await api.delete(`/developer/apps/${selectedApp.client_id}/webhooks/${webhookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAppDetails(selectedApp.client_id);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete webhook');
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!selectedApp) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      await api.delete(`/developer/apps/${selectedApp.client_id}/api-keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAppDetails(selectedApp.client_id);
    } catch (error) {
      Alert.alert('Error', 'Failed to revoke API key');
    }
  };

  const toggleEventSelection = (eventName: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventName)
        ? prev.events.filter(e => e !== eventName)
        : [...prev.events, eventName]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'pending_review': return COLORS.warning;
      case 'rejected': return COLORS.danger;
      case 'suspended': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Developer Portal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="code-slash" size={64} color={COLORS.primary} />
          <Text style={styles.authTitle}>Developer Portal</Text>
          <Text style={styles.authText}>
            Sign in to manage your applications, API keys, and webhooks.
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={() => router.push('/login')}>
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Developer Portal</Text>
            <Text style={styles.headerSubtitle}>Manage your applications and integrations</Text>
          </View>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => setShowRegisterModal(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.registerButtonText}>Register App</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'apps' && styles.tabActive]}
            onPress={() => setActiveTab('apps')}
          >
            <Ionicons name="apps" size={18} color={activeTab === 'apps' ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'apps' && styles.tabTextActive]}>My Apps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'webhooks' && styles.tabActive]}
            onPress={() => setActiveTab('webhooks')}
          >
            <Ionicons name="link" size={18} color={activeTab === 'webhooks' ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'webhooks' && styles.tabTextActive]}>Webhooks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'keys' && styles.tabActive]}
            onPress={() => setActiveTab('keys')}
          >
            <Ionicons name="key" size={18} color={activeTab === 'keys' ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'keys' && styles.tabTextActive]}>API Keys</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'docs' && styles.tabActive]}
            onPress={() => setActiveTab('docs')}
          >
            <Ionicons name="document-text" size={18} color={activeTab === 'docs' ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>Docs</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'apps' && (
          <View style={styles.content}>
            {apps.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="apps-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Applications Yet</Text>
                <Text style={styles.emptyText}>Register your first app to get started</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowRegisterModal(true)}
                >
                  <Text style={styles.emptyButtonText}>Register App</Text>
                </TouchableOpacity>
              </View>
            ) : (
              apps.map(app => (
                <TouchableOpacity 
                  key={app.client_id} 
                  style={[styles.appCard, selectedApp?.client_id === app.client_id && styles.appCardSelected]}
                  onPress={() => setSelectedApp(app)}
                >
                  <View style={styles.appHeader}>
                    <View style={[styles.appIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="cube" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.appInfo}>
                      <View style={styles.appNameRow}>
                        <Text style={styles.appName}>{app.name}</Text>
                        {app.is_verified && (
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.appDescription} numberOfLines={2}>{app.description}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(app.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(app.status) }]}>
                        {app.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.appDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Client ID</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>{app.client_id.substring(0, 20)}...</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Scopes</Text>
                      <Text style={styles.detailValue}>{app.allowed_scopes?.length || 0} scopes</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Redirects</Text>
                      <Text style={styles.detailValue}>{app.redirect_uris?.length || 0} URIs</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'webhooks' && (
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Webhooks</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowWebhookModal(true)}
                disabled={!selectedApp}
              >
                <Ionicons name="add" size={18} color={COLORS.white} />
                <Text style={styles.addButtonText}>Add Webhook</Text>
              </TouchableOpacity>
            </View>
            
            {!selectedApp ? (
              <Text style={styles.selectAppHint}>Select an app first to manage webhooks</Text>
            ) : webhooks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="link-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No Webhooks</Text>
                <Text style={styles.emptyText}>Add webhooks to receive real-time notifications</Text>
              </View>
            ) : (
              webhooks.map(webhook => (
                <View key={webhook.webhook_id} style={styles.webhookCard}>
                  <View style={styles.webhookHeader}>
                    <Ionicons name="link" size={20} color={COLORS.purple} />
                    <Text style={styles.webhookUrl} numberOfLines={1}>{webhook.url}</Text>
                    <TouchableOpacity onPress={() => handleDeleteWebhook(webhook.webhook_id)}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.webhookEvents}>
                    {webhook.events.map(event => (
                      <View key={event} style={styles.eventTag}>
                        <Text style={styles.eventTagText}>{event}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'keys' && (
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>API Keys</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowApiKeyModal(true)}
                disabled={!selectedApp}
              >
                <Ionicons name="add" size={18} color={COLORS.white} />
                <Text style={styles.addButtonText}>Create Key</Text>
              </TouchableOpacity>
            </View>
            
            {!selectedApp ? (
              <Text style={styles.selectAppHint}>Select an app first to manage API keys</Text>
            ) : apiKeys.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="key-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>No API Keys</Text>
                <Text style={styles.emptyText}>Create API keys for server-to-server authentication</Text>
              </View>
            ) : (
              apiKeys.map(key => (
                <View key={key.key_id} style={styles.apiKeyCard}>
                  <View style={styles.apiKeyHeader}>
                    <Ionicons name="key" size={20} color={COLORS.cyan} />
                    <View style={styles.apiKeyInfo}>
                      <Text style={styles.apiKeyName}>{key.name}</Text>
                      <Text style={styles.apiKeyPreview}>{key.key_preview}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.revokeButton, !key.is_active && styles.revokeButtonDisabled]}
                      onPress={() => handleRevokeApiKey(key.key_id)}
                      disabled={!key.is_active}
                    >
                      <Text style={styles.revokeButtonText}>
                        {key.is_active ? 'Revoke' : 'Revoked'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'docs' && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Available Scopes</Text>
            <Text style={styles.docsDescription}>
              Request these scopes when integrating with Software Galaxy OAuth
            </Text>
            
            {['identity', 'business', 'commerce', 'inventory', 'payments', 'finance', 'marketing', 'special'].map(category => {
              const categoryScopes = scopes.filter(s => s.category === category);
              if (categoryScopes.length === 0) return null;
              
              return (
                <View key={category} style={styles.scopeCategory}>
                  <Text style={styles.scopeCategoryTitle}>{category.toUpperCase()}</Text>
                  {categoryScopes.map(scope => (
                    <View key={scope.name} style={styles.scopeItem}>
                      <Text style={styles.scopeName}>{scope.name}</Text>
                      <Text style={styles.scopeDescription}>{scope.description}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Webhook Events</Text>
            <Text style={styles.docsDescription}>
              Subscribe to these events to receive real-time notifications
            </Text>
            
            {webhookEvents.map(event => (
              <View key={event.name} style={styles.eventItem}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventDescription}>{event.description}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Register App Modal */}
      <Modal visible={showRegisterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New App</Text>
              <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>App Name *</Text>
              <TextInput
                style={styles.input}
                value={newApp.name}
                onChangeText={text => setNewApp(prev => ({ ...prev, name: text }))}
                placeholder="My Awesome App"
                placeholderTextColor={COLORS.gray}
              />
              
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newApp.description}
                onChangeText={text => setNewApp(prev => ({ ...prev, description: text }))}
                placeholder="What does your app do?"
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.inputLabel}>Redirect URIs * (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={newApp.redirect_uris}
                onChangeText={text => setNewApp(prev => ({ ...prev, redirect_uris: text }))}
                placeholder="https://myapp.com/callback"
                placeholderTextColor={COLORS.gray}
              />
              
              <Text style={styles.inputLabel}>Website (optional)</Text>
              <TextInput
                style={styles.input}
                value={newApp.website}
                onChangeText={text => setNewApp(prev => ({ ...prev, website: text }))}
                placeholder="https://myapp.com"
                placeholderTextColor={COLORS.gray}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRegisterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleRegisterApp}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Register</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Webhook Modal */}
      <Modal visible={showWebhookModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Webhook</Text>
              <TouchableOpacity onPress={() => setShowWebhookModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Webhook URL *</Text>
              <TextInput
                style={styles.input}
                value={newWebhook.url}
                onChangeText={text => setNewWebhook(prev => ({ ...prev, url: text }))}
                placeholder="https://myapp.com/webhook"
                placeholderTextColor={COLORS.gray}
              />
              
              <Text style={styles.inputLabel}>Events *</Text>
              <View style={styles.eventsGrid}>
                {webhookEvents.slice(0, 12).map(event => (
                  <TouchableOpacity
                    key={event.name}
                    style={[
                      styles.eventCheckbox,
                      newWebhook.events.includes(event.name) && styles.eventCheckboxSelected
                    ]}
                    onPress={() => toggleEventSelection(event.name)}
                  >
                    <Ionicons 
                      name={newWebhook.events.includes(event.name) ? "checkbox" : "square-outline"} 
                      size={18} 
                      color={newWebhook.events.includes(event.name) ? COLORS.primary : COLORS.gray} 
                    />
                    <Text style={styles.eventCheckboxText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowWebhookModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCreateWebhook}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <Modal visible={showApiKeyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create API Key</Text>
              <TouchableOpacity onPress={() => setShowApiKeyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Key Name</Text>
              <TextInput
                style={styles.input}
                value={newApiKeyName}
                onChangeText={setNewApiKeyName}
                placeholder="Production API Key"
                placeholderTextColor={COLORS.gray}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCreateApiKey}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credentials Display Modal */}
      <Modal visible={!!showCredentials} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Registered!</Text>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={24} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Save these credentials now. The client secret will not be shown again!
                </Text>
              </View>
              
              <Text style={styles.inputLabel}>Client ID</Text>
              <View style={styles.credentialBox}>
                <Text style={styles.credentialText} selectable>{showCredentials?.clientId}</Text>
              </View>
              
              <Text style={styles.inputLabel}>Client Secret</Text>
              <View style={styles.credentialBox}>
                <Text style={styles.credentialText} selectable>{showCredentials?.clientSecret}</Text>
              </View>
              
              <Text style={styles.pendingNote}>
                Your app is pending review. You'll be notified once approved.
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => setShowCredentials(null)}
              >
                <Text style={styles.submitButtonText}>I've Saved These</Text>
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
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 20,
  },
  authText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  authButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.dark,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  registerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 13,
  },
  selectAppHint: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  appCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  appCardSelected: {
    borderColor: COLORS.primary,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appInfo: {
    flex: 1,
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  appDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  appDetails: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.dark,
  },
  webhookCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  webhookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webhookUrl: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  webhookEvents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  eventTag: {
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  eventTagText: {
    fontSize: 11,
    color: COLORS.purple,
    fontWeight: '500',
  },
  apiKeyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apiKeyInfo: {
    flex: 1,
  },
  apiKeyName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  apiKeyPreview: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  revokeButton: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  revokeButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  docsDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 16,
  },
  scopeCategory: {
    marginBottom: 20,
  },
  scopeCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  scopeItem: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scopeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scopeDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  eventItem: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eventDescription: {
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  eventCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
  },
  eventCheckboxSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  eventCheckboxText: {
    fontSize: 12,
    color: COLORS.dark,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  credentialBox: {
    backgroundColor: COLORS.dark,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  credentialText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pendingNote: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
