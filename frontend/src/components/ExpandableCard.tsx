import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  primary: '#1E5AA8', // Calm blue
  primaryLight: '#2E6AB8',
  white: '#FFFFFF',
  dark: '#1A1A2E',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
};

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  color?: string;
  onPress?: () => void;
}

interface ExpandableCardProps {
  title: string;
  items: ActionItem[];
  itemsPerRow?: number;
  maxVisibleRows?: number;
  onItemPress?: (item: ActionItem) => void;
  defaultExpanded?: boolean;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  items,
  itemsPerRow = 4,
  maxVisibleRows = 1,
  onItemPress,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  
  const totalRows = Math.ceil(items.length / itemsPerRow);
  const hasMoreRows = totalRows > maxVisibleRows;
  const visibleItems = expanded ? items : items.slice(0, itemsPerRow * maxVisibleRows);

  const toggleExpand = () => {
    if (!hasMoreRows) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
    
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Group items into rows
  const rows: ActionItem[][] = [];
  for (let i = 0; i < visibleItems.length; i += itemsPerRow) {
    rows.push(visibleItems.slice(i, i + itemsPerRow));
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardHeader} 
        onPress={toggleExpand}
        activeOpacity={hasMoreRows ? 0.7 : 1}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        {hasMoreRows && (
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={22} color={COLORS.primary} />
          </Animated.View>
        )}
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.itemRow}>
            {row.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemContainer}
                onPress={() => onItemPress?.(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, { backgroundColor: `${item.color || COLORS.primary}15` }]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={26} 
                    color={item.color || COLORS.primary} 
                  />
                </View>
                <Text style={styles.itemLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Fill empty spaces in last row */}
            {row.length < itemsPerRow && 
              Array.from({ length: itemsPerRow - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.itemContainer} />
              ))
            }
          </View>
        ))}
      </View>
      
      {hasMoreRows && !expanded && (
        <View style={styles.moreIndicator}>
          <Text style={styles.moreText}>
            +{items.length - (itemsPerRow * maxVisibleRows)} more
          </Text>
        </View>
      )}
    </View>
  );
};

// Simple non-expandable card variant
interface SimpleCardProps {
  title?: string;
  children: React.ReactNode;
}

export const SimpleCard: React.FC<SimpleCardProps> = ({ title, children }) => (
  <View style={styles.card}>
    {title && (
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    )}
    <View style={styles.cardContent}>
      {children}
    </View>
  </View>
);

// Quick Action Grid (for 4 items in a row)
interface QuickActionGridProps {
  items: ActionItem[];
  onItemPress?: (item: ActionItem) => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ items, onItemPress }) => (
  <View style={styles.quickActionGrid}>
    {items.map((item) => (
      <TouchableOpacity
        key={item.id}
        style={styles.quickActionItem}
        onPress={() => onItemPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${item.color || COLORS.primary}15` }]}>
          <Ionicons 
            name={item.icon as any} 
            size={24} 
            color={item.color || COLORS.primary} 
          />
        </View>
        <Text style={styles.quickActionLabel} numberOfLines={2}>
          {item.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  cardContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    maxWidth: '25%',
  },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 16,
  },
  moreIndicator: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  moreText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  
  // Quick Action Grid styles
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  quickActionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default ExpandableCard;
