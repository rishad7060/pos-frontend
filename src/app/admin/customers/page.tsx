'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Search, Plus, User, Phone, Mail, MapPin, DollarSign, ShoppingBag, Edit2, Trash2, Eye, CreditCard, AlertTriangle, ShieldAlert, Filter, X } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CustomerListSkeleton } from '@/components/skeletons/CustomerCardSkeleton';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalPurchases: number;
  visitCount: number;
  createdAt: string;
}

interface CustomerWithCredit extends Customer {
  creditBalance?: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Filter states
  const [creditStatusFilter, setCreditStatusFilter] = useState<string>('all');
  const [visitCountFilter, setVisitCountFilter] = useState<string>('all');
  const [purchaseAmountFilter, setPurchaseAmountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('creditFirst');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Credit Adjustment State
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [creditForm, setCreditForm] = useState({
    amount: '',
    type: 'credit', // 'credit' (reduce debt) or 'debit' (increase debt)
    description: ''
  });

  // Delete Confirmation State
  const [deleteCustomerConfirmOpen, setDeleteCustomerConfirmOpen] = useState(false);
  const [forceDeleteConfirmOpen, setForceDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithCredit | null>(null);
  const [deleteErrorDetails, setDeleteErrorDetails] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // PERFORMANCE FIX: Backend now returns creditBalance directly in the response
      // Previously: Made 100+ additional API calls to fetch credit balance for each customer
      // Now: Single API call with all data included (100x faster!)
      // LIMIT FIX: Explicitly request 10,000 customers (default was 100)
      const response = await fetchWithAuth('/api/customers?limit=10000');

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();

      // Ensure data is an array before setting it
      if (Array.isArray(data)) {
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        console.error('Expected array but got:', data);
        setCustomers([]);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      setCustomers([]);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const url = editingCustomer
        ? `/api/customers?id=${editingCustomer.id}`
        : '/api/customers';

      const response = await fetchWithAuth(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error();

      toast.success(editingCustomer ? 'Customer updated' : 'Customer created');
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = (customer: CustomerWithCredit) => {
    setCustomerToDelete(customer);
    setDeleteCustomerConfirmOpen(true);
  };

  const confirmDeleteCustomer = async (forceDelete: boolean = false) => {
    if (!customerToDelete) return;

    let shouldShowForceDelete = false;

    try {
      const url = forceDelete
        ? `/api/customers?id=${customerToDelete.id}&force=true`
        : `/api/customers?id=${customerToDelete.id}`;

      const response = await fetchWithAuth(url, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if force delete is available (admin only)
        if (data.details && data.details.canForceDelete && !forceDelete) {
          // Save error details for the force delete dialog
          setDeleteErrorDetails(data);
          setDeleteCustomerConfirmOpen(false);
          shouldShowForceDelete = true;
          // Small delay for smooth transition
          setTimeout(() => {
            setForceDeleteConfirmOpen(true);
          }, 100);
          return;
        }

        // Show error toast for non-admin users or other errors
        toast.error(data.error || 'Cannot delete customer', {
          description: data.details?.suggestion ? `💡 ${data.details.suggestion}` : undefined,
          duration: 6000
        });

        setDeleteCustomerConfirmOpen(false);
        setCustomerToDelete(null);
        return;
      }

      // Success!
      if (forceDelete) {
        toast.success('Customer Force Deleted', {
          description: `${customerToDelete.name} was deleted. Action logged in audit trail.`,
          icon: '⚠️'
        });
      } else {
        toast.success('Customer Deleted', {
          description: `${customerToDelete.name} has been deleted successfully.`
        });
      }

      fetchCustomers();

      // Clean up state
      setDeleteCustomerConfirmOpen(false);
      setForceDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      setDeleteErrorDetails(null);

    } catch (err: any) {
      toast.error('Delete Failed', {
        description: err.message || 'An unexpected error occurred.',
        duration: 5000
      });

      // Only clean up if NOT showing force delete dialog
      if (!shouldShowForceDelete) {
        setDeleteCustomerConfirmOpen(false);
        setForceDeleteConfirmOpen(false);
        setCustomerToDelete(null);
        setDeleteErrorDetails(null);
      }
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
    setEditingCustomer(null);
  };

  // Credit Adjustment Functions
  const openCreditDialog = (customer: Customer) => {
    setCreditCustomer(customer);
    setCreditForm({
      amount: '',
      type: 'debit',
      description: ''
    });
    setCreditDialogOpen(true);
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creditCustomer) return;
    if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/customers/credit', {
        method: 'POST',
        body: JSON.stringify({
          customerId: creditCustomer.id,
          amount: parseFloat(creditForm.amount),
          type: creditForm.type,
          description: creditForm.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update credit');
      }

      toast.success('Credit adjusted successfully');
      setCreditDialogOpen(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update credit');
    }
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setCreditStatusFilter('all');
    setVisitCountFilter('all');
    setPurchaseAmountFilter('all');
    setSortBy('creditFirst');
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm !== '' || creditStatusFilter !== 'all' ||
    visitCountFilter !== 'all' || purchaseAmountFilter !== 'all' || sortBy !== 'creditFirst';

  const filteredCustomers = customers
    .filter(c => {
      // Search filter
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Credit status filter
      const matchesCreditStatus = creditStatusFilter === 'all' ||
        (creditStatusFilter === 'hasCredit' && (c.creditBalance || 0) > 0) ||
        (creditStatusFilter === 'noCredit' && (c.creditBalance || 0) <= 0);

      // Visit count filter
      const matchesVisitCount = visitCountFilter === 'all' ||
        (visitCountFilter === 'high' && c.visitCount >= 10) ||
        (visitCountFilter === 'medium' && c.visitCount >= 5 && c.visitCount < 10) ||
        (visitCountFilter === 'low' && c.visitCount >= 1 && c.visitCount < 5) ||
        (visitCountFilter === 'none' && c.visitCount === 0);

      // Purchase amount filter
      const matchesPurchaseAmount = purchaseAmountFilter === 'all' ||
        (purchaseAmountFilter === 'high' && c.totalPurchases >= 10000) ||
        (purchaseAmountFilter === 'medium' && c.totalPurchases >= 5000 && c.totalPurchases < 10000) ||
        (purchaseAmountFilter === 'low' && c.totalPurchases >= 1000 && c.totalPurchases < 5000) ||
        (purchaseAmountFilter === 'minimal' && c.totalPurchases < 1000);

      return matchesSearch && matchesCreditStatus && matchesVisitCount && matchesPurchaseAmount;
    });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'creditFirst':
        // Original behavior: credit balance first, then total purchases
        if ((b.creditBalance || 0) !== (a.creditBalance || 0)) {
          return (b.creditBalance || 0) - (a.creditBalance || 0);
        }
        return b.totalPurchases - a.totalPurchases;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'totalPurchases':
        return b.totalPurchases - a.totalPurchases;
      case 'visitCount':
        return b.visitCount - a.visitCount;
      case 'creditBalance':
        return (b.creditBalance || 0) - (a.creditBalance || 0);
      default:
        return 0;
    }
  });

  const customersWithPendingCredit = sortedCustomers.filter(c => (c.creditBalance || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <p className="text-sm text-muted-foreground">Manage customer database and credit accounts</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>
      {/* Pending Credits Alert */}
      {customersWithPendingCredit.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-200/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-900">
            <span className="font-medium">{customersWithPendingCredit.length} customer(s)</span> have pending credit balances totaling{' '}
            <span className="font-bold">
              {formatCurrency(customersWithPendingCredit.reduce((sum, c) => sum + toNumber(c.creditBalance || 0), 0))}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters:</span>
              </div>

              {/* Credit Status Filter */}
              <Select value={creditStatusFilter} onValueChange={setCreditStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Credit Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="hasCredit">Has Credit Due</SelectItem>
                  <SelectItem value="noCredit">No Credit</SelectItem>
                </SelectContent>
              </Select>

              {/* Visit Count Filter */}
              <Select value={visitCountFilter} onValueChange={setVisitCountFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Visit Count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visits</SelectItem>
                  <SelectItem value="high">High (10+)</SelectItem>
                  <SelectItem value="medium">Medium (5-9)</SelectItem>
                  <SelectItem value="low">Low (1-4)</SelectItem>
                  <SelectItem value="none">New (0)</SelectItem>
                </SelectContent>
              </Select>

              {/* Purchase Amount Filter */}
              <Select value={purchaseAmountFilter} onValueChange={setPurchaseAmountFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Purchase Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="high">High (10k+)</SelectItem>
                  <SelectItem value="medium">Medium (5k-10k)</SelectItem>
                  <SelectItem value="low">Low (1k-5k)</SelectItem>
                  <SelectItem value="minimal">Minimal (&lt;1k)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creditFirst">Credit First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="totalPurchases">Total Purchases</SelectItem>
                  <SelectItem value="visitCount">Visit Count</SelectItem>
                  <SelectItem value="creditBalance">Credit Balance</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {searchTerm}
                  </Badge>
                )}
                {creditStatusFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Credit: {creditStatusFilter === 'hasCredit' ? 'Has Credit Due' : 'No Credit'}
                  </Badge>
                )}
                {visitCountFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Visits: {visitCountFilter === 'high' ? 'High (10+)' :
                            visitCountFilter === 'medium' ? 'Medium (5-9)' :
                            visitCountFilter === 'low' ? 'Low (1-4)' : 'New (0)'}
                  </Badge>
                )}
                {purchaseAmountFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Amount: {purchaseAmountFilter === 'high' ? 'High (10k+)' :
                            purchaseAmountFilter === 'medium' ? 'Medium (5k-10k)' :
                            purchaseAmountFilter === 'low' ? 'Low (1k-5k)' : 'Minimal (<1k)'}
                  </Badge>
                )}
                {sortBy !== 'creditFirst' && (
                  <Badge variant="secondary" className="text-xs">
                    Sort: {sortBy === 'name' ? 'Name' :
                          sortBy === 'totalPurchases' ? 'Total Purchases' :
                          sortBy === 'visitCount' ? 'Visit Count' : 'Credit Balance'}
                  </Badge>
                )}
              </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{sortedCustomers.length}</span> of{' '}
              <span className="font-semibold text-foreground">{customers.length}</span> customers
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <CustomerListSkeleton count={9} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCustomers.map((customer) => (
            <Card
              key={customer.id}
              className={`hover:shadow-lg transition-shadow ${(customer.creditBalance || 0) > 0 ? 'border-l-4 border-l-red-500' : ''
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {customer.visitCount} visits
                        </Badge>
                        {(customer.creditBalance || 0) > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Credit Due
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCreditDialog(customer)}
                      title="Add Charge (Old Debt)"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(customer)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(customer)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Purchases</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(customer.totalPurchases)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {(customer.creditBalance || 0) > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      Total Credit
                    </span>
                    <span className={`font-bold ${(customer.creditBalance || 0) > 0 ? 'text-red-600' : 'text-primary'}`}>
                      {formatCurrency(customer.creditBalance || 0)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details && History
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No customers found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credit Adjustment Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Charge - {creditCustomer?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreditSubmit} className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                Use this to add old debts from before the POS system. For receiving payments, use the "Receive Payment" button on the customer detail page.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                placeholder="Reason for adding this charge (e.g., old books debt)..."
                value={creditForm.description}
                onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                Add Charge
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Regular Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteCustomerConfirmOpen}
        onOpenChange={setDeleteCustomerConfirmOpen}
        title="Delete Customer"
        description={
          <div>
            Are you sure you want to delete customer <strong>&quot;{customerToDelete?.name}&quot;</strong>?
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              This action cannot be undone.
            </span>
          </div>
        }
        confirmText="Delete"
        variant="danger"
        onConfirm={() => confirmDeleteCustomer(false)}
      />

      {/* Force Delete Confirmation Dialog (Admin Only) */}
      <ConfirmationDialog
        open={forceDeleteConfirmOpen}
        onOpenChange={(open) => {
          setForceDeleteConfirmOpen(open);
          if (!open) {
            // Clean up when dialog is closed/cancelled
            setCustomerToDelete(null);
            setDeleteErrorDetails(null);
          }
        }}
        title="Force Delete Customer"
        description={
          <div className="space-y-4 text-sm leading-relaxed">
            {/* Warning Section - Credit Balance or Recent Orders */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="font-semibold text-amber-900 dark:text-amber-300 mb-2">Cannot delete customer</p>

              {deleteErrorDetails?.details?.creditBalance !== undefined && deleteErrorDetails.details.creditBalance !== 0 && (
                <div className="space-y-1">
                  <p className="text-gray-900 dark:text-gray-300">
                    This customer has a pending{' '}
                    <strong className="text-amber-950 dark:text-amber-200">
                      {deleteErrorDetails.details.balanceType === 'debt' ? 'debt' : 'credit'}
                    </strong>
                    {' '}balance of{' '}
                    <strong className="text-amber-950 dark:text-amber-200">
                      {formatCurrency(deleteErrorDetails.details.absoluteBalance || Math.abs(deleteErrorDetails.details.creditBalance))}
                    </strong>
                  </p>
                </div>
              )}

              {deleteErrorDetails?.details?.recentOrdersCount > 0 && (
                <p className="text-gray-900 dark:text-gray-300 mt-2">
                  This customer has <strong>{deleteErrorDetails.details.recentOrdersCount}</strong> order(s) within the last 90 days.
                </p>
              )}
            </div>

            {/* Suggestion Section */}
            {deleteErrorDetails?.details?.suggestion && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">💡 Suggested action</p>
                <p className="text-gray-900 dark:text-gray-300">{deleteErrorDetails.details.suggestion}</p>
              </div>
            )}

            {/* Admin Override Section */}
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-300 mb-1">Admin Override</p>
                  <p className="text-gray-900 dark:text-gray-300 text-sm">
                    This action will permanently remove the customer
                    {deleteErrorDetails?.details?.creditBalance !== 0 && (
                      <span>
                        {' '}with a <strong>{deleteErrorDetails?.details?.balanceType}</strong> balance of{' '}
                        <strong>{formatCurrency(deleteErrorDetails?.details?.absoluteBalance || 0)}</strong>
                      </span>
                    )}
                    {' '}and bypass all safety checks. The deletion will be recorded in the audit log with the credit balance amount.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-900 font-medium dark:text-gray-300 pt-2">
              Do you want to proceed with force delete?
            </p>
          </div>
        }
        confirmText="Force Delete"
        variant="warning"
        onConfirm={() => confirmDeleteCustomer(true)}
      />
    </div>
  );
}