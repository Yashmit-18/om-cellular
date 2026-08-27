import { useState, useEffect, useCallback, useRef } from 'react'
import { Smartphone, ChevronDown, Check, ArrowRight, DollarSign, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
import { sellRequestService } from '../../services/sellRequest.service'
import { phoneValuationService } from '../../services/phoneValuation.service'
import { formatPrice } from '../../utils'
import type { PhoneCatalogModelEntry } from '../../types'

export default function SellPhonePage() {
  const [step, setStep] = useState(1)
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<PhoneCatalogModelEntry[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState<PhoneCatalogModelEntry | null>(null)
  const [selectedStorage, setSelectedStorage] = useState<{ storage: string; ram: string; baseValue: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const brandDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    condition: 'GOOD', age: '',
    displayCondition: 'no_issues', batteryCondition: 'good',
    cameraCondition: 'good', bodyCondition: 'good',
    accessoriesAvailable: false, originalBill: false, originalBox: false,
    pickupAddress: '', pickupDate: '', pickupTime: '',
  })

  const [estimatedValue, setEstimatedValue] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    phoneCatalogService.getBrands().then(r => {
      setBrands(r.data || [])
      setLoading(false)
    }).catch(() => { setLoading(false); toast.error('Failed to load phone brands') })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) setShowBrandDropdown(false)
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredBrands = brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
  const filteredModels = models.filter(m => m.modelName.toLowerCase().includes(modelSearch.toLowerCase()))

  const handleBrandSelect = useCallback(async (brand: string) => {
    setSelectedBrand(brand)
    setSelectedModel(null)
    setSelectedStorage(null)
    setEstimatedValue(null)
    setBrandSearch(brand)
    setShowBrandDropdown(false)
    setModelSearch('')
    setLoadingModels(true)
    try {
      const r = await phoneCatalogService.getModelsByBrand(brand)
      setModels(r.data || [])
    } catch { toast.error('Failed to load models') } finally { setLoadingModels(false) }
  }, [])

  const handleModelSelect = (model: PhoneCatalogModelEntry) => {
    setSelectedModel(model)
    setModelSearch(model.modelName)
    setShowModelDropdown(false)
  }

  const handleStorageSelect = (variant: { storage: string; ram: string; baseValue: number }) => {
    setSelectedStorage(variant)
    setEstimatedValue(null)
  }

  const calculateValue = useCallback(async () => {
    if (!selectedBrand || !selectedModel || !selectedStorage) return
    setCalculating(true)
    try {
      const r = await phoneValuationService.calculateValuation({
        brand: selectedBrand, model: selectedModel.modelName,
        storage: selectedStorage.storage, ram: selectedStorage.ram,
        condition: form.condition, age: form.age,
        displayCondition: form.displayCondition, batteryCondition: form.batteryCondition,
        cameraCondition: form.cameraCondition, bodyCondition: form.bodyCondition,
        accessoriesAvailable: form.accessoriesAvailable, originalBill: form.originalBill, originalBox: form.originalBox,
      })
      if (r.success) setEstimatedValue(r.data.estimatedValue)
      else toast.error(r.message || 'Could not calculate value')
    } catch { toast.error('Valuation not available for this model. Please proceed with manual request.') }
    finally { setCalculating(false) }
  }, [selectedBrand, selectedModel, selectedStorage, form])

  useEffect(() => {
    if (step === 4 && selectedStorage) calculateValue()
  }, [step, form, selectedStorage, calculateValue])

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !selectedStorage) { toast.error('Please complete all selections'); return }
    setSubmitting(true)
    try {
      await sellRequestService.createSellRequest({
        brand: selectedBrand, model: selectedModel.modelName,
        storage: selectedStorage.storage, ram: selectedStorage.ram,
        ...form, estimatedPrice: estimatedValue,
      })
      toast.success('Sell request submitted successfully!')
      setStep(5)
    } catch { toast.error('Failed to submit request. Please try again.') } finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  return (
    <div className="container-custom py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <DollarSign className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Sell Your Phone</h1>
          <p className="mt-2 text-gray-500">Get the best price for your used phone</p>
        </div>

        {/* Progress Steps */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                s < step ? 'bg-brand-600 text-white' : s === step ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-brand-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="mt-8 card p-8">
          {/* Step 1: Brand */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Brand</h2>
              <p className="mt-1 text-sm text-gray-500">Choose your phone manufacturer</p>
              <div className="relative mt-4" ref={brandDropdownRef}>
                <button onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="input flex items-center justify-between text-left">
                  <span>{selectedBrand || 'Search your phone brand...'}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                </button>
                {showBrandDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="p-2"><input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} className="input !py-2 !text-xs" placeholder="Search brands..." autoFocus /></div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredBrands.map(brand => (
                        <button key={brand} onClick={() => handleBrandSelect(brand)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">{brand.charAt(0)}</div>
                          {brand}
                        </button>
                      ))}
                      {filteredBrands.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">No brands found</p>}
                    </div>
                  </div>
                )}
              </div>
              {selectedBrand && (
                <button onClick={() => setStep(2)} className="btn-primary mt-6 w-full">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Step 2: Model */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Model</h2>
              <p className="mt-1 text-sm text-gray-500">Choose your {selectedBrand} model</p>
              {loadingModels ? (
                <div className="mt-8 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
              ) : (
                <div className="relative mt-4" ref={modelDropdownRef}>
                  <button onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="input flex items-center justify-between text-left">
                    <span>{modelSearch || 'Search your phone model...'}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="p-2"><input value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="input !py-2 !text-xs" placeholder="Search models..." autoFocus /></div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredModels.map(model => (
                          <button key={(model as any).id || (model as any)._id} onClick={() => handleModelSelect(model)}
                            className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50">
                            {model.modelName}
                          </button>
                        ))}
                        {filteredModels.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">No models found</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                {selectedModel && <button onClick={() => setStep(3)} className="btn-primary flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></button>}
              </div>
            </div>
          )}

          {/* Step 3: Storage & Condition */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Storage & Condition</h2>
              <p className="mt-1 text-sm text-gray-500">Choose storage variant and describe condition</p>

              {selectedModel && selectedModel.storageVariants.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Storage Variant *</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedModel.storageVariants.map((v, i) => (
                      <button key={i} onClick={() => handleStorageSelect(v)}
                        className={`rounded-lg border-2 p-3 text-center transition-all ${
                          selectedStorage?.storage === v.storage && selectedStorage?.ram === v.ram
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <p className="font-semibold">{v.storage}</p>
                        {v.ram && <p className="text-xs text-gray-500">{v.ram} RAM</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Overall Condition *</label>
                    <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="input mt-1">
                      <option value="NEW">Brand New</option>
                      <option value="LIKE_NEW">Like New</option>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age of Phone</label>
                    <select value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="input mt-1">
                      <option value="">Select age</option>
                      <option value="less_than_3_months">Less than 3 months</option>
                      <option value="3_to_6_months">3-6 months</option>
                      <option value="6_to_12_months">6-12 months</option>
                      <option value="1_to_2_years">1-2 years</option>
                      <option value="more_than_2_years">More than 2 years</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Display Condition</label>
                    <select value={form.displayCondition} onChange={e => setForm({ ...form, displayCondition: e.target.value })} className="input mt-1">
                      <option value="no_issues">No Issues</option>
                      <option value="minor_scratches">Minor Scratches</option>
                      <option value="cracked">Cracked</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Battery Condition</label>
                    <select value={form.batteryCondition} onChange={e => setForm({ ...form, batteryCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="poor">Poor</option>
                      <option value="replacement">Needs Replacement</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Camera Condition</label>
                    <select value={form.cameraCondition} onChange={e => setForm({ ...form, cameraCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="poor">Poor</option>
                      <option value="not_working">Not Working</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Body Condition</label>
                    <select value={form.bodyCondition} onChange={e => setForm({ ...form, bodyCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="damaged">Damaged</option>
                      <option value="heavily_damaged">Heavily Damaged</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.accessoriesAvailable} onChange={e => setForm({ ...form, accessoriesAvailable: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    Accessories Available
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.originalBill} onChange={e => setForm({ ...form, originalBill: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    Original Bill
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.originalBox} onChange={e => setForm({ ...form, originalBox: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    Original Box
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(4)} disabled={!selectedStorage} className="btn-primary flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* Step 4: Estimated Value & Submit */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>
              <p className="mt-1 text-sm text-gray-500">Review your phone details and estimated value</p>

              <div className="mt-6 rounded-xl bg-gray-50 p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Brand:</span> <span className="ml-2 font-medium">{selectedBrand}</span></div>
                  <div><span className="text-gray-500">Model:</span> <span className="ml-2 font-medium">{selectedModel?.modelName}</span></div>
                  <div><span className="text-gray-500">Storage:</span> <span className="ml-2 font-medium">{selectedStorage?.storage}</span></div>
                  {selectedStorage?.ram && <div><span className="text-gray-500">RAM:</span> <span className="ml-2 font-medium">{selectedStorage.ram}</span></div>}
                  <div><span className="text-gray-500">Condition:</span> <span className="ml-2 font-medium">{form.condition.replace('_', ' ')}</span></div>
                </div>
              </div>

              {calculating ? (
                <div className="mt-6 flex items-center justify-center gap-2 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  <span className="text-sm text-gray-500">Calculating estimated value...</span>
                </div>
              ) : estimatedValue !== null ? (
                <div className="mt-6 rounded-xl border-2 border-brand-200 bg-brand-50 p-6 text-center">
                  <p className="text-sm text-gray-600">Estimated Value</p>
                  <p className="mt-1 text-3xl font-bold text-brand-700">{formatPrice(estimatedValue)}</p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <Info className="h-3 w-3" /> Final value may vary after physical inspection
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-sm text-amber-700">Valuation not available for this model yet. Admin will review and provide an offer.</p>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Pickup Address</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} placeholder="Full address for pickup (optional)" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="block text-sm font-medium text-gray-700">Preferred Pickup Date</label><input type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} className="input mt-1" /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Preferred Pickup Time</label><input value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Submitting...' : 'Submit Sell Request'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">Request Submitted!</h2>
              <p className="mt-2 text-gray-500">We&apos;ll evaluate your phone and get back to you soon.</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => { setStep(1); setSelectedBrand(''); setSelectedModel(null); setSelectedStorage(null); setEstimatedValue(null); setBrandSearch(''); setModelSearch(''); }} className="btn-secondary">Sell Another Phone</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
