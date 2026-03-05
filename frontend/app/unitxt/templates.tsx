import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebModal from '../../src/components/WebModal';

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Template {
  id: string;
  name: string;
  content: string;
  type: 'sms' | 'whatsapp';
  category: string;
  uses: number;
}

export default function TemplatesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', type: 'sms' as 'sms' | 'whatsapp' });

  const categories = ['All', 'Promotions', 'Notifications', 'Reminders', 'Transactional'];

  const templates: Template[] = [
    { id: '1', name: 'Welcome Message', content: 'Hi {name}! Welcome to our service. We\'re excited to have you!', type: 'sms', category: 'Notifications', uses: 245 },
    { id: '2', name: 'Sale Alert', content: '🔥 Flash Sale! Get 50% off all items today only. Shop now: {link}', type: 'whatsapp', category: 'Promotions', uses: 189 },
    { id: '3', name: 'Order Confirmation', content: 'Your order #{order_id} has been confirmed. Track it here: {link}', type: 'sms', category: 'Transactional', uses: 567 },
    { id: '4', name: 'Appointment Reminder', content: 'Reminder: Your appointment is tomorrow at {time}. Reply YES to confirm.', type: 'sms', category: 'Reminders', uses: 312 },
    { id: '5', name: 'Feedback Request', content: 'Hi {name}, how was your recent purchase? Rate us: {link}', type: 'whatsapp', category: 'Notifications', uses: 98 },
  ];

  const filteredTemplates = selectedCategory && selectedCategory !== 'All'
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert('Success', 'Template saved successfully!');
    setShowAddModal(false);
    setNewTemplate({ name: '', content: '', type: 'sms' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Templates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addBtnText}>New Template</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
          >
            <Text style={[
              styles.categoryChipText,
              (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.categoryChipTextActive,
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mobile Card Container */}
      <View style={styles.mobileCardContainer}>
        {/* Templates List */}
        <ScrollView style={styles.templatesList} contentContainerStyle={styles.listInsideCard}>
          {filteredTemplates.map((template) => (
            <TouchableOpacity key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <View style={[styles.templateTypeIcon, {
                    backgroundColor: template.type === 'whatsapp' ? COLORS.successLight : COLORS.blueLight
                  }]}>
                    <Ionicons
                    name={template.type === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'}
                    size={16}
                    color={template.type === 'whatsapp' ? COLORS.success : COLORS.blue}
                  />
                </View>
                <View>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateCategory}>{template.category}</Text>
                </View>
              </View>
              <View style={styles.templateUses}>
                <Text style={styles.templateUsesValue}>{template.uses}</Text>
                <Text style={styles.templateUsesLabel}>uses</Text>
              </View>
            </View>
            <Text style={styles.templateContent} numberOfLines={2}>
              {template.content}
            </Text>
            <View style={styles.templateActions}>
              <TouchableOpacity style={styles.templateAction}>
                <Ionicons name="copy-outline" size={18} color={COLORS.gray} />
                <Text style={styles.templateActionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.templateAction}>
                <Ionicons name="create-outline" size={18} color={COLORS.gray} />
                <Text style={styles.templateActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.templateAction}>
                <Ionicons name="paper-plane-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.templateActionText, { color: COLORS.primary }]}>Use</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Add Template Modal */}
      <WebModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="New Template"
        icon="document-text-outline"
        iconColor={COLORS.primary}
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Template Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Welcome Message"
            value={newTemplate.name}
            onChangeText={(text) => setNewTemplate({ ...newTemplate, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeOption, newTemplate.type === 'sms' && styles.typeOptionActive]}
              onPress={() => setNewTemplate({ ...newTemplate, type: 'sms' })}
            >
              <Ionicons name="chatbubble" size={18} color={newTemplate.type === 'sms' ? COLORS.white : COLORS.blue} />
              <Text style={[styles.typeOptionText, newTemplate.type === 'sms' && styles.typeOptionTextActive]}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, newTemplate.type === 'whatsapp' && styles.typeOptionActiveGreen]}
              onPress={() => setNewTemplate({ ...newTemplate, type: 'whatsapp' })}
            >
              <Ionicons name="logo-whatsapp" size={18} color={newTemplate.type === 'whatsapp' ? COLORS.white : COLORS.success} />
              <Text style={[styles.typeOptionText, newTemplate.type === 'whatsapp' && styles.typeOptionTextActive]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Template Content</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter your message template...\n\nUse {name}, {phone}, etc. for personalization"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={newTemplate.content}
            onChangeText={(text) => setNewTemplate({ ...newTemplate, content: text })}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplate}>
          <Text style={styles.saveBtnText}>Save Template</Text>
        </TouchableOpacity>
      </WebModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  templatesList: {
    flex: 1,
  },
  templateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  templateCategory: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  templateUses: {
    alignItems: 'flex-end',
  },
  templateUsesValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  templateUsesLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  templateContent: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  templateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  textArea: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
    minHeight: 120,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: COLORS.blue,
  },
  typeOptionActiveGreen: {
    backgroundColor: COLORS.success,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  typeOptionTextActive: {
    color: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
