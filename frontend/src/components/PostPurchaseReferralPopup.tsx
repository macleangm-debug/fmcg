import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api from '../api/client';

interface PostPurchaseReferralPopupProps {
  visible: boolean;
  onClose: () => void;
  orderTotal?: number;
}

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#E0E7FF',
  success: '#10B981',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

export default function PostPurchaseReferralPopup({ 
  visible, 
  onClose,
  orderTotal = 0 
}: PostPurchaseReferralPopupProps) {
  const [referralData, setReferralData] = useState<{
    referral_code: string;
    referral_link: string;
    rewards: { referrer_reward: number; referee_reward: number };
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      fetchReferralData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/referrals/my-referral');
      setReferralData(response.data);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (referralData?.referral_link) {
      await Clipboard.setStringAsync(referralData.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (!referralData) return;
    
    const message = `I just made a purchase on Software Galaxy! Join me and get $${referralData.rewards.referee_reward} credit on signup!\n\n${referralData.referral_link}`;
    
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Software Galaxy',
          text: message,
          url: referralData.referral_link,
        });
      } else {
        await copyToClipboard();
      }
    } else {
      await Share.share({ message, url: referralData.referral_link });
    }
  };

  const shareViaWhatsApp = () => {
    if (!referralData) return;
    const message = encodeURIComponent(`I just made a purchase on Software Galaxy! Join me with code ${referralData.referral_code} and get $${referralData.rewards.referee_reward} credit!\n\n${referralData.referral_link}`);
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Confetti decoration */}
          <View style={styles.confettiContainer}>
            <Text style={styles.confettiEmoji}>🎉</Text>
          </View>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              data-testid="close-referral-popup"
            >
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Purchase Complete!</Text>
            <Text style={styles.subtitle}>
              Share the love and earn rewards
            </Text>

            {/* Reward Card */}
            <View style={styles.rewardCard}>
              <View style={styles.rewardIconContainer}>
                <Ionicons name="gift" size={24} color={COLORS.white} />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>Refer a Friend</Text>
                <Text style={styles.rewardDescription}>
                  You get <Text style={styles.highlight}>${referralData?.rewards.referrer_reward || 10}</Text> credit,
                  they get <Text style={styles.highlight}>${referralData?.rewards.referee_reward || 10}</Text>!
                </Text>
              </View>
            </View>

            {/* Referral Code Box */}
            {referralData && !loading && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Your Referral Code</Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText} selectable>{referralData.referral_code}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton} 
                    onPress={copyToClipboard}
                    data-testid="copy-referral-code"
                  >
                    <Ionicons 
                      name={copied ? "checkmark" : "copy-outline"} 
                      size={18} 
                      color={COLORS.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Share Buttons */}
            <View style={styles.shareButtons}>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: '#25D366' }]}
                onPress={shareViaWhatsApp}
                data-testid="share-whatsapp"
              >
                <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
                <Text style={styles.shareButtonText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: COLORS.primary }]}
                onPress={shareLink}
                data-testid="share-link"
              >
                <Ionicons name="share-social" size={20} color={COLORS.white} />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Skip Button */}
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={onClose}
              data-testid="skip-referral-popup"
            >
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  confettiEmoji: {
    fontSize: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 24,
    textAlign: 'center',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    gap: 14,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  codeBox: {
    width: '100%',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
});
