/**
 * Offline Store - IndexedDB wrapper for offline data persistence
 * Handles caching of products, customers, categories, and pending operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface PendingOperation {
  id: string;
  type: 'order' | 'customer' | 'loyalty_points' | 'inventory_update';
  data: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  category_name?: string;
  image_url?: string;
  cachedAt: string;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
  cachedAt: string;
}

export interface CachedCategory {
  id: string;
  name: string;
  cachedAt: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  nextScheduledSync: string | null;
}

export interface OfflineSettings {
  enabled: boolean;
  autoSyncEnabled: boolean;
  scheduledSyncEnabled: boolean;
  scheduledSyncIntervalMinutes: number;
  allowLoyaltyRedemptionOffline: boolean;
  showOfflineWarnings: boolean;
  maxPendingOperations: number;
  cacheExpiryHours: number;
}

interface OfflineState {
  // Connection status
  isOnline: boolean;
  isManualOffline: boolean; // User toggled offline mode
  
  // Settings
  settings: OfflineSettings;
  
  // Cached data
  products: CachedProduct[];
  customers: CachedCustomer[];
  categories: CachedCategory[];
  
  // Pending operations queue
  pendingOperations: PendingOperation[];
  
  // Sync status
  syncStatus: SyncStatus;
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  toggleManualOffline: () => void;
  setManualOffline: (value: boolean) => void;
  updateSettings: (settings: Partial<OfflineSettings>) => void;
  
  // Cache operations
  cacheProducts: (products: CachedProduct[]) => void;
  cacheCustomers: (customers: CachedCustomer[]) => void;
  cacheCategories: (categories: CachedCategory[]) => void;
  getCachedProduct: (id: string) => CachedProduct | undefined;
  getCachedCustomer: (id: string) => CachedCustomer | undefined;
  searchCachedCustomers: (query: string) => CachedCustomer[];
  
  // Pending operations
  addPendingOperation: (op: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>) => string;
  updatePendingOperation: (id: string, updates: Partial<PendingOperation>) => void;
  removePendingOperation: (id: string) => void;
  getPendingOperations: () => PendingOperation[];
  
  // Sync
  setSyncing: (isSyncing: boolean) => void;
  updateLastSync: () => void;
  setNextScheduledSync: (date: string | null) => void;
  
  // Clear
  clearCache: () => void;
  clearPendingOperations: () => void;
}

const defaultSettings: OfflineSettings = {
  enabled: false,
  autoSyncEnabled: true,
  scheduledSyncEnabled: true,
  scheduledSyncIntervalMinutes: 30,
  allowLoyaltyRedemptionOffline: false,
  showOfflineWarnings: true,
  maxPendingOperations: 100,
  cacheExpiryHours: 24,
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      isManualOffline: false,
      settings: defaultSettings,
      products: [],
      customers: [],
      categories: [],
      pendingOperations: [],
      syncStatus: {
        lastSyncAt: null,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        nextScheduledSync: null,
      },
      
      // Connection status
      setOnlineStatus: (isOnline) => set({ isOnline }),
      
      toggleManualOffline: () => set((state) => ({ 
        isManualOffline: !state.isManualOffline 
      })),
      
      setManualOffline: (value) => set({ isManualOffline: value }),
      
      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // Cache products
      cacheProducts: (products) => {
        const cachedAt = new Date().toISOString();
        set({
          products: products.map(p => ({ ...p, cachedAt }))
        });
      },
      
      // Cache customers
      cacheCustomers: (customers) => {
        const cachedAt = new Date().toISOString();
        set({
          customers: customers.map(c => ({ ...c, cachedAt }))
        });
      },
      
      // Cache categories
      cacheCategories: (categories) => {
        const cachedAt = new Date().toISOString();
        set({
          categories: categories.map(c => ({ ...c, cachedAt }))
        });
      },
      
      // Get cached product
      getCachedProduct: (id) => {
        return get().products.find(p => p.id === id);
      },
      
      // Get cached customer
      getCachedCustomer: (id) => {
        return get().customers.find(c => c.id === id);
      },
      
      // Search cached customers
      searchCachedCustomers: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().customers.filter(c => 
          c.name.toLowerCase().includes(lowerQuery) ||
          c.phone.includes(query) ||
          (c.email && c.email.toLowerCase().includes(lowerQuery))
        );
      },
      
      // Add pending operation
      addPendingOperation: (op) => {
        const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newOp: PendingOperation = {
          ...op,
          id,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          status: 'pending',
        };
        
        set((state) => ({
          pendingOperations: [...state.pendingOperations, newOp],
          syncStatus: {
            ...state.syncStatus,
            pendingCount: state.syncStatus.pendingCount + 1,
          }
        }));
        
        return id;
      },
      
      // Update pending operation
      updatePendingOperation: (id, updates) => {
        set((state) => {
          const ops = state.pendingOperations.map(op => 
            op.id === id ? { ...op, ...updates } : op
          );
          const pendingCount = ops.filter(op => op.status === 'pending').length;
          const failedCount = ops.filter(op => op.status === 'failed').length;
          
          return {
            pendingOperations: ops,
            syncStatus: {
              ...state.syncStatus,
              pendingCount,
              failedCount,
            }
          };
        });
      },
      
      // Remove pending operation
      removePendingOperation: (id) => {
        set((state) => {
          const ops = state.pendingOperations.filter(op => op.id !== id);
          return {
            pendingOperations: ops,
            syncStatus: {
              ...state.syncStatus,
              pendingCount: ops.filter(op => op.status === 'pending').length,
              failedCount: ops.filter(op => op.status === 'failed').length,
            }
          };
        });
      },
      
      // Get pending operations
      getPendingOperations: () => get().pendingOperations,
      
      // Set syncing status
      setSyncing: (isSyncing) => set((state) => ({
        syncStatus: { ...state.syncStatus, isSyncing }
      })),
      
      // Update last sync
      updateLastSync: () => set((state) => ({
        syncStatus: { 
          ...state.syncStatus, 
          lastSyncAt: new Date().toISOString() 
        }
      })),
      
      // Set next scheduled sync
      setNextScheduledSync: (date) => set((state) => ({
        syncStatus: { ...state.syncStatus, nextScheduledSync: date }
      })),
      
      // Clear cache
      clearCache: () => set({
        products: [],
        customers: [],
        categories: [],
      }),
      
      // Clear pending operations
      clearPendingOperations: () => set((state) => ({
        pendingOperations: [],
        syncStatus: {
          ...state.syncStatus,
          pendingCount: 0,
          failedCount: 0,
        }
      })),
    }),
    {
      name: 'retailpro-offline-storage',
      partialize: (state) => ({
        settings: state.settings,
        products: state.products,
        customers: state.customers,
        categories: state.categories,
        pendingOperations: state.pendingOperations,
        syncStatus: state.syncStatus,
        isManualOffline: state.isManualOffline,
      }),
    }
  )
);

// Helper to check if effectively offline (either network or manual)
export const useIsEffectivelyOffline = () => {
  const { isOnline, isManualOffline, settings } = useOfflineStore();
  return !isOnline || (settings.enabled && isManualOffline);
};

// Helper to get offline status details
export const useOfflineStatus = () => {
  const { isOnline, isManualOffline, settings, syncStatus } = useOfflineStore();
  
  const isEffectivelyOffline = !isOnline || (settings.enabled && isManualOffline);
  const reason = !isOnline ? 'No internet connection' : isManualOffline ? 'Manual offline mode' : null;
  
  return {
    isOnline,
    isManualOffline,
    isEffectivelyOffline,
    reason,
    offlineEnabled: settings.enabled,
    syncStatus,
  };
};
