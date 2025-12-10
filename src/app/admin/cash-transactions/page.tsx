'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Calendar,
  User,
  Banknote,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface CashTransaction {
  id: number;
  registrySessionId: number;
  cashierId: number;
  transactionType: string;
  amount: number;
  reason: string;
  reference: string | null;
  notes: string | null;
  approvedBy: number | null;
  createdAt: string;
  cashierName: string;
  cashierEmail: string;
  sessionNumber: string;
  approverName?: string;
  approverEmail?: string;
}

interface Summary {
  totalCashIn: number;
  totalCashOut: number;
  netAmount: number;
  transactionCount: number;
}

export default function CashTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [summary, setSummary] = useState<Summary>({ totalCashIn: 0, totalCashOut: 0, netAmount: 0, transactionCount: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, dateFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = '/api/cash-transactions?limit=100';

      if (typeFilter !== 'all') {
        url += `&transactionType=${typeFilter}`;
      }

      // Apply date filter
      const now = new Date();
      let startDate: string | null = null;

      if (dateFilter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      if (startDate) {
        url += `&startDate=${startDate}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);

        // Calculate summary
        const totalCashIn = data
          .filter((t: CashTransaction) => t.transactionType === 'cash_in')
          .reduce((sum: number, t: CashTransaction) => sum + t.amount, 0);
        const totalCashOut = data
          .filter((t: CashTransaction) => t.transactionType === 'cash_out')
          .reduce((sum: number, t: CashTransaction) => sum + t.amount, 0);

        setSummary({
          totalCashIn,
          totalCashOut,
          netAmount: totalCashIn - totalCashOut,
          transactionCount: data.length,
        });
      }
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.cashierName.toLowerCase().includes(search) ||
      tx.reason.toLowerCase().includes(search) ||
      tx.sessionNumber.toLowerCase().includes(search) ||
      (tx.reference && tx.reference.toLowerCase().includes(search))
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cash Transactions</h1>
            <p className="text-sm text-muted-foreground">View all cash in/out movements recorded by cashiers</p>
          </div>
        </div>

        <Button variant="outline" onClick={fetchTransactions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cash In</p>
                <p className="text-xl font-bold text-green-600">LKR {summary.totalCashIn.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cash Out</p>
                <p className="text-xl font-bold text-red-600">LKR {summary.totalCashOut.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className={`text-xl font-bold ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  LKR {summary.netAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{summary.transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by cashier, reason, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cash_in">Cash In</SelectItem>
                <SelectItem value="cash_out">Cash Out</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No cash transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tx.transactionType === 'cash_in'
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                          }
                        >
                          <span className="flex items-center gap-1">
                            {tx.transactionType === 'cash_in' ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {tx.transactionType === 'cash_in' ? 'Cash In' : 'Cash Out'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${tx.transactionType === 'cash_in' ? 'text-green-600' : 'text-red-600'
                            }`}
                        >
                          {tx.transactionType === 'cash_in' ? '+' : '-'} LKR {tx.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.reason}</p>
                          {tx.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{tx.cashierName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">#{tx.sessionNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        {tx.reference ? (
                          <span className="text-sm">{tx.reference}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(tx.createdAt)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
