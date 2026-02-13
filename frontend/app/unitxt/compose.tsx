import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
              process.env.EXPO_PUBLIC_BACKEND_URL || 
              '/api';

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

type MessageType = 'sms' | 'whatsapp';

interface SenderId {
  id: string;
  name: string;
  status: string;
  country: string;
  country_code: string;
}

export default function ComposePage() {
  const router = useRouter();
  const [messageType, setMessageType] = useState<MessageType>('sms');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [showPersonalization, setShowPersonalization] = useState(false);
  
  // Sender ID state
  const [senderIds, setSenderIds] = useState<SenderId[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<SenderId | null>(null);
  const [loadingSenderIds, setLoadingSenderIds] = useState(true);
  const [showSenderIdSelector, setShowSenderIdSelector] = useState(false);

  const characterCount = message.length;
  const smsSegments = Math.ceil(characterCount / 160) || 1;
  const estimatedCredits = (selectedContacts.length + selectedGroups.length * 100) * (messageType === 'whatsapp' ? 2 : smsSegments);

  // Fetch active sender IDs
  useEffect(() => {
    const fetchSenderIds = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API_URL}/unitxt/sender-ids`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter only active sender IDs
        const activeSenderIds = (response.data?.sender_ids || []).filter(
          (s: SenderId) => s.status === 'active'
        );
        setSenderIds(activeSenderIds);
        
        // Auto-select first sender ID if available
        if (activeSenderIds.length > 0 && !selectedSenderId) {
          setSelectedSenderId(activeSenderIds[0]);
        }
      } catch (error) {
        console.log('Failed to fetch sender IDs:', error);
      } finally {
        setLoadingSenderIds(false);
      }
    };
    
    fetchSenderIds();
  }, []);

  const personalizationFields = [
    { key: '{name}', label: 'Contact Name' },
    { key: '{phone}', label: 'Phone Number' },
    { key: '{company}', label: 'Company Name' },
    { key: '{date}', label: 'Current Date' },
  ];

  const insertPersonalization = (key: string) => {
    setMessage(prev => prev + key);
    setShowPersonalization(false);
  };

  const handleSend = () => {
    if (!campaignName.trim()) {
      Alert.alert('Error', 'Please enter a campaign name');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    if (selectedContacts.length === 0 && selectedGroups.length === 0) {
      Alert.alert('Error', 'Please select at least one contact or group');
      return;
    }

    Alert.alert(
      'Confirm Send',
      `Send ${messageType.toUpperCase()} to ${selectedContacts.length + selectedGroups.length * 100} recipients?\n\nEstimated credits: ${estimatedCredits}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => {
          Alert.alert('Success', 'Campaign sent successfully!');
          router.back();
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>New Message</Text>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="paper-plane" size={18} color={COLORS.white} />
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Message Type Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, messageType === 'sms' && styles.typeOptionActive]}
                onPress={() => setMessageType('sms')}
              >
                <Ionicons
                  name="chatbubble"
                  size={22}
                  color={messageType === 'sms' ? COLORS.white : COLORS.blue}
                />
                <Text style={[styles.typeOptionText, messageType === 'sms' && styles.typeOptionTextActive]}>
                  SMS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, messageType === 'whatsapp' && styles.typeOptionActiveGreen]}
                onPress={() => setMessageType('whatsapp')}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={22}
                  color={messageType === 'whatsapp' ? COLORS.white : COLORS.success}
                />
                <Text style={[styles.typeOptionText, messageType === 'whatsapp' && styles.typeOptionTextActive]}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Campaign Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Summer Sale Promotion"
              placeholderTextColor={COLORS.gray}
              value={campaignName}
              onChangeText={setCampaignName}
            />
          </View>

          {/* Recipients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipients</Text>
            <TouchableOpacity
              style={styles.selectRecipientsBtn}
              onPress={() => router.push('/unitxt/contacts')}
            >
              <Ionicons name="people" size={20} color={COLORS.primary} />
              <Text style={styles.selectRecipientsText}>Select Contacts or Groups</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            {(selectedContacts.length > 0 || selectedGroups.length > 0) && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoText}>
                  {selectedContacts.length} contacts, {selectedGroups.length} groups selected
                </Text>
              </View>
            )}
          </View>

          {/* Sender ID Selection */}
          {messageType === 'sms' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sender ID</Text>
              <Text style={styles.sectionDescription}>
                Messages will appear from this name/number
              </Text>
              
              {loadingSenderIds ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading sender IDs...</Text>
                </View>
              ) : senderIds.length === 0 ? (
                <View style={styles.noSenderIdCard}>
                  <View style={styles.noSenderIdIcon}>
                    <Ionicons name="alert-circle-outline" size={24} color={COLORS.gray} />
                  </View>
                  <View style={styles.noSenderIdContent}>
                    <Text style={styles.noSenderIdTitle}>No Sender IDs Available</Text>
                    <Text style={styles.noSenderIdText}>
                      Register a Sender ID in Settings to send messages with your brand name.
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.registerSenderIdBtn}
                    onPress={() => router.push('/unitxt/settings')}
                  >
                    <Text style={styles.registerSenderIdBtnText}>Register Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.senderIdSelector}
                    onPress={() => setShowSenderIdSelector(!showSenderIdSelector)}
                  >
                    <View style={styles.senderIdSelectorLeft}>
                      <View style={styles.senderIdIcon}>
                        <Ionicons name="pricetag" size={18} color={COLORS.purple} />
                      </View>
                      {selectedSenderId ? (
                        <View>
                          <Text style={styles.senderIdName}>{selectedSenderId.name}</Text>
                          <Text style={styles.senderIdCountry}>{selectedSenderId.country}</Text>
                        </View>
                      ) : (
                        <Text style={styles.senderIdPlaceholder}>Select a Sender ID</Text>
                      )}
                    </View>
                    <Ionicons 
                      name={showSenderIdSelector ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={COLORS.gray} 
                    />
                  </TouchableOpacity>
                  
                  {showSenderIdSelector && (
                    <View style={styles.senderIdDropdown}>
                      {senderIds.map((senderId) => (
                        <TouchableOpacity
                          key={senderId.id}
                          style={[
                            styles.senderIdOption,
                            selectedSenderId?.id === senderId.id && styles.senderIdOptionActive
                          ]}
                          onPress={() => {
                            setSelectedSenderId(senderId);
                            setShowSenderIdSelector(false);
                          }}
                        >
                          <View style={styles.senderIdOptionLeft}>
                            <Text style={styles.senderIdOptionName}>{senderId.name}</Text>
                            <Text style={styles.senderIdOptionCountry}>{senderId.country}</Text>
                          </View>
                          {selectedSenderId?.id === senderId.id && (
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Message */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Message</Text>
              <TouchableOpacity
                style={styles.personalizeBtn}
                onPress={() => setShowPersonalization(!showPersonalization)}
              >
                <Ionicons name="person" size={16} color={COLORS.primary} />
                <Text style={styles.personalizeBtnText}>Personalize</Text>
              </TouchableOpacity>
            </View>

            {showPersonalization && (
              <View style={styles.personalizationPanel}>
                <Text style={styles.personalizationTitle}>Insert Field:</Text>
                <View style={styles.personalizationFields}>
                  {personalizationFields.map((field) => (
                    <TouchableOpacity
                      key={field.key}
                      style={styles.personalizationField}
                      onPress={() => insertPersonalization(field.key)}
                    >
                      <Text style={styles.personalizationFieldText}>{field.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TextInput
              style={styles.messageInput}
              placeholder={messageType === 'whatsapp' 
                ? "Type your WhatsApp message...\n\nYou can use *bold*, _italic_, and ~strikethrough~ formatting."
                : "Type your SMS message..."
              }
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <View style={styles.messageStats}>
              <Text style={styles.messageStatText}>
                {characterCount} characters
              </Text>
              {messageType === 'sms' && (
                <Text style={styles.messageStatText}>
                  {smsSegments} SMS segment{smsSegments > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When to Send</Text>
            <View style={styles.scheduleOptions}>
              <TouchableOpacity
                style={[styles.scheduleOption, scheduleType === 'now' && styles.scheduleOptionActive]}
                onPress={() => setScheduleType('now')}
              >
                <Ionicons
                  name="flash"
                  size={20}
                  color={scheduleType === 'now' ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.scheduleOptionText, scheduleType === 'now' && styles.scheduleOptionTextActive]}>
                  Send Now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scheduleOption, scheduleType === 'later' && styles.scheduleOptionActive]}
                onPress={() => setScheduleType('later')}
              >
                <Ionicons
                  name="time"
                  size={20}
                  color={scheduleType === 'later' ? COLORS.primary : COLORS.gray}
                />
                <Text style={[styles.scheduleOptionText, scheduleType === 'later' && styles.scheduleOptionTextActive]}>
                  Schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cost Estimate */}
          <View style={styles.costEstimate}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Estimated Credits:</Text>
              <Text style={styles.costValue}>{estimatedCredits}</Text>
            </View>
            <Text style={styles.costNote}>
              {messageType === 'sms' 
                ? `Based on ${smsSegments} SMS segment(s) per recipient`
                : 'WhatsApp messages cost 2 credits each'
              }
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  sendBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  typeOptionActiveGreen: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  typeOptionTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectRecipientsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectRecipientsText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  selectedInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  selectedInfoText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  personalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personalizeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  personalizationPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  personalizationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 10,
  },
  personalizationFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personalizationField: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  personalizationFieldText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  messageInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 150,
  },
  messageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageStatText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  scheduleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  scheduleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  scheduleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  scheduleOptionTextActive: {
    color: COLORS.primary,
  },
  costEstimate: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  costValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  costNote: {
    fontSize: 12,
    color: COLORS.gray,
  },
  // Sender ID Styles
  sectionDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: -8,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  noSenderIdCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  noSenderIdIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSenderIdContent: {
    alignItems: 'center',
  },
  noSenderIdTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  noSenderIdText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  registerSenderIdBtn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  registerSenderIdBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  senderIdSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  senderIdSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderIdIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderIdName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  senderIdCountry: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  senderIdPlaceholder: {
    fontSize: 15,
    color: COLORS.gray,
  },
  senderIdDropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  senderIdOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  senderIdOptionActive: {
    backgroundColor: COLORS.purpleLight,
  },
  senderIdOptionLeft: {
    flex: 1,
  },
  senderIdOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.dark,
  },
  senderIdOptionCountry: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});
