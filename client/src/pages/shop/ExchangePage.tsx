import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRightLeft, ChevronDown, Check, ArrowRight, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { exchangeRequestService } from '../../services/exchangeRequest.service'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
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
    oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '',
    newVariantId: '',
  })
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    try {
      await exchangeRequestService.createExchangeRequest({
        oldBrand: selectedBrand, oldModel: selectedModel.modelName,
        oldStorage: form.oldStorage, oldRam: form.oldRam,
        oldCondition: form.oldCondition, oldDeviceDetails: form.oldDeviceDetails,
        newVariantId: form.newVariantId,
      })
      toast.success('Exchange request submitted!')
      setForm({ oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '', newVariantId: '' })
      setSelectedBrand(''); setSelectedModel(null); setBrandSearch(''); setModelSearch('')
    } catch { toast.error('Failed to submit request') } finally { setLoading(false) }
  }

  return (
    <div className="container-custom py-12">
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
                        <button key={b} type="button" onClick={() => handleBrandSelect(b)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
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
                        <button key={(m as any).id || (m as any)._id} type="button" onClick={() => { setSelectedModel(m); setModelSearch(m.modelName); setShowModelDropdown(false) }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">{m.modelName}</button>
                      ))}
                      {filteredModels.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">{loadingModels ? 'Loading...' : 'No models found'}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700">Storage</label><input value={form.oldStorage} onChange={e => setForm({ ...form, oldStorage: e.target.value })} className="input mt-1" placeholder="e.g. 128GB" /></div>
              <div><label className="block text-sm font-medium text-gray-700">RAM</label><input value={form.oldRam} onChange={e => setForm({ ...form, oldRam: e.target.value })} className="input mt-1" placeholder="e.g. 6GB" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Condition *</label>
                <select value={form.oldCondition} onChange={e => setForm({ ...form, oldCondition: e.target.value })} className="input mt-1">
                  <option value="NEW">Brand New</option><option value="LIKE_NEW">Like New</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="FAIR">Fair</option>
                </select>
              </div>
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
