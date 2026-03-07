import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TableColumn {
  key: string;
  label: string;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  render?: (item: any) => React.ReactNode;
}

interface PageTableCardProps {
  columns: TableColumn[];
  data: any[];
  keyExtractor: (item: any) => string;
  loading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  onRowPress?: (item: any) => void;
  renderActions?: (item: any) => React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const PageTableCard: React.FC<PageTableCardProps> = ({
  columns,
  data,
  keyExtractor,
  loading,
  emptyIcon = 'cube-outline',
  emptyTitle = 'No items found',
  emptySubtitle,
  onRowPress,
  renderActions,
  title,
  subtitle,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <View style={styles.card}>
        {/* Card Header */}
        {(title || subtitle) && (
          <View style={styles.cardHeader}>
            {title && <Text style={styles.cardTitle}>{title}</Text>}
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        )}

        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={emptyIcon as any} size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            {emptySubtitle && <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>}
          </View>
        ) : (
          <>
            {/* Table Header - Web Only */}
            {isWeb && (
              <View style={styles.tableHeader}>
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.tableHeaderCell,
                      { flex: col.flex || 1 },
                      col.align === 'center' && { alignItems: 'center' },
                      col.align === 'right' && { alignItems: 'flex-end' },
                    ]}
                  >
                    <Text style={styles.tableHeaderText}>{col.label}</Text>
                  </View>
                ))}
                {renderActions && (
                  <View style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    <Text style={styles.tableHeaderText}>Actions</Text>
                  </View>
                )}
              </View>
            )}

            {/* Table Body */}
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
              {data.map((item) => (
                <TouchableOpacity
                  key={keyExtractor(item)}
                  style={styles.tableRow}
                  onPress={() => onRowPress?.(item)}
                  disabled={!onRowPress}
                  activeOpacity={onRowPress ? 0.7 : 1}
                >
                  {columns.map((col) => (
                    <View
                      key={col.key}
                      style={[
                        styles.tableCell,
                        { flex: col.flex || 1 },
                        col.align === 'center' && { alignItems: 'center' },
                        col.align === 'right' && { alignItems: 'flex-end' },
                      ]}
                    >
                      {col.render ? (
                        col.render(item)
                      ) : (
                        <Text style={styles.tableCellText} numberOfLines={1}>
                          {item[col.key] ?? '-'}
                        </Text>
                      )}
                    </View>
                  ))}
                  {renderActions && (
                    <View style={[styles.tableCell, { flex: 0.8, flexDirection: 'row', gap: 12, justifyContent: 'center' }]}>
                      {renderActions(item)}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  containerWeb: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableBody: {
    maxHeight: 500,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
  },
  tableCellText: {
    fontSize: 14,
    color: '#111827',
  },
});

export default PageTableCard;
