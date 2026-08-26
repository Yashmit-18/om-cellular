import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Grid, List, ChevronLeft, ChevronRight, X } from 'lucide-react'
import api from '../../services/api'
import { formatPrice, cn } from '../../utils'
import type { ProductWithVariant, Category, Brand, Pagination } from '../../types'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const currentCategory = searchParams.get('categoryId') || ''
  const currentBrand = searchParams.get('brandId') || ''
  const currentQuery = searchParams.get('query') || ''
  const currentPage = parseInt(searchParams.get('page') || '1')
  const currentSort = searchParams.get('sortBy') || 'createdAt'
  const currentOrder = searchParams.get('sortOrder') || 'desc'

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data || [])).catch(() => {})
    api.get('/brands').then(r => setBrands(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = { page: String(currentPage), limit: '12', sortBy: currentSort, sortOrder: currentOrder }
        if (currentCategory) params.categoryId = currentCategory
        if (currentBrand) params.brandId = currentBrand
        if (currentQuery) params.query = currentQuery
        const query = new URLSearchParams(params).toString()
        const res = await api.get(`/products?${query}`)
        setProducts(res.data.data || [])
        setPagination(res.data.pagination || null)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [currentCategory, currentBrand, currentQuery, currentPage, currentSort, currentOrder])

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
  ].filter(Boolean) as { key: string; value: string; label: string }[]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          {pagination && <p className="mt-1 text-sm text-gray-500">{pagination.total} products found</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary !px-3 !py-2 md:hidden">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            <button onClick={() => setViewMode('grid')} className={cn('rounded p-1.5', viewMode === 'grid' && 'bg-gray-100')}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={cn('rounded p-1.5', viewMode === 'list' && 'bg-gray-100')}><List className="h-4 w-4" /></button>
          </div>
          <select
            value={`${currentSort}-${currentOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-')
              updateFilter('sortBy', sort)
              updateFilter('sortOrder', order)
            }}
            className="input !w-auto !py-2"
          >
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="lowestPrice-asc">Price: Low to High</option>
            <option value="lowestPrice-desc">Price: High to Low</option>
            <option value="name-asc">Name: A-Z</option>
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
        <aside className={cn('w-64 shrink-0', showFilters ? 'block' : 'hidden md:block')}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => updateFilter('categoryId', '')}
                  className={cn('block w-full text-left text-sm px-2 py-1 rounded', !currentCategory && 'font-medium text-brand-600 bg-brand-50')}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => updateFilter('categoryId', cat.id)}
                    className={cn('block w-full text-left text-sm px-2 py-1 rounded', currentCategory === cat.id && 'font-medium text-brand-600 bg-brand-50')}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Brands</h3>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => updateFilter('brandId', '')}
                  className={cn('block w-full text-left text-sm px-2 py-1 rounded', !currentBrand && 'font-medium text-brand-600 bg-brand-50')}
                >
                  All Brands
                </button>
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => updateFilter('brandId', brand.id)}
                    className={cn('block w-full text-left text-sm px-2 py-1 rounded', currentBrand === brand.id && 'font-medium text-brand-600 bg-brand-50')}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No products found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className={cn(
                viewMode === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
              )}>
                {products.map(product => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug || product.id}`}
                    className={cn(
                      'card-premium group',
                      viewMode === 'grid' ? 'p-4' : 'flex p-4'
                    )}
                  >
                    <div className={cn(
                      'overflow-hidden rounded-lg bg-gray-100',
                      viewMode === 'grid' ? 'aspect-square' : 'h-32 w-32 shrink-0'
                    )}>
                      <img src={product.primaryImage || '/placeholder.png'} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <div className={cn('mt-3', viewMode === 'list' && 'ml-4 flex-1')}>
                      {product.brand && <p className="text-xs text-gray-500">{product.brand.name}</p>}
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-bold text-brand-600">{formatPrice(product.lowestPrice)}</span>
                        {product.highestPrice > product.lowestPrice && (
                          <span className="text-sm text-gray-400">- {formatPrice(product.highestPrice)}</span>
                        )}
                      </div>
                      {product.inStock ? (
                        <span className="badge-success badge mt-2">In Stock</span>
                      ) : (
                        <span className="badge-danger badge mt-2">Out of Stock</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateFilter('page', String(currentPage - 1))}
                    disabled={!pagination.hasPrev}
                    className="btn-ghost !px-3 !py-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => updateFilter('page', String(page))}
                        className={cn('h-9 w-9 rounded-lg text-sm font-medium', page === currentPage ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100')}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => updateFilter('page', String(currentPage + 1))}
                    disabled={!pagination.hasNext}
                    className="btn-ghost !px-3 !py-2 disabled:opacity-40"
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
  )
}
