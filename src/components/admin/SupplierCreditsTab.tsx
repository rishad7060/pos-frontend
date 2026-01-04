'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format } from 'date-fns';
import AddSupplierCreditDialog from './AddSupplierCreditDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface SupplierCredit {
  id: number;
  supplierId: number;
  purchaseId: number | null;
  transactionType: string;
  amount: number;
  balance: number;
  description: string | null;
  userId: number | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  purchase: {
    id: number;
    purchaseNumber: string;
    total: number;
    status: string;
  } | null;
}

interface SupplierCreditsTabProps {
  supplierId: number;
  supplierName: string;
  currentBalance: number;
  onRefresh: () => void;
}

export default function SupplierCreditsTab({
  supplierId,
  supplierName,
  currentBalance,
  onRefresh
}: SupplierCreditsTabProps) {
  const [credits, setCredits] = useState<SupplierCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [creditToDelete, setCreditToDelete] = useState<{ id: number; description: string } | null>(null);

  useEffect(() => {
    fetchCredits();
  }, [supplierId]);

  const fetchCredits = async () => {
    try {
      const response = await fetchWithAuth(`/api/supplier-credits?supplierId=${supplierId}&limit=100`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setCredits(Array.isArray(data) ? data : []);
      } else {
        console.error('Invalid credits data:', data);
        setCredits([]);
      }
    } catch (error) {
      console.error('Failed to fetch supplier credits:', error);
      toast.error('Failed to fetch credit history');
      setCredits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = () => {
    setDialogOpen(true);
  };

  const handleCreditAdded = () => {
    fetchCredits();
    onRefresh();
    setDialogOpen(false);
  };

  const handleDeleteClick = (credit: SupplierCredit) => {
    setCreditToDelete({
      id: credit.id,
      description: credit.description || `${credit.transactionType} - $${Math.abs(credit.amount).toFixed(2)}`
    });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!creditToDelete) return;

    try {
      // FIXED: Use RESTful path parameter instead of query string
      const response = await fetchWithAuth(`/api/supplier-credits/${creditToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Credit transaction deleted successfully');
        fetchCredits();
        onRefresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete credit transaction');
      }
    } catch (error) {
      console.error('Failed to delete credit:', error);
      toast.error('Failed to delete credit transaction');
    } finally {
      setDeleteConfirmOpen(false);
      setCreditToDelete(null);
    }
  };

  const getTransactionIcon = (amount: number) => {
    // Positive amount = we owe more (red, up arrow)
    // Negative amount = payment made (green, down arrow)
    if (amount > 0) {
      return (
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-red-600" />
        </div>
      );
    } else {
      return (
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
          <TrendingDown className="h-5 w-5 text-green-600" />
        </div>
      );
    }
  };

  const getTransactionBadge = (type: string, amount: number, description: string | null) => {
    // Color based on amount impact
    if (amount > 0) {
      // Adding to outstanding (we owe more)
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Outstanding Added
        </Badge>
      );
    } else {
      // Check if it's a return transaction
      const isReturn = description?.toLowerCase().includes('return') || false;

      if (isReturn) {
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Return Processed
          </Badge>
        );
      }

      // Regular payment
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Payment Made
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="ml-4 text-gray-600">Loading credit history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className={currentBalance > 0 ? 'border-red-200' : currentBalance < 0 ? 'border-green-200' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Outstanding Balance Summary
            </CardTitle>
            <Button onClick={handleAddCredit} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Credit/Debit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm font-medium text-gray-600 mb-3">Current Outstanding Balance</p>
            <p className={`text-5xl font-bold mb-3 ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
              ${currentBalance.toFixed(2)}
            </p>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              currentBalance > 0
                ? 'bg-red-100 text-red-800'
                : currentBalance < 0
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {currentBalance > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  We owe supplier ${currentBalance.toFixed(2)}
                </>
              ) : currentBalance < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Supplier owes us ${Math.abs(currentBalance).toFixed(2)}
                </>
              ) : (
                <>All settled - No outstanding balance</>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 How it works:</strong><br/>
              <span className="text-red-700 font-medium">• Add Outstanding (+)</span> = Increases what we owe<br/>
              <span className="text-green-700 font-medium">• Record Payment (-)</span> = Decreases what we owe
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credits History */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {credits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No credit transactions found</p>
              <p className="text-sm mt-2">Click "Add Manual Credit/Debit" to create a transaction</p>
            </div>
          ) : (
            <div className="space-y-3">
              {credits.map((credit) => (
                <div
                  key={credit.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div>
                        {getTransactionIcon(credit.amount)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTransactionBadge(credit.transactionType, credit.amount, credit.description)}
                          <span className={`text-xl font-bold ${credit.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {credit.amount > 0 ? '+' : ''}${Math.abs(credit.amount).toFixed(2)}
                          </span>
                        </div>

                        <div className={`text-sm font-medium mb-2 ${
                          credit.amount > 0 ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {credit.amount > 0 ? (
                            <>📈 Outstanding Added - We owe MORE</>
                          ) : (
                            <>💰 Payment Recorded - We owe LESS</>
                          )}
                        </div>

                        {credit.description && (
                          <p className="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                            {credit.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(credit.createdAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                          {credit.user && (
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {credit.user.fullName}
                            </div>
                          )}
                          {credit.purchase && (
                            <div className="flex items-center">
                              PO: {credit.purchase.purchaseNumber}
                            </div>
                          )}
                        </div>

                        {/* Running Balance */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">Balance After Transaction:</span>
                            <span className={`text-base font-bold px-3 py-1 rounded ${
                              credit.balance > 0
                                ? 'bg-red-100 text-red-700'
                                : credit.balance < 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              ${credit.balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete button for admin_credit transactions */}
                    {credit.transactionType === 'admin_credit' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(credit)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Credit Dialog */}
      <AddSupplierCreditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplierId={supplierId}
        supplierName={supplierName}
        currentBalance={currentBalance}
        onSuccess={handleCreditAdded}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Credit Transaction"
        description={`Are you sure you want to delete this credit transaction? This will recalculate all subsequent balances. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
