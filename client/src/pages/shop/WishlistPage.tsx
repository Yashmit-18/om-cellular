import { Link } from 'react-router-dom'
import { Heart, Trash2, AlertTriangle } from 'lucide-react'
import { useWishlistStore } from '../../stores/wishlistStore'
import api from '../../services/api'
import ProductCard, { ProductCardSkeleton } from '../../components/shop/ProductCard'
import { useEffect, useState } from 'react'

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (items.length === 0) { setLoading(false); setProducts([]); return }
    setLoading(true)
    setError(false)
    // The store keeps VARIANT ids; fetch each through the by-variant endpoint
    // so stale/invalid entries (deactivated variants) are dropped gracefully.
    Promise.all(items.map(storedId => api.get(`/products/by-variant/${storedId}`).then(r => ({ storedId, data: r.data.data })).catch(() => null)))
      .then(results => {
        const resolved = results.filter(Boolean)
        if (resolved.length === 0 && results.some(r => r === null)) setError(true)
        else setError(false)
        setProducts(resolved)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [items])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Heart className="h-7 w-7" /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Your wishlist is empty</h1>
        <p className="mt-2 text-gray-500">Save phones you love and find them here anytime.</p>
        <Link to="/products" className="btn-primary mt-6 inline-flex">Browse Products</Link>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-brand-50/30 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
              <Heart className="h-3.5 w-3.5" /> Saved for later
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">My Wishlist ({items.length})</h1>
          </div>
        </div>

        {error && products.length === 0 && (
          <div className="card mt-8 p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Couldn’t load your wishlist</h3>
            <p className="mt-1.5 text-sm text-gray-500">Something went wrong while fetching your saved phones. Please try again.</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-6">Retry</button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map(({ storedId, data: p }) => p && (
            <div key={storedId} className="flex h-full flex-col">
              <ProductCard product={p} showWishlist={false} className="h-full w-full" />
              <button onClick={() => removeItem(storedId)} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${p.name} from wishlist`}>
                <Trash2 className="h-4 w-4" /> Remove from wishlist
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}