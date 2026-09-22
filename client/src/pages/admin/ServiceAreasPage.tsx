import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { serviceabilityService } from '../../services/serviceability.service'

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [enabled, setEnabled] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1, total: 0 })
  const [summary, setSummary] = useState<any>({ configuredPins: 0, serviceableAreas: 0, nonServiceableAreas: 0, inactiveAreas: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ city: '', state: '', pinCodes: '', services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true } })

  const load = useCallback(() => {
    setLoading(true)
    serviceabilityService.getAreas({ search, enabled, page: String(page), limit: '20' }).then(r => { setAreas(r.data || []); setPagination(r.pagination || { page: 1, totalPages: 1, total: 0 }); setSummary(r.summary || { configuredPins: 0, serviceableAreas: 0, nonServiceableAreas: 0, inactiveAreas: 0 }); setLoading(false) }).catch(() => setLoading(false))
  }, [enabled, page, search])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.city.trim() || !form.state.trim()) {
      toast.error('City and State are required')
      return
    }
    const pins = form.pinCodes.split(/[,\s\n]+/).map(p => p.trim()).filter(Boolean)
    if (!pins.length) {
      toast.error('Enter at least one PIN code')
      return
    }
    try {
      if (editingId) {
        await serviceabilityService.updateArea(editingId, { city: form.city.trim(), state: form.state.trim(), pinCodes: pins, services: form.services })
        toast.success('Service area updated')
      } else {
        await serviceabilityService.createArea({ city: form.city.trim(), state: form.state.trim(), pinCodes: pins, services: form.services })
        toast.success('Service area created')
      }
      setEditingId(null)
      setForm({ city: '', state: '', pinCodes: '', services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true } })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create area')
    }
  }

  const handleEdit = (area: any) => {
    setEditingId(area.id || area._id)
    setForm({ city: area.city || '', state: area.state || '', pinCodes: (area.pinCodes || []).join(', '), services: { delivery: area.services?.delivery !== false, repair: area.services?.repair !== false, pickupDrop: area.services?.pickupDrop !== false, sell: area.services?.sell !== false, exchange: area.services?.exchange !== false } })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggle = async (area: any) => {
    try {
      await serviceabilityService.updateArea(area.id || area._id, { isEnabled: !area.isEnabled })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update area')
    }
  }

  const handleDelete = async (area: any) => {
    if (!window.confirm(`Delete service area for ${area.city}, ${area.state}?`)) return
    try {
      await serviceabilityService.deleteArea(area.id || area._id)
      setAreas(prev => prev.filter(a => a.id !== area.id && a._id !== area._id))
      toast.success('Area deactivated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete area')
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Link to="/admin" className="hover:text-gray-900">Dashboard</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">Service Areas</span></nav>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Service Areas</h1><p className="mt-1 text-sm text-gray-500">Configure real delivery and service coverage. No sample PINs are added.</p></div><div className="flex gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), load())} className="input pl-9" placeholder="Search PIN, city or state" aria-label="Search service areas" /></div><button type="button" onClick={() => { setPage(1); load() }} className="btn-secondary">Search</button></div></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="card p-4"><p className="text-xs text-gray-500">Configured areas</p><p className="mt-1 text-2xl font-bold text-navy-900">{summary.configuredPins}</p></div><div className="card p-4"><p className="text-xs text-gray-500">Delivery enabled</p><p className="mt-1 text-2xl font-bold text-emerald-700">{summary.serviceableAreas}</p></div><div className="card p-4"><p className="text-xs text-gray-500">Delivery disabled</p><p className="mt-1 text-2xl font-bold text-amber-700">{summary.nonServiceableAreas}</p></div><div className="card p-4"><p className="text-xs text-gray-500">Inactive</p><p className="mt-1 text-2xl font-bold text-gray-600">{summary.inactiveAreas}</p></div></div>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold mb-4">{editingId ? 'Edit Service Area' : 'Add Service Area'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-gray-700">City *</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input mt-1" placeholder="City name" /></div>
          <div><label className="block text-sm font-medium text-gray-700">State *</label><input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="input mt-1" placeholder="State name" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700">PIN Codes (comma-separated) *</label><textarea value={form.pinCodes} onChange={e => setForm({ ...form, pinCodes: e.target.value })} rows={2} className="input mt-1" placeholder="411001, 411002, 411003" /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries({ delivery: 'Delivery', repair: 'Repair', pickupDrop: 'Pickup & Drop', sell: 'Sell', exchange: 'Exchange' }).map(([key, label]) => (
            <label key={key} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors cursor-pointer ${form.services[key as keyof typeof form.services] ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
              <input type="checkbox" checked={form.services[key as keyof typeof form.services]} onChange={e => setForm({ ...form, services: { ...form.services, [key]: e.target.checked } })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2"><button onClick={handleCreate} className="btn-primary"><Plus className="mr-1 inline h-4 w-4" /> {editingId ? 'Save Area' : 'Create Area'}</button>{editingId && <button onClick={() => { setEditingId(null); setForm({ city: '', state: '', pinCodes: '', services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true } }) }} className="btn-ghost">Cancel</button>}</div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Existing Areas ({pagination.total || areas.length})</h2><select value={enabled} onChange={e => { setEnabled(e.target.value); setPage(1) }} className="input !w-auto !py-2" aria-label="Filter service areas by status"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
        {areas.length === 0 ? (
          <p className="text-sm text-gray-400">No service areas configured yet. Add areas above to enable serviceability checks.</p>
        ) : (
          <div className="space-y-3">
            {areas.map(area => (
              <div key={area.id || area._id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-medium">{area.city}, {area.state} <span className={`badge ${area.isEnabled ? 'badge-success' : 'badge-warning'} ml-2`}>{area.isEnabled ? 'Active' : 'Inactive'}</span> <span className={`badge ${area.services?.delivery ? 'badge-success' : 'badge-warning'} ml-1`}>{area.services?.delivery ? 'Delivery enabled' : 'Delivery disabled'}</span></p>
                  <p className="text-sm text-gray-500 mt-0.5">PINs: {area.pinCodes.join(', ')}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(area.services).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="badge badge-info text-[10px]">{k}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(area)} className="btn-ghost !text-xs" aria-label={`Edit ${area.city} service area`}><Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => handleToggle(area)} className="btn-ghost !text-xs">{area.isEnabled ? 'Disable' : 'Enable'}</button>
                  {area.isEnabled && <button onClick={() => handleDelete(area)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-red-500 hover:text-red-600" aria-label={`Deactivate ${area.city} service area`}><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {areas.length > 0 && pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-sm text-gray-600"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="btn-ghost disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(current => current + 1)} className="btn-ghost disabled:opacity-40">Next</button></div>}
      </div>
    </div>
  )
}