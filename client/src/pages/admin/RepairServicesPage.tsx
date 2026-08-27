import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Search, Save, X, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import type { RepairService } from '../../types'

export default function AdminRepairServicesPage() {
  const [services, setServices] = useState<RepairService[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', startingPrice: 0, estimatedDuration: '', warranty: '', category: 'General', priceType: 'starting' })

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/repairs/services')
      const data = r.data.data || []
      let filtered = Array.isArray(data) ? data : []
      if (search) filtered = filtered.filter((s: RepairService) => s.name.toLowerCase().includes(search.toLowerCase()))
      setServices(filtered)
    } catch { toast.error('Failed to load services') } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchServices() }, [fetchServices])

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Service name is required'); return }
    try {
      if (editingId) {
        await api.put(`/repairs/services/${editingId}`, form)
        toast.success('Service updated')
      } else {
        await api.post('/repairs/services', form)
        toast.success('Service created')
      }
      setShowForm(false); setEditingId(null)
      setForm({ name: '', description: '', startingPrice: 0, estimatedDuration: '', warranty: '', category: 'General', priceType: 'starting' })
      fetchServices()
    } catch { toast.error('Failed to save') }
  }

  const handleEdit = (service: RepairService) => {
    setEditingId(service.id)
    setForm({ name: service.name, description: service.description || '', startingPrice: service.startingPrice || 0, estimatedDuration: service.estimatedDuration || '', warranty: service.warranty || '', category: (service as any).category || 'General', priceType: (service as any).priceType || 'starting' })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this service?')) return
    try { await api.delete(`/repairs/services/${id}`); toast.success('Deactivated'); fetchServices() } catch { toast.error('Failed') }
  }

  const categories = ['General', 'Screen', 'Battery', 'Charging', 'Camera', 'Software', 'Water Damage', 'Motherboard', 'Network', 'Speaker', 'Other']

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Services</h1>
          <p className="mt-1 text-sm text-gray-500">Manage repair services offered to customers</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', startingPrice: 0, estimatedDuration: '', warranty: '', category: 'General', priceType: 'starting' }) }}
          className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Service</button>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input !pl-10" placeholder="Search services..." />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Service Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" placeholder="e.g. Display Replacement" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input mt-1" rows={3} placeholder="Service description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Starting Price (₹)</label><input type="number" value={form.startingPrice || ''} onChange={e => setForm({ ...form, startingPrice: parseInt(e.target.value) || 0 })} className="input mt-1" placeholder="0" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input mt-1">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Est. Duration</label><input value={form.estimatedDuration} onChange={e => setForm({ ...form, estimatedDuration: e.target.value })} className="input mt-1" placeholder="e.g. 1-2 hours" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Warranty</label><input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} className="input mt-1" placeholder="e.g. 3 months" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Price Type</label>
                  <select value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value })} className="input mt-1">
                    <option value="starting">Starting From</option>
                    <option value="fixed">Fixed Price</option>
                  </select>
                </div>
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
      ) : services.length > 0 ? (
        <div className="mt-6 card overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 font-medium text-gray-600">Service</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Warranty</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      {service.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{service.description}</div>}
                    </td>
                    <td className="px-4 py-3"><span className="badge-neutral badge">{(service as any).category || 'General'}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(service.startingPrice || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{service.estimatedDuration || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{service.warranty || '-'}</td>
                    <td className="px-4 py-3"><span className={`badge ${service.isActive ? 'badge-success' : 'badge-danger'}`}>{service.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(service)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(service.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
          <Wrench className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Repair Services</h3>
          <p className="mt-2 text-sm text-gray-500">Add repair services to display on the website.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add First Service</button>
        </div>
      )}
    </div>
  )
}
