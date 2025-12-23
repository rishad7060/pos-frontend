'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Package, Eye, Check, Search, Calendar, Filter, X, Edit, Trash2, DollarSign, FileText, TrendingUp, AlertCircle, History, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface Purchase {
  id: number;
  purchaseNumber: string;
  supplierId: number;
  status: string;
  subtotal: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  createdAt: string;
  notes?: string;
  items?: PurchaseItem[]; // Include items to check if fully received
}

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  defaultPricePerKg: number;
  stockQuantity: number;
  unitType: 'weight' | 'unit';
}

interface PurchaseItem {
  id: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
}

interface DetailedPurchase extends Purchase {
  items: PurchaseItem[];
  supplier?: Supplier;
}

interface PaymentHistory {
  id: number;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string;
  reference: string | null;
  userId: number | null;
  notes: string | null;
  createdAt: string;
}

interface ReceiveHistory {
  id: number;
  purchaseItemId: number;
  receivedQuantity: number;
  userId: number;
  receivedDate: string;
  notes: string | null;
  createdAt: string;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<DetailedPurchase | null>(null);

  // History state
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [receiveHistory, setReceiveHistory] = useState<ReceiveHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Receive items state
  const [receiveQuantities, setReceiveQuantities] = useState<{ [key: number]: number }>({});

  // Payment state
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    existingChequeId: null as number | null,
    useExistingCheque: false,
    chequeDetails: {
      chequeNumber: '',
      chequeDate: new Date().toISOString().split('T')[0],
      depositReminderDate: '',
      payerName: '',
      payeeName: '',
      bankName: '',
      branchName: '',
      notes: ''
    }
  });

  const [availableCheques, setAvailableCheques] = useState<any[]>([]);

  // Search state for dropdowns
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});

  const [formData, setFormData] = useState({
    supplierId: '',
    items: [{ productId: '', productName: '', quantity: '', unitPrice: '', unitType: 'weight' as 'weight' | 'unit' }],
    taxAmount: 0,
    shippingCost: 0,
    notes: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalPurchases: 0,
    pendingAmount: 0,
    receivedToday: 0,
    pendingOrders: 0
  });

  // Confirmation dialog state
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [purchaseToCancel, setPurchaseToCancel] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [purchases, searchTerm, statusFilter, supplierFilter, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        fetch('/api/purchases?limit=200'),
        fetch('/api/suppliers?isActive=true&limit=200'),
        fetch('/api/products?isActive=true&limit=200')
      ]);

      // Check if responses are OK
      if (!purchasesRes.ok || !suppliersRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const purchasesData = await purchasesRes.json();
      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();

      // Validate that we got arrays
      if (Array.isArray(purchasesData)) {
        setPurchases(purchasesData);
        calculateStats(purchasesData);
      } else {
        console.error('Expected purchases array but got:', purchasesData);
        setPurchases([]);
      }

      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
      } else {
        console.error('Expected suppliers array but got:', suppliersData);
        setSuppliers([]);
      }

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else {
        console.error('Expected products array but got:', productsData);
        setProducts([]);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      setPurchases([]);
      setSuppliers([]);
      setProducts([]);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async (purchaseId: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/purchase-payments?purchaseId=${purchaseId}&limit=100`);
      const data = await response.json();
      setPaymentHistory(data);
    } catch (error) {
      toast.error('Failed to fetch payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchReceiveHistory = async (purchaseId: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/purchase-receives?purchaseId=${purchaseId}&limit=100`);
      const data = await response.json();
      setReceiveHistory(data);
    } catch (error) {
      toast.error('Failed to fetch receiving history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAvailableCheques = async () => {
    try {
      // Fetch received, pending cheques that are not endorsed
      const response = await fetch('/api/cheques?status=pending&transactionType=received&limit=100');
      const data = await response.json();
      // Filter out endorsed cheques
      const availableForEndorsement = Array.isArray(data)
        ? data.filter((cheque: any) => !cheque.isEndorsed)
        : [];
      setAvailableCheques(availableForEndorsement);
    } catch (error) {
      console.error('Failed to fetch available cheques:', error);
      setAvailableCheques([]);
    }
  };

  const handleExistingChequeSelect = (chequeId: string) => {
    if (!chequeId) {
      setPaymentFormData({
        ...paymentFormData,
        existingChequeId: null,
        amount: '',
        chequeDetails: {
          chequeNumber: '',
          chequeDate: new Date().toISOString().split('T')[0],
          depositReminderDate: '',
          payerName: '',
          payeeName: '',
          bankName: '',
          branchName: '',
          notes: ''
        }
      });
      return;
    }

    const selectedCheque = availableCheques.find(c => c.id === parseInt(chequeId));
    if (selectedCheque) {
      setPaymentFormData({
        ...paymentFormData,
        existingChequeId: selectedCheque.id,
        amount: selectedCheque.amount.toString(),
        chequeDetails: {
          chequeNumber: selectedCheque.chequeNumber,
          chequeDate: selectedCheque.chequeDate.split('T')[0],
          depositReminderDate: selectedCheque.depositReminderDate ? selectedCheque.depositReminderDate.split('T')[0] : '',
          payerName: selectedCheque.payerName,
          payeeName: selectedCheque.payeeName || '',
          bankName: selectedCheque.bankName,
          branchName: selectedCheque.branchName || '',
          notes: selectedCheque.notes || ''
        }
      });
    }
  };

  const calculateStats = (purchasesData: Purchase[]) => {
    const today = new Date().toISOString().split('T')[0];

    const totalPurchases = purchasesData.reduce((sum, p) => sum + (p.total ?? 0), 0);
    const pendingAmount = purchasesData
      .filter(p => p.paymentStatus === 'unpaid' || p.paymentStatus === 'partial')
      .reduce((sum, p) => sum + ((p.total ?? 0) - (p.paidAmount ?? 0)), 0);
    const receivedToday = purchasesData
      .filter(p => p.status === 'received' && p.createdAt.startsWith(today))
      .length;
    const pendingOrders = purchasesData.filter(p => p.status === 'pending').length;

    setStats({ totalPurchases, pendingAmount, receivedToday, pendingOrders });
  };

  const applyFilters = () => {
    let filtered = [...purchases];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(p => p.supplierId === parseInt(supplierFilter));
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(p => p.createdAt >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(p => p.createdAt <= dateTo + 'T23:59:59');
    }

    setFilteredPurchases(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    const validItems = formData.items.filter(item =>
      item.productName && item.quantity && item.unitPrice
    );

    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const subtotal = validItems.reduce((sum, item) =>
      sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0
    );
    const total = subtotal + formData.taxAmount + formData.shippingCost;

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: parseInt(formData.supplierId),
          items: validItems.map(item => ({
            productId: item.productId ? parseInt(item.productId) : null,
            productName: item.productName,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
          })),
          subtotal,
          taxAmount: formData.taxAmount,
          shippingCost: formData.shippingCost,
          total,
          status: 'pending',
          paymentStatus: 'unpaid',
          notes: formData.notes,
          userId: 1 // TODO: Get from session
        })
      });

      if (!response.ok) throw new Error();

      toast.success('Purchase order created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create purchase order');
    }
  };

  const openDetailsDialog = async (purchase: Purchase) => {
    try {
      const response = await fetch(`/api/purchases?id=${purchase.id}`);
      const data = await response.json();

      // Fetch supplier details
      const supplierRes = await fetch(`/api/suppliers?id=${purchase.supplierId}`);
      const supplierData = await supplierRes.json();

      // The API returns an array when fetching by ID, extract the first element
      const supplier = Array.isArray(supplierData) ? supplierData[0] : supplierData;

      setSelectedPurchase({ ...data, supplier });

      // Fetch histories
      fetchPaymentHistory(purchase.id);
      fetchReceiveHistory(purchase.id);

      setDetailsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load purchase details');
    }
  };

  const openReceiveDialog = async (purchase: Purchase) => {
    try {
      const response = await fetch(`/api/purchases?id=${purchase.id}`);
      const data = await response.json();
      setSelectedPurchase(data);

      // Initialize receive quantities with remaining quantities
      const initialQuantities: { [key: number]: number } = {};
      data.items?.forEach((item: PurchaseItem) => {
        const remaining = item.quantity - item.receivedQuantity;
        if (remaining > 0) {
          initialQuantities[item.id] = remaining;
        }
      });
      setReceiveQuantities(initialQuantities);

      setReceiveDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load purchase details');
    }
  };

  const handleReceiveItems = async () => {
    if (!selectedPurchase) return;

    const itemsToReceive = Object.entries(receiveQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        purchaseItemId: parseInt(itemId),
        receivedQuantity: qty
      }));

    if (itemsToReceive.length === 0) {
      toast.error('Please specify quantities to receive');
      return;
    }

    try {
      const receivedDate = new Date().toISOString();
      const userId = 1; // TODO: Get from session

      // Create receive records for each item
      const promises = itemsToReceive.map(item =>
        fetch('/api/purchase-receives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchaseId: selectedPurchase.id,
            purchaseItemId: item.purchaseItemId,
            receivedQuantity: item.receivedQuantity,
            userId,
            receivedDate
          })
        })
      );

      await Promise.all(promises);

      toast.success('Items received successfully');
      setReceiveDialogOpen(false);
      setReceiveQuantities({});
      fetchData();
    } catch (error) {
      toast.error('Failed to receive items');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPurchase || !paymentFormData.amount) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentFormData.amount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    const remainingAmount = (selectedPurchase.total ?? 0) - (selectedPurchase.paidAmount ?? 0);
    if (amount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining balance (LKR ${remainingAmount.toFixed(2)})`);
      return;
    }

    // Validate cheque details if payment method is cheque and not using existing cheque
    if (paymentFormData.paymentMethod === 'cheque' && !paymentFormData.useExistingCheque) {
      if (!paymentFormData.chequeDetails.chequeNumber.trim()) {
        toast.error('Please enter cheque number');
        return;
      }
      if (!paymentFormData.chequeDetails.chequeDate) {
        toast.error('Please select cheque date');
        return;
      }
      if (!paymentFormData.chequeDetails.payerName.trim()) {
        toast.error('Please enter payer name');
        return;
      }
      if (!paymentFormData.chequeDetails.bankName.trim()) {
        toast.error('Please enter bank name');
        return;
      }
    }

    // Validate existing cheque selection
    if (paymentFormData.paymentMethod === 'cheque' && paymentFormData.useExistingCheque && !paymentFormData.existingChequeId) {
      toast.error('Please select an existing cheque');
      return;
    }

    try {
      const requestBody: any = {
        purchaseId: selectedPurchase.id,
        amount,
        paymentMethod: paymentFormData.paymentMethod,
        paymentDate: paymentFormData.paymentDate,
        reference: paymentFormData.reference || null,
        notes: paymentFormData.notes || null,
        userId: 1 // TODO: Get from session
      };

      // Add cheque details if payment method is cheque
      if (paymentFormData.paymentMethod === 'cheque') {
        if (paymentFormData.useExistingCheque && paymentFormData.existingChequeId) {
          // Link to existing cheque
          requestBody.existingChequeId = paymentFormData.existingChequeId;
        } else {
          // Create new cheque
          requestBody.chequeDetails = {
            chequeNumber: paymentFormData.chequeDetails.chequeNumber,
            chequeDate: paymentFormData.chequeDetails.chequeDate,
            depositReminderDate: paymentFormData.chequeDetails.depositReminderDate || undefined,
            payerName: paymentFormData.chequeDetails.payerName,
            payeeName: paymentFormData.chequeDetails.payeeName || undefined,
            bankName: paymentFormData.chequeDetails.bankName,
            branchName: paymentFormData.chequeDetails.branchName || undefined,
            notes: paymentFormData.chequeDetails.notes || undefined,
          };
        }
      }

      const response = await fetch('/api/purchase-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error();

      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentFormData({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        existingChequeId: null,
        useExistingCheque: false,
        chequeDetails: {
          chequeNumber: '',
          chequeDate: new Date().toISOString().split('T')[0],
          depositReminderDate: '',
          payerName: '',
          payeeName: '',
          bankName: '',
          branchName: '',
          notes: ''
        }
      });

      // Refresh data and close dialog
      await fetchData();
      setDetailsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleCancelPurchase = async (purchaseId: number) => {
    setPurchaseToCancel(purchaseId);
    setCancelConfirmOpen(true);
  };

  const confirmCancelPurchase = async () => {
    if (!purchaseToCancel) return;

    try {
      const response = await fetch('/api/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: purchaseToCancel,
          status: 'cancelled'
        })
      });

      if (!response.ok) throw new Error();

      toast.success('Purchase order cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel purchase order');
    } finally {
      setCancelConfirmOpen(false);
      setPurchaseToCancel(null);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productName: '', quantity: '', unitPrice: '', unitType: 'weight' as 'weight' | 'unit' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems.length > 0 ? newItems : [{ productId: '', productName: '', quantity: '', unitPrice: '', unitType: 'weight' as 'weight' | 'unit' }] });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'productId' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.defaultPricePerKg?.toString() || '';
        newItems[index].unitType = product.unitType;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [{ productId: '', productName: '', quantity: '', unitPrice: '', unitType: 'weight' as 'weight' | 'unit' }],
      taxAmount: 0,
      shippingCost: 0,
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon?: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: AlertCircle },
      received: { variant: 'default', label: 'Received', icon: Check },
      completed: { variant: 'default', label: 'Completed', icon: Check },
      partial: { variant: 'outline', label: 'Partial', icon: TrendingUp },
      cancelled: { variant: 'destructive', label: 'Cancelled', icon: X }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      unpaid: { variant: 'destructive', label: 'Unpaid' },
      partial: { variant: 'outline', label: 'Partial' }
    };
    const config = variants[paymentStatus] || variants.unpaid;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateFormTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      if (item.quantity && item.unitPrice) {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
      }
      return sum;
    }, 0);
    return subtotal + formData.taxAmount + formData.shippingCost;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Purchase Management</h1>
            <p className="text-sm text-muted-foreground">Manage purchase orders, suppliers & inventory receiving</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Order
        </Button>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">LKR {(stats.totalPurchases ?? 0).toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-200/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold">LKR {(stats.pendingAmount ?? 0).toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-200/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Received Today</p>
                <p className="text-2xl font-bold">{stats.receivedToday}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-200/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-200/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by purchase number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="From"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  placeholder="To"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {(searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || dateFrom || dateTo) && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading purchases...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No purchase orders found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'Create your first purchase order to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && supplierFilter === 'all' && !dateFrom && !dateTo && (
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => {
            const supplier = suppliers.find(s => s.id === purchase.supplierId);
            const remainingBalance = (purchase.total ?? 0) - (purchase.paidAmount ?? 0);

            return (
              <Card key={purchase.id} className="hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 w-full">
                      <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Package className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{purchase.purchaseNumber}</h3>
                            <p className="text-sm text-muted-foreground">
                              {supplier?.name || 'Unknown Supplier'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(purchase.status)}
                            {getPaymentBadge(purchase.paymentStatus)}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(purchase.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Total: LKR {(purchase.total ?? 0).toFixed(2)}
                          </div>
                          {purchase.paymentStatus !== 'paid' && (
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <AlertCircle className="h-4 w-4" />
                              Due: LKR {(remainingBalance ?? 0).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {purchase.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {purchase.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailsDialog(purchase)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>

                      {(() => {
                        // Check if all items are fully received
                        const hasItems = purchase.items && purchase.items.length > 0;
                        const allItemsReceived = hasItems
                          ? purchase.items!.every((item: PurchaseItem) => {
                            const remaining = (item.quantity || 0) - (item.receivedQuantity || 0);
                            return remaining <= 0;
                          })
                          : false;

                        // Show receive button if:
                        // - Status is not 'completed', 'received', or 'cancelled'
                        // - OR if items exist and not all are fully received
                        const shouldShowReceive =
                          purchase.status !== 'completed' &&
                          purchase.status !== 'received' &&
                          purchase.status !== 'cancelled' &&
                          !allItemsReceived;

                        return shouldShowReceive ? (
                          <Button
                            size="sm"
                            onClick={() => openReceiveDialog(purchase)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Receive
                          </Button>
                        ) : null;
                      })()}

                      {purchase.paymentStatus !== 'paid' && purchase.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            openDetailsDialog(purchase).then(() => {
                              setPaymentDialogOpen(true);
                            });
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pay
                        </Button>
                      )}

                      {purchase.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelPurchase(purchase.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel Purchase Order"
        description="Are you sure you want to cancel this purchase order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="warning"
        onConfirm={confirmCancelPurchase}
      />

      {/* Create Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create New Purchase Order</DialogTitle>
            <DialogDescription>
              Add items, specify quantities and prices for your purchase order
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, supplierId: value });
                    setSupplierSearchTerm('');
                  }}
                  onOpenChange={(open) => {
                    if (!open) setSupplierSearchTerm('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]" sideOffset={5}>
                    <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search suppliers..."
                          value={supplierSearchTerm}
                          onChange={(e) => setSupplierSearchTerm(e.target.value)}
                          className="pl-8 h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {suppliers
                        .filter(supplier =>
                          supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                          supplier.phone?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                        )
                        .map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{supplier.name}</span>
                              {supplier.phone && (
                                <span className="text-xs text-muted-foreground">{supplier.phone}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      }
                      {suppliers.filter(s =>
                        s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                        s.phone?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No suppliers found
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes (optional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {formData.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => {
                              updateItem(index, 'productId', value);
                              setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                            }}
                            onOpenChange={(open) => {
                              if (!open) setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]" sideOffset={5}>
                              <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search products..."
                                    value={productSearchTerms[index] || ''}
                                    onChange={(e) => setProductSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                                    className="pl-8 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-[240px] overflow-y-auto">
                                {products
                                  .filter(product =>
                                    product.name.toLowerCase().includes((productSearchTerms[index] || '').toLowerCase()) ||
                                    product.sku?.toLowerCase().includes((productSearchTerms[index] || '').toLowerCase())
                                  )
                                  .map(product => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      <div className="flex flex-col items-start py-1">
                                        <span className="font-medium text-sm">{product.name}</span>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                          Stock: {product.stockQuantity} | Default Price: LKR {(product.defaultPricePerKg ?? 0).toFixed(2)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                }
                                {products.filter(p =>
                                  p.name.toLowerCase().includes((productSearchTerms[index] || '').toLowerCase()) ||
                                  p.sku?.toLowerCase().includes((productSearchTerms[index] || '').toLowerCase())
                                ).length === 0 && (
                                  <div className="p-4 text-sm text-muted-foreground text-center">
                                    No products found
                                  </div>
                                )}
                              </div>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quantity</Label>
                              {item.productId && (
                                <Badge variant="outline" className="text-xs">
                                  {item.unitType === 'weight' ? 'KG' : 'UNIT'}
                                </Badge>
                              )}
                            </div>
                            <Input
                              placeholder={item.unitType === 'weight' ? '0.000' : '0'}
                              type="number"
                              step={item.unitType === 'weight' ? '0.001' : '1'}
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              className="font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Unit Price</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">LKR</span>
                              <Input
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                className="pl-9 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Total</Label>
                            <div className="h-10 flex items-center px-3 bg-muted/50 rounded-md border border-input">
                              <span className="text-sm font-bold font-mono">
                                {item.quantity && item.unitPrice
                                  ? `LKR ${(parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2)}`
                                  : 'LKR 0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tax Amount (LKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipping Cost (LKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="h-10 flex items-center px-3 bg-primary/10 rounded-md border-2 border-primary">
                  <span className="text-lg font-bold text-primary">
                    LKR {calculateFormTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enhanced Details Dialog with Tabs */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedPurchase?.purchaseNumber}</DialogTitle>
            <DialogDescription>Purchase order details, items, payment and receiving history</DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Order Details</TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment History
                </TabsTrigger>
                <TabsTrigger value="receives">
                  <History className="h-4 w-4 mr-2" />
                  Receiving History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Supplier Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Name:</span> {selectedPurchase.supplier?.name}</p>
                        {selectedPurchase.supplier?.phone && (
                          <p><span className="font-medium">Phone:</span> {selectedPurchase.supplier.phone}</p>
                        )}
                        {selectedPurchase.supplier?.email && (
                          <p><span className="font-medium">Email:</span> {selectedPurchase.supplier.email}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Order Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status:</span>
                          {getStatusBadge(selectedPurchase.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Payment:</span>
                          {getPaymentBadge(selectedPurchase.paymentStatus)}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Date:</span> {new Date(selectedPurchase.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="font-semibold mb-3">Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Product</th>
                          <th className="text-right p-3 text-sm font-medium">Quantity</th>
                          <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                          <th className="text-right p-3 text-sm font-medium">Total</th>
                          <th className="text-right p-3 text-sm font-medium">Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.items?.map((item: PurchaseItem) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">{item.productName}</td>
                            <td className="p-3 text-right">{item.quantity}</td>
                            <td className="p-3 text-right">LKR {(item.unitPrice ?? 0).toFixed(2)}</td>
                            <td className="p-3 text-right">LKR {(item.totalPrice ?? 0).toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <Badge variant={item.receivedQuantity >= item.quantity ? 'default' : 'secondary'}>
                                {item.receivedQuantity} / {item.quantity}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>LKR {(selectedPurchase.subtotal ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Paid Amount:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          LKR {(selectedPurchase.paidAmount ?? 0).toFixed(2)}
                        </span>
                      </div>
                      {selectedPurchase.paymentStatus !== 'paid' && (
                        <div className="flex justify-between text-sm">
                          <span>Remaining Balance:</span>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            LKR {((selectedPurchase.total ?? 0) - (selectedPurchase.paidAmount ?? 0)).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>LKR {(selectedPurchase.total ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedPurchase.notes && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">{selectedPurchase.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Payment Records</h4>
                  {selectedPurchase.paymentStatus !== 'paid' && (
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </div>

                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No payment records found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <Card key={payment.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">LKR {(payment.amount ?? 0).toFixed(2)}</span>
                                {payment.paymentMethod && (
                                  <Badge variant="outline">{payment.paymentMethod}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                              {payment.reference && (
                                <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                              )}
                              {payment.notes && (
                                <p className="text-xs text-muted-foreground italic">{payment.notes}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="receives" className="space-y-4 mt-6">
                <h4 className="font-semibold">Receiving Records</h4>

                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : receiveHistory.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No receiving records found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {receiveHistory.map((receive) => {
                      const item = selectedPurchase.items?.find(i => i.id === receive.purchaseItemId);
                      return (
                        <Card key={receive.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{item?.productName || 'Unknown Product'}</span>
                                  <Badge variant="outline">Qty: {receive.receivedQuantity}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Received on {new Date(receive.receivedDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                {receive.notes && (
                                  <p className="text-xs text-muted-foreground italic">{receive.notes}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(receive.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Receive Items Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Receive Items - {selectedPurchase?.purchaseNumber}</DialogTitle>
            <DialogDescription>
              Specify quantities to receive. Remaining quantities are pre-filled. Stock will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                selectedPurchase.items.map((item: PurchaseItem) => {
                  const remainingQty = (item.quantity || 0) - (item.receivedQuantity || 0);
                  const isFullyReceived = remainingQty <= 0;

                  return (
                    <Card key={item.id} className={isFullyReceived ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{item.productName || 'Unknown Product'}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Ordered: {item.quantity || 0}</span>
                              <span>Received: {item.receivedQuantity || 0}</span>
                              <span className={remainingQty > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                                Remaining: {remainingQty.toFixed(3)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!isFullyReceived ? (
                              <>
                                <div className="w-40">
                                  <Label htmlFor={`receive-qty-${item.id}`} className="sr-only">
                                    Quantity to receive
                                  </Label>
                                  <Input
                                    id={`receive-qty-${item.id}`}
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max={remainingQty}
                                    placeholder={`Max: ${remainingQty.toFixed(3)}`}
                                    value={receiveQuantities[item.id] ?? ''}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      if (inputValue === '') {
                                        setReceiveQuantities({
                                          ...receiveQuantities,
                                          [item.id]: 0
                                        });
                                        return;
                                      }
                                      const value = parseFloat(inputValue);
                                      if (isNaN(value) || value < 0) {
                                        return;
                                      }
                                      if (value > remainingQty) {
                                        toast.error(`Cannot exceed remaining quantity (${remainingQty.toFixed(3)})`);
                                        setReceiveQuantities({
                                          ...receiveQuantities,
                                          [item.id]: remainingQty
                                        });
                                        return;
                                      }
                                      setReceiveQuantities({
                                        ...receiveQuantities,
                                        [item.id]: value
                                      });
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReceiveQuantities({
                                      ...receiveQuantities,
                                      [item.id]: remainingQty
                                    });
                                  }}
                                  disabled={remainingQty <= 0}
                                >
                                  All
                                </Button>
                              </>
                            ) : (
                              <Badge variant="default" className="gap-1">
                                <Check className="h-3 w-3" />
                                Complete
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items found in this purchase order.</p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReceiveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReceiveItems}
                  disabled={!selectedPurchase.items || selectedPurchase.items.length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Receive Items
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add a payment for {selectedPurchase?.purchaseNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] pr-2">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-semibold">LKR {(selectedPurchase.total ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Amount:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        LKR {(selectedPurchase.paidAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="text-orange-600 dark:text-orange-400 font-bold">
                        LKR {((selectedPurchase.total ?? 0) - (selectedPurchase.paidAmount ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Payment Amount (LKR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  disabled={paymentFormData.paymentMethod === 'cheque' && paymentFormData.useExistingCheque}
                  autoFocus
                />
                {paymentFormData.paymentMethod === 'cheque' && paymentFormData.useExistingCheque && (
                  <p className="text-xs text-muted-foreground">
                    Amount is set from the selected cheque and cannot be changed
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentFormData.paymentMethod} onValueChange={(value) => setPaymentFormData({ ...paymentFormData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentFormData.paymentMethod === 'cheque' && (
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <FileText className="h-4 w-4" />
                      <span>Cheque Details</span>
                    </div>

                    {/* Toggle between existing and new cheque */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="chequeType"
                            checked={!paymentFormData.useExistingCheque}
                            onChange={() => {
                              setPaymentFormData({
                                ...paymentFormData,
                                useExistingCheque: false,
                                existingChequeId: null,
                                amount: '',
                                chequeDetails: {
                                  chequeNumber: '',
                                  chequeDate: new Date().toISOString().split('T')[0],
                                  depositReminderDate: '',
                                  payerName: '',
                                  payeeName: '',
                                  bankName: '',
                                  branchName: '',
                                  notes: ''
                                }
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Enter New Cheque</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="chequeType"
                            checked={paymentFormData.useExistingCheque}
                            onChange={() => {
                              setPaymentFormData({
                                ...paymentFormData,
                                useExistingCheque: true,
                                amount: '',
                                existingChequeId: null,
                              });
                              fetchAvailableCheques();
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Use Existing Cheque (Received from Customer)</span>
                        </label>
                      </div>
                    </div>

                    {/* Existing Cheque Selector */}
                    {paymentFormData.useExistingCheque && (
                      <div className="space-y-1">
                        <Label className="text-xs">Select Cheque *</Label>
                        <Select
                          value={paymentFormData.existingChequeId?.toString() || ''}
                          onValueChange={handleExistingChequeSelect}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose a received cheque..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[250px] overflow-y-auto w-full" sideOffset={5}>
                            {availableCheques.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No available cheques. All received cheques are either deposited or endorsed.
                              </div>
                            ) : (
                              availableCheques.map((cheque) => (
                                <SelectItem key={cheque.id} value={cheque.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">{cheque.chequeNumber}</span>
                                    <span className="text-muted-foreground">-</span>
                                    <span className="font-bold">LKR {cheque.amount.toFixed(2)}</span>
                                    <span className="text-muted-foreground text-xs">from {cheque.payerName}</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {paymentFormData.existingChequeId ? (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Cheque selected - Payment amount set to LKR {paymentFormData.amount}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Select a received cheque to endorse it to this supplier
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Cheque Number *</Label>
                        <Input
                          placeholder="Cheque no."
                          value={paymentFormData.chequeDetails.chequeNumber}
                          onChange={(e) => setPaymentFormData({
                            ...paymentFormData,
                            chequeDetails: { ...paymentFormData.chequeDetails, chequeNumber: e.target.value }
                          })}
                          disabled={paymentFormData.useExistingCheque}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Cheque Date *</Label>
                        <Input
                          type="date"
                          value={paymentFormData.chequeDetails.chequeDate}
                          onChange={(e) => setPaymentFormData({
                            ...paymentFormData,
                            chequeDetails: { ...paymentFormData.chequeDetails, chequeDate: e.target.value }
                          })}
                          disabled={paymentFormData.useExistingCheque}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Deposit Reminder (Optional)</Label>
                      <Input
                        type="date"
                        value={paymentFormData.chequeDetails.depositReminderDate}
                        onChange={(e) => setPaymentFormData({
                          ...paymentFormData,
                          chequeDetails: { ...paymentFormData.chequeDetails, depositReminderDate: e.target.value }
                        })}
                        disabled={paymentFormData.useExistingCheque}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        {paymentFormData.useExistingCheque
                          ? 'Reminder date from selected cheque'
                          : 'Set a date to remind depositing this cheque at bank'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Payer Name (Our Company) *</Label>
                      <Input
                        placeholder="Name on cheque"
                        value={paymentFormData.chequeDetails.payerName}
                        onChange={(e) => setPaymentFormData({
                          ...paymentFormData,
                          chequeDetails: { ...paymentFormData.chequeDetails, payerName: e.target.value }
                        })}
                        disabled={paymentFormData.useExistingCheque}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Payee Name (Supplier)</Label>
                      <Input
                        placeholder="Pay to the order of"
                        value={paymentFormData.chequeDetails.payeeName}
                        onChange={(e) => setPaymentFormData({
                          ...paymentFormData,
                          chequeDetails: { ...paymentFormData.chequeDetails, payeeName: e.target.value }
                        })}
                        disabled={paymentFormData.useExistingCheque}
                        className="h-9"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Bank Name *</Label>
                        <Input
                          placeholder="Bank name"
                          value={paymentFormData.chequeDetails.bankName}
                          onChange={(e) => setPaymentFormData({
                            ...paymentFormData,
                            chequeDetails: { ...paymentFormData.chequeDetails, bankName: e.target.value }
                          })}
                          disabled={paymentFormData.useExistingCheque}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Branch Name</Label>
                        <Input
                          placeholder="Branch"
                          value={paymentFormData.chequeDetails.branchName}
                          onChange={(e) => setPaymentFormData({
                            ...paymentFormData,
                            chequeDetails: { ...paymentFormData.chequeDetails, branchName: e.target.value }
                          })}
                          disabled={paymentFormData.useExistingCheque}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                />
              </div>

              {paymentFormData.paymentMethod !== 'cheque' && (
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    placeholder="Payment reference (optional)"
                    value={paymentFormData.reference}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes (optional)"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}