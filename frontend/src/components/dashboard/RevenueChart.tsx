import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Icon from '../Icon';

interface RevenueChartProps {
  totalRevenue?: number;
  percentageChange?: number;
  monthlyData?: Array<{ income: number; expenses: number; month: string }>;
  formatCurrency?: (amount: number) => string;
  themeColor?: string;
  themeColorLight?: string;
}

const defaultMonthlyData = [
  { income: 45000, expenses: 25000, month: '' },
  { income: 38000, expenses: 22000, month: '' },
  { income: 52000, expenses: 30000, month: '' },
  { income: 48000, expenses: 28000, month: '' },
  { income: 55000, expenses: 32000, month: '' },
  { income: 60000, expenses: 35000, month: '' },
  { income: 58000, expenses: 33000, month: '' },
];

const RevenueChart: React.FC<RevenueChartProps> = ({
  totalRevenue = 193000,
  percentageChange = 35,
  monthlyData = defaultMonthlyData,
  formatCurrency = (amount) => `$${amount.toLocaleString()}`,
  themeColor = '#1B4332',
  themeColorLight = '#95D5B2',
}) => {
  // Prepare data for grouped bar chart - using theme colors
  const barData = monthlyData.flatMap((item) => [
    { value: item.income / 1000, frontColor: themeColor, spacing: 4, label: item.month },
    { value: item.expenses / 1000, frontColor: themeColorLight, spacing: 20 },
  ]);

  return (
    <View style={styles.container} data-testid="revenue-chart">
      <View style={styles.header}>
        <Text style={styles.title}>Revenue</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: themeColor }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: themeColorLight }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: themeColor }]}>{formatCurrency(totalRevenue)}</Text>
        <View style={styles.changeContainer}>
          <Icon name="trending-up" size={14} color="#059669" />
          <Text style={styles.changeText}>+{percentageChange}%</Text>
          <Text style={styles.changePeriod}>from last month</Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <BarChart
          data={barData}
          barWidth={16}
          barBorderRadius={4}
          height={140}
          width={240}
          spacing={8}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          hideYAxisText
          isAnimated
        />
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
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 20,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B4332',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  changePeriod: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  chartContainer: {
    alignItems: 'center',
  },
});

export default RevenueChart;
