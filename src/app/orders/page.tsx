'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, User } from 'lucide-react';
import { getAuthUser, logout } from '@/lib/auth';
import OrderHistory from '@/components/orders/OrderHistory';

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Order History</h1>
                  <p className="text-sm text-muted-foreground">View past orders</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user && (
                  <div className="text-right mr-4">
                    <div className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.fullName}
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <OrderHistory />
        </main>
      </div>
    </AuthGuard>
  );
}