import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Smartphone, ChevronRight, ChevronLeft, Check, Search as SearchIcon,
  DollarSign, Info, Wrench, ShieldCheck, ArrowRight, Package, CircleCheck,
  BatteryMedium, Camera, MonitorSmartphone, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { phoneCatalogService } from '../../services/phoneCatalog.service'
import { sellRequestService } from '../../services/sellRequest.service'
import { phoneValuationService } from '../../services/phoneValuation.service'
import { formatPrice } from '../../utils'
import type { PhoneCatalogModelEntry } from '../../types'

const STEPS = ['Select Phone', 'Phone Details', 'Condition', 'Get Estimate', 'Submit Request']

const BRAND_INITIALS: Record<string, string> = {
  Apple: 'A', Samsung: 'S', OnePlus: '1+', Xiaomi: 'X', Redmi: 'R',
  POCO: 'P', Realme: 'R', Vivo: 'V', OPPO: 'O', Motorola: 'M',
  Nothing: 'N', Google: 'G', iQOO: 'i', Infinix: 'I', Tecno: 'T',
  Lava: 'L', Nokia: 'N', Honor: 'H', Asus: 'A',
}

type LoadState = 'idle' | 'loading' | 'error' | 'empty' | 'ready'

export default function SellPhonePage() {
  const [step, setStep] = useState(1)
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<PhoneCatalogModelEntry[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState<PhoneCatalogModelEntry | null>(null)
  const [selectedStorage, setSelectedStorage] = useState<{ storage: string; ram: string; baseValue: number } | null>(null)
  const [brandState, setBrandState] = useState<LoadState>('loading')
  const [modelState, setModelState] = useState<LoadState>('idle')
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')

  const [form, setForm] = useState({
    phone: '', condition: 'GOOD', age: '',
    displayCondition: 'no_issues', batteryCondition: 'good',
    cameraCondition: 'good', bodyCondition: 'good',
    accessoriesAvailable: false, originalBill: false, originalBox: false,
    pickupAddress: '', pickupDate: '', pickupTime: '',
  })

  const [estimatedValue, setEstimatedValue] = useState<number | null>(null)
  const [valuationState, setValuationState] = useState<LoadState>('idle')
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectingBrand, setSelectingBrand] = useState(false)
  const [requestNumber, setRequestNumber] = useState('')

  useEffect(() => {
    phoneCatalogService.getBrands()
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : []
        const brandsArr = data.map((b: any) => typeof b === 'string' ? b : (b.name || b.brandName || '')).filter(Boolean).sort()
        setBrands(brandsArr)
        setBrandState(brandsArr.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setBrandState('error'))
  }, [])

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase()
    if (!q) return brands
    return brands.filter(b => b.toLowerCase().includes(q))
  }, [brands, brandSearch])

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    if (!q) return models
    return models.filter(m => m.modelName.toLowerCase().includes(q))
  }, [models, modelSearch])

  const handleBrandSelect = useCallback(async (brand: string) => {
    setSelectedBrand(brand)
    setSelectingBrand(true)
    setSelectedModel(null)
    setSelectedStorage(null)
    setEstimatedValue(null)
    setValuationState('idle')
    setBrandSearch('')
    setModelSearch('')
    setModelState('loading')
    try {
      const r = await phoneCatalogService.getModelsByBrand(brand)
      const data = Array.isArray(r.data) ? r.data : []
      setModels(data)
      setModelState(data.length === 0 ? 'empty' : 'ready')
      setStep(2)
    } catch {
      setModelState('error')
      setModels([])
    } finally {
      setSelectingBrand(false)
    }
  }, [])

  const handleModelSelect = (model: PhoneCatalogModelEntry) => {
    setSelectedModel(model)
    setSelectedStorage(null)
    setEstimatedValue(null)
    setValuationState('idle')
    setModelSearch('')
  }

  const handleStorageSelect = useCallback((variant: { storage: string; ram: string; baseValue: number }) => {
    setSelectedStorage(variant)
    setEstimatedValue(null)
    setValuationState('idle')
  }, [])

  const calculateValue = useCallback(async () => {
    if (!selectedBrand || !selectedModel || !selectedStorage) return
    setCalculating(true)
    setValuationState('loading')
    try {
      const r = await phoneValuationService.calculateValuation({
        brand: selectedBrand, model: selectedModel.modelName,
        storage: selectedStorage.storage, ram: selectedStorage.ram,
        condition: form.condition, age: form.age,
        displayCondition: form.displayCondition, batteryCondition: form.batteryCondition,
        cameraCondition: form.cameraCondition, bodyCondition: form.bodyCondition,
        accessoriesAvailable: form.accessoriesAvailable, originalBill: form.originalBill, originalBox: form.originalBox,
      })
      if (r.success) {
        setEstimatedValue(r.data.estimatedValue)
        setValuationState('ready')
      } else {
        setValuationState('empty')
      }
    } catch {
      setValuationState('empty')
    } finally {
      setCalculating(false)
    }
  }, [selectedBrand, selectedModel, selectedStorage, form])

  useEffect(() => {
    if (step === 4 && selectedStorage) calculateValue()
  }, [step, form, selectedStorage, calculateValue])

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !selectedStorage) { toast.error('Please complete all selections'); return }
    if (!form.phone.trim() || form.phone.replace(/[^0-9]/g, '').length < 10) {
      toast.error('Please enter a valid contact phone number')
      return
    }
    setSubmitting(true)
    try {
      const response = await sellRequestService.createSellRequest({
        brand: selectedBrand, model: selectedModel.modelName,
        storage: selectedStorage.storage, ram: selectedStorage.ram,
        ...form, estimatedPrice: estimatedValue ?? undefined,
      })
      if (response && response.success === false) {
        throw new Error(response.message)
      }
      const number = response?.data?.requestNumber || response?.requestNumber || ''
      setRequestNumber(number)
      toast.success('Sell request submitted successfully!')
      setStep(5)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request. Please try again.')
    } finally { setSubmitting(false) }
  }

  const resetAll = () => {
    setStep(1)
    setSelectedBrand(''); setSelectedModel(null); setSelectedStorage(null)
    setEstimatedValue(null); setValuationState('idle')
    setRequestNumber('')
    setBrandSearch(''); setModelSearch('')
    setForm({ phone: '', condition: 'GOOD', age: '', displayCondition: 'no_issues', batteryCondition: 'good', cameraCondition: 'good', bodyCondition: 'good', accessoriesAvailable: false, originalBill: false, originalBox: false, pickupAddress: '', pickupDate: '', pickupTime: '' })
  }

  const brandOptions = selectedModel?.storageVariants || []

  return (
    <div className="bg-gradient-to-b from-brand-50/40 via-white to-white">
      <div className="container-custom py-8 md:py-14">
        {/* Page header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <DollarSign className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Sell Your Phone</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">Get the best value for your used phone. Transparent evaluation with no hidden charges.</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[280px_1fr]">
          {/* LEFT: Stepper */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ol className="relative space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-5">
              {STEPS.map((label, i) => {
                const n = i + 1
                const active = n === step
                const done = n < step
                return (
                  <li key={label}>
                    <button
                      onClick={() => n < step && setStep(n)}
                      disabled={n > step}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${n > step ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'} ${active ? 'bg-brand-50' : ''}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {done ? <Check className="h-4 w-4" /> : n}
                      </span>
                      <span className={`text-sm font-medium ${active ? 'text-brand-700' : 'text-gray-600'}`}>{label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="mt-4 hidden gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 lg:flex">
              <ShieldCheck className="h-6 w-6 shrink-0 text-brand-600" />
              <p className="text-xs text-gray-600">Your valuation is calculated server-side by our trusted pricing engine.</p>
            </div>
          </aside>

          {/* RIGHT: Main content card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
            {/* Step title */}
            <div className="border-b border-gray-100 pb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {step === 1 && 'Select phone brand'}
                {step === 2 && `Choose your ${selectedBrand} model`}
                {step === 3 && 'Storage & condition'}
                {step === 4 && 'Your estimate'}
                {step === 5 && 'All done'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {step === 1 && 'Search and select the brand of the phone you want to sell.'}
                {step === 2 && 'Pick the exact model of your device.'}
                {step === 3 && 'Select storage variant and describe your phone condition.'}
                {step === 4 && 'Review details and get your estimated value.'}
                {step === 5 && 'We’ll reach out to you shortly.'}
              </p>
            </div>

            {/* STEP 1 — BRAND */}
            {step === 1 && (
              <div className="pt-6">
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    placeholder="Search brands..."
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="mt-5">
                  {brandState === 'loading' && (
                    <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span className="text-sm">Loading brands...</span>
                    </div>
                  )}

                  {brandState === 'error' && (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500"><Wrench className="h-6 w-6" /></div>
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Unable to load brands</h3>
                      <p className="mt-1 text-sm text-gray-500">Please try again in a moment.</p>
                      <button onClick={() => { setBrandState('loading'); phoneCatalogService.getBrands().then(r => { const d = Array.isArray(r.data) ? r.data : []; const b = d.map((x: any) => typeof x === 'string' ? x : (x.name || x.brandName || '')).filter(Boolean).sort(); setBrands(b); setBrandState(b.length === 0 ? 'empty' : 'ready') }).catch(() => setBrandState('error')) }} className="btn-primary mt-5">Retry</button>
                    </div>
                  )}

                  {brandState === 'empty' && (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Smartphone className="h-6 w-6" /></div>
                      <h3 className="mt-4 text-base font-semibold text-gray-900">No phone brands yet</h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Our phone catalog is being set up. Please check back soon or contact us for an evaluation.</p>
                      <Link to="/contact" className="btn-secondary mt-5">Contact Us</Link>
                    </div>
                  )}

                  {brandState === 'ready' && (
                    <>
                      {filteredBrands.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-500">No brands match your search.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2">
                          {filteredBrands.map(brand => (
                            <button
                              key={brand}
                              onClick={() => handleBrandSelect(brand)}
                              disabled={selectingBrand}
                              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-all hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm disabled:cursor-wait disabled:opacity-60"
                            >
                              <span className="flex items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">{BRAND_INITIALS[brand] || brand.charAt(0)}</span>
                                <span className="font-medium text-gray-900">{brand}</span>
                              </span>
                              {selectingBrand && selectedBrand === brand ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">Back to home</Link>
                </div>
              </div>
            )}

            {/* STEP 2 — MODEL */}
            {step === 2 && (
              <div className="pt-6">
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    placeholder={`Search ${selectedBrand} models...`}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="mt-5">
                  {modelState === 'loading' && (
                    <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span className="text-sm">Loading models...</span>
                    </div>
                  )}

                  {modelState === 'error' && (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500"><Wrench className="h-6 w-6" /></div>
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Unable to load models</h3>
                      <button onClick={() => handleBrandSelect(selectedBrand)} className="btn-secondary mt-5">Retry</button>
                    </div>
                  )}

                  {modelState === 'empty' && (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Smartphone className="h-6 w-6" /></div>
                      <h3 className="mt-4 text-base font-semibold text-gray-900">No models configured for {selectedBrand}</h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">This brand’s models haven’t been added yet. Contact us for a manual evaluation.</p>
                      <Link to="/contact" className="btn-secondary mt-5">Contact Us</Link>
                    </div>
                  )}

                  {modelState === 'ready' && (
                    <>
                      {filteredModels.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-500">No models match your search.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {filteredModels.map(model => (
                            <button
                              key={(model as any).id || (model as any)._id || model.slug}
                              onClick={() => handleModelSelect(model)}
                              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-all hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm"
                            >
                              <span className="flex items-center gap-3">
                                {model.image
                                  ? <img src={model.image} alt={`${model.modelName}`} className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 object-contain" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-brand-600"><Smartphone className="h-5 w-5" /></span>}
                                <span className="font-medium text-gray-900">{model.modelName}</span>
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
                  <button onClick={() => setStep(1)} className="btn-secondary"><ChevronLeft className="mr-1 h-4 w-4" /> Back</button>
                  {selectedModel && (
                    <button onClick={() => setStep(3)} className="btn-primary">Continue <ArrowRight className="ml-1 h-4 w-4" /></button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3 — STORAGE + CONDITION */}
            {step === 3 && (
              <div className="pt-6 space-y-7">
                {/* Storage variants */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Layers className="h-4 w-4 text-brand-600" /> Select storage & RAM variant</h3>
                  {brandOptions.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {brandOptions.map((v, i) => (
                        <button
                          key={i}
                          onClick={() => handleStorageSelect(v)}
                          className={`rounded-xl border-2 p-3 text-center transition-all ${selectedStorage?.storage === v.storage && selectedStorage?.ram === v.ram ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <p className="font-semibold text-gray-900">{v.storage}</p>
                          {v.ram && <p className="mt-0.5 text-xs text-gray-500">{v.ram}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No storage variants configured for this model.</p>
                  )}
                </section>

                {/* Condition */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><CircleCheck className="h-4 w-4 text-brand-600" /> Overall condition</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { value: 'EXCELLENT', label: 'Excellent', desc: 'Minimal signs of use' },
                      { value: 'GOOD', label: 'Good', desc: 'Normal signs of use' },
                      { value: 'FAIR', label: 'Fair', desc: 'Visible scratches or wear' },
                      { value: 'POOR', label: 'Poor', desc: 'Heavy wear or damage' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setForm({ ...form, condition: opt.value })}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${form.condition === opt.value ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <p className="font-semibold text-gray-900">{opt.label}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Age */}
                <section className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age of phone</label>
                    <select value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="input mt-1">
                      <option value="">Select age</option>
                      <option value="less_than_3_months">Less than 3 months</option>
                      <option value="3_to_6_months">3-6 months</option>
                      <option value="6_to_12_months">6-12 months</option>
                      <option value="1_to_2_years">1-2 years</option>
                      <option value="more_than_2_years">More than 2 years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">With original bill & box</label>
                    <div className="mt-1 flex gap-4">
                      {[['accessoriesAvailable', 'Accessories'], ['originalBill', 'Original Bill'], ['originalBox', 'Original Box']].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" checked={Boolean((form as any)[key])} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Detail conditions */}
                <section className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><MonitorSmartphone className="h-4 w-4 text-gray-400" /> Display condition</label>
                    <select value={form.displayCondition} onChange={e => setForm({ ...form, displayCondition: e.target.value })} className="input mt-1">
                      <option value="no_issues">No Issues</option>
                      <option value="minor_scratches">Minor Scratches</option>
                      <option value="cracked">Cracked</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><BatteryMedium className="h-4 w-4 text-gray-400" /> Battery condition</label>
                    <select value={form.batteryCondition} onChange={e => setForm({ ...form, batteryCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="poor">Poor</option>
                      <option value="replacement">Needs Replacement</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Camera className="h-4 w-4 text-gray-400" /> Camera condition</label>
                    <select value={form.cameraCondition} onChange={e => setForm({ ...form, cameraCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="poor">Poor</option>
                      <option value="not_working">Not Working</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Smartphone className="h-4 w-4 text-gray-400" /> Body condition</label>
                    <select value={form.bodyCondition} onChange={e => setForm({ ...form, bodyCondition: e.target.value })} className="input mt-1">
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="damaged">Damaged</option>
                      <option value="heavily_damaged">Heavily Damaged</option>
                    </select>
                  </div>
                </section>

                <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                  <button onClick={() => setStep(2)} className="btn-secondary"><ChevronLeft className="mr-1 h-4 w-4" /> Back</button>
                  <button onClick={() => setStep(4)} disabled={!selectedStorage} className="btn-primary disabled:opacity-40">Continue <ArrowRight className="ml-1 h-4 w-4" /></button>
                </div>
              </div>
            )}

            {/* STEP 4 — ESTIMATE */}
            {step === 4 && (
              <div className="pt-6 space-y-6">
                {/* Summary */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                    <div><span className="text-gray-500">Brand</span><p className="font-semibold text-gray-900">{selectedBrand}</p></div>
                    <div><span className="text-gray-500">Model</span><p className="font-semibold text-gray-900">{selectedModel?.modelName}</p></div>
                    <div><span className="text-gray-500">Storage</span><p className="font-semibold text-gray-900">{selectedStorage?.storage}{selectedStorage?.ram ? ` · ${selectedStorage.ram}` : ''}</p></div>
                    <div><span className="text-gray-500">Condition</span><p className="font-semibold text-gray-900 capitalize">{form.condition.toLowerCase().replace('_', ' ')}</p></div>
                    {form.age && <div><span className="text-gray-500">Age</span><p className="font-semibold text-gray-900 capitalize">{form.age.replace(/_/g, ' ')}</p></div>}
                  </div>
                </div>

                {/* Valuation */}
                {valuationState === 'loading' && (
                  <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <span className="text-sm">Calculating estimated value...</span>
                  </div>
                )}

                {valuationState === 'ready' && estimatedValue !== null && (
                  <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 text-center shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Estimated resale value</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-brand-700">{formatPrice(estimatedValue)}</p>
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                      <Info className="h-3.5 w-3.5" /> Final value may vary after physical inspection
                    </div>
                  </div>
                )}

                {valuationState === 'empty' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                    <p className="text-sm font-medium text-amber-700">Valuation unavailable</p>
                    <p className="mt-1 text-xs text-amber-600">Please contact OM Cellular for a manual evaluation of this model. You can still submit your request and our team will reach out with an offer.</p>
                  </div>
                )}

                {/* Pickup */}
                <section className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact phone number <span className="text-red-500">*</span></label>
                    <input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="input mt-1"
                      placeholder="e.g. 9876543210"
                      inputMode="tel"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-400">We’ll use this number to reach you with an offer.</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Package className="h-4 w-4 text-gray-400" /> Pickup address (optional)</label>
                    <textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} placeholder="Full address for pickup" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="block text-sm font-medium text-gray-700">Preferred pickup date</label><input type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} className="input mt-1" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Preferred pickup time</label><input value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
                  </div>
                </section>

                <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                  <button onClick={() => setStep(3)} className="btn-secondary"><ChevronLeft className="mr-1 h-4 w-4" /> Back</button>
                  <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-40">
                    {submitting ? 'Submitting...' : 'Submit Sell Request'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 — SUCCESS */}
            {step === 5 && (
              <div className="pt-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-gray-900">Request submitted!</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">We’ve received your {selectedBrand} {selectedModel?.modelName} sell request. Our team will evaluate your device and contact you soon.</p>
                <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-gray-100 bg-gray-50/70 p-5 text-left text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Request number</span><span className="font-semibold text-gray-900">{requestNumber || 'Assigned on confirmation'}</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-gray-500">Estimated value</span><span className="font-semibold text-brand-700">{estimatedValue !== null ? formatPrice(estimatedValue) : 'After inspection'}</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-gray-500">Contact phone</span><span className="font-semibold text-gray-900">{form.phone}</span></div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={resetAll} className="btn-primary">Sell Another Phone</button>
                  <Link to="/" className="btn-secondary">Back to Home</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
