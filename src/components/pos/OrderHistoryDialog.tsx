'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Eye, RotateCcw, Banknote, CreditCard, Wallet, Loader2, X, ChevronDown, ChevronUp, FileText, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';

interface Order {
  id: number;
  orderNumber: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  createdAt: string;
  status: string;
  paymentMethod: string;
  itemCount?: number;
  cashReceived?: number;
  changeGiven?: number;
}

interface OrderItem {
  id: number;
  itemName: string;
  netWeightKg: number;
  finalTotal: number;
  productId: number | null;
  itemWeightTotalKg: number;
  totalBoxWeightKg: number | null;
  boxCount: number | null;
  pricePerKg: number;
  itemDiscountAmount: number;
  itemDiscountPercent: number;
  baseTotal: number;
}

interface PaymentDetail {
  id: number;
  paymentType: 'cash' | 'card' | 'mobile' | 'cheque' | 'credit';
  amount: number;
  cardType?: string;
  reference?: string;
}

interface OrderHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashierId: number;
  onRefundClick?: (order: Order) => void;
  canProcessRefunds?: boolean;
  registrySessionId?: number; // TEAM_003: Filter by registry session
}

export function OrderHistoryDialog({
  open,
  onOpenChange,
  cashierId,
  onRefundClick,
  canProcessRefunds = false,
  registrySessionId
}: OrderHistoryDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[]; payments?: PaymentDetail[] } | null>(null);
  const [viewingDetails, setViewingDetails] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(10);

  useEffect(() => {
    if (open) {
      // Reset state when opening
      setSearchDate('');
      setSearchOrderNumber('');
      setShowSearchFilters(false);
      setCurrentLimit(10);
      fetchOrders();
    }
  }, [open, cashierId, registrySessionId]);

  const fetchOrders = async (date?: string, orderNum?: string, limit: number = 10) => {
    setLoading(true);
    try {
      let url = `/api/orders?limit=${limit}&cashierId=${cashierId}`;

      // TEAM_003: Filter by registry session
      if (registrySessionId) {
        url += `&registrySessionId=${registrySessionId}`;
      }

      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      }

      if (orderNum) {
        url += `&orderNumber=${orderNum.trim()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (orderId: number) => {
    try {
      const [orderResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/orders?id=${orderId}`),
        fetch(`/api/payment-details?orderId=${orderId}`)
      ]);

      const orderData = await orderResponse.json();
      const paymentsData = await paymentsResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to fetch order details');
      }

      setSelectedOrder({
        ...orderData,
        payments: Array.isArray(paymentsData) ? paymentsData : []
      });
      setViewingDetails(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch order details');
    }
  };

  const handleSearch = () => {
    setCurrentLimit(50); // Show more results when searching
    fetchOrders(searchDate, searchOrderNumber, 50);
  };

  const handleClearSearch = () => {
    setSearchDate('');
    setSearchOrderNumber('');
    setCurrentLimit(10);
    setShowSearchFilters(false);
    fetchOrders(undefined, undefined, 10);
  };

  const handleLoadMore = () => {
    const newLimit = currentLimit + 20;
    setCurrentLimit(newLimit);
    fetchOrders(searchDate || undefined, searchOrderNumber || undefined, newLimit);
  };

  const handleRefund = (order: Order) => {
    onOpenChange(false);
    setViewingDetails(false);
    if (onRefundClick) {
      onRefundClick(order);
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="h-3.5 w-3.5" />;
      case 'card':
        return <CreditCard className="h-3.5 w-3.5" />;
      case 'mobile':
        return <Wallet className="h-3.5 w-3.5" />;
      case 'cheque':
        return <FileText className="h-3.5 w-3.5" />;
      case 'credit':
        return <Receipt className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const handleClose = () => {
    setViewingDetails(false);
    setSelectedOrder(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setViewingDetails(false);
    setSelectedOrder(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {viewingDetails ? `Order Details - ${selectedOrder?.order.orderNumber}` : 'Your Recent Orders'}
            </span>
            {viewingDetails && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Back to List
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {!viewingDetails ? (
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Search Toggle Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {orders.length > 0 ? `Showing ${orders.length} most recent order${orders.length !== 1 ? 's' : ''}` : 'No orders yet'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearchFilters(!showSearchFilters)}
              >
                <Search className="h-4 w-4 mr-2" />
                {showSearchFilters ? 'Hide' : 'Search'} Filters
                {showSearchFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Collapsible Search Filters */}
            {showSearchFilters && (
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Order Number</Label>
                      <Input
                        placeholder="ORD-..."
                        value={searchOrderNumber}
                        onChange={(e) => setSearchOrderNumber(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 flex items-end gap-2">
                      <Button onClick={handleSearch} disabled={loading} className="flex-1">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                      <Button variant="outline" onClick={handleClearSearch}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders List */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchDate || searchOrderNumber
                      ? 'Try adjusting your search filters'
                      : 'Start making sales to see your orders here'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2">
                  {orders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-semibold text-sm">{order.orderNumber}</h4>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                {order.status}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                {getPaymentIcon(order.paymentMethod)}
                                {order.paymentMethod}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Date: </span>
                                <span className="font-medium">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Time: </span>
                                <span className="font-medium">
                                  {new Date(order.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Items: </span>
                                <span className="font-medium">{order.itemCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total: </span>
                                <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewOrderDetails(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {canProcessRefunds && order.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefund(order)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Load More Button */}
                {orders.length >= currentLimit && (
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Load More Orders
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Order Details View */
          selectedOrder && (
            <div className="space-y-4 overflow-y-auto flex-1">
              {/* Order Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Date && Time</p>
                      <p className="font-semibold">
                        {new Date(selectedOrder.order.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge>{selectedOrder.order.status}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Payment</p>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getPaymentIcon(selectedOrder.order.paymentMethod)}
                        {selectedOrder.order.paymentMethod}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-bold text-lg text-primary">{formatCurrency(selectedOrder.order.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm mb-2">Payment Details</h4>
                    {selectedOrder.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(payment.paymentType)}
                          <span className="font-medium capitalize text-sm">{payment.paymentType}</span>
                          {payment.cardType && (
                            <Badge variant="outline" className="text-xs">{payment.cardType.toUpperCase()}</Badge>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold">{formatCurrency(payment.amount)}</div>
                          {payment.reference && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {payment.paymentType === 'cheque'
                                ? `Cheque No: ${payment.reference}`
                                : `Ref: ${payment.reference}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Cash Details */}
              {selectedOrder.order.paymentMethod === 'cash' && selectedOrder.order.cashReceived && (
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cash Received:</span>
                      <span className="font-semibold">{formatCurrency(selectedOrder.order.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Change Given:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedOrder.order.changeGiven || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="border rounded p-3 space-y-2 text-sm">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold">{item.itemName}</div>
                          <div className="font-bold text-primary">{formatCurrency(item.finalTotal)}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>Net: {item.netWeightKg} kg</div>
                          <div>@ {formatCurrency(item.pricePerKg)}/kg</div>
                          {item.itemDiscountAmount > 0 && (
                            <div className="text-destructive">-{item.itemDiscountPercent}% off</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.order.subtotal)}</span>
                  </div>
                  {selectedOrder.order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount ({selectedOrder.order.discountPercent}%):</span>
                      <span className="font-semibold">-{formatCurrency(selectedOrder.order.discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(selectedOrder.order.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {canProcessRefunds && selectedOrder.order.status === 'completed' && (
                <Button
                  onClick={() => handleRefund(selectedOrder.order)}
                  className="w-full"
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Refund for this Order
                </Button>
              )}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}