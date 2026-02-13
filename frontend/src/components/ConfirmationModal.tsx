import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'link' | 'unlink';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ModalVariant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  appName?: string;
  appIcon?: keyof typeof Ionicons.glyphMap;
  appColor?: string;
}

const variantConfig = {
  danger: {
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    buttonBg: '#DC2626',
    buttonHover: '#B91C1C',
    accentGradientStart: '#DC2626',
    accentGradientEnd: '#EF4444',
    defaultIcon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
  },
  warning: {
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    buttonBg: '#D97706',
    buttonHover: '#B45309',
    accentGradientStart: '#D97706',
    accentGradientEnd: '#F59E0B',
    defaultIcon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  info: {
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    buttonBg: '#2563EB',
    buttonHover: '#1D4ED8',
    accentGradientStart: '#2563EB',
    accentGradientEnd: '#3B82F6',
    defaultIcon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  success: {
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
    buttonBg: '#10B981',
    buttonHover: '#059669',
    accentGradientStart: '#10B981',
    accentGradientEnd: '#34D399',
    defaultIcon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  link: {
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    buttonBg: '#2563EB',
    buttonHover: '#1D4ED8',
    accentGradientStart: '#2563EB',
    accentGradientEnd: '#8B5CF6',
    defaultIcon: 'link-outline' as keyof typeof Ionicons.glyphMap,
  },
  unlink: {
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    buttonBg: '#D97706',
    buttonHover: '#B45309',
    accentGradientStart: '#D97706',
    accentGradientEnd: '#EF4444',
    defaultIcon: 'unlink-outline' as keyof typeof Ionicons.glyphMap,
  },
};

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
  icon,
  appName,
  appIcon,
  appColor,
}: ConfirmationModalProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const config = variantConfig[variant];
  const displayIcon = icon || config.defaultIcon;
  
  // Check if this is an app link/unlink modal
  const isAppModal = variant === 'link' || variant === 'unlink';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onCancel}
      >
        <View 
          style={[styles.container, isWeb && styles.containerWeb]}
          onStartShouldSetResponder={() => true}
        >
          {/* Accent Top Bar */}
          <View style={[styles.accentBar, { backgroundColor: config.accentGradientStart }]} />
          
          {/* Header with Icon */}
          {isAppModal && appIcon ? (
            <View style={styles.appIconHeader}>
              <View style={[styles.appIconLarge, { backgroundColor: appColor || config.iconBg }]}>
                <Ionicons name={appIcon} size={36} color={appColor ? '#FFFFFF' : config.iconColor} />
              </View>
              <View style={styles.connectionIcon}>
                <Ionicons 
                  name={variant === 'link' ? 'add-circle' : 'remove-circle'} 
                  size={24} 
                  color={config.iconColor} 
                />
              </View>
            </View>
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
              <Ionicons name={displayIcon} size={28} color={config.iconColor} />
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message with better formatting */}
          {isAppModal ? (
            <View style={styles.benefitsContainer}>
              {message.split('\n').map((line, index) => {
                const isBullet = line.startsWith('•');
                return (
                  <View key={index} style={styles.benefitRow}>
                    {isBullet ? (
                      <>
                        <View style={[styles.benefitDot, { backgroundColor: config.iconColor }]} />
                        <Text style={styles.benefitText}>{line.replace('• ', '')}</Text>
                      </>
                    ) : (
                      <Text style={[styles.message, { marginBottom: 8 }]}>{line}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: pressed ? config.buttonHover : config.buttonBg },
                loading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.confirmButtonContent}>
                  <Ionicons 
                    name={variant === 'link' ? 'link' : variant === 'unlink' ? 'unlink' : 'checkmark'} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  containerWeb: {
    maxWidth: 400,
  },
  accentBar: {
    width: '100%',
    height: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  appIconHeader: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  appIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  benefitsContainer: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
