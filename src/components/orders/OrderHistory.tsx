'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAuthUser, logout } from '@/lib/auth';
import { ArrowLeft, Search, Printer, Eye, LogOut, User, Banknote, CreditCard, Wallet, Loader2, ChevronDown, FileText, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  itemName: string;
  quantityType: string;
  itemWeightKg: number;
  itemWeightG: number;
  itemWeightTotalKg: number;
  boxWeightKg: number | null;
  boxWeightG: number | null;
  boxWeightPerBoxKg: number | null;
  boxCount: number | null;
  totalBoxWeightKg: number | null;
  netWeightKg: number;
  pricePerKg: number;
  baseTotal: number;
  itemDiscountPercent: number;
  itemDiscountAmount: number;
  finalTotal: number;
}

interface PaymentDetail {
  id: number;
  paymentType: 'cash' | 'card' | 'mobile' | 'cheque' | 'credit';
  amount: number;
  cardType?: string;
  reference?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  cashierId: number;
  cashier?: {
    id: number;
    fullName: string;
    email: string;
  };
  customer?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
  };
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  total: number;
  status: string;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  createdAt: string;
  itemCount?: number;
}

export default function OrderHistory() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[]; payments?: PaymentDetail[] } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printContent, setPrintContent] = useState('');
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);
    if (currentUser) {
      fetchOrders(currentUser, '', '', 0, true);
      fetchPrinterSettings();
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        fetchCashiers();
      }
    }
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreOrders();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, page, user, searchDate]);

  const fetchPrinterSettings = async () => {
    try {
      const response = await fetch('/api/printer-settings');
      if (response.ok) {
        const data = await response.json();
        setPrinterSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch printer settings:', err);
    }
  };

  const fetchCashiers = async () => {
    try {
      const response = await fetch('/api/users?role=cashier');
      if (response.ok) {
        const data = await response.json();
        setCashiers(data);
      }
    } catch (err) {
      console.error('Failed to fetch cashiers:', err);
    }
  };

  const fetchOrders = async (currentUser: any, date?: string, cashierId?: string, pageNum: number = 0, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const offset = pageNum * ITEMS_PER_PAGE;
      let url = `/api/orders?limit=${ITEMS_PER_PAGE}&offset=${offset}`;

      // If cashier, only show their orders
      if (currentUser.role === 'cashier') {
        url += `&cashierId=${currentUser.id}`;
      } else if (cashierId) {
        // Admin/Manager filtering by specific cashier
        url += `&cashierId=${cashierId}`;
      }

      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      if (reset) {
        setOrders(data);
      } else {
        setOrders(prev => [...prev, ...data]);
      }

      // If we got fewer items than requested, we've reached the end
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      toast.error(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreOrders = useCallback(() => {
    if (!user || !hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(user, searchDate, selectedCashier, nextPage, false);
  }, [user, page, searchDate, selectedCashier, hasMore, loadingMore]);

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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'mobile':
        return <Wallet className="h-4 w-4" />;
      case 'cheque':
        return <FileText className="h-4 w-4" />;
      case 'credit':
        return <Receipt className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const generateReceiptHTML = (order: Order, items: OrderItem[], payments?: PaymentDetail[]) => {
    const settings = printerSettings || {};
    const paperWidth = settings.paperSize === '57mm' || settings.paperSize === '58mm' ? settings.paperSize : '80mm';

    // Build logo HTML
    const logoHTML = settings.logoUrl && settings.showLogo ? `
      <div class="logo-container">
        <img src="${settings.logoUrl}" alt="Logo" class="logo" />
      </div>
    ` : '';

    // Build business info HTML - centered and structured
    const businessInfoHTML = `
      <div class="center bold business-name">${settings.businessName || 'POS SYSTEM'}</div>
      ${settings.address ? `<div class="center small">${settings.address}</div>` : ''}
      ${settings.phone ? `<div class="center small">PHONE: ${settings.phone}</div>` : ''}
      ${settings.email ? `<div class="center small">${settings.email}</div>` : ''}
      ${settings.taxId ? `<div class="center small">GSTIN: ${settings.taxId}</div>` : ''}
    `;

    // Format date and time
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('en-GB');
    const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Payment method display
    const paymentMethodDisplay = payments && payments.length > 0
      ? payments.map(p => p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)).join(' + ')
      : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1);

    // Items table HTML with proper alignment
    const itemsHTML = items.map(item => {
      const itemTotal = (item.finalTotal ?? 0).toFixed(2);
      const qty = (item.netWeightKg ?? 0).toFixed(2);

      return `
        <tr>
          <td class="item-name">${item.itemName}</td>
          <td class="item-qty">${qty}</td>
          <td class="item-amt">${itemTotal}</td>
        </tr>
        ${item.totalBoxWeightKg ? `<tr><td colspan="3" class="item-detail">  Box: ${item.totalBoxWeightKg}kg × ${item.boxCount}</td></tr>` : ''}
        ${item.itemDiscountAmount > 0 ? `<tr><td colspan="3" class="item-detail">  Discount: ${item.itemDiscountPercent}%</td></tr>` : ''}
      `;
    }).join('');

    // Calculate tax breakdown (example - adjust based on your tax logic)
    const taxRate = 0;
    const cgst = (order.total * taxRate / 2).toFixed(2);
    const sgst = (order.total * taxRate / 2).toFixed(2);

    // Tax section HTML
    const taxHTML = taxRate > 0 ? `
      <tr class="tax-row">
        <td colspan="2">CGST @ ${(taxRate / 2).toFixed(2)}%</td>
        <td class="right">${cgst}</td>
      </tr>
      <tr class="tax-row">
        <td colspan="2">SGST @ ${(taxRate / 2).toFixed(2)}%</td>
        <td class="right">${sgst}</td>
      </tr>
    ` : '';

    // Payment details section
    const paymentDetailsHTML = payments && payments.length > 0 ? `
      <div class="dotted-line"></div>
      <div class="small bold">PAYMENT DETAILS</div>
      ${payments.map(p => `
        <div class="payment-line">
          <span>${p.paymentType.toUpperCase()}</span>
          <span>Rs ${p.amount.toFixed(2)}</span>
        </div>
        ${p.cardType ? `<div class="payment-detail">Card: ${p.cardType.toUpperCase()}</div>` : ''}
        ${p.reference ? `<div class="payment-detail">Ref: ${p.reference}</div>` : ''}
      `).join('')}
    ` : '';

    // Cash details
    const cashDetailsHTML = order.paymentMethod === 'cash' && order.cashReceived ? `
      <div class="dotted-line"></div>
      <div class="total-line">
        <span>Cash</span>
        <span>Rs ${order.total.toFixed(2)}</span>
      </div>
      <div class="total-line">
        <span>Cash tendered:</span>
        <span>Rs ${order.cashReceived.toFixed(2)}</span>
      </div>
      ${(order.changeGiven || 0) > 0 ? `<div class="change-line"><span></span><span>E & O.E</span></div>` : ''}
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: ${paperWidth === '80mm' ? '11px' : '9px'}; 
            padding: ${paperWidth === '80mm' ? '10px' : '8px'}; 
            width: ${paperWidth};
            max-width: ${paperWidth};
            color: #000;
            line-height: 1.3;
            background: white;
          }
          
          .center { 
            text-align: center; 
            margin: 2px 0;
          }
          
          .bold { 
            font-weight: bold; 
          }
          
          .business-name { 
            font-size: ${paperWidth === '80mm' ? '16px' : '13px'}; 
            margin: 8px 0 4px 0;
            letter-spacing: 0.5px;
          }
          
          .small { 
            font-size: ${paperWidth === '80mm' ? '9px' : '8px'}; 
            margin: 1px 0;
          }
          
          .dotted-line { 
            border-top: 1px dashed #000; 
            margin: 6px 0; 
          }
          
          .solid-line {
            border-top: 1px solid #000;
            margin: 6px 0;
          }
          
          .double-line {
            border-top: 3px double #000;
            margin: 6px 0;
          }
          
          .logo-container { 
            text-align: center; 
            margin: 10px 0; 
          }
          
          .logo { 
            max-width: ${paperWidth === '80mm' ? '80px' : '50px'}; 
            height: auto; 
          }
          
          .receipt-title {
            font-size: ${paperWidth === '80mm' ? '13px' : '11px'};
            margin: 8px 0;
            font-weight: bold;
          }
          
          .info-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: ${paperWidth === '80mm' ? '10px' : '8px'};
          }
          
          .info-label {
            font-weight: normal;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
          }
          
          th {
            text-align: left;
            padding: 3px 0;
            border-bottom: 1px dashed #000;
            font-weight: bold;
            font-size: ${paperWidth === '80mm' ? '10px' : '8px'};
          }
          
          td {
            padding: 3px 0;
            font-size: ${paperWidth === '80mm' ? '10px' : '8px'};
          }
          
          .item-name {
            width: 50%;
            text-align: left;
          }
          
          .item-qty {
            width: 20%;
            text-align: center;
          }
          
          .item-amt {
            width: 30%;
            text-align: right;
          }
          
          .item-detail {
            font-size: ${paperWidth === '80mm' ? '8px' : '7px'};
            color: #333;
            padding: 0 0 2px 0;
          }
          
          .right {
            text-align: right;
          }
          
          .totals-table {
            margin-top: 6px;
          }
          
          .totals-table td {
            padding: 2px 0;
          }
          
          .subtotal-row td {
            padding-top: 4px;
          }
          
          .tax-row {
            font-size: ${paperWidth === '80mm' ? '9px' : '7px'};
          }
          
          .total-row {
            font-weight: bold;
            font-size: ${paperWidth === '80mm' ? '12px' : '10px'};
            border-top: 1px solid #000;
          }
          
          .total-row td {
            padding: 4px 0;
          }
          
          .payment-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: ${paperWidth === '80mm' ? '10px' : '8px'};
          }
          
          .payment-detail {
            font-size: ${paperWidth === '80mm' ? '8px' : '7px'};
            margin: 1px 0 1px 10px;
            color: #333;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: ${paperWidth === '80mm' ? '11px' : '9px'};
          }
          
          .change-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: ${paperWidth === '80mm' ? '9px' : '7px'};
            text-align: right;
          }
          
          .footer-text {
            margin-top: 8px;
            font-size: ${paperWidth === '80mm' ? '9px' : '8px'};
          }
        </style>
      </head>
      <body>
        ${logoHTML}
        ${businessInfoHTML}
        
        <div class="dotted-line"></div>
        
        <div class="center receipt-title">Retail Invoice</div>
        
        <div class="dotted-line"></div>
        
        <div class="info-line">
          <span class="info-label">Date: ${dateStr}, ${timeStr}</span>
        </div>
        
        ${settings.storeName ? `<div class="info-line"><span class="info-label">${settings.storeName}</span></div>` : ''}
        
        <div class="info-line">
          <span class="info-label">Bill No: ${order.orderNumber}</span>
        </div>
        
        <div class="info-line">
          <span class="info-label">Payment Mode: ${paymentMethodDisplay}</span>
        </div>
        
        ${order.cashierId ? `<div class="info-line"><span class="info-label">DR Ref: ${order.cashierId}</span></div>` : ''}
        
        <div class="dotted-line"></div>
        
        <table>
          <thead>
            <tr>
              <th class="item-name">Item</th>
              <th class="item-qty">Qty</th>
              <th class="item-amt">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <table class="totals-table">
          <tbody>
            <tr class="subtotal-row">
              <td colspan="2">Sub Total</td>
              <td class="right">${items.length}</td>
              <td class="right">${order.subtotal.toFixed(2)}</td>
            </tr>
            ${order.discountAmount > 0 ? `
            <tr>
              <td colspan="2">(-) Discount</td>
              <td></td>
              <td class="right">${order.discountAmount.toFixed(2)}</td>
            </tr>
            ${order.discountPercent > 0 ? `
            <tr class="tax-row">
              <td colspan="3">COST @ ${order.discountPercent.toFixed(2)}%</td>
              <td class="right">${(order.discountAmount / 2).toFixed(2)}</td>
            </tr>
            <tr class="tax-row">
              <td colspan="3">SGST @ ${order.discountPercent.toFixed(2)}%</td>
              <td class="right">${(order.discountAmount / 2).toFixed(2)}</td>
            </tr>
            ` : ''}
            ` : ''}
            ${taxHTML}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td></td>
              <td class="right">Rs ${order.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        ${paymentDetailsHTML}
        ${cashDetailsHTML}
        
        ${settings.receiptFooter ? `
        <div class="dotted-line"></div>
        <div class="center footer-text">${settings.receiptFooter}</div>
        ` : `
        <div class="dotted-line"></div>
        <div class="center footer-text">Thank you for your business!</div>
        `}
        
        ${settings.showBarcode ? `
        <div class="center small" style="margin-top: 8px;">[${order.orderNumber}]</div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const printReceipt = (order: Order, items: OrderItem[], payments?: PaymentDetail[]) => {
    try {
      const receiptHTML = generateReceiptHTML(order, items, payments);
      setPrintContent(receiptHTML);
      setPrintDialogOpen(true);
    } catch (err: any) {
      toast.error('Failed to generate receipt: ' + err.message);
    }
  };

  const handlePrintFromDialog = () => {
    if (printIframeRef.current) {
      const iframeWindow = printIframeRef.current.contentWindow;
      if (iframeWindow) {
        iframeWindow.focus();
        iframeWindow.print();
      }
    }
  };

  const handleSearch = () => {
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchOrders(user, searchDate, selectedCashier, 0, true);
    }
  };

  const handleClearSearch = () => {
    setSearchDate('');
    setSelectedCashier('');
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchOrders(user, '', '', 0, true);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filter Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 max-w-xs space-y-2">
                <Label htmlFor="searchDate">Filter by Date</Label>
                <Input
                  id="searchDate"
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
              {user && (user.role === 'admin' || user.role === 'manager') && cashiers.length > 0 && (
                <div className="flex-1 max-w-xs space-y-2">
                  <Label htmlFor="cashierFilter">Filter by Cashier</Label>
                  <select
                    id="cashierFilter"
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">All Cashiers</option>
                    {cashiers.map((cashier) => (
                      <option key={cashier.id} value={cashier.id}>
                        {cashier.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearSearch}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && orders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getPaymentIcon(order.paymentMethod)}
                          {order.paymentMethod}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div className="font-medium">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Items:</span>
                          <div className="font-medium">{order.itemCount || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subtotal:</span>
                          <div className="font-medium">LKR {(order.subtotal ?? 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cashier:</span>
                          <div className="font-medium">{order.cashier?.fullName || 'Unknown'}</div>
                        </div>
                         <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <div className="font-medium">{order.customer?.name || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <div className="font-bold text-lg text-primary">
                            LKR {(order.total ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto sm:ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewOrderDetails(order.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - {selectedOrder?.order.orderNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Date:</span>
                                  <div className="font-medium">
                                    {new Date(selectedOrder.order.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <div>
                                    <Badge>{selectedOrder.order.status}</Badge>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Payment Method:</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      {getPaymentIcon(selectedOrder.order.paymentMethod)}
                                      {selectedOrder.order.paymentMethod}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Cashier:</span>
                                  <div className="font-medium">
                                    {selectedOrder.order.cashier?.fullName || 'Unknown'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Customer:</span>
                                  <div className="font-medium">
                                    {selectedOrder.order.customer?.name || 'Unknown'}
                                  </div>
                                </div>
                              </div>

                              {/* Payment Details */}
                              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-semibold mb-3">Payment Details</h4>
                                    <div className="space-y-2">
                                      {selectedOrder.payments.map((payment, index) => (
                                        <Card key={payment.id}>
                                          <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                {getPaymentIcon(payment.paymentType)}
                                                <span className="font-semibold capitalize">{payment.paymentType}</span>
                                                {payment.cardType && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {payment.cardType.toUpperCase()}
                                                  </Badge>
                                                )}
                                              </div>
                                              <span className="font-bold text-primary">
                                                LKR {(payment.amount ?? 0).toFixed(2)}
                                              </span>
                                            </div>
                                            {payment.reference && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                {payment.paymentType === 'cheque'
                                                  ? `Cheque No: ${payment.reference}`
                                                  : `Ref: ${payment.reference}`}
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Cash Details */}
                              {selectedOrder.order.paymentMethod === 'cash' && selectedOrder.order.cashReceived && (
                                <>
                                  <Separator />
                                  <Card className="bg-green-50 dark:bg-green-900/20">
                                    <CardContent className="p-4 space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Cash Received:</span>
                                        <span className="font-semibold">LKR {(selectedOrder.order.cashReceived ?? 0).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Change Given:</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                          LKR {(selectedOrder.order.changeGiven || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </>
                              )}

                              <Separator />

                              <div>
                                <h4 className="font-semibold mb-3">Items</h4>
                                <div className="space-y-3">
                                  {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                                      <div className="font-semibold">{item.itemName}</div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Item Weight:</span>
                                          <div className="font-medium">{item.itemWeightTotalKg ?? 0} KG</div>
                                        </div>
                                        {item.totalBoxWeightKg && (
                                          <>
                                            <div>
                                              <span className="text-muted-foreground">Box Weight:</span>
                                              <div className="font-medium">
                                                {item.totalBoxWeightKg ?? 0} KG ({item.boxCount ?? 0} boxes)
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Net Weight:</span>
                                              <div className="font-medium">{item.netWeightKg ?? 0} KG</div>
                                            </div>
                                          </>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">Price/KG:</span>
                                          <div className="font-medium">LKR {(item.pricePerKg ?? 0).toFixed(2)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Base Total:</span>
                                          <div className="font-medium">LKR {(item.baseTotal ?? 0).toFixed(2)}</div>
                                        </div>
                                        {item.itemDiscountAmount > 0 && (
                                          <div>
                                            <span className="text-muted-foreground">Discount:</span>
                                            <div className="font-medium text-destructive">
                                              -LKR {(item.itemDiscountAmount ?? 0).toFixed(2)}
                                            </div>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">Item Total:</span>
                                          <div className="font-bold text-primary">
                                            LKR {(item.finalTotal ?? 0).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Separator />

                              <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span className="font-semibold">
                                    LKR {(selectedOrder.order.subtotal ?? 0).toFixed(2)}
                                  </span>
                                </div>
                                {selectedOrder.order.discountAmount > 0 && (
                                  <div className="flex justify-between text-destructive">
                                    <span>Discount ({selectedOrder.order.discountPercent}%):</span>
                                    <span className="font-semibold">
                                      -LKR {(selectedOrder.order.discountAmount ?? 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-xl font-bold">
                                  <span>Total:</span>
                                  <span className="text-primary">
                                    LKR {(selectedOrder.order.total ?? 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <Button
                                onClick={() => printReceipt(selectedOrder.order, selectedOrder.items, selectedOrder.payments)}
                                className="w-full"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Receipt
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more orders...</span>
                  </div>
                )}
              </div>
            )}

            {/* Load more button (fallback) */}
            {hasMore && !loadingMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMoreOrders}
                  disabled={loadingMore}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More Orders
                </Button>
              </div>
            )}

            {/* End of list message */}
            {!hasMore && orders.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Showing all {orders.length} order{orders.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Receipt Preview
            </DialogTitle>
            <DialogDescription>
              Preview your receipt before printing. Click "Print" to send to your USB printer.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              ref={printIframeRef}
              srcDoc={printContent}
              className="w-full h-[400px] border-0"
              title="Receipt Preview"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrintFromDialog}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}