'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

/**
 * Cashiers page - now redirects to unified user management
 * This page is kept for backwards compatibility
 */
export default function CashiersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to User Management...</p>
        </div>
      </div>
    </AuthGuard>
  );
}