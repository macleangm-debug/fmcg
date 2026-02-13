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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';

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

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  country: string;
  rate_to_usd: number;
}

export default function MultiCurrencyPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

  // Conversion form
  const [fromCurrency, setFromCurrency] = useState('TZS');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [conversionResult, setConversionResult] = useState<any>(null);

  const fetchCurrencies = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/currencies');
      setCurrencies(response.data?.currencies || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleConvert = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    setConverting(true);
    try {
      const response = await api.post('/kwikpay/currencies/convert', {
        amount: parseFloat(amount),
        from_currency: fromCurrency,
        to_currency: toCurrency,
      });
      setConversionResult(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setConversionResult(null);
  };

  const getCurrencyFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      TZ: '🇹🇿', KE: '🇰🇪', UG: '🇺🇬', US: '🇺🇸', EU: '🇪🇺',
      GB: '🇬🇧', NG: '🇳🇬', GH: '🇬🇭', ZA: '🇿🇦', RW: '🇷🇼',
    };
    return flags[country] || '🏳️';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading currencies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCurrencies} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Multi-Currency</Text>
            <Text style={styles.pageSubtitle}>Accept payments in multiple currencies</Text>
          </View>
          <TouchableOpacity
            style={styles.convertButton}
            onPress={() => setShowConvertModal(true)}
          >
            <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
            <Text style={styles.convertButtonText}>Convert</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Convert Card */}
        <View style={styles.quickConvertCard}>
          <View style={styles.quickConvertHeader}>
            <Ionicons name="calculator" size={24} color={COLORS.primary} />
            <Text style={styles.quickConvertTitle}>Quick Conversion</Text>
          </View>
          <View style={styles.quickConvertBody}>
            <View style={styles.currencySelector}>
              <Text style={styles.currencySelectorLabel}>From</Text>
              <View style={styles.currencyDisplay}>
                <Text style={styles.currencyFlag}>{getCurrencyFlag(currencies.find(c => c.code === fromCurrency)?.country || 'TZ')}</Text>
                <Text style={styles.currencyCode}>{fromCurrency}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.swapButton} onPress={swapCurrencies}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.currencySelector}>
              <Text style={styles.currencySelectorLabel}>To</Text>
              <View style={styles.currencyDisplay}>
                <Text style={styles.currencyFlag}>{getCurrencyFlag(currencies.find(c => c.code === toCurrency)?.country || 'US')}</Text>
                <Text style={styles.currencyCode}>{toCurrency}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.openConverterButton}
            onPress={() => setShowConvertModal(true)}
          >
            <Text style={styles.openConverterText}>Open Converter</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Supported Currencies */}
        <Text style={styles.sectionTitle}>Supported Currencies ({currencies.length})</Text>
        <View style={styles.currenciesGrid}>
          {currencies.map((currency) => (
            <View key={currency.code} style={styles.currencyCard}>
              <View style={styles.currencyCardHeader}>
                <Text style={styles.currencyCardFlag}>{getCurrencyFlag(currency.country)}</Text>
                <View style={styles.currencyCardInfo}>
                  <Text style={styles.currencyCardCode}>{currency.code}</Text>
                  <Text style={styles.currencyCardName}>{currency.name}</Text>
                </View>
              </View>
              <View style={styles.currencyCardDetails}>
                <View style={styles.currencyDetail}>
                  <Text style={styles.currencyDetailLabel}>Symbol</Text>
                  <Text style={styles.currencyDetailValue}>{currency.symbol}</Text>
                </View>
                <View style={styles.currencyDetail}>
                  <Text style={styles.currencyDetailLabel}>Rate (1 USD)</Text>
                  <Text style={styles.currencyDetailValue}>
                    {currency.code === 'USD' ? '1.00' : (1 / currency.rate_to_usd).toFixed(currency.decimals > 0 ? 2 : 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Currency Exchange</Text>
            <Text style={styles.infoText}>
              Exchange rates are updated regularly. Final conversion rates may vary slightly at the time of transaction.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Convert Modal */}
      <Modal visible={showConvertModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Currency Converter</Text>
              <TouchableOpacity onPress={() => { setShowConvertModal(false); setConversionResult(null); }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {conversionResult ? (
                <View style={styles.resultContainer}>
                  <View style={styles.resultIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
                  </View>
                  <View style={styles.conversionDisplay}>
                    <View style={styles.conversionFrom}>
                      <Text style={styles.conversionAmount}>
                        {currencies.find(c => c.code === conversionResult.original_currency)?.symbol} {formatNumber(conversionResult.original_amount)}
                      </Text>
                      <Text style={styles.conversionCurrency}>{conversionResult.original_currency}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color={COLORS.gray} />
                    <View style={styles.conversionTo}>
                      <Text style={[styles.conversionAmount, { color: COLORS.primary }]}>
                        {currencies.find(c => c.code === conversionResult.converted_currency)?.symbol} {formatNumber(conversionResult.converted_amount)}
                      </Text>
                      <Text style={styles.conversionCurrency}>{conversionResult.converted_currency}</Text>
                    </View>
                  </View>
                  <View style={styles.rateInfo}>
                    <Text style={styles.rateLabel}>Exchange Rate</Text>
                    <Text style={styles.rateValue}>1 {conversionResult.original_currency} = {conversionResult.rate.toFixed(6)} {conversionResult.converted_currency}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.newConversionButton}
                    onPress={() => setConversionResult(null)}
                  >
                    <Text style={styles.newConversionText}>New Conversion</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>From Currency</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyPicker}>
                    {currencies.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={[styles.currencyOption, fromCurrency === c.code && styles.currencyOptionActive]}
                        onPress={() => setFromCurrency(c.code)}
                      >
                        <Text style={styles.currencyOptionFlag}>{getCurrencyFlag(c.country)}</Text>
                        <Text style={[styles.currencyOptionCode, fromCurrency === c.code && styles.currencyOptionCodeActive]}>{c.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={styles.modalSwapButton} onPress={swapCurrencies}>
                    <Ionicons name="swap-vertical" size={24} color={COLORS.primary} />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>To Currency</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyPicker}>
                    {currencies.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={[styles.currencyOption, toCurrency === c.code && styles.currencyOptionActive]}
                        onPress={() => setToCurrency(c.code)}
                      >
                        <Text style={styles.currencyOptionFlag}>{getCurrencyFlag(c.country)}</Text>
                        <Text style={[styles.currencyOptionCode, toCurrency === c.code && styles.currencyOptionCodeActive]}>{c.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.submitButton, converting && styles.submitButtonDisabled]}
                    onPress={handleConvert}
                    disabled={converting}
                  >
                    {converting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="calculator" size={20} color={COLORS.white} />
                        <Text style={styles.submitButtonText}>Convert</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  convertButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  convertButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  quickConvertCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  quickConvertHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  quickConvertTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  quickConvertBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  currencySelector: { alignItems: 'center' },
  currencySelectorLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 8 },
  currencyDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.lightGray, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  currencyFlag: { fontSize: 24 },
  currencyCode: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  swapButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  openConverterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  openConverterText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  currenciesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  currencyCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  currencyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  currencyCardFlag: { fontSize: 32 },
  currencyCardInfo: {},
  currencyCardCode: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  currencyCardName: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  currencyCardDetails: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  currencyDetail: {},
  currencyDetailLabel: { fontSize: 10, color: COLORS.gray },
  currencyDetailValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginTop: 2 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.secondaryLight, padding: 16, borderRadius: 12, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 4 },
  infoText: { fontSize: 12, color: COLORS.secondary, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 18, fontWeight: '600', color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, textAlign: 'center' },
  currencyPicker: { marginBottom: 16 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.lightGray, marginRight: 8, gap: 6 },
  currencyOptionActive: { backgroundColor: COLORS.primary },
  currencyOptionFlag: { fontSize: 20 },
  currencyOptionCode: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  currencyOptionCodeActive: { color: COLORS.white },
  modalSwapButton: { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  resultContainer: { alignItems: 'center' },
  resultIcon: { marginBottom: 16 },
  conversionDisplay: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  conversionFrom: { alignItems: 'center' },
  conversionTo: { alignItems: 'center' },
  conversionAmount: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
  conversionCurrency: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  rateInfo: { backgroundColor: COLORS.lightGray, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 20 },
  rateLabel: { fontSize: 12, color: COLORS.gray },
  rateValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginTop: 4 },
  newConversionButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  newConversionText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
