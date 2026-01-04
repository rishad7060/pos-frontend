'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Users, Calendar, CloudOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import syncManager from '@/lib/sync-manager';
import offlineDb from '@/lib/offline-db';
import { isOnline } from '@/lib/hooks/use-network-status';

interface CloseRegistryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  userId: number;
  onSuccess: () => void;
  onSessionUpdate?: () => void;
}

export const CloseRegistryDialog = ({
  open,
  onOpenChange,
  session,
  userId,
  onSuccess,
  onSessionUpdate
}: CloseRegistryDialogProps) => {
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCashTransactionForm, setShowCashTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionReason, setTransactionReason] = useState('');
  const [transactionCustomReason, setTransactionCustomReason] = useState('');
  const [isOtherReasonSelected, setIsOtherReasonSelected] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [currentSession, setCurrentSession] = useState<any>(session);
  const [loadingSession, setLoadingSession] = useState(false);
  // TEAM_003: Sync state for offline data
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  // Pending refunds state
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
  const [showPendingRefundsWarning, setShowPendingRefundsWarning] = useState(false);

  // Fetch fresh session data when dialog opens or session prop changes
  useEffect(() => {
    if (open) {
      if (session?.id) {
        fetchCurrentSession();
      } else {
        setCurrentSession(session);
      }
      // TEAM_003: Check for pending offline data when dialog opens
      checkPendingSync();
    }
  }, [open, session?.id]);

  // TEAM_003: Check pending sync count
  const checkPendingSync = async () => {
    try {
      const stats = await offlineDb.getPendingSyncCount();
      setPendingCount(stats.total);
    } catch (error) {
      console.error('[CloseRegistry] Failed to check pending sync:', error);
    }
  };

  const fetchCurrentSession = async () => {
    setLoadingSession(true);
    try {
      const response = await fetchWithAuth('/api/registry-sessions/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data);
      } else {
        setCurrentSession(session);
      }
    } catch (error) {
      console.error('Failed to fetch current session:', error);
      setCurrentSession(session);
    } finally {
      setLoadingSession(false);
    }
  };

  // Ensure session has required numeric fields (recalculate when session changes)
  const safeSession = useMemo(() => {
    if (!currentSession) {
      return {
        openingCash: 0,
        cashPayments: 0,
        cashIn: 0,
        cashOut: 0,
        cashRefunds: 0,
        totalOrders: 0,
      };
    }
    return {
      ...currentSession,
      openingCash: Number(currentSession.openingCash) || 0,
      cashPayments: Number(currentSession.cashPayments) || 0,
      cashIn: Number(currentSession.cashIn) || 0,
      cashOut: Number(currentSession.cashOut) || 0,
      cashRefunds: Number(currentSession.cashRefunds) || 0,
      totalOrders: Number(currentSession.totalOrders) || 0,
    };
  }, [currentSession]);

  // Calculate expected cash: Opening + Cash Sales + Cash In - Cash Out - Cash Refunds
  const calculatedExpected = useMemo(() => {
    return safeSession.openingCash + safeSession.cashPayments + safeSession.cashIn - safeSession.cashOut - safeSession.cashRefunds;
  }, [safeSession.openingCash, safeSession.cashPayments, safeSession.cashIn, safeSession.cashOut, safeSession.cashRefunds]);

  if (!currentSession) return null;

  const actualAmount = parseFloat(actualCash) || 0;
  const variance = actualAmount - calculatedExpected;

  const handleReasonSelect = (selectedReason: string) => {
    if (selectedReason === 'Other') {
      setIsOtherReasonSelected(true);
      setTransactionReason('');
      setTransactionCustomReason('');
    } else {
      setIsOtherReasonSelected(false);
      setTransactionReason(selectedReason);
      setTransactionCustomReason('');
    }
  };

  const handleAddCashTransaction = async () => {
    if (!transactionAmount) {
      toast.error('Please enter amount');
      return;
    }

    // Use customReason if "Other" is selected, otherwise use the selected reason
    const finalReason = isOtherReasonSelected ? transactionCustomReason.trim() : transactionReason.trim();

    if (!finalReason) {
      toast.error('Please select or enter a reason');
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/cash-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrySessionId: safeSession.id,
          cashierId: userId,
          transactionType,
          amount,
          reason: finalReason,
          reference: transactionReference.trim() || undefined,
          notes: transactionNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to add cash transaction');
        return;
      }

      toast.success(`${transactionType === 'cash_in' ? 'Cash in' : 'Cash out'} transaction added successfully!`);

      // Reset form
      setTransactionAmount('');
      setTransactionReason('');
      setTransactionCustomReason('');
      setIsOtherReasonSelected(false);
      setTransactionReference('');
      setTransactionNotes('');
      setShowCashTransactionForm(false);

      // Refresh session data to show updated totals
      await fetchCurrentSession();

      // Also refresh parent component's session
      if (onSessionUpdate) {
        onSessionUpdate();
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Require actual cash count - this is mandatory for closing
    if (!actualCash.trim()) {
      toast.error('Actual cash count is required to close the registry. Please count all cash in hand.');
      return;
    }

    const amount = parseFloat(actualCash);

    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid actual cash amount (must be 0 or greater)');
      return;
    }

    setLoading(true);

    // TEAM_003: Check for pending offline data and sync before closing
    try {
      const stats = await offlineDb.getPendingSyncCount();
      if (stats.total > 0) {
        if (!isOnline()) {
          // Offline with pending data - warn user
          toast.error(`Cannot close registry: ${stats.total} offline items pending sync. Please connect to the internet first.`);
          setLoading(false);
          return;
        }

        // Sync pending data first
        setIsSyncing(true);
        setSyncMessage(`Syncing ${stats.total} pending items...`);
        toast.info(`Syncing ${stats.total} offline items before closing...`);

        const syncResult = await syncManager.syncAll();
        setIsSyncing(false);
        setSyncMessage('');

        if (!syncResult.success) {
          if (syncResult.failedItems > 0) {
            toast.error(`Sync failed: ${syncResult.failedItems} items could not be synced. Please try again.`);
            setLoading(false);
            // Refresh the count
            await checkPendingSync();
            return;
          }
        } else {
          toast.success(`Successfully synced ${syncResult.syncedItems} items`);
        }

        // Refresh pending count after sync
        await checkPendingSync();
      }
    } catch (syncError) {
      console.error('[CloseRegistry] Sync error:', syncError);
      setIsSyncing(false);
      setSyncMessage('');
      toast.error('Failed to sync offline data. Please try again.');
      setLoading(false);
      return;
    }

    // Proceed with registry close
    try {
      const response = await fetchWithAuth(`/api/registry-sessions?id=${safeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedBy: userId,
          actualCash: amount,
          closingNotes: closingNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Special handling for pending refunds error
        if (data.code === 'PENDING_REFUNDS_EXIST') {
          setPendingRefunds(data.pendingRefunds || []);
          setShowPendingRefundsWarning(true);
          toast.error(data.message || 'Cannot close registry: pending refunds exist');
        } else {
          toast.error(data.error || 'Failed to close registry');
        }
        return;
      }

      toast.success('Registry closed successfully!');
      onSuccess();
      onOpenChange(false);

      // Reset form
      setActualCash('');
      setClosingNotes('');
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col w-full overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Close Registry Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
          {/* TEAM_003: Pending Sync Warning */}
          {pendingCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-500 rounded-lg">
              <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">Offline Data Pending</p>
                <p className="text-amber-700 dark:text-amber-300">
                  {pendingCount} item{pendingCount !== 1 ? 's' : ''} will be synced before closing.
                </p>
              </div>
            </div>
          )}

          {/* TEAM_003: Sync Progress */}
          {isSyncing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-500 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Syncing...</p>
                <p className="text-blue-700 dark:text-blue-300">{syncMessage}</p>
              </div>
            </div>
          )}

          {/* Session Info */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between items-start text-sm">
              <span className="text-muted-foreground">Session Number:</span>
              <span className="font-semibold font-mono">{safeSession.sessionNumber}</span>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Session Date:
              </span>
              <span className="font-semibold">{safeSession.sessionDate}</span>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-muted-foreground">Opened By:</span>
              <span className="font-semibold">{safeSession.openerName || 'Unknown'}</span>
            </div>
            {safeSession.cashierCount > 0 && (
              <div className="flex justify-between items-start text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Cashiers Used:
                </span>
                <span className="font-semibold">{safeSession.cashierCount} cashier{safeSession.cashierCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Pending Refunds Warning */}
          {showPendingRefundsWarning && pendingRefunds.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cannot Close Registry - Pending Refunds</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  You have {pendingRefunds.length} refund(s) awaiting admin approval.
                  {pendingRefunds.filter((r: any) => r.cashGiven).length > 0 && (
                    <span className="font-semibold">
                      {' '}Cash has already been given for {pendingRefunds.filter((r: any) => r.cashGiven).length} refund(s).
                    </span>
                  )}
                </p>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {pendingRefunds.map((refund: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded p-2 text-sm border border-red-200 dark:border-red-800">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{refund.refundNumber}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{refund.reason}</div>
                          {/* Payment Method Badge */}
                          <div className="mt-1 flex items-center gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              refund.refundMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              refund.refundMethod === 'card' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              refund.refundMethod === 'mobile' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              refund.refundMethod === 'credit' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              refund.refundMethod === 'cheque' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {refund.refundMethod === 'cash' && '💵 Cash'}
                              {refund.refundMethod === 'card' && '💳 Card'}
                              {refund.refundMethod === 'mobile' && '📱 Mobile'}
                              {refund.refundMethod === 'credit' && '🎫 Credit'}
                              {refund.refundMethod === 'cheque' && '📄 Cheque'}
                              {!refund.refundMethod && 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">LKR {refund.amount.toFixed(2)}</div>
                          {refund.cashGiven && (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Cash Given ✓</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                  <strong>Action Required:</strong> {pendingRefunds.filter((r: any) => r.cashGiven).length > 0
                    ? 'Contact admin immediately to approve refunds where cash was already given, or reject other pending refunds.'
                    : 'Contact admin to approve or reject these refunds before closing the registry.'}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Financial Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Opening Cash:</span>
              <span className="font-semibold">LKR {safeSession.openingCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cash Sales:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">+LKR {safeSession.cashPayments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cash In:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">+LKR {safeSession.cashIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cash Out:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">-LKR {safeSession.cashOut.toLocaleString()}</span>
            </div>
            {safeSession.cashRefunds > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Refunds:</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">-LKR {safeSession.cashRefunds.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders:</span>
              <span className="font-semibold">{safeSession.totalOrders} orders</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground font-medium">Expected Cash:</span>
              <span className="font-bold">LKR {calculatedExpected.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              Calculation: {safeSession.openingCash.toLocaleString()} + {safeSession.cashPayments.toLocaleString()} + {safeSession.cashIn.toLocaleString()} - {safeSession.cashOut.toLocaleString()}{safeSession.cashRefunds > 0 ? ` - ${safeSession.cashRefunds.toLocaleString()} (refunds)` : ''} = {calculatedExpected.toLocaleString()}
            </div>
          </div>

          {/* Cash Transactions Section */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium">Cash Transactions</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCashTransactionForm(!showCashTransactionForm)}
                disabled={loading}
              >
                {showCashTransactionForm ? 'Cancel' : 'Add Transaction'}
              </Button>
            </div>

            {showCashTransactionForm && (
              <div className="space-y-3 pt-3 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="transactionType">Type</Label>
                    <select
                      id="transactionType"
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value as 'cash_in' | 'cash_out')}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      disabled={loading}
                    >
                      <option value="cash_in">Cash In</option>
                      <option value="cash_out">Cash Out</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="transactionAmount">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="transactionAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="transactionReason">Reason *</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(transactionType === 'cash_in' ? [
                      'Opening float adjustment',
                      'Change replenishment',
                      'Petty cash return',
                      'Customer deposit',
                      'Bank deposit',
                      'Other'
                    ] : [
                      'Bank deposit',
                      'Petty cash withdrawal',
                      'Supplier payment',
                      'Change shortage',
                      'Loan payment',
                      'Other'
                    ]).map((reason) => (
                      <Button
                        key={reason}
                        type="button"
                        variant={reason === 'Other' ? (isOtherReasonSelected ? 'default' : 'outline') : (transactionReason === reason ? 'default' : 'outline')}
                        size="sm"
                        onClick={() => handleReasonSelect(reason)}
                        disabled={loading}
                      >
                        {reason}
                      </Button>
                    ))}
                  </div>
                  {isOtherReasonSelected && (
                    <Input
                      placeholder="Enter custom reason..."
                      value={transactionCustomReason}
                      onChange={(e) => setTransactionCustomReason(e.target.value)}
                      className="mt-2"
                      disabled={loading}
                      autoFocus
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="transactionReference">Reference (Optional)</Label>
                    <Input
                      id="transactionReference"
                      placeholder="Receipt #, etc."
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transactionNotes">Notes (Optional)</Label>
                    <Input
                      id="transactionNotes"
                      placeholder="Additional details"
                      value={transactionNotes}
                      onChange={(e) => setTransactionNotes(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddCashTransaction}
                  disabled={loading || !transactionAmount || (!transactionReason && !isOtherReasonSelected) || (isOtherReasonSelected && !transactionCustomReason.trim())}
                  className="w-full"
                >
                  {loading ? 'Adding...' : `Add ${transactionType === 'cash_in' ? 'Cash In' : 'Cash Out'}`}
                </Button>
              </div>
            )}
          </div>

          {/* Actual Cash Input */}
          <div className="space-y-2">
            <Label htmlFor="actualCash">
              Actual Cash Counted <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="actualCash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Variance Display */}
          {actualCash && (
            <div className={`p-4 rounded-lg border-2 ${variance === 0
              ? 'bg-green-50 dark:bg-green-950 border-green-500'
              : variance > 0
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                : 'bg-red-50 dark:bg-red-950 border-red-500'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {variance === 0 ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white font-bold">✓</span>
                    </div>
                  ) : variance > 0 ? (
                    <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {variance === 0 ? 'Perfect Match!' : variance > 0 ? 'Cash Over' : 'Cash Short'}
                    </p>
                    <p className="text-xs opacity-75">Variance from expected</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${variance === 0
                    ? 'text-green-700 dark:text-green-400'
                    : variance > 0
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-red-700 dark:text-red-400'
                    }`}>
                    {variance >= 0 ? '+' : ''}{(variance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-75">LKR</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for large variance */}
          {actualCash && Math.abs(variance) > 1000 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Large Variance Detected</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Please verify the cash count and add a note explaining the difference.
                </p>
              </div>
            </div>
          )}

          {/* Closing Notes */}
          <div className="space-y-2">
            <Label htmlFor="closingNotes">
              Closing Notes {Math.abs(variance) > 1000 && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="closingNotes"
              placeholder="Add any notes about closing the registry..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={3}
            />
            {safeSession.notes && (
              <p className="text-xs text-muted-foreground">
                Opening notes: {safeSession.notes}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !actualCash || (Math.abs(variance) > 1000 && !closingNotes.trim())}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Closing...
              </>
            ) : (
              'Close Registry'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};