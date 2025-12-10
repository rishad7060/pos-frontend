// TEAM_003: Offline status indicator component for POS header
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import offlineDb from '@/lib/offline-db';
import syncManager, { SyncProgress, SyncResult } from '@/lib/sync-manager';
import { toast } from 'sonner';

interface OfflineIndicatorProps {
    onSyncComplete?: (result: SyncResult) => void;
    showDetailed?: boolean;
    isOfflineOverride?: boolean; // TEAM_003: Allow parent to override offline status
}

interface PendingStats {
    orders: number;
    cashTransactions: number;
    total: number;
}

export function OfflineIndicator({ onSyncComplete, showDetailed = false, isOfflineOverride }: OfflineIndicatorProps) {
    const networkStatus = useNetworkStatus({
        onOnline: () => {
            // Only show toast if not overridden
            if (isOfflineOverride === undefined) {
                toast.success('Back online', { description: 'Network connection restored' });
            }
        },
        onOffline: () => {
            if (isOfflineOverride === undefined) {
                toast.warning('You are offline', { description: 'Orders will be saved locally' });
            }
        },
        onReconnect: () => {
            // Auto-sync when coming back online
            if (pendingStats.total > 0 && !isOfflineOverride) {
                toast.info('Syncing offline data...', { description: `${pendingStats.total} items pending` });
                handleSync();
            }
        },
    });

    const [pendingStats, setPendingStats] = useState<PendingStats>({ orders: 0, cashTransactions: 0, total: 0 });
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Refresh pending stats periodically
    const refreshStats = useCallback(async () => {
        try {
            const stats = await offlineDb.getPendingSyncCount();
            setPendingStats({
                orders: stats.orders,
                cashTransactions: stats.cashTransactions,
                total: stats.total,
            });
        } catch (error) {
            console.error('[OfflineIndicator] Failed to get pending stats:', error);
        }
    }, []);

    useEffect(() => {
        refreshStats();
        const interval = setInterval(refreshStats, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [refreshStats]);

    // Subscribe to sync progress
    useEffect(() => {
        const unsubscribe = syncManager.onProgress((progress) => {
            setSyncProgress(progress);
            if (progress.status === 'completed' || progress.status === 'failed') {
                // Clear progress after a short delay
                setTimeout(() => setSyncProgress(null), 3000);
                refreshStats();
            }
        });
        return unsubscribe;
    }, [refreshStats]);

    const handleSync = async () => {
        // TEAM_003: Check both hook status and override
        const actuallyOffline = isOfflineOverride ?? !networkStatus.isOnline;
        if (actuallyOffline) {
            toast.error('Cannot sync while offline');
            return;
        }

        const result = await syncManager.syncAll();

        if (result.success) {
            toast.success('Sync complete', {
                description: `${result.syncedItems} items synchronized`,
            });
        } else if (result.syncedItems > 0) {
            toast.warning('Partial sync', {
                description: `${result.syncedItems} synced, ${result.failedItems} failed`,
            });
        } else if (result.totalItems > 0) {
            toast.error('Sync failed', {
                description: result.errors[0] || 'Could not sync items',
            });
        }

        onSyncComplete?.(result);
        refreshStats();
    };

    // Determine display state
    // TEAM_003: Use isOfflineOverride if provided, otherwise use networkStatus
    const isSyncing = syncProgress?.status === 'syncing';
    const hasPending = pendingStats.total > 0;
    const isOffline = isOfflineOverride ?? !networkStatus.isOnline;

    // If online and no pending items, show minimal indicator or nothing
    if (!isOffline && !hasPending && !isSyncing && !showDetailed) {
        return null;
    }

    // Minimal view - just an icon with badge
    if (!showDetailed && !isOffline && !isSyncing) {
        if (!hasPending) return null;

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSync}
                            className="relative text-muted-foreground hover:text-foreground"
                        >
                            <CloudOff className="h-4 w-4" />
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                            >
                                {pendingStats.total}
                            </Badge>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{pendingStats.total} items pending sync</p>
                        <p className="text-xs text-muted-foreground">Click to sync now</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={isOffline ? 'destructive' : hasPending ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`relative gap-2 ${isSyncing ? 'animate-pulse' : ''}`}
                >
                    {/* Status Icon */}
                    {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isOffline ? (
                        <WifiOff className="h-4 w-4" />
                    ) : hasPending ? (
                        <CloudOff className="h-4 w-4" />
                    ) : (
                        <Wifi className="h-4 w-4" />
                    )}

                    {/* Status Text */}
                    <span className="hidden sm:inline">
                        {isSyncing
                            ? 'Syncing...'
                            : isOffline
                                ? 'Offline'
                                : hasPending
                                    ? `${pendingStats.total} pending`
                                    : 'Online'}
                    </span>

                    {/* Pending count badge */}
                    {hasPending && !isSyncing && (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-xs"
                        >
                            {pendingStats.total}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Sync Status</h4>
                        {isOffline ? (
                            <Badge variant="destructive" className="gap-1">
                                <WifiOff className="h-3 w-3" />
                                Offline
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                <Wifi className="h-3 w-3" />
                                Online
                            </Badge>
                        )}
                    </div>

                    {/* Sync Progress */}
                    {isSyncing && syncProgress && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span>
                                    {syncProgress.currentItem}/{syncProgress.totalItems}
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${syncProgress.totalItems > 0
                                            ? (syncProgress.currentItem / syncProgress.totalItems) * 100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{syncProgress.message}</p>
                        </div>
                    )}

                    {/* Pending Items Breakdown */}
                    {!isSyncing && hasPending && (
                        <div className="space-y-2">
                            <h5 className="text-xs text-muted-foreground uppercase tracking-wide">Pending Items</h5>
                            <div className="space-y-1">
                                {pendingStats.orders > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Orders</span>
                                        <span className="font-medium">{pendingStats.orders}</span>
                                    </div>
                                )}
                                {pendingStats.cashTransactions > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Cash Transactions</span>
                                        <span className="font-medium">{pendingStats.cashTransactions}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* No pending items */}
                    {!isSyncing && !hasPending && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>All data synchronized</span>
                        </div>
                    )}

                    {/* Offline Warning */}
                    {isOffline && hasPending && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-yellow-800 dark:text-yellow-200">
                                Cannot sync while offline. Data will be synced when connection is restored.
                            </p>
                        </div>
                    )}

                    {/* Sync Button */}
                    {hasPending && !isSyncing && (
                        <Button
                            onClick={handleSync}
                            disabled={isOffline}
                            className="w-full gap-2"
                            size="sm"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Sync Now
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default OfflineIndicator;
