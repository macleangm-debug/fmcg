import React, { useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface WebModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export default function WebModal({ 
  visible, 
  onClose, 
  title, 
  subtitle,
  children,
  maxWidth = 480,
  icon,
  iconColor = '#2563EB',
}: WebModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const isMobile = !isDesktop;
  
  // Animation for bottom sheet slide
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

  // Desktop: Centered modal
  if (isDesktop) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.webModalContainer, { maxWidth }]}>
                {/* Header with optional icon */}
                <View style={styles.webModalHeader}>
                  <View style={styles.headerLeft}>
                    {icon && (
                      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                        <Ionicons name={icon} size={24} color={iconColor} />
                      </View>
                    )}
                    <View style={styles.titleContainer}>
                      <Text style={styles.webModalTitle}>{title}</Text>
                      {subtitle && <Text style={styles.webModalSubtitle}>{subtitle}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={handleClose}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                {/* Content */}
                <ScrollView 
                  style={styles.webModalContent}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.webModalContentContainer}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // Mobile: Bottom sheet modal
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
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
              paddingBottom: insets.bottom,
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Header */}
          <View style={styles.bottomSheetHeader}>
            <View style={styles.headerLeft}>
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                  <Ionicons name={icon} size={22} color={iconColor} />
                </View>
              )}
              <View style={styles.titleContainer}>
                <Text style={styles.bottomSheetTitle}>{title}</Text>
                {subtitle && <Text style={styles.bottomSheetSubtitle}>{subtitle}</Text>}
              </View>
            </View>
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, maxHeight: height * 0.7 }}
          >
            <ScrollView 
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {children}
              <View style={{ height: 24 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Export sub-components for consistent form styling
export function ModalSection({ 
  title, 
  children 
}: { 
  title?: string; 
  children: React.ReactNode 
}) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function ModalDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  // Bottom Sheet styles
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
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  bottomSheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomSheetContent: {
    padding: 20,
  },
  
  // Web overlay styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  webModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  webModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  webModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  webModalContent: {
    maxHeight: 600,
  },
  webModalContentContainer: {
    padding: 24,
  },
  
  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  mobileCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  mobileSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  mobileContent: {
    flex: 1,
    padding: 20,
  },
  
  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
});
