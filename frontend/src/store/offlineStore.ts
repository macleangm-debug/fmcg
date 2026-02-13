import { create } from 'zustand';
import { Platform } from 'react-native';

// Simple storage that works on both web and native
const getStorage = () => {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
    };
  }
  // Return a no-op storage for SSR or when localStorage is not available
  return {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
  };
};

// Pending transaction to be synced when online
export interface PendingTransaction {
  id: string;
  type: 'sale' | 'return' | 'adjustment';
  data: any;
  created_at: string;
  retryCount: number;
  lastError?: string;
}

// Cached product for offline use
export interface CachedProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  category_id?: string;
  category_name?: string;
  image?: string;
  tax_rate?: number;
  is_active: boolean;
  variants?: any[];
  has_variants?: boolean;
  cached_at: string;
}

interface OfflineState {
  // Network status
  isOnline: boolean;
  lastOnlineAt: string | null;
  
  // Offline mode settings
  offlineModeEnabled: boolean;
  autoSyncEnabled: boolean;
  
  // Pending transactions queue
  pendingTransactions: PendingTransaction[];
  
  // Cached data for offline use
  cachedProducts: CachedProduct[];
  cachedCategories: { id: string; name: string; }[];
  lastSyncAt: string | null;
  
  // Sync status
  isSyncing: boolean;
  syncErrors: string[];
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setOfflineModeEnabled: (enabled: boolean) => void;
  
  // Transaction queue management
  addPendingTransaction: (transaction: Omit<PendingTransaction, 'id' | 'created_at' | 'retryCount'>) => string;
  removePendingTransaction: (id: string) => void;
  updateTransactionError: (id: string, error: string) => void;
  clearAllPendingTransactions: () => void;
  
  // Cache management
  cacheProducts: (products: any[]) => void;
  cacheCategories: (categories: any[]) => void;
  getProductByBarcode: (barcode: string) => CachedProduct | undefined;
  getProductBySku: (sku: string) => CachedProduct | undefined;
  getProductById: (id: string) => CachedProduct | undefined;
  clearCache: () => void;
  
  // Sync actions
  setSyncing: (isSyncing: boolean) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  updateLastSync: () => void;
}

// Generate unique ID for transactions
const generateId = () => `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  // Initial state
  isOnline: true,
  lastOnlineAt: null,
  offlineModeEnabled: true,
  autoSyncEnabled: true,
  pendingTransactions: [],
  cachedProducts: [],
  cachedCategories: [],
  lastSyncAt: null,
  isSyncing: false,
  syncErrors: [],
  
  // Network status
  setOnlineStatus: (isOnline: boolean) => {
    const state = get();
    set({ 
      isOnline,
      lastOnlineAt: isOnline ? new Date().toISOString() : state.lastOnlineAt
    });
  },
  
  setOfflineModeEnabled: (enabled: boolean) => {
    set({ offlineModeEnabled: enabled });
  },
      
      // Transaction queue
      addPendingTransaction: (transaction) => {
        const id = generateId();
        const newTransaction: PendingTransaction = {
          ...transaction,
          id,
          created_at: new Date().toISOString(),
          retryCount: 0,
        };
        
        set(state => ({
          pendingTransactions: [...state.pendingTransactions, newTransaction]
        }));
        
        return id;
      },
      
      removePendingTransaction: (id: string) => {
        set(state => ({
          pendingTransactions: state.pendingTransactions.filter(t => t.id !== id)
        }));
      },
      
      updateTransactionError: (id: string, error: string) => {
        set(state => ({
          pendingTransactions: state.pendingTransactions.map(t =>
            t.id === id 
              ? { ...t, lastError: error, retryCount: t.retryCount + 1 }
              : t
          )
        }));
      },
      
      clearAllPendingTransactions: () => {
        set({ pendingTransactions: [] });
      },
      
      // Cache management
      cacheProducts: (products: any[]) => {
        const cachedAt = new Date().toISOString();
        const cachedProducts: CachedProduct[] = products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          price: p.price || p.cost_price || 0,
          cost_price: p.cost_price,
          stock_quantity: p.stock_quantity || p.quantity || 0,
          category_id: p.category_id,
          category_name: p.category_name,
          image: p.image,
          tax_rate: p.tax_rate || 0,
          is_active: p.is_active !== false,
          variants: p.variants,
          has_variants: p.has_variants,
          cached_at: cachedAt,
        }));
        
        set({ cachedProducts, lastSyncAt: cachedAt });
      },
      
      cacheCategories: (categories: any[]) => {
        set({ 
          cachedCategories: categories.map(c => ({ id: c.id, name: c.name }))
        });
      },
      
      getProductByBarcode: (barcode: string) => {
        const { cachedProducts } = get();
        return cachedProducts.find(p => 
          p.barcode === barcode || 
          p.variants?.some(v => v.barcode === barcode)
        );
      },
      
      getProductBySku: (sku: string) => {
        const { cachedProducts } = get();
        return cachedProducts.find(p => 
          p.sku === sku ||
          p.variants?.some(v => v.sku === sku)
        );
      },
      
      getProductById: (id: string) => {
        const { cachedProducts } = get();
        return cachedProducts.find(p => p.id === id);
      },
      
      clearCache: () => {
        set({ cachedProducts: [], cachedCategories: [], lastSyncAt: null });
      },
      
      // Sync status
      setSyncing: (isSyncing: boolean) => {
        set({ isSyncing });
      },
      
      addSyncError: (error: string) => {
        set(state => ({
          syncErrors: [...state.syncErrors.slice(-9), error] // Keep last 10 errors
        }));
      },
      
      clearSyncErrors: () => {
        set({ syncErrors: [] });
      },
      
      updateLastSync: () => {
        set({ lastSyncAt: new Date().toISOString() });
      },
    })
);

// Network listener setup
export const setupNetworkListener = () => {
  if (Platform.OS === 'web') {
    // Web network listener
    const handleOnline = () => useOfflineStore.getState().setOnlineStatus(true);
    const handleOffline = () => useOfflineStore.getState().setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    useOfflineStore.getState().setOnlineStatus(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  } else {
    // Native network listener using NetInfo
    const NetInfo = require('@react-native-community/netinfo').default;
    return NetInfo.addEventListener((state: any) => {
      const isConnected = state.isConnected ?? false;
      useOfflineStore.getState().setOnlineStatus(isConnected);
    });
  }
};
