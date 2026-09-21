import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Grid, List, ChevronLeft, ChevronRight, X, PackageOpen } from 'lucide-react'
import api from '../../services/api'
import { cn } from '../../utils'
import ProductCard, { ProductCardSkeleton } from '../../components/shop/ProductCard'
import type { ProductWithVariant, Category, Brand, Pagination } from '../../types'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const currentCategory = searchParams.get('categoryId') || ''
  const currentBrand = searchParams.get('brandId') || ''
  const currentQuery = searchParams.get('query') || ''
  const currentIsFeatured = searchParams.get('isFeatured') || ''
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const currentSort = searchParams.get('sort') || 'newest'

  useEffect(() => {
    api.get('/categories').then(r => setCategories((r.data.data || []).map((c: any) => ({ ...c, id: c.id || c._id })))).catch(() => {})
    api.get('/brands').then(r => setBrands((r.data.data || []).map((b: any) => ({ ...b, id: b.id || b._id })))).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
      setLoading(true)
      setError(false)
      try {
        const params: Record<string, string> = { page: String(currentPage), limit: '12', sort: currentSort }
        if (currentCategory) params.categoryId = currentCategory
        if (currentBrand) params.brandId = currentBrand
        if (currentQuery) params.query = currentQuery
        if (currentIsFeatured) params.isFeatured = currentIsFeatured
        const query = new URLSearchParams(params).toString()
        const res = await api.get(`/products?${query}`)
        setProducts(res.data.data || [])
        setPagination(res.data.pagination || null)
      } catch {
        setError(true)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }, [currentCategory, currentBrand, currentQuery, currentIsFeatured, currentPage, currentSort])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    setSearchParams(params)
  }

  const activeFilters = [
    currentCategory && { key: 'categoryId', value: currentCategory, label: categories.find(c => c.id === currentCategory)?.name || 'Category' },
    currentBrand && { key: 'brandId', value: currentBrand, label: brands.find(b => b.id === currentBrand)?.name || 'Brand' },
    currentQuery && { key: 'query', value: currentQuery, label: currentQuery },
    currentIsFeatured && { key: 'isFeatured', value: currentIsFeatured, label: 'Featured' },
  ].filter(Boolean) as { key: string; value: string; label: string }[]

  const renderFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateFilter('categoryId', '')}
            className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentCategory ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
          >
            <span>All Categories</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => updateFilter('categoryId', cat.id)}
              className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentCategory === cat.id ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
            >
              <span>{cat.name}</span>
              {typeof cat._count?.products === 'number' && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', currentCategory === cat.id ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>{cat._count.products}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Brands</h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateFilter('brandId', '')}
            className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', !currentBrand ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
          >
            <span>All Brands</span>
          </button>
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => updateFilter('brandId', brand.id)}
              className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors', currentBrand === brand.id ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-gray-50')}
            >
              <span>{brand.name}</span>
              {typeof brand._count?.products === 'number' && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', currentBrand === brand.id ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>{brand._count.products}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm"><Grid className="h-3.5 w-3.5" /> Catalog</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">All Products</h1>
          {pagination ? (
            <p className="mt-1.5 text-sm text-gray-500">{pagination.total} certified product{pagination.total === 1 ? '' : 's'} found</p>
          ) : (
            <p className="mt-1.5 text-sm text-gray-500">Certified used &amp; refurbished phones from the brands you trust</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(true)} className="btn-secondary !px-3 !py-2 md:hidden">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            <button onClick={() => setViewMode('grid')} className={cn('rounded p-1.5', viewMode === 'grid' && 'bg-gray-100')}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={cn('rounded p-1.5', viewMode === 'list' && 'bg-gray-100')}><List className="h-4 w-4" /></button>
          </div>
          <select
            value={currentSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="input !w-auto !py-2.5"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map(f => (
            <button
              key={f.key + f.value}
              onClick={() => updateFilter(f.key, '')}
              className="badge-info badge flex items-center gap-1"
            >
              {f.label} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-8">
        {/* Sidebar Filters */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {renderFilters()}
          </div>
        </aside>

        {/* Mobile filter drawer */}
        {showFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              {renderFilters()}
              <button onClick={() => { setShowFilters(false); setSearchParams({ sort: 'newest' }) }} className="btn-secondary mt-6 w-full">Clear all filters</button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                {activeFilters.length > 0
                  ? 'Try removing a filter or searching for something else.'
                  : 'More certified products are being added. Check back soon!'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {activeFilters.length > 0 && (
                  <button onClick={() => { setSearchParams({ sort: 'newest' }) }} className="btn-secondary">Clear filters</button>
                )}
                <Link to="/sell-phone" className="btn-primary">Sell your phone instead</Link>
                <Link to="/contact" className="btn-ghost">Contact us</Link>
              </div>
            </div>
          ) : (
            <>
<div className={cn(
                  viewMode === 'grid' ? 'grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'space-y-4'
                )}>
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant={viewMode === 'list' ? 'list' : 'grid'}
                      className="h-full"
                    />
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
