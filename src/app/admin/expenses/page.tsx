'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  PieChart,
  Receipt,
  ShoppingCart,
  CreditCard,
  Banknote,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
  status: string;
  createdAt: string;
  supplier?: { name: string };
}

interface ExpenseCategory {
  id: number;
  name: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
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
    transactionType: 'expense', // Changed from expenseType
    paymentMethod: 'cash',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Initialize dates on mount (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);

    // Fetch initial data
    fetchCategories();
    fetchFinancialData(startStr, endStr);
  }, []);

  // Fetch when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchFinancialData(startDate, endDate);
    }
  }, [startDate, endDate]);

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
      // Fetch financial summary
      const summaryResponse = await fetch(`/api/expenses/financial-summary?startDate=${start}&endDate=${end}`);
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setFinancialSummary(summaryData);
      }

      // Fetch detailed data for breakdowns
      await Promise.all([
        fetchExpenses(start, end),
        fetchCashTransactions(start, end),
        fetchPurchases(start, end)
      ]);
    } catch (error) {
      console.error('Failed to fetch financial data');
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/expenses?limit=10000&startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setExpenses(Array.isArray(data) ? data : []);
        } else {
          console.error('Expected expenses array but got:', data);
          setExpenses([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch expenses');
      setExpenses([]);
    }
  };

  const fetchCashTransactions = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/cash-transactions?registrySessionId=all&startDate=${start}&endDate=${end}&limit=10000`);
      if (response.ok) {
        setCashTransactions(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch cash transactions');
    }
  };

  const fetchPurchases = async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/purchases?limit=10000&startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const purchasesData = await response.json();
        setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      }
    } catch (error) {
      console.error('Failed to fetch purchases');
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

      toast.success('Expense recorded successfully');
      setDialogOpen(false);
      resetForm();
      fetchFinancialData(startDate, endDate);
    } catch (error) {
      toast.error('Failed to record expense');
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

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Financial Dashboard</h1>
            <p className="text-sm text-muted-foreground">Complete business financial overview</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Record Expense
        </Button>
      </div>
      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
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
            <Button
              variant="outline"
              onClick={() => fetchFinancialData(startDate, endDate)}
            >
              <Search className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
          {financialSummary && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing data from {financialSummary.dateRange.startDate} to {financialSummary.dateRange.endDate}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading financial data...</p>
        </div>
      ) : financialSummary ? (
        <>
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialSummary.financialMetrics.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sales + Income
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialSummary.financialMetrics.totalSales)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {financialSummary.salesBreakdown.totalOrders} orders
                    </p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Other Income</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {formatCurrency(financialSummary.financialMetrics.totalIncome)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manual income entries
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-cyan-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialSummary.financialMetrics.totalExpenses)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Operating: {formatCurrency(financialSummary.expenseBreakdown.operatingExpenses)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${financialSummary.financialMetrics.netProfit >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold ${financialSummary.financialMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialSummary.financialMetrics.netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {financialSummary.financialMetrics.profitMargin.toFixed(1)}% margin
                    </p>
                  </div>
                  {financialSummary.financialMetrics.netProfit >= 0 ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialSummary.financialMetrics.grossProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      COGS: {formatCurrency(financialSummary.expenseBreakdown.cogs)}
                    </p>
                  </div>
                  <Calculator className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdowns */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Sales Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sales Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Banknote className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cash Sales</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(financialSummary.salesBreakdown.cashSales)}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Card Sales</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(financialSummary.salesBreakdown.cardSales)}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Receipt className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Other Sales</p>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(financialSummary.salesBreakdown.otherSales)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Manual Income</p>
                      <p className="text-xl font-bold text-green-600">+{formatCurrency(financialSummary.expenseBreakdown.totalManualIncome)}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Receipt className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Manual Expenses</p>
                      <p className="text-xl font-bold text-red-600">-{formatCurrency(financialSummary.expenseBreakdown.totalManualExpenses)}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cash Out</p>
                      <p className="text-xl font-bold text-orange-600">-{formatCurrency(financialSummary.expenseBreakdown.totalCashOut)}</p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <ShoppingCart className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Purchases (COGS)</p>
                      <p className="text-xl font-bold text-indigo-600">-{formatCurrency(financialSummary.expenseBreakdown.totalPurchases)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              {/* Transaction Categories Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialSummary.breakdowns.transactionByCategory.map((category) => (
                      <div key={category.categoryId} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium">{category.categoryName}</p>
                          <p className={`font-semibold ${category.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {category.netAmount >= 0 ? '+' : ''}{formatCurrency(category.netAmount)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-green-600">
                            <p>Income: +{formatCurrency(category.totalIncome)}</p>
                            <p className="text-muted-foreground">{category.incomeCount} transactions</p>
                          </div>
                          <div className="text-red-600">
                            <p>Expenses: -{formatCurrency(category.totalExpenses)}</p>
                            <p className="text-muted-foreground">{category.expenseCount} transactions</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {financialSummary.breakdowns.transactionByCategory.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No transactions in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Manual Transactions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Manual Transactions</CardTitle>
                  <p className="text-sm text-muted-foreground">Income and expense transactions recorded manually</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.map((expense) => {
                      const isIncome = expense.expenseType === 'cash_in';
                      const isExpense = expense.expenseType === 'cash_out' || expense.expenseType === 'petty_cash';
                      const amountColor = isIncome ? 'text-green-600' : 'text-red-600';
                      const amountPrefix = isIncome ? '+' : '-';
                      const typeLabel = expense.expenseType === 'cash_in' ? 'Income' :
                        expense.expenseType === 'cash_out' ? 'Expense' : 'Petty Cash';
                      const typeColor = expense.expenseType === 'cash_in' ? 'default' :
                        expense.expenseType === 'cash_out' ? 'destructive' : 'secondary';

                      return (
                        <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={
                                expense.expenseType === 'cash_in' ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200" :
                                  expense.expenseType === 'cash_out' ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" :
                                    "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                              }>{typeLabel}</Badge>
                              <Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(expense.expenseDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p className={`font-semibold ${amountColor}`}>
                            {amountPrefix}{formatCurrency(expense.amount)}
                          </p>
                        </div>
                      );
                    })}
                    {expenses.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No manual transactions in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchases" className="space-y-6">
              {/* Purchases by Supplier */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchases by Supplier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialSummary.breakdowns.purchasesBySupplier.map((supplier) => (
                      <div key={supplier.supplierId} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{supplier.supplierName}</p>
                          <p className="text-sm text-muted-foreground">{supplier.count} orders</p>
                        </div>
                        <p className="font-semibold text-indigo-600">{formatCurrency(supplier.totalAmount)}</p>
                      </div>
                    ))}
                    {financialSummary.breakdowns.purchasesBySupplier.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No purchases in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Orders List */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{purchase.purchaseNumber}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{purchase.supplier?.name || 'Unknown Supplier'}</Badge>
                            <Badge className={purchase.status === 'completed'
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                              : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}>
                              {purchase.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="font-semibold text-indigo-600">{formatCurrency(purchase.total)}</p>
                      </div>
                    ))}
                    {purchases.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No purchase orders in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cashflow" className="space-y-6">
              {/* Cash Out by Reason */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Out by Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialSummary.breakdowns.cashOutByReason.map((reason) => (
                      <div key={reason.reason} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{reason.reason}</p>
                          <p className="text-sm text-muted-foreground">{reason.count} transactions</p>
                        </div>
                        <p className="font-semibold text-orange-600">{formatCurrency(reason.totalAmount)}</p>
                      </div>
                    ))}
                    {financialSummary.breakdowns.cashOutByReason.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No cash out transactions in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cash Transactions List */}
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
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                              : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"}>
                              {transaction.transactionType === 'cash_in' ? 'Cash In' : 'Cash Out'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {transaction.cashierName} • {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className={`font-semibold ${transaction.transactionType === 'cash_in' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.transactionType === 'cash_in' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                    {cashTransactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No cash transactions in this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No financial data available for the selected period</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the date range or check if there are any sales/expenses recorded
            </p>
          </CardContent>
        </Card>
      )}


      {/* Record Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Manual Expense</DialogTitle>
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
                    <SelectItem value="expense">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">↗</span>
                        <span>Expense (Money Out)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="income">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">↙</span>
                        <span>Income (Money In)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="petty_cash">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">💰</span>
                        <span>Petty Cash</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.transactionType === 'expense' && 'Record money going out (bills, purchases, etc.)'}
                  {formData.transactionType === 'income' && 'Record money coming in (refunds, miscellaneous income, etc.)'}
                  {formData.transactionType === 'petty_cash' && 'Record petty cash transactions'}
                </p>
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
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Record Expense</Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
  );
}