import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, ChevronDown, Check, ArrowRight, Smartphone, PhoneCall } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { exchangeRequestService } from '../../services/exchangeRequest.service'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
import { isValidImei } from '../../utils'
import type { ProductWithVariant, PhoneCatalogModelEntry } from '../../types'

export default function ExchangePage() {
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<PhoneCatalogModelEntry[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState<PhoneCatalogModelEntry | null>(null)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    phone: '', alternatePhone: '', oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '',
    newVariantId: '', oldImei: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [requestNumber, setRequestNumber] = useState('')

  useEffect(() => {
    phoneCatalogService.getBrands().then(r => setBrands(r.data || [])).catch(() => {})
    api.get('/products?isActive=true&limit=100').then(r => setProducts(r.data.data || [])).catch(() => {})
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
    setSelectedBrand(brand); setSelectedModel(null)
    setBrandSearch(brand); setShowBrandDropdown(false); setModelSearch('')
    setLoadingModels(true)
    try { const r = await phoneCatalogService.getModelsByBrand(brand); setModels(r.data || []) }
    catch { toast.error('Failed to load models') } finally { setLoadingModels(false) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrand || !selectedModel) { toast.error('Please select your old phone brand and model'); return }
    const digits = form.phone.replace(/[^0-9]/g, '')
    if (!digits || digits.length < 10) { toast.error('Please enter a valid contact phone number'); return }
    if (form.alternatePhone && form.alternatePhone.replace(/[^0-9]/g, '').length < 10) { toast.error('Alternate phone must be a valid 10-digit number'); return }
    const oldImei = form.oldImei.replace(/\s+/g, '')
    if (oldImei && !isValidImei(oldImei)) { toast.error('Please enter a valid 15-digit IMEI number (Settings → About phone)'); return }
    setLoading(true)
    try {
      const res = await exchangeRequestService.createExchangeRequest({
        oldBrand: selectedBrand, oldModel: selectedModel.modelName,
        oldStorage: form.oldStorage, oldRam: form.oldRam,
        oldCondition: form.oldCondition, oldDeviceDetails: form.oldDeviceDetails,
        oldImei: oldImei || undefined,
        newVariantId: form.newVariantId, phone: form.phone,
        alternatePhone: form.alternatePhone || undefined,
      })
      setRequestNumber(res?.data?.requestNumber || res?.requestNumber || '')
      setSuccess(true)
      toast.success('Exchange request submitted!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request')
    } finally { setLoading(false) }
  }

  const resetAll = () => {
    setSuccess(false); setRequestNumber('')
    setForm({ phone: '', alternatePhone: '', oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '', newVariantId: '', oldImei: '' })
    setSelectedBrand(''); setSelectedModel(null); setBrandSearch(''); setModelSearch('')
  }

  if (success) {
    return (
      <div className="container-custom py-16">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Exchange request submitted!</h1>
          <p className="mt-2 text-gray-500">Our team will evaluate your {selectedBrand} {selectedModel?.modelName} and get back to you with the best trade-in value.</p>
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-6 text-left text-sm">
            {requestNumber && (
              <div className="flex justify-between border-b border-gray-100 pb-3"><span className="text-gray-500">Reference number</span><span className="font-bold text-gray-900">{requestNumber}</span></div>
            )}
            <div className="mt-3 flex justify-between"><span className="text-gray-500">Trade-in device</span><span className="font-medium text-gray-900">{selectedBrand} {selectedModel?.modelName}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-gray-500">Condition</span><span className="font-medium text-gray-900 capitalize">{form.oldCondition.toLowerCase()}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-gray-500">Contact phone</span><span className="font-medium text-gray-900">{form.phone}</span></div>
            {form.alternatePhone && <div className="mt-2 flex justify-between"><span className="text-gray-500">Alternate phone</span><span className="font-medium text-gray-900">{form.alternatePhone}</span></div>}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={resetAll} className="btn-primary">Submit Another Exchange</button>
            <Link to="/buy-phones" className="btn-secondary">Browse New Phones</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-12 pb-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
            <ArrowRightLeft className="h-7 w-7 text-purple-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Exchange Your Phone</h1>
          <p className="mt-2 text-gray-500">Trade in your old phone and get a great deal on a new one</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 card p-8 space-y-6">
          {/* Old Phone Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Old Phone</h2>
            <p className="mt-1 text-sm text-gray-500">Select your current phone details</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="relative" ref={brandRef}>
                <label className="block text-sm font-medium text-gray-700">Brand *</label>
                <button type="button" onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="input mt-1 flex items-center justify-between text-left">
                  <span className={selectedBrand ? '' : 'text-gray-400'}>{selectedBrand || 'Select brand...'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
                {showBrandDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="p-2"><input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} className="input !py-2 !text-xs" placeholder="Search..." autoFocus /></div>
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
                  <span className={selectedModel ? '' : 'text-gray-400'}>{modelSearch || 'Select model...'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
                {showModelDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="p-2"><input value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="input !py-2 !text-xs" placeholder="Search..." autoFocus /></div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredModels.map(m => (
                        <button key={(m as any).id || (m as any)._id} type="button" onClick={() => { setSelectedModel(m); setModelSearch(m.modelName); setShowModelDropdown(false) }} className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                          {m.image
                            ? <img src={m.image} alt="" className="h-6 w-6 shrink-0 rounded object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <Smartphone className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                          <span className="truncate">{m.modelName}</span>
                        </button>
                      ))}
                      {filteredModels.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">{loadingModels ? 'Loading...' : 'No models found'}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Contact phone number *</label>
              <div className="relative mt-1">
                <PhoneCall className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" className="input !pl-10" placeholder="e.g. 9876543210" required />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Alternate phone <span className="text-gray-400">(optional)</span></label>
              <div className="relative mt-1">
                <PhoneCall className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={form.alternatePhone} onChange={e => setForm({ ...form, alternatePhone: e.target.value })} inputMode="tel" className="input !pl-10" placeholder="Another contact number (optional)" />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">IMEI number <span className="text-gray-400">(optional, recommended)</span></label>
                <input value={form.oldImei} onChange={e => setForm({ ...form, oldImei: e.target.value })} inputMode="numeric" className="input mt-1" placeholder="15-digit IMEI (Settings → About phone)" />
                {form.oldImei.replace(/\s+/g, '') && (isValidImei(form.oldImei)
                  ? <p className="mt-1 text-xs text-green-600">Valid IMEI — helps us verify ownership and speed up your offer.</p>
                  : <p className="mt-1 text-xs text-red-500">Enter a valid 15-digit IMEI to verify this device.</p>)}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Condition *</label>
                <select value={form.oldCondition} onChange={e => setForm({ ...form, oldCondition: e.target.value })} className="input mt-1">
                  <option value="NEW">Brand New</option><option value="LIKE_NEW">Like New</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="FAIR">Fair</option>
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700">Storage</label><input value={form.oldStorage} onChange={e => setForm({ ...form, oldStorage: e.target.value })} className="input mt-1" placeholder="e.g. 128GB" /></div>
              <div><label className="block text-sm font-medium text-gray-700">RAM</label><input value={form.oldRam} onChange={e => setForm({ ...form, oldRam: e.target.value })} className="input mt-1" placeholder="e.g. 6GB" /></div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Device Details / Issues</label>
              <textarea value={form.oldDeviceDetails} onChange={e => setForm({ ...form, oldDeviceDetails: e.target.value })} className="input mt-1" rows={2} placeholder="Any scratches, cracks, or issues..." />
            </div>
          </div>

          {/* New Phone Section */}
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">New Phone You Want</h2>
            <p className="mt-1 text-sm text-gray-500">Optionally select a product you&apos;re interested in</p>
            <div className="mt-4">
              <select value={form.newVariantId} onChange={e => setForm({ ...form, newVariantId: e.target.value })} className="input">
                <option value="">Browse products later...</option>
                {products.map(p => <option key={p.id} value={p.variants?.[0]?.id || ''}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <ArrowRight className="mr-2 h-4 w-4" /> {loading ? 'Submitting...' : 'Submit Exchange Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
