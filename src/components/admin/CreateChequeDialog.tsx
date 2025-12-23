'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface CreateChequeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateChequeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateChequeDialogProps) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    chequeNumber: '',
    chequeDate: new Date().toISOString().split('T')[0],
    depositReminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    amount: '',
    payerName: '',
    payeeName: '',
    bankName: '',
    branchName: '',
    transactionType: 'received',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chequeNumber.trim()) {
      toast.error('Please enter cheque number');
      return;
    }
    if (!formData.chequeDate) {
      toast.error('Please select cheque date');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter valid amount');
      return;
    }
    if (!formData.payerName.trim()) {
      toast.error('Please enter payer name');
      return;
    }
    if (!formData.bankName.trim()) {
      toast.error('Please enter bank name');
      return;
    }

    try {
      setCreating(true);

      const response = await fetchWithAuth('/api/cheques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chequeNumber: formData.chequeNumber,
          chequeDate: formData.chequeDate,
          depositReminderDate: formData.depositReminderDate || null,
          amount: parseFloat(formData.amount),
          payerName: formData.payerName,
          payeeName: formData.payeeName || null,
          bankName: formData.bankName,
          branchName: formData.branchName || null,
          transactionType: formData.transactionType,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        toast.success('Cheque created successfully');
        setFormData({
          chequeNumber: '',
          chequeDate: new Date().toISOString().split('T')[0],
          depositReminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: '',
          payerName: '',
          payeeName: '',
          bankName: '',
          branchName: '',
          transactionType: 'received',
          notes: '',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create cheque');
      }
    } catch (error) {
      console.error('Failed to create cheque:', error);
      toast.error('Failed to create cheque');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Standalone Cheque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type *</Label>
            <Select
              value={formData.transactionType}
              onValueChange={(value) => setFormData({ ...formData, transactionType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span>Received (from customer)</span>
                  </div>
                </SelectItem>
                <SelectItem value="issued">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span>Issued (to supplier)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select whether this cheque was received from a customer or issued to a supplier
            </p>
          </div>

          {/* Cheque Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chequeNumber">Cheque Number *</Label>
              <Input
                id="chequeNumber"
                placeholder="Enter cheque number"
                value={formData.chequeNumber}
                onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chequeDate">Cheque Date *</Label>
              <Input
                id="chequeDate"
                type="date"
                value={formData.chequeDate}
                onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositReminderDate">Deposit Reminder Date</Label>
              <Input
                id="depositReminderDate"
                type="date"
                value={formData.depositReminderDate}
                onChange={(e) => setFormData({ ...formData, depositReminderDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                When to deposit this cheque at bank
              </p>
            </div>
          </div>

          {/* Payer/Payee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payerName">
                {formData.transactionType === 'received' ? 'Payer Name (Customer)' : 'Payer Name (Our Company)'} *
              </Label>
              <Input
                id="payerName"
                placeholder="Name on cheque"
                value={formData.payerName}
                onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payeeName">
                {formData.transactionType === 'received' ? 'Payee Name (Our Company)' : 'Payee Name (Supplier)'}
              </Label>
              <Input
                id="payeeName"
                placeholder="Pay to the order of"
                value={formData.payeeName}
                onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                placeholder="Bank name"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                placeholder="Branch name (optional)"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              <Save className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Cheque'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
