import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Search, Save, X, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatPrice } from '../../utils'

type Valuation = {
  _id: string
  id?: string
  brand: string
  model: string
  baseValue: number
  storageAdjustment?: Record<string, number>
  isActive?: boolean
  displayDeduction?: number
  batteryDeduction?: number
}

const emptyForm = {
  brand: '',
  model: '',
  baseValue: 0,
  storageAdjustment: '',
  ageDepreciation: '',
  conditionMultiplier: '',
  displayDeduction: 5000,
  batteryDeduction: 1200,
  bodyDeduction: 1800,
  cameraDeduction: 900,
  accessoryDeduction: 500,
  billDeduction: 0,
  boxDeduction: 300,
}

function parseJsonMap(raw: string, fallback: Record<string, number> = {}) {
  if (!raw || !raw.trim()) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch { /* ignore */ }
  return fallback
}

export default function AdminPhoneValuationPage() {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchValuations = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/phone-valuations?limit=100')
      let data = (r.data.data || []) as Valuation[]
      if (search) {
        const q = search.toLowerCase()
        data = data.filter(v => v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
      }
      setValuations(data)
    } catch { toast.error('Failed to load valuation rules') } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchValuations() }, [fetchValuations])

  const handleSubmit = async () => {
    if (!form.brand || !form.model) { toast.error('Brand and model are required'); return }
    if (form.baseValue <= 0) { toast.error('Base value must be greater than 0'); return }
    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      baseValue: form.baseValue,
      storageAdjustment: parseJsonMap(form.storageAdjustment),
      ageDepreciation: parseJsonMap(form.ageDepreciation),
      conditionMultiplier: parseJsonMap(form.conditionMultiplier),
      displayDeduction: form.displayDeduction,
      batteryDeduction: form.batteryDeduction,
      bodyDeduction: form.bodyDeduction,
      cameraDeduction: form.cameraDeduction,
      accessoryDeduction: form.accessoryDeduction,
      billDeduction: form.billDeduction,
      boxDeduction: form.boxDeduction,
    }
    try {
      if (editingId) {
        await api.put(`/phone-valuations/${editingId}`, payload)
        toast.success('Valuation rule updated')
      } else {
        await api.post('/phone-valuations', payload)
        toast.success('Valuation rule created')
      }
      setShowForm(false); setEditingId(null); setForm(emptyForm)
      fetchValuations()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save valuation rule')
    }
  }

  const handleEdit = (v: Valuation) => {
    setEditingId(v._id || v.id || '')
    setForm({
      brand: v.brand,
      model: v.model,
      baseValue: v.baseValue || 0,
      storageAdjustment: v.storageAdjustment ? JSON.stringify(v.storageAdjustment) : '',
      ageDepreciation: '',
      conditionMultiplier: '',
      displayDeduction: Number(v.displayDeduction ?? 5000),
      batteryDeduction: Number(v.batteryDeduction ?? 1200),
      bodyDeduction: Number((v as any).bodyDeduction ?? 1800),
      cameraDeduction: Number((v as any).cameraDeduction ?? 900),
      accessoryDeduction: Number((v as any).accessoryDeduction ?? 500),
      billDeduction: Number((v as any).billDeduction ?? 0),
      boxDeduction: Number((v as any).boxDeduction ?? 300),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this valuation rule?')) return
    try { await api.delete(`/phone-valuations/${id}`); toast.success('Deactivated'); fetchValuations() } catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Valuations</h1>
          <p className="mt-1 text-sm text-gray-500">Valuation rules used by the sell &amp; exchange pricing engine</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
          className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Rule</button>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input !pl-10" placeholder="Search brand or model..." />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Valuation Rule' : 'Add Valuation Rule'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Brand *</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input mt-1" placeholder="e.g. Apple" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Model *</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="input mt-1" placeholder="e.g. iPhone 15" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700">Base Value (₹) *</label><input type="number" value={form.baseValue || ''} onChange={e => setForm({ ...form, baseValue: parseInt(e.target.value) || 0 })} className="input mt-1" placeholder="e.g. 33000" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Storage Adjustment (JSON)</label><input value={form.storageAdjustment} onChange={e => setForm({ ...form, storageAdjustment: e.target.value })} className="input mt-1 font-mono text-xs" placeholder='{"128GB":2500,"256GB":5500}' /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Display (₹)</label><input type="number" value={form.displayDeduction} onChange={e => setForm({ ...form, displayDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Battery (₹)</label><input type="number" value={form.batteryDeduction} onChange={e => setForm({ ...form, batteryDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Body (₹)</label><input type="number" value={form.bodyDeduction} onChange={e => setForm({ ...form, bodyDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Camera (₹)</label><input type="number" value={form.cameraDeduction} onChange={e => setForm({ ...form, cameraDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">No Accessories (₹)</label><input type="number" value={form.accessoryDeduction} onChange={e => setForm({ ...form, accessoryDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">No Box (₹)</label><input type="number" value={form.boxDeduction} onChange={e => setForm({ ...form, boxDeduction: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
              </div>
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
      ) : valuations.length > 0 ? (
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 font-medium text-gray-600">Brand</th>
                <th className="px-4 py-3 font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 font-medium text-gray-600">Base Value</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map(v => (
                <tr key={v._id || v.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.brand}</td>
                  <td className="px-4 py-3 text-gray-600">{v.model}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(v.baseValue || 0)}</td>
                  <td className="px-4 py-3"><span className={`badge ${v.isActive === false ? 'badge-danger' : 'badge-success'}`}>{v.isActive === false ? 'Inactive' : 'Active'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(v)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(v._id || v.id || '')} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 card p-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Valuation Rules</h3>
          <p className="mt-2 text-sm text-gray-500">Add pricing rules to power the sell &amp; exchange valuation engine. Models without a rule fall back to the catalog pricing engine automatically.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add First Rule</button>
        </div>
      )}
    </div>
  )
}