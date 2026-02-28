import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TodaySummaryProps {
  todaySales: number;
  yesterdaySales: number;
  ordersToday: number;
  ordersYesterday: number;
  dailyTarget?: number;
  formatCurrency: (amount: number) => string;
}

const TodaySummaryCard: React.FC<TodaySummaryProps> = ({
  todaySales,
  yesterdaySales,
  ordersToday,
  ordersYesterday,
  dailyTarget = 0,
  formatCurrency,
}) => {
  const salesChange = yesterdaySales > 0 
    ? ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1)
    : todaySales > 0 ? '100' : '0';
  
  const ordersChange = ordersYesterday > 0
    ? ((ordersToday - ordersYesterday) / ordersYesterday * 100).toFixed(1)
    : ordersToday > 0 ? '100' : '0';

  const targetProgress = dailyTarget > 0 ? Math.min((todaySales / dailyTarget) * 100, 100) : 0;
  const isPositiveSales = parseFloat(salesChange) >= 0;
  const isPositiveOrders = parseFloat(ordersChange) >= 0;

  return (
    <View style={styles.container} data-testid="today-summary-card">
      <Text style={styles.title}>Today's Performance</Text>
      
      <View style={styles.metricsRow}>
        {/* Sales Metric */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cash-outline" size={18} color="#059669" />
            </View>
            <View style={[styles.changeBadge, { backgroundColor: isPositiveSales ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons 
                name={isPositiveSales ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={isPositiveSales ? '#059669' : '#DC2626'} 
              />
              <Text style={[styles.changeText, { color: isPositiveSales ? '#059669' : '#DC2626' }]}>
                {Math.abs(parseFloat(salesChange))}%
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(todaySales)}</Text>
          <Text style={styles.metricLabel}>Today's Sales</Text>
          <Text style={styles.comparisonText}>
            vs {formatCurrency(yesterdaySales)} yesterday
          </Text>
        </View>

        {/* Orders Metric */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="receipt-outline" size={18} color="#2563EB" />
            </View>
            <View style={[styles.changeBadge, { backgroundColor: isPositiveOrders ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons 
                name={isPositiveOrders ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={isPositiveOrders ? '#059669' : '#DC2626'} 
              />
              <Text style={[styles.changeText, { color: isPositiveOrders ? '#059669' : '#DC2626' }]}>
                {Math.abs(parseFloat(ordersChange))}%
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>{ordersToday}</Text>
          <Text style={styles.metricLabel}>Orders Today</Text>
          <Text style={styles.comparisonText}>
            vs {ordersYesterday} yesterday
          </Text>
        </View>
      </View>

      {/* Daily Target Progress */}
      {dailyTarget > 0 && (
        <View style={styles.targetSection}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetLabel}>Daily Target Progress</Text>
            <Text style={styles.targetPercentage}>{targetProgress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${targetProgress}%` }]} />
          </View>
          <Text style={styles.targetText}>
            {formatCurrency(todaySales)} of {formatCurrency(dailyTarget)} target
          </Text>
        </View>
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
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  comparisonText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  targetSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  targetPercentage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  targetText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
});

export default TodaySummaryCard;
