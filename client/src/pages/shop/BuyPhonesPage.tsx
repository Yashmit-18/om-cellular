import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ArrowRight, PackageOpen } from 'lucide-react'
import api from '../../services/api'
import { formatPrice, cn } from '../../utils'
import ProductImage from '../../components/shop/ProductImage'
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
  const currentQuery = searchParams.get('q') || ''
  const currentSort = searchParams.get('sort') || 'newest'
  const currentPage = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data || [])).catch(() => {})
    api.get('/brands').then(r => setBrands(r.data.data || [])).catch(() => {})
  }, [])

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

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('q', searchInput.trim())
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
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100" />
          <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )

  const renderFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateFilter('categoryId', '')}
            className={cn('block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentCategory ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-50')}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => updateFilter('categoryId', cat.id)}
              className={cn('block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentCategory === cat.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-50')}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Brands</h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateFilter('brandId', '')}
            className={cn('block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentBrand ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-50')}
          >
            All Brands
          </button>
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => updateFilter('brandId', brand.id)}
              className={cn('block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentBrand === brand.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-50')}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-b from-brand-50/30 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Buy New Phones</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {pagination ? `${pagination.total} phone${pagination.total === 1 ? '' : 's'} available` : 'Explore smartphones from the brands you trust'}
            </p>
          </div>
          <Link to="/sell-phone" className="hidden items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
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
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); updateFilter('q', '') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 lg:ml-auto">
            {hasActiveFilters && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-500 transition-colors hover:border-red-200 hover:text-red-600">
                <X className="h-4 w-4" /> Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            )}
            <select
              value={currentSort}
              onChange={e => updateFilter('sort', e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button onClick={() => setShowFilters(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentCategory && (
              <button onClick={() => updateFilter('categoryId', '')} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {categories.find(c => c.id === currentCategory)?.name || 'Category'} <X className="h-3 w-3" />
              </button>
            )}
            {currentBrand && (
              <button onClick={() => updateFilter('brandId', '')} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {brands.find(b => b.id === currentBrand)?.name || 'Brand'} <X className="h-3 w-3" />
              </button>
            )}
            {currentQuery && (
              <button onClick={() => updateFilter('q', '')} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
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
                    : 'New phones are being added. Check back soon!'}
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
                    <Link
                      key={product.id}
                      to={`/products/${product.slug || product.id}`}
                      className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                    >
                      <ProductImage
                        src={product.primaryImage}
                        alt={product.name}
                        className="aspect-square rounded-xl"
                        imgClassName="transition-transform group-hover:scale-105"
                      />
                      <div className="mt-3.5">
                        {product.brand?.name && (
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.brand.name}</p>
                        )}
                        <h3 className="mt-1 truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">{product.name}</h3>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-lg font-bold text-brand-600">{formatPrice(product.lowestPrice)}</span>
                          {product.highestPrice > product.lowestPrice && (
                            <span className="text-xs text-gray-400">- {formatPrice(product.highestPrice)}</span>
                          )}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                          <span className="text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">View details</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => updateFilter('page', String(currentPage - 1))}
                      disabled={!pagination.hasPrev}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                          className={cn('h-10 w-10 rounded-xl text-sm font-medium transition-colors', isCurrent ? 'bg-brand-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => updateFilter('page', String(currentPage + 1))}
                      disabled={!pagination.hasNext}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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