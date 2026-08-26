'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export default function NewCategoryPage() {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: '',
    sortOrder: 0,
    isActive: true,
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !prev.slug) next.slug = generateSlug(String(value));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    try {
      setSaving(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Category created');
      router.push('/admin/categories');
    } catch {
      toast.error('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Category</h1>
          <p className="text-sm text-gray-500">Create a new category</p>
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
              <p className="text-xs text-gray-400 mt-1">Auto-generated from name</p>
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
              <Input value={form.icon} onChange={(e) => update('icon', e.target.value)} placeholder="Icon name or URL" />
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
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </div>
  );
}
