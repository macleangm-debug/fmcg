import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import currencyService, { SUPPORTED_CURRENCIES, CurrencyRate } from '../services/currencyService';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  compact?: boolean;
  showRates?: boolean;
  rates?: Record<string, CurrencyRate>;
}

export default function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  compact = false,
  showRates = false,
  rates,
}: CurrencySelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localRates, setLocalRates] = useState<Record<string, CurrencyRate>>({});

  useEffect(() => {
    if (rates) {
      setLocalRates(rates);
    } else if (showRates) {
      fetchRates();
    }
  }, [rates, showRates]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const fetchedRates = await currencyService.fetchRates();
      setLocalRates(fetchedRates);
    } catch (error) {
      console.log('Error fetching rates:', error);
    }
    setLoading(false);
  };

  const handleSelect = (currency: string) => {
    onCurrencyChange(currency);
    currencyService.setUserCurrency(currency);
    setShowModal(false);
  };

  const currentCurrencyInfo = SUPPORTED_CURRENCIES[selectedCurrency as keyof typeof SUPPORTED_CURRENCIES];

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactSelector}
        onPress={() => setShowModal(true)}
        data-testid="currency-selector-compact"
      >
        <Text style={styles.compactText}>{currentCurrencyInfo?.symbol || '$'}</Text>
        <Text style={styles.compactCode}>{selectedCurrency}</Text>
        <Ionicons name="chevron-down" size={14} color="#6B7280" />
        
        <Modal visible={showModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={styles.compactDropdown}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.values(SUPPORTED_CURRENCIES).map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.compactOption,
                      selectedCurrency === currency.code && styles.compactOptionActive,
                    ]}
                    onPress={() => handleSelect(currency.code)}
                  >
                    <Text style={styles.compactOptionSymbol}>{currency.symbol}</Text>
                    <Text style={[
                      styles.compactOptionCode,
                      selectedCurrency === currency.code && styles.compactOptionCodeActive,
                    ]}>
                      {currency.code}
                    </Text>
                    {selectedCurrency === currency.code && (
                      <Ionicons name="checkmark" size={16} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowModal(true)}
        data-testid="currency-selector"
      >
        <View style={styles.selectorLeft}>
          <View style={styles.currencyIcon}>
            <Text style={styles.currencySymbol}>{currentCurrencyInfo?.symbol || '$'}</Text>
          </View>
          <View>
            <Text style={styles.currencyCode}>{selectedCurrency}</Text>
            <Text style={styles.currencyName}>{currentCurrencyInfo?.name || 'US Dollar'}</Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading rates...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {Object.values(SUPPORTED_CURRENCIES).map((currency) => {
                  const rate = localRates[currency.code];
                  const isSelected = selectedCurrency === currency.code;
                  
                  return (
                    <TouchableOpacity
                      key={currency.code}
                      style={[styles.currencyOption, isSelected && styles.currencyOptionActive]}
                      onPress={() => handleSelect(currency.code)}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[
                          styles.optionIcon,
                          isSelected && styles.optionIconActive,
                        ]}>
                          <Text style={[
                            styles.optionSymbol,
                            isSelected && styles.optionSymbolActive,
                          ]}>
                            {currency.symbol}
                          </Text>
                        </View>
                        <View>
                          <Text style={[
                            styles.optionCode,
                            isSelected && styles.optionCodeActive,
                          ]}>
                            {currency.code}
                          </Text>
                          <Text style={styles.optionName}>{currency.name}</Text>
                        </View>
                      </View>
                      <View style={styles.optionRight}>
                        {showRates && rate && currency.code !== 'USD' && (
                          <Text style={styles.rateText}>
                            1 USD = {rate.customerRate.toLocaleString()} {currency.code}
                          </Text>
                        )}
                        {isSelected && (
                          <View style={styles.checkIcon}>
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {showRates && (
                  <View style={styles.ratesNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.ratesNoteText}>
                      Exchange rates are updated periodically and include a small margin.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  // Full Selector
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  currencyName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Compact Selector
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  compactCode: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactDropdown: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    maxHeight: 300,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  compactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  compactOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  compactOptionSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 30,
  },
  compactOptionCode: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  compactOptionCodeActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Currency Options
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyOptionActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconActive: {
    backgroundColor: '#6366F1',
  },
  optionSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  optionSymbolActive: {
    color: '#FFFFFF',
  },
  optionCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionCodeActive: {
    color: '#6366F1',
  },
  optionName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  optionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rates Note
  ratesNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginTop: 8,
  },
  ratesNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});
