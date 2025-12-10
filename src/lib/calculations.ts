// Centralized calculation utilities for POS
// NOTE: These are for DISPLAY purposes only
// Actual order totals are calculated server-side in OrdersController for security

import type { CartItem } from '@/types/pos';

/**
 * Result of item calculation
 */
export interface CalculationResult {
    itemWeightTotalKg: number;
    boxWeightPerBoxKg: number;
    totalBoxWeightKg: number;
    netWeightKg: number;
    baseTotal: number;
    itemDiscountAmount: number;
    finalTotal: number;
    isValid: boolean;
    exceedsItemWeight: boolean;
}

/**
 * Calculate item totals from weight inputs
 * Used for display in cart - actual values calculated server-side on order submit
 */
export function calculateItemTotals(
    itemKg: number,
    itemG: number,
    boxKg: number,
    boxG: number,
    boxes: number,
    price: number,
    discount: number
): CalculationResult {
    // Validate grams input (must be 0-999)
    const validItemG = Math.min(999, Math.max(0, itemG));
    const validBoxG = Math.min(999, Math.max(0, boxG));

    // Convert to total kg with precision
    const itemWeightTotalKg = parseFloat((itemKg + (validItemG / 1000)).toFixed(3));
    const boxWeightPerBoxKg = parseFloat((boxKg + (validBoxG / 1000)).toFixed(3));
    const totalBoxWeightKg = parseFloat((boxWeightPerBoxKg * boxes).toFixed(3));

    // Calculate net weight (item weight minus box weight)
    const netWeightKg = parseFloat(Math.max(0, itemWeightTotalKg - totalBoxWeightKg).toFixed(3));

    // Calculate totals
    const baseTotal = parseFloat((netWeightKg * price).toFixed(2));
    const itemDiscountAmount = parseFloat((baseTotal * (discount / 100)).toFixed(2));
    const finalTotal = parseFloat((baseTotal - itemDiscountAmount).toFixed(2));

    return {
        itemWeightTotalKg,
        boxWeightPerBoxKg,
        totalBoxWeightKg,
        netWeightKg,
        baseTotal,
        itemDiscountAmount,
        finalTotal,
        isValid: netWeightKg > 0 && itemWeightTotalKg > 0,
        exceedsItemWeight: totalBoxWeightKg > itemWeightTotalKg
    };
}

/**
 * Calculate order subtotal from cart items
 */
export function calculateOrderSubtotal(items: CartItem[]): number {
    return parseFloat(
        items.reduce((sum, item) => sum + item.finalTotal, 0).toFixed(2)
    );
}

/**
 * Calculate discount amount from subtotal and percentage
 */
export function calculateOrderDiscount(subtotal: number, discountPercent: number): number {
    return parseFloat((subtotal * (discountPercent / 100)).toFixed(2));
}

/**
 * Calculate order total after discount
 */
export function calculateOrderTotal(items: CartItem[], discountPercent: number): number {
    const subtotal = calculateOrderSubtotal(items);
    const discount = calculateOrderDiscount(subtotal, discountPercent);
    return parseFloat((subtotal - discount).toFixed(2));
}

/**
 * Format weight for display (removes trailing zeros)
 */
export function formatWeight(kg: number): string {
    return kg.toFixed(3).replace(/\.?0+$/, '') + ' kg';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'LKR'): string {
    return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Parse weight input (handles various formats)
 */
export function parseWeightInput(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Validate that item can be added to cart
 */
export function validateCartAddition(
    calculated: CalculationResult,
    stockAvailable: number,
    productName: string
): { valid: boolean; error?: string } {
    if (calculated.itemWeightTotalKg <= 0) {
        return { valid: false, error: 'Item weight must be greater than 0' };
    }

    if (calculated.exceedsItemWeight) {
        return {
            valid: false,
            error: `Box weight (${calculated.totalBoxWeightKg} kg) exceeds item weight (${calculated.itemWeightTotalKg} kg)`
        };
    }

    if (calculated.netWeightKg <= 0) {
        return { valid: false, error: 'Net weight must be greater than 0 after deducting box weight' };
    }

    if (calculated.netWeightKg > stockAvailable) {
        return {
            valid: false,
            error: `Insufficient stock for ${productName}. Available: ${stockAvailable} kg`
        };
    }

    return { valid: true };
}
