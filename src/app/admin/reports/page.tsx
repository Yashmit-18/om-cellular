'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, TrendingUp, Package, Wrench } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Table from '@/components/ui/table';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

interface ReportData {
  salesChart: { date: string; sales: number; orders: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
  topBrands: { name: string; products: number; revenue: number }[];
  repairRevenue: { month: string; revenue: number }[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrder: number;
    totalRepairs: number;
    repairRevenue: number;
  };
}

export default function ReportsPage() {
  const toast = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/analytics/sales?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const productColumns = [
    {
      key: 'name',
      header: 'Product',
      render: (item: { name: string }) => <span className="font-medium text-gray-900">{item.name}</span>,
    },
    {
      key: 'sold',
      header: 'Units Sold',
      render: (item: { sold: number }) => <span className="text-gray-700">{item.sold}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (item: { revenue: number }) => <span className="font-medium text-emerald-600">₹{item.revenue.toLocaleString()}</span>,
    },
  ];

  const brandColumns = [
    {
      key: 'name',
      header: 'Brand',
      render: (item: { name: string }) => <span className="font-medium text-gray-900">{item.name}</span>,
    },
    {
      key: 'products',
      header: 'Products',
      render: (item: { products: number }) => <span className="text-gray-700">{item.products}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (item: { revenue: number }) => <span className="font-medium text-emerald-600">₹{item.revenue.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Sales analytics and performance reports</p>
        </div>
        <Button variant="outline" onClick={() => toast.info('Export feature coming soon')}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-44"
        />
        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-44"
        />
        <Button onClick={fetchReport} loading={loading}>Apply</Button>
      </div>

      {loading && !data ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${data.summary.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Orders', value: data.summary.totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Avg. Order Value', value: `₹${Math.round(data.summary.averageOrder).toLocaleString()}`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Total Repairs', value: data.summary.totalRepairs, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Repair Revenue', value: `₹${data.summary.repairRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
            ].map((kpi) => (
              <Card key={kpi.label} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  </div>
                  <div className={`${kpi.bg} p-2.5 rounded-xl`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
              {data.salesChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.salesChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} name="Revenue" dot={false} />
                    <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} name="Orders" dot={false} yAxisId={0} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No sales data</div>
              )}
            </Card>

            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Repair Revenue</h3>
              {data.repairRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.repairRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No repair data</div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
              <Table columns={productColumns} data={data.topProducts} keyExtractor={(item) => item.name} emptyMessage="No product data" />
            </Card>
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Top Brands</h3>
              <Table columns={brandColumns} data={data.topBrands} keyExtractor={(item) => item.name} emptyMessage="No brand data" />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
