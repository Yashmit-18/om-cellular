'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export default function CategoriesPage() {
  const toast = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/categories?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data.categories || data.data || data || []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      toast.success(`Category ${current ? 'disabled' : 'enabled'}`);
      fetchCategories();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/categories/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Organize your products</p>
        </div>
        <Link href="/admin/categories/new">
          <Button className="bg-[#2563eb] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton className="h-64" />
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No categories found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat._id}>
                      <TableCell><GripVertical className="h-4 w-4 text-gray-400" /></TableCell>
                      <TableCell>
                        {cat.image || cat.icon ? (
                          <img src={cat.image || cat.icon} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No img</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-gray-500">{cat.slug}</TableCell>
                      <TableCell>{cat.productCount ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive ? 'default' : 'secondary'}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/categories/${cat._id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(cat._id, cat.isActive)}>
                            {cat.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat._id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Category"
        description="Are you sure? Products in this category may be affected."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
