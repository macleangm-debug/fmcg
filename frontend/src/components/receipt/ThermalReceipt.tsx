import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

export interface ReceiptData {
  // Business Info
  businessName: string;
  businessLogo?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  taxId?: string;
  
  // Receipt Info
  receiptNumber: string;
  date: string;
  time: string;
  cashierName?: string;
  
  // Items
  items: ReceiptItem[];
  
  // Totals
  subtotal: number;
  taxTotal: number;
  taxRate?: number;
  discount: number;
  grandTotal: number;
  
  // Payment
  paymentMethod: string;
  paymentDetails?: string;
  amountPaid?: number;
  change?: number;
  
  // Customer
  customerName?: string;
  customerPhone?: string;
  
  // Social & QR
  socialMedia?: {
    platform: string;
    handle: string;
  }[];
  qrCodeData?: string;
  qrCodeType?: 'receipt' | 'website' | 'feedback' | 'whatsapp' | 'location' | 'custom';
  
  // Custom Message
  thankYouMessage?: string;
  
  // Currency
  currency: string;
  currencySymbol: string;
}

// RetailPro Logo URL
const RETAILPRO_LOGO = 'https://static.prod-images.emergentagent.com/jobs/2af44a46-db88-4b9f-af8e-0fe7eac67172/images/efbd16f8763434ce8db40b54d4063fe3261ffdbe18e32f42bf103d471b40084d.png';

interface ThermalReceiptProps {
  data: ReceiptData;
  onPrint?: () => void;
  onShare?: (type: 'whatsapp' | 'image' | 'pdf') => void;
  showActions?: boolean;
  embedded?: boolean; // If true, won't wrap in its own ScrollView
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  data,
  onPrint,
  onShare,
  showActions = true,
  embedded = false,
}) => {
  const receiptRef = useRef<View>(null);
  
  const formatCurrency = (amount: number) => {
    return `${data.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleShareWhatsApp = async () => {
    // Generate receipt text for WhatsApp
    const receiptText = generateReceiptText();
    
    if (Platform.OS === 'web') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      try {
        await Share.share({
          message: receiptText,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share receipt');
      }
    }
    
    onShare?.('whatsapp');
  };

  const generateReceiptText = () => {
    let text = '';
    text += `*${data.businessName}*\n`;
    if (data.businessAddress) text += `${data.businessAddress}\n`;
    if (data.businessPhone) text += `Tel: ${data.businessPhone}\n`;
    text += `\n`;
    text += `Receipt: ${data.receiptNumber}\n`;
    text += `Date: ${data.date} ${data.time}\n`;
    if (data.cashierName) text += `Cashier: ${data.cashierName}\n`;
    text += `\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    data.items.forEach(item => {
      text += `${item.name}\n`;
      text += `  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}\n`;
    });
    
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Subtotal: ${formatCurrency(data.subtotal)}\n`;
    if (data.taxTotal > 0) {
      text += `Tax${data.taxRate ? ` (${data.taxRate}%)` : ''}: ${formatCurrency(data.taxTotal)}\n`;
    }
    if (data.discount > 0) {
      text += `Discount: -${formatCurrency(data.discount)}\n`;
    }
    text += `*TOTAL: ${formatCurrency(data.grandTotal)}*\n`;
    text += `\n`;
    text += `Payment: ${data.paymentMethod}\n`;
    if (data.customerName) text += `Customer: ${data.customerName}\n`;
    text += `\n`;
    if (data.thankYouMessage) text += `_${data.thankYouMessage}_\n`;
    
    return text;
  };

  const receiptContent = (
    <View ref={receiptRef} style={styles.receipt}>
      {/* Header with Logo */}
      <View style={styles.header}>
        {/* RetailPro Logo or Business Logo */}
        <Image 
          source={{ uri: data.businessLogo || RETAILPRO_LOGO }}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.businessName}>{data.businessName}</Text>
        {data.businessAddress && (
          <Text style={styles.businessInfo}>{data.businessAddress}</Text>
        )}
        {data.businessPhone && (
          <Text style={styles.businessInfo}>Tel: {data.businessPhone}</Text>
        )}
        {data.taxId && (
          <Text style={styles.businessInfo}>TIN: {data.taxId}</Text>
        )}
      </View>

          {/* Divider */}
          <Text style={styles.divider}>{'━'.repeat(32)}</Text>

          {/* Receipt Details */}
          <View style={styles.receiptDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Receipt #:</Text>
              <Text style={styles.detailValue}>{data.receiptNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{data.date} {data.time}</Text>
            </View>
            {data.cashierName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cashier:</Text>
                <Text style={styles.detailValue}>{data.cashierName}</Text>
              </View>
            )}
            {data.customerName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{data.customerName}</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <Text style={styles.divider}>{'━'.repeat(32)}</Text>

          {/* Items Header */}
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemHeaderText, { flex: 2 }]}>Item</Text>
            <Text style={[styles.itemHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.itemHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
          </View>

          {/* Items */}
          {data.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQty}>{item.quantity}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.total)}</Text>
              </View>
              {item.discount && item.discount > 0 && (
                <Text style={styles.itemDiscount}>Discount: -{formatCurrency(item.discount)}</Text>
              )}
            </View>
          ))}

          {/* Divider */}
          <Text style={styles.divider}>{'━'.repeat(32)}</Text>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.taxTotal > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax{data.taxRate ? ` (${data.taxRate}%)` : ''}
                </Text>
                <Text style={styles.totalValue}>{formatCurrency(data.taxTotal)}</Text>
              </View>
            )}
            {data.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, styles.discountText]}>Discount</Text>
                <Text style={[styles.totalValue, styles.discountText]}>-{formatCurrency(data.discount)}</Text>
              </View>
            )}
            <View style={styles.dividerThin} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.grandTotal)}</Text>
            </View>
          </View>

          {/* Divider */}
          <Text style={styles.divider}>{'━'.repeat(32)}</Text>

          {/* Payment Info */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>{data.paymentMethod}</Text>
            </View>
            {data.amountPaid && data.amountPaid > data.grandTotal && (
              <>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount Paid</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(data.amountPaid)}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Change</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(data.change || 0)}</Text>
                </View>
              </>
            )}
          </View>

          {/* QR Code */}
          {data.qrCodeData && (
            <View style={styles.qrSection}>
              <QRCode
                value={data.qrCodeData}
                size={80}
                backgroundColor="white"
                color="black"
              />
              <Text style={styles.qrHint}>
                {data.qrCodeType === 'receipt' && 'Scan for digital receipt'}
                {data.qrCodeType === 'website' && 'Visit our website'}
                {data.qrCodeType === 'feedback' && 'Leave us a review'}
                {data.qrCodeType === 'whatsapp' && 'Chat with us'}
                {data.qrCodeType === 'location' && 'Find us on map'}
                {(!data.qrCodeType || data.qrCodeType === 'custom') && 'Scan QR code'}
              </Text>
            </View>
          )}

          {/* Social Media */}
          {data.socialMedia && data.socialMedia.length > 0 && (
            <View style={styles.socialSection}>
              {data.socialMedia.map((social, index) => (
                <Text key={index} style={styles.socialText}>
                  {social.platform === 'instagram' && '📷'}
                  {social.platform === 'facebook' && '👍'}
                  {social.platform === 'twitter' && '🐦'}
                  {social.platform === 'tiktok' && '🎵'}
                  {' '}{social.handle}
                </Text>
              ))}
            </View>
          )}

          {/* Website */}
          {data.businessWebsite && (
            <Text style={styles.websiteText}>🌐 {data.businessWebsite}</Text>
          )}

          {/* Thank You Message */}
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouText}>
              {data.thankYouMessage || 'Thank you for your business!'}
            </Text>
            <Text style={styles.visitAgainText}>Please visit again</Text>
          </View>

          {/* Footer Decorative */}
          <Text style={styles.footerDecor}>{'~'.repeat(32)}</Text>
        </View>
    );

  return (
    <View style={styles.container}>
      {/* Receipt Content - wrapped in ScrollView only if not embedded */}
      {embedded ? (
        receiptContent
      ) : (
        <ScrollView 
          style={styles.receiptScroll}
          contentContainerStyle={styles.receiptContent}
          showsVerticalScrollIndicator={false}
        >
          {receiptContent}
        </ScrollView>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={onPrint}
          >
            <Ionicons name="print-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Print</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={handleShareWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => onShare?.('image')}
          >
            <Ionicons name="image-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.pdfButton]}
            onPress={() => onShare?.('pdf')}
          >
            <Ionicons name="document-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  receiptScroll: {
    flex: 1,
  },
  receiptContent: {
    padding: 16,
    alignItems: 'center',
  },
  receipt: {
    width: 280, // 80mm thermal paper width approximation
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 4,
    // Paper texture effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  businessInfo: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  
  // Dividers
  divider: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 8,
    letterSpacing: -1,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  
  // Receipt Details
  receiptDetails: {
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  detailLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailValue: {
    fontSize: 10,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },
  
  // Items
  itemsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 8,
  },
  itemHeaderText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textTransform: 'uppercase',
  },
  itemRow: {
    marginBottom: 8,
  },
  itemNameContainer: {
    marginBottom: 2,
  },
  itemName: {
    fontSize: 11,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQty: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemPrice: {
    fontSize: 10,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },
  itemDiscount: {
    fontSize: 9,
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontStyle: 'italic',
  },
  
  // Totals
  totalsSection: {
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  totalValue: {
    fontSize: 10,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },
  discountText: {
    color: '#10B981',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  
  // Payment
  paymentSection: {
    marginVertical: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  paymentLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  paymentValue: {
    fontSize: 10,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  
  // QR Code
  qrSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  qrHint: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  
  // Social
  socialSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  socialText: {
    fontSize: 9,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 1,
  },
  websiteText: {
    fontSize: 9,
    color: '#3B82F6',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 4,
  },
  
  // Thank You
  thankYouSection: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  thankYouText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontStyle: 'italic',
  },
  visitAgainText: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  footerDecor: {
    fontSize: 10,
    color: '#E5E7EB',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
    letterSpacing: -1,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  printButton: {
    backgroundColor: '#374151',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  shareButton: {
    backgroundColor: '#3B82F6',
  },
  pdfButton: {
    backgroundColor: '#EF4444',
  },
});

export default ThermalReceipt;
