'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Receipt, RefreshCw } from 'lucide-react';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  finalTotal: number;
  netWeightKg: number;
}

interface Order {
  id: number;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  orderItems: OrderItem[];
  customer?: {
    id: number;
    name: string;
  };
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  cashierId: number;
  onSuccess?: () => void;
}

interface RefundItem {
  orderItemId: number;
  productName: string;
  quantityReturned: number;
  maxQuantity: number;
  unitPrice: number;
  refundAmount: number;
  restockQuantity: number;
}

export default function RefundDialog({ open, onOpenChange, order, cashierId, onSuccess }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

  // Initialize refund items when order changes
  useEffect(() => {
    if (order && order.orderItems) {
      const initialItems: RefundItem[] = order.orderItems.map(item => ({
        orderItemId: item.id,
        productName: item.productName,
        quantityReturned: refundType === 'full' ? item.quantity : 0,
        maxQuantity: item.quantity,
        unitPrice: item.unitPrice,
        refundAmount: refundType === 'full' ? item.finalTotal : 0,
        restockQuantity: refundType === 'full' ? item.netWeightKg : 0,
      }));
      setRefundItems(initialItems);

      // Set initial partial amount for full refund
      if (refundType === 'full') {
        setPartialAmount(order.total.toFixed(2));
      }
    }
  }, [order, refundType]);

  // Update refund items when refund type changes
  useEffect(() => {
    if (order && refundItems.length > 0) {
      if (refundType === 'full') {
        setRefundItems(prev => prev.map(item => ({
          ...item,
          quantityReturned: item.maxQuantity,
          refundAmount: item.maxQuantity * item.unitPrice,
          restockQuantity: item.maxQuantity, // Assuming 1:1 ratio for simplicity
        })));
        setPartialAmount(order.total.toFixed(2));
      } else {
        setRefundItems(prev => prev.map(item => ({
          ...item,
          quantityReturned: 0,
          refundAmount: 0,
          restockQuantity: 0,
        })));
        setPartialAmount('');
      }
    }
  }, [refundType, order]);

  const updateRefundItem = (orderItemId: number, quantityReturned: number) => {
    setRefundItems(prev => prev.map(item => {
      if (item.orderItemId === orderItemId) {
        const newQuantity = Math.min(Math.max(0, quantityReturned), item.maxQuantity);
        const refundAmount = newQuantity * item.unitPrice;
        const restockQuantity = newQuantity; // Assuming 1:1 ratio

        return {
          ...item,
          quantityReturned: newQuantity,
          refundAmount,
          restockQuantity,
        };
      }
      return item;
    }));

    // Update partial amount
    const totalRefundAmount = refundItems
      .map(item => item.orderItemId === orderItemId
        ? Math.min(Math.max(0, quantityReturned), refundItems.find(i => i.orderItemId === orderItemId)?.maxQuantity || 0) * (refundItems.find(i => i.orderItemId === orderItemId)?.unitPrice || 0)
        : item.refundAmount)
      .reduce((sum, amount) => sum + amount, 0);

    setPartialAmount(totalRefundAmount.toFixed(2));
  };

  const handlePartialAmountChange = (value: string) => {
    setPartialAmount(value);

    // For partial refunds by amount, we need to distribute the amount across items
    const targetAmount = parseFloat(value) || 0;
    if (targetAmount > 0 && order) {
      const totalOrderAmount = order.total;
      const ratio = targetAmount / totalOrderAmount;

      setRefundItems(prev => prev.map(item => {
        const proratedQuantity = item.maxQuantity * ratio;
        const quantityReturned = Math.min(proratedQuantity, item.maxQuantity);
        const refundAmount = quantityReturned * item.unitPrice;
        const restockQuantity = quantityReturned;

        return {
          ...item,
          quantityReturned,
          refundAmount,
          restockQuantity,
        };
      }));
    }
  };

  const totalRefundAmount = refundItems.reduce((sum, item) => sum + item.refundAmount, 0);

  const handleSubmit = async () => {
    if (!order) return;

    // Check permissions
    if (!permissions?.canProcessRefunds) {
      toast.error('You do not have permission to process refunds');
      return;
    }

    if (refundType === 'partial' && parseFloat(partialAmount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    setLoading(true);
    try {
      const refundData = {
        originalOrderId: order.id,
        cashierId,
        customerId: order.customer?.id,
        refundType,
        reason: reason.trim(),
        totalAmount: refundType === 'partial' ? parseFloat(partialAmount) : order.total,
        refundMethod,
        status: 'completed',
        notes: notes.trim() || undefined,
        refundItems: refundItems
          .filter(item => item.quantityReturned > 0)
          .map(item => ({
            orderItemId: item.orderItemId,
            productId: order.orderItems.find(oi => oi.id === item.orderItemId)?.productId,
            productName: item.productName,
            quantityReturned: item.quantityReturned,
            refundAmount: item.refundAmount,
            restockQuantity: item.restockQuantity,
            condition: 'good',
          })),
      };

      const result = await fetch('/api/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      toast.success(`Refund processed successfully! Refund #${data.refundNumber}`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setRefundType('full');
      setRefundItems([]);
      setReason('');
      setRefundMethod('cash');
      setNotes('');
      setPartialAmount('');

    } catch (error: any) {
      console.error('Refund error:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Process Refund - Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Process a refund for this order. Choose between full or partial refund.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Order #{order.orderNumber}</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} • {order.customer?.name || 'Walk-in Customer'}
                </p>
              </div>
              <Badge variant="outline">LKR {order.total.toFixed(2)}</Badge>
            </div>
            <div className="text-sm">
              <span className="font-medium">Payment Method:</span> {order.paymentMethod}
            </div>
          </div>

          {/* Refund Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Refund Type</Label>
            <RadioGroup value={refundType} onValueChange={(value) => setRefundType(value as 'full' | 'partial')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="cursor-pointer">
                  Full Refund - Return all items (LKR {order.total.toFixed(2)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="cursor-pointer">
                  Partial Refund - Return specific amount
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Amount Input */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="partialAmount">Refund Amount (LKR)</Label>
              <Input
                id="partialAmount"
                type="number"
                step="0.01"
                min="0"
                max={order.total.toFixed(2)}
                value={partialAmount}
                onChange={(e) => handlePartialAmountChange(e.target.value)}
                placeholder="Enter refund amount"
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Maximum refund amount: LKR {order.total.toFixed(2)}
              </p>
            </div>
          )}

          {/* Refund Items */}
          {refundType === 'partial' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Items to Return</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {refundItems.map((item) => (
                  <div key={item.orderItemId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        Unit Price: LKR {item.unitPrice.toFixed(2)} • Max Qty: {item.maxQuantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qty-${item.orderItemId}`} className="text-sm">
                        Return Qty:
                      </Label>
                      <Input
                        id={`qty-${item.orderItemId}`}
                        type="number"
                        step="0.001"
                        min="0"
                        max={item.maxQuantity}
                        value={item.quantityReturned}
                        onChange={(e) => updateRefundItem(item.orderItemId, parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <div className="text-sm text-muted-foreground w-24 text-right">
                        LKR {item.refundAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Refund Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refund *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="defective_product">Defective Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                  <SelectItem value="duplicate_order">Duplicate Order</SelectItem>
                  <SelectItem value="changed_mind">Changed Mind</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refundMethod">Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about the refund..."
              rows={3}
            />
          </div>

          {/* Refund Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Refund Summary</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {refundType === 'full' ? 'Full refund' : 'Partial refund'} • {refundMethod}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  LKR {totalRefundAmount.toFixed(2)}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {refundItems.filter(item => item.quantityReturned > 0).length} items
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || totalRefundAmount <= 0}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                Process Refund
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
