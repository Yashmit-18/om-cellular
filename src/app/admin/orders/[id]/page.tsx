'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Package, Truck, CheckCircle2, Clock, XCircle, MapPin, StickyNote } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

interface OrderDetail {
  _id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone?: string; _id?: string };
  shippingAddress: { street?: string; city?: string; state?: string; zip?: string; country?: string; fullName?: string; phone?: string };
  items: { product?: { name: string }; variant?: { name: string; sku: string }; quantity: number; price: number }[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  trackingNumber?: string;
  internalNotes?: string;
  statusHistory: { status: string; timestamp: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}

const statusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const paymentOptions = ['pending', 'paid', 'failed', 'refunded'];

const statusIcon = (s: string) => {
  switch (s) {
    case 'delivered': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'shipped': return <Truck className="h-5 w-5 text-purple-500" />;
    case 'processing': return <Package className="h-5 w-5 text-indigo-500" />;
    default: return <Clock className="h-5 w-5 text-amber-500" />;
  }
};

export default function OrderDetailPage() {
  const toast = useToast();
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const o = data.order || data.data || data;
      setOrder(o);
      setNewStatus(o.status || '');
      setTrackingNumber(o.trackingNumber || '');
      setInternalNotes(o.internalNotes || '');
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, statusNote }),
      });
      if (!res.ok) throw new Error();
      toast.success('Status updated');
      setStatusNote('');
      fetchOrder();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveTracking = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber }),
      });
      if (!res.ok) throw new Error();
      toast.success('Tracking number saved');
      fetchOrder();
    } catch {
      toast.error('Failed to save tracking');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes }),
      });
      if (!res.ok) throw new Error();
      toast.success('Notes saved');
      fetchOrder();
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order {order.orderNumber || `#${order._id.slice(-8).toUpperCase()}`}
          </h1>
          <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Shipping */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent>
              {order.customer ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-gray-500">{order.customer.email}</p>
                  {order.customer.phone && <p className="text-gray-500">{order.customer.phone}</p>}
                  {order.customer._id && (
                    <Link href={`/admin/customers/${order.customer._id}`} className="text-[#2563eb] hover:underline text-xs">
                      View Profile →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Guest checkout</p>
              )}
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <MapPin className="h-4 w-4" />
                <CardTitle className="text-base">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-0.5">
                {order.shippingAddress.fullName && <p className="font-medium">{order.shippingAddress.fullName}</p>}
                {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                <p>{[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip].filter(Boolean).join(', ')}</p>
                {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                {order.shippingAddress.phone && <p className="mt-1">{order.shippingAddress.phone}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{order.paymentMethod || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>{order.paymentStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product?.name || 'Product'}</p>
                          {item.variant && <p className="text-xs text-gray-500">{item.variant.name || item.variant.sku}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.price}</TableCell>
                      <TableCell className="text-right font-medium">${item.price * item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t mt-4 pt-4 space-y-1 text-sm max-w-xs ml-auto">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${order.subtotal}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>${order.shippingCost}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>${order.tax}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${order.total}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <div className="space-y-4">
                  {order.statusHistory.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      {statusIcon(h.status)}
                      <div>
                        <p className="text-sm font-medium capitalize">{h.status}</p>
                        <p className="text-xs text-gray-500">{formatDate(h.timestamp)}</p>
                        {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No status history</p>
              )}
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="flex-1">
                  {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
                <Button onClick={handleUpdateStatus} disabled={updating || newStatus === order.status} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                  <Save className="h-4 w-4 mr-2" /> Update
                </Button>
              </div>
              <Input placeholder="Status note (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </CardContent>
          </Card>

          {/* Tracking */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Truck className="h-4 w-4" />
              <CardTitle className="text-base">Tracking Number</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Input placeholder="Enter tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={handleSaveTracking} disabled={updating}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Add internal notes..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} />
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={updating} className="mt-3">
                <Save className="h-4 w-4 mr-2" /> Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
