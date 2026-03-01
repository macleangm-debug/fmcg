/**
 * Offline Status Indicator Component
 * Shows current offline/online status and sync controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore, useOfflineStatus } from '../store/offlineStore';
import { useOfflineSync } from '../services/offlineSyncService';

interface OfflineStatusIndicatorProps {
  compact?: boolean;
  showInHeader?: boolean;
}

const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({ 
  compact = false,
  showInHeader = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const { 
    isOnline, 
    isManualOffline, 
    isEffectivelyOffline, 
    offlineEnabled,
    syncStatus 
  } = useOfflineStatus();
  
  const { 
    settings, 
    toggleManualOffline, 
    pendingOperations,
    products,
    customers,
  } = useOfflineStore();
  
  const { syncAll, cacheAllData, initialize } = useOfflineSync();

  // Initialize sync service on mount
  useEffect(() => {
    initialize();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAll();
      Alert.alert(
        result.success ? 'Sync Complete' : 'Sync Error',
        result.message
      );
    } catch (error: any) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCacheData = async () => {
    setSyncing(true);
    try {
      const result = await cacheAllData();
      Alert.alert(
        result.success ? 'Cache Updated' : 'Cache Error',
        result.message
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Don't show if offline mode not enabled
  if (!offlineEnabled && !showInHeader) return null;

  // Compact indicator for header
  if (compact || showInHeader) {
    return (
      <TouchableOpacity 
        style={[
          styles.compactIndicator,
          isEffectivelyOffline ? styles.compactOffline : styles.compactOnline
        ]}
        onPress={() => setShowModal(true)}
        data-testid="offline-status-indicator"
      >
        <Ionicons 
          name={isEffectivelyOffline ? 'cloud-offline' : 'cloud-done'} 
          size={16} 
          color={isEffectivelyOffline ? '#EF4444' : '#10B981'} 
        />
        {syncStatus.pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{syncStatus.pendingCount}</Text>
          </View>
        )}
        
        {/* Status Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Offline Mode</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Status */}
              <View style={styles.statusSection}>
                <View style={[
                  styles.statusBadge,
                  isEffectivelyOffline ? styles.statusOffline : styles.statusOnline
                ]}>
                  <Ionicons 
                    name={isEffectivelyOffline ? 'cloud-offline' : 'cloud-done'} 
                    size={20} 
                    color={isEffectivelyOffline ? '#EF4444' : '#10B981'} 
                  />
                  <Text style={[
                    styles.statusText,
                    { color: isEffectivelyOffline ? '#EF4444' : '#10B981' }
                  ]}>
                    {isEffectivelyOffline ? 'Offline' : 'Online'}
                  </Text>
                </View>
                
                {!isOnline && (
                  <Text style={styles.statusReason}>No internet connection</Text>
                )}
                {isOnline && isManualOffline && (
                  <Text style={styles.statusReason}>Manual offline mode enabled</Text>
                )}
              </View>

              {/* Manual Toggle */}
              {offlineEnabled && (
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Ionicons name="airplane" size={20} color="#6B7280" />
                    <View style={styles.toggleTextContainer}>
                      <Text style={styles.toggleLabel}>Work Offline</Text>
                      <Text style={styles.toggleDesc}>Manually switch to offline mode</Text>
                    </View>
                  </View>
                  <Switch
                    value={isManualOffline}
                    onValueChange={toggleManualOffline}
                    trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
                    thumbColor={isManualOffline ? '#1B4332' : '#9CA3AF'}
                    disabled={!isOnline}
                  />
                </View>
              )}

              {/* Sync Status */}
              <View style={styles.syncSection}>
                <Text style={styles.sectionTitle}>Sync Status</Text>
                
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Last synced:</Text>
                  <Text style={styles.syncValue}>{formatLastSync(syncStatus.lastSyncAt)}</Text>
                </View>
                
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Pending operations:</Text>
                  <Text style={[
                    styles.syncValue,
                    syncStatus.pendingCount > 0 && styles.syncValueWarning
                  ]}>
                    {syncStatus.pendingCount}
                  </Text>
                </View>
                
                {syncStatus.failedCount > 0 && (
                  <View style={styles.syncRow}>
                    <Text style={styles.syncLabel}>Failed:</Text>
                    <Text style={[styles.syncValue, styles.syncValueError]}>
                      {syncStatus.failedCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Cache Stats */}
              <View style={styles.cacheSection}>
                <Text style={styles.sectionTitle}>Cached Data</Text>
                
                <View style={styles.cacheGrid}>
                  <View style={styles.cacheStat}>
                    <Text style={styles.cacheStatValue}>{products.length}</Text>
                    <Text style={styles.cacheStatLabel}>Products</Text>
                  </View>
                  <View style={styles.cacheStat}>
                    <Text style={styles.cacheStatValue}>{customers.length}</Text>
                    <Text style={styles.cacheStatLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsSection}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={handleCacheData}
                  disabled={syncing || !isOnline}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#1B4332" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#1B4332" />
                      <Text style={styles.actionBtnSecondaryText}>Update Cache</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    styles.actionBtnPrimary,
                    (!isOnline || syncing) && styles.actionBtnDisabled
                  ]}
                  onPress={handleSync}
                  disabled={syncing || !isOnline}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="sync" size={18} color="#FFFFFF" />
                      <Text style={styles.actionBtnPrimaryText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Settings Link */}
              <TouchableOpacity style={styles.settingsLink}>
                <Ionicons name="settings-outline" size={16} color="#6B7280" />
                <Text style={styles.settingsLinkText}>Offline Settings</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    );
  }

  // Full indicator (for settings page or dashboard)
  return (
    <View style={styles.fullIndicator}>
      {/* Status bar */}
      <View style={[
        styles.fullStatusBar,
        isEffectivelyOffline ? styles.fullStatusOffline : styles.fullStatusOnline
      ]}>
        <Ionicons 
          name={isEffectivelyOffline ? 'cloud-offline' : 'cloud-done'} 
          size={20} 
          color="#FFFFFF" 
        />
        <Text style={styles.fullStatusText}>
          {isEffectivelyOffline ? 'Working Offline' : 'Online'}
        </Text>
        {syncStatus.pendingCount > 0 && (
          <View style={styles.fullPendingBadge}>
            <Text style={styles.fullPendingText}>
              {syncStatus.pendingCount} pending
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact indicator
  compactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'relative',
  },
  compactOnline: {
    backgroundColor: '#ECFDF5',
  },
  compactOffline: {
    backgroundColor: '#FEF2F2',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  // Status section
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
  },
  statusOffline: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusReason: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Sync section
  syncSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  syncValueWarning: {
    color: '#F59E0B',
  },
  syncValueError: {
    color: '#EF4444',
  },

  // Cache section
  cacheSection: {
    marginBottom: 20,
  },
  cacheGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  cacheStat: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cacheStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B4332',
  },
  cacheStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnPrimary: {
    backgroundColor: '#1B4332',
  },
  actionBtnSecondary: {
    backgroundColor: '#D8F3DC',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4332',
  },

  // Settings link
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  settingsLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Full indicator
  fullIndicator: {
    marginBottom: 16,
  },
  fullStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  fullStatusOnline: {
    backgroundColor: '#10B981',
  },
  fullStatusOffline: {
    backgroundColor: '#EF4444',
  },
  fullStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  fullPendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullPendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OfflineStatusIndicator;
