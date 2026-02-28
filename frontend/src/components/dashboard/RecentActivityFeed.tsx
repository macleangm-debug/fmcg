import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';

export interface Activity {
  id: string;
  type: 'order' | 'customer' | 'product' | 'stock' | 'payment';
  message: string;
  timestamp: string;
  metadata?: {
    orderId?: string;
    customerName?: string;
    productName?: string;
    amount?: number;
  };
}

interface RecentActivityFeedProps {
  activities: Activity[];
  onViewAll?: () => void;
  formatCurrency?: (amount: number) => string;
}

const getActivityIcon = (type: Activity['type']): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } => {
  switch (type) {
    case 'order':
      return { name: 'receipt-outline', color: '#2563EB', bg: '#DBEAFE' };
    case 'customer':
      return { name: 'person-add-outline', color: '#8B5CF6', bg: '#EDE9FE' };
    case 'product':
      return { name: 'cube-outline', color: '#F59E0B', bg: '#FEF3C7' };
    case 'stock':
      return { name: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2' };
    case 'payment':
      return { name: 'checkmark-circle-outline', color: '#10B981', bg: '#D1FAE5' };
    default:
      return { name: 'ellipse-outline', color: '#6B7280', bg: '#F3F4F6' };
  }
};

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  onViewAll,
  formatCurrency = (a) => `TSh ${a.toLocaleString()}`,
}) => {
  return (
    <View style={styles.container} data-testid="recent-activity-feed">
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} data-testid="activity-view-all">
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {activities.map((activity, index) => {
            const icon = getActivityIcon(activity.type);
            const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
            
            return (
              <View 
                key={activity.id} 
                style={[styles.activityItem, index === activities.length - 1 && styles.lastItem]}
                data-testid={`activity-item-${activity.id}`}
              >
                <View style={styles.timelineContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.name} size={16} color={icon.color} />
                  </View>
                  {index < activities.length - 1 && <View style={styles.timelineLine} />}
                </View>
                
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  {activity.metadata?.amount && (
                    <Text style={styles.activityAmount}>
                      {formatCurrency(activity.metadata.amount)}
                    </Text>
                  )}
                  <Text style={styles.activityTime}>{timeAgo}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    maxHeight: 350,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  list: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  lastItem: {
    marginBottom: 0,
  },
  timelineContainer: {
    alignItems: 'center',
    width: 40,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  activityContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  activityMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 18,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default RecentActivityFeed;
