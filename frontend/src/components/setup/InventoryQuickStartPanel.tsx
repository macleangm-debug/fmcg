import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InventoryQuickStartPanelProps {
  itemsCount: number;
  suppliersCount: number;
  locationsCount: number;
  onAddFirstItem: () => void;
  onAddSupplier: () => void;
  onCreateLocation: () => void;
  onShowWizard: () => void;
}

const InventoryQuickStartPanel: React.FC<InventoryQuickStartPanelProps> = ({
  itemsCount,
  suppliersCount,
  locationsCount,
  onAddFirstItem,
  onAddSupplier,
  onCreateLocation,
  onShowWizard,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768;
  
  // Calculate completed steps
  const completedSteps = [
    itemsCount > 0,
    suppliersCount > 0,
    locationsCount > 0,
  ].filter(Boolean).length;
  
  // Don't show panel if all steps are complete
  if (completedSteps >= 3) return null;
  
  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="rocket-outline" size={24} color="#059669" />
          </View>
          <View>
            <Text style={styles.title}>Inventory Setup</Text>
            <Text style={styles.subtitle}>{completedSteps}/3 steps completed</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.helpButton} onPress={onShowWizard}>
          <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedSteps / 3) * 100}%` }]} />
        </View>
      </View>
      
      {/* Setup Steps */}
      <View style={[styles.stepsContainer, isWeb && styles.stepsContainerWeb]}>
        {/* Add First Item */}
        <TouchableOpacity 
          style={[
            styles.stepCard,
            itemsCount > 0 && styles.stepCardComplete,
            isWeb && styles.stepCardWeb
          ]}
          onPress={onAddFirstItem}
          disabled={itemsCount > 0}
          data-testid="quick-start-add-item"
        >
          <View style={[
            styles.stepIconContainer,
            itemsCount > 0 ? styles.stepIconComplete : styles.stepIconPending
          ]}>
            {itemsCount > 0 ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="cube-outline" size={20} color="#059669" />
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, itemsCount > 0 && styles.stepTitleComplete]}>
              {itemsCount > 0 ? 'Items Added' : 'Add First Item'}
            </Text>
            <Text style={styles.stepDescription}>
              {itemsCount > 0 
                ? `${itemsCount} item${itemsCount > 1 ? 's' : ''} in inventory`
                : 'Start tracking your stock'}
            </Text>
          </View>
          {itemsCount === 0 && (
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>
        
        {/* Add Supplier */}
        <TouchableOpacity 
          style={[
            styles.stepCard,
            suppliersCount > 0 && styles.stepCardComplete,
            isWeb && styles.stepCardWeb
          ]}
          onPress={onAddSupplier}
          disabled={suppliersCount > 0}
          data-testid="quick-start-add-supplier"
        >
          <View style={[
            styles.stepIconContainer,
            suppliersCount > 0 ? styles.stepIconComplete : styles.stepIconOptional
          ]}>
            {suppliersCount > 0 ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="business-outline" size={20} color="#6B7280" />
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, suppliersCount > 0 && styles.stepTitleComplete]}>
              {suppliersCount > 0 ? 'Suppliers Added' : 'Add Supplier'}
            </Text>
            <Text style={styles.stepDescription}>
              {suppliersCount > 0 
                ? `${suppliersCount} supplier${suppliersCount > 1 ? 's' : ''} configured`
                : 'Optional - for purchase orders'}
            </Text>
          </View>
          {suppliersCount === 0 && (
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Create Location */}
        <TouchableOpacity 
          style={[
            styles.stepCard,
            locationsCount > 0 && styles.stepCardComplete,
            isWeb && styles.stepCardWeb
          ]}
          onPress={onCreateLocation}
          disabled={locationsCount > 0}
          data-testid="quick-start-add-location"
        >
          <View style={[
            styles.stepIconContainer,
            locationsCount > 0 ? styles.stepIconComplete : styles.stepIconOptional
          ]}>
            {locationsCount > 0 ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="location-outline" size={20} color="#6B7280" />
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, locationsCount > 0 && styles.stepTitleComplete]}>
              {locationsCount > 0 ? 'Location Created' : 'Create Location'}
            </Text>
            <Text style={styles.stepDescription}>
              {locationsCount > 0 
                ? `${locationsCount} location${locationsCount > 1 ? 's' : ''} configured`
                : 'Optional - for multi-location stock'}
            </Text>
          </View>
          {locationsCount === 0 && (
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Skip Setup Link */}
      <TouchableOpacity style={styles.skipLink} onPress={onAddFirstItem}>
        <Text style={styles.skipLinkText}>Skip setup, add items directly</Text>
        <Ionicons name="arrow-forward" size={16} color="#059669" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerWeb: {
    marginHorizontal: 0,
    marginVertical: 0,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  helpButton: {
    padding: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  stepsContainer: {
    gap: 12,
  },
  stepsContainerWeb: {
    flexDirection: 'row',
    gap: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  stepCardWeb: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 20,
  },
  stepCardComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconPending: {
    backgroundColor: '#D1FAE5',
  },
  stepIconOptional: {
    backgroundColor: '#F3F4F6',
  },
  stepIconComplete: {
    backgroundColor: '#059669',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  stepTitleComplete: {
    color: '#059669',
  },
  stepDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  skipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
});

export default InventoryQuickStartPanel;
