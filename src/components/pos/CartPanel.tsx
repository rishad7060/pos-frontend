'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Minus, Plus, ShoppingCart, Percent, Edit2 } from 'lucide-react';
import type { CartItem, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/calculations';

interface CartPanelProps {
    cart: CartItem[];
    orderDiscount: number;
    customer: Customer | null;
    onUpdateQuantity: (id: string, quantity: number) => void;
    onRemoveItem: (id: string) => void;
    onEditItem: (item: CartItem) => void;
    onDiscountChange: (discount: number) => void;
    onCheckout: () => void;
    onClearCart: () => void;
    canApplyDiscount: boolean;
    maxDiscountPercent: number;
    loading?: boolean;
}

/**
 * Shopping cart panel with item list and totals
 * Extracted from MultiTabPOS for reusability
 */
export function CartPanel({
    cart,
    orderDiscount,
    customer,
    onUpdateQuantity,
    onRemoveItem,
    onEditItem,
    onDiscountChange,
    onCheckout,
    onClearCart,
    canApplyDiscount,
    maxDiscountPercent,
    loading = false,
}: CartPanelProps) {
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.finalTotal, 0);
    const discountAmount = subtotal * (orderDiscount / 100);
    const total = subtotal - discountAmount;

    const handleDiscountChange = (value: string) => {
        const discount = parseFloat(value) || 0;
        if (discount > maxDiscountPercent) {
            return; // Don't apply if exceeds max
        }
        onDiscountChange(Math.min(Math.max(0, discount), 100));
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Cart ({cart.length})
                    </CardTitle>
                    {cart.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClearCart}>
                            Clear
                        </Button>
                    )}
                </div>
                {customer && (
                    <p className="text-sm text-muted-foreground">
                        Customer: {customer.name}
                    </p>
                )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-3 pt-0">
                {/* Cart Items */}
                <ScrollArea className="flex-1 pr-2">
                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Cart is empty</p>
                            <p className="text-xs">Select products to add</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(item => (
                                <div
                                    key={item.id}
                                    className="bg-muted/50 rounded-lg p-3 space-y-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">
                                                {item.itemName}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {item.netWeightKg.toFixed(3)} kg × LKR {item.pricePerKg}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                onClick={() => onEditItem(item)}
                                                title="Edit Item"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => onRemoveItem(item.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => onUpdateQuantity(item.id, item.itemWeightKg - 0.5)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-16 text-center text-sm font-medium">
                                                {item.netWeightKg.toFixed(2)} kg
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => onUpdateQuantity(item.id, item.itemWeightKg + 0.5)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">
                                                LKR {item.finalTotal.toFixed(2)}
                                            </p>
                                            {item.itemDiscountPercent > 0 && (
                                                <p className="text-xs text-green-600">
                                                    -{item.itemDiscountPercent}% off
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Totals Section */}
                {cart.length > 0 && (
                    <div className="border-t mt-3 pt-3 space-y-2">
                        {/* Discount Input */}
                        {canApplyDiscount && (
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="Discount %"
                                    value={orderDiscount || ''}
                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                    className="h-8 w-20"
                                    min={0}
                                    max={maxDiscountPercent}
                                />
                                <span className="text-xs text-muted-foreground">
                                    Max: {maxDiscountPercent}%
                                </span>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>LKR {subtotal.toFixed(2)}</span>
                            </div>
                            {orderDiscount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount ({orderDiscount}%)</span>
                                    <span>-LKR {discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-1 border-t">
                                <span>Total</span>
                                <span>LKR {total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <Button
                            className="w-full mt-2"
                            size="lg"
                            onClick={onCheckout}
                            disabled={loading || cart.length === 0}
                        >
                            {loading ? 'Processing...' : `Pay LKR ${total.toFixed(2)}`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
