import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../Icon';

export interface Transaction {
  id: string;
  name: string;
  date: string;
  orderId: string;
  status: 'Completed' | 'Pending';
  icon: string;
  iconColor: string;
  iconBg: string;
}

interface TransactionListProps {
  transactions?: Transaction[];
  onViewMore?: () => void;
  isLoading?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onViewMore,
  isLoading = false,
}) => {
  const hasTransactions = transactions && transactions.length > 0;

  return (
    <View style={styles.container} data-testid="transaction-list">
      <View style={styles.header}>
        <Text style={styles.title}>Recent Orders</Text>
        {hasTransactions && (
          <TouchableOpacity onPress={onViewMore} data-testid="transaction-more-btn">
            <Icon name="ellipsis-horizontal" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {isLoading ? (
        <View style={styles.emptyState}>
          <Icon name="hourglass-outline" size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>Loading orders...</Text>
        </View>
      ) : hasTransactions ? (
        <View style={styles.list}>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.item} data-testid={`transaction-item-${transaction.id}`}>
              <View style={[styles.iconContainer, { backgroundColor: transaction.iconBg }]}>
                <Icon name={transaction.icon} size={18} color={transaction.iconColor} />
              </View>
              
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{transaction.name}</Text>
                <Text style={styles.itemDate}>{transaction.date}</Text>
              </View>
              
              <View style={styles.itemRight}>
                <Text style={[
                  styles.itemStatus,
                  { color: transaction.status === 'Completed' ? '#059669' : '#D97706' }
                ]}>
                  {transaction.status}
                </Text>
                <Text style={styles.itemOrderId}>{transaction.orderId}</Text>
              </View>
            </View>
          ))}
          
          {onViewMore && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewMore}>
              <Text style={styles.viewAllText}>View All Orders</Text>
              <Icon name="arrow-forward" size={16} color="#1B4332" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Icon name="receipt-outline" size={32} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Orders will appear here once customers start buying</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemOrderId: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4332',
  },
});

export default TransactionList;
