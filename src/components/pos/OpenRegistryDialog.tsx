'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wallet, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface OpenRegistryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  onSuccess: (session: any) => void;
}

export const OpenRegistryDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: OpenRegistryDialogProps) => {
  const [openingCash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amount = parseFloat(openingCash);
    
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid opening cash amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/registry-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openedBy: userId,
          openingCash: amount,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'REGISTRY_ALREADY_OPEN') {
          toast.error('A registry is already open. Please use the existing registry or wait for it to be closed.');
        } else {
          toast.error(data.error || 'Failed to open registry');
        }
        return;
      }

      toast.success('Registry opened successfully! All cashiers can now use it.');
      onSuccess(data);
      onOpenChange(false);
      
      // Reset form
      setOpeningCash('');
      setNotes('');
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Open Registry Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Important Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-500 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Shared Registry System</p>
              <p className="text-blue-700 dark:text-blue-300">
                This opens ONE shared registry. All cashiers can use it until someone manually closes it at end of shift.
              </p>
            </div>
          </div>

          {/* Cashier Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Opening registry as</p>
            <p className="font-semibold">{userName}</p>
          </div>

          {/* Opening Cash */}
          <div className="space-y-2">
            <Label htmlFor="openingCash">
              Opening Cash Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="openingCash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the cash amount in the drawer at the start of the day
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Opening Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this registry session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
            disabled={loading || !openingCash}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Opening...
              </>
            ) : (
              'Open Registry'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};