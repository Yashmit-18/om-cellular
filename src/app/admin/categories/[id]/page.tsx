'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

export default function EditCategoryPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', image: '', icon: '', sortOrder: 0, isActive: true,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/categories/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cat = data.category || data.data || data;
      setForm({
        name: cat.name || '',
        slug: cat.slug || '',
        description: cat.description || '',
        image: cat.image || '',
        icon: cat.icon || '',
        sortOrder: cat.sortOrder || 0,
        isActive: cat.isActive ?? true,
      });
    } catch {
      toast.error('Failed to load category');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Category updated');
      router.push('/admin/categories');
    } catch {
      toast.error('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton className="h-64" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
          <p className="text-sm text-gray-500">Update category details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <Input value={form.slug} onChange={(e) => update('slug', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <Input value={form.image} onChange={(e) => update('image', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <Input value={form.icon} onChange={(e) => update('icon', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <Input type="number" value={form.sortOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/admin/categories"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" className="bg-[#2563eb] hover:bg-[#1d4ed8]" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
