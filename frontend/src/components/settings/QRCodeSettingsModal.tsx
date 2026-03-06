import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebModal from '../WebModal';

// QR Code link options
const QR_LINK_OPTIONS = [
  {
    id: 'order',
    label: 'Order Details',
    description: 'Link to view this order online',
    icon: 'receipt-outline',
    placeholder: 'https://yourstore.com/orders/{order_id}',
  },
  {
    id: 'website',
    label: 'Business Website',
    description: 'Link to your main website',
    icon: 'globe-outline',
    placeholder: 'https://yourstore.com',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Open WhatsApp chat with your business',
    icon: 'logo-whatsapp',
    placeholder: 'https://wa.me/255712345678',
  },
  {
    id: 'review',
    label: 'Leave a Review',
    description: 'Link to Google/Facebook reviews',
    icon: 'star-outline',
    placeholder: 'https://g.page/r/yourreviewlink',
  },
  {
    id: 'loyalty',
    label: 'Loyalty Program',
    description: 'Link to your loyalty/rewards program',
    icon: 'gift-outline',
    placeholder: 'https://yourstore.com/loyalty',
  },
  {
    id: 'custom',
    label: 'Custom URL',
    description: 'Any custom link you want',
    icon: 'link-outline',
    placeholder: 'https://example.com',
  },
];

export interface QRCodeSettings {
  enabled: boolean;
  linkType: string;
  customUrl: string;
  showOnReceipt: boolean;
}

interface QRCodeSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: QRCodeSettings;
  onSave: (settings: QRCodeSettings) => void;
  businessPhone?: string;
}

const QRCodeSettingsModal: React.FC<QRCodeSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onSave,
  businessPhone,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;
  
  const [localSettings, setLocalSettings] = useState<QRCodeSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, visible]);
  
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(localSettings);
    setIsSaving(false);
    onClose();
  };
  
  const getPreviewUrl = () => {
    const option = QR_LINK_OPTIONS.find(o => o.id === localSettings.linkType);
    if (localSettings.linkType === 'custom') {
      return localSettings.customUrl || 'No URL set';
    }
    if (localSettings.linkType === 'whatsapp' && businessPhone) {
      return `https://wa.me/${businessPhone.replace(/\D/g, '')}`;
    }
    return option?.placeholder || 'No URL set';
  };
  
  return (
    <WebModal
      visible={visible}
      onClose={onClose}
      title="Receipt QR Code"
      subtitle="Configure what the QR code on receipts links to"
      icon="qr-code-outline"
      iconColor="#8B5CF6"
      maxWidth={520}
    >
      <View style={styles.container}>
        {/* Enable/Disable Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Show QR Code on Receipts</Text>
            <Text style={styles.toggleDescription}>
              Display a scannable QR code on all receipts
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={(value) => setLocalSettings(prev => ({ ...prev, enabled: value }))}
            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
            thumbColor={localSettings.enabled ? '#6366F1' : '#F3F4F6'}
          />
        </View>
        
        {localSettings.enabled && (
          <>
            {/* Link Type Selection */}
            <Text style={styles.sectionTitle}>Link Destination</Text>
            <ScrollView 
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {QR_LINK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    localSettings.linkType === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setLocalSettings(prev => ({ ...prev, linkType: option.id }))}
                >
                  <View style={[
                    styles.optionIcon,
                    localSettings.linkType === option.id && styles.optionIconSelected,
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={localSettings.linkType === option.id ? '#6366F1' : '#6B7280'} 
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionLabel,
                      localSettings.linkType === option.id && styles.optionLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  {localSettings.linkType === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Custom URL Input */}
            {(localSettings.linkType === 'custom' || localSettings.linkType === 'website' || localSettings.linkType === 'review' || localSettings.linkType === 'loyalty') && (
              <View style={styles.urlInputContainer}>
                <Text style={styles.inputLabel}>
                  {localSettings.linkType === 'custom' ? 'Custom URL' : 'URL'}
                </Text>
                <TextInput
                  style={styles.urlInput}
                  value={localSettings.customUrl}
                  onChangeText={(text) => setLocalSettings(prev => ({ ...prev, customUrl: text }))}
                  placeholder={QR_LINK_OPTIONS.find(o => o.id === localSettings.linkType)?.placeholder}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}
            
            {/* Preview */}
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Ionicons name="eye-outline" size={18} color="#6B7280" />
                <Text style={styles.previewTitle}>Preview</Text>
              </View>
              <View style={styles.previewContent}>
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.previewUrl} numberOfLines={2}>
                  {getPreviewUrl()}
                </Text>
              </View>
            </View>
          </>
        )}
        
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </WebModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsList: {
    maxHeight: 280,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  optionCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconSelected: {
    backgroundColor: '#E0E7FF',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#4F46E5',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  urlInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  urlInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  previewContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewUrl: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#6366F1',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default QRCodeSettingsModal;
