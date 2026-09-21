import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ArrowRight, PackageOpen } from 'lucide-react'
import api from '../../services/api'
import { cn } from '../../utils'
import ProductCard, { ProductCardSkeleton } from '../../components/shop/ProductCard'
import type { ProductWithVariant, Category, Brand, Pagination } from '../../types'

const PAGE_SIZE = 12

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A-Z' },
]

export default function BuyPhonesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  const currentCategory = searchParams.get('categoryId') || ''
  const currentBrand = searchParams.get('brandId') || ''
  const currentBrandName = searchParams.get('brand') || ''
  const currentQuery = searchParams.get('q') || ''
  const currentSort = searchParams.get('sort') || 'newest'
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }, [searchParams, setSearchParams])

  useEffect(() => {
    api.get('/categories').then(r => {
      setCategories((r.data.data || []).map((c: any) => ({ ...c, id: c.id || c._id })))
    }).catch(() => {})
    api.get('/brands').then(r => {
      setBrands((r.data.data || []).map((b: any) => ({ ...b, id: b.id || b._id })))
    }).catch(() => {})
  }, [])

  // Support the ?brand=<name> links used by home/search "popular brand" chips;
  // resolve the name to a brand id so the listing filter can apply.
  useEffect(() => {
    if (currentBrandName && !currentBrand && brands.length) {
      const match = brands.find((b: any) => (b.name || '').toLowerCase() === currentBrandName.toLowerCase())
      if (match) {
        const params = new URLSearchParams(searchParams)
        params.set('brandId', match.id)
        params.delete('brand')
        params.delete('page')
        setSearchParams(params, { replace: true })
      }
    }
  }, [currentBrandName, currentBrand, brands, searchParams, setSearchParams])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string> = { page: String(currentPage), limit: String(PAGE_SIZE), sort: currentSort }
      if (currentCategory) params.categoryId = currentCategory
      if (currentBrand) params.brandId = currentBrand
      if (currentQuery) params.query = currentQuery
      const res = await api.get(`/products?${new URLSearchParams(params).toString()}`)
      setProducts(res.data.data || [])
      setPagination(res.data.pagination || null)
    } catch {
      setError(true)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [currentCategory, currentBrand, currentQuery, currentSort, currentPage])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== currentQuery) updateFilter('q', trimmed)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, currentQuery, updateFilter])

  useEffect(() => {
    if (currentQuery !== searchInput.trim()) setSearchInput(currentQuery)
  }, [currentQuery, searchInput])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim() !== currentQuery) updateFilter('q', searchInput.trim())
  }

  const clearAll = () => {
    setSearchInput('')
    setSearchParams({ sort: 'newest' })
  }

  const hasActiveFilters = Boolean(currentCategory || currentBrand || currentQuery || currentPage > 1)
  const activeFilterCount = [currentCategory, currentBrand, currentQuery].filter(Boolean).length

  const renderSkeleton = () => (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )

  const renderFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => updateFilter('categoryId', '')}
            aria-pressed={!currentCategory}
            className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentCategory ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
          >
            <span>All Categories</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilter('categoryId', cat.id)}
              aria-pressed={currentCategory === cat.id}
              className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentCategory === cat.id ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
            >
              <span>{cat.name}</span>
              {typeof cat._count?.products === 'number' && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', currentCategory === cat.id ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>
                  {cat._count.products}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Brands</h3>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => updateFilter('brandId', '')}
            aria-pressed={!currentBrand}
            className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentBrand ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
          >
            <span>All Brands</span>
          </button>
          {brands.map(brand => (
            <button
              key={brand.id}
              type="button"
              onClick={() => updateFilter('brandId', brand.id)}
              aria-pressed={currentBrand === brand.id}
              className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentBrand === brand.id ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
            >
              <span>{brand.name}</span>
              {typeof brand._count?.products === 'number' && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', currentBrand === brand.id ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>
                  {brand._count.products}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Buy Phones</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {pagination ? `${pagination.total} certified phone${pagination.total === 1 ? '' : 's'} available` : 'Certified used & refurbished phones from the brands you trust'}
            </p>
          </div>
          <Link to="/sell-phone" className="hidden items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-800 sm:inline-flex">
            Want to sell your phone? <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search phones by name or model..."
              className="input !py-2.5 !pl-10 !pr-10 !text-sm"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); updateFilter('q', '') }} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 lg:ml-auto">
            {hasActiveFilters && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-500 transition-colors hover:border-red-200 hover:text-red-600">
                <X className="h-4 w-4" /> Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            )}
            <select
              value={currentSort}
              onChange={e => updateFilter('sort', e.target.value)}
              className="input !w-auto !py-2.5 !px-3"
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button onClick={() => setShowFilters(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentCategory && (
              <button onClick={() => updateFilter('categoryId', '')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">
                {categories.find(c => c.id === currentCategory)?.name || 'Category'} <X className="h-3 w-3" />
              </button>
            )}
            {currentBrand && (
              <button onClick={() => updateFilter('brandId', '')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">
                {brands.find(b => b.id === currentBrand)?.name || 'Brand'} <X className="h-3 w-3" />
              </button>
            )}
            {currentQuery && (
              <button onClick={() => updateFilter('q', '')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">
                “{currentQuery}” <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <div className="mt-8 flex gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              {renderFilters()}
            </div>
          </aside>

          {/* Mobile filter drawer */}
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
              <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                  <button onClick={() => setShowFilters(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
                </div>
                {renderFilters()}
                <button onClick={() => { clearAll(); setShowFilters(false) }} className="btn-secondary mt-6 w-full">Clear all filters</button>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="min-w-0 flex-1">
            {loading ? (
              renderSkeleton()
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
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {hasActiveFilters ? 'No phones match your filters' : 'No phones available yet'}
                </h3>
                <p className="mt-1.5 text-sm text-gray-500">
                  {hasActiveFilters
                    ? 'Try removing a filter or searching for something else.'
                    : 'More certified phones are being added. Check back soon!'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="btn-secondary">Clear filters</button>
                  )}
                  {!hasActiveFilters && (
                    <Link to="/sell-phone" className="btn-primary">Sell your phone instead</Link>
                  )}
                  <Link to="/contact" className="btn-ghost">Contact us</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} className="h-full" />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => updateFilter('page', String(currentPage - 1))}
                      disabled={!pagination.hasPrev}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                          onClick={() => updateFilter('page', String(page))}
                          className={cn('h-10 w-10 cursor-pointer rounded-xl text-sm font-medium transition-colors', isCurrent ? 'bg-navy-900 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => updateFilter('page', String(currentPage + 1))}
                      disabled={!pagination.hasNext}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
