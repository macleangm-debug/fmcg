/**
 * SyncService - Handles synchronization of offline mutations
 * 
 * This service provides:
 * - Network status monitoring
 * - Automatic sync when coming back online
 * - Manual sync trigger
 * - Conflict resolution strategies
 */

import { 
  getPendingMutations, 
  markMutationSynced, 
  markMutationFailed,
  clearSyncedMutations,
  queueMutation,
  isOfflineModeEnabled,
  cacheProducts,
  cacheCustomers,
  cacheCategories,
  QueuedMutation
} from './OfflineDB';
import { ordersApi, customersApi, productsApi, categoriesApi } from '../api/client';

// Network status
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;
let listeners: ((online: boolean) => void)[] = [];

// Initialize network listeners (only in browser environment)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners(true);
    // Auto-sync when coming back online
    syncPendingMutations();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners(false);
  });
}

function notifyListeners(online: boolean) {
  listeners.forEach(listener => listener(online));
}

export function subscribeToNetworkStatus(listener: (online: boolean) => void): () => void {
  listeners.push(listener);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getNetworkStatus(): boolean {
  return isOnline;
}

// ============== SYNC LOGIC ==============

export async function syncPendingMutations(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  if (syncInProgress) {
    return { success: 0, failed: 0, errors: ['Sync already in progress'] };
  }
  
  if (!isOnline) {
    return { success: 0, failed: 0, errors: ['Device is offline'] };
  }
  
  syncInProgress = true;
  const results = { success: 0, failed: 0, errors: [] as string[] };
  
  try {
    const pendingMutations = await getPendingMutations();
    
    for (const mutation of pendingMutations) {
      try {
        await processMutation(mutation);
        await markMutationSynced(mutation.id!);
        results.success++;
      } catch (error: any) {
        const errorMsg = error?.response?.data?.detail || error?.message || 'Unknown error';
        await markMutationFailed(mutation.id!, errorMsg);
        results.failed++;
        results.errors.push(`${mutation.type}/${mutation.action}: ${errorMsg}`);
      }
    }
    
    // Clean up synced mutations
    await clearSyncedMutations();
    
  } finally {
    syncInProgress = false;
  }
  
  return results;
}

async function processMutation(mutation: QueuedMutation): Promise<void> {
  const { type, action, payload } = mutation;
  
  switch (type) {
    case 'order':
      if (action === 'create') {
        await ordersApi.create(payload);
      }
      break;
      
    case 'customer':
      if (action === 'create') {
        await customersApi.create(payload);
      } else if (action === 'update') {
        await customersApi.update(payload.id, payload.data);
      }
      break;
      
    case 'product':
      if (action === 'update') {
        await productsApi.update(payload.id, payload.data);
      }
      break;
      
    case 'expense':
      // Add expense sync when needed
      break;
      
    default:
      throw new Error(`Unknown mutation type: ${type}`);
  }
}

// ============== OFFLINE-AWARE API WRAPPERS ==============

/**
 * Create an order - works offline by queueing the mutation
 */
export async function createOrderOffline(orderData: any): Promise<{
  success: boolean;
  queued?: boolean;
  data?: any;
  error?: string;
}> {
  const offlineEnabled = await isOfflineModeEnabled();
  
  // If online and offline mode is not forced, try direct API call
  if (isOnline && !offlineEnabled) {
    try {
      const response = await ordersApi.create(orderData);
      return { success: true, data: response.data };
    } catch (error: any) {
      // If it fails due to network, queue it
      if (!navigator.onLine) {
        await queueMutation('order', 'create', orderData);
        return { success: true, queued: true };
      }
      return { success: false, error: error?.response?.data?.detail || error?.message };
    }
  }
  
  // Offline mode - queue the mutation
  await queueMutation('order', 'create', orderData);
  return { success: true, queued: true };
}

/**
 * Create a customer - works offline by queueing
 */
export async function createCustomerOffline(customerData: any): Promise<{
  success: boolean;
  queued?: boolean;
  data?: any;
  error?: string;
}> {
  const offlineEnabled = await isOfflineModeEnabled();
  
  if (isOnline && !offlineEnabled) {
    try {
      const response = await customersApi.create(customerData);
      return { success: true, data: response.data };
    } catch (error: any) {
      if (!navigator.onLine) {
        await queueMutation('customer', 'create', customerData);
        return { success: true, queued: true };
      }
      return { success: false, error: error?.response?.data?.detail || error?.message };
    }
  }
  
  await queueMutation('customer', 'create', customerData);
  return { success: true, queued: true };
}

// ============== CACHE REFRESH ==============

/**
 * Refresh all cached data from the server
 */
export async function refreshOfflineCache(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isOnline) {
    return { success: false, error: 'Device is offline' };
  }
  
  try {
    // Fetch products, customers, and categories in parallel
    const [productsRes, customersRes, categoriesRes] = await Promise.all([
      productsApi.getAll({ limit: 1000 }),
      customersApi.getAll({ limit: 1000 }),
      categoriesApi.getAll()
    ]);
    
    // Cache the data
    await Promise.all([
      cacheProducts(productsRes.data.items || productsRes.data || []),
      cacheCustomers(customersRes.data.items || customersRes.data || []),
      cacheCategories(categoriesRes.data || [])
    ]);
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || 'Failed to refresh cache' 
    };
  }
}

// ============== SYNC STATUS ==============

export function isSyncInProgress(): boolean {
  return syncInProgress;
}

export async function getSyncStatus(): Promise<{
  isOnline: boolean;
  syncInProgress: boolean;
  pendingCount: number;
}> {
  const pendingMutations = await getPendingMutations();
  return {
    isOnline,
    syncInProgress,
    pendingCount: pendingMutations.length
  };
}
