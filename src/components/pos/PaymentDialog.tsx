'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Banknote,
  CreditCard,
  Wallet,
  Plus,
  Trash2,
  CheckCircle,
  Calculator,
  AlertCircle,
  Printer,
  Receipt,
  User,
  FileText
} from 'lucide-react';
import { Customer } from './CustomerSelection';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'mobile' | 'credit' | 'cheque';
  amount: number;
  cardType?: string;
  reference?: string;
  chequeDetails?: {
    chequeNumber: string;
    chequeDate: string;
    depositReminderDate?: string;
    payerName: string;
    payeeName?: string;
    bankName: string;
    branchName?: string;
    notes?: string;
  };
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderTotal: number;
  orderSubtotal: number;
  orderDiscount: number;
  customer: Customer | null;
  onPaymentComplete: (paymentData: {
    paymentMethod: string;
    cashReceived?: number;
    changeGiven?: number;
    payments?: PaymentMethod[];
    customerPreviousBalance?: number;
    creditUsed?: number;
    amountPaid?: number;
    paidToAdmin?: number;
    paidToOldOrders?: number;
  }) => void;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  orderTotal: orderTotalProp,
  orderSubtotal: orderSubtotalProp,
  orderDiscount: orderDiscountProp,
  customer,
  onPaymentComplete,
}: PaymentDialogProps) {
  // Ensure all number props are actually numbers
  const orderTotal = Number(orderTotalProp) || 0;
  const orderSubtotal = Number(orderSubtotalProp) || 0;
  const orderDiscount = Number(orderDiscountProp) || 0;

  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'mobile' | 'split' | 'credit' | 'cheque'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardType, setCardType] = useState<string>('visa');
  const [cardReference, setCardReference] = useState<string>('');
  const [mobileReference, setMobileReference] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [depositReminderDate, setDepositReminderDate] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [chequeNotes, setChequeNotes] = useState<string>('');
  const [splitPayments, setSplitPayments] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSplitCreditWarning, setShowSplitCreditWarning] = useState(false);

  // Reset all state when dialog opens/closes
  const resetState = useCallback(() => {
    setCashReceived(0);
    setCardType('visa');
    setCardReference('');
    setMobileReference('');
    setChequeNumber('');
    setChequeDate('');
    setDepositReminderDate('');
    setPayerName(customer?.name || '');
    setPayeeName('');
    setBankName('');
    setBranchName('');
    setChequeNotes('');
    setSplitPayments([]);
    setError('');
    setProcessing(false);
    setPaymentType('cash');
    setShowSplitCreditWarning(false);
  }, [customer]);

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open, resetState]);

  // Reset credit warning when customer is selected
  useEffect(() => {
    if (customer) {
      setShowSplitCreditWarning(false);
    }
  }, [customer]);

  // Reset credit warning when switching away from split tab
  const handlePaymentTypeChange = (value: string) => {
    setPaymentType(value as typeof paymentType);
    setShowSplitCreditWarning(false);
    setError('');
  };

  // Calculate total due including previous customer balance
  const customerPreviousBalance = Number(customer?.creditBalance) || 0;
  const totalDue = customerPreviousBalance + orderTotal;

  const changeAmount = cashReceived - totalDue;

  // Calculate total ACTUAL payment (exclude credit type - it's unpaid amount, not payment)
  const splitActualPaid = splitPayments
    .filter(p => p.type !== 'credit')
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate credit amount (unpaid portion)
  const splitCreditAmount = splitPayments
    .filter(p => p.type === 'credit')
    .reduce((sum, p) => sum + p.amount, 0);

  // Total paid + unpaid should equal total due
  const splitTotalPaid = splitActualPaid + splitCreditAmount;
  const splitRemaining = totalDue - splitTotalPaid;

  const quickAmounts = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
    { label: '5000', value: 5000 },
    { label: 'Exact', value: totalDue },
  ];

  const addSplitPayment = (type: 'cash' | 'card' | 'mobile' | 'credit' | 'cheque') => {
    // Show warning only for credit without customer
    if (type === 'credit' && !customer) {
      setShowSplitCreditWarning(true);
      return;
    }

    // Hide warning when adding any valid payment method
    setShowSplitCreditWarning(false);

    const newPayment: PaymentMethod = {
      id: Date.now().toString(),
      type,
      amount: splitRemaining > 0 ? splitRemaining : 0,
    };

    if (type === 'card') {
      newPayment.cardType = 'visa';
      newPayment.reference = '';
    }

    if (type === 'cheque') {
      newPayment.chequeDetails = {
        chequeNumber: '',
        chequeDate: new Date().toISOString().split('T')[0],
        payerName: customer?.name || '',
        payeeName: '',
        bankName: '',
        branchName: '',
        notes: '',
      };
    }

    setSplitPayments([...splitPayments, newPayment]);
  };

  const updateSplitPayment = (id: string, updates: Partial<PaymentMethod>) => {
    setSplitPayments(splitPayments.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const removeSplitPayment = (id: string) => {
    setSplitPayments(splitPayments.filter(p => p.id !== id));
  };

  const handlePayment = () => {
    setError('');

    // Helper function to calculate credit usage with priority allocation
    const calculateCreditTracking = (totalPaid: number) => {
      const adminCredit = customer?.creditBreakdown?.adminCredits || 0;
      const orderCredit = customer?.creditBreakdown?.orderCredits || 0;

      let remaining = totalPaid;

      // Priority 1: Pay admin credit first (manual credit, not from sales)
      const paidToAdmin = Math.min(remaining, adminCredit);
      remaining -= paidToAdmin;

      // Priority 2: Pay current order second (this is new revenue)
      const paidToCurrent = Math.min(remaining, orderTotal);
      remaining -= paidToCurrent;

      // Priority 3: Pay old orders last (already counted as revenue before)
      const paidToOldOrders = Math.min(remaining, orderCredit);

      return {
        customerPreviousBalance,
        creditUsed: paidToAdmin + paidToOldOrders, // Total paid from previous balance
        amountPaid: paidToCurrent, // Payment to current order
        paidToAdmin, // Track admin credit payment separately
        paidToOldOrders, // Track old order payment separately
      };
    };

    if (paymentType === 'cash') {
      if (cashReceived < totalDue) {
        setError(`Insufficient cash. Need at least LKR ${totalDue.toFixed(2)}`);
        return;
      }

      const { creditUsed, amountPaid, paidToAdmin, paidToOldOrders } = calculateCreditTracking(cashReceived);

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'cash',
        cashReceived,
        changeGiven: changeAmount,
        customerPreviousBalance,
        creditUsed,
        amountPaid,
        paidToAdmin,
        paidToOldOrders,
      });
    } else if (paymentType === 'card') {
      if (!cardReference.trim()) {
        setError('Please enter card transaction reference');
        return;
      }

      const { creditUsed, amountPaid, paidToAdmin, paidToOldOrders } = calculateCreditTracking(totalDue);

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'card',
        payments: [{
          id: '1',
          type: 'card',
          amount: totalDue,
          cardType,
          reference: cardReference,
        }],
        customerPreviousBalance,
        creditUsed,
        amountPaid,
        paidToAdmin,
        paidToOldOrders,
      });
    } else if (paymentType === 'mobile') {
      if (!mobileReference.trim()) {
        setError('Please enter mobile payment reference');
        return;
      }

      const { creditUsed, amountPaid, paidToAdmin, paidToOldOrders } = calculateCreditTracking(totalDue);

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'mobile',
        payments: [{
          id: '1',
          type: 'mobile',
          amount: totalDue,
          reference: mobileReference,
        }],
        customerPreviousBalance,
        creditUsed,
        amountPaid,
        paidToAdmin,
        paidToOldOrders,
      });
    } else if (paymentType === 'credit') {
      if (!customer) {
        setError('Customer selection is required for credit payments');
        return;
      }

      // Full credit payment - no actual payment, everything added to credit balance
      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'credit',
        payments: [{
          id: '1',
          type: 'credit',
          amount: totalDue,
        }],
        customerPreviousBalance,
        creditUsed: 0,
        amountPaid: 0,
        paidToAdmin: 0,
        paidToOldOrders: 0,
      });
    } else if (paymentType === 'cheque') {
      if (!chequeNumber.trim()) {
        setError('Please enter cheque number');
        return;
      }
      if (!chequeDate) {
        setError('Please select cheque date');
        return;
      }
      if (!payerName.trim()) {
        setError('Please enter payer name');
        return;
      }
      if (!bankName.trim()) {
        setError('Please enter bank name');
        return;
      }

      const { creditUsed, amountPaid, paidToAdmin, paidToOldOrders } = calculateCreditTracking(totalDue);

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'cheque',
        payments: [{
          id: '1',
          type: 'cheque',
          amount: totalDue,
          reference: chequeNumber,
          chequeDetails: {
            chequeNumber,
            chequeDate,
            depositReminderDate: depositReminderDate || undefined,
            payerName,
            payeeName: payeeName || undefined,
            bankName,
            branchName: branchName || undefined,
            notes: chequeNotes || undefined,
          },
        }],
        customerPreviousBalance,
        creditUsed,
        amountPaid,
        paidToAdmin,
        paidToOldOrders,
      });
    } else if (paymentType === 'split') {
      if (splitPayments.length === 0) {
        setError('Please add at least one payment method');
        return;
      }

      if (splitTotalPaid < totalDue) {
        setError(`Insufficient payment. Still need LKR ${splitRemaining.toFixed(2)}`);
        return;
      }

      if (splitTotalPaid > totalDue) {
        setError(`Overpayment. Reduce by LKR ${(splitTotalPaid - totalDue).toFixed(2)}`);
        return;
      }

      for (const payment of splitPayments) {
        if ((payment.type === 'card' || payment.type === 'mobile') && !payment.reference?.trim()) {
          setError(`Please enter reference for ${payment.type} payment`);
          return;
        }
        if (payment.type === 'credit' && !customer) {
          setError('Customer required for credit payment');
          return;
        }
        if (payment.type === 'cheque') {
          if (!payment.chequeDetails?.chequeNumber?.trim()) {
            setError('Please enter cheque number');
            return;
          }
          if (!payment.chequeDetails?.chequeDate) {
            setError('Please enter cheque date');
            return;
          }
          if (!payment.chequeDetails?.payerName?.trim()) {
            setError('Please enter payer name for cheque');
            return;
          }
          if (!payment.chequeDetails?.bankName?.trim()) {
            setError('Please enter bank name for cheque');
            return;
          }
        }
      }

      // Use ACTUAL payment for allocation (not including credit/unpaid amount)
      const { creditUsed, amountPaid, paidToAdmin, paidToOldOrders } = calculateCreditTracking(splitActualPaid);

      setProcessing(true);
      const normalizedSplitPayments = splitPayments.map((payment) => {
        if (payment.type === 'cheque' && payment.chequeDetails?.chequeNumber) {
          return {
            ...payment,
            reference: payment.chequeDetails.chequeNumber,
          };
        }
        return payment;
      });
      onPaymentComplete({
        paymentMethod: 'split',
        payments: normalizedSplitPayments,
        customerPreviousBalance,
        creditUsed,
        amountPaid,
        paidToAdmin,
        paidToOldOrders,
      });
    }
  };

  // Determine if we should show the credit warning in split mode
  const shouldShowCreditWarning = paymentType === 'split' && showSplitCreditWarning && !customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[95vw] sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Payment
            {customer && (
              <Badge variant="secondary" className="ml-auto text-sm font-normal">
                Customer: <span className="font-bold ml-1">{customer.name}</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-primary/5 p-3 sm:p-4 rounded-lg space-y-2">
            {customerPreviousBalance > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-destructive font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Previous Balance:
                  </span>
                  <span className="font-semibold text-destructive">LKR {customerPreviousBalance.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Order Subtotal:</span>
              <span className="font-semibold">LKR {orderSubtotal.toFixed(2)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount:</span>
                <span className="font-semibold">-LKR {orderDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Order Total:</span>
              <span className="font-semibold">LKR {orderTotal.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg sm:text-xl font-bold">
              <span>Total to Pay:</span>
              <span className="text-primary text-lg sm:text-xl">LKR {totalDue.toFixed(2)}</span>
            </div>
            {customerPreviousBalance > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                (Previous balance + current order)
              </div>
            )}
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentType} onValueChange={handlePaymentTypeChange}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full gap-x-1 sm:gap-x-4 gap-y-2 mb-4 sm:mb-6">
              <TabsTrigger
                value="cash"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <Banknote className="h-4 w-4" />
                Cash
              </TabsTrigger>

              <TabsTrigger
                value="cheque"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4" />
                Cheque
              </TabsTrigger>
              <TabsTrigger
                value="credit"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <Receipt className="h-4 w-4" />
                Credit
              </TabsTrigger>
                            <TabsTrigger
                value="card"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              {/* <TabsTrigger
                value="mobile"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <Wallet className="h-4 w-4" />
                Mobile
              </TabsTrigger> */}
              <TabsTrigger
                value="split"
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs sm:text-sm"
              >
                <Calculator className="h-4 w-4" />
                Split
              </TabsTrigger>
            </TabsList>

            {/* Cash Payment */}
            <TabsContent value="cash" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="cashReceived" className="text-base">Cash Received (LKR)</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount received"
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa.label}
                    variant="outline"
                    onClick={() => setCashReceived(qa.value)}
                    className="h-12"
                  >
                    {qa.label === 'Exact' ? qa.label : `${qa.value}`}
                  </Button>
                ))}
              </div>

              {cashReceived > 0 && (
                <Card className={changeAmount >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        {changeAmount >= 0 ? 'Change to Return:' : 'Still Required:'}
                      </span>
                      <span className={`text-2xl font-bold ${changeAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        LKR {Math.abs(changeAmount).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Card Payment */}
            {/* <TabsContent value="card" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="cardType">Card Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['Visa', 'Mastercard', 'Amex', 'Other'].map((type) => (
                    <Button
                      key={type}
                      variant={cardType.toLowerCase() === type.toLowerCase() ? 'default' : 'outline'}
                      onClick={() => setCardType(type.toLowerCase())}
                      className="h-12"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="cardReference">Transaction Reference / Last 4 Digits</Label>
                <Input
                  id="cardReference"
                  type="text"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                  placeholder="e.g., 1234 or TXN-ABC123"
                  className="text-lg h-12"
                />
              </div>

              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Amount to Charge:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      LKR {totalDue.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent> */}

            {/* Mobile Payment */}
            <TabsContent value="mobile" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="mobileReference">Mobile Payment Reference</Label>
                <Input
                  id="mobileReference"
                  type="text"
                  value={mobileReference}
                  onChange={(e) => setMobileReference(e.target.value)}
                  placeholder="e.g., Transaction ID or phone number"
                  className="text-lg h-12"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please ensure payment is completed on the mobile app before proceeding
                </AlertDescription>
              </Alert>

              <Card className="bg-purple-50 dark:bg-purple-900/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Amount to Pay:</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      LKR {totalDue.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cheque Payment */}
            <TabsContent value="cheque" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">Cheque Number *</Label>
                  <Input
                    id="chequeNumber"
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="Enter cheque number"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeDate">Cheque Date *</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositReminderDate">Deposit Reminder (Optional)</Label>
                  <Input
                    id="depositReminderDate"
                    type="date"
                    value={depositReminderDate}
                    onChange={(e) => setDepositReminderDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set a date to remind depositing this cheque at bank
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerName">Payer Name *</Label>
                  <Input
                    id="payerName"
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Name on cheque"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payeeName">Payee Name (Optional)</Label>
                  <Input
                    id="payeeName"
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="Pay to the order of"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank name"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name (Optional)</Label>
                  <Input
                    id="branchName"
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Branch name"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="chequeNotes">Notes (Optional)</Label>
                  <Input
                    id="chequeNotes"
                    type="text"
                    value={chequeNotes}
                    onChange={(e) => setChequeNotes(e.target.value)}
                    placeholder="Additional notes"
                    className="h-12"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cheque will be marked as pending. You can track and update its status in Finance &gt; Cheques.
                </AlertDescription>
              </Alert>

              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Cheque Amount:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      LKR {totalDue.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credit Payment */}
            <TabsContent value="credit" className="space-y-4 mt-4">
              {!customer ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
                  <User className="h-12 w-12 text-destructive mb-3" />
                  <h3 className="text-lg font-bold text-destructive mb-1">Customer Required</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    You must associate a customer with this order to process a credit purchase.
                    Please close this dialog and select a customer first.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => onOpenChange(false)}
                  >
                    Go back to select customer
                  </Button>
                </div>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This amount will be added to <span className="font-bold">{customer.name}&apos;s</span> outstanding balance.
                    </AlertDescription>
                  </Alert>

                  <Card className="bg-amber-50 dark:bg-amber-900/20">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Amount to Credit:</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          LKR {totalDue.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Split Payment */}
            <TabsContent value="split" className="space-y-4 mt-4">
              {/* Credit Warning - Only show when triggered and no customer */}
              {shouldShowCreditWarning && (
                <Alert variant="destructive" className="mb-4">
                  <User className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      Customer required for credit payment. Please select a customer first.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                      onClick={() => {
                        setShowSplitCreditWarning(false);
                        onOpenChange(false);
                      }}
                    >
                      Select Customer
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <Label className="text-base">Payment Methods</Label>
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('cash')}
                    disabled={splitRemaining <= 0}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Cash
                  </Button>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('card')}
                    disabled={splitRemaining <= 0}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Card
                  </Button> */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('mobile')}
                    disabled={splitRemaining <= 0}
                  >
                    <Wallet className="h-4 w-4 mr-1" />
                    Mobile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('cheque')}
                    disabled={splitRemaining <= 0}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Cheque
                  </Button>
                  <Button
                    variant={!customer ? 'outline' : 'outline'}
                    size="sm"
                    onClick={() => addSplitPayment('credit')}
                    disabled={splitRemaining <= 0}
                    // className={!customer ? 'opacity-70' : ''}
                    title={!customer ? 'Customer required for credit' : 'Add credit payment'}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Credit
                  </Button>
                </div>
              </div>

              {/* Split Payment List */}
              <div className="space-y-3">
                {splitPayments.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Add payment methods above</p>
                    </CardContent>
                  </Card>
                ) : (
                  splitPayments.map((payment, index) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize">
                            {payment.type} Payment {index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSplitPayment(payment.id)}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`amount-${payment.id}`}>Amount (LKR)</Label>
                            <Input
                              id={`amount-${payment.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount || ''}
                              onChange={(e) => updateSplitPayment(payment.id, {
                                amount: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>

                          {payment.type === 'card' && (
                            <div className="space-y-2">
                              <Label htmlFor={`cardType-${payment.id}`}>Card Type</Label>
                              <select
                                id={`cardType-${payment.id}`}
                                value={payment.cardType || 'visa'}
                                onChange={(e) => updateSplitPayment(payment.id, {
                                  cardType: e.target.value
                                })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="visa">Visa</option>
                                <option value="mastercard">Mastercard</option>
                                <option value="amex">Amex</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {(payment.type === 'card' || payment.type === 'mobile') && (
                          <div className="space-y-2">
                            <Label htmlFor={`ref-${payment.id}`}>
                              {payment.type === 'card' ? 'Card Reference' : 'Mobile Reference'}
                            </Label>
                            <Input
                              id={`ref-${payment.id}`}
                              type="text"
                              value={payment.reference || ''}
                              onChange={(e) => updateSplitPayment(payment.id, {
                                reference: e.target.value
                              })}
                              placeholder="Transaction reference"
                            />
                          </div>
                        )}

                        {payment.type === 'credit' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                            <User className="h-3 w-3" />
                            <span>Linked to: <span className="font-semibold">{customer?.name}</span></span>
                          </div>
                        )}

                        {payment.type === 'cheque' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`chequeNo-${payment.id}`} className="text-xs">Cheque No.*</Label>
                                <Input
                                  id={`chequeNo-${payment.id}`}
                                  type="text"
                                  value={payment.chequeDetails?.chequeNumber || ''}
                                  onChange={(e) => updateSplitPayment(payment.id, {
                                    chequeDetails: {
                                      ...payment.chequeDetails!,
                                      chequeNumber: e.target.value
                                    }
                                  })}
                                  placeholder="Cheque number"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`chequeDate-${payment.id}`} className="text-xs">Date*</Label>
                                <Input
                                  id={`chequeDate-${payment.id}`}
                                  type="date"
                                  value={payment.chequeDetails?.chequeDate || ''}
                                  onChange={(e) => updateSplitPayment(payment.id, {
                                    chequeDetails: {
                                      ...payment.chequeDetails!,
                                      chequeDate: e.target.value
                                    }
                                  })}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`depositReminder-${payment.id}`} className="text-xs">Deposit Reminder</Label>
                                <Input
                                  id={`depositReminder-${payment.id}`}
                                  type="date"
                                  value={payment.chequeDetails?.depositReminderDate || ''}
                                  onChange={(e) => updateSplitPayment(payment.id, {
                                    chequeDetails: {
                                      ...payment.chequeDetails!,
                                      depositReminderDate: e.target.value
                                    }
                                  })}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`payerName-${payment.id}`} className="text-xs">Payer Name*</Label>
                              <Input
                                id={`payerName-${payment.id}`}
                                type="text"
                                value={payment.chequeDetails?.payerName || ''}
                                onChange={(e) => updateSplitPayment(payment.id, {
                                  chequeDetails: {
                                    ...payment.chequeDetails!,
                                    payerName: e.target.value
                                  }
                                })}
                                placeholder="Name on cheque"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`bankName-${payment.id}`} className="text-xs">Bank Name*</Label>
                              <Input
                                id={`bankName-${payment.id}`}
                                type="text"
                                value={payment.chequeDetails?.bankName || ''}
                                onChange={(e) => updateSplitPayment(payment.id, {
                                  chequeDetails: {
                                    ...payment.chequeDetails!,
                                    bankName: e.target.value
                                  }
                                })}
                                placeholder="Bank name"
                                className="h-9"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Split Payment Summary */}
              <Card className={splitRemaining === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Total to Pay:</span>
                    <span className="font-semibold">LKR {totalDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Total Paid:</span>
                    <span className="font-semibold">LKR {splitTotalPaid.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span>{splitRemaining > 0 ? 'Remaining:' : splitRemaining < 0 ? 'Overpaid:' : 'Complete:'}</span>
                    <span className={splitRemaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive text-base sm:text-lg'}>
                      {splitRemaining === 0 ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-5 w-5" />
                          Paid
                        </span>
                      ) : (
                        `LKR ${Math.abs(splitRemaining).toFixed(2)}`
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 h-12 text-base sm:text-lg"
              size="lg"
            >
              {processing ? (
                <>
                  <Printer className="h-5 w-5 mr-2 animate-pulse" />
                  Processing && Printing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
              className="h-12 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}