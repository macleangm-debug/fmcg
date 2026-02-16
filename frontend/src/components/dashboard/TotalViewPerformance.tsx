import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface TotalViewPerformanceProps {
  totalCount?: number;
  viewCount?: number; // percentage
  percentage?: number; // percentage
  sales?: number; // percentage
  themeColor?: string;
  themeColorLight?: string;
}

const TotalViewPerformance: React.FC<TotalViewPerformanceProps> = ({
  totalCount = 565000,
  viewCount = 68,
  percentage = 16,
  sales = 23,
  themeColor = '#40916C',
  themeColorLight = '#95D5B2',
}) => {
  // Format large numbers (e.g., 565000 -> 565K)
  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const pieData = [
    { value: viewCount, color: themeColor, text: `${viewCount}%` },
    { value: percentage, color: themeColorLight, text: `${percentage}%` },
    { value: sales, color: '#E9A319', text: `${sales}%` },
  ];

  return (
    <View style={styles.container} data-testid="total-view-performance">
      <Text style={styles.title}>Total View Performance</Text>
      
      <View style={styles.chartWrapper}>
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            donut
            radius={80}
            innerRadius={55}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={[styles.centerLabelSmall, { color: themeColor }]}>Total Count</Text>
                <Text style={[styles.centerLabelValue, { color: themeColor }]}>{formatCount(totalCount)}</Text>
              </View>
            )}
          />
          {/* Percentage labels positioned around the chart */}
          <View style={styles.percentageLabels}>
            <Text style={[styles.percentLabel, styles.percentTop]}>{percentage}%</Text>
            <Text style={[styles.percentLabel, styles.percentRight]}>{sales}%</Text>
            <Text style={[styles.percentLabel, styles.percentBottom]}>{viewCount}%</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.tipText}>
        Here are some tips on how to improve your score.
      </Text>
      
      <TouchableOpacity style={styles.guideButton} data-testid="guide-views-button">
        <Text style={styles.guideButtonText}>Guide Views</Text>
      </TouchableOpacity>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: themeColor }]} />
          <Text style={styles.legendText}>View Count</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: themeColorLight }]} />
          <Text style={styles.legendText}>Percentage</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E9A319' }]} />
          <Text style={styles.legendText}>Sales</Text>
        </View>
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartContainer: {
    position: 'relative',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelSmall: {
    fontSize: 10,
    color: '#40916C',
    marginBottom: 2,
  },
  centerLabelValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B4332',
  },
  percentageLabels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  percentLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  percentTop: {
    top: 0,
    left: '50%',
    transform: [{ translateX: -15 }],
  },
  percentRight: {
    right: -20,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  percentBottom: {
    bottom: 10,
    left: '50%',
    transform: [{ translateX: -15 }],
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  guideButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  guideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default TotalViewPerformance;
