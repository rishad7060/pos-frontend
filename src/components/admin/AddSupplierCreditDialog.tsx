'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { Plus, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddSupplierCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number;
  supplierName: string;
  currentBalance: number;
  onSuccess: () => void;
}

interface Cheque {
  id: number;
  chequeNumber: string;
  amount: number;
  payerName: string;
  bankName: string;
  chequeDate: string;
  status: string;
  customer: {
    id: number;
    name: string;
  } | null;
}

export default function AddSupplierCreditDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  currentBalance,
  onSuccess
}: AddSupplierCreditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availableCheques, setAvailableCheques] = useState<Cheque[]>([]);
  const [loadingCheques, setLoadingCheques] = useState(false);
  const [showCreateChequeDialog, setShowCreateChequeDialog] = useState(false);
  const [formData, setFormData] = useState({
    transactionType: 'admin_credit',
    amount: '',
    description: '',
    paymentMethod: '',
    reference: '',
    selectedChequeId: '',
    chequeOption: 'existing', // 'existing' or 'new'
  });
  const [newChequeData, setNewChequeData] = useState({
    chequeNumber: '',
    amount: '',
    payerName: '',
    bankName: '',
    chequeDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch available cheques for endorsement
  useEffect(() => {
    if (open && formData.paymentMethod === 'Cheque') {
      fetchAvailableCheques();
    }
  }, [open, formData.paymentMethod]);

  const fetchAvailableCheques = async () => {
    try {
      setLoadingCheques(true);
      // Fetch pending cheques that are not endorsed yet (can only endorse pending cheques)
      const response = await fetchWithAuth('/api/cheques?status=pending&isEndorsed=false');
      const data = await response.json();

      if (Array.isArray(data)) {
        setAvailableCheques(data);
      } else if (data.data && Array.isArray(data.data)) {
        setAvailableCheques(data.data);
      } else {
        setAvailableCheques([]);
      }
    } catch (error) {
      console.error('Failed to fetch cheques:', error);
      toast.error('Failed to load available cheques');
      setAvailableCheques([]);
    } finally {
      setLoadingCheques(false);
    }
  };

  const handleCreateCheque = async () => {
    // Validate new cheque data
    if (!newChequeData.chequeNumber || !newChequeData.amount || !newChequeData.payerName || !newChequeData.bankName) {
      toast.error('Please fill in all required cheque fields');
      return;
    }

    const chequeAmount = parseFloat(newChequeData.amount);
    if (isNaN(chequeAmount) || chequeAmount <= 0) {
      toast.error('Please enter a valid cheque amount');
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/cheques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chequeNumber: newChequeData.chequeNumber,
          chequeDate: newChequeData.chequeDate,
          amount: chequeAmount,
          payerName: newChequeData.payerName,
          bankName: newChequeData.bankName,
          transactionType: 'received',
          status: 'pending', // Must be pending to allow endorsement
          notes: newChequeData.notes || `Cheque received for supplier payment to ${supplierName}`,
          payeeName: 'Our Company', // Or get from settings
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        toast.success('Customer cheque created successfully');
        setShowCreateChequeDialog(false);
        // Refresh available cheques
        await fetchAvailableCheques();
        // Auto-select the newly created cheque
        setFormData(prev => ({
          ...prev,
          selectedChequeId: data.id.toString(),
          amount: chequeAmount.toFixed(2),
          reference: newChequeData.chequeNumber,
        }));
        // Reset new cheque data
        setNewChequeData({
          chequeNumber: '',
          amount: '',
          payerName: '',
          bankName: '',
          chequeDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
      } else {
        toast.error(data.error || 'Failed to create cheque');
      }
    } catch (error) {
      console.error('Failed to create cheque:', error);
      toast.error('Failed to create cheque');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum === 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate payment doesn't exceed outstanding balance
    if (formData.transactionType === 'debit' && currentBalance > 0 && amountNum > currentBalance) {
      toast.error(`Payment cannot exceed outstanding balance of LKR ${currentBalance.toFixed(2)}`);
      return;
    }

    // Prevent payment when there's no outstanding balance
    if (formData.transactionType === 'debit' && currentBalance <= 0) {
      toast.error('Cannot make payment when there is no outstanding balance');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setLoading(true);

    try {
      // CRITICAL: Use different endpoints based on transaction type
      if (formData.transactionType === 'debit') {
        // If using cheque with "new" option, create the cheque first
        if (formData.paymentMethod === 'Cheque' && formData.chequeOption === 'new') {
          // Validate new cheque data
          if (!newChequeData.chequeNumber || !newChequeData.amount || !newChequeData.payerName || !newChequeData.bankName) {
            toast.error('Please fill in all required cheque fields');
            return;
          }

          const chequeAmount = parseFloat(newChequeData.amount);
          if (isNaN(chequeAmount) || chequeAmount <= 0) {
            toast.error('Please enter a valid cheque amount');
            return;
          }

          try {
            const createChequeResponse = await fetchWithAuth('/api/cheques', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chequeNumber: newChequeData.chequeNumber,
                chequeDate: newChequeData.chequeDate,
                amount: chequeAmount,
                payerName: newChequeData.payerName,
                bankName: newChequeData.bankName,
                transactionType: 'received',
                status: 'pending', // Must be pending to allow endorsement
                notes: newChequeData.notes || `Cheque for supplier payment to ${supplierName}`,
                payeeName: 'Our Company',
              }),
            });

            const chequeData = await createChequeResponse.json();

            if (!createChequeResponse.ok || !chequeData.id) {
              toast.error(chequeData.error || 'Failed to create cheque');
              return;
            }

            // Set the newly created cheque ID for endorsement
            formData.selectedChequeId = chequeData.id.toString();
            formData.reference = newChequeData.chequeNumber;
          } catch (error) {
            console.error('Failed to create cheque:', error);
            toast.error('Failed to create cheque');
            return;
          }
        }

        // If using cheque (either existing or newly created), endorse it first
        if (formData.paymentMethod === 'Cheque' && formData.selectedChequeId) {
          try {
            // Endorse the cheque to the supplier using the correct endpoint
            const endorseResponse = await fetchWithAuth(`/api/cheques/${formData.selectedChequeId}/endorse`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                endorsedTo: supplierName,
                endorseReason: `Payment to supplier ${supplierName}`,
                notes: `Endorsed to ${supplierName} for payment`,
              }),
            });

            if (!endorseResponse.ok) {
              const errorData = await endorseResponse.json();
              toast.error(errorData.error || 'Failed to endorse cheque');
              return;
            }
          } catch (error) {
            console.error('Failed to endorse cheque:', error);
            toast.error('Failed to endorse cheque');
            return;
          }
        }

        // Record payment using FIFO allocation endpoint
        const response = await fetchWithAuth('/api/supplier-credits/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplierId,
            amount: Math.abs(amountNum), // Payment endpoint expects positive amount
            paymentMethod: formData.paymentMethod || 'Manual Entry',
            reference: formData.reference || '',
            notes: formData.description.trim(),
            chequeId: formData.selectedChequeId ? parseInt(formData.selectedChequeId) : undefined,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Show detailed success message with allocation info
          const allocatedCount = data.allocations?.length || 0;
          toast.success(
            `Payment of LKR ${amountNum.toFixed(2)} recorded successfully! ` +
            `Allocated to ${allocatedCount} credit(s) using FIFO.`
          );
          setFormData({
            transactionType: 'admin_credit',
            amount: '',
            description: '',
            paymentMethod: '',
            reference: '',
            selectedChequeId: '',
            chequeOption: 'existing',
          });
          onSuccess();

          // Broadcast event to notify other pages to refresh PO data
          window.dispatchEvent(new CustomEvent('supplier-payment-recorded', {
            detail: {
              supplierId,
              amount: amountNum,
              allocations: data.allocations,
              type: 'payment'
            }
          }));
        } else {
          toast.error(data.error || 'Failed to record payment');
        }
      } else {
        // Add manual credit (admin adjustment for old debts)
        const response = await fetchWithAuth('/api/supplier-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplierId,
            transactionType: formData.transactionType,
            amount: Math.abs(amountNum), // Backend handles sign
            description: formData.description.trim(),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Credit transaction added successfully');
          setFormData({
            transactionType: 'admin_credit',
            amount: '',
            description: '',
            paymentMethod: '',
            reference: '',
            selectedChequeId: '',
            chequeOption: 'existing',
          });
          onSuccess();

          // Broadcast event to notify other pages to refresh supplier data
          window.dispatchEvent(new CustomEvent('supplier-payment-recorded', {
            detail: {
              supplierId,
              amount: amountNum,
              type: 'credit'
            }
          }));
        } else {
          toast.error(data.error || 'Failed to add credit transaction');
        }
      }
    } catch (error) {
      console.error('Failed to add credit:', error);
      toast.error('Failed to add credit transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      transactionType: 'admin_credit',
      amount: '',
      description: '',
      paymentMethod: '',
      reference: '',
      selectedChequeId: '',
      chequeOption: 'existing',
    });
    setNewChequeData({
      chequeNumber: '',
      amount: '',
      payerName: '',
      bankName: '',
      chequeDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowCreateChequeDialog(false);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Credit/Debit</DialogTitle>
          <DialogDescription>
            {formData.transactionType === 'admin_credit' ? (
              <>Add old outstanding balance (debts from the past) for <strong>{supplierName}</strong></>
            ) : (
              <>Record a payment to <strong>{supplierName}</strong> using FIFO allocation (oldest credits paid first)</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select
              value={formData.transactionType}
              onValueChange={(value) =>
                setFormData({ ...formData, transactionType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_credit">
                  📈 Add Outstanding (We owe supplier more)
                </SelectItem>
                <SelectItem value="debit">
                  💰 Record Payment (We paid supplier)
                </SelectItem>
              </SelectContent>
            </Select>
            <div className={`text-xs mt-1 p-2 rounded ${
              formData.transactionType === 'admin_credit'
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {formData.transactionType === 'admin_credit'
                ? '🔴 Increases outstanding balance - We will owe the supplier MORE'
                : '🟢 Decreases outstanding balance - We will owe the supplier LESS'}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center justify-between">
              <span className="flex items-center">
                Amount ($)
                {formData.transactionType === 'admin_credit' && (
                  <span className="text-red-600 ml-2 text-lg font-bold">↑ +</span>
                )}
                {formData.transactionType === 'debit' && (
                  <span className="text-green-600 ml-2 text-lg font-bold">↓ -</span>
                )}
              </span>
              {formData.transactionType === 'debit' && currentBalance > 0 && (
                <span className="text-xs text-gray-500">
                  Max: LKR {currentBalance.toFixed(2)}
                </span>
              )}
            </Label>
            <div className="relative flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={formData.transactionType === 'debit' && currentBalance > 0 ? currentBalance : undefined}
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                disabled={loading}
                className={`text-lg font-semibold flex-1 ${
                  formData.amount && formData.transactionType === 'admin_credit'
                    ? 'border-red-300 focus:border-red-500'
                    : formData.amount && formData.transactionType === 'debit'
                    ? 'border-green-300 focus:border-green-500'
                    : ''
                }`}
              />
              {formData.transactionType === 'debit' && currentBalance > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, amount: currentBalance.toFixed(2) })}
                  disabled={loading}
                  className="whitespace-nowrap"
                >
                  Max
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-600 font-medium">
              {formData.transactionType === 'debit' && currentBalance > 0
                ? `Enter amount to pay (maximum LKR ${currentBalance.toFixed(2)}). The system will apply - automatically.`
                : 'Enter the amount only. The system will apply + or - automatically.'}
            </p>
            {formData.transactionType === 'debit' && currentBalance <= 0 && (
              <p className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded">
                ⚠️ No outstanding balance. Cannot make payment at this time.
              </p>
            )}
          </div>

          {/* Payment Method - Only show for debit (payment) */}
          {formData.transactionType === 'debit' && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">💵 Cash</SelectItem>
                  <SelectItem value="Cheque">📋 Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                  <SelectItem value="Online Payment">💳 Online Payment</SelectItem>
                  <SelectItem value="Manual Entry">✍️ Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cheque Selector - Only show when Cheque is selected */}
          {formData.transactionType === 'debit' && formData.paymentMethod === 'Cheque' && (
            <div className="space-y-3">
              {/* Cheque Type Selection */}
              <div className="space-y-2">
                <Label>Cheque Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="chequeOption"
                      value="existing"
                      checked={formData.chequeOption === 'existing'}
                      onChange={(e) => setFormData({ ...formData, chequeOption: e.target.value as 'existing' | 'new' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Use Existing Cheque</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="chequeOption"
                      value="new"
                      checked={formData.chequeOption === 'new'}
                      onChange={(e) => setFormData({ ...formData, chequeOption: e.target.value as 'existing' | 'new' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Create New Cheque</span>
                  </label>
                </div>
              </div>

              {/* Existing Cheque Selection */}
              {formData.chequeOption === 'existing' && (
                <div className="space-y-2">
                  <Label>Select Cheque</Label>
                  {loadingCheques ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading cheques...</span>
                    </div>
                  ) : availableCheques.length > 0 ? (
                    <Select
                      value={formData.selectedChequeId}
                      onValueChange={(value) => {
                        const selectedCheque = availableCheques.find(c => c.id.toString() === value);
                        setFormData({
                          ...formData,
                          selectedChequeId: value,
                          amount: selectedCheque ? selectedCheque.amount.toFixed(2) : formData.amount,
                          reference: selectedCheque ? selectedCheque.chequeNumber : formData.reference,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cheque" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCheques.map((cheque) => (
                          <SelectItem key={cheque.id} value={cheque.id.toString()}>
                            {cheque.chequeNumber} - ${cheque.amount.toFixed(2)} ({cheque.payerName} / {cheque.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                      No available cheques found. Please create a new cheque or select "Create New Cheque" option above.
                    </div>
                  )}
                </div>
              )}

              {/* New Cheque Form - Inline */}
              {formData.chequeOption === 'new' && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">New Cheque Details</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="newChequeNumber" className="text-xs">Cheque Number *</Label>
                      <Input
                        id="newChequeNumber"
                        placeholder="CHQ-123456"
                        value={newChequeData.chequeNumber}
                        onChange={(e) => setNewChequeData({ ...newChequeData, chequeNumber: e.target.value })}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newChequeAmount" className="text-xs">Amount ($) *</Label>
                      <Input
                        id="newChequeAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={newChequeData.amount}
                        onChange={(e) => {
                          setNewChequeData({ ...newChequeData, amount: e.target.value });
                          setFormData({ ...formData, amount: e.target.value });
                        }}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newPayerName" className="text-xs">Payer Name *</Label>
                      <Input
                        id="newPayerName"
                        placeholder="John Doe"
                        value={newChequeData.payerName}
                        onChange={(e) => setNewChequeData({ ...newChequeData, payerName: e.target.value })}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newBankName" className="text-xs">Bank Name *</Label>
                      <Input
                        id="newBankName"
                        placeholder="Commercial Bank"
                        value={newChequeData.bankName}
                        onChange={(e) => setNewChequeData({ ...newChequeData, bankName: e.target.value })}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newChequeDate" className="text-xs">Cheque Date</Label>
                      <Input
                        id="newChequeDate"
                        type="date"
                        value={newChequeData.chequeDate}
                        onChange={(e) => setNewChequeData({ ...newChequeData, chequeDate: e.target.value })}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="newChequeNotes" className="text-xs">Notes (Optional)</Label>
                      <Textarea
                        id="newChequeNotes"
                        placeholder="Additional notes..."
                        value={newChequeData.notes}
                        onChange={(e) => setNewChequeData({ ...newChequeData, notes: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-800">
                      💡 This cheque will be created and endorsed to {supplierName} for payment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Number - Only show for debit (payment) */}
          {formData.transactionType === 'debit' && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                type="text"
                placeholder="e.g., CHQ-12345, TXN-67890"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Enter check number, transaction ID, or receipt number
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {formData.transactionType === 'debit' ? 'Payment Notes' : 'Description'}
            </Label>
            <Textarea
              id="description"
              placeholder={
                formData.transactionType === 'debit'
                  ? 'Enter payment notes (e.g., "Payment for invoices #123, #456")...'
                  : 'Enter reason for adding outstanding balance (e.g., "Old debts from before system implementation")...'
              }
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              {formData.transactionType === 'debit'
                ? 'Describe what this payment is for (will use FIFO to pay oldest credits first)'
                : 'Provide a clear description for audit purposes'}
            </p>
          </div>

          {/* Preview */}
          {formData.amount && (
            <div className={`p-4 rounded-lg border-2 ${
              formData.transactionType === 'admin_credit'
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                {formData.transactionType === 'admin_credit' ? '📈' : '💰'}
                <span className="ml-2">Transaction Preview:</span>
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Type:</span>
                  <span className={`font-bold text-sm px-3 py-1 rounded ${
                    formData.transactionType === 'admin_credit'
                      ? 'bg-red-200 text-red-900'
                      : 'bg-green-200 text-green-900'
                  }`}>
                    {formData.transactionType === 'admin_credit'
                      ? 'ADD OUTSTANDING'
                      : 'PAYMENT (FIFO)'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-sm text-gray-700 font-medium">Impact on Balance:</span>
                  <span
                    className={`font-bold text-2xl ${
                      formData.transactionType === 'admin_credit'
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}
                  >
                    {formData.transactionType === 'admin_credit' ? '+' : '-'}LKR{' '}
                    {parseFloat(formData.amount || '0').toFixed(2)}
                  </span>
                </div>
                <div className="text-xs pt-2 border-t border-gray-300">
                  {formData.transactionType === 'admin_credit' ? (
                    <div className="text-center">
                      <span className="text-red-700 font-medium">
                        ⚠️ Outstanding will INCREASE by LKR {parseFloat(formData.amount || '0').toFixed(2)}
                      </span>
                      <p className="mt-1 text-gray-600">
                        Use this for old debts from before the system was implemented
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-md p-3 border border-green-300 space-y-2.5">
                      <div className="text-green-700 font-semibold text-center text-sm">
                        ✓ Outstanding will DECREASE by LKR {parseFloat(formData.amount || '0').toFixed(2)}
                      </div>
                      <div className="text-left space-y-1.5">
                        <p className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                          <span>🎯</span>
                          <span>How FIFO Payment Works:</span>
                        </p>
                        <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-700 leading-relaxed">
                          <li className="pl-1">Finds oldest unpaid credits (FIFO order)</li>
                          <li className="pl-1">Pays them chronologically from oldest to newest</li>
                          <li className="pl-1">Updates PO "Due" amounts automatically</li>
                          <li className="pl-1">Creates detailed payment allocation records</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? (formData.transactionType === 'debit' ? 'Recording Payment...' : 'Adding...')
                : (formData.transactionType === 'debit' ? 'Record Payment (FIFO)' : 'Add Credit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    </>
  );
}
