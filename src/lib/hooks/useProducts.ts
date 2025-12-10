'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Product } from '@/types/pos';

interface UseProductsOptions {
    autoFetch?: boolean;
    limit?: number;
}

interface UseProductsReturn {
    products: Product[];
    loading: boolean;
    error: string | null;
    fetchProducts: () => Promise<void>;
    getProductById: (id: number) => Product | undefined;
    refreshProducts: () => Promise<void>;
}

/**
 * Hook for fetching and managing products
 * Consolidates product fetching logic used across POS and admin pages
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
    const { autoFetch = true, limit = 100 } = options;

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.get<Product[]>(`/products?limit=${limit}&isActive=true`);

            if (response.error) {
                throw new Error(response.error.message);
            }

            setProducts(response.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch products');
            console.error('useProducts fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    const getProductById = useCallback((id: number): Product | undefined => {
        return products.find(p => p.id === id);
    }, [products]);

    const refreshProducts = useCallback(async () => {
        await fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        if (autoFetch) {
            fetchProducts();
        }
    }, [autoFetch, fetchProducts]);

    return {
        products,
        loading,
        error,
        fetchProducts,
        getProductById,
        refreshProducts,
    };
}
