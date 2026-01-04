'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { api } from '@/lib/api';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    TrendingUp,
    UserCircle,
    Building2,
    Truck,
    Receipt,
    DoorOpen,
    ArrowLeftRight,
    DollarSign,
    Clock,
    RotateCcw,
    Shield,
    Settings,
    ChevronRight,
    Menu,
    X,
    FileText,
    Layers,
    CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminSidebarProps {
    mobileMenuOpen?: boolean;
    setMobileMenuOpen?: (open: boolean) => void;
}

export default function AdminSidebar({ mobileMenuOpen, setMobileMenuOpen }: AdminSidebarProps = {} as AdminSidebarProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [managerPermissions, setManagerPermissions] = useState<any>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
    
    const isMobileMenuOpen = mobileMenuOpen !== undefined ? mobileMenuOpen : internalMobileMenuOpen;
    const setIsMobileMenuOpen = setMobileMenuOpen || setInternalMobileMenuOpen;

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const currentUser = getAuthUser();
        setUser(currentUser);
        if (currentUser?.role === 'manager') {
            fetchManagerPermissions(currentUser.id);
        }
    }, []);

    const fetchManagerPermissions = async (userId: number) => {
        try {
            const result = await api.get(`/api/manager-permissions?managerId=${userId}`);
            if (result.data) {
                setManagerPermissions(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch manager permissions:', error);
        }
    };

    const allModules = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', route: '/admin' },
                { icon: ShoppingCart, label: 'Orders', route: '/admin/orders' },
                { icon: TrendingUp, label: 'Reports', route: '/admin/reports' },
            ]
        },
        {
            title: 'Inventory',
            items: [
                { icon: Package, label: 'Products', route: '/admin/products' },
                { icon: Layers, label: 'Batches', route: '/admin/batches' },
                { icon: Truck, label: 'Suppliers', route: '/admin/suppliers' },
                { icon: Receipt, label: 'Purchase Orders', route: '/admin/purchases' },
            ]
        },
        {
            title: 'Operations',
            items: [
                { icon: UserCircle, label: 'Customers', route: '/admin/customers' },
                { icon: Users, label: 'Users', route: '/admin/users', adminOnly: true },
                { icon: Building2, label: 'Branches', route: '/admin/branches' },
            ]
        },
        {
            title: 'Finance',
            items: [
                { icon: DollarSign, label: 'Accounts', route: '/admin/finance' },
                { icon: CreditCard, label: 'Credits', route: '/admin/credits' },
                { icon: FileText, label: 'Cheques', route: '/admin/cheques' },
                { icon: DoorOpen, label: 'Registry', route: '/admin/registry-sessions' },
                { icon: ArrowLeftRight, label: 'Transactions', route: '/admin/cash-transactions' },
                { icon: Clock, label: 'Shifts', route: '/admin/shifts' },
                { icon: RotateCcw, label: 'Refunds', route: '/admin/refunds' },
            ]
        },
        {
            title: 'System',
            items: [
                { icon: Shield, label: 'Audit Logs', route: '/admin/audit-logs' },
                { icon: Settings, label: 'Settings', route: '/admin/settings' },
            ]
        }
    ];

    const filteredModules = allModules.map(module => ({
        ...module,
        items: module.items.filter(item => {
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'cashier') return false;

            // Manager checks
            if (item.adminOnly) return false;

            // Default allow for managers if permissions loading, restricted later if needed
            if (!managerPermissions) return true;

            // Map routes to permission fields
            const p = managerPermissions;
            switch (item.route) {
                case '/admin': return p.canViewDashboard;
                case '/admin/reports': return p.canViewReports;
                case '/admin/products': return p.canViewProducts;
                case '/admin/suppliers': return p.canViewSuppliers;
                case '/admin/purchases': return p.canViewPurchases;
                case '/admin/customers': return p.canViewCustomers;
                case '/admin/users': return p.canViewUsers;
                case '/admin/finance': return p.canViewExpenses;
                case '/admin/expenses': return p.canViewExpenses;
                case '/admin/credits': return p.canViewExpenses; // Credit management requires expense viewing
                case '/admin/cheques': return p.canViewExpenses; // Cheque management requires expense viewing
                case '/admin/settings': return p.canViewSettings;
                case '/admin/audit-logs': return p.canViewAuditLogs;
                default: return true; // Default allow for other basic modules
            }
        })
    })).filter(module => module.items.length > 0);

    const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
        <>
            <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="space-y-3 sm:space-y-4 px-2 py-3">
                        {filteredModules.map((module, i) => (
                            <div key={i}>
                                {(!collapsed || isMobile) && (
                                    <h3 className="mb-1.5 px-3 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {module.title}
                                    </h3>
                                )}
                                <div className="space-y-0.5">
                                    {module.items.map((item) => {
                                        const isActive = pathname === item.route || (item.route !== '/admin' && pathname?.startsWith(item.route + '/'));
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.route}
                                                href={item.route}
                                                onClick={onLinkClick}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs sm:text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                                    isActive ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "text-foreground border-transparent hover:border-blue-500",
                                                    (collapsed && !isMobile) && "justify-center px-2"
                                                )}
                                                title={(collapsed && !isMobile) ? item.label : undefined}
                                            >
                                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                                                {(!collapsed || isMobile) && isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50 flex-shrink-0" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {(!collapsed || isMobile) && user && (
                <div className="p-2.5 sm:p-3 border-t bg-muted/20 flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 text-xs sm:text-sm">
                            {user.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0">
                            <div className="text-xs sm:text-sm font-medium truncate">{user.fullName}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate capitalize">{user.role}</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // Mobile sidebar (Sheet/Drawer)
    if (isMobile) {
        return (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-64 p-0 sm:w-80 flex flex-col">
                    <div className="h-full flex flex-col min-h-0">
                        <div className="p-3 flex items-center justify-between border-b h-14 flex-shrink-0">
                            <div className="font-bold text-lg text-blue-600 truncate">
                                POS Admin
                            </div>
                            {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex-shrink-0 h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button> */}
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <SidebarContent onLinkClick={() => setIsMobileMenuOpen(false)} />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    // Desktop sidebar
    return (
        <div className={cn(
            "hidden lg:flex h-screen bg-card border-r transition-all duration-300 ease-in-out flex-col z-20 sticky top-0",
            collapsed ? "w-16" : "w-64"
        )}>
            <div className="p-3 flex items-center justify-between border-b h-14 flex-shrink-0">
                {!collapsed && (
                    <div className="font-bold text-lg text-blue-600 truncate">
                        POS Admin
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn("ml-auto h-8 w-8", collapsed && "mx-auto")}
                >
                    <Menu className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <SidebarContent />
            </div>
        </div>
    );
}
