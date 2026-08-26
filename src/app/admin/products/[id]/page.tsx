'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

interface Brand { _id: string; name: string; }
interface Category { _id: string; name: string; }
interface Variant {
  _id?: string;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number;
  stock: number;
  specifications: { ram?: string; storage?: string; color?: string };
  condition: string;
  badge: string;
  images: string[];
  isActive: boolean;
}
interface ProductForm {
  name: string;
  brand: string;
  category: string;
  description: string;
  condition: string;
  warranty: string;
  returnPolicy: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isRefurbished: boolean;
}

export default function EditProductPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showNewVariant, setShowNewVariant] = useState(false);
  const [editVariantIdx, setEditVariantIdx] = useState<number | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<ProductForm>({
    name: '', brand: '', category: '', description: '', condition: 'new',
    warranty: '', returnPolicy: '', seoTitle: '', seoDescription: '', seoKeywords: '',
    isFeatured: false, isNewArrival: false, isBestSeller: false, isRefurbished: false,
  });

  const emptyVariant: Variant = {
    name: '', sku: '', price: 0, discountPrice: undefined, stock: 0,
    specifications: {}, condition: 'new', badge: '', images: [], isActive: true,
  };
  const [variantForm, setVariantForm] = useState<Variant>(emptyVariant);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, bRes, cRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch('/api/brands'),
        fetch('/api/categories'),
      ]);
      const pData = await pRes.json();
      const bData = await bRes.json();
      const cData = await cRes.json();
      const p = pData.product || pData.data || pData;
      setForm({
        name: p.name || '',
        brand: p.brand?._id || p.brand || '',
        category: p.category?._id || p.category || '',
        description: p.description || '',
        condition: p.condition || 'new',
        warranty: p.warranty || '',
        returnPolicy: p.returnPolicy || '',
        seoTitle: p.seo?.title || '',
        seoDescription: p.seo?.description || '',
        seoKeywords: p.seo?.keywords || '',
        isFeatured: p.isFeatured || false,
        isNewArrival: p.isNewArrival || false,
        isBestSeller: p.isBestSeller || false,
        isRefurbished: p.isRefurbished || false,
      });
      setVariants(p.variants || []);
      setBrands(bData.brands || bData.data || bData || []);
      setCategories(cData.categories || cData.data || cData || []);
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateForm = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateVariantForm = (field: string, value: any) =>
    setVariantForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Product updated');
      router.push('/admin/products');
    } catch {
      toast.error('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    try {
      const res = await fetch(`/api/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Variant added');
      setShowNewVariant(false);
      setVariantForm(emptyVariant);
      fetchData();
    } catch {
      toast.error('Failed to add variant');
    }
  };

  const handleUpdateVariant = async () => {
    if (!variantForm._id) return;
    try {
      const res = await fetch(`/api/products/${id}/variants/${variantForm._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Variant updated');
      setEditVariantIdx(null);
      setVariantForm(emptyVariant);
      fetchData();
    } catch {
      toast.error('Failed to update variant');
    }
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/products/${id}/variants/${deleteVariantId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Variant deleted');
      setDeleteVariantId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete variant');
    } finally {
      setDeleting(false);
    }
  };

  const startEditVariant = (idx: number) => {
    setVariantForm({ ...variants[idx] });
    setEditVariantIdx(idx);
    setShowNewVariant(false);
  };

  if (loading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500">Update product information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                <Select value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} required>
                  <option value="">Select brand</option>
                  {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <Select value={form.category} onChange={(e) => updateForm('category', e.target.value)} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <Select value={form.condition} onChange={(e) => updateForm('condition', e.target.value)}>
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="refurbished">Refurbished</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
                <Input value={form.warranty} onChange={(e) => updateForm('warranty', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
                <Input value={form.returnPolicy} onChange={(e) => updateForm('returnPolicy', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
              <Input value={form.seoTitle} onChange={(e) => updateForm('seoTitle', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
              <Textarea value={form.seoDescription} onChange={(e) => updateForm('seoDescription', e.target.value)} rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
              <Input value={form.seoKeywords} onChange={(e) => updateForm('seoKeywords', e.target.value)} placeholder="comma separated" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Flags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {([
                ['isFeatured', 'Featured'],
                ['isNewArrival', 'New Arrival'],
                ['isBestSeller', 'Best Seller'],
                ['isRefurbished', 'Refurbished'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={Boolean((form as unknown as Record<string, unknown>)[key])} onChange={(e) => updateForm(key, e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-[#2563eb] hover:bg-[#1d4ed8]" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Variants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants ({variants.length})</CardTitle>
          <Button size="sm" onClick={() => { setShowNewVariant(true); setEditVariantIdx(null); setVariantForm(emptyVariant); }} className="bg-[#f97316] hover:bg-[#ea580c]">
            <Plus className="h-4 w-4 mr-1" /> Add Variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(showNewVariant || editVariantIdx !== null) && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <h4 className="font-medium">{editVariantIdx !== null ? 'Edit Variant' : 'New Variant'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Name" value={variantForm.name} onChange={(e) => updateVariantForm('name', e.target.value)} />
                <Input placeholder="SKU" value={variantForm.sku} onChange={(e) => updateVariantForm('sku', e.target.value)} />
                <Input type="number" placeholder="Price" value={variantForm.price} onChange={(e) => updateVariantForm('price', Number(e.target.value))} />
                <Input type="number" placeholder="Discount Price" value={variantForm.discountPrice || ''} onChange={(e) => updateVariantForm('discountPrice', e.target.value ? Number(e.target.value) : undefined)} />
                <Input type="number" placeholder="Stock" value={variantForm.stock} onChange={(e) => updateVariantForm('stock', Number(e.target.value))} />
                <Input placeholder="RAM" value={variantForm.specifications?.ram || ''} onChange={(e) => updateVariantForm('specifications', { ...variantForm.specifications, ram: e.target.value })} />
                <Input placeholder="Storage" value={variantForm.specifications?.storage || ''} onChange={(e) => updateVariantForm('specifications', { ...variantForm.specifications, storage: e.target.value })} />
                <Input placeholder="Color" value={variantForm.specifications?.color || ''} onChange={(e) => updateVariantForm('specifications', { ...variantForm.specifications, color: e.target.value })} />
                <Input placeholder="Badge" value={variantForm.badge} onChange={(e) => updateVariantForm('badge', e.target.value)} />
              </div>
              <Input placeholder="Image URL" value={variantForm.images?.[0] || ''} onChange={(e) => updateVariantForm('images', e.target.value ? [e.target.value] : [])} />
              <div className="flex gap-2">
                <Button size="sm" onClick={editVariantIdx !== null ? handleUpdateVariant : handleAddVariant} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                  {editVariantIdx !== null ? 'Update' : 'Add'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowNewVariant(false); setEditVariantIdx(null); setVariantForm(emptyVariant); }}>Cancel</Button>
              </div>
            </div>
          )}

          {variants.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No variants yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v, idx) => (
                    <TableRow key={v._id || idx}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.sku || '—'}</TableCell>
                      <TableCell>
                        ${v.price}
                        {v.discountPrice && <span className="text-green-600 ml-1">${v.discountPrice}</span>}
                      </TableCell>
                      <TableCell>{v.stock}</TableCell>
                      <TableCell>{v.isActive ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditVariant(idx)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteVariantId(v._id!)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        open={!!deleteVariantId}
        onOpenChange={(open) => !open && setDeleteVariantId(null)}
        title="Delete Variant"
        description="Are you sure you want to delete this variant?"
        onConfirm={handleDeleteVariant}
        loading={deleting}
      />
    </div>
  );
}
