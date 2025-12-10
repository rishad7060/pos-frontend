'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser, User } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'manager' | 'cashier';
}

export default function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getAuthUser();
    
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (requireRole && currentUser.role !== requireRole) {
      // Check if role is allowed (managers can access admin areas, cashiers cannot)
      const allowedRoles = requireRole === 'admin' ? ['admin', 'manager'] : [requireRole];

      if (!allowedRoles.includes(currentUser.role)) {
        // Redirect based on role
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
          router.push('/admin');
        } else {
          router.push('/pos');
        }
        return;
      }
    }

    setUser(currentUser);
    setLoading(false);
  }, [router, requireRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
