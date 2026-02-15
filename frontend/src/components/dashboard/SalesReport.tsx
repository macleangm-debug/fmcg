import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../Icon';

interface SalesReportData {
  label: string;
  value: number;
  color: string;
}

interface SalesReportProps {
  data?: SalesReportData[];
  onViewMore?: () => void;
}

const defaultData: SalesReportData[] = [
  { label: 'Product Launched', value: 233, color: '#95D5B2' },
  { label: 'Ongoing Product', value: 23, color: '#B7E4C7' },
  { label: 'Product Sold', value: 482, color: '#D8F3DC' },
];

const SalesReport: React.FC<SalesReportProps> = ({
  data = defaultData,
  onViewMore,
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 400);

  return (
    <View style={styles.container} data-testid="sales-report">
      <View style={styles.header}>
        <Text style={styles.title}>Sales Report</Text>
        <TouchableOpacity onPress={onViewMore} data-testid="sales-report-more-btn">
          <Icon name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={[styles.value, { color: '#40916C' }]}>({item.value})</Text>
            </View>
            <View style={styles.barTrack}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color,
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
      
      {/* X-axis labels */}
      <View style={styles.xAxis}>
        <Text style={styles.xAxisLabel}>0</Text>
        <Text style={styles.xAxisLabel}>100</Text>
        <Text style={styles.xAxisLabel}>200</Text>
        <Text style={styles.xAxisLabel}>300</Text>
        <Text style={styles.xAxisLabel}>400</Text>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chartContainer: {
    gap: 16,
    marginBottom: 12,
  },
  barRow: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#374151',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    height: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});

export default SalesReport;
