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

type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

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
}

const variantConfig = {
  danger: {
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    buttonBg: '#DC2626',
    buttonHover: '#B91C1C',
    defaultIcon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
  },
  warning: {
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    buttonBg: '#D97706',
    buttonHover: '#B45309',
    defaultIcon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  info: {
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    buttonBg: '#2563EB',
    buttonHover: '#1D4ED8',
    defaultIcon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  success: {
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
    buttonBg: '#10B981',
    buttonHover: '#059669',
    defaultIcon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
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
}: ConfirmationModalProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const config = variantConfig[variant];
  const displayIcon = icon || config.defaultIcon;

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
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
            <Ionicons name={displayIcon} size={28} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

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
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  containerWeb: {
    maxWidth: 400,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
