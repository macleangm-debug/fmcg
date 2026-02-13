import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

export interface WaitlistProductInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  gradientColors: [string, string];
  features: string[];
}

interface WaitlistModalProps {
  visible: boolean;
  product: WaitlistProductInfo | null;
  onClose: () => void;
}

export default function WaitlistModal({ visible, product, onClose }: WaitlistModalProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleJoinWaitlist = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!product) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await api.post('/galaxy/waitlist', {
        app_id: product.id,
        email: email,
        user_id: user?._id || null,
      });
      
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError('');
    setEmail(user?.email || '');
    onClose();
  };

  if (!isWeb || !product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {isSuccess ? (
            // Success State
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: product.bgColor }]}>
                <Ionicons name="checkmark-circle" size={64} color={product.color} />
              </View>
              <Text style={styles.successTitle}>You're on the list! 🎉</Text>
              <Text style={styles.successText}>
                We'll notify you at <Text style={{ fontWeight: '700' }}>{email}</Text> as soon as {product.name} is ready to launch.
              </Text>
              <Text style={styles.successSubtext}>
                You'll be among the first to experience our newest solution.
              </Text>
              <TouchableOpacity 
                style={[styles.doneButton, { backgroundColor: product.color }]}
                onPress={handleClose}
              >
                <Text style={styles.doneButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Form State
            <>
              {/* Gradient Header */}
              <LinearGradient
                colors={product.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                {/* Close Button */}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color={THEME.white} />
                </TouchableOpacity>
                
                {/* Coming Soon Badge */}
                <View style={styles.comingSoonBadge}>
                  <Ionicons name="time-outline" size={14} color={THEME.white} />
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
                
                {/* App Icon */}
                <View style={styles.appIconLarge}>
                  <Ionicons name={product.icon as any} size={48} color={THEME.white} />
                </View>
                <Text style={styles.appName}>{product.name}</Text>
                <Text style={styles.appTagline}>{product.tagline}</Text>
              </LinearGradient>

              {/* Content - Scrollable */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                  {product.description}
                </Text>

                {/* Features Preview */}
                <View style={styles.featuresPreview}>
                  <Text style={styles.featuresTitle}>What's coming:</Text>
                  <View style={styles.featuresList}>
                    {product.features.slice(0, 4).map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <View style={[styles.featureCheck, { backgroundColor: product.bgColor }]}>
                          <Ionicons name="sparkles" size={12} color={product.color} />
                        </View>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Get notified when we launch</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={THEME.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={THEME.gray}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setError('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}
                </View>

                {/* Benefits */}
                <View style={styles.benefits}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="flash-outline" size={18} color={product.color} />
                    <Text style={styles.benefitText}>Early access</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="pricetag-outline" size={18} color={product.color} />
                    <Text style={styles.benefitText}>Launch discount</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="gift-outline" size={18} color={product.color} />
                    <Text style={styles.benefitText}>Exclusive perks</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Actions - Fixed at bottom */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.joinButton, { backgroundColor: product.color }]}
                  onPress={handleJoinWaitlist}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={THEME.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="notifications-outline" size={18} color={THEME.white} />
                      <Text style={styles.joinButtonText}>Notify Me</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.white,
  },
  appIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  content: {
    padding: 20,
    flex: 1,
    overflow: 'scroll',
  },
  description: {
    fontSize: 14,
    color: THEME.gray,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresPreview: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 10,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    color: THEME.dark,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.dark,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: THEME.lightGray,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.dark,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  benefits: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benefitText: {
    fontSize: 12,
    color: THEME.gray,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: THEME.white,
    flexShrink: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: THEME.gray,
    fontWeight: '600',
  },
  joinButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
  },
  joinButtonText: {
    fontSize: 15,
    color: THEME.white,
    fontWeight: '700',
  },
  // Success State Styles
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: THEME.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: THEME.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: THEME.white,
    fontWeight: '700',
  },
});
