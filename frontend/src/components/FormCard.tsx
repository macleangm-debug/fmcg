import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  backLabel?: string;
  maxWidth?: number;
  visible?: boolean;
  isModal?: boolean;
}

export default function FormCard({
  title,
  subtitle,
  children,
  onClose,
  showBackButton,
  onBack,
  backLabel,
  maxWidth = 480,
  visible = true,
  isModal = false,
}: FormCardProps) {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;

  const cardContent = (
    <View style={[styles.card, isLargeScreen && { maxWidth }]}>
      {/* Header */}
      <View style={styles.header}>
        {showBackButton && onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            {backLabel && <Text style={styles.backLabel}>{backLabel}</Text>}
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );

  // Modal variant
  if (isModal) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={[styles.modalContainer, isLargeScreen && { maxWidth }]}>
            {cardContent}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Full page centered card for web
  if (isWeb && isLargeScreen) {
    return (
      <View style={styles.webContainer}>
        {cardContent}
      </View>
    );
  }

  // Mobile full screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mobileContainer}
    >
      {cardContent}
    </KeyboardAvoidingView>
  );
}

// Styled section component for grouping form fields
export function FormSection({ 
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

// Styled form actions (buttons row)
export function FormActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

// Divider between sections
export function FormDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  // Web centered container
  webContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  
  // Mobile full screen container
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
  },
  
  // Card styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 6,
  },
  backLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  
  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
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
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
});
