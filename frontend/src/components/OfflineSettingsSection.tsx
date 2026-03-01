/**
 * Offline Settings Section Component
 * Configurable offline mode settings for admin settings page
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore } from '../store/offlineStore';
import { useOfflineSync } from '../services/offlineSyncService';

const OfflineSettingsSection: React.FC = () => {
  const { settings, updateSettings, syncStatus, products, customers, clearCache, clearPendingOperations } = useOfflineStore();
  const { syncAll, cacheAllData, startScheduledSync, stopScheduledSync } = useOfflineSync();
  
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(settings.enabled);

  const handleToggleOffline = (value: boolean) => {
    updateSettings({ enabled: value });
    setExpanded(value);
    
    if (value) {
      // Enable: start scheduled sync
      startScheduledSync();
      Alert.alert(
        'Offline Mode Enabled',
        'Your data will be cached for offline use. Click "Sync Now" to download the latest data.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Sync Now', onPress: handleSyncNow }
        ]
      );
    } else {
      // Disable: stop scheduled sync
      stopScheduledSync();
    }
  };

  const handleSyncNow = async () => {
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

  const handleClearCache = () => {
    Alert.alert(
      'Clear Offline Cache',
      'This will remove all cached data. You will need to sync again before working offline.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            clearCache();
            Alert.alert('Cache Cleared', 'All cached data has been removed.');
          }
        }
      ]
    );
  };

  const handleClearPendingOps = () => {
    if (syncStatus.pendingCount === 0) {
      Alert.alert('No Pending Operations', 'There are no pending operations to clear.');
      return;
    }
    
    Alert.alert(
      'Clear Pending Operations',
      `This will permanently delete ${syncStatus.pendingCount} pending operation(s) that haven't been synced. This data will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            clearPendingOperations();
            Alert.alert('Cleared', 'All pending operations have been removed.');
          }
        }
      ]
    );
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      {/* Main Toggle */}
      <View style={styles.mainToggle}>
        <View style={styles.toggleIcon}>
          <Ionicons name="cloud-offline-outline" size={24} color="#1B4332" />
        </View>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleTitle}>Allow Offline Operations</Text>
          <Text style={styles.toggleDesc}>
            Work without internet connection. Sales will sync when back online.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggleOffline}
          trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
          thumbColor={settings.enabled ? '#1B4332' : '#9CA3AF'}
        />
      </View>

      {/* Expanded Settings */}
      {expanded && (
        <View style={styles.settingsContainer}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Products Cached</Text>
                <Text style={styles.statusValue}>{products.length}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Customers Cached</Text>
                <Text style={styles.statusValue}>{customers.length}</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Pending Sync</Text>
                <Text style={[
                  styles.statusValue,
                  syncStatus.pendingCount > 0 && styles.statusValueWarning
                ]}>
                  {syncStatus.pendingCount}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Synced</Text>
                <Text style={styles.statusValueSmall}>
                  {formatLastSync(syncStatus.lastSyncAt)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSyncNow}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sync" size={18} color="#FFFFFF" />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sync Options */}
          <View style={styles.optionGroup}>
            <Text style={styles.optionGroupTitle}>Sync Settings</Text>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Auto-sync when online</Text>
                <Text style={styles.optionDesc}>Automatically sync when internet is restored</Text>
              </View>
              <Switch
                value={settings.autoSyncEnabled}
                onValueChange={(value) => updateSettings({ autoSyncEnabled: value })}
                trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
                thumbColor={settings.autoSyncEnabled ? '#1B4332' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Scheduled sync</Text>
                <Text style={styles.optionDesc}>
                  Sync every {settings.scheduledSyncIntervalMinutes} minutes when online
                </Text>
              </View>
              <Switch
                value={settings.scheduledSyncEnabled}
                onValueChange={(value) => {
                  updateSettings({ scheduledSyncEnabled: value });
                  if (value) startScheduledSync();
                  else stopScheduledSync();
                }}
                trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
                thumbColor={settings.scheduledSyncEnabled ? '#1B4332' : '#9CA3AF'}
              />
            </View>

            {settings.scheduledSyncEnabled && (
              <View style={styles.intervalRow}>
                <Text style={styles.intervalLabel}>Sync interval (minutes):</Text>
                <TextInput
                  style={styles.intervalInput}
                  value={String(settings.scheduledSyncIntervalMinutes)}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 30;
                    updateSettings({ scheduledSyncIntervalMinutes: Math.max(5, Math.min(120, val)) });
                  }}
                  keyboardType="numeric"
                  placeholder="30"
                />
              </View>
            )}
          </View>

          {/* Loyalty Options */}
          <View style={styles.optionGroup}>
            <Text style={styles.optionGroupTitle}>Loyalty & Rewards</Text>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Allow loyalty redemption offline</Text>
                <Text style={styles.optionDesc}>
                  {settings.allowLoyaltyRedemptionOffline 
                    ? 'Customers can redeem points offline (may be outdated)'
                    : 'Loyalty redemption blocked when offline'
                  }
                </Text>
              </View>
              <Switch
                value={settings.allowLoyaltyRedemptionOffline}
                onValueChange={(value) => updateSettings({ allowLoyaltyRedemptionOffline: value })}
                trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
                thumbColor={settings.allowLoyaltyRedemptionOffline ? '#1B4332' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.warningBox}>
              <Ionicons name="information-circle-outline" size={20} color="#D97706" />
              <Text style={styles.warningText}>
                Loyalty points earned offline will be synced when back online. Points balance shown may be outdated during offline mode.
              </Text>
            </View>
          </View>

          {/* Display Options */}
          <View style={styles.optionGroup}>
            <Text style={styles.optionGroupTitle}>Display</Text>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Show offline warnings</Text>
                <Text style={styles.optionDesc}>Display warnings when working in offline mode</Text>
              </View>
              <Switch
                value={settings.showOfflineWarnings}
                onValueChange={(value) => updateSettings({ showOfflineWarnings: value })}
                trackColor={{ false: '#E5E7EB', true: '#D8F3DC' }}
                thumbColor={settings.showOfflineWarnings ? '#1B4332' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Advanced */}
          <View style={styles.optionGroup}>
            <Text style={styles.optionGroupTitle}>Advanced</Text>
            
            <View style={styles.advancedRow}>
              <Text style={styles.advancedLabel}>Cache expiry (hours):</Text>
              <TextInput
                style={styles.advancedInput}
                value={String(settings.cacheExpiryHours)}
                onChangeText={(text) => {
                  const val = parseInt(text) || 24;
                  updateSettings({ cacheExpiryHours: Math.max(1, Math.min(168, val)) });
                }}
                keyboardType="numeric"
                placeholder="24"
              />
            </View>
            
            <View style={styles.advancedRow}>
              <Text style={styles.advancedLabel}>Max pending operations:</Text>
              <TextInput
                style={styles.advancedInput}
                value={String(settings.maxPendingOperations)}
                onChangeText={(text) => {
                  const val = parseInt(text) || 100;
                  updateSettings({ maxPendingOperations: Math.max(10, Math.min(500, val)) });
                }}
                keyboardType="numeric"
                placeholder="100"
              />
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Data Management</Text>
            
            <TouchableOpacity style={styles.dangerButton} onPress={handleClearCache}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.dangerButtonText}>Clear Cached Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dangerButton, syncStatus.pendingCount === 0 && styles.dangerButtonDisabled]} 
              onPress={handleClearPendingOps}
            >
              <Ionicons name="close-circle-outline" size={18} color={syncStatus.pendingCount === 0 ? '#9CA3AF' : '#DC2626'} />
              <Text style={[
                styles.dangerButtonText,
                syncStatus.pendingCount === 0 && styles.dangerButtonTextDisabled
              ]}>
                Clear Pending Operations ({syncStatus.pendingCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D8F3DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  toggleDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  settingsContainer: {
    padding: 16,
  },

  // Status Card
  statusCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusValueWarning: {
    color: '#F59E0B',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B4332',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Option Groups
  optionGroup: {
    marginBottom: 20,
  },
  optionGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionInfo: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: '#111827',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Interval
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
  },
  intervalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 12,
  },
  intervalInput: {
    width: 60,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },

  // Advanced
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  advancedLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  advancedInput: {
    width: 70,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dangerButtonDisabled: {
    opacity: 0.5,
  },
  dangerButtonText: {
    fontSize: 14,
    color: '#DC2626',
  },
  dangerButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

export default OfflineSettingsSection;
