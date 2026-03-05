import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: number;
  testId?: string;
}

/**
 * ActionSheetModal - A responsive modal component
 * - Desktop (>768px): Centered modal
 * - Mobile (<=768px): Bottom sheet that slides up
 * 
 * Usage:
 * <ActionSheetModal visible={show} onClose={() => setShow(false)} title="Actions">
 *   <ActionSheetItem icon="pencil" label="Edit" onPress={handleEdit} />
 *   <ActionSheetItem icon="trash" label="Delete" onPress={handleDelete} danger />
 * </ActionSheetModal>
 */
export default function ActionSheetModal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxWidth = 400,
  testId,
}: ActionSheetModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const isMobile = !isDesktop;
  
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

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={handleClose} />
          
          <Animated.View 
            style={[
              styles.bottomSheetContainer,
              { 
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom + 16,
              }
            ]}
            data-testid={testId}
          >
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
            
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>{title}</Text>
                {showCloseButton && (
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Content */}
            <ScrollView 
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.centeredOverlay} onPress={handleClose}>
        <View 
          style={[styles.centeredContainer, { maxWidth }]}
          onStartShouldSetResponder={() => true}
          data-testid={testId}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.centeredHeader}>
              <Text style={styles.centeredTitle}>{title}</Text>
              {showCloseButton && (
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Content */}
          <ScrollView 
            style={styles.centeredContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// Action Item Component
interface ActionSheetItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
  danger?: boolean;
  disabled?: boolean;
  testId?: string;
}

export function ActionSheetItem({
  icon,
  label,
  onPress,
  iconColor,
  iconBg,
  danger = false,
  disabled = false,
  testId,
}: ActionSheetItemProps) {
  const finalIconColor = danger ? '#DC2626' : (iconColor || '#4F46E5');
  const finalIconBg = danger ? '#FEE2E2' : (iconBg || '#EEF2FF');
  
  return (
    <TouchableOpacity
      style={[styles.actionItem, disabled && styles.actionItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      data-testid={testId}
    >
      <View style={[styles.actionItemIcon, { backgroundColor: finalIconBg }]}>
        <Ionicons name={icon} size={20} color={finalIconColor} />
      </View>
      <Text style={[styles.actionItemText, danger && styles.actionItemTextDanger]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

// Success Modal Component
interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onAddAnother?: () => void;
  addAnotherLabel?: string;
  testId?: string;
}

export function SuccessModal({
  visible,
  onClose,
  title,
  subtitle,
  onAddAnother,
  addAnotherLabel = 'Add Another',
  testId,
}: SuccessModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const isMobile = !isDesktop;
  
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

  const content = (
    <>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
      </View>
      <Text style={styles.successTitle}>{title}</Text>
      {subtitle && <Text style={styles.successSubtitle}>{subtitle}</Text>}
      <View style={styles.successActions}>
        {onAddAnother && (
          <Pressable
            style={styles.successAddAnotherBtn}
            onPress={() => {
              handleClose();
              setTimeout(() => onAddAnother(), 300);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text style={styles.successAddAnotherText}>{addAnotherLabel}</Text>
          </Pressable>
        )}
        <Pressable style={styles.successDoneBtn} onPress={handleClose}>
          <Text style={styles.successDoneText}>Done</Text>
        </Pressable>
      </View>
    </>
  );

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={handleClose} />
          <Animated.View 
            style={[
              styles.successBottomSheet,
              { 
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom + 20,
              }
            ]}
            data-testid={testId}
          >
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
            {content}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.centeredOverlay} onPress={handleClose}>
        <View 
          style={styles.successCenteredContainer}
          onStartShouldSetResponder={() => true}
          data-testid={testId}
        >
          {content}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  // Centered Modal Styles
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  centeredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  centeredContent: {
    padding: 16,
  },
  closeButton: {
    padding: 4,
  },
  
  // Action Item Styles
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionItemDisabled: {
    opacity: 0.5,
  },
  actionItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  actionItemTextDanger: {
    color: '#DC2626',
  },
  
  // Success Modal Styles
  successBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCenteredContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  successAddAnotherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    gap: 8,
  },
  successAddAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  successDoneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  successDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
