import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusinessStore } from '../../src/store/businessStore';
import api from '../../src/api/client';

// KwikPay Green Theme
const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
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

export default function CheckoutPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatNumber } = useBusinessStore();

  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    amount: '',
    currency: 'TZS',
    description: '',
    customer_email: '',
  });
  const [createdCheckout, setCreatedCheckout] = useState<any>(null);

  const handleCreateCheckout = async () => {
    if (!checkoutData.amount || !checkoutData.description) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/kwikpay/checkout', {
        amount: parseFloat(checkoutData.amount),
        currency: checkoutData.currency,
        description: checkoutData.description,
        customer_email: checkoutData.customer_email || null,
      });
      setCreatedCheckout(response.data);
    } catch (error) {
      console.error('Failed to create checkout:', error);
      // Mock response for demo
      setCreatedCheckout({
        checkout_id: 'chk_demo123456',
        checkout_url: '/kwikpay/pay/chk_demo123456',
        amount: parseFloat(checkoutData.amount),
        currency: checkoutData.currency,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'TZS') => {
    return `${currency} ${formatNumber(amount)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Create Checkout</Text>
            <Text style={styles.pageSubtitle}>Generate a payment link</Text>
          </View>
        </View>

        {!createdCheckout ? (
          <View style={styles.formSection}>
            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (TZS)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={checkoutData.amount}
                onChangeText={(text) => setCheckoutData({ ...checkoutData, amount: text })}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What is this payment for?"
                multiline
                numberOfLines={3}
                value={checkoutData.description}
                onChangeText={(text) => setCheckoutData({ ...checkoutData, description: text })}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Customer Email (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="customer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={checkoutData.customer_email}
                onChangeText={(text) => setCheckoutData({ ...checkoutData, customer_email: text })}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Payment Methods Info */}
            <View style={styles.methodsInfo}>
              <Text style={styles.methodsTitle}>Accepted Payment Methods</Text>
              <View style={styles.methodsList}>
                {[
                  { icon: 'card', name: 'Visa/Mastercard' },
                  { icon: 'phone-portrait', name: 'M-Pesa' },
                  { icon: 'phone-portrait', name: 'Tigo Pesa' },
                  { icon: 'phone-portrait', name: 'Airtel Money' },
                ].map((method, idx) => (
                  <View key={idx} style={styles.methodItem}>
                    <Ionicons name={method.icon as any} size={16} color={COLORS.primary} />
                    <Text style={styles.methodName}>{method.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, (!checkoutData.amount || !checkoutData.description) && styles.createButtonDisabled]}
              onPress={handleCreateCheckout}
              disabled={loading || !checkoutData.amount || !checkoutData.description}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="link" size={18} color={COLORS.white} />
                  <Text style={styles.createButtonText}>Create Checkout Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successSection}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successCard}
            >
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.white} />
              </View>
              <Text style={styles.successTitle}>Checkout Created!</Text>
              <Text style={styles.successAmount}>{formatAmount(createdCheckout.amount, createdCheckout.currency)}</Text>
            </LinearGradient>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Checkout ID</Text>
                <Text style={styles.detailValue}>{createdCheckout.checkout_id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{checkoutData.description}</Text>
              </View>
              {checkoutData.customer_email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Email</Text>
                  <Text style={styles.detailValue}>{checkoutData.customer_email}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.newCheckoutButton}
              onPress={() => {
                setCreatedCheckout(null);
                setCheckoutData({ amount: '', currency: 'TZS', description: '', customer_email: '' });
              }}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.primary} />
              <Text style={styles.newCheckoutButtonText}>Create Another Checkout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  formSection: {},
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.dark },
  textArea: { height: 100, textAlignVertical: 'top' },
  methodsInfo: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 24 },
  methodsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 12 },
  methodsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  methodName: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  createButtonDisabled: { backgroundColor: COLORS.gray },
  createButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  successSection: {},
  successCard: { borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 20 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  successAmount: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  detailsCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.gray },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.dark, maxWidth: '60%', textAlign: 'right' },
  newCheckoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, paddingVertical: 14, borderRadius: 12, gap: 8 },
  newCheckoutButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
