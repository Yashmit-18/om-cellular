'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, Mail, Phone, ShoppingCart, Wrench, Package, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

interface CustomerDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  orders: { _id: string; orderNumber?: string; total: number; status: string; createdAt: string; items?: Array<Record<string, unknown>> }[];
  repairBookings: { _id: string; deviceType?: string; issue?: string; status: string; createdAt: string }[];
  sellRequests: { _id: string; deviceType?: string; status: string; createdAt: string; estimatedValue?: number }[];
  exchangeRequests: { _id: string; deviceType?: string; status: string; createdAt: string }[];
  stats: { totalOrders: number; totalSpent: number; totalRepairs: number; totalSells: number; totalExchanges: number };
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function CustomerDetailPage() {
  const toast = useToast();
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'repairs' | 'sells' | 'exchanges'>('orders');

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomer(data.customer || data.data || data);
    } catch {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (!customer) return <div className="text-center py-12 text-gray-500">Customer not found</div>;

  const stats = customer.stats || { totalOrders: customer.orders?.length || 0, totalSpent: 0, totalRepairs: customer.repairBookings?.length || 0, totalSells: customer.sellRequests?.length || 0, totalExchanges: customer.exchangeRequests?.length || 0 };

  const tabs = [
    { key: 'orders' as const, label: 'Orders', icon: ShoppingCart, count: customer.orders?.length || 0 },
    { key: 'repairs' as const, label: 'Repairs', icon: Wrench, count: customer.repairBookings?.length || 0 },
    { key: 'sells' as const, label: 'Sell Requests', icon: Package, count: customer.sellRequests?.length || 0 },
    { key: 'exchanges' as const, label: 'Exchanges', icon: ArrowLeftRight, count: customer.exchangeRequests?.length || 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500">Customer since {formatDate(customer.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#2563eb]">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#f97316]">${stats.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.totalRepairs}</p>
            <p className="text-xs text-gray-500">Repair Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalSells + stats.totalExchanges}</p>
            <p className="text-xs text-gray-500">Sell & Exchange</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{customer.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{customer.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{customer.phone || '—'}</span>
          </div>
          {customer.address && (
            <div className="flex items-center gap-3 text-sm">
              <ArrowLeft className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{customer.address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <Badge variant="secondary" className="ml-1">{t.count}</Badge>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              {customer.orders?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((o) => (
                      <TableRow key={o._id}>
                        <TableCell className="font-mono font-medium">{o.orderNumber || o._id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(o.createdAt)}</TableCell>
                        <TableCell>{o.items?.length ?? 0}</TableCell>
                        <TableCell className="font-medium">${o.total}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100'}`}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/orders/${o._id}`}><Button variant="ghost" size="sm">View</Button></Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-gray-500">No orders</p>
              )}
            </div>
          )}

          {activeTab === 'repairs' && (
            <div className="overflow-x-auto">
              {customer.repairBookings?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.repairBookings.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">{r.deviceType || '—'}</TableCell>
                        <TableCell className="text-gray-500">{r.issue || '—'}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(r.createdAt)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100'}`}>
                            {r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-gray-500">No repair bookings</p>
              )}
            </div>
          )}

          {activeTab === 'sells' && (
            <div className="overflow-x-auto">
              {customer.sellRequests?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Est. Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.sellRequests.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="font-medium">{s.deviceType || '—'}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(s.createdAt)}</TableCell>
                        <TableCell className="font-medium">{s.estimatedValue ? `$${s.estimatedValue}` : '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100'}`}>
                            {s.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-gray-500">No sell requests</p>
              )}
            </div>
          )}

          {activeTab === 'exchanges' && (
            <div className="overflow-x-auto">
              {customer.exchangeRequests?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.exchangeRequests.map((ex) => (
                      <TableRow key={ex._id}>
                        <TableCell className="font-medium">{ex.deviceType || '—'}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(ex.createdAt)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ex.status] || 'bg-gray-100'}`}>
                            {ex.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-gray-500">No exchange requests</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
