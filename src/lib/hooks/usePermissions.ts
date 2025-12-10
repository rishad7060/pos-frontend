'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CashierPermissions } from '@/types/pos';

interface UsePermissionsOptions {
    cashierId: number;
    autoFetch?: boolean;
}

interface UsePermissionsReturn {
    permissions: CashierPermissions | null;
    loading: boolean;
    error: string | null;
    fetchPermissions: () => Promise<void>;
    canApplyDiscount: boolean;
    canEditPrices: boolean;
    canVoidOrders: boolean;
    canProcessRefunds: boolean;
    canUpdateStock: boolean;
    maxDiscountPercent: number;
}

// Default permissions for when fetch fails or permissions not set
const DEFAULT_PERMISSIONS: CashierPermissions = {
    canApplyDiscount: false,
    maxDiscountPercent: 0,
    canEditPrices: false,
    canVoidOrders: false,
    canProcessRefunds: false,
    canOpenRegistry: false,
    canCloseRegistry: false,
    canViewReports: false,
    canUpdateStock: false,
};

/**
 * Hook for fetching and managing cashier permissions
 * Consolidates permission checks used in POS components
 */
export function usePermissions(options: UsePermissionsOptions): UsePermissionsReturn {
    const { cashierId, autoFetch = true } = options;

    const [permissions, setPermissions] = useState<CashierPermissions | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (!cashierId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.get<CashierPermissions>(`/cashiers/${cashierId}/permissions`);

            if (response.error) {
                // If 404 or permissions not found, use defaults
                console.warn('No permissions found for cashier, using defaults');
                setPermissions(DEFAULT_PERMISSIONS);
            } else {
                setPermissions(response.data || DEFAULT_PERMISSIONS);
            }
        } catch (err: any) {
            console.error('usePermissions fetch error:', err);
            setError(err.message || 'Failed to fetch permissions');
            setPermissions(DEFAULT_PERMISSIONS);
        } finally {
            setLoading(false);
        }
    }, [cashierId]);

    useEffect(() => {
        if (autoFetch && cashierId) {
            fetchPermissions();
        }
    }, [autoFetch, cashierId, fetchPermissions]);

    // Convenience accessors
    const p = permissions || DEFAULT_PERMISSIONS;

    return {
        permissions,
        loading,
        error,
        fetchPermissions,
        canApplyDiscount: p.canApplyDiscount,
        canEditPrices: p.canEditPrices,
        canVoidOrders: p.canVoidOrders,
        canProcessRefunds: p.canProcessRefunds,
        canUpdateStock: p.canUpdateStock,
        maxDiscountPercent: p.maxDiscountPercent,
    };
}
