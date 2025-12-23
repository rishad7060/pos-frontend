'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Phone, Mail, Calendar, DollarSign, X } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format } from 'date-fns';

interface OverdueCustomer {
  customerId: number;
  customer: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
  balance: number;
  oldestCreditDate: string;
  daysOverdue: number;
}

interface OverdueData {
  overdueCustomers: OverdueCustomer[];
  creditDueDays: number;
  enabled: boolean;
  totalOverdueAmount: number;
  count: number;
}

interface OverdueCustomersAlertProps {
  onClose?: () => void;
}

export default function OverdueCustomersAlert({ onClose }: OverdueCustomersAlertProps) {
  const [open, setOpen] = useState(false);
  const [overdueData, setOverdueData] = useState<OverdueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkOverdueCustomers();
  }, []);

  const checkOverdueCustomers = async () => {
    try {
      // Check if alert was dismissed today
      const dismissedToday = localStorage.getItem('overdueAlertDismissed');
      const today = new Date().toDateString();

      if (dismissedToday === today) {
        setLoading(false);
        return;
      }

      const response = await fetchWithAuth('/api/customer-credits/overdue');
      const data = await response.json();

      if (data.enabled && data.count > 0) {
        setOverdueData(data);
        setOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch overdue customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Store dismissal in localStorage with today's date
    const today = new Date().toDateString();
    localStorage.setItem('overdueAlertDismissed', today);

    setDismissed(true);
    setOpen(false);
    if (onClose) onClose();
  };

  const handleViewCustomer = (customerId: number) => {
    // Navigate to customer detail page
    window.location.href = `/admin/customers`;
    handleDismiss();
  };

  if (loading || !overdueData || dismissed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleDismiss();
      }
    }}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-red-600">
                  Overdue Customer Credits Alert!
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {overdueData.count} customer{overdueData.count > 1 ? 's have' : ' has'} unpaid credits exceeding {overdueData.creditDueDays} days
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-red-800">
                Total Outstanding Amount:
              </span>
              <span className="text-2xl font-bold text-red-600">
                ${overdueData.totalOverdueAmount.toFixed(2)}
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {/* Overdue Customers List */}
        <div className="space-y-3 mt-4">
          <h3 className="font-semibold text-lg">Overdue Customers:</h3>

          {overdueData.overdueCustomers.map((customer) => (
            <div
              key={customer.customerId}
              className="border-2 border-red-200 rounded-lg p-4 bg-red-50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-red-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">
                        {customer.customer.name}
                      </h4>
                      <Badge className="bg-red-600 text-white">
                        {customer.daysOverdue} days overdue
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {customer.customer.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{customer.customer.phone}</span>
                      </div>
                    )}
                    {customer.customer.email && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{customer.customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        Since: {format(new Date(customer.oldestCreditDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="font-bold text-red-600 text-lg">
                        ${customer.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleViewCustomer(customer.customerId)}
                  variant="outline"
                  size="sm"
                  className="ml-4"
                >
                  View Customer
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            💡 This alert will reappear tomorrow until resolved
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                window.location.href = '/admin/settings';
                handleDismiss();
              }}
              variant="outline"
            >
              Configure Alert Settings
            </Button>
            <Button
              onClick={handleDismiss}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss for Today
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
