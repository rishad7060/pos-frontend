// TEAM_003: Network status hook for detecting online/offline state
import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean;  // True if we just came back online
    lastOnlineAt: number | null;
    lastOfflineAt: number | null;
}

interface UseNetworkStatusOptions {
    onOnline?: () => void;
    onOffline?: () => void;
    onReconnect?: () => void;  // Called when transitioning from offline to online
}

/**
 * Hook to monitor network connectivity status.
 * Provides reactive updates when online/offline status changes.
 */
export function useNetworkStatus(options?: UseNetworkStatusOptions): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>(() => ({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        wasOffline: false,
        lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null,
        lastOfflineAt: null,
    }));

    const handleOnline = useCallback(() => {
        console.log('[NetworkStatus] Online event triggered');
        setStatus(prev => ({
            isOnline: true,
            wasOffline: !prev.isOnline,
            lastOnlineAt: Date.now(),
            lastOfflineAt: prev.lastOfflineAt,
        }));
        options?.onOnline?.();

        setStatus(prev => {
            if (prev.wasOffline) {
                options?.onReconnect?.();
            }
            return prev;
        });
    }, [options]);

    const handleOffline = useCallback(() => {
        console.log('[NetworkStatus] Offline event triggered');
        setStatus(prev => ({
            isOnline: false,
            wasOffline: false,
            lastOnlineAt: prev.lastOnlineAt,
            lastOfflineAt: Date.now(),
        }));
        options?.onOffline?.();
    }, [options]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (navigator.onLine !== status.isOnline) {
            if (navigator.onLine) {
                handleOnline();
            } else {
                handleOffline();
            }
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline, status.isOnline]);

    return status;
}

/**
 * Simple utility to check if currently online (using navigator.onLine)
 */
export function isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
}

/**
 * More robust online check that actually tests connectivity to the backend
 * Returns false if we can't reach the backend server
 * TEAM_003: Uses direct backend URL with cache-busting to bypass Service Worker
 */
export async function checkActualConnectivity(): Promise<boolean> {
    // First check navigator.onLine
    if (typeof navigator === 'undefined') return true;
    if (!navigator.onLine) {
        console.log('[NetworkStatus] navigator.onLine is false');
        return false;
    }

    // Try to fetch directly from the backend server (not through Next.js API route)
    // This bypasses any Service Worker caching
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        // Use the actual backend URL with a cache-busting parameter
        const cacheBuster = Date.now();
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const response = await fetch(`${backendUrl}/api/registry-sessions/current?_cb=${cacheBuster}`, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-store',
            mode: 'cors',
        });

        clearTimeout(timeoutId);
        console.log('[NetworkStatus] Connectivity check succeeded, status:', response.status);
        return true;
    } catch (error) {
        console.log('[NetworkStatus] Connectivity check failed:', error);
        return false;
    }
}

/**
 * Wait for network to become available
 * @param timeoutMs Maximum time to wait (default: 30 seconds)
 * @returns Promise that resolves when online or rejects on timeout
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || navigator.onLine) {
            resolve();
            return;
        }

        const handleOnline = () => {
            cleanup();
            resolve();
        };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Network timeout: Could not establish connection'));
        }, timeoutMs);

        const cleanup = () => {
            window.removeEventListener('online', handleOnline);
            clearTimeout(timeout);
        };

        window.addEventListener('online', handleOnline);
    });
}

export default useNetworkStatus;
