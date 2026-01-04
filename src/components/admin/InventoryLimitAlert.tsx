'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface InventoryStats {
  total: number;
  percentage: number;  // Percentage of 10,000 limit
}

/**
 * Admin Dashboard Alert - Shows warning when approaching 10,000 item limits
 * Displays on admin dashboard to alert admins before hitting the maximum limit
 */
export function InventoryLimitAlert() {
  const [stats, setStats] = useState<{
    products?: InventoryStats;
    categories?: InventoryStats;
    customers?: InventoryStats;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStats();
  }, []);

  const fetchInventoryStats = async () => {
    try {
      // Fetch products count
      const productsRes = await fetchWithAuth('/api/products');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData.pagination) {
          setStats(prev => ({
            ...prev,
            products: {
              total: productsData.pagination.total,
              percentage: (productsData.pagination.total / 10000) * 100
            }
          }));
        }
      }

      // Fetch categories count
      const categoriesRes = await fetchWithAuth('/api/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        if (categoriesData.pagination) {
          setStats(prev => ({
            ...prev,
            categories: {
              total: categoriesData.pagination.total,
              percentage: (categoriesData.pagination.total / 10000) * 100
            }
          }));
        }
      }

      // Add customers if endpoint is updated
      // const customersRes = await fetchWithAuth('/api/customers');
      // ...

    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // Get the highest percentage
  const warnings: { type: string; stats: InventoryStats }[] = [];

  if (stats.products && stats.products.percentage >= 80) {
    warnings.push({ type: 'Products', stats: stats.products });
  }
  if (stats.categories && stats.categories.percentage >= 80) {
    warnings.push({ type: 'Categories', stats: stats.categories });
  }
  if (stats.customers && stats.customers.percentage >= 80) {
    warnings.push({ type: 'Customers', stats: stats.customers });
  }

  if (warnings.length === 0) return null;

  // Determine severity
  const maxPercentage = Math.max(...warnings.map(w => w.stats.percentage));
  const isCritical = maxPercentage >= 100;
  const isWarning = maxPercentage >= 90;

  return (
    <Alert
      variant={isCritical ? "destructive" : "default"}
      className={
        isCritical
          ? "border-red-500 bg-red-50 dark:bg-red-950"
          : isWarning
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
          : "border-orange-500 bg-orange-50 dark:bg-orange-950"
      }
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <TrendingUp className="h-4 w-4" />
      )}
      <AlertTitle>
        {isCritical
          ? 'Inventory Limit Reached!'
          : isWarning
          ? 'Approaching Inventory Limit'
          : 'Inventory Growing'}
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          {warnings.map(({ type, stats }) => (
            <div key={type} className="flex items-center justify-between">
              <span className="font-medium">{type}:</span>
              <span className={
                stats.percentage >= 100
                  ? "text-red-700 dark:text-red-300 font-bold"
                  : stats.percentage >= 90
                  ? "text-yellow-700 dark:text-yellow-300 font-semibold"
                  : "text-orange-700 dark:text-orange-300"
              }>
                {stats.total.toLocaleString()} / 10,000 ({stats.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}

          {isCritical ? (
            <p className="text-sm mt-2 pt-2 border-t border-red-200 dark:border-red-800">
              <strong>Action Required:</strong> You've reached the maximum limit of 10,000 items.
              Please archive old items or use filters to manage your inventory.
            </p>
          ) : isWarning ? (
            <p className="text-sm mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
              <strong>Recommendation:</strong> Consider organizing your inventory and archiving
              old items to avoid reaching the 10,000 item limit.
            </p>
          ) : (
            <p className="text-sm mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
              Your inventory is growing. Monitor these numbers to avoid hitting the 10,000 limit.
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact version for sidebar or header
 */
export function InventoryLimitBadge() {
  const [stats, setStats] = useState<{
    products?: InventoryStats;
  }>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.pagination) {
            setStats({
              products: {
                total: data.pagination.total,
                percentage: (data.pagination.total / 10000) * 100
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (!stats.products || stats.products.percentage < 80) return null;

  const isCritical = stats.products.percentage >= 100;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
      isCritical
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }`}>
      <AlertTriangle className="h-3 w-3" />
      <span>{stats.products.percentage.toFixed(0)}% of limit</span>
    </div>
  );
}
