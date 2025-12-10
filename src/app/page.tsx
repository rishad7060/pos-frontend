'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getAuthUser();
    
    if (!user) {
      // Redirect to login for unauthenticated users
      router.replace('/login');
      return;
    }

    // Redirect authenticated users based on role
    if (user.role === 'admin') {
      router.replace('/admin');
    } else if (user.role === 'cashier') {
      router.replace('/pos');
    } else {
      // Clear invalid auth and redirect to login
      localStorage.removeItem('pos_user');
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}