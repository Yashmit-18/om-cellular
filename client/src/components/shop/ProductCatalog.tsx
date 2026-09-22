import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Grid, List, ChevronLeft, ChevronRight, X, PackageOpen, Search } from 'lucide-react'
import api from '../../services/api'
import { cn, getConditionLabel, formatPrice } from '../../utils'
import { isTruthyParam } from '../../utils/urlParams'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import ProductFilters, { type MultiFilterKey, type FlagFilterKey, type ProductFilterSelection } from './ProductFilters'
import type { ProductWithVariant, ProductFacets, Pagination, Brand } from '../../types'

const MULTI_PARAM: Record<MultiFilterKey, string> = {
  brandIds: 'brandId',
  conditions: 'condition',
  storages: 'storage',
  rams: 'ram',
  colors: 'color',
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'name', label: 'Name: A-Z' },
]

function parseList(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

interface ActiveChip {
  id: string
  label: string
  onRemove: () => void
}

interface ProductCatalogProps {
  heading: string
  eyebrow?: string
  idleDescription?: string
  showSearch?: boolean
  searchPlaceholder?: string
}

/**
 * Shared, server-driven product catalog used by both `/products` and
 * `/buy-phones`. Owns the full D11 filter experience (price range, brand,
 * category, condition, storage/RAM/colour, availability) with URL-synced state,
 * a mobile drawer and an optional search box.
 */
export default function ProductCatalog({
  heading,
  eyebrow = 'Catalog',
  idleDescription = 'Certified used & refurbished phones from the brands you trust',
  showSearch = false,
  searchPlaceholder = 'Search by name or model...',
}: ProductCatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [facets, setFacets] = useState<ProductFacets | null>(null)
  const [facetsLoading, setFacetsLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const filtersDrawerRef = useRef<HTMLDivElement>(null)
  const filtersTriggerRef = useRef<HTMLButtonElement>(null)

  const closeFilters = useCallback(() => setShowFilters(false), [])

  // Mobile filter drawer: treat as a modal dialog — lock scroll, trap focus,
  // close on Escape, restore focus to the "Open filters" trigger on return.
  useEffect(() => {
    if (!showFilters) return
    const drawer = filtersDrawerRef.current
    const trigger = filtersTriggerRef.current
    const previouslyOverflow = document.body.style.overflow
    if (drawer) drawer.focus()
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowFilters(false)
        return
      }
      if (event.key !== 'Tab' || !drawer) return
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previouslyOverflow
      if (drawer && drawer.contains(document.activeElement)) trigger?.focus()
    }
  }, [showFilters])
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchInput, setSearchInput] = useState(searchParams.get('query') || searchParams.get('q') || '')

  const categoryIds = parseList(searchParams.get('categoryId') || searchParams.get('category'))
  const brandIds = parseList(searchParams.get('brandId'))
  const conditions = parseList(searchParams.get('condition'))
  const storages = parseList(searchParams.get('storage'))
  const rams = parseList(searchParams.get('ram'))
  const colors = parseList(searchParams.get('color'))
  const priceMinParam = searchParams.get('minPrice') || ''
  const priceMaxParam = searchParams.get('maxPrice') || ''
  const inStock = isTruthyParam(searchParams.get('inStock'))
  const discount = isTruthyParam(searchParams.get('discount'))
  const currentQuery = searchParams.get('query') || searchParams.get('q') || ''
  const currentIsFeatured = searchParams.get('isFeatured') || ''
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const currentSort = searchParams.get('sort') || 'newest'

  const selection: ProductFilterSelection = {
    categoryIds,
    brandIds,
    conditions,
    storages,
    rams,
    colors,
    priceMin: priceMinParam,
    priceMax: priceMaxParam,
    inStock,
    discount,
  }

  useEffect(() => {
    setFacetsLoading(true)
    api.get('/products/filters')
      .then(r => setFacets(r.data.data || null))
      .catch(() => setFacets(null))
      .finally(() => setFacetsLoading(false))
  }, [])

  useEffect(() => {
    api.get('/brands')
      .then(r => setBrands((r.data.data || []).map((b: any) => ({ ...b, id: b.id || b._id }))))
      .catch(() => {})
  }, [])

  // Support the ?brand=<name> links used by home/search "popular brand" chips;
  // resolve the name to a brand id so the listing filter can apply.
  const currentBrandName = searchParams.get('brand') || ''
  useEffect(() => {
    if (currentBrandName && !brandIds.length && brands.length) {
      const match = brands.find(b => (b.name || '').toLowerCase() === currentBrandName.toLowerCase())
      if (match) {
        const params = new URLSearchParams(searchParams)
        params.set('brandId', match.id)
        params.delete('brand')
        params.delete('page')
        setSearchParams(params, { replace: true })
      }
    }
  }, [currentBrandName, brandIds.length, brands, searchParams, setSearchParams])

  const requestSeq = useRef(0)

  const fetchProducts = useCallback(async () => {
    const seq = ++requestSeq.current
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string> = { page: String(currentPage), limit: '12', sort: currentSort }
      if (categoryIds.length) params.categoryId = categoryIds.join(',')
      if (brandIds.length) params.brandId = brandIds.join(',')
      if (conditions.length) params.condition = conditions.join(',')
      if (storages.length) params.storage = storages.join(',')
      if (rams.length) params.ram = rams.join(',')
      if (colors.length) params.color = colors.join(',')
      if (priceMinParam) params.minPrice = priceMinParam
      if (priceMaxParam) params.maxPrice = priceMaxParam
      if (inStock) params.inStock = 'true'
      if (discount) params.discount = 'true'
      if (currentQuery) params.query = currentQuery
      if (currentIsFeatured) params.isFeatured = currentIsFeatured
      const query = new URLSearchParams(params).toString()
      const res = await api.get(`/products?${query}`)
      if (seq !== requestSeq.current) return
      setProducts(res.data.data || [])
      setPagination(res.data.pagination || null)
    } catch {
      if (seq !== requestSeq.current) return
      setError(true)
      setProducts([])
      setPagination(null)
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Local price drafts so typing doesn't fire a request per keystroke.
  const [priceMin, setPriceMin] = useState(priceMinParam)
  const [priceMax, setPriceMax] = useState(priceMaxParam)

  useEffect(() => {
    setPriceMin(priceMinParam)
    setPriceMax(priceMaxParam)
  }, [priceMinParam, priceMaxParam])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (priceMin === priceMinParam && priceMax === priceMaxParam) return
      const params = new URLSearchParams(searchParams)
      if (priceMin) params.set('minPrice', priceMin); else params.delete('minPrice')
      if (priceMax) params.set('maxPrice', priceMax); else params.delete('maxPrice')
      params.delete('page')
      setSearchParams(params, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [priceMin, priceMax, priceMinParam, priceMaxParam, searchParams, setSearchParams])

  // Debounced search -> URL `query` (normalising the legacy `q` alias).
  useEffect(() => {
    if (!showSearch) return
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed === currentQuery) return
      const params = new URLSearchParams(searchParams)
      if (trimmed) params.set('query', trimmed); else params.delete('query')
      params.delete('q')
      params.delete('page')
      setSearchParams(params, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, currentQuery, searchParams, setSearchParams, showSearch])

  useEffect(() => {
    if (showSearch && currentQuery !== searchInput) setSearchInput(currentQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuery, showSearch])

  const writeList = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams)
    if (values.length) params.set(key, values.join(',')); else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', value)
    params.delete('page')
    setSearchParams(params)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleMulti = (key: MultiFilterKey, value: string) => {
    const current = selection[key]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    writeList(MULTI_PARAM[key], next)
  }

  const selectCategory = (id: string) => writeList('categoryId', id ? [id] : [])

  const toggleFlag = (key: FlagFilterKey) => {
    const params = new URLSearchParams(searchParams)
    const next = !isTruthyParam(searchParams.get(key))
    if (next) params.set(key, 'true'); else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  const onPriceChange = (min: string, max: string) => {
    setPriceMin(min)
    setPriceMax(max)
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    if (currentQuery) params.set('query', currentQuery)
    setSearchParams(params)
    if (showSearch) setSearchInput(currentQuery)
  }

  const chips: ActiveChip[] = []
  categoryIds.forEach(id => {
    const name = facets?.categories.find(c => c.id === id)?.name
    chips.push({ id: `cat-${id}`, label: name || 'Category', onRemove: () => writeList('categoryId', []) })
  })
  brandIds.forEach(id => {
    const name = facets?.brands.find(b => b.id === id)?.name
    chips.push({ id: `brand-${id}`, label: name || 'Brand', onRemove: () => writeList('brandId', brandIds.filter(v => v !== id)) })
  })
  conditions.forEach(v => chips.push({ id: `cond-${v}`, label: getConditionLabel(v), onRemove: () => writeList('condition', conditions.filter(x => x !== v)) }))
  storages.forEach(v => chips.push({ id: `store-${v}`, label: v, onRemove: () => writeList('storage', storages.filter(x => x !== v)) }))
  rams.forEach(v => chips.push({ id: `ram-${v}`, label: `${v} RAM`, onRemove: () => writeList('ram', rams.filter(x => x !== v)) }))
  colors.forEach(v => chips.push({ id: `color-${v}`, label: v, onRemove: () => writeList('color', colors.filter(x => x !== v)) }))
  if (priceMinParam || priceMaxParam) {
    const label = priceMinParam && priceMaxParam
      ? `${formatPrice(Number(priceMinParam))} – ${formatPrice(Number(priceMaxParam))}`
      : priceMinParam
        ? `From ${formatPrice(Number(priceMinParam))}`
        : `Up to ${formatPrice(Number(priceMaxParam))}`
    chips.push({ id: 'price', label, onRemove: () => onPriceChange('', '') })
  }
  if (inStock) chips.push({ id: 'inStock', label: 'In stock', onRemove: () => toggleFlag('inStock') })
  if (discount) chips.push({ id: 'discount', label: 'On sale', onRemove: () => toggleFlag('discount') })
  if (currentIsFeatured) chips.push({ id: 'isFeatured', label: 'Featured', onRemove: () => writeList('isFeatured', []) })
  if (currentQuery) chips.push({ id: 'query', label: `“${currentQuery}”`, onRemove: () => writeList('query', []) })

  const activeFilterCount = chips.filter(c => c.id !== 'query' && c.id !== 'isFeatured').length

  const filterPanel = (idPrefix: string) => (
    <ProductFilters
      facets={facets}
      facetsLoading={facetsLoading}
      selection={selection}
      onToggle={toggleMulti}
      onSelectCategory={selectCategory}
      onToggleFlag={toggleFlag}
      onPriceChange={onPriceChange}
      onClear={clearFilters}
      idPrefix={idPrefix}
      priceDrafts={{ min: priceMin, max: priceMax }}
    />
  )

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm"><Grid className="h-3.5 w-3.5" /> {eyebrow}</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{heading}</h1>
            {pagination ? (
              <p className="mt-1.5 text-sm text-gray-500">{pagination.total} certified product{pagination.total === 1 ? '' : 's'} found</p>
            ) : (
              <p className="mt-1.5 text-sm text-gray-500">{idleDescription}</p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            {showSearch && (
              <div className="relative order-last w-full sm:order-none sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="input !py-2.5 !pl-9 !pr-8 !text-sm"
                  aria-label="Search products"
                />
                {searchInput && (
                  <button type="button" onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setShowFilters(true)} aria-label="Open filters" className="btn-secondary relative !px-3 !py-2 md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-950">{activeFilterCount}</span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-1 rounded-lg border border-gray-200 p-1">
              <button onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={cn('rounded p-1.5', viewMode === 'grid' && 'bg-gray-100')}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={cn('rounded p-1.5', viewMode === 'list' && 'bg-gray-100')}><List className="h-4 w-4" /></button>
            </div>
            <select
              value={currentSort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="input !w-auto !py-2.5"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map(f => (
              <button
                key={f.id}
                onClick={f.onRemove}
                className="badge-info badge flex max-w-full items-center gap-1"
                aria-label={`Remove filter: ${f.label}`}
              >
                <span className="truncate">{f.label}</span> <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
            {activeFilterCount > 1 && (
              <button onClick={clearFilters} className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-navy-900">
                Clear all
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-8">
          {/* Sidebar Filters */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              {filterPanel('sidebar')}
            </div>
          </aside>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={closeFilters} />
          <div
            ref={filtersDrawerRef}
            id="catalog-filters-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-filters-drawer-title"
            tabIndex={-1}
            className="absolute left-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-white shadow-xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 id="catalog-filters-drawer-title" className="text-lg font-bold text-gray-900">Filters</h2>
              <button onClick={closeFilters} aria-label="Close filters" aria-controls="catalog-filters-drawer" className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filterPanel('drawer')}</div>
            <div className="border-t border-gray-100 p-4">
              <button onClick={closeFilters} className="btn-primary w-full">
                {loading ? 'Loading…' : `Show ${pagination?.total ?? 0} result${pagination?.total === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Product Grid */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="card p-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500"><PackageOpen className="h-7 w-7" /></div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Couldn’t load products</h3>
                <p className="mt-1.5 text-sm text-gray-500">Something went wrong while fetching the catalog. Please try again.</p>
                <button onClick={fetchProducts} className="btn-primary mt-6">Retry</button>
              </div>
            ) : products.length === 0 ? (
              <div className="card p-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><PackageOpen className="h-7 w-7" /></div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
                <p className="mt-1.5 text-sm text-gray-500">
                  {chips.length > 0
                    ? 'Try removing a filter or widening your price range.'
                    : 'More certified products are being added. Check back soon!'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {chips.length > 0 && (
                    <button onClick={clearFilters} className="btn-secondary">Clear filters</button>
                  )}
                  <Link to="/sell-phone" className="btn-primary">Sell your phone instead</Link>
                  <Link to="/contact" className="btn-ghost">Contact us</Link>
                </div>
              </div>
            ) : (
              <>
                <div className={cn(
                  viewMode === 'grid' ? 'grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3' : 'space-y-4'
                )}>
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant={viewMode === 'list' ? 'list' : 'grid'}
                      className="h-full"
                      variantFilter={{ storages, rams, colors, conditions }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: pagination.totalPages }).map((_, i) => {
                      const page = i + 1
                      const isCurrent = page === currentPage
                      const isNearby = Math.abs(page - currentPage) <= 2
                      const isEdge = page === 1 || page === pagination.totalPages
                      if (!isNearby && !isEdge) return i === 1 || i === pagination.totalPages - 2 ? <span key={page} className="px-1 text-gray-400">…</span> : null
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={cn('h-11 w-11 cursor-pointer rounded-xl text-sm font-medium transition-colors', isCurrent ? 'bg-navy-900 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
