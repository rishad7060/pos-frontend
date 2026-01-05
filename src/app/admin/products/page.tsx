'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getAuthUser } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import {
  Plus, Trash2, Edit, Package, Search, Grid3x3, List, Download,
  TrendingUp, DollarSign, AlertTriangle, PackageX, Eye, Archive,
  Filter, X, RefreshCw, Layers
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { PaginationWarning } from '@/components/ui/PaginationWarning';

interface Product {
  id: number;
  name: string;
  description: string | null;
  defaultPricePerKg: number | null;
  category: string | null;
  isActive: boolean;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  stockQuantity: number;
  reorderLevel: number;
  unitType: string;
  costPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  total: number;
  returned: number;
  limit: number;
  hasMore: boolean;
  limitReached: boolean;
  warningMessage?: string;
}

interface ProductStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface StockBatch {
  id: number;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  costPrice: number;
  receivedDate: string;
  expiryDate: string | null;
  supplierName: string | null;
  notes: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Statistics
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });

  // Batch details
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<StockBatch[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Product form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultPricePerKg: '',
    costPrice: '',
    category: '',
    sku: '',
    barcode: '',
    stockQuantity: '',
    reorderLevel: '10',
    unitType: 'weight' as 'weight' | 'unit',
    isActive: true,
  });

  // Category creation
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: ''
  });
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);
    if (currentUser) {
      fetchProducts();
      fetchStats();
      fetchCategories();
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/products');
      if (response.ok) {
        const data = await response.json();

        // Handle new pagination response format
        let productsArray: Product[] = [];
        if (data.data && data.pagination) {
          productsArray = Array.isArray(data.data) ? data.data : [];
          setProducts(productsArray);
          setPagination(data.pagination);
        } else {
          // Backward compatibility: if response is just an array
          productsArray = Array.isArray(data) ? data : [];
          setProducts(productsArray);
          setPagination(undefined);
        }

        // Calculate total inventory value from cost price × stock quantity
        const totalInventoryValue = productsArray.reduce((sum, product) => {
          const costPrice = product.costPrice || 0;
          const stockQuantity = product.stockQuantity || 0;
          return sum + (costPrice * stockQuantity);
        }, 0);

        // Update stats with calculated inventory value
        setStats(prevStats => ({
          ...prevStats,
          totalValue: totalInventoryValue
        }));

        console.log('📦 Total Inventory Value (Cost Price × Quantity):', totalInventoryValue.toFixed(2));
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth('/api/categories');
      if (response.ok) {
        const result = await response.json();
        // Backend returns paginated response: { data: [], pagination: {} }
        const data = result.data || result;
        // Ensure data is an array before setting
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Expected array but got:', result);
          setCategories([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/products/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchProductBatches = async (productId: number) => {
    setLoadingBatches(true);
    try {
      const response = await fetchWithAuth(`/api/batches?productId=${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProductBatches(data);
      } else {
        toast.error('Failed to load batches');
      }
    } catch (err) {
      toast.error('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleViewBatches = async (product: Product) => {
    setSelectedProduct(product);
    setBatchDialogOpen(true);
    await fetchProductBatches(product.id);
  };

  const handleCreateProduct = async () => {
    try {
      // Validation
      if (!formData.name) {
        toast.error('Product name is required');
        return;
      }

      // CRITICAL: Validate cost price if stock is being added
      const stockQty = parseFloat(formData.stockQuantity || '0');
      const costPrice = parseFloat(formData.costPrice || '0');

      if (stockQty > 0 && costPrice <= 0) {
        toast.error('Cost price is required when adding initial stock', {
          description: 'You cannot add stock without specifying a valid cost price. This is required for accurate inventory costing.'
        });
        return;
      }

      const response = await fetchWithAuth('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          defaultPricePerKg: formData.defaultPricePerKg ? parseFloat(formData.defaultPricePerKg) : null,
          costPrice: costPrice || null,
          category: formData.category || null,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          stockQuantity: stockQty,
          reorderLevel: parseFloat(formData.reorderLevel),
          unitType: formData.unitType,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success('Product created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      // Build update payload
      const updatePayload: any = {
        name: formData.name,
        description: formData.description || null,
        defaultPricePerKg: formData.defaultPricePerKg ? parseFloat(formData.defaultPricePerKg) : null,
        category: formData.category || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        reorderLevel: parseFloat(formData.reorderLevel),
        isActive: formData.isActive,
      };

      // Only include cost price if product currently has no cost price (NULL or 0)
      if ((editingProduct.costPrice === null || editingProduct.costPrice === 0) && formData.costPrice) {
        updatePayload.costPrice = parseFloat(formData.costPrice);
      }

      const response = await fetchWithAuth(`/api/products?id=${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        toast.success('Product updated successfully', {
          description: updatePayload.costPrice ? 'Cost price has been set and batches updated' : undefined
        });
        setIsDialogOpen(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update product', {
          description: data.details?.message
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update product');
    }
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(`/api/products?id=${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Product deleted successfully');
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        fetchProducts();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateSKU = () => {
    // Generate SKU based on category and product name
    let sku = '';

    // Use category prefix if available
    if (formData.category) {
      const categoryPrefix = formData.category
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 3);
      sku += categoryPrefix;
    } else {
      sku += 'PRD'; // Default prefix if no category
    }

    // Add hyphen
    sku += '-';

    // Use product name if available
    if (formData.name.trim()) {
      const namePrefix = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 4);
      sku += namePrefix;
    } else {
      sku += 'XXXX';
    }

    // Add timestamp-based unique suffix
    const timestamp = Date.now().toString().slice(-4);
    sku += '-' + timestamp;

    // Update form data
    setFormData({ ...formData, sku });
    toast.success('SKU generated successfully');
  };

  const handleCreateCategory = async () => {
    if (!newCategoryData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await fetchWithAuth('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryData.name.trim(),
          description: newCategoryData.description.trim() || null,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        toast.success('Category created successfully');

        // Refresh categories list
        await fetchCategories();

        // Auto-select the newly created category
        setFormData({ ...formData, category: newCategory.name });

        // Reset and close dialog
        setNewCategoryData({ name: '', description: '' });
        setCategoryDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create category');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      defaultPricePerKg: product.defaultPricePerKg?.toString() || '',
      costPrice: product.costPrice?.toString() || '',
      category: product.category || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stockQuantity: '', // Can't edit stock directly - must use batch system
      reorderLevel: product.reorderLevel.toString(),
      unitType: product.unitType as 'weight' | 'unit',
      isActive: product.isActive,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      defaultPricePerKg: '',
      costPrice: '',
      category: '',
      sku: '',
      barcode: '',
      stockQuantity: '',
      reorderLevel: '10',
      unitType: 'weight',
      isActive: true,
    });
  };

  const exportToCSV = () => {
    try {
      const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Stock', 'Unit', 'Cost Price', 'Selling Price', 'Status'];
      const rows = filteredProducts.map(product => [
        product.name,
        product.sku || '',
        product.barcode || '',
        product.category || '',
        product.stockQuantity,
        product.unitType === 'weight' ? 'KG' : 'Units',
        product.costPrice?.toFixed(2) || '0.00',
        product.defaultPricePerKg?.toFixed(2) || '0.00',
        product.isActive ? 'Active' : 'Inactive'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV exported successfully!');
    } catch (err: any) {
      toast.error('Failed to export CSV: ' + err.message);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stockQuantity === 0) return 'out';
    if (product.stockQuantity <= product.reorderLevel) return 'low';
    return 'ok';
  };

  const getStockBadgeColor = (status: string) => {
    switch (status) {
      case 'out':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'out':
        return 'Out of Stock';
      case 'low':
        return 'Low Stock';
      default:
        return 'In Stock';
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = !selectedCategory || product.category === selectedCategory;

    // Stock status filter
    let matchesStockStatus = true;
    if (selectedStockStatus === 'in-stock') {
      matchesStockStatus = product.stockQuantity > product.reorderLevel;
    } else if (selectedStockStatus === 'low-stock') {
      matchesStockStatus = product.stockQuantity > 0 && product.stockQuantity <= product.reorderLevel;
    } else if (selectedStockStatus === 'out-of-stock') {
      matchesStockStatus = product.stockQuantity === 0;
    }

    // Active status filter
    let matchesActiveStatus = true;
    if (selectedActiveStatus === 'active') {
      matchesActiveStatus = product.isActive;
    } else if (selectedActiveStatus === 'inactive') {
      matchesActiveStatus = !product.isActive;
    }

    return matchesSearch && matchesCategory && matchesStockStatus && matchesActiveStatus;
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 space-y-6">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalProducts.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inventory Value (Cost)</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total worth at cost price</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold mt-1">{stats.lowStockCount.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold mt-1">{stats.outOfStockCount.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <PackageX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters && Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Name, SKU, or Barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockStatus">Stock Status</Label>
                  <select
                    id="stockStatus"
                    value={selectedStockStatus}
                    onChange={(e) => setSelectedStockStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Stock</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activeStatus">Status</Label>
                  <select
                    id="activeStatus"
                    value={selectedActiveStatus}
                    onChange={(e) => setSelectedActiveStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedStockStatus('');
                    setSelectedActiveStatus('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={filteredProducts.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={fetchProducts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
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
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Warning */}
        {!loading && pagination && (
          <PaginationWarning pagination={pagination} entityName="products" />
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search criteria</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Product
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table View */}
        {!loading && filteredProducts.length > 0 && viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Product</TableHead>
                      <TableHead className="w-[150px]">SKU / Barcode</TableHead>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead className="text-right w-[100px]">Stock</TableHead>
                      <TableHead className="text-right w-[120px]">Cost Price</TableHead>
                      <TableHead className="text-right w-[120px]">Selling Price</TableHead>
                      <TableHead className="text-center w-[100px]">Status</TableHead>
                      <TableHead className="text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="max-w-[250px]">
                            <div>
                              <div className="font-medium truncate" title={product.name}>
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1" title={product.description}>
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <div className="text-sm">
                              {product.sku && (
                                <div className="truncate" title={`SKU: ${product.sku}`}>
                                  SKU: {product.sku}
                                </div>
                              )}
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground truncate" title={`Barcode: ${product.barcode}`}>
                                  BC: {product.barcode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[120px]">
                            {product.category ? (
                              <Badge variant="outline" className="max-w-full truncate" title={product.category}>
                                {product.category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div className="font-medium">
                                {product.stockQuantity.toFixed(product.unitType === 'weight' ? 3 : 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {product.unitType === 'weight' ? 'KG' : 'Units'}
                              </div>
                              <Badge
                                variant="outline"
                                className={`${getStockBadgeColor(stockStatus)} border text-xs mt-1`}
                              >
                                {getStockLabel(stockStatus)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{formatCurrency(product.costPrice)}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs mt-1"
                              onClick={() => handleViewBatches(product)}
                            >
                              <Layers className="h-3 w-3 mr-1" />
                              View Batches
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{formatCurrency(product.defaultPricePerKg)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(product)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid View */}
        {!loading && filteredProducts.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate" title={product.name}>
                            {product.name}
                          </h3>
                          {product.category && (
                            <Badge variant="outline" className="mt-1">{product.category}</Badge>
                          )}
                        </div>
                        <Badge variant={product.isActive ? 'default' : 'secondary'} className="shrink-0">
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" title={product.description}>
                          {product.description}
                        </p>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Stock:</span>
                          <div className="font-medium">
                            {product.stockQuantity.toFixed(product.unitType === 'weight' ? 3 : 0)}{' '}
                            {product.unitType === 'weight' ? 'KG' : 'Units'}
                          </div>
                          <Badge
                            variant="outline"
                            className={`${getStockBadgeColor(stockStatus)} border text-xs mt-1`}
                          >
                            {getStockLabel(stockStatus)}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost Price:</span>
                          <div className="font-medium">{formatCurrency(product.costPrice)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Selling Price:</span>
                          <div className="font-medium">{formatCurrency(product.defaultPricePerKg)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SKU:</span>
                          <div className="font-medium truncate" title={product.sku || ''}>
                            {product.sku || '-'}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewBatches(product)}
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          Batches
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Category Creation Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new product category. It will be available immediately in the dropdown.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input
                  id="categoryName"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                  placeholder="e.g., Beverages, Snacks, Dairy"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description (Optional)</Label>
                <Textarea
                  id="categoryDescription"
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                  placeholder="Brief description of this category..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewCategoryData({ name: '', description: '' });
                  setCategoryDialogOpen(false);
                }}
                disabled={creatingCategory}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryData.name.trim()}
              >
                {creatingCategory ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Category
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Details Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
            {/* Header */}
            <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  {selectedProduct?.name}
                </DialogTitle>
                <Badge variant="outline" className="text-xs">
                  {productBatches.length} {productBatches.length === 1 ? 'Batch' : 'Batches'}
                </Badge>
              </div>
              <div className="flex gap-6 pt-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className="font-semibold">
                      {selectedProduct?.stockQuantity.toFixed(3)} {selectedProduct?.unitType === 'weight' ? 'KG' : 'Units'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Average Cost Price</p>
                    <p className="font-semibold">{formatCurrency(selectedProduct?.costPrice || 0)}</p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {loadingBatches ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading batches...</p>
              </div>
            ) : productBatches.length === 0 ? (
              <div className="py-20 text-center">
                <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No batches available</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Batches are automatically created when receiving purchase orders or adding initial stock.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="p-6 space-y-5">
                  {/* Batches List */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Stock Batches
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold">Batch Number</TableHead>
                            <TableHead className="text-right font-semibold">Qty Received</TableHead>
                            <TableHead className="text-right font-semibold">Qty Remaining</TableHead>
                            <TableHead className="text-right font-semibold">Cost Price</TableHead>
                            <TableHead className="font-semibold">Received Date</TableHead>
                            <TableHead className="font-semibold">Supplier</TableHead>
                            <TableHead className="text-center font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productBatches.map((batch) => (
                            <TableRow key={batch.id}>
                              <TableCell className="font-mono text-sm font-medium">{batch.batchNumber}</TableCell>
                              <TableCell className="text-right">{batch.quantityReceived.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {batch.quantityRemaining.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(batch.costPrice)}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(batch.receivedDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="text-sm">{batch.supplierName || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={batch.quantityRemaining > 0 ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {batch.quantityRemaining > 0 ? 'Active' : 'Depleted'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Weighted Average Calculation */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Weighted Average Cost Calculation
                    </h3>
                    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-5">
                        <div className="space-y-4">
                          {/* Individual Batches */}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">Active Batches:</p>
                            <div className="space-y-2">
                              {productBatches.filter(b => b.quantityRemaining > 0).map((batch, index) => (
                                <div key={batch.id} className="flex items-center justify-between bg-background rounded-lg p-3 border">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono shrink-0">
                                      Batch {index + 1}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-semibold">{batch.quantityRemaining.toFixed(3)}</span>
                                      <span className="text-muted-foreground">×</span>
                                      <span className="font-semibold">{formatCurrency(batch.costPrice)}</span>
                                    </div>
                                  </div>
                                  <div className="font-bold">
                                    = {formatCurrency(batch.quantityRemaining * batch.costPrice)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Summary Calculation */}
                          <div className="bg-background/80 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Remaining Quantity:</span>
                              <span className="font-semibold">
                                {productBatches.reduce((sum, b) => sum + b.quantityRemaining, 0).toFixed(3)} {selectedProduct?.unitType === 'weight' ? 'KG' : 'Units'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Inventory Value:</span>
                              <span className="font-semibold">
                                {formatCurrency(productBatches.reduce((sum, b) => sum + (b.quantityRemaining * b.costPrice), 0))}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center pt-2">
                              <span className="font-bold">Weighted Average Cost per {selectedProduct?.unitType === 'weight' ? 'KG' : 'Unit'}:</span>
                              <span className="font-bold text-xl text-primary">
                                {formatCurrency(selectedProduct?.costPrice || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Formula Explanation */}
                          <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">💡 How it's calculated:</p>
                            <p className="text-xs text-muted-foreground">
                              Weighted Average = (Sum of all batch values) ÷ (Total remaining quantity)
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Product
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The product will be soft-deleted and can be restored later.
              </DialogDescription>
            </DialogHeader>

            {productToDelete && (
              <div className="py-4">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg truncate">{productToDelete.name}</p>
                      {productToDelete.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {productToDelete.sku}</p>
                      )}
                      {productToDelete.category && (
                        <Badge variant="outline" className="mt-1">{productToDelete.category}</Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Stock</p>
                      <p className="font-semibold">
                        {productToDelete.stockQuantity.toFixed(3)} {productToDelete.unitType === 'weight' ? 'KG' : 'Units'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost Price</p>
                      <p className="font-semibold">{formatCurrency(productToDelete.costPrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">Warning</p>
                      <p className="text-amber-800 dark:text-amber-200 mt-1">
                        Deleting this product will remove it from the active inventory. Any existing batches and order history will be preserved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteProduct}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Product Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update product information' : 'Add a new product to your inventory'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Rice"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Category</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setCategoryDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  </div>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Category is optional. Click "New" to create a category.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitType">Unit Type</Label>
                  <select
                    id="unitType"
                    value={formData.unitType}
                    onChange={(e) => setFormData({ ...formData, unitType: e.target.value as 'weight' | 'unit' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="weight">Weight (KG)</option>
                    <option value="unit">Units (Pieces)</option>
                  </select>
                  {editingProduct && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      ⚠️ Warning: Changing unit type may affect existing stock calculations and batches.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sku">SKU</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={generateSKU}
                      title="Generate SKU automatically"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                  </div>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., RICE-001 (or click Generate)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click "Generate" to create unique SKU, or enter manually.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g., 1234567890"
                  />
                </div>

                {!editingProduct && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="stockQuantity">
                        Initial Stock {formData.unitType === 'weight' ? '(KG)' : '(Units)'}
                      </Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        step={formData.unitType === 'weight' ? '0.001' : '1'}
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costPrice">
                        Cost Price * {parseFloat(formData.stockQuantity || '0') > 0 && '(Required for initial stock)'}
                      </Label>
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        placeholder="0.00"
                      />
                      {parseFloat(formData.stockQuantity || '0') > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Cost price is required when adding initial stock for accurate inventory costing.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {editingProduct && (
                  <div className="space-y-2 col-span-2">
                    {(editingProduct.costPrice === null || editingProduct.costPrice === 0) ? (
                      // Allow editing if cost price is NULL or 0 (imported products without cost price)
                      <>
                        <Label htmlFor="costPriceEdit" className="flex items-center gap-2">
                          Cost Price (One-time Fix)
                          <span className="text-xs text-amber-600 font-normal">(Editable - No cost price set)</span>
                        </Label>
                        <Input
                          id="costPriceEdit"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.costPrice}
                          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                          placeholder="0.00"
                          className="border-amber-300 focus:border-amber-500"
                        />
                        <p className="text-xs text-amber-600">
                          This product has no cost price. You can set it once here. After setting, it will be managed via batches only.
                        </p>
                      </>
                    ) : (
                      // Read-only if cost price already exists
                      <>
                        <Label>Current Cost Price (Calculated from Batches)</Label>
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                          {formatCurrency(editingProduct.costPrice)} (Read-only)
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cost price is automatically calculated from batch costs. To change it, receive new batches via purchase orders.
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price (per {formData.unitType === 'weight' ? 'KG' : 'Unit'})</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.defaultPricePerKg}
                    onChange={(e) => setFormData({ ...formData, defaultPricePerKg: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    step={formData.unitType === 'weight' ? '0.001' : '1'}
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
