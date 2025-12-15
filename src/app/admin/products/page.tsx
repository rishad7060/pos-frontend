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
import { getAuthUser, logout } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { ArrowLeft, Plus, Trash2, Edit, LogOut, User, Package, AlertTriangle, Search, Grid3x3, List, Download, Upload, TrendingUp, TrendingDown, Bell, BellOff, Image as ImageIcon, Tag, Folder } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  alertsEnabled: boolean;
  alertEmail: string | null;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  createdAt: string;
  updatedAt: string;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStock, setFilterStock] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Category management state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormDescription, setCategoryFormDescription] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [alertConfigProduct, setAlertConfigProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [stockAdjustmentNotes, setStockAdjustmentNotes] = useState('');

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formReorderLevel, setFormReorderLevel] = useState('10');
  const [formUnitType, setFormUnitType] = useState<'weight' | 'unit'>('weight');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAlertsEnabled, setFormAlertsEnabled] = useState(true);
  const [formAlertEmail, setFormAlertEmail] = useState('');
  const [formMinStockLevel, setFormMinStockLevel] = useState('');
  const [formMaxStockLevel, setFormMaxStockLevel] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Confirmation dialog states
  const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteProductConfirmOpen, setDeleteProductConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setUser(getAuthUser());
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/products?limit=100');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth('/api/categories?limit=100');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      setCategories(data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  // Category management functions
  const resetCategoryForm = () => {
    setCategoryFormName('');
    setCategoryFormDescription('');
    setEditingCategory(null);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormName(category.name);
    setCategoryFormDescription(category.description || '');
    setIsCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategorySubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: categoryFormName,
        description: categoryFormDescription || null,
      };

      const url = editingCategory
        ? `/api/categories?id=${editingCategory.id}`
        : '/api/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingCategory ? 'update' : 'create'} category`);
      }

      setSuccess(`Category ${categoryFormName} ${editingCategory ? 'updated' : 'created'} successfully!`);
      resetCategoryForm();
      setIsCategoryDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingCategory ? 'update' : 'create'} category`);
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    setCategoryToDelete({ id, name });
    setDeleteCategoryConfirmOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      setSuccess(`Category ${categoryToDelete.name} deleted successfully!`);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeleteCategoryConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormCostPrice('');
    setFormCategory('');
    setFormSku('');
    setFormBarcode('');
    setFormStockQuantity('');
    setFormReorderLevel('10');
    setFormUnitType('weight');
    setFormIsActive(true);
    setFormImageUrl('');
    setFormAlertsEnabled(true);
    setFormAlertEmail('');
    setFormMinStockLevel('');
    setFormMaxStockLevel('');
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormPrice(product.defaultPricePerKg?.toString() || '');
    setFormCostPrice(product.costPrice?.toString() || '');
    setFormCategory(product.category || '');
    setFormSku(product.sku || '');
    setFormBarcode(product.barcode || '');
    setFormStockQuantity(product.stockQuantity.toString());
    setFormReorderLevel(product.reorderLevel.toString());
    setFormUnitType(product.unitType as 'weight' | 'unit');
    setFormIsActive(product.isActive);
    setFormImageUrl(product.imageUrl || '');
    setFormAlertsEnabled(product.alertsEnabled);
    setFormAlertEmail(product.alertEmail || '');
    setFormMinStockLevel(product.minStockLevel?.toString() || '');
    setFormMaxStockLevel(product.maxStockLevel?.toString() || '');
    setIsDialogOpen(true);
  };

  const openStockDialog = (product: Product) => {
    setStockAdjustProduct(product);
    setStockAdjustment('');
    setStockAdjustmentType('add');
    setStockAdjustmentNotes('');
    setIsStockDialogOpen(true);
  };

  const openAlertDialog = (product: Product) => {
    setAlertConfigProduct(product);
    setFormAlertsEnabled(product.alertsEnabled);
    setFormAlertEmail(product.alertEmail || '');
    setFormMinStockLevel(product.minStockLevel?.toString() || '');
    setFormMaxStockLevel(product.maxStockLevel?.toString() || '');
    setIsAlertDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formName,
        description: formDescription || null,
        defaultPricePerKg: formPrice ? parseFloat(formPrice) : null,
        costPrice: formCostPrice ? parseFloat(formCostPrice) : null,
        category: formCategory || null,
        sku: formSku || null,
        barcode: formBarcode || null,
        stockQuantity: formStockQuantity ?
          (formUnitType === 'weight' ? parseFloat(formStockQuantity) : parseInt(formStockQuantity)) : 0,
        reorderLevel: formReorderLevel ?
          (formUnitType === 'weight' ? parseFloat(formReorderLevel) : parseInt(formReorderLevel)) : 10,
        unitType: formUnitType,
        isActive: formIsActive,
        imageUrl: formImageUrl || null,
        alertsEnabled: formAlertsEnabled,
        alertEmail: formAlertEmail || null,
        minStockLevel: formMinStockLevel ? parseInt(formMinStockLevel) : null,
        maxStockLevel: formMaxStockLevel ? parseInt(formMaxStockLevel) : null,
      };

      const url = editingProduct
        ? `/api/products?id=${editingProduct.id}`
        : '/api/products';

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingProduct ? 'update' : 'create'} product`);
      }

      setSuccess(`Product ${formName} ${editingProduct ? 'updated' : 'created'} successfully!`);
      resetForm();
      setIsDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingProduct ? 'update' : 'create'} product`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockAdjustProduct || !stockAdjustment) return;

    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const adjustmentValue = stockAdjustProduct.unitType === 'weight'
        ? parseFloat(stockAdjustment)
        : parseInt(stockAdjustment);
      let newStock = stockAdjustProduct.stockQuantity;

      if (stockAdjustmentType === 'add') {
        newStock += adjustmentValue;
      } else if (stockAdjustmentType === 'subtract') {
        newStock -= adjustmentValue;
      } else {
        newStock = adjustmentValue;
      }

      // Round to appropriate precision
      newStock = stockAdjustProduct.unitType === 'weight'
        ? Number(newStock.toFixed(3))
        : Math.round(newStock);

      if (newStock < 0) {
        throw new Error('Stock quantity cannot be negative');
      }

      const response = await fetch(`/api/products?id=${stockAdjustProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStock }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      setSuccess(`Stock adjusted successfully! New quantity: ${newStock}`);
      setIsStockDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAlertConfig = async () => {
    if (!alertConfigProduct) return;

    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/products?id=${alertConfigProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertsEnabled: formAlertsEnabled,
          alertEmail: formAlertEmail || null,
          minStockLevel: formMinStockLevel ? parseInt(formMinStockLevel) : null,
          maxStockLevel: formMaxStockLevel ? parseInt(formMaxStockLevel) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update alert settings');
      }

      setSuccess('Alert settings updated successfully!');
      setIsAlertDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to update alert settings');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    setProductToDelete({ id, name });
    setDeleteProductConfirmOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products?id=${productToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setSuccess(`Product ${productToDelete.name} deleted successfully!`);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setDeleteProductConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    setError('');
    setSuccess('');

    try {
      const deletePromises = Array.from(selectedProducts).map(id =>
        fetch(`/api/products?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSuccess(`${selectedProducts.size} product(s) deleted successfully!`);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (err: any) {
      setError('Failed to delete some products');
    } finally {
      setBulkDeleteConfirmOpen(false);
    }
  };

  const toggleProductSelection = (id: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Price', 'Cost', 'Stock', 'Reorder Level', 'Unit Type', 'Status'];
    const rows = products.map(p => [
      p.name,
      p.sku || '',
      p.barcode || '',
      p.category || '',
      p.defaultPricePerKg || '',
      p.costPrice || '',
      p.stockQuantity,
      p.reorderLevel,
      p.unitType,
      p.isActive ? 'Active' : 'Inactive'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Products exported successfully!');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;

    const matchesStock = filterStock === 'all' ||
      (filterStock === 'low' && product.stockQuantity <= product.reorderLevel) ||
      (filterStock === 'out' && product.stockQuantity === 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockProducts = products.filter(p => p.stockQuantity <= p.reorderLevel && p.stockQuantity > 0);
  const outOfStockProducts = products.filter(p => p.stockQuantity === 0);

  return (
    <div className="space-y-6">

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-200">
            <div className="font-semibold mb-1">Stock Alerts</div>
            {outOfStockProducts.length > 0 && (
              <div>• {outOfStockProducts.length} product(s) out of stock</div>
            )}
            {lowStockProducts.length > 0 && (
              <div>• {lowStockProducts.length} product(s) running low</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Category Management Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Category Management
            </CardTitle>
            <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
              setIsCategoryDialogOpen(open);
              if (!open) resetCategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name *</Label>
                    <Input
                      id="categoryName"
                      value={categoryFormName}
                      onChange={(e) => setCategoryFormName(e.target.value)}
                      required
                      placeholder="e.g., Seafood, Spices, Dried Goods"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription">Description</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryFormDescription}
                      onChange={(e) => setCategoryFormDescription(e.target.value)}
                      placeholder="Category description (optional)"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={categorySubmitting} className="flex-1">
                      {categorySubmitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCategoryDialogOpen(false);
                      resetCategoryForm();
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No categories yet. Create one to organize your products.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge key={category.id} variant="secondary" className="px-3 py-2 text-sm flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100">
                  <Tag className="h-3 w-3" />
                  <span>{category.name}</span>
                  <button
                    onClick={() => openEditCategoryDialog(category)}
                    className="ml-1 hover:text-primary"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="filterCategory">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="filterCategory">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterStock">Stock Status</Label>
                <Select value={filterStock} onValueChange={setFilterStock}>
                  <SelectTrigger id="filterStock">
                    <SelectValue placeholder="All Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {selectedProducts.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedProducts.size})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                          <TabsTrigger value="basic">Basic</TabsTrigger>
                          <TabsTrigger value="inventory">Inventory</TabsTrigger>
                          <TabsTrigger value="pricing">Pricing</TabsTrigger>
                          <TabsTrigger value="alerts">Alerts</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                              id="name"
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              required
                              placeholder="e.g., Dry Fish KET"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              placeholder="Product description"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="imageUrl">Image URL</Label>
                            <Input
                              id="imageUrl"
                              value={formImageUrl}
                              onChange={(e) => setFormImageUrl(e.target.value)}
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Select value={formCategory} onValueChange={setFormCategory}>
                                <SelectTrigger id="category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="unitType">Unit Type</Label>
                              <Select value={formUnitType} onValueChange={(val) => setFormUnitType(val as 'weight' | 'unit')}>
                                <SelectTrigger id="unitType">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weight">Weight (KG/G)</SelectItem>
                                  <SelectItem value="unit">Unit (Pieces)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isActive"
                              checked={formIsActive}
                              onCheckedChange={setFormIsActive}
                            />
                            <Label htmlFor="isActive">Active Product</Label>
                          </div>
                        </TabsContent>

                        <TabsContent value="inventory" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="sku">SKU</Label>
                              <Input
                                id="sku"
                                value={formSku}
                                onChange={(e) => setFormSku(e.target.value)}
                                placeholder="e.g., SF-DF001"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="barcode">Barcode</Label>
                              <Input
                                id="barcode"
                                value={formBarcode}
                                onChange={(e) => setFormBarcode(e.target.value)}
                                placeholder="e.g., 1234567890123"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="stockQuantity">
                                Stock Quantity {formUnitType === 'weight' ? '(KG)' : '(Units)'}
                              </Label>
                              <Input
                                id="stockQuantity"
                                type="number"
                                min="0"
                                step={formUnitType === 'weight' ? '0.001' : '1'}
                                value={formStockQuantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (formUnitType === 'unit') {
                                    // For units, only allow integers
                                    const intValue = value.replace(/[^0-9]/g, '');
                                    setFormStockQuantity(intValue);
                                  } else {
                                    // For weight, allow decimals
                                    const decimalValue = value.replace(/[^0-9.]/g, '');
                                    // Ensure only one decimal point
                                    const parts = decimalValue.split('.');
                                    if (parts.length > 2) {
                                      setFormStockQuantity(parts[0] + '.' + parts.slice(1).join(''));
                                    } else {
                                      setFormStockQuantity(decimalValue);
                                    }
                                  }
                                }}
                                placeholder={formUnitType === 'weight' ? '0.000' : '0'}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reorderLevel">
                                Reorder Level {formUnitType === 'weight' ? '(KG)' : '(Units)'}
                              </Label>
                              <Input
                                id="reorderLevel"
                                type="number"
                                min="0"
                                step={formUnitType === 'weight' ? '0.001' : '1'}
                                value={formReorderLevel}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (formUnitType === 'unit') {
                                    // For units, only allow integers
                                    const intValue = value.replace(/[^0-9]/g, '');
                                    setFormReorderLevel(intValue);
                                  } else {
                                    // For weight, allow decimals
                                    const decimalValue = value.replace(/[^0-9.]/g, '');
                                    // Ensure only one decimal point
                                    const parts = decimalValue.split('.');
                                    if (parts.length > 2) {
                                      setFormReorderLevel(parts[0] + '.' + parts.slice(1).join(''));
                                    } else {
                                      setFormReorderLevel(decimalValue);
                                    }
                                  }
                                }}
                                placeholder={formUnitType === 'weight' ? '10.000' : '10'}
                              />
                            </div>
                          </div>

                          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
                            <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                              You'll receive alerts when stock falls below the reorder level.
                            </AlertDescription>
                          </Alert>
                        </TabsContent>

                        <TabsContent value="pricing" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="price">
                              Default Price per {formUnitType === 'weight' ? 'KG' : 'Unit'} (LKR)
                            </Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formPrice}
                              onChange={(e) => setFormPrice(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="costPrice">
                              Cost Price per {formUnitType === 'weight' ? 'KG' : 'Unit'} (LKR)
                            </Label>
                            <Input
                              id="costPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formCostPrice}
                              onChange={(e) => setFormCostPrice(e.target.value)}
                              placeholder="0.00"
                            />
                            <p className="text-xs text-muted-foreground">
                              Used for profit calculations in reports
                            </p>
                          </div>

                          {formPrice && formCostPrice && (
                            <Alert className="bg-green-50 border-green-200">
                              <AlertDescription className="text-sm text-green-800">
                                <div className="font-semibold">Profit Margin</div>
                                <div className="mt-1">
                                  LKR {(parseFloat(formPrice) - parseFloat(formCostPrice)).toFixed(2)} per {formUnitType === 'weight' ? 'KG' : 'unit'}
                                  {' '}({(((parseFloat(formPrice) - parseFloat(formCostPrice)) / parseFloat(formPrice)) * 100).toFixed(1)}%)
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </TabsContent>

                        <TabsContent value="alerts" className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="alertsEnabled"
                              checked={formAlertsEnabled}
                              onCheckedChange={setFormAlertsEnabled}
                            />
                            <Label htmlFor="alertsEnabled">Enable Stock Alerts</Label>
                          </div>

                          {formAlertsEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="alertEmail">Alert Email (Optional)</Label>
                                <Input
                                  id="alertEmail"
                                  type="email"
                                  value={formAlertEmail}
                                  onChange={(e) => setFormAlertEmail(e.target.value)}
                                  placeholder="alerts@example.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Leave empty to use default business email
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="minStock">Min Stock Level</Label>
                                  <Input
                                    id="minStock"
                                    type="number"
                                    min="0"
                                    value={formMinStockLevel}
                                    onChange={(e) => setFormMinStockLevel(e.target.value)}
                                    placeholder="Optional"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="maxStock">Max Stock Level</Label>
                                  <Input
                                    id="maxStock"
                                    type="number"
                                    min="0"
                                    value={formMaxStockLevel}
                                    onChange={(e) => setFormMaxStockLevel(e.target.value)}
                                    placeholder="Optional"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </TabsContent>
                      </Tabs>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={formSubmitting} className="flex-1">
                          {formSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterCategory !== 'all' || filterStock !== 'all'
                ? 'No products match your filters'
                : 'No products found. Create one to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={product.stockQuantity === 0 ? 'border-red-300 dark:border-red-900' : product.stockQuantity <= product.reorderLevel ? 'border-yellow-300 dark:border-yellow-900' : ''}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => toggleProductSelection(product.id)}
                  />
                  <div className="flex-1">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="truncate">{product.name}</span>
                      <div className="flex flex-col gap-1">
                        <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.stockQuantity === 0 && (
                          <Badge variant="destructive" className="text-xs">Out</Badge>
                        )}
                        {product.stockQuantity > 0 && product.stockQuantity <= product.reorderLevel && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Low</Badge>
                        )}
                      </div>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.imageUrl && (
                  <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {product.sku && (
                    <div>
                      <p className="text-muted-foreground">SKU</p>
                      <p className="font-mono text-xs">{product.sku}</p>
                    </div>
                  )}
                  {product.category && (
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs">{product.category}</Badge>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-semibold">
                      {product.unitType === 'weight'
                        ? Number(product.stockQuantity).toFixed(3)
                        : Math.round(product.stockQuantity)
                      } {product.unitType === 'weight' ? 'KG' : 'units'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Alerts</p>
                    <Badge variant={product.alertsEnabled ? "default" : "secondary"} className="text-xs">
                      {product.alertsEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                    </Badge>
                  </div>
                </div>

                {product.defaultPricePerKg && (
                  <div>
                    <p className="text-sm text-muted-foreground">Price per {product.unitType === 'weight' ? 'KG' : 'Unit'}</p>
                    <p className="font-bold text-lg">LKR {product.defaultPricePerKg.toFixed(2)}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openStockDialog(product)}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAlertDialog(product)}
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={
                    product.stockQuantity === 0 ? 'bg-red-50 dark:bg-red-950/20' :
                      product.stockQuantity <= product.reorderLevel ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                  }>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">{product.category}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {product.unitType === 'weight'
                          ? Number(product.stockQuantity).toFixed(3)
                          : Math.round(product.stockQuantity)
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">{product.unitType === 'weight' ? 'KG' : 'units'}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.defaultPricePerKg ? `LKR ${product.defaultPricePerKg.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs w-fit">
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.stockQuantity === 0 && (
                          <Badge variant="destructive" className="text-xs w-fit">Out of Stock</Badge>
                        )}
                        {product.stockQuantity > 0 && product.stockQuantity <= product.reorderLevel && (
                          <Badge className="bg-yellow-500 text-xs w-fit">Low Stock</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.alertsEnabled ? "default" : "secondary"}>
                        {product.alertsEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
                          onClick={() => openStockDialog(product)}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAlertDialog(product)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}



      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {stockAdjustProduct?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {stockAdjustProduct?.stockQuantity} {stockAdjustProduct?.unitType === 'weight' ? 'KG' : 'units'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={stockAdjustmentType} onValueChange={(val) => setStockAdjustmentType(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Add Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Remove Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="set">Set Exact Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment">
                Quantity ({stockAdjustProduct?.unitType === 'weight' ? 'KG' : 'Units'})
              </Label>
              <Input
                id="adjustment"
                type="number"
                min="0"
                step={stockAdjustProduct?.unitType === 'weight' ? '0.001' : '1'}
                value={stockAdjustment}
                onChange={(e) => {
                  const value = e.target.value;
                  if (stockAdjustProduct?.unitType === 'unit') {
                    // For units, only allow integers
                    const intValue = value.replace(/[^0-9]/g, '');
                    setStockAdjustment(intValue);
                  } else {
                    // For weight, allow decimals
                    const decimalValue = value.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = decimalValue.split('.');
                    if (parts.length > 2) {
                      setStockAdjustment(parts[0] + '.' + parts.slice(1).join(''));
                    } else {
                      setStockAdjustment(decimalValue);
                    }
                  }
                }}
                placeholder={stockAdjustProduct?.unitType === 'weight' ? '0.000' : '0'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={stockAdjustmentNotes}
                onChange={(e) => setStockAdjustmentNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                rows={2}
              />
            </div>

            {stockAdjustment && stockAdjustProduct && (
              <Alert>
                <AlertDescription>
                  <div className="font-semibold">New Stock Level:</div>
                  <div className="mt-1">
                    {(() => {
                      const adjustmentValue = stockAdjustProduct.unitType === 'weight'
                        ? parseFloat(stockAdjustment || '0')
                        : parseInt(stockAdjustment || '0');

                      let newStock = 0;
                      if (stockAdjustmentType === 'add') {
                        newStock = stockAdjustProduct.stockQuantity + adjustmentValue;
                      } else if (stockAdjustmentType === 'subtract') {
                        newStock = Math.max(0, stockAdjustProduct.stockQuantity - adjustmentValue);
                      } else {
                        newStock = adjustmentValue;
                      }

                      const formattedStock = stockAdjustProduct.unitType === 'weight'
                        ? newStock.toFixed(3)
                        : Math.round(newStock);

                      return (
                        <span>{formattedStock} {stockAdjustProduct.unitType === 'weight' ? 'KG' : 'units'}</span>
                      );
                    })()}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleStockAdjustment} disabled={!stockAdjustment || formSubmitting} className="flex-1">
                {formSubmitting ? 'Saving...' : 'Apply Adjustment'}
              </Button>
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Configuration Dialog */}
      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Alerts - {alertConfigProduct?.name}</DialogTitle>
            <DialogDescription>
              Configure low stock notifications and thresholds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="alerts"
                checked={formAlertsEnabled}
                onCheckedChange={setFormAlertsEnabled}
              />
              <Label htmlFor="alerts">Enable Stock Alerts</Label>
            </div>

            {formAlertsEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Alert Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formAlertEmail}
                    onChange={(e) => setFormAlertEmail(e.target.value)}
                    placeholder="alerts@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use default business email
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min">Min Stock Level</Label>
                    <Input
                      id="min"
                      type="number"
                      min="0"
                      value={formMinStockLevel}
                      onChange={(e) => setFormMinStockLevel(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max">Max Stock Level</Label>
                    <Input
                      id="max"
                      type="number"
                      min="0"
                      value={formMaxStockLevel}
                      onChange={(e) => setFormMaxStockLevel(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                    Alert thresholds help you maintain optimal inventory levels. You'll be notified when stock falls below minimum or exceeds maximum levels.
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAlertConfig} disabled={formSubmitting} className="flex-1">
                {formSubmitting ? 'Saving...' : 'Save Alert Settings'}
              </Button>
              <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteCategoryConfirmOpen}
        onOpenChange={setDeleteCategoryConfirmOpen}
        title="Delete Category"
        description={`Are you sure you want to delete category "${categoryToDelete?.name}"? This won't delete products in this category.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteCategory}
      />

      {/* Delete Product Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteProductConfirmOpen}
        onOpenChange={setDeleteProductConfirmOpen}
        title="Delete Product"
        description={`Are you sure you want to delete product "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteProduct}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Delete Multiple Products"
        description={`Are you sure you want to delete ${selectedProducts.size} product(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmBulkDelete}
      />
    </div >

  );
}