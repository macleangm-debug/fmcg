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

interface VirtualCard {
  card_id: string;
  customer_name: string;
  card_number_masked: string;
  expiry_month: number;
  expiry_year: number;
  currency: string;
  spending_limit: number;
  current_balance: number;
  total_spent: number;
  status: string;
  created_at: string;
}

export default function VirtualAccountsPage() {
  const { formatNumber } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [creating, setCreating] = useState(false);
  const [funding, setFunding] = useState(false);

  // Create form
  const [customerName, setCustomerName] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('1000');

  // Fund form
  const [fundAmount, setFundAmount] = useState('');

  const fetchCards = useCallback(async () => {
    try {
      const response = await api.get('/kwikpay/virtual-cards');
      setCards(response.data?.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCreateCard = async () => {
    if (!customerName) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/virtual-cards', {
        customer_name: customerName,
        currency: 'USD',
        spending_limit: parseFloat(spendingLimit) || 1000,
        valid_months: 12,
      });
      Alert.alert('Success', 'Virtual card created!');
      setShowCreateModal(false);
      setCustomerName('');
      setSpendingLimit('1000');
      fetchCards();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create card');
    } finally {
      setCreating(false);
    }
  };

  const handleFundCard = async () => {
    if (!selectedCard || !fundAmount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    setFunding(true);
    try {
      await api.post(`/kwikpay/virtual-cards/${selectedCard.card_id}/fund`, {
        amount: parseFloat(fundAmount),
      });
      Alert.alert('Success', 'Card funded successfully!');
      setShowFundModal(false);
      setFundAmount('');
      setSelectedCard(null);
      fetchCards();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fund card');
    } finally {
      setFunding(false);
    }
  };

  const handleFreezeCard = async (cardId: string) => {
    try {
      await api.post(`/kwikpay/virtual-cards/${cardId}/freeze`);
      fetchCards();
    } catch (error) {
      Alert.alert('Error', 'Failed to freeze card');
    }
  };

  const handleUnfreezeCard = async (cardId: string) => {
    try {
      await api.post(`/kwikpay/virtual-cards/${cardId}/unfreeze`);
      fetchCards();
    } catch (error) {
      Alert.alert('Error', 'Failed to unfreeze card');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'frozen': return COLORS.secondary;
      case 'cancelled': return COLORS.danger;
      case 'expired': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primaryLight;
      case 'frozen': return COLORS.secondaryLight;
      case 'cancelled': return COLORS.dangerLight;
      case 'expired': return COLORS.warningLight;
      default: return COLORS.lightGray;
    }
  };

  const totalBalance = cards.filter(c => c.status === 'active').reduce((a, c) => a + c.current_balance, 0);
  const totalSpent = cards.reduce((a, c) => a + c.total_spent, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading virtual cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchCards} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Virtual Cards</Text>
            <Text style={styles.pageSubtitle}>Issue and manage virtual cards</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="card" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>Issue Card</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="card" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{cards.length}</Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="wallet" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>${formatNumber(totalBalance)}</Text>
            <Text style={styles.statLabel}>Total Balance</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="trending-up" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>${formatNumber(totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Cards List */}
        <Text style={styles.sectionTitle}>Issued Cards</Text>
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Virtual Cards</Text>
            <Text style={styles.emptyText}>Issue your first virtual card to get started</Text>
          </View>
        ) : (
          cards.map((card) => (
            <View key={card.card_id} style={styles.cardItem}>
              <View style={styles.cardVisual}>
                <View style={styles.cardTop}>
                  <View style={styles.cardChip}>
                    <Ionicons name="wifi" size={16} color={COLORS.white} style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(card.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(card.status) }]}>
                      {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardNumber}>{card.card_number_masked}</Text>
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.cardLabel}>Card Holder</Text>
                    <Text style={styles.cardValue}>{card.customer_name}</Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>Expires</Text>
                    <Text style={styles.cardValue}>{card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year % 100}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.cardDetailRow}>
                  <View style={styles.cardDetail}>
                    <Text style={styles.cardDetailLabel}>Balance</Text>
                    <Text style={styles.cardDetailValue}>${formatNumber(card.current_balance)}</Text>
                  </View>
                  <View style={styles.cardDetail}>
                    <Text style={styles.cardDetailLabel}>Limit</Text>
                    <Text style={styles.cardDetailValue}>${formatNumber(card.spending_limit)}</Text>
                  </View>
                  <View style={styles.cardDetail}>
                    <Text style={styles.cardDetailLabel}>Spent</Text>
                    <Text style={styles.cardDetailValue}>${formatNumber(card.total_spent)}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => {
                      setSelectedCard(card);
                      setShowFundModal(true);
                    }}
                  >
                    <Ionicons name="add-circle" size={16} color={COLORS.primary} />
                    <Text style={[styles.cardActionText, { color: COLORS.primary }]}>Fund</Text>
                  </TouchableOpacity>
                  {card.status === 'active' ? (
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => handleFreezeCard(card.card_id)}
                    >
                      <Ionicons name="snow" size={16} color={COLORS.secondary} />
                      <Text style={[styles.cardActionText, { color: COLORS.secondary }]}>Freeze</Text>
                    </TouchableOpacity>
                  ) : card.status === 'frozen' && (
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => handleUnfreezeCard(card.card_id)}
                    >
                      <Ionicons name="sunny" size={16} color={COLORS.warning} />
                      <Text style={[styles.cardActionText, { color: COLORS.warning }]}>Unfreeze</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Card Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Virtual Card</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="John Doe"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Spending Limit (USD)</Text>
              <TextInput
                style={styles.input}
                value={spendingLimit}
                onChangeText={setSpendingLimit}
                placeholder="1000"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.infoBoxText}>
                  Virtual cards can be used for online payments. Cards are issued in USD and valid for 12 months.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateCard}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Issue Card</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fund Card Modal */}
      <Modal visible={showFundModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fund Card</Text>
              <TouchableOpacity onPress={() => { setShowFundModal(false); setSelectedCard(null); }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {selectedCard && (
                <View style={styles.selectedCardInfo}>
                  <Text style={styles.selectedCardName}>{selectedCard.customer_name}</Text>
                  <Text style={styles.selectedCardNumber}>{selectedCard.card_number_masked}</Text>
                  <Text style={styles.selectedCardBalance}>Current Balance: ${formatNumber(selectedCard.current_balance)}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Amount (USD) *</Text>
              <TextInput
                style={styles.input}
                value={fundAmount}
                onChangeText={setFundAmount}
                placeholder="100"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.submitButton, funding && styles.submitButtonDisabled]}
                onPress={handleFundCard}
                disabled={funding}
              >
                {funding ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Add Funds</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  cardItem: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  cardVisual: { backgroundColor: '#1e3a5f', padding: 20 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardChip: { width: 32, height: 24, backgroundColor: '#D4AF37', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardNumber: { fontSize: 20, fontWeight: '600', color: COLORS.white, letterSpacing: 3, marginBottom: 24 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  cardValue: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginTop: 4 },
  cardDetails: { padding: 16 },
  cardDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardDetail: { alignItems: 'center' },
  cardDetailLabel: { fontSize: 11, color: COLORS.gray },
  cardDetailValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.secondaryLight, padding: 12, borderRadius: 10, gap: 10, marginBottom: 20 },
  infoBoxText: { flex: 1, fontSize: 12, color: COLORS.secondary, lineHeight: 18 },
  selectedCardInfo: { backgroundColor: COLORS.lightGray, padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  selectedCardName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  selectedCardNumber: { fontSize: 14, color: COLORS.gray, marginTop: 4, letterSpacing: 2 },
  selectedCardBalance: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 8 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
