'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  applicableTo: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const router = useRouter();
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons?page=${page}&limit=15`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoupons(data.coupons);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Coupon ${coupon.isActive ? 'disabled' : 'enabled'}`);
      fetchCoupons();
    } catch {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Coupon deleted');
      setDeleteTarget(null);
      fetchCoupons();
    } catch {
      toast.error('Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (item: Coupon) => (
        <span className="font-mono font-bold text-[#2563eb] bg-blue-50 px-2 py-1 rounded text-xs">{item.code}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: Coupon) => (
        <Badge variant={item.type === 'PERCENTAGE' ? 'info' : 'purple'}>
          {item.type}
        </Badge>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (item: Coupon) => (
        <span className="font-medium text-gray-900">
          {item.type === 'PERCENTAGE' ? `${item.value}%` : `₹${item.value}`}
          {item.maxDiscount && <span className="text-xs text-gray-500 ml-1">(max ₹{item.maxDiscount})</span>}
        </span>
      ),
    },
    {
      key: 'minOrder',
      header: 'Min Order',
      render: (item: Coupon) => (
        <span className="text-sm text-gray-600">{item.minOrderAmount ? `₹${item.minOrderAmount}` : '—'}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (item: Coupon) => (
        <span className="text-sm">
          <span className="font-medium">{item.usedCount}</span>
          <span className="text-gray-400"> / </span>
          <span className="text-gray-600">{item.usageLimit || '∞'}</span>
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry',
      render: (item: Coupon) => (
        <span className="text-sm text-gray-600">
          {item.expiresAt ? format(new Date(item.expiresAt), 'dd MMM yyyy') : 'Never'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Coupon) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Coupon) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/coupons/${item.id}`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleActive(item)}>
            {item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">Manage discount coupons</p>
        </div>
        <Button onClick={() => router.push('/admin/coupons/new')}>
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : coupons.length === 0 ? (
        <EmptyState icon={Tag} title="No coupons" description="Create your first coupon to get started." actionLabel="Create Coupon" onAction={() => router.push('/admin/coupons/new')} />
      ) : (
        <>
          <Table columns={columns} data={coupons} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon "${deleteTarget?.code}"? This will deactivate it.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
