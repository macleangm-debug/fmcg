import { useOfflineStore, PendingTransaction } from '../store/offlineStore';
import { ordersApi, productsApi, categoriesApi } from '../api/client';
import { Alert, Platform } from 'react-native';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Start automatic sync interval
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      return;
    }
    
    this.syncInterval = setInterval(() => {
      this.syncPendingTransactions();
    }, intervalMs);
    
    console.log('Auto-sync started with interval:', intervalMs);
  }
  
  // Stop automatic sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }
  
  // Sync all pending transactions
  async syncPendingTransactions(): Promise<{ success: number; failed: number }> {
    const store = useOfflineStore.getState();
    
    if (!store.isOnline || store.isSyncing || !store.offlineModeEnabled) {
      return { success: 0, failed: 0 };
    }
    
    const pending = store.pendingTransactions;
    if (pending.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    store.setSyncing(true);
    let successCount = 0;
    let failedCount = 0;
    
    console.log(`Starting sync of ${pending.length} pending transactions`);
    
    for (const transaction of pending) {
      try {
        await this.syncTransaction(transaction);
        store.removePendingTransaction(transaction.id);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to sync transaction ${transaction.id}:`, error);
        store.updateTransactionError(transaction.id, error.message || 'Unknown error');
        store.addSyncError(`Transaction ${transaction.id}: ${error.message}`);
        failedCount++;
        
        // Stop if too many retries
        if (transaction.retryCount >= 5) {
          console.warn(`Transaction ${transaction.id} has exceeded retry limit`);
        }
      }
    }
    
    store.setSyncing(false);
    store.updateLastSync();
    
    console.log(`Sync complete: ${successCount} success, ${failedCount} failed`);
    
    return { success: successCount, failed: failedCount };
  }
  
  // Sync a single transaction
  private async syncTransaction(transaction: PendingTransaction): Promise<void> {
    switch (transaction.type) {
      case 'sale':
        await this.syncSale(transaction.data);
        break;
      case 'return':
        await this.syncReturn(transaction.data);
        break;
      case 'adjustment':
        await this.syncAdjustment(transaction.data);
        break;
      default:
        throw new Error(`Unknown transaction type: ${transaction.type}`);
    }
  }
  
  // Sync a sale transaction
  private async syncSale(data: any): Promise<void> {
    // Mark as offline transaction for server tracking
    const orderData = {
      ...data,
      offline_transaction: true,
      offline_created_at: data.created_at,
    };
    
    await ordersApi.create(orderData);
  }
  
  // Sync a return transaction
  private async syncReturn(data: any): Promise<void> {
    // Handle returns - would need return API endpoint
    console.log('Syncing return:', data);
    // await returnsApi.create(data);
  }
  
  // Sync an inventory adjustment
  private async syncAdjustment(data: any): Promise<void> {
    // Handle adjustments - would need adjustment API endpoint  
    console.log('Syncing adjustment:', data);
    // await adjustmentsApi.create(data);
  }
  
  // Refresh product cache from server
  async refreshProductCache(): Promise<boolean> {
    const store = useOfflineStore.getState();
    
    if (!store.isOnline) {
      console.log('Cannot refresh cache - offline');
      return false;
    }
    
    try {
      store.setSyncing(true);
      
      // Fetch all products
      const productsResponse = await productsApi.getAll({ limit: 1000 });
      store.cacheProducts(productsResponse.data);
      
      // Fetch all categories
      const categoriesResponse = await categoriesApi.getAll();
      store.cacheCategories(categoriesResponse.data);
      
      store.updateLastSync();
      console.log(`Cache refreshed: ${productsResponse.data.length} products, ${categoriesResponse.data.length} categories`);
      
      return true;
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      store.addSyncError('Failed to refresh product cache');
      return false;
    } finally {
      store.setSyncing(false);
    }
  }
  
  // Get sync status summary
  getSyncStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSync: string | null;
    errors: string[];
  } {
    const store = useOfflineStore.getState();
    return {
      isOnline: store.isOnline,
      isSyncing: store.isSyncing,
      pendingCount: store.pendingTransactions.length,
      lastSync: store.lastSyncAt,
      errors: store.syncErrors,
    };
  }
  
  // Manual sync trigger with UI feedback
  async manualSync(): Promise<void> {
    const store = useOfflineStore.getState();
    
    if (!store.isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return;
    }
    
    if (store.isSyncing) {
      Alert.alert('Syncing', 'A sync is already in progress.');
      return;
    }
    
    const result = await this.syncPendingTransactions();
    
    if (result.success > 0 || result.failed > 0) {
      Alert.alert(
        'Sync Complete',
        `Successfully synced: ${result.success}\nFailed: ${result.failed}`
      );
    } else {
      Alert.alert('Sync Complete', 'No pending transactions to sync.');
    }
  }
}

export const syncService = new SyncService();
export default syncService;
