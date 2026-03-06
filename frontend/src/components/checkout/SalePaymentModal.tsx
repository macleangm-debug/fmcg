import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getPaymentConfigForCountry, 
  PAYMENT_METHOD_CONFIG,
  type CountryPaymentConfig,
  type MobileMoneyProvider,
} from '../../config/paymentConfig';

export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'credit' | 'kwikpay';

interface PaymentItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod, paymentDetails?: any) => void;
  
  // Sale details
  items: PaymentItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerName?: string;
  
  // Config
  countryCode: string;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  
  // State
  isProcessing?: boolean;
  isOnline?: boolean;
  
  // KwikPay integration ready
  kwikPayEnabled?: boolean;
}

const SalePaymentModal: React.FC<SalePaymentModalProps> = ({
  visible,
  onClose,
  onConfirm,
  items,
  subtotal,
  tax,
  discount,
  total,
  customerName,
  countryCode,
  currencySymbol,
  formatCurrency,
  isProcessing = false,
  isOnline = true,
  kwikPayEnabled = false,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== 'web' || width < 768;
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<CountryPaymentConfig | null>(null);
  
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    if (visible) {
      const config = getPaymentConfigForCountry(countryCode);
      setPaymentConfig(config);
      
      // Set default mobile money provider
      if (config.mobileMoneyProviders.length > 0) {
        setSelectedProvider(config.mobileMoneyProviders[0].id);
      }
      
      if (isMobile) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    } else {
      slideAnim.setValue(height);
      setAmountReceived('');
    }
  }, [visible, countryCode, isMobile, height]);
  
  const handleClose = () => {
    if (isMobile) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      onClose();
    }
  };
  
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - total) : 0;
  
  const handleConfirm = () => {
    const paymentDetails: any = {
      method: selectedMethod,
      amount: total,
    };
    
    if (selectedMethod === 'mobile_money' && selectedProvider) {
      paymentDetails.provider = selectedProvider;
    }
    
    if (selectedMethod === 'cash' && amountReceived) {
      paymentDetails.amountReceived = parseFloat(amountReceived);
      paymentDetails.change = change;
    }
    
    onConfirm(selectedMethod, paymentDetails);
  };
  
  const renderPaymentMethod = (method: PaymentMethod, disabled: boolean = false) => {
    const config = PAYMENT_METHOD_CONFIG[method];
    if (!config) return null;
    
    const isSelected = selectedMethod === method;
    const requiresInternet = config.requiresInternet;
    const isDisabled = disabled || (requiresInternet && !isOnline);
    
    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.paymentMethodCard,
          isSelected && styles.paymentMethodCardSelected,
          isDisabled && styles.paymentMethodCardDisabled,
        ]}
        onPress={() => !isDisabled && setSelectedMethod(method)}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <View style={[styles.paymentMethodIcon, { backgroundColor: isSelected ? config.color : config.bgColor }]}>
          <Ionicons 
            name={config.icon as any} 
            size={22} 
            color={isSelected ? '#FFFFFF' : config.color} 
          />
        </View>
        <Text style={[
          styles.paymentMethodName,
          isSelected && styles.paymentMethodNameSelected,
          isDisabled && styles.paymentMethodNameDisabled,
        ]}>
          {config.name}
        </Text>
        {isSelected && (
          <View style={styles.checkMark}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
        {isDisabled && !isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={12} color="#F59E0B" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderMobileMoneyProviders = () => {
    if (!paymentConfig || paymentConfig.mobileMoneyProviders.length === 0) return null;
    if (selectedMethod !== 'mobile_money') return null;
    
    return (
      <View style={styles.providersSection}>
        <Text style={styles.providersSectionTitle}>Select Provider</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providersScroll}>
          {paymentConfig.mobileMoneyProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerChip,
                selectedProvider === provider.id && { backgroundColor: provider.color },
              ]}
              onPress={() => setSelectedProvider(provider.id)}
            >
              <Ionicons 
                name={provider.icon as any} 
                size={16} 
                color={selectedProvider === provider.id ? '#FFFFFF' : provider.color} 
              />
              <Text style={[
                styles.providerChipText,
                selectedProvider === provider.id && styles.providerChipTextSelected,
              ]}>
                {provider.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const renderCashInput = () => {
    if (selectedMethod !== 'cash') return null;
    
    return (
      <View style={styles.cashInputSection}>
        <Text style={styles.cashInputLabel}>Amount Received</Text>
        <View style={styles.cashInputRow}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.cashInput}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={amountReceived}
            onChangeText={setAmountReceived}
          />
        </View>
        {amountReceived && parseFloat(amountReceived) >= total && (
          <View style={styles.changeRow}>
            <Text style={styles.changeLabel}>Change to return:</Text>
            <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
          </View>
        )}
        
        {/* Quick amount buttons */}
        <View style={styles.quickAmounts}>
          {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
            .filter((v, i, a) => a.indexOf(v) === i && v >= total)
            .slice(0, 4)
            .map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountBtn}
                onPress={() => setAmountReceived(amount.toString())}
              >
                <Text style={styles.quickAmountText}>{formatCurrency(amount)}</Text>
              </TouchableOpacity>
            ))
          }
        </View>
      </View>
    );
  };

  if (!visible) return null;

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="receipt-outline" size={18} color="#6B7280" />
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>
          
          {items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.summaryItemPrice}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={styles.moreItems}>+{items.length - 3} more items</Text>
          )}
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountText]}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountText]}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          
          {customerName && (
            <View style={styles.customerRow}>
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
          )}
        </View>
        
        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        
        <View style={styles.paymentMethodsGrid}>
          {renderPaymentMethod('cash')}
          {paymentConfig?.cardEnabled && renderPaymentMethod('card')}
          {paymentConfig?.mobileMoneyProviders && paymentConfig.mobileMoneyProviders.length > 0 && 
            renderPaymentMethod('mobile_money')
          }
          {paymentConfig?.bankTransferEnabled && renderPaymentMethod('bank_transfer')}
          {renderPaymentMethod('credit')}
          {kwikPayEnabled && renderPaymentMethod('kwikpay')}
        </View>
        
        {/* Mobile Money Providers */}
        {renderMobileMoneyProviders()}
        
        {/* Cash Input */}
        {renderCashInput()}
        
        {/* KwikPay Placeholder */}
        {selectedMethod === 'kwikpay' && (
          <View style={styles.kwikpayPlaceholder}>
            <Ionicons name="flash" size={32} color="#EC4899" />
            <Text style={styles.kwikpayTitle}>KwikPay Integration</Text>
            <Text style={styles.kwikpayDesc}>
              Coming soon! Accept payments via all major mobile money and card providers with a single integration.
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: isMobile ? insets.bottom + 12 : 16 }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.confirmButton,
            (isProcessing || (selectedMethod === 'cash' && !amountReceived)) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isProcessing || (selectedMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>
                Confirm {formatCurrency(total)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View 
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.handle} />
          {content}
        </Animated.View>
      </View>
    );
  }

  // Desktop: Centered modal
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.centeredModal}>
        {content}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  centeredModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -220 }, { translateY: -300 }],
    width: 440,
    maxHeight: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryItemName: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  summaryItemPrice: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  moreItems: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    color: '#374151',
  },
  discountText: {
    color: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 13,
    color: '#6B7280',
  },
  
  // Payment Methods
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  paymentMethodCard: {
    width: '31%',
    minWidth: 90,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  paymentMethodCardDisabled: {
    opacity: 0.5,
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentMethodName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  paymentMethodNameSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  paymentMethodNameDisabled: {
    color: '#9CA3AF',
  },
  checkMark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  offlineBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  
  // Mobile Money Providers
  providersSection: {
    marginBottom: 16,
  },
  providersSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  providersScroll: {
    flexDirection: 'row',
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  providerChipTextSelected: {
    color: '#FFFFFF',
  },
  
  // Cash Input
  cashInputSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cashInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  cashInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  changeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickAmountBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  
  // KwikPay Placeholder
  kwikpayPlaceholder: {
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    borderStyle: 'dashed',
  },
  kwikpayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EC4899',
    marginTop: 8,
  },
  kwikpayDesc: {
    fontSize: 13,
    color: '#9D174D',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SalePaymentModal;
