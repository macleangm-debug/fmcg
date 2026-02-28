import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopSellingProductsProps {
  products: TopProduct[];
  formatCurrency: (amount: number) => string;
  onViewReport?: () => void;
}

type TimePeriod = 'today' | 'week' | 'month';

const TopSellingProducts: React.FC<TopSellingProductsProps> = ({
  products,
  formatCurrency,
  onViewReport,
}) => {
  const [period, setPeriod] = useState<TimePeriod>('today');

  const rankColors = ['#F59E0B', '#9CA3AF', '#CD7F32', '#6B7280', '#6B7280'];
  const rankBgs = ['#FEF3C7', '#F3F4F6', '#FED7AA', '#F3F4F6', '#F3F4F6'];

  if (!products || products.length === 0) {
    return (
      <View style={styles.container} data-testid="top-selling-products">
        <Text style={styles.title}>Top Selling Products</Text>
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>No sales data yet</Text>
        </View>
      </View>
    );
  }

  const maxRevenue = Math.max(...products.map(p => p.revenue));

  return (
    <View style={styles.container} data-testid="top-selling-products">
      <View style={styles.header}>
        <Text style={styles.title}>Top Selling Products</Text>
        {onViewReport && (
          <TouchableOpacity onPress={onViewReport} data-testid="top-products-view-report">
            <Text style={styles.viewLink}>View Report</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Period Toggle */}
      <View style={styles.periodToggle}>
        {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products List */}
      <View style={styles.productsList}>
        {products.slice(0, 5).map((product, index) => {
          const barWidth = (product.revenue / maxRevenue) * 100;
          
          return (
            <View key={index} style={styles.productItem} data-testid={`top-product-${index}`}>
              <View style={[styles.rankBadge, { backgroundColor: rankBgs[index] }]}>
                <Text style={[styles.rankText, { color: rankColors[index] }]}>
                  {index + 1}
                </Text>
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${barWidth}%`, backgroundColor: rankColors[index] || '#6B7280' }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.productStats}>
                <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                <Text style={styles.productQuantity}>{product.quantity} sold</Text>
              </View>
            </View>
          );
        })}
      </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  productsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  productQuantity: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
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

export default TopSellingProducts;
