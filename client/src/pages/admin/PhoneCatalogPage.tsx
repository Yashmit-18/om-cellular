import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Search, Save, X, ChevronDown, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
import type { PhoneCatalogModelEntry } from '../../types'

export default function AdminPhoneCatalogPage() {
  const [models, setModels] = useState<PhoneCatalogModelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ brandName: '', modelName: '', image: '', storageVariants: [{ storage: '', ram: '', baseValue: 0 }] })

  const fetchModels = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (brandFilter) params.brand = brandFilter
      const r = await phoneCatalogService.getAdminAll(params)
      setModels(r.data || [])
    } catch { toast.error('Failed to load phone catalog') } finally { setLoading(false) }
  }, [search, brandFilter])

  useEffect(() => { fetchModels() }, [fetchModels])

  const uniqueBrands = [...new Set(models.map(m => m.brandName))].sort()

  const handleSubmit = async () => {
    if (!form.brandName || !form.modelName) { toast.error('Brand and model name are required'); return }
    try {
      if (editingId) {
        await phoneCatalogService.update(editingId, form)
        toast.success('Model updated')
      } else {
        await phoneCatalogService.create({ ...form, image: form.image || undefined })
        toast.success('Model created')
      }
      setShowForm(false); setEditingId(null)
      setForm({ brandName: '', modelName: '', image: '', storageVariants: [{ storage: '', ram: '', baseValue: 0 }] })
      fetchModels()
    } catch { toast.error('Failed to save') }
  }

  const handleEdit = (model: PhoneCatalogModelEntry) => {
    setEditingId(model.id || (model as any)._id)
    setForm({ brandName: model.brandName, modelName: model.modelName, image: model.image || '', storageVariants: model.storageVariants || [] })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this phone model?')) return
    try { await phoneCatalogService.delete(id); toast.success('Deactivated'); fetchModels() } catch { toast.error('Failed') }
  }

  const addStorageVariant = () => setForm({ ...form, storageVariants: [...form.storageVariants, { storage: '', ram: '', baseValue: 0 }] })
  const removeStorageVariant = (i: number) => setForm({ ...form, storageVariants: form.storageVariants.filter((_, idx) => idx !== i) })
  const updateStorageVariant = (i: number, field: string, value: any) => {
    const updated = [...form.storageVariants]
    updated[i] = { ...updated[i], [field]: field === 'baseValue' ? parseInt(value) || 0 : value }
    setForm({ ...form, storageVariants: updated })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Catalog</h1>
          <p className="mt-1 text-sm text-gray-500">Manage phone brands, models, and storage variants for Sell Phone</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ brandName: '', modelName: '', image: '', storageVariants: [{ storage: '', ram: '', baseValue: 0 }] }) }}
          className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Phone Model</button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input !pl-10" placeholder="Search phones..." />
        </div>
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="input w-auto min-w-[160px]">
          <option value="">All Brands</option>
          {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Phone Model' : 'Add Phone Model'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Model Image URL</label>
                <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="input mt-1" placeholder="https://...bigpic/phone.jpg" />
                {form.image && <img src={form.image} alt="Model preview" className="mt-2 h-16 w-16 rounded-lg object-contain ring-1 ring-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Brand Name *</label><input value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} className="input mt-1" placeholder="e.g. Apple" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Model Name *</label><input value={form.modelName} onChange={e => setForm({ ...form, modelName: e.target.value })} className="input mt-1" placeholder="e.g. iPhone 15 Pro" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Storage Variants</label>
                  <button type="button" onClick={addStorageVariant} className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Add Variant</button>
                </div>
                {form.storageVariants.map((v, i) => (
                  <div key={i} className="mt-2 flex items-center gap-2">
                    <input value={v.storage} onChange={e => updateStorageVariant(i, 'storage', e.target.value)} className="input flex-1" placeholder="Storage (e.g. 128GB)" />
                    <input value={v.ram} onChange={e => updateStorageVariant(i, 'ram', e.target.value)} className="input w-24" placeholder="RAM" />
                    <input type="number" value={v.baseValue || ''} onChange={e => updateStorageVariant(i, 'baseValue', e.target.value)} className="input w-28" placeholder="Base Value" />
                    {form.storageVariants.length > 1 && <button type="button" onClick={() => removeStorageVariant(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1"><Save className="mr-1 h-4 w-4" /> {editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : models.length > 0 ? (
        <div className="mt-6 card overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 font-medium text-gray-600">Image</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Brand</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Model</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Storage Variants</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr key={model.id || (model as any)._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {model.image
                        ? <img src={model.image} alt="" className="h-10 w-10 rounded-lg object-contain ring-1 ring-gray-100" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-300"><Smartphone className="h-4 w-4" /></span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{model.brandName}</td>
                    <td className="px-4 py-3 text-gray-700">{model.modelName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {model.storageVariants?.map((v, i) => (
                          <span key={i} className="badge-neutral badge">{v.storage}{v.ram ? ` / ${v.ram}` : ''}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${model.isActive ? 'badge-success' : 'badge-danger'}`}>{model.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(model)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(model.id || (model as any)._id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 card p-12 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Phone Models</h3>
          <p className="mt-2 text-sm text-gray-500">Add phone models to populate the Sell Phone catalog.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add First Model</button>
        </div>
      )}
    </div>
  )
}
