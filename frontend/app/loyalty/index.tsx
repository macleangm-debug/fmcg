import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusinessStore } from '../../src/store/businessStore';
import { ProductDashboard, PRODUCT_THEMES } from '../../src/components/dashboard';
import { Advert } from '../../src/components/AdvertCarousel';

export default function LoyaltyHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, formatNumber } = useBusinessStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [adverts, setAdverts] = useState<Advert[]>([]);

  // Fetch adverts
  const fetchAdverts = async () => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/adverts/public?product=loyalty&language=en`);
      if (response.ok) {
        const data = await response.json();
        setAdverts(data);
      }
    } catch (error) {
      console.log('Failed to fetch adverts:', error);
    }
  };

  useEffect(() => {
    fetchAdverts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAdverts().finally(() => setRefreshing(false));
  }, []);

  // Web: Use the new ProductDashboard
  if (isWeb) {
    return (
      <ProductDashboard
        productId="loyalty"
        subtitle="Build customer relationships with rewards and engagement programs"
        onNewAction={() => router.push('/loyalty/members/new')}
        newActionLabel="Add Member"
        statsRow={[
          { label: 'Active Members', value: '482', icon: 'people', iconBg: '#FCE7F3', iconColor: '#DB2777' },
          { label: 'Points Issued', value: '23,400', icon: 'star', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
          { label: 'Rewards Redeemed', value: '156', icon: 'gift', iconBg: '#D1FAE5', iconColor: '#10B981' },
          { label: 'VIP Members', value: '24', icon: 'trophy', iconBg: '#FCE7F3', iconColor: '#EC4899' },
        ]}
        netIncome={{ value: 23400, trend: 28 }}
        totalReturn={{ value: 4560, trend: 15 }}
        revenueTotal={87500}
        revenueTrend={22}
        adverts={adverts}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onTransactionViewMore={() => router.push('/loyalty/members')}
        onSalesReportViewMore={() => router.push('/loyalty/reports')}
        onPromoPress={() => router.push('/loyalty/settings')}
        promoTitle="Grow customer loyalty with smart rewards."
        promoSubtitle="Create tiers, automate rewards, and track engagement metrics."
        promoButtonText="Configure Rewards"
        formatCurrency={formatCurrency}
      />
    );
  }

  // Mobile: Keep original coming soon layout
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#DB2777', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart-outline" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Loyalty</Text>
            <Text style={styles.headerSubtitle}>Customer Rewards Program</Text>
          </View>
        </LinearGradient>

        {/* Coming Soon Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIcon}>
            <Ionicons name="construct-outline" size={48} color="#EC4899" />
          </View>
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            We're building an amazing loyalty program for your customers.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Points-based rewards system</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Customer tiers & VIP levels</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Retention tracking & analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Automated reward notifications</Text>
            </View>
          </View>

          <View style={styles.trialBadge}>
            <Ionicons name="gift" size={16} color="#F59E0B" />
            <Text style={styles.trialBadgeText}>Your 7-day trial is active</Text>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          <Ionicons name="arrow-back" size={18} color="#EC4899" />
          <Text style={styles.returnButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  comingSoonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EC4899',
  },
});
