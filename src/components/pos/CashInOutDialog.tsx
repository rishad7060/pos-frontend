'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface CashTransaction {
  id: number;
  transactionType: string;
  amount: number;
  reason: string;
  reference: string | null;
  notes: string | null;
  cashierName: string;
  createdAt: string;
}

interface CashInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrySessionId: number;
  cashierId: number;
  cashierName: string;
  onSuccess?: () => void;
}

export function CashInOutDialog({
  open,
  onOpenChange,
  registrySessionId,
  cashierId,
  cashierName,
  onSuccess,
}: CashInOutDialogProps) {
  const [activeTab, setActiveTab] = useState<'cash_in' | 'cash_out' | 'history'>('cash_in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sessionTotals, setSessionTotals] = useState<{ cashIn: number; cashOut: number } | null>(null);

  // Common reasons for cash in/out
  const cashInReasons = [
    'Opening float adjustment',
    'Change replenishment',
    'Petty cash return',
    'Customer deposit',
    'Other',
  ];

  const cashOutReasons = [
    'Bank deposit',
    'Petty cash withdrawal',
    'Supplier payment',
    'Change shortage',
    'Other',
  ];

  useEffect(() => {
    if (open) {
      if (activeTab === 'history') {
        fetchHistory();
      }
      fetchSessionTotals();
    }
  }, [open, activeTab, registrySessionId]);

  const fetchSessionTotals = async () => {
    try {
      const response = await fetchWithAuth(`/api/registry-sessions/current`);
      if (response.ok) {
        const data = await response.json();
        setSessionTotals({
          cashIn: data.cashIn || 0,
          cashOut: data.cashOut || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch session totals:', error);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetchWithAuth(`/api/cash-transactions?registrySessionId=${registrySessionId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch cash transactions:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Use customReason if "Other" is selected, otherwise use the selected reason
    const finalReason = isOtherSelected ? customReason.trim() : reason.trim();
    
    if (!finalReason) {
      toast.error('Please select or enter a reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/cash-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrySessionId,
          cashierId,
          transactionType: activeTab,
          amount: parsedAmount,
          reason: finalReason,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record transaction');
      }

      toast.success(
        activeTab === 'cash_in'
          ? `Cash In: LKR ${parsedAmount.toLocaleString()} recorded`
          : `Cash Out: LKR ${parsedAmount.toLocaleString()} recorded`
      );

      // Reset form
      resetForm();

      // Refresh session totals
      await fetchSessionTotals();

      // Refresh history if on history tab
      if (activeTab === 'history') {
        fetchHistory();
      }

      // Refresh session in parent component
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record cash transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setReason('');
    setCustomReason('');
    setIsOtherSelected(false);
    setReference('');
    setNotes('');
  };

  const handleReasonSelect = (selectedReason: string) => {
    if (selectedReason === 'Other') {
      setIsOtherSelected(true);
      setReason('');
      setCustomReason('');
    } else {
      setIsOtherSelected(false);
      setReason(selectedReason);
      setCustomReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cash In / Cash Out
          </DialogTitle>
          <DialogDescription>
            Record cash movements for the current registry session
          </DialogDescription>
        </DialogHeader>

        {/* Session Totals Summary */}
        {sessionTotals && (
          <div className="p-4 bg-muted rounded-lg mb-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Cash In</p>
                <p className="font-semibold text-green-600">LKR {sessionTotals.cashIn.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cash Out</p>
                <p className="font-semibold text-red-600">LKR {sessionTotals.cashOut.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Net</p>
                <p className={`font-semibold ${(sessionTotals.cashIn - sessionTotals.cashOut) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  LKR {(sessionTotals.cashIn - sessionTotals.cashOut).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as 'cash_in' | 'cash_out' | 'history');
            resetForm();
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash_in" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              Cash In
            </TabsTrigger>
            <TabsTrigger value="cash_out" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              Cash Out
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Cash In Tab */}
          <TabsContent value="cash_in">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="amount-in">Amount (LKR) *</Label>
                <Input
                  id="amount-in"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <div className="flex flex-wrap gap-2">
                  {cashInReasons.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant={r === 'Other' ? (isOtherSelected ? 'default' : 'outline') : (reason === r ? 'default' : 'outline')}
                      size="sm"
                      onClick={() => handleReasonSelect(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                {isOtherSelected && (
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-in">Reference (optional)</Label>
                <Input
                  id="reference-in"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Receipt #, voucher #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes-in">Notes (optional)</Label>
                <Textarea
                  id="notes-in"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                    Record Cash In
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Cash Out Tab */}
          <TabsContent value="cash_out">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="amount-out">Amount (LKR) *</Label>
                <Input
                  id="amount-out"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <div className="flex flex-wrap gap-2">
                  {cashOutReasons.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant={r === 'Other' ? (isOtherSelected ? 'default' : 'outline') : (reason === r ? 'default' : 'outline')}
                      size="sm"
                      onClick={() => handleReasonSelect(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                {isOtherSelected && (
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-out">Reference (optional)</Label>
                <Input
                  id="reference-out"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Deposit slip #, voucher #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes-out">Notes (optional)</Label>
                <Textarea
                  id="notes-out"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Record Cash Out
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="pt-2">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading history...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No cash transactions for this session</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {transactions.map((tx) => (
                    <Card key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                tx.transactionType === 'cash_in'
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {tx.transactionType === 'cash_in' ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tx.reason}</p>
                              <p className="text-xs text-muted-foreground">
                                by {tx.cashierName} • {new Date(tx.createdAt).toLocaleTimeString()}
                              </p>
                              {tx.reference && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ref: {tx.reference}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              tx.transactionType === 'cash_in'
                                ? 'text-green-600 border-green-200'
                                : 'text-red-600 border-red-200'
                            }
                          >
                            {tx.transactionType === 'cash_in' ? '+' : '-'} LKR{' '}
                            {tx.amount.toLocaleString()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}