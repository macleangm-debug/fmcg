import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';
import * as Clipboard from 'expo-clipboard';

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

interface OAuthApp {
  client_id: string;
  name: string;
  description?: string;
  status: string;
  app_type: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  created_at: string;
}

export default function DeveloperPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myApps, setMyApps] = useState<OAuthApp[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [newAppSecret, setNewAppSecret] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    redirect_uris: '',
    category: 'productivity',
    developer_name: '',
    developer_email: '',
    developer_website: '',
  });

  useEffect(() => {
    fetchMyApps();
  }, []);

  const fetchMyApps = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/sso/admin/apps', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyApps(response.data.apps || []);
    } catch (error) {
      console.error('Error fetching apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterApp = async () => {
    if (!newApp.name || !newApp.redirect_uris || !newApp.developer_name || !newApp.developer_email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/sso/oauth/register', {
        name: newApp.name,
        description: newApp.description,
        redirect_uris: newApp.redirect_uris.split(',').map(uri => uri.trim()),
        category: newApp.category,
        developer_name: newApp.developer_name,
        developer_email: newApp.developer_email,
        developer_website: newApp.developer_website || undefined,
        requested_scopes: ['openid', 'profile', 'email'],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Show the client secret
      setNewAppSecret({
        client_id: response.data.client_id,
        client_secret: response.data.client_secret,
      });
      setShowRegisterModal(false);
      setShowSecretModal(true);

      // Reset form and refresh list
      setNewApp({
        name: '',
        description: '',
        redirect_uris: '',
        category: 'productivity',
        developer_name: '',
        developer_email: '',
        developer_website: '',
      });
      fetchMyApps();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register app');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: COLORS.successLight, text: COLORS.success };
      case 'pending_review': return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'suspended': return { bg: COLORS.dangerLight, text: COLORS.danger };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.pageTitle}>Developer Portal</Text>
            <Text style={styles.pageSubtitle}>Register and manage your OAuth applications</Text>
          </View>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => setShowRegisterModal(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.registerBtnText}>Register App</Text>
          </TouchableOpacity>
        </View>

        {/* Documentation Card */}
        <View style={styles.docCard}>
          <View style={styles.docIcon}>
            <Ionicons name="book" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.docContent}>
            <Text style={styles.docTitle}>OAuth 2.0 + OpenID Connect</Text>
            <Text style={styles.docText}>
              Integrate with Software Galaxy using industry-standard OAuth 2.0 and OpenID Connect protocols.
            </Text>
            <View style={styles.docEndpoints}>
              <Text style={styles.docEndpointLabel}>Discovery:</Text>
              <Text style={styles.docEndpointUrl}>/api/sso/.well-known/openid-configuration</Text>
            </View>
          </View>
        </View>

        {/* My Apps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Applications ({myApps.length})</Text>

          {myApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyTitle}>No Applications</Text>
              <Text style={styles.emptyText}>
                Register your first OAuth application to get started.
              </Text>
            </View>
          ) : (
            myApps.map((app) => {
              const statusColor = getStatusColor(app.status);
              return (
                <View key={app.client_id} style={styles.appCard}>
                  <View style={styles.appHeader}>
                    <View style={styles.appIconContainer}>
                      <Text style={styles.appIconText}>{app.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.appType}>{app.app_type.replace('_', ' ')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {app.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {app.description && (
                    <Text style={styles.appDescription}>{app.description}</Text>
                  )}

                  <View style={styles.credentialsSection}>
                    <Text style={styles.credentialsTitle}>Client ID</Text>
                    <View style={styles.credentialRow}>
                      <Text style={styles.credentialValue} numberOfLines={1}>
                        {app.client_id}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => copyToClipboard(app.client_id, 'Client ID')}
                      >
                        <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Redirect URIs</Text>
                      <Text style={styles.infoValue}>{app.redirect_uris.length} configured</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Scopes</Text>
                      <Text style={styles.infoValue}>{app.allowed_scopes.join(', ')}</Text>
                    </View>
                  </View>

                  <View style={styles.appActions}>
                    <TouchableOpacity style={styles.appActionBtn}>
                      <Ionicons name="settings-outline" size={18} color={COLORS.gray} />
                      <Text style={styles.appActionText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.appActionBtn}>
                      <Ionicons name="analytics-outline" size={18} color={COLORS.gray} />
                      <Text style={styles.appActionText}>Analytics</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>App Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="My Awesome App"
                  value={newApp.name}
                  onChangeText={(text) => setNewApp({ ...newApp, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What does your app do?"
                  multiline
                  numberOfLines={3}
                  value={newApp.description}
                  onChangeText={(text) => setNewApp({ ...newApp, description: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Redirect URIs * (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://myapp.com/callback"
                  value={newApp.redirect_uris}
                  onChangeText={(text) => setNewApp({ ...newApp, redirect_uris: text })}
                />
                <Text style={styles.helperText}>Enter one or more redirect URIs separated by commas</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Developer Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name or company"
                  value={newApp.developer_name}
                  onChangeText={(text) => setNewApp({ ...newApp, developer_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Developer Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="developer@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newApp.developer_email}
                  onChangeText={(text) => setNewApp({ ...newApp, developer_email: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Website (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://myapp.com"
                  autoCapitalize="none"
                  value={newApp.developer_website}
                  onChangeText={(text) => setNewApp({ ...newApp, developer_website: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRegisterModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegisterApp}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Register App</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Client Secret Modal */}
      <Modal visible={showSecretModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.secretModal}>
            <View style={styles.secretHeader}>
              <Ionicons name="key" size={32} color={COLORS.warning} />
              <Text style={styles.secretTitle}>Save Your Credentials!</Text>
            </View>

            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                The client secret will only be shown once. Save it securely!
              </Text>
            </View>

            {newAppSecret && (
              <>
                <View style={styles.secretField}>
                  <Text style={styles.secretLabel}>Client ID</Text>
                  <View style={styles.secretValue}>
                    <Text style={styles.secretText}>{newAppSecret.client_id}</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(newAppSecret.client_id, 'Client ID')}
                    >
                      <Ionicons name="copy" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.secretField}>
                  <Text style={styles.secretLabel}>Client Secret</Text>
                  <View style={styles.secretValue}>
                    <Text style={styles.secretText} numberOfLines={1}>
                      {newAppSecret.client_secret}
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(newAppSecret.client_secret, 'Client Secret')}
                    >
                      <Ionicons name="copy" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowSecretModal(false);
                setNewAppSecret(null);
              }}
            >
              <Text style={styles.doneBtnText}>I've Saved My Credentials</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  registerBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  docIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  docText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    lineHeight: 18,
  },
  docEndpoints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  docEndpointLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  docEndpointUrl: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: COLORS.primary,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
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
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 18,
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
  appType: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 12,
    lineHeight: 18,
  },
  credentialsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  credentialsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  credentialValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.dark,
  },
  copyBtn: {
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.dark,
    marginTop: 4,
  },
  appActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  appActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    gap: 6,
  },
  appActionText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
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
    maxWidth: 500,
    maxHeight: '90%',
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Secret Modal
  secretModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  secretHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  secretTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 18,
  },
  secretField: {
    marginBottom: 16,
  },
  secretLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  secretValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secretText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.dark,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
