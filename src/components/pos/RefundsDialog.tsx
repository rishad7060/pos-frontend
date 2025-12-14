'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, RotateCcw, AlertTriangle, CheckCircle2, Package, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  orderNumber: string;
  total: number;
  createdAt: string;
  status: string;
}

interface OrderItem {
  id: number;
  itemName: string;
  netWeightKg: number;
  finalTotal: number;
  productId: number | null;
}

interface RefundableItem {
  orderItemId: number;
  productId: number | null;
  productName: string;
  originalQuantity: number;
  alreadyRefundedQuantity: number;
  refundableQuantity: number;
  pricePerKg: number;
  originalTotal: number;
  maxRefundAmount: number;
  isFullyRefunded: boolean;
}

interface RefundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashierId: number;
  canProcessRefunds: boolean;
  canAutoApproveRefunds?: boolean;
  registrySessionId?: number; // TEAM_003: Filter orders by registry session ID
}

export function RefundsDialog({ open, onOpenChange, cashierId, canProcessRefunds, canAutoApproveRefunds = false, registrySessionId }: RefundsDialogProps) {
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundableItems, setRefundableItems] = useState<RefundableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recent orders states
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [showSearchFilters, setShowSearchFilters] = useState(false);

  const [formData, setFormData] = useState({
    refundType: 'full',
    refundAmount: 0,
    reason: '',
    refundMethod: 'cash',
    items: [] as {
      orderItemId: number;
      productId: number | null;
      productName: string;
      quantityReturned: number;
      maxQuantity: number;
      alreadyRefunded: number;
      refundAmount: number;
      condition: string;
    }[]
  });

  useEffect(() => {
    if (open && !selectedOrder) {
      // Fetch recent orders when dialog opens
      fetchRecentOrders(ordersLimit);
    }

    if (!open) {
      // Reset form when dialog closes
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSearchOrderNumber('');
    setSelectedOrder(null);
    setRefundableItems([]);
    setRecentOrders([]);
    setOrdersLimit(10);
    setShowSearchFilters(false);
    setFormData({
      refundType: 'full',
      refundAmount: 0,
      reason: '',
      refundMethod: 'cash',
      items: []
    });
  };

  const fetchRecentOrders = async (limit: number) => {
    setLoadingOrders(true);
    try {
      // TEAM_003: Filter orders by registry session
      let url = `/api/orders?status=completed&limit=${limit}`;
      if (registrySessionId) {
        // Only show orders belonging to the current registry session
        url += `&registrySessionId=${registrySessionId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch recent orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchRefundableItems = async (orderId: number) => {
    try {
      const response = await fetch(`/api/refunds/refundable-items?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        return data.items as RefundableItem[];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch refundable items:', error);
      return [];
    }
  };

  const selectRecentOrder = async (order: Order) => {
    setLoading(true);
    try {
      // Fetch refundable items (shows remaining quantities after previous refunds)
      const items = await fetchRefundableItems(order.id);

      // Check if order is already fully refunded
      const hasRefundableItems = items.some(item => item.refundableQuantity > 0);
      if (!hasRefundableItems) {
        toast.error('This order has already been fully refunded');
        return;
      }

      setSelectedOrder(order);
      setRefundableItems(items);

      // Pre-fill items for refund (using refundable quantities, not original)
      const refundItems = items
        .filter(item => !item.isFullyRefunded)
        .map(item => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          quantityReturned: item.refundableQuantity, // Default to max refundable
          maxQuantity: item.refundableQuantity,
          alreadyRefunded: item.alreadyRefundedQuantity,
          refundAmount: item.maxRefundAmount,
          condition: 'good'
        }));

      setFormData(prev => ({ ...prev, items: refundItems }));
      toast.success('Order selected');
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const searchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders?orderNumber=${searchOrderNumber.trim()}`);

      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data = await response.json();

      // TEAM_003: Check if order belongs to current registry session
      if (registrySessionId && data.order.registrySessionId && data.order.registrySessionId !== registrySessionId) {
        toast.error('This order belongs to a different registry session and cannot be refunded here.');
        return;
      }

      // If order has no session ID but we require one (shouldn't happen for new orders, but possible for legacy)
      // We'll allow legacy orders if they fall within the session timeframe, but here we just check ID match if both exist.

      if (data.order.status !== 'completed') {
        toast.error('Only completed orders can be refunded');
        setSelectedOrder(null);
        setRefundableItems([]);
        return;
      }

      // Fetch refundable items
      const items = await fetchRefundableItems(data.order.id);

      // Check if order is already fully refunded
      const hasRefundableItems = items.some(item => item.refundableQuantity > 0);
      if (!hasRefundableItems) {
        toast.error('This order has already been fully refunded');
        return;
      }

      setSelectedOrder(data.order);
      setRefundableItems(items);

      // Pre-fill items for refund
      const refundItems = items
        .filter(item => !item.isFullyRefunded)
        .map(item => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          quantityReturned: item.refundableQuantity,
          maxQuantity: item.refundableQuantity,
          alreadyRefunded: item.alreadyRefundedQuantity,
          refundAmount: item.maxRefundAmount,
          condition: 'good'
        }));

      setFormData(prev => ({ ...prev, items: refundItems }));
      toast.success('Order found');
    } catch (error) {
      toast.error('Order not found. Please check the order number.');
      setSelectedOrder(null);
      setRefundableItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateItemCondition = (index: number, condition: string) => {
    const newItems = [...formData.items];
    newItems[index].condition = condition;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    const maxQuantity = item.maxQuantity;

    if (quantity > maxQuantity) {
      toast.error(`Maximum refundable quantity is ${maxQuantity.toFixed(3)} kg (already refunded: ${item.alreadyRefunded.toFixed(3)} kg)`);
      return;
    }

    const refundableItem = refundableItems.find(ri => ri.orderItemId === item.orderItemId);
    const pricePerKg = refundableItem?.pricePerKg || 0;

    newItems[index].quantityReturned = quantity;
    newItems[index].refundAmount = quantity * pricePerKg;
    setFormData({ ...formData, items: newItems });
  };

  const loadMoreOrders = () => {
    const newLimit = ordersLimit + 20;
    setOrdersLimit(newLimit);
    fetchRecentOrders(newLimit);
  };

  const calculateTotalRefund = () => {
    if (formData.refundType === 'partial' && formData.refundAmount > 0) {
      return formData.refundAmount;
    }
    return formData.items.reduce((sum, item) => sum + item.refundAmount, 0);
  };

  const handleSubmit = async () => {
    if (!canProcessRefunds) {
      toast.error('You do not have permission to process refunds');
      return;
    }

    if (!selectedOrder) {
      toast.error('Please select an order first');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    const validItems = formData.items.filter(item => item.quantityReturned > 0);
    if (validItems.length === 0) {
      toast.error('Please select at least one item to refund');
      return;
    }

    // Validate refund amount for partial refunds
    if (formData.refundType === 'partial') {
      const amount = formData.refundAmount;
      if (amount <= 0) {
        toast.error('Please enter a valid refund amount greater than 0');
        return;
      }
      const maxRefundable = formData.items.reduce((sum, item) => sum + (item.maxQuantity * (refundableItems.find(ri => ri.orderItemId === item.orderItemId)?.pricePerKg || 0)), 0);
      if (amount > maxRefundable) {
        toast.error(`Refund amount cannot exceed maximum refundable amount: LKR ${maxRefundable.toFixed(2)}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const totalAmount = calculateTotalRefund();

      const refundData = {
        originalOrderId: selectedOrder.id,
        cashierId,
        refundType: formData.refundType,
        reason: formData.reason.trim(),
        totalAmount,
        refundMethod: formData.refundMethod,
        items: validItems.map(item => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          quantityReturned: item.quantityReturned,
          refundAmount: item.refundAmount,
          restockQuantity: item.condition === 'good' ? item.quantityReturned : 0,
          condition: item.condition
        }))
      };

      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refundData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create refund');
      }

      const result = await response.json();

      // Check if refund was auto-approved or needs admin approval
      if (result.status === 'completed') {
        toast.success(`Refund ${result.refundNumber} approved and processed successfully!`);
      } else {
        toast.success(`Refund request ${result.refundNumber} created! Awaiting admin approval.`);
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create refund');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canProcessRefunds) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refunds</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Permission Required</h3>
            <p className="text-muted-foreground text-sm">
              You do not have permission to process refunds. Please contact your manager.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-6">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Process Refund
          </DialogTitle>
        </DialogHeader>

        {/* Approval Status Info Banner */}
        {canAutoApproveRefunds ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-200/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-green-700 dark:text-green-800">
              <strong>Auto-Approval Enabled:</strong> Your refunds will be processed immediately without admin approval. Stock will be updated for items in good condition.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-200/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-blue-700 dark:text-blue-800">
              <strong>Admin Approval Required:</strong> Refunds will be submitted for admin review. Stock updates will occur only after approval.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {!selectedOrder && (
            <>
              {/* Recent Orders Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    {loadingOrders
                      ? 'Loading recent orders...'
                      : `Showing ${recentOrders.length} most recent completed orders`}
                  </Label>
                </div>

                {loadingOrders ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-2">
                      {recentOrders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No recent orders found</p>
                      ) : (
                        recentOrders.map((order) => (
                          <Card
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => selectRecentOrder(order)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm">{order.orderNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary">LKR {order.total.toFixed(2)}</p>
                                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                    {recentOrders.length >= ordersLimit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadMoreOrders}
                        disabled={loadingOrders}
                        className="w-full"
                      >
                        Load More Orders
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or search by order number</span>
                </div>
              </div>

              {/* Search Filters - Collapsible */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchFilters(!showSearchFilters)}
                  className="w-full"
                >
                  {showSearchFilters ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  {showSearchFilters ? 'Hide' : 'Show'} Search Filters
                </Button>

                {showSearchFilters && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                    <Label>Search by Order Number</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter order number (e.g., ORD-20231225-ABC123)"
                        value={searchOrderNumber}
                        onChange={(e) => setSearchOrderNumber(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
                      />
                      <Button onClick={searchOrder} disabled={loading}>
                        <Search className="h-4 w-4 mr-2" />
                        {loading ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Order Details */}
          {selectedOrder && (
            <>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Order Number</p>
                      <p className="font-semibold">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Date</p>
                      <p className="font-semibold">
                        {new Date(selectedOrder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Original Total</p>
                      <p className="font-semibold">LKR {selectedOrder.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge>{selectedOrder.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetForm}
                    >
                      Select Different Order
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Refund Details */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Refund Type</Label>
                  <Select value={formData.refundType} onValueChange={(val) => setFormData({ ...formData, refundType: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Refund</SelectItem>
                      <SelectItem value="partial">Partial Refund</SelectItem>
                      <SelectItem value="exchange">Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Refund Method</Label>
                  <Select value={formData.refundMethod} onValueChange={(val) => setFormData({ ...formData, refundMethod: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card Reversal</SelectItem>
                      <SelectItem value="credit">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Refund Total</Label>
                  {formData.refundType === 'partial' ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.refundAmount || ''}
                      onChange={(e) => {
                        const amount = Math.max(0, parseFloat(e.target.value) || 0);
                        setFormData({ ...formData, refundAmount: amount });
                      }}
                      placeholder="Enter refund amount"
                      className="font-bold text-lg"
                    />
                  ) : (
                    <div className="h-10 px-3 py-2 rounded-md border bg-muted font-bold text-lg">
                      LKR {calculateTotalRefund().toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Refund *</Label>
                <Textarea
                  placeholder="Enter reason for refund..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Items to Refund */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items to Refund
                </Label>

                {/* Info banner about pending approval */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Refund requires admin approval</p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                      Stock will only be restocked after an admin approves this refund request. Items marked as "Good" will be restocked automatically upon approval.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.items.map((item, index) => {
                    const refundableItem = refundableItems.find(ri => ri.orderItemId === item.orderItemId);

                    return (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.productName}</h4>
                              <p className="text-sm text-muted-foreground">
                                Original: {refundableItem?.originalQuantity.toFixed(3)} kg
                              </p>
                              {item.alreadyRefunded > 0 && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Already refunded: {item.alreadyRefunded.toFixed(3)} kg
                                </p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-64">
                              <div className="space-y-1">
                                <Label className="text-xs">Quantity (kg)</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max={item.maxQuantity}
                                  value={item.quantityReturned}
                                  onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Max: {item.maxQuantity.toFixed(3)} kg
                                </p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Condition</Label>
                                <Select value={item.condition} onValueChange={(val) => updateItemCondition(index, val)}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="good">Good (Restock)</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Refund</p>
                              <p className="font-bold text-primary">LKR {item.refundAmount.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.reason.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit Refund Request
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}