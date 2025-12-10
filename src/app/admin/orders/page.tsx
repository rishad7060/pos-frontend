'use client';

import OrderHistory from '@/components/orders/OrderHistory';

export default function AdminOrdersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            </div>
            <OrderHistory />
        </div>
    );
}
