import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Calendar, ArrowRight, Check, Clock, Shield, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { repairService } from '../../services/repair.service'
import { formatPrice } from '../../utils'
import type { RepairService } from '../../types'

export default function RepairBookPage() {
  const [services, setServices] = useState<RepairService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<RepairService | null>(null)
  const [view, setView] = useState<'catalog' | 'book' | 'success'>('catalog')
  const [bookingNumber, setBookingNumber] = useState('')
  const [form, setForm] = useState({
    brand: '', model: '', problemDescription: '',
    appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    repairService.getRepairServices().then(r => {
      const data = r.data || r.data?.data || []
      setServices(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleBookService = (service: RepairService) => {
    setSelectedService(service)
    setView('book')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.model || !form.problemDescription) { toast.error('Please fill in all required fields'); return }
    setSubmitting(true)
    try {
      const serviceId = (selectedService as any)?._id || selectedService?.id || undefined
      const res = await repairService.createRepair({ serviceId, ...form })
      const number = res?.data?.bookingNumber || res?.bookingNumber || ''
      setBookingNumber(number)
      setView('success')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to book repair. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  if (view === 'success') {
    return (
      <div className="container-custom py-16">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Repair booked successfully!</h1>
          <p className="mt-2 text-gray-500">
            {bookingNumber ? <>Your booking number is <span className="font-semibold text-gray-900">{bookingNumber}</span>. Save it to track your repair status.</> : 'Our team will contact you shortly to confirm your repair.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {bookingNumber && (
              <Link to={`/repair/track?booking=${encodeURIComponent(bookingNumber)}`} className="btn-primary">
                Track Repair <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            )}
            <button onClick={() => { setView('catalog'); setSelectedService(null); setBookingNumber(''); setForm({ brand: '', model: '', problemDescription: '', appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '' }) }} className="btn-secondary">Book Another Repair</button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'book' && selectedService) {
    return (
      <div className="container-custom py-12">
        <div className="mx-auto max-w-3xl">
          <button onClick={() => { setView('catalog'); setSelectedService(null) }} className="text-sm font-medium text-brand-600 hover:text-brand-700 mb-4">&larr; Back to Services</button>
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50"><Wrench className="h-6 w-6 text-amber-600" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Starting from {formatPrice(selectedService.startingPrice || 0)}
                  {selectedService.estimatedDuration && ` · ${selectedService.estimatedDuration}`}
                  {selectedService.warranty && ` · ${selectedService.warranty} warranty`}
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700">Brand *</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input mt-1" placeholder="e.g. Samsung" required /></div>
                <div><label className="block text-sm font-medium text-gray-700">Model *</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="input mt-1" placeholder="e.g. Galaxy S23" required /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700">Problem Description *</label><textarea value={form.problemDescription} onChange={e => setForm({ ...form, problemDescription: e.target.value })} className="input mt-1" rows={4} placeholder="Describe the issue you're experiencing..." required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700"><Calendar className="inline h-4 w-4 mr-1" />Preferred Date</label><input type="date" value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Preferred Time</label><input value={form.appointmentTime} onChange={e => setForm({ ...form, appointmentTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.pickupRequired} onChange={e => setForm({ ...form, pickupRequired: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                Request pickup service
              </label>
              {form.pickupRequired && <div><label className="block text-sm font-medium text-gray-700">Pickup Address</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} placeholder="Full address for pickup" /></div>}
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700">Final pricing will be confirmed after device diagnosis. Starting price is indicative.</p>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Booking...' : 'Book Repair'}</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <Wrench className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Repair Services</h1>
        <p className="mt-2 text-gray-500">Professional phone repair with genuine parts and warranty</p>
      </div>

      {services.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <div key={service.id} className="card-premium flex flex-col p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50"><Wrench className="h-5 w-5 text-amber-600" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{service.description || 'Professional repair service'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.estimatedDuration || 'Varies'}</span>
                {service.warranty && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {service.warranty}</span>}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Starting from</p>
                    <p className="text-lg font-bold text-brand-600">{formatPrice(service.startingPrice || 0)}</p>
                  </div>
                  <button onClick={() => handleBookService(service)} className="btn-primary !px-4 !py-2 text-sm">
                    Book Repair <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 card p-12 text-center">
          <Wrench className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Repair Services Available</h3>
          <p className="mt-2 text-sm text-gray-500">No repair services are currently listed. Please contact us directly.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">Can&apos;t find what you&apos;re looking for? <button onClick={() => { setView('book'); setSelectedService({ id: '', name: 'General Repair', slug: 'general', startingPrice: 0, isActive: true, sortOrder: 0, compatibleDevices: '' as any, description: null, estimatedDuration: null, warranty: null, createdAt: new Date(), updatedAt: new Date() } as any) }} className="font-medium text-brand-600 hover:text-brand-700">Book a general repair</button></p>
      </div>
    </div>
  )
}
