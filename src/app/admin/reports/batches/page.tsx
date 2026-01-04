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
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ShoppingCart,
  Truck,
  Eye,
  Filter,
  Download,
  BarChart3,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BatchProfit {
  batchId: number;
  batchNumber: string;
  productId: number;
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

interface BatchProfitSummary {
  totalBatches: number;
  totalQuantitySold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  avgProfitMargin: number;
}

interface BatchProfitReport {
  summary: BatchProfitSummary;
  batches: BatchProfit[];
}

export default function BatchProfitReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<BatchProfitReport | null>(null);
  const [error, setError] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue' | 'orders'>('profit');

  useEffect(() => {
    setUser(getAuthUser());

    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchBatchProfitReport();
    }
  }, [startDate, endDate]);

  const fetchBatchProfitReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.getBatchProfitReport({
        startDate,
        endDate,
        limit: 100,
      });

      if (response.data) {
        setReport(response.data);
      } else if (response.error) {
        setError(response.error.message || 'Failed to fetch batch profit report');
      }
    } catch (err: any) {
      console.error('Fetch batch profit report error:', err);
      setError(err.message || 'An error occurred while fetching the report');
    } finally {
      setLoading(false);
    }
  };

  const getSortedBatches = () => {
    if (!report?.batches) return [];

    const batches = [...report.batches];
    switch (sortBy) {
      case 'profit':
        return batches.sort((a, b) => b.totalProfit - a.totalProfit);
      case 'margin':
        return batches.sort((a, b) => b.profitMargin - a.profitMargin);
      case 'revenue':
        return batches.sort((a, b) => b.totalRevenue - a.totalRevenue);
      case 'orders':
        return batches.sort((a, b) => b.orderCount - a.orderCount);
      default:
        return batches;
    }
  };

  const getProfitBadgeColor = (margin: number) => {
    if (margin >= 40) return 'bg-green-100 text-green-800 border-green-300';
    if (margin >= 25) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (margin >= 15) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getProfitIcon = (margin: number) => {
    if (margin >= 25) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (margin >= 15) return <DollarSign className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const viewBatchDetails = (batchId: number) => {
    router.push(`/admin/batches/${batchId}`);
  };

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/admin/reports')}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Batch Profitability Report</h1>
                <p className="text-gray-600 mt-1">See which inventory batches are making the most profit</p>
              </div>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-sm text-gray-600">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sortBy">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sortBy" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Total Profit</SelectItem>
                    <SelectItem value="margin">Profit Margin</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="orders">Order Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={fetchBatchProfitReport} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="max-w-7xl mx-auto mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {report && report.summary && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(report.summary.totalProfit)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  From {report.summary.totalBatches} batches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Profit Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {report.summary.avgProfitMargin.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Revenue: {formatCurrency(report.summary.totalRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sold</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {report.summary.totalQuantitySold.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cost: {formatCurrency(report.summary.totalCost)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Batch List */}
        {report && report.batches && report.batches.length > 0 ? (
          <Card className="max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Batch Performance ({getSortedBatches().length} batches)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Batch</th>
                      <th className="text-left p-3 text-sm font-semibold">Product</th>
                      <th className="text-left p-3 text-sm font-semibold">Supplier</th>
                      <th className="text-right p-3 text-sm font-semibold">Sold</th>
                      <th className="text-right p-3 text-sm font-semibold">Revenue</th>
                      <th className="text-right p-3 text-sm font-semibold">Cost</th>
                      <th className="text-right p-3 text-sm font-semibold">Profit</th>
                      <th className="text-center p-3 text-sm font-semibold">Margin</th>
                      <th className="text-center p-3 text-sm font-semibold">Orders</th>
                      <th className="text-center p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedBatches().map((batch) => (
                      <tr key={batch.batchId} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{batch.batchNumber}</p>
                            <p className="text-xs text-gray-500">{formatDate(batch.receivedDate)}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium">{batch.productName}</p>
                            {batch.productSku && (
                              <p className="text-xs text-gray-500">SKU: {batch.productSku}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{batch.supplierName || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <p className="text-sm font-medium">{batch.totalQuantitySold.toFixed(1)} kg</p>
                          <p className="text-xs text-gray-500">@{formatCurrency(batch.batchCostPrice)}</p>
                        </td>
                        <td className="p-3 text-right text-sm font-medium">
                          {formatCurrency(batch.totalRevenue)}
                        </td>
                        <td className="p-3 text-right text-sm">
                          {formatCurrency(batch.totalCost)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getProfitIcon(batch.profitMargin)}
                            <span className={`text-sm font-bold ${
                              batch.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(batch.totalProfit)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${getProfitBadgeColor(batch.profitMargin)}`}>
                            {batch.profitMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{batch.orderCount}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewBatchDetails(batch.batchId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          !loading && startDate && endDate && (
            <Card className="max-w-7xl mx-auto">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batch Data</h3>
                <p className="text-gray-600">
                  No batches found for the selected date range. Try selecting a different period.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </AuthGuard>
  );
}
