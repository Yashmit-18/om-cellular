'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

interface Brand { _id: string; name: string; }
interface Category { _id: string; name: string; }

export default function NewProductPage() {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
    condition: 'new',
    warranty: '',
    returnPolicy: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    isRefurbished: false,
  });

  const [variant, setVariant] = useState({
    name: 'Standard',
    sku: '',
    price: '',
    discountPrice: '',
    stock: '',
    ram: '',
    storage: '',
    color: '',
    condition: 'new',
    badge: '',
    image: '',
  });

  useEffect(() => {
    Promise.all([fetch('/api/brands'), fetch('/api/categories')])
      .then(async ([bRes, cRes]) => {
        const bData = await bRes.json();
        const cData = await cRes.json();
        setBrands(bData.brands || bData.data || bData || []);
        setCategories(cData.categories || cData.data || cData || []);
      })
      .catch(() => toast.error('Failed to load form data'))
      .finally(() => setLoadingMeta(false));
  }, []);

  const updateForm = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateVariant = (field: string, value: string) =>
    setVariant((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.category) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        variants: [
          {
            name: variant.name,
            sku: variant.sku,
            price: Number(variant.price),
            discountPrice: variant.discountPrice ? Number(variant.discountPrice) : undefined,
            stock: Number(variant.stock) || 0,
            specifications: {
              ram: variant.ram,
              storage: variant.storage,
              color: variant.color,
            },
            condition: variant.condition,
            badge: variant.badge,
            images: variant.image ? [variant.image] : [],
          },
        ],
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to create product');
      }

      toast.success('Product created successfully');
      router.push('/admin/products');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create product';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-sm text-gray-500">Create a new product listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <Input value={form.warranty} onChange={(e) => updateForm('warranty', e.target.value)} placeholder="e.g. 1 year" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
                <Input value={form.returnPolicy} onChange={(e) => updateForm('returnPolicy', e.target.value)} placeholder="e.g. 30 days" />
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
              {[
                { key: 'isFeatured', label: 'Featured' },
                { key: 'isNewArrival', label: 'New Arrival' },
                { key: 'isBestSeller', label: 'Best Seller' },
                { key: 'isRefurbished', label: 'Refurbished' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((form as unknown as Record<string, unknown>)[key])}
                    onChange={(e) => updateForm(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> First Variant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name</label>
                <Input value={variant.name} onChange={(e) => updateVariant('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <Input value={variant.sku} onChange={(e) => updateVariant('sku', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                <Input type="number" value={variant.price} onChange={(e) => updateVariant('price', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price</label>
                <Input type="number" value={variant.discountPrice} onChange={(e) => updateVariant('discountPrice', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <Input type="number" value={variant.stock} onChange={(e) => updateVariant('stock', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                <Input value={variant.ram} onChange={(e) => updateVariant('ram', e.target.value)} placeholder="e.g. 8GB" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage</label>
                <Input value={variant.storage} onChange={(e) => updateVariant('storage', e.target.value)} placeholder="e.g. 128GB" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <Input value={variant.color} onChange={(e) => updateVariant('color', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <Select value={variant.condition} onChange={(e) => updateVariant('condition', e.target.value)}>
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="refurbished">Refurbished</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                <Input value={variant.badge} onChange={(e) => updateVariant('badge', e.target.value)} placeholder="e.g. Sale" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <Input value={variant.image} onChange={(e) => updateVariant('image', e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/admin/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="bg-[#2563eb] hover:bg-[#1d4ed8]" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
