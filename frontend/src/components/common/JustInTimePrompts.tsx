/**
 * JustInTimePrompts - Contextual prompts that appear when users need specific features
 * 
 * Prompts are shown once and remembered via AsyncStorage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = {
  primary: '#1B4332',
  primaryLight: '#D8F3DC',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

// Storage key for tracking shown prompts
const PROMPTS_STORAGE_KEY = 'jit_prompts_shown';

// Prompt types
export type PromptType = 
  | 'first_sale_complete'
  | 'offline_detected'
  | 'first_product_add'
  | 'printer_not_configured'
  | 'tax_not_configured'
  | 'sku_format_not_set'
  | 'low_stock_alert'
  | 'first_customer_add';

interface PromptConfig {
  id: PromptType;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  primaryAction: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  skipLabel?: string;
}

interface JustInTimePromptProps {
  visible: boolean;
  config: PromptConfig;
  onDismiss: () => void;
}

// Check if a prompt has been shown before
export const hasPromptBeenShown = async (promptId: PromptType): Promise<boolean> => {
  try {
    const shown = await AsyncStorage.getItem(PROMPTS_STORAGE_KEY);
    if (shown) {
      const shownPrompts = JSON.parse(shown);
      return shownPrompts.includes(promptId);
    }
    return false;
  } catch {
    return false;
  }
};

// Mark a prompt as shown
export const markPromptAsShown = async (promptId: PromptType): Promise<void> => {
  try {
    const shown = await AsyncStorage.getItem(PROMPTS_STORAGE_KEY);
    const shownPrompts = shown ? JSON.parse(shown) : [];
    if (!shownPrompts.includes(promptId)) {
      shownPrompts.push(promptId);
      await AsyncStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(shownPrompts));
    }
  } catch (error) {
    console.log('Failed to mark prompt as shown:', error);
  }
};

// Reset all prompts (for testing)
export const resetAllPrompts = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PROMPTS_STORAGE_KEY);
  } catch (error) {
    console.log('Failed to reset prompts:', error);
  }
};

// Main JustInTimePrompt component
export const JustInTimePrompt: React.FC<JustInTimePromptProps> = ({
  visible,
  config,
  onDismiss,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = async () => {
    await markPromptAsShown(config.id);
    onDismiss();
  };

  const handlePrimaryAction = async () => {
    await markPromptAsShown(config.id);
    config.primaryAction.onPress();
    onDismiss();
  };

  const handleSecondaryAction = async () => {
    if (config.secondaryAction) {
      await markPromptAsShown(config.id);
      config.secondaryAction.onPress();
      onDismiss();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Ionicons name="close" size={20} color={THEME.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.iconColor + '20' }]}>
            <Ionicons name={config.icon as any} size={32} color={config.iconColor} />
          </View>

          {/* Content */}
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.description}>{config.description}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handlePrimaryAction}
            >
              <Text style={styles.primaryBtnText}>{config.primaryAction.label}</Text>
            </TouchableOpacity>

            {config.secondaryAction && (
              <TouchableOpacity 
                style={styles.secondaryBtn} 
                onPress={handleSecondaryAction}
              >
                <Text style={styles.secondaryBtnText}>{config.secondaryAction.label}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Skip link */}
          <TouchableOpacity onPress={handleDismiss}>
            <Text style={styles.skipText}>{config.skipLabel || "I'll do this later"}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Pre-configured prompts factory
export const createPromptConfig = (
  type: PromptType,
  handlers: {
    onSetup?: () => void;
    onSkip?: () => void;
    onSecondary?: () => void;
  }
): PromptConfig => {
  const configs: Record<PromptType, Omit<PromptConfig, 'primaryAction' | 'secondaryAction'>> = {
    first_sale_complete: {
      id: 'first_sale_complete',
      icon: 'checkmark-circle',
      iconColor: '#10B981',
      title: 'Great First Sale!',
      description: 'Would you like to set up receipt printing so customers get printed receipts?',
      skipLabel: 'Skip for now',
    },
    offline_detected: {
      id: 'offline_detected',
      icon: 'cloud-offline',
      iconColor: '#F59E0B',
      title: "You're Offline",
      description: 'Enable offline mode to continue selling with cash payments. Orders will sync when you reconnect.',
      skipLabel: 'Wait for connection',
    },
    first_product_add: {
      id: 'first_product_add',
      icon: 'barcode',
      iconColor: '#2563EB',
      title: 'Set Up Product Codes',
      description: 'Configure your SKU format to automatically generate product codes for easy inventory tracking.',
      skipLabel: 'Use default format',
    },
    printer_not_configured: {
      id: 'printer_not_configured',
      icon: 'print',
      iconColor: '#8B5CF6',
      title: 'Set Up Receipt Printer',
      description: 'Connect a thermal printer to print receipts for your customers automatically.',
      skipLabel: 'Print manually',
    },
    tax_not_configured: {
      id: 'tax_not_configured',
      icon: 'calculator',
      iconColor: '#1B4332',
      title: 'Configure Tax Rate',
      description: 'Set your tax rate for accurate pricing. Currently set to 0% - is this correct?',
      skipLabel: 'Keep at 0%',
    },
    sku_format_not_set: {
      id: 'sku_format_not_set',
      icon: 'pricetag',
      iconColor: '#1B4332',
      title: 'SKU Format',
      description: 'Set up your preferred SKU format for new products. This helps with inventory management.',
      skipLabel: 'Use defaults',
    },
    low_stock_alert: {
      id: 'low_stock_alert',
      icon: 'alert-circle',
      iconColor: '#EF4444',
      title: 'Low Stock Alert',
      description: 'Some products are running low. Would you like to set up automatic low stock notifications?',
      skipLabel: 'Dismiss',
    },
    first_customer_add: {
      id: 'first_customer_add',
      icon: 'people',
      iconColor: '#1B4332',
      title: 'Customer Loyalty',
      description: 'Enable loyalty points to reward returning customers and track their purchase history.',
      skipLabel: 'Skip for now',
    },
  };

  const baseConfig = configs[type];

  return {
    ...baseConfig,
    primaryAction: {
      label: type === 'offline_detected' ? 'Enable Offline Mode' : 'Set Up Now',
      onPress: handlers.onSetup || (() => {}),
    },
    secondaryAction: handlers.onSecondary ? {
      label: 'Learn More',
      onPress: handlers.onSecondary,
    } : undefined,
  };
};

// Hook for managing JIT prompts
export const useJustInTimePrompt = () => {
  const [activePrompt, setActivePrompt] = useState<PromptConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showPrompt = async (
    type: PromptType,
    handlers: {
      onSetup?: () => void;
      onSkip?: () => void;
      onSecondary?: () => void;
    },
    forceShow = false
  ) => {
    // Check if already shown (unless forced)
    if (!forceShow) {
      const alreadyShown = await hasPromptBeenShown(type);
      if (alreadyShown) return;
    }

    const config = createPromptConfig(type, handlers);
    setActivePrompt(config);
    setIsVisible(true);
  };

  const hidePrompt = () => {
    setIsVisible(false);
    setTimeout(() => setActivePrompt(null), 300);
  };

  return {
    activePrompt,
    isVisible,
    showPrompt,
    hidePrompt,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: THEME.primaryLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  skipText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default JustInTimePrompt;
