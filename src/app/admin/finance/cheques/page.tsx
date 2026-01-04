'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Eye,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format, parse } from 'date-fns';
import ChequeDetailsDialog from '@/components/admin/ChequeDetailsDialog';
import CreateChequeDialog from '@/components/admin/CreateChequeDialog';

interface Cheque {
  id: number;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  payerName: string;
  payeeName: string | null;
  bankName: string;
  branchName: string | null;
  status: string;
  transactionType: string;
  receivedDate: string | null;
  depositDate: string | null;
  clearanceDate: string | null;
  bounceDate: string | null;
  orderId: number | null;
  customerId: number | null;
  purchasePaymentId: number | null;
  supplierId: number | null;
  notes: string | null;
  bounceReason: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: number;
    orderNumber: string;
    total: number;
  } | null;
  customer: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  purchasePayment: {
    id: number;
    amount: number;
    paymentDate: string;
    purchase: {
      id: number;
      purchaseNumber: string;
      total: number;
    } | null;
  } | null;
  supplier: {
    id: number;
    name: string;
    contactPerson: string | null;
    phone: string | null;
  } | null;
  user: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  approver: {
    id: number;
    fullName: string;
    email: string;
  } | null;
}

interface ChequeStats {
  byStatus: {
    status: string;
    count: number;
    totalAmount: number;
  }[];
  byType: {
    type: string;
    count: number;
    totalAmount: number;
  }[];
}

export default function ChequesPage() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [stats, setStats] = useState<ChequeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCheques();
    fetchStats();
  }, [statusFilter, typeFilter, startDateFilter, endDateFilter]);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      const parseDmyToIso = (value: string): string | null => {
        try {
          const parsed = parse(value, 'dd/MM/yyyy', new Date());
          if (isNaN(parsed.getTime())) {
            return null;
          }
          return format(parsed, 'yyyy-MM-dd');
        } catch {
          return null;
        }
      };

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        params.append('transactionType', typeFilter);
      }

      if (startDateFilter) {
        const iso = parseDmyToIso(startDateFilter);
        if (iso) {
          params.append('startDate', iso);
        }
      }

      if (endDateFilter) {
        const iso = parseDmyToIso(endDateFilter);
        if (iso) {
          params.append('endDate', iso);
        }
      }

      params.append('limit', '100');

      const response = await fetchWithAuth(`/api/cheques?${params.toString()}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setCheques(Array.isArray(data) ? data : []);
      } else {
        console.error('Invalid cheques data:', data);
        setCheques([]);
      }
    } catch (error) {
      console.error('Failed to fetch cheques:', error);
      toast.error('Failed to fetch cheques');
      setCheques([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/cheques/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch cheque stats:', error);
    }
  };

  const handleViewDetails = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setDetailsDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    fetchCheques();
    fetchStats();
    setDetailsDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; icon: any }> = {
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      deposited: { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUp },
      cleared: { className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      bounced: { className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      cancelled: { className: 'bg-gray-100 text-gray-800 border-gray-200', icon: Ban },
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIndicator = (type: string) => {
    if (type === 'received') {
      return (
        <div className="flex items-center text-green-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Received</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Issued</span>
        </div>
      );
    }
  };

  const filteredCheques = cheques.filter((cheque) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cheque.chequeNumber.toLowerCase().includes(searchLower) ||
      cheque.payerName.toLowerCase().includes(searchLower) ||
      cheque.bankName.toLowerCase().includes(searchLower) ||
      (cheque.customer?.name || '').toLowerCase().includes(searchLower) ||
      (cheque.supplier?.name || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-4 text-gray-600">Loading cheques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cheque Management</h1>
          <p className="mt-2 text-gray-600">Track and manage received and issued cheques</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Cheque
        </Button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byStatus.map((item) => (
            <Card key={item.status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</p>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-sm text-gray-500">${item.totalAmount.toFixed(2)}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Text search */}
            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Search className="h-3 w-3" />
                <span>Search cheques</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by cheque no., payer, bank, customer, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={() => {
                    // Re-fetch with current filters in case server-side data changed
                    fetchCheques();
                    fetchStats();
                  }}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
              </div>
            </div>

            {/* Status filter */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-3 w-3" />
                <span>Status</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="deposited">Deposited</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type filter */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-3 w-3" />
                <span>Type</span>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="received">Received (from customers)</SelectItem>
                  <SelectItem value="issued">Issued (to suppliers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>Date range (cheque date)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-start md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setStartDateFilter('');
                  setEndDateFilter('');
                  fetchCheques();
                  fetchStats();
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cheques List */}
      <Card>
        <CardHeader>
          <CardTitle>Cheques ({filteredCheques.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCheques.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cheques found</p>
              <p className="text-sm mt-2">Cheques will appear here when customers pay by cheque or you issue cheques to suppliers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCheques.map((cheque) => (
                <div
                  key={cheque.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="font-mono font-bold text-lg">{cheque.chequeNumber}</span>
                        </div>
                        {getStatusBadge(cheque.status)}
                        {getTypeIndicator(cheque.transactionType)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-bold text-lg">${cheque.amount.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {format(new Date(cheque.chequeDate), 'MMM dd, yyyy')}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          {cheque.bankName}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{cheque.transactionType === 'received' ? 'From' : 'To'}:</span>
                          <span className="ml-1">{cheque.payerName}</span>
                        </div>

                        {cheque.customer && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Customer:</span>
                            <span className="ml-1">{cheque.customer.name}</span>
                          </div>
                        )}

                        {cheque.supplier && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Supplier:</span>
                            <span className="ml-1">{cheque.supplier.name}</span>
                          </div>
                        )}

                        {cheque.order && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Order:</span>
                            <span className="ml-1">{cheque.order.orderNumber}</span>
                          </div>
                        )}

                        {cheque.purchasePayment?.purchase && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Purchase:</span>
                            <span className="ml-1">{cheque.purchasePayment.purchase.purchaseNumber}</span>
                          </div>
                        )}
                      </div>

                      {cheque.notes && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {cheque.notes}
                        </div>
                      )}

                      {cheque.bounceReason && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border-l-2 border-red-400">
                          <span className="font-medium">Bounce Reason:</span> {cheque.bounceReason}
                        </div>
                      )}

                      {cheque.isEndorsed && (
                        <div className="mt-3 text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                          <div className="flex items-center text-blue-600">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            <span className="font-medium">Endorsed to:</span>
                            <span className="ml-1">{cheque.endorsedTo}</span>
                          </div>
                        </div>
                      )}

                      {cheque.depositReminderDate && cheque.status === 'pending' && (
                        <div className="mt-2 text-sm flex items-center text-orange-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Deposit by: {format(new Date(cheque.depositReminderDate), 'MMM dd, yyyy')}</span>
                          {new Date(cheque.depositReminderDate) <= new Date() && (
                            <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">Due!</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(cheque)}
                      className="ml-4"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedCheque && (
        <ChequeDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          cheque={selectedCheque}
          onUpdate={handleStatusUpdate}
        />
      )}

      {/* Create Cheque Dialog */}
      <CreateChequeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchCheques();
          fetchStats();
        }}
      />
    </div>
  );
}
