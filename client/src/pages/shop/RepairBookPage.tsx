import { useState, useEffect } from 'react'
import { Wrench, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { repairService } from '../../services/repair.service'
import type { RepairService } from '../../types'

export default function RepairBookPage() {
  const [services, setServices] = useState<RepairService[]>([])
  const [form, setForm] = useState({
    serviceId: '', brand: '', model: '', problemDescription: '',
    appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    repairService.getRepairServices().then(r => setServices(r.data || r.data?.data || [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.model || !form.problemDescription) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      await repairService.createRepair(form)
      toast.success('Repair booked successfully!')
      setForm({ serviceId: '', brand: '', model: '', problemDescription: '', appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '' })
    } catch {
      toast.error('Failed to book repair')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Wrench className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-3xl font-bold">Book a Repair</h1>
        <p className="mt-2 text-gray-500">Professional phone repair services</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 card p-8 space-y-4">
        {services.length > 0 && (
          <div><label className="block text-sm font-medium">Service Type</label>
            <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })} className="input mt-1">
              <option value="">Select a service</option>
              {services.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.name} - Starting Rs.{s.startingPrice}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Brand *</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input mt-1" placeholder="e.g. Samsung" required /></div>
          <div><label className="block text-sm font-medium">Model *</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="input mt-1" placeholder="e.g. Galaxy S23" required /></div>
        </div>
        <div><label className="block text-sm font-medium">Problem Description *</label>
          <textarea value={form.problemDescription} onChange={e => setForm({ ...form, problemDescription: e.target.value })} className="input mt-1" rows={4} placeholder="Describe the issue..." required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium"><Calendar className="inline h-4 w-4 mr-1" />Preferred Date</label><input type="date" value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} className="input mt-1" /></div>
          <div><label className="block text-sm font-medium">Preferred Time</label><input value={form.appointmentTime} onChange={e => setForm({ ...form, appointmentTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.pickupRequired} onChange={e => setForm({ ...form, pickupRequired: e.target.checked })} />
          Request pickup service
        </label>
        {form.pickupRequired && (
          <div><label className="block text-sm font-medium">Pickup Address</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} /></div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Booking...' : 'Book Repair'}</button>
      </form>
    </div>
  )
}
