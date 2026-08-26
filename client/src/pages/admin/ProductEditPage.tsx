import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (!id) return
    api.get(`/products/${id}`).then(r => {
      setProduct(r.data.data)
      setForm(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/products/${id}`, form)
      alert('Saved!')
    } catch { alert('Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!product) return <div className="text-center py-12">Product not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/products" className="hover:text-gray-900">Products</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">Edit</span>
      </nav>
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <div className="mt-6 card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" /></div>
          <div><label className="block text-sm font-medium">Slug</label><input value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} className="input mt-1" /></div>
        </div>
        <div><label className="block text-sm font-medium">Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="input mt-1" rows={4} /></div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured ?? false} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isNewArrival ?? false} onChange={e => setForm({ ...form, isNewArrival: e.target.checked })} /> New Arrival</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isBestSeller ?? false} onChange={e => setForm({ ...form, isBestSeller: e.target.checked })} /> Best Seller</label>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
      {product.variants && product.variants.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-semibold">Variants ({product.variants.length})</h2>
          <div className="mt-4 space-y-3">
            {product.variants.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                <div><p className="font-medium">{v.name}</p><p className="text-sm text-gray-500">SKU: {v.sku}</p></div>
                <div className="text-right"><p className="font-bold">{formatPrice(v.discountPrice || v.price)}</p><p className="text-sm text-gray-500">Stock: {v.stock}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
