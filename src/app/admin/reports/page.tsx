'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAuthUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Eye,
  Layers,
  Target,
  Award,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Users,
  Truck,
  Lightbulb,
  Download,
  Info,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface BatchProfit {
  batchId: number;
  batchNumber: string;
  productName: string;
  productSku: string | null;
  supplierName: string | null;
  receivedDate: string;
  batchCostPrice: number;
  totalQuantitySold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  orderCount: number;
}

interface ProductProfit {
  productId: number | null;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  orderCount: number;
}

interface OrderProfitDetail {
  orderId: number;
  orderNumber: string;
  cashierName: string;
  cashierId: number;
  orderDate: string;
  total: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  itemCount: number;
}

interface PriceVariance {
  productId: number | null;
  productName: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currentCostPrice: number | null;
  priceHistory: { pricePerKg: number; count: number }[];
}

interface SupplierPerformance {
  supplierName: string;
  totalBatches: number;
  totalProfit: number;
  avgMargin: number;
  totalRevenue: number;
  totalCost: number;
}

interface CashierPerformance {
  cashierId: number;
  cashierName: string;
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  profitableOrders: number;
  lossOrders: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'products' | 'orders' | 'pricing' | 'suppliers' | 'cashiers'>('overview');

  // Data states
  const [batchReport, setBatchReport] = useState<any>(null);
  const [productReport, setProductReport] = useState<ProductProfit[]>([]);
  const [orderProfitDetails, setOrderProfitDetails] = useState<OrderProfitDetail[]>([]);
  const [priceVarianceReport, setPriceVarianceReport] = useState<PriceVariance[]>([]);

  useEffect(() => {
    setUser(getAuthUser());
    // Set default dates (last 30 days)
    setQuickDate('last30');
  }, []);

  const setQuickDate = (preset: string) => {
    const end = new Date();
    const start = new Date();

    switch(preset) {
      case 'today':
        // Today
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'last7':
        start.setDate(start.getDate() - 7);
        break;
      case 'last30':
        start.setDate(start.getDate() - 30);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch all reports in parallel
      const [batchRes, productRes, orderRes] = await Promise.all([
        apiClient.getBatchProfitReport({ startDate, endDate, limit: 10000 }),
        fetch(`/api/reports/profit-analysis?startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}&limit=10000`),
        fetch(`/api/orders/profit-details?startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}&profitStatus=all&limit=10000`)
      ]);

      if (batchRes.data) {
        setBatchReport(batchRes.data);
      }

      if (productRes.ok) {
        const productData = await productRes.json();
        setProductReport(productData.productProfitAnalysis || []);
        setPriceVarianceReport(productData.priceVarianceAnalysis || []);
      }

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrderProfitDetails(orderData || []);
      }

    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall business metrics
  const calculateBusinessMetrics = () => {
    const totalRevenue = productReport.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCost = productReport.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalOrders = orderProfitDetails.length;
    const profitableOrders = orderProfitDetails.filter(o => o.totalProfit > 0).length;
    const lossOrders = orderProfitDetails.filter(o => o.totalProfit < 0).length;
    const totalQtySold = productReport.reduce((sum, p) => sum + p.totalQuantitySold, 0);
    const avgProfitPerKg = totalQtySold > 0 ? totalProfit / totalQtySold : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalOrders,
      profitableOrders,
      lossOrders,
      totalQtySold,
      avgProfitPerKg,
      avgOrderValue
    };
  };

  const metrics = calculateBusinessMetrics();

  // Calculate supplier performance
  const calculateSupplierPerformance = (): SupplierPerformance[] => {
    if (!batchReport?.batches) return [];

    const supplierMap = new Map<string, SupplierPerformance>();

    batchReport.batches.forEach((batch: BatchProfit) => {
      const supplierName = batch.supplierName || 'Unknown';
      const existing = supplierMap.get(supplierName) || {
        supplierName,
        totalBatches: 0,
        totalProfit: 0,
        totalRevenue: 0,
        totalCost: 0,
        avgMargin: 0
      };

      existing.totalBatches++;
      existing.totalProfit += batch.totalProfit;
      existing.totalRevenue += batch.totalRevenue;
      existing.totalCost += batch.totalCost;

      supplierMap.set(supplierName, existing);
    });

    const suppliers = Array.from(supplierMap.values()).map(s => ({
      ...s,
      avgMargin: s.totalRevenue > 0 ? (s.totalProfit / s.totalRevenue) * 100 : 0
    }));

    return suppliers.sort((a, b) => b.totalProfit - a.totalProfit);
  };

  // Calculate cashier performance
  const calculateCashierPerformance = (): CashierPerformance[] => {
    if (!orderProfitDetails.length) return [];

    const cashierMap = new Map<number, CashierPerformance>();

    orderProfitDetails.forEach((order) => {
      const existing = cashierMap.get(order.cashierId) || {
        cashierId: order.cashierId,
        cashierName: order.cashierName,
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgMargin: 0,
        profitableOrders: 0,
        lossOrders: 0
      };

      existing.totalOrders++;
      existing.totalRevenue += order.total;
      existing.totalProfit += order.totalProfit;
      if (order.totalProfit > 0) existing.profitableOrders++;
      if (order.totalProfit < 0) existing.lossOrders++;

      cashierMap.set(order.cashierId, existing);
    });

    const cashiers = Array.from(cashierMap.values()).map(c => ({
      ...c,
      avgMargin: c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0
    }));

    return cashiers.sort((a, b) => b.totalProfit - a.totalProfit);
  };

  // Generate smart recommendations
  const generateRecommendations = () => {
    const recommendations: { type: 'success' | 'warning' | 'error'; title: string; message: string }[] = [];

    // Check profit margin
    if (metrics.profitMargin < 10) {
      recommendations.push({
        type: 'error',
        title: 'Critical: Low Profit Margin',
        message: `Your profit margin is ${metrics.profitMargin.toFixed(1)}%. This is very low. Review your pricing immediately or negotiate better supplier costs.`
      });
    } else if (metrics.profitMargin >= 30) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Profit Margin!',
        message: `Your ${metrics.profitMargin.toFixed(1)}% profit margin is excellent. Keep up the good work!`
      });
    }

    // Check loss orders
    if (metrics.lossOrders > metrics.totalOrders * 0.2) {
      recommendations.push({
        type: 'warning',
        title: 'Too Many Loss-Making Orders',
        message: `${metrics.lossOrders} orders (${((metrics.lossOrders/metrics.totalOrders)*100).toFixed(0)}%) are making losses. Train cashiers on proper pricing or review discount policies.`
      });
    }

    // Check low margin products
    const lowMarginProducts = productReport.filter(p => p.profitMargin < 15);
    if (lowMarginProducts.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Low Margin Products Detected',
        message: `${lowMarginProducts.length} products have margins below 15%. Consider increasing prices or finding better suppliers for: ${lowMarginProducts.slice(0, 3).map(p => p.productName).join(', ')}`
      });
    }

    // Check supplier performance
    const suppliers = calculateSupplierPerformance();
    if (suppliers.length > 1) {
      const best = suppliers[0];
      const worst = suppliers[suppliers.length - 1];
      if (best.avgMargin - worst.avgMargin > 20) {
        recommendations.push({
          type: 'success',
          title: 'Supplier Performance Gap',
          message: `${best.supplierName} gives ${best.avgMargin.toFixed(0)}% margin vs ${worst.supplierName}'s ${worst.avgMargin.toFixed(0)}%. Order more from ${best.supplierName}!`
        });
      }
    }

    // Check profit per kg
    if (metrics.avgProfitPerKg < 10) {
      recommendations.push({
        type: 'warning',
        title: 'Low Profit Per Kg',
        message: `You're making only LKR ${metrics.avgProfitPerKg.toFixed(2)} profit per kg. Increase selling prices to improve profitability.`
      });
    }

    return recommendations;
  };

  const topBatches = batchReport?.batches ? [...batchReport.batches]
    .sort((a: BatchProfit, b: BatchProfit) => b.totalProfit - a.totalProfit)
    .slice(0, 10) : [];

  const lossBatches = batchReport?.batches ? [...batchReport.batches]
    .filter((b: BatchProfit) => b.totalProfit < 0)
    .sort((a: BatchProfit, b: BatchProfit) => a.totalProfit - b.totalProfit) : [];

  const topProducts = [...productReport]
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 10);

  const lowMarginProducts = [...productReport]
    .filter(p => p.profitMargin < 15)
    .sort((a, b) => a.profitMargin - b.profitMargin);

  const highMarginProducts = [...productReport]
    .filter(p => p.profitMargin >= 30)
    .sort((a, b) => b.profitMargin - a.profitMargin);

  const supplierPerformance = calculateSupplierPerformance();
  const cashierPerformance = calculateCashierPerformance();
  const recommendations = generateRecommendations();

  const formatCurrency = (amount: number) => `LKR ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 30) return 'bg-green-100 text-green-800 border-green-300';
    if (margin >= 15) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (margin >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getMarginLabel = (margin: number) => {
    if (margin >= 30) return 'Excellent';
    if (margin >= 15) return 'Good';
    if (margin >= 5) return 'Low';
    return 'Critical';
  };

  const exportToCSV = () => {
    const rows = [
      ['Business Performance Report'],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ['Summary'],
      ['Total Revenue', formatCurrency(metrics.totalRevenue)],
      ['Total Cost', formatCurrency(metrics.totalCost)],
      ['Net Profit', formatCurrency(metrics.totalProfit)],
      ['Profit Margin', `${metrics.profitMargin.toFixed(2)}%`],
      ['Total Orders', metrics.totalOrders.toString()],
      ['Profit per KG', formatCurrency(metrics.avgProfitPerKg)],
      [],
      ['Products'],
      ['Product Name', 'Qty Sold (kg)', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Orders'],
      ...productReport.map(p => [
        p.productName,
        p.totalQuantitySold.toFixed(2),
        p.totalRevenue.toFixed(2),
        p.totalCost.toFixed(2),
        p.totalProfit.toFixed(2),
        p.profitMargin.toFixed(2),
        p.orderCount.toString()
      ])
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Performance Report</h1>
              <p className="text-gray-600 mt-1">Complete overview of your business health and profitability</p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-sm text-gray-600">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Selection */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Quick Date Ranges</Label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('today')}>
                    <Calendar className="h-3 w-3 mr-1" />
                    Today
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('yesterday')}>
                    Yesterday
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('last7')}>
                    Last 7 Days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('last30')}>
                    Last 30 Days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('thisMonth')}>
                    This Month
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickDate('lastMonth')}>
                    Last Month
                  </Button>
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={generateReport} disabled={loading} className="w-full sm:w-auto">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
                {productReport.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="max-w-7xl mx-auto mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Report Content */}
        {(batchReport || productReport.length > 0 || orderProfitDetails.length > 0) && (
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Summary Cards - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalRevenue)}</p>
                      <p className="text-xs text-gray-500 mt-1">{metrics.totalOrders} orders</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Net Profit</p>
                      <p className={`text-2xl font-bold ${getProfitColor(metrics.totalProfit)}`}>
                        {formatCurrency(metrics.totalProfit)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatCurrency(metrics.avgProfitPerKg)}/kg</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Profit Margin</p>
                      <p className="text-2xl font-bold text-purple-600">{metrics.profitMargin.toFixed(1)}%</p>
                      <Badge className={`mt-1 ${getMarginBadge(metrics.profitMargin)}`}>
                        {getMarginLabel(metrics.profitMargin)}
                      </Badge>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Award className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Order Success Rate</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {metrics.totalOrders > 0 ? ((metrics.profitableOrders / metrics.totalOrders) * 100).toFixed(0) : 0}%
                      </p>
                      <p className="text-xs text-green-600">{metrics.profitableOrders} profitable</p>
                      {metrics.lossOrders > 0 && (
                        <p className="text-xs text-red-600">{metrics.lossOrders} loss</p>
                      )}
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Smart Recommendations */}
            {recommendations.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    Smart Insights && Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <Alert key={index} variant={rec.type === 'error' ? 'destructive' : 'default'}
                        className={
                          rec.type === 'success' ? 'bg-green-50 border-green-200' :
                          rec.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          ''
                        }>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold">{rec.title}</p>
                          <p className="text-sm mt-1">{rec.message}</p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Card>
              <CardHeader className="p-0">
                <div className="flex gap-2 border-b overflow-x-auto px-6">
                  <Button
                    variant={activeTab === 'overview' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('overview')}
                    className="rounded-b-none"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Overview
                  </Button>
                  <Button
                    variant={activeTab === 'batches' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('batches')}
                    className="rounded-b-none"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Batches
                  </Button>
                  <Button
                    variant={activeTab === 'products' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('products')}
                    className="rounded-b-none"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Products
                  </Button>
                  <Button
                    variant={activeTab === 'suppliers' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('suppliers')}
                    className="rounded-b-none"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Suppliers
                  </Button>
                  <Button
                    variant={activeTab === 'cashiers' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('cashiers')}
                    className="rounded-b-none"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Cashiers
                  </Button>
                  <Button
                    variant={activeTab === 'orders' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('orders')}
                    className="rounded-b-none"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Orders
                  </Button>
                  <Button
                    variant={activeTab === 'pricing' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('pricing')}
                    className="rounded-b-none"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pricing
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Business Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Total Sales Volume</p>
                            <p className="text-2xl font-bold">{metrics.totalQtySold.toFixed(1)} kg</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Profitable Products</p>
                            <p className="text-2xl font-bold">{productReport.filter(p => p.totalProfit > 0).length}</p>
                            <p className="text-xs text-gray-500">out of {productReport.length}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Profit per KG</p>
                            <p className="text-2xl font-bold">{formatCurrency(metrics.avgProfitPerKg)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Layers className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Avg Order Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue)}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-green-900">Best Performing Product</p>
                                {topProducts[0] && (
                                  <>
                                    <p className="text-sm text-green-800">{topProducts[0].productName}</p>
                                    <p className="text-xs text-green-700 mt-1">
                                      Profit: {formatCurrency(topProducts[0].totalProfit)} •
                                      Margin: {topProducts[0].profitMargin.toFixed(1)}%
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {supplierPerformance.length > 0 && (
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Truck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-blue-900">Best Supplier</p>
                                  <p className="text-sm text-blue-800">{supplierPerformance[0].supplierName}</p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    Profit: {formatCurrency(supplierPerformance[0].totalProfit)} •
                                    Margin: {supplierPerformance[0].avgMargin.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {cashierPerformance.length > 0 && (
                          <Card className="bg-purple-50 border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-purple-900">Top Performing Cashier</p>
                                  <p className="text-sm text-purple-800">{cashierPerformance[0].cashierName}</p>
                                  <p className="text-xs text-purple-700 mt-1">
                                    {cashierPerformance[0].totalOrders} orders •
                                    Margin: {cashierPerformance[0].avgMargin.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {lowMarginProducts.length > 0 && (
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-red-900">Needs Attention</p>
                                  <p className="text-sm text-red-800">{lowMarginProducts.length} products with low margins</p>
                                  <p className="text-xs text-red-700 mt-1">Review pricing or suppliers</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>

                    {/* Top Performers Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Top 5 Products by Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {topProducts.slice(0, 5).map((product, index) => (
                              <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{product.productName}</p>
                                    <p className="text-xs text-gray-500">{product.totalQuantitySold.toFixed(1)} kg</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm text-green-600">{formatCurrency(product.totalProfit)}</p>
                                  <Badge className={`text-xs ${getMarginBadge(product.profitMargin)}`}>
                                    {product.profitMargin.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('products')}>
                            View All Products
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Top 5 Batches by Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {topBatches.slice(0, 5).map((batch: BatchProfit, index: number) => (
                              <div key={batch.batchId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                onClick={() => router.push(`/admin/batches/${batch.batchId}`)}>
                                <div className="flex items-center gap-3">
                                  <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 font-bold text-xs flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{batch.productName}</p>
                                    <p className="text-xs text-gray-500">{batch.batchNumber}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm text-green-600">{formatCurrency(batch.totalProfit)}</p>
                                  <Badge className={`text-xs ${getMarginBadge(batch.profitMargin)}`}>
                                    {batch.profitMargin.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('batches')}>
                            View All Batches
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* BATCHES TAB - Previous implementation */}
                {activeTab === 'batches' && (
                  <div className="space-y-6">
                    {batchReport && batchReport.summary && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Batch Performance Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-xs text-gray-600 mb-1">Total Batches</p>
                              <p className="text-2xl font-bold text-blue-600">{batchReport.summary.totalBatches}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-xs text-gray-600 mb-1">Total Sold</p>
                              <p className="text-2xl font-bold text-purple-600">{batchReport.summary.totalQuantitySold.toFixed(0)} kg</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-xs text-gray-600 mb-1">Total Profit</p>
                              <p className={`text-2xl font-bold ${getProfitColor(batchReport.summary.totalProfit)}`}>
                                {formatCurrency(batchReport.summary.totalProfit)}
                              </p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-xs text-gray-600 mb-1">Avg Margin</p>
                              <p className="text-2xl font-bold text-orange-600">{batchReport.summary.avgProfitMargin.toFixed(1)}%</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-green-800">Profitable Batches ({topBatches.length})</h3>
                          <Button variant="outline" size="sm" onClick={() => router.push('/admin/reports/batches')}>
                            Full Report
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {topBatches.map((batch: BatchProfit) => (
                            <Card key={batch.batchId} className="cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => router.push(`/admin/batches/${batch.batchId}`)}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{batch.productName}</p>
                                    <p className="text-xs text-gray-500">{batch.batchNumber}</p>
                                    <p className="text-xs text-gray-500">Supplier: {batch.supplierName || 'N/A'}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs">
                                      <span className="text-gray-600">Cost: {formatCurrency(batch.batchCostPrice)}/kg</span>
                                      <span className="text-gray-600">Sold: {batch.totalQuantitySold.toFixed(1)} kg</span>
                                      <span className="text-gray-600">{batch.orderCount} orders</span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-bold text-green-600">{formatCurrency(batch.totalProfit)}</p>
                                    <Badge className={`mt-1 ${getMarginBadge(batch.profitMargin)}`}>
                                      {batch.profitMargin.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-red-800 mb-4">
                          Loss-Making Batches ({lossBatches.length})
                        </h3>
                        {lossBatches.length > 0 ? (
                          <div className="space-y-3">
                            {lossBatches.map((batch: BatchProfit) => (
                              <Card key={batch.batchId} className="border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => router.push(`/admin/batches/${batch.batchId}`)}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                        <p className="font-semibold truncate">{batch.productName}</p>
                                      </div>
                                      <p className="text-xs text-gray-500 ml-6">{batch.batchNumber}</p>
                                      <p className="text-xs text-gray-500 ml-6">Supplier: {batch.supplierName || 'N/A'}</p>
                                      <div className="flex items-center gap-4 mt-2 text-xs ml-6">
                                        <span className="text-red-600">Cost: {formatCurrency(batch.batchCostPrice)}/kg</span>
                                        <span className="text-gray-600">Sold: {batch.totalQuantitySold.toFixed(1)} kg</span>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="font-bold text-red-600">{formatCurrency(batch.totalProfit)}</p>
                                      <Badge className="mt-1 bg-red-100 text-red-800">
                                        {batch.profitMargin.toFixed(1)}%
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-8 text-center">
                              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                              <p className="font-semibold text-green-900">Excellent!</p>
                              <p className="text-sm text-green-700">All batches are profitable</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCTS TAB - Keep previous implementation */}
                {activeTab === 'products' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Product Performance Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Total Products</p>
                            <p className="text-2xl font-bold">{productReport.length}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Profitable</p>
                            <p className="text-2xl font-bold text-green-600">
                              {productReport.filter(p => p.totalProfit > 0).length}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">High Margin (30%+)</p>
                            <p className="text-2xl font-bold text-blue-600">{highMarginProducts.length}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Low Margin (&lt;15%)</p>
                            <p className="text-2xl font-bold text-yellow-600">{lowMarginProducts.length}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Total Qty Sold</p>
                            <p className="text-2xl font-bold text-purple-600">{metrics.totalQtySold.toFixed(0)} kg</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {highMarginProducts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-green-800 mb-4">
                          High Margin Products (30%+) - Keep These Prices! ({highMarginProducts.length})
                        </h3>
                        <div className="space-y-2">
                          {highMarginProducts.map((product) => (
                            <Card key={product.productId}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold">{product.productName}</p>
                                    <div className="grid grid-cols-4 gap-4 mt-2 text-xs">
                                      <div>
                                        <p className="text-gray-600">Quantity Sold</p>
                                        <p className="font-semibold">{product.totalQuantitySold.toFixed(1)} kg</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Revenue</p>
                                        <p className="font-semibold text-blue-600">{formatCurrency(product.totalRevenue)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Cost</p>
                                        <p className="font-semibold text-red-600">{formatCurrency(product.totalCost)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Orders</p>
                                        <p className="font-semibold">{product.orderCount}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right ml-6">
                                    <p className="text-xs text-gray-600">Profit</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(product.totalProfit)}</p>
                                    <Badge className={`mt-1 ${getMarginBadge(product.profitMargin)}`}>
                                      {product.profitMargin.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold mb-4">All Products Performance ({productReport.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 text-sm font-semibold">Product</th>
                              <th className="text-right p-3 text-sm font-semibold">Qty Sold (kg)</th>
                              <th className="text-right p-3 text-sm font-semibold">Revenue</th>
                              <th className="text-right p-3 text-sm font-semibold">Cost</th>
                              <th className="text-right p-3 text-sm font-semibold">Profit</th>
                              <th className="text-right p-3 text-sm font-semibold">Margin</th>
                              <th className="text-center p-3 text-sm font-semibold">Orders</th>
                              <th className="text-center p-3 text-sm font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productReport.map((product) => (
                              <tr key={product.productId} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  <p className="font-medium">{product.productName}</p>
                                </td>
                                <td className="p-3 text-right">{product.totalQuantitySold.toFixed(1)}</td>
                                <td className="p-3 text-right font-semibold text-blue-600">
                                  {formatCurrency(product.totalRevenue)}
                                </td>
                                <td className="p-3 text-right font-semibold text-red-600">
                                  {formatCurrency(product.totalCost)}
                                </td>
                                <td className={`p-3 text-right font-bold ${getProfitColor(product.totalProfit)}`}>
                                  {formatCurrency(product.totalProfit)}
                                </td>
                                <td className="p-3 text-right">
                                  <Badge className={getMarginBadge(product.profitMargin)}>
                                    {product.profitMargin.toFixed(1)}%
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">{product.orderCount}</td>
                                <td className="p-3 text-center">
                                  {product.profitMargin >= 30 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                  ) : product.profitMargin < 15 ? (
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                                  ) : (
                                    <Minus className="h-5 w-5 text-blue-500 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {lowMarginProducts.length > 0 && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                          <p className="font-semibold text-yellow-900">Action Required:</p>
                          <p className="text-sm text-yellow-800">
                            {lowMarginProducts.length} products have profit margins below 15%.
                            Consider increasing prices or finding better suppliers to improve profitability.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* SUPPLIERS TAB */}
                {activeTab === 'suppliers' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Supplier Performance Comparison</h3>
                      <Alert className="bg-blue-50 border-blue-200 mb-6">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-900">
                          Compare which suppliers give you the best profit margins. Order more from top performers!
                        </AlertDescription>
                      </Alert>

                      {supplierPerformance.length > 0 ? (
                        <div className="space-y-3">
                          {supplierPerformance.map((supplier, index) => (
                            <Card key={supplier.supplierName} className={
                              index === 0 ? 'border-green-200 bg-green-50' :
                              index === supplierPerformance.length - 1 ? 'border-red-200 bg-red-50' :
                              ''
                            }>
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-xl ${
                                      index === 0 ? 'bg-green-100 text-green-600' :
                                      index === supplierPerformance.length - 1 ? 'bg-red-100 text-red-600' :
                                      'bg-blue-100 text-blue-600'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg">{supplier.supplierName}</p>
                                        {index === 0 && (
                                          <Badge className="bg-green-100 text-green-800">Best Supplier</Badge>
                                        )}
                                        {index === supplierPerformance.length - 1 && supplierPerformance.length > 1 && (
                                          <Badge className="bg-red-100 text-red-800">Needs Review</Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-4 gap-6 mt-3">
                                        <div>
                                          <p className="text-xs text-gray-600">Total Batches</p>
                                          <p className="font-semibold text-sm">{supplier.totalBatches}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Revenue</p>
                                          <p className="font-semibold text-sm text-blue-600">
                                            {formatCurrency(supplier.totalRevenue)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Cost</p>
                                          <p className="font-semibold text-sm text-red-600">
                                            {formatCurrency(supplier.totalCost)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Total Profit</p>
                                          <p className={`font-bold text-sm ${getProfitColor(supplier.totalProfit)}`}>
                                            {formatCurrency(supplier.totalProfit)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right ml-6">
                                    <p className="text-xs text-gray-600 mb-1">Avg Profit Margin</p>
                                    <p className="text-3xl font-bold text-purple-600">
                                      {supplier.avgMargin.toFixed(1)}%
                                    </p>
                                    <Badge className={`mt-2 ${getMarginBadge(supplier.avgMargin)}`}>
                                      {getMarginLabel(supplier.avgMargin)}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No supplier data available for this period</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* CASHIERS TAB */}
                {activeTab === 'cashiers' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Cashier Performance Analysis</h3>
                      <Alert className="bg-purple-50 border-purple-200 mb-6">
                        <Users className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-sm text-purple-900">
                          Track which cashiers are maintaining good profit margins and pricing correctly.
                        </AlertDescription>
                      </Alert>

                      {cashierPerformance.length > 0 ? (
                        <div className="space-y-3">
                          {cashierPerformance.map((cashier, index) => (
                            <Card key={cashier.cashierId} className={
                              index === 0 ? 'border-green-200 bg-green-50' : ''
                            }>
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-xl ${
                                      index === 0 ? 'bg-green-100 text-green-600' :
                                      'bg-blue-100 text-blue-600'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg">{cashier.cashierName}</p>
                                        {index === 0 && (
                                          <Badge className="bg-green-100 text-green-800">Top Performer</Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-5 gap-6 mt-3">
                                        <div>
                                          <p className="text-xs text-gray-600">Total Orders</p>
                                          <p className="font-semibold text-sm">{cashier.totalOrders}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Revenue</p>
                                          <p className="font-semibold text-sm text-blue-600">
                                            {formatCurrency(cashier.totalRevenue)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Total Profit</p>
                                          <p className={`font-bold text-sm ${getProfitColor(cashier.totalProfit)}`}>
                                            {formatCurrency(cashier.totalProfit)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Profitable</p>
                                          <p className="font-semibold text-sm text-green-600">{cashier.profitableOrders}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600">Loss Orders</p>
                                          <p className="font-semibold text-sm text-red-600">{cashier.lossOrders}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right ml-6">
                                    <p className="text-xs text-gray-600 mb-1">Avg Profit Margin</p>
                                    <p className="text-3xl font-bold text-purple-600">
                                      {cashier.avgMargin.toFixed(1)}%
                                    </p>
                                    <Badge className={`mt-2 ${getMarginBadge(cashier.avgMargin)}`}>
                                      {getMarginLabel(cashier.avgMargin)}
                                    </Badge>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Success: {((cashier.profitableOrders / cashier.totalOrders) * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No cashier data available for this period</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* ORDERS && PRICING TABS - Keep previous implementations */}
                {activeTab === 'orders' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Order Performance Analysis</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                            <p className="text-2xl font-bold">{metrics.totalOrders}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-green-50">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Profitable Orders</p>
                            <p className="text-2xl font-bold text-green-600">{metrics.profitableOrders}</p>
                            <p className="text-xs text-gray-600">
                              {metrics.totalOrders > 0 ? ((metrics.profitableOrders / metrics.totalOrders) * 100).toFixed(0) : 0}%
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-50">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Loss Orders</p>
                            <p className="text-2xl font-bold text-red-600">{metrics.lossOrders}</p>
                            <p className="text-xs text-gray-600">
                              {metrics.totalOrders > 0 ? ((metrics.lossOrders / metrics.totalOrders) * 100).toFixed(0) : 0}%
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-600 mb-1">Avg Order Value</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {metrics.totalOrders > 0 ? formatCurrency(metrics.totalRevenue / metrics.totalOrders) : 'LKR 0'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">All Orders ({orderProfitDetails.length})</h3>
                      <div className="space-y-2">
                        {orderProfitDetails.map((order) => (
                          <Card key={order.orderId} className="cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => router.push(`/admin/orders/${order.orderId}`)}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`h-3 w-3 rounded-full ${
                                    order.totalProfit > 0 ? 'bg-green-500' :
                                    order.totalProfit < 0 ? 'bg-red-500' : 'bg-gray-400'
                                  }`} />
                                  <div className="flex-1">
                                    <p className="font-semibold">{order.orderNumber}</p>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(order.orderDate)} • {order.cashierName} • {order.itemCount} items
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600">Total</p>
                                    <p className="font-bold text-blue-600">{formatCurrency(order.total)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600">Cost</p>
                                    <p className="font-bold text-red-600">{formatCurrency(order.totalCost)}</p>
                                  </div>
                                  <div className="text-right min-w-[120px]">
                                    <p className="text-xs text-gray-600">Profit/Loss</p>
                                    <div className="flex items-center justify-end gap-1">
                                      {order.totalProfit > 0 ? (
                                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                                      ) : order.totalProfit < 0 ? (
                                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <Minus className="h-4 w-4 text-gray-400" />
                                      )}
                                      <p className={`font-bold ${getProfitColor(order.totalProfit)}`}>
                                        {formatCurrency(Math.abs(order.totalProfit))}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={getMarginBadge(order.profitMargin)}>
                                    {order.profitMargin.toFixed(1)}%
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Price Configuration Impact Analysis</h3>
                      <Alert className="bg-blue-50 border-blue-200">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-900">
                          This shows how different selling prices affected your profit margins.
                          Use this to optimize pricing strategy.
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="space-y-4">
                      {priceVarianceReport.map((product) => {
                        const minMargin = product.currentCostPrice
                          ? ((product.minPrice - product.currentCostPrice) / product.currentCostPrice * 100)
                          : 0;
                        const maxMargin = product.currentCostPrice
                          ? ((product.maxPrice - product.currentCostPrice) / product.currentCostPrice * 100)
                          : 0;
                        const avgMargin = product.currentCostPrice
                          ? ((product.avgPrice - product.currentCostPrice) / product.currentCostPrice * 100)
                          : 0;
                        const priceDiff = product.maxPrice - product.minPrice;

                        return (
                          <Card key={product.productId}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <p className="font-semibold text-lg">{product.productName}</p>
                                  {product.currentCostPrice && (
                                    <p className="text-sm text-gray-600">Current Cost: {formatCurrency(product.currentCostPrice)}/kg</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {product.priceHistory.length} price variation{product.priceHistory.length > 1 ? 's' : ''}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                                  <p className="text-xs text-gray-600 mb-2">Lowest Selling Price</p>
                                  <p className="text-xl font-bold text-red-600">{formatCurrency(product.minPrice)}/kg</p>
                                  <p className="text-sm text-gray-700 mt-1">Margin: {minMargin.toFixed(1)}%</p>
                                  <Badge className={`mt-2 ${getMarginBadge(minMargin)}`}>
                                    {getMarginLabel(minMargin)}
                                  </Badge>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-xs text-gray-600 mb-2">Average Selling Price</p>
                                  <p className="text-xl font-bold text-blue-600">{formatCurrency(product.avgPrice)}/kg</p>
                                  <p className="text-sm text-gray-700 mt-1">Margin: {avgMargin.toFixed(1)}%</p>
                                  <Badge className={`mt-2 ${getMarginBadge(avgMargin)}`}>
                                    {getMarginLabel(avgMargin)}
                                  </Badge>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-xs text-gray-600 mb-2">Highest Selling Price</p>
                                  <p className="text-xl font-bold text-green-600">{formatCurrency(product.maxPrice)}/kg</p>
                                  <p className="text-sm text-gray-700 mt-1">Margin: {maxMargin.toFixed(1)}%</p>
                                  <Badge className={`mt-2 ${getMarginBadge(maxMargin)}`}>
                                    {getMarginLabel(maxMargin)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm font-semibold mb-2">Price Points Used:</p>
                                <div className="flex flex-wrap gap-2">
                                  {product.priceHistory.map((price, i) => (
                                    <div key={i} className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                                      <span className="font-semibold">{formatCurrency(price.pricePerKg)}/kg</span>
                                      <Badge variant="secondary" className="text-xs">
                                        Used {price.count}x
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {priceDiff > 50 && (
                                <Alert className="mt-4">
                                  <TrendingUp className="h-4 w-4" />
                                  <AlertDescription className="text-sm">
                                    <span className="font-semibold">Pricing Opportunity: </span>
                                    Price difference of {formatCurrency(priceDiff)}/kg detected.
                                    By selling at {formatCurrency(product.maxPrice)}/kg consistently,
                                    you could increase profit margin by {(maxMargin - minMargin).toFixed(1)}%.
                                  </AlertDescription>
                                </Alert>
                              )}

                              {maxMargin < 15 && (
                                <Alert variant="destructive" className="mt-4">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription className="text-sm">
                                    <span className="font-semibold">Action Required: </span>
                                    Even at highest price, margin is only {maxMargin.toFixed(1)}%.
                                    Consider negotiating better cost price with supplier or increasing selling price.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!loading && !batchReport && productReport.length === 0 && (
          <Card className="max-w-7xl mx-auto">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated Yet</h3>
              <p className="text-gray-600 mb-4">
                Select a date range and click "Generate Report" to see your business performance
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
