'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAuthUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Package,
  Calendar,
  Truck,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  User,
  Receipt
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BatchDetail {
  id: number;
  batchNumber: string;
  productId: number;
  productName: string;
  productSku: string | null;
  supplierId: number | null;
  supplierName: string | null;
  purchaseNumber: string | null;
  receivedDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  quantitySold: number;
  costPrice: number;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  usageHistory: UsageRecord[];
}

interface UsageRecord {
  orderNumber: string;
  orderDate: string;
  quantityUsed: number;
  costPrice: number;
}

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [usageReport, setUsageReport] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setUser(getAuthUser());
    if (batchId) {
      fetchBatchDetails();
      fetchUsageReport();
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      const response = await apiClient.getBatchById(parseInt(batchId));

      if (response.data) {
        setBatch(response.data);
      } else if (response.error) {
        setError(response.error.message || 'Failed to fetch batch details');
      }
    } catch (err: any) {
      console.error('Fetch batch details error:', err);
      setError(err.message || 'An error occurred while fetching batch details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageReport = async () => {
    try {
      const response = await apiClient.getBatchUsageInOrders(parseInt(batchId), {
        limit: 50,
      });

      if (response.data) {
        setUsageReport(response.data);
      }
    } catch (err: any) {
      console.error('Fetch usage report error:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={['admin', 'manager']}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
          <Card className="max-w-7xl mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading batch details...</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  if (error || !batch) {
    return (
      <AuthGuard allowedRoles={['admin', 'manager']}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
          <Card className="max-w-7xl mx-auto">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
              <p className="text-gray-600">{error || 'Batch not found'}</p>
              <Button onClick={() => router.push('/admin/batches')} className="mt-4">
                Back to Batches
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  const soldPercentage = (batch.quantitySold / batch.quantityReceived) * 100;
  const remainingPercentage = (batch.quantityRemaining / batch.quantityReceived) * 100;

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
                onClick={() => router.push('/admin/batches')}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Batch Details</h1>
                <p className="text-gray-600 mt-1">{batch.batchNumber}</p>
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

        {/* Batch Info Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {batch.quantityReceived.toFixed(1)} kg
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatDateShort(batch.receivedDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Quantity Sold</p>
                  <p className="text-2xl font-bold text-green-600">
                    {batch.quantitySold.toFixed(1)} kg
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {soldPercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {batch.quantityRemaining.toFixed(1)} kg
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {remainingPercentage.toFixed(1)}% left
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cost Price</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(batch.costPrice)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">per kg</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Inventory Status</h3>
            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${soldPercentage}%` }}
                >
                  {soldPercentage > 10 && `${soldPercentage.toFixed(0)}% Sold`}
                </div>
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${remainingPercentage}%` }}
                >
                  {remainingPercentage > 10 && `${remainingPercentage.toFixed(0)}% Left`}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Sold: {batch.quantitySold.toFixed(1)} kg</span>
              <span>Remaining: {batch.quantityRemaining.toFixed(1)} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* Batch Information */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Product Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Product:</span>
                    <span className="text-sm font-medium">{batch.productName}</span>
                  </div>
                  {batch.productSku && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">SKU:</span>
                      <span className="text-sm font-medium">{batch.productSku}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Batch Number:</span>
                    <span className="text-sm font-medium font-mono">{batch.batchNumber}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Purchase Details</h4>
                <div className="space-y-2">
                  {batch.supplierName && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Supplier:</span>
                      <span className="text-sm font-medium">{batch.supplierName}</span>
                    </div>
                  )}
                  {batch.purchaseNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">PO Number:</span>
                      <span className="text-sm font-medium">{batch.purchaseNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Received Date:</span>
                    <span className="text-sm font-medium">{formatDateShort(batch.receivedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cost Price:</span>
                    <span className="text-sm font-medium">{formatCurrency(batch.costPrice)}/kg</span>
                  </div>
                </div>
              </div>
            </div>

            {batch.notes && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{batch.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Summary */}
        {usageReport && usageReport.summary && (
          <Card className="max-w-7xl mx-auto mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{usageReport.summary.totalOrders}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(usageReport.summary.totalRevenue)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(usageReport.summary.totalProfit)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {usageReport.summary.avgProfitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage History */}
        {usageReport && usageReport.usage && usageReport.usage.length > 0 && (
          <Card className="max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Usage History ({usageReport.usage.length} orders)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Order</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Cashier</th>
                      <th className="text-left p-3 text-sm font-semibold">Customer</th>
                      <th className="text-right p-3 text-sm font-semibold">Qty Used</th>
                      <th className="text-right p-3 text-sm font-semibold">Revenue</th>
                      <th className="text-right p-3 text-sm font-semibold">Profit</th>
                      <th className="text-center p-3 text-sm font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageReport.usage.map((usage: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <p className="text-sm font-medium">{usage.orderNumber}</p>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {formatDateShort(usage.orderDate)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{usage.cashierName}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{usage.customerName}</td>
                        <td className="p-3 text-right text-sm font-medium">
                          {usage.quantityUsed.toFixed(1)} kg
                        </td>
                        <td className="p-3 text-right text-sm font-medium">
                          {formatCurrency(usage.revenue)}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-sm font-bold ${
                            usage.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(usage.profit)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${
                            usage.profitMargin >= 30
                              ? 'bg-green-100 text-green-800'
                              : usage.profitMargin >= 15
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {usage.profitMargin.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
