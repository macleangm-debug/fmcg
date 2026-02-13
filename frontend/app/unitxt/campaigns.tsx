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

const isWeb = Platform.OS === 'web';

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

interface Campaign {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp';
  status: 'sent' | 'scheduled' | 'draft' | 'sending' | 'failed' | 'paused';
  message?: string;
  recipients: number;
  delivered: number;
  failed: number;
  clicked?: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface ContactGroup {
  id: string;
  name: string;
  contacts_count: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'scheduled' | 'draft'>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(isWeb ? 'table' : 'card');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  
  // New campaign form
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'sms' as 'sms' | 'whatsapp',
    message: '',
    selectedGroups: [] as string[],
    scheduledAt: '',
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        try {
          const response = await api.get('/unitxt/campaigns', {
            params: filter !== 'all' ? { status: filter } : {},
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.campaigns) {
            setCampaigns(response.data.campaigns.map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              status: c.status,
              message: c.message,
              recipients: c.recipients || 0,
              delivered: c.delivered || 0,
              failed: c.failed || 0,
              clicked: c.clicked || 0,
              scheduled_at: c.scheduled_at,
              sent_at: c.sent_at,
              created_at: c.created_at,
            })));
          }
        } catch (e) {
          // Use mock data if API fails
          useMockData();
        }
      } else {
        useMockData();
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      useMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  const useMockData = () => {
    setCampaigns([
      { id: '1', name: 'Summer Sale Promo', type: 'sms', status: 'sent', recipients: 2500, delivered: 2387, failed: 113, sent_at: '2025-01-25 10:30', created_at: '2025-01-24' },
      { id: '2', name: 'New Product Launch', type: 'whatsapp', status: 'scheduled', recipients: 1500, delivered: 0, failed: 0, scheduled_at: '2025-01-28 09:00', created_at: '2025-01-27' },
      { id: '3', name: 'Customer Feedback', type: 'sms', status: 'sent', recipients: 850, delivered: 812, failed: 38, sent_at: '2025-01-24 14:00', created_at: '2025-01-23' },
      { id: '4', name: 'Flash Sale Alert', type: 'whatsapp', status: 'draft', recipients: 0, delivered: 0, failed: 0, created_at: '2025-01-26' },
      { id: '5', name: 'Weekly Newsletter', type: 'sms', status: 'sending', recipients: 3200, delivered: 1560, failed: 45, created_at: '2025-01-27' },
    ]);
  };

  const fetchGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await api.get('/unitxt/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.groups) {
          setGroups(response.data.groups);
        }
      }
    } catch (e) {
      // Mock groups
      setGroups([
        { id: 'all', name: 'All Contacts', contacts_count: 3542 },
        { id: 'vip', name: 'VIP Customers', contacts_count: 156 },
        { id: 'customers', name: 'Regular Customers', contacts_count: 2890 },
      ]);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchGroups();
  }, [fetchCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message) {
      Alert.alert('Error', 'Please fill in campaign name and message');
      return;
    }
    
    setCreateLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/unitxt/campaigns', {
        name: newCampaign.name,
        type: newCampaign.type,
        message: newCampaign.message,
        recipient_groups: newCampaign.selectedGroups,
        scheduled_at: newCampaign.scheduledAt || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Campaign created successfully');
      setShowCreateModal(false);
      setNewCampaign({ name: '', type: 'sms', message: '', selectedGroups: [], scheduledAt: '' });
      fetchCampaigns();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post(`/unitxt/campaigns/${campaignId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Campaign is being sent');
      fetchCampaigns();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await api.delete(`/unitxt/campaigns/${campaignId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchCampaigns();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete campaign');
            }
          }
        }
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sent': return { color: COLORS.success, bg: COLORS.successLight, icon: 'checkmark-circle' };
      case 'scheduled': return { color: COLORS.blue, bg: COLORS.blueLight, icon: 'time' };
      case 'draft': return { color: COLORS.gray, bg: COLORS.lightGray, icon: 'document' };
      case 'sending': return { color: COLORS.primary, bg: COLORS.primaryLight, icon: 'sync' };
      case 'failed': return { color: COLORS.danger, bg: COLORS.dangerLight, icon: 'alert-circle' };
      case 'paused': return { color: COLORS.purple, bg: COLORS.purpleLight, icon: 'pause' };
      default: return { color: COLORS.gray, bg: COLORS.lightGray, icon: 'ellipse' };
    }
  };

  const filteredCampaigns = filter === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.status === filter);

  const stats = {
    all: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
  };

  const toggleGroupSelection = (groupId: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(g => g !== groupId)
        : [...prev.selectedGroups, groupId]
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCardView = () => (
    <View style={styles.mobileCardContainer}>
      <ScrollView
        style={styles.campaignsList}
        contentContainerStyle={styles.listInsideCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {filteredCampaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No campaigns yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.emptyButtonText}>Create Campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCampaigns.map((campaign) => {
            const statusConfig = getStatusConfig(campaign.status);
            return (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => router.push(`/unitxt/campaign-detail?id=${campaign.id}`)}
              >
                <View style={styles.campaignHeader}>
                  <View style={styles.campaignLeft}>
                    <View style={[styles.campaignTypeIcon, {
                      backgroundColor: campaign.type === 'whatsapp' ? COLORS.successLight : COLORS.blueLight
                    }]}>
                      <Ionicons
                        name={campaign.type === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'}
                        size={18}
                        color={campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <Text style={styles.campaignDate}>
                        {campaign.status === 'scheduled' ? `Scheduled: ${campaign.scheduled_at}` : 
                         campaign.status === 'sent' ? `Sent: ${campaign.sent_at}` :
                         `Created: ${campaign.created_at}`}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {campaign.status !== 'draft' && (
                  <View style={styles.campaignStats}>
                    <View style={styles.campaignStat}>
                      <Text style={styles.campaignStatValue}>{campaign.recipients.toLocaleString()}</Text>
                      <Text style={styles.campaignStatLabel}>Recipients</Text>
                    </View>
                    <View style={styles.campaignStatDivider} />
                    <View style={styles.campaignStat}>
                      <Text style={[styles.campaignStatValue, { color: COLORS.success }]}>
                        {campaign.delivered.toLocaleString()}
                      </Text>
                      <Text style={styles.campaignStatLabel}>Delivered</Text>
                    </View>
                    <View style={styles.campaignStatDivider} />
                    <View style={styles.campaignStat}>
                      <Text style={[styles.campaignStatValue, { color: COLORS.danger }]}>
                        {campaign.failed.toLocaleString()}
                      </Text>
                      <Text style={styles.campaignStatLabel}>Failed</Text>
                    </View>
                    {campaign.recipients > 0 && (
                      <>
                        <View style={styles.campaignStatDivider} />
                        <View style={styles.campaignStat}>
                          <Text style={[styles.campaignStatValue, { color: COLORS.blue }]}>
                            {Math.round((campaign.delivered / campaign.recipients) * 100)}%
                          </Text>
                          <Text style={styles.campaignStatLabel}>Rate</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.cardActions}>
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <TouchableOpacity 
                      style={[styles.cardActionBtn, { backgroundColor: COLORS.successLight }]}
                      onPress={() => handleSendCampaign(campaign.id)}
                    >
                      <Ionicons name="send" size={14} color={COLORS.success} />
                      <Text style={[styles.cardActionText, { color: COLORS.success }]}>Send</Text>
                    </TouchableOpacity>
                  )}
                  {campaign.status === 'sent' && (
                    <TouchableOpacity 
                      style={[styles.cardActionBtn, { backgroundColor: COLORS.blueLight }]}
                      onPress={() => router.push(`/unitxt/analytics?campaignId=${campaign.id}`)}
                    >
                      <Ionicons name="analytics" size={14} color={COLORS.blue} />
                      <Text style={[styles.cardActionText, { color: COLORS.blue }]}>Analytics</Text>
                    </TouchableOpacity>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <TouchableOpacity 
                      style={[styles.cardActionBtn, { backgroundColor: COLORS.dangerLight }]}
                      onPress={() => handleDeleteCampaign(campaign.id)}
                    >
                      <Ionicons name="trash" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  const renderTableView = () => (
    <View style={styles.tableContainer}>
      <ScrollView
        horizontal={!isWeb}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={!isWeb ? { minWidth: 900 } : undefined}
      >
        <View style={styles.tableWrapper}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Campaign</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Recipients</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Delivered</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Failed</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Actions</Text>
          </View>

          {/* Table Body */}
          <ScrollView
            style={styles.tableBody}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          >
            {filteredCampaigns.map((campaign) => {
              const statusConfig = getStatusConfig(campaign.status);
              const rate = campaign.recipients > 0 
                ? Math.round((campaign.delivered / campaign.recipients) * 100) 
                : 0;
              
              return (
                <View key={campaign.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.tableCellText} numberOfLines={1}>{campaign.name}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[styles.typeTag, {
                      backgroundColor: campaign.type === 'whatsapp' ? COLORS.successLight : COLORS.blueLight
                    }]}>
                      <Ionicons
                        name={campaign.type === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble'}
                        size={12}
                        color={campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue}
                      />
                      <Text style={[styles.typeTagText, {
                        color: campaign.type === 'whatsapp' ? COLORS.success : COLORS.blue
                      }]}>
                        {campaign.type === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[styles.statusTag, { backgroundColor: statusConfig.bg }]}>
                      <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                      <Text style={[styles.statusTagText, { color: statusConfig.color }]}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={[styles.tableCellText, { textAlign: 'right' }]}>
                      {campaign.recipients.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={[styles.tableCellText, { textAlign: 'right', color: COLORS.success }]}>
                      {campaign.delivered.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={[styles.tableCellText, { textAlign: 'right', color: campaign.failed > 0 ? COLORS.danger : COLORS.gray }]}>
                      {campaign.failed.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={[styles.tableCellText, { textAlign: 'right', color: COLORS.blue, fontWeight: '600' }]}>
                      {campaign.status === 'draft' ? '-' : `${rate}%`}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={[styles.tableCellText, { color: COLORS.gray }]} numberOfLines={1}>
                      {campaign.status === 'scheduled' ? campaign.scheduled_at : 
                       campaign.status === 'sent' ? campaign.sent_at : campaign.created_at}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                      <TouchableOpacity 
                        style={[styles.tableActionBtn, { backgroundColor: COLORS.successLight }]}
                        onPress={() => handleSendCampaign(campaign.id)}
                      >
                        <Ionicons name="send" size={14} color={COLORS.success} />
                      </TouchableOpacity>
                    )}
                    {campaign.status === 'sent' && (
                      <TouchableOpacity 
                        style={[styles.tableActionBtn, { backgroundColor: COLORS.blueLight }]}
                        onPress={() => router.push(`/unitxt/analytics?campaignId=${campaign.id}`)}
                      >
                        <Ionicons name="analytics" size={14} color={COLORS.blue} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.tableActionBtn}
                      onPress={() => router.push(`/unitxt/campaign-detail?id=${campaign.id}`)}
                    >
                      <Ionicons name="eye" size={14} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Campaigns</Text>
        <View style={styles.headerRight}>
          {/* View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'card' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('card')}
            >
              <Ionicons 
                name="grid" 
                size={18} 
                color={viewMode === 'card' ? COLORS.white : COLORS.gray} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'table' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('table')}
            >
              <Ionicons 
                name="list" 
                size={18} 
                color={viewMode === 'table' ? COLORS.white : COLORS.gray} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createBtnText}>New Campaign</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'sent', 'scheduled', 'draft'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <View style={[styles.filterCount, filter === tab && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, filter === tab && styles.filterCountTextActive]}>
                {stats[tab]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on view mode */}
      {viewMode === 'card' ? renderCardView() : renderTableView()}

      {/* Create Campaign Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Campaign</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Campaign Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Sale Promo"
                value={newCampaign.name}
                onChangeText={text => setNewCampaign(prev => ({ ...prev, name: text }))}
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Message Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeOption, newCampaign.type === 'sms' && styles.typeOptionActive]}
                  onPress={() => setNewCampaign(prev => ({ ...prev, type: 'sms' }))}
                >
                  <Ionicons name="chatbubble" size={20} color={newCampaign.type === 'sms' ? COLORS.white : COLORS.blue} />
                  <Text style={[styles.typeOptionText, newCampaign.type === 'sms' && styles.typeOptionTextActive]}>SMS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, newCampaign.type === 'whatsapp' && styles.typeOptionActiveWhatsApp]}
                  onPress={() => setNewCampaign(prev => ({ ...prev, type: 'whatsapp' }))}
                >
                  <Ionicons name="logo-whatsapp" size={20} color={newCampaign.type === 'whatsapp' ? COLORS.white : COLORS.success} />
                  <Text style={[styles.typeOptionText, newCampaign.type === 'whatsapp' && styles.typeOptionTextActive]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your message here..."
                value={newCampaign.message}
                onChangeText={text => setNewCampaign(prev => ({ ...prev, message: text }))}
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.charCount}>{newCampaign.message.length}/160 characters</Text>

              <Text style={styles.inputLabel}>Select Recipients</Text>
              <View style={styles.groupsGrid}>
                {groups.map(group => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupOption,
                      newCampaign.selectedGroups.includes(group.id) && styles.groupOptionSelected
                    ]}
                    onPress={() => toggleGroupSelection(group.id)}
                  >
                    <Ionicons 
                      name={newCampaign.selectedGroups.includes(group.id) ? "checkbox" : "square-outline"} 
                      size={18} 
                      color={newCampaign.selectedGroups.includes(group.id) ? COLORS.primary : COLORS.gray} 
                    />
                    <Text style={styles.groupOptionText}>{group.name}</Text>
                    <Text style={styles.groupOptionCount}>{group.contacts_count}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Schedule (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM (leave empty to save as draft)"
                value={newCampaign.scheduledAt}
                onChangeText={text => setNewCampaign(prev => ({ ...prev, scheduledAt: text }))}
                placeholderTextColor={COLORS.gray}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleCreateCampaign}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Create Campaign</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterTab: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  filterCount: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterCountTextActive: {
    color: COLORS.white,
  },
  // Card View Styles
  mobileCardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  campaignsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  campaignCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  campaignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  campaignTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  campaignDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  campaignStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  campaignStat: {
    flex: 1,
    alignItems: 'center',
  },
  campaignStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  campaignStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  campaignStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    gap: 4,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Table View Styles
  tableContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableWrapper: {
    flex: 1,
    minWidth: isWeb ? '100%' : 900,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tableActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
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
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 16,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: 4,
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
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  typeOptionActive: {
    backgroundColor: COLORS.blue,
  },
  typeOptionActiveWhatsApp: {
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
  groupsGrid: {
    gap: 8,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    gap: 10,
  },
  groupOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  groupOptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  groupOptionCount: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    minWidth: 140,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
