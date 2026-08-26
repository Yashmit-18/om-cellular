'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Plus, Edit, Trash2, Power, PowerOff, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

interface HomepageSection {
  id: string;
  title: string;
  subtitle: string | null;
  type: string;
  productIds: string;
  ctaText: string | null;
  ctaLink: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  background: string | null;
}

export default function HomepageSectionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/homepage-sections');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSections(data.sections || []);
    } catch {
      toast.error('Failed to load homepage sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const toggleActive = async (section: HomepageSection) => {
    try {
      await fetch(`/api/homepage-sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !section.isActive }),
      });
      toast.success(`Section ${section.isActive ? 'deactivated' : 'activated'}`);
      fetchSections();
    } catch {
      toast.error('Failed to update section');
    }
  };

  const reorder = async (section: HomepageSection, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swap = direction === 'up' ? sections[idx - 1] : sections[idx + 1];
    if (!swap) return;
    try {
      await Promise.all([
        fetch(`/api/homepage-sections/${section.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swap.sortOrder }),
        }),
        fetch(`/api/homepage-sections/${swap.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: section.sortOrder }),
        }),
      ]);
      fetchSections();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/homepage-sections/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Section deleted');
      setDeleteTarget(null);
      fetchSections();
    } catch {
      toast.error('Failed to delete section');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Sections</h1>
          <p className="text-sm text-gray-500">Manage homepage content sections</p>
        </div>
        <Button onClick={() => router.push('/admin/homepage/new')}>
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="text" count={5} />
      ) : sections.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No sections" description="Create your first homepage section." actionLabel="Add Section" onAction={() => router.push('/admin/homepage/new')} />
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <Card key={section.id} padding="md" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorder(section, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => reorder(section, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{section.title}</h3>
                    <Badge variant="info">{section.type}</Badge>
                    <Badge variant={section.isActive ? 'success' : 'default'}>
                      {section.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {section.subtitle && <p className="text-sm text-gray-500 truncate">{section.subtitle}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {JSON.parse(section.productIds || '[]').length} products · Sort: {section.sortOrder}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/homepage/${section.id}`)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(section)}>
                  {section.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(section)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Section"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
