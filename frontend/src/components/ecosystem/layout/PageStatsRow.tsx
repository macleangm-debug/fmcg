import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatItem {
  label: string;
  value: number | string;
  color?: string;
  bgColor?: string;
  icon?: string;
}

interface PageStatsRowProps {
  stats: StatItem[];
}

export const PageStatsRow: React.FC<PageStatsRowProps> = ({ stats }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {stats.map((stat, index) => (
        <View
          key={index}
          style={[
            styles.statCard,
            { backgroundColor: stat.bgColor || '#F3F4F6' },
          ]}
        >
          {stat.icon && (
            <View style={[styles.iconContainer, { backgroundColor: stat.bgColor || '#E5E7EB' }]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color || '#374151'} />
            </View>
          )}
          <Text style={[styles.statValue, stat.color && { color: stat.color }]}>
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  containerWeb: {
    paddingHorizontal: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PageStatsRow;
