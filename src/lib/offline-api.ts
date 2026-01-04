// TEAM_003: Offline-aware API wrapper that intercepts requests and handles offline mode
// This wraps the existing api client without modifying it, ensuring no breaking changes

import { api as originalApi, ApiResponse } from './api';
import offlineDb from './offline-db';
import { isOnline } from './hooks/use-network-status';

// =============================================================================
// Types
// =============================================================================

export interface OfflineOrderResult {
    order: {
        id: string;            // Offline ID
        orderNumber: string;   // Same as ID for offline orders
        offline: true;
        createdAt: string;
        status: 'pending_sync';
        total: number;
    };
    offline: true;
    message: string;
}

// =============================================================================
// Offline-aware API methods
// =============================================================================

/**
 * Create an order - works offline by storing in IndexedDB
 * When online, behaves exactly like the original API
 * When offline, stores locally and returns a placeholder response
 */
export async function createOrderOfflineAware(orderData: any): Promise<ApiResponse<any>> {
    // If online, try the regular API first
    if (isOnline()) {
        try {
            const result = await originalApi.createOrder(orderData);

            // If successful, also cache the products with updated stock
            if (!result.error && result.data) {
                console.log('[OfflineAPI] Order created online:', (result.data as any).order?.orderNumber);
                return result;
            }

            // If it's a network error and we're actually offline now, fall through to offline handling
            if (result.error?.code === 'NETWORK_ERROR') {
                console.log('[OfflineAPI] Network error detected, falling back to offline mode');
                // Fall through to offline handling
            } else {
                // Other errors (validation, etc.) should be returned as-is
                return result;
            }
        } catch (error: any) {
            console.log('[OfflineAPI] Exception during order creation, falling back to offline mode:', error.message);
            // Fall through to offline handling
        }
    }

    // Offline mode: Store in IndexedDB
    console.log('[OfflineAPI] Creating offline order...');

    try {
        const pendingOrder = await offlineDb.pendingOrders.add(orderData);

        // Calculate total from items for display purposes
        let subtotal = 0;
        let totalDiscount = 0;

        if (orderData.items) {
            for (const item of orderData.items) {
                // Try to calculate item total similar to the backend
                const itemWeightTotalKg = item.itemWeightKg + (item.itemWeightG || 0) / 1000;
                const boxWeightPerBoxKg = (item.boxWeightKg || 0) + (item.boxWeightG || 0) / 1000;
                const totalBoxWeightKg = boxWeightPerBoxKg * (item.boxCount || 0);
                const netWeightKg = Math.max(0, itemWeightTotalKg - totalBoxWeightKg);
                const baseTotal = netWeightKg * item.pricePerKg;
                const itemDiscountAmount = baseTotal * ((item.itemDiscountPercent || 0) / 100);
                const finalTotal = baseTotal - itemDiscountAmount;
                subtotal += finalTotal;
            }
        }

        // Apply order discount
        const orderDiscountAmount = subtotal * ((orderData.discountPercent || 0) / 100);
        const total = subtotal - orderDiscountAmount;

        // Update local product cache stock (decrement)
        for (const item of orderData.items || []) {
            if (item.productId) {
                const cachedProduct = await offlineDb.cachedProducts.get(item.productId);
                if (cachedProduct) {
                    const itemWeightTotalKg = item.itemWeightKg + (item.itemWeightG || 0) / 1000;
                    const boxWeightPerBoxKg = (item.boxWeightKg || 0) + (item.boxWeightG || 0) / 1000;
                    const totalBoxWeightKg = boxWeightPerBoxKg * (item.boxCount || 0);
                    const netWeightKg = Math.max(0, itemWeightTotalKg - totalBoxWeightKg);
                    const newStock = Math.max(0, cachedProduct.stockQuantity - netWeightKg);
                    await offlineDb.cachedProducts.updateStock(item.productId, newStock);
                }
            }
        }

        const offlineResult: OfflineOrderResult = {
            order: {
                id: pendingOrder.id,
                orderNumber: pendingOrder.id,  // Use offline ID as order number for display
                offline: true,
                createdAt: new Date(pendingOrder.createdAt).toISOString(),
                status: 'pending_sync',
                total: Math.round(total * 100) / 100,
            },
            offline: true,
            message: 'Order saved offline. Will sync when connection is restored.',
        };

        console.log('[OfflineAPI] Offline order created:', pendingOrder.id);

        return { data: offlineResult };
    } catch (error: any) {
        console.error('[OfflineAPI] Failed to create offline order:', error);
        return {
            error: {
                code: 'OFFLINE_STORAGE_ERROR',
                message: 'Failed to save order offline: ' + error.message,
            },
        };
    }
}

/**
 * Get products - returns cached data when offline
 */
export async function getProductsOfflineAware(params?: { isActive?: boolean; limit?: number }): Promise<ApiResponse<any[]>> {
    // If online, try the regular API and cache the results
    if (isOnline()) {
        try {
            const result = await originalApi.getProducts(params);

            if (!result.error && result.data) {
                // Handle paginated response: extract .data property if present
                const productsData = (result.data as any)?.data || result.data;
                const productsArray = Array.isArray(productsData) ? productsData : [];

                console.log('[OfflineAPI] Got products from API:', productsArray.length, 'products');

                // Cache the products array for offline use
                if (productsArray.length > 0) {
                    await offlineDb.cachedProducts.cacheAll(productsArray);
                    console.log('[OfflineAPI] Cached', productsArray.length, 'products for offline use');
                }

                // Return the original paginated response structure
                return result;
            }

            // If network error, fall through to cached data
            if (result.error?.code === 'NETWORK_ERROR') {
                console.log('[OfflineAPI] Network error, using cached products');
            } else {
                return result;
            }
        } catch (error: any) {
            console.log('[OfflineAPI] Exception fetching products, using cache:', error.message);
        }
    }

    // Return cached products
    console.log('[OfflineAPI] Returning cached products...');
    try {
        const cachedProducts = await offlineDb.cachedProducts.getAll();

        if (cachedProducts.length === 0) {
            return {
                error: {
                    code: 'NO_CACHED_DATA',
                    message: 'No product data available offline. Please connect to the internet to load products.',
                },
            };
        }

        // Filter by isActive if specified
        let filteredProducts = cachedProducts;
        if (params?.isActive !== undefined) {
            filteredProducts = cachedProducts.filter(p => p.isActive === params.isActive);
        }

        // Apply limit if specified
        if (params?.limit) {
            filteredProducts = filteredProducts.slice(0, params.limit);
        }

        const cacheAge = await offlineDb.cachedProducts.getCacheAge();
        console.log('[OfflineAPI] Returning', filteredProducts.length, 'cached products (age:', Math.round((cacheAge || 0) / 1000 / 60), 'min)');

        return { data: filteredProducts };
    } catch (error: any) {
        console.error('[OfflineAPI] Failed to get cached products:', error);
        return {
            error: {
                code: 'CACHE_READ_ERROR',
                message: 'Failed to read cached products: ' + error.message,
            },
        };
    }
}

/**
 * Create cash transaction - works offline
 */
export async function createCashTransactionOfflineAware(data: {
    registrySessionId: number;
    cashierId: number;
    transactionType: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
    reference?: string;
    notes?: string;
}): Promise<ApiResponse<any>> {
    // If online, try the regular API
    if (isOnline()) {
        try {
            const result = await originalApi.post('/api/cash-transactions', data);
            if (!result.error) {
                return result;
            }
            if (result.error.code !== 'NETWORK_ERROR') {
                return result;
            }
            // Fall through to offline handling
        } catch (error) {
            // Fall through to offline handling
        }
    }

    // Offline: Store locally
    console.log('[OfflineAPI] Creating offline cash transaction...');
    try {
        const pendingTx = await offlineDb.pendingCashTransactions.add(data.transactionType, data);

        return {
            data: {
                id: pendingTx.id,
                offline: true,
                message: 'Transaction saved offline. Will sync when connection is restored.',
                ...data,
            },
        };
    } catch (error: any) {
        return {
            error: {
                code: 'OFFLINE_STORAGE_ERROR',
                message: 'Failed to save transaction offline: ' + error.message,
            },
        };
    }
}

/**
 * Clear all offline caches (Service Worker + IndexedDB)
 * Use this for hard refresh functionality
 */
export async function clearAllCaches(): Promise<void> {
    console.log('[OfflineAPI] Clearing all caches...');

    try {
        // Clear IndexedDB caches
        await offlineDb.cachedProducts.clear();
        await offlineDb.pendingOrders.clear();
        await offlineDb.pendingCashTransactions.clear();
        console.log('[OfflineAPI] IndexedDB caches cleared');

        // Clear Service Worker caches if available
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            console.log('[OfflineAPI] Service Worker caches cleared:', cacheNames.length, 'caches');
        }

        console.log('[OfflineAPI] All caches cleared successfully');
    } catch (error: any) {
        console.error('[OfflineAPI] Error clearing caches:', error);
        throw error;
    }
}

// =============================================================================
// Enhanced API export that includes offline-aware methods
// =============================================================================

export const offlineApi = {
    // Offline-aware methods
    createOrder: createOrderOfflineAware,
    getProducts: getProductsOfflineAware,
    createCashTransaction: createCashTransactionOfflineAware,

    // Cache management
    clearAllCaches: clearAllCaches,

    // Passthrough to original API for methods that require online
    login: originalApi.login,
    register: originalApi.register,
    pinLogin: originalApi.pinLogin,
    logout: originalApi.logout,
    getOrders: originalApi.getOrders,
    get: originalApi.get,
    post: originalApi.post,
    put: originalApi.put,
    patch: originalApi.patch,
    delete: originalApi.delete,
};

export default offlineApi;
