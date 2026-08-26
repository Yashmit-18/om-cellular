'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Wrench,
  ArrowLeftRight,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

interface AnalyticsData {
  kpis: {
    totalSales: number;
    todaySales: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    repairBookings: number;
    pendingRepairs: number;
    sellRequests: number;
    exchangeRequests: number;
    totalCustomers: number;
    totalProducts: number;
    lowStockProducts: number;
  };
  salesChart: { date: string; sales: number }[];
  ordersChart: { date: string; orders: number; completed: number; pending: number }[];
}

const dateFilters = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'This Month', value: 'thisMonth' },
] as const;

export default function AdminDashboard() {
  const toast = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('30days');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?period=${dateFilter}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter]);

  const kpiCards = data
    ? [
        { label: 'Total Sales', value: `$${data.kpis.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: "Today's Sales", value: `$${data.kpis.todaySales.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Orders', value: data.kpis.totalOrders, icon: ShoppingCart, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Pending Orders', value: data.kpis.pendingOrders, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Completed Orders', value: data.kpis.completedOrders, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Repair Bookings', value: data.kpis.repairBookings, icon: Wrench, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { label: 'Pending Repairs', value: data.kpis.pendingRepairs, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Sell Requests', value: data.kpis.sellRequests, icon: Package, color: 'text-pink-600', bg: 'bg-pink-50' },
        { label: 'Exchange Requests', value: data.kpis.exchangeRequests, icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Customers', value: data.kpis.totalCustomers, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
        { label: 'Products', value: data.kpis.totalProducts, icon: Package, color: 'text-sky-600', bg: 'bg-sky-50' },
        { label: 'Low Stock', value: data.kpis.lowStockProducts, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your store performance</p>
        </div>
        <div className="flex items-center gap-2">
          {dateFilters.map((f) => (
            <Button
              key={f.value}
              variant={dateFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(f.value)}
              className={dateFilter === f.value ? 'bg-[#2563eb] hover:bg-[#1d4ed8]' : ''}
            >
              {f.label}
            </Button>
          ))}
          <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <LoadingSkeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                    </div>
                    <div className={`${kpi.bg} p-3 rounded-full`}>
                      <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.salesChart && data.salesChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.salesChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">No sales data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.ordersChart && data.ordersChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.ordersChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">No orders data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
