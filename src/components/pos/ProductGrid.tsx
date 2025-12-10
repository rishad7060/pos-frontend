'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, AlertTriangle } from 'lucide-react';
import type { Product, Category } from '@/types/pos';
import { getCategoryColor } from '@/lib/hooks/useCategories';

interface ProductGridProps {
    products: Product[];
    categories: Category[];
    selectedCategory: string;
    searchTerm: string;
    onCategoryChange: (category: string) => void;
    onSearchChange: (term: string) => void;
    onProductSelect: (product: Product) => void;
    getRemainingStock?: (productId: number) => number;
    loading?: boolean;
}

/**
 * Product grid with category filtering and search
 * Extracted from MultiTabPOS for reusability
 */
export function ProductGrid({
    products,
    categories,
    selectedCategory,
    searchTerm,
    onCategoryChange,
    onSearchChange,
    onProductSelect,
    getRemainingStock,
    loading = false,
}: ProductGridProps) {
    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchesSearch = searchTerm === '' ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch && product.isActive;
    });

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onCategoryChange('all')}
                >
                    All
                </Button>
                {categories.map(category => (
                    <Button
                        key={category.id}
                        variant={selectedCategory === category.name ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onCategoryChange(category.name)}
                    >
                        {category.name}
                    </Button>
                ))}
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map(product => {
                        const remainingStock = getRemainingStock
                            ? getRemainingStock(product.id)
                            : product.stockQuantity;
                        const isLowStock = remainingStock <= (product.reorderLevel || 5);
                        const isOutOfStock = remainingStock <= 0.001;

                        return (
                            <Card
                                key={product.id}
                                className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${getCategoryColor(product.category)
                                    } ${isOutOfStock ? 'opacity-50' : ''}`}
                                onClick={() => !isOutOfStock && onProductSelect(product)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-sm truncate flex-1">
                                            {product.name}
                                        </h3>
                                        {isLowStock && !isOutOfStock && (
                                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 ml-1" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-lg font-bold text-primary">
                                            LKR {product.defaultPricePerKg?.toFixed(2) || '0.00'}/kg
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs ${isLowStock ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                                Stock: {remainingStock.toFixed(2)} kg
                                            </span>
                                            {product.category && (
                                                <Badge variant="outline" className="text-xs">
                                                    {product.category}
                                                </Badge>
                                            )}
                                        </div>

                                        {isOutOfStock && (
                                            <Badge variant="destructive" className="w-full justify-center">
                                                Out of Stock
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
