import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ViewMode } from '../store/viewSettingsStore';

interface ViewToggleProps {
  currentView: ViewMode;
  onToggle: (mode: ViewMode) => void;
}

export default function ViewToggle({ currentView, onToggle }: ViewToggleProps) {
  return (
    <View style={styles.container} testID="view-toggle-container">
      <TouchableOpacity
        style={[styles.button, currentView === 'grid' && styles.buttonActive]}
        onPress={() => onToggle('grid')}
        activeOpacity={0.7}
        testID="view-toggle-grid"
        accessibilityLabel="Grid view"
      >
        <Ionicons
          name="grid-outline"
          size={18}
          color={currentView === 'grid' ? '#FFFFFF' : '#6B7280'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, currentView === 'table' && styles.buttonActive]}
        onPress={() => onToggle('table')}
        activeOpacity={0.7}
        testID="view-toggle-table"
        accessibilityLabel="Table view"
      >
        <Ionicons
          name="list-outline"
          size={18}
          color={currentView === 'table' ? '#FFFFFF' : '#6B7280'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: '#2563EB',
  },
});
