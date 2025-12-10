'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/types/pos';

interface UseCategoriesOptions {
    autoFetch?: boolean;
}

interface UseCategoriesReturn {
    categories: Category[];
    loading: boolean;
    error: string | null;
    fetchCategories: () => Promise<void>;
    getCategoryByName: (name: string) => Category | undefined;
    categoryNames: string[];
}

/**
 * Hook for fetching and managing categories
 * Consolidates category fetching logic used across admin and POS
 */
export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
    const { autoFetch = true } = options;

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.get<Category[]>('/categories?limit=100');

            if (response.error) {
                throw new Error(response.error.message);
            }

            setCategories(response.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch categories');
            console.error('useCategories fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const getCategoryByName = useCallback((name: string): Category | undefined => {
        return categories.find(c => c.name === name);
    }, [categories]);

    const categoryNames = categories.map(c => c.name);

    useEffect(() => {
        if (autoFetch) {
            fetchCategories();
        }
    }, [autoFetch, fetchCategories]);

    return {
        categories,
        loading,
        error,
        fetchCategories,
        getCategoryByName,
        categoryNames,
    };
}

// Category color mapping for consistent UI across components
const CATEGORY_COLORS: Record<string, string> = {
    'Seafood': 'bg-blue-100/50 border-blue-300',
    'Meat': 'bg-red-100/50 border-red-300',
    'Dried Goods': 'bg-amber-100/50 border-amber-300',
    'Spices': 'bg-orange-100/50 border-orange-300',
    'Vegetables': 'bg-green-100/50 border-green-300',
    'Fruits': 'bg-pink-100/50 border-pink-300',
    'Dairy': 'bg-cyan-100/50 border-cyan-300',
    'Beverages': 'bg-purple-100/50 border-purple-300',
};

const DEFAULT_CATEGORY_COLOR = 'bg-gray-100/50 border-gray-300';

/**
 * Get consistent color styling for a category
 */
export function getCategoryColor(categoryName: string | null): string {
    if (!categoryName) return DEFAULT_CATEGORY_COLOR;
    return CATEGORY_COLORS[categoryName] || DEFAULT_CATEGORY_COLOR;
}
