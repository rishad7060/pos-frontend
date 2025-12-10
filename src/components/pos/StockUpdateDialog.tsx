'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Product } from '@/types/pos';

interface StockUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    onSuccess: () => void;
}

type AdjustmentType = 'add' | 'subtract' | 'set';

/**
 * Dialog for updating product stock
 * Extracted from MultiTabPOS for reusability
 */
export function StockUpdateDialog({
    open,
    onOpenChange,
    product,
    onSuccess,
}: StockUpdateDialogProps) {
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!product || !amount) return;

        setLoading(true);
        try {
            const adjustmentValue = parseFloat(amount);
            if (isNaN(adjustmentValue) || adjustmentValue < 0) {
                toast.error('Please enter a valid positive number');
                return;
            }

            let newStock = product.stockQuantity;

            if (adjustmentType === 'add') {
                newStock += adjustmentValue;
            } else if (adjustmentType === 'subtract') {
                newStock -= adjustmentValue;
                if (newStock < 0) {
                    toast.error('Stock cannot be negative');
                    return;
                }
            } else {
                newStock = adjustmentValue;
            }

            // Round to 3 decimal places
            newStock = Number(newStock.toFixed(3));

            const response = await api.patch(`/products/${product.id}`, {
                stockQuantity: newStock,
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            // Record stock movement
            await api.post('/stock-movements', {
                productId: product.id,
                movementType: adjustmentType === 'add' ? 'adjustment_in' :
                    adjustmentType === 'subtract' ? 'adjustment_out' : 'adjustment',
                quantityChange: adjustmentType === 'set'
                    ? newStock - product.stockQuantity
                    : (adjustmentType === 'add' ? adjustmentValue : -adjustmentValue),
                quantityAfter: newStock,
                notes: notes || `Stock ${adjustmentType}: ${adjustmentValue}`,
            });

            toast.success(`Stock updated to ${newStock} kg`);
            onSuccess();
            onOpenChange(false);

            // Reset form
            setAmount('');
            setNotes('');
            setAdjustmentType('add');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update stock');
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Stock: {product.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Current Stock</p>
                        <p className="text-2xl font-bold">{product.stockQuantity.toFixed(3)} kg</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Adjustment Type</Label>
                        <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="add">Add to stock</SelectItem>
                                <SelectItem value="subtract">Remove from stock</SelectItem>
                                <SelectItem value="set">Set exact value</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {adjustmentType === 'set' ? 'New Stock Value (kg)' : 'Amount (kg)'}
                        </Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount..."
                            min={0}
                            step={0.001}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reason for adjustment..."
                            rows={2}
                        />
                    </div>

                    {amount && !isNaN(parseFloat(amount)) && (
                        <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm text-muted-foreground">New Stock Will Be</p>
                            <p className="text-2xl font-bold">
                                {adjustmentType === 'add'
                                    ? (product.stockQuantity + parseFloat(amount)).toFixed(3)
                                    : adjustmentType === 'subtract'
                                        ? Math.max(0, product.stockQuantity - parseFloat(amount)).toFixed(3)
                                        : parseFloat(amount).toFixed(3)
                                } kg
                            </p>
                        </div>
                    )}

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
                            disabled={loading || !amount}
                        >
                            {loading ? 'Updating...' : 'Update Stock'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
