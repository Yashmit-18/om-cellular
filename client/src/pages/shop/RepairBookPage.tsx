import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Calendar, ArrowRight, Check, Clock, Shield, Info, ChevronDown, Smartphone, Search as SearchIcon, PhoneCall, Store, Truck, ExternalLink, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { repairService } from '../../services/repair.service'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
import { settingsService } from '../../services/settings.service'
import { formatPrice, googleMapsSearchUrl, storeAddressText } from '../../utils'
import type { RepairService } from '../../types'

export default function RepairBookPage() {
  const [services, setServices] = useState<RepairService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<RepairService | null>(null)
  const [view, setView] = useState<'catalog' | 'book' | 'success'>('catalog')
  const [bookingNumber, setBookingNumber] = useState('')
  const [form, setForm] = useState({
    phone: '', brand: '', model: '', problemDescription: '',
    appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '',
  })
  const [serviceMode, setServiceMode] = useState<'STORE_DROP' | 'DOORSTEP_PICKUP'>('STORE_DROP')
  const [pickupFee, setPickupFee] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<{ modelName: string; image?: string }[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    repairService.getRepairServices().then(r => {
      const data = r.data || r.data?.data || []
      setServices(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    settingsService.getSettings().then(r => {
      const s = r.data
      const map: Record<string, string> = {}
      if (Array.isArray(s)) s.forEach((item: any) => { map[item.key] = item.value })
      if (typeof s === 'object') Object.assign(map, s)
      setPickupFee(parseInt(map.repair_pickup_drop_fee || '0', 10) || 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    phoneCatalogService.getBrands().then(r => setBrands(Array.isArray(r.data) ? r.data.filter((b: any) => typeof b === 'string') : [])).catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandDropdown(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModelDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredBrands = brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
  const filteredModels = models.filter(m => m.modelName.toLowerCase().includes(modelSearch.toLowerCase()))

  const handleBrandSelect = useCallback(async (brand: string) => {
    setSelectedBrand(brand); setSelectedModel(''); setForm(f => ({ ...f, brand, model: '' }))
    setBrandSearch(brand); setShowBrandDropdown(false); setModelSearch('')
    setLoadingModels(true)
    try {
      const r = await phoneCatalogService.getModelsByBrand(brand)
      const data = Array.isArray(r.data) ? r.data : []
      setModels(data)
    } catch {
      setModels([])
      toast.error('Failed to load models')
    } finally { setLoadingModels(false) }
  }, [])

  const handleBookService = (service: RepairService) => {
    setSelectedService(service)
    setView('book')
  }

  const goGeneral = () => {
    const general = services.find(s => s.slug === 'general-repair') || {
      id: '', slug: 'general', name: 'General Repair', description: 'Not sure what’s wrong? Book a general diagnosis.', startingPrice: 0,
    }
    setSelectedService(general as unknown as RepairService)
    setView('book')
  }

  const resetBooking = () => {
    setView('catalog'); setSelectedService(null); setBookingNumber('')
    setSelectedBrand(''); setSelectedModel(''); setBrandSearch(''); setModelSearch(''); setModels([])
    setServiceMode('STORE_DROP')
    setForm({ phone: '', brand: '', model: '', problemDescription: '', appointmentDate: '', appointmentTime: '', pickupRequired: false, pickupAddress: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = form.phone.replace(/[^0-9]/g, '')
    if (!digits || digits.length < 10) { toast.error('Please enter a valid contact phone number'); return }
    if (!form.brand || !form.model) { toast.error('Please select your phone brand and model'); return }
    if (!form.problemDescription.trim()) { toast.error('Please describe the issue you’re facing'); return }
    if (serviceMode === 'DOORSTEP_PICKUP' && !form.pickupAddress.trim()) { toast.error('Please enter your pickup address'); return }
    setSubmitting(true)
    try {
      const serviceId = (selectedService as any)?._id || selectedService?.id || undefined
      const res = await repairService.createRepair({ serviceId, ...form, serviceMode })
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
          <p className="mt-2 text-gray-500">Save your booking number to track your repair status.</p>

          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-6 text-left text-sm">
            {bookingNumber && (
              <div className="flex justify-between border-b border-gray-100 pb-3"><span className="text-gray-500">Booking number</span><span className="font-bold text-gray-900">{bookingNumber}</span></div>
            )}
            <div className="mt-3 flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium text-gray-900">{selectedService?.name || 'General Repair'}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-gray-500">Device</span><span className="font-medium text-gray-900">{form.brand} {form.model}</span></div>
            {selectedService?.startingPrice ? (
              <div className="mt-2 flex justify-between"><span className="text-gray-500">Starting from</span><span className="font-medium text-brand-700">{formatPrice(selectedService.startingPrice)}</span></div>
            ) : null}
            <div className="mt-2 flex justify-between"><span className="text-gray-500">Contact phone</span><span className="font-medium text-gray-900">{form.phone}</span></div>
            {serviceMode === 'DOORSTEP_PICKUP' && (
              <>
                <div className="mt-2 flex justify-between"><span className="text-gray-500">Service mode</span><span className="font-medium text-gray-900">Home Pickup &amp; Drop</span></div>
                {pickupFee > 0 && (
                  <div className="mt-2 flex justify-between"><span className="text-gray-500">Pickup fee</span><span className="font-medium text-brand-700">{formatPrice(pickupFee)}</span></div>
                )}
                {form.pickupAddress && (
                  <div className="mt-2 border-t border-gray-100 pt-2"><span className="text-gray-500">Pickup address</span><p className="mt-0.5 font-medium text-gray-900">{form.pickupAddress}</p></div>
                )}
              </>
            )}
            {serviceMode === 'STORE_DROP' && (
              <div className="mt-2 flex justify-between"><span className="text-gray-500">Service mode</span><span className="font-medium text-gray-900">Store Drop-off</span></div>
            )}
          </div>

          {serviceMode === 'STORE_DROP' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 p-4 text-left">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-medium text-gray-800">Drop your device at our store</p>
                <p className="mt-0.5 text-xs text-gray-600">{storeAddressText()}</p>
                <a href={googleMapsSearchUrl()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  Get directions <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400">Final pricing is confirmed only after diagnosis of your device.</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {bookingNumber && (
              <Link to={`/repair/track?booking=${encodeURIComponent(bookingNumber)}`} className="btn-primary">
                Track Repair <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            )}
            <button onClick={resetBooking} className="btn-secondary">Book Another Repair</button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'book' && selectedService) {
    return (
      <div className="container-custom py-12 pb-24">
        <div className="mx-auto max-w-3xl">
          <button onClick={resetBooking} className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700">&larr; Back to Services</button>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50"><Wrench className="h-6 w-6 text-amber-600" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedService.startingPrice ? `Starting from ${formatPrice(selectedService.startingPrice)}` : 'Price after free diagnosis'}
                  {selectedService.estimatedDuration && ` · ${selectedService.estimatedDuration}`}
                  {selectedService.warranty && ` · ${selectedService.warranty} warranty`}
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative" ref={brandRef}>
                  <label className="block text-sm font-medium text-gray-700">Brand *</label>
                  <button type="button" onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                    className="input mt-1 flex items-center justify-between text-left">
                    <span className={selectedBrand ? '' : 'text-gray-400'}>{selectedBrand || 'Select brand...'}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                  {showBrandDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="p-2"><div className="relative"><SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" /><input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} className="input !py-1.5 !pl-8 !text-xs" placeholder="Search..." autoFocus /></div></div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredBrands.map(b => (
                          <button key={b} type="button" onClick={() => handleBrandSelect(b)} className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-600">{b.charAt(0)}</div>{b}
                          </button>
                        ))}
                        {filteredBrands.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No brands found</p>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" ref={modelRef}>
                  <label className="block text-sm font-medium text-gray-700">Model *</label>
                  <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)} disabled={!selectedBrand}
                    className="input mt-1 flex items-center justify-between text-left disabled:opacity-50">
                    <span className={selectedModel ? '' : 'text-gray-400'}>{selectedModel || 'Select model...'}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="p-2"><div className="relative"><SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" /><input value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="input !py-1.5 !pl-8 !text-xs" placeholder="Search..." autoFocus /></div></div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingModels && <p className="px-3 py-2 text-xs text-gray-500">Loading...</p>}
                        {filteredModels.map(m => (
                          <button key={m.modelName} type="button" onClick={() => { setSelectedModel(m.modelName); setForm(f => ({ ...f, model: m.modelName })); setModelSearch(m.modelName); setShowModelDropdown(false) }} className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                            {m.image
                              ? <img src={m.image} alt="" className="h-6 w-6 shrink-0 rounded object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              : <Smartphone className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                            <span className="truncate">{m.modelName}</span>
                          </button>
                        ))}
                        {!loadingModels && filteredModels.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No models found</p>}
                        {!selectedBrand && <p className="px-3 py-2 text-xs text-gray-400">Select a brand first</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact phone number *</label>
                <div className="relative mt-1">
                  <PhoneCall className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel"
                    className="input !pl-10" placeholder="e.g. 9876543210" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Problem Description *</label>
                <textarea value={form.problemDescription} onChange={e => setForm({ ...form, problemDescription: e.target.value })} className="input mt-1" rows={4} placeholder="Describe the issue you're experiencing..." required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700"><Calendar className="inline h-4 w-4 mr-1" />Preferred Date</label><input type="date" value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} className="input mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Preferred Time</label><input value={form.appointmentTime} onChange={e => setForm({ ...form, appointmentTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">How would you like to service your phone?</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${serviceMode === 'STORE_DROP' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="serviceMode" checked={serviceMode === 'STORE_DROP'} onChange={() => { setServiceMode('STORE_DROP'); setForm(f => ({ ...f, pickupRequired: false })) }} className="mt-1" />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900"><Store className="h-4 w-4 text-brand-600" /> Drop at Store</p>
                      <p className="mt-0.5 text-xs text-gray-500">Bring your device to our store — no extra fee</p>
                    </div>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${serviceMode === 'DOORSTEP_PICKUP' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="serviceMode" checked={serviceMode === 'DOORSTEP_PICKUP'} onChange={() => { setServiceMode('DOORSTEP_PICKUP'); setForm(f => ({ ...f, pickupRequired: true })) }} className="mt-1" />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900"><Truck className="h-4 w-4 text-brand-600" /> Pickup &amp; Drop at Home</p>
                      <p className="mt-0.5 text-xs text-gray-500">{pickupFee > 0 ? `We pick up & drop off your device for ${formatPrice(pickupFee)}` : 'We pick up & drop off your device'}</p>
                    </div>
                  </label>
                </div>
              </div>
              {serviceMode === 'DOORSTEP_PICKUP' && (
                <div><label className="block text-sm font-medium text-gray-700">Pickup Address *</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} placeholder="Full address for pickup" required /></div>
              )}
              {serviceMode === 'STORE_DROP' && (
                <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Drop-off location: {storeAddressText()}</p>
                    <a href={googleMapsSearchUrl()} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                      Get directions on Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
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
    <div className="bg-gradient-to-b from-amber-50/40 via-white to-white">
      <div className="container-custom py-12 pb-24">
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
                    <p className="mt-1 text-sm text-gray-500">{service.description || 'Professional repair service'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.estimatedDuration || 'Varies'}</span>
                  {service.warranty && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {service.warranty}</span>}
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{service.startingPrice ? 'Starting from' : 'Diagnosis'}</p>
                      <p className="text-lg font-bold text-brand-600">{service.startingPrice ? formatPrice(service.startingPrice) : 'Free'}</p>
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
          <p className="text-sm text-gray-500">Can&apos;t find what you&apos;re looking for? <button onClick={goGeneral} className="font-medium text-brand-600 hover:text-brand-700">Book a general repair</button></p>
        </div>
      </div>
    </div>
  )
}