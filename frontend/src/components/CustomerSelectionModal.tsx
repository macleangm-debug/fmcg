import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, useWindowDimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  profile_complete?: boolean;
  total_orders?: number;
  total_purchases?: number;
}

interface CustomerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: (customer: { name: string; phone: string }) => Promise<Customer>;
  searchCustomer: (phone: string) => Promise<Customer | null>;
  countryCode?: string;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({
  visible, onClose, onSelectCustomer, onCreateCustomer, searchCustomer, countryCode = '+255',
}) => {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const isMobile = !isDesktop;
  
  // Animation for bottom sheet
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    if (visible && isMobile) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, isMobile, height]);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  const resetForm = () => {
    setPhoneSearch(''); setSearchResult(null); setShowAddForm(false);
    setNewName(''); setNewPhone(''); setError('');
  };
  
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

  const handleSearch = async (phone: string) => {
    setPhoneSearch(phone); setSearchResult(null); setError('');
    if (phone.length >= 3) {
      setSearching(true);
      try {
        const result = await searchCustomer(phone);
        setSearchResult(result);
      } catch (err) { console.error('Search failed:', err); }
      finally { setSearching(false); }
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer); resetForm(); onClose();
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim()) { setError('Name is required'); return; }
    if (!newPhone.trim() || newPhone.length < 9) { setError('Valid phone number is required'); return; }
    setSaving(true); setError('');
    try {
      const fullPhone = countryCode + newPhone.replace(/^0+/, '');
      const newCustomer = await onCreateCustomer({ name: newName.trim(), phone: fullPhone });
      onSelectCustomer(newCustomer); resetForm(); onClose();
    } catch (err: any) { setError(err?.message || 'Failed to create customer'); }
    finally { setSaving(false); }
  };

  const switchToAddForm = () => { setNewPhone(phoneSearch); setShowAddForm(true); };
  
  // Render modal content (shared between layouts)
  const renderContent = () => (
    <>
      {!showAddForm ? (
        <>
          <View style={styles.searchRow}>
            <View style={styles.countryCode}><Text style={styles.countryCodeText}>{countryCode}</Text></View>
            <TextInput style={styles.searchInput} placeholder="Enter phone number" value={phoneSearch} onChangeText={handleSearch} keyboardType="phone-pad" autoFocus placeholderTextColor="#9CA3AF" />
            {searching && <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 12 }} />}
          </View>

          {searchResult && (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectCustomer(searchResult)} activeOpacity={0.7}>
              <View style={styles.resultIcon}><Ionicons name="person" size={20} color="#3B82F6" /></View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{searchResult.name}</Text>
                <Text style={styles.resultPhone}>{searchResult.phone}</Text>
                {searchResult.total_orders && searchResult.total_orders > 0 && (
                  <Text style={styles.resultOrders}>{searchResult.total_orders} previous order{searchResult.total_orders > 1 ? 's' : ''}</Text>
                )}
              </View>
              <View style={styles.selectBtn}><Text style={styles.selectBtnText}>Select</Text></View>
            </TouchableOpacity>
          )}

          {phoneSearch.length >= 3 && !searchResult && !searching && (
            <View style={styles.noResult}>
              <View style={styles.noResultIconContainer}><Ionicons name="person-add-outline" size={32} color="#9CA3AF" /></View>
              <Text style={styles.noResultText}>No customer found</Text>
              <Text style={styles.noResultSubtext}>Add them quickly with just name & phone</Text>
              <TouchableOpacity style={styles.addBtn} onPress={switchToAddForm} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.addBtnText}>Add New Customer</Text>
              </TouchableOpacity>
            </View>
          )}

          {phoneSearch.length < 3 && !searching && (
            <View style={styles.hintContainer}>
              <Ionicons name="search-outline" size={20} color="#9CA3AF" /><Text style={styles.hintText}>Enter at least 3 digits to search</Text>
            </View>
          )}
        </>
      ) : (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.quickAddBanner}>
                  <Ionicons name="flash" size={16} color="#F59E0B" />
                  <Text style={styles.quickAddBannerText}>Quick add with minimal info. Complete profile later.</Text>
                </View>
                {error ? (<View style={styles.errorContainer}><Ionicons name="alert-circle" size={16} color="#DC2626" /><Text style={styles.errorText}>{error}</Text></View>) : null}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <TextInput style={styles.formInput} placeholder="Customer name" value={newName} onChangeText={setNewName} placeholderTextColor="#9CA3AF" autoFocus />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Phone *</Text>
                  <View style={styles.searchRow}>
                    <View style={styles.countryCode}><Text style={styles.countryCodeText}>{countryCode}</Text></View>
                    <TextInput style={styles.phoneInput} placeholder="712345678" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
                  </View>
                </View>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddForm(false)}><Text style={styles.cancelBtnText}>Back</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, (!newName.trim() || !newPhone.trim()) && styles.saveBtnDisabled]} onPress={handleCreateCustomer} disabled={!newName.trim() || !newPhone.trim() || saving} activeOpacity={0.8}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (<><Ionicons name="checkmark" size={18} color="#FFFFFF" /><Text style={styles.saveBtnText}>Add & Select</Text></>)}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </>
      );
  
  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={handleClose} />
          <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handleContainer}><View style={styles.handle} /></View>
            <View style={styles.header}>
              <Text style={styles.title}>{showAddForm ? 'Quick Add Customer' : 'Select Customer'}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {renderContent()}
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{showAddForm ? 'Quick Add Customer' : 'Select Customer'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Bottom sheet styles
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  bottomSheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2 },
  bottomSheetContent: { paddingHorizontal: 20, paddingBottom: 20 },
  
  // Centered modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  countryCode: { paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  countryCodeText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  searchInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#111827' },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#111827' },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  resultIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  resultPhone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  resultOrders: { fontSize: 12, color: '#059669', marginTop: 4 },
  selectBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  selectBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  noResult: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noResultIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  noResultText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  noResultSubtext: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, marginTop: 8 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  hintContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  hintText: { fontSize: 14, color: '#9CA3AF' },
  quickAddBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  quickAddBannerText: { fontSize: 13, color: '#92400E', flex: 1 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  formInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#111827' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FFFFFF' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  saveBtnDisabled: { backgroundColor: '#9CA3AF' },
});

export default CustomerSelectionModal;
