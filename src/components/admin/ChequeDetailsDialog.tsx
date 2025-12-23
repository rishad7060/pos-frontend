'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  TrendingUp,
  TrendingDown,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format } from 'date-fns';

interface ChequeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: any;
  onUpdate: () => void;
}

export default function ChequeDetailsDialog({
  open,
  onOpenChange,
  cheque,
  onUpdate,
}: ChequeDetailsDialogProps) {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(cheque.status);
  const [depositDate, setDepositDate] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
  const [bounceDate, setBounceDate] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [notes, setNotes] = useState(cheque.notes || '');
  const [endorseTo, setEndorseTo] = useState('');
  const [endorseNotes, setEndorseNotes] = useState('');

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus,
        notes,
      };

      if (depositDate) updateData.depositDate = depositDate;
      if (clearanceDate) updateData.clearanceDate = clearanceDate;
      if (bounceDate) updateData.bounceDate = bounceDate;
      if (bounceReason) updateData.bounceReason = bounceReason;

      const response = await fetchWithAuth(`/api/cheques/${cheque.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Cheque status updated successfully');
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update cheque status');
      }
    } catch (error) {
      console.error('Failed to update cheque status:', error);
      toast.error('Failed to update cheque status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    try {
      setUpdating(true);

      const response = await fetchWithAuth(`/api/cheques/${cheque.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: bounceReason || 'Cancelled by admin' }),
      });

      if (response.ok) {
        toast.success('Cheque cancelled successfully');
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to cancel cheque');
      }
    } catch (error) {
      console.error('Failed to cancel cheque:', error);
      toast.error('Failed to cancel cheque');
    } finally {
      setUpdating(false);
    }
  };

  const handleEndorse = async () => {
    if (!endorseTo.trim()) {
      toast.error('Please enter party name to endorse to');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetchWithAuth(`/api/cheques/${cheque.id}/endorse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endorsedTo: endorseTo,
          notes: endorseNotes || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Cheque endorsed successfully');
        setEndorseTo('');
        setEndorseNotes('');
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to endorse cheque');
      }
    } catch (error) {
      console.error('Failed to endorse cheque:', error);
      toast.error('Failed to endorse cheque');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; icon: any }> = {
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      deposited: { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUp },
      cleared: { className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      bounced: { className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      cancelled: { className: 'bg-gray-100 text-gray-800 border-gray-200', icon: Ban },
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <FileText className="h-6 w-6" />
            <span>Cheque Details</span>
            {getStatusBadge(cheque.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Cheque Number</Label>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="font-mono font-bold text-lg">{cheque.chequeNumber}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Amount</Label>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="font-bold text-2xl text-green-600">${cheque.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Cheque Date</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{format(new Date(cheque.chequeDate), 'MMMM dd, yyyy')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Transaction Type</Label>
              <div className="flex items-center space-x-2">
                {cheque.transactionType === 'received' ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">Received (from customer)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-600">Issued (to supplier)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Bank Name</Label>
                <p className="font-medium">{cheque.bankName}</p>
              </div>

              {cheque.branchName && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Branch</Label>
                  <p className="font-medium">{cheque.branchName}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-gray-600">{cheque.transactionType === 'received' ? 'Payer Name' : 'Issuer Name'}</Label>
                <p className="font-medium">{cheque.payerName}</p>
              </div>

              {cheque.payeeName && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Payee Name</Label>
                  <p className="font-medium">{cheque.payeeName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Related Entities */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Related Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cheque.customer && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Customer</Label>
                  <p className="font-medium">{cheque.customer.name}</p>
                  {cheque.customer.phone && (
                    <p className="text-sm text-gray-500">{cheque.customer.phone}</p>
                  )}
                </div>
              )}

              {cheque.supplier && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Supplier</Label>
                  <p className="font-medium">{cheque.supplier.name}</p>
                  {cheque.supplier.phone && (
                    <p className="text-sm text-gray-500">{cheque.supplier.phone}</p>
                  )}
                </div>
              )}

              {cheque.order && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Order</Label>
                  <p className="font-medium">{cheque.order.orderNumber}</p>
                  <p className="text-sm text-gray-500">Total: ${cheque.order.total.toFixed(2)}</p>
                </div>
              )}

              {cheque.purchasePayment?.purchase && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Purchase</Label>
                  <p className="font-medium">{cheque.purchasePayment.purchase.purchaseNumber}</p>
                  <p className="text-sm text-gray-500">Total: ${cheque.purchasePayment.purchase.total.toFixed(2)}</p>
                </div>
              )}

              {cheque.user && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Recorded By</Label>
                  <p className="font-medium">{cheque.user.fullName}</p>
                  <p className="text-sm text-gray-500">{format(new Date(cheque.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {cheque.approver && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Approved By</Label>
                  <p className="font-medium">{cheque.approver.fullName}</p>
                  <p className="text-sm text-gray-500">{format(new Date(cheque.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {cheque.depositReminderDate && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Deposit Reminder</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{format(new Date(cheque.depositReminderDate), 'MMM dd, yyyy')}</span>
                    {new Date(cheque.depositReminderDate) <= new Date() && cheque.status === 'pending' && (
                      <Badge className="bg-orange-100 text-orange-800">Reminder Due!</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {(cheque.receivedDate || cheque.depositDate || cheque.clearanceDate || cheque.bounceDate) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Timeline</h3>
              <div className="space-y-2">
                {cheque.receivedDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Received:</span>
                    <span className="font-medium">{format(new Date(cheque.receivedDate), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                {cheque.depositDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">Deposited:</span>
                    <span className="font-medium">{format(new Date(cheque.depositDate), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                {cheque.clearanceDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Cleared:</span>
                    <span className="font-medium">{format(new Date(cheque.clearanceDate), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                {cheque.bounceDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-gray-600">Bounced:</span>
                    <span className="font-medium">{format(new Date(cheque.bounceDate), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Update Status Section */}
          {cheque.status !== 'cleared' && cheque.status !== 'cancelled' && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Update Status</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deposited">Deposited</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === 'deposited' && (
                  <div className="space-y-2">
                    <Label>Deposit Date</Label>
                    <Input
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                    />
                  </div>
                )}

                {newStatus === 'cleared' && (
                  <div className="space-y-2">
                    <Label>Clearance Date</Label>
                    <Input
                      type="date"
                      value={clearanceDate}
                      onChange={(e) => setClearanceDate(e.target.value)}
                    />
                  </div>
                )}

                {newStatus === 'bounced' && (
                  <>
                    <div className="space-y-2">
                      <Label>Bounce Date</Label>
                      <Input
                        type="date"
                        value={bounceDate}
                        onChange={(e) => setBounceDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bounce Reason</Label>
                      <Input
                        placeholder="Insufficient funds, signature mismatch, etc."
                        value={bounceReason}
                        onChange={(e) => setBounceReason(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updating || newStatus === cheque.status}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>

                  {cheque.status !== 'cleared' && (
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={updating}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Cheque
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Endorsement Section - Only for received pending cheques */}
          {cheque.transactionType === 'received' &&
           cheque.status === 'pending' &&
           !cheque.isEndorsed && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Endorse Cheque
              </h3>
              <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Transfer this cheque to pay a supplier or another party
                </p>
                <div className="space-y-2">
                  <Label>Endorse To (Name) *</Label>
                  <Input
                    placeholder="Enter party name"
                    value={endorseTo}
                    onChange={(e) => setEndorseTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Reason for endorsement"
                    value={endorseNotes}
                    onChange={(e) => setEndorseNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleEndorse}
                  disabled={updating || !endorseTo.trim()}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {updating ? 'Endorsing...' : 'Endorse Cheque'}
                </Button>
              </div>
            </div>
          )}

          {/* Show Endorsement Info if Already Endorsed */}
          {cheque.isEndorsed && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 text-blue-600">Cheque Endorsed</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-600">
                <p className="text-sm"><span className="font-medium">Endorsed To:</span> {cheque.endorsedTo}</p>
                {cheque.endorsedDate && (
                  <p className="text-sm text-muted-foreground">
                    On {format(new Date(cheque.endorsedDate), 'MMM dd, yyyy HH:mm')}
                  </p>
                )}
                {cheque.endorsedByUser && (
                  <p className="text-sm text-muted-foreground">
                    By {cheque.endorsedByUser.fullName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Current Notes */}
          {cheque.notes && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{cheque.notes}</p>
            </div>
          )}

          {/* Bounce Reason */}
          {cheque.bounceReason && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 text-red-600">Bounce Reason</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded border-l-2 border-red-400">
                {cheque.bounceReason}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
