import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Search, Save, X, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { brandService } from '../../services/brand.service'
import type { Brand } from '../../types'

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', sortOrder: 0 })
  const [uploading, setUploading] = useState(false)

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const r = await brandService.getBrands()
      let data = r.data || []
      if (search) data = data.filter((b: Brand) => b.name.toLowerCase().includes(search.toLowerCase()))
      setBrands(data)
    } catch { toast.error('Failed to load brands') } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Brand name is required'); return }
    try {
      if (editingId) {
        await brandService.updateBrand(editingId, form)
        toast.success('Brand updated')
      } else {
        await brandService.createBrand(form)
        toast.success('Brand created')
      }
      setShowForm(false); setEditingId(null); setForm({ name: '', sortOrder: 0 })
      fetchBrands()
    } catch { toast.error('Failed to save') }
  }

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id)
    setForm({ name: brand.name, sortOrder: brand.sortOrder })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this brand?')) return
    try { await brandService.deleteBrand(id); toast.success('Deactivated'); fetchBrands() } catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="mt-1 text-sm text-gray-500">Manage phone brands displayed on the website</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', sortOrder: 0 }) }}
          className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Brand</button>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input !pl-10" placeholder="Search brands..." />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Brand' : 'Add Brand'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Brand Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" placeholder="e.g. Apple" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Sort Order</label><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1"><Save className="mr-1 h-4 w-4" /> {editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : brands.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {brands.map(brand => (
            <div key={brand.id || brand._id} className="card-premium flex items-center gap-3 p-4">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                  {brand.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{brand.name}</p>
                <p className="text-xs text-gray-500">{brand._count?.products || 0} products</p>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => handleEdit(brand)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(brand.id || brand._id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 card p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Brands</h3>
          <p className="mt-2 text-sm text-gray-500">Add brands to organize your products.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add First Brand</button>
        </div>
      )}
    </div>
  )
}
