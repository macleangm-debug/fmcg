import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBusinessStore } from '../../src/store/businessStore';
import api from '../../src/api/client';

const COLORS = {
  primary: '#EF4444',
  success: '#10B981',
  blue: '#2563EB',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
};

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
}

export default function CreateInvoice() {
  const router = useRouter();
  const { formatCurrency } = useBusinessStore();
  
  const [submitting, setSubmitting] = useState(false);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Invoice details
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within 30 days');
  
  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', unit_price: '', tax_rate: '0' }
  ]);
  
  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | null>(null);
  const [discountValue, setDiscountValue] = useState('');

  const addLineItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', quantity: '1', unit_price: '', tax_rate: '0' }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const tax = parseFloat(item.tax_rate) || 0;
      return sum + (qty * price * tax / 100);
    }, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    const discountVal = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      return subtotal * discountVal / 100;
    }
    return discountVal;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - calculateDiscount();
  };

  const handleSave = async (send: boolean = false) => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    
    const validItems = items.filter(item => 
      item.description.trim() && parseFloat(item.unit_price) > 0
    );
    
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item with description and price');
      return;
    }
    
    setSubmitting(true);
    try {
      const invoiceData = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        due_date: dueDate || undefined,
        items: validItems.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_rate: parseFloat(item.tax_rate) || 0,
        })),
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
      };
      
      const response = await api.post('/invoices', invoiceData);
      
      if (send) {
        await api.post(`/invoices/${response.data.id}/send`);
        Alert.alert('Success', `Invoice ${response.data.invoice_number} created and sent!`);
      } else {
        Alert.alert('Success', `Invoice ${response.data.invoice_number} created as draft`);
      }
      
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const renderLineItem = (item: LineItem, index: number) => (
    <View key={item.id} style={styles.lineItem}>
      <View style={styles.lineItemHeader}>
        <Text style={styles.lineItemNumber}>Item {index + 1}</Text>
        {items.length > 1 && (
          <TouchableOpacity onPress={() => removeLineItem(item.id)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={item.description}
        onChangeText={(value) => updateLineItem(item.id, 'description', value)}
        placeholderTextColor={COLORS.gray}
      />
      
      <View style={styles.row}>
        <View style={styles.thirdInput}>
          <Text style={styles.inputLabel}>Qty</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            value={item.quantity}
            onChangeText={(value) => updateLineItem(item.id, 'quantity', value)}
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray}
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.inputLabel}>Unit Price</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={item.unit_price}
            onChangeText={(value) => updateLineItem(item.id, 'unit_price', value)}
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray}
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.inputLabel}>Tax %</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={item.tax_rate}
            onChangeText={(value) => updateLineItem(item.id, 'tax_rate', value)}
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Invoice</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Customer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Customer name"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor={COLORS.gray}
            />
            
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="customer@email.com"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.gray}
            />
            
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+255 XXX XXX XXX"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray}
            />
            
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Billing address"
              value={customerAddress}
              onChangeText={setCustomerAddress}
              multiline
              numberOfLines={2}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            
            <Text style={styles.inputLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={setDueDate}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={addLineItem}>
                <Ionicons name="add" size={20} color={COLORS.primary} />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            
            {items.map((item, index) => renderLineItem(item, index))}
          </View>

          {/* Discount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount</Text>
            <View style={styles.discountRow}>
              <TouchableOpacity
                style={[styles.discountTypeBtn, discountType === 'percentage' && styles.discountTypeBtnActive]}
                onPress={() => setDiscountType(discountType === 'percentage' ? null : 'percentage')}
              >
                <Ionicons name="pricetag" size={18} color={discountType === 'percentage' ? '#FFF' : COLORS.gray} />
                <Text style={[styles.discountTypeText, discountType === 'percentage' && styles.discountTypeTextActive]}>%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.discountTypeBtn, discountType === 'fixed' && styles.discountTypeBtnActive]}
                onPress={() => setDiscountType(discountType === 'fixed' ? null : 'fixed')}
              >
                <Ionicons name="cash" size={18} color={discountType === 'fixed' ? '#FFF' : COLORS.gray} />
                <Text style={[styles.discountTypeText, discountType === 'fixed' && styles.discountTypeTextActive]}>Fixed</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0"
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                editable={discountType !== null}
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          {/* Notes & Terms */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes for customer"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.gray}
            />
            
            <Text style={styles.inputLabel}>Terms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Payment terms"
              value={terms}
              onChangeText={setTerms}
              multiline
              numberOfLines={2}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateSubtotal())}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateTax())}</Text>
            </View>
            {calculateDiscount() > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: COLORS.success }]}>-{formatCurrency(calculateDiscount())}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(calculateTotal())}</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.saveDraftBtn} 
            onPress={() => handleSave(false)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.dark} />
            ) : (
              <Text style={styles.saveDraftText}>Save Draft</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={() => handleSave(true)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#FFF" />
                <Text style={styles.sendText}>Save & Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  
  content: { flex: 1, padding: 16 },
  
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  thirdInput: { flex: 1 },
  
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
  lineItem: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, marginTop: 16 },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineItemNumber: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  
  discountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discountTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.lightGray },
  discountTypeBtnActive: { backgroundColor: COLORS.primary },
  discountTypeText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  discountTypeTextActive: { color: '#FFF' },
  
  totalsSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: COLORS.gray },
  totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 8 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  saveDraftBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.lightGray },
  saveDraftText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  sendBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary },
  sendText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
