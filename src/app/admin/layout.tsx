'use client';

import AuthGuard from '@/components/AuthGuard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Search } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Input } from '@/components/ui/input';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard requireRole="admin">
            <div className="flex h-screen overflow-hidden bg-gray-50">
                <AdminSidebar />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Top Header */}
                    <header className="h-16 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-4 w-1/3">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search..."
                                    className="w-full bg-background pl-8 md:w-[300px] lg:w-[300px]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600" />
                            </Button> */}
                            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                                <LogOut className="h-4 w-4" />
                                <span className="hidden md:inline">Logout</span>
                            </Button>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
