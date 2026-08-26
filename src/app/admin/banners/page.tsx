'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Image, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  ctaText: string | null;
  ctaLink: string | null;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
}

export default function BannersPage() {
  const router = useRouter();
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBanners(data.banners || []);
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const toggleActive = async (banner: Banner) => {
    try {
      await fetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      toast.success(`Banner ${banner.isActive ? 'disabled' : 'enabled'}`);
      fetchBanners();
    } catch {
      toast.error('Failed to update banner');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/banners/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Banner deleted');
      setDeleteTarget(null);
      fetchBanners();
    } catch {
      toast.error('Failed to delete banner');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500">Manage homepage banners and hero images</p>
        </div>
        <Button onClick={() => router.push('/admin/banners/new')}>
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : banners.length === 0 ? (
        <EmptyState icon={Image} title="No banners" description="Create your first banner." actionLabel="Add Banner" onAction={() => router.push('/admin/banners/new')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} padding="none" className="overflow-hidden">
              <div className="relative h-40 bg-gray-100">
                <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <Badge variant={banner.isActive ? 'success' : 'default'}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                    {banner.subtitle && <p className="text-sm text-gray-500">{banner.subtitle}</p>}
                    <p className="text-xs text-gray-400 mt-1">Sort: {banner.sortOrder}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/banners/${banner.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(banner)}>
                      {banner.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(banner)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Banner"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
