import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  reorder_point: number;
}

interface LowStockAlertProps {
  lowStockCount: number;
  lowStockProducts?: LowStockProduct[];
  isInventoryLinked: boolean;
  onViewAll: () => void;
  onLinkInventory: () => void;
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({
  lowStockCount,
  lowStockProducts = [],
  isInventoryLinked,
  onViewAll,
  onLinkInventory,
}) => {
  if (lowStockCount === 0) return null;

  return (
    <View style={styles.container} data-testid="low-stock-alert">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.alertIcon}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={styles.title}>Low Stock Alert</Text>
            <Text style={styles.subtitle}>
              {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.viewAllBtn}
          onPress={onViewAll}
          data-testid="low-stock-view-all"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* Preview of low stock items */}
      {lowStockProducts.slice(0, 3).map((product) => (
        <View key={product.id} style={styles.productItem}>
          <View style={styles.productIcon}>
            <Ionicons name="cube-outline" size={16} color="#6B7280" />
          </View>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <View style={[
            styles.stockBadge,
            product.stock_quantity === 0 ? styles.stockBadgeEmpty : styles.stockBadgeLow
          ]}>
            <Text style={[
              styles.stockText,
              product.stock_quantity === 0 ? styles.stockTextEmpty : styles.stockTextLow
            ]}>
              {product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} left`}
            </Text>
          </View>
        </View>
      ))}

      {/* CTA for linking Inventory - only show if not linked */}
      {!isInventoryLinked && (
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={onLinkInventory}
          activeOpacity={0.8}
          data-testid="link-inventory-cta"
        >
          <View style={styles.ctaContent}>
            <Ionicons name="layers-outline" size={20} color="#06B6D4" />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Link to Inventory</Text>
              <Text style={styles.ctaDescription}>
                Auto-reorder & advanced stock management
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#06B6D4" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
  },
  subtitle: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  productIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  stockBadgeEmpty: {
    backgroundColor: '#FEE2E2',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockTextLow: {
    color: '#D97706',
  },
  stockTextEmpty: {
    color: '#DC2626',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFEFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E7490',
  },
  ctaDescription: {
    fontSize: 12,
    color: '#0891B2',
    marginTop: 2,
  },
});

export default LowStockAlert;
