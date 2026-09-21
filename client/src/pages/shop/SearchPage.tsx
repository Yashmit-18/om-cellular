import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon, AlertTriangle, Smartphone, PackageOpen, X, History } from 'lucide-react'
import api from '../../services/api'
import ProductCard, { ProductCardSkeleton } from '../../components/shop/ProductCard'
import type { ProductWithVariant } from '../../types'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<ProductWithVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!query) { setResults([]); setError(false); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    api.get(`/products?query=${encodeURIComponent(query)}&limit=20`, { signal: controller.signal }).then(r => {
      setResults(r.data.data || [])
      setLoading(false)
    }).catch(_err => {
      if (controller.signal.aborted) return
      setError(true)
      setResults([])
      setLoading(false)
    })
    return () => controller.abort()
  }, [query, retryKey])

  useEffect(() => {
    setInput(query)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(input ? { q: input } : {})
  }

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
            <SearchIcon className="h-3.5 w-3.5" /> Find your phone
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Search Products</h1>
          <form onSubmit={handleSearch} className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Search by name, brand or model..." aria-label="Search products" className="input !py-3 !pl-10" />
            </div>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>

        {query && !loading && !error && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">
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
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {results.map(p => (
              <ProductCard key={p.id} product={p} className="h-full" />
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
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="btn-primary mx-auto mt-4"
            >
              Try again
            </button>
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