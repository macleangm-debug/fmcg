/**
 * OfflineDB Service - Manages offline data storage using IndexedDB (via Dexie)
 * 
 * This service provides:
 * - Queued mutations for offline operations
 * - Cached data for offline access
 * - Sync tracking and conflict resolution
 */

import Dexie, { Table } from 'dexie';

// Types for offline queue items
export interface QueuedMutation {
  id?: number;
  type: 'order' | 'customer' | 'product' | 'expense';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: Date;
  synced: boolean;
  error?: string;
  retryCount: number;
}

// Types for cached data
export interface CachedProduct {
  id: string;
  name: string;
  price: number;
  sku: string;
  barcode?: string;
  stock_quantity: number;
  category_id: string;
  category_name?: string;
  image?: string;
  cachedAt: Date;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyalty_points?: number;
  total_purchases?: number;
  cachedAt: Date;
}

export interface CachedCategory {
  id: string;
  name: string;
  description?: string;
  cachedAt: Date;
}

export interface OfflineSettings {
  key: string;
  value: any;
  updatedAt: Date;
}

// Define the database
class RetailProOfflineDB extends Dexie {
  // Queue for offline mutations
  mutationQueue!: Table<QueuedMutation, number>;
  
  // Cached data tables
  products!: Table<CachedProduct, string>;
  customers!: Table<CachedCustomer, string>;
  categories!: Table<CachedCategory, string>;
  
  // Settings
  settings!: Table<OfflineSettings, string>;

  constructor() {
    super('RetailProOfflineDB');
    
    this.version(1).stores({
      mutationQueue: '++id, type, action, synced, timestamp',
      products: 'id, name, sku, barcode, category_id, cachedAt',
      customers: 'id, name, phone, cachedAt',
      categories: 'id, name, cachedAt',
      settings: 'key, updatedAt'
    });
  }
}

// Create singleton instance - only in browser environment
let db: RetailProOfflineDB | null = null;

function getDB(): RetailProOfflineDB {
  if (!db) {
    if (typeof window === 'undefined') {
      // Return a mock for SSR - this should never actually be called during SSR
      throw new Error('OfflineDB cannot be used during server-side rendering');
    }
    db = new RetailProOfflineDB();
  }
  return db;
}

// ============== OFFLINE SETTINGS ==============

export async function getOfflineSetting(key: string): Promise<any> {
  const setting = await getDB().settings.get(key);
  return setting?.value;
}

export async function setOfflineSetting(key: string, value: any): Promise<void> {
  await getDB().settings.put({
    key,
    value,
    updatedAt: new Date()
  });
}

export async function isOfflineModeEnabled(): Promise<boolean> {
  const enabled = await getOfflineSetting('offlineModeEnabled');
  return enabled === true;
}

export async function setOfflineModeEnabled(enabled: boolean): Promise<void> {
  await setOfflineSetting('offlineModeEnabled', enabled);
}

// ============== MUTATION QUEUE ==============

export async function queueMutation(
  type: QueuedMutation['type'],
  action: QueuedMutation['action'],
  payload: any
): Promise<number> {
  const id = await getDB().mutationQueue.add({
    type,
    action,
    payload,
    timestamp: new Date(),
    synced: false,
    retryCount: 0
  });
  return id;
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return await getDB().mutationQueue
    .where('synced')
    .equals(0) // false = 0 in IndexedDB
    .sortBy('timestamp');
}

export async function markMutationSynced(id: number): Promise<void> {
  await getDB().mutationQueue.update(id, { synced: true });
}

export async function markMutationFailed(id: number, error: string): Promise<void> {
  const mutation = await getDB().mutationQueue.get(id);
  if (mutation) {
    await getDB().mutationQueue.update(id, {
      error,
      retryCount: (mutation.retryCount || 0) + 1
    });
  }
}

export async function clearSyncedMutations(): Promise<number> {
  return await getDB().mutationQueue
    .where('synced')
    .equals(1) // true = 1 in IndexedDB
    .delete();
}

export async function getPendingMutationCount(): Promise<number> {
  return await getDB().mutationQueue
    .where('synced')
    .equals(0)
    .count();
}

// ============== PRODUCT CACHE ==============

export async function cacheProducts(products: CachedProduct[]): Promise<void> {
  const cachedAt = new Date();
  const productsWithTimestamp = products.map(p => ({ ...p, cachedAt }));
  await getDB().products.bulkPut(productsWithTimestamp);
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  return await getDB().products.toArray();
}

export async function getCachedProduct(id: string): Promise<CachedProduct | undefined> {
  return await getDB().products.get(id);
}

export async function getCachedProductByBarcode(barcode: string): Promise<CachedProduct | undefined> {
  return await getDB().products.where('barcode').equals(barcode).first();
}

export async function clearProductCache(): Promise<void> {
  await getDB().products.clear();
}

// ============== CUSTOMER CACHE ==============

export async function cacheCustomers(customers: CachedCustomer[]): Promise<void> {
  const cachedAt = new Date();
  const customersWithTimestamp = customers.map(c => ({ ...c, cachedAt }));
  await getDB().customers.bulkPut(customersWithTimestamp);
}

export async function getCachedCustomers(): Promise<CachedCustomer[]> {
  return await getDB().customers.toArray();
}

export async function getCachedCustomer(id: string): Promise<CachedCustomer | undefined> {
  return await getDB().customers.get(id);
}

export async function searchCachedCustomers(query: string): Promise<CachedCustomer[]> {
  const lowerQuery = query.toLowerCase();
  return await getDB().customers
    .filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(query)
    )
    .toArray();
}

export async function clearCustomerCache(): Promise<void> {
  await getDB().customers.clear();
}

// ============== CATEGORY CACHE ==============

export async function cacheCategories(categories: CachedCategory[]): Promise<void> {
  const cachedAt = new Date();
  const categoriesWithTimestamp = categories.map(c => ({ ...c, cachedAt }));
  await getDB().categories.bulkPut(categoriesWithTimestamp);
}

export async function getCachedCategories(): Promise<CachedCategory[]> {
  return await getDB().categories.toArray();
}

export async function clearCategoryCache(): Promise<void> {
  await getDB().categories.clear();
}

// ============== FULL SYNC/CLEAR ==============

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    getDB().mutationQueue.clear(),
    getDB().products.clear(),
    getDB().customers.clear(),
    getDB().categories.clear()
  ]);
}

export async function getOfflineDataStats(): Promise<{
  pendingMutations: number;
  cachedProducts: number;
  cachedCustomers: number;
  cachedCategories: number;
  lastCacheTime?: Date;
}> {
  const [pendingMutations, cachedProducts, cachedCustomers, cachedCategories] = await Promise.all([
    getPendingMutationCount(),
    getDB().products.count(),
    getDB().customers.count(),
    getDB().categories.count()
  ]);

  // Get the latest cache time
  const latestProduct = await getDB().products.orderBy('cachedAt').last();
  
  return {
    pendingMutations,
    cachedProducts,
    cachedCustomers,
    cachedCategories,
    lastCacheTime: latestProduct?.cachedAt
  };
}

export default db;
