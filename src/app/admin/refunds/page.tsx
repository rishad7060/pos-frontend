'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, RotateCcw, Check, X, Eye, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Refund {
  id: number;
  refundNumber: string;
  originalOrderId: number;
  refundType: string;
  reason: string;
  totalAmount: number;
  refundMethod: string;
  status: string;
  createdAt: string;
}

interface Order {
  id: number;
  orderNumber: string;
  total: number;
  createdAt: string;
  status: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: number;
  productId: number | null;
  itemName: string;
  netWeightKg: number;
  finalTotal: number;
}

export default function RefundsPage() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [refundToReject, setRefundToReject] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Recent orders for quick refund
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Search order states
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchingOrder, setSearchingOrder] = useState(false);

  const [formData, setFormData] = useState({
    refundType: 'full',
    reason: '',
    refundMethod: 'cash',
    items: [] as { orderItemId: number; productId: number | null; productName: string; quantityReturned: number; refundAmount: number; condition: string; }[]
  });

  useEffect(() => {
    fetchData();
    fetchRecentOrders(10); // Load last 10 orders
  }, []);

  const fetchData = async () => {
    try {
      const refundsRes = await fetch('/api/refunds?limit=100');
      if (!refundsRes.ok) {
        throw new Error('Failed to fetch refunds');
      }
      const data = await refundsRes.json();
      if (Array.isArray(data)) {
        setRefunds(Array.isArray(data) ? data : []);
      } else {
        console.error('Expected refunds array but got:', data);
        setRefunds([]);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Fetch refunds error:', error);
      setRefunds([]);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async (limit: number) => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`/api/orders?status=completed&limit=${limit}`);
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

  const selectRecentOrder = async (order: Order) => {
    setSearchingOrder(true);
    try {
      // Fetch full order details with items
      const response = await fetch(`/api/orders?id=${order.id}`);
      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data = await response.json();
      setSearchedOrder(data.order);

      // Pre-fill items for full refund
      const refundItems = data.items.map((item: OrderItem) => ({
        orderItemId: item.id,
        productId: item.productId,
        productName: item.itemName,
        quantityReturned: item.netWeightKg,
        refundAmount: item.finalTotal,
        condition: 'good'
      }));
      setFormData(prev => ({ ...prev, items: refundItems }));

      toast.success('Order selected');
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setSearchingOrder(false);
    }
  };

  const searchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setSearchingOrder(true);
    try {
      const response = await fetch(`/api/orders?orderNumber=${searchOrderNumber.trim()}`);

      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data = await response.json();

      // FIX: Check data.order.status instead of data.status
      if (data.order.status !== 'completed') {
        toast.error('Only completed orders can be refunded');
        setSearchedOrder(null);
        return;
      }

      setSearchedOrder(data.order);

      // Pre-fill items for full refund
      const refundItems = data.items.map((item: OrderItem) => ({
        orderItemId: item.id,
        productId: item.productId,
        productName: item.itemName,
        quantityReturned: item.netWeightKg,
        refundAmount: item.finalTotal,
        condition: 'good'
      }));
      setFormData(prev => ({ ...prev, items: refundItems }));

      toast.success('Order found');
    } catch (error) {
      toast.error('Order not found. Please check the order number.');
      setSearchedOrder(null);
    } finally {
      setSearchingOrder(false);
    }
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (!searchedOrder?.items) return;

    const newItems = [...formData.items];
    const originalItem = searchedOrder.items[index];
    const maxQuantity = originalItem.netWeightKg;

    if (quantity > maxQuantity) {
      toast.error(`Maximum quantity is ${maxQuantity} kg`);
      return;
    }

    newItems[index].quantityReturned = quantity;
    newItems[index].refundAmount = (originalItem.finalTotal / originalItem.netWeightKg) * quantity;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemCondition = (index: number, condition: string) => {
    const newItems = [...formData.items];
    newItems[index].condition = condition;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchedOrder) {
      toast.error('Please search for an order first');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    const validItems = formData.items.filter(item => item.quantityReturned > 0);

    if (validItems.length === 0) {
      toast.error('Add at least one item to refund');
      return;
    }

    try {
      const totalAmount = validItems.reduce((sum, item) => sum + item.refundAmount, 0);

      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalOrderId: searchedOrder.id,
          cashierId: 1, // TODO: Get from session
          refundType: formData.refundType,
          reason: formData.reason.trim(),
          totalAmount,
          refundMethod: formData.refundMethod,
          status: 'pending',
          items: validItems.map(item => ({
            orderItemId: item.orderItemId,
            productId: item.productId,
            productName: item.productName,
            quantityReturned: item.quantityReturned,
            refundAmount: item.refundAmount,
            restockQuantity: item.condition === 'good' ? item.quantityReturned : 0,
            condition: item.condition
          }))
        })
      });

      if (!response.ok) throw new Error();

      toast.success('Refund request created');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create refund');
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Are you sure you want to approve this refund? Stock will be restocked for items in "Good" condition.')) {
      return;
    }
    try {
      const response = await fetch(`/api/refunds?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          approvedBy: 1 // TODO: Get from session
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve refund');
      }

      toast.success('Refund approved! Stock has been updated.');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve refund');
    }
  };

  const openRejectDialog = (id: number) => {
    setRefundToReject(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!refundToReject) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await fetch(`/api/refunds?id=${refundToReject}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          approvedBy: 1, // TODO: Get from session
          rejectReason: rejectReason.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject refund');
      }

      toast.success('Refund rejected');
      setRejectDialogOpen(false);
      setRefundToReject(null);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject refund');
    }
  };

  const viewRefund = async (refund: Refund) => {
    try {
      const response = await fetch(`/api/refunds?id=${refund.id}`);
      const data = await response.json();
      setSelectedRefund(data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load refund details');
    }
  };

  const resetForm = () => {
    setSearchOrderNumber('');
    setSearchedOrder(null);
    setFormData({
      refundType: 'full',
      reason: '',
      refundMethod: 'cash',
      items: []
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
      completed: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
      rejected: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Refunds && Returns</h1>
            <p className="text-sm text-muted-foreground">Manage refund requests</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Refund
        </Button>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <Card key={refund.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <RotateCcw className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{refund.refundNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(refund.createdAt).toLocaleDateString()} • {refund.refundType}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{refund.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Refund Amount</p>
                      <p className="font-bold text-lg text-red-600">LKR {(refund.totalAmount ?? 0).toFixed(2)}</p>
                      <Badge variant="outline" className={`mt-1 ${
                        refund.refundMethod === 'cash' ? 'bg-green-50 text-green-700 border-green-300' :
                        refund.refundMethod === 'card' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                        refund.refundMethod === 'mobile' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                        refund.refundMethod === 'credit' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                        refund.refundMethod === 'cheque' ? 'bg-pink-50 text-pink-700 border-pink-300' :
                        ''
                      }`}>
                        {refund.refundMethod === 'cash' && '💵 Cash'}
                        {refund.refundMethod === 'card' && '💳 Card'}
                        {refund.refundMethod === 'mobile' && '📱 Mobile'}
                        {refund.refundMethod === 'credit' && '🎫 Credit'}
                        {refund.refundMethod === 'cheque' && '📄 Cheque'}
                        {!refund.refundMethod && 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(refund.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewRefund(refund)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {refund.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(refund.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(refund.id)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && refunds.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No refunds found</p>
          </CardContent>
        </Card>
      )}


      {/* Create Refund Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Refund Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!searchedOrder && (
              <>
                {/* Recent Orders Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Recent Completed Orders</Label>
                    {!showAllOrders && recentOrders.length >= 10 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setShowAllOrders(true);
                          fetchRecentOrders(50);
                        }}
                      >
                        Show More Orders
                      </Button>
                    )}
                  </div>

                  {loadingOrders ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                      {recentOrders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No recent orders found</p>
                      ) : (
                        recentOrders.map((order) => (
                          <Card key={order.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => selectRecentOrder(order)}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm">{order.orderNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary">LKR {(order.total ?? 0).toFixed(2)}</p>
                                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
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
              </>
            )}

            {/* Order Search */}
            <div className="space-y-2">
              <Label>Search Order {!searchedOrder && '*'}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter order number (e.g., ORD-20231225-ABC123)"
                  value={searchOrderNumber}
                  onChange={(e) => setSearchOrderNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchOrder())}
                  disabled={!!searchedOrder}
                />
                {searchedOrder ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                ) : (
                  <Button type="button" onClick={searchOrder} disabled={searchingOrder}>
                    <Search className="h-4 w-4 mr-2" />
                    {searchingOrder ? 'Searching...' : 'Search'}
                  </Button>
                )}
              </div>
            </div>

            {/* Order Details */}
            {searchedOrder && (
              <>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Order Number</p>
                        <p className="font-semibold">{searchedOrder.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Order Date</p>
                        <p className="font-semibold">
                          {new Date(searchedOrder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">LKR {(searchedOrder.total ?? 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Refund Type</Label>
                    <Select value={formData.refundType} onValueChange={(value) => setFormData({ ...formData, refundType: value })}>
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
                    <Select value={formData.refundMethod} onValueChange={(value) => setFormData({ ...formData, refundMethod: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="card">💳 Card Reversal</SelectItem>
                        <SelectItem value="mobile">📱 Mobile Payment</SelectItem>
                        <SelectItem value="credit">🎫 Store Credit</SelectItem>
                        <SelectItem value="cheque">📄 Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.refundMethod === 'credit' && (
                      <p className="text-xs text-blue-600">
                        ℹ️ Store credit will be added to customer's account balance.
                      </p>
                    )}
                    {formData.refundMethod === 'cheque' && (
                      <p className="text-xs text-purple-600">
                        ℹ️ Full refund returns original cheque. Partial refund issues new cheque.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Refund Total</Label>
                    <div className="h-10 px-3 py-2 rounded-md border bg-muted font-bold text-lg">
                      LKR {formData.items.reduce((sum, item) => sum + item.refundAmount, 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter refund reason..."
                    required
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Items to Refund</Label>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {formData.items.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.productName}</h4>
                              <p className="text-sm text-muted-foreground">
                                Original: {searchedOrder.items?.[index]?.netWeightKg ?? 0} kg • LKR {(searchedOrder.items?.[index]?.finalTotal ?? 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-64">
                              <div className="space-y-1">
                                <Label className="text-xs">Quantity (kg)</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max={searchedOrder.items?.[index]?.netWeightKg}
                                  value={item.quantityReturned}
                                  onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                />
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
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Refund</p>
                                <p className="font-bold text-primary">LKR {(item.refundAmount ?? 0).toFixed(2)}</p>
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeItem(index)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={!searchedOrder || !formData.reason.trim()} className="flex-1">
                Create Refund Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Refund Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Details - {selectedRefund?.refundNumber}</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Refund Type</p>
                  <p className="font-semibold">{selectedRefund.refundType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRefund.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-red-600">LKR {(selectedRefund.totalAmount ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refund Method</p>
                  <Badge variant="outline" className={`mt-1 ${
                    selectedRefund.refundMethod === 'cash' ? 'bg-green-50 text-green-700 border-green-300' :
                    selectedRefund.refundMethod === 'card' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                    selectedRefund.refundMethod === 'mobile' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                    selectedRefund.refundMethod === 'credit' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                    selectedRefund.refundMethod === 'cheque' ? 'bg-pink-50 text-pink-700 border-pink-300' :
                    ''
                  }`}>
                    {selectedRefund.refundMethod === 'cash' && '💵 Cash'}
                    {selectedRefund.refundMethod === 'card' && '💳 Card'}
                    {selectedRefund.refundMethod === 'mobile' && '📱 Mobile'}
                    {selectedRefund.refundMethod === 'credit' && '🎫 Credit'}
                    {selectedRefund.refundMethod === 'cheque' && '📄 Cheque'}
                    {!selectedRefund.refundMethod && 'Unknown'}
                  </Badge>
                </div>
              </div>

              {/* Cashier Info */}
              {selectedRefund.cashier && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Requested By</p>
                  <p className="font-medium">{selectedRefund.cashier.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRefund.cashier.email}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Reason</p>
                <p className="text-sm">{selectedRefund.reason}</p>
              </div>

              {/* Notes - show rejection reason if rejected */}
              {selectedRefund.notes && (
                <div className={`p-3 rounded-lg border ${selectedRefund.status === 'rejected'
                  ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                  : 'bg-muted/50'
                  }`}>
                  <p className={`text-sm font-medium mb-1 ${selectedRefund.status === 'rejected' ? 'text-red-700 dark:text-red-300' : ''
                    }`}>
                    {selectedRefund.notes.startsWith('REJECTED:') ? 'Rejection Reason' : 'Notes'}
                  </p>
                  <p className="text-sm">{selectedRefund.notes.replace('REJECTED: ', '')}</p>
                </div>
              )}

              {/* Status-specific warnings */}
              {selectedRefund.status === 'rejected' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">⚠️ Cashier Liability</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    If the cashier has already given the refund amount (LKR {(selectedRefund.totalAmount ?? 0).toFixed(2)}) to the customer,
                    they are responsible for recovering this amount as the refund was rejected.
                  </p>
                </div>
              )}

              {selectedRefund.status === 'completed' && (
                <div className="p-3 bg-green-50 dark:bg-green 50/30 border border-green-50 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-600 mb-1">✓ Refund Completed</p>
                  <p className="text-xs text-green-600">
                    Items marked as "Good" condition have been restocked automatically.
                  </p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-2">Refunded Items</p>
                <div className="space-y-2">
                  {selectedRefund.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {(item.quantityReturned ?? 0).toFixed(3)} kg • Condition: {item.condition || 'N/A'}
                        </p>
                        {item.condition === 'good' && selectedRefund.status === 'completed' && (
                          <p className="text-xs text-green-600 mt-0.5">✓ Restocked</p>
                        )}
                      </div>
                      <p className="font-bold text-red-600">LKR {(item.refundAmount ?? 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval actions for pending refunds */}
              {selectedRefund.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleApprove(selectedRefund.id);
                      setViewDialogOpen(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve Refund
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setViewDialogOpen(false);
                      openRejectDialog(selectedRefund.id);
                    }}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Refund
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Refund Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> If the cashier has already given money to the customer,
                rejecting this refund will mark them as responsible for recovering the amount.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason for Rejection *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this refund..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}