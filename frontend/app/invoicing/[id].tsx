import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBusinessStore } from '../../src/store/businessStore';
import api from '../../src/api/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#EBF4FF',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

interface Payment {
  amount: number;
  date: string;
  method: string;
  reference?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_company_id?: string;
  customer_tax_id?: string;
  invoice_date: string;
  due_date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_total: number;
  discount_type: string | null;
  discount_value: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string;
  terms: string;
  currency: string;
  payments: Payment[];
  created_at: string;
}

export default function InvoiceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { formatCurrency, businessDetails } = useBusinessStore();
  
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const response = await api.get(`/invoices/${id}`);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id, fetchInvoice]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'sent': return COLORS.blue;
      case 'draft': return COLORS.gray;
      case 'overdue': return COLORS.danger;
      case 'partial': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.successLight;
      case 'sent': return COLORS.blueLight;
      case 'draft': return COLORS.lightGray;
      case 'overdue': return COLORS.dangerLight;
      case 'partial': return COLORS.warningLight;
      default: return COLORS.lightGray;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatAmount = (amount: number, currency?: string) => {
    const curr = currency || invoice?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/invoices/${id}/payment`, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined,
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');
      fetchInvoice();
      Alert.alert('Success', 'Payment recorded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice?.customer_email) {
      Alert.alert('No Email', 'Customer email is not available');
      return;
    }

    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from ${businessDetails?.name || 'Our Company'}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer_name},\n\n` +
      `Please find attached invoice ${invoice.invoice_number} for ${formatAmount(invoice.total)}.\n\n` +
      `Invoice Date: ${formatDate(invoice.invoice_date)}\n` +
      `Due Date: ${formatDate(invoice.due_date)}\n` +
      `Amount Due: ${formatAmount(invoice.balance_due)}\n\n` +
      `Thank you for your business!\n\n` +
      `Best regards,\n${businessDetails?.name || 'Our Team'}`
    );

    const mailtoUrl = `mailto:${invoice.customer_email}?subject=${subject}&body=${body}`;
    
    try {
      await Linking.openURL(mailtoUrl);
      // Mark as sent
      if (invoice.status === 'draft') {
        await api.post(`/invoices/${id}/send`);
        fetchInvoice();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open email client');
    }
    setShowActionsModal(false);
  };

  const generatePDF = async () => {
    if (!invoice) return;

    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatAmount(item.unit_price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.tax_rate}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">${formatAmount(item.amount)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #111827; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-name { font-size: 24px; font-weight: 700; color: #7C3AED; }
          .invoice-title { font-size: 32px; font-weight: 700; color: #111827; text-align: right; }
          .invoice-number { font-size: 14px; color: #6B7280; text-align: right; margin-top: 4px; }
          .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .status-paid { background: #D1FAE5; color: #10B981; }
          .status-sent { background: #EBF4FF; color: #2563EB; }
          .status-draft { background: #F3F4F6; color: #6B7280; }
          .status-overdue { background: #FEE2E2; color: #EF4444; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .info-box { flex: 1; }
          .info-label { font-size: 12px; color: #6B7280; text-transform: uppercase; margin-bottom: 8px; }
          .info-value { font-size: 14px; color: #111827; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #F9FAFB; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6B7280; border-bottom: 2px solid #E5E7EB; }
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
          .total-row.grand { border-bottom: none; border-top: 2px solid #111827; padding-top: 12px; margin-top: 8px; }
          .total-label { color: #6B7280; }
          .total-value { font-weight: 600; }
          .grand .total-label, .grand .total-value { font-size: 18px; color: #111827; font-weight: 700; }
          .notes { margin-top: 40px; padding: 20px; background: #F9FAFB; border-radius: 8px; }
          .notes-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
          .notes-text { font-size: 13px; color: #6B7280; line-height: 1.6; }
          .footer { margin-top: 60px; text-align: center; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${businessDetails?.name || 'Company Name'}</div>
            <div style="font-size: 13px; color: #6B7280; margin-top: 8px;">
              ${businessDetails?.address || ''}<br>
              ${businessDetails?.phone || ''}<br>
              ${businessDetails?.email || ''}
            </div>
          </div>
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${invoice.invoice_number}</div>
            <div style="text-align: right; margin-top: 12px;">
              <span class="status status-${invoice.status}">${invoice.status}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">Bill To</div>
            <div class="info-value">
              <strong style="font-size: 15px; display: block; margin-bottom: 8px;">${invoice.customer_name}</strong>
              ${invoice.customer_address ? `
              <div style="margin-bottom: 6px; white-space: pre-line;">${invoice.customer_address.replace(/,\s*/g, '\n')}</div>
              ` : ''}
              ${invoice.customer_phone ? `
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280;">Phone:</span> ${invoice.customer_phone}
              </div>
              ` : ''}
              ${invoice.customer_email ? `
              <div style="margin-bottom: 4px;">
                <span style="color: #6B7280;">Email:</span> ${invoice.customer_email}
              </div>
              ` : ''}
              ${(invoice.customer_company_id || invoice.customer_tax_id) ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E5E7EB;">
                ${invoice.customer_company_id ? `
                <div style="margin-bottom: 4px;">
                  <span style="color: #6B7280;">Company Reg. No:</span> ${invoice.customer_company_id}
                </div>
                ` : ''}
                ${invoice.customer_tax_id ? `
                <div>
                  <span style="color: #6B7280;">Tax/VAT ID:</span> ${invoice.customer_tax_id}
                </div>
                ` : ''}
              </div>
              ` : ''}
            </div>
          </div>
          <div class="info-box" style="text-align: right;">
            <div class="info-label">Invoice Details</div>
            <div class="info-value">
              <div style="margin-bottom: 6px;">
                <span style="color: #6B7280;">Invoice Date:</span><br>
                <strong>${formatDate(invoice.invoice_date)}</strong>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="color: #6B7280;">Due Date:</span><br>
                <strong>${formatDate(invoice.due_date)}</strong>
              </div>
              <div>
                <span style="color: #6B7280;">Currency:</span><br>
                <strong>${invoice.currency || 'USD'}</strong>
              </div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: center;">Tax</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal</span>
            <span class="total-value">${formatAmount(invoice.subtotal)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Tax</span>
            <span class="total-value">${formatAmount(invoice.tax_total)}</span>
          </div>
          ${invoice.discount_amount > 0 ? `
          <div class="total-row">
            <span class="total-label">Discount</span>
            <span class="total-value" style="color: #10B981;">-${formatAmount(invoice.discount_amount)}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span class="total-label">Total</span>
            <span class="total-value">${formatAmount(invoice.total)}</span>
          </div>
          ${invoice.amount_paid > 0 ? `
          <div class="total-row">
            <span class="total-label">Amount Paid</span>
            <span class="total-value" style="color: #10B981;">${formatAmount(invoice.amount_paid)}</span>
          </div>
          <div class="total-row">
            <span class="total-label" style="font-weight: 600;">Balance Due</span>
            <span class="total-value" style="color: #EF4444; font-weight: 700;">${formatAmount(invoice.balance_due)}</span>
          </div>
          ` : ''}
        </div>

        ${invoice.notes ? `
        <div class="notes">
          <div class="notes-title">Notes</div>
          <div class="notes-text">${invoice.notes}</div>
        </div>
        ` : ''}

        ${invoice.terms ? `
        <div class="notes" style="margin-top: 20px;">
          <div class="notes-title">Terms & Conditions</div>
          <div class="notes-text">${invoice.terms}</div>
        </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; text-transform: uppercase;">Payment Details</div>
            <div style="font-size: 13px; color: #6B7280; line-height: 1.6; white-space: pre-line;">
              ${businessDetails?.payment_details || `Bank: Example Bank
Account Name: ${businessDetails?.name || 'Company Name'}
Account No: 1234567890
Swift/BIC: EXAMPLEXXX`}
            </div>
          </div>
          <div style="flex: 1; text-align: right;">
            <div style="font-size: 13px; color: #6B7280;">
              ${businessDetails?.footer_message || 'Thank you for your business!'}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const handleDownloadPDF = async () => {
    setShowActionsModal(false);
    try {
      const html = await generatePDF();
      if (!html) return;

      if (Platform.OS === 'web') {
        // For web, open print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // For mobile, generate PDF and share
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${invoice?.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('PDF Error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${invoice?.invoice_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/invoices/${id}`);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete invoice');
            }
          },
        },
      ]
    );
    setShowActionsModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>Invoice not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{invoice.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(invoice.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn} onPress={() => setShowActionsModal(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Summary */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>{formatAmount(invoice.total)}</Text>
          {invoice.balance_due > 0 && invoice.balance_due < invoice.total && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance Due:</Text>
              <Text style={styles.balanceValue}>{formatAmount(invoice.balance_due)}</Text>
            </View>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={20} color={COLORS.gray} />
              <Text style={[styles.infoText, { fontWeight: '600', fontSize: 16 }]}>{invoice.customer_name}</Text>
            </View>
            {invoice.customer_address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={COLORS.gray} />
                <Text style={[styles.infoText, { lineHeight: 22 }]}>{invoice.customer_address.replace(/,\s*/g, '\n')}</Text>
              </View>
            )}
            {invoice.customer_phone && (
              <TouchableOpacity 
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${invoice.customer_phone}`)}
              >
                <Ionicons name="call-outline" size={20} color={COLORS.gray} />
                <Text style={[styles.infoText, styles.linkText]}>{invoice.customer_phone}</Text>
              </TouchableOpacity>
            )}
            {invoice.customer_email && (
              <TouchableOpacity 
                style={styles.infoRow}
                onPress={() => Linking.openURL(`mailto:${invoice.customer_email}`)}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} />
                <Text style={[styles.infoText, styles.linkText]}>{invoice.customer_email}</Text>
              </TouchableOpacity>
            )}
            {(invoice.customer_company_id || invoice.customer_tax_id) && (
              <View style={styles.companyInfoDivider}>
                {invoice.customer_company_id && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      <Text style={{ color: COLORS.gray }}>Company Reg: </Text>
                      {invoice.customer_company_id}
                    </Text>
                  </View>
                )}
                {invoice.customer_tax_id && (
                  <View style={styles.infoRow}>
                    <Ionicons name="receipt-outline" size={20} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      <Text style={{ color: COLORS.gray }}>Tax/VAT ID: </Text>
                      {invoice.customer_tax_id}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
              <Text style={styles.dateLabel}>Invoice Date</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View style={styles.dateBox}>
              <Ionicons name="time-outline" size={24} color={invoice.status === 'overdue' ? COLORS.danger : COLORS.warning} />
              <Text style={styles.dateLabel}>Due Date</Text>
              <Text style={[styles.dateValue, invoice.status === 'overdue' && styles.overdueText]}>
                {formatDate(invoice.due_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.itemsCard}>
            {invoice.items.map((item, index) => (
              <View key={index} style={[styles.itemRow, index > 0 && styles.itemRowBorder]}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} × {formatAmount(item.unit_price)}
                    {item.tax_rate > 0 && ` (${item.tax_rate}% tax)`}
                  </Text>
                </View>
                <Text style={styles.itemAmount}>{formatAmount(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatAmount(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatAmount(invoice.tax_total)}</Text>
            </View>
            {invoice.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, styles.discountValue]}>-{formatAmount(invoice.discount_amount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatAmount(invoice.total)}</Text>
            </View>
            {invoice.amount_paid > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Paid</Text>
                  <Text style={[styles.totalValue, styles.paidValue]}>{formatAmount(invoice.amount_paid)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.balanceDueLabel}>Balance Due</Text>
                  <Text style={styles.balanceDueValue}>{formatAmount(invoice.balance_due)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          </View>
        )}

        {/* Terms */}
        {invoice.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{invoice.terms}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      {invoice.status !== 'paid' && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.recordPaymentBtn}
            onPress={() => setShowPaymentModal(true)}
          >
            <Ionicons name="card-outline" size={20} color={COLORS.white} />
            <Text style={styles.recordPaymentText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Max: ${formatAmount(invoice.balance_due)}`}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodsRow}>
              {[
                { key: 'bank_transfer', label: 'Bank', icon: 'business-outline' },
                { key: 'cash', label: 'Cash', icon: 'cash-outline' },
                { key: 'card', label: 'Card', icon: 'card-outline' },
                { key: 'mobile', label: 'Mobile', icon: 'phone-portrait-outline' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.methodBtn,
                    paymentMethod === method.key && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod(method.key)}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={20}
                    color={paymentMethod === method.key ? COLORS.white : COLORS.gray}
                  />
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === method.key && styles.methodBtnTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reference (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Transaction ID or reference"
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholderTextColor={COLORS.gray}
            />

            <TouchableOpacity
              style={styles.submitPaymentBtn}
              onPress={handleRecordPayment}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitPaymentText}>Record Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Actions Modal */}
      <Modal visible={showActionsModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <View style={styles.actionsContent}>
            <TouchableOpacity style={styles.actionItem} onPress={handleDownloadPDF}>
              <Ionicons name="download-outline" size={24} color={COLORS.primary} />
              <Text style={styles.actionText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleSendInvoice}>
              <Ionicons name="mail-outline" size={24} color={COLORS.blue} />
              <Text style={styles.actionText}>Send via Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setShowActionsModal(false);
                router.push(`/invoicing/edit/${id}`);
              }}
            >
              <Ionicons name="create-outline" size={24} color={COLORS.warning} />
              <Text style={styles.actionText}>Edit Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, styles.actionItemDanger]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
              <Text style={[styles.actionText, styles.actionTextDanger]}>Delete Invoice</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: COLORS.gray, marginTop: 16 },
  backButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  backButtonText: { color: COLORS.white, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.dark },
  moreBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  content: { flex: 1, padding: 16 },

  amountCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  amountValue: { fontSize: 36, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  balanceValue: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginLeft: 8 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  infoText: { fontSize: 15, color: COLORS.dark, flex: 1 },
  linkText: { color: COLORS.primary },
  companyInfoDivider: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },

  datesRow: { flexDirection: 'row', gap: 12 },
  dateBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center' },
  dateLabel: { fontSize: 12, color: COLORS.gray, marginTop: 8 },
  dateValue: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginTop: 4 },
  overdueText: { color: COLORS.danger },

  itemsCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  itemInfo: { flex: 1 },
  itemDescription: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  itemMeta: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '700', color: COLORS.dark },

  totalsCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontSize: 14, color: COLORS.gray },
  totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  discountValue: { color: COLORS.success },
  paidValue: { color: COLORS.success },
  grandTotalRow: { borderTopWidth: 2, borderTopColor: COLORS.dark, marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  balanceDueLabel: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
  balanceDueValue: { fontSize: 16, fontWeight: '700', color: COLORS.danger },

  notesCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  notesText: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },

  bottomActions: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  recordPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14 },
  recordPaymentText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.dark },

  methodsRow: { flexDirection: 'row', gap: 10 },
  methodBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.lightGray, gap: 4 },
  methodBtnActive: { backgroundColor: COLORS.primary },
  methodBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  methodBtnTextActive: { color: COLORS.white },

  submitPaymentBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  submitPaymentText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  actionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionsContent: { backgroundColor: COLORS.white, borderRadius: 20, padding: 8, width: '80%', maxWidth: 320 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12 },
  actionItemDanger: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionText: { fontSize: 16, fontWeight: '500', color: COLORS.dark },
  actionTextDanger: { color: COLORS.danger },
});
