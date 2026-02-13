import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useGalaxyStore, GalaxyApp, GalaxyAppId } from '../../src/store/galaxyStore';

const GALAXY_THEME = {
  primary: '#00B4D8',
  primaryDark: '#0077B6',
  dark: '#03071E',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

// App configurations
const APP_CONFIG: Record<string, { gradient: string[]; icon: keyof typeof Ionicons.glyphMap; features: string[] }> = {
  retail_pro: {
    gradient: ['#2563EB', '#3B82F6'],
    icon: 'cart-outline',
    features: [
      'Complete Point of Sale (POS) system',
      'Customer management & loyalty programs',
      'Real-time inventory tracking',
      'Sales reports & analytics',
      'Multi-payment support',
      'Staff management & permissions',
    ],
  },
  inventory: {
    gradient: ['#10B981', '#34D399'],
    icon: 'cube-outline',
    features: [
      'Product catalog management',
      'Real-time stock tracking',
      'Low stock alerts',
      'Supplier management',
      'Barcode/QR scanning',
      'Stock transfer between locations',
    ],
  },
  payments: {
    gradient: ['#8B5CF6', '#A78BFA'],
    icon: 'card-outline',
    features: [
      'Multiple payment gateways',
      'Mobile money integration',
      'Card payment processing',
      'Payment links generation',
      'Transaction reports',
      'Automated reconciliation',
    ],
  },
  bulk_sms: {
    gradient: ['#F59E0B', '#FBBF24'],
    icon: 'chatbubbles-outline',
    features: [
      'Mass messaging campaigns',
      'Contact group management',
      'Scheduled SMS sending',
      'Delivery reports',
      'Message templates',
      'Personalized messaging',
    ],
  },
  invoicing: {
    gradient: ['#EF4444', '#F87171'],
    icon: 'document-text-outline',
    features: [
      'Professional invoice templates',
      'Online payment collection',
      'Recurring invoices',
      'Payment reminders',
      'Tax calculations',
      'Multi-currency support',
    ],
  },
  accounting: {
    gradient: ['#EC4899', '#F472B6'],
    icon: 'calculator-outline',
    features: [
      'Expense tracking',
      'Financial reports',
      'Tax management',
      'Bank reconciliation',
      'Multi-currency support',
      'Budget planning',
    ],
  },
};

export default function AppTrialPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appId = params.appId as GalaxyAppId;
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  
  const { isAuthenticated, token } = useAuthStore();
  const { apps, subscribeToApp, fetchUserAccess, fetchApps, isLoading } = useGalaxyStore();
  const [subscribing, setSubscribing] = useState(false);
  const [app, setApp] = useState<GalaxyApp | null>(null);

  // Fetch apps if not already loaded
  useEffect(() => {
    if (apps.length === 0) {
      fetchApps();
    }
  }, []);

  const config = APP_CONFIG[appId] || {
    gradient: ['#6B7280', '#9CA3AF'],
    icon: 'apps-outline',
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
  };

  useEffect(() => {
    const foundApp = apps.find(a => a.app_id === appId);
    setApp(foundApp || null);
  }, [apps, appId]);

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      router.push('/(auth)/login');
      return;
    }

    if (!token) return;

    setSubscribing(true);
    try {
      const result = await subscribeToApp(token, appId);
      if (result.success) {
        await fetchUserAccess(token);
        Alert.alert(
          '🎉 Trial Started!',
          `Welcome to ${app?.name || 'this app'}! Your free trial has begun.`,
          [
            {
              text: 'Open App',
              onPress: () => {
                if (appId === 'retail_pro') {
                  router.replace('/(tabs)/dashboard');
                } else {
                  router.replace('/galaxy/home');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start trial. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={GALAXY_THEME.dark} />
      </TouchableOpacity>
    </View>
  );

  const renderAppIcon = () => (
    <LinearGradient
      colors={config.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.appIconLarge}
    >
      <Ionicons name={config.icon} size={56} color="#FFFFFF" />
    </LinearGradient>
  );

  const renderFeatures = () => (
    <View style={styles.featuresSection}>
      <Text style={styles.featuresTitle}>What's Included</Text>
      {config.features.map((feature, index) => (
        <View key={index} style={styles.featureRow}>
          <View style={[styles.featureCheck, { backgroundColor: config.gradient[0] + '20' }]}>
            <Ionicons name="checkmark" size={16} color={config.gradient[0]} />
          </View>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  const renderTrialInfo = () => (
    <View style={styles.trialInfoSection}>
      <View style={styles.trialBadge}>
        <Ionicons name="time-outline" size={20} color={GALAXY_THEME.primary} />
        <Text style={styles.trialBadgeText}>14-Day Free Trial</Text>
      </View>
      <Text style={styles.trialInfoText}>
        No credit card required. Full access to all features.
      </Text>
    </View>
  );

  if (!app && !isLoading) {
    // Show loading state while fetching apps
    if (apps.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          {renderHeader()}
          <View style={styles.notFoundContainer}>
            <ActivityIndicator size="large" color={GALAXY_THEME.primary} />
            <Text style={styles.loadingText}>Loading app details...</Text>
          </View>
        </SafeAreaView>
      );
    }
    
    // App really not found
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={GALAXY_THEME.gray} />
          <Text style={styles.notFoundText}>App not found</Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => router.replace('/galaxy/home')}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* App Icon */}
        <View style={styles.appIconSection}>
          {renderAppIcon()}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{app?.name || 'Loading...'}</Text>
          <Text style={styles.appTagline}>{app?.tagline || ''}</Text>
          <Text style={styles.appDescription}>{app?.description || ''}</Text>
        </View>

        {/* Trial Info */}
        {renderTrialInfo()}

        {/* Features */}
        {renderFeatures()}

        {/* Pricing Info */}
        <View style={styles.pricingSection}>
          <Text style={styles.pricingTitle}>After Trial</Text>
          <Text style={styles.pricingAmount}>{app?.pricing || 'Contact for pricing'}</Text>
          <Text style={styles.pricingNote}>Cancel anytime. No questions asked.</Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.trialButton, { backgroundColor: config.gradient[0] }]}
          onPress={handleStartTrial}
          disabled={subscribing}
        >
          {subscribing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={22} color="#FFFFFF" />
              <Text style={styles.trialButtonText}>Start Free Trial</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By starting a trial, you agree to our Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  // App Icon
  appIconSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: GALAXY_THEME.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: GALAXY_THEME.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  appDescription: {
    fontSize: 15,
    color: GALAXY_THEME.gray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  // Trial Info
  trialInfoSection: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    alignItems: 'center',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trialBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: GALAXY_THEME.primary,
  },
  trialInfoText: {
    fontSize: 14,
    color: '#0D9488',
    textAlign: 'center',
  },
  // Features
  featuresSection: {
    marginBottom: 28,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  // Pricing
  pricingSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  pricingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GALAXY_THEME.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pricingAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: GALAXY_THEME.dark,
    marginBottom: 8,
  },
  pricingNote: {
    fontSize: 13,
    color: GALAXY_THEME.gray,
  },
  // Bottom Action
  bottomAction: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  trialButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: GALAXY_THEME.gray,
    textAlign: 'center',
    marginTop: 12,
  },
  // Not Found
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    color: GALAXY_THEME.gray,
    marginTop: 16,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: GALAXY_THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  goBackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 15,
    color: GALAXY_THEME.gray,
    marginTop: 16,
  },
});
