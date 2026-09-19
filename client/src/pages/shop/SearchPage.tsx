import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon, AlertTriangle, Smartphone, PackageOpen, X, History } from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import ProductImage from '../../components/shop/ProductImage'
import type { ProductWithVariant } from '../../types'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<ProductWithVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!query) { setResults([]); setError(false); return }
    setLoading(true)
    setError(false)
    api.get(`/products?query=${encodeURIComponent(query)}&limit=20`).then(r => {
      setResults(r.data.data || [])
      setLoading(false)
    }).catch(() => {
      setError(true)
      setResults([])
      setLoading(false)
    })
  }, [query])

  useEffect(() => {
    setInput(query)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(input ? { q: input } : {})
  }

  return (
    <div className="bg-gradient-to-b from-brand-50/30 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
            <SearchIcon className="h-3.5 w-3.5" /> Find your phone
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Search Products</h1>
          <form onSubmit={handleSearch} className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Search by name, brand or model..." className="input !py-3 !pl-10" />
            </div>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>

        {query && !loading && !error && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <History className="h-3 w-3" /> {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
            </span>
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-red-600"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-premium p-4">
                <div className="skeleton aspect-square" />
                <div className="skeleton mt-3 h-3 w-3/4" />
                <div className="skeleton mt-2 h-5 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {results.map(p => (
              <Link key={p.id} to={`/products/${p.slug || p.id}`} className="card-premium group overflow-hidden p-4 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="overflow-hidden rounded-xl bg-gray-100">
                  <ProductImage src={p.primaryImage} alt={p.name} className="aspect-square" imgClassName="transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="mt-3">
                  {p.brand?.name && <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{p.brand.name}</p>}
                  <h3 className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-700">{p.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-brand-600">{formatPrice(p.lowestPrice)}</span>
                    {p.highestPrice > p.lowestPrice && (
                      <span className="text-xs text-gray-400 line-through">{formatPrice(p.highestPrice)}</span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    {p.inStock ? <span className="badge-success badge">In Stock</span> : <span className="badge-danger badge">Out of Stock</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!query && !loading && (
          <div className="mt-8 flex flex-col items-center gap-2 py-10 text-center">
            <Smartphone className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Search for phones by name, brand or model.</p>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm text-gray-600">We couldn’t complete your search. Please try again.</p>
          </div>
        )}

        {!loading && query && !error && results.length === 0 && (
          <div className="card mt-8 p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><PackageOpen className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No results found</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              Nothing matches “{query}”. Try a different spelling, or browse our full catalog.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/buy-phones" className="btn-primary">Browse phones</Link>
              <Link to="/contact" className="btn-ghost">Contact us</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}