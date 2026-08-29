import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
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

  useEffect(() => {
    if (!query) { setResults([]); return }
    setLoading(true)
    api.get(`/products?query=${encodeURIComponent(query)}&limit=20`).then(r => {
      setResults(r.data.data || [])
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [query])

  useEffect(() => {
    setInput(query)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(input ? { q: input } : {})
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">Search</h1>
      <form onSubmit={handleSearch} className="mt-4 flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Search products..." className="input !pl-10" />
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>
      {loading && <div className="mt-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>}
      {results.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map(p => (
            <Link key={p.id} to={`/products/${p.slug || p.id}`} className="card-premium group p-4">
              <ProductImage src={p.primaryImage} alt={p.name} className="aspect-square rounded-lg" imgClassName="transition-transform group-hover:scale-105" />
              <h3 className="mt-3 text-sm font-medium line-clamp-2">{p.name}</h3>
              <p className="mt-1 font-bold text-brand-600">{formatPrice(p.lowestPrice)}</p>
            </Link>
          ))}
        </div>
      )}
      {!loading && query && results.length === 0 && <p className="mt-8 text-center text-gray-500">No results found for &ldquo;{query}&rdquo;</p>}
    </div>
  )
}
