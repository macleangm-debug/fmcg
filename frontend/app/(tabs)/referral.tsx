import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api from '../../src/api/client';

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface ReferralData {
  referral_code: string;
  referral_link: string;
  stats: {
    successful_referrals: number;
    pending_referrals: number;
    total_earned: number;
    credit_balance: number;
  };
  rewards: {
    referrer_reward: number;
    referee_reward: number;
  };
  referral_history: Array<{
    id: string;
    referee_name: string;
    referee_email: string;
    status: string;
    reward_earned: number;
    created_at: string;
  }>;
}

export default function ReferralDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralData | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/referrals/my-referral');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      Alert.alert('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = async () => {
    if (data?.referral_link) {
      await Clipboard.setStringAsync(data.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (!data) return;
    
    try {
      const message = `Join me on Software Galaxy! Use my referral code ${data.referral_code} and get $${data.rewards.referee_reward} credit on signup!\n\n${data.referral_link}`;
      
      if (Platform.OS === 'web') {
        // Web share API
        if (navigator.share) {
          await navigator.share({
            title: 'Join Software Galaxy',
            text: message,
            url: data.referral_link,
          });
        } else {
          // Fallback to copy
          await copyToClipboard();
          Alert.alert('Link Copied', 'Share link copied to clipboard!');
        }
      } else {
        await Share.share({
          message,
          url: data.referral_link,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareViaWhatsApp = () => {
    if (!data) return;
    const message = encodeURIComponent(`Join me on Software Galaxy! Use my referral code ${data.referral_code} and get $${data.rewards.referee_reward} credit!\n\n${data.referral_link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!data) return;
    const subject = encodeURIComponent('Join Software Galaxy - Get $10 Credit!');
    const body = encodeURIComponent(`Hey!\n\nI've been using Software Galaxy and thought you'd love it too.\n\nSign up with my referral link and you'll get $${data.rewards.referee_reward} credit to use on your subscription!\n\n${data.referral_link}\n\nOr use my code: ${data.referral_code}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareViaTwitter = () => {
    if (!data) return;
    const text = encodeURIComponent(`I'm using @SoftwareGalaxy for my business. Join with my code ${data.referral_code} and get $${data.rewards.referee_reward} credit! ${data.referral_link}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setSending(true);
    try {
      await api.post('/referrals/invite', {
        email: inviteEmail,
        name: inviteName || undefined,
      });
      Alert.alert('Success', `Invitation sent to ${inviteEmail}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>Failed to load referral data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroContent}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Refer & Earn</Text>
          <Text style={styles.heroSubtitle}>
            Invite friends and earn ${data.rewards.referrer_reward} credit for each successful referral!
          </Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>${data.stats.credit_balance}</Text>
            <Text style={styles.heroStatLabel}>Your Balance</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{data.stats.successful_referrals}</Text>
            <Text style={styles.heroStatLabel}>Referrals</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>${data.stats.total_earned}</Text>
            <Text style={styles.heroStatLabel}>Earned</Text>
          </View>
        </View>
      </View>

      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText} selectable>{data.referral_code}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={20} color={COLORS.primary} />
            <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy"}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>Or share your link:</Text>
          <Text style={styles.linkText} numberOfLines={1}>{data.referral_link}</Text>
        </View>
      </View>

      {/* Share Buttons */}
      <View style={styles.shareSection}>
        <Text style={styles.sectionTitle}>Share with Friends</Text>
        <View style={styles.shareButtons}>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#25D366' }]} onPress={shareViaWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#1DA1F2' }]} onPress={shareViaTwitter}>
            <Ionicons name="logo-twitter" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Twitter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#EA4335' }]} onPress={shareViaEmail}>
            <Ionicons name="mail" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: COLORS.primary }]} onPress={shareLink}>
            <Ionicons name="share-social" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)} data-testid="invite-friend-btn">
          <Ionicons name="person-add" size={20} color={COLORS.white} />
          <Text style={styles.inviteButtonText}>Invite by Email</Text>
        </TouchableOpacity>
      </View>

      {/* How it Works */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>How it Works</Text>
        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepDesc}>Share your unique referral code or link with friends</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Friend Signs Up</Text>
              <Text style={styles.stepDesc}>They sign up using your code and get ${data.rewards.referee_reward} credit</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: COLORS.success }]}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>You Earn Credit</Text>
              <Text style={styles.stepDesc}>You get ${data.rewards.referrer_reward} credit when they make their first purchase</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Referral History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Referral History</Text>
        {data.referral_history.length > 0 ? (
          data.referral_history.map((ref) => (
            <View key={ref.id} style={styles.historyItem}>
              <View style={styles.historyAvatar}>
                <Text style={styles.historyAvatarText}>
                  {ref.referee_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{ref.referee_name}</Text>
                <Text style={styles.historyEmail}>{ref.referee_email}</Text>
              </View>
              <View style={styles.historyRight}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ref.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(ref.status) }]}>{ref.status}</Text>
                </View>
                {ref.status === 'completed' && (
                  <Text style={styles.historyReward}>+${ref.reward_earned}</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyHistory}>
            <Ionicons name="people-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyHistoryText}>No referrals yet</Text>
            <Text style={styles.emptyHistorySubtext}>Start sharing your code to earn rewards!</Text>
          </View>
        )}
      </View>

      {/* Credit Balance Card */}
      <View style={styles.creditCard}>
        <View style={styles.creditInfo}>
          <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
          <View>
            <Text style={styles.creditLabel}>Available Credit</Text>
            <Text style={styles.creditValue}>${data.stats.credit_balance.toFixed(2)}</Text>
          </View>
        </View>
        <Text style={styles.creditNote}>
          Use your credit on subscription renewals, upgrades, or add-ons!
        </Text>
      </View>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite a Friend</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Send a personal invite. They'll receive ${data.rewards.referee_reward} credit when they sign up!
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Friend's Email *</Text>
              <TextInput
                style={styles.formInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Friend's Name (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={inviteName}
                onChangeText={setInviteName}
                placeholder="John Doe"
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, sending && styles.submitButtonDisabled]}
              onPress={handleInvite}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  contentContainer: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: COLORS.gray, marginTop: 12 },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
  heroBanner: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 24, marginBottom: 24, overflow: 'hidden' },
  heroContent: { alignItems: 'center', marginBottom: 24 },
  heroIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroStat: { alignItems: 'center' },
  heroStatValue: { fontSize: 24, fontWeight: '700', color: COLORS.white },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  codeCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  codeLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  codeText: { fontSize: 24, fontWeight: '700', color: COLORS.primary, letterSpacing: 4 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  copyButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  linkContainer: { marginTop: 8 },
  linkLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  linkText: { fontSize: 13, color: COLORS.dark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  shareSection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 16 },
  shareButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  shareButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
  shareButtonText: { fontSize: 12, fontWeight: '500', color: COLORS.white },
  inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.dark, paddingVertical: 14, borderRadius: 12 },
  inviteButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  howItWorks: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  steps: { gap: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  historySection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyAvatarText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  historyEmail: { fontSize: 12, color: COLORS.gray },
  historyRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  historyReward: { fontSize: 14, fontWeight: '600', color: COLORS.success, marginTop: 4 },
  emptyHistory: { alignItems: 'center', paddingVertical: 32 },
  emptyHistoryText: { fontSize: 16, fontWeight: '500', color: COLORS.dark, marginTop: 12 },
  emptyHistorySubtext: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  creditCard: { backgroundColor: COLORS.successLight, borderRadius: 16, padding: 20 },
  creditInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  creditLabel: { fontSize: 13, color: COLORS.gray },
  creditValue: { fontSize: 28, fontWeight: '700', color: COLORS.success },
  creditNote: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: 400, maxWidth: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  modalSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 24, lineHeight: 18 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '500', color: COLORS.dark, marginBottom: 8 },
  formInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.dark, backgroundColor: COLORS.lightGray },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, marginTop: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});
