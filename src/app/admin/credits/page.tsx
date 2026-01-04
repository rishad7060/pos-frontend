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
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  History,
  Calendar,
  Receipt,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  creditBalance: number;
  totalPurchases: number;
  visitCount: number;
  createdAt: string;
}

interface CreditTransaction {
  id: number;
  customerId: number;
  orderId: number | null;
  transactionType: 'credit_added' | 'credit_used' | 'credit_refunded' | 'admin_adjustment';
  amount: number;
  balance: number;
  description: string | null;
  userId: number | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  order: {
    id: number;
    orderNumber: string;
    total: number;
  } | null;
}

interface CreditSummary {
  summary: {
    totalCreditsAdded: number;
    totalCreditsUsed: number;
    totalOutstanding: number;
    customersWithCredit: number;
  };
  creditsAdded: number;
  creditsUsed: number;
}

export default function CreditsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Credit Dialog
  const [addCreditDialogOpen, setAddCreditDialogOpen] = useState(false);
  const [addCreditForm, setAddCreditForm] = useState({
    customerId: '',
    amount: '',
    description: ''
  });

  // History Dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomersWithCredit();
    fetchCreditSummary();
  }, []);

  const fetchCustomersWithCredit = async () => {
    try {
      setLoading(true);
      console.log('Fetching customers with credit...');
      const response = await fetchWithAuth('/api/customer-credits/customers');

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch customers with credit: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      console.log('Is array:', Array.isArray(data));
      console.log('Data length:', data?.length);

      setCustomers(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        toast.success(`Loaded ${data.length} customers with credit`);
      }
    } catch (error: any) {
      console.error('Fetch customers error:', error);
      toast.error(`Failed to fetch customers: ${error.message}`);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditSummary = async () => {
    try {
      console.log('Fetching credit summary...');
      const response = await fetchWithAuth('/api/customer-credits/summary');

      console.log('Summary response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Summary API Error:', errorText);
        throw new Error(`Failed to fetch credit summary: ${response.status}`);
      }

      const data = await response.json();
      console.log('Summary data:', data);
      setCreditSummary(data);
    } catch (error: any) {
      console.error('Fetch summary error:', error);
      toast.error(`Failed to fetch summary: ${error.message}`);
    }
  };

  const fetchCreditHistory = async (customerId: number) => {
    try {
      const response = await fetchWithAuth(`/api/customer-credits?customerId=${customerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch credit history');
      }

      const data = await response.json();
      setCreditHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch history error:', error);
      toast.error('Failed to fetch credit history');
      setCreditHistory([]);
    }
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCreditHistory(customer.id);
    setHistoryDialogOpen(true);
  };

  const handleAddCredit = (customer?: Customer) => {
    if (customer) {
      setAddCreditForm({
        customerId: customer.id.toString(),
        amount: '',
        description: ''
      });
    } else {
      setAddCreditForm({
        customerId: '',
        amount: '',
        description: ''
      });
    }
    setAddCreditDialogOpen(true);
  };

  const handleSubmitAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(addCreditForm.amount);
    const customerId = parseInt(addCreditForm.customerId);

    if (!customerId || isNaN(customerId)) {
      toast.error('Please select a customer');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/customer-credits', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId,
          transactionType: 'admin_adjustment',
          amount: amount,
          description: addCreditForm.description || 'Admin adjustment - customer debt (old books)'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add credit');
      }

      toast.success(`Credit of ${formatCurrency(amount)} added successfully`);
      setAddCreditDialogOpen(false);
      setAddCreditForm({ customerId: '', amount: '', description: '' });

      // Refresh data
      await fetchCustomersWithCredit();
      await fetchCreditSummary();

      // If viewing history, refresh it
      if (selectedCustomer && selectedCustomer.id === customerId) {
        await fetchCreditHistory(customerId);
      }
    } catch (error: any) {
      console.error('Add credit error:', error);
      toast.error(error.message || 'Failed to add credit');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionTypeDetails = (type: string) => {
    switch (type) {
      case 'credit_added':
        return { label: 'Credit Added', color: 'bg-green-100 text-green-800', icon: TrendingUp };
      case 'credit_used':
        return { label: 'Credit Used', color: 'bg-blue-100 text-blue-800', icon: TrendingDown };
      case 'credit_refunded':
        return { label: 'Credit Refunded', color: 'bg-yellow-100 text-yellow-800', icon: Receipt };
      case 'admin_adjustment':
        return { label: 'Admin Adjustment (Debt)', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-800', icon: DollarSign };
    }
  };

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
              <h1 className="text-3xl font-bold">Customer Credit Management</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage customer credit balances (Liability Accounts)
              </p>
            </div>
          </div>
          <Button onClick={() => handleAddCredit()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credit
          </Button>
        </div>

        {/* Important Warning */}
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Important:</strong> Admin adjustments represent customer <strong>DEBTS</strong> (they owe you money from old books before POS).
            These are NOT counted in finance reports. Only POS credit sales (unpaid orders) are counted as revenue.
            Admin adjustments show on customer bills and add to their total amount due.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        {creditSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(creditSummary.summary.totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current liability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credits Added
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(creditSummary.summary.totalCreditsAdded)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {creditSummary.creditsAdded} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credits Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(creditSummary.summary.totalCreditsUsed)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {creditSummary.creditsUsed} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Customers with Credit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {creditSummary.summary.customersWithCredit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active credit accounts
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customers List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customers with Credit Balances</CardTitle>
                <CardDescription>
                  All customers who have outstanding credit (accounts receivable)
                </CardDescription>
              </div>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customers with credit balances found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg dark:hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.phone && <span>{customer.phone}</span>}
                          {customer.email && customer.phone && <span className="mx-2">•</span>}
                          {customer.email && <span>{customer.email}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-red-600">
                          {formatCurrency(customer.creditBalance)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.visitCount} visits • {formatCurrency(customer.totalPurchases)} spent
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(customer)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddCredit(customer)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Credit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Credit Dialog */}
        <Dialog open={addCreditDialogOpen} onOpenChange={setAddCreditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer Credit</DialogTitle>
              <DialogDescription>
                Add credit to a customer account. This increases your liability.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAddCredit} className="space-y-4">
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs">
                  <strong>Accounting Note:</strong> This creates a LIABILITY (money you owe).
                  It will NOT count as profit until the customer uses it in an order.
                </AlertDescription>
              </Alert>

              {!addCreditForm.customerId && (
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <select
                    id="customer"
                    className="w-full p-2 border rounded-md"
                    value={addCreditForm.customerId}
                    onChange={(e) => setAddCreditForm({ ...addCreditForm, customerId: e.target.value })}
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone || customer.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={addCreditForm.amount}
                  onChange={(e) => setAddCreditForm({ ...addCreditForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Reason for adding credit..."
                  value={addCreditForm.description}
                  onChange={(e) => setAddCreditForm({ ...addCreditForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddCreditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Credit
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Credit History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Credit History - {selectedCustomer?.name}
              </DialogTitle>
              <DialogDescription>
                Complete transaction history for this customer
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Balance</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(selectedCustomer.creditBalance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Purchases</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(selectedCustomer.totalPurchases)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {creditHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No credit history found</p>
                </div>
              ) : (
                creditHistory.map((transaction) => {
                  const typeDetails = getTransactionTypeDetails(transaction.transactionType);
                  const TypeIcon = typeDetails.icon;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className={`h-10 w-10 rounded-full ${typeDetails.color} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{typeDetails.label}</div>
                            {transaction.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {transaction.description}
                              </div>
                            )}
                            {transaction.order && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Order #{transaction.order.orderNumber} - {formatCurrency(transaction.order.total)}
                              </div>
                            )}
                            {transaction.user && (
                              <div className="text-xs text-muted-foreground mt-1">
                                By: {transaction.user.fullName}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`font-bold ${
                              transaction.transactionType === 'credit_added' || transaction.transactionType === 'credit_refunded'
                                ? 'text-green-600'
                                : 'text-blue-600'
                            }`}>
                              {transaction.transactionType === 'credit_added' || transaction.transactionType === 'credit_refunded' ? '+' : '-'}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(transaction.balance)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(transaction.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
