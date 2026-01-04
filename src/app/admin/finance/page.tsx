'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  FolderPlus,
  BarChart3,
  Receipt,
  ShoppingCart,
  CreditCard,
  Banknote,
  Calculator,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Users,
  Truck,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAuthUser } from '@/lib/auth';

interface FinancialSummary {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  financialMetrics: {
    totalRevenue: number;
    totalSales: number;
    totalIncome: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    netProfitWithOtherIncome?: number; // Added for corrected calculation
    profitMargin: number;
    expenseRatio: number;
    averageOrderValue: number;
  };
  salesBreakdown: {
    totalOrders: number;
    cashSales: number;
    cardSales: number;
    otherSales: number;
  };
  expenseBreakdown: {
    totalManualExpenses: number;
    totalManualIncome: number;
    totalCashOut: number;
    totalPurchases: number;
    operatingExpenses: number;
    cogs: number;
  };
  breakdowns: {
    transactionByCategory: Array<{
      categoryId: number;
      categoryName: string;
      totalIncome: number;
      totalExpenses: number;
      incomeCount: number;
      expenseCount: number;
      netAmount: number;
    }>;
    cashOutByReason: Array<{
      reason: string;
      totalAmount: number;
      count: number;
    }>;
    purchasesBySupplier: Array<{
      supplierId: number;
      supplierName: string;
      totalAmount: number;
      count: number;
    }>;
  };
  counts: {
    totalOrders: number;
    totalManualExpenses: number;
    totalCashOutTransactions: number;
    totalPurchases: number;
  };
}

interface Expense {
  id: number;
  categoryId: number;
  amount: number;
  description: string;
  expenseType: string;
  paymentMethod: string | null;
  expenseDate: string;
  notes: string | null;
  category?: { name: string };
}

interface CashTransaction {
  id: number;
  transactionType: string;
  amount: number;
  reason: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  cashierName: string;
}

interface Purchase {
  id: number;
  purchaseNumber: string;
  total: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  supplier?: { name: string };
}

interface Customer {
  id: number;
  fullName: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  creditBalance: number;
  lastOrderDate: string | null;
}

interface ExpenseCategory {
  id: number;
  name: string;
}

export default function FinancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    description: '',
    transactionType: 'expense',
    paymentMethod: 'cash',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    setUser(getAuthUser());
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);

    fetchCategories();
    fetchFinancialData(startStr, endStr);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchFinancialData(startDate, endDate);
    }
  }, [startDate, endDate]);

  const setQuickDate = (preset: string) => {
    const end = new Date();
    const start = new Date();

    switch(preset) {
      case 'today':
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
        end.setDate(0);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchFinancialData = async (start: string, end: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFinancialSummary(start, end),
        fetchExpenses(start, end),
        fetchCashTransactions(start, end),
        fetchPurchases(start, end),
        fetchCustomers()
      ]);
    } catch (error) {
      console.error('Failed to fetch financial data');
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialSummary = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/expenses/financial-summary?startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const summaryData = await response.json();
        setFinancialSummary(summaryData);
      }
    } catch (error) {
      console.error('Failed to fetch financial summary');
    }
  };

  const fetchExpenses = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/expenses?limit=200&startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch expenses');
      setExpenses([]);
    }
  };

  const fetchCashTransactions = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/cash-transactions?registrySessionId=all&startDate=${start}&endDate=${end}&limit=200`);
      if (response.ok) {
        setCashTransactions(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch cash transactions');
    }
  };

  const fetchPurchases = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/purchases?limit=200&startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const data = await response.json();
        setPurchases(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch purchases');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?');
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          isActive: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }

      const newCategory = await response.json();
      setCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, categoryId: newCategory.id.toString() }));
      setCategoryDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      toast.success('Category created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.amount || !formData.description || !formData.transactionType) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          categoryId: parseInt(formData.categoryId),
          amount: parseFloat(formData.amount),
          expenseType: formData.transactionType === 'expense' ? 'cash_out' :
            formData.transactionType === 'income' ? 'cash_in' : 'petty_cash'
        })
      });

      if (!response.ok) throw new Error();

      toast.success('Transaction recorded successfully');
      setDialogOpen(false);
      resetForm();
      fetchFinancialData(startDate, endDate);
    } catch (error) {
      toast.error('Failed to record transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      amount: '',
      description: '',
      transactionType: 'expense',
      paymentMethod: 'cash',
      expenseDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return `LKR ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate additional financial metrics
  const calculateAccountsReceivable = () => {
    if (!customers || customers.length === 0) return 0;
    return customers.reduce((sum, c) => sum + (c?.creditBalance || 0), 0);
  };

  const calculateAccountsPayable = () => {
    if (!purchases || purchases.length === 0) return 0;
    return purchases
      .filter(p => p?.paymentStatus === 'partial' || p?.paymentStatus === 'pending')
      .reduce((sum, p) => sum + ((p?.total || 0) - (p?.paidAmount || 0)), 0);
  };

  const exportToPDF = () => {
    toast.info('PDF export feature coming soon!');
  };

  if (loading && !financialSummary) {
    return (
      <AuthGuard allowedRoles={['admin', 'manager']}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading financial data...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const accountsReceivable = calculateAccountsReceivable();
  const accountsPayable = calculateAccountsPayable();

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Finance && Accounting</h1>
                <p className="text-gray-600 mt-1">Complete financial overview and accounts management</p>
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

        {/* Quick Actions */}
        <div className="max-w-7xl mx-auto mb-6 flex gap-2 flex-wrap">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Record Transaction
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Date Range Filter with Quick Presets */}
        <Card className="max-w-7xl mx-auto mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDate('today')}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate('yesterday')}>Yesterday</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate('last7')}>Last 7 Days</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate('last30')}>Last 30 Days</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate('thisMonth')}>This Month</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate('lastMonth')}>Last Month</Button>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => fetchFinancialData(startDate, endDate)}>
                  <Search className="h-4 w-4 mr-2" />
                  Update Report
                </Button>
              </div>
              {financialSummary && (
                <div className="text-sm text-muted-foreground">
                  Showing data from {formatDate(financialSummary.dateRange.startDate)} to {formatDate(financialSummary.dateRange.endDate)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {financialSummary ? (
          <>
            {/* Accounting Accuracy Notice */}
            {(financialSummary?.financialMetrics?.totalIncome || 0) > 0 && (
              <Alert className="max-w-7xl mx-auto mb-6 border-amber-300 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <strong>Important:</strong> "Other Income" ({formatCurrency(financialSummary?.financialMetrics?.totalIncome)}) is shown separately and NOT included in revenue.
                  If this includes customer credit additions, they are liabilities (money you owe) and only count as revenue when customers USE the credit in orders.
                  For 100% accurate accounting, customer credits should be managed separately. See <strong>ACCOUNTING_FIX_PLAN.md</strong> for details.
                </AlertDescription>
              </Alert>
            )}

            {/* Key Financial Summary Cards */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialSummary?.financialMetrics?.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {financialSummary?.salesBreakdown?.totalOrders || 0} orders
                      </p>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(financialSummary?.financialMetrics?.totalExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All costs included
                      </p>
                    </div>
                    <ArrowDownRight className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className={`text-2xl font-bold ${(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(financialSummary?.financialMetrics?.netProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(financialSummary?.financialMetrics?.profitMargin || 0).toFixed(1)}% margin
                      </p>
                    </div>
                    {(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? (
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Profit</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(financialSummary?.financialMetrics?.grossProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Before operating costs
                      </p>
                    </div>
                    <Calculator className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accounts Summary */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Accounts Receivable</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(accountsReceivable)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customer credits to collect
                      </p>
                    </div>
                    <Users className="h-7 w-7 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Accounts Payable</p>
                      <p className="text-xl font-bold text-rose-600">
                        {formatCurrency(accountsPayable)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Owed to suppliers
                      </p>
                    </div>
                    <Truck className="h-7 w-7 text-rose-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cash Position</p>
                      <p className="text-xl font-bold text-cyan-600">
                        {formatCurrency((financialSummary?.financialMetrics?.netProfit || 0) - accountsPayable + accountsReceivable)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Net cash available
                      </p>
                    </div>
                    <Wallet className="h-7 w-7 text-cyan-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profit && Loss Statement and Detailed Tabs */}
            <Tabs defaultValue="profit-loss" className="max-w-7xl mx-auto space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
                <TabsTrigger value="profit-loss">P&L Statement</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="purchases">Purchases</TabsTrigger>
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
              </TabsList>

              {/* Profit && Loss Statement */}
              <TabsContent value="profit-loss">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Profit && Loss Statement
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Period: {formatDate(financialSummary?.dateRange?.startDate || new Date().toISOString())} to {formatDate(financialSummary?.dateRange?.endDate || new Date().toISOString())}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Revenue Section */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Revenue
                      </h3>
                      <div className="pl-7 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sales Revenue</span>
                          <span className="font-medium">{formatCurrency(financialSummary?.financialMetrics?.totalSales)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Other Income</span>
                          <span className="font-medium">{formatCurrency(financialSummary?.financialMetrics?.totalIncome)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                          <span>Total Revenue</span>
                          <span className="text-green-600">{formatCurrency(financialSummary?.financialMetrics?.totalRevenue)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost of Goods Sold */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-indigo-600" />
                        Cost of Goods Sold (COGS)
                      </h3>
                      <div className="pl-7 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Inventory Costs</span>
                          <span className="font-medium">{formatCurrency(financialSummary?.expenseBreakdown?.cogs)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                          <span>Total COGS</span>
                          <span className="text-indigo-600">{formatCurrency(financialSummary?.expenseBreakdown?.cogs)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Gross Profit</span>
                        <span className="font-bold text-xl text-purple-600">
                          {formatCurrency(financialSummary?.financialMetrics?.grossProfit)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Revenue - COGS = Gross Profit
                      </p>
                    </div>

                    {/* Operating Expenses */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-red-600" />
                        Operating Expenses
                      </h3>
                      <div className="pl-7 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Manual Expenses</span>
                          <span className="font-medium">{formatCurrency(financialSummary?.expenseBreakdown?.totalManualExpenses)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cash Out Transactions</span>
                          <span className="font-medium">{formatCurrency(financialSummary?.expenseBreakdown?.totalCashOut)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                          <span>Total Operating Expenses</span>
                          <span className="text-red-600">{formatCurrency(financialSummary?.expenseBreakdown?.operatingExpenses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className={`${(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 rounded-lg border-2 ${(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-xl">Net Profit (from Sales)</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Revenue - COGS - Operating Expenses
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold text-2xl ${(financialSummary?.financialMetrics?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(financialSummary?.financialMetrics?.netProfit)}
                          </span>
                          <p className="text-sm font-semibold mt-1">
                            {(financialSummary?.financialMetrics?.profitMargin || 0).toFixed(2)}% Margin
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Other Income (Separate) */}
                    {(financialSummary?.financialMetrics?.totalIncome || 0) > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-cyan-600" />
                          Other Income (Non-Sales)
                        </h3>
                        <div className="pl-7 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Manual Income Entries</span>
                            <span className="font-medium">{formatCurrency(financialSummary?.financialMetrics?.totalIncome)}</span>
                          </div>
                          <Alert className="border-amber-300 bg-amber-50">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-xs">
                              ⚠️ This is NOT counted in revenue. If this includes customer credits, they are liabilities until used in orders.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}

                    {/* Net Profit with Other Income (if applicable) */}
                    {(financialSummary?.financialMetrics?.totalIncome || 0) > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-300">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg">Net Profit + Other Income</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Including non-sales income (use with caution)
                            </p>
                          </div>
                          <span className="font-bold text-xl text-blue-600">
                            {formatCurrency(financialSummary?.financialMetrics?.netProfitWithOtherIncome || (financialSummary?.financialMetrics?.netProfit || 0) + (financialSummary?.financialMetrics?.totalIncome || 0))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Key Ratios */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Profit Margin</p>
                        <p className="text-lg font-bold text-blue-600">{(financialSummary?.financialMetrics?.profitMargin || 0).toFixed(2)}%</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Expense Ratio</p>
                        <p className="text-lg font-bold text-amber-600">{(financialSummary?.financialMetrics?.expenseRatio || 0).toFixed(2)}%</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Avg Order Value</p>
                        <p className="text-lg font-bold text-purple-600">{formatCurrency(financialSummary?.financialMetrics?.averageOrderValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Accounts Tab */}
              <TabsContent value="accounts" className="space-y-6">
                {/* Accounts Receivable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      Accounts Receivable - Customer Credits
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total outstanding: {formatCurrency(accountsReceivable)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customers
                        .filter(c => c.creditBalance > 0)
                        .sort((a, b) => b.creditBalance - a.creditBalance)
                        .map((customer) => (
                          <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                              <p className="font-medium">{customer.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.phone || 'No phone'} • {customer.totalOrders} orders • Total spent: {formatCurrency(customer.totalSpent)}
                              </p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              {formatCurrency(customer.creditBalance)}
                            </Badge>
                          </div>
                        ))}
                      {customers.filter(c => c.creditBalance > 0).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No customer credits outstanding</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Accounts Payable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-rose-600" />
                      Accounts Payable - Supplier Payments Due
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total owed: {formatCurrency(accountsPayable)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {purchases
                        .filter(p => p.paymentStatus === 'partial' || p.paymentStatus === 'pending')
                        .sort((a, b) => (b.total - (b.paidAmount || 0)) - (a.total - (a.paidAmount || 0)))
                        .map((purchase) => {
                          const amountDue = purchase.total - (purchase.paidAmount || 0);
                          return (
                            <div key={purchase.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                              <div>
                                <p className="font-medium">{purchase.purchaseNumber}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{purchase.supplier?.name || 'Unknown'}</Badge>
                                  <Badge className={purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                    {purchase.paymentStatus}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(purchase.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Total: {formatCurrency(purchase.total)} • Paid: {formatCurrency(purchase.paidAmount || 0)}
                                </p>
                              </div>
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                                Due: {formatCurrency(amountDue)}
                              </Badge>
                            </div>
                          );
                        })}
                      {purchases.filter(p => p.paymentStatus === 'partial' || p.paymentStatus === 'pending').length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No outstanding supplier payments</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Revenue Breakdown Tab */}
              <TabsContent value="revenue">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Revenue Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Banknote className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Cash Sales</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(financialSummary?.salesBreakdown?.cashSales)}</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Card Sales</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(financialSummary?.salesBreakdown?.cardSales)}</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Receipt className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Other Sales</p>
                        <p className="text-xl font-bold text-purple-600">{formatCurrency(financialSummary?.salesBreakdown?.otherSales)}</p>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Total Orders:</strong> {financialSummary?.salesBreakdown?.totalOrders || 0} •
                        <strong> Average Order Value:</strong> {formatCurrency(financialSummary?.financialMetrics?.averageOrderValue)}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(financialSummary?.breakdowns?.transactionByCategory || []).map((category) => (
                        <div key={category.categoryId} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{category.categoryName}</p>
                            <p className={`font-semibold ${(category.netAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(category.netAmount || 0) >= 0 ? '+' : ''}{formatCurrency(category.netAmount)}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-green-600">
                              <p>Income: +{formatCurrency(category.totalIncome)}</p>
                              <p className="text-muted-foreground">{category.incomeCount || 0} transactions</p>
                            </div>
                            <div className="text-red-600">
                              <p>Expenses: -{formatCurrency(category.totalExpenses)}</p>
                              <p className="text-muted-foreground">{category.expenseCount || 0} transactions</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {expenses.map((expense) => {
                        const isIncome = expense.expenseType === 'cash_in';
                        return (
                          <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={
                                  expense.expenseType === 'cash_in' ? "bg-emerald-100 text-emerald-800" :
                                    expense.expenseType === 'cash_out' ? "bg-red-100 text-red-800" :
                                      "bg-blue-100 text-blue-800"
                                }>
                                  {expense.expenseType === 'cash_in' ? 'Income' : expense.expenseType === 'cash_out' ? 'Expense' : 'Petty Cash'}
                                </Badge>
                                <Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(expense.expenseDate)}
                                </span>
                              </div>
                            </div>
                            <p className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncome ? '+' : '-'}{formatCurrency(expense.amount)}
                            </p>
                          </div>
                        );
                      })}
                      {expenses.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No transactions in this period</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Purchases by Supplier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(financialSummary?.breakdowns?.purchasesBySupplier || []).map((supplier) => (
                        <div key={supplier.supplierId} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{supplier.supplierName}</p>
                            <p className="text-sm text-muted-foreground">{supplier.count || 0} purchase orders</p>
                          </div>
                          <p className="font-semibold text-indigo-600">{formatCurrency(supplier.totalAmount)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Purchase Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {purchases.map((purchase) => (
                        <div key={purchase.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{purchase.purchaseNumber}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{purchase.supplier?.name || 'Unknown'}</Badge>
                              <Badge className={
                                purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                              }>
                                {purchase.status}
                              </Badge>
                              <Badge className={
                                purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                  purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                              }>
                                {purchase.paymentStatus}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(purchase.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Paid: {formatCurrency(purchase.paidAmount || 0)} / {formatCurrency(purchase.total)}
                            </p>
                          </div>
                          <p className="font-semibold text-indigo-600">{formatCurrency(purchase.total)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cash Flow Tab */}
              <TabsContent value="cashflow" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cash Out by Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(financialSummary?.breakdowns?.cashOutByReason || []).map((reason) => (
                        <div key={reason.reason} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{reason.reason}</p>
                            <p className="text-sm text-muted-foreground">{reason.count || 0} transactions</p>
                          </div>
                          <p className="font-semibold text-orange-600">{formatCurrency(reason.totalAmount)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cash Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {cashTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.reason}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={transaction.transactionType === 'cash_in'
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"}>
                                {transaction.transactionType === 'cash_in' ? 'Cash In' : 'Cash Out'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {transaction.cashierName} • {formatDate(transaction.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className={`font-semibold ${transaction.transactionType === 'cash_in' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transactionType === 'cash_in' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="max-w-7xl mx-auto">
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No financial data available for the selected period</p>
            </CardContent>
          </Card>
        )}

        {/* Record Transaction Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Financial Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setCategoryDialogOpen(true)}
                      title="Add new category"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense (Money Out)</SelectItem>
                      <SelectItem value="income">Income (Money In)</SelectItem>
                      <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Record Transaction</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Office Supplies, Utilities, Rent"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateCategory}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={creatingCategory}
                >
                  {creatingCategory ? 'Creating...' : 'Create Category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCategoryDialogOpen(false);
                    setNewCategoryName('');
                    setNewCategoryDescription('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
