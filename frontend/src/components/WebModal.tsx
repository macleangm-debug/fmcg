import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  if (isWeb) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
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
                    onPress={onClose}
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

  // Mobile: Full screen modal with professional styling
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.mobileContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Mobile Header */}
          <View style={styles.mobileHeader}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.mobileCloseButton}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.mobileTitleContainer}>
              <Text style={styles.mobileTitle}>{title}</Text>
              {subtitle && <Text style={styles.mobileSubtitle}>{subtitle}</Text>}
            </View>
            <View style={{ width: 44 }} />
          </View>
          
          {/* Content */}
          <ScrollView 
            style={styles.mobileContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    maxHeight: 500,
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
