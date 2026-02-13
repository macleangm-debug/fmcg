import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const COLORS = {
  primary: '#F59E0B',
  primaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
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

interface InboxMessage {
  id: string;
  sender_phone: string;
  sender_name: string | null;
  contact_id: string | null;
  message: string;
  status: 'unread' | 'read' | 'archived';
  received_at: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  
  // Reply modal
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const params: any = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await api.get('/unitxt/inbox', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(response.data?.messages || []);
      setUnreadCount(response.data?.unread_count || 0);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
      // Show empty state on error
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const handleMessagePress = async (message: InboxMessage) => {
    // Mark as read if unread
    if (message.status === 'unread') {
      try {
        const token = await AsyncStorage.getItem('token');
        await api.put(`/unitxt/inbox/${message.id}/status`, 
          { status: 'read' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchMessages();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply message');
      return;
    }
    
    setSendingReply(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post(`/unitxt/inbox/${selectedMessage.id}/reply`, 
        { message: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Success', 'Reply sent successfully');
      setShowReplyModal(false);
      setReplyText('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleArchive = async (messageId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await api.put(`/unitxt/inbox/${messageId}/status`, 
        { status: 'archived' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to archive');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading inbox...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'unread', 'read', 'archived'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages List */}
      <ScrollView
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'Received messages will appear here' 
                : `No ${filter} messages`}
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <TouchableOpacity
              key={message.id}
              style={[
                styles.messageCard,
                message.status === 'unread' && styles.messageCardUnread
              ]}
              onPress={() => handleMessagePress(message)}
            >
              <View style={styles.messageHeader}>
                <View style={styles.senderInfo}>
                  <View style={[
                    styles.avatarCircle,
                    { backgroundColor: message.status === 'unread' ? COLORS.primaryLight : COLORS.lightGray }
                  ]}>
                    <Text style={[
                      styles.avatarText,
                      { color: message.status === 'unread' ? COLORS.primary : COLORS.gray }
                    ]}>
                      {(message.sender_name || message.sender_phone)[0].toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[
                      styles.senderName,
                      message.status === 'unread' && styles.senderNameUnread
                    ]}>
                      {message.sender_name || message.sender_phone}
                    </Text>
                    {message.sender_name && (
                      <Text style={styles.senderPhone}>{message.sender_phone}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.messageActions}>
                  <Text style={styles.messageTime}>{formatDate(message.received_at)}</Text>
                  {message.status === 'unread' && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              </View>
              
              <Text 
                style={[
                  styles.messagePreview,
                  message.status === 'unread' && styles.messagePreviewUnread
                ]}
                numberOfLines={2}
              >
                {message.message}
              </Text>

              <View style={styles.messageFooter}>
                <TouchableOpacity
                  style={styles.footerAction}
                  onPress={() => {
                    setSelectedMessage(message);
                    setShowReplyModal(true);
                  }}
                >
                  <Ionicons name="arrow-undo" size={16} color={COLORS.blue} />
                  <Text style={[styles.footerActionText, { color: COLORS.blue }]}>Reply</Text>
                </TouchableOpacity>
                
                {message.status !== 'archived' && (
                  <TouchableOpacity
                    style={styles.footerAction}
                    onPress={() => handleArchive(message.id)}
                  >
                    <Ionicons name="archive" size={16} color={COLORS.gray} />
                    <Text style={styles.footerActionText}>Archive</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Reply Modal */}
      <Modal visible={showReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Message</Text>
              <TouchableOpacity onPress={() => {
                setShowReplyModal(false);
                setReplyText('');
                setSelectedMessage(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedMessage && (
              <View style={styles.originalMessage}>
                <Text style={styles.originalLabel}>Original Message:</Text>
                <Text style={styles.originalText}>{selectedMessage.message}</Text>
                <Text style={styles.originalMeta}>
                  From: {selectedMessage.sender_name || selectedMessage.sender_phone}
                </Text>
              </View>
            )}

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Your Reply:</Text>
              <TextInput
                style={styles.textArea}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Type your reply..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.charCount}>{replyText.length}/160 characters</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowReplyModal(false);
                  setReplyText('');
                  setSelectedMessage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleReply}
                disabled={sendingReply}
              >
                {sendingReply ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={COLORS.white} />
                    <Text style={styles.sendButtonText}>Send Reply</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  unreadBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  messageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  messageCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  senderNameUnread: {
    fontWeight: '700',
  },
  senderPhone: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  messagePreview: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  messagePreviewUnread: {
    color: COLORS.dark,
  },
  messageFooter: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  originalMessage: {
    margin: 20,
    marginBottom: 0,
    padding: 14,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gray,
  },
  originalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  originalText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  originalMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.dark,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
