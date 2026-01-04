'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAuthUser, logout } from '@/lib/auth';
import {
  ArrowLeft, Search, Printer, Eye, LogOut, User, Banknote, CreditCard,
  Wallet, Loader2, ChevronDown, FileText, Receipt, Download, FileSpreadsheet,
  LayoutGrid, Table as TableIcon, TrendingUp, ShoppingCart, DollarSign,
  Calendar, Filter, X, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  chequeNumber?: string | null;
  chequeDate?: string | null;
  chequeBankName?: string | null;
  chequePayerName?: string | null;
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

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  todaysOrders: number;
}

export default function OrderHistory() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[]; payments?: PaymentDetail[] } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printContent, setPrintContent] = useState('');
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  // View mode state (table or cards)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Statistics state
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    todaysOrders: 0
  });

  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);
    if (currentUser) {
      fetchOrders(currentUser, {}, 0, true);
      fetchPrinterSettings();
      fetchStats(currentUser);
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        fetchCashiers();
      }
    }
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (viewMode !== 'cards') return; // Only use infinite scroll for cards view

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
  }, [hasMore, loading, loadingMore, page, user, viewMode]);

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
        setCashiers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch cashiers:', err);
    }
  };

  const fetchStats = async (currentUser: any) => {
    try {
      const response = await fetch('/api/orders/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const buildFilterUrl = (filters: any) => {
    const params = new URLSearchParams();

    if (filters.searchQuery) {
      params.append('search', filters.searchQuery);
    }
    if (filters.dateFrom) {
      const startDate = new Date(filters.dateFrom);
      startDate.setHours(0, 0, 0, 0);
      params.append('startDate', startDate.toISOString());
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      params.append('endDate', endDate.toISOString());
    }
    if (filters.cashierId) {
      params.append('cashierId', filters.cashierId);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.paymentMethod) {
      params.append('paymentMethod', filters.paymentMethod);
    }

    return params.toString();
  };

  const fetchOrders = async (currentUser: any, filters: any, pageNum: number = 0, reset: boolean = false) => {
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
        filters.cashierId = currentUser.id;
      }

      const filterParams = buildFilterUrl(filters);
      if (filterParams) {
        url += `&${filterParams}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      if (reset) {
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setOrders(prev => [...prev, ...data]);
      }

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
    fetchOrders(user, getCurrentFilters(), nextPage, false);
  }, [user, page, hasMore, loadingMore]);

  const getCurrentFilters = () => ({
    searchQuery,
    dateFrom,
    dateTo,
    cashierId: selectedCashier,
    status: selectedStatus,
    paymentMethod: selectedPaymentMethod
  });

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

  const getPaymentBadgeColor = (type: string) => {
    switch (type) {
      case 'cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'card':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'credit':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mobile':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cheque':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'voided':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const generateReceiptHTML = (order: Order, items: OrderItem[], payments?: PaymentDetail[]) => {
    const settings = printerSettings || {};
    const paperWidth = settings.paperSize === 'A5' ? 'A5' :
                       settings.paperSize === '57mm' || settings.paperSize === '58mm' ? settings.paperSize : '80mm';

    const logoHTML = settings.logoUrl && settings.showLogo ? `
      <div class="logo-container">
        <img src="${settings.logoUrl}" alt="Logo" class="logo" />
      </div>
    ` : '';

    const businessInfoHTML = `
      <div class="center bold business-name">${settings.businessName || 'POS SYSTEM'}</div>
      ${settings.address ? `<div class="center small">${settings.address}</div>` : ''}
      ${settings.phone ? `<div class="center small">PHONE: ${settings.phone}</div>` : ''}
      ${settings.email ? `<div class="center small">${settings.email}</div>` : ''}
      ${settings.taxId ? `<div class="center small">GSTIN: ${settings.taxId}</div>` : ''}
    `;

    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('en-GB');
    const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const paymentMethodDisplay = payments && payments.length > 0
      ? payments.map(p => p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)).join(' + ')
      : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1);

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
        ${p.chequeNumber ? `<div class="payment-detail">Cheque #: ${p.chequeNumber}</div>` : ''}
        ${p.chequeBankName ? `<div class="payment-detail">Bank: ${p.chequeBankName}</div>` : ''}
      `).join('')}
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            @page {
              size: ${paperWidth === 'A5' ? 'A5 portrait' : `${paperWidth} auto`};
              margin: ${paperWidth === 'A5' ? '10mm' : '0'};
            }
            body {
              margin: 0;
              padding: ${paperWidth === 'A5' ? '15mm' : '10px'};
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
            font-family: ${paperWidth === 'A5' ? "'Arial', 'Helvetica', sans-serif" : "'Courier New', Courier, monospace"};
            font-size: ${paperWidth === 'A5' ? '14px' : paperWidth === '80mm' ? '11px' : '9px'};
            padding: ${paperWidth === 'A5' ? '15mm' : paperWidth === '80mm' ? '10px' : '8px'};
            width: ${paperWidth === 'A5' ? '148mm' : paperWidth};
            max-width: ${paperWidth === 'A5' ? '148mm' : paperWidth};
            color: #000;
            line-height: ${paperWidth === 'A5' ? '1.6' : '1.3'};
            background: white;
          }

          .center { text-align: center; margin: ${paperWidth === 'A5' ? '6px 0' : '2px 0'}; }
          .bold { font-weight: bold; }
          .business-name { font-size: ${paperWidth === 'A5' ? '22px' : paperWidth === '80mm' ? '16px' : '13px'}; margin: ${paperWidth === 'A5' ? '12px 0 8px 0' : '8px 0 4px 0'}; letter-spacing: ${paperWidth === 'A5' ? '1px' : '0.5px'}; }
          .small { font-size: ${paperWidth === 'A5' ? '12px' : paperWidth === '80mm' ? '9px' : '8px'}; margin: ${paperWidth === 'A5' ? '3px 0' : '1px 0'}; }
          .dotted-line { border-top: ${paperWidth === 'A5' ? '2px' : '1px'} dashed #000; margin: ${paperWidth === 'A5' ? '10px 0' : '6px 0'}; }
          .logo-container { text-align: center; margin: ${paperWidth === 'A5' ? '15px 0' : '10px 0'}; }
          .logo { max-width: ${paperWidth === 'A5' ? '200px' : paperWidth === '80mm' ? '80px' : '50px'}; height: auto; max-height: ${paperWidth === 'A5' ? '120px' : 'auto'}; }
          .receipt-title { font-size: ${paperWidth === 'A5' ? '18px' : paperWidth === '80mm' ? '13px' : '11px'}; margin: ${paperWidth === 'A5' ? '12px 0' : '8px 0'}; font-weight: bold; }
          .info-line { display: flex; justify-content: space-between; margin: ${paperWidth === 'A5' ? '5px 0' : '2px 0'}; font-size: ${paperWidth === 'A5' ? '13px' : paperWidth === '80mm' ? '10px' : '8px'}; }
          table { width: 100%; border-collapse: collapse; margin: ${paperWidth === 'A5' ? '10px 0' : '6px 0'}; }
          th { text-align: left; padding: ${paperWidth === 'A5' ? '6px 0' : '3px 0'}; border-bottom: ${paperWidth === 'A5' ? '2px' : '1px'} dashed #000; font-weight: bold; font-size: ${paperWidth === 'A5' ? '13px' : paperWidth === '80mm' ? '10px' : '8px'}; }
          td { padding: ${paperWidth === 'A5' ? '5px 0' : '3px 0'}; font-size: ${paperWidth === 'A5' ? '13px' : paperWidth === '80mm' ? '10px' : '8px'}; }
          .item-name { width: 50%; text-align: left; }
          .item-qty { width: 20%; text-align: center; }
          .item-amt { width: 30%; text-align: right; }
          .item-detail { font-size: ${paperWidth === 'A5' ? '11px' : paperWidth === '80mm' ? '8px' : '7px'}; color: #555; padding: 0 0 ${paperWidth === 'A5' ? '4px' : '2px'} 0; }
          .right { text-align: right; }
          .payment-line { display: flex; justify-content: space-between; margin: ${paperWidth === 'A5' ? '5px 0' : '2px 0'}; font-size: ${paperWidth === 'A5' ? '13px' : paperWidth === '80mm' ? '10px' : '8px'}; }
          .payment-detail { font-size: ${paperWidth === 'A5' ? '11px' : paperWidth === '80mm' ? '8px' : '7px'}; margin: ${paperWidth === 'A5' ? '3px 0 3px 15px' : '1px 0 1px 10px'}; color: #555; }
          .total-row { font-weight: bold; font-size: ${paperWidth === 'A5' ? '16px' : paperWidth === '80mm' ? '12px' : '10px'}; border-top: ${paperWidth === 'A5' ? '3px' : '1px'} solid #000; }
          .total-row td { padding: ${paperWidth === 'A5' ? '8px 0' : '4px 0'}; }
          .footer-text { margin-top: ${paperWidth === 'A5' ? '15px' : '8px'}; font-size: ${paperWidth === 'A5' ? '11px' : paperWidth === '80mm' ? '9px' : '8px'}; }
        </style>
      </head>
      <body>
        ${logoHTML}
        ${businessInfoHTML}
        <div class="dotted-line"></div>
        <div class="center receipt-title">Retail Invoice</div>
        <div class="dotted-line"></div>
        <div class="info-line"><span>Date: ${dateStr}, ${timeStr}</span></div>
        ${settings.storeName ? `<div class="info-line"><span>${settings.storeName}</span></div>` : ''}
        <div class="info-line"><span>Bill No: ${order.orderNumber}</span></div>
        <div class="info-line"><span>Payment Mode: ${paymentMethodDisplay}</span></div>
        ${order.cashier ? `<div class="info-line"><span>Cashier: ${order.cashier.fullName}</span></div>` : ''}
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
        <table>
          <tbody>
            <tr><td colspan="2">Sub Total</td><td class="right">${items.length}</td><td class="right">${order.subtotal.toFixed(2)}</td></tr>
            ${order.discountAmount > 0 ? `<tr><td colspan="2">(-) Discount</td><td></td><td class="right">${order.discountAmount.toFixed(2)}</td></tr>` : ''}
            <tr class="total-row"><td colspan="2">TOTAL</td><td></td><td class="right">Rs ${order.total.toFixed(2)}</td></tr>
          </tbody>
        </table>
        ${paymentDetailsHTML}
        <div class="dotted-line"></div>
        <div class="center footer-text">${settings.receiptFooter || 'Thank you for your business!'}</div>
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

  const handleApplyFilters = () => {
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchOrders(user, getCurrentFilters(), 0, true);
      fetchStats(user);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedCashier('');
    setSelectedStatus('');
    setSelectedPaymentMethod('');
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchOrders(user, {}, 0, true);
      fetchStats(user);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Order #', 'Date', 'Time', 'Customer', 'Cashier', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment Method', 'Status'];
      const rows = orders.map(order => [
        order.orderNumber,
        new Date(order.createdAt).toLocaleDateString(),
        new Date(order.createdAt).toLocaleTimeString(),
        order.customer?.name || 'Walk-in',
        order.cashier?.fullName || 'Unknown',
        order.itemCount || 0,
        order.subtotal.toFixed(2),
        order.discountAmount.toFixed(2),
        order.total.toFixed(2),
        order.paymentMethod,
        order.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV exported successfully!');
    } catch (err: any) {
      toast.error('Failed to export CSV: ' + err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalOrders.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.avgOrderValue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold mt-1">{stats.todaysOrders.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters && Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Order # / Customer</Label>
                  <Input
                    id="searchQuery"
                    placeholder="ORD-20251230-001 or Customer Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusFilter">Status</Label>
                  <select
                    id="statusFilter"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="voided">Voided</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentFilter">Payment Method</Label>
                  <select
                    id="paymentFilter"
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Payments</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">Mobile</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit">Credit</option>
                    <option value="split">Split</option>
                  </select>
                </div>

                {user && (user.role === 'admin' || user.role === 'manager') && cashiers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="cashierFilter">Cashier</Label>
                    <select
                      id="cashierFilter"
                      value={selectedCashier}
                      onChange={(e) => setSelectedCashier(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleApplyFilters}>
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={orders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => fetchOrders(user, getCurrentFilters(), 0, true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Toggle and Count */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No orders found</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search criteria</p>
            </CardContent>
          </Card>
        )}

        {/* Table View */}
        {!loading && orders.length > 0 && viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Payment</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer?.name || 'Walk-in'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{order.cashier?.fullName || 'Unknown'}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{order.itemCount || 0}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-primary">{formatCurrency(order.total)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${getPaymentBadgeColor(order.paymentMethod)} border`}>
                            <div className="flex items-center gap-1">
                              {getPaymentIcon(order.paymentMethod)}
                              <span className="capitalize">{order.paymentMethod}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${getStatusBadgeColor(order.status)} border capitalize`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewOrderDetails(order.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Order Details - {selectedOrder?.order.orderNumber}</DialogTitle>
                                </DialogHeader>
                                {selectedOrder && (
                                  <OrderDetailsContent
                                    selectedOrder={selectedOrder}
                                    getPaymentIcon={getPaymentIcon}
                                    formatCurrency={formatCurrency}
                                    printReceipt={printReceipt}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards View */}
        {!loading && orders.length > 0 && viewMode === 'cards' && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                        <Badge variant="outline" className={`${getStatusBadgeColor(order.status)} border capitalize`}>
                          {order.status}
                        </Badge>
                        <Badge variant="outline" className={`${getPaymentBadgeColor(order.paymentMethod)} border`}>
                          <div className="flex items-center gap-1">
                            {getPaymentIcon(order.paymentMethod)}
                            <span className="capitalize">{order.paymentMethod}</span>
                          </div>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div className="font-medium">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <div className="font-medium">{order.customer?.name || 'Walk-in'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cashier:</span>
                          <div className="font-medium">{order.cashier?.fullName || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Items:</span>
                          <div className="font-medium">{order.itemCount || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subtotal:</span>
                          <div className="font-medium">{formatCurrency(order.subtotal)}</div>
                        </div>
                        {order.discountAmount > 0 && (
                          <div>
                            <span className="text-muted-foreground">Discount:</span>
                            <div className="font-medium text-destructive">-{formatCurrency(order.discountAmount)}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <div className="font-bold text-lg text-primary">
                            {formatCurrency(order.total)}
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
                            className="flex-1 sm:flex-none"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - {selectedOrder?.order.orderNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <OrderDetailsContent
                              selectedOrder={selectedOrder}
                              getPaymentIcon={getPaymentIcon}
                              formatCurrency={formatCurrency}
                              printReceipt={printReceipt}
                            />
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

// Separate component for order details to keep the main component clean
function OrderDetailsContent({
  selectedOrder,
  getPaymentIcon,
  formatCurrency,
  printReceipt
}: {
  selectedOrder: { order: Order; items: OrderItem[]; payments?: PaymentDetail[] };
  getPaymentIcon: (type: string) => React.ReactNode;
  formatCurrency: (amount: number) => string;
  printReceipt: (order: Order, items: OrderItem[], payments?: PaymentDetail[]) => void;
}) {
  return (
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
            {selectedOrder.order.customer?.name || 'Walk-in'}
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
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    {payment.chequeNumber && (
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div>Cheque #: {payment.chequeNumber}</div>
                        {payment.chequeBankName && <div>Bank: {payment.chequeBankName}</div>}
                        {payment.chequePayerName && <div>Payer: {payment.chequePayerName}</div>}
                        {payment.chequeDate && <div>Date: {new Date(payment.chequeDate).toLocaleDateString()}</div>}
                      </div>
                    )}
                    {payment.reference && !payment.chequeNumber && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Ref: {payment.reference}
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
                  <div className="font-medium">{formatCurrency(item.pricePerKg)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Base Total:</span>
                  <div className="font-medium">{formatCurrency(item.baseTotal)}</div>
                </div>
                {item.itemDiscountAmount > 0 && (
                  <div>
                    <span className="text-muted-foreground">Discount:</span>
                    <div className="font-medium text-destructive">
                      -{formatCurrency(item.itemDiscountAmount)}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Item Total:</span>
                  <div className="font-bold text-primary">
                    {formatCurrency(item.finalTotal)}
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
            {formatCurrency(selectedOrder.order.subtotal)}
          </span>
        </div>
        {selectedOrder.order.discountAmount > 0 && (
          <div className="flex justify-between text-destructive">
            <span>Discount ({selectedOrder.order.discountPercent}%):</span>
            <span className="font-semibold">
              -{formatCurrency(selectedOrder.order.discountAmount)}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-xl font-bold">
          <span>Total:</span>
          <span className="text-primary">
            {formatCurrency(selectedOrder.order.total)}
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
  );
}
