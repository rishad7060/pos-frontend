'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAuthUser, logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/number-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  LogOut,
  User,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  period: string;
  revenue: {
    total: number;
    cash: number;
    card: number;
    orderCount: number;
    averageOrderValue: number;
  };
  topProducts: Array<{
    itemName: string;
    productId: number | null;
    quantitySold: number;
    revenue: number;
    orderCount: number;
  }>;
  topCashiers: Array<{
    cashierId: number;
    cashierName: string;
    orderCount: number;
    totalRevenue: number;
  }>;
  lowStockAlerts: Array<{
    productId: number;
    name: string;
    stockQuantity: number;
    reorderLevel: number;
    category: string | null;
  }>;
  customerStats: {
    totalCustomers: number;
    newCustomersThisPeriod: number;
    topCustomer: {
      customerId: number;
      name: string;
      totalPurchases: number;
      visitCount: number;
    } | null;
  };
  profitAnalysis: {
    totalRevenue: number;
    estimatedCost: number;
    estimatedProfit: number;
    profitMargin: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.get(`/api/dashboard/stats?period=${period}`);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setStats(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Sales Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Analytics & Insights</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                {user && (
                  <div className="text-right mr-4">
                    <div className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.fullName}
                    </div>
                  </div>
                )}
                
                <Button variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : stats ? (
            <div className="space-y-6">
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.revenue.orderCount} orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stats.revenue.averageOrderValue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.revenue.cash)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.revenue.total > 0 ? formatNumber((stats.revenue.cash / stats.revenue.total) * 100, 1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Card Sales</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.revenue.card)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.revenue.total > 0 ? formatNumber((stats.revenue.card / stats.revenue.total) * 100, 1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Profit Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Profit Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold">{formatCurrency(stats.profitAnalysis.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Cost</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(stats.profitAnalysis.estimatedCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Profit</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(stats.profitAnalysis.estimatedProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <p className="text-xl font-bold text-primary">
                        {formatNumber(stats.profitAnalysis.profitMargin, 1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Top Selling Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topProducts.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No sales data available
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topProducts.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{product.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(product.quantitySold, 1)} KG sold • {product.orderCount} orders
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                {formatCurrency(product.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Cashiers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Performing Cashiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topCashiers.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No cashier data available
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topCashiers.slice(0, 5).map((cashier, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{cashier.cashierName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cashier.orderCount} orders processed
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                {formatCurrency(cashier.totalRevenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Alerts & Customer Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Low Stock Alerts
                      {stats.lowStockAlerts.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {stats.lowStockAlerts.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.lowStockAlerts.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        All products are well stocked
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stats.lowStockAlerts.slice(0, 5).map((product) => (
                          <div 
                            key={product.productId} 
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.category || 'Uncategorized'}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={product.stockQuantity === 0 ? 'destructive' : 'default'}
                                className={product.stockQuantity === 0 ? '' : 'bg-yellow-500'}
                              >
                                {product.stockQuantity === 0 ? 'Out of Stock' : `${product.stockQuantity} left`}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                Reorder at {product.reorderLevel}
                              </p>
                            </div>
                          </div>
                        ))}
                        {stats.lowStockAlerts.length > 5 && (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => router.push('/admin/products?stock=low')}
                          >
                            View All {stats.lowStockAlerts.length} Products
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Customer Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-3xl font-bold text-primary">
                          {stats.customerStats.totalCustomers}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Total Customers</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-3xl font-bold text-green-600">
                          {stats.customerStats.newCustomersThisPeriod}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          New {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
                        </p>
                      </div>
                    </div>

                    {stats.customerStats.topCustomer && (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-sm font-semibold mb-2">Top Customer</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold">{stats.customerStats.topCustomer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {stats.customerStats.topCustomer.visitCount} visits
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(stats.customerStats.topCustomer.totalPurchases)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total spent</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </AuthGuard>
  );
}
