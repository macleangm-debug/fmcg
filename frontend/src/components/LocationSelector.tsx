import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, Location } from '../store/locationStore';

interface LocationSelectorProps {
  compact?: boolean;
}

export default function LocationSelector({ compact = false }: LocationSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { 
    locations, 
    selectedLocationId, 
    isLoading, 
    fetchLocations,
    setSelectedLocation,
    getLocationName,
  } = useLocationStore();

  useEffect(() => {
    fetchLocations();
  }, []);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  
  // If only 1 location, always show that location name (no dropdown needed)
  const isSingleLocation = locations.length === 1;
  const displayName = isSingleLocation 
    ? locations[0]?.name 
    : (selectedLocation?.name || 'All Locations');

  // For single location, show as display only (no dropdown)
  if (isSingleLocation && !isLoading) {
    return (
      <View style={[styles.selectorButton, compact && styles.selectorButtonCompact, styles.singleLocationDisplay]}>
        <Ionicons name="location" size={compact ? 16 : 18} color="#10B981" />
        <Text style={[styles.selectorText, compact && styles.selectorTextCompact, styles.singleLocationText]} numberOfLines={1}>
          {locations[0]?.name || 'Location'}
        </Text>
      </View>
    );
  }
  
  // Don't show if no locations at all
  if (locations.length === 0 && !isLoading) {
    return null;
  }

  const handleSelectLocation = (locationId: string | null) => {
    setSelectedLocation(locationId);
    setShowDropdown(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={compact ? 16 : 18} color="#2563EB" />
        <Text style={[styles.selectorText, compact && styles.selectorTextCompact]} numberOfLines={1}>
          {isLoading ? 'Loading...' : displayName}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 14 : 16} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <Pressable 
            style={styles.dropdownContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dropdownHeader}>
              <Ionicons name="business-outline" size={20} color="#111827" />
              <Text style={styles.dropdownTitle}>Select Location</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDropdown(false)}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Loading locations...</Text>
              </View>
            ) : (
              <ScrollView style={styles.locationsList} showsVerticalScrollIndicator={false}>
                {/* All Locations Option */}
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    selectedLocationId === null && styles.locationItemSelected,
                  ]}
                  onPress={() => handleSelectLocation(null)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.locationIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="globe-outline" size={18} color="#2563EB" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={[
                      styles.locationName,
                      selectedLocationId === null && styles.locationNameSelected,
                    ]}>
                      All Locations
                    </Text>
                    <Text style={styles.locationMeta}>
                      View combined data from all branches
                    </Text>
                  </View>
                  {selectedLocationId === null && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Individual Locations */}
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.locationItem,
                      selectedLocationId === location.id && styles.locationItemSelected,
                    ]}
                    onPress={() => handleSelectLocation(location.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.locationIcon,
                      location.is_primary && { backgroundColor: '#D1FAE5' },
                    ]}>
                      <Ionicons 
                        name={location.is_primary ? "star" : "storefront-outline"} 
                        size={18} 
                        color={location.is_primary ? "#10B981" : "#6B7280"} 
                      />
                    </View>
                    <View style={styles.locationInfo}>
                      <View style={styles.locationNameRow}>
                        <Text style={[
                          styles.locationName,
                          selectedLocationId === location.id && styles.locationNameSelected,
                        ]} numberOfLines={1}>
                          {location.name}
                        </Text>
                        {location.is_primary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Main</Text>
                          </View>
                        )}
                      </View>
                      {location.address && (
                        <Text style={styles.locationMeta} numberOfLines={1}>
                          {location.address}
                        </Text>
                      )}
                    </View>
                    {selectedLocationId === location.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.dropdownFooter}>
              <Text style={styles.footerText}>
                {locations.length} location{locations.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: 200,
  },
  selectorButtonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 160,
  },
  singleLocationDisplay: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  singleLocationText: {
    color: '#10B981',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
    flex: 1,
  },
  selectorTextCompact: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationsList: {
    maxHeight: 350,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  locationNameSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  locationMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  primaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  dropdownFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
