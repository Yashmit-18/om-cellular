import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Smartphone, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react'
import { searchService, type SearchModelSuggestion, type SearchProductSuggestion } from '../../services/search.service'
import { getImageList } from '../../utils'
import ProductImage from '../shop/ProductImage'

const DEBOUNCE_MS = 250
const FALLBACK_CATALOG_BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Redmi', 'Oppo', 'Vivo', 'Realme', 'Google', 'Motorola']

interface CatalogEntry {
  _id?: string
  id?: string
  brandName?: string
  modelName?: string
  image?: string
}

export default function SearchPanel() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<SearchModelSuggestion[]>([])
  const [products, setProducts] = useState<SearchProductSuggestion[]>([])
  const [popular, setPopular] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [view, setView] = useState<'idle' | 'models' | 'products'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const loadModels = useCallback((q: string) => {
    const term = q.trim().toLowerCase()
    if (!term) {
      setModels([])
      setLoadingModels(false)
      setView('idle')
      return
    }
    setError('')
    setLoadingModels(true)
    searchService.searchModels(term).then(raw => {
      const list = Array.isArray(raw) ? raw : []
      setModels(list.slice(0, 7).map((m: CatalogEntry) => ({
        type: 'model' as const,
        id: String(m._id || m.id || ''),
        brand: m.brandName || '',
        modelName: m.modelName || '',
        image: m.image,
      })))
      setView('models')
      setLoadingModels(false)
    }).catch(() => {
      setError('Could not load search results. Please try again.')
      setModels([])
      setLoadingModels(false)
    })
  }, [])

  const loadProducts = useCallback((q: string) => {
    const term = q.trim()
    if (!term) {
      setProducts([])
      setLoadingProducts(false)
      return
    }
    setLoadingProducts(true)
    searchService.searchProducts(term).then(raw => {
      const list = Array.isArray(raw) ? raw : []
      setProducts(list.slice(0, 5).map((p: any) => ({
        type: 'product' as const,
        id: p?.id || p?._id || '',
        slug: p?.slug,
        name: p?.name || '',
        image: getImageList(p?.images, p?.variants?.[0]?.images)?.[0] || p?.primaryImage || '',
        lowestPrice: p?.lowestPrice,
        highestPrice: p?.highestPrice,
      })))
      setLoadingProducts(false)
    }).catch(() => {
      setProducts([])
      setLoadingProducts(false)
    })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadModels(query)
      loadProducts(query)
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, loadModels, loadProducts])

  useEffect(() => {
    if (!open) return
    searchService.getBrands().then((raw: any) => {
      const brands = Array.isArray(raw) ? raw.filter((b: any) => typeof b === 'string') : []
      if (brands.length > 0) {
        const seen = FALLBACK_CATALOG_BRANDS.filter(b => brands.includes(b))
        setPopular(seen.length ? seen : brands.slice(0, 8))
      } else {
        setPopular(FALLBACK_CATALOG_BRANDS)
      }
    }).catch(() => setPopular(FALLBACK_CATALOG_BRANDS))
    setView('idle')
    if (inputRef.current) inputRef.current.focus()
  }, [open])

  const openResults = (q: string) => {
    setOpen(false)
    setQuery('')
    navigate(q ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  const openModel = (m: SearchModelSuggestion) => {
    setOpen(false)
    setQuery('')
    navigate(`/search?q=${encodeURIComponent(`${m.brand} ${m.modelName}`)}`)
  }

  const openProduct = (p: SearchProductSuggestion) => {
    setOpen(false)
    setQuery('')
    navigate(`/products/${p.slug || p.id}`)
  }

  const pickBrand = (b: string) => {
    setOpen(false)
    setQuery('')
    navigate(`/buy-phones?brand=${encodeURIComponent(b)}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % totalCount()) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i <= 0 ? totalCount() - 1 : i - 1)) }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < models.length) { openModel(models[activeIndex]); return }
      const pIdx = activeIndex - models.length
      if (pIdx >= 0 && pIdx < products.length) { openProduct(products[pIdx]); return }
      openResults(query)
    }
  }

  const totalCount = () => models.length + products.length

  const showIdle = view === 'idle' && !query.trim()
  const showLoading = (loadingModels || loadingProducts) && query.trim() !== ''
  const showEmpty = !showLoading && query.trim() !== '' && !error && models.length === 0 && products.length === 0

  return (
    <>
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex h-11 min-w-[44px] items-center justify-center rounded-full px-3 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] md:flex md:items-start md:justify-center md:pt-24" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false); setQuery('') }} />
          <div className="relative flex h-full w-full flex-col bg-white shadow-2xl md:h-auto md:max-w-xl md:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
                onKeyDown={onKeyDown}
                placeholder="Search phones, brands, services..."
                className="flex-1 bg-transparent py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                type="text"
              />
              {query && (
                <button aria-label="Clear" onClick={() => { setQuery(''); setActiveIndex(-1); if (inputRef.current) inputRef.current.focus() }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              )}
              <button aria-label="Close search" onClick={() => { setOpen(false); setQuery('') }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={resultsRef} className="flex-1 overflow-y-auto p-2 pb-safe">
              {showIdle && (
                <div className="px-2 py-3">
                  <p className="mb-2 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <TrendingUp className="h-3.5 w-3.5" /> Popular Searches
                  </p>
                  <div className="flex flex-wrap gap-2 px-2">
                    {popular.map(b => (
                      <button key={b} onClick={() => pickBrand(b)}
                        className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <p className="text-sm text-gray-600">{error}</p>
                  <button onClick={() => loadModels(query)} className="btn-secondary !py-2 text-sm">Retry</button>
                </div>
              )}

              {models.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Phone Models</p>
                  <div className="py-1">
                    {models.map((m, i) => (
                      <button key={m.id + m.modelName} onClick={() => openModel(m)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left ${activeIndex === i ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                        {m.image
                          ? <img src={m.image} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100"><Smartphone className="h-4 w-4 text-gray-400" /></div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{m.brand} {m.modelName}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {products.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Products</p>
                  <div className="py-1">
                    {products.map((p, i) => {
                      const idx = models.length + i
                      return (
                        <button key={p.id + p.name} onClick={() => openProduct(p)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left ${activeIndex === idx ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                          <ProductImage src={p.image || ''} alt={p.name} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg" imgClassName="h-full w-full object-contain" />
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{p.name}</p>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {showLoading && (
                <div className="flex flex-col gap-2 px-2 py-3">
                  {[0, 1, 2].map(n => <div key={n} className="skeleton h-12 w-full" />)}
                </div>
              )}

              {showEmpty && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Smartphone className="h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No matches for &ldquo;{query}&rdquo;</p>
                  <button onClick={() => openResults(query)} className="btn-primary !py-2 text-sm">
                    Search all products <ChevronRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {query.trim() && (
              <div className="border-t border-gray-100 px-4 py-3">
                <button onClick={() => openResults(query)} className="flex w-full items-center justify-between rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
                  Search all products
                  <Search className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
