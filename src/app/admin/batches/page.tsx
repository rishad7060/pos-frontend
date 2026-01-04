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
  Package,
  Calendar,
  Truck,
  Eye,
  Filter,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Batch {
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
  costPrice: number;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
}

export default function BatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'depleted'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    setUser(getAuthUser());
    fetchBatches();
    fetchSuppliers();
  }, [statusFilter]);

  useEffect(() => {
    filterBatches();
  }, [batches, searchTerm, supplierFilter, startDate, endDate]);

  const fetchBatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.getBatches({
        status: statusFilter,
        limit: 200,
      });

      if (response.data) {
        setBatches(Array.isArray(response.data) ? response.data : []);
      } else if (response.error) {
        setError(response.error.message || 'Failed to fetch batches');
      }
    } catch (err: any) {
      console.error('Fetch batches error:', err);
      setError(err.message || 'An error occurred while fetching batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.getSuppliers({ limit: 100 });
      console.log('Suppliers response:', response);
      if (response.data) {
        const supplierData = Array.isArray(response.data) ? response.data : [];
        console.log('Setting suppliers:', supplierData);
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      } else {
        console.warn('No supplier data received');
      }
    } catch (err: any) {
      console.error('Fetch suppliers error:', err);
    }
  };

  const filterBatches = () => {
    let filtered = [...batches];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (batch) =>
          batch.batchNumber.toLowerCase().includes(search) ||
          batch.productName.toLowerCase().includes(search) ||
          batch.supplierName?.toLowerCase().includes(search) ||
          batch.productSku?.toLowerCase().includes(search)
      );
    }

    if (supplierFilter !== 'all') {
      filtered = filtered.filter(
        (batch) => batch.supplierId?.toString() === supplierFilter
      );
    }

    if (startDate) {
      filtered = filtered.filter(
        (batch) => new Date(batch.receivedDate) >= new Date(startDate)
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (batch) => new Date(batch.receivedDate) <= new Date(endDate)
      );
    }

    setFilteredBatches(filtered);
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

  const getStatusBadge = (batch: Batch) => {
    if (batch.quantityRemaining <= 0) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Depleted
        </Badge>
      );
    }

    const percentRemaining = (batch.quantityRemaining / batch.quantityReceived) * 100;

    if (percentRemaining < 20) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low Stock
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        <Package className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const viewBatchDetails = (batchId: number) => {
    router.push(`/admin/batches/${batchId}`);
  };

  const getStockPercentage = (batch: Batch) => {
    return (batch.quantityRemaining / batch.quantityReceived) * 100;
  };

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
              <p className="text-gray-600 mt-1">Track inventory batches with FIFO cost tracking</p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-sm text-gray-600">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-7xl mx-auto mb-6 flex gap-2">
          <Button onClick={() => router.push('/admin/reports/batches')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            View Profit Report
          </Button>
          {/* <Button variant="outline" onClick={() => router.push('/admin/reports')}>
            Back to Reports
          </Button> */}
        </div>

        {/* Filters */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar - Full Width */}
              <div>
                <Label htmlFor="search">Search Batches</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by batch number, product, or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Supplier and Status Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier Filter</Label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger id="supplier" className="mt-1">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="depleted">Depleted Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Filters and Clear Button */}
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
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSupplierFilter('all');
                      setSearchTerm('');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="max-w-7xl mx-auto mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Summary */}
        {batches.length > 0 && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold">{batches.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600">Active Batches</p>
                <p className="text-2xl font-bold text-green-600">
                  {batches.filter(b => b.quantityRemaining > 0).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600">Depleted Batches</p>
                <p className="text-2xl font-bold text-gray-500">
                  {batches.filter(b => b.quantityRemaining === 0).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600">Total Inventory</p>
                <p className="text-2xl font-bold text-blue-600">
                  {batches.reduce((sum, b) => sum + b.quantityRemaining, 0).toFixed(1)} kg
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Batch List */}
        {loading ? (
          <Card className="max-w-7xl mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading batches...</p>
            </CardContent>
          </Card>
        ) : filteredBatches.length > 0 ? (
          <Card className="max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Batch Inventory ({filteredBatches.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Batch Info</th>
                      <th className="text-left p-3 text-sm font-semibold">Product</th>
                      <th className="text-left p-3 text-sm font-semibold">Supplier</th>
                      <th className="text-right p-3 text-sm font-semibold">Cost Price</th>
                      <th className="text-left p-3 text-sm font-semibold">Inventory</th>
                      <th className="text-center p-3 text-sm font-semibold">Status</th>
                      <th className="text-center p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">{batch.batchNumber}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(batch.receivedDate)}
                            </div>
                            {batch.purchaseNumber && (
                              <p className="text-xs text-gray-500">PO: {batch.purchaseNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-sm">{batch.productName}</p>
                          {batch.productSku && (
                            <p className="text-xs text-gray-500">SKU: {batch.productSku}</p>
                          )}
                        </td>
                        <td className="p-3">
                          {batch.supplierName ? (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{batch.supplierName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <p className="text-sm font-medium">{formatCurrency(batch.costPrice)}</p>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="text-sm font-medium">
                              {batch.quantityRemaining.toFixed(1)} / {batch.quantityReceived.toFixed(1)} kg
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  getStockPercentage(batch) > 50
                                    ? 'bg-green-500'
                                    : getStockPercentage(batch) > 20
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${getStockPercentage(batch)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {getStockPercentage(batch).toFixed(0)}% remaining
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(batch)}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewBatchDetails(batch.id)}
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
          <Card className="max-w-7xl mx-auto">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No batches match your search criteria.' : 'No batches available. Receive inventory via Purchase Orders to create batches.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
