'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '@/types/pos';

interface StockAlertBannerProps {
    products: Product[];
}

/**
 * Stock alert banner showing low and out of stock products
 * Extracted from products admin page
 */
export function StockAlertBanner({ products }: StockAlertBannerProps) {
    const lowStockProducts = products.filter(
        p => p.stockQuantity <= (p.reorderLevel || 0) && p.stockQuantity > 0
    );
    const outOfStockProducts = products.filter(p => p.stockQuantity <= 0);

    if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
        return null;
    }

    return (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                <div className="font-semibold mb-1">Stock Alerts</div>
                {outOfStockProducts.length > 0 && (
                    <div>• {outOfStockProducts.length} product(s) out of stock</div>
                )}
                {lowStockProducts.length > 0 && (
                    <div>• {lowStockProducts.length} product(s) running low</div>
                )}
            </AlertDescription>
        </Alert>
    );
}
