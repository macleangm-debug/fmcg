/**
 * Offline Sync Service
 * Handles data synchronization between local cache and server
 */

import { useOfflineStore, PendingOperation } from '../store/offlineStore';
import api, { productsApi, customersApi, categoriesApi, ordersApi } from '../api/client';

class OfflineSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize the service
  initialize() {
    if (this.isInitialized) return;
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Set initial status
      useOfflineStore.getState().setOnlineStatus(navigator.onLine);
    }
    
    this.isInitialized = true;
    this.startScheduledSync();
  }

  // Handle coming online
  private handleOnline() {
    console.log('[OfflineSync] Network connected');
    useOfflineStore.getState().setOnlineStatus(true);
    
    const { settings } = useOfflineStore.getState();
    if (settings.enabled && settings.autoSyncEnabled) {
      this.syncAll();
    }
  }

  // Handle going offline
  private handleOffline() {
    console.log('[OfflineSync] Network disconnected');
    useOfflineStore.getState().setOnlineStatus(false);
  }

  // Start scheduled sync
  startScheduledSync() {
    const { settings } = useOfflineStore.getState();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (settings.enabled && settings.scheduledSyncEnabled) {
      const intervalMs = settings.scheduledSyncIntervalMinutes * 60 * 1000;
      
      this.syncInterval = setInterval(() => {
        const { isOnline, isManualOffline } = useOfflineStore.getState();
        if (isOnline && !isManualOffline) {
          console.log('[OfflineSync] Running scheduled sync');
          this.syncAll();
        }
      }, intervalMs);
      
      // Set next scheduled sync time
      const nextSync = new Date(Date.now() + intervalMs).toISOString();
      useOfflineStore.getState().setNextScheduledSync(nextSync);
    }
  }

  // Stop scheduled sync
  stopScheduledSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    useOfflineStore.getState().setNextScheduledSync(null);
  }

  // Cache all data for offline use
  async cacheAllData(): Promise<{ success: boolean; message: string }> {
    const store = useOfflineStore.getState();
    
    try {
      console.log('[OfflineSync] Caching all data...');
      
      // Fetch and cache products
      const productsRes = await productsApi.getAll();
      if (productsRes.data) {
        store.cacheProducts(productsRes.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          price: p.price,
          stock_quantity: p.stock_quantity || 0,
          category_id: p.category_id || '',
          category_name: p.category_name,
          image_url: p.image_url,
        })));
      }
      
      // Fetch and cache customers
      const customersRes = await customersApi.getAll();
      if (customersRes.data) {
        store.cacheCustomers(customersRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          loyalty_points: c.loyalty_points || 0,
          loyalty_tier: c.loyalty_tier,
        })));
      }
      
      // Fetch and cache categories
      const categoriesRes = await categoriesApi.getAll();
      if (categoriesRes.data) {
        store.cacheCategories(categoriesRes.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
        })));
      }
      
      store.updateLastSync();
      console.log('[OfflineSync] Data cached successfully');
      
      return { success: true, message: 'Data cached successfully' };
    } catch (error: any) {
      console.error('[OfflineSync] Failed to cache data:', error);
      return { success: false, message: error.message || 'Failed to cache data' };
    }
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<{ synced: number; failed: number }> {
    const store = useOfflineStore.getState();
    const pendingOps = store.getPendingOperations().filter(op => op.status === 'pending' || op.status === 'failed');
    
    if (pendingOps.length === 0) {
      return { synced: 0, failed: 0 };
    }
    
    console.log(`[OfflineSync] Syncing ${pendingOps.length} pending operations...`);
    
    let synced = 0;
    let failed = 0;
    
    for (const op of pendingOps) {
      store.updatePendingOperation(op.id, { status: 'syncing' });
      
      try {
        await this.processPendingOperation(op);
        store.removePendingOperation(op.id);
        synced++;
      } catch (error: any) {
        const newRetryCount = op.retryCount + 1;
        
        if (newRetryCount >= 3) {
          store.updatePendingOperation(op.id, { 
            status: 'failed', 
            retryCount: newRetryCount,
            error: error.message 
          });
          failed++;
        } else {
          store.updatePendingOperation(op.id, { 
            status: 'pending', 
            retryCount: newRetryCount 
          });
        }
      }
    }
    
    console.log(`[OfflineSync] Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }

  // Process a single pending operation
  private async processPendingOperation(op: PendingOperation): Promise<void> {
    switch (op.type) {
      case 'order':
        await ordersApi.create(op.data);
        break;
        
      case 'customer':
        if (op.data.id) {
          await customersApi.update(op.data.id, op.data);
        } else {
          await customersApi.create(op.data);
        }
        break;
        
      case 'loyalty_points':
        // Sync loyalty points adjustment
        await api.post('/loyalty/points/adjust', op.data);
        break;
        
      case 'inventory_update':
        await api.put(`/products/${op.data.product_id}/stock`, { 
          quantity: op.data.quantity 
        });
        break;
        
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  // Full sync: cache fresh data and sync pending operations
  async syncAll(): Promise<{ success: boolean; message: string; details: any }> {
    const store = useOfflineStore.getState();
    
    if (store.syncStatus.isSyncing) {
      return { success: false, message: 'Sync already in progress', details: null };
    }
    
    if (!store.isOnline) {
      return { success: false, message: 'Cannot sync while offline', details: null };
    }
    
    store.setSyncing(true);
    
    try {
      // First, sync pending operations
      const syncResult = await this.syncPendingOperations();
      
      // Then, refresh cache
      const cacheResult = await this.cacheAllData();
      
      store.setSyncing(false);
      
      return {
        success: true,
        message: `Sync complete: ${syncResult.synced} operations synced`,
        details: {
          operationsSynced: syncResult.synced,
          operationsFailed: syncResult.failed,
          cacheRefreshed: cacheResult.success,
        }
      };
    } catch (error: any) {
      store.setSyncing(false);
      return {
        success: false,
        message: error.message || 'Sync failed',
        details: null
      };
    }
  }

  // Create order (handles offline scenario)
  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; isOffline: boolean }> {
    const { isOnline, isManualOffline, settings, addPendingOperation } = useOfflineStore.getState();
    
    const isEffectivelyOffline = !isOnline || (settings.enabled && isManualOffline);
    
    if (isEffectivelyOffline && settings.enabled) {
      // Queue for later sync
      const offlineOrderId = `offline_${Date.now()}`;
      const orderWithId = { ...orderData, offline_order_id: offlineOrderId };
      
      addPendingOperation({
        type: 'order',
        data: orderWithId,
      });
      
      // Update local stock cache
      for (const item of orderData.items || []) {
        this.updateLocalStock(item.product_id, -item.quantity);
      }
      
      return { success: true, orderId: offlineOrderId, isOffline: true };
    }
    
    // Online: create normally
    try {
      const response = await ordersApi.create(orderData);
      return { success: true, orderId: response.data.id, isOffline: false };
    } catch (error) {
      // If network error and offline mode enabled, queue it
      if (settings.enabled) {
        const offlineOrderId = `offline_${Date.now()}`;
        addPendingOperation({
          type: 'order',
          data: { ...orderData, offline_order_id: offlineOrderId },
        });
        return { success: true, orderId: offlineOrderId, isOffline: true };
      }
      throw error;
    }
  }

  // Update local stock in cache
  private updateLocalStock(productId: string, quantityChange: number) {
    const store = useOfflineStore.getState();
    const products = store.products.map(p => {
      if (p.id === productId) {
        return { ...p, stock_quantity: Math.max(0, p.stock_quantity + quantityChange) };
      }
      return p;
    });
    store.cacheProducts(products);
  }

  // Queue loyalty points adjustment
  queueLoyaltyPoints(customerId: string, points: number, reason: string) {
    const { addPendingOperation, settings } = useOfflineStore.getState();
    
    if (settings.enabled) {
      addPendingOperation({
        type: 'loyalty_points',
        data: { customer_id: customerId, points, reason },
      });
    }
  }

  // Check if loyalty redemption is allowed
  canRedeemLoyalty(): { allowed: boolean; reason?: string } {
    const { isOnline, isManualOffline, settings } = useOfflineStore.getState();
    const isEffectivelyOffline = !isOnline || (settings.enabled && isManualOffline);
    
    if (!isEffectivelyOffline) {
      return { allowed: true };
    }
    
    if (settings.allowLoyaltyRedemptionOffline) {
      return { allowed: true, reason: 'Points may be outdated' };
    }
    
    return { allowed: false, reason: 'Loyalty redemption not available offline' };
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();

// Hook for components
export const useOfflineSync = () => {
  return {
    initialize: () => offlineSyncService.initialize(),
    syncAll: () => offlineSyncService.syncAll(),
    cacheAllData: () => offlineSyncService.cacheAllData(),
    syncPendingOperations: () => offlineSyncService.syncPendingOperations(),
    createOrder: (data: any) => offlineSyncService.createOrder(data),
    queueLoyaltyPoints: (customerId: string, points: number, reason: string) => 
      offlineSyncService.queueLoyaltyPoints(customerId, points, reason),
    canRedeemLoyalty: () => offlineSyncService.canRedeemLoyalty(),
    startScheduledSync: () => offlineSyncService.startScheduledSync(),
    stopScheduledSync: () => offlineSyncService.stopScheduledSync(),
  };
};
