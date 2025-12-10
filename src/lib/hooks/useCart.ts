'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, Product } from '@/types/pos';
import { calculateItemTotals, calculateOrderSubtotal, calculateOrderTotal } from '@/lib/calculations';

interface UseCartReturn {
    cart: CartItem[];
    orderDiscount: number;
    // Actions
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateItemQuantity: (id: string, newQuantityKg: number) => void;
    clearCart: () => void;
    setOrderDiscount: (discount: number) => void;
    // Calculated values
    subtotal: number;
    discountAmount: number;
    total: number;
    itemCount: number;
    // Utilities
    getItemById: (id: string) => CartItem | undefined;
    hasProduct: (productId: number) => boolean;
    getProductQuantityInCart: (productId: number) => number;
}

/**
 * Hook for managing shopping cart state
 * Consolidates cart logic used in POS components
 */
export function useCart(): UseCartReturn {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderDiscount, setOrderDiscount] = useState(0);

    const addItem = useCallback((item: CartItem) => {
        setCart(prev => [...prev, item]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateItemQuantity = useCallback((id: string, newQuantityKg: number) => {
        if (newQuantityKg <= 0) {
            removeItem(id);
            return;
        }

        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const calculated = calculateItemTotals(
                    newQuantityKg,
                    0,
                    item.boxWeightKg,
                    item.boxWeightG,
                    item.boxCount,
                    item.pricePerKg,
                    item.itemDiscountPercent
                );
                return {
                    ...item,
                    itemWeightKg: newQuantityKg,
                    ...calculated,
                };
            }
            return item;
        }));
    }, [removeItem]);

    const clearCart = useCallback(() => {
        setCart([]);
        setOrderDiscount(0);
    }, []);

    const getItemById = useCallback((id: string): CartItem | undefined => {
        return cart.find(item => item.id === id);
    }, [cart]);

    const hasProduct = useCallback((productId: number): boolean => {
        return cart.some(item => item.productId === productId);
    }, [cart]);

    const getProductQuantityInCart = useCallback((productId: number): number => {
        return cart
            .filter(item => item.productId === productId)
            .reduce((sum, item) => sum + item.netWeightKg, 0);
    }, [cart]);

    // Memoized calculated values
    const subtotal = useMemo(() => calculateOrderSubtotal(cart), [cart]);

    const discountAmount = useMemo(() => {
        return parseFloat((subtotal * (orderDiscount / 100)).toFixed(2));
    }, [subtotal, orderDiscount]);

    const total = useMemo(() => calculateOrderTotal(cart, orderDiscount), [cart, orderDiscount]);

    const itemCount = useMemo(() => cart.length, [cart]);

    return {
        cart,
        orderDiscount,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        setOrderDiscount,
        subtotal,
        discountAmount,
        total,
        itemCount,
        getItemById,
        hasProduct,
        getProductQuantityInCart,
    };
}

/**
 * Create a new cart item from product and weight inputs
 */
export function createCartItem(
    product: Product,
    itemWeightKg: number,
    itemWeightG: number,
    boxWeightKg: number,
    boxWeightG: number,
    boxCount: number,
    pricePerKg: number,
    itemDiscountPercent: number
): CartItem {
    const calculated = calculateItemTotals(
        itemWeightKg,
        itemWeightG,
        boxWeightKg,
        boxWeightG,
        boxCount,
        pricePerKg,
        itemDiscountPercent
    );

    return {
        id: Date.now().toString(),
        productId: product.id,
        itemName: product.name,
        quantityType: 'kg',
        itemWeightKg,
        itemWeightG,
        boxWeightKg,
        boxWeightG,
        boxCount,
        pricePerKg,
        itemDiscountPercent,
        stockAvailable: product.stockQuantity,
        ...calculated,
    };
}
