import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, ArrowRight, Search, Eye } from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import type { ProductWithVariant, Brand } from '../../types'

export default function BuyPhonesPage() {
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/products?isActive=true&limit=100').then(r => setProducts(r.data.data || [])),
      api.get('/brands').then(r => setBrands(r.data.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(p => {
    if (selectedBrand && p.brandId !== selectedBrand) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || (p.brand?.name || '').toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="container-custom py-16">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Buy New Phones</h1>
        <p className="mt-2 text-gray-500">Explore smartphones from the brands you trust</p>
      </div>

      {/* Search + Brand Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search phones..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBrand('')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedBrand === '' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id === selectedBrand ? '' : brand.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedBrand === brand.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Smartphone className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No phones found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {products.length === 0
              ? 'New phones are being added. Check back soon!'
              : 'No phones match your current filters.'}
          </p>
          {products.length === 0 && (
            <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700">
              Browse Home <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(product => (
            <Link key={product.id} to={`/products/${product.slug || product.id}`} className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-50">
                <img
                  src={product.primaryImage || ''}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {!product.primaryImage && (
                  <div className="flex h-full items-center justify-center">
                    <Smartphone className="h-12 w-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="mt-3">
                {product.brand?.name && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{product.brand.name}</p>
                )}
                <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-brand-600">{formatPrice(product.lowestPrice)}</span>
                  {product.highestPrice > product.lowestPrice && (
                    <span className="text-xs text-gray-400">- {formatPrice(product.highestPrice)}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-brand-600">View Details</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
