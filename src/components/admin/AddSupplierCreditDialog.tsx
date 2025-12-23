'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
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
  onSuccess: () => void;
}

export default function AddSupplierCreditDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  onSuccess
}: AddSupplierCreditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transactionType: 'admin_credit',
    amount: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum === 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    // Convert amount based on transaction type
    // admin_credit = we owe more (positive)
    // debit = payment made (negative to reduce outstanding)
    if (formData.transactionType === 'debit') {
      amountNum = -Math.abs(amountNum); // Make it negative for payment
    } else {
      amountNum = Math.abs(amountNum); // Make it positive for adding outstanding
    }

    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/supplier-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId,
          transactionType: formData.transactionType,
          amount: amountNum,
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
        });
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to add credit transaction');
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
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Credit/Debit</DialogTitle>
          <DialogDescription>
            Add a manual credit or debit transaction for <strong>{supplierName}</strong>
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
            <Label htmlFor="amount" className="flex items-center">
              Amount ($)
              {formData.transactionType === 'admin_credit' && (
                <span className="text-red-600 ml-2 text-lg font-bold">↑ +</span>
              )}
              {formData.transactionType === 'debit' && (
                <span className="text-green-600 ml-2 text-lg font-bold">↓ -</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                disabled={loading}
                className={`text-lg font-semibold ${
                  formData.amount && formData.transactionType === 'admin_credit'
                    ? 'border-red-300 focus:border-red-500'
                    : formData.amount && formData.transactionType === 'debit'
                    ? 'border-green-300 focus:border-green-500'
                    : ''
                }`}
              />
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Enter the amount only. The system will apply + or - automatically.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter reason or description for this transaction..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Provide a clear description for audit purposes
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
                      : 'PAYMENT MADE'}
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
                    {formData.transactionType === 'admin_credit' ? '+' : '-'}$
                    {parseFloat(formData.amount || '0').toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center pt-2 border-t border-gray-300">
                  {formData.transactionType === 'admin_credit' ? (
                    <span className="text-red-700 font-medium">
                      ⚠️ Outstanding will INCREASE by ${parseFloat(formData.amount || '0').toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-green-700 font-medium">
                      ✓ Outstanding will DECREASE by ${parseFloat(formData.amount || '0').toFixed(2)}
                    </span>
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
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
