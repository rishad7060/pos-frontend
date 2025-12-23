'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, Calendar, X } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ChequeRemindersWidget() {
  const [cheques, setCheques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed today
    const dismissedDate = localStorage.getItem('chequeRemindersDismissed');
    const today = new Date().toDateString();

    if (dismissedDate === today) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await fetchWithAuth('/api/cheques/reminders');
      const data = await response.json();
      setCheques(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch cheque reminders:', error);
      setCheques([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('chequeRemindersDismissed', new Date().toDateString());
    setDismissed(true);
  };

  if (loading || dismissed || cheques.length === 0) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
              Cheques Pending Deposit ({cheques.length})
            </h3>
          </div>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="space-y-2 mb-3">
              {cheques.slice(0, 3).map((cheque) => (
                <div key={cheque.id} className="flex items-center justify-between text-sm bg-white/50 dark:bg-black/20 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono font-bold">{cheque.chequeNumber}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>${cheque.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                      {cheque.depositReminderDate
                        ? format(new Date(cheque.depositReminderDate), 'MMM dd')
                        : format(new Date(cheque.chequeDate), 'MMM dd')}
                    </span>
                  </div>
                </div>
              ))}
              {cheques.length > 3 && (
                <p className="text-xs">+ {cheques.length - 3} more cheques</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/admin/finance/cheques">
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  View All Cheques
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Dismiss Today
              </Button>
            </div>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 text-orange-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
