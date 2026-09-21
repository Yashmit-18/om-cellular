import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Edit, X, Power, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatPrice } from '../../utils'

interface VariantForm {
  name: string
  sku: string
  price: string
  discountPrice: string
  stock: string
  storage: string
  ram: string
  color: string
  condition: string
  imagesText: string
}

const EMPTY_VARIANT_FORM: VariantForm = {
  name: '',
  sku: '',
  price: '',
  discountPrice: '',
  stock: '',
  storage: '',
  ram: '',
  color: '',
  condition: '',
  imagesText: '',
}

function toNumOrNull(value: string): number | null {
  if (value.trim() === '') return null
  return Number(value)
}

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const navigate = useNavigate()

  const [variants, setVariants] = useState<any[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantModal, setVariantModal] = useState<{ editingId: string | null; form: VariantForm } | null>(null)
  const [savingVariant, setSavingVariant] = useState(false)

  const refreshVariants = useCallback(async () => {
    if (!id || id === 'new') {
      setVariants([])
      return
    }
    setVariantsLoading(true)
    try {
      const r = await api.get(`/products/${id}/variants?includeAll=true`)
      setVariants(r.data.data || [])
    } catch {
      toast.error('Failed to load variants')
    } finally {
      setVariantsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id || id === 'new') {
      setForm({ name: '', slug: '', description: '', images: [], isActive: true, isFeatured: false, isNewArrival: false, isBestSeller: false })
      setVariants([])
      setLoading(false)
      return
    }
    api.get(`/products/${id}`).then(r => {
      setProduct(r.data.data)
      setForm(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
    refreshVariants()
  }, [id, refreshVariants])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        const res = await api.post('/products', form)
        navigate(`/admin/products/${res.data.data.id}`, { replace: true })
      } else {
        await api.put(`/products/${id}`, form)
        alert('Saved!')
      }
    } catch { alert('Failed to save') }
    finally { setSaving(false) }
  }

  const openAddVariant = () => {
    setVariantModal({ editingId: null, form: { ...EMPTY_VARIANT_FORM } })
  }

  const openEditVariant = (v: any) => {
    setVariantModal({
      editingId: v.id,
      form: {
        name: v.name || '',
        sku: v.sku || '',
        price: String(v.price ?? ''),
        discountPrice: v.discountPrice != null ? String(v.discountPrice) : '',
        stock: String(v.stock ?? ''),
        storage: v.storage || '',
        ram: v.ram || '',
        color: v.color || '',
        condition: v.condition || '',
        imagesText: (Array.isArray(v.images) ? v.images : []).join('\n'),
      },
    })
  }

  const handleVariantSave = async () => {
    if (!variantModal) return
    const { editingId, form: vf } = variantModal

    const name = vf.name.trim()
    const price = toNumOrNull(vf.price)
    const discountPrice = toNumOrNull(vf.discountPrice)
    const stock = toNumOrNull(vf.stock)
    const sku = vf.sku.trim()

    if (!name || price === null) { toast.error('Name and price are required'); return }
    if (!Number.isFinite(price) || price < 0) { toast.error('Price must be >= 0'); return }
    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0)) { toast.error('discountPrice must be a non-negative number'); return }
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) { toast.error('stock must be a non-negative number'); return }
    if (sku && variants.some(v => v.id !== editingId && (v.sku || '').trim().toLowerCase() === sku.toLowerCase())) {
      toast.error('SKU is already in use')
      return
    }

    const payload: any = {
      name,
      price,
      discountPrice,
      stock: stock ?? 0,
      storage: vf.storage.trim() || null,
      ram: vf.ram.trim() || null,
      color: vf.color.trim() || null,
      condition: vf.condition.trim() || null,
      images: vf.imagesText.split('\n').map((s: string) => s.trim()).filter(Boolean),
    }
    if (sku) payload.sku = sku

    setSavingVariant(true)
    try {
      if (editingId) {
        await api.put(`/products/${id}/variants/${editingId}`, payload)
        toast.success('Variant updated')
      } else {
        await api.post(`/products/${id}/variants`, payload)
        toast.success('Variant created')
      }
      setVariantModal(null)
      refreshVariants()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save variant')
    } finally {
      setSavingVariant(false)
    }
  }

  const handleDeactivateVariant = async (v: any) => {
    if (!confirm(`Deactivate variant "${v.name}"? It will be hidden from the storefront but kept for order history.`)) return
    try {
      await api.delete(`/products/${id}/variants/${v.id}`)
      toast.success('Variant deactivated')
      refreshVariants()
    } catch { toast.error('Failed to deactivate variant') }
  }

  const handleReactivateVariant = async (v: any) => {
    try {
      await api.put(`/products/${id}/variants/${v.id}`, { isActive: true })
      toast.success('Variant reactivated')
      refreshVariants()
    } catch { toast.error('Failed to reactivate variant') }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!isNew && !product) return <div className="text-center py-12">Product not found</div>

  const specs = (v: any) => [v.storage, v.ram, v.color].filter(Boolean).join(' · ')

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/products" className="hover:text-gray-900">Products</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{isNew ? 'Add' : 'Edit'}</span>
      </nav>
      <h1 className="text-2xl font-bold">{isNew ? 'Add Product' : product.name}</h1>
      <div className="mt-6 card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" /></div>
          <div><label className="block text-sm font-medium">Slug</label><input value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} className="input mt-1" /></div>
        </div>
        <div><label className="block text-sm font-medium">Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="input mt-1" rows={4} /></div>
        <div>
          <label className="block text-sm font-medium">Product Images (image URLs, one per line)</label>
          <textarea
            value={(form.images || []).join('\n')}
            onChange={e => setForm({ ...form, images: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })}
            className="input mt-1 font-mono !text-xs"
            rows={3}
            placeholder={'https://example.com/phone-1.jpg\nhttps://example.com/phone-2.jpg'}
          />
          <p className="mt-1 text-xs text-gray-500">These images are used on product cards and the product detail page. Variant images fall back to these when not set.</p>
          {Array.isArray(form.images) && form.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.images.slice(0, 6).map((img: string, i: number) => (
                <div key={i} className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <img src={img} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured ?? false} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isNewArrival ?? false} onChange={e => setForm({ ...form, isNewArrival: e.target.checked })} /> New Arrival</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isBestSeller ?? false} onChange={e => setForm({ ...form, isBestSeller: e.target.checked })} /> Best Seller</label>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}</button>
      </div>

      {!isNew && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Variants ({variants.length})</h2>
            <button onClick={openAddVariant} className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Variant</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Each product must have at least one active variant to be available on the storefront. Deactivated variants stay in order history but are hidden from the website.</p>

          {variantsLoading ? (
            <div className="mt-4 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
          ) : variants.length > 0 ? (
            <div className="mt-4 space-y-3">
              {variants.map((v: any) => (
                <div key={v.id} className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${v.isActive === false ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{v.name}</p>
                      {v.isActive === false ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                      )}
                      {specs(v) && <p className="text-sm text-gray-500">{specs(v)}</p>}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">SKU: {v.sku} {v.condition ? `· ${v.condition}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      {v.discountPrice != null && Number(v.discountPrice) < Number(v.price) ? (
                        <>
                          <p className="font-bold">{formatPrice(Number(v.discountPrice))}</p>
                          <p className="text-xs text-gray-400 line-through">{formatPrice(Number(v.price))}</p>
                        </>
                      ) : (
                        <p className="font-bold">{formatPrice(Number(v.price))}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={Number(v.stock) > 0 ? 'font-semibold' : 'font-semibold text-red-600'}>Stock: {v.stock}</p>
                      {Number(v.stock) <= 0 && <p className="text-xs text-red-500">Out of stock</p>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEditVariant(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600" title="Edit variant"><Edit className="h-4 w-4" /></button>
                      {v.isActive === false ? (
                        <button onClick={() => handleReactivateVariant(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-600" title="Reactivate variant"><Power className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => handleDeactivateVariant(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Deactivate variant"><Power className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No variants yet. Add the first variant (e.g. "128GB Black") to make this product available for sale.
            </div>
          )}
        </div>
      )}

      {variantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{variantModal.editingId ? 'Edit Variant' : 'Add Variant'}</h2>
              <button onClick={() => setVariantModal(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Variant Name *</label><input value={variantModal.form.name} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, name: e.target.value } })} className="input mt-1" placeholder="e.g. 128GB Midnight Black" /></div>
              <div><label className="block text-sm font-medium text-gray-700">SKU</label><input value={variantModal.form.sku} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, sku: e.target.value } })} className="input mt-1" placeholder="Auto-generated if empty" /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className="block text-sm font-medium text-gray-700">Price *</label><input type="number" min="0" value={variantModal.form.price} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, price: e.target.value } })} className="input mt-1" placeholder="54999" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Discount Price</label><input type="number" min="0" value={variantModal.form.discountPrice} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, discountPrice: e.target.value } })} className="input mt-1" placeholder="Optional" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Stock</label><input type="number" min="0" value={variantModal.form.stock} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, stock: e.target.value } })} className="input mt-1" placeholder="0" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700">Storage</label><input value={variantModal.form.storage} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, storage: e.target.value } })} className="input mt-1" placeholder="128GB" /></div>
                <div><label className="block text-sm font-medium text-gray-700">RAM</label><input value={variantModal.form.ram} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, ram: e.target.value } })} className="input mt-1" placeholder="8GB" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Color</label><input value={variantModal.form.color} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, color: e.target.value } })} className="input mt-1" placeholder="Black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Condition</label><input value={variantModal.form.condition} onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, condition: e.target.value } })} className="input mt-1" placeholder="Excellent" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Variant Images (image URLs, one per line)</label>
                <textarea
                  value={variantModal.form.imagesText}
                  onChange={e => setVariantModal({ ...variantModal, form: { ...variantModal.form, imagesText: e.target.value } })}
                  className="input mt-1 font-mono !text-xs"
                  rows={3}
                  placeholder={'https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setVariantModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleVariantSave} disabled={savingVariant} className="btn-primary flex-1"><Save className="mr-1 h-4 w-4" /> {savingVariant ? 'Saving...' : variantModal.editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}