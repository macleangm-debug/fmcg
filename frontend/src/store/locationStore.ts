import { create } from 'zustand';
import { locationsApi } from '../api/client';

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_primary?: boolean;
  created_at: string;
  order_count?: number;
  total_sales?: number;
}

interface LocationStore {
  locations: Location[];
  selectedLocationId: string | null; // null = "All Locations"
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  fetchLocations: () => Promise<void>;
  setSelectedLocation: (locationId: string | null) => void;
  getSelectedLocation: () => Location | null;
  getLocationName: (locationId: string | null) => string;
  clearStore: () => void;
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  fetchLocations: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await locationsApi.getAll();
      const locations = response.data || [];
      set({ locations, isLoading: false, isInitialized: true });
    } catch (error: any) {
      console.log('Failed to fetch locations:', error);
      set({ 
        error: error?.message || 'Failed to fetch locations', 
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  setSelectedLocation: (locationId: string | null) => {
    set({ selectedLocationId: locationId });
  },

  getSelectedLocation: () => {
    const { locations, selectedLocationId } = get();
    if (!selectedLocationId) return null;
    return locations.find(loc => loc.id === selectedLocationId) || null;
  },

  getLocationName: (locationId: string | null) => {
    if (!locationId) return 'All Locations';
    const { locations } = get();
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  },

  clearStore: () => {
    set({ 
      locations: [], 
      selectedLocationId: null, 
      isLoading: false, 
      error: null,
      isInitialized: false,
    });
  },
}));
