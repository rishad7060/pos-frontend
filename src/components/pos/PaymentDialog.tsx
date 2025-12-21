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
  User
} from 'lucide-react';
import { Customer } from './CustomerSelection';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'mobile' | 'credit';
  amount: number;
  cardType?: string;
  reference?: string;
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
  }) => void;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  orderTotal,
  orderSubtotal,
  orderDiscount,
  customer,
  onPaymentComplete,
}: PaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'mobile' | 'split' | 'credit'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardType, setCardType] = useState<string>('visa');
  const [cardReference, setCardReference] = useState<string>('');
  const [mobileReference, setMobileReference] = useState<string>('');
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
    setSplitPayments([]);
    setError('');
    setProcessing(false);
    setPaymentType('cash');
    setShowSplitCreditWarning(false);
  }, []);

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

  const changeAmount = cashReceived - orderTotal;
  const splitTotalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const splitRemaining = orderTotal - splitTotalPaid;

  const quickAmounts = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
    { label: '5000', value: 5000 },
    { label: 'Exact', value: orderTotal },
  ];

  const addSplitPayment = (type: 'cash' | 'card' | 'mobile' | 'credit') => {
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

    if (paymentType === 'cash') {
      if (cashReceived < orderTotal) {
        setError(`Insufficient cash. Need at least LKR ${orderTotal.toFixed(2)}`);
        return;
      }

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'cash',
        cashReceived,
        changeGiven: changeAmount,
      });
    } else if (paymentType === 'card') {
      if (!cardReference.trim()) {
        setError('Please enter card transaction reference');
        return;
      }

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'card',
        payments: [{
          id: '1',
          type: 'card',
          amount: orderTotal,
          cardType,
          reference: cardReference,
        }],
      });
    } else if (paymentType === 'mobile') {
      if (!mobileReference.trim()) {
        setError('Please enter mobile payment reference');
        return;
      }

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'mobile',
        payments: [{
          id: '1',
          type: 'mobile',
          amount: orderTotal,
          reference: mobileReference,
        }],
      });
    } else if (paymentType === 'credit') {
      if (!customer) {
        setError('Customer selection is required for credit payments');
        return;
      }

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'credit',
        payments: [{
          id: '1',
          type: 'credit',
          amount: orderTotal,
        }],
      });
    } else if (paymentType === 'split') {
      if (splitPayments.length === 0) {
        setError('Please add at least one payment method');
        return;
      }

      if (splitTotalPaid < orderTotal) {
        setError(`Insufficient payment. Still need LKR ${splitRemaining.toFixed(2)}`);
        return;
      }

      if (splitTotalPaid > orderTotal) {
        setError(`Overpayment. Reduce by LKR ${(splitTotalPaid - orderTotal).toFixed(2)}`);
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
      }

      setProcessing(true);
      onPaymentComplete({
        paymentMethod: 'split',
        payments: splitPayments,
      });
    }
  };

  // Determine if we should show the credit warning in split mode
  const shouldShowCreditWarning = paymentType === 'split' && showSplitCreditWarning && !customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <div className="bg-primary/5 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">LKR {orderSubtotal.toFixed(2)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount:</span>
                <span className="font-semibold">-LKR {orderDiscount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total to Pay:</span>
              <span className="text-primary">LKR {orderTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentType} onValueChange={handlePaymentTypeChange}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="cash" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="credit" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Credit
              </TabsTrigger>
              <TabsTrigger value="split" className="flex items-center gap-2">
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

              <div className="grid grid-cols-5 gap-2">
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
            <TabsContent value="card" className="space-y-4 mt-4">
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
                      LKR {orderTotal.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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
                      LKR {orderTotal.toFixed(2)}
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
                          LKR {orderTotal.toFixed(2)}
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

              <div className="flex items-center justify-between">
                <Label className="text-base">Payment Methods</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('cash')}
                    disabled={splitRemaining <= 0}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Cash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSplitPayment('card')}
                    disabled={splitRemaining <= 0}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Card
                  </Button>
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
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Split Payment Summary */}
              <Card className={splitRemaining === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total to Pay:</span>
                    <span className="font-semibold">LKR {orderTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Paid:</span>
                    <span className="font-semibold">LKR {splitTotalPaid.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{splitRemaining > 0 ? 'Remaining:' : splitRemaining < 0 ? 'Overpaid:' : 'Complete:'}</span>
                    <span className={splitRemaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
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
          <div className="flex gap-3">
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 h-12 text-lg"
              size="lg"
            >
              {processing ? (
                <>
                  <Printer className="h-5 w-5 mr-2 animate-pulse" />
                  Processing & Printing...
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
              className="h-12"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}