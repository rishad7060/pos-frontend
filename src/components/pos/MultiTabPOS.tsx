'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Trash2, Plus, Calculator, ShoppingCart, Search, Package, Minus, Scale, CreditCard, X, AlertTriangle, Edit2, PackageX, CheckCircle2, Grid3x3, User, Printer, Shield, RefreshCw, LayoutGrid, List, ChevronUp } from 'lucide-react';
import PaymentDialog from './PaymentDialog';
import RefundDialog from './RefundDialog';
import { CustomerSelection, Customer } from './CustomerSelection';
import { toast } from 'sonner';
import { printReceiptBrowser } from '@/lib/printer';
import { api } from '@/lib/api';
import { offlineApi } from '@/lib/offline-api';
import { isOnline } from '@/lib/hooks/use-network-status';
import Fuse from 'fuse.js';

interface Product {
  id: number;
  name: string;
  description: string | null;
  defaultPricePerKg: number | null;
  category: string | null;
  isActive: boolean;
  sku: string | null;
  stockQuantity: number;
  unitType: string;
  imageUrl?: string | null;
}

interface CartItem {
  id: string;
  productId: number | null;
  itemName: string;
  quantityType: 'kg' | 'g' | 'box';
  itemWeightKg: number;
  itemWeightG: number;
  boxWeightKg: number;
  boxWeightG: number;
  boxCount: number;
  pricePerKg: number;
  itemDiscountPercent: number;
  itemWeightTotalKg: number;
  boxWeightPerBoxKg: number;
  totalBoxWeightKg: number;
  netWeightKg: number;
  baseTotal: number;
  itemDiscountAmount: number;
  finalTotal: number;
  stockAvailable: number;
}

interface OrderTab {
  id: string;
  name: string;
  cart: CartItem[];
  orderDiscount: number;
  customer: Customer | null;
  createdAt: number;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface MultiTabPOSProps {
  cashierId: number;
  onOrderComplete?: () => void;
  registrySessionId?: number; // TEAM_003: Link orders to registry session
  cashierName?: string; // TEAM_003: Cashier name for receipt
  initialPermissions?: any; // TEAM_003: Permissions passed from parent
}

// Debug function to check permissions
const debugPermissions = (permissions: any, context: string) => {
  console.log(`[${context}] Permissions:`, {
    canEditPrices: permissions?.canEditPrices,
    canApplyDiscount: permissions?.canApplyDiscount,
    canVoidOrders: permissions?.canVoidOrders,
    canUpdateStock: permissions?.canUpdateStock,
    canProcessRefunds: permissions?.canProcessRefunds,
    fullObject: permissions
  });
};

// Global function will be assigned after fetchPermissions is defined

// Category color mapping - each category gets a unique transparent color
const getCategoryColor = (categoryName: string): string => {
  const colors: { [key: string]: string } = {
    'seafood': 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40',
    'spices': 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/40',
    'dried goods': 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40',
    'beverages': 'bg-teal-500/20 hover:bg-teal-500/30 border-teal-500/40',
    'grains': 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40',
    'vegetables': 'bg-green-500/20 hover:bg-green-500/30 border-green-500/40',
    'fruits': 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/40',
    'meat': 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40',
    'dairy': 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40',
    'bakery': 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40',
  };

  const lowerCategory = categoryName.toLowerCase();
  return colors[lowerCategory] || 'bg-slate-500/20 hover:bg-slate-500/30 border-slate-500/40';
};

export default function MultiTabPOS({ cashierId, onOrderComplete, registrySessionId, cashierName = '', initialPermissions }: MultiTabPOSProps) {
  console.log('🔐 MultiTabPOS initialized with cashierId:', cashierId);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<{
    canApplyDiscount: boolean;
    maxDiscountPercent: number;
    canVoidOrders: boolean;
    canEditPrices: boolean;
    canAccessReports: boolean;
    requireManagerApproval: boolean;
    canUpdateStock: boolean;
    canProcessRefunds: boolean;
  } | null>(null);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Weight dialog state
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemWeightKg, setItemWeightKg] = useState(0);
  const [itemWeightG, setItemWeightG] = useState(0);
  const [boxWeightKg, setBoxWeightKg] = useState(0);
  const [boxWeightG, setBoxWeightG] = useState(0);
  const [boxCount, setBoxCount] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);

  // Stock update dialog
  const [stockUpdateDialogOpen, setStockUpdateDialogOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState(0);

  // Print dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<any>(null);
  const [printContent, setPrintContent] = useState('');
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);
  const [printKey, setPrintKey] = useState(0); // Key to force iframe remount
  const printIframeRef = useRef<HTMLIFrameElement>(null);
  const shouldAutoPrintRef = useRef(false); // Ref to track auto-print state
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const activeTab = orderTabs.find(tab => tab.id === activeTabId);

  // Calculate remaining stock for each product across all tabs
  const getRemainingStock = (productId: number): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;

    // Sum up all quantities in cart across all tabs for this product
    let totalInCart = 0;
    orderTabs.forEach(tab => {
      tab.cart.forEach(item => {
        if (item.productId === productId) {
          // Calculate actual quantity needed based on item type
          let itemQuantity = Number(item.netWeightKg || 0);
          if (item.quantityType === 'g') {
            itemQuantity = Number(item.itemWeightG || 0) / 1000; // Convert grams to kg
          }
          totalInCart += itemQuantity;
        }
      });
    });

    return Math.max(0, Number((Number(product.stockQuantity) - totalInCart).toFixed(3)));
  };

  useEffect(() => {
    // Initialize order tabs from localStorage or create first tab
    const savedTabs = localStorage.getItem('posTabs');
    const savedNextOrderNum = localStorage.getItem('posNextOrderNumber');

    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        setOrderTabs(parsedTabs);
        setActiveTabId(parsedTabs[0]?.id || '1');
      } catch (e) {
        // If parsing fails, create default tab
        setOrderTabs([{ id: '1', name: 'Order #1', cart: [], orderDiscount: 0, customer: null, createdAt: Date.now() }]);
      }
    } else {
      setOrderTabs([{ id: '1', name: 'Order #1', cart: [], orderDiscount: 0, customer: null, createdAt: Date.now() }]);
    }

    if (savedNextOrderNum) {
      setNextOrderNumber(parseInt(savedNextOrderNum) || 1);
    }

    fetchProducts();
    fetchCategories();
    fetchPrinterSettings();

    if (initialPermissions) {
      console.log('🔐 Using initialPermissions passed from parent:', initialPermissions);
      setPermissions(initialPermissions);
      debugPermissions(initialPermissions, 'Initial Prop Permissions');
    } else {
      fetchPermissions();
    }
  }, [initialPermissions]);

  // Save tabs and order number to localStorage whenever they change
  useEffect(() => {
    if (orderTabs.length > 0) {
      localStorage.setItem('posTabs', JSON.stringify(orderTabs));
    }
  }, [orderTabs]);

  useEffect(() => {
    localStorage.setItem('posNextOrderNumber', nextOrderNumber.toString());
  }, [nextOrderNumber]);

  const fetchPermissions = async () => {
    try {
      console.log('🔐 Fetching permissions for cashierId:', cashierId, 'Type:', typeof cashierId);
      const result = await api.get(`/api/cashier-permissions?cashierId=${cashierId}`);
      console.log('🔐 Raw permissions API result:', result);
      console.log('🔐 Result type:', typeof result);
      console.log('🔐 Result keys:', result ? Object.keys(result) : 'null/undefined');
      console.log('🔐 Result has error:', 'error' in result);
      console.log('🔐 Result error:', result?.error);
      console.log('🔐 Result.data:', result?.data);

      // Check if we got valid permission data
      if (result && !result.error && result.data) {
        // Check if this is a full permission object (with id) or default permissions
        const permissionData = result.data;
        const hasPermissionData = permissionData.id !== undefined || permissionData.canEditPrices !== undefined;

        if (hasPermissionData) {
          console.log('🔐 Setting permissions from API:', permissionData);
          const newPermissions = {
            canApplyDiscount: permissionData.canApplyDiscount === true || permissionData.canApplyDiscount === 1 || permissionData.canApplyDiscount === 'true',
            maxDiscountPercent: Number(permissionData.maxDiscountPercent) || 0,
            canVoidOrders: permissionData.canVoidOrders === true || permissionData.canVoidOrders === 1 || permissionData.canVoidOrders === 'true',
            canEditPrices: permissionData.canEditPrices === true || permissionData.canEditPrices === 1 || permissionData.canEditPrices === 'true',
            canAccessReports: permissionData.canAccessReports === true || permissionData.canAccessReports === 1 || permissionData.canAccessReports === 'true',
            requireManagerApproval: permissionData.requireManagerApproval === true || permissionData.requireManagerApproval === 1 || permissionData.requireManagerApproval === 'true',
            canUpdateStock: permissionData.canUpdateStock === true || permissionData.canUpdateStock === 1 || permissionData.canUpdateStock === 'true',
            canProcessRefunds: permissionData.canProcessRefunds === true || permissionData.canProcessRefunds === 1 || permissionData.canProcessRefunds === 'true',
          };
          console.log('🔐 Raw permission values:', {
            canEditPrices: permissionData.canEditPrices,
            type: typeof permissionData.canEditPrices
          });
          console.log('🔐 Converted permission values:', newPermissions);
          setPermissions(newPermissions);
          debugPermissions(newPermissions, 'POS Permission Load');
          console.log('🔐 Permissions set successfully. canEditPrices:', permissionData.canEditPrices, 'Boolean:', Boolean(permissionData.canEditPrices));
        } else {
          console.log('Using default permissions');
          const defaultPermissions = {
            canApplyDiscount: false,
            maxDiscountPercent: 0,
            canVoidOrders: false,
            canEditPrices: false,
            canAccessReports: false,
            requireManagerApproval: false,
            canUpdateStock: false,
            canProcessRefunds: false,
          };
          setPermissions(defaultPermissions);
          debugPermissions(defaultPermissions, 'Default Permissions');
        }
      } else {
        console.log('🔐 No valid permissions found or API error, using defaults');
        console.log('🔐 Result structure:', result);
        setPermissions({
          canApplyDiscount: false,
          maxDiscountPercent: 0,
          canVoidOrders: false,
          canEditPrices: false,
          canAccessReports: false,
          requireManagerApproval: false,
          canUpdateStock: false,
          canProcessRefunds: false,
        });
      }
    } catch (err) {
      console.error('🔐 Failed to fetch permissions:', err);
      // Set default restrictive permissions on error
      setPermissions({
        canApplyDiscount: false,
        maxDiscountPercent: 0,
        canVoidOrders: false,
        canEditPrices: false,
        canAccessReports: false,
        requireManagerApproval: false,
        canUpdateStock: false,
        canProcessRefunds: false,
      });
    }
  };

  // Expose debugging functions globally
  if (typeof window !== 'undefined') {
    (window as any).refreshPOSPermissions = () => {
      console.log('🔄 Manual permission refresh requested');
      fetchPermissions();
    };

    (window as any).checkPOSPermissions = () => {
      console.log('🔐 Current POS permissions:', permissions);
      console.log('🔐 Cashier ID:', cashierId);
      return permissions;
    };

    (window as any).testPermissionCheck = () => {
      console.log('🔐 Testing permission checks...');
      console.log('canEditPrices:', permissions?.canEditPrices);
      console.log('canApplyDiscount:', permissions?.canApplyDiscount);
      console.log('canProcessRefunds:', permissions?.canProcessRefunds);
    };
  }

  // Refresh permissions when cashierId changes
  useEffect(() => {
    if (cashierId && cashierId > 0) {
      console.log('🔄 CashierId changed, fetching permissions for:', cashierId);
      fetchPermissions();
    } else {
      console.log('🔄 Invalid cashierId:', cashierId, 'not fetching permissions');
    }
  }, [cashierId]);

  // Log permission changes
  useEffect(() => {
    console.log('🔐 Permissions state changed:', permissions);
  }, [permissions]);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      // TEAM_003: Use offline-aware API for product fetching
      const result = await offlineApi.getProducts({ isActive: true, limit: 100 });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch products');
      }

      setProducts(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const result = await api.get('/api/categories?limit=100');

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch categories');
      }

      setCategories(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchPrinterSettings = async () => {
    try {
      const result = await api.get('/api/printer-settings');
      if (result.data) {
        setPrinterSettings(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch printer settings:', err);
    }
  };

  const calculateItem = (
    itemKg: number,
    itemG: number,
    boxKg: number,
    boxG: number,
    boxes: number,
    price: number,
    discount: number
  ) => {
    // Validate grams input (must be 0-999)
    const validItemG = Math.min(999, Math.max(0, itemG));
    const validBoxG = Math.min(999, Math.max(0, boxG));

    // Convert to total kg with precision
    const itemWeightTotalKg = parseFloat((itemKg + (validItemG / 1000)).toFixed(3));
    const boxWeightPerBoxKg = parseFloat((boxKg + (validBoxG / 1000)).toFixed(3));
    const totalBoxWeightKg = parseFloat((boxWeightPerBoxKg * boxes).toFixed(3));

    // Calculate net weight - ensure it's not negative
    const netWeightKg = parseFloat(Math.max(0, itemWeightTotalKg - totalBoxWeightKg).toFixed(3));

    const baseTotal = parseFloat((netWeightKg * price).toFixed(2));
    const itemDiscountAmount = parseFloat((baseTotal * (discount / 100)).toFixed(2));
    const finalTotal = parseFloat((baseTotal - itemDiscountAmount).toFixed(2));

    return {
      itemWeightTotalKg,
      boxWeightPerBoxKg,
      totalBoxWeightKg,
      netWeightKg,
      baseTotal,
      itemDiscountAmount,
      finalTotal,
      // Add validation flags
      isValid: netWeightKg > 0 && itemWeightTotalKg > 0,
      exceedsItemWeight: totalBoxWeightKg > itemWeightTotalKg
    };
  };

  const createNewTab = () => {
    const newTab: OrderTab = {
      id: Date.now().toString(),
      name: `Order #${nextOrderNumber}`,
      cart: [],
      orderDiscount: 0,
      customer: null,
      createdAt: Date.now()
    };
    setOrderTabs([...orderTabs, newTab]);
    setActiveTabId(newTab.id);
    setNextOrderNumber(nextOrderNumber + 1);
    toast.success(`${newTab.name} created`);
  };

  const closeTab = (tabId: string) => {
    if (orderTabs.length === 1) {
      toast.error('Cannot close the last tab');
      return;
    }

    const tab = orderTabs.find(t => t.id === tabId);
    if (tab && tab.cart.length > 0) {
      toast.error('Cannot close order with items in cart. Please complete or clear the order first.');
      return;
    }

    const newTabs = orderTabs.filter(t => t.id !== tabId);
    setOrderTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
    toast.info(`Order tab closed`);
  };

  const updateActiveTabCart = (newCart: CartItem[]) => {
    setOrderTabs(orderTabs.map(tab =>
      tab.id === activeTabId ? { ...tab, cart: newCart } : tab
    ));
  };

  const updateActiveTabDiscount = (discountPercent: number) => {
    // Check if cashier can apply discounts
    if (!permissions?.canApplyDiscount) {
      toast.error('You do not have permission to apply discounts');
      return;
    }

    // Check max discount limit (still stored as percentage in permissions)
    const maxDiscountPercent = permissions?.maxDiscountPercent || 0;
    if (discountPercent > maxDiscountPercent) {
      // Also calculate max discount amount for clearer message
      const activeTab = orderTabs.find(t => t.id === activeTabId);
      const subtotal = activeTab ? activeTab.cart.reduce((sum, item) => sum + item.finalTotal, 0) : 0;
      const maxAmount = subtotal * (maxDiscountPercent / 100);
      toast.error(
        maxAmount > 0
          ? `Maximum discount allowed: LKR ${maxAmount.toFixed(2)} (${maxDiscountPercent}%)`
          : `Maximum discount allowed: ${maxDiscountPercent}%`
      );
      return;
    }

    setOrderTabs(orderTabs.map(tab =>
      tab.id === activeTabId ? { ...tab, orderDiscount: discountPercent } : tab
    ));
  };

  const updateActiveTabCustomer = (customer: Customer | null) => {
    setOrderTabs(orderTabs.map(tab =>
      tab.id === activeTabId ? { ...tab, customer } : tab
    ));
  };

  const openWeightDialog = (product: Product) => {
    setEditingCartItem(null);
    const remainingStock = getRemainingStock(product.id);

    if (remainingStock <= 0.001) {
      toast.error(`${product.name} is out of stock (${remainingStock.toFixed(3)} kg available)`);
      return;
    }

    setSelectedProduct(product);
    // Only use default price if cashier can't edit prices, otherwise start with default
    setPricePerKg(product.defaultPricePerKg || 0);
    setItemWeightKg(0);
    setItemWeightG(0);
    setBoxWeightKg(0);
    setBoxWeightG(0);
    setBoxCount(0);
    setItemDiscount(0);
    setWeightDialogOpen(true);
  };

  const handleEditCartItem = (item: CartItem) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    setEditingCartItem(item);
    setSelectedProduct(product);
    setItemWeightKg(item.itemWeightKg);
    setItemWeightG(item.itemWeightG);
    setBoxWeightKg(item.boxWeightKg);
    setBoxWeightG(item.boxWeightG);
    setBoxCount(item.boxCount);
    setPricePerKg(item.pricePerKg);
    setItemDiscount(item.itemDiscountPercent);
    setWeightDialogOpen(true);
  };

  const addWeightBasedProduct = () => {
    if (!selectedProduct || !activeTab) return;

    // Check if permissions are loaded
    if (!permissions) {
      console.log('Permissions not loaded yet, cannot add product');
      toast.error('Loading permissions... Please wait.');
      return;
    }

    // Check if price was edited and cashier doesn't have permission
    const hasPriceEditPermission = permissions.canEditPrices === true;
    console.log('🔐 Permission check - canEditPrices:', permissions.canEditPrices, 'type:', typeof permissions.canEditPrices);
    const priceChanged = pricePerKg !== (selectedProduct.defaultPricePerKg || 0);

    console.log('🔐 Price edit check:', {
      permissions: permissions,
      hasPriceEditPermission,
      currentPrice: pricePerKg,
      defaultPrice: selectedProduct.defaultPricePerKg || 0,
      priceChanged
    });

    if (!hasPriceEditPermission && priceChanged) {
      console.log('🔐 BLOCKING: Price edit not allowed');
      toast.error('You do not have permission to edit prices');
      return;
    } else if (hasPriceEditPermission && priceChanged) {
      console.log('🔐 ALLOWING: Price edit permitted');
    } else {
      console.log('🔐 ALLOWING: No price change');
    }

    // Check discount permissions
    if (itemDiscount > 0) {
      if (!permissions?.canApplyDiscount) {
        toast.error('You do not have permission to apply discounts');
        return;
      }

      const maxDiscount = permissions?.maxDiscountPercent || 0;
      if (itemDiscount > maxDiscount) {
        toast.error(`Maximum discount allowed: ${maxDiscount}%`);
        return;
      }
    }

    const calculated = calculateItem(
      itemWeightKg,
      itemWeightG,
      boxWeightKg,
      boxWeightG,
      boxCount,
      pricePerKg,
      itemDiscount
    );

    // Validation checks
    if (calculated.itemWeightTotalKg <= 0) {
      toast.error('Item weight must be greater than 0');
      return;
    }

    if (calculated.exceedsItemWeight) {
      toast.error(`Box weight (${calculated.totalBoxWeightKg} kg) exceeds item weight (${calculated.itemWeightTotalKg} kg). Please adjust the weights.`);
      return;
    }

    if (calculated.netWeightKg <= 0) {
      toast.error('Net weight must be greater than 0 after deducting box weight');
      return;
    }

    const remainingStock = getRemainingStock(selectedProduct.id);
    const requiredStock = calculated.netWeightKg; // Use exact weight, not ceiling

    if (remainingStock < requiredStock) {
      toast.error(`Insufficient stock. Available: ${remainingStock.toFixed(3)} kg, Required: ${requiredStock.toFixed(3)} kg`);
      return;
    }

    const newItem: CartItem = {
      id: editingCartItem ? editingCartItem.id : Date.now().toString(),
      productId: selectedProduct.id,
      itemName: selectedProduct.name,
      quantityType: 'kg',
      itemWeightKg,
      itemWeightG,
      boxWeightKg,
      boxWeightG,
      boxCount,
      pricePerKg,
      itemDiscountPercent: itemDiscount,
      stockAvailable: selectedProduct.stockQuantity,
      ...calculated,
    };

    if (editingCartItem) {
      updateActiveTabCart(activeTab.cart.map(item => item.id === editingCartItem.id ? newItem : item));
      toast.success(`${selectedProduct.name} updated`);
    } else {
      updateActiveTabCart([...activeTab.cart, newItem]);
      toast.success(`${selectedProduct.name} added to cart`);
    }
    setWeightDialogOpen(false);
    setEditingCartItem(null);
    setError('');
  };

  const addUnitBasedProduct = (product: Product) => {
    if (!activeTab) return;

    const remainingStock = getRemainingStock(product.id);

    if (remainingStock <= 0.001) {
      toast.error(`${product.name} is out of stock (${remainingStock.toFixed(3)} kg available)`);
      return;
    }

    const existingItem = activeTab.cart.find(item => item.productId === product.id && item.quantityType === 'unit');

    if (existingItem) {
      const newQuantity = existingItem.itemWeightKg + 1;
      if (newQuantity > remainingStock) {
        toast.error(`Cannot add more. Stock available: ${remainingStock} kg`);
        return;
      }
      updateCartItemQuantity(existingItem.id, newQuantity);
    } else {
      if (remainingStock < 1) {
        toast.error(`Insufficient stock. Available: ${remainingStock} kg`);
        return;
      }

      const calculated = calculateItem(1, 0, 0, 0, 0, product.defaultPricePerKg || 0, 0);

      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        itemName: product.name,
        quantityType: 'unit',
        itemWeightKg: 1,
        itemWeightG: 0,
        boxWeightKg: 0,
        boxWeightG: 0,
        boxCount: 0,
        pricePerKg: product.defaultPricePerKg || 0,
        itemDiscountPercent: 0,
        stockAvailable: product.stockQuantity,
        ...calculated,
      };

      updateActiveTabCart([...activeTab.cart, newItem]);
      toast.success(`${product.name} added to cart`);
    }
  };

  const updateCartItemQuantity = (itemId: string, newQuantityKg: number) => {
    if (!activeTab) return;

    if (newQuantityKg <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = activeTab.cart.find(i => i.id === itemId);
    if (item && item.productId) {
      const remainingStock = getRemainingStock(item.productId);
      const totalAvailable = remainingStock + item.netWeightKg;

      if (newQuantityKg > totalAvailable) {
        toast.error(`Cannot exceed stock. Available: ${totalAvailable} kg`);
        return;
      }
    }

    const newCart = activeTab.cart.map(item => {
      if (item.id === itemId) {
        const calculated = calculateItem(
          newQuantityKg,
          0,
          item.boxWeightKg,
          item.boxWeightG,
          item.boxCount,
          item.pricePerKg,
          item.itemDiscountPercent
        );
        return {
          ...item,
          itemWeightKg: newQuantityKg,
          ...calculated,
        };
      }
      return item;
    });

    updateActiveTabCart(newCart);
  };

  const removeFromCart = (id: string) => {
    if (!activeTab) return;
    const item = activeTab.cart.find(i => i.id === id);
    if (item) {
      toast.info(`${item.itemName} removed from cart`);
    }
    updateActiveTabCart(activeTab.cart.filter(item => item.id !== id));
  };

  const orderSubtotal = activeTab ? activeTab.cart.reduce((sum, item) => sum + item.finalTotal, 0) : 0;
  const orderDiscountAmount = activeTab ? orderSubtotal * (activeTab.orderDiscount / 100) : 0;
  const orderTotal = orderSubtotal - orderDiscountAmount;

  const initiateCheckout = () => {
    if (!activeTab || activeTab.cart.length === 0) {
      toast.error('Add at least one item to create an order');
      return;
    }

    for (const item of activeTab.cart) {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        const requiredStock = item.netWeightKg;
        if (product && product.stockQuantity < requiredStock) {
          toast.error(`Insufficient stock for ${item.itemName}. Available: ${product.stockQuantity.toFixed(3)}, Required: ${requiredStock.toFixed(3)}`);
          return;
        }
      }
    }

    setError('');
    setPaymentDialogOpen(true);
  };

  // Handle print from dialog - manual print button click
  const handlePrintFromDialog = () => {
    if (printIframeRef.current) {
      const iframeWindow = printIframeRef.current.contentWindow;
      if (iframeWindow) {
        iframeWindow.focus();
        iframeWindow.print();
      }
    }
  };

  // Handle iframe load for auto-print
  const handleIframeLoad = () => {
    // Check if we should auto-print when iframe loads
    if (shouldAutoPrintRef.current && printIframeRef.current) {
      const iframeWindow = printIframeRef.current.contentWindow;
      if (iframeWindow) {
        // Small delay to ensure content is fully rendered
        setTimeout(() => {
          try {
            console.log('Auto-printing receipt from iframe load...');
            iframeWindow.focus();
            iframeWindow.print();
            toast.success('Print dialog opened - select your USB printer');
          } catch (err) {
            console.error('Auto-print error:', err);
            toast.error('Failed to auto-print. Please use the Print button.');
          }
          // Reset auto-print flags
          setShouldAutoPrint(false);
          shouldAutoPrintRef.current = false;
        }, 500);
      }
    }
  };

  const submitOrder = async (paymentData: any) => {
    if (!activeTab) return;

    setLoading(true);
    setError('');

    try {
      const orderData = {
        cashierId,
        customerId: activeTab.customer?.id,
        registrySessionId, // TEAM_003: Pass registry session ID to backend
        items: activeTab.cart.map(item => ({
          productId: item.productId,
          itemName: item.itemName,
          quantityType: item.quantityType,
          itemWeightKg: item.itemWeightKg,
          itemWeightG: item.itemWeightG,
          boxWeightKg: item.boxWeightKg || 0,
          boxWeightG: item.boxWeightG || 0,
          boxCount: item.boxCount || 0,
          pricePerKg: item.pricePerKg,
          itemDiscountPercent: item.itemDiscountPercent,
        })),
        discountPercent: activeTab.orderDiscount,
        paymentMethod: paymentData.paymentMethod,
        cashReceived: paymentData.cashReceived,
        changeGiven: paymentData.changeGiven,
        payments: paymentData.payments,
      };

      // TEAM_003: Use offline-aware API for order creation
      const result = await offlineApi.createOrder(orderData);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create order');
      }

      const data = result.data as any;
      const isOfflineOrder = data?.offline === true;

      // Show appropriate toast message
      if (isOfflineOrder) {
        toast.warning(`Offline Order ${data.order.orderNumber} saved! Total: LKR ${data.order.total.toFixed(2)}. Will sync when online.`);
      } else {
        toast.success(`Order ${data.order.orderNumber} completed! Total: LKR ${data.order.total.toFixed(2)}`);
      }

      // Prepare order data for printing using printer.ts format
      const orderForPrint = {
        orderNumber: data.order.orderNumber,
        createdAt: data.order.createdAt,
        cashierName: cashierName || data.order?.cashierName || '',
        customerName: activeTab.customer?.name,
        customerPhone: activeTab.customer?.phone || undefined,
        items: activeTab.cart.map(item => ({
          itemName: item.itemName,
          netWeightKg: item.netWeightKg,
          pricePerKg: item.pricePerKg,
          finalTotal: item.finalTotal,
          itemDiscountPercent: item.itemDiscountPercent,
          unitType: item.quantityType === 'kg' ? 'weight' : 'unit',
          // Box details
          boxCount: item.boxCount,
          boxWeightKg: item.boxWeightKg,
          boxWeightPerBoxKg: item.boxCount && item.boxCount > 0 && item.boxWeightKg ? item.boxWeightKg / item.boxCount : 0
        })),
        subtotal: orderSubtotal,
        discountAmount: orderDiscountAmount,
        total: data.order.total,
        paymentMethod: paymentData.paymentMethod,
        cashReceived: paymentData.cashReceived,
        changeGiven: paymentData.changeGiven,
      };

      const businessSettings = {
        businessName: printerSettings?.businessName || 'POS SYSTEM',
        address: printerSettings?.address || '',
        phone: printerSettings?.phone || '',
        email: printerSettings?.email || '',
      };

      const printerConfig = {
        printerType: printerSettings?.printerType || 'disabled',
        paperWidth: printerSettings?.paperSize === '57mm' || printerSettings?.paperSize === '58mm' ? 58 : 80,
        autoPrint: printerSettings?.autoPrint || false,
        printCopies: printerSettings?.printCopies || 1,
        receiptHeader: printerSettings?.receiptHeader || null,
        receiptFooter: printerSettings?.receiptFooter || null,
        showLogo: printerSettings?.showLogo || false,
        showBarcode: printerSettings?.showBarcode || false,
        logoUrl: printerSettings?.logoUrl || null,
      };

      const currentActiveTabId = activeTabId;

      if (orderTabs.length > 1) {
        const newTabs = orderTabs.filter(t => t.id !== currentActiveTabId);
        setOrderTabs(newTabs);
        setActiveTabId(newTabs[0].id);
      } else {
        setOrderTabs([{
          ...orderTabs[0],
          cart: [],
          orderDiscount: 0,
          customer: null
        }]);
      }

      setPaymentDialogOpen(false);

      await fetchProducts();

      // Auto-print using the reliable printer utility function (skip for offline orders if desired)
      if (printerConfig.autoPrint && printerConfig.printerType !== 'disabled') {
        console.log('Auto-printing receipt using printReceiptBrowser...');
        printReceiptBrowser(orderForPrint, businessSettings, printerConfig);
        toast.success('Print dialog opened - select your USB printer');
      }

      if (onOrderComplete) {
        onOrderComplete();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
      setError(err.message || 'Failed to create order');
      setPaymentDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const openStockUpdateDialog = (product: Product) => {
    if (!permissions?.canUpdateStock) {
      toast.error('You do not have permission to update stock');
      return;
    }
    setSelectedProductForStock(product);
    setNewStockQuantity(product.stockQuantity);
    setStockUpdateDialogOpen(true);
  };

  const updateProductStock = async () => {
    if (!selectedProductForStock) return;

    try {
      const response = await fetch(`/api/products?id=${selectedProductForStock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStockQuantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stock');
      }

      toast.success(`Stock updated for ${selectedProductForStock.name}`);
      setStockUpdateDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    }
  };

  const filteredProducts = (() => {
    let results = products;

    // 1. Fuzzy Search
    if (searchTerm.trim()) {
      const fuse = new Fuse(products, {
        keys: ['name', 'sku', 'category'],
        threshold: 0.3, // Lower is stricter, 0.3 is good for small typos
        ignoreLocation: true // Find matches anywhere in the string
      });
      results = fuse.search(searchTerm).map(result => result.item);
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      results = results.filter(product => product.category === selectedCategory);
    }

    return results;
  })();

  const calculated = selectedProduct ? calculateItem(
    itemWeightKg,
    itemWeightG,
    boxWeightKg,
    boxWeightG,
    boxCount,
    pricePerKg,
    itemDiscount
  ) : null;

  const remainingStockForDialog = selectedProduct ? getRemainingStock(selectedProduct.id) : 0;
  const isStockSufficient = selectedProduct && calculated ?
    calculated.netWeightKg <= remainingStockForDialog : true;

  const renderCartContent = (isMobile = false) => (
    <div className={`flex flex-col h-full bg-background/50 backdrop-blur-sm overflow-hidden ${isMobile ? '' : 'lg:border-l border-t lg:border-t-0 shadow-[0_-5px_30px_rgba(0,0,0,0.03)] lg:shadow-[-5px_0_30px_rgba(0,0,0,0.03)] rounded-none'}`}>
      {!isMobile && (
        <div className="flex-none p-2 bg-background border-b z-20 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-horizontal">
            {orderTabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg cursor-pointer transition-all min-w-[110px] sm:min-w-[130px] max-w-[160px] sm:max-w-[180px] flex-shrink-0 group border select-none
                  ${activeTabId === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-medium border-indigo-600'
                    : 'bg-background hover:bg-zinc-50 text-zinc-600 border-zinc-200'
                  }
                `}
              >
                <div className="flex-1 truncate text-sm">
                  {tab.name}
                </div>
                {tab.cart.length > 0 && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${activeTabId === tab.id ? 'bg-white text-primary' : 'bg-primary/10 text-primary'}`}>
                    {tab.cart.length}
                  </span>
                )}
                {orderTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 rounded p-0.5 transition-all ${activeTabId === tab.id ? 'hover:bg-white/20 hover:text-white' : 'hover:bg-destructive/10 hover:text-destructive'}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <Button onClick={createNewTab} size="icon" variant="ghost" className="h-10 w-10 rounded-full flex-none hover:bg-primary/10 hover:text-primary border border-dashed border-border">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-none px-3 sm:px-4 md:px-5 py-2 sm:py-3 border-b bg-muted/20 flex flex-col gap-2 sm:gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg sm:text-xl md:text-2xl leading-none text-foreground tracking-tight truncate">{activeTab?.name}</h2>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <CustomerSelection
                selectedCustomer={activeTab?.customer || null}
                onSelectCustomer={updateActiveTabCustomer}
              />
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</span>

      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-muted/10 min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/30">
        {!activeTab || activeTab.cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-6 p-8 opacity-60">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-medium text-lg text-foreground">Cart is empty</p>
              <p className="text-sm max-w-[200px] mx-auto mt-2 leading-relaxed">Select products from the menu to start building this order.</p>
            </div>
          </div>
        ) : (
          activeTab.cart.map((item) => {
            const product = products.find(p => p.id === item.productId);
            const isUnitBased = product?.unitType === 'unit';
            const requiredStock = item.netWeightKg;
            const hasStock = product ? product.stockQuantity >= requiredStock : true;

            return (
              <div
                key={item.id}
                className={`
                    relative group bg-background border border-border/60 rounded-xl p-3 shadow-sm transition-all duration-200
                    ${!hasStock ? 'border-destructive/50 bg-destructive/5' : 'hover:border-primary/30 hover:shadow-md'}
                  `}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm text-foreground truncate pr-6">{item.itemName}</h5>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                        {item.quantityType === 'kg' ? 'Weight' : 'Unit'}
                      </span>
                      <span>@ LKR {item.pricePerKg.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">LKR {item.finalTotal.toFixed(2)}</p>
                    {item.itemDiscountPercent > 0 && (
                      <div className="flex justify-end items-center gap-1 text-[10px] text-destructive font-medium">
                        <span className="line-through opacity-70">{item.baseTotal.toFixed(2)}</span>
                        <span className="bg-destructive/10 px-1 rounded">-{item.itemDiscountPercent}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/60">
                  <div className="flex items-center gap-3">
                    {item.quantityType === 'unit' || isUnitBased ? (
                      <div className="flex items-center bg-muted/40 rounded-lg border h-8 shadow-sm">
                        <button
                          className="px-2.5 h-full hover:bg-background hover:text-destructive transition-all disabled:opacity-30 rounded-l-lg hover:shadow-sm"
                          onClick={() => updateCartItemQuantity(item.id, item.itemWeightKg - 1)}
                          disabled={item.itemWeightKg <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-px h-1/2 bg-border my-auto"></div>
                        <span className="px-2 text-sm font-bold min-w-[2rem] text-center tabular-nums">
                          {item.itemWeightKg}
                        </span>
                        <div className="w-px h-1/2 bg-border my-auto"></div>
                        <button
                          className="px-2.5 h-full hover:bg-background hover:text-green-600 transition-all disabled:opacity-30 rounded-r-lg hover:shadow-sm"
                          onClick={() => updateCartItemQuantity(item.id, item.itemWeightKg + 1)}
                          disabled={product ? item.itemWeightKg >= product.stockQuantity : false}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Net Weight</span>
                          <div className="flex items-baseline gap-1 bg-muted/30 px-2 py-0.5 rounded border border-border/50">
                            <span className="font-bold text-sm tabular-nums">{item.netWeightKg}</span>
                            <span className="text-[10px] text-muted-foreground">KG</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.boxCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-md border border-blue-100 dark:border-blue-800 text-[10px] font-medium">
                        <Package className="h-3 w-3" />
                        {item.boxCount} Box
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCartItem(item)}
                      className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!hasStock && product && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1.5 rounded-md border border-destructive/20 animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Insufficient Stock (Have: {product.stockQuantity})</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex-none bg-background border-t shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-20 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground text-xs sm:text-sm font-medium">LKR</span>
            </div>
            <Input
              type="number"
              min="0"
              max={permissions?.canApplyDiscount ? orderSubtotal * ((permissions.maxDiscountPercent || 0) / 100) : 0}
              placeholder={permissions?.canApplyDiscount ? "Discount amount" : "No permission"}
              className="pl-7 sm:pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-primary/50 transition-all font-medium"
              value={orderDiscountAmount > 0 ? orderDiscountAmount : ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!permissions?.canApplyDiscount) return;

                const subtotal = orderSubtotal;
                if (subtotal <= 0) {
                  updateActiveTabDiscount(0);
                  return;
                }

                const rawAmount = isNaN(value) ? 0 : value;
                const maxPercent = permissions.maxDiscountPercent || 0;
                const maxAmount = subtotal * (maxPercent / 100);

                if (rawAmount > maxAmount) {
                  toast.error(`Maximum discount allowed: LKR ${maxAmount.toFixed(2)} (${maxPercent}%)`);
                  return;
                }

                const discountPercent = (rawAmount / subtotal) * 100;
                updateActiveTabDiscount(discountPercent);
              }}
              disabled={!permissions?.canApplyDiscount}
              readOnly={!permissions?.canApplyDiscount}
            />
          </div>
          <div className="text-xs text-right space-y-0.5 flex-shrink-0 sm:min-w-[100px]">
            <p className="text-muted-foreground">Count: <span className="font-bold text-foreground">{activeTab?.cart.length || 0}</span></p>
            <p className="text-muted-foreground">Total Wt/Qty: <span className="font-bold text-foreground">{activeTab?.cart.reduce((acc, item) => acc + item.netWeightKg, 0).toFixed(3) || '0.000'}</span></p>
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">LKR {orderSubtotal.toFixed(2)}</span>
          </div>

          {orderDiscountAmount > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-destructive animate-in fade-in slide-in-from-right-5 duration-300">
              <span className="font-medium">Discount{activeTab ? ` (${activeTab.orderDiscount.toFixed(2)}%)` : ''}</span>
              <span>- LKR {orderDiscountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-end pt-1.5 sm:pt-2">
            <span className="font-bold text-base sm:text-lg text-foreground/80">Total</span>
            <div className="text-right">
              <span className="block text-2xl sm:text-3xl font-black text-primary leading-none tracking-tight">
                <span className="text-sm sm:text-base font-bold align-top mr-1 opacity-70">LKR</span>
                {orderTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={initiateCheckout}
          disabled={loading || !activeTab || activeTab.cart.length === 0}
          size="lg"
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all active:scale-[0.98] rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <>
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Charge </span>LKR {orderTotal.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4">
      {/* LEFT PANEL - Products & Navigation - Flexible Width */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 h-full lg:h-auto lg:max-h-full">

        {/* Permission Status Indicator */}
        <div className="flex-none flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Permissions: {permissions ? (permissions.canEditPrices ? 'Edit Prices ✓' : 'Edit Prices ✗') : 'LOADING...'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">Discounts: {permissions?.canApplyDiscount ? `${permissions.maxDiscountPercent || 0}%` : 'Disabled'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchPermissions()}
              className="h-6 px-2 flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Top Navigation Bar: Categories & Search */}
        <div className="flex-none flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
          {/* Search Bar - Wider on desktop */}
          <div className="relative w-full sm:max-w-md order-2 sm:order-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Search className="h-4 w-4" />
            </div>
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20 focus-visible:border-primary rounded-full transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filters - Chips */}
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 order-1 sm:order-2 scrollbar-horizontal">
            <div className="flex items-center gap-2 min-w-max">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 rounded-full px-5 h-9 text-sm font-semibold transition-all shadow-sm border ${selectedCategory === 'all'
                  ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
              >
                All
              </Button>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <Button
                    key={cat.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex-shrink-0 rounded-full px-5 h-9 text-sm font-semibold whitespace-nowrap transition-all shadow-sm border ${isSelected
                      ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                      }`}
                  >
                    {cat.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
          {productsLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading inventory...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center bg-muted/5 rounded-xl border border-dashed p-8">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium text-lg">No products found</h3>
              <p className="text-muted-foreground">Try searching for something else or select "All Products"</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 pb-20">
              {filteredProducts.map((product) => {
                const remainingStock = getRemainingStock(product.id);
                const isOutOfStock = remainingStock <= 0.001;
                const isLowStock = remainingStock > 0.001 && remainingStock <= 10;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        if (product.unitType === 'weight') {
                          openWeightDialog(product);
                        } else {
                          addUnitBasedProduct(product);
                        }
                      } else {
                        toast.error(`${product.name} is out of stock (${remainingStock.toFixed(3)} kg available)`);
                      }
                    }}
                    className={`
                      group relative flex flex-col rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 overflow-hidden
                      ${isOutOfStock
                        ? 'opacity-60 grayscale cursor-not-allowed bg-muted/50'
                        : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/50'
                      }
                    `}
                  >
                    {/* Image Area */}
                    <div className="relative w-full aspect-[4/3] bg-muted/20 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      {/* Fallback Icon if no image or error */}
                      <div className={`flex flex-col items-center justify-center text-muted-foreground/20 ${product.imageUrl ? 'hidden' : ''} absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60`}>
                        <Package className="h-14 w-14 mb-2 mix-blend-multiply opacity-50" />
                      </div>

                      {/* Badge Overlays - High Contrast */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                        {isOutOfStock && (
                          <Badge variant="destructive" className="items-center gap-1 shadow-sm font-bold px-2 py-0.5">
                            <PackageX className="h-3 w-3" />
                            Out of Stock
                          </Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm font-bold px-2 py-0.5">
                            Low Stock
                          </Badge>
                        )}
                        {product.unitType === 'weight' && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm text-xs font-bold px-2 py-0.5">
                            Weight
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div>
                        <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 h-[2.5em]" title={product.name}>
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 font-medium bg-muted/50 inline-block px-1.5 py-0.5 rounded-sm">{product.category || 'General'}</p>
                      </div>

                      <div className="flex-1"></div> {/* Spacer to push price to bottom */}

                      <Separator className="bg-border/40 mb-2" />

                      <div className="flex items-end justify-between mt-auto pt-1">
                        <div className="font-bold text-lg text-primary leading-none">
                          <span className="text-xs font-medium text-muted-foreground mr-0.5">LKR</span>
                          {(() => {
                            const price = product.defaultPricePerKg;
                            if (price == null) return '0.00';
                            const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
                            return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
                          })()}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                          {remainingStock} {product.unitType === 'weight' ? 'kg' : 'pcs'}
                        </div>
                      </div>
                    </div>

                    {/* Hover Edit Action */}
                    {permissions?.canUpdateStock && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 left-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md translate-x-[-10px] group-hover:translate-x-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockUpdateDialog(product);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Cart & Checkout */}
      {/* Desktop: Always visible sidebar */}
      <div className="hidden lg:flex w-[380px] xl:w-[440px] flex-none flex-col bg-background/50 border-l backdrop-blur-sm h-full overflow-hidden relative z-10 shadow-[-5px_0_30px_rgba(0,0,0,0.03)]">
        {renderCartContent()}
      </div>

      {/* Mobile: Sticky Bottom Bar & Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-safe">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="w-full h-14 flex items-center justify-between px-4 bg-primary text-primary-foreground shadow-lg rounded-xl">
              <div className="flex flex-col items-start">
                <span className="text-xs opacity-90 font-medium"> Total ({activeTab?.cart.length || 0} items)</span>
                <span className="text-lg font-bold">LKR {orderTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                View Cart <ChevronUp className="h-5 w-5" />
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle>Current Order</SheetTitle>
              <SheetDescription>Verify items and checkout</SheetDescription>
            </SheetHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderCartContent(true)}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Dialogs */}
      <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8 text-xl">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <span>{editingCartItem ? 'Edit' : 'Add'} Item {selectedProduct?.unitType === 'unit' ? '(Qty)' : '(Weight)'}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Enter weight details for <span className="font-bold text-foreground">{selectedProduct?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Available Stock Badge */}
            <div className="flex justify-end">
              <Badge variant={selectedProduct && selectedProduct.stockQuantity > 10 ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                Available Stock: {selectedProduct?.stockQuantity} kg
              </Badge>
            </div>

            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="simple">Simple Weighing</TabsTrigger>
                <TabsTrigger value="advanced">Box & Net Weight</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemWeightKg" className="text-xs uppercase text-muted-foreground font-bold">{selectedProduct?.unitType === 'unit' ? 'Quantity' : 'Weight (KG)'} *</Label>
                    <div className="relative">
                      <Input
                        id="itemWeightKg"
                        type="number"
                        min="0"
                        step="0.001"
                        value={itemWeightKg || ''}
                        onChange={(e) => setItemWeightKg(parseFloat(e.target.value) || 0)}
                        className={`h-12 text-lg font-bold ${!isStockSufficient && itemWeightKg > 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        placeholder="0.000"
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{selectedProduct?.unitType === 'unit' ? 'Qty' : 'KG'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemWeightG" className="text-xs uppercase text-muted-foreground font-bold">Weight (G)</Label>
                    <div className="relative">
                      <Input
                        id="itemWeightG"
                        type="number"
                        min="0"
                        max="999"
                        value={itemWeightG || ''}
                        onChange={(e) => setItemWeightG(parseFloat(e.target.value) || 0)}
                        className="h-12 text-lg"
                        placeholder="0"
                        disabled={selectedProduct?.unitType === 'unit'}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">G</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKg" className="text-xs uppercase text-muted-foreground font-bold">
                      Price {selectedProduct?.unitType !== 'unit' && 'per KG'} {!permissions?.canEditPrices && <span className="text-orange-600">(Read-only)</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">LKR</span>
                      <Input
                        id="pricePerKg"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricePerKg || ''}
                        onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                        className="h-12 text-lg pl-12"
                        disabled={!permissions?.canEditPrices}
                        readOnly={!permissions?.canEditPrices}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDiscount" className="text-xs uppercase text-muted-foreground font-bold">
                      Discount {!permissions?.canApplyDiscount && <span className="text-orange-600">(Disabled)</span>}
                      {permissions?.canApplyDiscount && permissions?.maxDiscountPercent < 100 && <span className="text-xs text-muted-foreground normal-case">(Max: {permissions.maxDiscountPercent}%)</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id="itemDiscount"
                        type="number"
                        min="0"
                        max={permissions?.canApplyDiscount ? permissions.maxDiscountPercent : 0}
                        step="0.1"
                        value={itemDiscount || ''}
                        onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                        className="h-12 text-lg"
                        placeholder="0"
                        disabled={!permissions?.canApplyDiscount}
                        readOnly={!permissions?.canApplyDiscount}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemWeightKg2">{selectedProduct?.unitType === 'unit' ? 'Quantity' : 'Item Weight (KG)'} *</Label>
                    <Input
                      id="itemWeightKg2"
                      type="number"
                      min="0"
                      step="0.001"
                      value={itemWeightKg || ''}
                      onChange={(e) => setItemWeightKg(parseFloat(e.target.value) || 0)}
                      className={`h-11 ${!isStockSufficient && itemWeightKg > 0 ? 'border-destructive' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemWeightG2">Item Weight (G)</Label>
                    <Input
                      id="itemWeightG2"
                      type="number"
                      min="0"
                      max="999"
                      value={itemWeightG || ''}
                      onChange={(e) => setItemWeightG(parseFloat(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="boxWeightKg">Box Weight (KG)</Label>
                    <Input
                      id="boxWeightKg"
                      type="number"
                      min="0"
                      step="0.001"
                      value={boxWeightKg || ''}
                      onChange={(e) => setBoxWeightKg(parseFloat(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="boxWeightG">Box Weight (G)</Label>
                    <Input
                      id="boxWeightG"
                      type="number"
                      min="0"
                      max="999"
                      value={boxWeightG || ''}
                      onChange={(e) => setBoxWeightG(parseFloat(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boxCount">Number of Boxes</Label>
                  <Input
                    id="boxCount"
                    type="number"
                    min="0"
                    value={boxCount || ''}
                    onChange={(e) => setBoxCount(parseInt(e.target.value) || 0)}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKg2">
                      Price per KG (LKR) * {!permissions?.canEditPrices && <span className="text-xs text-orange-600">(Read-only)</span>}
                    </Label>
                    <Input
                      id="pricePerKg2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricePerKg || ''}
                      onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                      className="h-11"
                      disabled={!permissions?.canEditPrices}
                      readOnly={!permissions?.canEditPrices}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDiscount2">
                      Discount (%) {!permissions?.canApplyDiscount && <span className="text-xs text-orange-600">(Disabled)</span>}
                      {permissions?.canApplyDiscount && permissions?.maxDiscountPercent < 100 && <span className="text-xs text-muted-foreground">(Max: {permissions.maxDiscountPercent}%)</span>}
                    </Label>
                    <Input
                      id="itemDiscount2"
                      type="number"
                      min="0"
                      max={permissions?.canApplyDiscount ? permissions.maxDiscountPercent : 0}
                      step="0.1"
                      value={itemDiscount || ''}
                      onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                      className="h-11"
                      disabled={!permissions?.canApplyDiscount}
                      readOnly={!permissions?.canApplyDiscount}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Calculation Result Card - Enhanced */}
            {calculated && calculated.itemWeightTotalKg > 0 && (
              <div className={`p-4 rounded-xl space-y-3 transition-colors border ${calculated.exceedsItemWeight
                ? 'bg-destructive/10 border-destructive'
                : isStockSufficient
                  ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                  : 'bg-destructive/5 border-destructive/30'
                }`}>
                <div className="flex items-center gap-2 font-semibold pb-2 border-b border-dashed border-black/10 dark:border-white/10">
                  <Calculator className="h-4 w-4" />
                  <span>Live Calculation</span>
                  {calculated.exceedsItemWeight && (
                    <Badge variant="destructive" className="ml-auto">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>

                {calculated.exceedsItemWeight && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Box weight ({calculated.totalBoxWeightKg} kg) exceeds item weight ({calculated.itemWeightTotalKg} kg). Please reduce box weight or increase item weight.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item Weight:</span>
                    <span className="font-mono font-medium">{calculated.itemWeightTotalKg} KG</span>
                  </div>
                  {calculated.totalBoxWeightKg > 0 && (
                    <>
                      <div className={`flex justify-between ${calculated.exceedsItemWeight ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <span>Box Weight:</span>
                        <span className="font-mono font-medium">-{calculated.totalBoxWeightKg} KG</span>
                      </div>
                      <div className="flex justify-between col-span-2 font-medium pt-1 border-t border-dashed border-black/5">
                        <span>Net Weight (Billable):</span>
                        <span className={`font-mono ${calculated.netWeightKg <= 0 ? 'text-destructive' : ''}`}>{calculated.netWeightKg} KG</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span className="font-mono">LKR {calculated.baseTotal.toFixed(2)}</span>
                  </div>
                  {calculated.itemDiscountAmount > 0 && (
                    <div className="flex justify-between col-span-2 text-destructive">
                      <span>Discount:</span>
                      <span className="font-mono">-LKR {calculated.itemDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center col-span-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <span className="font-bold">Final Total:</span>
                    <span className="text-xl font-bold text-primary">LKR {calculated.finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {!isStockSufficient && !calculated.exceedsItemWeight && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Insufficient stock. Available: {remainingStockForDialog} kg, Required: {Math.ceil(calculated.netWeightKg)} kg
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setWeightDialogOpen(false)} className="flex-1 h-11">
                Cancel
              </Button>
              <Button
                onClick={addWeightBasedProduct}
                className="flex-[2] h-11 text-base font-medium"
                disabled={!calculated || calculated.itemWeightTotalKg <= 0 || calculated.exceedsItemWeight || !isStockSufficient || calculated.netWeightKg <= 0}
              >
                {calculated && calculated.exceedsItemWeight ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Box Weight Too High
                  </>
                ) : !isStockSufficient ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Insufficient Stock
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {editingCartItem ? 'Update Order' : 'Add to Order'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={stockUpdateDialogOpen} onOpenChange={setStockUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock - {selectedProductForStock?.name}</DialogTitle>
            <DialogDescription>
              Adjust inventory quantity for this product
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{selectedProductForStock?.stockQuantity} kg</p>
                <Badge variant={selectedProductForStock && selectedProductForStock.stockQuantity > 10 ? "secondary" : "destructive"}>
                  {selectedProductForStock && selectedProductForStock.stockQuantity === 0 ? 'Out of Stock' : selectedProductForStock && selectedProductForStock.stockQuantity <= 10 ? 'Low Stock' : 'In Stock'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStock">New Stock Quantity (kg)</Label>
              <Input
                id="newStock"
                type="number"
                min="0"
                value={newStockQuantity}
                onChange={(e) => setNewStockQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                This will update the stock quantity immediately. Make sure the value is correct.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={updateProductStock} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Update Stock
              </Button>
              <Button variant="outline" onClick={() => setStockUpdateDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Payment Dialog */}
      {
        activeTab && (
          <PaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            orderTotal={orderTotal}
            orderSubtotal={orderSubtotal}
            orderDiscount={orderDiscountAmount}
            customer={activeTab.customer}
            onPaymentComplete={submitOrder}
          />
        )
      }

      {/* Print Receipt Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={(open) => {
        setPrintDialogOpen(open);
        if (!open) {
          shouldAutoPrintRef.current = false;
          setShouldAutoPrint(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Receipt
            </DialogTitle>
            <DialogDescription>
              Receipt preview. Click "Print" to send to your printer.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              key={printKey}
              ref={printIframeRef}
              srcDoc={printContent}
              className="w-full h-[400px] border-0"
              title="Receipt Preview"
              onLoad={handleIframeLoad}
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
    </div >
  );
}