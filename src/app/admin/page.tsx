'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import OverdueCustomersAlert from '@/components/admin/OverdueCustomersAlert';
import ChequeRemindersWidget from '@/components/admin/ChequeRemindersWidget';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    averageOrderValue: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        api.getOrders({ limit: 1000 }), // Fetch enough for history
        api.getProducts({ limit: 100 }),
        api.get('/api/customers?limit=1') // Just need count ideally, but getting list for now
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const customersCount = customersRes.data?.length || 0; // Approximate if strictly paginated

      // Calculate aggregates
      const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Prepare Sales Chart Data (Last 7 Days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return d;
      });

      const chartData = last7Days.map(date => {
        const dayOrders = orders.filter((o: any) => isSameDay(new Date(o.createdAt), date));
        const revenue = dayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        return {
          name: format(date, 'EEE'), // Mon, Tue...
          revenue: revenue,
          orders: dayOrders.length
        };
      });

      setSalesData(chartData);
      setRecentOrders(orders.slice(0, 5));
      setTopProducts(products.slice(0, 5)); // Placeholder for "Top" logic, ideally backend sort

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: customersCount, // Need real count
        totalProducts: products.length,
        averageOrderValue
      });

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overdue Customers Alert - Shows on login */}
      <OverdueCustomersAlert />

      {/* Cheque Deposit Reminders */}
      <ChequeRemindersWidget />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm">Download Report</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+20.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+15%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.averageOrderValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <ArrowDownRight className="h-4 w-4 text-rose-500 mr-1" />
              <span className="text-rose-500 font-medium">-4%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12 new this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Revenue Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily revenue for the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pl-1 sm:pl-2">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `LKR${value}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`LKR ${value.toFixed(2)}`, 'Revenue']}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Recent Orders</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Latest transactions from your store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                    <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium leading-none truncate">{order.orderNumber}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {order.itemCount} items • {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0 ml-auto sm:ml-0">
                    <p className="text-xs sm:text-sm font-bold">LKR {Number(order.total).toFixed(2)}</p>
                    <Badge variant={order.status === 'completed' ? 'outline' : 'secondary'} className="text-[10px] px-1 py-0 h-4 sm:h-5">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full" asChild>
                <Link href="/orders">View All Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Daily Orders</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Number of orders per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Top Products</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Best-selling items in your inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {topProducts.map((product, i) => (
                <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
                  <div className="w-6 sm:w-8 font-bold text-muted-foreground text-xs sm:text-sm">0{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{product.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{product.sku || 'No SKU'}</div>
                  </div>
                  <div className="text-xs sm:text-sm font-medium flex-shrink-0">
                    {product.stockQuantity ?? 0} in stock
                  </div>
                  <div className="ml-0 sm:ml-4 font-bold text-xs sm:text-sm flex-shrink-0">
                    LKR {(product.defaultPricePerKg ?? 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}