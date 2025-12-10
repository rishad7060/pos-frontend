'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '@/types/pos';
import { calculateItemTotals, validateCartAddition } from '@/lib/calculations';

interface WeightEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    initialPrice?: number;
    canEditPrices: boolean;
    canApplyDiscount: boolean;
    maxDiscountPercent: number;
    remainingStock: number;
    onAddToCart: (data: WeightEntryData) => void;
}

export interface WeightEntryData {
    product: Product;
    itemWeightKg: number;
    itemWeightG: number;
    boxWeightKg: number;
    boxWeightG: number;
    boxCount: number;
    pricePerKg: number;
    itemDiscountPercent: number;
    calculated: ReturnType<typeof calculateItemTotals>;
}

/**
 * Dialog for entering weight and box details when adding product to cart
 * Extracted from MultiTabPOS for reusability
 */
export function WeightEntryDialog({
    open,
    onOpenChange,
    product,
    initialPrice,
    canEditPrices,
    canApplyDiscount,
    maxDiscountPercent,
    remainingStock,
    onAddToCart,
}: WeightEntryDialogProps) {
    // Form state
    const [itemWeightKg, setItemWeightKg] = useState(0);
    const [itemWeightG, setItemWeightG] = useState(0);
    const [boxWeightKg, setBoxWeightKg] = useState(0);
    const [boxWeightG, setBoxWeightG] = useState(0);
    const [boxCount, setBoxCount] = useState(0);
    const [pricePerKg, setPricePerKg] = useState(0);
    const [itemDiscount, setItemDiscount] = useState(0);
    const [error, setError] = useState('');

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setPricePerKg(initialPrice ?? product.defaultPricePerKg ?? 0);
            setItemWeightKg(0);
            setItemWeightG(0);
            setBoxWeightKg(0);
            setBoxWeightG(0);
            setBoxCount(0);
            setItemDiscount(0);
            setError('');
        }
    }, [product, initialPrice]);

    // Calculate totals
    const calculated = calculateItemTotals(
        itemWeightKg,
        itemWeightG,
        boxWeightKg,
        boxWeightG,
        boxCount,
        pricePerKg,
        itemDiscount
    );

    const handleSubmit = () => {
        if (!product) return;

        // Validate
        const validation = validateCartAddition(calculated, remainingStock, product.name);
        if (!validation.valid) {
            setError(validation.error || 'Invalid input');
            return;
        }

        onAddToCart({
            product,
            itemWeightKg,
            itemWeightG,
            boxWeightKg,
            boxWeightG,
            boxCount,
            pricePerKg,
            itemDiscountPercent: itemDiscount,
            calculated,
        });

        onOpenChange(false);
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add {product.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Stock Info */}
                    <div className="text-sm text-muted-foreground">
                        Available Stock: <span className="font-medium">{remainingStock.toFixed(3)} kg</span>
                    </div>

                    {/* Item Weight */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Item Weight (kg)</Label>
                            <Input
                                type="number"
                                value={itemWeightKg || ''}
                                onChange={(e) => setItemWeightKg(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>+ Grams</Label>
                            <Input
                                type="number"
                                value={itemWeightG || ''}
                                onChange={(e) => setItemWeightG(parseInt(e.target.value) || 0)}
                                min={0}
                                max={999}
                            />
                        </div>
                    </div>

                    {/* Box Weight */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Box (kg)</Label>
                            <Input
                                type="number"
                                value={boxWeightKg || ''}
                                onChange={(e) => setBoxWeightKg(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>+ Grams</Label>
                            <Input
                                type="number"
                                value={boxWeightG || ''}
                                onChange={(e) => setBoxWeightG(parseInt(e.target.value) || 0)}
                                min={0}
                                max={999}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>× Boxes</Label>
                            <Input
                                type="number"
                                value={boxCount || ''}
                                onChange={(e) => setBoxCount(parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Label>Price per kg (LKR)</Label>
                        <Input
                            type="number"
                            value={pricePerKg || ''}
                            onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                            disabled={!canEditPrices}
                            min={0}
                        />
                        {!canEditPrices && (
                            <p className="text-xs text-muted-foreground">Price editing not permitted</p>
                        )}
                    </div>

                    {/* Discount */}
                    {canApplyDiscount && (
                        <div className="space-y-2">
                            <Label>Item Discount (%)</Label>
                            <Input
                                type="number"
                                value={itemDiscount || ''}
                                onChange={(e) => setItemDiscount(Math.min(parseFloat(e.target.value) || 0, maxDiscountPercent))}
                                min={0}
                                max={maxDiscountPercent}
                            />
                            <p className="text-xs text-muted-foreground">Max: {maxDiscountPercent}%</p>
                        </div>
                    )}

                    {/* Calculation Summary */}
                    <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Item Weight:</span>
                            <span>{calculated.itemWeightTotalKg.toFixed(3)} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Box Weight:</span>
                            <span>-{calculated.totalBoxWeightKg.toFixed(3)} kg</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1 mt-1">
                            <span>Net Weight:</span>
                            <span>{calculated.netWeightKg.toFixed(3)} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Base Total:</span>
                            <span>LKR {calculated.baseTotal.toFixed(2)}</span>
                        </div>
                        {itemDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Discount ({itemDiscount}%):</span>
                                <span>-LKR {calculated.itemDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1">
                            <span>Final Total:</span>
                            <span>LKR {calculated.finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={!calculated.isValid}
                        >
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
