'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Search, Menu } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Input } from '@/components/ui/input';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <AuthGuard requireRole="admin">
            <div className="flex h-screen overflow-hidden bg-gray-50">
                <AdminSidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
                    {/* Top Header */}
                    <header className="h-14 sm:h-16 border-b bg-card px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                            {/* Mobile Menu Button */}
                            {isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                                >
                                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            )}
                            
                            <div className="relative w-full max-w-full sm:max-w-xs lg:max-w-sm flex-1 sm:flex-initial">
                                <Search className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="search"
                                    placeholder="Search..."
                                    className="w-full bg-background pl-7 sm:pl-8 pr-3 h-9 sm:h-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-shrink-0">
                            {/* <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600" />
                            </Button> */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={logout} 
                                className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                            >
                                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
