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
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminSidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [managerPermissions, setManagerPermissions] = useState<any>(null);
    const [collapsed, setCollapsed] = useState(false);

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
                { icon: DoorOpen, label: 'Registry', route: '/admin/registry-sessions' },
                { icon: ArrowLeftRight, label: 'Transactions', route: '/admin/cash-transactions' },
                { icon: DollarSign, label: 'Expenses', route: '/admin/expenses' },
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
                case '/admin/expenses': return p.canViewExpenses;
                case '/admin/settings': return p.canViewSettings;
                case '/admin/audit-logs': return p.canViewAuditLogs;
                default: return true; // Default allow for other basic modules
            }
        })
    })).filter(module => module.items.length > 0);

    return (
        <div className={cn(
            "h-screen bg-card border-r transition-all duration-300 ease-in-out flex flex-col z-20 sticky top-0",
            collapsed ? "w-16" : "w-64"
        )}>
            <div className="p-4 flex items-center justify-between border-b h-16">
                {!collapsed && (
                    <div className="font-bold text-xl text-blue-600 truncate">
                        POS Admin
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn("ml-auto", collapsed && "mx-auto")}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1 py-4">
                <div className="space-y-6 px-2">
                    {filteredModules.map((module, i) => (
                        <div key={i}>
                            {!collapsed && (
                                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {module.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {module.items.map((item) => {
                                    const isActive = pathname === item.route || (item.route !== '/admin' && pathname?.startsWith(item.route + '/'));
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.route}
                                            href={item.route}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                                isActive ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" : "text-foreground border-transparent hover:border-blue-500",
                                                collapsed && "justify-center px-2"
                                            )}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {!collapsed && <span>{item.label}</span>}
                                            {!collapsed && isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {!collapsed && user && (
                <div className="p-4 border-t bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {user.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate">{user.fullName}</div>
                            <div className="text-xs text-muted-foreground truncate capitalize">{user.role}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
