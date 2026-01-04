'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Search,
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Eye,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Cheque {
  id: number;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  payerName: string;
  payeeName: string | null;
  bankName: string;
  branchName: string | null;
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';
  transactionType: 'received' | 'issued';
  receivedDate: string | null;
  depositDate: string | null;
  clearanceDate: string | null;
  bounceDate: string | null;
  notes: string | null;
  orderId: number | null;
  customerId: number | null;
  purchasePaymentId: number | null;
  supplierId: number | null;
  isEndorsed: boolean;
  endorsedTo: string | null;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  supplier: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  order: {
    id: number;
    orderNumber: string;
    total: number;
  } | null;
  user: {
    id: number;
    fullName: string;
    email: string;
  } | null;
}

interface ChequeStats {
  byStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    totalAmount: number;
  }>;
}

export default function ChequesPage() {
  const router = useRouter();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [stats, setStats] = useState<ChequeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Create/Update Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [formData, setFormData] = useState({
    chequeNumber: '',
    chequeDate: new Date().toISOString().split('T')[0],
    amount: '',
    payerName: '',
    payeeName: '',
    bankName: '',
    branchName: '',
    transactionType: 'received' as 'received' | 'issued',
    notes: ''
  });

  // Status Update Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'pending' as string,
    notes: '',
    bounceReason: ''
  });

  useEffect(() => {
    fetchCheques();
    fetchStats();
  }, []);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/cheques?limit=200');

      if (!response.ok) {
        throw new Error('Failed to fetch cheques');
      }

      const data = await response.json();
      setCheques(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch cheques error:', error);
      toast.error('Failed to fetch cheques');
      setCheques([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/cheques/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Fetch stats error:', error);
      toast.error('Failed to fetch cheque statistics');
    }
  };

  const handleCreateCheque = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/cheques', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create cheque');
      }

      toast.success('Cheque created successfully');
      setDialogOpen(false);
      resetForm();
      await fetchCheques();
      await fetchStats();
    } catch (error: any) {
      console.error('Create cheque error:', error);
      toast.error(error.message || 'Failed to create cheque');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCheque) return;

    try {
      const response = await fetchWithAuth(`/api/cheques/${selectedCheque.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusForm.status,
          notes: statusForm.notes || undefined,
          bounceReason: statusForm.bounceReason || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      toast.success(`Cheque status updated to ${statusForm.status}`);
      setStatusDialogOpen(false);
      setSelectedCheque(null);
      setStatusForm({ status: 'pending', notes: '', bounceReason: '' });
      await fetchCheques();
      await fetchStats();
    } catch (error: any) {
      console.error('Update status error:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleOpenStatusDialog = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setStatusForm({
      status: cheque.status,
      notes: cheque.notes || '',
      bounceReason: ''
    });
    setStatusDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      chequeNumber: '',
      chequeDate: new Date().toISOString().split('T')[0],
      amount: '',
      payerName: '',
      payeeName: '',
      bankName: '',
      branchName: '',
      transactionType: 'received',
      notes: ''
    });
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock };
      case 'deposited':
        return { label: 'Deposited', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: TrendingUp };
      case 'cleared':
        return { label: 'Cleared', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 };
      case 'bounced':
        return { label: 'Bounced', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Ban };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-300', icon: FileText };
    }
  };

  const filteredCheques = cheques.filter(cheque => {
    const matchesSearch =
      cheque.chequeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || cheque.status === statusFilter;
    const matchesType = typeFilter === 'all' || cheque.transactionType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Cheque Management</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage cheque status for accurate accounting
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Cheque
          </Button>
        </div>

        {/* Important Warning */}
        <Alert className="border-blue-300 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>Accounting Accuracy:</strong> Only <strong>CLEARED</strong> cheques count in revenue.
            Pending cheques are tracked separately until cleared. Update status when cheques clear or bounce.
          </AlertDescription>
        </Alert>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.byStatus.map((stat) => {
              const statusDetails = getStatusDetails(stat.status);
              const StatusIcon = statusDetails.icon;

              return (
                <Card key={stat.status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      {statusDetails.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stat.totalAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.count} cheque{stat.count !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by cheque number, payer, bank, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deposited">Deposited</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="received">Received (From Customers)</SelectItem>
                    <SelectItem value="issued">Issued (To Suppliers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cheques List */}
        <Card>
          <CardHeader>
            <CardTitle>Cheques ({filteredCheques.length})</CardTitle>
            <CardDescription>
              All cheque transactions with status tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading cheques...
              </div>
            ) : filteredCheques.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cheques found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCheques.map((cheque) => {
                  const statusDetails = getStatusDetails(cheque.status);
                  const StatusIcon = statusDetails.icon;
                  const isReceived = cheque.transactionType === 'received';

                  return (
                    <div
                      key={cheque.id}
                      className="flex items-start gap-4 p-4 border rounded-lg dark:hover:bg-gray-100 transition-colors"
                    >
                      <div className={`h-12 w-12 rounded-lg ${statusDetails.color} flex items-center justify-center flex-shrink-0 border`}>
                        <StatusIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-bold">Cheque #{cheque.chequeNumber}</div>
                              <Badge variant={isReceived ? 'default' : 'secondary'}>
                                {isReceived ? 'Received' : 'Issued'}
                              </Badge>
                              {cheque.isEndorsed && (
                                <Badge variant="outline">Endorsed</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {cheque.bankName}
                                  {cheque.branchName && ` - ${cheque.branchName}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(cheque.chequeDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm mt-2">
                              <div>
                                {isReceived ? 'From' : 'To'}: <strong>{cheque.payerName}</strong>
                              </div>
                              {cheque.customer && (
                                <div className="text-xs text-muted-foreground">
                                  Customer: {cheque.customer.name}
                                </div>
                              )}
                              {cheque.supplier && (
                                <div className="text-xs text-muted-foreground">
                                  Supplier: {cheque.supplier.name}
                                </div>
                              )}
                              {cheque.order && (
                                <div className="text-xs text-muted-foreground">
                                  Order: #{cheque.order.orderNumber}
                                </div>
                              )}
                            </div>
                            {cheque.notes && (
                              <div className="text-xs text-muted-foreground mt-2 dark:bg-gray-100 p-2 rounded">
                                {cheque.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold">
                              {formatCurrency(cheque.amount)}
                            </div>
                            <Badge className={`mt-2 ${statusDetails.color}`}>
                              {statusDetails.label}
                            </Badge>
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusDialog(cheque)}
                                disabled={cheque.status === 'cancelled' || cheque.status === 'cleared'}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Update Status
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Cheque Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record New Cheque</DialogTitle>
              <DialogDescription>
                Record a cheque received from customer or issued to supplier
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCheque} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaction Type *</Label>
                  <Select
                    value={formData.transactionType}
                    onValueChange={(value: 'received' | 'issued') =>
                      setFormData({ ...formData, transactionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received (From Customer)</SelectItem>
                      <SelectItem value="issued">Issued (To Supplier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">Cheque Number *</Label>
                  <Input
                    id="chequeNumber"
                    value={formData.chequeNumber}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeDate">Cheque Date *</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerName">
                    {formData.transactionType === 'received' ? 'Payer Name (Customer) *' : 'Payee Name (Supplier) *'}
                  </Label>
                  <Input
                    id="payerName"
                    value={formData.payerName}
                    onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="branchName">Branch Name (Optional)</Label>
                  <Input
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <Alert className="border-blue-300 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  Cheque will be created with <strong>PENDING</strong> status. Update status to CLEARED
                  once the cheque clears for it to count in revenue.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Cheque</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Cheque Status</DialogTitle>
              <DialogDescription>
                Change the status of cheque #{selectedCheque?.chequeNumber}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">New Status *</Label>
                <Select
                  value={statusForm.status}
                  onValueChange={(value) => setStatusForm({ ...statusForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deposited">Deposited</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusForm.status === 'bounced' && (
                <div className="space-y-2">
                  <Label htmlFor="bounceReason">Bounce Reason</Label>
                  <Textarea
                    id="bounceReason"
                    value={statusForm.bounceReason}
                    onChange={(e) => setStatusForm({ ...statusForm, bounceReason: e.target.value })}
                    placeholder="Reason for cheque bounce..."
                    rows={2}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="statusNotes">Notes (Optional)</Label>
                <Textarea
                  id="statusNotes"
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              {statusForm.status === 'cleared' && selectedCheque?.transactionType === 'received' && (
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs">
                    <strong>Accounting Impact:</strong> This cheque will now count in revenue
                    ({formatCurrency(selectedCheque.amount)})
                  </AlertDescription>
                </Alert>
              )}

              {statusForm.status === 'bounced' && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-xs">
                    <strong>Bad Debt:</strong> Bounced cheque will be tracked separately
                    and NOT counted in revenue.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Status</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
