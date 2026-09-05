import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { serviceabilityService } from '../../services/serviceability.service'

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ city: '', state: '', pinCodes: '', services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true } })

  const load = () => {
    setLoading(true)
    serviceabilityService.getAreas().then(r => { setAreas(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
      await serviceabilityService.createArea({ city: form.city.trim(), state: form.state.trim(), pinCodes: pins, services: form.services })
      toast.success('Service area created')
      setForm({ city: '', state: '', pinCodes: '', services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true } })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create area')
    }
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
      setAreas(prev => prev.filter(a => a.id !== area.id))
      toast.success('Area deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete area')
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Link to="/admin" className="hover:text-gray-900">Dashboard</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">Service Areas</span></nav>
      <h1 className="text-2xl font-bold">Service Areas</h1>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold mb-4">Add Service Area</h2>
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
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 inline h-4 w-4" /> Create Area</button>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold mb-4">Existing Areas ({areas.length})</h2>
        {areas.length === 0 ? (
          <p className="text-sm text-gray-400">No service areas configured yet. Add areas above to enable serviceability checks.</p>
        ) : (
          <div className="space-y-3">
            {areas.map(area => (
              <div key={area.id || area._id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-medium">{area.city}, {area.state} <span className={`badge ${area.isEnabled ? 'badge-success' : 'badge-warning'} ml-2`}>{area.isEnabled ? 'Active' : 'Disabled'}</span></p>
                  <p className="text-sm text-gray-500 mt-0.5">PINs: {area.pinCodes.join(', ')}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(area.services).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="badge badge-info text-[10px]">{k}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(area)} className="btn-ghost !text-xs">{area.isEnabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => handleDelete(area)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}