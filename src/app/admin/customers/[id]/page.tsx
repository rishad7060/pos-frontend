'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ShoppingBag,
  CreditCard,
  History,
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';

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

interface CreditTransaction {
  id: number;
  orderId: number | null;
  transactionType: string;
  amount: number;
  balance: number;
  description: string | null;
  userId: number | null;
  createdAt: string;
}

interface OrderItem {
  id: number;
  itemName: string;
  netWeightKg: number;
  pricePerKg: number;
  finalTotal: number;
  quantityType: string;
}

interface Order {
  id: number;
  orderNumber: string;
  cashierId: number | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashierName: string | null;
  items: OrderItem[];
}

interface CustomerStats {
  totalOrders: number;
  totalCreditSales: number;
  totalPayments: number;
  pendingBalance: number;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeDepositReminderDate, setChequeDepositReminderDate] = useState('');
  const [chequePayerName, setChequePayerName] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchCustomerDetails();
  }, [resolvedParams.id]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`);
      if (!response.ok) {
        throw new Error('Customer not found');
      }
      const data = await response.json();
      setCustomer(data.customer);
      setCreditBalance(data.creditBalance);
      setCreditTransactions(data.creditTransactions);
      setOrders(data.orders);
      setStats(data.stats);
    } catch (error) {
      toast.error('Failed to fetch customer details');
      router.push('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (amount > creditBalance) {
      toast.error('Payment amount cannot exceed outstanding balance');
      return;
    }

    // Validate cheque details when paying by cheque
    if (paymentMethod === 'cheque') {
      if (!chequeNumber.trim()) {
        toast.error('Please enter cheque number');
        return;
      }
      if (!chequeDate) {
        toast.error('Please select cheque date');
        return;
      }
      if (!chequePayerName.trim()) {
        toast.error('Please enter payer name');
        return;
      }
      if (!chequeBankName.trim()) {
        toast.error('Please enter bank name');
        return;
      }
    }

    const parseDmyToIso = (value: string, fieldLabel: string): string | null => {
      try {
        const parsed = parseDateFns(value, 'dd/MM/yyyy', new Date());
        if (isNaN(parsed.getTime())) {
          throw new Error('Invalid date');
        }
        return formatDateFns(parsed, 'yyyy-MM-dd');
      } catch {
        toast.error(`Please enter a valid ${fieldLabel} in DD/MM/YYYY format`);
        return null;
      }
    };

    setSubmitting(true);
    try {
      const response = await fetch('/api/customer-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer?.id,
          transactionType: 'debit',
          amount, // Backend enforces negative sign for debit (customer payment)
          description: `Payment received via ${paymentMethod}${paymentNotes ? ` - ${paymentNotes}` : ''}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      // If payment was made by cheque, also register cheque in finance module (best-effort)
      if (paymentMethod === 'cheque' && customer) {
        try {
          const chequeDateIso = parseDmyToIso(chequeDate, 'cheque date');
          if (!chequeDateIso) {
            setSubmitting(false);
            return;
          }

          let depositReminderIso: string | undefined;
          if (chequeDepositReminderDate) {
            const parsed = parseDmyToIso(chequeDepositReminderDate, 'deposit reminder date');
            if (!parsed) {
              setSubmitting(false);
              return;
            }
            depositReminderIso = parsed;
          }

          const chequeResponse = await fetch('/api/cheques', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chequeNumber,
              chequeDate: chequeDateIso,
              amount,
              payerName: chequePayerName,
              // Payee is optional; can be shop name or left blank
              bankName: chequeBankName,
              branchName: undefined,
              transactionType: 'received',
              depositReminderDate: depositReminderIso,
              customerId: customer.id,
              notes: paymentNotes || `Cheque received for customer credit payment`,
            }),
          });

          if (!chequeResponse.ok) {
            console.error('Failed to register cheque for customer payment');
            toast.warning('Payment recorded, but failed to register cheque record');
          }
        } catch (error) {
          console.error('Error while registering cheque:', error);
          toast.warning('Payment recorded, but an error occurred while saving cheque details');
        }
      }

      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setChequeNumber('');
      setChequeDate('');
      setChequeDepositReminderDate('');
      setChequePayerName('');
      setChequeBankName('');
      fetchCustomerDetails();
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
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

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      cash: { variant: 'default', label: 'Cash' },
      card: { variant: 'secondary', label: 'Card' },
      credit: { variant: 'destructive', label: 'Credit' },
      split: { variant: 'outline', label: 'Split' },
      cheque: { variant: 'outline', label: 'Cheque' },
    };
    return variants[method] || { variant: 'outline', label: method };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        {creditBalance > 0 && (
          <Button onClick={() => setPaymentDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Receive Payment
          </Button>
        )}
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={creditBalance > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${creditBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(creditBalance)}
            </div>
            {creditBalance > 0 && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Payment pending
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(customer.totalPurchases)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.totalOrders || 0} orders</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalCreditSales || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Credit purchases</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalPayments || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Payments received</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {customer.phone && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{customer.address}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Visits</p>
                <p className="font-medium">{customer.visitCount} times</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Credit History and Order History */}
      <Tabs defaultValue="credit" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="credit" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Credit History
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Order History
          </TabsTrigger>
        </TabsList>

        {/* Credit History Tab */}
        <TabsContent value="credit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Transactions</CardTitle>
              <CardDescription>Complete history of credit sales and payments</CardDescription>
            </CardHeader>
            <CardContent>
              {creditTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No credit transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creditTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${transaction.transactionType === 'payment'
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : transaction.transactionType === 'sale'
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          : 'bg-muted/50'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${transaction.transactionType === 'payment'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : transaction.transactionType === 'sale'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-muted'
                          }`}>
                          {transaction.transactionType === 'payment' ? (
                            <TrendingDown className="h-5 w-5 text-green-600" />
                          ) : transaction.transactionType === 'sale' ? (
                            <TrendingUp className="h-5 w-5 text-red-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{transaction.transactionType}</p>
                            {transaction.orderId && (
                              <Badge variant="outline" className="text-xs">
                                Order #{transaction.orderId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.amount < 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: {formatCurrency(transaction.balance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>All orders placed by this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const paymentInfo = getPaymentMethodBadge(order.paymentMethod);
                    return (
                      <div
                        key={order.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div
                          className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Receipt className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">{order.orderNumber}</p>
                                  <Badge variant={paymentInfo.variant}>
                                    {paymentInfo.label}
                                  </Badge>
                                  <Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(order.createdAt)} • {order.cashierName || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
                              {order.discountAmount > 0 && (
                                <p className="text-xs text-green-600">
                                  Discount: {formatCurrency(order.discountAmount)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Items (Expandable) */}
                        {selectedOrder?.id === order.id && (
                          <div className="p-4 border-t bg-background">
                            <p className="text-sm font-medium mb-3">Order Items</p>
                            <div className="space-y-2">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{item.itemName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {toNumber(item.netWeightKg).toFixed(3)} {item.quantityType} × {formatCurrency(item.pricePerKg)}
                                    </p>
                                  </div>
                                  <p className="font-bold">{formatCurrency(item.finalTotal)}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-3 border-t flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(order.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg mt-2">
                              <span>Total</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Record a payment from {customer.name}. Outstanding balance: {formatCurrency(creditBalance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={creditBalance}
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(creditBalance)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'cheque' && (
              <div className="space-y-3 border rounded-md p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700">Cheque Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="chequeNumber">Cheque Number *</Label>
                    <Input
                      id="chequeNumber"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chequeDate">Cheque Date *</Label>
                    <Input
                      id="chequeDate"
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/YYYY"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chequePayer">Payer Name *</Label>
                    <Input
                      id="chequePayer"
                      value={chequePayerName}
                      onChange={(e) => setChequePayerName(e.target.value)}
                      placeholder="Name on cheque"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chequeBank">Bank Name *</Label>
                    <Input
                      id="chequeBank"
                      value={chequeBankName}
                      onChange={(e) => setChequeBankName(e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chequeReminder">Deposit Reminder (Optional)</Label>
                    <Input
                      id="chequeReminder"
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/YYYY"
                      value={chequeDepositReminderDate}
                      onChange={(e) => setChequeDepositReminderDate(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  These details will also be saved in the Cheques module as a received cheque for this customer.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceivePayment} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
