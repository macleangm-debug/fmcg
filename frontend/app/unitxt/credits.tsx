import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
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

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  savings?: string;
}

export default function CreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const currentCredits = 5000;

  const packages: CreditPackage[] = [
    { id: 'starter', name: 'Starter', credits: 1000, price: 10 },
    { id: 'basic', name: 'Basic', credits: 5000, price: 45, savings: '10% off' },
    { id: 'pro', name: 'Pro', credits: 15000, price: 120, popular: true, savings: '20% off' },
    { id: 'enterprise', name: 'Enterprise', credits: 50000, price: 350, savings: '30% off' },
  ];

  const transactionHistory = [
    { id: '1', type: 'purchase', amount: 5000, price: 45, date: '2025-01-20' },
    { id: '2', type: 'usage', amount: -2500, campaign: 'Summer Sale', date: '2025-01-25' },
    { id: '3', type: 'usage', amount: -850, campaign: 'Feedback Request', date: '2025-01-24' },
    { id: '4', type: 'purchase', amount: 1000, price: 10, date: '2025-01-15' },
  ];

  const handlePurchase = () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a credit package to purchase.');
      return;
    }
    const pkg = packages.find(p => p.id === selectedPackage);
    Alert.alert(
      'Confirm Purchase',
      `Purchase ${pkg?.credits.toLocaleString()} credits for $${pkg?.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => Alert.alert('Success', 'Credits added to your account!') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Credits</Text>
        </View>

        {/* Current Balance */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>{currentCredits.toLocaleString()}</Text>
            <Text style={styles.balanceSubtext}>credits available</Text>
          </View>
        </LinearGradient>

        {/* Credit Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Credits</Text>
          <View style={styles.packagesGrid}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage === pkg.id && styles.packageCardSelected,
                  pkg.popular && styles.packageCardPopular,
                ]}
                onPress={() => setSelectedPackage(pkg.id)}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageCredits}>{pkg.credits.toLocaleString()}</Text>
                <Text style={styles.packageCreditsLabel}>credits</Text>
                <View style={styles.packagePriceRow}>
                  <Text style={styles.packagePrice}>${pkg.price}</Text>
                  {pkg.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{pkg.savings}</Text>
                    </View>
                  )}
                </View>
                {selectedPackage === pkg.id && (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.purchaseBtn} onPress={handlePurchase}>
            <Ionicons name="card" size={20} color={COLORS.white} />
            <Text style={styles.purchaseBtnText}>Purchase Credits</Text>
          </TouchableOpacity>
        </View>

        {/* Usage Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Usage</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageRow}>
              <View style={[styles.usageIcon, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="chatbubble" size={18} color={COLORS.blue} />
              </View>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>SMS Message</Text>
                <Text style={styles.usageDesc}>1 credit per 160 characters</Text>
              </View>
              <Text style={styles.usageValue}>1 credit</Text>
            </View>
            <View style={styles.usageDivider} />
            <View style={styles.usageRow}>
              <View style={[styles.usageIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.success} />
              </View>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>WhatsApp Message</Text>
                <Text style={styles.usageDesc}>Session or template message</Text>
              </View>
              <Text style={styles.usageValue}>2 credits</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactionHistory.map((tx) => (
            <View key={tx.id} style={styles.transactionRow}>
              <View style={[
                styles.transactionIcon,
                { backgroundColor: tx.type === 'purchase' ? COLORS.successLight : COLORS.primaryLight }
              ]}>
                <Ionicons
                  name={tx.type === 'purchase' ? 'add-circle' : 'paper-plane'}
                  size={18}
                  color={tx.type === 'purchase' ? COLORS.success : COLORS.primary}
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>
                  {tx.type === 'purchase' ? 'Credit Purchase' : tx.campaign}
                </Text>
                <Text style={styles.transactionDate}>{tx.date}</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.transactionAmountText,
                  { color: tx.type === 'purchase' ? COLORS.success : COLORS.gray }
                ]}>
                  {tx.type === 'purchase' ? '+' : ''}{tx.amount.toLocaleString()}
                </Text>
                {tx.price && <Text style={styles.transactionPrice}>${tx.price}</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  balanceInfo: {},
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
  },
  balanceSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 12,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  packageCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  packageCardPopular: {
    borderColor: COLORS.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginTop: 8,
  },
  packageCredits: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 4,
  },
  packageCreditsLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  savingsBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.success,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  usageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  usageInfo: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  usageDesc: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  usageDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionPrice: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
});
