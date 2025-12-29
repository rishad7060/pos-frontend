'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Calculator, ShoppingCart, Search, Package, Minus, Scale, CreditCard, AlertTriangle } from 'lucide-react';
import PaymentDialog from './PaymentDialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { printReceiptBrowser, printToNetworkPrinter } from '@/lib/printer';

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
  // Calculated fields
  itemWeightTotalKg: number;
  boxWeightPerBoxKg: number;
  totalBoxWeightKg: number;
  netWeightKg: number;
  baseTotal: number;
  itemDiscountAmount: number;
  finalTotal: number;
}

interface POSOrderEntryProps {
  cashierId: number;
  onOrderComplete?: () => void;
}

export default function POSOrderEntry({ cashierId, onOrderComplete }: POSOrderEntryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Printer settings state
  const [printerSettings, setPrinterSettings] = useState<any>(null);

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

  useEffect(() => {
    fetchProducts();
    fetchPrinterSettings();
  }, []);

  const fetchPrinterSettings = async () => {
    try {
      const response = await fetch('/api/printer-settings');
      if (response.ok) {
        const settings = await response.json();
        setPrinterSettings(settings);
      }
    } catch (error) {
      console.warn('Failed to load printer settings:', error);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const result = await api.getProducts({ isActive: true, limit: 200 });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch products');
      }

      setProducts(result.data || []);
      
      // Extract unique categories
      const cats = [...new Set(data.map((p: Product) => p.category).filter(Boolean))];
      setCategories(cats as string[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setProductsLoading(false);
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
    // Validate grams input
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

  const openWeightDialog = (product: Product) => {
    setSelectedProduct(product);
    setPricePerKg(product.defaultPricePerKg || 0);
    setItemWeightKg(0);
    setItemWeightG(0);
    setBoxWeightKg(0);
    setBoxWeightG(0);
    setBoxCount(0);
    setItemDiscount(0);
    setWeightDialogOpen(true);
  };

  const addWeightBasedProduct = () => {
    if (!selectedProduct) return;

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
      setError('Item weight must be greater than 0');
      toast.error('Item weight must be greater than 0');
      return;
    }

    if (calculated.exceedsItemWeight) {
      setError(`Box weight (${calculated.totalBoxWeightKg} kg) exceeds item weight (${calculated.itemWeightTotalKg} kg). Please adjust the weights.`);
      toast.error('Box weight cannot exceed item weight');
      return;
    }

    if (calculated.netWeightKg <= 0) {
      setError('Net weight must be greater than 0 after deducting box weight');
      toast.error('Net weight must be greater than 0');
      return;
    }

    // Check stock availability
    const requiredStock = Math.ceil(calculated.netWeightKg);
    if (selectedProduct.stockQuantity < requiredStock) {
      setError(`Insufficient stock. Available: ${selectedProduct.stockQuantity} kg, Required: ${requiredStock} kg`);
      toast.error(`Insufficient stock for ${selectedProduct.name}`);
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
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
      ...calculated,
    };

    setCart([...cart, newItem]);
    setWeightDialogOpen(false);
    setError('');
    toast.success(`${selectedProduct.name} added to cart`);
  };

  const addUnitBasedProduct = (product: Product) => {
    // Check if product already in cart
    const existingItem = cart.find(item => item.productId === product.id && item.quantityType === 'kg');
    
    if (existingItem) {
      // Increment quantity (1 unit = 1 kg for simplicity)
      updateCartItemQuantity(existingItem.id, existingItem.itemWeightKg + 1);
    } else {
      const calculated = calculateItem(
        1, // 1 unit
        0,
        0,
        0,
        0,
        product.defaultPricePerKg || 0,
        0
      );

      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        itemName: product.name,
        quantityType: 'kg',
        itemWeightKg: 1,
        itemWeightG: 0,
        boxWeightKg: 0,
        boxWeightG: 0,
        boxCount: 0,
        pricePerKg: product.defaultPricePerKg || 0,
        itemDiscountPercent: 0,
        ...calculated,
      };

      setCart([...cart, newItem]);
    }
  };

  const updateCartItemQuantity = (itemId: string, newQuantityKg: number) => {
    if (newQuantityKg <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(cart.map(item => {
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
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculate order totals
  const orderSubtotal = cart.reduce((sum, item) => sum + item.baseTotal, 0);
  const orderDiscountAmount = orderSubtotal * (orderDiscount / 100);
  const orderTotal = orderSubtotal - orderDiscountAmount;

  // Open payment dialog instead of submitting directly
  const initiateCheckout = () => {
    if (cart.length === 0) {
      setError('Add at least one item to create an order');
      return;
    }

    setError('');
    setPaymentDialogOpen(true);
  };

  // Submit order with payment data
  const submitOrder = async (paymentData: any) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId,
          items: cart.map(item => ({
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
          discountPercent: orderDiscount,
          paymentMethod: paymentData.paymentMethod,
          cashReceived: paymentData.cashReceived,
          changeGiven: paymentData.changeGiven,
          payments: paymentData.payments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setSuccess(`Order ${data.order.orderNumber} created successfully! Total: LKR ${data.order.total.toFixed(2)}`);
      setCart([]);
      setOrderDiscount(0);
      setPaymentDialogOpen(false);

      // Auto-print receipt if printer settings are available and auto-print is enabled
      if (printerSettings && printerSettings.autoPrint) {
        try {
          // Create order object for printing (same format as test print)
          const orderForPrinting = {
            orderNumber: data.order.orderNumber,
            createdAt: data.order.createdAt,
            cashierName: cashierId ? 'Cashier' : 'POS System',
            subtotal: data.order.subtotal,
            discountAmount: data.order.discountAmount,
            total: data.order.total,
            paymentMethod: data.order.paymentMethod,
            cashReceived: data.order.cashReceived,
            changeGiven: data.order.changeGiven,
            items: data.order.orderItems.map((item: any) => ({
              itemName: item.itemName,
              netWeightKg: item.netWeightKg,
              pricePerKg: item.pricePerKg,
              finalTotal: item.finalTotal,
              unitType: item.quantityType === 'kg' ? 'kg' : 'unit'
            }))
          };

          const businessSettings = {
            businessName: printerSettings.businessName || 'POS System',
            address: printerSettings.address,
            phone: printerSettings.phone,
            email: printerSettings.email
          };

          const printSettings = {
            printerType: printerSettings.printerType || 'thermal',
            paperWidth: printerSettings.paperSize === '57mm' ? 58 : 80,
            autoPrint: printerSettings.autoPrint,
            printCopies: printerSettings.printCopies || 1,
            receiptHeader: printerSettings.receiptHeader,
            receiptFooter: printerSettings.receiptFooter,
            showLogo: printerSettings.showLogo,
            showBarcode: printerSettings.showBarcode,
            logoUrl: printerSettings.logoUrl
          };

          // Use same printing method as test print - direct browser printing
          printReceiptBrowser(orderForPrinting, businessSettings, printSettings);

          // Try network printing in background if IP is configured (don't wait for it)
          if (printerSettings.ipAddress && printerSettings.port) {
            // Fire and forget - don't await this
            printToNetworkPrinter(orderForPrinting, businessSettings, printSettings, printerSettings.ipAddress, printerSettings.port)
              .then(result => {
                if (result.success) {
                  console.log('Network printing successful');
                } else {
                  console.warn('Network printing failed, but browser print was shown');
                }
              })
              .catch(error => {
                console.warn('Network printing error:', error);
              });
          }
        } catch (printError) {
          console.error('Print setup failed:', printError);
          // Don't show error toast for printing failures in POS flow
        }
      }

      if (onOrderComplete) {
        onOrderComplete();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setPaymentDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const calculated = selectedProduct ? calculateItem(
    itemWeightKg,
    itemWeightG,
    boxWeightKg,
    boxWeightG,
    boxCount,
    pricePerKg,
    itemDiscount
  ) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="space-y-4">
          {productsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    if (product.unitType === 'weight') {
                      openWeightDialog(product);
                    } else {
                      addUnitBasedProduct(product);
                    }
                  }}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold line-clamp-2 text-sm">{product.name}</h4>
                      {product.stockQuantity <= 0 && (
                        <Badge variant="destructive" className="text-xs">Out</Badge>
                      )}
                    </div>
                    
                    {product.category && (
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    )}
                    
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        {product.unitType === 'weight' ? 'per KG' : 'per unit'}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        LKR {(() => {
                          const price = product.defaultPricePerKg;
                          if (price == null) return '0.00';
                          const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
                          return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
                        })()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stock: {product.stockQuantity}</span>
                      {product.unitType === 'weight' ? (
                        <Scale className="h-3 w-3" />
                      ) : (
                        <Package className="h-3 w-3" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Cart is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Add products to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {cart.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    const isUnitBased = product?.unitType === 'unit';
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-sm line-clamp-1">{item.itemName}</h5>
                            <p className="text-xs text-muted-foreground">
                              {item.netWeightKg} KG × LKR {item.pricePerKg.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {isUnitBased && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartItemQuantity(item.id, item.itemWeightKg - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-semibold w-8 text-center">
                              {item.itemWeightKg}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartItemQuantity(item.id, item.itemWeightKg + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Item Total</span>
                          <span className="font-bold text-primary">LKR {item.finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Order Discount */}
                <div className="space-y-2">
                  <Label htmlFor="orderDiscount" className="text-sm">Order Discount (%)</Label>
                  <Input
                    id="orderDiscount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={orderDiscount || ''}
                    onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-semibold">LKR {orderSubtotal.toFixed(2)}</span>
                  </div>
                  {orderDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount</span>
                      <span className="font-semibold">-LKR {orderDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">LKR {orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                    <AlertDescription className="text-sm">{success}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={initiateCheckout} 
                  disabled={loading} 
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Payment
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight Entry Dialog */}
      <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Weight Details - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="simple">Simple</TabsTrigger>
                <TabsTrigger value="advanced">With Box Weight</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemWeightKg">Weight (KG) *</Label>
                    <Input
                      id="itemWeightKg"
                      type="number"
                      min="0"
                      step="0.001"
                      value={itemWeightKg || ''}
                      onChange={(e) => setItemWeightKg(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemWeightG">Weight (G)</Label>
                    <Input
                      id="itemWeightG"
                      type="number"
                      min="0"
                      max="999"
                      value={itemWeightG || ''}
                      onChange={(e) => setItemWeightG(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKg">Price per KG (LKR) *</Label>
                    <Input
                      id="pricePerKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricePerKg || ''}
                      onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDiscount">Discount (%)</Label>
                    <Input
                      id="itemDiscount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={itemDiscount || ''}
                      onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemWeightKg2">Item Weight (KG) *</Label>
                    <Input
                      id="itemWeightKg2"
                      type="number"
                      min="0"
                      step="0.001"
                      value={itemWeightKg || ''}
                      onChange={(e) => setItemWeightKg(parseFloat(e.target.value) || 0)}
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
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="boxWeightKg">Box Weight per Box (KG)</Label>
                    <Input
                      id="boxWeightKg"
                      type="number"
                      min="0"
                      step="0.001"
                      value={boxWeightKg || ''}
                      onChange={(e) => setBoxWeightKg(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="boxWeightG">Box Weight per Box (G)</Label>
                    <Input
                      id="boxWeightG"
                      type="number"
                      min="0"
                      max="999"
                      value={boxWeightG || ''}
                      onChange={(e) => setBoxWeightG(parseFloat(e.target.value) || 0)}
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
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKg2">Price per KG (LKR) *</Label>
                    <Input
                      id="pricePerKg2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricePerKg || ''}
                      onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDiscount2">Discount (%)</Label>
                    <Input
                      id="itemDiscount2"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={itemDiscount || ''}
                      onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Calculation Preview */}
            {calculated && calculated.itemWeightTotalKg > 0 && (
              <div className={`p-4 rounded-lg space-y-2 border ${
                calculated.exceedsItemWeight 
                  ? 'bg-destructive/10 border-destructive' 
                  : calculated.isValid 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                    : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Calculator className="h-4 w-4" />
                  <span>Calculation</span>
                  {calculated.exceedsItemWeight && (
                    <Badge variant="destructive" className="ml-auto">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
                
                {calculated.exceedsItemWeight && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Box weight ({calculated.totalBoxWeightKg} kg) exceeds item weight ({calculated.itemWeightTotalKg} kg). Please reduce box weight or increase item weight.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Item Weight: <span className="font-semibold">{calculated.itemWeightTotalKg} KG</span></div>
                  {calculated.totalBoxWeightKg > 0 && (
                    <>
                      <div className={calculated.exceedsItemWeight ? 'text-destructive' : ''}>
                        Box Weight: <span className="font-semibold">-{calculated.totalBoxWeightKg} KG</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t">
                        Net Weight: <span className={`font-semibold ${calculated.netWeightKg <= 0 ? 'text-destructive' : ''}`}>{calculated.netWeightKg} KG</span>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">Base Total: <span className="font-semibold">LKR {calculated.baseTotal.toFixed(2)}</span></div>
                  {calculated.itemDiscountAmount > 0 && (
                    <div className="col-span-2">Discount: <span className="font-semibold text-destructive">-LKR {calculated.itemDiscountAmount.toFixed(2)}</span></div>
                  )}
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-lg font-bold text-primary">Final: LKR {calculated.finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={addWeightBasedProduct} 
                className="flex-1"
                disabled={!calculated || calculated.itemWeightTotalKg <= 0 || calculated.exceedsItemWeight || calculated.netWeightKg <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" onClick={() => setWeightDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        orderTotal={orderTotal}
        orderSubtotal={orderSubtotal}
        orderDiscount={orderDiscountAmount}
        onPaymentComplete={submitOrder}
      />
    </div>
  );
}