/**
 * OfflineStatusIndicator - Visual indicator for offline mode status
 * 
 * Shows when the app is offline and displays pending sync count
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  subscribeToNetworkStatus, 
  getNetworkStatus,
  getSyncStatus,
  syncPendingMutations,
  isSyncInProgress
} from '../../services/SyncService';
import { getPendingMutationCount, isOfflineModeEnabled } from '../../services/OfflineDB';

interface OfflineStatusIndicatorProps {
  compact?: boolean;
  theme?: {
    primary: string;
    primaryLight: string;
  };
}

const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({ 
  compact = false,
  theme = { primary: '#1B4332', primaryLight: '#D8F3DC' }
}) => {
  const [isOnline, setIsOnline] = useState(getNetworkStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = subscribeToNetworkStatus((online) => {
      setIsOnline(online);
      if (online) {
        // Refresh pending count when coming online
        refreshStatus();
      }
    });

    // Initial status check
    refreshStatus();

    // Poll for pending count changes every 5 seconds
    const interval = setInterval(refreshStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Pulse animation when there are pending items
  useEffect(() => {
    if (pendingCount > 0 && isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pendingCount, isOnline]);

  const refreshStatus = async () => {
    try {
      const [count, enabled] = await Promise.all([
        getPendingMutationCount(),
        isOfflineModeEnabled()
      ]);
      setPendingCount(count);
      setOfflineEnabled(enabled);
    } catch (error) {
      console.error('Failed to refresh offline status:', error);
    }
  };

  const handleSync = async () => {
    if (syncing || !isOnline || pendingCount === 0) return;
    
    setSyncing(true);
    try {
      const result = await syncPendingMutations();
      await refreshStatus();
      
      if (result.success > 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Don't show if online with no pending items and offline mode disabled
  if (isOnline && pendingCount === 0 && !offlineEnabled) {
    return null;
  }

  // Compact mode - just show icon badge
  if (compact) {
    return (
      <TouchableOpacity 
        onPress={handleSync}
        style={styles.compactContainer}
        disabled={!isOnline || pendingCount === 0}
        data-testid="offline-indicator-compact"
      >
        <Ionicons 
          name={isOnline ? "cloud-done" : "cloud-offline"} 
          size={20} 
          color={isOnline ? theme.primary : '#F59E0B'} 
        />
        {pendingCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Full indicator
  return (
    <Animated.View 
      style={[
        styles.container,
        !isOnline && styles.containerOffline,
        offlineEnabled && styles.containerForced,
        { transform: [{ scale: pulseAnim }] }
      ]}
      data-testid="offline-indicator"
    >
      <View style={styles.statusRow}>
        <Ionicons 
          name={isOnline ? (offlineEnabled ? "airplane" : "cloud-done") : "cloud-offline"} 
          size={16} 
          color={isOnline ? (offlineEnabled ? '#8B5CF6' : '#10B981') : '#F59E0B'} 
        />
        <Text style={[
          styles.statusText,
          !isOnline && styles.statusTextOffline
        ]}>
          {!isOnline 
            ? 'Offline Mode' 
            : offlineEnabled 
              ? 'Offline Mode (Forced)' 
              : 'Online'
          }
        </Text>
      </View>

      {pendingCount > 0 && (
        <TouchableOpacity 
          style={[
            styles.syncButton,
            { backgroundColor: theme.primary },
            syncing && styles.syncButtonDisabled
          ]}
          onPress={handleSync}
          disabled={!isOnline || syncing}
        >
          {syncing ? (
            <Ionicons name="sync" size={14} color="#FFF" />
          ) : showSuccess ? (
            <Ionicons name="checkmark" size={14} color="#FFF" />
          ) : (
            <>
              <Text style={styles.syncButtonText}>
                Sync {pendingCount}
              </Text>
              <Ionicons name="arrow-up" size={12} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  containerOffline: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  containerForced: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065F46',
  },
  statusTextOffline: {
    color: '#92400E',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  compactContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default OfflineStatusIndicator;
