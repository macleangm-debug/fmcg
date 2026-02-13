import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import api from '../api/client';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

export interface ProductInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  gradientColors: [string, string];
  features: string[];
  dashboardRoute: string;
}

interface FreeTrialModalProps {
  visible: boolean;
  product: ProductInfo | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FreeTrialModal({ visible, product, onClose, onSuccess }: FreeTrialModalProps) {
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleStartTrial = async () => {
    if (!product) return;
    
    setIsSubscribing(true);
    try {
      // Subscribe to the app
      await api.post(`/galaxy/subscribe/${product.id}`);
      
      // Close modal
      onClose();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Navigate to the app dashboard
      router.push(product.dashboardRoute as any);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isWeb || !product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
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
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={THEME.white} />
            </TouchableOpacity>
            
            {/* App Icon */}
            <View style={styles.appIconLarge}>
              <Ionicons name={product.icon as any} size={48} color={THEME.white} />
            </View>
            <Text style={styles.appName}>{product.name}</Text>
            <Text style={styles.appTagline}>{product.tagline}</Text>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              {product.description}
            </Text>

            {/* Features List */}
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.featuresList}>
              {product.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.featureCheck, { backgroundColor: product.bgColor }]}>
                    <Ionicons name="checkmark" size={14} color={product.color} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Trial Info */}
            <View style={[styles.trialInfo, { borderColor: product.bgColor }]}>
              <Ionicons name="gift-outline" size={24} color={product.color} />
              <View style={styles.trialInfoContent}>
                <Text style={styles.trialInfoTitle}>14-day free trial</Text>
                <Text style={styles.trialInfoSubtitle}>No credit card required</Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.startTrialButton, { backgroundColor: product.color }]}
              onPress={handleStartTrial}
              disabled={isSubscribing}
            >
              {isSubscribing ? (
                <ActivityIndicator color={THEME.white} size="small" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={18} color={THEME.white} />
                  <Text style={styles.startTrialButtonText}>Start Free Trial</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  header: {
    padding: 32,
    paddingTop: 48,
    alignItems: 'center',
    position: 'relative',
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
  appIconLarge: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.white,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  content: {
    padding: 24,
    maxHeight: 320,
  },
  description: {
    fontSize: 16,
    color: THEME.gray,
    lineHeight: 26,
    marginBottom: 24,
    textAlign: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 16,
  },
  featuresList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: THEME.dark,
    fontWeight: '500',
    flex: 1,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 24,
    padding: 18,
    backgroundColor: THEME.lightGray,
    borderRadius: 16,
    borderWidth: 1,
  },
  trialInfoContent: {
    flex: 1,
  },
  trialInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.dark,
  },
  trialInfoSubtitle: {
    fontSize: 14,
    color: THEME.gray,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: THEME.gray,
    fontWeight: '600',
  },
  startTrialButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startTrialButtonText: {
    fontSize: 16,
    color: THEME.white,
    fontWeight: '700',
  },
});
