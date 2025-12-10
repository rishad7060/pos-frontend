// TEAM_003: Offline database layer using IndexedDB for PWA support
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// =============================================================================
// Database Schema Types
// =============================================================================

export interface PendingOrder {
    id: string;                // Temporary offline ID (e.g., "OFFLINE-1733697600000-001")
    data: any;                 // Full order payload to send to API
    createdAt: number;         // Timestamp when created
    syncStatus: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    lastError?: string;
}

export interface PendingCashTransaction {
    id: string;
    type: 'cash_in' | 'cash_out';
    data: {
        registrySessionId: number;
        cashierId: number;
        transactionType: string;
        amount: number;
        reason: string;
        reference?: string;
        notes?: string;
    };
    createdAt: number;
    syncStatus: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    lastError?: string;
}

export interface CachedProduct {
    id: number;
    name: string;
    description: string | null;
    defaultPricePerKg: number | null;
    category: string | null;
    isActive: boolean;
    sku: string | null;
    stockQuantity: number;
    unitType: string;
    imageUrl?: string | null;
    cachedAt: number;
}

export interface CachedCustomer {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    cachedAt: number;
}

export interface SyncQueueItem {
    id: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body: string;
    timestamp: number;
    priority: number;  // Lower = higher priority
    retryCount: number;
    lastError?: string;
}

interface POSOfflineDBSchema extends DBSchema {
    pendingOrders: {
        key: string;
        value: PendingOrder;
        indexes: {
            'by-sync-status': string;
            'by-created-at': number;
        };
    };
    pendingCashTransactions: {
        key: string;
        value: PendingCashTransaction;
        indexes: {
            'by-sync-status': string;
            'by-created-at': number;
        };
    };
    cachedProducts: {
        key: number;
        value: CachedProduct;
        indexes: {
            'by-category': string;
        };
    };
    cachedCustomers: {
        key: number;
        value: CachedCustomer;
    };
    syncQueue: {
        key: string;
        value: SyncQueueItem;
        indexes: {
            'by-priority': number;
            'by-timestamp': number;
        };
    };
    metadata: {
        key: string;
        value: {
            key: string;
            value: any;
            updatedAt: number;
        };
    };
}

// =============================================================================
// Database Instance Management
// =============================================================================

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<POSOfflineDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<POSOfflineDBSchema>> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await openDB<POSOfflineDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            console.log('[OfflineDB] Upgrading database from version', oldVersion, 'to', newVersion);

            // Create stores if they don't exist
            if (!db.objectStoreNames.contains('pendingOrders')) {
                const pendingOrdersStore = db.createObjectStore('pendingOrders', { keyPath: 'id' });
                pendingOrdersStore.createIndex('by-sync-status', 'syncStatus');
                pendingOrdersStore.createIndex('by-created-at', 'createdAt');
            }

            if (!db.objectStoreNames.contains('pendingCashTransactions')) {
                const pendingCashStore = db.createObjectStore('pendingCashTransactions', { keyPath: 'id' });
                pendingCashStore.createIndex('by-sync-status', 'syncStatus');
                pendingCashStore.createIndex('by-created-at', 'createdAt');
            }

            if (!db.objectStoreNames.contains('cachedProducts')) {
                const productsStore = db.createObjectStore('cachedProducts', { keyPath: 'id' });
                productsStore.createIndex('by-category', 'category');
            }

            if (!db.objectStoreNames.contains('cachedCustomers')) {
                db.createObjectStore('cachedCustomers', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                syncQueueStore.createIndex('by-priority', 'priority');
                syncQueueStore.createIndex('by-timestamp', 'timestamp');
            }

            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }
        },
        blocked() {
            console.warn('[OfflineDB] Database blocked by another connection');
        },
        blocking() {
            console.warn('[OfflineDB] Blocking other database connections');
        },
        terminated() {
            console.error('[OfflineDB] Database connection terminated unexpectedly');
            dbInstance = null;
        },
    });

    return dbInstance;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique offline ID for orders
 */
export function generateOfflineOrderId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `OFFLINE-${timestamp}-${random}`;
}

/**
 * Generate a unique ID for sync queue items
 */
export function generateSyncId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Check if an order ID indicates it was created offline
 */
export function isOfflineOrderId(orderId: string): boolean {
    return typeof orderId === 'string' && orderId.startsWith('OFFLINE-');
}

// =============================================================================
// Pending Orders Operations
// =============================================================================

export const pendingOrders = {
    async add(orderData: any): Promise<PendingOrder> {
        const db = await getDB();
        const order: PendingOrder = {
            id: generateOfflineOrderId(),
            data: orderData,
            createdAt: Date.now(),
            syncStatus: 'pending',
            retryCount: 0,
        };
        await db.add('pendingOrders', order);
        console.log('[OfflineDB] Added pending order:', order.id);
        return order;
    },

    async getAll(): Promise<PendingOrder[]> {
        const db = await getDB();
        return db.getAll('pendingOrders');
    },

    async getPending(): Promise<PendingOrder[]> {
        const db = await getDB();
        return db.getAllFromIndex('pendingOrders', 'by-sync-status', 'pending');
    },

    async getByStatus(status: PendingOrder['syncStatus']): Promise<PendingOrder[]> {
        const db = await getDB();
        return db.getAllFromIndex('pendingOrders', 'by-sync-status', status);
    },

    async get(id: string): Promise<PendingOrder | undefined> {
        const db = await getDB();
        return db.get('pendingOrders', id);
    },

    async update(id: string, updates: Partial<PendingOrder>): Promise<void> {
        const db = await getDB();
        const existing = await db.get('pendingOrders', id);
        if (existing) {
            await db.put('pendingOrders', { ...existing, ...updates });
            console.log('[OfflineDB] Updated pending order:', id, updates);
        }
    },

    async delete(id: string): Promise<void> {
        const db = await getDB();
        await db.delete('pendingOrders', id);
        console.log('[OfflineDB] Deleted pending order:', id);
    },

    async count(): Promise<number> {
        const db = await getDB();
        return db.count('pendingOrders');
    },

    async countPending(): Promise<number> {
        const db = await getDB();
        return db.countFromIndex('pendingOrders', 'by-sync-status', 'pending');
    },

    async clear(): Promise<void> {
        const db = await getDB();
        await db.clear('pendingOrders');
        console.log('[OfflineDB] Cleared all pending orders');
    },
};

// =============================================================================
// Pending Cash Transactions Operations
// =============================================================================

export const pendingCashTransactions = {
    async add(type: 'cash_in' | 'cash_out', data: PendingCashTransaction['data']): Promise<PendingCashTransaction> {
        const db = await getDB();
        const transaction: PendingCashTransaction = {
            id: generateSyncId(),
            type,
            data,
            createdAt: Date.now(),
            syncStatus: 'pending',
            retryCount: 0,
        };
        await db.add('pendingCashTransactions', transaction);
        console.log('[OfflineDB] Added pending cash transaction:', transaction.id);
        return transaction;
    },

    async getAll(): Promise<PendingCashTransaction[]> {
        const db = await getDB();
        return db.getAll('pendingCashTransactions');
    },

    async getPending(): Promise<PendingCashTransaction[]> {
        const db = await getDB();
        return db.getAllFromIndex('pendingCashTransactions', 'by-sync-status', 'pending');
    },

    async update(id: string, updates: Partial<PendingCashTransaction>): Promise<void> {
        const db = await getDB();
        const existing = await db.get('pendingCashTransactions', id);
        if (existing) {
            await db.put('pendingCashTransactions', { ...existing, ...updates });
        }
    },

    async delete(id: string): Promise<void> {
        const db = await getDB();
        await db.delete('pendingCashTransactions', id);
    },

    async count(): Promise<number> {
        const db = await getDB();
        return db.count('pendingCashTransactions');
    },

    async countPending(): Promise<number> {
        const db = await getDB();
        return db.countFromIndex('pendingCashTransactions', 'by-sync-status', 'pending');
    },

    async clear(): Promise<void> {
        const db = await getDB();
        await db.clear('pendingCashTransactions');
        console.log('[OfflineDB] Cleared all pending cash transactions');
    },
};

// =============================================================================
// Cached Products Operations
// =============================================================================

export const cachedProducts = {
    async cacheAll(products: CachedProduct[]): Promise<void> {
        const db = await getDB();
        const tx = db.transaction('cachedProducts', 'readwrite');
        const now = Date.now();

        await Promise.all([
            ...products.map(p => tx.store.put({ ...p, cachedAt: now })),
            tx.done,
        ]);
        console.log('[OfflineDB] Cached', products.length, 'products');
    },

    async getAll(): Promise<CachedProduct[]> {
        const db = await getDB();
        return db.getAll('cachedProducts');
    },

    async get(id: number): Promise<CachedProduct | undefined> {
        const db = await getDB();
        return db.get('cachedProducts', id);
    },

    async getByCategory(category: string): Promise<CachedProduct[]> {
        const db = await getDB();
        return db.getAllFromIndex('cachedProducts', 'by-category', category);
    },

    async updateStock(id: number, newQuantity: number): Promise<void> {
        const db = await getDB();
        const product = await db.get('cachedProducts', id);
        if (product) {
            await db.put('cachedProducts', { ...product, stockQuantity: newQuantity, cachedAt: Date.now() });
        }
    },

    async clear(): Promise<void> {
        const db = await getDB();
        await db.clear('cachedProducts');
    },

    async getCacheAge(): Promise<number | null> {
        const db = await getDB();
        const products = await db.getAll('cachedProducts');
        if (products.length === 0) return null;
        const oldestCache = Math.min(...products.map(p => p.cachedAt));
        return Date.now() - oldestCache;
    },
};

// =============================================================================
// Cached Customers Operations
// =============================================================================

export const cachedCustomers = {
    async cacheAll(customers: CachedCustomer[]): Promise<void> {
        const db = await getDB();
        const tx = db.transaction('cachedCustomers', 'readwrite');
        const now = Date.now();

        await Promise.all([
            ...customers.map(c => tx.store.put({ ...c, cachedAt: now })),
            tx.done,
        ]);
        console.log('[OfflineDB] Cached', customers.length, 'customers');
    },

    async getAll(): Promise<CachedCustomer[]> {
        const db = await getDB();
        return db.getAll('cachedCustomers');
    },

    async get(id: number): Promise<CachedCustomer | undefined> {
        const db = await getDB();
        return db.get('cachedCustomers', id);
    },

    async clear(): Promise<void> {
        const db = await getDB();
        await db.clear('cachedCustomers');
    },
};

// =============================================================================
// Sync Queue Operations (Generic API queue for any endpoint)
// =============================================================================

export const syncQueue = {
    async add(endpoint: string, method: SyncQueueItem['method'], body: any, priority: number = 5): Promise<SyncQueueItem> {
        const db = await getDB();
        const item: SyncQueueItem = {
            id: generateSyncId(),
            endpoint,
            method,
            body: JSON.stringify(body),
            timestamp: Date.now(),
            priority,
            retryCount: 0,
        };
        await db.add('syncQueue', item);
        console.log('[OfflineDB] Added to sync queue:', item.id, endpoint);
        return item;
    },

    async getAll(): Promise<SyncQueueItem[]> {
        const db = await getDB();
        const items = await db.getAll('syncQueue');
        // Sort by priority (lower first), then by timestamp (older first)
        return items.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.timestamp - b.timestamp;
        });
    },

    async get(id: string): Promise<SyncQueueItem | undefined> {
        const db = await getDB();
        return db.get('syncQueue', id);
    },

    async update(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
        const db = await getDB();
        const existing = await db.get('syncQueue', id);
        if (existing) {
            await db.put('syncQueue', { ...existing, ...updates });
        }
    },

    async delete(id: string): Promise<void> {
        const db = await getDB();
        await db.delete('syncQueue', id);
    },

    async count(): Promise<number> {
        const db = await getDB();
        return db.count('syncQueue');
    },

    async clear(): Promise<void> {
        const db = await getDB();
        await db.clear('syncQueue');
    },
};

// =============================================================================
// Metadata Operations
// =============================================================================

export const metadata = {
    async set(key: string, value: any): Promise<void> {
        const db = await getDB();
        await db.put('metadata', { key, value, updatedAt: Date.now() });
    },

    async get<T = any>(key: string): Promise<T | undefined> {
        const db = await getDB();
        const item = await db.get('metadata', key);
        return item?.value as T | undefined;
    },

    async delete(key: string): Promise<void> {
        const db = await getDB();
        await db.delete('metadata', key);
    },
};

// =============================================================================
// Aggregated Stats
// =============================================================================

export async function getPendingSyncCount(): Promise<{
    orders: number;
    cashTransactions: number;
    queue: number;
    total: number;
}> {
    const [orders, cashTransactions, queue] = await Promise.all([
        pendingOrders.countPending(),
        pendingCashTransactions.countPending(),
        syncQueue.count(),
    ]);

    return {
        orders,
        cashTransactions,
        queue,
        total: orders + cashTransactions + queue,
    };
}

// =============================================================================
// Database Cleanup
// =============================================================================

export async function cleanupOldData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await getDB();
    const cutoff = Date.now() - maxAgeMs;

    // Clean up old synced orders that somehow weren't deleted
    const orders = await db.getAll('pendingOrders');
    for (const order of orders) {
        if (order.createdAt < cutoff && order.syncStatus !== 'pending') {
            await db.delete('pendingOrders', order.id);
        }
    }

    // Clean up old cash transactions
    const transactions = await db.getAll('pendingCashTransactions');
    for (const tx of transactions) {
        if (tx.createdAt < cutoff && tx.syncStatus !== 'pending') {
            await db.delete('pendingCashTransactions', tx.id);
        }
    }

    console.log('[OfflineDB] Cleanup completed');
}

// =============================================================================
// Session Caching for Offline Support
// =============================================================================

const SESSION_KEYS = {
    POS_USER: 'pos_user_session',
    REGISTRY_SESSION: 'pos_registry_session',
    PERMISSIONS: 'pos_user_permissions',
};

export const sessionCache = {
    // Cache the current user session
    async saveUser(userData: any): Promise<void> {
        await metadata.set(SESSION_KEYS.POS_USER, userData);
        console.log('[OfflineDB] Cached user session:', userData?.fullName);
    },

    // Get cached user session
    async getUser(): Promise<any | null> {
        return await metadata.get(SESSION_KEYS.POS_USER) || null;
    },

    // Clear cached user session
    async clearUser(): Promise<void> {
        await metadata.delete(SESSION_KEYS.POS_USER);
        console.log('[OfflineDB] Cleared user session cache');
    },

    // Cache the current registry session
    async saveRegistrySession(session: any): Promise<void> {
        await metadata.set(SESSION_KEYS.REGISTRY_SESSION, session);
        console.log('[OfflineDB] Cached registry session:', session?.sessionNumber);
    },

    // Get cached registry session
    async getRegistrySession(): Promise<any | null> {
        return await metadata.get(SESSION_KEYS.REGISTRY_SESSION) || null;
    },

    // Clear cached registry session
    async clearRegistrySession(): Promise<void> {
        await metadata.delete(SESSION_KEYS.REGISTRY_SESSION);
        console.log('[OfflineDB] Cleared registry session cache');
    },

    // Cache user permissions
    async savePermissions(permissions: any): Promise<void> {
        await metadata.set(SESSION_KEYS.PERMISSIONS, permissions);
        console.log('[OfflineDB] Cached user permissions');
    },

    // Get cached permissions
    async getPermissions(): Promise<any | null> {
        return await metadata.get(SESSION_KEYS.PERMISSIONS) || null;
    },

    // Clear all session data (on logout)
    async clearAll(): Promise<void> {
        await metadata.delete(SESSION_KEYS.POS_USER);
        await metadata.delete(SESSION_KEYS.REGISTRY_SESSION);
        await metadata.delete(SESSION_KEYS.PERMISSIONS);
        console.log('[OfflineDB] Cleared all session caches');
    },
};

// =============================================================================
// Export default object for convenience
// =============================================================================

const offlineDb = {
    pendingOrders,
    pendingCashTransactions,
    cachedProducts,
    cachedCustomers,
    syncQueue,
    metadata,
    sessionCache,
    getPendingSyncCount,
    cleanupOldData,
    generateOfflineOrderId,
    isOfflineOrderId,
};

export default offlineDb;
