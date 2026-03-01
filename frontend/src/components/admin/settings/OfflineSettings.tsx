/**
 * OfflineSettings - Admin settings component for offline mode configuration
 * 
 * Allows users to:
 * - Enable/disable offline mode
 * - View cached data statistics
 * - Manually refresh cache
 * - Clear offline data
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  isOfflineModeEnabled, 
  setOfflineModeEnabled,
  getOfflineDataStats,
  clearAllOfflineData
} from '../../../services/OfflineDB';
import { 
  refreshOfflineCache, 
  getNetworkStatus,
  getPendingMutationCount,
  syncPendingMutations
} from '../../../services/SyncService';

interface OfflineSettingsProps {
  theme?: {
    primary: string;
    primaryLight: string;
  };
}

const OfflineSettings: React.FC<OfflineSettingsProps> = ({
  theme = { primary: '#1B4332', primaryLight: '#D8F3DC' }
}) => {
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    pendingMutations: 0,
    cachedProducts: 0,
    cachedCustomers: 0,
    cachedCategories: 0,
    lastCacheTime: undefined as Date | undefined
  });
  const isOnline = getNetworkStatus();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [enabled, dataStats] = await Promise.all([
        isOfflineModeEnabled(),
        getOfflineDataStats()
      ]);
      setOfflineEnabled(enabled);
      setStats(dataStats);
    } catch (error) {
      console.error('Failed to load offline settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOfflineMode = async (enabled: boolean) => {
    setOfflineEnabled(enabled);
    await setOfflineModeEnabled(enabled);
    
    // If enabling, prompt to refresh cache
    if (enabled && stats.cachedProducts === 0) {
      Alert.alert(
        'Refresh Offline Data?',
        'Would you like to download products and customers for offline access?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Download Now', onPress: handleRefreshCache }
        ]
      );
    }
  };

  const handleRefreshCache = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot refresh cache while offline');
      return;
    }
    
    setRefreshing(true);
    try {
      const result = await refreshOfflineCache();
      if (result.success) {
        await loadSettings(); // Refresh stats
        Alert.alert('Success', 'Offline data has been refreshed');
      } else {
        Alert.alert('Error', result.error || 'Failed to refresh cache');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh offline data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }
    
    setSyncing(true);
    try {
      const result = await syncPendingMutations();
      await loadSettings(); // Refresh stats
      
      if (result.failed > 0) {
        Alert.alert(
          'Sync Partial', 
          `Synced ${result.success} items. ${result.failed} failed:\n${result.errors.join('\n')}`
        );
      } else {
        Alert.alert('Success', `${result.success} items synced successfully`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sync pending changes');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Offline Data?',
      'This will delete all cached products, customers, and pending changes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllOfflineData();
            await loadSettings();
            Alert.alert('Cleared', 'All offline data has been deleted');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} data-testid="offline-settings">
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="cloud-offline-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Offline Mode</Text>
          <Text style={styles.subtitle}>
            Work without internet connection
          </Text>
        </View>
      </View>

      {/* Main Toggle */}
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Enable Offline Mode</Text>
          <Text style={styles.toggleHint}>
            Queue sales and changes when offline
          </Text>
        </View>
        <Switch
          value={offlineEnabled}
          onValueChange={handleToggleOfflineMode}
          trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
          thumbColor={offlineEnabled ? theme.primary : '#9CA3AF'}
          data-testid="offline-mode-toggle"
        />
      </View>

      {/* Status Banner */}
      <View style={[
        styles.statusBanner,
        isOnline ? styles.statusOnline : styles.statusOffline
      ]}>
        <Ionicons 
          name={isOnline ? "wifi" : "wifi-outline"} 
          size={18} 
          color={isOnline ? '#059669' : '#D97706'} 
        />
        <Text style={[
          styles.statusText,
          isOnline ? styles.statusTextOnline : styles.statusTextOffline
        ]}>
          {isOnline ? 'Connected to Internet' : 'No Internet Connection'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Cached Data</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.cachedProducts}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.cachedCustomers}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.cachedCategories}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue, 
              { color: stats.pendingMutations > 0 ? '#F59E0B' : theme.primary }
            ]}>
              {stats.pendingMutations}
            </Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
        </View>
        {stats.lastCacheTime && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(stats.lastCacheTime).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Refresh Cache Button */}
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.primary }]}
          onPress={handleRefreshCache}
          disabled={refreshing || !isOnline}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                Refresh Cache
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sync Now Button (only if pending items) */}
        {stats.pendingMutations > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: theme.primary }]}
            onPress={handleSync}
            disabled={syncing || !isOnline}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#FFF" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                  Sync Now ({stats.pendingMutations})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Clear Data Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleClearData}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
            Clear Offline Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          When offline mode is enabled, sales and customer updates will be saved locally 
          and automatically synced when you&apos;re back online.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  toggleHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
  },
  statusOffline: {
    backgroundColor: '#FFFBEB',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextOnline: {
    color: '#059669',
  },
  statusTextOffline: {
    color: '#D97706',
  },
  statsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  actionsContainer: {
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonPrimary: {
    borderWidth: 0,
  },
  actionButtonDanger: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtonTextPrimary: {
    color: '#FFF',
  },
  actionButtonTextDanger: {
    color: '#DC2626',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default OfflineSettings;
