'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Product, Category } from '@/types/pos';

interface ProductFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null; // null = create, Product = edit
    categories: Category[];
    onSubmit: (data: ProductFormData) => Promise<void>;
    loading?: boolean;
}

export interface ProductFormData {
    name: string;
    description: string | null;
    defaultPricePerKg: number | null;
    costPrice: number | null;
    category: string | null;
    sku: string | null;
    barcode: string | null;
    stockQuantity: number;
    reorderLevel: number;
    unitType: 'weight' | 'unit';
    isActive: boolean;
    imageUrl: string | null;
    alertsEnabled: boolean;
    alertEmail: string | null;
    minStockLevel: number | null;
    maxStockLevel: number | null;
}

/**
 * Product create/edit form dialog
 * Extracted from products admin page
 */
export function ProductFormDialog({
    open,
    onOpenChange,
    product,
    categories,
    onSubmit,
    loading = false,
}: ProductFormDialogProps) {
    const isEditing = !!product;

    // Form state
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: null,
        defaultPricePerKg: null,
        costPrice: null,
        category: null,
        sku: null,
        barcode: null,
        stockQuantity: 0,
        reorderLevel: 10,
        unitType: 'weight',
        isActive: true,
        imageUrl: null,
        alertsEnabled: true,
        alertEmail: null,
        minStockLevel: null,
        maxStockLevel: null,
    });

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: product.description,
                defaultPricePerKg: product.defaultPricePerKg,
                costPrice: product.costPrice ?? null,
                category: product.category,
                sku: product.sku,
                barcode: product.barcode ?? null,
                stockQuantity: product.stockQuantity,
                reorderLevel: product.reorderLevel ?? 10,
                unitType: (product.unitType as 'weight' | 'unit') || 'weight',
                isActive: product.isActive,
                imageUrl: product.imageUrl ?? null,
                alertsEnabled: product.alertsEnabled ?? true,
                alertEmail: product.alertEmail ?? null,
                minStockLevel: product.minStockLevel ?? null,
                maxStockLevel: product.maxStockLevel ?? null,
            });
        } else {
            // Reset to defaults for new product
            setFormData({
                name: '',
                description: null,
                defaultPricePerKg: null,
                costPrice: null,
                category: null,
                sku: null,
                barcode: null,
                stockQuantity: 0,
                reorderLevel: 10,
                unitType: 'weight',
                isActive: true,
                imageUrl: null,
                alertsEnabled: true,
                alertEmail: null,
                minStockLevel: null,
                maxStockLevel: null,
            });
        }
    }, [product, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="inventory">Inventory</TabsTrigger>
                            <TabsTrigger value="alerts">Alerts</TabsTrigger>
                        </TabsList>

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        required
                                        placeholder="e.g., Fresh Tuna"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={formData.category || ''}
                                        onValueChange={(v) => updateField('category', v || null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.name}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description || ''}
                                    onChange={(e) => updateField('description', e.target.value || null)}
                                    placeholder="Product description..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Selling Price (LKR/kg)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.defaultPricePerKg || ''}
                                        onChange={(e) => updateField('defaultPricePerKg', parseFloat(e.target.value) || null)}
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="costPrice">Cost Price (LKR/kg)</Label>
                                    <Input
                                        id="costPrice"
                                        type="number"
                                        value={formData.costPrice || ''}
                                        onChange={(e) => updateField('costPrice', parseFloat(e.target.value) || null)}
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input
                                        id="sku"
                                        value={formData.sku || ''}
                                        onChange={(e) => updateField('sku', e.target.value || null)}
                                        placeholder="Product SKU"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="barcode">Barcode</Label>
                                    <Input
                                        id="barcode"
                                        value={formData.barcode || ''}
                                        onChange={(e) => updateField('barcode', e.target.value || null)}
                                        placeholder="Barcode"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Active Product</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Inactive products won't appear in POS
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={(v) => updateField('isActive', v)}
                                />
                            </div>
                        </TabsContent>

                        {/* Inventory Tab */}
                        <TabsContent value="inventory" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Unit Type</Label>
                                <Select
                                    value={formData.unitType}
                                    onValueChange={(v) => updateField('unitType', v as 'weight' | 'unit')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weight">Weight-based (kg)</SelectItem>
                                        <SelectItem value="unit">Unit-based (pieces)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="stock">Current Stock</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        value={formData.stockQuantity || ''}
                                        onChange={(e) => updateField('stockQuantity', parseFloat(e.target.value) || 0)}
                                        min={0}
                                        step={formData.unitType === 'weight' ? 0.001 : 1}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reorder">Reorder Level</Label>
                                    <Input
                                        id="reorder"
                                        type="number"
                                        value={formData.reorderLevel || ''}
                                        onChange={(e) => updateField('reorderLevel', parseFloat(e.target.value) || 10)}
                                        min={0}
                                        step={formData.unitType === 'weight' ? 0.1 : 1}
                                        placeholder="10"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Alert when stock falls below this level
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Alerts Tab */}
                        <TabsContent value="alerts" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Enable Stock Alerts</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Get notified when stock is low
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.alertsEnabled}
                                    onCheckedChange={(v) => updateField('alertsEnabled', v)}
                                />
                            </div>

                            {formData.alertsEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="alertEmail">Alert Email</Label>
                                        <Input
                                            id="alertEmail"
                                            type="email"
                                            value={formData.alertEmail || ''}
                                            onChange={(e) => updateField('alertEmail', e.target.value || null)}
                                            placeholder="alerts@example.com"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="minStock">Min Stock Level</Label>
                                            <Input
                                                id="minStock"
                                                type="number"
                                                value={formData.minStockLevel || ''}
                                                onChange={(e) => updateField('minStockLevel', parseInt(e.target.value) || null)}
                                                min={0}
                                                placeholder="Optional"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="maxStock">Max Stock Level</Label>
                                            <Input
                                                id="maxStock"
                                                type="number"
                                                value={formData.maxStockLevel || ''}
                                                onChange={(e) => updateField('maxStockLevel', parseInt(e.target.value) || null)}
                                                min={0}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Form Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading || !formData.name}>
                            {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
