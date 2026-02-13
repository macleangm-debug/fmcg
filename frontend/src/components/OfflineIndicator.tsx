import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore, setupNetworkListener } from '../store/offlineStore';
import syncService from '../services/syncService';

interface OfflineIndicatorProps {
  showPendingCount?: boolean;
  compact?: boolean;
  onPress?: () => void;
}

export default function OfflineIndicator({
  showPendingCount = true,
  compact = false,
  onPress,
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingTransactions, lastSyncAt } = useOfflineStore();
  const [animation] = useState(new Animated.Value(0));
  
  // Setup network listener on mount
  useEffect(() => {
    const unsubscribe = setupNetworkListener();
    return () => unsubscribe();
  }, []);
  
  // Animate when syncing
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      animation.setValue(0);
    }
  }, [isSyncing]);
  
  const pendingCount = pendingTransactions.length;
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (isOnline && pendingCount > 0) {
      syncService.manualSync();
    }
  };
  
  // Compact mode - just an icon
  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.compactContainer}>
        <Ionicons
          name={isOnline ? 'cloud-done' : 'cloud-offline'}
          size={20}
          color={isOnline ? '#10B981' : '#EF4444'}
        />
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }
  
  // Full indicator - only show when offline or has pending
  if (isOnline && pendingCount === 0) {
    return null;
  }
  
  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOnline ? styles.containerOnline : styles.containerOffline,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {isSyncing ? (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="sync" size={18} color="#FFFFFF" />
          </Animated.View>
        ) : (
          <Ionicons
            name={isOnline ? 'cloud-upload' : 'cloud-offline'}
            size={18}
            color="#FFFFFF"
          />
        )}
        
        <Text style={styles.text}>
          {isSyncing
            ? 'Syncing...'
            : isOnline
            ? `${pendingCount} pending - Tap to sync`
            : 'Offline Mode'}
        </Text>
        
        {showPendingCount && pendingCount > 0 && !isSyncing && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 8,
  },
  containerOffline: {
    backgroundColor: '#EF4444',
  },
  containerOnline: {
    backgroundColor: '#F59E0B',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  compactContainer: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
