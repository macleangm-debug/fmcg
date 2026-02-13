import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface ConsentRequest {
  client_id: string;
  app_name: string;
  app_icon?: string;
  redirect_uri: string;
  scope: string;
  state?: string;
}

export default function ConsentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.request as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsentRequest();
  }, [requestId]);

  const fetchConsentRequest = async () => {
    if (!requestId) {
      setError('Invalid consent request');
      setLoading(false);
      return;
    }

    try {
      // In a real implementation, fetch the pending consent request
      // For now, we'll parse the URL params
      setConsentRequest({
        client_id: params.client_id as string || 'demo-app',
        app_name: params.app_name as string || 'Demo Application',
        redirect_uri: params.redirect_uri as string || '',
        scope: params.scope as string || 'openid profile email',
        state: params.state as string,
      });
    } catch (err) {
      setError('Failed to load consent request');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (authorize: boolean) => {
    if (!consentRequest) return;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await api.post('/sso/oauth/authorize/consent', {
        authorize,
        client_id: consentRequest.client_id,
        scope: consentRequest.scope,
        redirect_uri: consentRequest.redirect_uri,
        state: consentRequest.state,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle redirect from response
      if (response.data.redirect_url) {
        if (Platform.OS === 'web') {
          window.location.href = response.data.redirect_url;
        } else {
          // Handle mobile deep linking
          router.back();
        }
      }
    } catch (err) {
      console.error('Error submitting consent:', err);
      setError('Failed to process consent');
    } finally {
      setSubmitting(false);
    }
  };

  const getScopeInfo = (scope: string) => {
    const scopes = scope.split(' ');
    const scopeDetails: { icon: string; name: string; description: string }[] = [];

    if (scopes.includes('openid') || scopes.includes('profile')) {
      scopeDetails.push({
        icon: 'person-circle',
        name: 'Profile Information',
        description: 'Your name and basic profile details',
      });
    }
    if (scopes.includes('email')) {
      scopeDetails.push({
        icon: 'mail',
        name: 'Email Address',
        description: 'Your email address',
      });
    }
    if (scopes.includes('apps')) {
      scopeDetails.push({
        icon: 'apps',
        name: 'App Access',
        description: 'List of apps you have access to',
      });
    }
    if (scopes.includes('offline_access')) {
      scopeDetails.push({
        icon: 'refresh',
        name: 'Offline Access',
        description: 'Access your data when you\'re not logged in',
      });
    }

    return scopeDetails;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !consentRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || 'Invalid request'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scopeDetails = getScopeInfo(consentRequest.scope);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.galaxyLogo}>
                <Ionicons name="planet" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.gray} />
              </View>
              <View style={styles.appLogo}>
                <Text style={styles.appLogoText}>
                  {consentRequest.app_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            <Text style={styles.appName}>{consentRequest.app_name}</Text>
            {' wants to access your account'}
          </Text>

          <Text style={styles.subtitle}>
            This will allow {consentRequest.app_name} to:
          </Text>

          {/* Permissions */}
          <View style={styles.permissions}>
            {scopeDetails.map((scope, index) => (
              <View key={index} style={styles.permissionItem}>
                <View style={styles.permissionIcon}>
                  <Ionicons name={scope.icon as any} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>{scope.name}</Text>
                  <Text style={styles.permissionDesc}>{scope.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Make sure you trust {consentRequest.app_name}. You can revoke access anytime from your SSO settings.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.denyBtn}
              onPress={() => handleAuthorize(false)}
              disabled={submitting}
            >
              <Text style={styles.denyBtnText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.allowBtn}
              onPress={() => handleAuthorize(true)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.allowBtnText}>Allow</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By clicking Allow, you agree to share the above information with {consentRequest.app_name}.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  galaxyLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    marginHorizontal: 16,
  },
  appLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLogoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  title: {
    fontSize: 18,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 26,
  },
  appName: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 16,
  },
  permissions: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  permissionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  permissionDesc: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.dark,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  denyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  denyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  allowBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  allowBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  footer: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
