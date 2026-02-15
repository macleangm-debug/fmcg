import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore, LANGUAGES, LanguageCode, getLanguageInfo } from '../store/languageStore';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'modal' | 'inline';
  showLabel?: boolean;
  style?: any;
  themeColor?: string;
}

export default function LanguageSelector({
  variant = 'dropdown',
  showLabel = true,
  style,
  themeColor = '#2563EB',
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, t } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentLangInfo = getLanguageInfo(currentLanguage);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  const renderDropdown = () => (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={18} color="#6B7280" />
        <Text style={styles.dropdownTriggerText}>
          {currentLangInfo?.nativeName || 'English'}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#6B7280"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.dropdownItem,
                currentLanguage === lang.code && { backgroundColor: `${themeColor}10` },
              ]}
              onPress={() => handleSelectLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  currentLanguage === lang.code && { color: themeColor, fontWeight: '600' },
                ]}
              >
                {lang.nativeName}
              </Text>
              {currentLanguage === lang.code && (
                <Ionicons name="checkmark" size={18} color={themeColor} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderModal = () => (
    <>
      <TouchableOpacity
        style={[styles.modalTrigger, style]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={20} color={themeColor} />
        {showLabel && (
          <Text style={[styles.modalTriggerText, { color: themeColor }]}>
            {currentLangInfo?.nativeName}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.modalItem,
                    currentLanguage === lang.code && { backgroundColor: `${themeColor}10` },
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={styles.modalItemNative}>{lang.nativeName}</Text>
                    <Text style={styles.modalItemEnglish}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color={themeColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  const renderInline = () => (
    <View style={[styles.inlineContainer, style]}>
      {showLabel && (
        <Text style={styles.inlineLabel}>{t('language')}</Text>
      )}
      <View style={styles.inlineOptions}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.inlineOption,
              currentLanguage === lang.code && {
                backgroundColor: themeColor,
                borderColor: themeColor,
              },
            ]}
            onPress={() => handleSelectLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.inlineOptionText,
                currentLanguage === lang.code && { color: '#FFFFFF' },
              ]}
            >
              {lang.code.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  switch (variant) {
    case 'modal':
      return renderModal();
    case 'inline':
      return renderInline();
    default:
      return renderDropdown();
  }
}

const styles = StyleSheet.create({
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },

  // Modal styles
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTriggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemNative: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  modalItemEnglish: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  inlineOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  inlineOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inlineOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});
