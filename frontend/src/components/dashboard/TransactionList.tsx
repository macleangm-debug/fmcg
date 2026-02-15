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
}

const defaultTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Premium T-Shirt',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Completed',
    icon: 'pricetag',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
  },
  {
    id: '2',
    name: 'Playstation 5',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Pending',
    icon: 'game-controller',
    iconColor: '#2563EB',
    iconBg: '#DBEAFE',
  },
  {
    id: '3',
    name: 'Hoodie Gombrong',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Pending',
    icon: 'pricetag',
    iconColor: '#1B4332',
    iconBg: '#D8F3DC',
  },
  {
    id: '4',
    name: 'iPhone 15 Pro Max',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Completed',
    icon: 'phone-portrait',
    iconColor: '#6B7280',
    iconBg: '#F3F4F6',
  },
  {
    id: '5',
    name: 'Lotse',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Completed',
    icon: 'briefcase',
    iconColor: '#1B4332',
    iconBg: '#D8F3DC',
  },
  {
    id: '6',
    name: 'Starbucks',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Completed',
    icon: 'cafe',
    iconColor: '#059669',
    iconBg: '#D1FAE5',
  },
  {
    id: '7',
    name: 'Tinek Detstar T-Shirt',
    date: 'Jul 12th 2024',
    orderId: 'OJWEJS7ISNC',
    status: 'Completed',
    icon: 'pricetag',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
  },
];

const TransactionList: React.FC<TransactionListProps> = ({
  transactions = defaultTransactions,
  onViewMore,
}) => {
  return (
    <View style={styles.container} data-testid="transaction-list">
      <View style={styles.header}>
        <Text style={styles.title}>Transaction</Text>
        <TouchableOpacity onPress={onViewMore} data-testid="transaction-more-btn">
          <Icon name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
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
      </View>
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
});

export default TransactionList;
