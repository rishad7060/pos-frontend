'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthUser, logout } from '@/lib/auth';
import { ArrowLeft, Settings, Users, Printer, LogOut, User, Shield, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  const settingsCards = [
    {
      title: 'Cashier Permissions',
      description: 'Manage cashier access levels, discount limits, and approval requirements',
      icon: Shield,
      href: '/admin/settings/permissions',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Printer Settings',
      description: 'Configure receipt printers, templates, and auto-print options',
      icon: Printer,
      href: '/admin/settings/printer',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="rounded-full bg-primary p-2">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-sm text-muted-foreground">Configure your POS system</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((setting) => {
          const Icon = setting.icon;
          return (
            <Card
              key={setting.href}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(setting.href)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${setting.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${setting.color}`} />
                </div>
                <CardTitle>{setting.title}</CardTitle>
                <CardDescription>{setting.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Configure
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
