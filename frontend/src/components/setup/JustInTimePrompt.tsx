import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types of Just-in-Time prompts
export type JITPromptType = 
  | 'first_product_add'      // After adding first product
  | 'first_sale_complete'    // After completing first sale
  | 'offline_detected'       // When going offline
  | 'low_stock'              // When stock is running low
  | 'no_receipt_printer'     // When trying to print without printer
  | 'missing_business_info'  // When business info incomplete
  | 'currency_not_set'       // When currency needs to be set
  | 'backup_reminder'        // Periodic backup reminder
  | 'feature_discovery';     // Discover new features

interface JITPromptConfig {
  id: JITPromptType;
  title: string;
  message: string;
  icon: string;
  iconColor: string;
  primaryAction: {
    label: string;
    action: () => void;
  };
  secondaryAction?: {
    label: string;
    action: () => void;
  };
  dismissable: boolean;
  showOnce: boolean;
}

interface JustInTimePromptProps {
  promptType: JITPromptType;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onDismiss: () => void;
  customTitle?: string;
  customMessage?: string;
}

// Storage key for tracking shown prompts
const JIT_STORAGE_KEY = '@retailpro_jit_prompts';

// Default configurations for each prompt type
const PROMPT_CONFIGS: Record<JITPromptType, Omit<JITPromptConfig, 'primaryAction' | 'secondaryAction'>> = {
  first_product_add: {
    id: 'first_product_add',
    title: 'Great job!',
    message: 'You added your first product. Want to set up product categories for better organization?',
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    dismissable: true,
    showOnce: true,
  },
  first_sale_complete: {
    id: 'first_sale_complete',
    title: 'First sale complete!',
    message: 'Congratulations! Would you like to set up a thermal printer for receipts?',
    icon: 'cart',
    iconColor: '#2563EB',
    dismissable: true,
    showOnce: true,
  },
  offline_detected: {
    id: 'offline_detected',
    title: 'You\'re offline',
    message: 'Don\'t worry! RetailPro works offline. Your sales will sync when you\'re back online.',
    icon: 'cloud-offline',
    iconColor: '#F59E0B',
    dismissable: true,
    showOnce: false,
  },
  low_stock: {
    id: 'low_stock',
    title: 'Low stock alert',
    message: 'Some products are running low. Would you like to view low stock items?',
    icon: 'warning',
    iconColor: '#F59E0B',
    dismissable: true,
    showOnce: false,
  },
  no_receipt_printer: {
    id: 'no_receipt_printer',
    title: 'No printer connected',
    message: 'Set up a thermal printer to print receipts directly from the app.',
    icon: 'print',
    iconColor: '#6B7280',
    dismissable: true,
    showOnce: false,
  },
  missing_business_info: {
    id: 'missing_business_info',
    title: 'Complete your profile',
    message: 'Add your business logo and contact info to make your receipts look professional.',
    icon: 'business',
    iconColor: '#8B5CF6',
    dismissable: true,
    showOnce: false,
  },
  currency_not_set: {
    id: 'currency_not_set',
    title: 'Set your currency',
    message: 'We detected your location. Confirm your currency for accurate pricing.',
    icon: 'cash',
    iconColor: '#10B981',
    dismissable: false,
    showOnce: true,
  },
  backup_reminder: {
    id: 'backup_reminder',
    title: 'Backup your data',
    message: 'It\'s been a while since your last backup. Would you like to backup now?',
    icon: 'cloud-upload',
    iconColor: '#2563EB',
    dismissable: true,
    showOnce: false,
  },
  feature_discovery: {
    id: 'feature_discovery',
    title: 'Did you know?',
    message: 'You can share receipts via WhatsApp directly from the sale screen!',
    icon: 'bulb',
    iconColor: '#F59E0B',
    dismissable: true,
    showOnce: true,
  },
};

// Utility to check if prompt should be shown
export const shouldShowPrompt = async (promptType: JITPromptType): Promise<boolean> => {
  const config = PROMPT_CONFIGS[promptType];
  if (!config.showOnce) return true;
  
  try {
    const stored = await AsyncStorage.getItem(JIT_STORAGE_KEY);
    const shownPrompts: string[] = stored ? JSON.parse(stored) : [];
    return !shownPrompts.includes(promptType);
  } catch {
    return true;
  }
};

// Utility to mark prompt as shown
export const markPromptAsShown = async (promptType: JITPromptType): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(JIT_STORAGE_KEY);
    const shownPrompts: string[] = stored ? JSON.parse(stored) : [];
    if (!shownPrompts.includes(promptType)) {
      shownPrompts.push(promptType);
      await AsyncStorage.setItem(JIT_STORAGE_KEY, JSON.stringify(shownPrompts));
    }
  } catch (error) {
    console.warn('Failed to mark prompt as shown:', error);
  }
};

// Reset all prompts (useful for testing)
export const resetAllPrompts = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(JIT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset prompts:', error);
  }
};

const JustInTimePrompt: React.FC<JustInTimePromptProps> = ({
  promptType,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
  customTitle,
  customMessage,
}) => {
  const [visible, setVisible] = useState(true);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  
  const config = PROMPT_CONFIGS[promptType];
  
  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Mark as shown if it's a one-time prompt
    if (config.showOnce) {
      markPromptAsShown(promptType);
    }
  }, []);
  
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss();
    });
  };
  
  const handlePrimaryAction = () => {
    handleDismiss();
    onPrimaryAction();
  };
  
  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      handleDismiss();
      onSecondaryAction();
    }
  };
  
  if (!visible) return null;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.iconColor}20` }]}>
          <Ionicons name={config.icon as any} size={24} color={config.iconColor} />
        </View>
        
        <View style={styles.textContent}>
          <Text style={styles.title}>{customTitle || config.title}</Text>
          <Text style={styles.message}>{customMessage || config.message}</Text>
        </View>
        
        {config.dismissable && (
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handlePrimaryAction}>
          <Text style={styles.primaryBtnText}>Set up</Text>
        </TouchableOpacity>
        
        {config.dismissable && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSecondaryAction || handleDismiss}>
            <Text style={styles.secondaryBtnText}>Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});

export default JustInTimePrompt;
