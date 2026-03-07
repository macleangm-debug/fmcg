import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  itemCount?: number;
  itemLabel?: string;
  primaryAction?: {
    label: string;
    icon?: string;
    onPress: () => void;
  };
  secondaryAction?: {
    icon: string;
    onPress: () => void;
  };
  viewToggle?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  itemCount,
  itemLabel = 'item(s)',
  primaryAction,
  secondaryAction,
  viewToggle,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <View style={styles.leftSection}>
        <Text style={styles.title}>{title}</Text>
        {(subtitle || typeof itemCount === 'number') && (
          <Text style={styles.subtitle}>
            {typeof itemCount === 'number' ? `${itemCount} ${itemLabel}` : subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.rightSection}>
        {viewToggle}
        
        {secondaryAction && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={secondaryAction.onPress}
          >
            <Ionicons name={secondaryAction.icon as any} size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
        
        {primaryAction && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={primaryAction.onPress}
            data-testid="page-header-primary-action"
          >
            {primaryAction.icon && (
              <Ionicons name={primaryAction.icon as any} size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryBtnText}>{primaryAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  containerWeb: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  leftSection: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PageHeader;
