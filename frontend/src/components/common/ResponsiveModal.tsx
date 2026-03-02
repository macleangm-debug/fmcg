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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors - should match app theme
const THEME = {
  primary: '#1B4332',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  // Optional customizations
  showCloseButton?: boolean;
  showHandle?: boolean; // Show drag handle on mobile
  maxHeight?: number | string; // Max height for bottom sheet
  fullHeight?: boolean; // Full height bottom sheet
  headerIcon?: keyof typeof Ionicons.glyphMap;
  headerIconColor?: string;
  headerIconBg?: string;
  testId?: string;
}

export default function ResponsiveModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
  showHandle = true,
  maxHeight = '80%',
  fullHeight = false,
  headerIcon,
  headerIconColor = THEME.primary,
  headerIconBg = '#D8F3DC',
  testId,
}: ResponsiveModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Determine if we should use bottom sheet (mobile) or centered modal (desktop/tablet)
  const isMobile = Platform.OS !== 'web' || width < 768;
  const isBottomSheet = isMobile;
  
  // Animation for slide up
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    if (visible && isBottomSheet) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, isBottomSheet, height]);
  
  const handleClose = () => {
    if (isBottomSheet) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      onClose();
    }
  };

  // Bottom Sheet Modal (Mobile)
  if (isBottomSheet) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={handleClose} />
          
          <Animated.View 
            style={[
              styles.bottomSheetContainer,
              fullHeight ? styles.bottomSheetFullHeight : { maxHeight },
              { 
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom + 16,
              }
            ]}
            data-testid={testId}
          >
            {/* Drag Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
            )}
            
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.bottomSheetHeader}>
                <View style={styles.headerContent}>
                  {headerIcon && (
                    <View style={[styles.headerIconContainer, { backgroundColor: headerIconBg }]}>
                      <Ionicons name={headerIcon} size={20} color={headerIconColor} />
                    </View>
                  )}
                  <View style={styles.headerTextContainer}>
                    {title && <Text style={styles.bottomSheetTitle}>{title}</Text>}
                    {subtitle && <Text style={styles.bottomSheetSubtitle}>{subtitle}</Text>}
                  </View>
                </View>
                {showCloseButton && (
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    data-testid={`${testId}-close`}
                  >
                    <Ionicons name="close" size={24} color={THEME.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Content */}
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.bottomSheetContent}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.scrollContent}
              >
                {children}
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Centered Modal (Desktop/Tablet)
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.centeredOverlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <View 
          style={styles.centeredContainer}
          onStartShouldSetResponder={() => true}
          data-testid={testId}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.centeredHeader}>
              <View style={styles.headerContent}>
                {headerIcon && (
                  <View style={[styles.headerIconContainer, { backgroundColor: headerIconBg }]}>
                    <Ionicons name={headerIcon} size={20} color={headerIconColor} />
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  {title && <Text style={styles.centeredTitle}>{title}</Text>}
                  {subtitle && <Text style={styles.centeredSubtitle}>{subtitle}</Text>}
                </View>
              </View>
              {showCloseButton && (
                <TouchableOpacity 
                  onPress={handleClose} 
                  style={styles.closeButton}
                  data-testid={`${testId}-close`}
                >
                  <Ionicons name="close" size={24} color={THEME.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.centeredContent}
            contentContainerStyle={styles.scrollContent}
          >
            {children}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Action Button Component for Modal
interface ModalActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testId?: string;
}

export function ModalActionButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  testId,
}: ModalActionButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButtonText;
      case 'secondary':
        return styles.secondaryButtonText;
      case 'outline':
        return styles.outlineButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        getButtonStyle(),
        fullWidth && styles.fullWidthButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      data-testid={testId}
    >
      {icon && <Ionicons name={icon} size={18} color={variant === 'primary' ? '#FFFFFF' : THEME.primary} />}
      <Text style={getTextStyle()}>{label}</Text>
    </TouchableOpacity>
  );
}

// Icon Grid Item for Modal (like the reference image)
interface ModalIconItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  testId?: string;
}

export function ModalIconItem({
  icon,
  label,
  onPress,
  iconColor = THEME.textPrimary,
  testId,
}: ModalIconItemProps) {
  return (
    <TouchableOpacity 
      style={styles.iconItem} 
      onPress={onPress}
      data-testid={testId}
    >
      <View style={styles.iconItemCircle}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.iconItemLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// Icon Grid Container
interface ModalIconGridProps {
  children: React.ReactNode;
  columns?: number;
}

export function ModalIconGrid({ children, columns = 4 }: ModalIconGridProps) {
  return (
    <View style={[styles.iconGrid, { flexWrap: 'wrap' }]}>
      {React.Children.map(children, (child, index) => (
        <View style={{ width: `${100 / columns}%`, padding: 8 }} key={index}>
          {child}
        </View>
      ))}
    </View>
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
    backgroundColor: THEME.overlay,
  },
  bottomSheetContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  bottomSheetFullHeight: {
    maxHeight: '90%',
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
    borderBottomColor: THEME.border,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  bottomSheetSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  bottomSheetContent: {
    flex: 1,
  },
  
  // Centered Modal Styles
  centeredOverlay: {
    flex: 1,
    backgroundColor: THEME.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  centeredSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  centeredContent: {
    flex: 1,
  },
  
  // Shared Styles
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
  },
  
  // Action Button Styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: THEME.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Icon Grid Styles
  iconGrid: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  iconItem: {
    alignItems: 'center',
  },
  iconItemCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconItemLabel: {
    fontSize: 12,
    color: THEME.textPrimary,
    textAlign: 'center',
  },
});
