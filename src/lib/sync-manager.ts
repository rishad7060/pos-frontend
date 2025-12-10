// TEAM_003: Sync Manager for synchronizing offline data with the backend
import offlineDb, { PendingOrder, PendingCashTransaction } from './offline-db';
import { api } from './api';

// =============================================================================
// Types
// =============================================================================

export interface SyncResult {
    success: boolean;
    totalItems: number;
    syncedItems: number;
    failedItems: number;
    details: SyncItemResult[];
    errors: string[];
}

export interface SyncItemResult {
    id: string;
    type: 'order' | 'cash_transaction' | 'queue_item';
    success: boolean;
    serverResponse?: any;
    error?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

export interface SyncProgress {
    status: SyncStatus;
    currentItem: number;
    totalItems: number;
    currentType?: string;
    message?: string;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

// =============================================================================
// Sync Manager Class
// =============================================================================

class SyncManager {
    private isSyncing: boolean = false;
    private progressCallbacks: Set<SyncProgressCallback> = new Set();
    private maxRetries: number = 3;
    private retryDelayMs: number = 1000;

    /**
     * Subscribe to sync progress updates
     */
    onProgress(callback: SyncProgressCallback): () => void {
        this.progressCallbacks.add(callback);
        return () => this.progressCallbacks.delete(callback);
    }

    /**
     * Emit progress update to all subscribers
     */
    private emitProgress(progress: SyncProgress): void {
        this.progressCallbacks.forEach(cb => {
            try {
                cb(progress);
            } catch (e) {
                console.error('[SyncManager] Progress callback error:', e);
            }
        });
    }

    /**
     * Check if sync is currently in progress
     */
    get syncing(): boolean {
        return this.isSyncing;
    }

    /**
     * Check if network is available
     */
    isNetworkAvailable(): boolean {
        if (typeof navigator === 'undefined') return true;
        return navigator.onLine;
    }

    /**
     * Get count of pending items to sync
     */
    async getPendingCount(): Promise<number> {
        const stats = await offlineDb.getPendingSyncCount();
        return stats.total;
    }

    /**
     * Main sync function - syncs all pending data
     */
    async syncAll(): Promise<SyncResult> {
        if (this.isSyncing) {
            console.log('[SyncManager] Sync already in progress, skipping');
            return {
                success: false,
                totalItems: 0,
                syncedItems: 0,
                failedItems: 0,
                details: [],
                errors: ['Sync already in progress'],
            };
        }

        if (!this.isNetworkAvailable()) {
            console.log('[SyncManager] Network not available, cannot sync');
            return {
                success: false,
                totalItems: 0,
                syncedItems: 0,
                failedItems: 0,
                details: [],
                errors: ['Network not available'],
            };
        }

        this.isSyncing = true;
        const allDetails: SyncItemResult[] = [];
        const allErrors: string[] = [];

        try {
            console.log('[SyncManager] Starting sync...');
            this.emitProgress({ status: 'syncing', currentItem: 0, totalItems: 0, message: 'Preparing sync...' });

            // Get all pending items
            const [pendingOrders, pendingCashTx] = await Promise.all([
                offlineDb.pendingOrders.getPending(),
                offlineDb.pendingCashTransactions.getPending(),
            ]);

            const totalItems = pendingOrders.length + pendingCashTx.length;
            console.log('[SyncManager] Found', totalItems, 'items to sync');

            if (totalItems === 0) {
                this.emitProgress({ status: 'completed', currentItem: 0, totalItems: 0, message: 'Nothing to sync' });
                return {
                    success: true,
                    totalItems: 0,
                    syncedItems: 0,
                    failedItems: 0,
                    details: [],
                    errors: [],
                };
            }

            let currentItem = 0;

            // Sync orders first (highest priority)
            for (const order of pendingOrders) {
                currentItem++;
                this.emitProgress({
                    status: 'syncing',
                    currentItem,
                    totalItems,
                    currentType: 'order',
                    message: `Syncing order ${order.id}...`,
                });

                const result = await this.syncOrder(order);
                allDetails.push(result);
                if (!result.success && result.error) {
                    allErrors.push(`Order ${order.id}: ${result.error}`);
                }
            }

            // Sync cash transactions
            for (const transaction of pendingCashTx) {
                currentItem++;
                this.emitProgress({
                    status: 'syncing',
                    currentItem,
                    totalItems,
                    currentType: 'cash_transaction',
                    message: `Syncing ${transaction.type} transaction...`,
                });

                const result = await this.syncCashTransaction(transaction);
                allDetails.push(result);
                if (!result.success && result.error) {
                    allErrors.push(`Transaction ${transaction.id}: ${result.error}`);
                }
            }

            const syncedItems = allDetails.filter(d => d.success).length;
            const failedItems = allDetails.filter(d => !d.success).length;
            const success = failedItems === 0;

            this.emitProgress({
                status: success ? 'completed' : 'failed',
                currentItem: totalItems,
                totalItems,
                message: success
                    ? `Successfully synced ${syncedItems} items`
                    : `Synced ${syncedItems}/${totalItems} items (${failedItems} failed)`,
            });

            console.log('[SyncManager] Sync completed:', { syncedItems, failedItems, success });

            return {
                success,
                totalItems,
                syncedItems,
                failedItems,
                details: allDetails,
                errors: allErrors,
            };
        } catch (error: any) {
            console.error('[SyncManager] Sync error:', error);
            this.emitProgress({
                status: 'failed',
                currentItem: 0,
                totalItems: 0,
                message: `Sync failed: ${error.message}`,
            });
            return {
                success: false,
                totalItems: 0,
                syncedItems: 0,
                failedItems: 0,
                details: allDetails,
                errors: [error.message, ...allErrors],
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync a single pending order
     */
    private async syncOrder(order: PendingOrder): Promise<SyncItemResult> {
        try {
            // Mark as syncing
            await offlineDb.pendingOrders.update(order.id, { syncStatus: 'syncing' });

            // Send to server
            const result = await api.createOrder(order.data);

            if (result.error) {
                throw new Error(result.error.message || 'Failed to create order');
            }

            // Success - delete from pending
            await offlineDb.pendingOrders.delete(order.id);

            console.log('[SyncManager] Order synced successfully:', order.id, '-> Server ID:', (result.data as any)?.order?.id);

            return {
                id: order.id,
                type: 'order',
                success: true,
                serverResponse: result.data,
            };
        } catch (error: any) {
            console.error('[SyncManager] Failed to sync order:', order.id, error);

            // Update with failure status
            const newRetryCount = order.retryCount + 1;
            const shouldKeepRetrying = newRetryCount < this.maxRetries;

            await offlineDb.pendingOrders.update(order.id, {
                syncStatus: shouldKeepRetrying ? 'pending' : 'failed',
                retryCount: newRetryCount,
                lastError: error.message,
            });

            return {
                id: order.id,
                type: 'order',
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Sync a single pending cash transaction
     */
    private async syncCashTransaction(transaction: PendingCashTransaction): Promise<SyncItemResult> {
        try {
            // Mark as syncing
            await offlineDb.pendingCashTransactions.update(transaction.id, { syncStatus: 'syncing' });

            // Send to server
            const result = await api.post('/api/cash-transactions', transaction.data);

            if (result.error) {
                throw new Error(result.error.message || 'Failed to create cash transaction');
            }

            // Success - delete from pending
            await offlineDb.pendingCashTransactions.delete(transaction.id);

            console.log('[SyncManager] Cash transaction synced successfully:', transaction.id);

            return {
                id: transaction.id,
                type: 'cash_transaction',
                success: true,
                serverResponse: result.data,
            };
        } catch (error: any) {
            console.error('[SyncManager] Failed to sync cash transaction:', transaction.id, error);

            // Update with failure status
            const newRetryCount = transaction.retryCount + 1;
            const shouldKeepRetrying = newRetryCount < this.maxRetries;

            await offlineDb.pendingCashTransactions.update(transaction.id, {
                syncStatus: shouldKeepRetrying ? 'pending' : 'failed',
                retryCount: newRetryCount,
                lastError: error.message,
            });

            return {
                id: transaction.id,
                type: 'cash_transaction',
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Retry failed items
     */
    async retryFailed(): Promise<SyncResult> {
        console.log('[SyncManager] Retrying failed items...');

        // Reset failed items to pending for retry
        const failedOrders = await offlineDb.pendingOrders.getByStatus('failed');
        const failedTransactions = await offlineDb.pendingCashTransactions.getPending();

        for (const order of failedOrders) {
            if (order.retryCount < this.maxRetries) {
                await offlineDb.pendingOrders.update(order.id, { syncStatus: 'pending' });
            }
        }

        // Now sync all pending
        return this.syncAll();
    }

    /**
     * Clear all pending data (use with caution!)
     */
    async clearAllPending(): Promise<void> {
        console.warn('[SyncManager] Clearing all pending data');
        await offlineDb.pendingOrders.clear();
        await offlineDb.pendingCashTransactions.clear();
        await offlineDb.syncQueue.clear();
    }

    /**
     * Get detailed stats about pending items
     */
    async getStats(): Promise<{
        pendingOrders: number;
        failedOrders: number;
        pendingTransactions: number;
        failedTransactions: number;
        queueItems: number;
    }> {
        const [
            pendingOrders,
            failedOrders,
            allTransactions,
            queueItems,
        ] = await Promise.all([
            offlineDb.pendingOrders.countPending(),
            offlineDb.pendingOrders.getByStatus('failed').then(arr => arr.length),
            offlineDb.pendingCashTransactions.getAll(),
            offlineDb.syncQueue.count(),
        ]);

        const pendingTransactions = allTransactions.filter(t => t.syncStatus === 'pending').length;
        const failedTransactions = allTransactions.filter(t => t.syncStatus === 'failed').length;

        return {
            pendingOrders,
            failedOrders,
            pendingTransactions,
            failedTransactions,
            queueItems,
        };
    }
}

// Export singleton instance
export const syncManager = new SyncManager();

export default syncManager;
