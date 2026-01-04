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
  Activity,
  TrendingUp,
  TrendingDown,
  Percent
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
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { format, subDays, startOfDay, isSameDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
  const [profitLossData, setProfitLossData] = useState<any[]>([]);
  const [dailyProfitLoss, setDailyProfitLoss] = useState<any[]>([]);
  const [currentMonthFinancials, setCurrentMonthFinancials] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    fetchProfitLossData();
    fetchDailyProfitLoss();
  }, []);

  const fetchDailyProfitLoss = async () => {
    try {
      // Fetch financial data for last 30 days
      const dailyData = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const response = await api.get(`/api/expenses/financial-summary?startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`);

        if (response.data) {
          const { financialMetrics } = response.data;
          dailyData.push({
            date: format(date, 'MMM dd'),
            fullDate: format(date, 'yyyy-MM-dd'),
            revenue: financialMetrics.totalRevenue || 0,
            expenses: financialMetrics.totalExpenses || 0,
            profit: financialMetrics.netProfit || 0,
            profitMargin: financialMetrics.profitMargin || 0,
          });
        }
      }

      setDailyProfitLoss(dailyData);
    } catch (error) {
      console.error('Failed to fetch daily profit/loss data:', error);
    }
  };

  const fetchProfitLossData = async () => {
    try {
      // Fetch financial data for last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const response = await api.get(`/api/expenses/financial-summary?startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`);

        if (response.data) {
          const { financialMetrics } = response.data;
          months.push({
            month: format(date, 'MMM'),
            revenue: financialMetrics.totalRevenue || 0,
            expenses: financialMetrics.totalExpenses || 0,
            profit: financialMetrics.netProfit || 0,
            profitMargin: financialMetrics.profitMargin || 0,
          });

          // Store current month (latest) financials
          if (i === 0) {
            setCurrentMonthFinancials({
              totalRevenue: financialMetrics.totalRevenue || 0,
              totalExpenses: financialMetrics.totalExpenses || 0,
              netProfit: financialMetrics.netProfit || 0,
              profitMargin: financialMetrics.profitMargin || 0,
            });
          }
        }
      }

      setProfitLossData(months);
    } catch (error) {
      console.error('Failed to fetch profit/loss data:', error);
    }
  };

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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
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

        <Card className={currentMonthFinancials.netProfit >= 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit (This Month)</CardTitle>
            {currentMonthFinancials.netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentMonthFinancials.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              LKR {currentMonthFinancials.netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <Percent className="h-3 w-3 mr-1" />
              <span className={currentMonthFinancials.profitMargin >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {currentMonthFinancials.profitMargin.toFixed(1)}%
              </span> profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue & P/L Chart - Full Width */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Daily Revenue & Profit/Loss</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Day-by-day financial performance over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="pl-1 sm:pl-2">
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyProfitLoss} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDailyRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(label) => {
                    const item = dailyProfitLoss.find(d => d.date === label);
                    return item ? item.fullDate : label;
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'revenue' ? 'Revenue' :
                                  name === 'expenses' ? 'Expenses' :
                                  name === 'profit' ? 'Net Profit' : name;
                    return [`LKR ${value.toFixed(2)}`, label];
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                  iconType="rect"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  fill="url(#colorDailyRevenue)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Bar
                  dataKey="expenses"
                  fill="#f59e0b"
                  radius={[2, 2, 0, 0]}
                  barSize={20}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Net Profit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Avg Daily Revenue</p>
              <p className="text-base sm:text-lg font-bold text-blue-600">
                LKR {dailyProfitLoss.length > 0 ? (dailyProfitLoss.reduce((sum, d) => sum + d.revenue, 0) / dailyProfitLoss.length).toFixed(0) : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Daily Expenses</p>
              <p className="text-base sm:text-lg font-bold text-amber-600">
                LKR {dailyProfitLoss.length > 0 ? (dailyProfitLoss.reduce((sum, d) => sum + d.expenses, 0) / dailyProfitLoss.length).toFixed(0) : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Daily Profit</p>
              <p className={`text-base sm:text-lg font-bold ${dailyProfitLoss.length > 0 && dailyProfitLoss.reduce((sum, d) => sum + d.profit, 0) / dailyProfitLoss.length >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                LKR {dailyProfitLoss.length > 0 ? (dailyProfitLoss.reduce((sum, d) => sum + d.profit, 0) / dailyProfitLoss.length).toFixed(0) : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profitable Days</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600">
                {dailyProfitLoss.filter(d => d.profit > 0).length} / {dailyProfitLoss.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Profit & Loss Analysis */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Profit & Loss Analysis</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Revenue, expenses, and net profit over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="pl-1 sm:pl-2">
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={profitLossData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'revenue' ? 'Revenue' :
                                  name === 'expenses' ? 'Expenses' :
                                  name === 'profit' ? 'Net Profit' : name;
                    return [`LKR ${value.toFixed(2)}`, label];
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Revenue"
                />
                <Bar
                  dataKey="expenses"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Net Profit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats Below Chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold text-blue-600">
                LKR {profitLossData.reduce((sum, d) => sum + d.revenue, 0).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-amber-600">
                LKR {profitLossData.reduce((sum, d) => sum + d.expenses, 0).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit (6mo)</p>
              <p className={`text-lg font-bold ${profitLossData.reduce((sum, d) => sum + d.profit, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                LKR {profitLossData.reduce((sum, d) => sum + d.profit, 0).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Profit Margin</p>
              <p className={`text-lg font-bold ${profitLossData.reduce((sum, d) => sum + d.profitMargin, 0) / profitLossData.length >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {profitLossData.length > 0 ? (profitLossData.reduce((sum, d) => sum + d.profitMargin, 0) / profitLossData.length).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}