import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';

interface FilterChip {
  key: string;
  label: string;
  icon?: string;
  color?: string;
}

interface PageFiltersRowProps {
  filters: FilterChip[];
  selectedFilter: string | null;
  onFilterSelect: (key: string | null) => void;
}

export const PageFiltersRow: React.FC<PageFiltersRowProps> = ({
  filters,
  selectedFilter,
  onFilterSelect,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.key || (!selectedFilter && filter.key === 'all');
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.chip,
                isActive && styles.chipActive,
              ]}
              onPress={() => onFilterSelect(filter.key === 'all' ? null : filter.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  scrollContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});

export default PageFiltersRow;
