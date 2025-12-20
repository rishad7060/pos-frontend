'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAuthUser, logout } from '@/lib/auth';
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  LogOut,
  User,
  Calendar,
  DollarSign,
  Package,
  BarChart3,
  PieChart,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Receipt,
  History,
  Filter
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface PriceHistory {
  pricePerKg: number;
  count: number;
}

interface PriceVariance {
  productId: number | null;
  productName: string;
  priceHistory: PriceHistory[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currentCostPrice: number | null;
}

interface SaleDetail {
  orderItemId: number;
  date: string;
  orderNumber: string;
  itemName: string;
  productId: number | null;
  netWeightKg: number;
  costPrice: number | null;
  pricePerKg: number;
  revenue: number;
  cost: number | null;
  profit: number | null;
  profitMargin: number | null;
}

interface ProfitAnalysisData {
  productProfitAnalysis: ProductProfit[];
  priceVarianceAnalysis: PriceVariance[];
  detailedSalesBreakdown: SaleDetail[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface OrderProfitDetail {
  orderId: number;
  orderNumber: string;
  cashierId: number;
  cashierName: string;
  cashierEmail: string;
  orderDate: string;
  subtotal: number;
  total: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  itemCount: number;
  status: string;
}

interface PriceChangeRecord {
  id: number;
  productId: number;
  userId: number;
  changeType: 'cost_price' | 'selling_price' | 'pos_override';
  orderNumber?: string | null;
  oldPrice: number;
  newPrice: number;
  notes: string | null;
  createdAt: string;
  productName: string;
  sku: string | null;
  category: string | null;
  userName: string;
  userEmail: string;
  priceChange: number;
  percentChange: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ProfitAnalysisData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'prices' | 'sales' | 'orders' | 'history'>('overview');
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  // New state for order profit details
  const [orderProfitDetails, setOrderProfitDetails] = useState<OrderProfitDetail[]>([]);
  const [profitStatusFilter, setProfitStatusFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // New state for price change history
  const [priceChangeHistory, setPriceChangeHistory] = useState<PriceChangeRecord[]>([]);
  const [priceChangeTypeFilter, setPriceChangeTypeFilter] = useState<'all' | 'cost_price' | 'selling_price' | 'pos_override'>('all');
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);

  useEffect(() => {
    setUser(getAuthUser());
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/reports/profit-analysis?startDate=${startDateTime.toISOString()}&endDate=${endDateTime.toISOString()}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profit analysis');
      }

      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderProfitDetails = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoadingOrders(true);
    setError('');

    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/orders/profit-details?startDate=${startDateTime.toISOString()}&endDate=${endDateTime.toISOString()}&profitStatus=${profitStatusFilter}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch order profit details');
      }

      const data = await response.json();
      setOrderProfitDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order profit details');
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchPriceChangeHistory = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoadingPriceHistory(true);
    setError('');

    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      let url = `/api/price-history?startDate=${startDateTime.toISOString()}&endDate=${endDateTime.toISOString()}&limit=200`;

      if (priceChangeTypeFilter !== 'all') {
        url += `&changeType=${priceChangeTypeFilter}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch price change history');
      }

      const data = await response.json();
      setPriceChangeHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch price change history');
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const rows = [
      ['Profit Analysis Report'],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ['Product Profit Analysis'],
      ['Product', 'Qty Sold (KG)', 'Revenue (LKR)', 'Cost (LKR)', 'Profit (LKR)', 'Margin (%)', 'Orders'],
      ...(report.productProfitAnalysis || []).map(p => [
        p.productName,
        p.totalQuantitySold,
        p.totalRevenue,
        p.totalCost,
        p.totalProfit,
        p.profitMargin,
        p.orderCount
      ]),
      [],
      ['Price Variance Analysis'],
      ['Product', 'Min Price', 'Max Price', 'Avg Price', 'Cost Price', 'Price Variations'],
      ...(report.priceVarianceAnalysis || []).map(p => [
        p.productName,
        p.minPrice,
        p.maxPrice,
        p.avgPrice,
        p.currentCostPrice || 'N/A',
        (p.priceHistory || []).map(h => `LKR ${h.pricePerKg} (${h.count}x)`).join(', ')
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-analysis-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const calculateTotals = () => {
    if (!report || !report.productProfitAnalysis || !Array.isArray(report.productProfitAnalysis)) {
      return { revenue: 0, cost: 0, profit: 0, margin: 0 };
    }

    const revenue = report.productProfitAnalysis.reduce((sum, p) => {
      const rev = typeof p.totalRevenue === 'number' ? p.totalRevenue : (parseFloat(String(p.totalRevenue)) || 0);
      return sum + rev;
    }, 0);
    const cost = report.productProfitAnalysis.reduce((sum, p) => {
      const cst = typeof p.totalCost === 'number' ? p.totalCost : (parseFloat(String(p.totalCost)) || 0);
      return sum + cst;
    }, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, cost, profit, margin };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Date Range Selection */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
            <div className="space-y-2 flex-1 sm:flex-initial">
              <Label htmlFor="startDate" className="text-xs sm:text-sm">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40 h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2 flex-1 sm:flex-initial">
              <Label htmlFor="endDate" className="text-xs sm:text-sm">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40 h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 sm:flex-initial">
              <Button onClick={generateReport} disabled={loading} size="default" className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              {report && (
                <Button variant="outline" onClick={exportToCSV} size="default" className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="shadow-lg border-l-4 border-l-blue-500">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">LKR {totals.revenue.toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Sales income</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-l-4 border-l-red-500">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">LKR {totals.cost.toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Product costs</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-l-4 border-l-green-500">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">LKR {totals.profit.toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">After costs</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-l-4 border-l-purple-500">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">{totals.margin.toFixed(1)}%</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Average margin</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card className="shadow-lg">
            <CardHeader className="p-0">
              <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto scrollbar-horizontal px-2 sm:px-6">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('overview')}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'products' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('products')}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  By Product
                </Button>
                <Button
                  variant={activeTab === 'prices' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('prices')}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Price Variance
                </Button>
                <Button
                  variant={activeTab === 'sales' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('sales')}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Sales Details
                </Button>
                <Button
                  variant={activeTab === 'orders' ? 'default' : 'ghost'}
                  onClick={() => {
                    setActiveTab('orders');
                    if (orderProfitDetails.length === 0) {
                      fetchOrderProfitDetails();
                    }
                  }}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Order Profit/Loss
                </Button>
                <Button
                  variant={activeTab === 'history' ? 'default' : 'ghost'}
                  onClick={() => {
                    setActiveTab('history');
                    if (priceChangeHistory.length === 0) {
                      fetchPriceChangeHistory();
                    }
                  }}
                  className="rounded-b-none whitespace-nowrap flex-shrink-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Price History
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Top Performing Products</h3>
                    <div className="space-y-2 sm:space-y-3">
                      {(report.productProfitAnalysis || []).slice(0, 10).map((product, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                            <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base truncate">{product.productName}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {product.totalQuantitySold.toFixed(1)} KG sold • {product.orderCount} orders
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right grid grid-cols-3 gap-3 sm:gap-6 w-full sm:w-auto sm:min-w-[400px]">
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue</p>
                              <p className="font-bold text-blue-600 text-xs sm:text-sm">LKR {product.totalRevenue.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Profit</p>
                              <p className="font-bold text-green-600 text-xs sm:text-sm">LKR {product.totalProfit.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Margin</p>
                              <Badge
                                variant={product.profitMargin >= 20 ? 'default' : product.profitMargin >= 10 ? 'secondary' : 'destructive'}
                                className="font-bold text-[10px] sm:text-xs"
                              >
                                {product.profitMargin.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Product Profitability Analysis</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{(report.productProfitAnalysis || []).length} products</p>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {(report.productProfitAnalysis || []).map((product, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedProduct(expandedProduct === index ? null : index)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${product.profitMargin >= 20 ? 'bg-green-500' :
                              product.profitMargin >= 10 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base truncate">{product.productName}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {product.totalQuantitySold.toFixed(1)} KG • {product.orderCount} orders
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-3 sm:gap-6 flex-1 sm:flex-initial">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue</p>
                                <p className="font-bold text-xs sm:text-sm">LKR {product.totalRevenue.toFixed(2)}</p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Profit</p>
                                <p className={`font-bold text-xs sm:text-sm ${product.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  LKR {product.totalProfit.toFixed(2)}
                                </p>
                              </div>
                              <Badge variant={product.profitMargin >= 20 ? 'default' : product.profitMargin >= 10 ? 'secondary' : 'destructive'} className="text-[10px] sm:text-xs">
                                {product.profitMargin.toFixed(1)}%
                              </Badge>
                            </div>
                            {expandedProduct === index ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
                          </div>
                        </div>

                        {expandedProduct === index && (
                          <div className="p-3 sm:p-4 bg-muted/20 border-t">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Quantity</p>
                                <p className="font-semibold text-xs sm:text-sm">{product.totalQuantitySold.toFixed(2)} KG</p>
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Revenue</p>
                                <p className="font-semibold text-blue-600 text-xs sm:text-sm">LKR {product.totalRevenue.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Cost</p>
                                <p className="font-semibold text-red-600 text-xs sm:text-sm">LKR {product.totalCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Net Profit</p>
                                <p className={`font-semibold text-xs sm:text-sm ${product.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  LKR {product.totalProfit.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${product.profitMargin >= 20 ? 'bg-green-500' :
                                    product.profitMargin >= 10 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                  style={{ width: `${Math.min(product.profitMargin, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Profit Margin: {product.profitMargin.toFixed(2)}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Variance Tab */}
              {activeTab === 'prices' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Price Variance Analysis</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Track selling price changes</p>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {(report.priceVarianceAnalysis || []).map((product, index) => (
                      <Card key={index} className="shadow-md">
                        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                            <CardTitle className="text-sm sm:text-base truncate">{product.productName}</CardTitle>
                            {product.currentCostPrice && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                Cost: LKR {product.currentCostPrice}/kg
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="text-center p-2 sm:p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Lowest Price</p>
                              <p className="text-sm sm:text-lg font-bold text-red-600">LKR {product.minPrice}/kg</p>
                              {product.currentCostPrice && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  {((product.minPrice - product.currentCostPrice) / product.currentCostPrice * 100).toFixed(1)}% margin
                                </p>
                              )}
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Average Price</p>
                              <p className="text-sm sm:text-lg font-bold text-blue-600">LKR {product.avgPrice}/kg</p>
                              {product.currentCostPrice && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  {((product.avgPrice - product.currentCostPrice) / product.currentCostPrice * 100).toFixed(1)}% margin
                                </p>
                              )}
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Highest Price</p>
                              <p className="text-sm sm:text-lg font-bold text-green-600">LKR {product.maxPrice}/kg</p>
                              {product.currentCostPrice && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  {((product.maxPrice - product.currentCostPrice) / product.currentCostPrice * 100).toFixed(1)}% margin
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold mb-2">Selling Price History</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {product.priceHistory.map((price, i) => (
                                <div
                                  key={i}
                                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-muted rounded-lg"
                                >
                                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                                  <span className="font-semibold text-xs sm:text-sm">LKR {price.pricePerKg}/kg</span>
                                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
                                    {price.count}x
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                          {product.maxPrice - product.minPrice > 100 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                High price variance detected: LKR {(product.maxPrice - product.minPrice).toFixed(2)} difference
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales Details Tab */}
              {activeTab === 'sales' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Detailed Sales Breakdown</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Showing {(report.detailedSalesBreakdown || []).length} of {report.pagination?.total || 0} sales
                    </p>
                  </div>
                  <div className="overflow-x-auto scrollbar-horizontal -mx-3 sm:mx-0">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Date</th>
                          <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Order #</th>
                          <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Product</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Qty (KG)</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Cost Price</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Sell Price</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Revenue</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Cost</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Profit</th>
                          <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.detailedSalesBreakdown || []).map((sale) => (
                          <tr key={sale.orderItemId} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm font-mono">{sale.orderNumber}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium truncate max-w-[150px]">{sale.itemName}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">{sale.netWeightKg}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                              {sale.costPrice ? `LKR ${sale.costPrice}/kg` : '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">
                              LKR {sale.pricePerKg}/kg
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold text-blue-600">
                              LKR {sale.revenue}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-right text-red-600">
                              {sale.cost ? `LKR ${sale.cost}` : '-'}
                            </td>
                            <td className={`p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold ${sale.profit !== null && sale.profit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {sale.profit !== null ? `LKR ${sale.profit}` : '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              {sale.profitMargin !== null ? (
                                <Badge
                                  variant={
                                    sale.profitMargin >= 20 ? 'default' :
                                      sale.profitMargin >= 10 ? 'secondary' :
                                        'destructive'
                                  }
                                  className="text-[10px] sm:text-xs"
                                >
                                  {sale.profitMargin.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* NEW: Order Profit/Loss Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Order-Level Profit/Loss Analysis</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <Select
                          value={profitStatusFilter}
                          onValueChange={(value: 'all' | 'profit' | 'loss') => setProfitStatusFilter(value)}
                        >
                          <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Orders</SelectItem>
                            <SelectItem value="profit">Profitable Only</SelectItem>
                            <SelectItem value="loss">Loss-Making Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={fetchOrderProfitDetails} disabled={loadingOrders} size="sm" className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                        {loadingOrders ? 'Loading...' : 'Refresh'}
                      </Button>
                    </div>
                  </div>

                  {loadingOrders ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : orderProfitDetails.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No orders found for the selected period and filter.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {orderProfitDetails.map((order) => (
                        <Card key={order.orderId} className="shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                              <div className="flex-1 min-w-0 w-full sm:w-auto">
                                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                  <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0 ${order.totalProfit > 0 ? 'bg-green-500' :
                                    order.totalProfit < 0 ? 'bg-red-500' :
                                      'bg-gray-400'
                                    }`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm sm:text-lg font-mono truncate">{order.orderNumber}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      {new Date(order.orderDate).toLocaleString()} • {order.itemCount} items
                                    </p>
                                  </div>
                                </div>

                                <div className="ml-4 sm:ml-6 space-y-1">
                                  <p className="text-xs sm:text-sm">
                                    <span className="text-muted-foreground">Cashier:</span>{' '}
                                    <span className="font-medium">{order.cashierName}</span>
                                    <span className="text-muted-foreground ml-1 sm:ml-2 text-[10px] sm:text-xs">({order.cashierEmail})</span>
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 text-left sm:text-right w-full sm:w-auto sm:min-w-[600px]">
                                <div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Subtotal</p>
                                  <p className="font-bold text-xs sm:text-sm">LKR {order.subtotal.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total</p>
                                  <p className="font-bold text-blue-600 text-xs sm:text-sm">LKR {order.total.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Cost</p>
                                  <p className="font-bold text-red-600 text-xs sm:text-sm">LKR {order.totalCost.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Profit/Loss</p>
                                  <p className={`font-bold text-xs sm:text-sm ${order.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {order.totalProfit >= 0 ? (
                                      <span className="flex items-center gap-1 sm:justify-end">
                                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                        LKR {order.totalProfit.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 sm:justify-end">
                                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                        LKR {Math.abs(order.totalProfit).toFixed(2)}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Margin</p>
                                  <Badge
                                    variant={
                                      order.profitMargin >= 20 ? 'default' :
                                        order.profitMargin >= 10 ? 'secondary' :
                                          'destructive'
                                    }
                                    className="font-bold text-[10px] sm:text-xs"
                                  >
                                    {order.profitMargin.toFixed(1)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NEW: Price Change History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Complete Price Change History</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <Select
                          value={priceChangeTypeFilter}
                          onValueChange={(value: 'all' | 'cost_price' | 'selling_price' | 'pos_override') => setPriceChangeTypeFilter(value)}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Changes</SelectItem>
                            <SelectItem value="cost_price">Cost Price Only</SelectItem>
                            <SelectItem value="selling_price">Selling Price Only</SelectItem>
                            <SelectItem value="pos_override">POS Overrides</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={fetchPriceChangeHistory} disabled={loadingPriceHistory} size="sm" className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                        {loadingPriceHistory ? 'Loading...' : 'Refresh'}
                      </Button>
                    </div>
                  </div>

                  {loadingPriceHistory ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : priceChangeHistory.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No price changes recorded for the selected period and filter.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {priceChangeHistory.map((change) => (
                        <Card key={change.id} className="shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0">
                              <div className="flex-1 min-w-0 w-full sm:w-auto">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                  <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 ${change.changeType === 'cost_price'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                    : change.changeType === 'pos_override'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                    }`}>
                                    {change.changeType === 'cost_price' ? 'Cost Price' : change.changeType === 'pos_override' ? 'POS Override' : 'Selling Price'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm sm:text-lg truncate">{change.productName}</p>
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                      {change.sku && <span className="truncate">SKU: {change.sku}</span>}
                                      {change.category && <span>• {change.category}</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="ml-0 sm:ml-3 space-y-2 mt-2 sm:mt-3">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-muted-foreground">Changed by:</span>
                                      <span className="font-medium text-xs sm:text-sm">{change.userName}</span>
                                      <span className="text-muted-foreground text-[10px] sm:text-xs">({change.userEmail})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs sm:text-sm text-muted-foreground">
                                        {new Date(change.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {change.notes && (
                                    <div className="bg-muted/50 p-2 sm:p-3 rounded-lg">
                                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Note:</p>
                                      <p className="text-xs sm:text-sm italic">{change.notes}</p>
                                    </div>
                                  )}

                                  {change.orderNumber && (
                                    <div className="bg-purple-50 dark:bg-purple-950/20 p-2 sm:p-3 rounded-lg mt-2">
                                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Related Order:</p>
                                      <p className="text-xs sm:text-sm font-mono font-medium">{change.orderNumber}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-4 ml-0 sm:ml-4 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
                                <div className="text-left sm:text-right">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Old Price</p>
                                  <p className="font-bold text-sm sm:text-lg text-red-600">LKR {change.oldPrice.toFixed(2)}</p>
                                </div>

                                <div className="flex items-center">
                                  {change.priceChange > 0 ? (
                                    <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
                                  ) : change.priceChange < 0 ? (
                                    <TrendingDown className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
                                  ) : (
                                    <span className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400">→</span>
                                  )}
                                </div>

                                <div className="text-left sm:text-right">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">New Price</p>
                                  <p className="font-bold text-sm sm:text-lg text-green-600">LKR {change.newPrice.toFixed(2)}</p>
                                </div>

                                <div className="text-left sm:text-right sm:min-w-[120px]">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Change</p>
                                  <div>
                                    <p className={`font-bold text-xs sm:text-sm ${change.priceChange > 0 ? 'text-green-600' :
                                      change.priceChange < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                      }`}>
                                      {change.priceChange > 0 ? '+' : ''}
                                      LKR {change.priceChange.toFixed(2)}
                                    </p>
                                    <Badge
                                      variant={
                                        change.percentChange > 0 ? 'default' :
                                          change.percentChange < 0 ? 'destructive' :
                                            'secondary'
                                      }
                                      className="mt-1 text-[10px] sm:text-xs"
                                    >
                                      {change.percentChange > 0 ? '+' : ''}
                                      {change.percentChange.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>

  );
}