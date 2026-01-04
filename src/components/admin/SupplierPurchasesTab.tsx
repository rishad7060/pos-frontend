'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, DollarSign, Package, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format } from 'date-fns';

interface Purchase {
  id: number;
  purchaseNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  paidAmount: number;
  paymentStatus: string | null;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseItems: PurchaseItem[];
  purchasePayments: PurchasePayment[];
}

interface PurchaseItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
}

interface PurchasePayment {
  id: number;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
}

interface SupplierPurchasesTabProps {
  supplierId: number;
  refreshTrigger?: any; // Prop to trigger refresh when payments are made
}

export default function SupplierPurchasesTab({ supplierId, refreshTrigger }: SupplierPurchasesTabProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, [supplierId, refreshTrigger]); // Re-fetch when refreshTrigger changes

  const fetchPurchases = async () => {
    try {
      const response = await fetchWithAuth(`/api/purchases?supplierId=${supplierId}&limit=100`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setPurchases(Array.isArray(data) ? data : []);
      } else {
        console.error('Invalid purchases data:', data);
        setPurchases([]);
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      toast.error('Failed to fetch purchase orders');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      partial: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge className={statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string | null, total: number, paidAmount: number) => {
    if (paymentStatus === 'paid' || paidAmount >= total) {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (paidAmount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="ml-4 text-gray-600">Loading purchase orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No purchase orders found for this supplier</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {purchases.map((purchase) => (
        <Card key={purchase.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <CardTitle className="text-lg">{purchase.purchaseNumber}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {format(new Date(purchase.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(purchase.status)}
                {getPaymentStatusBadge(purchase.paymentStatus, purchase.total, purchase.paidAmount)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Financial Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${purchase.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${purchase.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">${purchase.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${purchase.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="font-medium text-green-600">${purchase.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className="font-medium text-red-600">
                    ${(purchase.total - purchase.paidAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Payments:</span>
                  <span className="font-medium">{purchase.purchasePayments?.length || 0}</span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{purchase.purchaseItems?.length || 0}</span>
                </div>
                {purchase.expectedDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Expected:</span>
                    <span className="font-medium">
                      {format(new Date(purchase.expectedDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {purchase.receivedDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Received:</span>
                    <span className="font-medium text-green-600">
                      {format(new Date(purchase.receivedDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            {purchase.purchaseItems && purchase.purchaseItems.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-600 mb-2">Items:</p>
                <div className="space-y-1">
                  {purchase.purchaseItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.productName} (Qty: {item.quantity})
                      </span>
                      <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                  {purchase.purchaseItems.length > 3 && (
                    <p className="text-xs text-gray-500 italic">
                      +{purchase.purchaseItems.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {purchase.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-600 mb-1">Notes:</p>
                <p className="text-sm text-gray-700">{purchase.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {purchases.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No purchase orders found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
